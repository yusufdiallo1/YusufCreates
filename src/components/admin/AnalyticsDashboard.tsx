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
import { Empty, Skeleton } from "@/components/admin/ProjectsAdmin";

/**
 * Traffic, from the events table. No third-party tracker, no cookie banner.
 *
 * Ordered by what changes a decision: the funnel first, because that is where
 * you find out which step is losing people, then sources, then raw volume.
 */

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

export function AnalyticsDashboard() {
  const [days, setDays] = useState(30);
  const data = useQuery(api.analytics.summary, { days });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl">Analytics</h1>
          <p className="mt-1 text-sm text-secondary">
            First-party. No third-party tracker and no personal data.
          </p>
        </div>

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
              className={`rounded-full px-3.5 py-1.5 text-xs transition-colors duration-fast ${
                days === r.days
                  ? "bg-surface-2 text-primary"
                  : "text-secondary hover:text-primary"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {data === undefined ? (
        <Skeleton />
      ) : data.totals.pageviews === 0 ? (
        <Empty
          title="No traffic recorded yet"
          body="Pageviews appear here as soon as someone visits. Nothing is collected retroactively."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Pageviews" value={data.totals.pageviews} />
            <Stat label="Sessions" value={data.totals.sessions} />
            <Stat label="Forms started" value={data.totals.formStarts} />
            <Stat label="Enquiries sent" value={data.totals.formSubmits} />
          </div>

          <section aria-labelledby="funnel-heading">
            <h2 id="funnel-heading" className="text-lg">
              Funnel
            </h2>
            <p className="mt-1 text-xs text-secondary">
              Each step as a share of the one before it — that is where the
              drop-off actually is.
            </p>
            <div className="admin-card mt-4 space-y-3">
              {data.funnel.map((step, i) => {
                const previous = i === 0 ? step.count : data.funnel[i - 1].count;
                const share = previous > 0 ? (step.count / previous) * 100 : 0;
                const ofTotal =
                  data.funnel[0].count > 0
                    ? (step.count / data.funnel[0].count) * 100
                    : 0;
                return (
                  <div key={step.step}>
                    <div className="flex items-baseline justify-between gap-4 text-sm">
                      <span className="text-primary">{step.step}</span>
                      <span className="text-secondary tabular-nums">
                        {step.count}
                        {i > 0 ? (
                          <span className="ml-2 text-xs">
                            {share.toFixed(0)}% of previous
                          </span>
                        ) : null}
                      </span>
                    </div>
                    <div
                      className="mt-1.5 h-1.5 rounded-full bg-surface-2"
                      role="img"
                      aria-label={`${ofTotal.toFixed(0)} percent of all sessions`}
                    >
                      <div
                        className="h-full rounded-full bg-[color:var(--accent)]"
                        style={{ width: `${Math.max(2, ofTotal)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="traffic-heading">
            <h2 id="traffic-heading" className="text-lg">
              Pageviews over time
            </h2>
            <div className="admin-card mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.daily}>
                  <defs>
                    <linearGradient id="pv" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="var(--accent)"
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--accent)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border-hairline)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                    tickFormatter={(d: string) => d.slice(5)}
                    stroke="var(--border-hairline)"
                  />
                  <YAxis
                    tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                    stroke="var(--border-hairline)"
                    allowDecimals={false}
                    width={32}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-surface-2)",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "var(--text-primary)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    fill="url(#pv)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            <List title="Top pages" rows={data.topPages} />
            <List
              title="Referrers"
              rows={data.referrers}
              empty="All traffic is direct so far."
            />
            <List
              title="CTA clicks"
              rows={data.ctas}
              empty="No CTA clicks recorded."
            />
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="admin-card">
      <p className="text-xs text-secondary">{label}</p>
      <p className="mt-2 text-2xl text-primary tabular-nums">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function List({
  title,
  rows,
  empty = "Nothing yet.",
}: {
  title: string;
  rows: { label: string; count: number }[];
  empty?: string;
}) {
  return (
    <section>
      <h2 className="text-sm text-primary">{title}</h2>
      <div className="admin-card mt-3">
        {rows.length === 0 ? (
          <p className="text-xs text-secondary">{empty}</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li
                key={row.label}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="truncate text-secondary">{row.label}</span>
                <span className="shrink-0 text-primary tabular-nums">
                  {row.count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
