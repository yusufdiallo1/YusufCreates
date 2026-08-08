import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { fetchQuery } from "convex/nextjs";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { shareCookieName } from "@/lib/shareSession";
import { ShareGate } from "./ShareGate";
import { SharedDocument } from "./SharedDocument";

export const metadata: Metadata = {
  title: "Shared document",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * A shared contract, behind two emailed codes.
 *
 * The session is resolved on the SERVER, so an unauthenticated visitor never
 * receives the document in the page payload — the gate is not a client-side
 * conditional over data that was sent anyway.
 */
export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isConvexConfigured) notFound();

  const status = await fetchQuery(api.contractShares.shareStatus, {
    token,
  }).catch(() => null);

  // Revoked, expired or never existed all look identical from out here.
  if (!status) notFound();

  const secret = process.env.EMAIL_LOG_SECRET;
  const jar = await cookies();
  const sessionToken = jar.get(shareCookieName(token))?.value;

  if (sessionToken && secret) {
    const session = await fetchQuery(api.contractShares.resolveSession, {
      secret,
      sessionToken,
      token,
    }).catch(() => null);

    if (session) {
      return <SharedDocument token={token} session={session} />;
    }
  }

  return <ShareGate token={token} maskedEmail={status.maskedEmail} />;
}
