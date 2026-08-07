"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/**
 * Date and time picker.
 *
 * Replaces `<input type="datetime-local">`, whose dropdown is rendered by the
 * browser in its own chrome and cannot be styled at all — not the background,
 * not the accent, not the typeface. On a near-black admin it appeared as a
 * light grey panel with blue highlights, which is why it looked pasted in from
 * another application.
 *
 * Everything here uses the design tokens, so it matches whatever the theme is
 * doing, including light mode and increased contrast.
 *
 * Values are local time, formatted as "YYYY-MM-DDTHH:mm" — identical to what
 * the native input produced, so callers did not have to change.
 */

const EASE = [0.16, 1, 0.3, 1] as const;
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

const MONTH_FMT = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
});

const DISPLAY_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const pad = (n: number) => String(n).padStart(2, "0");

function toValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parse(value: string): Date {
  const parsed = value ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Grid for a month, Monday-first, padded to whole weeks.
 *
 * getDay() returns 0 for Sunday, so the offset shifts it to a Monday start —
 * getting this wrong silently renders every date one column off.
 */
function monthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function DateTimePicker({
  id,
  label,
  value,
  onChange,
  help,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => parse(value));
  const wrapRef = useRef<HTMLDivElement>(null);
  /** True when the panel would run off the right edge if left-anchored. */
  const [flip, setFlip] = useState(false);

  const selected = value ? parse(value) : null;

  /*
   * Decided on open, from where the field actually is.
   *
   * A breakpoint cannot answer this: the same component sits in a full-width
   * row on one screen and in the right column of a two-up grid on another,
   * and only the second one needs flipping.
   */
  useEffect(() => {
    if (!open || !wrapRef.current) return;
    const PANEL = 19 * 16; // w-[19rem]
    const left = wrapRef.current.getBoundingClientRect().left;
    setFlip(left + PANEL > window.innerWidth - 16);
  }, [open]);

  // Close on outside click and on Escape. Without both, a picker opened by
  // mistake has to be dismissed by selecting something.
  useEffect(() => {
    if (!open) return;

    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const commit = (next: Date) => onChange(toValue(next));

  const setDay = (day: Date) => {
    const base = selected ?? new Date();
    const next = new Date(day);
    next.setHours(base.getHours(), base.getMinutes(), 0, 0);
    commit(next);
  };

  const setTime = (hours: number, minutes: number) => {
    const next = new Date(selected ?? view);
    next.setHours(hours, minutes, 0, 0);
    commit(next);
  };

  const cells = monthGrid(view.getFullYear(), view.getMonth());
  const today = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  return (
    <div ref={wrapRef} className="relative">
      <label htmlFor={id} className="text-sm text-secondary">
        {label}
      </label>

      <button
        id={id}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="hairline mt-2 flex w-full items-center justify-between gap-3 rounded-lg bg-surface-1 px-3.5 py-2.5 text-left text-sm text-primary"
      >
        <span>
          {selected ? DISPLAY_FMT.format(selected) : "Pick a date and time"}
        </span>
        <svg width={15} height={15} viewBox="0 0 16 16" aria-hidden="true" className="shrink-0 text-secondary">
          <rect x={2} y={3} width={12} height={11} rx={2} fill="none" stroke="currentColor" strokeWidth={1.3} />
          <path d="M2 6.5h12M5.5 2v2M10.5 2v2" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" />
        </svg>
      </button>

      {help ? <p className="mt-1.5 text-xs text-secondary">{help}</p> : null}

      <AnimatePresence>
        {open ? (
          <motion.div
            role="dialog"
            aria-label={`Choose ${label.toLowerCase()}`}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.2, ease: EASE }}
            /*
             * Solid, not glass.
             *
             * This used glass-near, which is a 32%-opaque material — over the
             * open page it looked right, but inside a drawer the buttons and
             * body text behind it read straight through the grid and the
             * calendar was genuinely unusable. A popover you have to decode
             * is not a popover.
             *
             * z-50 with an opaque surface and a real shadow: it sits above
             * the drawer, and nothing shows through it.
             */
            /*
             * Right-anchored when there is not room to the left.
             *
             * This was always positioned from its field's left edge, so on a
             * field in the right-hand column of a drawer the 19rem panel ran
             * past the drawer edge and was clipped — Saturday, Sunday and the
             * next-month arrow all disappeared. `flip` is measured on open
             * rather than guessed from a breakpoint, because it depends on
             * where the field happens to sit, not on the viewport.
             *
             * max-w keeps it inside a narrow phone drawer, where neither edge
             * has 19rem to give.
             */
            className={`absolute z-50 mt-2 w-[19rem] max-w-[calc(100vw-3rem)] rounded-2xl border border-[color:var(--border-hairline)] bg-surface-2 p-4 shadow-2xl ${
              flip ? "right-0" : "left-0"
            }`}
          >
            <div className="flex items-center justify-between">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() =>
                  setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))
                }
                className="rounded-md px-2 py-1 text-secondary transition-colors duration-hover ease-hover hover:text-primary"
              >
                ‹
              </button>
              <span className="text-sm text-primary">
                {MONTH_FMT.format(view)}
              </span>
              <button
                type="button"
                aria-label="Next month"
                onClick={() =>
                  setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))
                }
                className="rounded-md px-2 py-1 text-secondary transition-colors duration-hover ease-hover hover:text-primary"
              >
                ›
              </button>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-0.5">
              {DAYS.map((d, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className="py-1 text-center text-[11px] text-secondary"
                >
                  {d}
                </span>
              ))}

              {cells.map((day, i) =>
                day === null ? (
                  <span key={i} />
                ) : (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDay(day)}
                    aria-pressed={selected ? sameDay(day, selected) : false}
                    aria-label={day.toDateString()}
                    className={`rounded-md py-1.5 text-center text-xs transition-colors duration-hover ease-hover ${
                      selected && sameDay(day, selected)
                        ? "bg-[color:var(--accent-solid)] text-white"
                        : sameDay(day, today)
                          ? "text-[color:var(--text-notice)] hover:bg-surface-2"
                          : "text-primary hover:bg-surface-2"
                    }`}
                  >
                    {day.getDate()}
                  </button>
                ),
              )}
            </div>

            <div className="rule my-3" />

            {/* Two selects rather than scroll columns: a native select is
                keyboard-operable for free and does not need 24 rendered
                buttons to pick an hour. */}
            <div className="flex items-center gap-2">
              <label htmlFor={`${id}-h`} className="text-xs text-secondary">
                Time
              </label>
              <select
                id={`${id}-h`}
                value={(selected ?? view).getHours()}
                onChange={(e) =>
                  setTime(Number(e.target.value), (selected ?? view).getMinutes())
                }
                className="hairline rounded-md bg-surface-1 px-2 py-1.5 text-xs text-primary"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {pad(h)}
                  </option>
                ))}
              </select>
              <span className="text-secondary">:</span>
              <select
                aria-label="Minutes"
                /*
                 * Every minute, not every fifth.
                 *
                 * The list used to hold twelve options and the value was
                 * rounded to the nearest five so it always matched one of
                 * them — which meant opening a post scheduled for :07 showed
                 * :05, and saving without touching the field silently moved
                 * it. A picker that quietly edits the value it was given is
                 * worse than one that offers fewer choices.
                 */
                value={(selected ?? view).getMinutes()}
                onChange={(e) =>
                  setTime((selected ?? view).getHours(), Number(e.target.value))
                }
                className="hairline rounded-md bg-surface-1 px-2 py-1.5 text-xs text-primary"
              >
                {Array.from({ length: 60 }, (_, m) => m).map((m) => (
                  <option key={m} value={m}>
                    {pad(m)}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setView(now);
                  commit(now);
                }}
                className="ml-auto text-xs text-accent transition-colors duration-hover ease-hover hover:text-primary"
              >
                Now
              </button>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 w-full rounded-full bg-primary py-2 text-xs font-medium text-canvas"
            >
              Done
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
