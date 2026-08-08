"use client";

import Link from "next/link";
import { useReducedMotion } from "motion/react";
import { usePreloadedQuery, type Preloaded } from "convex/react";
import type { api } from "@/lib/convex-api";
import {
  PinnedShowcase,
  ProjectCard,
  type Project,
} from "@/components/marketing/Projects";
import { Reveal } from "@/components/motion/Reveal";
import { TextReveal } from "@/components/motion/TextReveal";
import { WordReveal } from "@/components/motion/WordReveal";
import { Parallax } from "@/components/motion/Parallax";
import { SpotlightGroup } from "@/components/motion/Spotlight";
import { DrawnGlyph, type GlyphName } from "@/components/ui/DrawnGlyph";

/**
 * Work — the case-study index.
 *
 * This was a heading and a grid, which told a visitor nothing about how any
 * of it was built or what to look for. The copy between the cards is the
 * argument the grid cannot make on its own.
 *
 * Motion is scroll-driven rather than fired on mount: the page is long enough
 * that anything animating above the fold has finished before it is reached.
 * Every primitive used here already handles prefers-reduced-motion.
 */

/** What is actually true of every project below. */
const HOW: { n: string; glyph: GlyphName; title: string; body: string }[] = [
  {
    n: "01",
    glyph: "handover-box",
    title: "Built to be handed over",
    body: "Every one of these runs without me. Code, domain and accounts are in the client's name from the first day, and there is an admin they use themselves rather than emailing me to change a price.",
  },
  {
    n: "02",
    glyph: "speed",
    title: "Fast because of how it is built",
    body: "Not fast because it was optimised afterwards. Server rendering, images sized for the device asking for them, and no framework loaded to do something the browser already does.",
  },
  {
    n: "03",
    glyph: "uptime",
    title: "Still running",
    body: "Anyone can ship something that works on launch day. These have been live and largely unattended since, which is the part that actually costs people money when it goes wrong.",
  },
];

export function WorkIndex({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.projects.listPublished>;
}) {
  const projects = usePreloadedQuery(preloaded);
  const reduceMotion = useReducedMotion();

  return (
    <>
      {/* A thin bar showing how far through the page you are. Cheap, and it
          answers "how much more is there" without a number. */}

      <div className="mx-auto max-w-5xl px-6 pt-32 pb-24">
        <TextReveal as="h1" by="word" className="block text-4xl">
          Work
        </TextReveal>

        <div className="mt-6 max-w-2xl">
          <WordReveal as="p" className="text-secondary">
            {"Real projects with real users, not concepts. Each one is a business that needed something specific and now has it."}
          </WordReveal>

          <Reveal delay={0.2}>
            <p className="mt-4 text-secondary">
              Most started the same way — someone with a deadline and either
              nothing built yet or something built badly. What follows is what
              shipped, and what is still true about it now.
            </p>
          </Reveal>
        </div>

        {!projects || projects.length === 0 ? (
          <Reveal delay={0.1}>
            <p className="mt-12 text-secondary">
              Case studies are being written up. Check back shortly.
            </p>
          </Reveal>
        ) : (
          <>
            {/* A count, and the years covered. Two facts that turn "some
                screenshots" into a body of work, and they cost one line. */}
            <Reveal delay={0.24}>
              <p className="mt-12 font-mono text-xs tracking-[0.08em] text-muted uppercase">
                {projects.length}{" "}
                {projects.length === 1 ? "case study" : "case studies"}
                {(() => {
                  const years = projects
                    .map((p: Project) => p.year)
                    .filter(Boolean)
                    .sort();
                  const first = years[0];
                  const last = years[years.length - 1];
                  if (!first) return null;
                  return ` · ${first === last ? first : `${first}–${last}`}`;
                })()}
              </p>
            </Reveal>

            {/*
              ASYMMETRIC ON PURPOSE. The first project runs full width, the
              rest sit in a two-column grid beneath it.

              A uniform grid gives every project identical weight, which reads
              as a contact sheet — the eye has nowhere to land and nothing to
              read first. Leading with one at full width makes the page have an
              opening rather than a beginning, and it is also simply honest:
              the newest, best piece deserves the room.

              Falls back to the plain grid at one project, where a "lead" with
              nothing following it is just a big card.
            */}
            {/*
              DESKTOP TRAVELS, SMALL SCREENS READ.

              The same pinned sideways showcase the homepage uses, and for the
              same reason: on a page whose whole job is "here is the work", the
              scroll gesture and the work should move together rather than the
              page stepping through a contact sheet.

              The grid below is not a lesser version of it — it is the index,
              and it is what a phone gets, what reduced motion gets, and what
              anyone gets who wants to see everything at once rather than one
              at a time. Pinning needs viewport height to work against and
              fights the only gesture a phone has, which is why it is lg-only.
            */}
            {!reduceMotion ? (
              <div className="mt-6 hidden lg:block">
                <PinnedShowcase projects={projects} viewportsPerProject={0.7} />
              </div>
            ) : null}

            <SpotlightGroup
              className={`mt-6 grid grid-cols-1 gap-8 sm:grid-cols-2 ${
                reduceMotion ? "" : "lg:hidden"
              }`}
            >
              {projects.map((project: Project, index: number) => {
                const lead = index === 0 && projects.length > 1;
                return (
                  /* Alternating columns drift at different rates as you
                     scroll, so the grid reads as depth rather than a table of
                     pictures. The lead card does not drift — the first thing
                     you see should be still. */
                  <div
                    key={project._id}
                    className={lead ? "sm:col-span-2" : undefined}
                  >
                    {lead ? (
                      <Reveal>
                        <ProjectCard project={project} wide />
                      </Reveal>
                    ) : (
                      <Parallax distance={index % 2 === 0 ? 24 : 48}>
                        <Reveal delay={(index % 2) * 0.08}>
                          <ProjectCard project={project} />
                        </Reveal>
                      </Parallax>
                    )}
                  </div>
                );
              })}
            </SpotlightGroup>
          </>
        )}

        {/* Placed after the work rather than before it, so it reads as what
            these have in common instead of a claim made before anything has
            been shown. */}
        <section aria-labelledby="how-heading" className="mt-24">
          <Reveal>
            <h2 id="how-heading" className="text-2xl">
              What these have in common
            </h2>
          </Reveal>

          <ul className="mt-8 divide-y divide-[color:var(--border-hairline)]">
            {HOW.map((item, index) => (
              <li key={item.n}>
                <Reveal delay={index * 0.06}>
                  <div className="flex gap-6 py-6">
                    {/* The number stays — it is the sequence — but the mark is
                        what makes the row scannable, and it draws itself in as
                        the row arrives. */}
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="font-mono text-xs text-secondary tabular-nums">
                        {item.n}
                      </span>
                      <DrawnGlyph
                        name={item.glyph}
                        delay={index * 0.08}
                        className="size-6 text-accent"
                      />
                    </span>
                    <div className="max-w-2xl">
                      <h3 className="text-base text-primary">{item.title}</h3>
                      <p className="mt-1.5 text-sm text-secondary">
                        {item.body}
                      </p>
                    </div>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </section>

        <Reveal>
          <div className="hairline-t mt-20 pt-10">
            <p className="text-lg">Something here close to what you need?</p>
            <p className="mt-2 max-w-xl text-sm text-secondary">
              The prices are published, so you can work out roughly where your
              project lands before speaking to anyone.
            </p>
            <Link
              href="/pricing"
              className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas transition-opacity duration-hover ease-hover hover:opacity-90"
            >
              See pricing
            </Link>
          </div>
        </Reveal>
      </div>
    </>
  );
}
