"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { motion, useReducedMotion } from "motion/react";
import { api } from "@/lib/convex-api";
import { ScoreBadge } from "@/components/admin/ScoreBadge";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Lead detail drawer.
 *
 * Everything the person submitted, in the order it matters: who they are, how
 * to reach them, what they asked for, then the behavioural signals.
 *
 * The drawer is a real dialog — focus moves in, escape closes, and focus
 * returns to where it was. Without that a keyboard user tabs straight through
 * the drawer into the table behind it, which is disorienting and effectively
 * traps them.
 */

const STATUSES = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
] as const;

export function LeadDrawer({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const lead = useQuery(api.admin.lead, { id: id as Id<"leads"> });
  const setStatus = useMutation(api.admin.setLeadStatus);
  const addNote = useMutation(api.admin.addLeadNote);

  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Remember what had focus so it can be restored on close.
  useEffect(() => {
    returnFocusTo.current = document.activeElement as HTMLElement | null;
    return () => returnFocusTo.current?.focus?.();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !panelRef.current) return;

      // Focus trap. Without this, tabbing leaves the dialog but the backdrop
      // still covers the page, so the user is typing into something invisible.
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Move focus into the panel once it exists.
  useEffect(() => {
    if (lead) panelRef.current?.focus();
  }, [lead]);

  const submitted: [string, unknown][] = lead
    ? ([
        ["Company", lead.company],
        ["Role", lead.role],
        ["Purpose", lead.projectPurpose],
        ["Audience", lead.audience],
        ["Current state", lead.currentState],
        ["Existing site", lead.existingUrl],
        ["Pages", lead.pageCount],
        // Historical only — the question is no longer asked.
        ["Budget", lead.budget],
        ["Timeline", lead.timeline],
        ["Support scope", lead.supportScope],
        /*
         * The care-plan answers were collected and then never shown here —
         * the questions that decide whether a plan can be taken on at all
         * were only visible in the notification email. Two stack fields,
         * because "built with" and "would like it built with" are different
         * answers to different questions.
         */
        ["Site to look after", lead.supportUrl],
        ["Known issues", lead.supportIssues],
        ["Built with", lead.supportStack],
        ["Preferred stack", lead.preferredStack],
        ["Access", lead.supportAccess],
        // As typed. Whether it is still valid is decided when the invoice is
        // raised, not here — a code can expire between inquiry and quote.
        ["Discount code", lead.promoCode],
        ["Procurement", lead.procurementProcess],
        ["NDA required", lead.ndaRequired === true ? "Yes" : undefined],
        ["Target launch", lead.targetLaunch],
        ["Sign-off", lead.decisionMakers],
        ["Source", lead.source],
      ] as [string, unknown][])
    : [];

  const filled = submitted.filter(
    ([, v]) => v !== undefined && v !== null && String(v).trim() !== "",
  );

  const mailto = lead
    ? `mailto:${lead.email}?subject=${encodeURIComponent(
        `Re: your enquiry${lead.projectType ? ` — ${lead.projectType}` : ""}`,
      )}&body=${encodeURIComponent(
        `Hi ${(lead.name || "").split(" ")[0] || "there"},\n\nThanks for getting in touch about ${
          lead.projectPurpose?.trim() || "your project"
        }\n\n`,
      )}`
    : "#";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close lead details"
        onClick={onClose}
        className="absolute inset-0 bg-[color:var(--bg-canvas)]/70 backdrop-blur-sm"
      />

      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Lead details"
        tabIndex={-1}
        initial={reduceMotion ? false : { x: "100%" }}
        animate={{ x: 0 }}
        transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
        className="glass-depth glass-near relative h-full w-full max-w-md overflow-y-auto p-6 outline-none"
      >
        {lead === undefined ? (
          <p className="text-sm text-secondary">Loading…</p>
        ) : lead === null ? (
          <p className="text-sm text-secondary">That lead no longer exists.</p>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="truncate text-lg text-primary">
                  {lead.name || lead.email}
                </h2>
                <p className="mt-1 text-xs text-secondary">
                  {new Date(lead._creationTime).toLocaleString("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="shrink-0 rounded-full p-1.5 text-secondary transition-colors duration-hover ease-hover hover:text-primary"
              >
                <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true">
                  <path
                    d="M4 4l8 8M12 4l-8 8"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <ScoreBadge score={lead.score ?? 0} />
              {lead.projectType ? (
                <span className="badge">{lead.projectType}</span>
              ) : null}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <a
                href={mailto}
                className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-canvas transition-opacity duration-hover ease-hover hover:opacity-90"
              >
                Reply by email
              </a>
              {lead.phone ? (
                <a
                  href={`tel:${lead.phone.replace(/\s/g, "")}`}
                  className="hairline rounded-full px-4 py-2 text-xs text-primary transition-colors duration-hover ease-hover hover:bg-surface-2"
                >
                  Call
                </a>
              ) : null}
            </div>

            <Section title="Contact">
              <Row label="Email" value={lead.email} />
              {lead.phone ? <Row label="Phone" value={lead.phone} /> : null}
              {lead.contactPreference ? (
                <Row label="Prefers" value={lead.contactPreference} />
              ) : null}
            </Section>

            <Section title="Pipeline">
              <label htmlFor="drawer-status" className="sr-only">
                Lead status
              </label>
              <select
                id="drawer-status"
                value={lead.status}
                onChange={(e) =>
                  void setStatus({
                    id: lead._id,
                    status: e.target.value as (typeof STATUSES)[number],
                  })
                }
                className="hairline w-full rounded-lg bg-surface-1 px-3 py-2 text-sm text-primary"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Section>

            {filled.length > 0 ? (
              <Section title="What they submitted">
                {filled.map(([label, value]) => (
                  <Row key={label} label={label} value={String(value)} />
                ))}
              </Section>
            ) : null}

            {lead.message ? (
              <Section title="Message">
                <p className="text-sm whitespace-pre-wrap text-primary">
                  {lead.message}
                </p>
              </Section>
            ) : null}

            {lead.slideSignals ? (
              <Section title="Slide signals">
                <p className="mb-2 text-xs text-secondary">
                  Behavioural read from the confirm gesture. A signal, never a
                  verdict — keyboard and reduced-motion users legitimately
                  produce no pointer samples.
                </p>
                <Row
                  label="Duration"
                  value={`${lead.slideSignals.durationMs} ms`}
                />
                <Row
                  label="Pointer samples"
                  value={String(lead.slideSignals.pointerSamples)}
                />
                <Row
                  label="Peak velocity"
                  value={lead.slideSignals.peakVelocity.toFixed(2)}
                />
                <Row
                  label="Keyboard"
                  value={lead.slideSignals.usedKeyboard ? "Yes" : "No"}
                />
              </Section>
            ) : null}

            <Section title="Notes">
              {lead.notes ? (
                <p className="mb-3 text-xs whitespace-pre-wrap text-secondary">
                  {lead.notes}
                </p>
              ) : null}

              <label htmlFor="drawer-note" className="sr-only">
                Add a note
              </label>
              <textarea
                id="drawer-note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note…"
                className="hairline w-full rounded-lg bg-surface-1 px-3 py-2 text-sm text-primary placeholder:text-secondary"
              />
              <button
                type="button"
                disabled={note.trim() === "" || savingNote}
                onClick={async () => {
                  setSavingNote(true);
                  try {
                    await addNote({ id: lead._id, note });
                    setNote("");
                  } finally {
                    setSavingNote(false);
                  }
                }}
                className="mt-2 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-canvas transition-opacity duration-hover ease-hover hover:opacity-90 disabled:opacity-40"
              >
                {savingNote ? "Saving…" : "Add note"}
              </button>
            </Section>
          </>
        )}
      </motion.div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-7 border-t border-[color:var(--border-hairline)] pt-5">
      <h3 className="mb-3 text-xs tracking-[0.04em] text-secondary uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 py-1 text-sm">
      <span className="w-28 shrink-0 text-xs text-secondary">{label}</span>
      <span className="min-w-0 break-words text-primary">{value}</span>
    </div>
  );
}
