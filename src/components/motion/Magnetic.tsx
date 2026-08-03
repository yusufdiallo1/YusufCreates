"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useCapability } from "@/components/providers/CapabilityProvider";

/**
 * Magnetic — a control that leans toward the cursor as it approaches.
 *
 * Reserved for primary calls to action. The effect works by being rare: if
 * every button pulls, none of them signals anything, and the page feels like
 * it is squirming. Ghost and secondary buttons deliberately stay still.
 *
 * THE DETAIL THAT SELLS IT is the nested parallax. The label travels at half
 * the button's displacement, so it lags very slightly behind the surface it
 * sits on. That tiny internal disagreement is what makes the thing read as an
 * object with mass rather than a div being translated — remove it and the
 * whole effect collapses into "the button moved".
 *
 * Off without a hovering pointer, and off below `full`.
 */

export interface MagneticProps {
  children: React.ReactNode;
  /** Fraction of the distance to the cursor the element travels. */
  strength?: number;
  /** Catchment radius as a multiple of the element's width. */
  radiusScale?: number;
  className?: string;
}

export function Magnetic({
  children,
  strength = 0.35,
  radiusScale = 1.5,
  className,
}: MagneticProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const { tier, canHover } = useCapability();
  const active = tier === "full" && canHover;

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Low mass and high stiffness: the control should feel light and eager, and
  // settle immediately rather than wobbling like jelly.
  const spring = { stiffness: 150, damping: 15, mass: 0.1 };
  const sx = useSpring(x, spring);
  const sy = useSpring(y, spring);

  // The nested parallax. Half the parent's travel, same spring, so the lag is
  // a consequence of the physics rather than a hardcoded delay.
  const lx = useTransform(sx, (v) => v * 0.5);
  const ly = useTransform(sy, (v) => v * 0.5);

  const handleMove = (event: React.PointerEvent<HTMLSpanElement>) => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;

    const radius = rect.width * radiusScale;
    const distance = Math.hypot(dx, dy);

    // Linear falloff to zero at the radius edge, so the pull fades out rather
    // than releasing abruptly when the cursor crosses the boundary.
    const falloff = Math.max(0, 1 - distance / radius);

    x.set(dx * strength * falloff);
    y.set(dy * strength * falloff);
  };

  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  if (!active) return <>{children}</>;

  return (
    <motion.span
      ref={ref}
      className={className}
      style={{ x: sx, y: sy, display: "inline-flex" }}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      // Pulls the custom cursor in too, so the attraction is mutual rather
      // than the button reaching for a cursor that ignores it.
      data-cursor-magnetic=""
    >
      <motion.span style={{ x: lx, y: ly, display: "inline-flex" }}>
        {children}
      </motion.span>
    </motion.span>
  );
}
