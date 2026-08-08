"use client";

import { useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { Empty, Skeleton } from "@/components/admin/ProjectsAdmin";

/**
 * Every audit anyone has run.
 *
 * These were being generated, emailed and then lost — the row existed in
 * Convex but nothing in the admin read it, so there was no way to see who had
 * run one or what it found. Each is a lead who typed their address in and
 * asked about their own site, which is a warmer signal than most enquiries.
 *
 * The full report opens in place rather than on its own route: the list is
 * the useful view, and one expanded row is faster to scan than a page load.
 */

const CATEGORY_LABEL: Record<string, string> = {
  performance: "Speed",
  accessibility: "Accessibility",
  "best-practices": "Best practices",
  seo: "SEO",
};

export function AuditsAdmin() {
  const rows = useQuery(api.audits.listAll, {});
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/*
        Kept as an accordion rather than converted to a DataTable. Each row
        expands into a score breakdown, four category tiles and a findings
        list — genuinely different content per item, which is exactly the case
        cards are for. A table of "URL, score, email" would hide the part that
        matters and need a drawer to show it again.
      */}
      <PageHeader
        title="Site audits"
        description={
          rows === undefined
            ? "Loading…"
            : `${rows.length} run — each one someone asking about their own site.`
        }
      />

      {rows === undefined ? (
        <Skeleton />
      ) : rows.length === 0 ? (
        <Empty
          title="No audits yet"
          body="Anyone who runs the free audit from /audit appears here, with everything it found."
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const open = openId === row._id;
            const issues = row.issues ?? [];

            return (
              <li key={row._id} className="admin-card">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : row._id)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-3 text-left"
                >
                  {row.siteLogo ? (
                    // Plain img: an arbitrary third-party URL, so it cannot
                    // go through next/image without allowing every host.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={row.siteLogo}
                      alt=""
                      className="hairline size-9 shrink-0 rounded-lg object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="hairline flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-1 text-xs text-secondary">
                      {(row.siteName ?? row.url).replace(/^https?:\/\/(www\.)?/, "")[0]?.toUpperCase() ?? "?"}
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-primary">
                      {row.siteName ?? row.url.replace(/^https?:\/\/(www\.)?/, "")}
                    </p>
                    <p className="truncate text-xs text-secondary">
                      {row.email}
                      {" · "}
                      {new Date(row.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  {row.status === "complete" ? (
                    <span className="shrink-0 text-lg text-primary tabular-nums">
                      {row.score ?? "—"}
                    </span>
                  ) : row.status === "failed" ? (
                    <span className="badge badge-cold shrink-0">failed</span>
                  ) : (
                    <span className="badge shrink-0">{row.status}</span>
                  )}
                </button>

                {open ? (
                  <div className="mt-5 border-t border-[color:var(--border-hairline)] pt-5">
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent transition-opacity duration-hover ease-hover hover:opacity-80"
                    >
                      {row.url}
                    </a>

                    {row.siteDescription ? (
                      <p className="mt-2 text-xs text-secondary">
                        {row.siteDescription}
                      </p>
                    ) : null}

                    {row.error ? (
                      <p className="mt-3 text-sm text-[color:var(--text-notice)]">
                        {row.error}
                      </p>
                    ) : null}

                    {row.categories ? (
                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                          ["Speed", row.categories.performance],
                          ["Accessibility", row.categories.accessibility],
                          ["Best practices", row.categories.bestPractices],
                          ["SEO", row.categories.seo],
                        ].map(([label, value]) => (
                          <div
                            key={String(label)}
                            className="hairline rounded-lg bg-surface-1 p-3"
                          >
                            <p className="text-[11px] text-secondary">
                              {label}
                            </p>
                            <p className="mt-1 text-base text-primary tabular-nums">
                              {value ?? "—"}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {row.fixes && row.fixes.length > 0 ? (
                      <div className="mt-5">
                        <p className="text-xs text-secondary uppercase">
                          What I told them to fix
                        </p>
                        <ol className="mt-2 space-y-2">
                          {row.fixes.map((fix, i) => (
                            <li key={`${fix.title}-${i}`} className="text-sm">
                              <span className="text-primary">{fix.title}</span>
                              <span className="text-secondary">
                                {" — "}
                                {fix.impact}
                              </span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : null}

                    {issues.length > 0 ? (
                      <div className="mt-5">
                        <p className="text-xs text-secondary uppercase">
                          Everything found · {issues.length}
                        </p>
                        <ul className="mt-2 space-y-1.5">
                          {issues.map((issue, i) => (
                            <li
                              key={`${issue.title}-${i}`}
                              className="flex items-baseline gap-2.5 text-xs"
                            >
                              <span
                                aria-hidden="true"
                                className={`mt-1 size-1.5 shrink-0 rounded-full ${
                                  (issue.score ?? 1) < 0.5
                                    ? "bg-[color:var(--danger)]"
                                    : "bg-[color:var(--text-notice)]"
                                }`}
                              />
                              <span className="text-secondary">
                                <span className="text-primary">
                                  {issue.title}
                                </span>
                                {" · "}
                                {CATEGORY_LABEL[issue.category] ??
                                  issue.category}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <a
                      href={`mailto:${row.email}?subject=${encodeURIComponent(`Your site audit — ${row.siteName ?? row.url}`)}`}
                      className="mt-5 inline-block rounded-full bg-primary px-4 py-2 text-xs font-medium text-canvas transition-opacity duration-hover ease-hover hover:opacity-90"
                    >
                      Reply to {row.email}
                    </a>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
