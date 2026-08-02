"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { DeleteSlide } from "@/components/admin/shared/Fields";
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

/**
 * Plan is recorded on the invoice because it decides what the client is
 * offered at payment time — wallets are Enterprise only, and that has to be
 * knowable from the invoice alone when they open the portal weeks later.
 */
const TIER_OPTIONS = [
  { id: "launch", label: "Launch" },
  { id: "growth", label: "Growth" },
  { id: "app", label: "Web app" },
  { id: "native", label: "iOS and macOS" },
  { id: "enterprise", label: "Enterprise" },
  { id: "care", label: "Care plan" },
] as const;

export function InvoicesBoard() {
  const data = useQuery(api.admin.invoices, {});
  const setStatus = useMutation(api.invoices.setStatus);
  const [creating, setCreating] = useState(false);
  const [linking, setLinking] = useState(false);

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
            40% deposit, 60% on completion. Both instalments are created
            together.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* For amounts that are not a project instalment — a deposit agreed
              on a call, an extra day, a small fixed piece. */}
          <button
            type="button"
            onClick={() => setLinking(true)}
            className="hairline rounded-full px-4 py-2 text-sm text-primary transition-colors duration-fast hover:bg-surface-2"
          >
            Custom payment link
          </button>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-canvas transition-opacity duration-fast hover:opacity-90"
          >
            New invoice pair
          </button>
        </div>
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

          <PaymentLinksList />

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
      {linking ? <PaymentLinkDialog onClose={() => setLinking(false)} /> : null}
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
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);

  // Not yet in Stripe: the only meaningful action is to issue it, which
  // creates the Stripe invoice and emails the client a payment link.
  if (!invoice.stripeInvoiceId && invoice.status !== "void") {
    return (
      <div className="w-44">
        <SlideToConfirm
          purpose="send-invoice"
          disabled={issuing}
          ariaLabel={`Slide to issue invoice ${invoice.reference} and email it`}
          onConfirm={async () => {
            setIssuing(true);
            setIssueError(null);
            const res = await fetch("/api/stripe/issue", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: invoice._id }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
              setIssueError(body.error ?? "Could not issue that.");
              setIssuing(false);
              // Throwing rolls the thumb back — nothing was issued.
              throw new Error("issue failed");
            }
            /*
             * Issued, but the email may not have gone.
             *
             * The invoice exists at this point, so the slider is allowed to
             * complete — rolling it back would claim nothing happened. But
             * the route cannot be run again for this invoice, so if the send
             * failed I have to know now, while I still have the client in
             * mind, rather than a fortnight later when nobody has paid.
             */
            if (body.emailed === false) {
              setIssueError(
                body.warning ??
                  "Issued, but the email did not send. Send the link by hand.",
              );
            }
            setIssuing(false);
          }}
        />
        {issueError ? (
          <p
            role="alert"
            className="mt-1 text-[11px] text-[color:var(--text-notice)]"
          >
            {issueError}
          </p>
        ) : null}
      </div>
    );
  }

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
    tier: "growth",
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
        className="glass-depth glass-near glass-panel relative w-full max-w-md p-6"
      >
        <h2 className="text-lg text-primary">New invoice pair</h2>
        <p className="mt-1 text-xs text-secondary">
          Enter the full project value. Split 40% now, 60% on completion.
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

          <div>
            <label htmlFor="inv-tier" className="text-sm text-secondary">
              Plan
            </label>
            <select
              id="inv-tier"
              value={values.tier}
              onChange={(e) => set("tier")(e.target.value)}
              className="hairline mt-2 w-full rounded-lg bg-surface-1 px-3 py-2.5 text-sm text-primary"
            >
              {TIER_OPTIONS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-secondary">
              {/* Stated here because it is decided here — the plan chosen on
                  this form is what the client is offered when they pay. */}
              {values.tier === "enterprise"
                ? "Apple Pay and Google Pay available in the portal."
                : "Card and Link in the portal. Wallets are Enterprise only."}
            </p>
          </div>
        </div>

        {valid ? (
          <p className="mt-4 text-xs text-secondary">
            Creates a{" "}
            {new Intl.NumberFormat("en-US", { style: "currency", currency: values.currency, maximumFractionDigits: 0 }).format(Math.round(amount * 0.4))}{" "}
            deposit (issued now) and a{" "}
            {new Intl.NumberFormat("en-US", { style: "currency", currency: values.currency, maximumFractionDigits: 0 }).format(amount - Math.round(amount * 0.4))}{" "}
            balance on completion (draft).
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
                  tier: values.tier,
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

/**
 * One-off payment link for an arbitrary amount.
 *
 * A Payment Link rather than a Checkout Session, because a session expires
 * after 24 hours and a link emailed over is routinely opened days later.
 */
function PaymentLinkDialog({ onClose }: { onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const value = Number(amount);
  const valid =
    Number.isFinite(value) && value > 0 && description.trim() !== "";

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
        aria-label="Custom payment link"
        className="glass-depth glass-near glass-panel relative w-full max-w-md p-6"
      >
        <h2 className="text-lg text-primary">Custom payment link</h2>
        <p className="mt-1 text-xs text-secondary">
          For anything that is not a project instalment. Card, Apple Pay,
          Google Pay and Link all work on it.
        </p>

        {url ? (
          <div className="mt-6">
            <p className="text-sm text-primary">Link ready</p>
            <p className="mt-1 text-xs break-all text-secondary">{url}</p>
            <div className="mt-4 flex items-center gap-3">
              <CopyButton value={url} label="Copy payment link" />
              <button
                type="button"
                onClick={onClose}
                className="text-sm text-secondary hover:text-primary"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-5 space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label htmlFor="link-amount" className="text-sm text-secondary">
                    Amount
                  </label>
                  <input
                    id="link-amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="hairline mt-2 w-full rounded-lg bg-surface-1 px-3.5 py-2.5 text-sm text-primary"
                  />
                </div>
                <div className="w-28">
                  <label htmlFor="link-ccy" className="text-sm text-secondary">
                    Currency
                  </label>
                  <select
                    id="link-ccy"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="hairline mt-2 w-full rounded-lg bg-surface-1 px-3 py-2.5 text-sm text-primary"
                  >
                    {["USD", "GBP", "EUR", "AED", "SAR"].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="link-desc" className="text-sm text-secondary">
                  What it is for
                </label>
                <input
                  id="link-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional page — Acme site"
                  className="hairline mt-2 w-full rounded-lg bg-surface-1 px-3.5 py-2.5 text-sm text-primary"
                />
                <p className="mt-1.5 text-xs text-secondary">
                  The client sees this on the payment page.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="text-sm text-secondary hover:text-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!valid || busy}
                onClick={async () => {
                  setBusy(true);
                  setError(null);
                  try {
                    const res = await fetch("/api/stripe/payment-link", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        amount: value,
                        currency,
                        description: description.trim(),
                      }),
                    });
                    const json = await res.json();
                    if (!res.ok) {
                      setError(json.error ?? "Could not create that.");
                      return;
                    }
                    setUrl(json.url);
                  } finally {
                    setBusy(false);
                  }
                }}
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas disabled:opacity-40"
              >
                {busy ? "Creating…" : "Create link"}
              </button>
            </div>

            {error ? (
              <p
                role="alert"
                className="mt-3 text-xs text-[color:var(--text-notice)]"
              >
                {error}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Custom payment links that have been created.
 *
 * These used to exist only in the response that made them — close the tab and
 * the URL was gone, with no record that money had been asked for. Unpaid
 * sort first: those are the ones still waiting on someone.
 */
function PaymentLinksList() {
  const rows = useQuery(api.paymentLinks.listAll, {});
  const remove = useMutation(api.paymentLinks.remove);
  const [copied, setCopied] = useState<string | null>(null);

  if (rows === undefined || rows.length === 0) return null;

  const outstanding = rows.filter((r) => r.paidAt === undefined).length;

  return (
    <section>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg text-primary">Payment links</h2>
        {outstanding > 0 ? (
          <span className="badge badge-cold">{outstanding} unpaid</span>
        ) : null}
      </div>

      <ul className="mt-3 divide-y divide-[color:var(--border-hairline)]">
        {rows.map((row) => (
          <li key={row._id} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-primary">{row.label}</p>
              <p className="mt-0.5 text-xs text-secondary">
                {/* Minor units in, major units shown — the amount is stored
                    the way Stripe stores it. */}
                {(row.amount / 100).toLocaleString("en-US", {
                  style: "currency",
                  currency: row.currency.toUpperCase(),
                })}
                {row.forWhom ? ` · ${row.forWhom}` : ""}
                {" · "}
                {new Date(row.createdAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>

            {row.paidAt !== undefined ? (
              <span className="badge">paid</span>
            ) : (
              <span className="badge badge-cold">awaiting</span>
            )}

            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(row.url);
                  setCopied(row._id);
                  setTimeout(() => setCopied(null), 2000);
                } catch {
                  // Clipboard can be blocked; the link is still openable.
                }
              }}
              className="hairline rounded-full px-3 py-1 text-xs text-primary transition-colors duration-fast hover:bg-surface-2"
            >
              {copied === row._id ? "Copied" : "Copy link"}
            </button>

            <a
              href={row.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-accent transition-opacity duration-fast hover:opacity-80"
            >
              Open
            </a>

            <DeleteSlide
              what="this payment link record"
              onDelete={async () => {
                await remove({ id: row._id });
              }}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
