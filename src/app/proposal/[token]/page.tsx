import type { Metadata } from "next";
import { ProposalView } from "./ProposalView";

export const metadata: Metadata = {
  title: "Proposal",
  // The token is the only credential on this page.
  robots: { index: false, follow: false, nocache: true },
};

export default async function ProposalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ProposalView token={token} />;
}
