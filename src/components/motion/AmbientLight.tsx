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
 * IT DOES NOT FOLLOW THE CURSOR. It drifts toward wherever the cursor has spent
 * the MOST time over the last few seconds — a decaying weighted average of
 * where attention has been, not where the pointer is right now. Someone
 * sweeping across the section on their way somewhere else moves the light
 * barely at all; someone reading a paragraph pulls it slowly onto that
 * paragraph. That is what a light in a room does, and a light that tracks the
 * pointer is just a cursor with a bigger radius.
 *
 * The drift is deliberately slow. Lerping at 0.015 per frame means the glow
 * takes a couple of seconds to arrive. If you can perceive the movement AS
 * movement, it is too fast — this is the subtlest thing in the animation
 * system and the one most likely to be noticed only in its absence.
 *
 * ONE PER PAGE. Two competing sources destroy the effect they exist to create.
 */

/**
 * Fraction of the remaining distance covered each frame. Low is the point.
 *
 * 0.015 rather than 0.02: the target now moves far less than it used to — it
 * is an average rather than the live pointer — so the same lerp read as the
 * light snapping to a target that had already stopped.
 */
const LERP = 0.015;

/**
 * Time constant of the attention average, in milliseconds.
 *
 * Weight decays as exp(-dt / ATTENTION_MS), so a position stops mattering a few
 * seconds after the pointer left it. Shorter and the light chases; much longer
 * and it stops responding to the reader at all.
 */
const ATTENTION_MS = 4000;

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

    /*
     * The attention average.
     *
     * Three running sums, decayed every frame and topped up with wherever the
     * pointer currently is, weighted by how long the frame took. Dividing the
     * position sums by the weight sum gives the centre of mass of the last few
     * seconds of pointer time — which is a very different number from the
     * pointer's position, and the entire point.
     *
     * Seeded at the centre with a small weight so the first frame has a
     * defined answer rather than dividing by zero.
     */
    let sumX = currentX;
    let sumY = currentY;
    let sumWeight = 1;

    /** Where the pointer is NOW. Sampled per frame, not only when it moves. */
    let pointerX = currentX;
    let pointerY = currentY;
    let hasPointer = false;

    let frame = 0;
    let settled = false;
    let lastTime = 0;
    let previousTargetX = currentX;
    let previousTargetY = currentY;

    const step = (time: number) => {
      const dt = lastTime ? Math.min(time - lastTime, 100) : 16;
      lastTime = time;

      /*
       * Sampled per frame rather than accumulated in the move handler.
       *
       * Weight has to be TIME, not events. A pointer held still over one
       * paragraph fires no events at all, and an average built from events
       * would conclude the reader had gone somewhere else — the exact opposite
       * of what the light is supposed to say. Dwelling is the signal.
       */
      if (hasPointer) {
        const decay = Math.exp(-dt / ATTENTION_MS);
        sumX = sumX * decay + pointerX * dt;
        sumY = sumY * decay + pointerY * dt;
        sumWeight = sumWeight * decay + dt;
      }

      const targetX = sumX / sumWeight;
      const targetY = sumY / sumWeight;

      const dx = targetX - currentX;
      const dy = targetY - currentY;
      // How far the target itself moved since the last frame. The average is
      // still converging for seconds after the pointer stops, so arriving at
      // the target is not on its own a reason to stop.
      const targetDrift = Math.hypot(
        targetX - previousTargetX,
        targetY - previousTargetY,
      );
      previousTargetX = targetX;
      previousTargetY = targetY;

      // Stop the loop once the light has effectively arrived AND the place it
      // is arriving at has stopped moving. A permanently running rAF for a
      // stationary glow is pure waste, and this is the difference between an
      // idle page costing nothing and costing a frame.
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && targetDrift < 0.1) {
        settled = true;
        frame = 0;
        lastTime = 0;
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
      if (!frame) {
        lastTime = 0;
        frame = requestAnimationFrame(step);
      }
    };

    const onMove = (event: PointerEvent) => {
      pointerX = event.clientX - box.left;
      pointerY = event.clientY - box.top;
      hasPointer = true;
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
      /*
       * Stop accruing weight, but keep the sums.
       *
       * A pointer that has left the section is not spending time anywhere in
       * it, so continuing to bank weight at its last known position would let
       * a moment's exit outweigh a minute of reading. Freezing the average
       * lets the light finish arriving at where attention actually was and
       * then stop — and coming back resumes from that memory rather than from
       * a blank slate.
       */
      hasPointer = false;
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
