import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { CountUp } from "@/components/motion/CountUp";

/**
 * About — the short homepage version. The full story lives at /about.
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
      <div className="grid gap-12 lg:grid-cols-[280px_1fr] lg:gap-16">
        <Reveal>
          {/* TODO: swap for a real portrait at public/portrait-square.jpg */}
          <div className="hairline aspect-square w-full overflow-hidden rounded-lg bg-surface-1" />
        </Reveal>

        <div>
          <Reveal>
            <h2 id="about-heading" className="text-3xl">
              About
            </h2>
          </Reveal>

          <Reveal delay={0.08}>
            <p className="mt-6 text-secondary">
              I&apos;m Yusuf. I build websites and web apps on my own, from
              Madinah. Most of my work is for small businesses and founders who
              have been quoted too much by an agency, or who had something built
              cheaply and now cannot change it without breaking it.
            </p>
          </Reveal>

          <Reveal delay={0.14}>
            <p className="mt-4 text-secondary">
              I work in English and Arabic, and I build right-to-left properly
              rather than flipping a stylesheet and hoping. If you need a site
              that works the same in both languages, that is the part most
              people get wrong.
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
      </div>
    </section>
  );
}
