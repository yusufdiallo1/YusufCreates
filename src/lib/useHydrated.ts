"use client";

import { useSyncExternalStore } from "react";

/**
 * useHydrated — false on the server and in the client's first paint, true after.
 *
 * THE ESCAPE HATCH, and it is deliberately a narrow one.
 *
 * Almost every client-only signal on this site is handled without it. Reduced
 * motion changes durations rather than markup (see motion/Reveal.tsx); entry
 * state flips properties and text on a stable tree (see lib/entryState.ts);
 * capability tier resolves through its own store with an SSR value the first
 * paint also renders (see lib/capability.ts). Those are better answers because
 * the content is correct in the very first frame.
 *
 * This is for the residue: a case where the server genuinely cannot know the
 * right CONTENT and rendering the wrong content is worse than rendering it a
 * commit late. The instruction under SlideToConfirm is the example — the
 * control is a drag target normally and a press target under reduced motion,
 * and telling someone to drag something that does not drag is a real failure,
 * not a cosmetic one.
 *
 * Reach for it only when there is no stable rendering that is true for both.
 *
 * WHY useSyncExternalStore rather than useState + useEffect: the store form is
 * what React provides for exactly this question, it commits in the same pass
 * rather than scheduling a second render, and it does not trip
 * react-hooks/set-state-in-effect. `subscribe` is a no-op because the answer
 * changes once, on hydration, and never again.
 */

/** Nothing to subscribe to — the value transitions once and is then fixed. */
const subscribe = () => () => {};

const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
