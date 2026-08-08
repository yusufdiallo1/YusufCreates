import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { TextReveal } from "@/components/motion/TextReveal";
import { Parallax } from "@/components/motion/Parallax";
import { SpotlightGroup } from "@/components/motion/Spotlight";
import { ContactCTA } from "@/components/marketing/ContactCTA";
import { ServiceGlyph } from "@/components/marketing/ServiceGlyph";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Websites, web apps and bilingual English/Arabic builds — what I do, how it works, and what it costs.",
  alternates: { canonical: `${SITE.url}/services` },
};

const SERVICES = [
  {
    name: "Marketing sites",
    glyph: "site" as const,
    body: "The site your business is judged by. Fast, accessible, easy for you to edit, and built so adding a page later does not mean paying someone to rebuild it.",
    points: [
      "Landing pages and multi-page sites",
      "CMS you can use without training",
      "SEO groundwork and analytics",
      "Deployed with documentation",
    ],
  },
  {
    name: "Web apps and SaaS",
    glyph: "app" as const,
    body: "Software people log into. Authentication, a real database, payments, dashboards — the parts that turn a site into a product.",
    points: [
      "Auth and role-based access",
      "Stripe subscriptions and one-off payments",
      "Dashboards and reporting",
      "Third-party API integration",
    ],
  },
  {
    name: "Bilingual English and Arabic",
    glyph: "bilingual" as const,
    body: "Right-to-left done properly: mirrored layout, logical properties, Arabic typography that is set rather than defaulted, and locale-correct numerals and dates.",
    points: [
      "Full RTL mirroring, not a flipped stylesheet",
      "Arabic type set deliberately",
      "Locale-aware dates, numbers and currency",
      "Content structure that works in both",
    ],
  },
  {
    name: "Rescue and rebuild",
    glyph: "rescue" as const,
    body: "You have something that half works and nobody will touch. I take it over, make it maintainable, and hand it back in your name.",
    points: [
      "Audit of what exists",
      "Incremental migration, not a rewrite where one is not needed",
      "Performance and accessibility fixes",
      "Full handover, you own everything",
    ],
  },
];

export default function ServicesPage() {
  return (
    <>
      {/* How far through you are. The list is long enough that this is a
          real question by the third service. */}

      <div className="mx-auto max-w-4xl px-6 pt-32 pb-16">
        <TextReveal as="h1" by="word" className="block text-4xl">
          Services
        </TextReveal>
        <Reveal delay={0.1}>
          <p className="mt-4 text-lg text-secondary">
            Four things, done properly, rather than a list of everything.
          </p>
        </Reveal>
      </div>

      <div className="mx-auto max-w-4xl px-6 pb-24">
        <ul className="space-y-16">
          {SERVICES.map((service, index) => (
            <li key={service.name}>
              {/* A slight drift per row as it passes. Small on purpose —
                  anything larger reads as the page fighting the scroll
                  rather than responding to it. */}
              <Parallax distance={index % 2 === 0 ? 16 : 28}>
                <Reveal delay={index * 0.06}>
                  {/* The mark sits beside the heading on desktop and above
                      it on a phone, where a 96px column would leave the text
                      too narrow to read. */}
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-7">
                    <ServiceGlyph
                      kind={service.glyph}
                      className="size-14 shrink-0 text-accent sm:size-16"
                    />
                    <div className="min-w-0">
                      <h2 className="text-2xl">{service.name}</h2>
                      <p className="mt-3 text-secondary">{service.body}</p>
                    </div>
                  </div>

                  {/* The points were a bulleted list under a paragraph, which
                      reads as more of the same prose. As cards they are
                      scannable — you can take the four in without reading
                      any of them as a sentence.

                      They arrived all at once and sat completely inert. Now
                      each one reveals on its own beat and lifts under the
                      pointer, so the four read as four things rather than as
                      one block of four. */}
                  <SpotlightGroup className="mt-6 grid gap-3 sm:grid-cols-2">
                    {service.points.map((point, pointIndex) => (
                      <Reveal
                        key={point}
                        delay={index * 0.06 + 0.08 + pointIndex * 0.05}
                      >
                        <div
                          data-spotlight=""
                          className="hairline h-full rounded-xl bg-surface-1 px-4 py-3.5 text-sm text-secondary transition-[transform,border-color,color] duration-hover ease-hover hover:-translate-y-0.5 hover:border-[color:var(--border-glass)] hover:text-primary"
                        >
                          {point}
                        </div>
                      </Reveal>
                    ))}
                  </SpotlightGroup>
                </Reveal>
              </Parallax>
            </li>
          ))}
        </ul>

        <Reveal>
          <div className="hairline-t mt-8 pt-10">
            <p className="text-secondary">
              Prices for each of these are on the{" "}
              <Link
                href="/pricing"
                className="text-accent transition-colors duration-hover ease-hover hover:text-primary"
              >
                pricing page
              </Link>
              .
            </p>
          </div>
        </Reveal>
      </div>

      <ContactCTA />
    </>
  );
}
