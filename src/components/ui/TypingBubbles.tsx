"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * TypingBubbles — the three-dot indicator every messaging app uses.
 *
 * Borrowed on purpose. It is one of the few pieces of interface vocabulary
 * that needs no explanation anywhere in the world, and a chat that invents its
 * own pending state is throwing that away for nothing.
 *
 * The dots do not pulse in unison. A staggered wave is what reads as activity;
 * three dots breathing together reads as a loading spinner that has been
 * flattened.
 *
 * Under reduced motion it becomes three static dots, which still occupies the
 * space and still says "something is happening here" without the movement.
 */
export function TypingBubbles({ label }: { label?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <span
      className="inline-flex items-center gap-1"
      role="status"
      aria-label={label ?? "Sending"}
    >
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          aria-hidden="true"
          className="block size-1.5 rounded-full bg-[color:var(--text-secondary)]"
          animate={
            reduceMotion
              ? undefined
              : { opacity: [0.3, 1, 0.3], y: [0, -2.5, 0] }
          }
          transition={{
            duration: 1.1,
            repeat: Infinity,
            // The wave. A third of a beat apart, so the movement travels left
            // to right rather than happening to all three at once.
            delay: index * 0.16,
            ease: "easeInOut",
          }}
        />
      ))}
    </span>
  );
}
