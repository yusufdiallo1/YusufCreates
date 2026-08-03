/**
 * Scrubbed-sequence budget.
 *
 * A scroll-scrubbed sequence recomputes layout-adjacent values every frame the
 * page moves. One is a centrepiece; two compete for the same frames and both
 * stutter. So exactly one may bind per page.
 *
 * Two things differ deliberately from the blur budget, and both matter:
 *
 * NOT VIEWPORT-GATED. The blur budget hands slots to whatever is on screen.
 * Doing that here would pass the slot between sequences as the user scrolls,
 * and a sequence losing its slot mid-scrub snaps to its end state under the
 * user's eyes. The slot is claimed once for the page and held until unmount.
 *
 * THE WINNER IS STICKY. A later, higher-priority registrant does not steal the
 * slot from an already-active one — stealing would snap the running sequence
 * for the sake of a preference that arrived too late to matter.
 */

import { MAX_SCRUBBED_SEQUENCES } from "./capability";

export type ScrubFallback = "entry" | "final";

export interface ScrubEntry {
  id: symbol;
  priority: number;
  notify: (active: boolean, resolved: boolean) => void;
  active: boolean;
}

const registry = new Map<symbol, ScrubEntry>();
let resolved = false;
let arbitrationQueued = false;

/**
 * Arbitration is deferred one frame past mount so every candidate on the page
 * has registered before a winner is picked. A microtask would run before the
 * rest of a streamed tree has mounted.
 */
function scheduleArbitration(): void {
  if (arbitrationQueued) return;
  arbitrationQueued = true;
  requestAnimationFrame(() => {
    arbitrationQueued = false;
    arbitrate();
  });
}

function arbitrate(): void {
  const entries = [...registry.values()];
  const activeCount = entries.filter((e) => e.active).length;

  // Sticky: once the slots are taken, later registrants simply lose.
  const free = MAX_SCRUBBED_SEQUENCES - activeCount;
  if (free > 0) {
    const candidates = entries
      .filter((e) => !e.active)
      .sort((a, b) => b.priority - a.priority);

    for (const entry of candidates.slice(0, free)) entry.active = true;
  }

  resolved = true;
  for (const entry of registry.values()) entry.notify(entry.active, true);

  if (process.env.NODE_ENV !== "production" && entries.length > MAX_SCRUBBED_SEQUENCES) {
    // Every page here is authored, so a second sequence is a design mistake
    // rather than a condition to negotiate at runtime. Say so loudly.
    console.warn(
      `[scrub-budget] ${entries.length} scrubbed sequences registered but only ` +
        `${MAX_SCRUBBED_SEQUENCES} may run. The losers render a static state. ` +
        `Design pages with one scrubbed sequence.`,
    );
  }
}

export interface RegisterScrubOptions {
  priority?: number;
  notify: (active: boolean, resolved: boolean) => void;
}

export function registerScrubCandidate(
  { priority = 0, notify }: RegisterScrubOptions,
): () => void {
  const id = Symbol("scrub-candidate");
  registry.set(id, { id, priority, notify, active: false });

  // A late registrant re-opens arbitration only if a slot is genuinely free.
  resolved = false;
  scheduleArbitration();

  return () => {
    registry.delete(id);
    // Freeing a slot lets a waiting sequence take it.
    scheduleArbitration();
  };
}

export function isScrubResolved(): boolean {
  return resolved;
}

/** Live count for the debug overlay. */
export function activeScrubCount(): number {
  let n = 0;
  for (const entry of registry.values()) if (entry.active) n += 1;
  return n;
}
