"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/convex-api";
import { PageHeader } from "@/components/admin/PageHeader";
import { downloadCsv } from "@/components/admin/TableToolbar";

/**
 * Traffic, from the events table. No third-party tracker, no cookie banner.
 *
 * Tabbed rather than one long scroll: acquisition, behaviour and technical
 * answer different questions on different days, and stacking them meant
 * scrolling past two to reach the third.
 *
 * Reads the nightly rollup rather than raw events — see convex/analytics.ts
 * for why the previous version was silently reporting on a fraction of the
 * window it claimed to cover.
 */

const RANGES = [
  { days: 7, label: "7d" },
  { days: 30, label: "30d" },
  { days: 90, label: "90d" },
  { days: 365, label: "12m" },
];

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "acquisition", label: "Acquisition" },
  { id: "behaviour", label: "Behaviour" },
  { id: "conversion", label: "Conversion" },
  { id: "pricing", label: "Pricing" },
  { id: "technical", label: "Technical" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AnalyticsDashboard() {
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState<TabId>("overview");
  const data = useQuery(api.analytics.summary, { days });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="First-party. No tracker, no personal data."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Date range"
              className="hairline flex rounded-full p-0.5"
            >
              {RANGES.map((r) => (
                <button
                  key={r.days}
                  type="button"
                  onClick={() => setDays(r.days)}
                  aria-pressed={days === r.days}
                  className={`rounded-full px-3 py-1.5 text-xs transition-colors duration-hover ease-hover ${
                    days === r.days
                      ? "bg-surface-2 text-primary"
                      : "text-secondary hover:text-primary"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {data ? (
              <button
                type="button"
                onClick={() =>
                  downloadCsv(
                    `analytics-${days}d.csv`,
                    ["Date", "Pageviews", "Sessions"],
                    data.daily.map((d, i) => [
                      d.day,
                      d.count,
                      data.sessionsDaily[i]?.count ?? 0,
                    ]),
                  )
                }
                className="admin-meta rounded-lg px-2 py-1 transition-colors duration-hover ease-hover hover:text-primary"
              >
                Export
              </button>
            ) : null}
          </div>
        }
      />

      {/* Horizontal scroller on a phone: six tabs will not fit at 390px, and
          wrapping to two rows costs more vertical space than the chart below
          is worth. */}
      <div
        role="tablist"
        aria-label="Analytics sections"
        className="hairline-b -mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-[13px] whitespace-nowrap transition-colors duration-hover ease-hover ${
              tab === t.id
                ? "border-[color:var(--accent)] text-primary"
                : "border-transparent text-secondary hover:text-primary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {data === undefined ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl bg-surface-1"
              />
            ))}
          </div>
          <div className="h-56 animate-pulse rounded-xl bg-surface-1" />
        </div>
      ) : (
        <>
          {/*
            "No traffic yet" and "the nightly job never ran" look identical
            without this, and they need completely different responses.
          */}
          {data.rolledDays === 0 && data.totals.pageviews === 0 ? (
            <p className="hairline rounded-xl px-4 py-8 text-center text-[13px] text-secondary">
              Nothing recorded yet. Today&apos;s figures are live; history
              appears once the nightly rollup has run.
            </p>
          ) : null}

          {tab === "overview" ? (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Visitors" value={data.totals.visitors} />
                <Stat label="Sessions" value={data.totals.sessions} />
                <Stat label="Pageviews" value={data.totals.pageviews} />
                <Stat
                  label="Enquiry rate"
                  value={
                    data.totals.conversionRate === null
                      ? "—"
                      : `${data.totals.conversionRate}%`
                  }
                />
              </div>
              <Chart title="Pageviews" series={data.daily} />
            </div>
          ) : null}

          {tab === "acquisition" ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Rows
                title="Referrers"
                empty="Nothing yet — a direct visit has no referrer."
                rows={data.referrers}
              />
              <Rows
                title="Countries"
                empty="No country data yet."
                rows={data.countries}
              />
            </div>
          ) : null}

          {tab === "behaviour" ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Rows
                title="Top pages"
                empty="No pageviews yet."
                rows={data.topPages}
              />
              <Rows
                title="Calls to action"
                empty="No CTA clicks yet."
                rows={data.ctas}
              />
              <Rows
                title="Scroll depth"
                empty="Not captured yet."
                rows={data.scroll.map((s) => ({
                  label: `${s.label}%`,
                  count: s.count,
                }))}
              />
            </div>
          ) : null}

          {tab === "conversion" ? <Funnel steps={data.funnel} /> : null}

          {tab === "pricing" ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Rows
                title="Tier clicked"
                empty="No tier clicks yet."
                rows={data.tierClicks}
              />
              <Rows
                title="Currency chosen"
                empty="Nobody has switched currency."
                rows={data.currencies}
              />
              {/* The most-opened question is the objection the main copy has
                  not answered well enough. */}
              <Rows
                title="FAQ opened"
                empty="No FAQ opens yet."
                rows={data.faq}
              />
            </div>
          ) : null}

          {tab === "technical" ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Rows
                title="Devices"
                empty="No device data."
                rows={data.devices}
              />
              <Rows
                title="Browsers"
                empty="No browser data."
                rows={data.browsers}
              />
              {/* Which breakpoints actually matter, rather than which ones I
                  guessed at when writing the CSS. */}
              <Rows
                title="Viewport width"
                empty="No viewport data."
                rows={data.viewports}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ bits --- */

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="admin-card">
      <p className="admin-meta">{label}</p>
      <p className="mt-1.5 text-xl text-primary tabular-nums">
        {typeof value === "number" ? value.toLocaleString("en-US") : value}
      </p>
    </div>
  );
}

function Chart({
  title,
  series,
}: {
  title: string;
  series: { day: string; count: number }[];
}) {
  return (
    <div className="admin-card">
      <p className="admin-meta">{title}</p>
      {/* Fixed height on the wrapper: recharts needs a bounded parent, and a
          percentage height inside a flexible grid collapses to zero at some
          breakpoints. */}
      <div className="mt-3 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={series}
            margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
          >
            <defs>
              <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border-hairline)" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              /* Every label would overlap at 90 days; this thins them to
                 roughly six whatever the range. */
              interval={Math.max(0, Math.floor(series.length / 6) - 1)}
              tickFormatter={(d: string) => d.slice(5)}
            />
            <YAxis
              tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              width={44}
            />
            <Tooltip
              contentStyle={{
                background: "var(--bg-surface-2)",
                border: "1px solid var(--border-hairline)",
                borderRadius: 10,
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--text-secondary)" }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="var(--accent)"
              strokeWidth={2}
              fill="url(#fill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Rows({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: { label: string; count: number }[];
  empty: string;
}) {
  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <div className="admin-card min-w-0">
      <p className="admin-meta">{title}</p>
      {rows.length === 0 ? (
        <p className="mt-3 text-[13px] text-secondary">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li key={row.label}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-[13px] text-primary">
                  {row.label}
                </span>
                <span className="shrink-0 text-[13px] text-secondary tabular-nums">
                  {row.count.toLocaleString("en-US")}
                </span>
              </div>
              {/* A bar as well as the figure: the shape of the distribution
                  is usually the answer, not any individual number. */}
              <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-[color:var(--accent)]"
                  style={{ width: `${(row.count / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Funnel({ steps }: { steps: { step: string; count: number }[] }) {
  const first = steps[0]?.count || 1;

  return (
    <div className="admin-card">
      <p className="admin-meta">Funnel</p>
      <ul className="mt-3 space-y-3">
        {steps.map((step, i) => {
          const prev = i === 0 ? null : steps[i - 1].count;
          const share = Math.round((step.count / first) * 100);
          /*
           * Drop-off, and its polarity is INVERTED: a bigger number here is
           * worse, so it is drawn in the notice colour rather than the green
           * an "up" delta would get elsewhere. Getting this backwards makes a
           * dashboard actively misleading.
           */
          const dropped =
            prev !== null && prev > 0
              ? Math.round(((prev - step.count) / prev) * 100)
              : null;

          return (
            <li key={step.step}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] text-primary">{step.step}</span>
                <span className="text-[13px] text-primary tabular-nums">
                  {step.count.toLocaleString("en-US")}
                  {dropped !== null && dropped > 0 ? (
                    <span className="ml-2 text-xs text-[color:var(--text-notice)]">
                      −{dropped}%
                    </span>
                  ) : null}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-[color:var(--accent)]"
                  style={{ width: `${share}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
