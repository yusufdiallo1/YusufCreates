"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/**
 * The waiting state for a site audit.
 *
 * A PageSpeed run takes 30-60 seconds, which is long enough that a single line
 * of static text reads as broken. The stages below are honest about what is
 * actually happening — fetching the page, then rendering it, then measuring —
 * so the wait has a shape rather than being an indefinite hang.
 *
 * The timings are approximate and deliberately do not claim a percentage. A
 * fake progress bar that sits at 90% is worse than no bar, because the moment
 * someone notices it is lying, nothing else on the page is trusted either.
 */

const STAGES = [
  { at: 0, label: "Fetching the page" },
  { at: 6_000, label: "Rendering it on a mid-range phone" },
  { at: 16_000, label: "Measuring load and interaction" },
  { at: 28_000, label: "Checking accessibility and SEO" },
  { at: 42_000, label: "Writing up what to fix" },
];

export function AuditProgress() {
  const reduceMotion = useReducedMotion();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - started), 500);
    return () => clearInterval(id);
  }, []);

  const stage =
    STAGES.filter((s) => elapsed >= s.at).at(-1) ?? STAGES[0];
  const index = STAGES.indexOf(stage);

  return (
    <div className="mt-12 text-center">
      {/*
       * Three dots on a staggered loop. Cheap — transform and opacity only,
       * no layout, no filter — so it costs nothing while a heavy network call
       * is in flight.
       */}
      <div
        className="flex items-center justify-center gap-1.5"
        role="status"
        aria-label="Audit in progress"
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            aria-hidden="true"
            className="size-2 rounded-full bg-[color:var(--accent)]"
            animate={
              reduceMotion ? undefined : { opacity: [0.25, 1, 0.25], y: [0, -4, 0] }
            }
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.16,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Height reserved so the block does not jump as the label changes. */}
      <div className="mt-6 flex h-7 items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={stage.label}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: reduceMotion ? 0.15 : 0.32 }}
            className="text-lg text-primary"
          >
            {stage.label}…
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Stage pips: position without a number, so nothing is overclaimed. */}
      <div className="mt-5 flex items-center justify-center gap-1.5">
        {STAGES.map((s, i) => (
          <span
            key={s.label}
            aria-hidden="true"
            className={`h-1 rounded-full transition-all duration-slow ${
              i <= index ? "w-6 bg-[color:var(--accent)]" : "w-3 bg-surface-3"
            }`}
          />
        ))}
      </div>

      <p className="mt-6 text-sm text-secondary">
        {elapsed > 60_000
          ? "Taking longer than usual — a slow site takes longer to measure. Still going."
          : "Up to a minute. Results appear here on their own, no refresh needed."}
      </p>
    </div>
  );
}
