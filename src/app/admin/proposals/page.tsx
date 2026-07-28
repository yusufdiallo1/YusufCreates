import type { Metadata } from "next";
import { ProposalsAdmin } from "@/components/admin/ProposalsAdmin";

export const metadata: Metadata = { title: "Proposals" };

export default function AdminProposalsPage() {
  return <ProposalsAdmin />;
}
