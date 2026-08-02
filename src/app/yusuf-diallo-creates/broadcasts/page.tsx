import type { Metadata } from "next";
import { BroadcastComposer } from "@/components/admin/BroadcastComposer";

export const metadata: Metadata = { title: "Broadcast" };

export default function AdminBroadcastsPage() {
  return <BroadcastComposer />;
}
