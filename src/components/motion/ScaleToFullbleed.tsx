"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { useCapability } from "@/components/providers/CapabilityProvider";
import { useScrubSlot } from "@/components/motion/ScrubSlot";

/**
 * ScaleToFullbleed — a panel that grows from a glass slab to fill the frame.
 *
 * The Apple product-page move. The panel starts small and rounded, and as the
 * page scrolls it scales up and squares off until it is edge to edge, with the
 * frost clearing as it arrives.
 *
 * ---------------------------------------------------------------------------
 * THREE THINGS THAT MUST NOT CHANGE:
 *
 * 1. SCALE, NEVER WIDTH. Animating width runs layout on every frame of a
 *    scroll and destroys INP. A transform is composited and costs nothing.
 *
 * 2. THE BLUR IS ON A DIFFERENT ELEMENT FROM THE TRANSFORM. Animating
 *    backdrop-filter on something that is simultaneously being transformed
 *    forces the compositor to re-sample the backdrop every frame at a new
 *    geometry, which is the single most expensive thing on this page. The
 *    frost lives on a static wrapper and only the inner box scales.
 *
 * 3. THE HEIGHT WRAPPER IS STRUCTURE, NOT EFFECT. It renders whenever the
 *    tier is not minimal, whether or not this sequence won the scrub slot —
 *    inserting 250vh of page one frame after hydration would jump the scroll
 *    under the user's hands. Only the scroll binding is conditional.
 * ---------------------------------------------------------------------------
 *
 * If INP misses budget, drop the blur clearing first. It is the most expensive
 * part and the least of the effect.
 */

export interface ScaleToFullbleedProps {
  children: React.ReactNode;
  /** Contextual detail, revealed once the panel has arrived. */
  meta?: React.ReactNode;
  className?: string;
}

export function ScaleToFullbleed({
  children,
  meta,
  className,
}: ScaleToFullbleedProps) {
  const outer = useRef<HTMLDivElement>(null);
  const { tier } = useCapability();
  const slot = useScrubSlot({ priority: 10, fallback: "final" });

  const { scrollYProgress } = useScroll({
    target: outer,
    offset: ["start start", "end start"],
  });

  // Smoothed so a trackpad flick does not snap the panel through its range.
  const p = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const scale = useTransform(p, [0, 0.55], [0.62, 1]);
  const radius = useTransform(p, [0, 0.55], [28, 0]);
  const frost = useTransform(p, [0, 0.4], [14, 0]);
  const frostCss = useTransform(frost, (v) => `blur(${v}px)`);
  const metaOpacity = useTransform(p, [0.6, 0.75], [0, 1]);
  const metaY = useTransform(p, [0.6, 0.75], [24, 0]);

  const scrubbing = slot.active && tier === "full";

  // Minimal: no tall wrapper at all, just the content at rest.
  if (tier === "minimal") {
    return (
      <div className={className}>
        {children}
        {meta}
      </div>
    );
  }

  return (
    <div
      ref={outer}
      // Structure. Present whether or not the scrub binding is.
      style={{ height: scrubbing ? "250vh" : undefined }}
      className={className}
    >
      <div
        className={
          scrubbing
            ? "sticky top-0 flex h-[100dvh] flex-col items-center justify-center overflow-hidden"
            : undefined
        }
      >
        {/*
         * The frost wrapper. Static — nothing here is ever transformed, which
         * is what makes animating a backdrop-filter on it affordable.
         */}
        <motion.div
          style={
            scrubbing
              ? {
                  backdropFilter: frostCss,
                  WebkitBackdropFilter: frostCss,
                }
              : undefined
          }
          className="w-full"
        >
          {/* The transformed box. Scale and radius only — no width, no blur. */}
          <motion.div
            style={
              scrubbing
                ? { scale, borderRadius: radius, transformOrigin: "center" }
                : undefined
            }
            className="w-full overflow-hidden"
          >
            {children}
          </motion.div>
        </motion.div>

        {meta ? (
          <motion.div
            style={scrubbing ? { opacity: metaOpacity, y: metaY } : undefined}
            className="w-full"
          >
            {meta}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
