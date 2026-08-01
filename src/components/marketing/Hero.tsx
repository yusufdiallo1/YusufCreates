"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { LiquidGlass } from "@/components/ui/LiquidGlass";
import { TextReveal } from "@/components/motion/TextReveal";
import { track } from "@/lib/track";
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

/** Depth, offset and screenshot dimming per slab position. */
const SLABS = [
  {
    depth: "far" as const,
    scale: 0.88,
    className: "left-0 top-[6%] w-[62%]",
    imageOpacity: 0.6,
    drift: { duration: 11, y: 12, x: 5, rotate: 0.4 },
    z: 10,
  },
  {
    depth: "near" as const,
    scale: 1,
    className: "left-[22%] top-[26%] w-[68%]",
    imageOpacity: 0.85,
    drift: { duration: 8.5, y: 10, x: 4, rotate: -0.35 },
    z: 30,
  },
  {
    depth: "mid" as const,
    scale: 0.94,
    className: "left-[8%] top-[52%] w-[60%]",
    imageOpacity: 0.72,
    drift: { duration: 9.8, y: 11, x: 5, rotate: 0.3 },
    z: 20,
  },
];

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
      className="relative isolate flex min-h-[86dvh] items-center overflow-hidden px-6 py-24"
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
            style={reduceMotion ? undefined : { y: slabY }}
            className="relative h-[30rem] lg:col-span-7"
          >
            {(shown.length >= 3 ? SLABS : [SLABS[1]]).map((slab, i) => {
              const project = shown[shown.length >= 3 ? i : 0];
              if (!project) return null;
              return (
                <Slab
                  key={project.slug}
                  project={project}
                  config={slab}
                  index={i}
                  play={play}
                  reduceMotion={Boolean(reduceMotion)}
                  tiltX={tiltX}
                  tiltY={tiltY}
                />
              );
            })}
          </motion.div>
        ) : null}

        {/* Mobile: the same stacked composition, scaled down.
            Only the front slab is a link — see SlabStack. */}
        {shown.length > 0 && isDesktop === false ? (
          <motion.div {...step(0.6)}>
            <SlabStack projects={shown} />
          </motion.div>
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
}: {
  project: HeroProject;
  config: (typeof SLABS)[number];
  index: number;
  play: boolean;
  reduceMotion: boolean;
  tiltX: ReturnType<typeof useSpring>;
  tiltY: ReturnType<typeof useSpring>;
}) {
  return (
    <motion.div
      className={`absolute ${config.className}`}
      style={{
        zIndex: config.z,
        rotateX: reduceMotion ? 0 : tiltX,
        rotateY: reduceMotion ? 0 : tiltY,
        transformPerspective: 1200,
      }}
      initial={
        play && !reduceMotion
          ? { opacity: 0, y: 40, scale: config.scale * 0.94 }
          : false
      }
      animate={{ opacity: 1, y: 0, scale: config.scale }}
      transition={{
        duration: 0.9,
        delay: play && !reduceMotion ? 0.16 + index * 0.06 : 0,
        ease: EASE,
      }}
    >
      {/* Drift on a separate element from the entrance, so the two transforms
          compose instead of fighting over the same property. */}
      <motion.div
        animate={
          reduceMotion
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
            <div className="relative aspect-[16/10] overflow-hidden rounded-[20px] bg-surface-2">
              <Image
                src={project.coverUrl!}
                alt={project.title}
                fill
                sizes="(max-width: 1024px) 90vw, 40vw"
                // The near slab is the LCP element on desktop.
                priority={config.depth === "near"}
                style={{ opacity: config.imageOpacity }}
                className="object-cover object-top saturate-[0.75] transition-[opacity,filter] duration-slow ease-out-expo group-hover:!opacity-100 group-hover:saturate-100 motion-reduce:!opacity-100 motion-reduce:saturate-100"
              />
            </div>
          </LiquidGlass>
        </Link>
      </motion.div>
    </motion.div>
  );
}

/** Mobile and reduced-motion variant: one slab, no drift, no tilt. */

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
 * No drift, no tilt, and blur is left to the glass tokens: this is the mobile
 * blur budget, and animating three backdrop-filtered elements on a phone is
 * what made the old hero stutter.
 */
function SlabStack({ projects }: { projects: HeroProject[] }) {
  const front = projects[0];
  if (!front) return null;

  // Behind, then in front — the front slab is last so it wins on paint order
  // without needing a z-index on every layer.
  const behind = projects.slice(1, 3);

  return (
    <div className="relative h-[19rem] sm:h-[24rem]">
      {behind.map((project, i) => (
        <div
          key={project.slug}
          aria-hidden="true"
          className={
            i === 0
              ? "absolute top-0 left-0 w-[72%] opacity-70"
              : "absolute top-[18%] right-0 w-[64%] opacity-55"
          }
          style={{ transform: `scale(${i === 0 ? 0.94 : 0.88})` }}
        >
          <LiquidGlass depth={i === 0 ? "far" : "mid"} shape="panel" className="overflow-hidden !p-1.5">
            <div className="relative aspect-[16/10] overflow-hidden rounded-[16px] bg-surface-2">
              {project.coverUrl ? (
                <Image
                  src={project.coverUrl}
                  alt=""
                  fill
                  sizes="70vw"
                  className="object-cover object-top opacity-60"
                />
              ) : null}
            </div>
          </LiquidGlass>
        </div>
      ))}

      <Link
        href={`/work/${front.slug}`}
        data-cursor="view"
        aria-label={`${front.title} — view case study`}
        className="absolute top-[30%] left-[8%] block w-[86%]"
      >
        <LiquidGlass depth="near" shape="panel" className="overflow-hidden !p-2">
          <div className="relative aspect-[16/10] overflow-hidden rounded-[20px] bg-surface-2">
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
    </div>
  );
}

