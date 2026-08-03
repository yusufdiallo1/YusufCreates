import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { getStripe } from "@/lib/stripe";

/**
 * A PaymentIntent for a build deposit, paid inside the portal.
 *
 * Embedded rather than a hosted redirect: the client stays on our domain and
 * never gets handed to another site in the middle of paying. It matters more
 * here than elsewhere because paying is what starts the two-hour clock — a
 * detour through a third-party page is time on their side of the deadline.
 *
 * The amount is read from the build row on the SERVER and never taken from
 * the request. A client-supplied amount is a client-supplied price.
 */

export const runtime = "nodejs";

/**
 * Only an approved, unpaid build can produce an intent.
 *
 * pending_approval must not be payable — the whole point of the approval gate
 * is that nobody pays for work I have not agreed to take on. Anything already
 * paid, delivered or cancelled has nothing to charge for.
 */
const PAYABLE = new Set(["awaiting_payment"]);

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe || !isConvexConfigured) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  let body: { token?: string; stage?: string };
  try {
    body = (await request.json()) as { token?: string; stage?: string };
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const token = body.token?.trim();
  if (!token) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  /*
   * A lookup FAILURE and a missing build are different answers.
   *
   * Unwrapped, a transient Convex error threw out of the handler and became
   * a bare 500 on the screen where the client is trying to pay. But folding
   * it into the 404 below would be worse than the crash: it would tell
   * someone holding a valid link that their build does not exist, when the
   * truth is that the lookup did not complete and retrying will work.
   */
  let build;
  try {
    build = await fetchQuery(api.express.byToken, { token });
  } catch {
    return NextResponse.json(
      { error: "Could not reach your build just now. Try again in a moment." },
      { status: 503 },
    );
  }

  if (!build) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  /*
   * Which instalment this is, decided from the BUILD, not from the request.
   *
   * The client asks for a stage but does not get to choose one: a caller who
   * could pick "deposit" on a delivered build would settle a $34.50 balance
   * for whatever the deposit happened to be. The row's own state is the only
   * thing that decides what is owed.
   */
  const balanceDue =
    build.status === "delivered" &&
    !build.balanceWaived &&
    !build.balancePaidAt &&
    build.balanceAmount > 0;

  if (balanceDue) {
    /*
     * Stripe rejects for reasons that are configuration, not client error:
     * a currency not enabled on the account, an amount under that currency's
     * minimum. Unwrapped those surfaced as a 500 on the pay screen, which
     * tells the person with their card out nothing at all.
     */
    try {
      const intent = await stripe.paymentIntents.create({
        amount: build.balanceAmount,
        currency: build.currency,
        // Card, Link and the card-backed wallets. See the deposit branch
        // below for why this is a fixed list rather than automatic.
        payment_method_types: ["card", "link"],
        metadata: { buildToken: token, kind: "build_balance" },
      });
      return NextResponse.json({ clientSecret: intent.client_secret });
    } catch (err) {
      console.error("[stripe] balance intent failed:", err);
      return NextResponse.json(
        { error: "Could not start that payment. Please try again." },
        { status: 502 },
      );
    }
  }

  if (!PAYABLE.has(build.status)) {
    /*
     * Deliberately specific. "Not payable" on a brief that has not been
     * approved yet reads as a fault; saying which state it is in explains why
     * there is no pay button and stops the support email.
     */
    return NextResponse.json(
      {
        error:
          build.status === "pending_approval"
            ? "This brief has not been approved yet."
            : "This build is not awaiting payment.",
      },
      { status: 409 },
    );
  }

  // Same guard as the balance branch: a Stripe rejection here is a
  // configuration problem, and a 500 on the pay screen explains none of it.
  try {
    const intent = await stripe.paymentIntents.create({
      amount: build.depositAmount,
      currency: build.currency,
    /*
     * Card and Link only — which is what gets Apple Pay, not what blocks it.
     *
     * The previous comment here had this backwards. Apple Pay and Google Pay
     * are not payment method types of their own: they are tokenised CARDS,
     * so they ride on "card" and appear on any device that can offer them.
     * Listing card explicitly does not suppress them.
     *
     * What `automatic_payment_methods` actually did was let Stripe surface
     * everything enabled on the account, so the panel offered Amazon Pay and
     * Cash App Pay instead — and Amazon Pay then failed outright with "You
     * must provide a `return_url`", because it redirects off-site and this
     * flow confirms in place. The one screen that takes money was showing
     * two methods I did not want and one that could not complete.
     *
     * The other two Stripe routes have always pinned this same list.
     */
    payment_method_types: ["card", "link"],
    metadata: {
      // The webhook matches on this to mark the deposit paid and start the
      // clock. Without it a successful payment has nothing to attach to.
      buildToken: token,
      kind: "build_deposit",
    },
      // No receipt_email: byToken deliberately does not return the address,
      // so the client's own view cannot be used to read it back. Stripe
      // collects one during checkout anyway.
    });

    return NextResponse.json({ clientSecret: intent.client_secret });
  } catch (err) {
    console.error("[stripe] deposit intent failed:", err);
    return NextResponse.json(
      { error: "Could not start that payment. Please try again." },
      { status: 502 },
    );
  }
}
