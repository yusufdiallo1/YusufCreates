"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

/**
 * Sweep — a light passing across a card when something above it changed.
 *
 * Used on the pricing row when the currency changes. Every figure on the page
 * is recomputed at that moment, and doing it everywhere at once reads as the
 * page having been replaced. Staggering the cards 60ms apart turns the same
 * update into one thing travelling across the row, which is legible as cause
 * and effect: you pressed a button on the left and the change moved right.
 *
 * The card's own number adopts its new value as the light reaches it — see
 * RippleNumber's holdMs, which takes the same delay. The two are given the
 * same arithmetic rather than being wired together, because a card that never
 * shows a figure still wants the light to pass over it.
 *
 * Nothing on first paint. A sweep on arrival would say something changed when
 * nothing had.
 */

/** Milliseconds between one card's sweep and the next. */
export const SWEEP_STAGGER = 60;
/** How long the light takes to cross one card, in seconds. */
const SWEEP_DURATION = 0.4;

/**
 * When card `index` should adopt its new value, in milliseconds.
 *
 * Its own stagger plus roughly half the crossing, so the figure changes as the
 * light is over it rather than before it arrives or after it has gone.
 */
export function sweepHold(index: number): number {
  return index * SWEEP_STAGGER + (SWEEP_DURATION * 1000) / 2;
}

export function Sweep({
  /** Changing this runs a sweep. The value itself is not used. */
  trigger,
  /** Position in the row, left to right. */
  index,
}: {
  trigger: string;
  index: number;
}) {
  const reduceMotion = useReducedMotion();
  const [run, setRun] = useState(0);
  const seen = useRef(trigger);

  useEffect(() => {
    // First commit is not a change.
    if (seen.current === trigger) return;
    seen.current = trigger;
    setRun((n) => n + 1);
  }, [trigger]);

  if (reduceMotion || run === 0) return null;

  return (
    /* The clip lives here rather than on the card. Putting overflow-hidden on
       the card would also clip its border beam and its shadow, and the sweep is
       the only thing that needs containing. rounded-[inherit] so the light
       stops at the card's own corners. */
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
    >
      <motion.span
        key={run}
        className="absolute inset-y-0 left-0 block w-full"
        initial={{ x: "-130%" }}
        animate={{ x: "130%" }}
        transition={{
          duration: SWEEP_DURATION,
          delay: (index * SWEEP_STAGGER) / 1000,
          ease: "easeInOut",
        }}
        style={{
          background:
            "linear-gradient(100deg, transparent 32%, rgba(255,255,255,0.10) 50%, transparent 68%)",
        }}
      />
    </span>
  );
}
