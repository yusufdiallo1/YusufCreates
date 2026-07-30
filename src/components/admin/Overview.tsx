"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { ScoreBadge } from "@/components/admin/ScoreBadge";
import { ADMIN_PATH } from "@/lib/constants";

/**
 * Overview.
 *
 * Ordered by what actually needs a decision: unanswered leads first, money
 * second, everything else after. A dashboard that opens on a traffic chart
 * teaches you to ignore it.
 *
 * One query for the whole page. Five separate ones would waterfall on load
 * and could disagree with each other if they resolved at different moments.
 */
export function Overview() {
  const data = useQuery(api.admin.overview, {});

  if (data === undefined) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 animate-pulse rounded bg-surface-2" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-1" />
          ))}
        </div>
      </div>
    );
  }

  const { counts, revenue, pipeline, needsAttention } = data;
  const money = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: revenue.currency || "USD",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl">Overview</h1>
        <p className="mt-1 text-sm text-secondary">
          {counts.leadsNew > 0
            ? `${counts.leadsNew} ${counts.leadsNew === 1 ? "enquiry needs" : "enquiries need"} a reply.`
            : "Nothing waiting. All caught up."}
        </p>
      </div>

      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">
          Key numbers
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Needs a reply" value={counts.leadsNew} emphasis={counts.leadsNew > 0} />
          <Stat label="Hot leads open" value={counts.leadsHot} />
          <Stat label="Paid this month" value={money(revenue.paidThisMonth)} />
          <Stat label="Outstanding" value={money(revenue.outstanding)} />
        </div>
      </section>

      {/* The whole point of the page. Kept first and kept short. */}
      <section aria-labelledby="attention-heading">
        <div className="flex items-baseline justify-between">
          <h2 id="attention-heading" className="text-lg">
            Needs your attention
          </h2>
          <Link
            href={`${ADMIN_PATH}/leads`}
            className="text-xs text-secondary transition-colors duration-fast hover:text-primary"
          >
            All leads
          </Link>
        </div>

        {needsAttention.length === 0 ? (
          <p className="admin-card mt-4 text-sm text-secondary">
            No unanswered enquiries.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {needsAttention.map((lead) => (
              <li key={lead._id}>
                <Link
                  href={`${ADMIN_PATH}/leads?id=${lead._id}`}
                  className="admin-card flex items-center justify-between gap-4 transition-colors duration-fast hover:bg-surface-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="truncate text-sm text-primary">
                        {lead.name || lead.email}
                      </span>
                      <ScoreBadge score={lead.score} />
                    </div>
                    <p className="mt-1 truncate text-xs text-secondary">
                      {[lead.company, lead.projectType].filter(Boolean).join(" · ") ||
                        lead.email}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-secondary tabular-nums">
                    {formatWait(lead.waitingHours)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="pipeline-heading">
        <h2 id="pipeline-heading" className="text-lg">
          Pipeline by type
        </h2>
        <p className="mt-1 text-xs text-secondary">
          Estimated from the midpoint of each budget band. Open leads only.
        </p>

        {pipeline.length === 0 ? (
          <p className="admin-card mt-4 text-sm text-secondary">
            Nothing open right now.
          </p>
        ) : (
          <div className="admin-card mt-4 divide-y divide-[color:var(--border-hairline)]">
            {pipeline.map((row) => (
              <div
                key={row.tier}
                className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
              >
                <span className="truncate text-sm text-primary">{row.tier}</span>
                <span className="flex shrink-0 items-center gap-4 text-xs text-secondary tabular-nums">
                  <span>
                    {row.count} {row.count === 1 ? "lead" : "leads"}
                  </span>
                  <span className="text-primary">{money(row.value)}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="content-heading">
        <h2 id="content-heading" className="text-lg">
          Content
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Stat label="Published projects" value={counts.projectsPublished} />
          <Stat label="Drafts" value={counts.projectsDraft} />
          <Stat label="Leads in last 7 days" value={counts.leadsLast7} />
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string | number;
  emphasis?: boolean;
}) {
  return (
    <div className="admin-card">
      <p className="text-xs text-secondary">{label}</p>
      <p
        className={`mt-2 text-2xl tabular-nums ${
          emphasis ? "text-[color:var(--text-notice)]" : "text-primary"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/** Hours are unreadable past a day or two. */
function formatWait(hours: number): string {
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}
