"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";
import { useReducedMotion } from "motion/react";

/**
 * SmoothScroll — Lenis wrapper for the marketing pages.
 *
 * Two things matter here:
 *
 * 1. Lenis and Motion's useScroll must read the same scroll position, or every
 *    scroll-linked value drifts a frame behind and the whole page stutters.
 *    Lenis writes to window.scrollY natively, so Motion stays in sync as long
 *    as Lenis drives the RAF loop — which is why the loop is started manually
 *    rather than left to Lenis's internal autoRaf.
 *
 * 2. Touch is left alone. iOS momentum scrolling is already excellent, and
 *    overriding it produces the rubbery lag that makes smooth-scroll sites
 *    feel broken on a phone.
 *
 * Under prefers-reduced-motion Lenis is never constructed at all — children
 * are returned untouched and the browser scrolls natively.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const frame = useRef<number | undefined>(undefined);

  useEffect(() => {
    // Kill switch. No instance, no listeners, no RAF loop.
    if (reduceMotion) return;

    /*
     * Touch devices get native scrolling, full stop.
     *
     * syncTouch is off, so Lenis contributes nothing on touch anyway — but it
     * still attaches touchstart/touchmove listeners and stamps classes on
     * <html>, and that was enough to leave the page unscrollable by finger
     * while the wheel kept working. Native momentum on iOS is better than
     * anything we would impose, so there is nothing to lose here.
     */
    const isTouch =
      window.matchMedia("(hover: none) and (pointer: coarse)").matches ||
      navigator.maxTouchPoints > 0;
    if (isTouch) return;

    const lenis = new Lenis({
      duration: 1.1,
      // Gentle expo-out: fast to settle, no long tail.
      easing: (t: number) => 1 - Math.pow(1 - t, 3.4),
      smoothWheel: true,
      // Native momentum on touch is better than anything we would impose.
      syncTouch: false,
      touchMultiplier: 1,
    });

    const raf = (time: number) => {
      lenis.raf(time);
      frame.current = requestAnimationFrame(raf);
    };
    frame.current = requestAnimationFrame(raf);

    return () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
      lenis.destroy();
    };
  }, [reduceMotion]);

  return <>{children}</>;
}
