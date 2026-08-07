"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import type { Doc, Id } from "@convex/_generated/dataModel";

/**
 * Calls on a project: start one, schedule one, or rejoin.
 *
 * Mounted in both the portal and the admin project panel — the two sides need
 * exactly the same three things, and a second near-identical component would
 * be two places to fix every future bug.
 *
 * EITHER SIDE CAN START A CALL. A client who needs five minutes should not
 * have to request a meeting and wait for it to be granted; removing that round
 * trip is most of the reason the portal exists.
 */
export function CallsPanel({
  projectId,
}: {
  projectId: Id<"clientProjects">;
}) {
  const calls = useQuery(api.calls.list, { projectId });
  const schedule = useMutation(api.calls.schedule);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async (scheduled: boolean) => {
    setBusy(true);
    try {
      await schedule({
        projectId,
        title: title.trim() || undefined,
        // datetime-local gives a string in the viewer's own timezone; Date
        // parses it as local and getTime() normalises to UTC, which is what
        // the database stores.
        scheduledAt:
          scheduled && when ? new Date(when).getTime() : undefined,
      });
      setTitle("");
      setWhen("");
    } finally {
      setBusy(false);
    }
  };

  const live = (calls ?? []).filter((c: Doc<"calls">) => !c.endedAt);
  const past = (calls ?? []).filter((c: Doc<"calls">) => c.endedAt);

  return (
    <section aria-labelledby="calls-heading" className="space-y-4">
      <div>
        <h2 id="calls-heading" className="text-lg">
          Calls
        </h2>
        <p className="mt-1 text-xs text-secondary">
          Voice, video, a shared whiteboard and notes written up afterwards.
        </p>
      </div>

      <div className="hairline rounded-[var(--radius-md)] bg-surface-1 p-4">
        <label htmlFor="call-title" className="sr-only">
          What is the call about
        </label>
        <input
          id="call-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What is it about? (optional)"
          className="control-outline w-full rounded-[var(--radius-sm)] bg-surface-2 px-3 py-2 text-sm text-primary placeholder:text-muted"
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void create(false)}
            disabled={busy}
            className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-canvas transition-opacity duration-hover ease-hover hover:opacity-90 disabled:opacity-40"
          >
            Start now
          </button>

          <span className="text-xs text-muted">or</span>

          <label htmlFor="call-when" className="sr-only">
            When
          </label>
          <input
            id="call-when"
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="control-outline rounded-[var(--radius-sm)] bg-surface-2 px-3 py-2 text-xs text-primary"
          />
          <button
            type="button"
            onClick={() => void create(true)}
            disabled={busy || !when}
            className="control-outline rounded-full px-4 py-2 text-xs text-secondary transition-colors duration-hover ease-hover hover:text-primary disabled:opacity-40"
          >
            Schedule
          </button>
        </div>
      </div>

      {live.length > 0 ? (
        <ul className="space-y-2">
          {live.map((c: Doc<"calls">) => (
            <li
              key={c._id}
              className="hairline flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] bg-surface-1 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm text-primary">{c.title || "Call"}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {c.startedAt
                    ? "In progress"
                    : c.scheduledAt
                      ? new Date(c.scheduledAt).toLocaleString("en-GB", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Ready to join"}
                </p>
              </div>
              <Link
                href={`/call/${c._id}`}
                className="shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-medium text-canvas transition-opacity duration-hover ease-hover hover:opacity-90"
              >
                {c.startedAt ? "Rejoin" : "Join"}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted">No call scheduled.</p>
      )}

      {/* Past calls are worth keeping only for their notes. Ones with no
          summary are hidden rather than listed as empty rows. */}
      {past.some((c: Doc<"calls">) => c.summary) ? (
        <div className="hairline-t pt-4">
          <h3 className="text-xs tracking-[0.06em] text-muted uppercase">
            Previous calls
          </h3>
          <ul className="mt-3 space-y-3">
            {past
              .filter((c: Doc<"calls">) => c.summary)
              .map((c: Doc<"calls">) => (
                <li key={c._id}>
                  <p className="text-sm text-primary">
                    {c.title || "Call"}
                    <span className="ml-2 text-xs text-muted">
                      {new Date(c.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </p>
                  <p className="mt-1 text-sm whitespace-pre-wrap text-secondary">
                    {c.summary}
                  </p>
                </li>
              ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
