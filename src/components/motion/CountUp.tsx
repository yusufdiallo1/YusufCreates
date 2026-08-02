"use client";

import { useEffect, useRef, useState } from "react";
import {
  animate,
  useInView,
  useMotionValue,
  useReducedMotion,
} from "motion/react";

/**
 * CountUp — animates a number when it first enters the viewport.
 *
 * The element is rendered with the final value in the markup and updated in
 * place, so the correct figure is present for screen readers and for anyone
 * who never triggers the animation.
 */

interface CountUpProps {
  value: number;
  /** Seconds for the full count. */
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** Overrides prefix/suffix/decimals with full control over formatting. */
  format?: (value: number) => string;
  className?: string;
}

export function CountUp({
  value,
  duration = 1.6,
  decimals = 0,
  prefix = "",
  suffix = "",
  format,
  className,
}: CountUpProps) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  /*
   * A pixel inset rather than a percentage of the viewport: a percentage
   * shrinks the root at top and bottom, and an element sitting just below
   * the fold can end up permanently outside the trigger line — never
   * animating, so a counter would sit at zero on a page that looks loaded.
   */
  const inView = useInView(ref, { once: true, margin: "-40px", amount: "some" });

  const motionValue = useMotionValue(0);
  // Seeded with the final value: correct without JS, correct under reduced
  // motion, and correct for anyone who never scrolls it into view.
  const [display, setDisplay] = useState(() => value);

  // If `value` changes after mount, adopt it during render rather than in an
  // effect, so the DOM never shows a stale figure for a frame.
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setDisplay(value);
  }

  const formatter =
    format ??
    ((n: number) =>
      `${prefix}${n.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}${suffix}`);

  useEffect(() => {
    // Resting state: `display` already holds the final value, so there is
    // nothing to do and no setState in the effect body.
    if (reduceMotion || !inView) return;

    motionValue.set(0);
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplay(latest),
    });
    return () => controls.stop();
  }, [inView, value, duration, reduceMotion, motionValue]);

  return (
    <span ref={ref} className={className}>
      {formatter(display)}
    </span>
  );
}
