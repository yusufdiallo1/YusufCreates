import type { Metadata } from "next";
import { PromosAdmin } from "@/components/admin/PromosAdmin";

export const metadata: Metadata = { title: "Promotions" };

export default function AdminPromosPage() {
  return <PromosAdmin />;
}
