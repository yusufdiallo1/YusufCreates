import type { Metadata } from "next";
import { ComingSoon } from "@/components/admin/ComingSoon";

export const metadata: Metadata = { title: "Ublog" };

export default function AdminUblogPage() {
  return <ComingSoon section="Ublog" />;
}
