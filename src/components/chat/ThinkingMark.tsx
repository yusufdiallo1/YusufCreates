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

const LOOP = {
  duration: 2.4,
  repeat: Infinity,
  ease: "easeInOut",
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
      {/* Left stroke: pulls out and back, rotating about the mark's centre. */}
      <motion.path
        d={CHEVRON}
        {...stroke}
        style={{ originX: "110px", originY: "110px" }}
        animate={{
          x: [0, -14, 4, 0],
          rotate: [0, -8, 3, 0],
          opacity: [1, 0.45, 0.9, 1],
        }}
        transition={LOOP}
      />

      {/* Right arm: the opposite phase, so they separate rather than drift
          together as one shape. */}
      <motion.path
        d={ARM}
        {...stroke}
        style={{ originX: "110px", originY: "110px" }}
        animate={{
          x: [0, 14, -4, 0],
          rotate: [0, 8, -3, 0],
          opacity: [1, 0.45, 0.9, 1],
        }}
        transition={{ ...LOOP, delay: 0.12 }}
      />

      {/* The block keeps time underneath — it is the one part that stays put,
          which is what makes the other two read as moving. */}
      <motion.rect
        x={99}
        y={155}
        width={34}
        height={17}
        fill="currentColor"
        animate={{ opacity: [1, 0.25, 1], scaleX: [1, 0.7, 1] }}
        style={{ originX: "116px", originY: "163px" }}
        transition={{ ...LOOP, delay: 0.24 }}
      />
    </svg>
  );
}
