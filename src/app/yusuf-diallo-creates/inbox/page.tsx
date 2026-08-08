import type { Metadata } from "next";
import { InboxAdmin } from "@/components/admin/InboxAdmin";

export const metadata: Metadata = { title: "Inbox" };

export default function AdminInboxPage() {
  return <InboxAdmin />;
}
