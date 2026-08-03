"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { Field, TextArea } from "@/components/admin/shared/Fields";
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
import type { Doc, Id } from "@convex/_generated/dataModel";

/**
 * Proposals.
 *
 * Hosted at /proposal/[token] rather than attached as a PDF: always current,
 * and it reports when it was opened. viewedAt is the useful column — it tells
 * you whether silence means unread or unconvinced, which need different
 * follow-ups.
 */
export function ProposalsAdmin() {
  const proposals = useQuery(api.proposals.listAll, {});
  const leads = useQuery(api.admin.leads, { limit: 100 });
  const upsert = useMutation(api.proposals.upsert);
  const send = useMutation(api.proposals.send);
  const remove = useMutation(api.proposals.remove);

  const [editing, setEditing] = useState<Doc<"proposals"> | "new" | null>(null);
  const [deleting, setDeleting] = useState<Doc<"proposals"> | null>(null);

  const { search, filters, setParam } = useTableFilters(["status", "viewed"]);

  const money = (n: number, currency: string) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(n);

  const day = (ts: number | undefined) =>
    ts
      ? new Date(ts).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        })
      : "—";

  const all = proposals ?? [];

  /* Filtered in the browser: listAll already returns the whole page, so a
     round trip would be for data we are holding. */
  const rows = all.filter((p) => {
    if (filters.status && p.status !== filters.status) return false;
    if (filters.viewed === "yes" && !p.viewedAt) return false;
    if (filters.viewed === "no" && p.viewedAt) return false;
    if (search) {
      const hay = `${p.clientName ?? ""} ${p.clientEmail ?? ""}`.toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const columns: Column<Doc<"proposals">>[] = [
    {
      id: "client",
      header: "Client",
      alwaysVisible: true,
      sortValue: (p) => p.clientName ?? "",
      cell: (p) => (
        <div className="min-w-0">
          <div className="truncate text-primary">
            {p.clientName ?? "Untitled"}
          </div>
          {p.clientEmail ? (
            <div className="truncate text-xs text-secondary">
              {p.clientEmail}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      sortValue: (p) => p.amount,
      cell: (p) => money(p.amount, p.currency),
    },
    {
      id: "status",
      header: "Status",
      sortValue: (p) => p.status,
      cell: (p) => <span className="badge">{p.status}</span>,
    },
    {
      id: "sent",
      header: "Sent",
      hideBelow: "md",
      sortValue: (p) => p.sentAt ?? null,
      cell: (p) => <span className="text-secondary">{day(p.sentAt)}</span>,
    },
    {
      id: "viewed",
      header: "Viewed",
      sortValue: (p) => p.viewedAt ?? null,
      cell: (p) =>
        p.viewedAt ? (
          <span className="badge badge-warm">{day(p.viewedAt)}</span>
        ) : p.status === "sent" ? (
          <span className="badge badge-cold">not opened</span>
        ) : (
          <span className="text-secondary">—</span>
        ),
    },
    {
      id: "expires",
      header: "Expires",
      hideBelow: "lg",
      sortValue: (p) => p.sentAt ?? null,
      cell: (p) => (
        <span className="text-secondary">
          {/* Proposals do not carry an explicit expiry, so this is the
              change-request flag instead — the thing that actually decides
              whether one still needs you. */}
          {p.changeRequest ? (
            <span className="text-[color:var(--text-notice)]">
              changes asked
            </span>
          ) : (
            "—"
          )}
        </span>
      ),
    },
  ];

  const actions: RowAction<Doc<"proposals">>[] = [
    {
      label: "Edit",
      onSelect: (p) => setEditing(p),
    },
    {
      label: "Issue",
      show: (p) => p.status === "draft",
      onSelect: (p) => void send({ id: p._id }),
    },
    {
      label: "Copy link",
      show: (p) => Boolean(p.token),
      onSelect: (p) => {
        void navigator.clipboard.writeText(
          `${window.location.origin}/proposal/${p.token}`,
        );
      },
    },
    {
      label: "Delete",
      destructive: true,
      onSelect: (p) => setDeleting(p),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proposals"
        description="Hosted links, not PDFs. They report when they were opened."
        action={
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-canvas transition-opacity duration-fast hover:opacity-90"
          >
            New proposal
          </button>
        }
      />

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
            options: [
              "draft",
              "sent",
              "security_review",
              "procurement",
              "signed",
              "lost",
            ].map((v) => ({ value: v, label: v.replace(/_/g, " ") })),
          },
          {
            id: "viewed",
            label: "Opened",
            options: [
              { value: "yes", label: "Opened" },
              { value: "no", label: "Not opened" },
            ],
          },
        ]}
        onExport={() =>
          downloadCsv(
            "proposals.csv",
            ["Client", "Email", "Amount", "Currency", "Status", "Sent", "Viewed"],
            rows.map((p) => [
              p.clientName ?? "",
              p.clientEmail ?? "",
              p.amount,
              p.currency,
              p.status,
              p.sentAt ? new Date(p.sentAt).toISOString() : "",
              p.viewedAt ? new Date(p.viewedAt).toISOString() : "",
            ]),
          )
        }
      />

      <DataTable
        rows={proposals === undefined ? undefined : rows}
        columns={columns}
        rowKey={(p) => p._id}
        onRowClick={(p) => setEditing(p)}
        actions={actions}
        caption="Proposals"
        empty={
          <div className="space-y-3">
            <p className="admin-section-title">No proposals yet</p>
            <p className="text-[13px] text-secondary">
              Start one from a lead and send the link.
            </p>
            {/* The action lives in the empty state, not only in the corner —
                pointing at a button elsewhere is a worse answer than being
                the button. */}
            <button
              type="button"
              onClick={() => setEditing("new")}
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-canvas transition-opacity duration-fast hover:opacity-90"
            >
              New proposal
            </button>
          </div>
        }
      />

      {deleting ? (
        <ConfirmDialog
          title="Delete this proposal?"
          body="The hosted link stops working immediately. This cannot be undone."
          what="this proposal"
          onConfirm={async () => {
            await remove({ id: deleting._id });
          }}
          onClose={() => setDeleting(null)}
        />
      ) : null}

      {editing ? (
        <Drawer
          proposal={editing === "new" ? null : editing}
          leads={(leads ?? []).map((l) => ({
            id: l._id,
            label: `${l.name || l.email}${l.company ? ` · ${l.company}` : ""}`,
            email: l.email,
            name: l.name,
          }))}
          onClose={() => setEditing(null)}
          onSave={async (draft) => {
            await upsert(draft);
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function Drawer({
  proposal,
  leads,
  onClose,
  onSave,
}: {
  proposal: Doc<"proposals"> | null;
  leads: { id: Id<"leads">; label: string; email: string; name: string }[];
  onClose: () => void;
  onSave: (d: {
    id?: Id<"proposals">;
    leadId: Id<"leads">;
    clientName?: string;
    clientEmail?: string;
    amount: number;
    currency: string;
    understanding?: string;
    scope?: string;
    excluded?: string;
    timeline?: string;
    paymentTerms?: string;
    assumptions?: string;
  }) => Promise<void>;
}) {
  const [leadId, setLeadId] = useState<string>(
    proposal?.leadId ?? leads[0]?.id ?? "",
  );

  /*
   * Adopt the first lead once the list arrives.
   *
   * useState only reads its initial value on the first render. The drawer
   * mounts as soon as it is opened, which can be before api.admin.leads has
   * resolved — and then `leads` was [], leadId stuck at "" permanently, and
   * `valid` below could never become true. Save stayed greyed out for the
   * life of the drawer with no way to recover but re-picking the same lead.
   *
   * Only fills a blank selection, so it can never overwrite a choice or the
   * lead an existing proposal already points at.
   */
  useEffect(() => {
    if (leadId === "" && leads.length > 0) setLeadId(leads[0].id);
  }, [leadId, leads]);
  const [amount, setAmount] = useState(String(proposal?.amount ?? ""));
  const [currency] = useState(proposal?.currency ?? "USD");
  const [fields, setFields] = useState({
    understanding: proposal?.understanding ?? "",
    scope: proposal?.scope ?? "",
    excluded: proposal?.excluded ?? "",
    timeline: proposal?.timeline ?? "",
    paymentTerms:
      proposal?.paymentTerms ??
      "40% to start, 60% on completion. Pay by card or Link from your portal.",
    assumptions: proposal?.assumptions ?? "",
  });
  const [saving, setSaving] = useState(false);

  const lead = leads.find((l) => l.id === leadId);
  const valid = leadId !== "" && Number(amount) > 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[color:var(--bg-canvas)]/70 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={proposal ? "Edit proposal" : "New proposal"}
        className="glass-depth glass-near relative h-full w-full max-w-lg overflow-y-auto p-6"
      >
        <h2 className="text-lg text-primary">
          {proposal ? "Edit proposal" : "New proposal"}
        </h2>

        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="prop-lead" className="text-sm text-secondary">
              Lead
            </label>
            <select
              id="prop-lead"
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              className="hairline mt-2 w-full rounded-lg bg-surface-1 px-3.5 py-2.5 text-sm text-primary"
            >
              {/*
                An explicit empty option, so a blank selection LOOKS blank.
                With value="" matching nothing, the browser renders the first
                lead as though it were chosen — which made a disabled Save
                button look like a bug rather than a missing field.
              */}
              {leadId === "" ? (
                <option value="">
                  {leads.length === 0 ? "Loading leads…" : "Choose a lead"}
                </option>
              ) : null}
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <Field label="Amount" type="number" value={amount} onChange={setAmount} />

          <TextArea
            label="What I understand"
            rows={4}
            value={fields.understanding}
            onChange={(v) => setFields({ ...fields, understanding: v })}
            help="Show them you listened. This is the section that wins work."
          />
          <TextArea
            label="Scope"
            rows={5}
            value={fields.scope}
            onChange={(v) => setFields({ ...fields, scope: v })}
          />
          <TextArea
            label="Not included"
            rows={3}
            value={fields.excluded}
            onChange={(v) => setFields({ ...fields, excluded: v })}
            help="Naming what is out prevents most scope arguments later."
          />
          <TextArea
            label="Timeline"
            rows={3}
            value={fields.timeline}
            onChange={(v) => setFields({ ...fields, timeline: v })}
          />
          <TextArea
            label="Payment"
            rows={2}
            value={fields.paymentTerms}
            onChange={(v) => setFields({ ...fields, paymentTerms: v })}
          />
          <TextArea
            label="Assumptions"
            rows={3}
            value={fields.assumptions}
            onChange={(v) => setFields({ ...fields, assumptions: v })}
          />
        </div>

        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            disabled={!valid || saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave({
                  id: proposal?._id,
                  leadId: leadId as Id<"leads">,
                  clientName: lead?.name,
                  clientEmail: lead?.email,
                  amount: Number(amount),
                  currency,
                  ...fields,
                });
              } finally {
                setSaving(false);
              }
            }}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save draft"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-secondary hover:text-primary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
