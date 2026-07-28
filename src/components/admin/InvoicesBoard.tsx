"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { CopyButton } from "@/components/ui/CopyButton";
import { SlideToConfirm } from "@/components/ui/SlideToConfirm";
import type { Doc } from "@convex/_generated/dataModel";

/**
 * Invoices.
 *
 * Instalments are created as a pair — deposit and balance — so a half-invoiced
 * project cannot exist. The deposit is issued immediately; the balance stays
 * draft until the work is delivered.
 *
 * Marking an invoice paid is deliberately a slide, not a button. It is the one
 * action here that is not cleanly reversible: it closes out the money record,
 * stops the chasing, and telling a client they still owe you after you already
 * marked it settled is a conversation nobody wants.
 */

const STATUSES = ["draft", "sent", "paid", "overdue", "void"] as const;
type Status = (typeof STATUSES)[number];

export function InvoicesBoard() {
  const data = useQuery(api.admin.invoices, {});
  const setStatus = useMutation(api.invoices.setStatus);
  const [creating, setCreating] = useState(false);

  const money = (n: number, currency: string) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl">Invoices</h1>
          <p className="mt-1 text-sm text-secondary">
            50% deposit, 50% on completion. Both instalments are created
            together.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-canvas transition-opacity duration-fast hover:opacity-90"
        >
          New invoice pair
        </button>
      </div>

      {data === undefined ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-1" />
          ))}
        </div>
      ) : (
        <>
          {data.totals.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.totals.map((t) => (
                <div key={t.currency} className="admin-card">
                  <p className="text-xs text-secondary">{t.currency}</p>
                  <div className="mt-2 flex items-baseline justify-between gap-3">
                    <span className="text-sm text-secondary">Paid</span>
                    <span className="text-lg text-primary tabular-nums">
                      {money(t.paid, t.currency)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between gap-3">
                    <span className="text-sm text-secondary">Outstanding</span>
                    <span className="text-lg tabular-nums text-[color:var(--text-notice)]">
                      {money(t.outstanding, t.currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {data.rows.length === 0 ? (
            <p className="admin-card text-sm text-secondary">
              No invoices yet. Create a pair from a won lead.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--border-hairline)] text-left">
                    <Th>Reference</Th>
                    <Th>Client</Th>
                    <Th>Stage</Th>
                    <Th>Amount</Th>
                    <Th>Status</Th>
                    <Th>Link</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((inv: Doc<"invoices">) => (
                    <tr
                      key={inv._id}
                      className="border-b border-[color:var(--border-hairline)]"
                    >
                      <td className="py-3 pr-4 text-primary tabular-nums">
                        {inv.reference}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="text-primary">{inv.clientName}</div>
                        <div className="text-xs text-secondary">
                          {inv.clientEmail}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-secondary">{inv.stage}</td>
                      <td className="py-3 pr-4 text-primary tabular-nums">
                        {money(inv.amount, inv.currency)}
                      </td>
                      <td className="py-3 pr-4">
                        <StatusCell
                          invoice={inv}
                          onSet={(status) =>
                            setStatus({ id: inv._id, status })
                          }
                        />
                      </td>
                      <td className="py-3">
                        {/* The token is the only credential on the invoice
                            page, so this link is sensitive — copy it, never
                            display it in full. */}
                        <CopyButton
                          value={`${typeof window !== "undefined" ? window.location.origin : ""}/invoice/${inv.token}`}
                          label="Copy link"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {creating ? <CreatePairDialog onClose={() => setCreating(false)} /> : null}
    </div>
  );
}

/**
 * Status control. Everything except "paid" is an ordinary select, because
 * those transitions are reversible. Marking paid gets the gesture.
 */
function StatusCell({
  invoice,
  onSet,
}: {
  invoice: Doc<"invoices">;
  onSet: (status: Status) => Promise<unknown>;
}) {
  if (invoice.status === "paid") {
    return (
      <span className="badge badge-warm">
        paid
        {invoice.paidAt ? (
          <span className="opacity-70">
            {new Date(invoice.paidAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={invoice.status}
        aria-label={`Status for ${invoice.reference}`}
        onChange={(e) => void onSet(e.target.value as Status)}
        className="hairline rounded-md bg-surface-1 px-2 py-1 text-xs text-secondary"
      >
        {STATUSES.filter((s) => s !== "paid").map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <div className="w-40">
        <SlideToConfirm
          purpose="mark-paid"
          ariaLabel={`Slide to mark invoice ${invoice.reference} as paid`}
          onConfirm={async () => {
            await onSet("paid");
          }}
        />
      </div>
    </div>
  );
}

function CreatePairDialog({ onClose }: { onClose: () => void }) {
  const createPair = useMutation(api.invoices.createPair);
  const [values, setValues] = useState({
    clientName: "",
    clientEmail: "",
    description: "",
    amount: "",
    currency: "USD",
  });
  const [error, setError] = useState<string | null>(null);

  const amount = Number(values.amount);
  const valid =
    values.clientName.trim() !== "" &&
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.clientEmail) &&
    values.description.trim() !== "" &&
    Number.isFinite(amount) &&
    amount > 0;

  const set = (k: keyof typeof values) => (v: string) =>
    setValues((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cancel"
        onClick={onClose}
        className="absolute inset-0 bg-[color:var(--bg-canvas)]/70 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create invoice pair"
        className="liquid-glass relative w-full max-w-md rounded-2xl p-6"
      >
        <h2 className="text-lg text-primary">New invoice pair</h2>
        <p className="mt-1 text-xs text-secondary">
          Enter the full project value. Each instalment is half.
        </p>

        <div className="mt-5 space-y-3">
          <Field label="Client name" value={values.clientName} onChange={set("clientName")} />
          <Field
            label="Client email"
            type="email"
            value={values.clientEmail}
            onChange={set("clientEmail")}
          />
          <Field label="Description" value={values.description} onChange={set("description")} />
          <div className="flex gap-3">
            <div className="flex-1">
              <Field
                label="Full project value"
                type="number"
                value={values.amount}
                onChange={set("amount")}
              />
            </div>
            <div className="w-28">
              <label htmlFor="inv-currency" className="text-sm text-secondary">
                Currency
              </label>
              <select
                id="inv-currency"
                value={values.currency}
                onChange={(e) => set("currency")(e.target.value)}
                className="hairline mt-2 w-full rounded-lg bg-surface-1 px-3 py-2.5 text-sm text-primary"
              >
                {["USD", "SAR", "AED"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {valid ? (
          <p className="mt-4 text-xs text-secondary">
            Creates {new Intl.NumberFormat("en-US", { style: "currency", currency: values.currency, maximumFractionDigits: 0 }).format(Math.round(amount / 2))}{" "}
            deposit (issued now) and the same again on completion (draft).
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-secondary transition-colors duration-fast hover:text-primary"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!valid}
            onClick={async () => {
              try {
                await createPair({
                  clientName: values.clientName.trim(),
                  clientEmail: values.clientEmail.trim(),
                  description: values.description.trim(),
                  amount,
                  currency: values.currency,
                });
                onClose();
              } catch {
                setError("Could not create that. Try again.");
              }
            }}
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-canvas transition-opacity duration-fast hover:opacity-90 disabled:opacity-40"
          >
            Create pair
          </button>
        </div>

        {error ? (
          <p role="alert" className="mt-3 text-xs text-[color:var(--text-notice)]">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th scope="col" className="pb-2 pr-4 text-xs font-normal text-secondary">
      {children}
    </th>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  const id = `inv-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <div>
      <label htmlFor={id} className="text-sm text-secondary">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="hairline mt-2 w-full rounded-lg bg-surface-1 px-3 py-2.5 text-sm text-primary"
      />
    </div>
  );
}
