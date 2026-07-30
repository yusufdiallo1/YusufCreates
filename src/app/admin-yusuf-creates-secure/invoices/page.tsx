import type { Metadata } from "next";
import { InvoicesBoard } from "@/components/admin/InvoicesBoard";

export const metadata: Metadata = { title: "Proposals and invoices" };

export default function AdminInvoicesPage() {
  return <InvoicesBoard />;
}
