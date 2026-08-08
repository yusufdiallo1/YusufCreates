"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { PageHeader } from "@/components/admin/PageHeader";
import {
  DataTable,
  type Column,
  type RowAction,
} from "@/components/admin/DataTable";
import {
  TableToolbar,
  downloadCsv,
  useTableFilters,
} from "@/components/admin/TableToolbar";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ContractDrawer } from "@/components/admin/ContractDrawer";
import { ShareDrawer } from "@/components/admin/ShareDrawer";
import { ContractTemplateAdmin } from "@/components/admin/ContractTemplateAdmin";
import type { Doc } from "@convex/_generated/dataModel";

/**
 * Contracts.
 *
 * The column that matters is the gap between viewed and signed: a contract
 * opened and not signed is a live objection, and it is the only state on this
 * page that wants a phone call rather than a wait.
 *
 * Signed rows are deliberately close to inert here — no edit, no status
 * change, no void. Everything a signed contract permits is a read.
 */

/** Green means done; warm means it still wants something; cold means it is over. */
function statusTone(status: string): string {
  if (status === "signed") return "badge-live";
  if (status === "viewed") return "badge-hot";
  if (status === "sent") return "badge-warm";
  return "badge-cold";
}

export function ContractsAdmin() {
  const contracts = useQuery(api.contracts.listAll, {});
  const resend = useMutation(api.contracts.resend);
  const regenerate = useMutation(api.contracts.regenerate);
  const voidContract = useMutation(api.contracts.voidContract);

  /* One page with two tabs rather than two sidebar entries, the same call
     already made for Content — the template is not a daily job, and a second
     nav item would make the admin look like it has more to run than it does. */
  const [tab, setTab] = useState<"contracts" | "template">("contracts");
  const [previewing, setPreviewing] = useState<Doc<"contracts"> | null>(null);
  const [sharing, setSharing] = useState<Doc<"contracts"> | null>(null);
  const [confirm, setConfirm] = useState<{
    kind: "resend" | "regenerate" | "void";
    contract: Doc<"contracts">;
  } | null>(null);

  const { search, filters, setParam } = useTableFilters(["status", "signed"]);

  const money = (n: number, currency: string) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(n);

  const day = (ts: number | undefined) =>
    ts
      ? new Date(ts).toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
        })
      : "—";

  const all = contracts ?? [];

  // Filtered in the browser: listAll already returned the page, so a round
  // trip would be for data we are holding.
  const rows = all.filter((c) => {
    if (filters.status && c.status !== filters.status) return false;
    if (filters.signed === "yes" && !c.signedAt) return false;
    if (filters.signed === "no" && c.signedAt) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = `${c.clientName} ${c.clientEmail}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const columns: Column<Doc<"contracts">>[] = [
    {
      id: "client",
      header: "Client",
      alwaysVisible: true,
      sortValue: (c) => c.clientName,
      cell: (c) => (
        <div className="min-w-0">
          <p className="truncate text-primary">{c.clientName}</p>
          <p className="truncate text-xs text-secondary">{c.clientEmail}</p>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortValue: (c) => c.status,
      cell: (c) => (
        <span className={`badge ${statusTone(c.status)}`}>
          {c.voidedAt ? "void" : c.status}
        </span>
      ),
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      sortValue: (c) => c.amount,
      cell: (c) => money(c.amount, c.currency),
    },
    {
      id: "sent",
      header: "Sent",
      hideBelow: "md",
      sortValue: (c) => c.sentAt ?? null,
      cell: (c) => <span className="text-secondary">{day(c.sentAt)}</span>,
    },
    {
      id: "viewed",
      header: "Viewed",
      hideBelow: "md",
      sortValue: (c) => c.viewedAt ?? null,
      cell: (c) =>
        c.viewedAt ? (
          /* Opened but unsigned is the state worth chasing — 48 hours of it
             raises an alert, and it should be visible here before then. */
          c.signedAt ? (
            <span className="text-secondary">{day(c.viewedAt)}</span>
          ) : (
            <span className="badge badge-hot">{day(c.viewedAt)}</span>
          )
        ) : c.status === "sent" ? (
          <span className="badge badge-cold">not opened</span>
        ) : (
          <span className="text-secondary">—</span>
        ),
    },
    {
      id: "signed",
      header: "Signed",
      hideBelow: "md",
      sortValue: (c) => c.signedAt ?? null,
      cell: (c) =>
        c.signedAt ? (
          <span className="badge badge-live">{day(c.signedAt)}</span>
        ) : (
          <span className="text-secondary">—</span>
        ),
    },
    {
      id: "pending",
      header: "Outstanding",
      hideBelow: "lg",
      sortValue: (c) => (c.depositPendingAt ? 2 : c.pdfPendingAt ? 1 : 0),
      cell: (c) =>
        /* These two only appear when something failed AFTER a signature —
           Stripe timed out, or the PDF did not render. The signature is safe
           either way, but the work is not finished and a sweep is retrying. */
        c.depositPendingAt ? (
          <span className="badge badge-hot">invoice pending</span>
        ) : c.pdfPendingAt ? (
          <span className="badge badge-warm">PDF pending</span>
        ) : (
          <span className="text-secondary">—</span>
        ),
    },
  ];

  const actions: RowAction<Doc<"contracts">>[] = [
    { label: "Preview", onSelect: (c) => setPreviewing(c) },
    {
      label: "Copy link",
      onSelect: (c) => {
        void navigator.clipboard.writeText(
          `${window.location.origin}/contract/${c.token}`,
        );
      },
    },
    {
      label: "Download PDF",
      show: (c) => Boolean(c.signedPdfFileId),
      onSelect: (c) => window.open(`/api/contracts/${c._id}/pdf`, "_blank"),
    },
    {
      label: "Share securely…",
      show: (c) => Boolean(c.signedPdfFileId),
      onSelect: (c) => setSharing(c),
    },
    {
      label: "Resend",
      show: (c) => !c.signedAt && !c.voidedAt,
      onSelect: (c) => setConfirm({ kind: "resend", contract: c }),
    },
    {
      label: "Regenerate",
      show: (c) => !c.signedAt,
      onSelect: (c) => setConfirm({ kind: "regenerate", contract: c }),
    },
    {
      label: "Void",
      destructive: true,
      show: (c) => !c.signedAt && !c.voidedAt,
      onSelect: (c) => setConfirm({ kind: "void", contract: c }),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contracts"
        description="Signed here, stored here. Nothing goes to a third party."
      />

      <div className="flex gap-2">
        {(["contracts", "template"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            className={`hairline rounded-full px-3.5 py-1.5 text-xs ${
              tab === id ? "bg-surface-2 text-primary" : "text-secondary"
            }`}
          >
            {id === "contracts" ? "Contracts" : "Template"}
          </button>
        ))}
      </div>

      {tab === "template" ? <ContractTemplateAdmin /> : null}

      <div className={tab === "contracts" ? "space-y-6" : "hidden"}>
      <TableToolbar
        search={search}
        onSearch={(v) => setParam("q", v || null)}
        placeholder="Search client or email"
        filters={filters}
        onFilter={setParam}
        shown={rows.length}
        total={all.length}
        facets={[
          {
            id: "status",
            label: "Status",
            options: ["sent", "viewed", "signed", "declined", "expired"].map(
              (v) => ({ value: v, label: v }),
            ),
          },
          {
            id: "signed",
            label: "Signed",
            options: [
              { value: "yes", label: "Signed" },
              { value: "no", label: "Not signed" },
            ],
          },
        ]}
        onExport={() =>
          downloadCsv(
            "contracts.csv",
            [
              "Client",
              "Email",
              "Amount",
              "Currency",
              "Status",
              "Template version",
              "Sent",
              "Viewed",
              "Signed",
              "Signer name",
              "Signer IP",
              "Text fingerprint",
              "Chain root",
            ],
            rows.map((c) => [
              c.clientName,
              c.clientEmail,
              c.amount,
              c.currency,
              c.status,
              c.templateVersion,
              c.sentAt ? new Date(c.sentAt).toISOString() : "",
              c.viewedAt ? new Date(c.viewedAt).toISOString() : "",
              c.signedAt ? new Date(c.signedAt).toISOString() : "",
              c.signerTypedName ?? "",
              c.signerIp ?? "",
              c.bodyHash ?? "",
              c.auditRoot ?? "",
            ]),
          )
        }
      />

      <div className="flex flex-wrap gap-3">
        <a
          href="/api/contracts/export"
          className="hairline rounded-full px-4 py-2 text-sm text-secondary transition-colors duration-fast hover:text-primary"
        >
          Export everything
        </a>
        <p className="self-center text-xs text-secondary">
          Every contract, its audit trail, the template versions and the signed
          PDFs, as one zip.
        </p>
      </div>

      <DataTable
        rows={contracts === undefined ? undefined : rows}
        columns={columns}
        rowKey={(c) => c._id}
        onRowClick={(c) => setPreviewing(c)}
        actions={actions}
        caption="Contracts"
        empty={
          <div className="space-y-3">
            <p className="admin-section-title">No contracts yet</p>
            <p className="text-[13px] text-secondary">
              One is generated automatically when a client accepts a proposal.
            </p>
          </div>
        }
      />
      </div>

      {previewing ? (
        <ContractDrawer
          contract={previewing}
          onClose={() => setPreviewing(null)}
        />
      ) : null}

      {sharing ? (
        <ShareDrawer contract={sharing} onClose={() => setSharing(null)} />
      ) : null}

      {confirm ? (
        <ConfirmDialog
          title={
            confirm.kind === "resend"
              ? "Resend this contract?"
              : confirm.kind === "regenerate"
                ? "Regenerate from the current template?"
                : "Void this contract?"
          }
          body={
            confirm.kind === "resend"
              ? "The link stays the same and the 14-day clock restarts."
              : confirm.kind === "regenerate"
                ? "The old one is voided and a new link is issued from the active template. The client must use the new link."
                : "The link stops working immediately. This cannot be undone."
          }
          what={
            confirm.kind === "resend"
              ? "resend this contract"
              : confirm.kind === "regenerate"
                ? "regenerate this contract"
                : "void this contract"
          }
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            // Throwing rolls the slider back — ConfirmDialog depends on it.
            if (confirm.kind === "resend") {
              await resend({ id: confirm.contract._id });
            } else if (confirm.kind === "regenerate") {
              await regenerate({ id: confirm.contract._id });
            } else {
              await voidContract({
                id: confirm.contract._id,
                reason: "Voided from the admin.",
              });
            }
            setConfirm(null);
          }}
        />
      ) : null}
    </div>
  );
}
