export type ClassValue = string | false | null | undefined | ClassValue[];

export type BillingInterval = "month" | "year";

export interface PricingTier {
  id: string;
  name: string;
  description: string;
  /** Price in minor units (cents), keyed by billing interval. */
  price: Record<BillingInterval, number>;
  /** Stripe price IDs, keyed by billing interval. */
  stripePriceId: Record<BillingInterval, string | undefined>;
  features: string[];
  highlighted?: boolean;
}
