import type { Metadata } from "next";
import { Portal } from "@/components/portal/Portal";
import { ChatLauncher } from "@/components/chat/ChatLauncher";

export const metadata: Metadata = {
  title: "Client portal",
  // Private by nature; nothing here belongs in a search index.
  robots: { index: false, follow: false, nocache: true },
};

export default function PortalPage() {
  return (
    <>
      <Portal />
      {/* The same public assistant. A client asking "what's included in the
          care plan" should not have to leave the portal to find out. */}
      <ChatLauncher />
    </>
  );
}
