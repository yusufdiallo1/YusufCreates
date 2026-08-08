"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { Reveal } from "@/components/motion/Reveal";
import { CountUp } from "@/components/motion/CountUp";
import { useCurrency } from "@/lib/useCurrency";
import {
  CURRENCY_SYMBOL,
  GROWTH,
  PACKAGED_TIERS,
  convert,
  growthPriceUsd,
  tierPrice,
} from "@/lib/pricing";
import { track } from "@/lib/track";

/**
 * PricingPreview — the number, before the ask.
 *
 * The homepage used to run from testimonials straight into "Let's build the
 * thing", which asks someone to start a project without ever having told them
 * what one costs. The most common reason a good page does not convert is that
 * the visitor is still holding an unanswered question, and on this site it is
 * always the same question.
 *
 * THREE FIGURES AND ONE LINK. No slider, no currency toggle, no feature lists,
 * no comparison rows — all of that is on /pricing and repeating it here would
 * make the homepage a worse version of that page. This beat exists to remove
 * one objection and move on.
 *
 * NO MOTION DRAMA. Reveal only: no Sweep, no BorderBeam, no Magnetic. This is
 * the moment someone is doing arithmetic in their head, and it is wrapped in
 * <Quiet> on the homepage for the same reason — anything moving nearby is
 * something they have to ignore while they think.
 *
 * The figures come from tierPrice() and PACKAGED_TIERS, the same helpers
 * PricingTables uses, so the homepage and /pricing cannot disagree. The one
 * derivation is Growth, which has no fixed price — it is the slider's floor,
 * computed from the same growthPriceUsd() the slider itself calls.
 */
export function PricingPreview() {
  const [currency] = useCurrency();

  /*
   * Live rates for the floating currencies, exactly as PricingTables reads
   * them. publicRates, never getAll — the latter is admin-gated and throws
   * "Not authenticated" for a visitor.
   *
   * The constants in pricing.ts cover the moment before this resolves, so the
   * band never renders a blank where a price should be.
   */
  const live = useQuery(
    api.settings.publicRates,
    isConvexConfigured ? {} : "skip",
  );
  const rates = useMemo(
    () => ({ GBP: live?.GBP ?? undefined, EUR: live?.EUR ?? undefined }),
    [live],
  );

  const symbol = CURRENCY_SYMBOL[currency].trim();

  const tiers = PACKAGED_TIERS.map((tier) => ({
    id: tier.id,
    name: tier.name,
    blurb: tier.blurb,
    /*
     * Growth is priced from its floor rather than from a fixed figure.
     *
     * It is the only packaged tier with no priceUsd — the real number depends
     * on the page count, which is what the slider on /pricing is for. Showing
     * the three-page price as a "from" is the honest summary: it is the least
     * anyone pays for it, and it is the number the slider starts on.
     */
    amount:
      tier.id === "growth"
        ? convert(growthPriceUsd(GROWTH.minPages), currency, rates)
        : tierPrice(tier.id, currency, rates),
    // Launch and Growth are what they say. The web app tier is quoted from.
    from: tier.id !== "launch",
  }));

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-preview-heading"
      className="mx-auto max-w-5xl px-6 py-24"
    >
      <Reveal>
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 id="pricing-preview-heading" className="text-3xl">
            What it costs
          </h2>
          <Link
            href="/pricing"
            onClick={() => track("cta_click", { cta: "home-pricing-all" })}
            className="inline-flex min-h-6 items-center text-sm text-secondary transition-colors duration-hover ease-hover hover:text-primary"
          >
            Full pricing
          </Link>
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <p className="mt-3 max-w-2xl text-secondary">
          Fixed, agreed before I start. No hourly billing and no surprise
          invoices.
        </p>
      </Reveal>

      {/* A row of three, not cards. Cards invite comparison shopping between
          them; this is a price list, and the decision it supports is only
          "is this the right order of magnitude". */}
      <ul className="mt-10 grid gap-px overflow-hidden rounded-[var(--radius-lg)] bg-[color:var(--border-hairline)] sm:grid-cols-3">
        {tiers.map((tier, index) => (
          <li key={tier.id} className="bg-surface-1">
            <Reveal delay={0.12 + index * 0.06}>
              <div className="flex h-full flex-col p-6">
                <h3 className="text-sm text-secondary">{tier.name}</h3>
                <p className="mt-3 text-2xl text-primary tabular-nums">
                  {tier.from ? (
                    <span className="mr-1 text-sm text-secondary">from</span>
                  ) : null}
                  {/*
                    Counted, not printed.

                    `format` rather than prefix/suffix so the symbol and the
                    thousands separator move together with the number — a
                    prefix would leave "£" sitting beside a bare digit run for
                    the length of the count.

                    tabular-nums is on the parent, which is what stops the row
                    resizing on every frame as the digits change width. The
                    final figure is in the markup from the first render, so a
                    reader that never sees the animation still sees the price.
                  */}
                  <CountUp
                    value={tier.amount}
                    format={(n) =>
                      `${symbol}${Math.round(n).toLocaleString("en-US")}`
                    }
                  />
                </p>
                <p className="mt-2 text-sm text-secondary">{tier.blurb}</p>
              </div>
            </Reveal>
          </li>
        ))}
      </ul>

      <Reveal delay={0.3}>
        {/* The care plan is named but not priced. It is a monthly figure sat
            beside three project figures, and putting them in one row makes
            the smallest number look like the cheapest way to get a website. */}
        <p className="mt-6 text-sm text-secondary">
          Bigger builds are quoted from {symbol}
          {tierPrice("enterprise", currency, rates).toLocaleString("en-US")}.
          Aftercare is a separate monthly plan —{" "}
          <Link
            href="/pricing"
            className="text-accent transition-colors duration-hover ease-hover hover:text-primary"
          >
            all of it is on the pricing page
          </Link>
          .
        </p>
      </Reveal>
    </section>
  );
}
