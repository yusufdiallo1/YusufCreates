import { fetchQuery, preloadQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { Hero } from "@/components/marketing/Hero";
import { Projects } from "@/components/marketing/Projects";
import { About } from "@/components/marketing/About";
import { Process } from "@/components/marketing/Process";
import { HowIWork } from "@/components/marketing/HowIWork";
import { Testimonials } from "@/components/marketing/Testimonials";
import { TypedQuote } from "@/components/marketing/TypedQuote";
import { ContactCTA } from "@/components/marketing/ContactCTA";
import { TechMarquee } from "@/components/marketing/TechMarquee";
import { WhatIDo } from "@/components/marketing/WhatIDo";
import { Skills } from "@/components/marketing/Skills";
import { Faq } from "@/components/marketing/Faq";
import { PricingPreview } from "@/components/marketing/PricingPreview";
import { ClosingBeats } from "@/components/marketing/ClosingBeats";
import { SectionSeam } from "@/components/motion/SectionSeam";
import { Quiet } from "@/components/motion/Quiet";
import { ALL_SKILL_NAMES } from "@/lib/skills";
import { professionalServiceJsonLd } from "@/lib/jsonld";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE } from "@/lib/constants";

/*
 * The homepage was the ONE page without a canonical — every other marketing
 * route already declares one against SITE.url.
 *
 * That matters here because the site answers on both the apex and the www
 * subdomain, and Google indexed the www copy while SITE.url (and therefore
 * every icon href, OG URL and sitemap entry) points at the apex. A crawler
 * fetching www saw icon links on a different origin, which is the likeliest
 * reason the search listing renders a generic globe instead of the mark.
 *
 * This declares the apex as canonical. The other half of the fix is a
 * permanent www→apex redirect, which belongs in the Vercel domain settings
 * rather than here — adding it in next.config.ts as well would risk a loop
 * against whatever the platform is already doing.
 */
export const metadata = {
  alternates: { canonical: SITE.url },
};

export default async function HomePage() {
  const token = isConvexConfigured ? await convexAuthNextjsToken() : undefined;

  /*
   * Fetched together, not in sequence. These three do not depend on each
   * other, so awaiting them one at a time stacked three round-trips into the
   * time-to-first-byte of every homepage request.
   *
   * Each still degrades independently — the catch stays on the individual
   * promise, so a Convex failure blanks one section rather than 500ing the
   * front page.
   */
  /*
   * limit: 3 on the showcase, and it is load-bearing.
   *
   * Projects renders PinnedShowcase on desktop, whose container height is
   * literally `projects.length * 100dvh` — one full viewport of scroll per
   * project. listFeatured returns up to twelve, so featuring a handful of
   * work used to put several screens of pinned scrolling between the visitor
   * and everything below it.
   *
   * That was survivable when Projects sat fifth. It is not now that it is the
   * FIRST thing after the hero: the beat is meant to read dense and fast, and
   * twelve screens of anything is the opposite of fast. Three is what the
   * composition wants and what the hero already shows — everything else is a
   * click away behind "All work".
   */
  const [preloadedProjects, preloadedTestimonials, featured] = isConvexConfigured
    ? await Promise.all([
        preloadQuery(api.projects.listFeatured, { limit: 3 }, { token }).catch(
          () => null,
        ),
        preloadQuery(api.testimonials.listFeatured, {}, { token }).catch(
          () => null,
        ),
        fetchQuery(api.projects.listFeatured, { limit: 3 }, { token }).catch(
          () => [],
        ),
      ])
    : [null, null, []];

  // Plain values for the hero slabs. An empty list renders the hero as a
  // single centred column rather than empty glass frames.
  const heroProjects = featured.map((p) => ({
    slug: p.slug,
    title: p.title,
    coverUrl: p.coverUrl,
    category: p.category,
  }));

  return (
    <>
      <JsonLd data={professionalServiceJsonLd} />

      {/*
        THE ARC. Eight beats, and the order is the argument.

        This page used to run Hero → Marquee → About → WhatIDo → Projects,
        which introduced me before it had shown a single reason to care, and
        buried the proof fifth. It now answers the questions in the order they
        are actually asked:

          1 Hero          curiosity      is this for me
          2 Projects      dense, fast    is it any good
          3 WhatIDo       recognition    do you do my thing
          4 Process/About slow           how does it work, who are you
          5 Pricing       precise, calm  what does it cost
          6 Faq           terse          yes but what about
          7 Testimonials  loose          does anyone else agree
          8 ContactCTA    wide, quiet    all right, then

        The padding map is the pacing instrument and it lives on each section's
        own root className, not here — see the comment on each. Beats 2 and 6
        are the tightest (py-16); 7 and 8 the loosest (py-32).
      */}

      {/* The hero's slabs hold real project screenshots. Fetched separately
          from the preload the Projects section uses, because the hero needs
          plain values on the server rather than a client-hydrated query. */}
      <Hero projects={heroProjects} />

      {/* Tech marquee. Dot separators keep the rhythm even and stop two names
          reading as one phrase. */}
      <TechMarquee names={ALL_SKILL_NAMES} />

      {/* ---- 2 · PROOF. Renders nothing when no projects are published.

          Straight after the marquee with no seam between them: TechMarquee is
          `hairline-y`, so it already closes with a line of its own. */}
      {preloadedProjects ? <Projects preloaded={preloadedProjects} /> : null}

      {/* Seams between sections. A 1px join that brightens as it arrives and
          settles back — enough to say two things meet here, not enough to read
          as a divider. Native scroll timeline, no JS; see SectionSeam.

          THE RULE: never adjacent to a section that already has its own
          hairline. That rules out after TechMarquee and before ContactCTA, and
          it is also why the four sections of beat 4 have no seams between them
          — they are one movement, and lines through it would make it four. */}
      <SectionSeam />

      {/* ---- 3 · SERVICES. Two sections, ONE beat.

          WhatIDo says what the engagements are; Skills says what they are
          built with. No seam between them for the same reason beat 4 has none
          internally — they answer one question in two halves, and a line
          through it would make it two.

          Skills panels carry their own `hairline` border, so a seam directly
          after would sit against an existing line. The seam below stays
          because there is a full section of padding between them. */}
      <WhatIDo />

      <Skills />

      <SectionSeam />

      {/*
        ---- 4 · REASSURANCE. Four sections, ONE beat.

        Process, About, HowIWork and TypedQuote run together with no seams and
        no internal top padding: how the work goes, who is doing it, what
        happens after, and a line to close on. About lost its own <h2> to join
        this — it is the prose in the middle of the movement now, not a
        biography sitting on its own.

        About stays an async server component awaiting publishedCount, which is
        why this is composed as four siblings rather than wrapped in a beat
        container. A client wrapper would break the await.
      */}
      <Process />

      <About />

      {/* Trust. Answers the two questions nobody asks out loud: will this
          person disappear, and can I reach them. */}
      <HowIWork />

      {/* A breath between the how and the what. Typed rather than faded in,
          so it reads as something being said rather than another panel. */}
      <TypedQuote attribution="How I build">
        {"Anyone can make it look finished. The work is making it still work in a year, in someone else’s hands."}
      </TypedQuote>

      <SectionSeam />

      {/*
        ---- 5, 6, 7 · PRICING, OBJECTIONS, TESTIMONIALS.

        Grouped because their ORDER is not fixed. A returning visitor gets the
        FAQ above the price: they are past wondering whether the work is good
        and are stuck on something specific, and a price is only ever weighed
        against an unanswered doubt.

        Reordered with CSS `order` over a DOM order that never changes — see
        ClosingBeats for why that is the only safe way to do this.

        Pricing is wrapped in Quiet: while it holds the viewport centre the
        marquees stop and the ambient wash dims. This is the one beat where
        someone is doing arithmetic, and everything else gets out of the way.
      */}
      <ClosingBeats
        pricing={
          <Quiet>
            <PricingPreview />
          </Quiet>
        }
        objections={
          <>
            <SectionSeam />
            <Faq />
          </>
        }
        testimonials={
          <>
            <SectionSeam />
            {/* Renders nothing when the table is empty. */}
            {preloadedTestimonials ? (
              <Testimonials preloaded={preloadedTestimonials} />
            ) : null}
          </>
        }
      />

      {/* ---- 8 · CTA. No seam: the band carries its own accent hairline. */}
      <ContactCTA />
    </>
  );
}
