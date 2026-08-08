import { fetchQuery, preloadQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { Hero } from "@/components/marketing/Hero";
import { Projects } from "@/components/marketing/Projects";
import { Skills } from "@/components/marketing/Skills";
import { About } from "@/components/marketing/About";
import { Process } from "@/components/marketing/Process";
import { HowIWork } from "@/components/marketing/HowIWork";
import { Testimonials } from "@/components/marketing/Testimonials";
import { TypedQuote } from "@/components/marketing/TypedQuote";
import { ContactCTA } from "@/components/marketing/ContactCTA";
import { TechMarquee } from "@/components/marketing/TechMarquee";
import { WhatIDo } from "@/components/marketing/WhatIDo";
import { Faq } from "@/components/marketing/Faq";
import { SectionSeam } from "@/components/motion/SectionSeam";
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
  const [preloadedProjects, preloadedTestimonials, featured] = isConvexConfigured
    ? await Promise.all([
        preloadQuery(api.projects.listFeatured, {}, { token }).catch(() => null),
        preloadQuery(api.testimonials.listFeatured, {}, { token }).catch(
          () => null,
        ),
        fetchQuery(api.projects.listFeatured, {}, { token }).catch(() => []),
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

      {/* The hero's slabs hold real project screenshots. Fetched separately
          from the preload the Projects section uses, because the hero needs
          plain values on the server rather than a client-hydrated query. */}
      <Hero projects={heroProjects} />

      {/* Tech marquee. Dot separators keep the rhythm even and stop two names
          reading as one phrase. */}
      <TechMarquee names={ALL_SKILL_NAMES} />

      <About />

      {/* Seams between sections. A 1px join that brightens as it arrives and
          settles back — enough to say two things meet here, not enough to read
          as a divider. Native scroll timeline, no JS; see SectionSeam.

          Not after the marquee or before the CTA: both already have their own
          hairline, and two lines a few pixels apart read as a mistake. */}
      <SectionSeam />

      <WhatIDo />

      <SectionSeam />

      {/* Renders nothing when no projects are published. */}
      {preloadedProjects ? <Projects preloaded={preloadedProjects} /> : null}

      <SectionSeam />

      <Process />

      <SectionSeam />

      {/* Trust. Answers the two questions nobody asks out loud: will this
          person disappear, and can I reach them. */}
      <HowIWork />

      {/* A breath between the how and the what. Typed rather than faded in,
          so it reads as something being said rather than another panel. */}
      <TypedQuote attribution="How I build">
        {"Anyone can make it look finished. The work is making it still work in a year, in someone else’s hands."}
      </TypedQuote>

      <SectionSeam />

      <Skills />

      {/* Renders nothing when the table is empty. */}
      {preloadedTestimonials ? (
        <Testimonials preloaded={preloadedTestimonials} />
      ) : null}

      <SectionSeam />

      <Faq />

      <ContactCTA />
    </>
  );
}
