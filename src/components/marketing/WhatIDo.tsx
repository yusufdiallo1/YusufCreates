import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { TextReveal } from "@/components/motion/TextReveal";
import { SpotlightGroup } from "@/components/motion/Spotlight";
import { ServiceGlyph } from "@/components/marketing/ServiceGlyph";

/**
 * What I do — the four service lines, condensed for the homepage.
 *
 * Sits between the intro and the work so a visitor knows what is on offer
 * before they judge whether the portfolio is relevant to them.
 *
 * This was four hairline-topped text blocks. Four headings and four
 * paragraphs, identically weighted, is a list you skim past rather than read —
 * and it was the least distinguishable section on the page.
 *
 * Now each line carries its ServiceGlyph, which draws itself in on scroll
 * (pathLength 0→1, staggered per stroke — see ServiceGlyph). The glyphs
 * already existed for /services and were simply never used here, so the
 * homepage and the services page now say the same thing the same way rather
 * than one being prose and the other being diagrams.
 */

const LINES = [
  {
    title: "Marketing sites",
    glyph: "site" as const,
    body: "The site your business is judged by. Fast, accessible, and easy for you to change later without paying someone.",
  },
  {
    title: "Web apps and SaaS",
    glyph: "app" as const,
    body: "Software people log into. Auth, database, payments, dashboards — the parts that turn a site into a product.",
  },
  {
    title: "Multilingual builds",
    glyph: "bilingual" as const,
    body: "English, Arabic, French, Russian, Swedish. Real right-to-left support where it applies, not a flipped stylesheet.",
  },
  {
    title: "Rescue and rebuild",
    glyph: "rescue" as const,
    body: "You have something half working that nobody will touch. I take it over and hand it back maintainable.",
  },
];

export function WhatIDo() {
  return (
    <section
      id="services"
      aria-labelledby="what-i-do-heading"
      className="mx-auto max-w-5xl px-6 py-24"
    >
      <TextReveal
        as="h2"
        by="word"
        className="block max-w-2xl text-3xl"
      >
        Four things, done properly, rather than a list of everything.
      </TextReveal>

      {/* SpotlightGroup tracks the pointer once for the whole grid and writes
          CSS variables onto the hovered card, rather than each card attaching
          its own listener. */}
      <SpotlightGroup className="mt-16 grid gap-5 sm:grid-cols-2">
        {LINES.map((line, index) => (
          <Reveal key={line.title} delay={index * 0.07}>
            {/* data-spotlight written literally rather than via
                spotlightProps(): this is a server component, and that helper
                lives in a "use client" module, so importing it here yields a
                client reference that throws when called during SSR. The
                attribute is the entire contract SpotlightGroup looks for. */}
            <div
              data-spotlight=""
              className="group hairline relative h-full overflow-hidden rounded-2xl bg-surface-1/60 p-6 transition-[transform,border-color] duration-hover ease-hover hover:-translate-y-1 hover:border-[color:var(--border-glass)]"
            >
              <ServiceGlyph
                kind={line.glyph}
                className="size-11 text-accent transition-transform duration-hover ease-hover group-hover:scale-105"
              />
              <h3 className="mt-5 text-lg">{line.title}</h3>
              <p className="mt-2 text-sm text-secondary">{line.body}</p>
            </div>
          </Reveal>
        ))}
      </SpotlightGroup>

      <Reveal delay={0.3}>
        <Link
          href="/services"
          className="mt-12 inline-block text-sm text-accent transition-colors duration-hover ease-hover hover:text-primary"
        >
          More on how each one works →
        </Link>
      </Reveal>
    </section>
  );
}
