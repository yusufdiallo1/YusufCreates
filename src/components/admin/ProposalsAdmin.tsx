"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { Field, TextArea,
  DeleteSlide,
} from "@/components/admin/shared/Fields";
import { Empty, Skeleton } from "@/components/admin/ProjectsAdmin";
import { CopyButton } from "@/components/ui/CopyButton";
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl">Proposals</h1>
          <p className="mt-1 text-sm text-secondary">
            Hosted links, not PDFs — so they stay current and report when they
            were opened.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-canvas transition-opacity duration-fast hover:opacity-90"
        >
          New proposal
        </button>
      </div>

      {proposals === undefined ? (
        <Skeleton />
      ) : proposals.length === 0 ? (
        <Empty
          title="No proposals yet"
          body="Start one from a lead and send the link."
        />
      ) : (
        <ul className="space-y-2">
          {proposals.map((p) => (
            <li key={p._id} className="admin-card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setEditing(p)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-primary">
                      {p.clientName ?? "Untitled"}
                    </span>
                    <span className="badge">{p.status}</span>
                    {p.viewedAt ? (
                      <span className="badge badge-warm">opened</span>
                    ) : p.status === "sent" ? (
                      <span className="badge badge-cold">not opened</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-secondary">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: p.currency || "USD",
                      maximumFractionDigits: 0,
                    }).format(p.amount)}
                    {p.viewedAt
                      ? ` · opened ${new Date(p.viewedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                      : ""}
                  </p>
                </button>

                <div className="flex shrink-0 items-center gap-2">
                  {p.token ? (
                    <CopyButton
                      value={`${typeof window !== "undefined" ? window.location.origin : ""}/proposal/${p.token}`}
                      label="Copy link"
                    />
                  ) : null}
                  {p.status === "draft" ? (
                    <button
                      type="button"
                      onClick={() => void send({ id: p._id })}
                      className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-canvas"
                    >
                      Issue
                    </button>
                  ) : null}
                  <DeleteSlide
                    what="this proposal"
                    onDelete={async () => {
                      await remove({ id: p._id });
                    }}
                  />
                </div>
              </div>

              {p.changeRequest ? (
                <p className="mt-3 text-xs text-[color:var(--text-notice)]">
                  Changes requested: {p.changeRequest}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

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
