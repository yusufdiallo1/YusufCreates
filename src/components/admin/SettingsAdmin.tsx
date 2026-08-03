"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { PageHeader } from "@/components/admin/PageHeader";
import { Skeleton } from "@/components/admin/ProjectsAdmin";

/**
 * Settings.
 *
 * Only holds what the site reads at runtime and I want to change without a
 * deploy. API keys are deliberately absent: a settings table is readable by
 * any query that forgets its auth check, and one missing requireAdmin should
 * never be able to leak a Stripe key. The integrations panel therefore reports
 * whether each key is configured, and never what it is.
 *
 * Two things changed in the rebuild.
 *
 * There is no longer a Save button per field. There were seventeen of them,
 * which meant changing three values was three separate saves and forgetting
 * one left the page looking finished when it was not. Fields go dirty on
 * change and one sticky bar saves the lot.
 *
 * And it is no longer one long scroll. Sections became a sub-navigation, so
 * the page is a set of places rather than a column to hunt through — and on a
 * phone that nav is a horizontal scroller rather than eight headings to swipe
 * past.
 */

type Integration = {
  name: string;
  env: string;
  what: string;
  configured: boolean;
};

const SECTIONS = [
  { id: "general", label: "General" },
  { id: "capacity", label: "Capacity" },
  { id: "pricing", label: "Pricing" },
  { id: "integrations", label: "Integrations" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

/** Every key this screen owns, with the default the site falls back to. */
const DEFAULTS: Record<string, string> = {
  availability: "open",
  "reply.window": "24 hours",
  "hours.window": "9:00 – 21:00",
  "hours.timezone": "AST (UTC+3)",
  "notice.text": "",
  "slots.build": "2",
  "slots.care": "2",
  "rate.GBP": "0.79",
  "rate.EUR": "0.92",
};

/**
 * How stale a currency rate may be before it is worth flagging.
 *
 * A drifted rate quotes the wrong price and nothing else would tell you — the
 * figure still renders, it is just wrong. Thirty days is roughly where
 * GBP/EUR movement stops being rounding and starts being real money on a
 * four-figure invoice.
 */
const RATE_STALE_DAYS = 30;

export function SettingsAdmin({
  integrations,
}: {
  integrations: Integration[];
}) {
  const rows = useQuery(api.settings.getAll, {});
  const set = useMutation(api.settings.set);

  const [section, setSection] = useState<SectionId>("general");
  /** Only the keys actually touched. Absent means unchanged. */
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const stored = useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of rows ?? []) map[row.key] = String(row.value ?? "");
    return map;
  }, [rows]);

  const value = (key: string) =>
    draft[key] ?? stored[key] ?? DEFAULTS[key] ?? "";

  const edit = (key: string, next: string) => {
    setSaved(false);
    setDraft((prev) => {
      const committed = stored[key] ?? DEFAULTS[key] ?? "";
      /* Typing a value back to what it already was clears the dirty flag,
         rather than leaving a phantom "1 unsaved change" that saves nothing. */
      if (next === committed) {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      }
      return { ...prev, [key]: next };
    });
  };

  const dirty = Object.keys(draft);

  const save = useCallback(async () => {
    if (dirty.length === 0 || saving) return;
    setSaving(true);
    try {
      // Sequential: nine keys at most, and a partial failure is easier to
      // reason about when the order is known.
      for (const key of dirty) await set({ key, value: draft[key] });
      setDraft({});
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }, [dirty, draft, saving, set]);

  /* ⌘S. The browser's own save dialog is useless here, and intercepting it is
     what anyone expects from an editor-shaped screen. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        void save();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [save]);

  /* Registered only while dirty, so a clean page never prompts on the way
     out — a confirmation you see when you have changed nothing is one you
     learn to dismiss without reading. */
  useEffect(() => {
    if (dirty.length === 0) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty.length]);

  /** Inline and fading, rather than a toast that covers something. */
  useEffect(() => {
    if (!saved) return;
    const id = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(id);
  }, [saved]);

  if (rows === undefined) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Settings"
          description="Runtime values. Secrets live in env vars."
        />
        <Skeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title="Settings"
        description="Runtime values. Secrets live in env vars."
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
        {/* Horizontal scroller on a phone, a column from lg. The negative
            margin lets it bleed to the screen edge so the last item does not
            look clipped mid-word. */}
        <nav
          aria-label="Settings sections"
          className="-mx-4 shrink-0 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:w-44 lg:overflow-visible lg:px-0"
        >
          <ul className="flex gap-1 lg:flex-col">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setSection(s.id)}
                  aria-current={section === s.id ? "page" : undefined}
                  className={`w-full rounded-lg px-3 py-2 text-left text-[13px] whitespace-nowrap transition-colors duration-fast ${
                    section === s.id
                      ? "bg-surface-2 text-primary"
                      : "text-secondary hover:text-primary"
                  }`}
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 flex-1 space-y-6">
          {section === "general" ? (
            <>
              <Row
                label="Available for new projects"
                help="Shown in the hero and the how-I-work section."
              >
                <Toggle
                  checked={value("availability") === "open"}
                  onChange={(on) => edit("availability", on ? "open" : "busy")}
                />
              </Row>
              <Row
                label="Reply window"
                help="The promise made on the enquiry form."
              >
                <Text
                  value={value("reply.window")}
                  onChange={(v) => edit("reply.window", v)}
                />
              </Row>
              <Row label="Working hours" help="Printed beside the reply window.">
                <Text
                  value={value("hours.window")}
                  onChange={(v) => edit("hours.window", v)}
                />
              </Row>
              <Row label="Timezone" help="As a visitor should read it.">
                <Text
                  value={value("hours.timezone")}
                  onChange={(v) => edit("hours.timezone", v)}
                />
              </Row>
              <Row label="Site notice" help="Empty hides the banner entirely.">
                <Text
                  value={value("notice.text")}
                  onChange={(v) => edit("notice.text", v)}
                />
              </Row>
            </>
          ) : null}

          {section === "capacity" ? (
            <>
              <Row
                label="Build slots"
                help="Projects taken at once. The booking grid reads this."
              >
                <Text
                  value={value("slots.build")}
                  onChange={(v) => edit("slots.build", v)}
                  inputMode="numeric"
                />
              </Row>
              <Row label="Care slots" help="Care plans running at once.">
                <Text
                  value={value("slots.care")}
                  onChange={(v) => edit("slots.care", v)}
                  inputMode="numeric"
                />
              </Row>
            </>
          ) : null}

          {section === "pricing" ? (
            <>
              {(["GBP", "EUR"] as const).map((code) => (
                <Row
                  key={code}
                  label={`${code} rate`}
                  help={`How many ${code} to one USD.`}
                  badge={
                    <RateAge
                      updatedAt={
                        rows.find((r) => r.key === `rate.${code}`)?._creationTime
                      }
                    />
                  }
                >
                  <Text
                    value={value(`rate.${code}`)}
                    onChange={(v) => edit(`rate.${code}`, v)}
                    inputMode="decimal"
                  />
                </Row>
              ))}
            </>
          ) : null}

          {section === "integrations" ? (
            <ul className="space-y-1.5">
              {integrations.map((it) => (
                <li
                  key={it.env}
                  className="hairline flex items-center gap-3 rounded-lg px-3 py-2.5"
                >
                  <span
                    aria-hidden="true"
                    className={`size-1.5 shrink-0 rounded-full ${
                      it.configured
                        ? "bg-[color:var(--success)]"
                        : "bg-[color:var(--text-notice)]"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-primary">{it.name}</p>
                    <p className="text-xs text-secondary">{it.what}</p>
                    <code className="admin-meta mt-0.5 block">{it.env}</code>
                  </div>
                  <span className="admin-meta shrink-0">
                    {it.configured ? "set" : "missing"}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {/* Appears only when there is something to save, so it never becomes
          chrome you learn to ignore. Offset by the sidebar on lg. */}
      {dirty.length > 0 || saved ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--border-hairline)] bg-[color:var(--bg-surface-1)]/95 backdrop-blur-md lg:left-60">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <span className="text-[13px] text-secondary" role="status">
              {saved && dirty.length === 0
                ? "Saved"
                : `${dirty.length} unsaved ${dirty.length === 1 ? "change" : "changes"}`}
            </span>

            {dirty.length > 0 ? (
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDraft({})}
                  className="px-3 py-2 text-[13px] text-secondary transition-colors duration-fast hover:text-primary"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving}
                  className="rounded-full bg-primary px-4 py-2 text-[13px] font-medium text-canvas transition-opacity duration-fast hover:opacity-90 disabled:opacity-40"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ bits --- */

/**
 * One setting: label and help left, control right.
 *
 * Was stacked full-width, which spent an entire row on a checkbox. Two
 * columns from md; single column below, where there is no width to trade.
 */
function Row({
  label,
  help,
  badge,
  children,
}: {
  label: string;
  help?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-[1fr_16rem] md:items-start md:gap-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-primary">{label}</span>
          {badge}
        </div>
        {help ? <p className="mt-0.5 text-xs text-secondary">{help}</p> : null}
      </div>
      <div className="md:w-full md:justify-self-end">{children}</div>
    </div>
  );
}

function Text({
  value,
  onChange,
  inputMode,
}: {
  value: string;
  onChange: (v: string) => void;
  inputMode?: "numeric" | "decimal";
}) {
  return (
    <input
      value={value}
      inputMode={inputMode}
      onChange={(e) => onChange(e.target.value)}
      /* text-base on mobile so iOS does not zoom the page on focus. */
      className="hairline w-full rounded-lg bg-surface-1 px-3 py-2 text-base text-primary sm:text-[13px]"
    />
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-10 shrink-0 rounded-full transition-colors duration-fast ${
        checked ? "bg-[color:var(--accent-solid)]" : "bg-surface-3"
      }`}
    >
      <span
        className={`absolute top-1 size-4 rounded-full bg-white transition-transform duration-fast ${
          checked ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
}

/**
 * How old a currency rate is.
 *
 * A stale rate is silently wrong — the pricing page renders a figure either
 * way — so this is the only place its age is visible at all.
 *
 * _creationTime is when the ROW was created, and `set` patches rather than
 * replaces, so for a rate that has been edited this over-reports the age. It
 * is a ceiling, not an exact answer, which is the safe direction for a
 * staleness warning: it can nag early, never late.
 */
function RateAge({ updatedAt }: { updatedAt?: number }) {
  const [now, setNow] = useState<number | null>(null);

  // Read the clock in an effect: comparing against Date.now() during render
  // differs between the server and the first client paint.
  useEffect(() => setNow(Date.now()), []);

  if (!updatedAt || now === null) return null;

  const days = Math.floor((now - updatedAt) / 86_400_000);
  if (days < RATE_STALE_DAYS) {
    return <span className="admin-meta">{days}d</span>;
  }
  return <span className="badge badge-hot">over {RATE_STALE_DAYS}d old</span>;
}
