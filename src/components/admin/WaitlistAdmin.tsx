"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { DeleteSlide } from "@/components/admin/shared/Fields";
import { Empty, Skeleton } from "@/components/admin/ProjectsAdmin";

/**
 * Waitlist.
 *
 * Capacity at the top is derived from live projects and subscriptions, not a
 * setting — so it cannot disagree with what the public page shows.
 *
 * Offering a slot stamps a timestamp, and an unanswered offer stops holding
 * the slot after a week. Without that, one person who never replies blocks a
 * month indefinitely.
 */

const MONTH_FMT = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const STATUSES = [
  "waiting",
  "offered",
  "converted",
  "declined",
  "expired",
] as const;

export function WaitlistAdmin() {
  const data = useQuery(api.capacity.list, {});
  const setStatus = useMutation(api.capacity.setStatus);
  const remove = useMutation(api.capacity.remove);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Waitlist</h1>
        <p className="mt-1 text-sm text-secondary">
          Two builds and two care plans at a time. Capacity is worked out from
          live projects, so it is always current.
        </p>
      </div>

      {data === undefined ? (
        <Skeleton />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="admin-card">
              <p className="text-xs text-secondary">Builds in progress</p>
              <p className="mt-2 text-2xl text-primary tabular-nums">
                {data.occupied.builds} / {data.limits.build}
              </p>
            </div>
            <div className="admin-card">
              <p className="text-xs text-secondary">Care plans active</p>
              <p className="mt-2 text-2xl text-primary tabular-nums">
                {data.occupied.care} / {data.limits.care}
              </p>
            </div>
          </div>

          {data.rows.length === 0 ? (
            <Empty
              title="Nobody waiting"
              body="People who pick a start month on /waitlist appear here."
            />
          ) : (
            <ul className="space-y-2">
              {data.rows.map((row) => (
                <li
                  key={row._id}
                  className="admin-card flex flex-wrap items-start justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-primary">{row.name}</span>
                      <span className="badge">{row.kind}</span>
                      <span className="badge badge-warm">
                        {MONTH_FMT.format(new Date(row.slotMonth))}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-secondary">
                      {row.email}
                      {row.company ? ` · ${row.company}` : ""}
                    </p>
                    {row.note ? (
                      <p className="mt-1.5 text-xs text-secondary">
                        {row.note}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <a
                      href={`mailto:${row.email}?subject=${encodeURIComponent(
                        `Your slot for ${MONTH_FMT.format(new Date(row.slotMonth))}`,
                      )}`}
                      className="hairline rounded-full px-3 py-1 text-xs text-primary"
                    >
                      Email
                    </a>
                    <select
                      value={row.status}
                      aria-label={`Status for ${row.name}`}
                      onChange={(e) =>
                        void setStatus({
                          id: row._id,
                          status: e.target.value as (typeof STATUSES)[number],
                        })
                      }
                      className="hairline rounded-md bg-surface-1 px-2 py-1 text-xs text-secondary"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <DeleteSlide
                      what="this waitlist entry"
                      onDelete={async () => {
                        await remove({ id: row._id });
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
