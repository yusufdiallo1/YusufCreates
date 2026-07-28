import { preloadQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { Hero } from "@/components/marketing/Hero";
import { Projects } from "@/components/marketing/Projects";
import { Skills } from "@/components/marketing/Skills";
import { About } from "@/components/marketing/About";
import { Process } from "@/components/marketing/Process";
import { Testimonials } from "@/components/marketing/Testimonials";
import { ContactCTA } from "@/components/marketing/ContactCTA";
import { TechMarquee } from "@/components/marketing/TechMarquee";
import { WhatIDo } from "@/components/marketing/WhatIDo";
import { Faq } from "@/components/marketing/Faq";
import { ALL_SKILL_NAMES } from "@/lib/skills";
import { professionalServiceJsonLd } from "@/lib/jsonld";

export default async function HomePage() {
  const token = isConvexConfigured ? await convexAuthNextjsToken() : undefined;

  // Each degrades independently: a Convex failure must not 500 the front page.
  const preloadedProjects = isConvexConfigured
    ? await preloadQuery(api.projects.listFeatured, {}, { token }).catch(
        () => null,
      )
    : null;

  const preloadedTestimonials = isConvexConfigured
    ? await preloadQuery(api.testimonials.listFeatured, {}, { token }).catch(
        () => null,
      )
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(professionalServiceJsonLd),
        }}
      />

      <Hero />

      {/* Tech marquee. Dot separators keep the rhythm even and stop two names
          reading as one phrase. */}
      <TechMarquee names={ALL_SKILL_NAMES} />

      <About />

      <WhatIDo />

      {/* Renders nothing when no projects are published. */}
      {preloadedProjects ? <Projects preloaded={preloadedProjects} /> : null}

      <Process />

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
