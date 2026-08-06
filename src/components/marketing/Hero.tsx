"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { LiquidGlass } from "@/components/ui/LiquidGlass";
import { TextReveal } from "@/components/motion/TextReveal";
import { track } from "@/lib/track";
import { useCapability } from "@/components/providers/CapabilityProvider";
import { AvailabilityBadge } from "@/components/marketing/AvailabilityBadge";

/**
 * Hero — glass slabs over a warm near-black void.
 *
 * One soft light source, upper right. Every shadow direction and every
 * specular catch agrees with it; that consistency is what makes the slabs read
 * as physical objects rather than stacked cards.
 *
 * The subject is the work. The glass is how it is presented — each slab holds
 * a real project screenshot, dimmed and desaturated so it reads as sitting
 * *behind* frosted material, clearing to full colour on hover as if the glass
 * had cleared.
 *
 * PERFORMANCE — the constraint that governs everything here:
 * backdrop-filter is never animated, and no glass panel changes size or blur
 * radius while moving. Only transform and opacity. A blurred layer that
 * resizes forces the compositor to re-snapshot and re-blur its backdrop every
 * frame, which is the single most expensive thing available and will destroy
 * INP on a mid-range phone.
 */

const EASE = [0.16, 1, 0.3, 1] as const;
/*
 * useLayoutEffect logs a warning when React renders on the server, where it
 * cannot run. Neither can fire there, so aliasing to useEffect keeps the
 * server render silent while the client keeps its before-paint timing.
 */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const SESSION_KEY = "yc.hero.played";

export type HeroProject = {
  slug: string;
  title: string;
  coverUrl?: string;
  category?: string;
};

/**
 * Depth, offset and screenshot dimming per slab position.
 *
 * `origin` is the edge the slab flies in from on first load. It follows the
 * slab's resting position — a panel that lives on the left arrives from the
 * left — so the composition assembles outwards from the middle rather than
 * every card sliding the same way, which reads as a carousel.
 *
 * imageOpacity used to run 0.6 / 0.72 / 0.85. These are real screenshots of
 * real shipped work and they are the proof on this page; dimming them to 60%
 * made the hero look like it had failed to finish loading. They now sit close
 * to full and hover still takes them the rest of the way.
 */
type SlabConfig = {
  depth: "far" | "mid" | "near";
  scale: number;
  className: string;
  imageOpacity: number;
  drift: { duration: number; y: number; x: number; rotate: number };
  z: number;
  origin: "left" | "right";
};

const FAR: SlabConfig = {
  depth: "far",
  scale: 0.88,
  className: "left-0 top-[6%] w-[62%]",
  imageOpacity: 0.86,
  drift: { duration: 11, y: 12, x: 5, rotate: 0.4 },
  z: 10,
  origin: "left",
};

const NEAR: SlabConfig = {
  depth: "near",
  scale: 1,
  className: "left-[22%] top-[26%] w-[68%]",
  imageOpacity: 1,
  drift: { duration: 8.5, y: 10, x: 4, rotate: -0.35 },
  z: 30,
  origin: "right",
};

const MID: SlabConfig = {
  depth: "mid",
  scale: 0.94,
  className: "left-[8%] top-[52%] w-[60%]",
  imageOpacity: 0.92,
  drift: { duration: 9.8, y: 11, x: 5, rotate: 0.3 },
  z: 20,
  origin: "left",
};

/**
 * Layout per project count.
 *
 * This used to be a single three-slab array with `shown.length >= 3 ? SLABS :
 * [SLABS[1]]` at the call site, which meant one or two featured projects
 * collapsed the whole composition to a single panel — and a fourth was
 * discarded upstream by a `.take(3)` in convex/projects.ts. Featuring two
 * projects should show two, laid out for two, not one.
 *
 * Three is the cap here on purpose: the hero is a composition, not a gallery.
 * Everything marked featured appears in the "Featured work" section below,
 * which now has no limit.
 */
const SLAB_LAYOUTS: Record<number, SlabConfig[]> = {
  // Centred, and the largest of the three depths — a lone slab pinned to the
  // left edge just looks like the other two failed to load.
  1: [{ ...NEAR, className: "left-[10%] top-[20%] w-[80%]" }],
  2: [
    { ...FAR, className: "left-0 top-[8%] w-[64%]" },
    { ...NEAR, className: "left-[26%] top-[42%] w-[70%]" },
  ],
  3: [FAR, NEAR, MID],
};

/** How far a slab travels on entry, in px. */
const SLIDE_DISTANCE = 110;

/** Radius of the circle the cursor clears in the frost, in px. */
const FROST_RADIUS = 200;

/**
 * Where the near slab's cast shadow falls, relative to the slab itself.
 *
 * Down and to the LEFT, because the key light is upper-right — the same source
 * every other shadow and specular catch on this page agrees with. A shadow
 * falling the wrong way is the single most legible way to break the illusion.
 */
const CAST_SHADOW_OFFSET = { x: -18, y: 26 };

export function Hero({ projects = [] }: { projects?: HeroProject[] }) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLElement>(null);

  // Play the load sequence once per session. Returning to the page mid-visit
  // should feel like coming back to something already there.
  //
  /*
   * Decided in a LAYOUT effect, not a lazy useState initialiser.
   *
   * The initialiser runs during the first client render, so on a genuine first
   * visit it returned true while the server had rendered false — React saw
   * opacity 0 against opacity 1, hydration failed, and the whole tree was
   * thrown away and re-rendered.
   *
   * useLayoutEffect runs after hydration has committed but BEFORE the browser
   * paints. So the server and the first client render agree on the resting
   * state, and the animation still starts from its initial frame with nothing
   * visible in between. A plain useEffect fires after paint, which is why the
   * hero briefly appeared finished and then never animated.
   */
  const [firstVisit, setFirstVisit] = useState(false);
  /*
   * The read and the write are deliberately separate.
   *
   * Doing both in one effect broke under React's double-invoked effects: the
   * first pass wrote the flag, the second pass read it back as already set,
   * and the animation never ran. A ref that survives the second invocation
   * makes the decision once, and the flag is written afterwards.
   */
  const decided = useRef(false);

  useIsomorphicLayoutEffect(() => {
    if (decided.current) return;
    decided.current = true;

    const seen = sessionStorage.getItem(SESSION_KEY);
    if (!seen) setFirstVisit(true);
    sessionStorage.setItem(SESSION_KEY, "1");
  }, []);

  // Reduced motion means no load sequence at all — the composed resting state
  // renders immediately.
  const play = firstVisit && !reduceMotion;


  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // Springs so scroll-linked movement settles rather than tracking the wheel
  // one-to-one, which reads as jittery.
  const rawTextY = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const rawSlabY = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const textY = useSpring(rawTextY, { stiffness: 90, damping: 30 });
  const slabY = useSpring(rawSlabY, { stiffness: 90, damping: 30 });
  const textOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const glowScale = useTransform(scrollYProgress, [0, 1], [1, 1.2]);
  const glowOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.2]);

  // Pointer tilt. Disabled on touch, where there is no pointer to follow and
  // the extra listener is pure cost.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const tiltX = useSpring(pointerY, { stiffness: 150, damping: 20 });
  const tiltY = useSpring(pointerX, { stiffness: 150, damping: 20 });

  /*
   * Load sequence timing.
   *
   * The headline and sub-line START VISIBLE and only move — opacity is never
   * animated on them. The hero sub-line is the LCP element on mobile and LCP
   * cannot fire until it is opaque, so fading it in makes the animation the
   * metric rather than the loading. Reported ~2.65s on a throttled phone
   * before; the text was legible long after the page had actually arrived.
   *
   * A short upward settle is kept because it costs nothing on the measure —
   * transform is composited and does not gate LCP the way opacity does.
   */
  const step = (delay: number) =>
    reduceMotion || !play
      ? { initial: false as const, animate: { opacity: 1, y: 0 } }
      : {
          initial: { opacity: 1, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.34, delay: delay * 0.22, ease: EASE },
        };

  const shown = projects.filter((p) => p.coverUrl).slice(0, 3);
  const layout = SLAB_LAYOUTS[shown.length] ?? SLAB_LAYOUTS[3];

  // Viewport-gated rather than CSS-hidden. `lg:hidden` still mounts the
  // element, and a mounted glass panel still costs its backdrop-filter — the
  // three desktop slabs were consuming the entire blur budget on a phone
  // while being invisible. Resolved before paint, so nothing flashes.
  /*
   * null until the viewport is known, rather than assuming desktop.
   *
   * The lazy initialiser returned true on the server and the real match on the
   * client, so a phone rendered SlabStack where the server had sent the
   * desktop slab container — a changed element tree, and hydration failed.
   *
   * Resolved in a layout effect, which runs before paint, so the correct
   * variant is on screen in the first painted frame and neither is rendered
   * against the wrong markup.
   */
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useIsomorphicLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  /*
   * Depth of field.
   *
   * Which slab the pointer is on. The other two defocus — camera focus, not
   * z-index. Held here rather than in each slab because a slab has to know
   * about its siblings' state to know whether it is the one in focus.
   */
  const [focused, setFocused] = useState<number | null>(null);

  /*
   * The near slab's drift, lifted out of the slab and into MotionValues.
   *
   * It was a declarative keyframe loop, which moves the element perfectly well
   * but publishes nothing — and the shadow it now casts across the two behind
   * it has to travel with it, or the three panels go straight back to reading
   * as three independent layers that happen to overlap.
   *
   * Same durations, same amplitudes, same easing. Only the owner changed.
   */
  const nearDrift = layout.find((slab) => slab.depth === "near")?.drift;
  const driftX = useMotionValue(0);
  const driftY = useMotionValue(0);
  const driftRotate = useMotionValue(0);

  useEffect(() => {
    if (reduceMotion || !nearDrift || isDesktop !== true) return;
    const options = {
      duration: nearDrift.duration,
      repeat: Infinity,
      ease: "easeInOut" as const,
    };
    const runs = [
      animate(driftY, [0, -nearDrift.y, 0], options),
      animate(driftX, [0, nearDrift.x, 0], options),
      animate(driftRotate, [0, nearDrift.rotate, 0], options),
    ];
    return () => {
      for (const run of runs) run.stop();
    };
  }, [reduceMotion, nearDrift, isDesktop, driftX, driftY, driftRotate]);

  /*
   * The near slab's laid-out box, so the shadow can be sized and placed from it.
   *
   * offsetLeft/offsetTop rather than getBoundingClientRect: those report the
   * PRE-transform CSS box, so the measurement does not move with the tilt, the
   * drift or the entrance. Measuring the transformed rect would make the shadow
   * chase the slab a frame behind and grow every time the panel scaled.
   */
  const stageRef = useRef<HTMLDivElement>(null);
  const nearRef = useRef<HTMLDivElement>(null);
  const [nearBox, setNearBox] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const near = nearRef.current;
    if (!stage || !near) return;

    const measure = () =>
      setNearBox({
        left: near.offsetLeft,
        top: near.offsetTop,
        width: near.offsetWidth,
        height: near.offsetHeight,
      });
    measure();

    // One observer on the stage, not one per slab — the slabs are all sized in
    // percentages of it, so it is the only thing whose size can change them.
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [isDesktop, shown.length]);

  /*
   * Cursor-led frost clearing costs a mask repaint per frame on a
   * screenshot-sized element, so it is the first thing to go on a device that
   * cannot afford it. Below `full` the uniform CSS hover clear stays, which is
   * what was there before and still reads correctly.
   */
  const { tier } = useCapability();
  const clearFrost = tier === "full" && !reduceMotion;

  return (
    <section
      ref={ref}
      aria-labelledby="hero-heading"
      onPointerMove={
        reduceMotion
          ? undefined
          : (e) => {
              const r = e.currentTarget.getBoundingClientRect();
              // Normalised to roughly -5..5 degrees, falling off from centre.
              pointerX.set(((e.clientX - r.left) / r.width - 0.5) * 10);
              pointerY.set(((e.clientY - r.top) / r.height - 0.5) * -10);
            }
      }
      onPointerLeave={() => {
        pointerX.set(0);
        pointerY.set(0);
      }}
      // dvh, never vh: on mobile Safari vh is the *largest* viewport height, so
      // the hero sits partly under the address bar on first paint.
      /* pt-32 rather than py-24: the nav is fixed and occupies roughly the top
         84px, and `items-center` on a short viewport pulls the headline up
         under it. The extra top padding is what the centring is allowed to
         eat into. */
      className="relative isolate flex min-h-[86dvh] items-center overflow-hidden px-6 pt-32 pb-24"
    >
      <Backdrop glowScale={glowScale} glowOpacity={glowOpacity} play={play} />

      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-12">
        {/* Text. No glass behind it — it sits directly on the void. */}
        <motion.div
          style={reduceMotion ? undefined : { y: textY, opacity: textOpacity }}
          className="lg:col-span-5"
        >
          {/* Live, not a claim. Reads the same capacity as the waitlist, so
              the hero cannot advertise work that is already booked. */}
          <motion.div {...step(0.1)}>
            <AvailabilityBadge className="inline-flex items-center gap-2.5 font-mono text-xs tracking-[0.1em] text-secondary uppercase transition-colors duration-fast hover:text-primary" />
          </motion.div>

          <h1
            id="hero-heading"
            className="mt-6 text-[clamp(2.75rem,5.5vw,4.75rem)] leading-[1.02] font-semibold tracking-[-0.03em] text-primary"
          >
            {play && !reduceMotion ? (
              <TextReveal
                as="span"
                by="word"
                delay={0.2}
                /* Above the fold, so it animates on mount — whileInView is
                   already satisfied here and would snap. */
                onMount
                className="block"
              >
                Websites and web apps,
              </TextReveal>
            ) : (
              <span className="block">Websites and web apps,</span>
            )}
            <span className="block">
              built <span className="text-accent">properly.</span>
            </span>
          </h1>

          {/*
            Deliberately NOT animated in.

            This paragraph is the largest text block, which makes it the LCP
            element on a phone — and LCP cannot fire until it is opaque. Fading
            it in meant the animation, not the loading, was the metric.

            It rises with the rest of the column via the parent transform, so
            the sequence still reads as one movement; this element simply never
            starts invisible.
          */}
          <p className="mt-6 max-w-[46ch] text-lg text-secondary">
            For founders and teams who need the thing to work, not just look
            finished. I design it, build it, and stay when it ships.
          </p>

          <motion.div
            {...step(0.7)}
            className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <Link
              href="/pricing"
              data-cursor="link"
              onClick={() => track("cta_click", { cta: "hero-start" })}
              className="rounded-full bg-[color:var(--accent-solid)] px-6 py-3 text-center text-sm font-medium text-white transition-opacity duration-fast hover:opacity-90"
            >
              Start a project
            </Link>
            <Link
              href="/work"
              data-cursor="link"
              className="rounded-full px-6 py-3 text-center text-sm text-primary transition-colors duration-fast hover:bg-surface-2"
            >
              View work
            </Link>
          </motion.div>

          <motion.p
            {...step(1.2)}
            className="mt-10 font-mono text-[11px] tracking-[0.06em] text-secondary"
          >
            Next.js · TypeScript · Convex · Stripe · Resend
          </motion.p>
        </motion.div>

        {/* Slabs. Absolutely positioned within a reserved-height stage so the
            overlap is deliberate and the layout never shifts. */}
        {shown.length > 0 && isDesktop === true ? (
          <motion.div
            ref={stageRef}
            style={reduceMotion ? undefined : { y: slabY }}
            className="relative h-[30rem] lg:col-span-7"
            /* One leave handler on the stage rather than per slab: moving
               between two overlapping slabs fires leave-then-enter, and
               clearing focus on the stage means the gap between them never
               flashes all three back into focus for a frame. */
            onPointerLeave={() => setFocused(null)}
          >
            {layout.map((slab, i) => {
              const project = shown[i];
              if (!project) return null;
              const isNear = slab.depth === "near";
              return (
                <Slab
                  key={project.slug}
                  hostRef={isNear ? nearRef : undefined}
                  project={project}
                  config={slab}
                  index={i}
                  play={play}
                  reduceMotion={Boolean(reduceMotion)}
                  tiltX={tiltX}
                  tiltY={tiltY}
                  clearFrost={clearFrost}
                  dimmed={focused !== null && focused !== i}
                  onFocusChange={(on) => setFocused(on ? i : null)}
                  drift={
                    isNear
                      ? { x: driftX, y: driftY, rotate: driftRotate }
                      : undefined
                  }
                />
              );
            })}

            {/*
              The near slab's shadow, falling across the two behind it.

              ONE element at z-index 25, between the rear slabs (10 and 20) and
              the near slab (30). That single placement does the whole job: it
              darkens whatever sits behind the near panel and is occluded by the
              panel itself, which is what a cast shadow is. Three separate
              overlays, one per rear slab, would have to solve the same
              occlusion by hand and get the overlap between the rear two wrong.

              It reads driftX/driftY — the same values the near slab moves on —
              so the shadow travels with the object casting it. Without that
              the slabs go back to being three layers in a stack rather than
              three objects in one space.

              blur() here is a plain filter on a small opaque rectangle, not a
              backdrop-filter: it is rasterised once and then only translated,
              which is the cheap case.
            */}
            {nearBox && layout.length > 1 && !reduceMotion ? (
              <motion.div
                aria-hidden="true"
                initial={play ? { opacity: 0 } : false}
                animate={{ opacity: 0.18 }}
                transition={{
                  duration: 0.7,
                  delay: play ? 0.95 : 0,
                  ease: EASE,
                }}
                style={{
                  position: "absolute",
                  left: nearBox.left + CAST_SHADOW_OFFSET.x,
                  top: nearBox.top + CAST_SHADOW_OFFSET.y,
                  width: nearBox.width,
                  height: nearBox.height,
                  x: driftX,
                  y: driftY,
                  zIndex: 25,
                  borderRadius: "var(--glass-radius-panel)",
                  background: "#000",
                  filter: "blur(40px)",
                  pointerEvents: "none",
                }}
              />
            ) : null}
          </motion.div>
        ) : null}

        {/* Mobile: the same stacked composition, scaled down.
            Only the front slab is a link — see SlabStack. */}
        {shown.length > 0 && isDesktop === false ? (
          <SlabStack
            projects={shown}
            play={play}
            reduceMotion={Boolean(reduceMotion)}
          />
        ) : null}
      </div>
    </section>
  );
}

/**
 * Background. One warm light source upper-right, a dimmer cool one lower-left
 * for colour separation, and static grain over everything.
 *
 * None of it animates on a loop. A moving light source under moving glass is
 * both physically wrong and expensive.
 */
function Backdrop({
  glowScale,
  glowOpacity,
  play,
}: {
  glowScale: ReturnType<typeof useTransform<number, number>>;
  glowOpacity: ReturnType<typeof useTransform<number, number>>;
  play: boolean;
}) {
  return (
    <>
      <motion.div
        aria-hidden="true"
        initial={play ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.1, ease: EASE }}
        style={{ scale: glowScale, opacity: glowOpacity }}
        className="pointer-events-none absolute -top-40 -right-32 -z-10 size-[900px] rounded-full"
      >
        <div className="size-full rounded-full bg-[radial-gradient(circle,rgba(94,106,210,0.09)_0%,rgba(94,106,210,0)_70%)]" />
      </motion.div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-52 -left-40 -z-10 size-[640px] rounded-full bg-[radial-gradient(circle,rgba(120,160,210,0.03)_0%,rgba(120,160,210,0)_70%)]"
      />

      {/* Grain. Static, and cheap — one SVG turbulence rasterised once. */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 size-full opacity-[0.025]"
      >
        <filter id="hero-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves={3}
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#hero-grain)" />
      </svg>
    </>
  );
}

function Slab({
  project,
  config,
  index,
  play,
  reduceMotion,
  tiltX,
  tiltY,
  clearFrost,
  dimmed,
  onFocusChange,
  drift,
  hostRef,
}: {
  project: HeroProject;
  config: SlabConfig;
  index: number;
  play: boolean;
  reduceMotion: boolean;
  tiltX: MotionValue<number>;
  tiltY: MotionValue<number>;
  /** Whether this slab clears its frost from the cursor rather than uniformly. */
  clearFrost: boolean;
  /** True while a DIFFERENT slab has the pointer. */
  dimmed: boolean;
  onFocusChange: (focused: boolean) => void;
  /** Supplied for the near slab only, whose drift the cast shadow reads. */
  drift?: {
    x: MotionValue<number>;
    y: MotionValue<number>;
    rotate: MotionValue<number>;
  };
  hostRef?: React.Ref<HTMLDivElement>;
}) {
  /*
   * Each slab arrives from the edge it rests nearest, with a slight
   * counter-rotation that unwinds as it lands — so the composition assembles
   * outwards rather than every panel sliding up together.
   *
   * x and rotate are only ever set in `initial`, never in `animate`, so the
   * infinite drift loop on the inner element stays the only thing owning those
   * properties at rest. Two animations writing the same transform is what
   * makes a panel jitter once the entrance finishes.
   */
  const fromLeft = config.origin === "left";

  /*
   * Tilt-driven specular.
   *
   * The highlight was a fixed inset in the shadow stack, so the light stayed
   * put while the surface turned under it — and a highlight that does not move
   * when the plane moves reads as paint rather than as light. Deriving its
   * position from the tilt sends it toward whichever edge is rising, which is
   * what a real specular catch does.
   *
   * Inverted on both axes: tilting the far edge away lifts the near edge, and
   * the light gathers on the part now facing the source.
   */
  const highlightX = useTransform(tiltY, [-5, 5], ["88%", "12%"]);
  const highlightY = useTransform(tiltX, [-5, 5], ["12%", "88%"]);
  const highlightPosition = useMotionTemplate`${highlightX} ${highlightY}`;

  /*
   * Cursor-led frost clearing.
   *
   * The mask position is spring-lagged behind the true pointer, and that lag is
   * the whole effect: frost that clears exactly under the cursor reads as a
   * spotlight, frost that clears a beat later reads as something viscous being
   * pushed out of the way.
   *
   * The radius is a MotionValue rather than a CSS transition because it runs at
   * different speeds in each direction — 300ms opening, 400ms closing — and
   * because it has to compose into the same template string as the position.
   */
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const maskX = useSpring(pointerX, { stiffness: 120, damping: 20 });
  const maskY = useSpring(pointerY, { stiffness: 120, damping: 20 });
  const maskRadius = useMotionValue(0);
  const frostMask = useMotionTemplate`radial-gradient(${maskRadius}px circle at ${maskX}px ${maskY}px, transparent 0%, black 68%)`;

  /*
   * The panel's box, cached on enter rather than read per move.
   *
   * getBoundingClientRect inside a pointermove handler forces a synchronous
   * layout on every event, and this element is already drifting. One read per
   * hover is enough — the slab travels at most a dozen pixels over its cycle,
   * which is nothing against a 200px soft-edged mask.
   */
  const boxRef = useRef<DOMRect | null>(null);

  const trackPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = boxRef.current;
    if (!box) return;
    pointerX.set(event.clientX - box.left);
    pointerY.set(event.clientY - box.top);
  };

  const onEnter = (event: React.PointerEvent<HTMLDivElement>) => {
    onFocusChange(true);
    if (!clearFrost) return;
    const box = event.currentTarget.getBoundingClientRect();
    boxRef.current = box;
    // jump, not set: the mask opens where the pointer arrived rather than
    // springing across the panel from wherever it was left last time.
    maskX.jump(event.clientX - box.left);
    maskY.jump(event.clientY - box.top);
    trackPointer(event);
    animate(maskRadius, FROST_RADIUS, { duration: 0.3, ease: "easeOut" });
  };

  const onLeave = () => {
    onFocusChange(false);
    if (!clearFrost) return;
    animate(maskRadius, 0, { duration: 0.4, ease: "easeOut" });
  };

  return (
    <motion.div
      ref={hostRef}
      className={`absolute ${config.className}`}
      style={{
        zIndex: config.z,
        rotateX: reduceMotion ? 0 : tiltX,
        rotateY: reduceMotion ? 0 : tiltY,
        transformPerspective: 1200,
      }}
      initial={
        play && !reduceMotion
          ? {
              opacity: 0,
              x: fromLeft ? -SLIDE_DISTANCE : SLIDE_DISTANCE,
              y: 28,
              rotate: fromLeft ? -3 : 3,
              scale: config.scale * 0.94,
            }
          : false
      }
      animate={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: config.scale }}
      transition={{
        duration: 0.85,
        delay: play && !reduceMotion ? 0.16 + index * 0.09 : 0,
        ease: EASE,
      }}
    >
      {/* Drift on a separate element from the entrance, so the two transforms
          compose instead of fighting over the same property.

          The near slab's drift is driven from MotionValues owned by Hero, so
          the shadow it casts can travel with it. The other two keep the
          declarative loop — nothing reads those. */}
      <motion.div
        style={
          drift ? { x: drift.x, y: drift.y, rotate: drift.rotate } : undefined
        }
        animate={
          reduceMotion || drift
            ? undefined
            : {
                y: [0, -config.drift.y, 0],
                x: [0, config.drift.x, 0],
                rotate: [0, config.drift.rotate, 0],
              }
        }
        transition={{
          duration: config.drift.duration,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/*
          Depth of field, on a wrapper that is never transformed.

          Putting the filter on the drifting element would make the compositor
          re-rasterise a blurred layer on every frame of the loop, which is the
          expensive case. This element only changes when the pointer moves
          between slabs.

          The filter is ABSENT at rest rather than set to blur(0). An ancestor
          with any filter value establishes a backdrop root, and a backdrop root
          is precisely what would stop the LiquidGlass inside from seeing the
          page behind it — the panel would go flat. So the property exists only
          while the slab is deliberately out of focus, and CSS interpolates from
          `none` using the identity value, which gives the same 300ms ramp.
        */}
        <div
          className="transition-[filter,opacity] duration-300 ease-out motion-reduce:transition-none"
          style={dimmed ? { filter: "blur(1.5px)", opacity: 0.75 } : undefined}
        >
          <Link
            href={`/work/${project.slug}`}
            data-cursor="view"
            aria-label={`${project.title} — view case study`}
            className="group block"
          >
            <LiquidGlass
              depth={config.depth}
              shape="panel"
              className="overflow-hidden !p-2 transition-transform duration-slow ease-out-expo group-hover:-translate-y-2.5"
            >
              <div
                className="relative aspect-[16/10] overflow-hidden rounded-[var(--radius-xs)] bg-surface-2"
                onPointerEnter={onEnter}
                onPointerMove={clearFrost ? trackPointer : undefined}
                onPointerLeave={onLeave}
              >
                {clearFrost ? (
                  <>
                    {/* Base: the screenshot at full colour. Only ever seen
                        through the hole the cursor opens in the layer above. */}
                    <Image
                      src={project.coverUrl!}
                      alt={project.title}
                      fill
                      sizes="(max-width: 1024px) 90vw, 40vw"
                      // The near slab is the LCP element on desktop.
                      priority={config.depth === "near"}
                      className="object-cover object-top"
                    />

                    {/*
                      The frost. The same image, dimmed and desaturated to the
                      resting appearance, masked so it disappears under the
                      cursor. Both copies resolve to a single request — same
                      URL, same optimiser parameters.

                      brightness rather than opacity for the dimming: an opacity
                      here would let the full-colour base bleed through
                      everywhere, so the panel would rest brighter than it did
                      before and the hover would have less left to reveal.
                    */}
                    <motion.div
                      aria-hidden="true"
                      className="absolute inset-0"
                      style={{
                        maskImage: frostMask,
                        WebkitMaskImage: frostMask,
                      }}
                    >
                      <Image
                        src={project.coverUrl!}
                        alt=""
                        fill
                        sizes="(max-width: 1024px) 90vw, 40vw"
                        /*
                         * priority here as well as on the base copy.
                         *
                         * THIS is the layer that is visible at rest — the base
                         * underneath is only ever seen through the hole the
                         * cursor opens. So on the near slab this is the LCP
                         * element, and without the hint Next lazy-loads the
                         * largest thing above the fold. Both copies resolve to
                         * one request, so the preload is not duplicated.
                         */
                        priority={config.depth === "near"}
                        style={{
                          filter: `saturate(0.95) brightness(${config.imageOpacity})`,
                        }}
                        className="object-cover object-top"
                      />
                    </motion.div>
                  </>
                ) : (
                  <Image
                    src={project.coverUrl!}
                    alt={project.title}
                    fill
                    sizes="(max-width: 1024px) 90vw, 40vw"
                    // The near slab is the LCP element on desktop.
                    priority={config.depth === "near"}
                    style={{ opacity: config.imageOpacity }}
                    /* saturate-[0.95] rather than the old 0.75. Combined with an
                       imageOpacity of 0.6 that read as a broken image rather than
                       a recessed one; the depth is already carried by scale, blur
                       and position, so the colour barely needs to help. */
                    className="object-cover object-top saturate-[0.95] transition-[opacity,filter] duration-slow ease-out-expo group-hover:!opacity-100 group-hover:saturate-100 motion-reduce:!opacity-100 motion-reduce:saturate-100"
                  />
                )}

                {/* The specular catch, riding the tilt. Screen blend so it adds
                    light to the image rather than washing it out. */}
                <motion.div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage:
                      "radial-gradient(closest-side, rgba(255,255,255,0.16), rgba(255,255,255,0.05) 46%, rgba(255,255,255,0) 72%)",
                    backgroundSize: "180% 180%",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: highlightPosition,
                    mixBlendMode: "screen",
                  }}
                />
              </div>
            </LiquidGlass>
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * Mobile slab stack.
 *
 * The same three-slab composition as desktop, scaled to fit a phone. It was a
 * single flat card, which lost the one thing that makes the hero look like
 * anything — the depth.
 *
 * Only the FRONT slab is a link. Three overlapping tap targets on a phone
 * means the two behind are mostly covered, so tapping "a card" would sometimes
 * open whichever project happened to own that sliver. The two behind are
 * decorative and aria-hidden, which also keeps them out of the tab order
 * rather than leaving two unreachable links in it.
 *
 * Each panel now slides in from the edge it rests against — the back-left one
 * from the left, the back-right one from the right, the front one up from
 * below. That is a ONE-SHOT transform, not the desktop drift loop: the warning
 * that used to sit here was about animating three backdrop-filtered elements
 * *continuously* on a phone, which is what made the old hero stutter. A single
 * composited entrance that settles and stops is affordable.
 *
 * Still no drift and no tilt on mobile, for exactly that reason.
 */
function SlabStack({
  projects,
  play,
  reduceMotion,
}: {
  projects: HeroProject[];
  play: boolean;
  reduceMotion: boolean;
}) {
  const front = projects[0];
  if (!front) return null;

  // Behind, then in front — the front slab is last so it wins on paint order
  // without needing a z-index on every layer.
  const behind = projects.slice(1, 3);

  const animate = play && !reduceMotion;
  const entrance = (from: "left" | "right" | "below", delay: number) =>
    animate
      ? {
          initial: {
            opacity: 0,
            x: from === "left" ? -70 : from === "right" ? 70 : 0,
            y: from === "below" ? 40 : 16,
          },
          animate: { opacity: 1, x: 0, y: 0 },
          transition: { duration: 0.7, delay, ease: EASE },
        }
      : {};

  return (
    <div className="relative h-[19rem] sm:h-[24rem]">
      {behind.map((project, i) => (
        <motion.div
          key={project.slug}
          aria-hidden="true"
          {...entrance(i === 0 ? "left" : "right", 0.1 + i * 0.09)}
          className={
            i === 0
              ? "absolute top-0 left-0 w-[72%] opacity-70"
              : "absolute top-[18%] right-0 w-[64%] opacity-55"
          }
          style={{ scale: i === 0 ? 0.94 : 0.88 }}
        >
          <LiquidGlass depth={i === 0 ? "far" : "mid"} shape="panel" className="overflow-hidden !p-1.5">
            <div className="relative aspect-[16/10] overflow-hidden rounded-[var(--radius-xs)] bg-surface-2">
              {project.coverUrl ? (
                <Image
                  src={project.coverUrl}
                  alt=""
                  fill
                  sizes="70vw"
                  className="object-cover object-top opacity-80"
                />
              ) : null}
            </div>
          </LiquidGlass>
        </motion.div>
      ))}

      <motion.div
        {...entrance("below", 0.28)}
        className="absolute top-[30%] left-[8%] w-[86%]"
      >
        <Link
          href={`/work/${front.slug}`}
          data-cursor="view"
          aria-label={`${front.title} — view case study`}
          className="block"
        >
          <LiquidGlass depth="near" shape="panel" className="overflow-hidden !p-2">
            <div className="relative aspect-[16/10] overflow-hidden rounded-[var(--radius-xs)] bg-surface-2">
              {front.coverUrl ? (
                <Image
                  src={front.coverUrl}
                  alt={front.title}
                  fill
                  sizes="90vw"
                  priority
                  className="object-cover object-top"
                />
              ) : null}
            </div>
          </LiquidGlass>
        </Link>
      </motion.div>
    </div>
  );
}

