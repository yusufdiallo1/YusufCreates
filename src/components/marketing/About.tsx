import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { CountUp } from "@/components/motion/CountUp";

/**
 * About — the short homepage version. The full story lives at /about.
 *
 * Text only. There was a photo in a square frame beside this, on a fixed
 * 280px grid track; both are gone, so the copy runs to the section's own
 * measure rather than being squeezed into the remaining column.
 */

export const ABOUT_STATS = [
  { label: "Projects shipped", value: 12 },
  { label: "Years building", value: 6 },
  { label: "Countries served", value: 8 },
];

export function About() {
  return (
    <section
      aria-labelledby="about-heading"
      className="mx-auto max-w-5xl px-6 py-24"
    >
      <Reveal>
        <h2 id="about-heading" className="text-3xl">
          About
        </h2>
      </Reveal>

      {/* Capped at prose width. Without this the paragraphs would run the
          full 5xl and become hard to track line to line. */}
      <div className="max-w-2xl">
        <Reveal delay={0.08}>
          <p className="mt-6 text-secondary">
            I&apos;m Yusuf. I build websites and web apps on my own. Most of my
            work is for small businesses and founders who have been quoted too
            much by an agency, or who had something built cheaply and now
            cannot change it without breaking it.
          </p>
        </Reveal>

        <Reveal delay={0.14}>
          <p className="mt-4 text-secondary">
            I build in English, Arabic, French, Russian, Swedish and whatever
            else a project needs — with real right-to-left support where it
            applies, not a flipped stylesheet. If your site has to work the
            same in more than one language, that is the part most people get
            wrong.
          </p>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="mt-10 grid grid-cols-3 gap-6">
            {ABOUT_STATS.map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl">
                  <CountUp value={stat.value} />
                </p>
                <p className="mt-1 text-xs text-secondary">{stat.label}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.26}>
          <Link
            href="/about"
            className="mt-8 inline-block text-sm text-accent transition-colors duration-fast hover:text-primary"
          >
            More about how I work →
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
