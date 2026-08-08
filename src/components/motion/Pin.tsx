"use client";

import { useRef } from "react";
import { useScroll, useTransform, type MotionValue } from "motion/react";

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
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const activeIndex = useTransform(scrollYProgress, [0, 1], [0, steps - 1]);

  /*
   * One tree, and `pinned` is a constant.
   *
   * This used to return a flat <div> under reduced motion against a tall
   * container with a sticky child otherwise — two different trees, and
   * `pinned` flipping under the render prop meant the CHILDREN could differ
   * too. useReducedMotion is null on the server and a boolean on the client,
   * so that mismatched hydration; see Reveal.tsx for the rule.
   *
   * Unpinning is done in CSS instead, by the `data-pin` rules in globals.css:
   * the container's height collapses and the sticky child goes static, which
   * is the same resting layout the old branch produced. Pinning is precisely
   * what someone asking for reduced motion is asking not to have — it detaches
   * scroll position from page movement — so the override is unconditional.
   */
  return (
    <div
      ref={ref}
      className={className}
      data-pin
      // One viewport per step, so each gets equal scroll distance.
      style={{ height: `${steps * 100}dvh` }}
    >
      <div data-pin-sticky className="sticky top-0 h-[100dvh] overflow-hidden">
        {children({ progress: scrollYProgress, activeIndex, pinned: true })}
      </div>
    </div>
  );
}
