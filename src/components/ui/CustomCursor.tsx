"use client";

import { useEffect, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";

/**
 * CustomCursor — a small dot that tracks the pointer, plus a trailing ring.
 *
 * The dot follows the pointer exactly with no smoothing, so clicking never
 * feels displaced. The ring lags slightly behind on a spring, which is what
 * reads as weight. That split is the whole trick: precision where it matters,
 * softness where it does not.
 *
 * Hover states come from a `data-cursor` attribute on any element, so markup
 * opts in without importing anything:
 *   data-cursor="link"  ring expands, dot shrinks
 *   data-cursor="view"  ring becomes a labelled disc
 *   data-cursor="drag"  horizontal arrows
 *
 * Renders nothing on touch devices or under prefers-reduced-motion.
 */

type CursorVariant = "default" | "link" | "view" | "drag";

const RING_SIZE: Record<CursorVariant, number> = {
  default: 32,
  link: 48,
  view: 80,
  drag: 56,
};

export function CustomCursor() {
  const reduceMotion = useReducedMotion();
  const [isTouch, setIsTouch] = useState(true);
  const [variant, setVariant] = useState<CursorVariant>("default");
  const [visible, setVisible] = useState(false);
  const [pressed, setPressed] = useState(false);

  // Raw pointer position. The dot uses these directly.
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);

  // The ring lags behind on a spring — this is the only smoothed layer.
  const ringX = useSpring(x, { stiffness: 400, damping: 45, mass: 1 });
  const ringY = useSpring(y, { stiffness: 400, damping: 45, mass: 1 });

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

  const ring = RING_SIZE[variant];
  const showLabel = variant === "view";

  return (
    <>
      {/* Ring — trails the pointer. */}
      <motion.div
        aria-hidden="true"
        data-custom-cursor
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          x: ringX,
          y: ringY,
          translateX: "-50%",
          translateY: "-50%",
          pointerEvents: "none",
          zIndex: 9998,
        }}
      >
        <motion.div
          animate={{
            width: ring,
            height: ring,
            opacity: visible ? 1 : 0,
            scale: pressed ? 0.88 : 1,
            backgroundColor: showLabel
              ? "rgba(247, 248, 248, 0.95)"
              : "rgba(247, 248, 248, 0)",
            borderColor: showLabel
              ? "rgba(247, 248, 248, 0)"
              : "rgba(247, 248, 248, 0.35)",
          }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          style={{
            borderRadius: 9999,
            borderWidth: 1,
            borderStyle: "solid",
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
                stroke="rgba(247,248,248,0.7)"
                strokeWidth={1.25}
                strokeLinecap="square"
                strokeLinejoin="miter"
              />
            </svg>
          ) : null}
        </motion.div>
      </motion.div>

      {/* Dot — exact pointer position, no smoothing. Hidden when the ring
          becomes a filled disc, which would otherwise swallow it. */}
      <motion.div
        aria-hidden="true"
        data-custom-cursor
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          x,
          y,
          translateX: "-50%",
          translateY: "-50%",
          pointerEvents: "none",
          zIndex: 9999,
        }}
      >
        <motion.div
          animate={{
            opacity: visible && !showLabel ? 1 : 0,
            scale: variant === "link" ? 0.5 : 1,
          }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: 5,
            height: 5,
            borderRadius: 9999,
            background: "#f7f8f8",
          }}
        />
      </motion.div>
    </>
  );
}
