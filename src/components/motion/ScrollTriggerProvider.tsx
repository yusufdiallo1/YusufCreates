"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type Lenis from "lenis";
import { gsap, ScrollTrigger, LAG_SMOOTHING_DEFAULT } from "@/lib/gsap";
import {
  claimTicker,
  hasTickerOwner,
  onLenisChange,
  releaseTicker,
} from "@/lib/lenis-instance";
import { useCapability } from "@/components/providers/CapabilityProvider";

/**
 * ScrollTriggerProvider — wires GSAP to whichever scroll source exists.
 *
 * TWO MODES, and both must work:
 *
 *   Lenis mode. Lenis owns the scroll position, so it must drive GSAP's ticker
 *   and push updates into ScrollTrigger. One clock, no drift.
 *
 *   Native mode. On touch and under reduced motion Lenis is never constructed
 *   at all, and ScrollTrigger's own window listener is already correct. It
 *   must not be given a Lenis-shaped configuration it has no Lenis for.
 *
 * MOUNTED ABOVE SmoothScroll so this claims the ticker before Lenis is
 * constructed. SmoothScroll checks the claim and self-drives if it is absent,
 * so the ordering is an optimisation rather than a correctness requirement —
 * but getting it right means the fallback never has to fire.
 *
 * Not initialised at all below `full`: nothing scrubbed runs there, and an
 * idle ScrollTrigger still costs listeners and refresh work.
 */

const TICKER_TOKEN = Symbol("scrolltrigger-provider");

export function ScrollTriggerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { canScrub } = useCapability();
  const pathname = usePathname();

  /* Development only: the bundler scopes these to their module, so without a
     handle there is no way to check trigger counts or ticker ownership from
     the console or from a browser test. Compiled out of production. */
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as Record<string, unknown>;
    w.__gsap = gsap;
    w.__ScrollTrigger = ScrollTrigger;
    w.__hasTickerOwner = hasTickerOwner;
  }, []);

  useEffect(() => {
    if (!canScrub) return;

    let lenis: Lenis | null = null;
    let ticker: ((time: number) => void) | null = null;
    let claimed = false;

    const detach = () => {
      if (lenis) {
        lenis.off("scroll", ScrollTrigger.update);
        lenis = null;
      }
      if (ticker) {
        gsap.ticker.remove(ticker);
        ticker = null;
        // Restore the default. Leaving lag smoothing at 0 in native mode makes
        // a blocking frame jump rather than smooth.
        gsap.ticker.lagSmoothing(...LAG_SMOOTHING_DEFAULT);
      }
      if (claimed) {
        releaseTicker(TICKER_TOKEN);
        claimed = false;
      }
    };

    // Reconfigures whenever Lenis appears or disappears — a hybrid device can
    // toggle reduced motion mid-session, which destroys and rebuilds it.
    const unsubscribe = onLenisChange((next) => {
      detach();
      if (!next) return; // Native mode: ScrollTrigger's own listener is enough.

      lenis = next;
      claimed = claimTicker(TICKER_TOKEN);

      lenis.on("scroll", ScrollTrigger.update);

      if (claimed) {
        // Lenis takes milliseconds; the GSAP ticker reports seconds.
        ticker = (time: number) => lenis?.raf(time * 1000);
        gsap.ticker.add(ticker);
        // Lenis integrates against real elapsed time, so GSAP must report it
        // rather than clamping after a slow frame.
        gsap.ticker.lagSmoothing(0);
      }
    });

    return () => {
      unsubscribe();
      detach();
    };
  }, [canScrub]);

  /*
   * Route changes.
   *
   * Deliberately NOT ScrollTrigger.getAll().forEach(kill) — Next renders the
   * incoming page as the pathname updates, so a blanket kill here destroys
   * triggers the new page has already created. Each consumer owns its own
   * teardown through gsap.context().revert() in its effect cleanup, which
   * React guarantees runs on unmount.
   *
   * What is left is a refresh, deferred one frame so the new page has laid
   * out before start and end positions are recomputed.
   */
  useEffect(() => {
    if (!canScrub) return;
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [pathname, canScrub]);

  /*
   * Recalculation triggers.
   *
   * Fonts shift metrics slightly. Far more importantly, this site's content
   * arrives from Convex after first paint — testimonials, projects — and
   * changes document height. ScrollTrigger caches start/end at creation, so
   * without this every trigger below late-loading content is misaligned.
   */
  useEffect(() => {
    if (!canScrub) return;
    let alive = true;

    document.fonts?.ready.then(() => {
      if (alive) ScrollTrigger.refresh();
    });

    let timer: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      // Debounced: a refresh mid-resize is wasted work, and refreshing during
      // an active scroll produces a visible jump.
      timer = setTimeout(() => ScrollTrigger.refresh(), 150);
    });
    observer.observe(document.body);

    return () => {
      alive = false;
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [canScrub]);

  return <>{children}</>;
}
