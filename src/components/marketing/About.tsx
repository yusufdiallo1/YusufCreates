import Link from "next/link";
import { fetchQuery } from "convex/nextjs";
import { Reveal } from "@/components/motion/Reveal";
import { CountUp } from "@/components/motion/CountUp";
import { WordReveal } from "@/components/motion/WordReveal";
import { api, isConvexConfigured } from "@/lib/convex-api";

/**
 * About — the short homepage version. The full story lives at /about.
 *
 * Text only. There was a photo in a square frame beside this, on a fixed
 * 280px grid track; both are gone, so the copy runs to the section's own
 * measure rather than being squeezed into the remaining column.
 *
 * IT IS NOT A SECTION OF ITS OWN ANY MORE.
 *
 * This used to sit second on the homepage under its own <h2>About</h2>, which
 * put a biography above the work — the page introduced itself before it had
 * shown any reason to care. It now sits inside the reassurance beat, between
 * Process and HowIWork: the same three questions in one movement, in the order
 * someone actually asks them. How does this work, who is doing it, what
 * happens after.
 *
 * So it has no heading and no vertical padding of its own. The beat around it
 * owns both, and a second <h2> in the middle of it would break the run into
 * two again — which is the thing being fixed.
 *
 * It stays an ASYNC SERVER COMPONENT. It awaits the published count below, so
 * it cannot be wrapped in a client beat container; it is composed as a sibling
 * on the page instead.
 */

/**
 * The figure that does not come from the database.
 *
 * Projects shipped is counted live — see below. This one is a fact about me
 * rather than a row, so it is stated here.
 */
export const ABOUT_STATS = [{ label: "Years building", value: 2 }];

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
    /*
     * pt-0 pb-16, not py-24. The beat's own spacing does the separating; this
     * is a paragraph inside it, not a new section arriving.
     *
     * aria-label rather than aria-labelledby, since there is no longer a
     * heading to point at. The section still needs a name — an unnamed region
     * is announced as "section" and nothing else.
     */
    <section
      id="about"
      aria-label="About Yusuf"
      className="mx-auto max-w-5xl px-6 pt-0 pb-16"
    >
      {/* Capped at prose width. Without this the paragraphs would run the
          full 5xl and become hard to track line to line. */}
      <div className="max-w-2xl">
        {/* Both paragraphs now brighten word by word as they scroll into view.

            The first one used to be a Typewriter. Typing holds the reader
            waiting on a machine before they can read a sentence they could
            have read instantly, and it re-runs on every visit. A scroll-linked
            brighten gives the same "this line matters" emphasis while the text
            is legible the whole time. */}
        <WordReveal className="mt-6 text-secondary">
          {"I’m Yusuf. I build websites and web apps on my own — design, build, deploy, and the part after launch that most people leave out."}
        </WordReveal>

        <WordReveal className="mt-4 text-secondary">
          {`Most of my work is for small businesses and founders who have been quoted too much by an agency, or who had something built cheaply and now cannot change a price without breaking the page. I take those on as often as new builds — usually the fastest way to understand what someone actually needs is to fix what they have.`}
        </WordReveal>

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
          {/* Two figures, so two columns — a three-column grid left a third
              of the row empty once countries came out. */}
          <div className="mt-10 grid grid-cols-2 gap-6 sm:max-w-sm">
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
            className="mt-8 inline-flex min-h-6 items-center text-sm text-accent transition-colors duration-hover ease-hover hover:text-primary"
          >
            More about how I work →
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
