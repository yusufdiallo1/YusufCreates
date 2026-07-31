import Link from "next/link";
import { fetchQuery } from "convex/nextjs";
import { Reveal } from "@/components/motion/Reveal";
import { CountUp } from "@/components/motion/CountUp";
import { Typewriter } from "@/components/motion/Typewriter";
import { api, isConvexConfigured } from "@/lib/convex-api";

/**
 * About — the short homepage version. The full story lives at /about.
 *
 * Text only. There was a photo in a square frame beside this, on a fixed
 * 280px grid track; both are gone, so the copy runs to the section's own
 * measure rather than being squeezed into the remaining column.
 */

/**
 * The two figures that do not come from the database.
 *
 * Projects shipped is counted live — see below. These two are facts about me
 * rather than rows, so they are stated here.
 */
export const ABOUT_STATS = [
  { label: "Years building", value: 6 },
  { label: "Countries served", value: 8 },
];

export async function About() {
  /*
   * Counted, not stated.
   *
   * This said 12 regardless of what was actually published, which stopped
   * being true the first time a project was added or taken down. A portfolio
   * that miscounts its own work is the least convincing thing on the page.
   */
  const shipped = isConvexConfigured
    ? await fetchQuery(api.projects.publishedCount, {}).catch(() => null)
    : null;

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
        {/* Typed rather than faded: the opening line is the one sentence that
            has to land, and watching it written reads as someone talking. */}
        <Typewriter
          as="p"
          speed={22}
          className="mt-6 text-secondary"
        >
          {"I’m Yusuf. I build websites and web apps on my own — design, build, deploy, and the part after launch that most people leave out."}
        </Typewriter>

        <Reveal delay={0.14}>
          <p className="mt-4 text-secondary">
            Most of my work is for small businesses and founders who have been
            quoted too much by an agency, or who had something built cheaply
            and now cannot change a price without breaking the page. I take
            those on as often as new builds — usually the fastest way to
            understand what someone actually needs is to fix what they have.
          </p>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="mt-4 text-secondary">
            I build in English, Arabic, French, Russian, Swedish and whatever
            else a project needs — with real right-to-left support where it
            applies, not a flipped stylesheet. Locale-correct dates, numbers
            and currency, type chosen for each script rather than inherited.
            If your site has to work the same in more than one language, that
            is the part most people get wrong.
          </p>
        </Reveal>

        <Reveal delay={0.26}>
          <p className="mt-4 text-secondary">
            Everything ships in your name — code, domain, accounts. You get an
            admin you can actually use, so changing a price or publishing a
            post never means emailing me. If you decide to work with someone
            else afterwards, nothing is holding you here.
          </p>
        </Reveal>

        <Reveal delay={0.32}>
          <div className="mt-10 grid grid-cols-3 gap-6">
            {/* Live count first. Hidden entirely if Convex is unreachable,
                rather than falling back to a number that might be wrong. */}
            {shipped !== null ? (
              <div>
                <p className="text-2xl">
                  <CountUp value={shipped} />
                </p>
                <p className="mt-1 text-xs text-secondary">Projects shipped</p>
              </div>
            ) : null}

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
