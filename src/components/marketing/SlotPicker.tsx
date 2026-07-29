"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { FieldError } from "@/components/ui/FieldError";
import { validateEmail, validateRequired } from "@/lib/validate";
import { playConfirmation } from "@/lib/sound";
import { track } from "@/lib/track";

/**
 * Waitlist with a month picker.
 *
 * Two builds and two care plans at a time. Availability is read live from the
 * database rather than a flag I maintain, so a month closes the moment its
 * slots fill and the page cannot advertise work I cannot start.
 *
 * MONTHS, not days. A build start is a week, not an appointment — promising a
 * specific Tuesday six weeks out is a promise you cannot keep, and offering
 * one invites a conversation about a date rather than about the work.
 */

const MONTH_FMT = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function SlotPicker({
  defaultKind = "build",
}: {
  defaultKind?: "build" | "care";
}) {
  const data = useQuery(api.capacity.slots, isConvexConfigured ? {} : "skip");
  const join = useMutation(api.capacity.join);

  const [kind, setKind] = useState<"build" | "care">(defaultKind);
  const [month, setMonth] = useState<number | null>(null);
  const [values, setValues] = useState({
    name: "",
    email: "",
    company: "",
    note: "",
  });
  const [touched, setTouched] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof values) => (v: string) =>
    setValues((prev) => ({ ...prev, [k]: v }));

  const nameProblem = validateRequired(values.name, "your name");
  const emailProblem = validateEmail(values.email);
  const valid = !nameProblem && !emailProblem && month !== null;

  if (!isConvexConfigured) {
    return (
      <p className="text-sm text-secondary">
        Email{" "}
        <a href="mailto:hello@yusufcreates.com" className="text-accent">
          hello@yusufcreates.com
        </a>{" "}
        and I&apos;ll tell you what&apos;s free.
      </p>
    );
  }

  if (state === "done") {
    return (
      <div className="glass-depth glass-far glass-panel p-8 text-center">
        <h2 className="text-2xl">You&apos;re on the list.</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-secondary">
          I&apos;ll email you as soon as the slot opens — usually a couple of
          weeks before it starts. If something shifts earlier, you&apos;ll hear
          sooner.
        </p>
        <p className="mt-6 text-sm text-secondary">
          Something urgent in the meantime?{" "}
          <Link href="/start" className="text-accent">
            Send the details
          </Link>{" "}
          and I&apos;ll see what I can do.
        </p>
      </div>
    );
  }

  const months = data?.months ?? [];

  return (
    <div>
      {/* What is actually free, stated before anything is asked. */}
      {data ? (
        <p className="text-sm text-secondary">
          {data.openNow.build > 0
            ? `${data.openNow.build} of ${data.buildSlots} build ${data.openNow.build === 1 ? "slot" : "slots"} free this month.`
            : "Both build slots are taken this month."}{" "}
          {data.openNow.care > 0
            ? `${data.openNow.care} care plan ${data.openNow.care === 1 ? "place" : "places"} open.`
            : "Care plans are full."}
        </p>
      ) : (
        <p className="text-sm text-secondary">Checking availability…</p>
      )}

      <div
        role="radiogroup"
        aria-label="What you need"
        className="mt-6 flex gap-2"
      >
        {(
          [
            ["build", "A project"],
            ["care", "A care plan"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => {
              setKind(k);
              setMonth(null);
            }}
            className={`hairline rounded-full px-4 py-2 text-sm transition-colors duration-fast ${
              kind === k ? "bg-surface-2 text-primary" : "text-secondary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <fieldset className="mt-8">
        <legend className="text-sm text-secondary">Pick a start month</legend>

        {/*
         * A calendar of the actual slots, not a row of identical cards.
         *
         * Every month showing "2 places left" told you nothing and made a full
         * month look the same as an empty one. Here each slot is drawn
         * individually: taken ones are visibly struck out and unselectable, so
         * scarcity is something you can see rather than read.
         */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {months.map((slot, i) => {
            const total = kind === "build" ? data?.buildSlots ?? 2 : data?.careSlots ?? 2;
            const open = kind === "build" ? slot.buildOpen : slot.careOpen;
            const full = open === 0;
            const selected = month === slot.month;

            return (
              <button
                key={slot.month}
                type="button"
                disabled={full}
                aria-pressed={selected}
                aria-label={`${MONTH_FMT.format(new Date(slot.month))} — ${
                  full ? "fully booked" : `${open} of ${total} places open`
                }`}
                onClick={() => setMonth(slot.month)}
                className={`hairline rounded-xl p-4 text-left transition-all duration-fast ${
                  selected
                    ? "bg-surface-2 ring-1 ring-[color:var(--accent)]"
                    : full
                      ? "cursor-not-allowed opacity-45"
                      : "bg-surface-1 hover:bg-surface-2"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm text-primary">
                    {MONTH_FMT.format(new Date(slot.month))}
                  </span>
                  {i === 0 ? (
                    <span className="text-[10px] tracking-[0.1em] text-secondary uppercase">
                      Soonest
                    </span>
                  ) : null}
                </div>

                {/* One pip per slot. Filled means available. */}
                <div className="mt-3 flex gap-1.5" aria-hidden="true">
                  {Array.from({ length: total }, (_, s) => {
                    const taken = s >= open;
                    return (
                      <span
                        key={s}
                        className={`h-1.5 flex-1 rounded-full ${
                          taken
                            ? "bg-surface-3"
                            : selected
                              ? "bg-[color:var(--accent)]"
                              : "bg-[color:var(--accent)]/60"
                        }`}
                      />
                    );
                  })}
                </div>

                <span className="mt-2.5 block text-xs text-secondary">
                  {full
                    ? "Fully booked"
                    : `${open} of ${total} ${open === 1 ? "place" : "places"} open`}
                </span>
              </button>
            );
          })}
        </div>

        {months.length > 0 && months.every((m) =>
          (kind === "build" ? m.buildOpen : m.careOpen) === 0,
        ) ? (
          <p className="mt-4 text-sm text-secondary">
            Everything in the next few months is taken. Join anyway and
            you&apos;ll be first to hear when something frees up.
          </p>
        ) : null}
      </fieldset>

      <div className="mt-8 space-y-4">
        <Field
          id="wl-name"
          label="Name"
          value={values.name}
          onChange={set("name")}
          error={touched ? nameProblem : null}
        />
        <Field
          id="wl-email"
          label="Email"
          type="email"
          value={values.email}
          onChange={set("email")}
          error={touched ? emailProblem : null}
          placeholder="you@company.com"
        />
        <Field
          id="wl-company"
          label="Company (optional)"
          value={values.company}
          onChange={set("company")}
        />

        <div>
          <label htmlFor="wl-note" className="text-sm text-secondary">
            What are you building? (optional)
          </label>
          <textarea
            id="wl-note"
            rows={3}
            value={values.note}
            onChange={(e) => set("note")(e.target.value)}
            className="hairline mt-2 w-full rounded-lg bg-surface-1 px-4 py-3 text-sm text-primary"
          />
        </div>
      </div>

      <p className="mt-6 text-xs text-secondary">
        By joining you agree to the{" "}
        <Link href="/legal/privacy" className="text-accent">
          privacy policy
        </Link>
        . Holding a slot costs nothing and commits you to nothing.
      </p>

      <button
        type="button"
        disabled={state === "saving"}
        onClick={async () => {
          setTouched(true);
          if (!valid) return;

          setState("saving");
          setError(null);
          try {
            const result = await join({
              name: values.name,
              email: values.email,
              company: values.company || undefined,
              note: values.note || undefined,
              kind,
              slotMonth: month!,
            });

            if (!result.ok) {
              setError(
                result.reason === "full"
                  ? "That month just filled. Pick another — the list updates live."
                  : "That month is not available.",
              );
              setState("idle");
              return;
            }

            playConfirmation();
            track("form_submit", { step: `waitlist_${kind}` });
            setState("done");
          } catch {
            setError("That didn't save. Try again in a moment.");
            setState("idle");
          }
        }}
        className="mt-5 rounded-full bg-[color:var(--accent-solid)] px-6 py-3 text-sm font-medium text-white transition-opacity duration-fast hover:opacity-90 disabled:opacity-40"
      >
        {state === "saving" ? "Saving…" : "Hold my slot"}
      </button>

      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm text-secondary">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="hairline mt-2 w-full rounded-lg bg-surface-1 px-4 py-3 text-sm text-primary placeholder:text-secondary"
      />
      <FieldError>{error}</FieldError>
    </div>
  );
}
