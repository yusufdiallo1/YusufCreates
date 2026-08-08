"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/**
 * RippleNumber — a figure whose digits change left to right rather than at once.
 *
 * A price that swaps as one block reads as a value being overwritten. Rippling
 * it across the digit positions reads as the number being recalculated, which
 * is what actually happened: someone moved a slider or changed currency and the
 * figure was worked out again.
 *
 * Forty milliseconds between positions — the whole ripple is over inside a
 * fifth of a second on a five-digit price, and the direction is still legible.
 *
 * WHY THIS EXISTS ALONGSIDE RollingNumber
 *
 * RollingNumber rolls each digit through its own window with NO stagger,
 * because it is a clock: every position ticks on its own schedule and a cascade
 * across a time would be a lie about what changed. This is a price, where the
 * whole figure is recomputed at one moment and the cascade is the truth. Same
 * mechanism, opposite requirement.
 *
 * LAYOUT SHIFT IS THE THING TO GET RIGHT. The digits swap in and out of the
 * same box, so without tabular figures and a reserved width the price would
 * jitter sideways on every change and drag the currency symbol with it.
 * `tabular-nums` fixes the advance width of every digit; `reserve` holds the
 * box at the widest figure the caller expects.
 */
export function RippleNumber({
  value,
  format = (n) => n.toLocaleString("en-US"),
  /**
   * Widest figure this will ever hold, in characters. Reserved up front so a
   * price going from 750 to 12,000 does not shove the layout sideways.
   */
  reserve,
  /**
   * Wait this long before adopting a new value, in milliseconds.
   *
   * How the currency sweep travels: each card is given a delay matching when
   * the light reaches it, so the figures change in sequence along the row
   * rather than all at once behind a sweep that is still crossing the first
   * card.
   */
  holdMs = 0,
  className,
}: {
  value: number;
  format?: (value: number) => string;
  reserve?: number;
  holdMs?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const text = format(value);

  /*
   * The figure on screen, which lags `text` by holdMs.
   *
   * Adopted DURING RENDER when there is nothing to wait for, rather than in an
   * effect. A setState in an effect body to copy a prop into state is a
   * cascading second render for a value that was already correct, and on a
   * slider being dragged that is one wasted render per pixel.
   */
  const [shown, setShown] = useState(text);
  const [latest, setLatest] = useState(text);

  if (text !== latest && (reduceMotion || holdMs <= 0)) {
    setLatest(text);
    setShown(text);
  }

  useEffect(() => {
    if (reduceMotion || holdMs <= 0) return;
    const id = window.setTimeout(() => {
      setLatest(text);
      setShown(text);
    }, holdMs);
    return () => window.clearTimeout(id);
  }, [text, holdMs, reduceMotion]);

  /*
   * NO EARLY RETURN FOR REDUCED MOTION.
   *
   * This used to render a single plain <span> containing the text, against a
   * per-character structure otherwise — completely different subtrees from a
   * hook that is null on the server and a boolean on the client. Every price on
   * /pricing is one of these, so a reduced-motion visitor failed hydration hard
   * enough that React regenerated the whole route rather than patching it.
   *
   * The per-character structure renders identically at rest; what reduced
   * motion removes is the ripple, and that is already handled above — the
   * effect returns early, so `shown` tracks `text` immediately and no character
   * ever animates. See motion/Reveal.tsx for the rule.
   */
  return (
    <span
      className={className}
      style={{
        fontVariantNumeric: "tabular-nums",
        display: "inline-flex",
        minWidth: reserve ? `${reserve}ch` : undefined,
      }}
      // The live figure, for anyone who is not watching it animate.
      aria-label={text}
    >
      {shown.split("").map((character, index) => (
        <span
          key={index}
          aria-hidden="true"
          style={{
            position: "relative",
            display: "inline-block",
            /* Digits get a fixed slot; separators keep their natural width, so
               a price crossing a thousand does not shift the digits around the
               comma it just gained. */
            width: /\d/.test(character) ? "0.62em" : undefined,
            textAlign: "center",
            overflow: "hidden",
          }}
        >
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={character}
              initial={{ y: "-70%", opacity: 0 }}
              animate={{ y: "0%", opacity: 1 }}
              exit={{ y: "70%", opacity: 0 }}
              /* Instant under reduced motion — the figure changes without the
                 travel. The markup is identical either way; only the timing
                 differs, which is what keeps this hydration-safe. */
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : {
                      duration: 0.28,
                      // The ripple. Index-derived, so the leftmost position
                      // moves first and the change travels along the number.
                      delay: index * 0.04,
                      ease: [0.16, 1, 0.3, 1],
                    }
              }
              style={{ display: "inline-block" }}
            >
              {character === " " ? " " : character}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}
