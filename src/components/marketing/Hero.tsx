"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
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
  // Resolved during render rather than in an effect: a setState in an effect
  // body cascades an extra render, and this value is needed by the very first
  // paint. sessionStorage is only read on the client, so the initial server
  // render and first client render agree on `checked: false`.
  // Lazy initialiser: runs once, on the first client render, before paint.
  // An effect would cascade a second render, and this decides the very first
  // frame. Returns false on the server so SSR and first client render agree.
  const [firstVisit] = useState(() => {
    if (typeof window === "undefined") return false;
    const seen = sessionStorage.getItem(SESSION_KEY);
    if (!seen) sessionStorage.setItem(SESSION_KEY, "1");
    return !seen;
  });

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
   * The delays are scaled down from the original storyboard because the hero
   * sub-line is the LCP element on mobile, and LCP cannot fire until it is
   * opaque. At the original 0.55s delay plus a 0.7s fade it reported ~2.65s on
   * a 4x-throttled phone — the animation was the metric, not the loading.
   *
   * Everything still lands in the same order; it simply arrives sooner.
   */
  const step = (delay: number) =>
    reduceMotion || !play
      ? { initial: false as const, animate: { opacity: 1, y: 0 } }
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.45, delay: delay * 0.5, ease: EASE },
        };

  const shown = projects.filter((p) => p.coverUrl).slice(0, 3);

  // Viewport-gated rather than CSS-hidden. `lg:hidden` still mounts the
  // element, and a mounted glass panel still costs its backdrop-filter — the
  // three desktop slabs were consuming the entire blur budget on a phone
  // while being invisible. Resolved before paint, so nothing flashes.
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === "undefined"
      ? true
      : window.matchMedia("(min-width: 1024px)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
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
          <motion.p
            {...step(0.1)}
            className="flex items-center gap-2.5 font-mono text-xs tracking-[0.1em] text-secondary uppercase"
          >
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[color:var(--text-notice)] opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex size-1.5 rounded-full bg-[color:var(--text-notice)]" />
            </span>
            Available for new projects
          </motion.p>

          <h1
            id="hero-heading"
            className="mt-6 text-[clamp(2.75rem,5.5vw,4.75rem)] leading-[1.02] font-semibold tracking-[-0.03em] text-primary"
          >
            {play && !reduceMotion ? (
              <TextReveal as="span" by="word" delay={0.2} className="block">
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
              href="/start"
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
        {shown.length > 0 && isDesktop ? (
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

        {/* Mobile: a single slab, in flow rather than absolutely placed. */}
        {shown.length > 0 && !isDesktop ? (
          <motion.div {...step(0.6)}>
            <SlabStatic project={shown[0]} />
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
        delay: play && !reduceMotion ? 0.6 + index * 0.11 : 0,
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
function SlabStatic({ project }: { project: HeroProject }) {
  return (
    <Link
      href={`/work/${project.slug}`}
      data-cursor="view"
      aria-label={`${project.title} — view case study`}
      className="block"
    >
      <LiquidGlass depth="near" shape="panel" className="overflow-hidden !p-2">
        <div className="relative aspect-[16/10] overflow-hidden rounded-[20px] bg-surface-2">
          <Image
            src={project.coverUrl!}
            alt={project.title}
            fill
            sizes="90vw"
            priority
            className="object-cover object-top"
          />
        </div>
      </LiquidGlass>
    </Link>
  );
}
