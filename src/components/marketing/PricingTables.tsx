"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { Reveal } from "@/components/motion/Reveal";
import { CountUp } from "@/components/motion/CountUp";
import { SlideToConfirm } from "@/components/ui/SlideToConfirm";
import { useCurrency } from "@/lib/useCurrency";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { CurrencyMark, hasCurrencyMark } from "@/components/ui/CurrencyMark";
import {
  CARE_FEATURES,
  CARE_MONTHS_FREE,
  CURRENCIES,
  CURRENCY_SYMBOL,
  ENTERPRISE_FEATURES,
  EXPRESS_DEPOSIT_USD,
  EXPRESS_FEATURES,
  EXPRESS_PRICE_USD,
  EXPRESS_WINDOW_HOURS,
  GROWTH,
  NATIVE_TIER,
  PACKAGED_TIERS,
  PAGE_EXTRAS,
  PEGGED,
  REVIVE_FEATURES,
  REVIVE_PRICE_USD,
  carePrice,
  convert,
  discountLabel,
  discountedPrice,
  formatCarePrice,
  growthPriceUsd,
  splitPrice,
  tierPrice,
  type ActivePromo,
  type Currency,
  type BillingPeriod,
} from "@/lib/pricing";

/**
 * Pricing — everything is a card.
 *
 *   1. The four build tiers, two up on desktop.
 *   2. Enterprise and Care Plan beside each other, same card shape as the
 *      tiers above them.
 *
 * The tiers used to sit three-across, which was right when there were three
 * of them. A fourth was added and the grid was not, so it wrapped alone onto
 * a second row and read as an afterthought rather than a tier. Two columns
 * divides evenly and leaves each card room for its feature list.
 *
 * Enterprise and Care were full-width bands. At that width the feature list
 * needed two columns of its own and the price floated far from the name, so
 * neither could be compared against the tiers they sit under.
 *
 * SlideToConfirm appears only on Enterprise and Care Plan — the two actions
 * here that are not cleanly reversible. Every other tier CTA is an ordinary
 * link into the lead form.
 */

/**
 * The currency's symbol, drawn or typed.
 *
 * AED and SAR use SVG marks — their official symbols are too new for
 * installed fonts and render as tofu boxes. Everything else uses its text
 * glyph, which every font has.
 */
function Sym({ code }: { code: string }) {
  if (hasCurrencyMark(code)) {
    // No size passed: the mark is sized in em, so it tracks whatever text it
    // sits in — the same component works beside a headline price and a line
    // of body copy without being tuned for either.
    return (
      <CurrencyMark
        code={code}
        className="mr-0.5 inline-block text-secondary"
      />
    );
  }
  return <span className="text-secondary">{CURRENCY_SYMBOL[code as Currency]}</span>;
}

export function PricingTables() {
  const router = useRouter();
  const [currency, setCurrency] = useCurrency();
  const [pages, setPages] = useState<number>(GROWTH.minPages);

  const [period, setPeriod] = useState<BillingPeriod>("monthly");

  /*
   * Live rates for the floating currencies.
   *
   * publicRates, not getAll — the latter is admin-gated, so reading it here
   * threw "Not authenticated" for every visitor and the error boundary took
   * the whole pricing page down with it.
   *
   * SAR and AED are pegged and need none of this. GBP and EUR move, so the
   * constants in pricing.ts are the fallback for the moment before this
   * resolves, for an unset rate, and for Convex not being configured at all.
   */
  const live = useQuery(
    api.settings.publicRates,
    isConvexConfigured ? {} : "skip",
  );

  // The running automatic promo, if there is one. Display only — the server
  // decides what is actually charged when an invoice is raised.
  const promo = useQuery(
    api.promos.activeAutomatic,
    isConvexConfigured ? {} : "skip",
  ) as ActivePromo | null | undefined;
  const rates = useMemo(
    () => ({ GBP: live?.GBP ?? undefined, EUR: live?.EUR ?? undefined }),
    [live],
  );

  /*
   * The SAME split the checkout actually charges.
   *
   * This passed 0.5 while EXPRESS_DEPOSIT_USD is computed at 0.4, so the
   * pricing card advertised a deposit of half — $34.50 on a $69 build —
   * against the $27.60 the order page shows and Stripe takes. The card's own
   * feature list says "40% up front" two lines below, so the page
   * contradicted the checkout and itself at once.
   *
   * Derived from the deposit constant rather than repeating the ratio, so
   * the two cannot drift apart again.
   */
  const expressSplit = splitPrice(
    EXPRESS_PRICE_USD,
    currency,
    EXPRESS_DEPOSIT_USD / EXPRESS_PRICE_USD,
    rates,
  );

  const floating = !PEGGED.includes(currency);
  const growthUsd = growthPriceUsd(pages);

  // Native and Care render outside the tier loop, so their discounted
  // figures are derived here rather than inline — same helper, same rule.
  const nativeFull = tierPrice("native", currency, rates);
  const nativeCut = discountedPrice(promo, "native", nativeFull);
  const nativeShown = nativeCut ?? nativeFull;

  const careFull = carePrice(period, currency, rates);
  const careCut = discountedPrice(promo, "care", careFull);

  return (
    <>
      {/* Currency toggle */}
      <div className="mx-auto max-w-5xl px-6">
        <Reveal>
          <div
            role="group"
            aria-label="Currency"
            className="mx-auto flex w-fit gap-1 rounded-full border border-[color:var(--border-hairline)] p-1"
          >
            {CURRENCIES.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setCurrency(code)}
                aria-pressed={currency === code}
                /* 44px on touch, tighter on a pointer. These were 28px tall,
                   which is under every published minimum and genuinely fiddly
                   with a thumb — five of them in a row means the neighbour is
                   the likely hit. */
                className={`min-h-11 rounded-full px-4 py-1.5 text-xs transition-colors duration-fast sm:min-h-0 ${
                  currency === code
                    ? "bg-primary text-canvas"
                    : "text-secondary hover:text-primary"
                }`}
              >
                {code}
              </button>
            ))}
          </div>

          {/* Said only for the floating currencies. SAR and AED are pegged,
              so their figures are exact and a hedge would be noise; GBP and
              EUR move between quoting and invoicing, and saying so up front
              is better than explaining it after. */}
          {floating ? (
            <p className="mt-3 text-center text-xs text-secondary">
              {CURRENCY_SYMBOL[currency].trim()} prices are indicative.
              Invoices are raised in USD at the rate on the day.
            </p>
          ) : null}
        </Reveal>
      </div>

      {/* BAND 0 — express. Above the tiers because it is the one thing on
          this page someone might buy in the next ten minutes, and burying it
          under six considered-purchase cards hides it from exactly them. */}
      <div className="mx-auto mt-12 max-w-5xl px-6">
        <Reveal>
          <div className="enterprise-band flex flex-col gap-6 rounded-xl p-6 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl">Express</h2>
                <span className="rounded-full bg-[color:var(--accent)] px-2.5 py-0.5 text-xs font-medium text-primary">
                  {EXPRESS_WINDOW_HOURS} hours or it is free
                </span>
              </div>

              <p className="mt-1.5 text-sm text-secondary">
                Up to two pages, live today. 40% up front — if I miss the two
                hours, you keep the rest.
              </p>

              <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
                {EXPRESS_FEATURES.map((feature) => (
                  <li
                    key={feature}
                    className="flex gap-2.5 text-sm text-secondary"
                  >
                    <span aria-hidden="true" className="text-accent">
                      —
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="shrink-0 sm:text-right">
              {/* Both figures come from one split, so the deposit is always
                  exactly half of the total shown above it. Converting each
                  separately let them round apart — EUR read €65 total with a
                  €30 deposit, which does not add up in the reader's head or
                  in the invoice. */}
              <p className="text-3xl tabular-nums">
                <Sym code={currency} />
                {expressSplit.total.toLocaleString("en-US")}
              </p>
              <p className="mt-1 text-xs text-secondary">
                <Sym code={currency} />
                {expressSplit.deposit.toLocaleString("en-US")} to start
              </p>

              <Link
                href="/express"
                className="mt-4 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas transition-opacity duration-fast hover:opacity-90"
              >
                Start now
              </Link>
            </div>
          </div>
        </Reveal>
      </div>

      {/* BAND 1 — the packaged build tiers */}
      <div className="mx-auto mt-16 max-w-5xl">
        {/* Said out loud on a phone. The clipped card at the edge is the
            real affordance, but it is easy to miss on a first glance at a
            page that scrolls vertically everywhere else. */}
        <p
          aria-hidden="true"
          className="mb-3 px-6 text-xs text-secondary lg:hidden"
        >
          Swipe to compare →
        </p>

        {/*
          One swipeable row on a phone, a grid from sm up.

          snap-x with snap-start on each card stops a swipe halfway between
          two of them. touch-action: pan-x lets the browser hand vertical
          gestures back to the page, so swiping the row sideways never
          swallows an attempt to scroll down the page.

          The right-hand padding is deliberately short of the left so the next
          card is always clipped at the edge — that sliver is the only honest
          signal that there is more to swipe to.
        */}
        <div
          className="scroll-row flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 pb-4 lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0"
          style={{ touchAction: "pan-x pan-y" }}
        >
          {PACKAGED_TIERS.map((tier, index) => {
            const isGrowth = tier.id === "growth";
            const amount = isGrowth
              ? convert(growthUsd, currency, rates)
              : tierPrice(tier.id, currency, rates);
            const discounted = discountedPrice(promo, tier.id, amount);

            return (
              <Reveal
                key={tier.id}
                delay={index * 0.07}
                /* w-[82vw] on a phone: narrow enough that the next card is
                   always partly visible, which is what makes the row read as
                   swipeable without a scrollbar. */
                className="w-[82vw] shrink-0 snap-start sm:w-[min(24rem,70vw)] lg:w-auto lg:shrink"
              >
                <div
                  className={`flex h-full flex-col rounded-xl border p-6 ${
                    tier.popular
                      ? "border-[color:var(--accent)] bg-surface-2"
                      : "border-[color:var(--border-hairline)] bg-surface-1"
                  }`}
                >
                  {tier.popular ? (
                    <span className="mb-4 w-fit rounded-full bg-accent px-3 py-1 text-xs font-medium text-primary">
                      Most popular
                    </span>
                  ) : null}

                  <h2 className="text-xl">{tier.name}</h2>
                  <p className="mt-1 text-sm text-secondary">{tier.blurb}</p>

                  {/* The discount is stated on the card, not only in a
                      banner that scrolls away. Old price struck through so
                      the saving is visible rather than asserted. */}
                  {discounted !== null ? (
                    <span className="mt-4 w-fit rounded-full bg-[color:var(--accent)] px-2.5 py-0.5 text-xs font-medium text-primary">
                      {discountLabel(promo!)}
                    </span>
                  ) : null}

                  <p className="mt-6 text-3xl tabular-nums">
                    {tier.from ? (
                      <span className="text-base text-secondary">From </span>
                    ) : null}
                    <Sym code={currency} />
                    {/* Animates rather than snapping when the figure changes. */}
                    <CountUp value={discounted ?? amount} duration={0.5} />

                    {discounted !== null ? (
                      <span className="ml-2.5 align-middle text-base text-[color:var(--danger)] line-through decoration-[color:var(--danger)]">
                        <Sym code={currency} />
                        {amount.toLocaleString("en-US")}
                      </span>
                    ) : null}
                  </p>

                  {isGrowth ? (
                    <div className="mt-5">
                      <label
                        htmlFor="growth-pages"
                        className="flex items-baseline justify-between text-xs text-secondary"
                      >
                        <span>Pages</span>
                        <span className="tabular-nums text-primary">
                          {pages}
                        </span>
                      </label>
                      <input
                        id="growth-pages"
                        type="range"
                        min={GROWTH.minPages}
                        max={GROWTH.maxPages}
                        step={1}
                        value={pages}
                        onChange={(e) => setPages(Number(e.target.value))}
                        aria-valuetext={`${pages} pages`}
                        className="mt-2 w-full accent-[color:var(--accent)]"
                      />

                      {/*
                        The rate is stated, not left to be inferred from the
                        slider. This used to promise "four to nine is the same
                        price", which stopped being true when pages started
                        being charged individually — and a pricing page that
                        contradicts its own figure is worse than one that says
                        nothing.
                      */}
                      <p className="mt-2 text-xs text-secondary">
                        {pages <= PAGE_EXTRAS.includedUpTo
                          ? `Up to ${PAGE_EXTRAS.includedUpTo} pages included.`
                          : `${PAGE_EXTRAS.includedUpTo} pages included, then ${CURRENCY_SYMBOL[currency].trim()}${convert(PAGE_EXTRAS.nearRate, currency, rates).toLocaleString("en-US")} a page — ${CURRENCY_SYMBOL[currency].trim()}${convert(PAGE_EXTRAS.farRate, currency, rates).toLocaleString("en-US")} from the ${PAGE_EXTRAS.farFrom}th.`}
                      </p>
                    </div>
                  ) : null}

                  <ul className="mt-6 flex-1 space-y-2">
                    {tier.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex gap-2.5 text-sm text-secondary"
                      >
                        <span aria-hidden="true" className="text-accent">
                          —
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={`/start?tier=${tier.id}${isGrowth ? `&pages=${pages}` : ""}`}
                    className={`mt-8 rounded-full px-5 py-2.5 text-center text-sm font-medium transition-opacity duration-fast hover:opacity-90 ${
                      tier.popular
                        ? "bg-primary text-canvas"
                        : "border border-[color:var(--border-hairline)] text-primary"
                    }`}
                  >
                    Get started
                  </Link>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>

      {/* BAND 2 — quoted-from work and aftercare, below the comparison row */}
      <div className="mx-auto mt-6 max-w-5xl px-6">
        {/* Underneath the swipeable row, not part of it.
            These three are not alternatives to the build tiers — two are
            quoted from and one is aftercare — so they sit below rather than
            competing for the same swipe. Stacked on a phone, three across
            once there is room. */}
        {/* Four now, so two-up rather than three — three columns would leave
            the fourth stranded on its own row, which is the exact problem the
            build tiers had. */}
        <div className="grid gap-6 sm:grid-cols-2">
          <Reveal>
            {/* Same treatment as Enterprise: both are "from this figure,
                scoped on a call" rather than a fixed price you can buy off
                the page. */}
            <div className="enterprise-band flex h-full flex-col rounded-xl p-6">
              <h2 className="text-xl">{NATIVE_TIER.name}</h2>
              <p className="mt-1 text-sm text-secondary">
                {NATIVE_TIER.blurb}
              </p>

              {nativeCut !== null ? (
                <span className="mt-4 w-fit rounded-full bg-[color:var(--accent)] px-2.5 py-0.5 text-xs font-medium text-primary">
                  {discountLabel(promo!)}
                </span>
              ) : null}

              <p className="mt-6 text-3xl tabular-nums">
                <span className="text-base text-secondary">From </span>
                <Sym code={currency} />
                <CountUp value={nativeShown} duration={0.5} />
                {nativeCut !== null ? (
                  <span className="ml-2.5 align-middle text-base text-[color:var(--danger)] line-through decoration-[color:var(--danger)]">
                    <Sym code={currency} />
                    {nativeFull.toLocaleString("en-US")}
                  </span>
                ) : null}
              </p>

              <ul className="mt-6 flex-1 space-y-2">
                {NATIVE_TIER.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex gap-2.5 text-sm text-secondary"
                  >
                    <span aria-hidden="true" className="text-accent">
                      —
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <SlideToConfirm
                  purpose="submit-lead"
                  label="Slide to start a native app"
                  completedLabel="Request received"
                  ariaLabel="Slide to start an iOS or macOS project"
                  onConfirm={async () => {
                    router.push("/start?tier=native");
                  }}
                />
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.07}>
            <div className="enterprise-band flex h-full flex-col rounded-xl p-6">
              <h2 className="text-xl">Enterprise</h2>
              <p className="mt-1 text-sm text-secondary">
                Scoped on a call, priced in the proposal.
              </p>

              <p className="mt-6 text-3xl tabular-nums">
                <span className="text-base text-secondary">From </span>
                <Sym code={currency} />
                <CountUp
                  value={tierPrice("enterprise", currency, rates)}
                  duration={0.5}
                />
              </p>

              <ul className="mt-6 flex-1 space-y-2">
                {ENTERPRISE_FEATURES.map((feature) => (
                  <li
                    key={feature}
                    className="flex gap-2.5 text-sm text-secondary"
                  >
                    <span aria-hidden="true" className="text-accent">
                      —
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                {/* Enterprise needs company, role, procurement and NDA details,
                    so this routes into the enterprise branch of the lead form
                    rather than submitting anything inline. */}
                <SlideToConfirm
                  purpose="submit-lead"
                  label="Slide to request a proposal"
                  completedLabel="Request received"
                  ariaLabel="Slide to request an enterprise proposal"
                  onConfirm={async () => {
                    router.push("/start?tier=enterprise");
                  }}
                />
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.14}>
            {/* The route in for someone who already has a site. Placed
                immediately before Care because that is where it leads —
                a rescue with no maintenance behind it is back where it
                started within a year. */}
            <div className="flex h-full flex-col rounded-xl border border-[color:var(--border-hairline)] bg-surface-1 p-6">
              <h2 className="text-xl">Revive</h2>
              <p className="mt-1 text-sm text-secondary">
                You already have a site. Make it work.
              </p>

              <p className="mt-6 text-3xl tabular-nums">
                <span className="text-base text-secondary">From </span>
                <Sym code={currency} />
                <CountUp
                  value={convert(REVIVE_PRICE_USD, currency, rates)}
                  duration={0.5}
                />
              </p>

              <p className="mt-2 text-xs text-secondary">
                One-off. Continue on the Care Plan to keep it that way.
              </p>

              <ul className="mt-6 flex-1 space-y-2">
                {REVIVE_FEATURES.map((feature) => (
                  <li
                    key={feature}
                    className="flex gap-2.5 text-sm text-secondary"
                  >
                    <span aria-hidden="true" className="text-accent">
                      —
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="/audit"
                className="mt-8 rounded-full border border-[color:var(--border-hairline)] px-5 py-2.5 text-center text-sm font-medium text-primary transition-colors duration-fast hover:bg-surface-2"
              >
                Get a free audit first
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.21}>
            <div className="flex h-full flex-col rounded-xl border border-[color:var(--border-hairline)] bg-surface-1 p-6">
              <h2 className="text-xl">Care Plan</h2>
              <p className="mt-1 text-sm text-secondary">
                Aftercare, not a build tier. Add it to any project.
              </p>

              {/* Billing period. Sits above the figure so the number never
                  changes without the control that changed it in view. */}
              <div
                role="group"
                aria-label="Billing period"
                className="mt-5 flex w-fit gap-1 rounded-full border border-[color:var(--border-hairline)] p-1"
              >
                {(["monthly", "yearly"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setPeriod(option)}
                    aria-pressed={period === option}
                    className={`min-h-11 rounded-full px-4 py-1 text-xs transition-colors duration-fast sm:min-h-0 sm:px-3 ${
                      period === option
                        ? "bg-primary text-canvas"
                        : "text-secondary hover:text-primary"
                    }`}
                  >
                    {option === "monthly" ? "Monthly" : "Yearly"}
                  </button>
                ))}
              </div>

              <p className="mt-5 text-3xl tabular-nums">
                <Sym code={currency} />
                {(careCut ?? careFull).toLocaleString("en-US")}
                {careCut !== null ? (
                  <span className="ml-2.5 align-middle text-base text-[color:var(--danger)] line-through decoration-[color:var(--danger)]">
                    <Sym code={currency} />
                    {careFull.toLocaleString("en-US")}
                  </span>
                ) : null}
                <span className="text-base text-secondary">
                  {period === "monthly" ? "/mo" : "/yr"}
                </span>
              </p>

              {/* Only on the yearly option: on monthly it would be an advert
                  for the price they did not pick, sitting under the one they
                  did. */}
              <p className="mt-2 h-4 text-xs text-accent">
                {period === "yearly"
                  ? `${CARE_MONTHS_FREE} months free versus paying monthly.`
                  : ""}
              </p>

              <ul className="mt-6 flex-1 space-y-2">
                {CARE_FEATURES.map((feature) => (
                  <li
                    key={feature}
                    className="flex gap-2.5 text-sm text-secondary"
                  >
                    <span aria-hidden="true" className="text-accent">
                      —
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <SlideToConfirm
                  purpose="start-subscription"
                  ariaLabel={`Slide to start your ${period === "monthly" ? "monthly" : "annual"} Care Plan`}
                  onConfirm={async () => {
                    // Stripe is not wired yet; routing into the lead form keeps
                    // the action honest rather than failing silently.
                    router.push(
                      `/start?tier=care&currency=${currency}&period=${period}`,
                    );
                  }}
                />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </>
  );
}
