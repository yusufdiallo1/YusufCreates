import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { Intake } from "@/components/portal/Intake";

/**
 * The onboarding form, reachable only with the token.
 *
 * noindex, nofollow and nocache: the token is the only credential on this
 * page, so the URL must never be crawled, cached by an intermediary, or turn
 * up in search results. The same treatment as /invoice/[token].
 *
 * Token rather than a sign-in because it is sent the moment a deposit clears
 * and gets opened on a phone. An account, a password and a reset flow between
 * the client and the first question is how a form gets filled in next week
 * instead of this afternoon.
 */
export const metadata: Metadata = {
  title: "Your project details",
  robots: { index: false, follow: false, nocache: true },
};

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isConvexConfigured) notFound();

  /*
   * Checked on the server so a bad token is a real 404 rather than a page
   * that renders a shell and then apologises. Nothing here confirms to a
   * guesser that a token nearly matched.
   *
   * The component re-queries on the client anyway — that is where the
   * reactivity lives, and it is what makes a second device see the same
   * answers appear.
   */
  const intake = await fetchQuery(api.intake.getByToken, { token }).catch(
    () => null,
  );
  if (!intake) notFound();

  return <Intake token={token} />;
}
