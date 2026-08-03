"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { cn } from "@/lib/utils";
import { useCapability } from "@/components/providers/CapabilityProvider";

/**
 * Tilt — a card that leans away from the cursor like a physical pane.
 *
 * THE DETAIL THAT SELLS IT: the highlight position is derived from the TILT,
 * not from the cursor.
 *
 * Deriving it from the cursor is the obvious implementation and it looks
 * wrong in a way people notice without being able to name — the glare tracks
 * the pointer instead of obeying the surface. Real light moves toward
 * whichever edge is raised. Feeding rotateY into the gradient position gets
 * that for free, and it is the difference between a card that tilts and a
 * card that is made of something.
 *
 * SIX DEGREES, MAXIMUM. Past that it stops reading as a material response and
 * starts reading as a toy.
 */

const MAX_DEGREES = 6;

export function Tilt({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  const { tier, canHover } = useCapability();
  const active = tier === "full" && canHover;

  const rx = useMotionValue(0);
  const ry = useMotionValue(0);

  const spring = { stiffness: 150, damping: 20 };
  const rotateX = useSpring(rx, spring);
  const rotateY = useSpring(ry, spring);

  // Light slides toward the raised edge. Note the inverted range: a positive
  // rotateY lifts the left edge, so the highlight travels left.
  const highlightX = useTransform(rotateY, [-MAX_DEGREES, MAX_DEGREES], ["100%", "0%"]);
  const highlightY = useTransform(rotateX, [-MAX_DEGREES, MAX_DEGREES], ["0%", "100%"]);

  // The shadow shifts opposite to the tilt, as a real one would.
  const shadowX = useTransform(rotateY, [-MAX_DEGREES, MAX_DEGREES], [12, -12]);
  const shadowY = useTransform(rotateX, [-MAX_DEGREES, MAX_DEGREES], [-12, 12]);
  const boxShadow = useTransform(
    [shadowX, shadowY],
    ([x, y]: number[]) => `${x}px ${y}px 40px -12px rgba(0,0,0,0.55)`,
  );

  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // -0.5..0.5 from the centre of the card.
    const px = (event.clientX - r.left) / r.width - 0.5;
    const py = (event.clientY - r.top) / r.height - 0.5;
    // Pointer below centre tips the top toward the viewer, hence the negation.
    rx.set(-py * MAX_DEGREES * 2);
    ry.set(px * MAX_DEGREES * 2);
  };

  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  if (!active) {
    return (
      <div className={className} {...props}>
        {children}
      </div>
    );
  }

  return (
    /* Caller props sit on the outer scene, not the transformed child: Motion
       redefines drag handlers on motion.div, so spreading React's HTML props
       there is a type conflict — and semantically the scene is the element
       the caller asked for. */
    <div
      style={{ perspective: 1000 }}
      className={cn("tilt-scene", className)}
      {...props}
    >
      <motion.div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={{
          rotateX,
          rotateY,
          boxShadow,
          transformStyle: "preserve-3d",
          borderRadius: "inherit",
        }}
        className="relative size-full"
      >
        {children}

        {/* The glare. Positioned from the tilt, never from the pointer. */}
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            borderRadius: "inherit",
            backgroundImage:
              "linear-gradient(120deg, transparent 35%, rgba(255,252,248,0.10) 50%, transparent 65%)",
            backgroundSize: "250% 250%",
            backgroundPositionX: highlightX,
            backgroundPositionY: highlightY,
          }}
        />
      </motion.div>
    </div>
  );
}
