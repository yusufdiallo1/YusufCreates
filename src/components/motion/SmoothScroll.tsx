"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";
import { useReducedMotion } from "motion/react";
import {
  hasTickerOwner,
  markLenisResolved,
  setLenis,
} from "@/lib/lenis-instance";

/**
 * SmoothScroll — Lenis wrapper for the marketing pages.
 *
 * Three things matter here:
 *
 * 1. Lenis and Motion's useScroll must read the same scroll position, or every
 *    scroll-linked value drifts a frame behind and the whole page stutters.
 *    Lenis writes to window.scrollY natively, so Motion stays in sync as long
 *    as something drives lenis.raf() exactly once per frame.
 *
 * 2. WHO drives that loop is now negotiated rather than assumed. Where GSAP is
 *    running, ScrollTriggerProvider claims the ticker so ScrollTrigger and
 *    Lenis share one clock — two independent loops calling lenis.raf() in the
 *    same frame produce motion that is subtly wrong and painful to diagnose.
 *    Where nothing claims it, the local loop below runs instead.
 *
 *    That fallback is not optional. Without it, a page where the provider is
 *    absent or failed to load has a Lenis that has captured the wheel and is
 *    never ticked — which is a completely unscrollable page.
 *
 * 3. Touch is left alone. iOS momentum scrolling is already excellent, and
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
    // markLenisResolved either way, so a consumer can tell "never" from
    // "not yet" — see lib/lenis-instance.ts.
    if (reduceMotion) {
      markLenisResolved();
      return;
    }

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
    if (isTouch) {
      markLenisResolved();
      return;
    }

    const lenis = new Lenis({
      duration: 1.1,
      // Gentle expo-out: fast to settle, no long tail.
      easing: (t: number) => 1 - Math.pow(1 - t, 3.4),
      smoothWheel: true,
      // Native momentum on touch is better than anything we would impose.
      syncTouch: false,
      touchMultiplier: 1,
    });

    // Publish before resolving, so a consumer woken by the resolve sees it.
    setLenis(lenis);
    markLenisResolved();

    /*
     * Self-drive only if nothing else claimed the ticker.
     *
     * Checked on the next frame rather than immediately: ScrollTriggerProvider
     * mounts above this and claims during its own effect, and effects run
     * child-first, so the claim has not happened yet at this point in the
     * commit. One frame later it has.
     */
    const decide = requestAnimationFrame(() => {
      if (hasTickerOwner()) return;
      const raf = (time: number) => {
        lenis.raf(time);
        frame.current = requestAnimationFrame(raf);
      };
      frame.current = requestAnimationFrame(raf);
    });

    return () => {
      cancelAnimationFrame(decide);
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
      setLenis(null);
      lenis.destroy();
    };
  }, [reduceMotion]);

  return <>{children}</>;
}
