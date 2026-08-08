import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { TextReveal } from "@/components/motion/TextReveal";
import { WordReveal } from "@/components/motion/WordReveal";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import { Parallax } from "@/components/motion/Parallax";
import { SpotlightGroup } from "@/components/motion/Spotlight";
import { ContactCTA } from "@/components/marketing/ContactCTA";
import { ENTERPRISE_FEATURES } from "@/lib/pricing";
import { SITE } from "@/lib/constants";
import { DrawnGlyph, type GlyphName } from "@/components/ui/DrawnGlyph";

/**
 * Enterprise.
 *
 * Everything an enterprise buyer needs that a founder buying a marketing site
 * does not: procurement, security review, NDAs, SLAs, and who signs what.
 *
 * WHY THIS IS ITS OWN PAGE. That material was competing for room inside a
 * pricing card, where it had space for eleven bullet points and no room to
 * answer the questions that actually decide an enterprise purchase — none of
 * which are about price. A procurement officer and a founder are not reading
 * the same page, and trying to serve both is how you serve neither.
 *
 * The Enterprise tier STAYS on /pricing. Removing it would break the one job
 * that page has, which is letting someone compare tiers side by side; its CTA
 * now points here instead of straight into the lead form, so the detail is one
 * click away rather than absent.
 */

export const metadata: Metadata = {
  title: "Enterprise",
  description:
    "Procurement, security review, NDAs and SLAs — how enterprise engagements work, and what you get that the packaged tiers do not.",
  alternates: { canonical: `${SITE.url}/enterprise` },
};

/** The questions that actually decide an enterprise purchase. */
const PROCUREMENT: { glyph: GlyphName; title: string; body: string }[] = [
  {
    glyph: "nda",
    title: "Security review",
    body: "Send your questionnaire and I'll complete it. I can walk your security team through the architecture, the data flow and where everything is hosted. No third-party subprocessors get added without telling you.",
  },
  {
    glyph: "handover-box",
    title: "NDAs and contracts",
    body: "Send yours and I'll sign it, or I'll provide a standard mutual one. I work on your paper if that is what procurement needs — MSA, SOW, DPA. This is routine, not an exception.",
  },
  {
    glyph: "invoice",
    title: "Invoicing and payment terms",
    body: "Purchase orders, net-30, staged invoicing against milestones, and a real VAT invoice. If your finance team needs a supplier onboarding form completed, send it.",
  },
  {
    glyph: "insurance",
    title: "Insurance and compliance",
    body: "Professional indemnity details on request. Accessibility is delivered to WCAG 2.2 AA and tested, not asserted — you get the audit, not a claim.",
  },
];

/** How an engagement is actually run once it starts. */
const ENGAGEMENT: { n: string; glyph: GlyphName; title: string; body: string }[] = [
  {
    n: "01",
    glyph: "call",
    title: "Scoping call",
    body: "Everyone who has a say in the outcome, in one call. Cheaper to disagree here than in review.",
  },
  {
    n: "02",
    glyph: "scope",
    title: "Written proposal",
    body: "Scope, milestones, price and dates in a document your procurement team can process. Nothing starts until it is signed.",
  },
  {
    n: "03",
    glyph: "stage",
    title: "Staged delivery",
    body: "Each milestone lands on a staging environment you can review before it goes near production.",
  },
  {
    n: "04",
    glyph: "handover",
    title: "Handover",
    body: "Design system, component library, documentation and accounts — in your name, on your infrastructure.",
  },
];

export default function EnterprisePage() {
  return (
    <>
      <ScrollProgress />

      <section className="mx-auto max-w-5xl px-6 pt-32 pb-16">
        <TextReveal as="h1" by="word" className="block max-w-3xl text-5xl">
          Enterprise
        </TextReveal>
        <WordReveal className="mt-6 max-w-xl text-secondary">
          For teams with procurement, a security review and more than one
          person who has to approve the result. Scoped on a call, priced in a
          proposal, delivered in stages.
        </WordReveal>

        <Reveal delay={0.16}>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/start?tier=enterprise"
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas transition-opacity duration-hover ease-hover hover:opacity-90"
            >
              Request a proposal
            </Link>
            <Link
              href="/pricing"
              className="text-sm text-secondary transition-colors duration-hover ease-hover hover:text-primary"
            >
              Compare with the packaged tiers →
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Procurement first. It is the part every other page ignores, and the
          part that decides whether this is even possible for a buyer. */}
      <section
        aria-labelledby="procurement-heading"
        className="mx-auto max-w-5xl px-6 py-16"
      >
        <Reveal>
          <h2 id="procurement-heading" className="text-3xl">
            The procurement questions, answered
          </h2>
          <p className="mt-3 max-w-xl text-secondary">
            You do not have to ask whether any of this is possible. It is.
          </p>
        </Reveal>

        <SpotlightGroup className="mt-12 grid gap-4 sm:grid-cols-2">
          {PROCUREMENT.map((item, index) => (
            <Reveal key={item.title} delay={Math.min(index * 0.06, 0.24)}>
              <div
                data-spotlight=""
                className="hairline h-full rounded-[var(--radius-md)] bg-surface-1/50 p-6 transition-[transform,border-color] duration-hover ease-hover hover:-translate-y-0.5 hover:border-[color:var(--border-glass)]"
              >
                <DrawnGlyph
                  name={item.glyph}
                  delay={Math.min(index * 0.06, 0.24)}
                  className="size-7 text-accent"
                />
                <h3 className="mt-4 text-lg">{item.title}</h3>
                <p className="mt-2 text-sm text-secondary">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </SpotlightGroup>
      </section>

      <section
        aria-labelledby="engagement-heading"
        className="mx-auto max-w-5xl px-6 py-16"
      >
        <Reveal>
          <h2 id="engagement-heading" className="text-3xl">
            How an engagement runs
          </h2>
        </Reveal>

        <ol className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {ENGAGEMENT.map((step, index) => (
            <li key={step.n}>
              <Reveal delay={index * 0.07}>
                <div className="group hairline-t pt-5 transition-colors duration-hover ease-hover hover:border-[color:var(--border-glass)]">
                  <div className="flex items-center gap-3">
                    <p className="font-mono text-xs text-secondary tabular-nums transition-colors duration-hover ease-hover group-hover:text-accent">
                      {step.n}
                    </p>
                    <DrawnGlyph
                      name={step.glyph}
                      delay={index * 0.08}
                      className="size-5 text-accent"
                    />
                  </div>
                  <h3 className="mt-3 text-lg">{step.title}</h3>
                  <p className="mt-2 text-sm text-secondary">{step.body}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      {/* The same list the pricing card shows, with room to breathe. Sourced
          from lib/pricing.ts so the two can never drift apart. */}
      <section
        aria-labelledby="included-heading"
        className="mx-auto max-w-5xl px-6 py-16"
      >
        <Reveal>
          <h2 id="included-heading" className="text-3xl">
            What is included
          </h2>
        </Reveal>

        <Parallax distance={20}>
          <ul className="mt-10 grid gap-x-12 gap-y-3 sm:grid-cols-2">
            {ENTERPRISE_FEATURES.map((feature, index) => (
              <Reveal key={feature} delay={Math.min(index * 0.03, 0.3)}>
                <li className="hairline-t flex gap-3 pt-3 text-sm text-secondary">
                  <span aria-hidden="true" className="text-accent">
                    —
                  </span>
                  {feature}
                </li>
              </Reveal>
            ))}
          </ul>
        </Parallax>
      </section>

      <ContactCTA />
    </>
  );
}
