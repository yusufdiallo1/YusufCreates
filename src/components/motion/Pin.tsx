"use client";

import { useRef } from "react";
import {
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";

/**
 * Pin — sticky scroll section.
 *
 * The outer container is given an explicit tall height and the child sticks to
 * the top while it passes. `steps` divides that scroll distance evenly and
 * exposes the active index, so a caller can drive a title or progress bar.
 *
 * Heights use dvh rather than vh: on iOS Safari the URL bar collapses mid
 * scroll, which changes vh and makes a pinned section jump. dvh tracks the
 * live viewport instead.
 *
 * Under reduced motion the pin is dropped entirely — the render prop still
 * runs, with a static progress of 0, so callers can stack their content.
 */

interface PinProps {
  steps: number;
  children: (state: {
    progress: MotionValue<number>;
    activeIndex: MotionValue<number>;
    pinned: boolean;
  }) => React.ReactNode;
  className?: string;
}

export function Pin({ steps, children, className }: PinProps) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const activeIndex = useTransform(scrollYProgress, [0, 1], [0, steps - 1]);

  if (reduceMotion) {
    return (
      <div className={className}>
        {children({ progress: scrollYProgress, activeIndex, pinned: false })}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={className}
      // One viewport per step, so each gets equal scroll distance.
      style={{ height: `${steps * 100}dvh` }}
    >
      <div className="sticky top-0 h-[100dvh] overflow-hidden">
        {children({ progress: scrollYProgress, activeIndex, pinned: true })}
      </div>
    </div>
  );
}
