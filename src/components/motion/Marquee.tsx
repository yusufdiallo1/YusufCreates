"use client";

import { useAnimationFrame, useMotionValue, useReducedMotion } from "motion/react";
import { motion } from "motion/react";
import { Children, useRef, useState } from "react";

/**
 * Marquee — seamless infinite horizontal loop.
 *
 * The content is rendered twice and the track translates by exactly half its
 * width, so at the wrap point the second copy sits precisely where the first
 * started and the reset is invisible. Motion is linear; easing would visibly
 * stutter at the seam.
 *
 * The loop is driven per-frame rather than by a keyframe transition, because
 * pausing on hover has to freeze mid-cycle and resume from the same offset —
 * a declarative repeat cannot do that.
 */

interface MarqueeProps {
  children: React.ReactNode;
  /** Seconds for one full pass. Higher is slower. */
  speed?: number;
  direction?: "left" | "right";
  /** Gap between items, in pixels. */
  gap?: number;
  pauseOnHover?: boolean;
  className?: string;
}

export function Marquee({
  children,
  speed = 30,
  direction = "left",
  gap = 48,
  pauseOnHover = true,
  className,
}: MarqueeProps) {
  const reduceMotion = useReducedMotion();
  const items = Children.toArray(children);

  const trackRef = useRef<HTMLDivElement>(null);
  const offset = useMotionValue(0);
  const [paused, setPaused] = useState(false);

  useAnimationFrame((_, delta) => {
    if (reduceMotion || paused) return;
    const track = trackRef.current;
    if (!track) return;

    // Half the track is one full copy of the content.
    const half = track.scrollWidth / 2;
    if (half <= 0) return;

    const perMs = half / (speed * 1000);
    const next =
      offset.get() + (direction === "left" ? -1 : 1) * perMs * delta;

    // Normalise into [-half, 0). Because the two copies are identical, any
    // offset differing by exactly `half` renders the same pixels, so this
    // wrap is invisible.
    offset.set((((next % half) - half) % half));
  });

  const row = (ariaHidden: boolean) => (
    <div
      aria-hidden={ariaHidden || undefined}
      style={{ display: "flex", gap, paddingRight: gap, flexShrink: 0 }}
    >
      {items.map((child, index) => (
        <div key={index} style={{ flexShrink: 0 }}>
          {child}
        </div>
      ))}
    </div>
  );

  // Resting state: a static, scrollable row. No motion, no duplicate content.
  if (reduceMotion) {
    return (
      <div
        className={className}
        style={{ display: "flex", gap, overflowX: "auto" }}
      >
        {items.map((child, index) => (
          <div key={index} style={{ flexShrink: 0 }}>
            {child}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={className}
      data-marquee
      style={{ overflow: "hidden", display: "flex" }}
      onPointerEnter={pauseOnHover ? () => setPaused(true) : undefined}
      onPointerLeave={pauseOnHover ? () => setPaused(false) : undefined}
    >
      <motion.div
        ref={trackRef}
        style={{ display: "flex", x: offset, willChange: "transform" }}
      >
        {row(false)}
        {/* Duplicate is decorative — the first copy carries the real content. */}
        {row(true)}
      </motion.div>
    </div>
  );
}
