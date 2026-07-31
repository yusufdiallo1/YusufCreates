import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { TextReveal } from "@/components/motion/TextReveal";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import { Parallax } from "@/components/motion/Parallax";
import { ContactCTA } from "@/components/marketing/ContactCTA";
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
      <ScrollProgress />

      <div className="mx-auto max-w-3xl px-6 pt-32 pb-16">
        <TextReveal as="h1" by="word" className="block text-4xl">
          Services
        </TextReveal>
        <Reveal delay={0.1}>
          <p className="mt-4 text-lg text-secondary">
            Four things, done properly, rather than a list of everything.
          </p>
        </Reveal>
      </div>

      <div className="mx-auto max-w-3xl px-6 pb-24">
        <ul className="divide-y divide-[color:var(--border-hairline)]">
          {SERVICES.map((service, index) => (
            <li key={service.name}>
              {/* A slight drift per row as it passes. Small on purpose —
                  these are text blocks, and anything larger reads as the
                  page fighting the scroll rather than responding to it. */}
              <Parallax distance={index % 2 === 0 ? 16 : 28}>
                <Reveal delay={index * 0.06}>
                <div className="py-10">
                  <h2 className="text-2xl">{service.name}</h2>
                  <p className="mt-3 text-secondary">{service.body}</p>
                  <ul className="mt-5 space-y-1.5">
                    {service.points.map((point) => (
                      <li
                        key={point}
                        className="flex gap-3 text-sm text-secondary"
                      >
                        <span aria-hidden="true" className="text-accent">
                          —
                        </span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
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
                className="text-accent transition-colors duration-fast hover:text-primary"
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
