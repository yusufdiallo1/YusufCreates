"use client";

import { useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { SlideToConfirm } from "@/components/ui/SlideToConfirm";

interface Invoice {
  _id: string;
  clientName: string;
  clientEmail: string;
  description: string;
  amount: number;
  currency: string;
  stage: "deposit" | "balance";
  status: string;
  reference: string;
  dueDate?: number;
  issuedAt?: number;
  paidAt?: number;
  stripeHostedUrl?: string;
  stripePdfUrl?: string;
  paymentMethodUsed?: string;
  declineReason?: string;
}

/**
 * Invoice detail.
 *
 * Payment happens on Stripe's hosted invoice page, not here. Building a card
 * form would mean taking on SCA and PCI compliance for no benefit — the hosted
 * page already handles 3-D Secure, and it is where Apple Pay, Google Pay and
 * Link actually appear.
 *
 * The slide is the deliberate step before leaving for that page. Paying is not
 * cleanly reversible, which is exactly the bar for the gesture.
 */
export function InvoiceView({ invoice }: { invoice: Invoice }) {
  const [leaving, setLeaving] = useState(false);

  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: invoice.currency || "USD",
    maximumFractionDigits: 0,
  }).format(invoice.amount);

  const stageLabel =
    invoice.stage === "deposit"
      ? "40% deposit — due before work starts"
      : "60% balance — due on completion";

  const paid = invoice.status === "paid";

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <Logo variant="mark" className="h-7 w-auto" />

      <div className="mt-10">
        <p className="font-mono text-xs tracking-[0.06em] text-secondary">
          {invoice.reference}
        </p>
        <h1 className="mt-3 text-3xl">{money}</h1>
        <p className="mt-2 text-sm text-secondary">{stageLabel}</p>
      </div>

      <dl className="mt-10 space-y-3 text-sm">
        <Row label="Billed to" value={invoice.clientName} />
        <Row label="For" value={invoice.description} />
        {invoice.dueDate ? (
          <Row
            label="Due"
            value={new Date(invoice.dueDate).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          />
        ) : null}
      </dl>

      {paid ? (
        <div className="glass-depth glass-far glass-panel mt-10 p-6">
          <h2 className="text-lg text-primary">Paid</h2>
          <p className="mt-2 text-sm text-secondary">
            Received{" "}
            {invoice.paidAt
              ? new Date(invoice.paidAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : ""}
            . Nothing further is needed.
          </p>
          {invoice.stripePdfUrl ? (
            <a
              href={invoice.stripePdfUrl}
              className="mt-5 inline-block text-sm text-accent transition-colors duration-hover ease-hover hover:text-primary"
            >
              Download receipt
            </a>
          ) : null}
        </div>
      ) : invoice.stripeHostedUrl ? (
        <div className="glass-depth glass-near glass-panel mt-10 p-7">
          <h2 className="text-lg text-primary">Pay by card</h2>
          <p className="mt-2 text-sm text-secondary">
            Card, Apple&nbsp;Pay, Google&nbsp;Pay or Link. Payment is handled by
            Stripe — card details never reach this site.
          </p>

          {invoice.declineReason ? (
            <p className="mt-4 text-sm text-[color:var(--text-notice)]">
              {invoice.declineReason}
            </p>
          ) : null}

          <div className="mt-7">
            <SlideToConfirm
              purpose="to-payment"
              ariaLabel={`Slide to pay ${money} for invoice ${invoice.reference}`}
              disabled={leaving}
              onConfirm={async () => {
                setLeaving(true);
                // Stays pending until the browser actually leaves, so the
                // control never reads as finished while nothing has happened.
                window.location.href = invoice.stripeHostedUrl!;
                await new Promise((r) => setTimeout(r, 4000));
              }}
            />
          </div>

          {invoice.amount >= 5000 ? (
            <p className="mt-5 text-xs text-secondary">
              Banks often hold a first card payment this size. If it declines, a
              call to the number on your card clears it — it is not a problem
              with this invoice.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-10 text-sm text-secondary">
          This invoice has not been issued for payment yet.
        </p>
      )}

      <p className="mt-12 text-xs text-secondary">
        Questions? Reply to the email this link came from, or write to{" "}
        <a href="mailto:hello@yusufcreates.com" className="text-accent">
          hello@yusufcreates.com
        </a>
        .
      </p>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4">
      <dt className="w-24 shrink-0 text-secondary">{label}</dt>
      <dd className="min-w-0 break-words text-primary">{value}</dd>
    </div>
  );
}
