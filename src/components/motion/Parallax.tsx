"use client";

import { useRef } from "react";
/* No useReducedMotion here any more — the preference is applied entirely in
   CSS via [data-parallax-track]. See the comment in the component body. */
import { motion, useScroll, useTransform } from "motion/react";

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
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  /*
   * IDENTICAL MARKUP IN BOTH PASSES — reduced motion is handled entirely in CSS.
   *
   * Two versions of this were wrong. The first returned a plain <div> under
   * reduced motion, dropping the inner motion.div: two different trees from a
   * hook that is null on the server, so hydration failed on /work, /services,
   * /enterprise and every case study.
   *
   * The second collapsed this output range to [0, 0]. That looked right and
   * was not, because the range does not START at rest — at scroll progress 0 it
   * sits at `distance`, so the server serialised `translateY(48px)` where a
   * collapsed client serialised `none`. Same mismatch, subtler.
   *
   * So the range is unconditional and the resting state is imposed by
   * `[data-parallax-track]` in the reduced-motion block of globals.css. A media
   * query is evaluated against server HTML exactly as against client HTML, so
   * it cannot take part in a hydration mismatch at all — which makes it the
   * only correct place for this decision.
   */
  const travel = useTransform(scrollYProgress, [0, 1], [distance, -distance]);

  return (
    <div ref={ref} className={className} data-parallax>
      <motion.div
        data-parallax-track
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
