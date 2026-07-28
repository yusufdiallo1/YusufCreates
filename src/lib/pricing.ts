/**
 * Pricing. Every number on the pricing page comes from here — components hold
 * no prices of their own.
 *
 * Base prices are in USD. SAR and AED are pegged, so conversion is exact
 * rather than a live rate, and the published figures are rounded to the
 * nearest sensible unit so nobody sees "3,374.99".
 */

export type Currency = "USD" | "SAR" | "AED";
export type TierId = "launch" | "growth" | "app" | "enterprise" | "care";

/** Pegged rates. Both currencies are fixed against the dollar. */
export const RATES: Record<Currency, number> = {
  USD: 1,
  SAR: 3.75,
  AED: 3.67,
};

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  USD: "$",
  SAR: "SAR ",
  AED: "AED ",
};

export const CURRENCIES: Currency[] = ["USD", "SAR", "AED"];

/** Growth tier page bounds and the formula constants. */
export const GROWTH = {
  minPages: 3,
  maxPages: 9,
  basePrice: 1800,
  perExtraPage: 450,
} as const;

/** USD base prices. Anything shown in another currency derives from these. */
const BASE_USD = {
  launch: 900,
  app: 6000,
  enterprise: 13000,
  care: 450,
} as const;

/**
 * Published prices, where they differ from a strict peg conversion.
 *
 * The pegged rates give e.g. 13,000 USD -> 48,750 SAR, but the price quoted in
 * market is 49,000. These are commercial decisions, not arithmetic, so the
 * published figure wins and the conversion is only a fallback for amounts not
 * listed here (notably the Growth slider, which is genuinely computed).
 */
const PUBLISHED: Partial<Record<TierId, Record<Currency, number>>> = {
  launch: { USD: 900, SAR: 3375, AED: 3300 },
  app: { USD: 6000, SAR: 22500, AED: 22000 },
  enterprise: { USD: 13000, SAR: 49000, AED: 48000 },
  care: { USD: 450, SAR: 1690, AED: 1650 },
};

/** Published price for a fixed tier, falling back to the pegged conversion. */
export function tierPrice(tier: TierId, currency: Currency): number {
  const published = PUBLISHED[tier];
  if (published) return published[currency];
  return convert(BASE_USD[tier as keyof typeof BASE_USD], currency);
}

/** Formatted published price for a fixed tier. */
export function formatTierPrice(tier: TierId, currency: Currency): string {
  return `${CURRENCY_SYMBOL[currency]}${tierPrice(tier, currency).toLocaleString("en-US")}`;
}

/**
 * Growth price for a given page count: 1800 at 3 pages, +450 per page after.
 * The count is clamped so an out-of-range value cannot produce a nonsense
 * figure.
 */
export function growthPriceUsd(pages: number): number {
  const clamped = Math.min(
    GROWTH.maxPages,
    Math.max(GROWTH.minPages, Math.round(pages)),
  );
  return GROWTH.basePrice + GROWTH.perExtraPage * (clamped - GROWTH.minPages);
}

/**
 * Convert a USD amount to the target currency.
 *
 * Rounded to the nearest 25 for SAR and AED so published prices land on clean
 * numbers, which is how they are quoted in market.
 */
export function convert(usd: number, currency: Currency): number {
  if (currency === "USD") return usd;
  const raw = usd * RATES[currency];
  return Math.round(raw / 25) * 25;
}

/** Format an amount for display, with thousands separators and no decimals. */
export function formatPrice(usd: number, currency: Currency): string {
  const amount = convert(usd, currency);
  return `${CURRENCY_SYMBOL[currency]}${amount.toLocaleString("en-US")}`;
}

/** The raw converted number, for animating figures without the symbol. */
export function priceValue(usd: number, currency: Currency): number {
  return convert(usd, currency);
}

export function tierPriceUsd(tier: Exclude<TierId, "growth">): number {
  return BASE_USD[tier];
}

export interface BuildTier {
  id: TierId;
  name: string;
  blurb: string;
  /** Undefined for Growth, which is computed from the page slider. */
  priceUsd?: number;
  /** Shown as "From $6,000" rather than a fixed figure. */
  from?: boolean;
  features: string[];
  popular?: boolean;
}

export const BUILD_TIERS: BuildTier[] = [
  {
    id: "launch",
    name: "Launch",
    blurb: "One page, done properly.",
    priceUsd: BASE_USD.launch,
    features: [
      "Landing page or one-pager",
      "Blog",
      "Contact form",
      "SEO basics",
      "Mobile-first",
      "Deployed and handed over",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    blurb: "A full site, three to nine pages.",
    popular: true,
    features: [
      "Everything in Launch",
      "CMS you can actually use",
      "Multi-page information architecture",
      "Analytics and reporting",
      "Page count set by you",
    ],
  },
  {
    id: "app",
    name: "Web app / SaaS MVP",
    blurb: "Software, not a brochure.",
    priceUsd: BASE_USD.app,
    from: true,
    features: [
      "Authentication",
      "Database",
      "Stripe payments",
      "Dashboards",
      "API integrations",
    ],
  },
];

export const ENTERPRISE_FEATURES = [
  "Up to 25 pages, scoped in the proposal",
  "Bilingual English and Arabic with full RTL mirroring",
  "Design system and component library handover",
  "CMS with multi-user roles and approval workflows",
  "WCAG 2.2 AA accessibility",
  "Custom integrations, CRM and ERP",
  "Staging environment and staged rollout",
  "Security questionnaire support, NDA, SSO",
  "Dedicated Slack channel, priority response",
  "Team training session plus written documentation",
  "30 days post-launch support",
  "Uptime and performance SLA with an active Care Plan",
];

export const CARE_FEATURES = [
  "Hosting and maintenance",
  "Unlimited small edits",
  "SEO monitoring",
  "Monthly analytics report",
  "Priority support",
];

export const ENTERPRISE_PRICE_USD = BASE_USD.enterprise;
export const CARE_PRICE_USD = BASE_USD.care;

/** Best-guess currency from the visitor's locale. Always overridable. */
export function currencyFromLocale(locale: string | undefined): Currency {
  if (!locale) return "USD";
  const region = locale.split("-")[1]?.toUpperCase();
  if (region === "SA") return "SAR";
  if (region === "AE") return "AED";
  return "USD";
}
