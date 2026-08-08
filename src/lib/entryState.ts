/**
 * Entry state — who this is, in the only terms the page can act on.
 *
 * Five states, resolved once per session from the journey record and the
 * referrer. Everything in §7 of the flow pass keys off this: which CTA the
 * hero shows, whether the load sequence plays, which order the closing beats
 * sit in.
 *
 * ---------------------------------------------------------------------------
 * THE SSR RULE — read this before adding a consumer.
 *
 * This is the same constraint documented at the top of src/lib/capability.ts,
 * and it is here for the same reason: none of the inputs exist on the server.
 * localStorage, sessionStorage and document.referrer are all client-only, so
 * the server renders `cold` and so does the client's FIRST PAINT. The real
 * state arrives one commit later.
 *
 * That imposes a hard constraint on every consumer:
 *
 *   Consumers may flip PROPERTIES AND TEXT ONLY — a label, an href, a
 *   className, a CSS `order`. They may NEVER insert, remove or reorder DOM
 *   nodes based on entry state.
 *
 *   A band that only exists for `high-intent` must be rendered for everyone
 *   and hidden with CSS. A reorder must be CSS `order` over a stable DOM
 *   order, never a re-sorted array.
 *
 * Hero.tsx carries three separate comment blocks about hydration failures
 * caused by exactly this mistake, and Reveal.tsx carries a fourth. Do not add
 * a fifth.
 * ---------------------------------------------------------------------------
 */

export type EntryState =
  | "cold"
  | "returning"
  | "referred"
  | "high-intent"
  | "lead";

/**
 * The state the server renders, and which the client's first paint must match.
 * See THE SSR RULE above.
 */
export const SSR_ENTRY_STATE: EntryState = "cold";

/** Paths that mean someone arrived already deciding rather than browsing. */
const HIGH_INTENT_PATHS = ["/pricing", "/start"];

/** Where the session's first path is kept, so a later nav cannot rewrite it. */
const FIRST_PATH_KEY = "yc.entry.path";

/**
 * The path this session STARTED on.
 *
 * Recorded rather than read live: someone who lands on the homepage and then
 * clicks through to /pricing has browsed their way there, which is a different
 * person from someone who arrived on /pricing from a search result. Reading
 * window.location on every resolve would collapse the two.
 */
function firstPath(): string {
  if (typeof window === "undefined") return "";
  try {
    const stored = sessionStorage.getItem(FIRST_PATH_KEY);
    if (stored) return stored;
    const path = window.location.pathname;
    sessionStorage.setItem(FIRST_PATH_KEY, path);
    return path;
  } catch {
    return window.location.pathname;
  }
}

/** Referring hostname, normalised the same way src/lib/track.ts normalises it. */
function referrerHost(): string {
  if (typeof document === "undefined" || !document.referrer) return "";
  try {
    return new URL(document.referrer).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Classify. First match wins, and the order is the priority.
 *
 * `lead` outranks everything because a label saying "check your project
 * status" is right whatever else is true of them. `high-intent` outranks
 * `referred` because what they did beats where they came from.
 *
 * `visits` INCLUDES the current session — see visitSnapshot — so a first-ever
 * visitor is 1 and `>= 2` means "has been here before".
 */
export function classify(input: {
  visits: number;
  leadAt?: number;
  clientDomains: readonly string[];
}): EntryState {
  if (input.leadAt) return "lead";

  const path = firstPath();
  if (HIGH_INTENT_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) {
    return "high-intent";
  }

  const host = referrerHost();
  if (host && input.clientDomains.includes(host)) return "referred";

  if (input.visits >= 2) return "returning";

  return "cold";
}

/**
 * Everything a consumer might need to adapt, in one snapshot.
 *
 * The two journey fields ride along with the state because the components that
 * want them want them AT THE SAME TIME and under the same SSR rule: the hero
 * needs "returning" and "where you stopped" together, and Projects needs
 * "returning" and "when you were last here". Publishing them through two
 * stores would mean two subscriptions and two chances to render a tree the
 * server did not send.
 */
export interface EntryContext {
  state: EntryState;
  /** Where they stopped reading last visit. A section id, or "". */
  lastSection: string;
  /** Epoch ms of the end of the previous visit. 0 if there was not one. */
  lastVisitAt: number;
}

/* ---------------------------------------------------------------------------
   The store

   A module singleton read through useSyncExternalStore, exactly as
   src/lib/capability.ts does it. Both of that file's requirements apply here
   and both are still fatal:

     1. getSnapshot must be REFERENTIALLY STABLE. React compares snapshots with
        Object.is, so returning a fresh object literal on every call is an
        infinite render loop. `current` is replaced only on a real commit, and
        never otherwise.

     2. The server snapshot is a frozen module constant, not a call result.
        React calls it during hydration and a fresh object each time would
        mismatch.

   A store rather than a Context because consumers are scattered across the
   tree and several of them (the Marquee inside ContactCTA, the Nav) sit
   outside any provider a wrapped section could offer.
   --------------------------------------------------------------------------- */

const SSR_CONTEXT: EntryContext = Object.freeze({
  state: SSR_ENTRY_STATE,
  lastSection: "",
  lastVisitAt: 0,
});

let current: EntryContext = SSR_CONTEXT;

const listeners = new Set<() => void>();

export function subscribeEntryState(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function getEntryStateSnapshot(): EntryContext {
  return current;
}

export function getServerEntryStateSnapshot(): EntryContext {
  return SSR_CONTEXT;
}

/**
 * Commit the resolved context.
 *
 * Resolved once per session and then left alone. There is no ratchet here the
 * way capability.ts has one, because nothing re-resolves: the inputs are all
 * fixed for the lifetime of the tab.
 */
export function commitEntryState(next: EntryContext): void {
  if (
    current.state === next.state &&
    current.lastSection === next.lastSection &&
    current.lastVisitAt === next.lastVisitAt
  ) {
    return;
  }
  current = next;
  for (const listener of listeners) listener();
}

/** Test seam only — resets module state between suites. */
export function __resetEntryState(): void {
  current = SSR_CONTEXT;
  listeners.clear();
}
