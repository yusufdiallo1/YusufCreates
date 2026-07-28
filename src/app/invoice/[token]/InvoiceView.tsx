"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/lib/convex-api";
import { Logo } from "@/components/ui/Logo";
import { CopyButton } from "@/components/ui/CopyButton";
import { SlideToConfirm } from "@/components/ui/SlideToConfirm";
import type { BankDetails } from "@/lib/bank";

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
  markedSentAt?: number;
}

/**
 * Invoice detail. Bank details render here and nowhere else.
 *
 * The client confirms a transfer with SlideToConfirm — telling someone the
 * money has moved is not cleanly reversible, which is exactly the bar for the
 * gesture.
 */
export function InvoiceView({
  invoice,
  bank,
  token,
}: {
  invoice: Invoice;
  bank: BankDetails | null;
  token: string;
}) {
  const markSent = useMutation(api.invoices.markSent);
  const [confirmed, setConfirmed] = useState(Boolean(invoice.markedSentAt));

  const money = `${invoice.currency} ${invoice.amount.toLocaleString("en-US")}`;
  const stageLabel =
    invoice.stage === "deposit"
      ? "50% deposit — due before work starts"
      : "50% balance — due on completion";

  return (
    <main id="main" className="mx-auto max-w-2xl px-6 py-16">
      <Logo variant="lockup" className="h-7 w-auto" />

      <div className="hairline mt-10 rounded-xl bg-surface-1 p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h1 className="text-2xl">Invoice {invoice.reference}</h1>
            <p className="mt-1 text-sm text-secondary">{stageLabel}</p>
          </div>
          <p className="text-2xl tabular-nums">{money}</p>
        </div>

        <dl className="hairline-t mt-8 space-y-3 pt-6 text-sm">
          <Row label="Billed to" value={invoice.clientName} />
          <Row label="Email" value={invoice.clientEmail} />
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
          <Row label="Status" value={invoice.status === "paid" ? "Paid" : "Awaiting payment"} />
        </dl>
      </div>

      {invoice.status === "paid" ? (
        <p className="mt-8 text-center text-sm text-secondary">
          This invoice is settled. Nothing further is needed.
        </p>
      ) : bank ? (
        <div className="hairline mt-6 rounded-xl bg-surface-1 p-8">
          <h2 className="text-lg">Pay by bank transfer</h2>
          <p className="mt-2 text-sm text-secondary">
            Quote{" "}
            <span className="text-primary">{invoice.reference}</span> as the
            payment reference so I can match it.
          </p>

          <dl className="mt-6 space-y-3 text-sm">
            <Row label="Account name" value={bank.accountName} copy />
            <Row label="Bank" value={bank.bankName} />
            {bank.bankAddress ? (
              <Row label="Bank address" value={bank.bankAddress} copy />
            ) : null}
            <Row label="Reference" value={invoice.reference} copy />
          </dl>

          {/* One block per rail. Domestic and international details are not
              interchangeable — handing a US payer a SWIFT code, or an
              overseas payer an ACH number, is how a transfer bounces a week
              later. Each rail is labelled with who it is for. */}
          {bank.rails.map((rail) => (
            <div key={rail.label} className="hairline-t mt-6 pt-5">
              <h3 className="text-sm text-primary">{rail.label}</h3>
              {rail.note ? (
                <p className="mt-1 text-xs text-secondary">{rail.note}</p>
              ) : null}
              <dl className="mt-3 space-y-3 text-sm">
                {rail.rows.map((row) => (
                  <Row key={row.label} label={row.label} value={row.value} copy />
                ))}
              </dl>
            </div>
          ))}

          {/* Only a domestic rail is configured, so say so rather than
              leaving an overseas client to guess or send a doomed payment. */}
          {bank.rails.length === 1 && bank.rails[0].label.includes("US") ? (
            <p className="mt-5 text-xs text-secondary">
              Paying from outside the US? Reply to the invoice email and
              I&apos;ll send international details.
            </p>
          ) : null}

          <div className="mt-10">
            {confirmed ? (
              <p className="text-sm text-secondary">
                Thanks — I&apos;ll confirm as soon as it lands, usually within a
                working day.
              </p>
            ) : (
              <SlideToConfirm
                purpose="to-payment"
                label="Slide to confirm you have sent the transfer"
                completedLabel="Transfer confirmed"
                pendingLabel="Recording"
                ariaLabel={`Slide to confirm you have sent the transfer for invoice ${invoice.reference}`}
                onConfirm={async () => {
                  await markSent({ token });
                  setConfirmed(true);
                }}
              />
            )}
          </div>
        </div>
      ) : (
        <p className="mt-8 text-sm text-secondary">
          Payment details are not configured yet. Email hello@yusufcreates.com
          and I will send them directly.
        </p>
      )}

      <p className="mt-10 text-center text-xs text-secondary">
        Questions about this invoice? Reply to the email it came from, or write
        to hello@yusufcreates.com.
      </p>
    </main>
  );
}

function Row({
  label,
  value,
  copy = false,
}: {
  label: string;
  value: string;
  copy?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <dt className="w-32 shrink-0 text-secondary">{label}</dt>
      <dd className="text-primary">
        {copy ? (
          <CopyButton value={value} className="-ml-2">
            {value}
          </CopyButton>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
