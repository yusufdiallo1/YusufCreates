/**
 * Pricing. Every number on the pricing page comes from here — components hold
 * no prices of their own.
 *
 * Base prices are in USD. SAR and AED are pegged, so conversion is exact
 * rather than a live rate, and the published figures are rounded to the
 * nearest sensible unit so nobody sees "3,374.99".
 */

export type Currency = "USD" | "SAR" | "AED" | "GBP" | "EUR";
export type TierId =
  | "launch"
  | "growth"
  | "app"
  | "native"
  | "enterprise"
  | "care";

/**
 * Rates against the dollar.
 *
 * SAR and AED are PEGGED — those two numbers are fixed by their central banks
 * and do not need maintaining.
 *
 * GBP and EUR FLOAT. The figures here are fallbacks; the live values are
 * settings rows (`rate.GBP`, `rate.EUR`) editable in the admin, because a
 * hardcoded floating rate is wrong within a week. A quote in either is
 * indicative and converted at invoice time.
 */
export const RATES: Record<Currency, number> = {
  USD: 1,
  SAR: 3.75,
  AED: 3.67,
  GBP: 0.79,
  EUR: 0.92,
};

/** Fixed against the dollar, so a stale rate is impossible. */
export const PEGGED: Currency[] = ["USD", "SAR", "AED"];

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  USD: "$",
  SAR: "SAR ",
  AED: "AED ",
  GBP: "£",
  EUR: "€",
};

export const CURRENCIES: Currency[] = ["USD", "GBP", "EUR", "SAR", "AED"];

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
export const BASE_USD = {
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
 * Care Plan billed annually: twelve months for the price of ten.
 *
 * The discount is the point — a year paid up front is a year of hosting and
 * maintenance I can actually plan around, and the two free months are cheaper
 * than the churn they prevent.
 */
export const CARE_ANNUAL_USD = 1800;

export type BillingPeriod = "monthly" | "yearly";

/** Care Plan price for a billing period, in the given currency. */
export function carePrice(
  period: BillingPeriod,
  currency: Currency,
  rates?: Partial<Record<Currency, number>>,
): number {
  return period === "yearly"
    ? convert(CARE_ANNUAL_USD, currency, rates)
    : tierPrice("care", currency, rates);
}

/** Formatted Care Plan price, with the period suffix the page shows after it. */
export function formatCarePrice(
  period: BillingPeriod,
  currency: Currency,
  rates?: Partial<Record<Currency, number>>,
): string {
  return `${CURRENCY_SYMBOL[currency]}${carePrice(period, currency, rates).toLocaleString("en-US")}`;
}

/** Months covered free by paying for a year. Shown as the toggle's incentive. */
export const CARE_MONTHS_FREE =
  Math.round((BASE_USD.care * 12 - CARE_ANNUAL_USD) / BASE_USD.care);

/**
 * Published prices, where they differ from a strict peg conversion.
 *
 * The pegged rates give e.g. 13,000 USD -> 48,750 SAR, but the price quoted in
 * market is 49,000. These are commercial decisions, not arithmetic, so the
 * published figure wins and the conversion is only a fallback for amounts not
 * listed here (notably the Growth slider, which is genuinely computed).
 *
 * Only the pegged currencies appear. GBP and EUR float, so a figure written
 * down here would be a commercial decision made against last month's rate —
 * they are always converted.
 */
const PUBLISHED: Partial<
  Record<TierId, Partial<Record<Currency, number>>>
> = {
  launch: { USD: 400, SAR: 1500, AED: 1475 },
  growth: { USD: 750, SAR: 2800, AED: 2750 },
  app: { USD: 2500, SAR: 9375, AED: 9175 },
  native: { USD: 3200, SAR: 12000, AED: 11750 },
  enterprise: { USD: 5500, SAR: 20625, AED: 20200 },
  care: { USD: 180, SAR: 675, AED: 660 },
};

/**
 * Published price for a fixed tier, falling back to conversion.
 *
 * The lookup can miss in two ways and both fall through to the same place: a
 * tier with no published figures at all, or a floating currency that
 * deliberately has none.
 */
export function tierPrice(
  tier: TierId,
  currency: Currency,
  rates?: Partial<Record<Currency, number>>,
): number {
  const published = PUBLISHED[tier]?.[currency];
  if (published !== undefined) return published;
  return convert(BASE_USD[tier as keyof typeof BASE_USD], currency, rates);
}

/** Formatted published price for a fixed tier. */
export function formatTierPrice(
  tier: TierId,
  currency: Currency,
  rates?: Partial<Record<Currency, number>>,
): string {
  return `${CURRENCY_SYMBOL[currency]}${tierPrice(tier, currency, rates).toLocaleString("en-US")}`;
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
 * Rounded to the nearest 25 for SAR and AED, which are pegged and quoted in
 * larger units — a 3.75x multiplier makes 400 into 1,500, and 1,487 would
 * look like arithmetic rather than a price.
 *
 * GBP and EUR round to 5. Their rates are close to parity, so rounding to 25
 * would move the figure by up to 3% — enough to be a different price rather
 * than a tidier one.
 *
 * A `rates` override is accepted so a caller holding live settings can pass
 * them in; without it the fallbacks apply.
 */
export function convert(
  usd: number,
  currency: Currency,
  rates: Partial<Record<Currency, number>> = {},
): number {
  if (currency === "USD") return usd;
  const raw = usd * (rates[currency] ?? RATES[currency]);
  const step = currency === "GBP" || currency === "EUR" ? 5 : 25;
  return Math.round(raw / step) * step;
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
 * In every plan.
 *
 * Auth and an admin area are not an upsell. A site whose owner cannot change
 * their own content decays within months, and handing over something you have
 * to email me to edit is not finished work.
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
      "SEO basics and social preview card",
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
      "Blog and pages you edit yourself",
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
      "Database with real-time updates",
      "Card payments and subscriptions",
      "Dashboards and reporting",
      "Third-party integrations",
      ...EVERY_PLAN,
    ],
  },
  {
    id: "native",
    name: "iOS and macOS",
    blurb: "A real native app, not a wrapped website.",
    priceUsd: BASE_USD.native,
    from: true,
    features: [
      "Native iOS, macOS, or both",
      "Shares one backend with your web app",
      "Works offline, syncs when it reconnects",
      "Push notifications",
      "Signed builds distributed straight to your users",
      "No App Store listing — no review queue, no store cut",
      ...EVERY_PLAN,
    ],
  },
];


/**
 * The three packaged tiers — the ones that are genuinely comparable.
 *
 * Native is a build tier too, but it is not an alternative to a website: it
 * is a second codebase alongside one, and it is quoted from rather than
 * fixed. Sitting it in the comparison row invited a like-for-like reading
 * against Launch and Growth that does not hold. It is presented with
 * Enterprise instead, where "from this figure, scoped on a call" is the
 * shared idea.
 */
export const PACKAGED_TIERS: BuildTier[] = BUILD_TIERS.filter(
  (t) => t.id !== "native",
);

/** Native, pulled out of the comparison row. */
export const NATIVE_TIER: BuildTier = BUILD_TIERS.find(
  (t) => t.id === "native",
)!;

export const ENTERPRISE_FEATURES = [
  "Everything in the other plans",
  "Up to 25 pages, or an app of matching scope",
  "Bilingual English and Arabic with full RTL mirroring",
  "Design system and component library handed over",
  "Multi-user roles and approval workflows",
  "WCAG 2.2 AA accessibility",
  "Custom integrations — CRM, ERP, internal systems",
  "Staging environment and staged rollout",
  // The only tier that gets it: wallet payments need domain verification and
  // an account configured for them, which is setup done once per client
  // rather than per project.
  "Apple Pay and Google Pay on your own checkout",
  "Security questionnaire support, NDA, SSO",
  "Dedicated channel with priority response",
  "Team training plus written documentation",
  "30 days post-launch support",
  "Uptime and performance SLA with an active Care Plan",
];


/**
 * Numbers, not "unlimited".
 *
 * "Unlimited small edits" was never true in the way anyone reads it, and the
 * word does more harm than a generous number: it invites the one client who
 * tests it, and it gives me nothing to point at when they do. A hundred a
 * month is past what any normal site needs, and it is a promise I can keep.
 *
 * The split matters as much as the counts. A small fix is a copy change, a
 * price, an image, a broken link. A big fix is a new section, a new page, a
 * behaviour change — work with design and testing in it.
 */
export const CARE_FEATURES = [
  "Hosting and maintenance",
  "100 small fixes a month",
  "20 big fixes a month",
  "SEO monitoring",
  "Monthly analytics report",
  "Priority support",
];

export const ENTERPRISE_PRICE_USD = BASE_USD.enterprise;
export const CARE_PRICE_USD = BASE_USD.care;

/* ------------------------------------------------------------- express --- */

/**
 * Express — up to two pages, live within two hours.
 *
 * Priced under seventy dollars deliberately: it is a decision someone makes
 * in one sitting, not one they get quotes for. Half up front and half on
 * delivery, and if the two hours are missed the balance is written off. That
 * guarantee is the product — without it this is just a cheap page.
 *
 * The clock starts when the build is accepted, not when they pay. An order
 * placed overnight must not already be late by morning.
 */
export const EXPRESS_PRICE_USD = 69;
export const EXPRESS_DEPOSIT_USD = 35;
export const EXPRESS_WINDOW_HOURS = 2;

export const EXPRESS_FEATURES = [
  "Up to two pages, whatever you need on them",
  "Live within two hours or you keep the balance",
  "Half up front, half only if I am on time",
  "A live countdown you can watch",
  "Mobile and desktop, both done properly",
  "Yours outright — hosting and domain in your name",
];

/* -------------------------------------------------------------- revive --- */

/**
 * Revive — taking over a site someone already has.
 *
 * Not a build tier and deliberately not priced beside them. Someone with a
 * live site that is slow, broken or unmaintainable is not shopping for a new
 * build; they want the one they have to work. Sitting it in the comparison
 * row would invite exactly the wrong reading — that the answer is to start
 * again.
 *
 * A one-off fee to fix what is there, then the Care Plan to keep it that way.
 * The recurring half is the point: a site rescued once and abandoned again is
 * back where it started within a year.
 */
export const REVIVE_PRICE_USD = 650;

export const REVIVE_FEATURES = [
  "A full audit of what is actually wrong",
  "Speed, accessibility and SEO fixes applied",
  "Broken links, forms and checkout paths repaired",
  "Mobile layout fixed properly, not patched",
  "Dependencies and security patches brought current",
  "An admin you can use, if there is not one already",
  "Handover notes so the next person is not stuck",
];

/** Eurozone members, for guessing a currency from a locale. */
const EUR_REGIONS = new Set([
  "AT", "BE", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IE", "IT",
  "LT", "LU", "LV", "MT", "NL", "PT", "SI", "SK",
]);

/** Best-guess currency from the visitor's locale. Always overridable. */
export function currencyFromLocale(locale: string | undefined): Currency {
  if (!locale) return "USD";
  const region = locale.split("-")[1]?.toUpperCase();
  if (!region) return "USD";
  if (region === "SA") return "SAR";
  if (region === "AE") return "AED";
  if (region === "GB") return "GBP";
  if (EUR_REGIONS.has(region)) return "EUR";
  return "USD";
}

/* ------------------------------------------------------------- promos --- */

/** The shape convex/promos.activeAutomatic returns for display. */
export interface ActivePromo {
  id: string;
  name: string;
  bannerText: string | null;
  showCountdown: boolean;
  endsAt: number | null;
  discountType: "percentage" | "fixed" | "override";
  discountValue: number;
  appliesTo: string[];
}

/**
 * Whether a promo covers a tier.
 *
 * Mirrors coversTier in convex/promos.ts deliberately — the server decides
 * what is actually charged, and this only decides what is shown. They agree
 * on the same rule: an empty appliesTo means everything except Enterprise,
 * because discounting a five-figure build with a site-wide banner cheapens it
 * and that pricing is negotiated in the proposal anyway.
 */
export function promoCoversTier(promo: ActivePromo, tier: TierId): boolean {
  if (promo.appliesTo.length > 0) return promo.appliesTo.includes(tier);
  return tier !== "enterprise";
}

/**
 * The discounted figure, or null when nothing applies.
 *
 * Returns null rather than the original price so a caller cannot accidentally
 * render a "was" line where there is no discount.
 */
export function discountedPrice(
  promo: ActivePromo | null | undefined,
  tier: TierId,
  price: number,
): number | null {
  if (!promo || !promoCoversTier(promo, tier)) return null;

  const next =
    promo.discountType === "percentage"
      ? price * (1 - promo.discountValue / 100)
      : promo.discountType === "fixed"
        ? price - promo.discountValue
        : promo.discountValue;

  const rounded = Math.max(0, Math.round(next));
  // A "discount" that saves nothing is noise with a strikethrough.
  return rounded < price ? rounded : null;
}

/** "20% off" or "$100 off", for the badge on a card. */
export function discountLabel(promo: ActivePromo): string {
  if (promo.discountType === "percentage") return `${promo.discountValue}% off`;
  if (promo.discountType === "fixed") return `$${promo.discountValue} off`;
  return "Reduced";
}
