import type { Metadata } from "next";
import { ContractsAdmin } from "@/components/admin/ContractsAdmin";

export const metadata: Metadata = { title: "Contracts" };

export default function AdminContractsPage() {
  return <ContractsAdmin />;
}
