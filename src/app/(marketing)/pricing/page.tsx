import type { Metadata } from "next";
import { PricingTables } from "@/components/marketing/PricingTables";
import { PricingComparison } from "@/components/marketing/PricingComparison";
import { PricingFaq } from "@/components/marketing/PricingFaq";
import { ContactCTA } from "@/components/marketing/ContactCTA";
import { TextReveal } from "@/components/motion/TextReveal";
import { Reveal } from "@/components/motion/Reveal";
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

      <PricingTables />
      {/* After the cards, before the questions. Someone who has read the cards
          and is now weighing two of them wants rows; someone still deciding
          whether to ask at all is heading for the FAQ. */}
      <PricingComparison />
      <PricingFaq />
      <ContactCTA />
    </>
  );
}
