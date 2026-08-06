"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

/**
 * useUpdateFlash — one language for "this just changed".
 *
 * Attach the returned ref to any element whose contents are derived from a
 * live value, pass that value in, and the element's border flashes once at the
 * accent colour whenever it changes: 200ms in, 400ms out.
 *
 * WHY THIS EXISTS AS A HOOK RATHER THAN A COMPONENT
 *
 * Convex is reactive, so figures across the admin and the portal change under
 * the reader without anything having asked them to. A number that silently
 * becomes a different number is not an update, it is a discrepancy — people
 * notice it minutes later and cannot tell whether they misread it or missed
 * something. One consistent signal, used everywhere, is learnable in about ten
 * minutes and then never missed again. Two different signals would not be.
 *
 * It flashes on CHANGE, never on mount. The first value is not news.
 *
 * The animation is CSS (see [data-update-flash] in globals.css) rather than
 * inline keyframes, so the timing lives beside every other motion token and the
 * reduced-motion suppression is one rule rather than a branch in every caller.
 */
export function useUpdateFlash<E extends HTMLElement = HTMLElement>(
  value: unknown,
) {
  const ref = useRef<E>(null);
  const previous = useRef(value);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    // Object.is, not ===: NaN is a real value for a metric that has no
    // denominator yet, and it must not read as a change on every render.
    if (Object.is(previous.current, value)) return;
    previous.current = value;

    if (reduceMotion) return;
    const node = ref.current;
    if (!node) return;

    /*
     * Restarting a CSS animation needs the attribute removed, a style
     * recalculation forced, and the attribute put back. Without the middle step
     * the browser coalesces both mutations into one frame, sees no net change,
     * and a second update landing mid-flash produces nothing at all — which is
     * the exact case this hook exists for.
     *
     * One forced reflow on one element, only when its value actually changed.
     */
    delete node.dataset.updateFlash;
    void node.offsetWidth;
    node.dataset.updateFlash = "";

    const clear = () => {
      delete node.dataset.updateFlash;
    };
    node.addEventListener("animationend", clear, { once: true });
    return () => node.removeEventListener("animationend", clear);
  }, [value, reduceMotion]);

  return ref;
}
