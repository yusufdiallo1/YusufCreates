"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useCapability } from "@/components/providers/CapabilityProvider";

/**
 * AmbientLight — one light source the whole section agrees about.
 *
 * A large, soft glow that drifts toward the cursor, publishing its position as
 * --light-x and --light-y on the section root. Every glass surface inside reads
 * those to place its own specular highlight.
 *
 * THAT COHERENCE IS THE ENTIRE POINT. Independent highlights on each panel are
 * the thing people notice without being able to name — light arriving from four
 * directions at once reads as wrong even to someone who has never thought about
 * a specular highlight. One source, one direction, every surface agreeing.
 *
 * The drift is deliberately slow. Lerping at 0.02 per frame means the glow
 * takes roughly a second to arrive, so it feels like light filling a room
 * rather than a cursor-follower. Fast tracking here looks cheap, and the
 * difference between the two is entirely in this constant.
 *
 * ONE PER PAGE. Two competing sources destroy the effect they exist to create.
 */

/** Fraction of the remaining distance covered each frame. Low is the point. */
const LERP = 0.02;

export interface AmbientLightProps extends React.HTMLAttributes<HTMLElement> {
  /** Render as <section> rather than <div>, where this wraps a page section. */
  asSection?: boolean;
}

export function AmbientLight({
  asSection = false,
  className,
  children,
  ...props
}: AmbientLightProps) {
  const ref = useRef<HTMLElement>(null);
  const { tier, canHover } = useCapability();
  const active = tier === "full" && canHover;

  useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;

    const rect = () => root.getBoundingClientRect();
    let box = rect();

    // Start centred, so the first frames drift from a sensible place rather
    // than from a corner.
    let currentX = box.width / 2;
    let currentY = box.height / 2;
    let targetX = currentX;
    let targetY = currentY;

    let frame = 0;
    let settled = false;

    const step = () => {
      const dx = targetX - currentX;
      const dy = targetY - currentY;

      // Stop the loop once the light has effectively arrived. A permanently
      // running rAF for a stationary glow is pure waste, and this is the
      // difference between an idle page costing nothing and costing a frame.
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
        settled = true;
        frame = 0;
        return;
      }

      currentX += dx * LERP;
      currentY += dy * LERP;
      root.style.setProperty("--light-x", `${currentX}px`);
      root.style.setProperty("--light-y", `${currentY}px`);
      frame = requestAnimationFrame(step);
    };

    const wake = () => {
      settled = false;
      if (!frame) frame = requestAnimationFrame(step);
    };

    const onMove = (event: PointerEvent) => {
      targetX = event.clientX - box.left;
      targetY = event.clientY - box.top;
      if (settled || !frame) wake();
    };

    const onEnter = () => {
      box = rect();
      root.style.setProperty("--light-opacity", "1");
    };

    const onLeave = () => {
      // The glow stays where it was and simply dims. Sending it back to centre
      // would be a second animation the user did not ask for.
      root.style.setProperty("--light-opacity", "0.35");
    };

    // Cached because reading it per pointermove is a forced layout on every
    // event; re-measured on resize and on entry instead.
    const onResize = () => {
      box = rect();
    };

    root.style.setProperty("--light-x", `${currentX}px`);
    root.style.setProperty("--light-y", `${currentY}px`);

    root.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("pointerenter", onEnter, { passive: true });
    root.addEventListener("pointerleave", onLeave, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", onResize);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [active]);

  const Tag = asSection ? "section" : "div";

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement & HTMLElement>}
      className={cn("ambient-light", className)}
      data-ambient={active ? "live" : "static"}
      {...props}
    >
      {children}
    </Tag>
  );
}
