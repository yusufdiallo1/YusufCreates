/**
 * Pricing. Every number on the pricing page comes from here — components hold
 * no prices of their own.
 *
 * Base prices are in USD. SAR and AED are pegged, so conversion is exact
 * rather than a live rate, and the published figures are rounded to the
 * nearest sensible unit so nobody sees "3,374.99".
 */

export type Currency = "USD" | "SAR" | "AED";
export type TierId =
  | "launch"
  | "growth"
  | "app"
  | "native"
  | "enterprise"
  | "care";

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

/**
 * Growth tier.
 *
 * TWO prices, not a per-page formula. Three pages is one figure; four through
 * nine is another, flat.
 *
 * The old model charged 450 for every page above three, so nine pages came to
 * 4,500 — more than the web-app tier, which is absurd. It also made the price
 * unpredictable: a client adding one page mid-project triggered a
 * conversation about money rather than a decision about the site.
 *
 * Flat pricing above four removes both problems. The honest reason it works
 * commercially is that most of the cost is design, build setup and deployment,
 * which do not scale with page count — the ninth page genuinely is not much
 * more work than the fifth.
 */
export const GROWTH = {
  minPages: 3,
  maxPages: 9,
  /** Exactly three pages. */
  basePrice: 750,
  /** Four through nine, flat. */
  extendedPrice: 950,
  /** Above which the flat price applies. */
  flatFrom: 4,
} as const;

/**
 * USD base prices.
 *
 * Lowered across the board. The previous ladder started at 900 and reached
 * 13,000, which reads as agency pricing from a one-person studio — and the
 * site's own positioning is "founders who were quoted too much by an agency".
 * The numbers now match the pitch.
 */
const BASE_USD = {
  launch: 400,
  app: 2500,
  /**
   * Native iOS and macOS. Priced above the web app because it is a second
   * codebase with its own build, signing and distribution — but deliberately
   * not double, since the backend, auth and admin are shared with the web
   * build rather than rebuilt.
   */
  native: 3200,
  enterprise: 5500,
  care: 180,
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
  launch: { USD: 400, SAR: 1500, AED: 1475 },
  growth: { USD: 750, SAR: 2800, AED: 2750 },
  app: { USD: 2500, SAR: 9375, AED: 9175 },
  native: { USD: 3200, SAR: 12000, AED: 11750 },
  enterprise: { USD: 5500, SAR: 20625, AED: 20200 },
  care: { USD: 180, SAR: 675, AED: 660 },
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
  // Two steps, not a slope. Four pages and nine pages cost the same, so a
  // client can add a page without it becoming a negotiation.
  return clamped >= GROWTH.flatFrom ? GROWTH.extendedPrice : GROWTH.basePrice;
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

/**
 * Every plan includes authentication and an admin area where the project
 * needs one. That is not an upsell — a site whose owner cannot change their
 * own content is a site that decays, and handing over something you have to
 * email me to edit is not finished work.
 */
const EVERY_PLAN = [
  "Sign-in and accounts where the project needs them",
  "Admin area you actually control",
  "Yours outright on final payment",
];

export const BUILD_TIERS: BuildTier[] = [
  {
    id: "launch",
    name: "Launch",
    blurb: "One page, done properly.",
    priceUsd: BASE_USD.launch,
    features: [
      "Landing page or one-pager",
      "Contact form that reaches you",
      "SEO basics and social preview",
      "Fast on a phone, not just a laptop",
      "Deployed and handed over",
      ...EVERY_PLAN,
    ],
  },
  {
    id: "growth",
    name: "Growth",
    blurb: "A full site, three to nine pages.",
    popular: true,
    features: [
      "Everything in Launch",
      "Blog and pages you can edit yourself",
      "Multi-page structure and navigation",
      "Analytics without a cookie banner",
      "Same price from four pages to nine",
      ...EVERY_PLAN,
    ],
  },
  {
    id: "app",
    name: "Web app",
    blurb: "Software, not a brochure.",
    priceUsd: BASE_USD.app,
    from: true,
    features: [
      "Accounts, roles and permissions",
      "Database and real-time updates",
      "Card payments and subscriptions",
      "Dashboards and reporting",
      "Third-party integrations",
      ...EVERY_PLAN,
    ],
  },
  {
    id: "native",
    name: "iOS and macOS app",
    blurb: "A real native app, not a wrapped website.",
    priceUsd: BASE_USD.native,
    from: true,
    features: [
      "Native iOS, macOS, or both",
      "Shares its backend with your web app",
      "Offline support and local storage",
      "Push notifications",
      "Signed builds, distributed directly to your users",
      "Not published to the App Store — no review, no store fees",
      ...EVERY_PLAN,
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
