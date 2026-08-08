"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { DeleteSlide } from "@/components/admin/shared/Fields";
import { CopyButton } from "@/components/ui/CopyButton";
import { SlideToConfirm } from "@/components/ui/SlideToConfirm";
import { PageHeader } from "@/components/admin/PageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
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
import type { Doc } from "@convex/_generated/dataModel";

/**
 * Invoices.
 *
 * Instalments are created as a pair — deposit and balance — so a half-invoiced
 * project cannot exist. The deposit is issued immediately; the balance stays
 * draft until the work is delivered.
 *
 * Issuing, marking paid and voiding all still ask for a slide — each is a
 * thing you cannot cleanly take back. But the gesture moved off the row and
 * into the confirmation the overflow menu opens. On the row it made every
 * line 135px tall and put the two least reversible actions in the most
 * prominent position on the page; behind the menu it is met once, after you
 * have already chosen.
 */

const STATUSES = ["draft", "sent", "paid", "overdue", "void"] as const;
type Status = (typeof STATUSES)[number];

/**
 * Plan is recorded on the invoice for reporting — revenue by tier, and which
 * plans actually convert. It used to decide payment methods too (wallets were
 * Enterprise only) but that rule is gone: every tier is offered Apple Pay and
 * Google Pay, because they help most on exactly the small invoices the rule
 * excluded.
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
  /* One piece of state for all three confirmations, since only one modal can
     be open at a time and three booleans could contradict each other. */
  const [confirm, setConfirm] = useState<{
    kind: "issue" | "paid" | "void";
    invoice: Doc<"invoices">;
  } | null>(null);

  const { search, filters, setParam } = useTableFilters([
    "status",
    "stage",
    "currency",
    "overdue",
  ]);

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

  const allRows = data?.rows ?? [];
  const currencies = [...new Set(allRows.map((i) => i.currency))].sort();

  const rows = allRows.filter((i) => {
    if (filters.status && i.status !== filters.status) return false;
    if (filters.stage && i.stage !== filters.stage) return false;
    if (filters.currency && i.currency !== filters.currency) return false;
    if (filters.overdue === "yes" && i.status !== "overdue") return false;
    if (search) {
      const hay =
        `${i.clientName} ${i.clientEmail} ${i.reference}`.toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const columns: Column<Doc<"invoices">>[] = [
    {
      id: "reference",
      header: "Number",
      alwaysVisible: true,
      sortValue: (i) => i.reference,
      cell: (i) => <span className="text-primary tabular-nums">{i.reference}</span>,
    },
    {
      id: "client",
      header: "Client",
      sortValue: (i) => i.clientName,
      cell: (i) => (
        <div className="min-w-0">
          <div className="truncate text-primary">{i.clientName}</div>
          <div className="truncate text-xs text-secondary">{i.clientEmail}</div>
        </div>
      ),
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      sortValue: (i) => i.amount,
      cell: (i) => money(i.amount, i.currency),
    },
    {
      id: "currency",
      header: "Currency",
      hideBelow: "lg",
      sortValue: (i) => i.currency,
      cell: (i) => <span className="text-secondary">{i.currency}</span>,
    },
    {
      id: "stage",
      header: "Type",
      hideBelow: "md",
      sortValue: (i) => i.stage,
      cell: (i) => <span className="text-secondary">{i.stage}</span>,
    },
    {
      id: "status",
      header: "Status",
      sortValue: (i) => i.status,
      cell: (i) => <StatusCell invoice={i} />,
    },
    {
      id: "due",
      header: "Due",
      hideBelow: "md",
      sortValue: (i) => i.dueDate ?? null,
      cell: (i) => <span className="text-secondary">{day(i.dueDate)}</span>,
    },
  ];

  const actions: RowAction<Doc<"invoices">>[] = [
    {
      /* Only for an invoice not yet in Stripe. Issuing creates it there and
         emails the client, which is the point of no return for this row. */
      label: "Issue and email",
      show: (i) => !i.stripeInvoiceId && i.status !== "void",
      onSelect: (i) => setConfirm({ kind: "issue", invoice: i }),
    },
    {
      label: "Mark as paid",
      show: (i) => i.status !== "paid" && i.status !== "void",
      onSelect: (i) => setConfirm({ kind: "paid", invoice: i }),
    },
    {
      label: "Copy pay link",
      onSelect: (i) => {
        void navigator.clipboard.writeText(
          `${window.location.origin}/invoice/${i.token}`,
        );
      },
    },
    {
      label: "Open hosted invoice",
      show: (i) => Boolean(i.stripeHostedUrl),
      onSelect: (i) => window.open(i.stripeHostedUrl!, "_blank", "noopener"),
    },
    {
      label: "Void",
      destructive: true,
      show: (i) => i.status !== "void" && i.status !== "paid",
      onSelect: (i) => setConfirm({ kind: "void", invoice: i }),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Invoices"
        description="40% deposit, 60% on completion, created together."
        action={
          <div className="flex flex-wrap gap-2">
          {/* For amounts that are not a project instalment — a deposit agreed
              on a call, an extra day, a small fixed piece. */}
          <button
            type="button"
            onClick={() => setLinking(true)}
            className="hairline rounded-full px-4 py-2 text-sm text-primary transition-colors duration-hover ease-hover hover:bg-surface-2"
          >
            Custom payment link
          </button>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-canvas transition-opacity duration-hover ease-hover hover:opacity-90"
            >
              New invoice pair
            </button>
          </div>
        }
      />

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

          <TableToolbar
            search={search}
            onSearch={(v) => setParam("q", v || null)}
            placeholder="Search client, email or reference"
            filters={filters}
            onFilter={setParam}
            shown={rows.length}
            total={data.rows.length}
            facets={[
              {
                id: "status",
                label: "Status",
                options: STATUSES.map((s) => ({ value: s, label: s })),
              },
              {
                id: "stage",
                label: "Stage",
                options: [
                  { value: "deposit", label: "Deposit" },
                  { value: "balance", label: "Balance" },
                ],
              },
              {
                id: "currency",
                label: "Currency",
                options: currencies.map((c) => ({ value: c, label: c })),
              },
              {
                id: "overdue",
                label: "Overdue",
                options: [{ value: "yes", label: "Overdue only" }],
              },
            ]}
            onExport={() =>
              downloadCsv(
                "invoices.csv",
                [
                  "Reference",
                  "Client",
                  "Email",
                  "Amount",
                  "Currency",
                  "Stage",
                  "Status",
                  "Due",
                ],
                rows.map((i) => [
                  i.reference,
                  i.clientName,
                  i.clientEmail,
                  i.amount,
                  i.currency,
                  i.stage,
                  i.status,
                  i.dueDate ? new Date(i.dueDate).toISOString() : "",
                ]),
              )
            }
          />

          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(i) => i._id}
            actions={actions}
            caption="Invoices"
            empty={
              <div className="space-y-3">
                <p className="admin-section-title">No invoices yet</p>
                <p className="text-[13px] text-secondary">
                  Create a pair from a won lead — deposit and balance together.
                </p>
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-canvas transition-opacity duration-hover ease-hover hover:opacity-90"
                >
                  New invoice pair
                </button>
              </div>
            }
          />
        </>
      )}

      {/*
        The gesture lives here now, not on the row. Each of these is a thing
        you cannot cleanly take back — a client emailed, a money record
        closed, an invoice cancelled — so each still asks for a slide. The
        difference is that you meet it once, after choosing the action, rather
        than on every row every time you open the page.
      */}
      {confirm ? (
        <ConfirmDialog
          title={
            confirm.kind === "issue"
              ? "Issue and email this invoice?"
              : confirm.kind === "paid"
                ? "Mark this invoice as paid?"
                : "Void this invoice?"
          }
          body={
            confirm.kind === "issue"
              ? `${confirm.invoice.clientName} gets an email with a payment link. This cannot be sent again from here.`
              : confirm.kind === "paid"
                ? "This closes the money record and stops the chasing. Telling a client they still owe you afterwards is a conversation nobody wants."
                : "The invoice stops being payable. Redemption and history are kept."
          }
          what={`invoice ${confirm.invoice.reference}`}
          onConfirm={async () => {
            if (confirm.kind === "paid") {
              await setStatus({ id: confirm.invoice._id, status: "paid" });
              return;
            }
            if (confirm.kind === "void") {
              await setStatus({ id: confirm.invoice._id, status: "void" });
              return;
            }
            const res = await fetch("/api/stripe/issue", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: confirm.invoice._id }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error ?? "Could not issue that.");
            /*
             * Raised but possibly not emailed. The route cannot run again for
             * this invoice, so a failed send has to surface now rather than a
             * fortnight later when nobody has paid.
             */
            if (body.emailed === false) {
              window.alert(
                body.warning ??
                  "Issued, but the email did not send. Send the link by hand.",
              );
            }
          }}
          onClose={() => setConfirm(null)}
        />
      ) : null}

      {creating ? <CreatePairDialog onClose={() => setCreating(false)} /> : null}
      {linking ? <PaymentLinkDialog onClose={() => setLinking(false)} /> : null}
    </div>
  );
}

/**
 * Status control. Everything except "paid" is an ordinary select, because
 * those transitions are reversible. Marking paid gets the gesture.
 */
/**
 * The status, as a badge. No controls.
 *
 * This cell used to hold a SlideToConfirm — 44px of gesture inside a table
 * row, which pushed every row to about 135px tall and made a list of six
 * invoices a full screen of scrolling. It also put the two least reversible
 * actions on the page (issue this, mark it settled) in the most prominent
 * position on every row.
 *
 * Both moved into the row's overflow menu, where each opens a confirmation
 * that still carries the gesture. Same friction, spent once you have already
 * said what you want rather than every time you look at the table.
 */
function StatusCell({ invoice }: { invoice: Doc<"invoices"> }) {
  const tone =
    invoice.status === "paid"
      ? "badge-live"
      : invoice.status === "overdue"
        ? "badge-hot"
        : invoice.status === "void"
          ? "badge-cold"
          : "";

  return (
    <span className={`badge ${tone}`}>
      {invoice.status}
      {invoice.status === "paid" && invoice.paidAt ? (
        <span className="text-secondary">
          {new Date(invoice.paidAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          })}
        </span>
      ) : null}
    </span>
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
              {/* One sentence, true for every tier now that wallets are not
                  gated. It used to say "Wallets are Enterprise only" on five
                  of the six options. */}
              Card, Link, Apple Pay and Google Pay in the portal.
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
            className="text-sm text-secondary transition-colors duration-hover ease-hover hover:text-primary"
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
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-canvas transition-opacity duration-hover ease-hover hover:opacity-90 disabled:opacity-40"
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
              className="hairline rounded-full px-3 py-1 text-xs text-primary transition-colors duration-hover ease-hover hover:bg-surface-2"
            >
              {copied === row._id ? "Copied" : "Copy link"}
            </button>

            <a
              href={row.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-accent transition-opacity duration-hover ease-hover hover:opacity-80"
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
