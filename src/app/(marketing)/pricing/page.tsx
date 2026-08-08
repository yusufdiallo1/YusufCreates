import type { Metadata } from "next";
import { PricingTables } from "@/components/marketing/PricingTables";
import { PricingComparison } from "@/components/marketing/PricingComparison";
import { PricingFaq } from "@/components/marketing/PricingFaq";
import { ContactCTA } from "@/components/marketing/ContactCTA";
import { CredibilityStrip } from "@/components/marketing/CredibilityStrip";
import { TextReveal } from "@/components/motion/TextReveal";
import { Reveal } from "@/components/motion/Reveal";
import { Quiet } from "@/components/motion/Quiet";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Transparent pricing in USD, SAR and AED. Launch $600, Growth from $1,200, web apps from $4,000, Enterprise from $8,000.",
  alternates: { canonical: `${SITE.url}/pricing` },
};

export default function PricingPage() {
  return (
    <>
      <div className="mx-auto max-w-3xl px-6 pt-32 pb-16 text-center">
        <TextReveal as="h1" by="word" className="block text-4xl">
          Pricing
        </TextReveal>
        <Reveal delay={0.1}>
          <p className="mt-4 text-lg text-secondary">
            Fixed prices, agreed before I start. No hourly billing, no surprise
            invoices.
          </p>
        </Reveal>
      </div>

      {/* Proof, for someone who arrived straight here and has therefore seen
          none. Renders for everyone and is hidden with CSS unless the entry
          state is high-intent — inserting a band above the tables after
          hydration would push the prices down under the reader. */}
      <CredibilityStrip />

      {/* Still, while the cards hold the viewport. Same treatment as the
          homepage pricing band and for the same reason: this is where the
          arithmetic happens, and the closing marquee at the bottom of this
          page is exactly the sort of thing that has to be ignored while it
          does. See components/motion/Quiet.tsx. */}
      <Quiet>
        <PricingTables />
      </Quiet>
      {/* After the cards, before the questions. Someone who has read the cards
          and is now weighing two of them wants rows; someone still deciding
          whether to ask at all is heading for the FAQ. */}
      <PricingComparison />
      <PricingFaq />
      <ContactCTA />
    </>
  );
}
