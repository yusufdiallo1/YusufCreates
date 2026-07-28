"use client";

import {
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useVelocity,
  type MotionValue,
} from "motion/react";

/**
 * useScrollVelocity — a normalised, signed scroll speed.
 *
 * Returns roughly -1 to 1: negative scrolling up, positive scrolling down,
 * magnitude rising with speed. Feed it into Marquee so the ticker accelerates
 * with the scroll and briefly runs backwards when the direction flips. Small
 * detail, and it is most of what makes a page feel alive rather than static.
 */
export function useScrollVelocity(): MotionValue<number> {
  const { scrollY } = useScroll();
  const velocity = useVelocity(scrollY);
  const normalised = useMotionValue(0);

  useMotionValueEvent(velocity, "change", (latest) => {
    // 2000 px/s is about as fast as a real flick; clamp so one violent
    // trackpad swipe cannot send the marquee into a blur.
    const clamped = Math.max(-1, Math.min(1, latest / 2000));
    normalised.set(clamped);
  });

  return normalised;
}
