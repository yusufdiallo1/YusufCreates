import type { BillingInterval, PricingTier } from "./types";

/**
 * Pricing catalogue. Prices are in minor units (cents).
 * Stripe price IDs come from env so staging and production can differ.
 */
export const PRICING_TIERS: PricingTier[] = [
  {
    id: "starter",
    name: "Starter",
    description: "For trying things out.",
    price: { month: 0, year: 0 },
    stripePriceId: { month: undefined, year: undefined },
    features: ["1 project", "Community support"],
  },
  {
    id: "pro",
    name: "Pro",
    description: "For working professionals.",
    price: { month: 2900, year: 29000 },
    stripePriceId: {
      month: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY,
      year: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY,
    },
    features: ["Unlimited projects", "Email support", "Analytics"],
    highlighted: true,
  },
];

export function getTier(id: string): PricingTier | undefined {
  return PRICING_TIERS.find((tier) => tier.id === id);
}

/** Percentage saved by paying yearly instead of monthly. */
export function yearlySavingsPercent(tier: PricingTier): number {
  const monthlyTotal = tier.price.month * 12;
  if (monthlyTotal === 0) return 0;
  return Math.round(((monthlyTotal - tier.price.year) / monthlyTotal) * 100);
}

export function priceFor(tier: PricingTier, interval: BillingInterval): number {
  return tier.price[interval];
}
