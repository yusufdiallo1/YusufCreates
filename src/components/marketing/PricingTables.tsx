"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Reveal } from "@/components/motion/Reveal";
import { CountUp } from "@/components/motion/CountUp";
import { SlideToConfirm } from "@/components/ui/SlideToConfirm";
import { useCurrency } from "@/lib/useCurrency";
import {
  BUILD_TIERS,
  CARE_FEATURES,
  CARE_MONTHS_FREE,
  CURRENCIES,
  CURRENCY_SYMBOL,
  ENTERPRISE_FEATURES,
  GROWTH,
  convert,
  formatCarePrice,
  growthPriceUsd,
  tierPrice,
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

export function PricingTables() {
  const router = useRouter();
  const [currency, setCurrency] = useCurrency();
  const [pages, setPages] = useState<number>(GROWTH.minPages);
  const [period, setPeriod] = useState<BillingPeriod>("monthly");

  const growthUsd = growthPriceUsd(pages);

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
                className={`rounded-full px-4 py-1.5 text-xs transition-colors duration-fast ${
                  currency === code
                    ? "bg-primary text-canvas"
                    : "text-secondary hover:text-primary"
                }`}
              >
                {code}
              </button>
            ))}
          </div>
        </Reveal>
      </div>

      {/* BAND 1 — the build tiers */}
      <div className="mx-auto mt-16 max-w-5xl px-6">
        {/* Two columns, not three: BUILD_TIERS holds four, and four into three
            leaves one stranded on its own row looking like a footnote. */}
        <div className="grid gap-6 sm:grid-cols-2">
          {BUILD_TIERS.map((tier, index) => {
            const isGrowth = tier.id === "growth";
            const amount = isGrowth
              ? convert(growthUsd, currency)
              : tierPrice(tier.id, currency);

            return (
              <Reveal key={tier.id} delay={index * 0.07}>
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

                  <p className="mt-6 text-3xl tabular-nums">
                    {tier.from ? (
                      <span className="text-base text-secondary">From </span>
                    ) : null}
                    <span className="text-secondary">
                      {CURRENCY_SYMBOL[currency]}
                    </span>
                    {/* Animates rather than snapping when the figure changes. */}
                    <CountUp value={amount} duration={0.5} />
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

                      {/* Said plainly, because the slider otherwise implies a
                          per-page charge. Knowing the price stops moving at
                          four is the point — it means adding a page later is
                          a decision about the site, not about money. */}
                      <p className="mt-2 text-xs text-secondary">
                        {pages >= GROWTH.flatFrom
                          ? "Four to nine pages is the same price — add pages without the cost changing."
                          : "Three pages. Four or more is a single flat price, however many you end up needing."}
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

      {/* BAND 2 — Enterprise and Care Plan, same card shape as the tiers */}
      <div className="mx-auto mt-6 max-w-5xl px-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <Reveal>
            <div className="enterprise-band flex h-full flex-col rounded-xl p-6">
              <h2 className="text-xl">Enterprise</h2>
              <p className="mt-1 text-sm text-secondary">
                Scoped on a call, priced in the proposal.
              </p>

              <p className="mt-6 text-3xl tabular-nums">
                <span className="text-base text-secondary">From </span>
                <span className="text-secondary">
                  {CURRENCY_SYMBOL[currency]}
                </span>
                <CountUp
                  value={tierPrice("enterprise", currency)}
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

          <Reveal delay={0.07}>
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
                    className={`rounded-full px-3 py-1 text-xs transition-colors duration-fast ${
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
                {formatCarePrice(period, currency)}
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
