"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Reveal — generic fade and rise on viewport entry.
 *
 * The default wrapper for anything that should arrive rather than simply be
 * there. Only transform and opacity are animated.
 */

interface RevealProps {
  children: React.ReactNode;
  /** Seconds before the animation starts. */
  delay?: number;
  duration?: number;
  /** Pixels risen from. Negative values drop in from above. */
  y?: number;
  /** How far into the viewport before triggering. */
  margin?: string;
  once?: boolean;
  className?: string;
}

export function Reveal({
  children,
  delay = 0,
  duration = 0.6,
  y = 16,
  margin = "-10%",
  once = true,
  className,
}: RevealProps) {
  const reduceMotion = useReducedMotion();

  // Resting state: rendered in place, fully visible.
  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{ willChange: "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
}
