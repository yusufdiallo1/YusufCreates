import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { CountUp } from "@/components/motion/CountUp";
import Image from "next/image";

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
          <div className="hairline aspect-square w-full overflow-hidden rounded-lg bg-surface-1">
            <Image
              src="/about-desk.webp"
              alt="Yusuf at a two-screen desk, code on one side and this site on the other"
              width={952}
              height={505}
              /* object-cover on a square frame: the source is landscape, so
                 without this it letterboxes with dead bars top and bottom.
                 object-left keeps the subject rather than centring on the
                 empty right of the desk. */
              className="size-full object-cover object-left"
              sizes="(min-width: 1024px) 280px, 100vw"
            />
          </div>
        </Reveal>

        <div>
          <Reveal>
            <h2 id="about-heading" className="text-3xl">
              About
            </h2>
          </Reveal>

          <Reveal delay={0.08}>
            <p className="mt-6 text-secondary">
              I&apos;m Yusuf. I build websites and web apps on my own. Most
              of my work is for small businesses and founders who
              have been quoted too much by an agency, or who had something built
              cheaply and now cannot change it without breaking it.
            </p>
          </Reveal>

          <Reveal delay={0.14}>
            <p className="mt-4 text-secondary">
              I build in English, Arabic, French, Russian, Swedish and
              whatever else a project needs — with real right-to-left support
              where it applies, not a flipped stylesheet. If your site has to
              work the same in more than one language, that is the part most
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
