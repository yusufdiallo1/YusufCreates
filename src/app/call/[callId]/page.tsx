import type { Metadata } from "next";
import { CallPage } from "@/components/calls/CallPage";

/**
 * A call, on its own page.
 *
 * Outside the portal layout on purpose: a call is a full-attention surface,
 * and the portal's navigation, promo banner and chat launcher are all things
 * that should not be competing with someone's face.
 *
 * noindex for the obvious reason — these URLs are meeting rooms.
 */
export const metadata: Metadata = {
  title: "Call",
  robots: { index: false, follow: false, nocache: true },
};

export default async function Page({
  params,
}: {
  params: Promise<{ callId: string }>;
}) {
  // params is a promise in this version of Next; awaiting it is required.
  const { callId } = await params;
  return <CallPage callId={callId} />;
}
