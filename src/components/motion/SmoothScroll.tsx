"use client";

import { useEffect } from "react";
import {
  claimTicker,
  markLenisResolved,
  releaseTicker,
  setLenis,
} from "@/lib/lenis-instance";

/**
 * Eased wheel scrolling, written so it cannot strand the page.
 *
 * ---------------------------------------------------------------------------
 * READ THIS BEFORE CHANGING IT.
 *
 * Smooth scroll has been removed from this file once already, and the reason
 * was never Lenis. It was TICKER OWNERSHIP: Lenis only moves the page when
 * something calls lenis.raf() once per frame, and that responsibility was
 * negotiated between this component and ScrollTriggerProvider across three
 * files. Every branch of that negotiation had a path where Lenis captured the
 * wheel and nothing ticked it — which is not "scrolling feels wrong", it is a
 * page that does not scroll at all. It shipped that way more than once.
 *
 * So there is no negotiation here any more. THIS FILE ALWAYS DRIVES.
 *
 * It claims the ticker itself, and it can always win that claim: React runs
 * child effects before parent effects, and this component is a CHILD of
 * ScrollTriggerProvider (see the marketing layout). So this claim lands first,
 * ScrollTriggerProvider's own claimTicker() returns false, and it never adds
 * its GSAP ticker. Exactly one driver, decided by tree position rather than by
 * timing. GSAP still syncs to the same scroll positions; it just is not the
 * thing calling raf.
 * ---------------------------------------------------------------------------
 *
 * THREE PLACES IT REFUSES TO RUN, all before Lenis is constructed:
 *
 *   Touch. A phone's native scroll is better than anything reimplemented on
 *   top of it — correct momentum, correct rubber-banding, correct behaviour
 *   under an open keyboard — and hijacking it is how a page starts fighting
 *   the only gesture the user has.
 *
 *   Reduced motion. Eased scrolling is motion the visitor did not ask for.
 *
 *   No requestAnimationFrame. Belt and braces for a non-browser environment.
 *
 * AND A WATCHDOG. If the loop stops running for a second while the tab is
 * visible — a thrown frame, a background throttle that never recovers, a bug
 * in a future edit of this file — Lenis is destroyed and native scrolling
 * comes back. The failure mode this whole file is written around is an
 * unscrollable page, so the last line of defence is to undo itself.
 */

/** Identifies this component's claim on the RAF ticker. */
const TICKER_TOKEN = Symbol("SmoothScroll");

/** How long the loop may go silent, while visible, before we give up on it. */
const WATCHDOG_MS = 1000;

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const coarse = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (coarse || reduced || typeof requestAnimationFrame !== "function") {
      // Native scrolling, and say so — consumers must be able to tell "there
      // will never be a Lenis" from "not yet".
      markLenisResolved();
      return;
    }

    let lenis: import("lenis").default | null = null;
    let frame = 0;
    let watchdog = 0;
    let lastTick = performance.now();
    let cancelled = false;

    const teardown = () => {
      if (frame) cancelAnimationFrame(frame);
      if (watchdog) clearInterval(watchdog);
      frame = 0;
      watchdog = 0;
      releaseTicker(TICKER_TOKEN);
      setLenis(null);
      lenis?.destroy();
      lenis = null;
    };

    /*
     * Imported at runtime rather than at module scope.
     *
     * Lenis is ~10KB that a phone and a reduced-motion visitor must never pay
     * for, and both of those return above. A static import would put it in the
     * bundle for everyone regardless.
     */
    import("lenis")
      .then(({ default: Lenis }) => {
        if (cancelled) return;

        // Claimed BEFORE construction: if something else somehow already owns
        // the tick, we must not build a Lenis that two things drive.
        if (!claimTicker(TICKER_TOKEN)) {
          markLenisResolved();
          return;
        }

        lenis = new Lenis({
          /* 1.05 is most of the way to native. The point is to take the edge
             off a wheel notch, not to make the page feel like it is on rails —
             long durations are what make smooth scroll feel like lag. */
          duration: 1.05,
          /* Standard easeOutExpo. Starts at the wheel and decelerates; nothing
             about it anticipates or overshoots. */
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          /* Touch is already excluded above, but if the environment lies about
             its pointer we still do not want two scroll models fighting. */
          smoothWheel: true,
          syncTouch: false,
        });

        setLenis(lenis);
        markLenisResolved();

        const loop = (time: number) => {
          lastTick = time;
          lenis?.raf(time);
          frame = requestAnimationFrame(loop);
        };
        frame = requestAnimationFrame(loop);

        watchdog = window.setInterval(() => {
          // Only while visible: a backgrounded tab stops rAF by design, and
          // tearing down for that would be the watchdog causing the outage.
          if (document.visibilityState !== "visible") {
            lastTick = performance.now();
            return;
          }
          if (performance.now() - lastTick > WATCHDOG_MS) {
            console.warn(
              "[SmoothScroll] the rAF loop stopped; restoring native scrolling.",
            );
            teardown();
          }
        }, WATCHDOG_MS);
      })
      .catch(() => {
        // Chunk failed to load. Native scrolling is a fine outcome.
        markLenisResolved();
      });

    return () => {
      cancelled = true;
      teardown();
    };
  }, []);

  return <>{children}</>;
}
