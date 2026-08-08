"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { DataTable, type Column, type RowAction } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

/**
 * Every monitored site, worst first.
 *
 * The sort is done in the Convex query, not here, and no `initialSort` is
 * passed. DataTable's third press on a header clears the sort and returns to
 * "the query's own order" — so that order has to be the meaningful one, and
 * severity-first is it. Clicking through a sort and back should land on
 * "anything wrong is at the top", not on insertion order.
 *
 * A site can be monitored without an active Care Plan, which is what makes
 * this useful for my own projects and for showing a prospect real numbers
 * before they have bought anything.
 */

type Row = NonNullable<
  ReturnType<typeof useQuery<typeof api.monitoring.listAll>>
>[number];

export function MonitoringAdmin() {
  const rows = useQuery(api.monitoring.listAll, {});
  const recheck = useMutation(api.monitoring.recheckNow);
  const setCareplan = useMutation(api.monitoring.setCareplan);
  const removeSite = useMutation(api.monitoring.removeSite);

  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Row | null>(null);

  const columns: Column<Row>[] = [
    {
      id: "host",
      header: "Site",
      alwaysVisible: true,
      sortValue: (r) => r.host,
      cell: (r) => (
        <span className="block min-w-0">
          <span className="block truncate text-[13px] text-primary">
            {r.host}
          </span>
          <span className="block truncate text-xs text-secondary">
            {r.clientName ?? "No client"}
            {r.careplanActive ? " · Care Plan" : ""}
          </span>
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      // Down sorts first ascending, which is the direction a first click on a
      // status column is expected to mean.
      sortValue: (r) => (r.down ? 0 : 1),
      cell: (r) => (
        <span
          className={
            r.down ? "text-[color:var(--danger)]" : "text-[color:var(--success)]"
          }
        >
          {r.down ? "Down" : "Up"}
          {r.lastStatus ? (
            <span className="text-secondary"> · {r.lastStatus}</span>
          ) : null}
        </span>
      ),
    },
    {
      id: "uptime",
      header: "Uptime 30d",
      align: "right",
      hideBelow: "md",
      sortValue: (r) => r.uptimePercent30d,
      cell: (r) =>
        r.uptimePercent30d === null ? (
          <span className="text-secondary">—</span>
        ) : (
          <span
            className={
              r.uptimePercent30d < 99.5
                ? "text-[color:var(--text-notice)]"
                : "text-primary"
            }
          >
            {r.uptimePercent30d.toFixed(2)}%
          </span>
        ),
    },
    {
      id: "performance",
      header: "Speed",
      align: "right",
      hideBelow: "md",
      sortValue: (r) => r.performance,
      cell: (r) =>
        r.performance === null ? (
          <span className="text-secondary">—</span>
        ) : (
          <span
            className={
              r.performance < 50
                ? "text-[color:var(--danger)]"
                : r.performance < 90
                  ? "text-[color:var(--text-notice)]"
                  : "text-primary"
            }
          >
            {r.performance}
          </span>
        ),
    },
    {
      id: "ssl",
      header: "SSL",
      align: "right",
      hideBelow: "lg",
      sortValue: (r) => r.sslDays,
      cell: (r) => <Days days={r.sslDays} />,
    },
    {
      id: "domain",
      header: "Domain",
      align: "right",
      hideBelow: "lg",
      sortValue: (r) => r.domainDays,
      cell: (r) => <Days days={r.domainDays} />,
    },
  ];

  /*
   * Actions rather than inline buttons. DataTable has no per-row button slot
   * and its header comment forbids adding one — a destructive control sitting
   * in a row is a mis-tap away from firing.
   */
  const actions: RowAction<Row>[] = [
    {
      label: "Re-check now",
      onSelect: (r) => void recheck({ siteId: r._id }),
    },
    {
      label: "Open site",
      onSelect: (r) => window.open(r.url, "_blank", "noopener,noreferrer"),
    },
    {
      label: "Turn Care Plan on",
      show: (r) => !r.careplanActive,
      onSelect: (r) => void setCareplan({ siteId: r._id, active: true }),
    },
    {
      label: "Turn Care Plan off",
      show: (r) => r.careplanActive,
      onSelect: (r) => void setCareplan({ siteId: r._id, active: false }),
    },
    {
      label: "Stop monitoring",
      destructive: true,
      onSelect: (r) => setDeleting(r),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Monitoring"
        description="Uptime every five minutes, Lighthouse weekly, SSL and domain daily. Anything wrong is at the top."
        action={
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="hairline rounded-full px-3.5 py-1.5 text-[13px] text-primary transition-colors duration-fast hover:bg-surface-2"
          >
            Add a site
          </button>
        }
      />

      <div className="mt-6">
        <DataTable
          rows={rows}
          columns={columns}
          actions={actions}
          rowKey={(r) => r._id}
          caption="Monitored sites, sorted with anything wrong first"
          empty={
            <div>
              <p className="text-sm text-secondary">
                Nothing is being monitored yet.
              </p>
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="mt-3 text-[13px] text-primary hover:underline"
              >
                Add the first site
              </button>
            </div>
          }
        />
      </div>

      {adding ? <AddSite onClose={() => setAdding(false)} /> : null}

      {deleting ? (
        <ConfirmDialog
          title="Stop monitoring this site?"
          body="Its uptime history, incidents and Lighthouse runs go with it. The client's report for this month will lose the numbers behind it."
          what={deleting.host}
          onConfirm={async () => {
            await removeSite({ siteId: deleting._id });
          }}
          onClose={() => setDeleting(null)}
        />
      ) : null}
    </div>
  );
}

/** Days remaining, banded. Spelled out rather than carried by colour alone. */
function Days({ days }: { days: number | null }) {
  if (days === null) return <span className="text-secondary">—</span>;

  return (
    <span
      className={
        days <= 7
          ? "text-[color:var(--danger)]"
          : days <= 30
            ? "text-[color:var(--text-notice)]"
            : "text-primary"
      }
    >
      {days}d
    </span>
  );
}

function AddSite({ onClose }: { onClose: () => void }) {
  const add = useMutation(api.monitoring.addSite);
  const [url, setUrl] = useState("");
  const [careplan, setCareplan] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Modal
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Monitor a site"
      description="Checked every five minutes from the moment you add it."
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="site-url" className="text-[13px] text-primary">
            Address
          </label>
          <input
            id="site-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="example.com"
            inputMode="url"
            autoCapitalize="none"
            spellCheck={false}
            className="hairline mt-1.5 w-full rounded-lg bg-surface-1 px-3.5 py-2.5 text-sm text-primary placeholder:text-secondary"
          />
        </div>

        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={careplan}
            onChange={(e) => setCareplan(e.target.checked)}
            className="mt-0.5 size-4 accent-[color:var(--accent)]"
          />
          <span className="text-[13px] text-secondary">
            On a Care Plan — the client gets outage alerts, expiry warnings and
            the monthly report. Leave this off to watch a site quietly.
          </span>
        </label>

        {error ? (
          <p role="alert" className="text-xs text-[color:var(--danger)]">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          disabled={busy || url.trim() === ""}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await add({ url, careplanActive: careplan });
              onClose();
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "That could not be added.",
              );
            } finally {
              setBusy(false);
            }
          }}
          className="min-h-10 w-full rounded-full bg-[color:var(--accent-solid)] px-4 text-sm font-medium text-white transition-[filter,opacity] duration-fast hover:brightness-110 disabled:opacity-50"
        >
          {busy ? "Adding…" : "Start monitoring"}
        </button>
      </div>
    </Modal>
  );
}
