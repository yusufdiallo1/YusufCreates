"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { ScoreBadge } from "@/components/admin/ScoreBadge";
import { SlideToConfirm } from "@/components/ui/SlideToConfirm";
import type { Doc } from "@convex/_generated/dataModel";

/**
 * Incoming project requests, awaiting a decision.
 *
 * WHY THIS IS ON THE CLIENTS SCREEN. A request and a client are the same
 * person at two moments, and splitting them across two pages meant the act of
 * accepting someone — the single most consequential thing in the admin — had
 * no home. It happened implicitly, by dragging a status dropdown from
 * "qualified" to "won" on a different screen, with nothing actually created as
 * a result. Now the decision is a button, next to the people it produces.
 *
 * Only undecided requests appear here. Approving or declining removes the card
 * from the list, so the inbox empties as it is worked rather than accumulating
 * a history nobody reads. Decided requests stay queryable — see leads.undecide,
 * which puts one back if the decision was wrong.
 */

/** The next six months, as {value: "2026-09", label: "September 2026"}. */
function upcomingMonths(count = 6): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  const base = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({
      value,
      label: d.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
    });
  }
  return out;
}

export function RequestsInbox() {
  const requests = useQuery(api.leads.pendingDecision, {});

  if (requests === undefined) {
    return (
      <section aria-labelledby="requests-heading" className="space-y-3">
        <Heading count={null} />
        <div className="h-24 animate-pulse rounded-[var(--radius-md)] bg-surface-1" />
      </section>
    );
  }

  return (
    <section aria-labelledby="requests-heading" className="space-y-3">
      <Heading count={requests.length} />

      {requests.length === 0 ? (
        <p className="admin-card text-sm text-secondary">
          Nothing waiting. New project requests land here.
        </p>
      ) : (
        <ul className="space-y-3">
          {requests.map((lead: Doc<"leads">) => (
            <li key={lead._id}>
              <RequestCard lead={lead} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Heading({ count }: { count: number | null }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 id="requests-heading" className="text-lg">
        Requests
      </h2>
      <p className="text-xs text-muted">
        {count === null
          ? "Loading…"
          : count === 0
            ? "All clear"
            : `${count} waiting on you`}
      </p>
    </div>
  );
}

function RequestCard({ lead }: { lead: Doc<"leads"> }) {
  /*
   * Decisions go through /api/requests/decide, not straight to the mutation.
   *
   * Convex cannot send mail, and an acceptance nobody is told about is the
   * failure that stalls the whole flow — the portal unlocks, the invoice sits
   * there, and the client never knows to look. The route runs the same
   * mutation first and then emails, so a mail failure leaves the decision
   * intact rather than rolling it back.
   */
  const [notify, setNotify] = useState(true);

  const decide = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/requests/decide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: lead._id, notify, ...payload }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      email?: string;
    };
    if (!res.ok) throw new Error(data.error ?? "That did not save.");
    return data;
  };

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"instant" | "slot">("instant");
  const [month, setMonth] = useState(upcomingMonths()[0].value);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const months = upcomingMonths();

  return (
    <div className="admin-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-primary">{lead.name || lead.email}</h3>
            <ScoreBadge score={lead.score ?? 0} />
          </div>
          <p className="mt-1 text-xs text-secondary">
            {[lead.company, lead.plan ?? lead.projectType, lead.email]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="control-outline shrink-0 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs text-secondary transition-colors duration-hover ease-hover hover:text-primary"
        >
          {open ? "Hide brief" : "View brief"}
        </button>
      </div>

      {open ? (
        <dl className="hairline-t mt-4 grid gap-x-8 gap-y-3 pt-4 sm:grid-cols-2">
          <Detail label="What it is for" value={lead.projectPurpose} />
          <Detail label="Audience" value={lead.audience} />
          <Detail label="Where they are now" value={lead.currentState} />
          <Detail label="Existing site" value={lead.existingUrl} />
          <Detail label="Timeline" value={lead.timeline} />
          <Detail label="Pages" value={lead.pageCount?.toString()} />
          <Detail label="Platforms" value={lead.platforms} />
          <Detail label="Procurement" value={lead.procurementProcess} />
          <Detail
            label="NDA required"
            value={lead.ndaRequired === undefined ? undefined : lead.ndaRequired ? "Yes" : "No"}
          />
          <Detail label="Decision makers" value={lead.decisionMakers} />
          <Detail label="Message" value={lead.message} wide />
        </dl>
      ) : null}

      {/* The decision. Two slides rather than two buttons: accepting someone
          creates a client, a project and a commitment, and declining closes a
          door. Neither should be one stray click away. */}
      <div className="hairline-t mt-4 space-y-3 pt-4">
        {/* On by default — the whole point of a decision is that the other
            person learns of it. Off is for the spam submission you are
            clearing out, where writing to the address would be the mistake. */}
        <label className="flex items-center gap-2 text-xs text-secondary">
          <input
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
            className="size-3.5 accent-[color:var(--accent)]"
          />
          Email them the decision
        </label>

        {!declining ? (
          <>
            <div
              role="group"
              aria-label="When the work starts"
              className="flex flex-wrap items-center gap-2"
            >
              <ModeButton
                active={mode === "instant"}
                onClick={() => setMode("instant")}
                label="Start now"
                hint="12h to set up"
              />
              <ModeButton
                active={mode === "slot"}
                onClick={() => setMode("slot")}
                label="Book a slot"
                hint="a month ahead"
              />

              {mode === "slot" ? (
                <>
                  <label htmlFor={`month-${lead._id}`} className="sr-only">
                    Which month
                  </label>
                  <select
                    id={`month-${lead._id}`}
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="control-outline rounded-[var(--radius-sm)] bg-surface-1 px-3 py-1.5 text-xs text-primary"
                  >
                    {months.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="w-[13rem]">
                <SlideToConfirm
                  purpose="submit-lead"
                  label={mode === "instant" ? "Slide to accept" : "Slide to book"}
                  completedLabel="Accepted"
                  ariaLabel={`Slide to accept the request from ${lead.name || lead.email}`}
                  onConfirm={async () => {
                    setError(null);
                    try {
                      await decide({
                        decision: "approve",
                        mode,
                        scheduledMonth: mode === "slot" ? month : undefined,
                      });
                    } catch (e) {
                      setError(
                        e instanceof Error ? e.message : "That did not save.",
                      );
                      throw e;
                    }
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => setDeclining(true)}
                className="text-xs text-secondary transition-colors duration-hover ease-hover hover:text-[color:var(--danger)]"
              >
                Decline
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <label
              htmlFor={`reason-${lead._id}`}
              className="block text-xs text-secondary"
            >
              Why? Kept for your reference — nothing is sent automatically.
            </label>
            <input
              id={`reason-${lead._id}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Out of scope, no budget, bad fit…"
              className="control-outline w-full rounded-[var(--radius-sm)] bg-surface-1 px-3 py-2 text-sm text-primary placeholder:text-muted"
            />
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-[13rem]">
                <SlideToConfirm
                  purpose="delete"
                  label="Slide to decline"
                  completedLabel="Declined"
                  ariaLabel={`Slide to decline the request from ${lead.name || lead.email}`}
                  onConfirm={async () => {
                    setError(null);
                    try {
                      await decide({
                        decision: "decline",
                        reason: reason || undefined,
                      });
                    } catch (e) {
                      setError(
                        e instanceof Error ? e.message : "That did not save.",
                      );
                      throw e;
                    }
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeclining(false);
                  setReason("");
                }}
                className="text-xs text-secondary transition-colors duration-hover ease-hover hover:text-primary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {error ? (
          <p role="alert" className="text-xs text-[color:var(--danger)]">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-[var(--radius-sm)] border px-3 py-1.5 text-xs transition-colors duration-hover ease-hover ${
        active
          ? "border-[color:var(--accent)] bg-surface-2 text-primary"
          : "border-[color:var(--outline)] text-secondary hover:text-primary"
      }`}
    >
      {label} <span className="text-muted">· {hint}</span>
    </button>
  );
}

function Detail({
  label,
  value,
  wide,
}: {
  label: string;
  value?: string | null;
  wide?: boolean;
}) {
  // Absent fields are omitted rather than rendered as an em dash. A brief with
  // four answers should look like four answers, not eleven mostly-empty rows.
  if (!value) return null;
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="font-mono text-[11px] tracking-[0.06em] text-muted uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm break-words text-secondary">{value}</dd>
    </div>
  );
}
