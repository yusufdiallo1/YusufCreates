import type { Metadata } from "next";
import type { Id } from "@convex/_generated/dataModel";
import { AuditForm } from "@/components/marketing/AuditForm";

export const metadata: Metadata = {
  title: "Free site audit",
  description:
    "A free, honest audit of your site's speed, accessibility and SEO — with three specific things to fix.",
};

/**
 * `?id=` opens an existing report.
 *
 * The results email's main button links here with the audit's id. The page
 * used to ignore the query string entirely, so that button landed on a blank
 * form — and running the audit again to get back to the report spends one of
 * the three allowed per address per day.
 *
 * A Promise, per this version's page conventions.
 */
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  /*
   * Only pass something that could BE an id.
   *
   * Convex rejects a malformed id inside the query's own validator, which
   * throws past the component and hits the error boundary — so /audit?id=x
   * showed "Something broke" rather than the form. Ids are a fixed-length
   * lowercase-alphanumeric string, so anything else cannot match a document
   * and is treated as if no id were given at all.
   *
   * A well-formed id that does not exist still returns null and renders the
   * not-found state, which is correct: a deleted report and a mistyped one
   * are the same answer.
   */
  const candidate =
    typeof id === "string" && /^[a-z0-9]{20,64}$/.test(id) ? id : null;

  return (
    <main className="mx-auto max-w-2xl px-6 py-24">
      <h1 className="text-4xl">How good is your site, really?</h1>
      <p className="mt-4 text-secondary">
        A real audit — speed, accessibility, SEO and best practices — with three
        specific things to fix, written in plain English rather than developer
        jargon. Free, and no obligation to do anything about it.
      </p>
      {/* Cast because an id off the URL is a string until Convex resolves
          it. Shape-checked above, so this is a plausible id or null. */}
      <AuditForm initialAuditId={candidate as Id<"audits"> | null} />
    </main>
  );
}
