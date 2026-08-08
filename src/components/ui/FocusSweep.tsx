"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";

/**
 * FocusSweep — an accent line that sweeps along the bottom edge of a field.
 *
 * Left to right over 240ms on focus, then held at full width. On blur it FADES
 * rather than retracting: retracting reads as undoing the focus, which is the
 * wrong story — you did not un-focus the field, you moved on from it, and the
 * line should stop being relevant rather than run backwards.
 *
 * scaleX on a 1px element with the origin at its left edge, so the whole thing
 * is one composited transform. Animating `width` would relayout the field on
 * every frame of every focus.
 *
 * Place inside a `relative` wrapper around the input itself, not around the
 * whole field group — the line belongs to the control, not to its label and
 * error text.
 */
export function FocusSweep({ active }: { active: boolean }) {
  const reduceMotion = useReducedMotion();
  const scaleX = useMotionValue(0);
  const opacity = useMotionValue(0);

  useEffect(() => {
    if (reduceMotion) return;

    if (active) {
      /*
       * Reset before sweeping.
       *
       * A blurred field is left at full width and zero opacity, so re-focusing
       * it would fade a line that is already drawn rather than sweeping a new
       * one. The sweep has to start from nothing every time, which a
       * declarative animate() between two states cannot express.
       */
      scaleX.set(0);
      opacity.set(1);
      const run = animate(scaleX, 1, {
        duration: 0.24,
        ease: [0.16, 1, 0.3, 1],
      });
      return () => run.stop();
    }

    const run = animate(opacity, 0, { duration: 0.24, ease: "easeOut" });
    return () => run.stop();
  }, [active, reduceMotion, scaleX, opacity]);

  if (reduceMotion) return null;

  return (
    <motion.span
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 block h-px origin-left"
      style={{ background: "var(--accent)", scaleX, opacity }}
    />
  );
}
