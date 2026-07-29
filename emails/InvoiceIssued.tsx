import { Section } from "@react-email/components";
import { Shell, H1, P, Muted, Button, DetailRow, brand } from "./components/Shell";

/**
 * The invoice email. Carries the Stripe hosted payment link.
 *
 * Branded rather than Stripe's default, because the client should recognise
 * who is asking them for money — an unexpected Stripe-branded invoice is the
 * shape of a phishing email.
 *
 * Above roughly 5,000 it warns proactively that the bank may need to authorise
 * the charge. Issuers routinely decline large one-off card payments, and a
 * client who was told to expect it phones their bank instead of assuming the
 * invoice is broken.
 */

const LARGE_AMOUNT = 5000;

export function InvoiceIssued({
  name,
  reference,
  description,
  amount,
  currency,
  stage,
  payUrl,
}: {
  name: string;
  reference: string;
  description: string;
  amount: number;
  currency: string;
  stage: "deposit" | "balance";
  payUrl: string;
}) {
  const first = name.trim().split(/\s+/)[0] || "there";
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  }).format(amount);

  return (
    <Shell
      preview={`Invoice ${reference} — ${formatted}`}
      footerNote="You're receiving this because you have a project underway with Yusuf Creates."
    >
      <H1>
        {stage === "deposit" ? "Deposit invoice" : "Final invoice"} —{" "}
        {formatted}
      </H1>

      <P>
        Hi {first} — here&apos;s the{" "}
        {stage === "deposit"
          ? "40% deposit to get started"
          : "balance now the work is delivered"}
        . Card, Apple Pay, Google Pay or Link all work.
      </P>

      <Section
        style={{
          backgroundColor: brand.surface,
          borderRadius: "8px",
          padding: "18px 20px",
          margin: "0 0 20px",
        }}
      >
        <DetailRow label="Reference" value={reference} />
        <DetailRow label="For" value={description} />
        <DetailRow label="Amount" value={formatted} />
        <DetailRow label="Due" value="Within 14 days" />
      </Section>

      <P>
        <Button href={payUrl}>{`Pay ${formatted}`}</Button>
      </P>

      {amount >= LARGE_AMOUNT ? (
        <Muted>
          One thing worth knowing: banks often hold a card payment this size on
          the first attempt. If it declines, a quick call to the number on your
          card clears it — it is not a problem with the invoice.
        </Muted>
      ) : null}

      <Muted>
        Any questions about this invoice, just reply — it comes straight to me.
      </Muted>
    </Shell>
  );
}

export default InvoiceIssued;
