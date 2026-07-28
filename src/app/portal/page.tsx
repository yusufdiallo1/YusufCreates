import type { Metadata } from "next";
import { Portal } from "@/components/portal/Portal";

export const metadata: Metadata = {
  title: "Client portal",
  // Private by nature; nothing here belongs in a search index.
  robots: { index: false, follow: false, nocache: true },
};

export default function PortalPage() {
  return <Portal />;
}
