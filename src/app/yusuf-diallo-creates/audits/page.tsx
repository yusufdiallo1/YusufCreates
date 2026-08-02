import type { Metadata } from "next";
import { AuditsAdmin } from "@/components/admin/AuditsAdmin";

export const metadata: Metadata = { title: "Site audits" };

export default function AdminAuditsPage() {
  return <AuditsAdmin />;
}
