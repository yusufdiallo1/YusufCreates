import type { Metadata } from "next";
import { StartForm } from "./StartForm";
import { CredibilityStrip } from "@/components/marketing/CredibilityStrip";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Start a project",
  description: "Tell me about your project. Three short steps.",
  alternates: { canonical: `${SITE.url}/start` },
};

export default function StartPage() {
  return (
    <>
      {/* Someone who landed straight on the form has seen no work and no
          promise about how fast I reply — so it goes above the first question
          rather than after it. Hidden with CSS for every other arrival; see
          CredibilityStrip for why it is not conditionally mounted. */}
      <div className="pt-32">
        <CredibilityStrip />
      </div>

      <div className="mx-auto max-w-2xl px-6 pb-24">
        <StartForm />
      </div>
    </>
  );
}
