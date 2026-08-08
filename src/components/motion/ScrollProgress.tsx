"use client";

import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";

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
 */
export function ScrollProgress() {
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();

  // Smoothed so the bar glides rather than tracking wheel jitter exactly.
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  if (reduceMotion) return null;

  return (
    <motion.div
      aria-hidden="true"
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
