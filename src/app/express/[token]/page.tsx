import type { Metadata } from "next";
import { BuildPortal } from "@/components/marketing/BuildPortal";

/**
 * The build's own page, reached by token from the approval email.
 *
 * Kept at /express/[token] as well as /portal/[token] because links already
 * sent out point here, and a dead link is worse than a duplicate route. Both
 * render the same portal.
 *
 * noindex: the token is the only credential, so this must never appear in a
 * search result the way a public page would.
 */
export const metadata: Metadata = {
  title: "Your express build",
  robots: { index: false, follow: false },
};

export default async function ExpressPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <BuildPortal token={token} />;
}
