import type { Metadata } from "next";
import { SubscribersAdmin } from "@/components/admin/SubscribersAdmin";

export const metadata: Metadata = { title: "Subscribers" };

export default function AdminSubscribersPage() {
  return <SubscribersAdmin />;
}
