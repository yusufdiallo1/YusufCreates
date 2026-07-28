import type { Metadata } from "next";
import { ClientsAdmin } from "@/components/admin/ClientsAdmin";

export const metadata: Metadata = { title: "Clients" };

export default function AdminClientsPage() {
  return <ClientsAdmin />;
}
