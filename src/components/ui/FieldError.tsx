"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/**
 * FieldError — the one way this app reports a validation problem.
 *
 * Native browser bubbles are replaced everywhere. They are unstyleable, sit in
 * OS chrome that ignores the page theme entirely, render in the wrong typeface
 * against a light grey box on our near-black canvas, and they vanish on the
 * next interaction — so a screen reader user may never hear them at all.
 *
 * The tone is deliberately gentle: it says what to do next, not what the person
 * did wrong. No red-alert iconography, no exclamation marks. The colour is a
 * muted amber rather than the danger red, which is reserved for destructive
 * outcomes — a half-typed email address is not an error, it is an unfinished
 * thought.
 *
 * Announced with role="alert" so it reaches assistive technology when it
 * appears, and tied to its input with aria-describedby by the caller.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

export function FieldError({
  id,
  children,
}: {
  id?: string;
  children?: string | null;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false} mode="wait">
      {children ? (
        <motion.p
          key={children}
          id={id}
          role="alert"
          initial={reduceMotion ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
          transition={{ duration: reduceMotion ? 0 : 0.24, ease: EASE }}
          className="mt-2 flex items-start gap-2 text-xs text-[color:var(--text-notice)]"
        >
          {/* A small dot, not a warning triangle. The message carries the
              meaning; the mark is only there to locate it. */}
          <span
            aria-hidden="true"
            className="mt-1.5 size-1 shrink-0 rounded-full bg-[color:var(--text-notice)]"
          />
          <span>{children}</span>
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}
