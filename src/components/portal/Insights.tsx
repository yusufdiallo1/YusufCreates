"use client";

import { useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { DrawnGlyph, type GlyphName } from "@/components/ui/DrawnGlyph";
import type { Id } from "@convex/_generated/dataModel";

/**
 * How the engagement is actually going.
 *
 * Every figure is derived live from the project's own rows — nothing is
 * stored, so nothing can go stale. See portal.insights.
 *
 * WHAT IS DELIBERATELY HERE: the reply-time number. It is the one that can
 * embarrass me, which is exactly why it belongs in the client's view. A
 * response-time promise nobody measures is marketing; one the client can see
 * on their own dashboard is a commitment.
 *
 * WHAT IS DELIBERATELY NOT: tiles that read zero on day one. A project with no
 * files yet should not show "0 files delivered" — that is a criticism of
 * nothing. Each tile omits itself until it has something true to say.
 */
export function Insights({ projectId }: { projectId: Id<"clientProjects"> }) {
  const data = useQuery(api.portal.insights, { projectId });

  if (!data) return null;

  const tiles: { label: string; value: string; hint?: string; glyph: GlyphName }[] = [];

  if (data.milestonesTotal > 0) {
    tiles.push({
      label: "Progress",
      glyph: "progress",
      value: `${data.percentComplete}%`,
      hint: `${data.milestonesDone} of ${data.milestonesTotal} milestones`,
    });
  }

  // Only once there is a previous week to compare against, or this reads as a
  // verdict on a project that started yesterday.
  if (data.doneThisWeek > 0 || data.donePrevWeek > 0) {
    tiles.push({
      label: "This week",
      glyph: "update",
      value: `${data.doneThisWeek} done`,
      hint:
        data.donePrevWeek > 0
          ? `${data.donePrevWeek} last week`
          : "first week of progress",
    });
  }

  if (data.replyMinutes !== null) {
    tiles.push({
      label: "Typical reply",
      glyph: "reply-time",
      value: formatDuration(data.replyMinutes),
      hint: `across ${data.messagesTotal} messages`,
    });
  }

  if (data.filesDelivered > 0) {
    tiles.push({
      label: "Files",
      glyph: "files",
      value: String(data.filesDelivered),
      hint:
        data.filesApproved > 0
          ? `${data.filesApproved} approved`
          : "awaiting your review",
    });
  }

  if (data.callsHeld > 0) {
    tiles.push({
      label: "Calls",
      glyph: "call",
      value: String(data.callsHeld),
      hint: "held so far",
    });
  }

  if (data.daysToTarget !== null) {
    tiles.push({
      label: data.daysToTarget >= 0 ? "Until launch" : "Past target",
      glyph: "stage",
      value: `${Math.abs(data.daysToTarget)}d`,
      hint:
        data.daysRunning !== null ? `${data.daysRunning} days in` : undefined,
    });
  } else if (data.daysRunning !== null && data.daysRunning > 0) {
    tiles.push({
      label: "Running",
      glyph: "uptime",
      value: `${data.daysRunning}d`,
      hint: "since kickoff",
    });
  }

  // Nothing true to say yet. Better than a grid of zeroes.
  if (tiles.length === 0) return null;

  return (
    <section aria-labelledby="insights-heading">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="insights-heading" className="text-lg">
          Where things stand
        </h2>
        {data.lastUpdateAt ? (
          <p className="text-xs text-muted">
            Last update {relativeDay(data.lastUpdateAt)}
          </p>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="hairline rounded-[var(--radius-md)] bg-surface-1 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[11px] tracking-[0.08em] text-muted uppercase">
                {t.label}
              </p>
              <DrawnGlyph name={t.glyph} className="size-4 shrink-0 text-accent" />
            </div>
            <p className="mt-2 text-2xl text-primary tabular-nums">{t.value}</p>
            {t.hint ? (
              <p className="mt-1 text-xs text-secondary">{t.hint}</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

/** Minutes → the coarsest unit that is still honest. */
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / (60 * 24))}d`;
}

function relativeDay(at: number): string {
  const days = Math.round((Date.now() - at) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}
