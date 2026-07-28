import type { Metadata } from "next";
import { BookingEmbed } from "@/components/marketing/BookingEmbed";

export const metadata: Metadata = {
  title: "Book a call",
  description:
    "A free 20-minute intro call. No preparation needed and no obligation.",
};

export default function CallPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-24">
      <h1 className="text-4xl">Book a call</h1>
      <p className="mt-4 text-secondary">
        Twenty minutes, free, no preparation needed. Tell me what you&apos;re
        trying to build and I&apos;ll tell you honestly whether I&apos;m the
        right person for it.
      </p>
      <div className="mt-10">
        <BookingEmbed />
      </div>
    </main>
  );
}
