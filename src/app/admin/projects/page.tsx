import type { Metadata } from "next";
import { ComingSoon } from "@/components/admin/ComingSoon";

export const metadata: Metadata = { title: "Uprojects" };

export default function AdminUprojectsPage() {
  return <ComingSoon section="Uprojects" />;
}
