import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { getStripe, toMinorUnits } from "@/lib/stripe";

/**
 * Creates a PaymentIntent so an invoice can be paid inside the client portal.
 *
 * This exists alongside the hosted Stripe invoice rather than replacing it.
 * The hosted page is the fallback for anyone paying from an emailed link; this
 * is the embedded route, where the client stays on our domain and never sees a
 * handover to another site mid-payment.
 *
 * It is also the only place wallet availability can be enforced. Apple Pay and
 * Google Pay ride on the "card" method and cannot be excluded per transaction
 * through the Invoices API — but Elements accepts a `wallets` hash, so the
 * Enterprise-only rule is actually enforceable here.
 */

export const runtime = "nodejs";

/**
 * Tiers whose clients are offered Apple Pay and Google Pay.
 *
 * Withholding a wallet does not withhold payment: every plan can pay by card
 * or Link, same rail, same speed, same fee. The wallet is a convenience sold
 * with Enterprise.
 */
const WALLET_TIERS = new Set(["enterprise"]);

/** Statuses that still owe money. Anything else must not produce an intent. */
const PAYABLE = new Set(["sent", "overdue", "draft"]);

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe || !isConvexConfigured) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  if (!token) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  /*
   * The amount comes from the invoice the token resolves to — never from the
   * request. A client-supplied figure would let anyone pay one pound against a
   * five-thousand pound invoice, and the webhook would faithfully record it as
   * settled.
   */
  const invoice = await fetchQuery(api.invoices.getByToken, { token }).catch(
    () => null,
  );

  if (!invoice) {
    return NextResponse.json({ error: "No such invoice." }, { status: 404 });
  }

  if (invoice.status === "paid") {
    return NextResponse.json({ error: "Already paid." }, { status: 409 });
  }

  if (!PAYABLE.has(invoice.status)) {
    return NextResponse.json({ error: "Not payable." }, { status: 409 });
  }

  const wallets = WALLET_TIERS.has(invoice.tier ?? "");

  try {
    const intent = await stripe.paymentIntents.create(
      {
        amount: toMinorUnits(invoice.amount, invoice.currency),
        currency: invoice.currency.toLowerCase(),
        description: `${invoice.description} — ${
          invoice.stage === "deposit" ? "40% deposit" : "balance on completion"
        }`,
        /*
         * Wallets are suppressed for non-Enterprise by listing the methods
         * explicitly. Automatic methods would let Stripe surface whatever is
         * enabled on the account, which is exactly the behaviour being gated.
         */
        payment_method_types: ["card", "link"],
        metadata: {
          convexInvoiceId: invoice._id,
          reference: invoice.reference,
          stage: invoice.stage,
          tier: invoice.tier ?? "",
        },
        receipt_email: invoice.clientEmail,
      },
      /*
       * Keyed on the invoice, so a client who reloads the portal or
       * double-taps Pay gets the same intent rather than a second charge.
       */
      { idempotencyKey: `pi:${invoice._id}` },
    );

    return NextResponse.json({
      clientSecret: intent.client_secret,
      amount: invoice.amount,
      currency: invoice.currency,
      reference: invoice.reference,
      stage: invoice.stage,
      wallets,
    });
  } catch {
    // Deliberately vague to the client; Stripe's own error text can name
    // account configuration details that are not theirs to see.
    return NextResponse.json(
      { error: "Could not start the payment." },
      { status: 502 },
    );
  }
}
