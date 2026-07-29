import type { Metadata } from "next";
import { SlotPicker } from "@/components/marketing/SlotPicker";

export const metadata: Metadata = {
  title: "Waitlist",
  description:
    "I take two projects and two care plans at a time. Pick a start month and hold a slot.",
};

export default function WaitlistPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-24">
      <h1 className="text-4xl">Hold a slot</h1>
      <p className="mt-4 text-secondary">
        I take two projects and two care plans at a time. Not a scarcity
        tactic — it is how many I can do properly at once, and the third one is
        where quality starts slipping.
      </p>
      <p className="mt-3 text-secondary">
        Pick the month you want to start. Availability below is live.
      </p>

      <div className="mt-12">
        <SlotPicker />
      </div>
    </main>
  );
}
