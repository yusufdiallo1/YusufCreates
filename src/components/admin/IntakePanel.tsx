"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { SECTIONS } from "@convex/intakeSections";
import { CopyButton } from "@/components/ui/CopyButton";
import type { Id } from "@convex/_generated/dataModel";

/**
 * The onboarding form, from my side.
 *
 * Three jobs, in the order they come up:
 *
 *   1. Send it. One click, idempotent — sending twice must not create a
 *      second form and split the answers across two rows.
 *   2. See what is missing, and get a paragraph I can paste into a message.
 *      A percentage tells me there is a problem; a sentence naming the two
 *      things I am waiting on is what actually moves it.
 *   3. Tick a section off after handling it on a call, because plenty of this
 *      gets answered by someone talking rather than typing.
 */

export function IntakePanel({
  projectId,
}: {
  projectId: Id<"clientProjects">;
}) {
  const intake = useQuery(api.intake.forProject, { projectId });
  const create = useMutation(api.intake.createForProject);
  const mark = useMutation(api.intake.markSectionComplete);

  const [creating, setCreating] = useState(false);

  /*
   * The link has to be absolute — it gets pasted into a message — and this
   * panel only ever mounts inside a drawer the operator opened, so there is
   * no server render to disagree with. Same pattern as ClientsAdmin, which
   * builds the portal link the same way.
   */
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  if (intake === undefined) {
    return (
      <div className="space-y-2" aria-busy="true">
        <div className="h-16 animate-pulse rounded-lg bg-surface-1" />
        <div className="h-16 animate-pulse rounded-lg bg-surface-1" />
      </div>
    );
  }

  if (intake === null) {
    return (
      <div className="hairline rounded-xl px-4 py-8 text-center">
        <p className="text-[13px] text-secondary">
          No onboarding form yet. Send it the moment the deposit clears —
          missing assets is the single largest cause of delay, and every day
          this is not sent is a day it is not being filled in.
        </p>
        <button
          type="button"
          disabled={creating}
          onClick={async () => {
            setCreating(true);
            try {
              await create({ projectId });
            } finally {
              setCreating(false);
            }
          }}
          className="mt-4 min-h-10 rounded-full bg-[color:var(--accent-solid)] px-4 text-[13px] font-medium text-white transition-[filter,opacity] duration-fast hover:brightness-110 disabled:opacity-50"
        >
          {creating ? "Creating…" : "Create the form"}
        </button>
      </div>
    );
  }

  const url = `${origin}/portal/onboarding/${intake.token}`;
  const outstanding = SECTIONS.filter(
    (s) => (intake.sections[s.id]?.status ?? "outstanding") === "outstanding",
  );

  /**
   * The paragraph worth pasting.
   *
   * Written as a message to them rather than as a report to me — the whole
   * point is that it goes straight into a chat window without being rewritten
   * first. Grammatical joins, not a bulleted dump.
   */
  const summary = (() => {
    if (outstanding.length === 0) {
      return `All done on the onboarding form — thank you. Nothing outstanding.`;
    }
    const labels = outstanding.map((s) => s.nudgeLabel);
    const list =
      labels.length === 1
        ? labels[0]
        : `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
    return `Still waiting on ${list}. Everything else is in. You can pick up where you left off here: ${url}`;
  })();

  return (
    <div>
      {/* ---------------------------------------------------- completion --- */}
      <div className="admin-card">
        <div className="flex items-baseline justify-between gap-3">
          <p className="admin-meta">Completion</p>
          <p className="text-sm tabular-nums text-primary">
            {intake.done}/{intake.total}
          </p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-[color:var(--accent)] transition-[width] duration-slow"
            style={{ width: `${intake.percent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-secondary">
          {intake.completedAt
            ? `Finished ${new Date(intake.completedAt).toLocaleDateString()}`
            : `Sent ${new Date(intake.createdAt).toLocaleDateString()} · ${
                intake.nudgedDays.length === 0
                  ? "no nudges yet"
                  : `nudged on day ${intake.nudgedDays.join(" and ")}`
              }`}
        </p>
      </div>

      {/* ------------------------------------------------------- the link --- */}
      <div className="mt-3 flex items-center gap-2">
        <input
          readOnly
          value={url}
          aria-label="Onboarding link"
          onFocus={(e) => e.currentTarget.select()}
          className="hairline min-w-0 flex-1 rounded-lg bg-surface-1 px-3 py-2 font-mono text-xs text-secondary"
        />
        <CopyButton
          value={url}
          label="Copy the onboarding link"
          className="hairline shrink-0 rounded-lg p-2 text-secondary transition-colors duration-fast hover:text-primary"
        />
      </div>

      {/* --------------------------------------------------- the summary --- */}
      <div className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <p className="admin-meta">What is outstanding</p>
          <CopyButton
            value={summary}
            label="Copy the summary"
            className="hairline rounded-full px-2.5 py-1 text-xs text-secondary transition-colors duration-fast hover:text-primary"
          >
            <span className="ml-1">Copy</span>
          </CopyButton>
        </div>
        <p className="hairline mt-2 rounded-lg bg-surface-1 px-3.5 py-2.5 text-[13px] leading-relaxed text-primary">
          {summary}
        </p>
      </div>

      {/* -------------------------------------------------- the sections --- */}
      <ul className="mt-5 space-y-2">
        {SECTIONS.map((section) => {
          const state = intake.sections[section.id]?.status ?? "outstanding";
          const answered = section.fields.filter((f) => {
            const value = intake.responses[`${section.id}.${f.id}`];
            if (value === undefined || value === null || value === "") return false;
            if (Array.isArray(value)) {
              return value.some((v) =>
                typeof v === "string"
                  ? v.trim() !== ""
                  : typeof v === "object" && v !== null
                    ? Object.values(v).some((x) => String(x ?? "").trim() !== "")
                    : Boolean(v),
              );
            }
            return true;
          }).length;

          const fileCount = intake.files.filter(
            (f) => f.sectionId === section.id,
          ).length;

          return (
            <li
              key={section.id}
              className="hairline rounded-lg bg-surface-1 px-3.5 py-2.5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] text-primary">
                    {section.title}
                  </p>
                  <p className="truncate text-xs text-secondary">
                    {answered}/{section.fields.length} answered
                    {fileCount > 0
                      ? ` · ${fileCount} file${fileCount === 1 ? "" : "s"}`
                      : ""}
                    {intake.sections[section.id]?.markedByAdmin
                      ? " · marked by me"
                      : ""}
                  </p>
                </div>

                {/* Words, not just a colour — the band has to survive being
                    printed, screenshotted, or read by someone colourblind. */}
                <span
                  className={`shrink-0 text-xs ${
                    state === "complete"
                      ? "text-[color:var(--success)]"
                      : state === "skipped"
                        ? "text-secondary"
                        : "text-[color:var(--text-notice)]"
                  }`}
                >
                  {state === "complete"
                    ? "Done"
                    : state === "skipped"
                      ? "Skipped"
                      : "Outstanding"}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-3">
                {(
                  [
                    ["complete", "Mark done"],
                    ["skipped", "Mark skipped"],
                    ["outstanding", "Reopen"],
                  ] as const
                )
                  .filter(([status]) => status !== state)
                  .map(([status, label]) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() =>
                        void mark({ projectId, sectionId: section.id, status })
                      }
                      className="text-xs text-secondary transition-colors duration-fast hover:text-primary"
                    >
                      {label}
                    </button>
                  ))}
              </div>
            </li>
          );
        })}
      </ul>

      {/* ---------------------------------------------------- the assets --- */}
      {intake.files.length > 0 ? (
        <a
          href={`/api/intake/${projectId}/assets`}
          className="hairline mt-4 inline-flex min-h-10 items-center rounded-full px-4 text-[13px] text-primary transition-colors duration-fast hover:bg-surface-2"
        >
          Download all {intake.files.length} assets as a zip
        </a>
      ) : null}
    </div>
  );
}
