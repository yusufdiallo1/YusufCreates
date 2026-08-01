"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/**
 * Digits that roll rather than snap.
 *
 * A countdown that replaces its text every second reads as a value being
 * overwritten. Rolling each digit through its own little window reads as time
 * passing, which is what the number actually means — and on the express
 * portal the clock IS the product, so it should look like one.
 *
 * Per digit, not per number: only the digits that actually changed move. A
 * whole-figure transition makes all six jump when the seconds tick, which is
 * both busier and less legible than the thing it replaced.
 */

/**
 * One tabular figure's advance width.
 *
 * Shared by both the animated and the reduced-motion branch. The animated one
 * has to state a width because its digit is absolutely positioned and would
 * otherwise collapse the box to nothing — and if the static branch used its
 * natural width instead, the clock would be a different size for someone with
 * reduced motion on than for everyone else.
 */
const DIGIT_WIDTH = "0.62em";

function Digit({ char, height }: { char: string; height: string }) {
  const reduceMotion = useReducedMotion();

  // Anything that is not a digit — a colon, a comma, a minus — is fixed
  // furniture. Animating it would draw the eye to punctuation.
  if (!/\d/.test(char)) {
    // A space has to be non-breaking: this is one span per character, and a
    // plain space at the edge of an inline-block is collapsed away, closing
    // the gap in "1d 05:30".
    return (
      <span className="inline-block">{char === " " ? " " : char}</span>
    );
  }

  if (reduceMotion) {
    return (
      <span
        className="inline-block text-center tabular-nums"
        style={{ width: DIGIT_WIDTH }}
      >
        {char}
      </span>
    );
  }

  return (
    <span
      className="relative inline-block overflow-hidden tabular-nums"
      style={{ height, width: DIGIT_WIDTH, verticalAlign: "bottom" }}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={char}
          // Enters from above and leaves below: the direction a counter
          // physically turns, so it reads as one wheel rather than two
          // unrelated fades.
          initial={{ y: "-100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {char}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function RollingNumber({
  value,
  className,
  /** Must match the line height of the text it sits in, or digits clip. */
  height = "1em",
  label,
}: {
  /** Pre-formatted, so the caller owns padding, separators and the sign. */
  value: string;
  className?: string;
  height?: string;
  /**
   * What a screen reader should say instead of the split-up characters.
   * Defaults to the raw value, which reads acceptably for a plain number but
   * not for a clock — "05:30:12" is announced as punctuation. A caller
   * showing time should pass "5 hours, 30 minutes remaining".
   */
  label?: string;
}) {
  return (
    /*
     * The visual digits are hidden from assistive tech and a single live
     * string is exposed instead. Split across one span per character, a
     * screen reader reads a countdown out as "zero, five, colon, three,
     * zero" — technically the same characters, useless as a time.
     *
     * Not aria-live: this changes every second, and a polite region would
     * queue an announcement per tick until the queue is the only thing being
     * read. Someone who wants the value asks for it.
     */
    <span className={className}>
      <span aria-hidden="true">
        {value.split("").map((char, i) => (
          /*
           * Keyed by position AND by kind, not by index alone.
           *
           * The string changes shape as it counts — "1d 05:30" becomes
           * "05:30:12" when the last day runs out — so index 2 can hold a
           * digit one second and a space the next. A bare index key rolls a
           * "5" into a blank as though it were a value changing. Folding the
           * kind into the key makes that a swap rather than a transition,
           * while two different digits at one position still animate.
           */
          <Digit
            key={`${i}-${/\d/.test(char) ? "d" : char}`}
            char={char}
            height={height}
          />
        ))}
      </span>
      <span className="sr-only">{label ?? value}</span>
    </span>
  );
}
