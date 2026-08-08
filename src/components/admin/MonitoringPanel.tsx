"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { ADMIN_PATH } from "@/lib/constants";
import Link from "next/link";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Monitoring for one project, inside the project drawer.
 *
 * Deliberately thinner than the full monitoring page: this answers "is their
 * site alright" while I am already looking at their project, and links out
 * for anything more. The one thing it does that the table cannot is capture
 * a resolution note against an incident.
 *
 * That note matters more than it looks. "Down for 6 minutes" is a fact;
 * "down for 6 minutes, their host had a network incident, I confirmed
 * recovery" is what appears in the monthly report and is the actual product
 * the retainer buys.
 */

export function MonitoringPanel({
  projectId,
}: {
  projectId: Id<"clientProjects">;
}) {
  const sites = useQuery(api.monitoring.forProject, { projectId });

  if (sites === undefined) {
    return (
      <div className="space-y-2" aria-busy="true">
        <div className="h-24 animate-pulse rounded-lg bg-surface-1" />
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="hairline rounded-xl px-4 py-8 text-center">
        <p className="text-[13px] text-secondary">
          This project has no monitored site yet. Add one once it is live —
          a Care Plan that shows the client nothing is a Care Plan that gets
          cancelled.
        </p>
        <Link
          href={`${ADMIN_PATH}/monitoring`}
          className="mt-3 inline-block text-[13px] text-primary hover:underline"
        >
          Go to monitoring
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sites.map((site) => (
        <SiteBlock key={site._id} site={site} />
      ))}
    </div>
  );
}

type Site = NonNullable<
  ReturnType<typeof useQuery<typeof api.monitoring.forProject>>
>[number];

function SiteBlock({ site }: { site: Site }) {
  const recheck = useMutation(api.monitoring.recheckNow);
  const setResolution = useMutation(api.monitoring.setResolution);

  // Days remaining come from the query. Reading Date.now() during render is
  // impure — a different answer on every re-render, for no reason a prop change
  // explains — and the server already knows what time it is.
  const sslDays = site.sslDays;

  return (
    <div className="admin-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] text-primary">{site.host}</p>
          <p className="admin-meta mt-0.5">
            {site.careplanActive ? "Care Plan active" : "Watched, no plan"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void recheck({ siteId: site._id })}
          className="hairline shrink-0 rounded-full px-2.5 py-1 text-xs text-primary transition-colors duration-fast hover:bg-surface-2"
        >
          Re-check
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        <Stat
          label="Status"
          value={site.down ? "Down" : "Up"}
          tone={site.down ? "bad" : "good"}
        />
        <Stat
          label="Uptime 30d"
          value={
            site.uptimePercent30d !== null
              ? `${site.uptimePercent30d.toFixed(2)}%`
              : "—"
          }
        />
        <Stat
          label="Speed"
          value={site.performance !== null ? String(site.performance) : "—"}
        />
        <Stat
          label="SSL"
          value={sslDays !== null ? `${sslDays}d` : "—"}
          tone={sslDays !== null && sslDays <= 14 ? "warn" : undefined}
        />
      </div>

      {site.incidents.length > 0 ? (
        <div className="mt-4 border-t border-[color:var(--border-hairline)] pt-3">
          <p className="admin-meta">Incidents, last 30 days</p>
          <ul className="mt-2 space-y-3">
            {site.incidents.map((incident) => (
              <Incident
                key={incident._id}
                incident={incident}
                onSave={(note) =>
                  setResolution({ incidentId: incident._id, note })
                }
              />
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3 text-xs text-secondary">
          No incidents in the last 30 days.
        </p>
      )}
    </div>
  );
}

function Incident({
  incident,
  onSave,
}: {
  incident: Site["incidents"][number];
  onSave: (note: string) => Promise<unknown>;
}) {
  const [note, setNote] = useState(incident.resolutionNote ?? "");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const minutes = incident.closedAt
    ? Math.max(1, Math.round((incident.closedAt - incident.openedAt) / 60_000))
    : null;

  return (
    <li>
      <p className="text-xs text-primary">
        {new Date(incident.openedAt).toLocaleString("en-GB", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
        {" · "}
        {minutes !== null ? `${minutes} min` : "ongoing"}
        {" · "}
        <span className="text-secondary">{incident.cause}</span>
      </p>

      {editing ? (
        <div className="mt-1.5">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={1000}
            autoFocus
            placeholder="Their host had a network incident. Confirmed recovery and checked the certificate was unaffected."
            className="hairline w-full rounded-lg bg-surface-1 px-3 py-2 text-xs text-primary placeholder:text-secondary"
          />
          <div className="mt-1.5 flex gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onSave(note);
                  setEditing(false);
                } finally {
                  setBusy(false);
                }
              }}
              className="text-xs text-primary hover:underline disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setNote(incident.resolutionNote ?? "");
                setEditing(false);
              }}
              className="text-xs text-secondary hover:text-primary"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-0.5 block w-full text-left text-xs text-secondary transition-colors duration-fast hover:text-primary"
        >
          {incident.resolutionNote ?? "Add what you did about it →"}
        </button>
      )}
    </li>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad" | "warn";
}) {
  return (
    <div>
      <p
        className={`text-[13px] tabular-nums ${
          tone === "bad"
            ? "text-[color:var(--danger)]"
            : tone === "warn"
              ? "text-[color:var(--text-notice)]"
              : tone === "good"
                ? "text-[color:var(--success)]"
                : "text-primary"
        }`}
      >
        {value}
      </p>
      <p className="admin-meta">{label}</p>
    </div>
  );
}
