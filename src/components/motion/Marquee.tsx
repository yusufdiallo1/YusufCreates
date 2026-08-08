"use client";

import {
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { motion } from "motion/react";
import { Children, useEffect, useRef, useState } from "react";
import { useQuiet } from "@/components/motion/Quiet";

/**
 * Marquee — seamless infinite horizontal loop.
 *
 * The content is rendered twice and the track translates by exactly half its
 * width, so at the wrap point the second copy sits precisely where the first
 * started and the reset is invisible. Motion is linear; easing would visibly
 * stutter at the seam.
 *
 * The loop is driven per-frame rather than by a keyframe transition, because
 * pausing has to freeze mid-cycle and resume from the same offset — a
 * declarative repeat cannot do that.
 *
 * TWO THINGS SHAPE HOW IT READS.
 *
 * Items nearest the horizontal centre of the viewport are larger and brighter;
 * items toward the edges fall back. A row where everything is equally loud has
 * no reading point, and the eye either takes all of it or none of it. This
 * gives it a middle.
 *
 * And hovering an item no longer stops the row. Halting an entire marquee to
 * look at one card feels heavy — the row keeps flowing and the one item under
 * the pointer lifts out of it. Keyboard focus still stops everything, because
 * a keyboard user cannot chase a moving target.
 */

interface MarqueeProps {
  children: React.ReactNode;
  /** Seconds for one full pass. Higher is slower. */
  speed?: number;
  direction?: "left" | "right";
  /** Gap between items, in pixels. */
  gap?: number;
  /**
   * Stop the whole row on hover.
   *
   * Off by default — hovering now LIFTS the item under the pointer and leaves
   * the rest running, which is the behaviour this component wants everywhere
   * it is currently used. The prop survives for a row where the content genuinely
   * has to be read rather than glanced at.
   */
  pauseOnHover?: boolean;
  /**
   * Normalised scroll velocity (-1..1). When supplied, scrolling speeds the
   * ticker up and a direction flip briefly runs it backwards.
   */
  velocity?: MotionValue<number>;
  className?: string;
}

/** Scale and opacity at the far edges of the viewport. Centre is 1 and 1. */
const EDGE_SCALE = 0.93;
const EDGE_OPACITY = 0.55;
/** The hovered item's own values, which override the falloff entirely. */
const LIFT_SCALE = 1.06;
const LIFT_Y = -4;

/** Where the row sits on screen, and where the middle of the screen is. */
type Geometry = { left: number; centre: number; half: number };

export function Marquee({
  children,
  speed = 30,
  direction = "left",
  gap = 48,
  pauseOnHover = false,
  velocity,
  className,
}: MarqueeProps) {
  const reduceMotion = useReducedMotion();
  const items = Children.toArray(children);

  /*
   * The pricing band went quiet, so this stops too.
   *
   * Fed into the SAME `paused` guard the keyboard-focus path uses, rather than
   * having a stillness path of its own — that guard already does exactly the
   * right thing, which is to freeze the per-frame loop mid-cycle and resume
   * from the identical offset. CSS cannot do this: the translation is driven
   * by useAnimationFrame below, so animation-play-state has nothing to pause.
   */
  const quiet = useQuiet();

  const hostRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const offset = useMotionValue(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);

  /*
   * Item geometry, measured once rather than per item per frame.
   *
   * getBoundingClientRect on every item on every frame would be one forced
   * layout per item per frame — for a forty-name ticker rendered twice, eighty
   * synchronous layouts sixty times a second, to compute a number that only
   * ever changes when the row is re-laid-out.
   *
   * offsetWidth is read instead, which is a LAYOUT width and therefore immune
   * to the transform the track is carrying, and the centres are then derived
   * arithmetically from the same flex rules the row is laid out by: each item
   * followed by `gap`, each row closed by a trailing `gap`. The result is exact,
   * and it is one pass.
   */
  const [centres, setCentres] = useState<number[]>([]);
  const geometryRef = useRef<Geometry | null>(null);

  useEffect(() => {
    if (reduceMotion) return;
    const host = hostRef.current;
    const track = trackRef.current;
    if (!host || !track) return;

    const measure = () => {
      const rect = host.getBoundingClientRect();
      const viewport = window.innerWidth;
      geometryRef.current = {
        left: rect.left,
        centre: viewport / 2,
        half: Math.max(1, viewport / 2),
      };

      const next: number[] = [];
      let cursor = 0;
      for (const row of Array.from(track.children)) {
        for (const item of Array.from(row.children)) {
          const width = (item as HTMLElement).offsetWidth;
          next.push(cursor + width / 2);
          cursor += width + gap;
        }
      }
      setCentres(next);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(track);
    observer.observe(host);
    // The host can move horizontally without changing size — a sidebar opening,
    // a scrollbar appearing — and the falloff is measured against the viewport,
    // not against the row.
    window.addEventListener("resize", measure, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [reduceMotion, gap, items.length]);

  useAnimationFrame((_, delta) => {
    if (reduceMotion || paused || quiet) return;
    const track = trackRef.current;
    if (!track) return;

    // Half the track is one full copy of the content.
    const half = track.scrollWidth / 2;
    if (half <= 0) return;

    const perMs = half / (speed * 1000);
    // Scroll velocity multiplies the base speed. Clamped so a hard flick
    // cannot reverse the ticker faster than it ever runs forwards.
    const boost = velocity
      ? Math.max(-2, Math.min(4, 1 + velocity.get() * 6))
      : 1;
    const next =
      offset.get() + (direction === "left" ? -1 : 1) * perMs * delta * boost;

    // Normalise into [-half, 0). Because the two copies are identical, any
    // offset differing by exactly `half` renders the same pixels, so this
    // wrap is invisible.
    offset.set((((next % half) - half) % half));
  });

  const row = (ariaHidden: boolean, indexBase: number) => (
    <div
      aria-hidden={ariaHidden || undefined}
      /* Tagged so the reduced-motion CSS can drop the duplicate copy without
         this component having to know the preference. See globals.css. */
      data-marquee-clone={ariaHidden || undefined}
      style={{ display: "flex", gap, paddingRight: gap, flexShrink: 0 }}
    >
      {items.map((child, index) => {
        const flat = indexBase + index;
        return (
          <MarqueeItem
            key={index}
            offset={offset}
            centre={centres[flat]}
            geometry={geometryRef}
            /*
             * Hover is keyed on the item's position in the ORIGINAL list, not
             * on its flat index, so pointing at a card lifts it in both copies
             * at once. Only one of the two is ever on screen at that moment;
             * lifting only the copy under the pointer would make the item drop
             * back down as the row wrapped underneath it.
             */
            hovered={hovered === index}
            onHoverChange={(on) => setHovered(on ? index : null)}
          >
            {child}
          </MarqueeItem>
        );
      })}
    </div>
  );

  /*
   * ONE TREE FOR BOTH PREFERENCES — the reduced-motion resting state is CSS.
   *
   * This used to return a completely different element here: a single static
   * scrollable row with no duplicate. useReducedMotion is null on the server
   * and a boolean on the client, so the server rendered the animated structure
   * (host → track → two rows) and a reduced-motion client wanted a flat row of
   * children. Nothing about those two trees is patchable, so React threw the
   * subtree away — on the homepage that is the tech ticker, and on every
   * marketing page it is the closing ticker inside ContactCTA.
   *
   * The resting state is now produced by `@media (prefers-reduced-motion)` in
   * globals.css, keyed off `data-marquee` and `data-marquee-clone`: the host
   * becomes scrollable and the decorative duplicate is hidden. A media query is
   * evaluated by the browser against server-rendered HTML identically to
   * client-rendered HTML, so it cannot participate in a hydration mismatch at
   * all — which makes it strictly the better tool for this than a hook.
   *
   * The per-frame loop is already inert: useAnimationFrame above returns early
   * on `reduceMotion`, so the track never translates and the row simply sits
   * where it started.
   */
  return (
    <div
      ref={hostRef}
      className={className}
      data-marquee
      style={{ overflow: "hidden", display: "flex" }}
      onPointerEnter={pauseOnHover ? () => setPaused(true) : undefined}
      onPointerLeave={
        pauseOnHover
          ? () => {
              setPaused(false);
              setHovered(null);
            }
          : () => setHovered(null)
      }
      /*
       * Keyboard focus stops the row outright.
       *
       * Everything else here is built on the reader being able to point at a
       * moving target, which a keyboard user cannot do: they tab to an item and
       * it keeps travelling out from under the focus ring. Capture phase because
       * focus lands on a link inside the item, not on the item itself.
       */
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <motion.div
        ref={trackRef}
        style={{ display: "flex", x: offset, willChange: "transform" }}
      >
        {row(false, 0)}
        {/* Duplicate is decorative — the first copy carries the real content. */}
        {row(true, items.length)}
      </motion.div>
    </div>
  );
}

/**
 * One item, with its own falloff.
 *
 * Its own useTransform off the SHARED offset value: the per-frame work is three
 * arithmetic derivations from a number the row already computed, and no item
 * touches the DOM to find out where it is.
 *
 * Hover is blended into the same two transforms rather than layered on a second
 * element. A nested element setting opacity 1 inside a parent already at 0.55
 * multiplies to 0.55 — the lift has to cancel the falloff, not fight it.
 */
function MarqueeItem({
  children,
  offset,
  centre,
  geometry,
  hovered,
  onHoverChange,
}: {
  children: React.ReactNode;
  offset: MotionValue<number>;
  centre: number | undefined;
  geometry: React.RefObject<Geometry | null>;
  hovered: boolean;
  onHoverChange: (hovered: boolean) => void;
}) {
  /** 0 at the centre of the viewport, 1 at either edge. */
  const distance = useTransform(offset, (value) => {
    const box = geometry.current;
    if (!box || centre === undefined) return 0;
    return Math.min(1, Math.abs(box.left + value + centre - box.centre) / box.half);
  });

  // Springs the lift rather than snapping it, and gives the item somewhere to
  // settle back to when the pointer leaves.
  const raw = useMotionValue(0);
  const lift = useSpring(raw, { stiffness: 320, damping: 30 });
  useEffect(() => {
    raw.set(hovered ? 1 : 0);
  }, [hovered, raw]);

  const scale = useTransform<number, number>(
    [distance, lift],
    ([d, l]: number[]) =>
      (1 - d * (1 - EDGE_SCALE)) * (1 - l) + LIFT_SCALE * l,
  );
  const opacity = useTransform<number, number>(
    [distance, lift],
    ([d, l]: number[]) => (1 - d * (1 - EDGE_OPACITY)) * (1 - l) + l,
  );
  const y = useTransform(lift, [0, 1], [0, LIFT_Y]);

  return (
    <motion.div
      style={{ flexShrink: 0, scale, opacity, y }}
      onPointerEnter={() => onHoverChange(true)}
      onPointerLeave={() => onHoverChange(false)}
    >
      {children}
    </motion.div>
  );
}
