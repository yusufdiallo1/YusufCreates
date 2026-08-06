"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import { useSvgBackdropSupport } from "@/components/ui/LiquidGlass";

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
 * It also DEFORMS. Flicked across the page it stretches along the direction of
 * travel and settles back to a circle at rest; pulled by a magnetic control it
 * elongates toward whatever is pulling it. Both use the same mechanism, and
 * both are clamped hard — past about 1.4 the stretch stops reading as mass and
 * starts reading as a rendering bug.
 *
 * Over glass it becomes a lens rather than a blend: a real displacement filter
 * bending the panel underneath, plus an accent light catch. Everywhere else it
 * stays a difference blend, which is what makes one white circle legible over
 * both a near-black void and a white screenshot.
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

/**
 * Over glass the disc is an accent light catch at half strength, per the glass
 * system's own light rules — except on `view`, where the disc is carrying a
 * word and has to stay legible.
 */
const GLASS_OPACITY: Record<CursorVariant, number> = {
  default: 0.5,
  link: 0.5,
  view: 0.9,
  drag: 0.5,
};

/**
 * What counts as glass.
 *
 * LiquidGlass publishes the data attribute explicitly. The class selectors are
 * there because roughly thirty surfaces apply `glass-depth` or `nav-pill` as
 * raw CSS and never go through the component — tagging each of them by hand
 * would be thirty chances to miss one, and the classes are already the single
 * definition of "this is a glass surface" everywhere else in the system.
 */
const GLASS_SELECTOR = "[data-glass-surface], .glass-depth, .nav-pill";

/** Speed, in px/s, at which the stretch reaches full extent. */
const MAX_SPEED = 1800;
/** Hard limits. The clamp is the difference between physics and a glitch. */
const STRETCH_MAX = 1.4;
const SQUASH_MIN = 0.72;
/**
 * Below this the travel angle is held rather than recomputed. atan2 of two
 * near-zero velocities is noise, and a resting cursor that spins is worse than
 * one that does nothing.
 */
const ANGLE_FLOOR = 40;

/**
 * The lens displacement map.
 *
 * feDisplacementMap reads a channel as (value - 0.5) x scale, so a horizontal
 * red ramp displaces along x and a vertical green ramp along y — together, a
 * vector pointing radially outward from the centre. Mid-grey at the centre is
 * therefore zero displacement, which is exactly what a lens does: it bends
 * nothing where it is thinnest.
 *
 * The stops are deliberately flat through the middle and steep at the ends
 * rather than linear, so the bending concentrates at the rim. That matches the
 * edge-weighted thickness the rest of the glass system is drawn to; a linear
 * ramp reads as a smear across the whole disc instead of a lens with an edge.
 *
 * screen blend to carry both ramps in one image: the red ramp writes R, the
 * green ramp writes G, and neither touches the other's channel. Only reachable
 * on Chromium, which is the only engine where backdrop-filter: url() renders
 * at all — see useSvgBackdropSupport.
 */
const LENS_MAP =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">
      <defs>
        <linearGradient id="x" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="rgb(0,0,0)"/>
          <stop offset="0.35" stop-color="rgb(102,0,0)"/>
          <stop offset="0.5" stop-color="rgb(128,0,0)"/>
          <stop offset="0.65" stop-color="rgb(153,0,0)"/>
          <stop offset="1" stop-color="rgb(255,0,0)"/>
        </linearGradient>
        <linearGradient id="y" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="rgb(0,0,0)"/>
          <stop offset="0.35" stop-color="rgb(0,102,0)"/>
          <stop offset="0.5" stop-color="rgb(0,128,0)"/>
          <stop offset="0.65" stop-color="rgb(0,153,0)"/>
          <stop offset="1" stop-color="rgb(0,255,0)"/>
        </linearGradient>
      </defs>
      <rect width="128" height="128" fill="url(#x)"/>
      <rect width="128" height="128" fill="url(#y)" style="mix-blend-mode:screen"/>
    </svg>`,
  );

export function CustomCursor() {
  const reduceMotion = useReducedMotion();
  const [isTouch, setIsTouch] = useState(true);
  const [variant, setVariant] = useState<CursorVariant>("default");
  const [visible, setVisible] = useState(false);
  const [pressed, setPressed] = useState(false);
  /** Set from pointerover, never from a per-frame hit test. */
  const [overGlass, setOverGlass] = useState(false);

  const lensSupported = useSvgBackdropSupport();

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);

  // Slightly softer than a 1:1 follow — the small lag is what gives the
  // circle its sense of mass, the way the iPad pointer glides.
  const smoothX = useSpring(x, { stiffness: 500, damping: 40, mass: 0.6 });
  const smoothY = useSpring(y, { stiffness: 500, damping: 40, mass: 0.6 });

  /*
   * Deformation.
   *
   * Velocity is read off the SMOOTHED values, not the raw pointer. The raw
   * stream is a series of discrete jumps whose derivative spikes on every
   * event; the spring's output is continuous, so the stretch responds to how
   * the cursor is actually moving rather than to how the mouse is polled.
   */
  const velocityX = useVelocity(smoothX);
  const velocityY = useVelocity(smoothY);

  /** Direction of the magnetic pull, and how hard it is pulling. */
  const magnetAngle = useMotionValue(0);
  const magnetPull = useMotionValue(0);

  const heldAngle = useRef(0);
  const travelAngle = useTransform<number, number>(
    [velocityX, velocityY],
    ([vx, vy]: number[]) => {
      if (Math.hypot(vx, vy) < ANGLE_FLOOR) return heldAngle.current;
      heldAngle.current = (Math.atan2(vy, vx) * 180) / Math.PI;
      return heldAngle.current;
    },
  );

  const travelStretch = useTransform<number, number>(
    [velocityX, velocityY],
    ([vx, vy]: number[]) => Math.min(1, Math.hypot(vx, vy) / MAX_SPEED),
  );

  /*
   * Magnetic deformation wins over velocity while it is active.
   *
   * Being pulled toward something and being flung across the page are two
   * different stories about the same circle, and averaging them tells neither.
   */
  const angle = useTransform<number, number>(
    [travelAngle, magnetAngle, magnetPull],
    ([travel, magnet, pull]: number[]) => (pull > 0 ? magnet : travel),
  );

  const stretch = useTransform<number, number>(
    [travelStretch, magnetPull],
    ([travel, pull]: number[]) => Math.max(travel, pull),
  );

  const springOptions = { stiffness: 260, damping: 30, mass: 0.5 };
  const rawScaleX = useSpring(
    useTransform(stretch, [0, 1], [1, 1.35]),
    springOptions,
  );
  const rawScaleY = useSpring(
    useTransform(stretch, [0, 1], [1, 0.85]),
    springOptions,
  );
  // Clamped AFTER the spring: a spring settles by overshooting, and the whole
  // point of the limit is that nothing ever renders past it.
  const scaleX = useTransform(rawScaleX, (v) =>
    Math.min(STRETCH_MAX, Math.max(SQUASH_MIN, v)),
  );
  const scaleY = useTransform(rawScaleY, (v) =>
    Math.min(STRETCH_MAX, Math.max(SQUASH_MIN, v)),
  );
  const smoothAngle = useSpring(angle, { stiffness: 200, damping: 30 });

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

  /*
   * Glass detection, on pointerover rather than per frame.
   *
   * pointerover fires exactly once per change of target, which is precisely the
   * question being asked — "am I over glass now?" — and costs nothing between
   * those moments. Hit-testing every frame would answer the same question sixty
   * times a second and force a hit test each time.
   */
  useEffect(() => {
    if (!active) return;
    const onOver = (event: PointerEvent) => {
      const target = event.target as Element | null;
      setOverGlass(Boolean(target?.closest?.(GLASS_SELECTOR)));
    };
    document.addEventListener("pointerover", onOver, { passive: true });
    return () => document.removeEventListener("pointerover", onOver);
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
      const under = document.elementFromPoint(event.clientX, event.clientY);

      /*
       * Mutual attraction. Over a magnetic control the cursor is drawn toward
       * its centre while the control leans back toward the cursor — the two
       * meeting in the middle is what makes the pair feel connected rather
       * than the button chasing a cursor that ignores it.
       *
       * Kept well under half, or the cursor detaches from the pointer far
       * enough to feel broken rather than attracted.
       */
      const magnet = under?.closest<HTMLElement>("[data-cursor-magnetic]");
      if (magnet) {
        const rect = magnet.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const pull = 0.28;
        x.set(event.clientX + (cx - event.clientX) * pull);
        y.set(event.clientY + (cy - event.clientY) * pull);

        /*
         * Elongate TOWARD the target, not uniformly.
         *
         * A circle that merely grows says "something is here". A circle
         * stretched along the line to the thing pulling it says which thing,
         * and that is the entire content of the gesture.
         *
         * Strongest at the edge of the control and easing to nothing at its
         * centre — the pull is what deforms it, and at the centre there is no
         * pull left.
         */
        const dx = cx - event.clientX;
        const dy = cy - event.clientY;
        const reach = Math.max(rect.width, rect.height) / 2;
        magnetAngle.set((Math.atan2(dy, dx) * 180) / Math.PI);
        magnetPull.set(Math.min(1, Math.hypot(dx, dy) / Math.max(reach, 1)));
      } else {
        x.set(event.clientX);
        y.set(event.clientY);
        magnetPull.set(0);
      }

      setVariant(resolveVariant(under));
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
  }, [active, x, y, magnetAngle, magnetPull]);

  if (!active) return null;

  const size = SIZE[variant];
  const showLabel = variant === "view";
  const useLens = overGlass && lensSupported;

  return (
    <>
      {/*
        The lens. Rendered once, referenced by the disc, and only where the
        engine actually renders an SVG-filtered backdrop — everywhere else this
        is dead weight and the difference blend is doing the work.
      */}
      {lensSupported ? (
        <svg
          aria-hidden="true"
          style={{ position: "fixed", width: 0, height: 0 }}
        >
          <defs>
            <filter
              id="cursor-lens"
              // Sample beyond the disc so the rim bends what is just outside it
              // rather than clamping against its own transparent edge.
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
              colorInterpolationFilters="sRGB"
            >
              <feImage href={LENS_MAP} preserveAspectRatio="none" result="map" />
              <feDisplacementMap
                in="SourceGraphic"
                in2="map"
                scale={26}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>
      ) : null}

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
          animate={{ width: size, height: size, scale: pressed ? 0.82 : 1 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/*
            Orientation and stretch are on two nested elements on purpose.

            CSS applies transforms right to left, and Motion writes scale before
            rotate — so a single element would rotate first and then stretch
            along the PARENT's axes, which produces a circle that swells
            sideways no matter which way it is travelling. Rotating the outer
            element and scaling the inner one stretches along the local axis,
            which is the only version that reads as direction of travel.
          */}
          <motion.div
            style={{
              position: "absolute",
              inset: 0,
              rotate: smoothAngle,
            }}
          >
            <motion.div
              style={{
                width: "100%",
                height: "100%",
                scaleX,
                scaleY,
                borderRadius: 9999,
                opacity: visible
                  ? overGlass
                    ? GLASS_OPACITY[variant]
                    : OPACITY[variant]
                  : 0,
                transition: "opacity 0.28s cubic-bezier(0.16,1,0.3,1)",
                /*
                 * Over glass: an accent light catch in normal blend, plus a
                 * soft outer glow, because a difference blend over a
                 * translucent panel inverts whatever happens to be behind the
                 * panel rather than the panel itself — which reads as a hole.
                 *
                 * Everywhere else: difference, so one white circle stays
                 * legible over both a near-black void and a white screenshot.
                 */
                background: overGlass ? "var(--accent)" : "#f7f8f8",
                mixBlendMode: overGlass ? "normal" : "difference",
                boxShadow: overGlass
                  ? "0 0 24px 6px color-mix(in srgb, var(--accent) 45%, transparent)"
                  : "none",
                ...(useLens
                  ? {
                      backdropFilter: "url(#cursor-lens)",
                      WebkitBackdropFilter: "url(#cursor-lens)",
                    }
                  : {}),
              }}
            />
          </motion.div>

          {/*
            Content sits OUTSIDE the deformation. The disc is a circle, so
            stretching it says everything it needs to; stretching the word
            "View" with it would just look broken.
          */}
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: visible ? 1 : 0,
              transition: "opacity 0.28s cubic-bezier(0.16,1,0.3,1)",
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
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
