"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { NameMark } from "@/components/ui/NameMark";
import { InstagramIcon } from "@/components/ui/SocialIcons";
import { INSTAGRAM } from "@/lib/constants";

/**
 * Hero — centred, single column.
 *
 * The earlier version stacked an oversized name behind a portrait. In practice
 * the name ran past both edges of the viewport and sat directly underneath the
 * headline, so the two competed and neither read cleanly. This version puts
 * the name where it belongs: as the eyebrow, at a size that fits, with the Y
 * and D drawn as marks.
 *
 * One orchestrated load: name, then headline, then supporting line, then the
 * actions. Nothing is absolutely positioned, so there is no layout shift and
 * it holds down to 320px.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  const reduceMotion = useReducedMotion();

  const step = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay, ease: EASE },
        };

  return (
    <section className="relative flex min-h-[86svh] items-center overflow-hidden">
      {/* A single quiet accent wash. No mesh, no gradient stack. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-72 w-[min(48rem,92vw)] -translate-x-1/2 rounded-full opacity-30 blur-[120px]"
        style={{ background: "var(--accent-glow)" }}
      />

      <div className="mx-auto w-full max-w-3xl px-6 py-24 text-center">
        <motion.div {...step(0)}>
          <NameMark className="text-sm tracking-[0.22em] text-secondary uppercase" />
        </motion.div>

        <motion.h1
          {...step(0.12)}
          className="mt-8 text-balance text-4xl sm:text-5xl"
        >
          I build fast, bilingual software for businesses that need it to
          actually work.
        </motion.h1>

        <motion.p
          {...step(0.22)}
          className="mx-auto mt-6 max-w-lg text-pretty text-lg text-secondary"
        >
          Independent developer. I take projects from a first conversation
          through to something deployed, measured and handed over.
        </motion.p>

        <motion.div
          {...step(0.32)}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            href="/start"
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas transition-opacity duration-fast hover:opacity-90"
          >
            Start a project
          </Link>

          <Link
            href="/work"
            className="rounded-full border border-[color:var(--border-hairline)] px-5 py-2.5 text-sm text-primary transition-colors duration-fast hover:bg-surface-1"
          >
            See the work
          </Link>
        </motion.div>

        <motion.div
          {...step(0.4)}
          className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-secondary"
        >
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-accent"
            />
            Available for new work
          </span>

          <a
            href={INSTAGRAM.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Instagram, ${INSTAGRAM.handle}`}
            data-cursor="link"
            className="inline-flex items-center gap-1.5 transition-colors duration-fast hover:text-primary"
          >
            <InstagramIcon size={14} />
            {INSTAGRAM.handle}
          </a>
        </motion.div>
      </div>
    </section>
  );
}
