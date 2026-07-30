import type { Metadata } from "next";
import { KbAdmin } from "@/components/admin/KbAdmin";

export const metadata: Metadata = { title: "Knowledge base" };

export default function AdminKbPage() {
  return <KbAdmin />;
}
