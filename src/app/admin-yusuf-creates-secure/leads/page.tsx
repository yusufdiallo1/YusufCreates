import { Suspense } from "react";
import type { Metadata } from "next";
import { LeadsTable } from "@/components/admin/LeadsTable";

export const metadata: Metadata = { title: "Leads" };

export default function AdminLeadsPage() {
  return (
    // useSearchParams needs a Suspense boundary; the selected lead lives in
    // the URL so it survives a refresh and can be linked to.
    <Suspense
      fallback={<div className="py-24 text-sm text-secondary">Loading…</div>}
    >
      <LeadsTable />
    </Suspense>
  );
}
