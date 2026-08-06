"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { ADMIN_PATH } from "@/lib/constants";
import { PageHeader } from "@/components/admin/PageHeader";
import { useUpdateFlash } from "@/lib/useUpdateFlash";

/**
 * The operator dashboard.
 *
 * It answers one question — what needs me today — and it should answer it in
 * under five seconds. Everything else on this page is context for that.
 *
 * The old version was four stat tiles and a list of unanswered leads. The
 * leads were the only thing it treated as urgent, so a proposal read and
 * ignored for a week, an overdue invoice and an express build waiting on
 * approval were each visible only on their own screen — which means visible
 * only if you thought to go and look. They are one list now, sorted by
 * urgency rather than by which table they came from.
 */

const KIND_MARK: Record<string, string> = {
  express: "▲",
  invoice: "$",
  proposal: "§",
  lead: "●",
  testimonial: "★",
  feedback: "✉",
};

export function Overview() {
  const data = useQuery(api.admin.dashboard, {});

  const money = (n: number, currency: string) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(n);

  if (data === undefined) {
    return (
      <div className="space-y-6">
        <PageHeader title="Overview" description="Loading…" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-1" />
          ))}
        </div>
      </div>
    );
  }

  const { needsYou, needsYouTotal, metrics, dailyLeads, funnel } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description={
          needsYouTotal === 0
            ? "Nothing waiting. All caught up."
            : `${needsYouTotal} ${needsYouTotal === 1 ? "thing needs" : "things need"} you.`
        }
      />

      {/* Metrics. One column on a phone rather than four squeezed tiles. */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Revenue this month"
          value={money(metrics.revenueThisMonth, metrics.currency)}
          delta={delta(metrics.revenueThisMonth, metrics.revenuePrevMonth)}
          hint={
            metrics.fees > 0
              ? `net of ${money(metrics.fees, metrics.currency)} fees`
              : undefined
          }
        />
        <Metric
          label="Outstanding"
          value={money(metrics.pipelineValue, metrics.currency)}
          hint="issued, not yet paid"
        />
        <Metric
          label="New leads, 30 days"
          value={String(metrics.leads30)}
          delta={delta(metrics.leads30, metrics.leadsPrev30)}
          spark={dailyLeads}
        />
        <Metric
          label="Active builds"
          value={String(metrics.activeBuilds)}
          hint={`${metrics.openLeads} open leads`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Needs you — the reason to open the admin. */}
        <section aria-labelledby="needs-you" className="min-w-0">
          <h2 id="needs-you" className="admin-section-title">
            Needs you
          </h2>

          {needsYou.length === 0 ? (
            <p className="hairline mt-3 rounded-xl px-4 py-8 text-center text-[13px] text-secondary">
              Nothing waiting. Everything that could need you has been answered.
            </p>
          ) : (
            <ul className="hairline mt-3 divide-y divide-[color:var(--border-hairline)] overflow-hidden rounded-xl">
              {needsYou.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`${ADMIN_PATH}${item.href}`}
                    className="flex items-start gap-3 px-3 py-2.5 transition-colors duration-fast hover:bg-surface-2"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-0.5 w-4 shrink-0 text-center text-xs text-secondary"
                    >
                      {KIND_MARK[item.kind] ?? "·"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-primary">
                        {item.label}
                      </span>
                      <span className="block truncate text-xs text-secondary">
                        {item.detail}
                      </span>
                    </span>
                    <span className="admin-meta shrink-0 whitespace-nowrap">
                      {age(item.waited)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Funnel. Counted from each lead's current status, so it cannot
            widen — reaching "won" means having passed every prior stage. */}
        <section aria-labelledby="funnel" className="min-w-0">
          <h2 id="funnel" className="admin-section-title">
            Pipeline
          </h2>
          <div className="admin-card mt-3 space-y-2.5">
            {funnel.map((step, i) => {
              const first = funnel[0].count || 1;
              const prev = i === 0 ? null : funnel[i - 1].count;
              const pct = Math.round((step.count / first) * 100);
              return (
                <div key={step.step}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[13px] text-primary">
                      {step.step}
                    </span>
                    <span className="text-[13px] text-primary tabular-nums">
                      {step.count}
                      {prev !== null && prev > 0 ? (
                        <span className="ml-2 text-xs text-secondary">
                          {Math.round((step.count / prev) * 100)}%
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-[color:var(--accent)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ bits --- */

function Metric({
  label,
  value,
  delta,
  hint,
  spark,
}: {
  label: string;
  value: string;
  delta?: { pct: number; up: boolean } | null;
  hint?: string;
  spark?: number[];
}) {
  /*
   * The universal update signal.
   *
   * Convex is reactive, so these figures change under the reader with nothing
   * having asked them to. A number that silently becomes a different number is
   * a discrepancy rather than an update — you notice it minutes later and
   * cannot tell whether you misread it. One flash at the accent, the same one
   * used everywhere else in the product, and the change is unmissable.
   */
  const flashRef = useUpdateFlash<HTMLDivElement>(value);

  return (
    <div ref={flashRef} className="admin-card">
      <p className="admin-meta">{label}</p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-xl text-primary tabular-nums">{value}</span>
        {delta ? (
          <span
            className={`text-xs tabular-nums ${
              delta.up
                ? "text-[color:var(--success)]"
                : "text-[color:var(--danger)]"
            }`}
          >
            {delta.up ? "↑" : "↓"}
            {Math.abs(delta.pct)}%
          </span>
        ) : null}
      </div>
      {spark && spark.some((n) => n > 0) ? <Spark values={spark} /> : null}
      {hint ? <p className="mt-1 text-xs text-secondary">{hint}</p> : null}
    </div>
  );
}

/**
 * A 30-day sparkline, drawn as an inline SVG.
 *
 * Not recharts: this is a polyline with no axes, no tooltip and no legend,
 * and pulling a charting library into the dashboard to draw it would cost
 * more than the whole widget is worth. The real charts on the analytics page
 * still use recharts, where the interaction earns it.
 */
function Spark({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const points = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * 100;
      const y = 100 - (v / max) * 100;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="mt-2 h-6 w-full"
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Period-over-period. Null when there is no prior period to compare to —
    "up 100%" from a base of zero is not information. */
function delta(now: number, prev: number): { pct: number; up: boolean } | null {
  if (!prev) return null;
  const pct = Math.round(((now - prev) / prev) * 100);
  if (pct === 0) return null;
  return { pct, up: pct > 0 };
}

/** Hours into something readable at a glance. */
function age(hours: number): string {
  if (hours < 1) return "now";
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}
