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
import { ContactCTA } from "@/components/marketing/ContactCTA";
import { TechMarquee } from "@/components/marketing/TechMarquee";
import { WhatIDo } from "@/components/marketing/WhatIDo";
import { Faq } from "@/components/marketing/Faq";
import { ALL_SKILL_NAMES } from "@/lib/skills";
import { professionalServiceJsonLd } from "@/lib/jsonld";
import { JsonLd } from "@/components/seo/JsonLd";

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

      <WhatIDo />

      {/* Renders nothing when no projects are published. */}
      {preloadedProjects ? <Projects preloaded={preloadedProjects} /> : null}

      <Process />

      {/* Trust. Answers the two questions nobody asks out loud: will this
          person disappear, and can I reach them. */}
      <HowIWork />

      <Skills />

      {/* Renders nothing when the table is empty. */}
      {preloadedTestimonials ? (
        <Testimonials preloaded={preloadedTestimonials} />
      ) : null}

      <Faq />

      <ContactCTA />
    </>
  );
}
