"use client";

import { useRef } from "react";
import { motion, useReducedMotion } from "motion/react";

/**
 * ImageReveal — a mask wipes upward off the image while the image itself
 * scales down from 1.15 to 1.0 inside the frame.
 *
 * The counter-scale is what sells it: the picture appears to settle into place
 * rather than simply appearing. Both layers animate transform and clip-path
 * only, so nothing triggers layout.
 *
 * Under reduced motion the final resting state renders immediately — full
 * opacity, no scale, no wipe.
 */

interface ImageRevealProps {
  children: React.ReactNode;
  /** Seconds before the wipe starts. */
  delay?: number;
  className?: string;
}

export function ImageReveal({
  children,
  delay = 0,
  className,
}: ImageRevealProps) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ overflow: "hidden", willChange: "clip-path" }}
      initial={{ clipPath: "inset(100% 0 0 0)" }}
      whileInView={{ clipPath: "inset(0% 0 0 0)" }}
      viewport={{ once: true, margin: "-12%" }}
      transition={{ duration: 1, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        style={{ willChange: "transform" }}
        initial={{ scale: 1.15 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true, margin: "-12%" }}
        transition={{ duration: 1.2, delay, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
