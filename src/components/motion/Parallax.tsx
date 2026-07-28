"use client";

import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";

/**
 * Parallax — offsets content against scroll position.
 *
 * Progress is measured from the element entering the viewport to leaving it,
 * so the effect is symmetric around the centre of the screen regardless of
 * where the element sits on the page.
 */

interface ParallaxProps {
  children: React.ReactNode;
  /**
   * Pixels of travel across the full scroll pass. Positive moves with the
   * scroll (slower than the page), negative moves against it.
   */
  distance?: number;
  axis?: "y" | "x";
  className?: string;
}

export function Parallax({
  children,
  distance = 80,
  axis = "y",
  className,
}: ParallaxProps) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const travel = useTransform(
    scrollYProgress,
    [0, 1],
    [distance, -distance],
  );

  // Resting state: no offset at all, children render in flow.
  if (reduceMotion) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <div ref={ref} className={className} data-parallax>
      <motion.div
        style={{
          [axis]: travel,
          willChange: "transform",
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
