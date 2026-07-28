import type { Metadata } from "next";
import { AuditForm } from "@/components/marketing/AuditForm";

export const metadata: Metadata = {
  title: "Free site audit",
  description:
    "A free, honest audit of your site's speed, accessibility and SEO — with three specific things to fix.",
};

export default function AuditPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-24">
      <h1 className="text-4xl">How good is your site, really?</h1>
      <p className="mt-4 text-secondary">
        A real audit — speed, accessibility, SEO and best practices — with three
        specific things to fix, written in plain English rather than developer
        jargon. Free, and no obligation to do anything about it.
      </p>
      <AuditForm />
    </main>
  );
}
