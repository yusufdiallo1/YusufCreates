"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/track";

/**
 * Pageviews and scroll depth.
 *
 * The referrer, device, browser and UTM parameters are attached by track()
 * itself now, so this no longer assembles them — it used to pass a referrer
 * only on the first view of a session, which was the right rule in the wrong
 * place.
 *
 * Scroll depth answers where a page loses people, which is the one thing a
 * pageview count cannot tell you: a landing page with a 90% bounce and a
 * landing page nobody scrolls past the fold on need different fixes.
 */
export function Tracker() {
  const pathname = usePathname();

  useEffect(() => {
    track("pageview");
  }, [pathname]);

  /*
   * Four milestones, each fired once per page.
   *
   * A ref keyed to the path rather than component state: this must reset on
   * navigation but must never cause a re-render, and a scroll handler that
   * re-renders the tree is a scroll handler that drops frames.
   */
  const fired = useRef<Set<number>>(new Set());

  useEffect(() => {
    fired.current = new Set();

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;

      // Coalesced into a frame: scroll fires far faster than this needs to.
      requestAnimationFrame(() => {
        ticking = false;

        const doc = document.documentElement;
        const scrollable = doc.scrollHeight - window.innerHeight;
        // A page shorter than the viewport has no depth to measure, and
        // dividing by zero would report every short page as 100%.
        if (scrollable <= 0) return;

        const pct = ((window.scrollY / scrollable) * 100) | 0;
        for (const mark of [25, 50, 75, 100]) {
          if (pct >= mark && !fired.current.has(mark)) {
            fired.current.add(mark);
            track("scroll_depth", { value: mark });
          }
        }
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  return null;
}
