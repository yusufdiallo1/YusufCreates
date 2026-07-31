import { NextResponse } from "next/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api } from "@/lib/convex-api";
import { getStripe, toMinorUnits } from "@/lib/stripe";

/**
 * One-off payment link for an arbitrary amount.
 *
 * Separate from the invoice flow on purpose. An invoice is a record with a
 * reference, a due date and a deposit/balance stage; this is for the case
 * where none of that applies — a deposit agreed on a call, an extra day of
 * work, a small fixed piece.
 *
 * Uses Payment Links rather than Checkout Sessions: a session expires after
 * 24 hours, and a link sent by email is routinely opened days later.
 */

export const runtime = "nodejs";

/** A ceiling, because a typo here is a real charge. */
const MAX_AMOUNT = 100_000;

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured." },
      { status: 503 },
    );
  }

  // Re-verified from the session token. The amount is caller-supplied, so
  // without this anyone could mint a payment link in your name.
  const token = await convexAuthNextjsToken();
  const allowed = await fetchQuery(api.admin.amIAdmin, {}, { token }).catch(
    () => false,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  let body: {
    amount?: number;
    currency?: string;
    description?: string;
    /** Who the link is for. Recorded only — Stripe never sees it. */
    forWhom?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const amount = Number(body.amount);
  const currency = (body.currency || "USD").toLowerCase();
  const description = body.description?.trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "Enter an amount above zero." },
      { status: 400 },
    );
  }
  if (amount > MAX_AMOUNT) {
    return NextResponse.json(
      { error: `That is over the ${MAX_AMOUNT.toLocaleString()} ceiling.` },
      { status: 400 },
    );
  }
  if (!description) {
    return NextResponse.json(
      { error: "A description is required — the client sees it." },
      { status: 400 },
    );
  }

  try {
    // price_data inline rather than a catalogue price: this is a one-off
    // figure, and creating a permanent Price for it would fill the dashboard
    // with single-use entries.
    const link = await stripe.paymentLinks.create({
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: toMinorUnits(amount, currency),
            product_data: { name: description },
          },
        },
      ],
      // Wallets are enabled per account rather than per link; Apple Pay and
      // Google Pay appear automatically once the domain is verified.
      after_completion: {
        type: "hosted_confirmation",
        hosted_confirmation: {
          custom_message:
            "Thanks — that's received. I'll be in touch shortly.",
        },
      },
      metadata: { source: "admin_custom_link" },
    });

    /*
     * Saved before responding.
     *
     * The link used to exist only in this response — close the tab and the
     * URL was unrecoverable, with no record that money had been asked for.
     *
     * A failure here must not fail the request: the link is already live in
     * Stripe and returning an error would suggest otherwise. It is logged
     * instead, and the URL still reaches the caller.
     */
    try {
      await fetchMutation(
        api.paymentLinks.record,
        {
          stripeId: link.id,
          url: link.url,
          label: description,
          amount: toMinorUnits(amount, currency),
          currency,
          forWhom: typeof body.forWhom === "string" ? body.forWhom : undefined,
        },
        { token: await convexAuthNextjsToken() },
      );
    } catch (err) {
      console.error("[stripe] link created but not recorded:", err);
    }

    return NextResponse.json({ ok: true, url: link.url, id: link.id });
  } catch (err) {
    console.error("[stripe] payment link failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not create that link.",
      },
      { status: 502 },
    );
  }
}
