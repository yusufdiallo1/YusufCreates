"use client";

import { useQuery } from "convex/react";
import { api, isConvexConfigured } from "@/lib/convex-api";

/**
 * What the Care Plan actually buys, made visible.
 *
 * £450 a month currently shows the client nothing, which is how retainers
 * churn — not because the work stops, but because invisible maintenance is
 * indistinguishable from none.
 *
 * The 30-day bar is the load-bearing element. A percentage is abstract;
 * thirty green segments is a month of evidence you can take in at a glance,
 * and the one amber segment in it is a story rather than a decimal place.
 *
 * Honest when it is bad. A month with an outage says so, with the duration
 * and what was done — a dashboard that is always green is a dashboard nobody
 * believes by March.
 */

export function SiteHealth() {
  const sites = useQuery(api.monitoring.mySites, isConvexConfigured ? {} : "skip");

  /*
   * Nothing at all while loading, and nothing when there are no sites —
   * including the heading and the spacing above it.
   *
   * A skeleton here would reserve space on every portal load for a section
   * most clients do not have, which reads as something failing to appear
   * rather than as something that was never there.
   */
  if (sites === undefined || sites.length === 0) return null;

  return (
    <section aria-labelledby="health-heading" className="mt-12">
      <h2 id="health-heading" className="text-lg">
        Your site
      </h2>
      <p className="mt-1.5 text-sm text-secondary">
        Checked every five minutes, day and night.
      </p>

      <div className="mt-4 space-y-4">
        {sites.map((site) => (
          <SiteCard key={site._id} site={site} />
        ))}
      </div>
    </section>
  );
}

type Site = NonNullable<
  ReturnType<typeof useQuery<typeof api.monitoring.mySites>>
>[number];

function SiteCard({ site }: { site: Site }) {
  // From the query, not from Date.now(). A component that reads the clock
  // during render is impure — it answers differently on every re-render for
  // reasons no prop explains — and the server already knows the time.
  const sslDays = site.sslDays;

  return (
    <section className="hairline rounded-xl bg-surface-1 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm text-primary">{site.host}</h3>
          <p className="mt-0.5 text-xs text-secondary">
            {site.lastCheckAt
              ? `Checked ${relative(site.lastCheckAt)}`
              : "Not checked yet"}
          </p>
        </div>

        {/* The word carries the state; the colour only reinforces it. */}
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${
            site.down
              ? "bg-[color:var(--danger)]/15 text-[color:var(--danger)]"
              : "bg-[color:var(--success)]/15 text-[color:var(--success)]"
          }`}
        >
          {site.down ? "Down" : "Up"}
        </span>
      </div>

      {/* ----------------------------------------------------- the figures --- */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Figure
          label="30-day uptime"
          value={
            site.uptimePercent30d !== null
              ? `${site.uptimePercent30d.toFixed(2)}%`
              : "—"
          }
        />
        <Figure
          label="Speed"
          value={site.performance !== null ? String(site.performance) : "—"}
        />
        <Figure
          label="Certificate"
          value={sslDays !== null ? `${sslDays}d` : "—"}
          hint={sslDays !== null && sslDays <= 14 ? "warn" : undefined}
        />
      </div>

      {/* -------------------------------------------------- the 30-day bar --- */}
      <div className="mt-5">
        <p className="admin-meta">Last 30 days</p>
        <div
          className="mt-2 flex gap-[2px]"
          role="img"
          aria-label={`${site.days.filter((d) => d.ok).length} of the last 30 days with no interruption`}
        >
          {site.days.map((day) => (
            <span
              key={day.day}
              title={new Date(day.day).toLocaleDateString()}
              className={`h-8 min-w-0 flex-1 rounded-[2px] ${
                day.ok
                  ? "bg-[color:var(--success)]/45"
                  : "bg-[color:var(--danger)]"
              }`}
            />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between">
          <span className="text-xs text-secondary">30 days ago</span>
          <span className="text-xs text-secondary">Today</span>
        </div>
      </div>

      {/* ---------------------------------------------------- the trend --- */}
      {site.trend.length > 1 ? (
        <div className="mt-5">
          <p className="admin-meta">Speed, last 12 weeks</p>
          <Sparkline values={site.trend} />
        </div>
      ) : null}

      {/* ------------------------------------------------- the incidents --- */}
      <div className="mt-5">
        <p className="admin-meta">Incidents</p>
        {site.incidents.length === 0 ? (
          <p className="mt-2 text-[13px] text-secondary">
            None in the last 30 days. Your site answered every check.
          </p>
        ) : (
          <ul className="mt-2 space-y-2.5">
            {site.incidents.map((incident) => {
              const minutes = incident.closedAt
                ? Math.max(
                    1,
                    Math.round((incident.closedAt - incident.openedAt) / 60_000),
                  )
                : null;

              return (
                <li key={incident._id}>
                  <p className="text-[13px] text-primary">
                    {new Date(incident.openedAt).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {minutes !== null ? ` · ${minutes} min` : " · ongoing"}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-secondary">
                    {incident.resolutionNote ??
                      (minutes !== null
                        ? "Recovered before intervention was needed. Logged and watched."
                        : "I was alerted automatically and am on it.")}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function Figure({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: "warn";
}) {
  return (
    <div>
      <p
        className={`text-lg tabular-nums ${
          hint === "warn"
            ? "text-[color:var(--text-notice)]"
            : "text-primary"
        }`}
      >
        {value}
      </p>
      <p className="admin-meta mt-0.5">{label}</p>
    </div>
  );
}

/**
 * A fixed 0-100 sparkline.
 *
 * Fixed, not auto-scaled. A Lighthouse score has an absolute meaning, and
 * normalising each site against its own maximum would draw a row of 40s
 * identically to a row of 90s — which is exactly the wrong impression on a
 * chart whose job is to say whether the site got slower.
 */
function Sparkline({ values }: { values: number[] }) {
  const points = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * 100;
      const y = 100 - Math.max(0, Math.min(100, v));
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="mt-2 h-10 w-full"
    >
      {/* 90 is Google's "good" threshold. A line without it is a shape; with
          it, it is a position relative to a target. */}
      <line
        x1="0"
        y1="10"
        x2="100"
        y2="10"
        stroke="var(--border-hairline)"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
        strokeDasharray="3 3"
      />
      <polyline
        points={points}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function relative(ts: number): string {
  const mins = Math.round((Date.now() - ts) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
