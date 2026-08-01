import type { Metadata } from "next";
import { ExpressPortal } from "@/components/marketing/ExpressPortal";

/**
 * The build's own page, reached by token from the confirmation email.
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
  return <ExpressPortal token={token} />;
}
