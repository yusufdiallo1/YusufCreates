import type { Metadata } from "next";
import { PricingTables } from "@/components/marketing/PricingTables";
import { PricingFaq } from "@/components/marketing/PricingFaq";
import { ContactCTA } from "@/components/marketing/ContactCTA";
import { TextReveal } from "@/components/motion/TextReveal";
import { Reveal } from "@/components/motion/Reveal";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Transparent pricing in USD, SAR and AED. Launch from $900, Growth from $1,800, web apps from $6,000, Enterprise from $13,000.",
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
      <PricingFaq />
      <ContactCTA />
    </>
  );
}
