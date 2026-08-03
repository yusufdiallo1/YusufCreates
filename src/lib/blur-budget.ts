/**
 * Viewport-aware blur budget.
 *
 * Each backdrop-filtered element forces the compositor to snapshot and blur the
 * region behind it. Past a handful on screen this drops frames badly on
 * integrated GPUs, so only so many may blur at once; the rest fall back to an
 * opaque surface that looks identical in stillness.
 *
 * Two properties matter and neither comes for free:
 *
 * DETERMINISM. The earlier version claimed slots on mount, first come first
 * served. Under React 19 streaming, mount order is not stable, so which panels
 * blurred could differ between loads of the same page. Here the registry holds
 * every candidate and recomputes the whole winner set whenever membership
 * changes, sorted by priority then document order — both stable across renders.
 *
 * NO THRASH. An element parked on the viewport edge must not claim and release
 * repeatedly, strobing its own blur. Three layers prevent that; see below.
 */

import { MAX_BLURRED_IN_VIEWPORT } from "./capability";

/* ---------------------------------------------------------------------------
   Anti-thrash, layer 1: asymmetric observation.

   A single observer fires enter and leave on the same pixel boundary, so an
   element resting there oscillates. Two observers with different roots give
   real geometric hysteresis: an element claims when it truly enters, and holds
   until it is well clear. Reversing a claim then takes a deliberate scroll of
   the release margin, not a jitter.
   --------------------------------------------------------------------------- */

const CLAIM_MARGIN = "0px";
const RELEASE_MARGIN = "300px";

/* Layer 2: releases are debounced, claims are immediate. The asymmetry is the
   point — gaining blur a beat late is invisible, losing it early is a flicker. */
const RELEASE_DELAY_MS = 250;

export interface BudgetEntry {
  id: symbol;
  el: HTMLElement;
  priority: number;
  /** Index in document order. Stable across renders; the tiebreak that matters. */
  docOrder: number;
  visible: boolean;
  /** Set while the element is outside the claim root but inside the release root. */
  releaseTimer: ReturnType<typeof setTimeout> | null;
  notify: (winner: boolean) => void;
  isWinner: boolean;
}

const registry = new Map<symbol, BudgetEntry>();

/** Live ceiling, updated by the capability provider as the tier changes. */
let capacity = MAX_BLURRED_IN_VIEWPORT;

export function setBlurCapacity(next: number): void {
  if (next === capacity) return;
  capacity = next;
  scheduleRecompute();
}

/* ---------------------------------------------------------------------------
   Recomputation

   Batched to a microtask so a single IntersectionObserver callback carrying
   several entries produces one recompute rather than one per entry.
   --------------------------------------------------------------------------- */

let recomputeQueued = false;

function scheduleRecompute(): void {
  if (recomputeQueued) return;
  recomputeQueued = true;
  queueMicrotask(() => {
    recomputeQueued = false;
    recompute();
  });
}

/**
 * Document order, resolved in one sweep.
 *
 * This is a forced layout read, so it runs only on membership change — never
 * per scroll frame, and never inside the per-entry path. With fewer than a
 * dozen candidates the cost is negligible; do not extend this pattern to
 * hundreds of nodes.
 */
function refreshDocumentOrder(): void {
  if (typeof document === "undefined") return;
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>("[data-glass-budget]"),
  );
  const index = new Map<HTMLElement, number>();
  nodes.forEach((node, i) => index.set(node, i));
  for (const entry of registry.values()) {
    entry.docOrder = index.get(entry.el) ?? Number.MAX_SAFE_INTEGER;
  }
}

function recompute(): void {
  const visible = [...registry.values()].filter((e) => e.visible);

  visible.sort((a, b) => {
    // Explicit caller intent first.
    if (a.priority !== b.priority) return b.priority - a.priority;
    // Then document order — stable across renders, which is the whole point.
    if (a.docOrder !== b.docOrder) return a.docOrder - b.docOrder;
    return 0;
  });

  const winners = new Set(visible.slice(0, capacity).map((e) => e.id));

  for (const entry of registry.values()) {
    const won = winners.has(entry.id);
    // Layer 3: only notify when this entry's own answer actually changed.
    if (won !== entry.isWinner) {
      entry.isWinner = won;
      entry.notify(won);
    }
  }
}

/* ---------------------------------------------------------------------------
   Observers — created lazily, shared by every entry.
   --------------------------------------------------------------------------- */

let claimObserver: IntersectionObserver | null = null;
let releaseObserver: IntersectionObserver | null = null;
const byElement = new WeakMap<Element, BudgetEntry>();

function ensureObservers(): void {
  if (claimObserver || typeof IntersectionObserver === "undefined") return;

  claimObserver = new IntersectionObserver(
    (entries) => {
      for (const record of entries) {
        const entry = byElement.get(record.target);
        if (!entry) continue;
        if (record.isIntersecting) {
          // Claim immediately, and cancel any pending release.
          if (entry.releaseTimer) {
            clearTimeout(entry.releaseTimer);
            entry.releaseTimer = null;
          }
          if (!entry.visible) {
            entry.visible = true;
            scheduleRecompute();
          }
        }
      }
    },
    { rootMargin: CLAIM_MARGIN, threshold: 0.01 },
  );

  releaseObserver = new IntersectionObserver(
    (entries) => {
      for (const record of entries) {
        const entry = byElement.get(record.target);
        if (!entry) continue;
        // Only a departure from the *expanded* root releases the slot.
        if (!record.isIntersecting && entry.visible && !entry.releaseTimer) {
          entry.releaseTimer = setTimeout(() => {
            entry.releaseTimer = null;
            entry.visible = false;
            scheduleRecompute();
          }, RELEASE_DELAY_MS);
        }
      }
    },
    { rootMargin: RELEASE_MARGIN, threshold: 0 },
  );
}

export interface RegisterOptions {
  priority?: number;
  notify: (winner: boolean) => void;
}

/** Register an element as a blur candidate. Returns an unregister function. */
export function registerBlurCandidate(
  el: HTMLElement,
  { priority = 0, notify }: RegisterOptions,
): () => void {
  ensureObservers();

  const id = Symbol("blur-candidate");
  const entry: BudgetEntry = {
    id,
    el,
    priority,
    docOrder: Number.MAX_SAFE_INTEGER,
    // Starts false: an element in a collapsed accordion or a display:none
    // branch never fires an intersection, and must not hold a slot it cannot use.
    visible: false,
    releaseTimer: null,
    notify,
    isWinner: false,
  };

  registry.set(id, entry);
  byElement.set(el, entry);
  el.setAttribute("data-glass-budget", "");

  refreshDocumentOrder();
  claimObserver?.observe(el);
  releaseObserver?.observe(el);
  scheduleRecompute();

  return () => {
    if (entry.releaseTimer) clearTimeout(entry.releaseTimer);
    claimObserver?.unobserve(el);
    releaseObserver?.unobserve(el);
    byElement.delete(el);
    registry.delete(id);
    el.removeAttribute("data-glass-budget");
    refreshDocumentOrder();
    scheduleRecompute();
  };
}

/** Live count of blurring elements, for the debug overlay. */
export function activeBlurCount(): number {
  let n = 0;
  for (const entry of registry.values()) if (entry.isWinner) n += 1;
  return n;
}

/** Live count of registered candidates, for the debug overlay. */
export function blurCandidateCount(): number {
  return registry.size;
}
