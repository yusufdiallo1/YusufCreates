"use client";

import { motion, useScroll, useSpring } from "motion/react";

/**
 * ScrollProgress — a 2px accent bar pinned to the very top of the viewport,
 * scaling from the left as the page scrolls.
 *
 * scaleX is used rather than width because transform is compositor-only; an
 * animated width would trigger layout on every frame of every scroll.
 *
 * ⚠ MOUNT THIS ONCE, in the marketing layout. It was previously rendered
 * there AND in five individual pages, so about, blog, blog/[slug], services
 * and work each stacked two identical fixed bars — indistinguishable on
 * screen, and each one running its own useScroll subscription and spring on
 * every frame of every scroll. The layout already covers every marketing
 * route, so a page never needs its own.
 *
 * REDUCED MOTION IS A CSS CONCERN HERE, not a render branch.
 *
 * This used to `return null` under prefers-reduced-motion. useReducedMotion
 * cannot know the preference on the server, so it answered false there and
 * true on the client — the server sent this element and the client expected
 * the next one, and React threw out and re-rendered the entire marketing tree
 * on every page load for anyone with the preference set. The people most
 * likely to be on a device that cannot afford a full re-render were the only
 * ones paying for one.
 *
 * `motion-reduce:hidden` is a plain media query, so both passes render exactly
 * the same markup and the bar simply is not painted.
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();

  // Smoothed so the bar glides rather than tracking wheel jitter exactly.
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden="true"
      className="motion-reduce:hidden"
      style={{
        scaleX,
        transformOrigin: "left",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        zIndex: 60,
        background: "var(--accent)",
        willChange: "transform",
      }}
    />
  );
}
