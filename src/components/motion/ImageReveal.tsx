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

  /*
   * One tree, and reduced motion only changes the durations.
   *
   * Returning a plain <div> here changed the element type and dropped an inner
   * wrapper, from a hook that is null on the server and a boolean on the
   * client — the same hydration failure fixed across the other primitives in
   * this directory. See Reveal.tsx for the rule in full.
   *
   * `whileInView` stays unconditional in both wrappers below: it is what
   * animates away from the clip-path and the scale, and gating it would leave
   * the image permanently clipped out of view.
   */
  const instant = { duration: 0 };

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ overflow: "hidden", willChange: "clip-path" }}
      initial={{ clipPath: "inset(100% 0 0 0)" }}
      whileInView={{ clipPath: "inset(0% 0 0 0)" }}
      viewport={{ once: true, margin: "0px", amount: "some" }}
      transition={
        reduceMotion
          ? instant
          : { duration: 1, delay, ease: [0.16, 1, 0.3, 1] }
      }
    >
      {/*
        Must fill the frame. A next/image with `fill` resolves against its
        nearest positioned ancestor — which is this wrapper, not the frame
        outside it. Left as an auto-height block it collapses to zero and the
        image never appears.
      */}
      <motion.div
        style={{
          position: "absolute",
          inset: 0,
          willChange: "transform",
        }}
        initial={{ scale: 1.15 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true, margin: "0px", amount: "some" }}
        transition={
          reduceMotion
            ? instant
            : { duration: 1.2, delay, ease: [0.16, 1, 0.3, 1] }
        }
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
