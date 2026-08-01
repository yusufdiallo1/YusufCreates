import type { Metadata } from "next";
import { BuildPortal } from "@/components/marketing/BuildPortal";

/**
 * The client portal, reached by token from the approval email.
 *
 * One route for every plan. Express counts down two hours; other plans count
 * down to the delivery date agreed at approval — the portal reads the plan
 * off the build rather than being told which one it is.
 *
 * noindex: the token is the only credential here, so this must never appear
 * in a search result the way a public page would.
 */
export const metadata: Metadata = {
  title: "Your project",
  robots: { index: false, follow: false },
};

export default async function PortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <BuildPortal token={token} />;
}
