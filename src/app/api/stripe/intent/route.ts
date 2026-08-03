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
 * Wallets ride on the "card" method and cannot be excluded per transaction
 * through the Invoices API, which is one reason payment lives here rather than
 * on the hosted page: Elements accepts an explicit `wallets` hash. They are
 * now offered on every tier — see PayPanel.
 */

export const runtime = "nodejs";

/* WALLET_TIERS is gone. It gated Apple Pay and Google Pay to Enterprise —
   the wrong way round, since wallets help most on the small invoices someone
   settles on a phone, not on a large one going through procurement. Wallets
   are now available on every tier. The enforcement point was the `wallets`
   hash in PayPanel, which this route fed. */

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

  try {
    const intent = await stripe.paymentIntents.create(
      {
        amount: toMinorUnits(invoice.amount, invoice.currency),
        currency: invoice.currency.toLowerCase(),
        description: `${invoice.description} — ${
          invoice.stage === "deposit" ? "40% deposit" : "balance on completion"
        }`,
        /*
         * Card, Link, and the card-backed wallets — on every tier.
         *
         * Two things were wrong here. The rule itself was backwards: wallets
         * were sold as an Enterprise convenience, but a $22k enterprise
         * invoice goes through procurement and will never be paid by thumb,
         * while a $69 express deposit is exactly the payment someone settles
         * on a phone in four seconds. The restriction was withholding the
         * feature from the invoices it helps most.
         *
         * Apple Pay and Google Pay are tokenised cards; they ride on "card"
         * and appear wherever the device can offer them. This list has never
         * been what excluded them — the old comment here claimed it was, and
         * was wrong. The actual gate was the `wallets` hash Elements takes,
         * in PayPanel, which is where it has been lifted.
         *
         * Automatic methods are still avoided so Stripe cannot surface a
         * redirect-based method into a flow that confirms in place.
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
      /* No `wallets` flag any more. The client no longer branches on it —
         wallets are offered on every tier, decided in PayPanel. */
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
