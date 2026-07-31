"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Thinking indicator — the logo mark taking itself apart and back together.
 *
 * The two strokes and the block are the same three shapes as the real mark
 * (see src/components/ui/Logo.tsx), so the wait reads as this site rather
 * than as a generic spinner. They drift apart, rotate slightly, and settle
 * back into the lockup on a loop.
 *
 * Transform and opacity only — no filter, no layout — so it costs nothing
 * while a streaming response is arriving.
 *
 * Reduced motion gets the assembled mark at a steady low opacity. Something
 * is still clearly happening, without the movement.
 */

/** Same geometry as the logo. If that changes, change this too. */
const CHEVRON = "M61 48 L92 79 L61 110";
const ARM = "M159 48 L115 92 L115 137";

/*
 * Slower and steadier than it was.
 *
 * The old loop ran 2.4s with the two strokes sliding apart horizontally,
 * which read as the mark coming loose. A thinking state should look like
 * something being assembled, not something falling over — so the strokes now
 * draw and settle in place, and the cycle is long enough that a reply
 * arriving mid-loop does not cut it off mid-lurch.
 */
const LOOP = {
  duration: 3.2,
  repeat: Infinity,
  ease: [0.16, 1, 0.3, 1],
} as const;

export function ThinkingMark({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  const stroke = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 15,
    strokeLinecap: "square" as const,
  };

  if (reduceMotion) {
    return (
      <svg
        viewBox="0 0 220 220"
        className={className}
        role="status"
        aria-label="Thinking"
      >
        <g opacity={0.55}>
          <path d={CHEVRON} {...stroke} />
          <path d={ARM} {...stroke} />
          <rect x={99} y={155} width={34} height={17} fill="currentColor" />
        </g>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 220 220"
      className={className}
      role="status"
      aria-label="Thinking"
    >
      {/* The strokes DRAW rather than move. pathLength animates the stroke
          along its own path, so the mark writes itself in and fades out —
          the same gesture as the typing it is waiting for. */}
      <motion.path
        d={CHEVRON}
        {...stroke}
        style={{ originX: "110px", originY: "110px" }}
        animate={{
          pathLength: [0.15, 1, 1, 0.15],
          opacity: [0.3, 1, 1, 0.3],
        }}
        transition={LOOP}
      />

      {/* Second stroke, a quarter-second behind. */}
      <motion.path
        d={ARM}
        {...stroke}
        style={{ originX: "110px", originY: "110px" }}
        animate={{
          pathLength: [0.15, 1, 1, 0.15],
          opacity: [0.3, 1, 1, 0.3],
        }}
        // Trails the chevron, so the mark assembles rather than appearing.
        transition={{ ...LOOP, delay: 0.25 }}
      />

      {/* The block keeps time underneath — it is the one part that stays put,
          which is what makes the other two read as moving. */}
      <motion.rect
        x={99}
        y={155}
        width={34}
        height={17}
        fill="currentColor"
        animate={{ opacity: [0.2, 1, 1, 0.2], scaleX: [0.4, 1, 1, 0.4] }}
        style={{ originX: "116px", originY: "163px" }}
        transition={{ ...LOOP, delay: 0.5 }}
      />
    </svg>
  );
}
