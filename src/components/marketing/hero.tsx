"use client";

import { useRef } from "react";
import Link from "next/link";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";

/**
 * Hero — three stacked layers.
 *
 *   1. YUSUF DIALLO, oversized and low-opacity, behind everything. This is
 *      the person, not the brand.
 *   2. A cut-out portrait whose head and shoulders occlude the top of the
 *      name, so the name reads as passing behind him.
 *   3. Foreground copy, CTA and availability pill.
 *
 * Load is one orchestrated moment: the name wipes in per letter, the portrait
 * rises, then the foreground arrives. On scroll the name translates slower
 * than the portrait, which is what produces the depth.
 *
 * No layout shift: every layer is absolutely positioned inside a fixed-height
 * stage, and the portrait box is reserved before it loads.
 */

const NAME = "YUSUF DIALLO";
const EASE = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // The name moves least, the portrait most — parallax depth.
  const nameY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const portraitY = useTransform(scrollYProgress, [0, 1], ["0%", "42%"]);

  const letters = Array.from(NAME);

  return (
    <section
      ref={ref}
      className="relative flex min-h-[88svh] items-center overflow-hidden pt-28"
    >
      {/* Layer 1 — the name. */}
      <motion.div
        aria-hidden="true"
        style={reduceMotion ? undefined : { y: nameY }}
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none"
      >
        <div className="flex justify-center whitespace-nowrap">
          {letters.map((letter, index) => (
            <motion.span
              key={`${letter}-${index}`}
              initial={
                reduceMotion
                  ? false
                  : { clipPath: "inset(0 0 100% 0)", opacity: 0 }
              }
              animate={{ clipPath: "inset(0 0 0% 0)", opacity: 0.07 }}
              transition={{
                duration: 0.8,
                delay: reduceMotion ? 0 : index * 0.045,
                ease: EASE,
              }}
              style={{
                fontSize: "clamp(4rem, 18vw, 20rem)",
                fontWeight: 600,
                letterSpacing: "-0.022em",
                lineHeight: 0.85,
                color: "var(--text-primary)",
              }}
            >
              {letter === " " ? " " : letter}
            </motion.span>
          ))}
        </div>
      </motion.div>

      {/* Layer 2 — portrait, occluding the top of the name. */}
      <motion.div
        aria-hidden="true"
        style={reduceMotion ? undefined : { y: portraitY }}
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: reduceMotion ? 0 : 0.5, ease: EASE }}
        className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center"
      >
        {/*
          TODO — replace with the real cut-out portrait.
          Drop a transparent PNG at public/portrait.png (subject centred,
          shoulders cropped at the frame edge, roughly 1200x1500) and swap the
          silhouette below for:
            <Image src="/portrait.png" alt="" width={480} height={600} priority />
          Keep an explicit height so nothing shifts while it loads.
        */}
        <PortraitPlaceholder />
      </motion.div>

      {/* Layer 3 — foreground. */}
      <div className="relative z-10 mx-auto w-full max-w-5xl px-6">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            delay: reduceMotion ? 0 : 0.95,
            ease: EASE,
          }}
          className="max-w-xl"
        >
          <p className="text-sm text-secondary">
            Independent developer · Madinah, Saudi Arabia
          </p>

          <h1 className="mt-4 text-4xl">
            I build fast, bilingual software for businesses that need it to
            actually work.
          </h1>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/start"
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas transition-opacity duration-fast hover:opacity-90"
            >
              Start a project
            </Link>

            <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-hairline)] px-3 py-1.5 text-xs text-secondary">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-accent"
              />
              Available for new work
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/** Neutral stand-in so the layout is correct before the real cut-out lands. */
function PortraitPlaceholder() {
  return (
    <svg
      width="420"
      height="520"
      viewBox="0 0 420 520"
      className="h-[52svh] w-auto max-w-full"
      role="presentation"
    >
      <defs>
        <linearGradient id="hero-silhouette" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--bg-surface-3)" />
          <stop offset="100%" stopColor="var(--bg-canvas)" />
        </linearGradient>
      </defs>
      <circle cx="210" cy="150" r="86" fill="url(#hero-silhouette)" />
      <path
        d="M60 520 C60 380 130 300 210 300 C290 300 360 380 360 520 Z"
        fill="url(#hero-silhouette)"
      />
    </svg>
  );
}
