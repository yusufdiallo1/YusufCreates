import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { TextReveal } from "@/components/motion/TextReveal";

/**
 * What I do — the four service lines, condensed for the homepage.
 *
 * Sits between the intro and the work so a visitor knows what is on offer
 * before they judge whether the portfolio is relevant to them.
 */

const LINES = [
  {
    title: "Marketing sites",
    body: "The site your business is judged by. Fast, accessible, and easy for you to change later without paying someone.",
  },
  {
    title: "Web apps and SaaS",
    body: "Software people log into. Auth, database, payments, dashboards — the parts that turn a site into a product.",
  },
  {
    title: "Multilingual builds",
    body: "English, Arabic, French, Russian, Swedish. Real right-to-left support where it applies, not a flipped stylesheet.",
  },
  {
    title: "Rescue and rebuild",
    body: "You have something half working that nobody will touch. I take it over and hand it back maintainable.",
  },
];

export function WhatIDo() {
  return (
    <section
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

      <div className="mt-16 grid gap-x-12 gap-y-10 sm:grid-cols-2">
        {LINES.map((line, index) => (
          <Reveal key={line.title} delay={index * 0.07}>
            <div className="hairline-t pt-5">
              <h3 className="text-lg">{line.title}</h3>
              <p className="mt-2 text-sm text-secondary">{line.body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.3}>
        <Link
          href="/services"
          className="mt-12 inline-block text-sm text-accent transition-colors duration-fast hover:text-primary"
        >
          More on how each one works →
        </Link>
      </Reveal>
    </section>
  );
}
