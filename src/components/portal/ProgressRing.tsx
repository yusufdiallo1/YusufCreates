"use client";

import { useEffect } from "react";
import {
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useUpdateFlash } from "@/lib/useUpdateFlash";

/**
 * ProgressRing — the project's completion, charging rather than reporting.
 *
 * A bar that fills to 40% tells you 40%. This tells you 40% AND that 40% is
 * early: the stroke is thin and the colour is the quiet secondary text colour,
 * and both thicken and warm toward the accent as the value climbs. At 100 it
 * holds a glow for a beat and settles. The reading is the same; the feeling is
 * of something filling up, which is what a project in progress actually is.
 *
 *   stroke-width  3 at 0%  →  5 at 100%
 *   stroke        --text-secondary at 0%  →  --accent at 100%
 *
 * The colour transition is TWO ARCS CROSSFADING rather than one interpolated
 * stroke. Motion can interpolate colours but not `var(--accent)` — a custom
 * property is an unresolved token at the time the interpolation is set up, so
 * animating between two of them produces a jump. Two arcs, opposite opacities,
 * same geometry: the same crossfade, and both ends stay themed.
 */

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ProgressRing({
  value,
  label,
}: {
  /** 0–100. */
  value: number;
  label: string;
}) {
  const reduceMotion = useReducedMotion();

  /** 0–1, the animated position. Everything else is derived from it. */
  const t = useMotionValue(reduceMotion ? value / 100 : 0);
  /** Rises at the very end and settles back — the charge completing. */
  const glow = useMotionValue(0);

  useEffect(() => {
    const run = animate(t, Math.max(0, Math.min(100, value)) / 100, {
      duration: reduceMotion ? 0 : 1.1,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => run.stop();
  }, [value, reduceMotion, t]);

  useEffect(() => {
    if (value < 100 || reduceMotion) return;
    // Up as the ring closes, then down to a level it holds. A glow that
    // vanishes says the moment is over; one that settles says it is done.
    const run = animate(glow, 1, {
      duration: 0.5,
      delay: 0.9,
      ease: "easeOut",
      onComplete: () => {
        animate(glow, 0.4, { duration: 0.6, ease: [0.16, 1, 0.3, 1] });
      },
    });
    return () => run.stop();
  }, [value, reduceMotion, glow]);

  const offset = useTransform(t, (v) => CIRCUMFERENCE * (1 - v));
  const width = useTransform(t, [0, 1], [3, 5]);
  const accentOpacity = useTransform(t, [0, 1], [0, 1]);
  const glowRadius = useTransform(glow, [0, 1], [0, 7]);
  const filter = useMotionTemplate`drop-shadow(0 0 ${glowRadius}px var(--accent))`;

  /*
   * And the product-wide update signal on top of the charge.
   *
   * The ring animating to a new value already shows the change, but only to
   * someone watching the ring. The border flash is the language every live
   * figure in the admin and the portal speaks, and the point of a shared
   * language is that it works on the thing you were not looking at.
   */
  const flashRef = useUpdateFlash<HTMLDivElement>(value);

  return (
    <div
      ref={flashRef}
      className="relative size-28 shrink-0 rounded-full"
      role="img"
      aria-label={`${Math.round(value)} percent complete. ${label}`}
    >
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        {/* The groove. Always the full circle, so the ring reads as a
            container being filled rather than as an arc floating in space. */}
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke="var(--bg-surface-2)"
          strokeWidth={5}
        />

        {/* Early: quiet, thin. */}
        <motion.circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke="var(--text-secondary)"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          style={{ strokeWidth: width, strokeDashoffset: offset }}
        />

        {/* Late: the accent, faded in over the top of it. */}
        <motion.circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke="var(--accent)"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          style={{
            strokeWidth: width,
            strokeDashoffset: offset,
            opacity: accentOpacity,
            filter,
          }}
        />
      </svg>

      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center text-lg tabular-nums text-primary"
      >
        {Math.round(value)}%
      </span>
    </div>
  );
}
