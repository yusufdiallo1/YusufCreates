"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { Empty, Skeleton } from "@/components/admin/ProjectsAdmin";
import { DeleteSlide } from "@/components/admin/shared/Fields";
import { MiniSlide } from "@/components/ui/MiniSlide";

/**
 * Express builds.
 *
 * Ordered by what needs me, not by date: queued is waiting to be accepted,
 * building is a clock running down. Anything delivered is a record.
 *
 * Accepting is a slide rather than a button because it starts a two-hour
 * commitment with money attached, and a click that lands by accident should
 * not be able to do that.
 */

/** A live clock, so a running build shows time left rather than a timestamp. */
function useNow(active: boolean) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!active) return;
    /*
     * The first tick is scheduled, not written synchronously.
     *
     * A setState in an effect body cascades an extra render before paint —
     * and the countdown is late by less than one frame either way, which is
     * invisible on a clock that ticks in seconds.
     */
    const id = setInterval(() => setNow(Date.now()), 1000);
    const first = setTimeout(() => setNow(Date.now()), 0);
    return () => {
      clearInterval(id);
      clearTimeout(first);
    };
  }, [active]);
  return now;
}

export function ExpressAdmin() {
  const rows = useQuery(api.express.listAll, {});
  const accept = useMutation(api.express.accept);
  const deliver = useMutation(api.express.deliver);
  const cancel = useMutation(api.express.cancel);
  const remove = useMutation(api.express.remove);

  const [urls, setUrls] = useState<Record<string, string>>({});
  const anyRunning = rows?.some((r) => r.status === "building") ?? false;
  const now = useNow(anyRunning);

  const money = (minor: number, currency: string) =>
    (minor / 100).toLocaleString("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Express builds</h1>
        <p className="mt-1 text-sm text-secondary">
          Two hours from the moment you accept. Miss it and the balance is
          written off automatically.
        </p>
      </div>

      {rows === undefined ? (
        <Skeleton />
      ) : rows.length === 0 ? (
        <Empty
          title="No express orders yet"
          body="Anyone who buys the express build appears here. Accept one to start its clock."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const left = row.dueAt && now ? row.dueAt - now : null;
            const late = left !== null && left <= 0;
            const abs = left === null ? 0 : Math.abs(left);
            const pad = (n: number) => String(n).padStart(2, "0");

            return (
              <li key={row._id} className="admin-card">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-primary">
                      {row.name}
                      <span className="ml-2 text-xs text-secondary">
                        {row.email}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-secondary">
                      {row.pages} {row.pages === 1 ? "page" : "pages"} ·{" "}
                      {money(row.depositAmount, row.currency)} paid ·{" "}
                      {row.balanceWaived
                        ? "balance waived"
                        : `${money(row.balanceAmount, row.currency)} due`}
                    </p>
                  </div>

                  {row.status === "building" && left !== null ? (
                    <span
                      className={`shrink-0 text-lg tabular-nums ${
                        late
                          ? "text-[color:var(--danger)]"
                          : abs < 15 * 60_000
                            ? "text-[color:var(--text-notice)]"
                            : "text-primary"
                      }`}
                    >
                      {late ? "−" : ""}
                      {pad(Math.floor(abs / 3_600_000))}:
                      {pad(Math.floor((abs % 3_600_000) / 60_000))}:
                      {pad(Math.floor((abs % 60_000) / 1000))}
                    </span>
                  ) : (
                    <span
                      className={`badge shrink-0 ${
                        row.status === "queued"
                          ? "badge-hot"
                          : row.status === "delivered"
                            ? ""
                            : "badge-cold"
                      }`}
                    >
                      {row.status.replace("_", " ")}
                    </span>
                  )}
                </div>

                <p className="mt-3 text-sm whitespace-pre-wrap text-secondary">
                  {row.brief}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {row.status === "queued" ? (
                    <div className="w-[13rem]">
                      <MiniSlide
                        label="Slide to start the clock"
                        pendingLabel="Starting"
                        doneLabel="Running"
                        ariaLabel={`Start the two-hour clock for ${row.name}`}
                        onConfirm={async () => {
                          await accept({ id: row._id });
                        }}
                      />
                    </div>
                  ) : null}

                  {row.status === "building" ? (
                    <>
                      <input
                        type="url"
                        value={urls[row._id] ?? ""}
                        onChange={(e) =>
                          setUrls((u) => ({ ...u, [row._id]: e.target.value }))
                        }
                        placeholder="https:// where it is live"
                        className="hairline min-w-0 flex-1 rounded-lg bg-surface-1 px-3.5 py-2 text-sm text-primary"
                      />
                      <div className="w-[11.5rem]">
                        <MiniSlide
                          label="Slide to deliver"
                          pendingLabel="Delivering"
                          doneLabel="Delivered"
                          ariaLabel={`Deliver the build for ${row.name}`}
                          disabled={!urls[row._id]?.trim()}
                          onConfirm={async () => {
                            await deliver({
                              id: row._id,
                              url: urls[row._id] ?? "",
                            });
                          }}
                        />
                      </div>
                    </>
                  ) : null}

                  {row.deliveredUrl ? (
                    <a
                      href={row.deliveredUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent transition-opacity duration-fast hover:opacity-80"
                    >
                      Open the site
                    </a>
                  ) : null}

                  <a
                    href={`/express/${row.token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-secondary transition-colors duration-fast hover:text-primary"
                  >
                    Their view
                  </a>

                  {row.status !== "delivered" &&
                  row.status !== "cancelled" ? (
                    <button
                      type="button"
                      onClick={() => void cancel({ id: row._id })}
                      className="text-xs text-secondary transition-colors duration-fast hover:text-[color:var(--text-notice)]"
                    >
                      Cancel
                    </button>
                  ) : null}

                  <div className="ml-auto">
                    <DeleteSlide
                      what={`the express build for ${row.name}`}
                      onDelete={async () => {
                        await remove({ id: row._id });
                      }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
