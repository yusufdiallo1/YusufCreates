"use client";

import { useEffect, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";

/**
 * CustomCursor — a single soft white circle, in the manner of the iPad Pro
 * pointer.
 *
 * One layer, not two. The whole character comes from the spring lag plus the
 * way the circle grows and softens over interactive targets; a second trailing
 * element only muddies that.
 *
 * Hover states come from a `data-cursor` attribute on any element, so markup
 * opts in without importing anything:
 *   data-cursor="link"  grows
 *   data-cursor="view"  becomes a labelled disc
 *   data-cursor="drag"  horizontal arrows
 *
 * Renders nothing on touch devices or under prefers-reduced-motion.
 */

type CursorVariant = "default" | "link" | "view" | "drag";

const SIZE: Record<CursorVariant, number> = {
  default: 26,
  link: 44,
  view: 84,
  drag: 52,
};

/** iPadOS dims the pointer over a target rather than brightening it. */
const OPACITY: Record<CursorVariant, number> = {
  default: 0.9,
  link: 0.28,
  view: 0.95,
  drag: 0.6,
};

export function CustomCursor() {
  const reduceMotion = useReducedMotion();
  const [isTouch, setIsTouch] = useState(true);
  const [variant, setVariant] = useState<CursorVariant>("default");
  const [visible, setVisible] = useState(false);
  const [pressed, setPressed] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);

  // Slightly softer than a 1:1 follow — the small lag is what gives the
  // circle its sense of mass, the way the iPad pointer glides.
  const smoothX = useSpring(x, { stiffness: 500, damping: 40, mass: 0.6 });
  const smoothY = useSpring(y, { stiffness: 500, damping: 40, mass: 0.6 });

  useEffect(() => {
    const mq = window.matchMedia("(hover: none)");
    const sync = () => setIsTouch(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const active = !isTouch && !reduceMotion;

  useEffect(() => {
    if (!active) return;
    document.documentElement.classList.add("has-custom-cursor");
    return () => {
      document.documentElement.classList.remove("has-custom-cursor");
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;

    const resolveVariant = (el: Element | null): CursorVariant => {
      const hit = el?.closest<HTMLElement>("[data-cursor]");
      const value = hit?.dataset.cursor;
      if (value === "link" || value === "view" || value === "drag") {
        return value;
      }
      // Anything natively clickable gets the link treatment for free.
      if (el?.closest("a, button, [role='button'], input, textarea, select")) {
        return "link";
      }
      return "default";
    };

    const onMove = (event: PointerEvent) => {
      setVisible(true);
      x.set(event.clientX);
      y.set(event.clientY);
      setVariant(resolveVariant(document.elementFromPoint(event.clientX, event.clientY)));
    };

    // Fade out where it stands — moving it off-screen would make it streak.
    const onLeave = () => setVisible(false);
    const onDown = () => setPressed(true);
    const onUp = () => setPressed(false);

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [active, x, y]);

  if (!active) return null;

  const size = SIZE[variant];
  const showLabel = variant === "view";

  return (
    <motion.div
      aria-hidden="true"
      data-custom-cursor
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        x: smoothX,
        y: smoothY,
        translateX: "-50%",
        translateY: "-50%",
        pointerEvents: "none",
        zIndex: 9999,
      }}
    >
      <motion.div
        animate={{
          width: size,
          height: size,
          opacity: visible ? OPACITY[variant] : 0,
          scale: pressed ? 0.82 : 1,
        }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        style={{
          borderRadius: 9999,
          background: "#f7f8f8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#08090a",
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: "-0.014em",
        }}
      >
        {showLabel ? "View" : null}
        {variant === "drag" ? (
          <svg width={22} height={10} viewBox="0 0 22 10" fill="none">
            <path
              d="M4 1 L1 5 L4 9 M18 1 L21 5 L18 9"
              stroke="#08090a"
              strokeWidth={1.25}
              strokeLinecap="square"
              strokeLinejoin="miter"
            />
          </svg>
        ) : null}
      </motion.div>
    </motion.div>
  );
}
