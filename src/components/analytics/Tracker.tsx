"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/track";
import { setLastSection } from "@/lib/journey";

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

  /*
   * Where they stopped reading, for the "pick up where you left off" link on
   * the next visit.
   *
   * An IntersectionObserver rather than a second scroll handler: the question
   * is which section is on screen, which is precisely what the observer
   * answers, and the browser computes it off the main thread. Reusing the
   * scroll listener above would mean measuring every section's box on every
   * frame to derive something already available for free.
   *
   * Local, never sent — this writes to the journey record in localStorage.
   * See src/lib/journey.ts for why that is separate from the analytics above.
   */
  const lastWrite = useRef(0);

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>("section[id]");
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        /*
         * Throttled to one write a second.
         *
         * A fast scroll through a long page fires this for every section it
         * passes, and each one is a JSON parse, a merge and a serialise
         * against localStorage — which is synchronous and blocks the main
         * thread. The value only has to be right when the tab closes.
         */
        const now = Date.now();
        if (now - lastWrite.current < 1000) return;

        // The most intersecting entry wins, so a tall section passing behind a
        // short one does not claim the position.
        const best = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!best) return;

        lastWrite.current = now;
        setLastSection(best.target.id);
      },
      // A band across the middle of the viewport: a section counts as "where
      // you are" when it holds the centre, not when its first pixel appears.
      { rootMargin: "-40% 0px -40% 0px", threshold: 0 },
    );

    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
