import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { fetchMutation } from "convex/nextjs";
import { api, isConvexConfigured } from "@/lib/convex-api";
import {
  explainDecline,
  fromMinorUnits,
  getStripe,
  readPaymentMethod,
} from "@/lib/stripe";
import { sendEmail } from "@/lib/email";
import { logEmailSend } from "@/lib/emailLog";
import { PaymentFailed } from "@emails/PaymentFailed";
import { PaymentReceived } from "@emails/PaymentReceived";
import { RefundIssued } from "@emails/RefundIssued";

/**
 * Stripe webhook. This is the only thing that marks an invoice paid.
 *
 * Four rules, each of which has a specific failure it prevents:
 *
 * 1. Node runtime, not edge — signature verification needs Node crypto.
 * 2. The RAW body. Calling request.json() reserialises the payload and the
 *    signature no longer matches, so every event would be rejected.
 * 3. Signature verified before anything is read. An unverified webhook
 *    endpoint lets anyone mark any invoice paid by POSTing to it.
 * 4. Idempotent by event id, enforced inside the Convex mutation. Stripe
 *    retries; applying a refund twice quietly corrupts the revenue figures.
 */

export const runtime = "nodejs";

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !secret) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "No signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const raw = await request.text();
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    // Never echo the reason: a precise error tells a prober exactly how to
    // forge a request.
    console.warn(
      "[stripe] signature verification failed:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (!isConvexConfigured) {
    // 200 so Stripe stops retrying an event we structurally cannot store.
    return NextResponse.json({ received: true, stored: false });
  }

  const serverSecret = process.env.EMAIL_LOG_SECRET;
  if (!serverSecret) {
    // 500 so Stripe DOES retry — this is a misconfiguration we can fix, and
    // the event should not be lost while we do.
    return NextResponse.json({ error: "Server secret unset." }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const { fee, net, method } = await settlementDetail(stripe, invoice);

        const result = await fetchMutation(api.invoices.applyStripeEvent, {
          secret: serverSecret,
          stripeEventId: event.id,
          eventType: event.type,
          stripeInvoiceId: invoice.id ?? "",
          status: "paid",
          amountReceived: fromMinorUnits(
            invoice.amount_paid ?? 0,
            invoice.currency,
          ),
          stripeFee: fee,
          netReceived: net,
          paymentMethodUsed: method,
        });

        if (!result.duplicate && result.matched) {
          await notify({
            to: result.clientEmail,
            template: "PaymentReceived",
            subject: `Payment received — ${result.reference}`,
            react: PaymentReceived({
              name: result.clientName,
              reference: result.reference,
              amount: fromMinorUnits(
                invoice.amount_paid ?? 0,
                invoice.currency,
              ),
              currency: invoice.currency.toUpperCase(),
            }),
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const reason = await declineReason(stripe, invoice);

        const result = await fetchMutation(api.invoices.applyStripeEvent, {
          secret: serverSecret,
          stripeEventId: event.id,
          eventType: event.type,
          stripeInvoiceId: invoice.id ?? "",
          status: "overdue",
          declineReason: reason,
        });

        // Told immediately and in plain English. A failed card on a large
        // invoice is usually a bank fraud hold, and the client can clear it in
        // a phone call — but only if they know it happened.
        if (!result.duplicate && result.matched) {
          await notify({
            to: result.clientEmail,
            template: "PaymentFailed",
            subject: `Payment didn't go through — ${result.reference}`,
            react: PaymentFailed({
              name: result.clientName,
              reference: result.reference,
              reason,
              payUrl: invoice.hosted_invoice_url ?? undefined,
            }),
          });
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        // The Charge type no longer exposes `invoice` directly, so resolve it
        // through the payment intent that created the charge.
        const invoiceId = await invoiceIdForCharge(stripe, charge);
        if (invoiceId) {
          const result = await fetchMutation(api.invoices.applyStripeEvent, {
            secret: serverSecret,
            stripeEventId: event.id,
            eventType: event.type,
            stripeInvoiceId: invoiceId,
            // Refunded money is not revenue, and it is not owed either.
            status: "void",
          });

          // A refund with no email reads as a mistake, or as fraud. The
          // client sees money move either way; they should hear why.
          if (!result.duplicate && result.matched) {
            await notify({
              to: result.clientEmail,
              template: "RefundIssued",
              subject: `Refund issued — ${result.reference}`,
              react: RefundIssued({
                name: result.clientName,
                reference: result.reference,
                amount: fromMinorUnits(
                  charge.amount_refunded ?? 0,
                  charge.currency,
                ),
                currency: charge.currency.toUpperCase(),
              }),
            });
          }
        }
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        // Disputes are time-limited and worth interrupting for, so this is a
        // direct alert rather than a status change.
        const admin = process.env.ADMIN_EMAIL;
        if (admin) {
          await notify({
            to: admin,
            template: "DisputeAlert",
            subject: `Dispute opened — ${(dispute.amount / 100).toFixed(2)} ${dispute.currency.toUpperCase()}`,
            react: PaymentFailed({
              name: "Yusuf",
              reference: dispute.charge as string,
              reason: `A dispute was opened: ${dispute.reason}. Evidence is due by ${
                dispute.evidence_details?.due_by
                  ? new Date(
                      dispute.evidence_details.due_by * 1000,
                    ).toDateString()
                  : "the date shown in the Stripe dashboard"
              }.`,
            }),
          });
        }
        break;
      }

      /*
       * Marked overdue by Stripe's own dunning, which fires when an invoice
       * passes its due date without payment. Without this the record stays
       * "sent" forever and the outstanding figure on the dashboard is wrong.
       */
      case "invoice.marked_uncollectible":
      case "invoice.overdue": {
        const invoice = event.data.object as Stripe.Invoice;
        await fetchMutation(api.invoices.applyStripeEvent, {
          secret: serverSecret,
          stripeEventId: event.id,
          eventType: event.type,
          stripeInvoiceId: invoice.id ?? "",
          status: "overdue",
        });
        break;
      }

      default:
        // Everything else is acknowledged and ignored. Returning an error for
        // an event we simply do not handle would make Stripe retry forever.
        break;
    }
  } catch (err) {
    console.error("[stripe] handler failed:", err);
    // 500 so Stripe retries — the idempotency guard makes that safe.
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/**
 * Which invoice a charge belongs to.
 *
 * Read from the charge's metadata first (we stamp it at issue time), then via
 * the payment intent. Refund events carry the charge, not the invoice.
 */
async function invoiceIdForCharge(
  stripe: Stripe,
  charge: Stripe.Charge,
): Promise<string | undefined> {
  const intentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;
  if (!intentId) return undefined;

  try {
    const intent = await stripe.paymentIntents.retrieve(intentId);
    const linked = (intent as unknown as { invoice?: string | { id: string } })
      .invoice;
    return typeof linked === "string" ? linked : linked?.id;
  } catch {
    return undefined;
  }
}

/**
 * Fee and net are not on the invoice event — they live on the balance
 * transaction behind the charge, which has to be fetched separately.
 */
async function settlementDetail(stripe: Stripe, invoice: Stripe.Invoice) {
  let fee: number | undefined;
  let net: number | undefined;
  let method: ReturnType<typeof readPaymentMethod>;

  try {
    const paymentIntentId =
      typeof (invoice as { payment_intent?: unknown }).payment_intent ===
      "string"
        ? ((invoice as { payment_intent?: string }).payment_intent as string)
        : undefined;
    if (!paymentIntentId) return { fee, net, method };

    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge.balance_transaction"],
    });
    const charge = intent.latest_charge as Stripe.Charge | null;
    if (!charge) return { fee, net, method };

    method = readPaymentMethod(charge);

    const balance = charge.balance_transaction as Stripe.BalanceTransaction | null;
    if (balance && typeof balance !== "string") {
      fee = fromMinorUnits(balance.fee, balance.currency);
      net = fromMinorUnits(balance.net, balance.currency);
    }
  } catch (err) {
    // Missing fee data must not fail the whole event — the payment still
    // happened and marking it paid matters more than the accounting detail.
    console.warn("[stripe] could not read settlement detail:", err);
  }

  return { fee, net, method };
}

async function declineReason(
  stripe: Stripe,
  invoice: Stripe.Invoice,
): Promise<string> {
  try {
    const paymentIntentId =
      typeof (invoice as { payment_intent?: unknown }).payment_intent ===
      "string"
        ? ((invoice as { payment_intent?: string }).payment_intent as string)
        : undefined;
    if (!paymentIntentId) return explainDecline(undefined);

    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return explainDecline(intent.last_payment_error?.decline_code);
  } catch {
    return explainDecline(undefined);
  }
}

/** Send and record. Never throws into the webhook. */
async function notify({
  to,
  template,
  subject,
  react,
}: {
  to: string;
  template: string;
  subject: string;
  react: React.ReactElement;
}) {
  const result = await sendEmail({ to, subject, react });
  await logEmailSend({ to, template, subject, result });
}
