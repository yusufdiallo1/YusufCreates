/**
 * Custom sidebar ordering, persisted per browser.
 *
 * Stored as a map of section name → list of hrefs, rather than as a flat list
 * of every link. Two reasons:
 *
 *   1. Adding a new admin page later must not require a migration. An href
 *      that is not in the stored list simply sorts to the end, so a new screen
 *      appears rather than vanishing.
 *   2. An href that no longer exists is ignored on read, so deleting a page
 *      does not leave a dead entry that has to be cleaned up.
 *
 * localStorage rather than a Convex settings row: this is one person's
 * preference about one browser's chrome, and round-tripping it through the
 * database would mean the sidebar could not render its final order until a
 * query resolved — a visible reshuffle on every load, to sync a preference
 * between devices that a single admin does not have.
 *
 * The store shape mirrors lib/glass.ts so both are read through
 * useSyncExternalStore rather than through setState-in-an-effect.
 */

export const NAV_ORDER_KEY = "yc.admin.navOrder";

/** section name → hrefs, in the order the admin arranged them. */
export type NavOrder = Record<string, string[]>;

const EMPTY: NavOrder = {};

let current: NavOrder | null = null;
const listeners = new Set<() => void>();

function read(): NavOrder {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(NAV_ORDER_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return EMPTY;

    // Defensive: a hand-edited or half-written value must not crash the admin.
    const out: NavOrder = {};
    for (const [section, hrefs] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(hrefs) && hrefs.every((h) => typeof h === "string")) {
        out[section] = hrefs as string[];
      }
    }
    return out;
  } catch {
    return EMPTY;
  }
}

export function subscribeNavOrder(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getNavOrderSnapshot(): NavOrder {
  current ??= read();
  return current;
}

/** The server has no storage — always the authored order. */
export function getNavOrderServerSnapshot(): NavOrder {
  return EMPTY;
}

export function setSectionOrder(section: string, hrefs: string[]): void {
  current = { ...getNavOrderSnapshot(), [section]: hrefs };
  try {
    window.localStorage.setItem(NAV_ORDER_KEY, JSON.stringify(current));
  } catch {
    // Refused writes are survivable — the order just does not persist.
  }
  for (const listener of listeners) listener();
}

export function resetNavOrder(): void {
  current = EMPTY;
  try {
    window.localStorage.removeItem(NAV_ORDER_KEY);
  } catch {
    // Same.
  }
  for (const listener of listeners) listener();
}

/**
 * Applies a stored order to the authored list.
 *
 * Items the stored order knows about come first, in its order; anything it has
 * never seen keeps its authored position at the end. That is what makes a
 * newly added admin page show up instead of disappearing.
 */
export function applyOrder<T extends { href: string }>(
  items: readonly T[],
  order: string[] | undefined,
): T[] {
  if (!order || order.length === 0) return [...items];

  const rank = new Map(order.map((href, i) => [href, i]));
  const known: T[] = [];
  const unknown: T[] = [];
  for (const item of items) {
    (rank.has(item.href) ? known : unknown).push(item);
  }
  known.sort((a, b) => rank.get(a.href)! - rank.get(b.href)!);
  return [...known, ...unknown];
}
