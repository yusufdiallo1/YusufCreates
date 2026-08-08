"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { SECTIONS, completion } from "@convex/intakeSections";
import { IntakeField } from "@/components/portal/intake/Fields";
import type { UploadedFile } from "@/components/portal/intake/Dropzone";

/**
 * The onboarding form.
 *
 * Six cards, each finishable on its own. Not one long form — a client can do
 * Brand today and Content next week without losing either, and nothing here
 * has a submit button that could throw away a half-filled section.
 *
 * Three things carry that:
 *
 *   1. AUTOSAVE, debounced 800ms per field, with a quiet "Saved". No submit,
 *      so there is no state in which work exists only in the browser.
 *   2. SKIP on every section. A blocked question must never block the form.
 *      "I cannot find the brand guidelines" should cost me one section, not
 *      all six.
 *   3. PER-SECTION completion, so the day-3 nudge can name exactly what is
 *      still missing instead of asking again for everything.
 *
 * Mobile-first, because this gets filled in on a phone. Single column, 16px
 * inputs so iOS does not zoom, 44px targets, and the progress bar pinned to
 * the top so it is always answering "how much more of this is there".
 */

const DEBOUNCE_MS = 800;

type SaveState = "idle" | "saving" | "saved";

export function Intake({ token }: { token: string }) {
  const data = useQuery(
    api.intake.getByToken,
    isConvexConfigured ? { token } : "skip",
  );
  const saveField = useMutation(api.intake.saveField);
  const setStatus = useMutation(api.intake.setSectionStatus);

  /*
   * Local edits, layered over the server's values.
   *
   * The query is reactive, so without this every keystroke would race its own
   * round trip and the cursor would jump when the echo arrived. A key stays
   * here only until the write it belongs to lands.
   */
  const [local, setLocal] = useState<Record<string, unknown>>({});
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pending = useRef<Map<string, unknown>>(new Map());
  const [open, setOpen] = useState<string | null>(null);

  /** Writes one field now, bypassing the debounce. */
  const flush = useCallback(
    async (key: string) => {
      const value = pending.current.get(key);
      if (value === undefined) return;

      pending.current.delete(key);
      const [sectionId, fieldId] = key.split(".");

      try {
        await saveField({ token, sectionId, fieldId, value });
        setLocal((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        setSaveState(pending.current.size > 0 ? "saving" : "saved");
      } catch {
        /*
         * The local value is kept on failure. Dropping it would silently
         * revert what they just typed to whatever the server last saw, which
         * looks exactly like the form deleting their work.
         */
        setSaveState("idle");
      }
    },
    [saveField, token],
  );

  const onChange = useCallback(
    (sectionId: string, fieldId: string, value: unknown) => {
      const key = `${sectionId}.${fieldId}`;

      setLocal((prev) => ({ ...prev, [key]: value }));
      pending.current.set(key, value);
      setSaveState("saving");

      clearTimeout(timers.current.get(key));
      timers.current.set(
        key,
        setTimeout(() => void flush(key), DEBOUNCE_MS),
      );
    },
    [flush],
  );

  /** Everything outstanding, now. Used when a section closes. */
  const flushAll = useCallback(() => {
    for (const timer of timers.current.values()) clearTimeout(timer);
    timers.current.clear();
    for (const key of Array.from(pending.current.keys())) void flush(key);
  }, [flush]);

  /*
   * A debounce is a window in which work can be lost. Closing the tab 400ms
   * after the last keystroke should not cost that keystroke, so the pending
   * writes are fired on the way out.
   *
   * visibilitychange as well as pagehide: switching apps on iOS often never
   * fires an unload event at all, and that is the single most likely way this
   * form gets left.
   */
  useEffect(() => {
    const onLeave = () => flushAll();
    window.addEventListener("pagehide", onLeave);
    document.addEventListener("visibilitychange", onLeave);
    return () => {
      window.removeEventListener("pagehide", onLeave);
      document.removeEventListener("visibilitychange", onLeave);
    };
  }, [flushAll]);

  // Timers cleared on unmount so none fires into a dead component.
  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const timer of map.values()) clearTimeout(timer);
    };
  }, []);

  if (!isConvexConfigured) {
    return (
      <Shell>
        <p className="text-sm text-secondary">This is not configured yet.</p>
      </Shell>
    );
  }

  if (data === undefined) {
    return (
      <Shell>
        <div className="h-6 w-48 animate-pulse rounded bg-surface-1" />
        <div className="mt-8 space-y-3">
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="h-20 animate-pulse rounded-xl bg-surface-1" />
          ))}
        </div>
      </Shell>
    );
  }

  if (data === null) {
    return (
      <Shell>
        <h1 className="text-2xl text-primary">This link has expired</h1>
        <p className="mt-3 text-sm text-secondary">
          Reply to any email from me and I will send you a fresh one.
        </p>
      </Shell>
    );
  }

  const { done, total, percent } = completion(data.sections);

  const valueFor = (sectionId: string, fieldId: string) => {
    const key = `${sectionId}.${fieldId}`;
    return key in local ? local[key] : data.responses[key];
  };

  const filesFor = (sectionId: string, fieldId: string): UploadedFile[] =>
    data.files.filter((f) => f.sectionId === sectionId && f.fieldId === fieldId);

  return (
    <Shell>
      <header>
        <p className="admin-meta">{data.projectName}</p>
        <h1 className="mt-1 text-2xl text-primary">
          {data.completedAt ? "All done — thank you" : "Let's get started"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-secondary">
          {data.completedAt
            ? "Everything is in. If something changes, you can still come back and edit any of it."
            : "Six short sections. Each one saves on its own, so you can do one now and the rest whenever — nothing is lost if you stop halfway."}
        </p>
      </header>

      {/* Sticky, because "how much more of this is there" is the question
          someone asks on a phone at section three. */}
      <div className="sticky top-0 z-10 -mx-5 mt-6 bg-[color:var(--bg-canvas)]/90 px-5 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[13px] text-primary">
            {done} of {total} done
          </p>
          <SaveIndicator state={saveState} />
        </div>
        <div
          role="progressbar"
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label="Sections complete"
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2"
        >
          <div
            className="h-full rounded-full bg-[color:var(--accent)] transition-[width] duration-slow"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="mt-6 space-y-3 pb-16">
        {SECTIONS.map((section) => {
          const state = data.sections[section.id]?.status ?? "outstanding";
          const isOpen = open === section.id;

          return (
            <section
              key={section.id}
              className="hairline overflow-hidden rounded-xl bg-surface-1"
            >
              <h2>
                <button
                  type="button"
                  onClick={() => {
                    if (isOpen) flushAll();
                    setOpen(isOpen ? null : section.id);
                  }}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors duration-fast hover:bg-surface-2"
                >
                  <StatusMark status={state} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-primary">
                      {section.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-secondary">
                      {state === "complete"
                        ? "Done"
                        : state === "skipped"
                          ? "Skipped"
                          : "Still to do"}
                    </span>
                  </span>
                  <Chevron open={isOpen} />
                </button>
              </h2>

              {isOpen ? (
                <div className="border-t border-[color:var(--border-hairline)] px-4 py-5">
                  <p className="text-[13px] leading-relaxed text-secondary">
                    {section.blurb}
                  </p>

                  <div className="mt-6 space-y-6">
                    {section.fields.map((field) => (
                      <IntakeField
                        key={field.id}
                        field={field}
                        sectionId={section.id}
                        token={token}
                        value={valueFor(section.id, field.id)}
                        onChange={(next) =>
                          onChange(section.id, field.id, next)
                        }
                        files={filesFor(section.id, field.id)}
                      />
                    ))}
                  </div>

                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        flushAll();
                        void setStatus({
                          token,
                          sectionId: section.id,
                          status: state === "complete" ? "outstanding" : "complete",
                        });
                        if (state !== "complete") setOpen(null);
                      }}
                      className="min-h-11 rounded-full bg-[color:var(--accent-solid)] px-5 text-sm font-medium text-white transition-[filter] duration-fast hover:brightness-110"
                    >
                      {state === "complete" ? "Reopen this section" : "Mark as done"}
                    </button>

                    {/*
                      Skip is a real, first-class answer sitting right next to
                      done — not hidden, not apologetic. Something they cannot
                      answer must cost one section, never the whole form.
                    */}
                    {state !== "complete" ? (
                      <button
                        type="button"
                        onClick={() => {
                          flushAll();
                          void setStatus({
                            token,
                            sectionId: section.id,
                            status: state === "skipped" ? "outstanding" : "skipped",
                          });
                          if (state !== "skipped") setOpen(null);
                        }}
                        className="min-h-11 px-2 text-[13px] text-secondary transition-colors duration-fast hover:text-primary"
                      >
                        {state === "skipped"
                          ? "Un-skip"
                          : "Skip this — I don't have it"}
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      <p className="pb-10 text-xs leading-relaxed text-secondary">
        Stuck on any of this? Reply to any email from me. Every question here
        is skippable and there is almost always a way round.
      </p>
    </Shell>
  );
}

/* ------------------------------------------------------------- pieces --- */

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-2xl px-5 py-10 sm:px-6">{children}</div>;
}

/**
 * The save indicator.
 *
 * aria-live="polite" and deliberately terse. Autosave without any feedback
 * makes people hunt for a save button they will never find, but a chatty
 * region announcing every keystroke is worse than silence for anyone on a
 * screen reader — so it announces only the settled state.
 */
function SaveIndicator({ state }: { state: SaveState }) {
  return (
    <span
      aria-live="polite"
      className={`text-xs transition-opacity duration-fast ${
        state === "idle" ? "opacity-0" : "opacity-100"
      } text-secondary`}
    >
      {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : ""}
    </span>
  );
}

/** Colour never carries this alone — the word "Done" sits beside it. */
function StatusMark({ status }: { status: string }) {
  if (status === "complete") {
    return (
      <span
        aria-hidden="true"
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--success)]/15"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path
            d="M3.5 8.5 L6.5 11.5 L12.5 5"
            stroke="var(--success)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  if (status === "skipped") {
    return (
      <span
        aria-hidden="true"
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-3 text-xs text-secondary"
      >
        –
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className="size-6 shrink-0 rounded-full border border-dashed border-[color:var(--border-hairline)]"
    />
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 text-secondary transition-transform duration-fast ${
        open ? "rotate-180" : ""
      }`}
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
