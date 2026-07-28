import type { Metadata } from "next";
import { ComingSoon } from "@/components/admin/ComingSoon";

export const metadata: Metadata = { title: "Ubroadcasts" };

export default function AdminUbroadcastsPage() {
  return <ComingSoon section="Ubroadcasts" />;
}
