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
  CURRENCIES,
  CURRENCY_SYMBOL,
  ENTERPRISE_FEATURES,
  GROWTH,
  convert,
  formatTierPrice,
  growthPriceUsd,
  tierPrice,
} from "@/lib/pricing";

/**
 * Pricing — three bands.
 *
 *   1. Three build tiers side by side. Never four: a fourth column measurably
 *      hurts conversion by making the comparison harder, not richer.
 *   2. Enterprise, full width, with its own visual treatment so it is not
 *      compared like-for-like against the packaged tiers.
 *   3. Care Plan, separate, because aftercare is not a build option.
 *
 * SlideToConfirm appears only on Enterprise and Care Plan — the two actions
 * here that are not cleanly reversible. Every other tier CTA is an ordinary
 * link into the lead form.
 */

export function PricingTables() {
  const router = useRouter();
  const [currency, setCurrency] = useCurrency();
  const [pages, setPages] = useState<number>(GROWTH.minPages);

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

      {/* BAND 1 — three build tiers */}
      <div className="mx-auto mt-16 max-w-5xl px-6">
        <div className="grid gap-6 lg:grid-cols-3">
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

      {/* BAND 2 — Enterprise */}
      <div className="mx-auto mt-8 max-w-5xl px-6">
        <Reveal>
          <div className="enterprise-band rounded-xl p-8">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <h2 className="text-2xl">Enterprise</h2>
              <p className="text-2xl tabular-nums">
                <span className="text-base text-secondary">From </span>
                <span className="text-secondary">
                  {CURRENCY_SYMBOL[currency]}
                </span>
                <CountUp
                  value={tierPrice("enterprise", currency)}
                  duration={0.5}
                />
              </p>
            </div>

            <ul className="mt-8 grid gap-2 sm:grid-cols-2">
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

            <div className="mt-10 max-w-md">
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
      </div>

      {/* BAND 3 — Care Plan */}
      <div className="mx-auto mt-8 max-w-5xl px-6">
        <Reveal>
          <div className="rounded-xl border border-[color:var(--border-hairline)] bg-surface-1 p-8">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <div>
                <h2 className="text-2xl">Care Plan</h2>
                <p className="mt-1 text-sm text-secondary">
                  Aftercare, not a build tier. Add it to any project.
                </p>
              </div>
              <p className="text-2xl tabular-nums">
                {formatTierPrice("care", currency)}
                <span className="text-base text-secondary">/mo</span>
              </p>
            </div>

            <ul className="mt-8 grid gap-2 sm:grid-cols-2">
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

            <div className="mt-10 max-w-md">
              <SlideToConfirm
                purpose="start-subscription"
                ariaLabel="Slide to start your monthly Care Plan"
                onConfirm={async () => {
                  // Stripe is not wired yet; routing into the lead form keeps
                  // the action honest rather than failing silently.
                  router.push(`/start?tier=care&currency=${currency}`);
                }}
              />
            </div>
          </div>
        </Reveal>
      </div>
    </>
  );
}
