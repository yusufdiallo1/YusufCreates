import "server-only";
import Stripe from "stripe";

/**
 * Stripe client.
 *
 * `server-only` is load-bearing: STRIPE_SECRET_KEY must never be reachable
 * from a client component, and this makes an accidental client import a build
 * error rather than a leaked key that charges cards.
 *
 * Returns null when unconfigured rather than throwing at import time, so a
 * fresh clone still builds and the rest of the site still runs.
 */

let client: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  client ??= new Stripe(key, {
    // Pinned to the version this SDK was built against. Leaving it unset lets
    // Stripe change response shapes under a deployed app, and payment code is
    // the last place to want that. Bump deliberately, with the SDK.
    apiVersion: "2026-06-24.dahlia",
    typescript: true,
  });
  return client;
}

export const isStripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

/**
 * Which wallet actually paid, from the charge's payment method details.
 *
 * Stripe reports Apple Pay and Google Pay as a `card` with a `wallet` sub-type
 * rather than as distinct methods, so reading `type` alone would record every
 * wallet payment as a plain card.
 */
export function readPaymentMethod(
  charge: Stripe.Charge,
): "card" | "apple_pay" | "google_pay" | "link" | undefined {
  const details = charge.payment_method_details;
  if (!details) return undefined;
  if (details.type === "link") return "link";
  if (details.type === "card") {
    const wallet = details.card?.wallet?.type;
    if (wallet === "apple_pay") return "apple_pay";
    if (wallet === "google_pay") return "google_pay";
    return "card";
  }
  return undefined;
}

/**
 * Turns a Stripe decline code into something a client can act on.
 *
 * The raw codes are for developers. Someone whose card was declined needs to
 * know whether to try another card or phone their bank, and large project
 * invoices are declined by issuers constantly — a $13,000 charge trips fraud
 * rules on most consumer cards by default.
 */
export function explainDecline(code: string | null | undefined): string {
  switch (code) {
    case "insufficient_funds":
      return "The card was declined for insufficient funds.";
    case "card_velocity_exceeded":
      return "The bank declined this as an unusually large or frequent charge. Calling the number on the card usually clears it in a minute.";
    case "do_not_honor":
    case "generic_decline":
      return "The bank declined the charge without giving a reason. For an amount this size that is usually a fraud hold — a quick call to the bank authorises it.";
    case "expired_card":
      return "That card has expired.";
    case "incorrect_cvc":
      return "The security code did not match.";
    case "processing_error":
      return "The bank had a processing error. Trying again usually works.";
    case "authentication_required":
      return "The bank needs you to confirm this payment. Opening the invoice again will prompt you.";
    default:
      return "The payment did not go through. Trying another card, or calling your bank, usually resolves it.";
  }
}

/** Amounts cross the Stripe boundary in minor units. */
export function toMinorUnits(amount: number, currency: string): number {
  // Zero-decimal currencies must not be multiplied — sending 100000 for a
  // ¥1,000 invoice would charge a hundred times the intended amount.
  const zeroDecimal = new Set([
    "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw",
    "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
  ]);
  return zeroDecimal.has(currency.toLowerCase())
    ? Math.round(amount)
    : Math.round(amount * 100);
}

export function fromMinorUnits(amount: number, currency: string): number {
  const zeroDecimal = new Set([
    "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw",
    "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
  ]);
  return zeroDecimal.has(currency.toLowerCase()) ? amount : amount / 100;
}
