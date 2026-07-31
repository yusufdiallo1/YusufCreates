"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { Skeleton } from "@/components/admin/ProjectsAdmin";

/**
 * Settings.
 *
 * Only holds what the site reads at runtime and I want to change without a
 * deploy. API keys are deliberately absent: a settings table is readable by
 * any query that forgets its auth check, and one missing requireAdmin should
 * never be able to leak a Stripe key. The integrations panel therefore reports
 * whether each key is configured, and never what it is.
 */

type Integration = {
  name: string;
  env: string;
  what: string;
  configured: boolean;
};

export function SettingsAdmin({
  integrations,
}: {
  integrations: Integration[];
}) {
  const rows = useQuery(api.settings.getAll, {});
  const set = useMutation(api.settings.set);

  const value = (key: string, fallback: string) =>
    (rows?.find((r) => r.key === key)?.value as string | undefined) ?? fallback;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-secondary">
          Values the site reads at runtime. Secrets stay in environment
          variables.
        </p>
      </div>

      {rows === undefined ? (
        <Skeleton />
      ) : (
        <>
          <Section
            title="Availability"
            body="Shown in the hero and the how-I-work section."
          >
            <Toggle
              label="Available for new projects"
              checked={value("availability", "open") === "open"}
              onChange={(next) =>
                void set({ key: "availability", value: next ? "open" : "busy" })
              }
            />
          </Section>

          <Section
            title="Currency rates"
            body="Per US dollar. SAR and AED are pegged and set in code; GBP and EUR float, so these are entered by hand — the pricing page reads them live, and a stale rate quotes the wrong number."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <RateField
                label="GBP per USD"
                current={value("rate.GBP", "0.79")}
                onSave={(v) => void set({ key: "rate.GBP", value: v })}
              />
              <RateField
                label="EUR per USD"
                current={value("rate.EUR", "0.92")}
                onSave={(v) => void set({ key: "rate.EUR", value: v })}
              />
            </div>
          </Section>
          <Section
            title="Capacity"
            body="How many projects you take at once. The availability badge, the slot picker and the waitlist all read these — turning work down for a month is a decision made on a Tuesday, not one worth shipping code for."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField
                label="Build slots per month"
                current={value("slots.build", "2")}
                onSave={(v) => void set({ key: "slots.build", value: v })}
              />
              <NumberField
                label="Care slots per month"
                current={value("slots.care", "2")}
                onSave={(v) => void set({ key: "slots.care", value: v })}
              />
            </div>
          </Section>

          <Section
            title="Response time"
            body="Shown on the contact form and after a lead is sent. Say what is true — a promise you miss costs more than a longer one you keep."
          >
            <TextField
              label="Reply within"
              placeholder="24 hours"
              current={value("reply.window", "24 hours")}
              onSave={(v) => void set({ key: "reply.window", value: v })}
            />
          </Section>

          <Section
            title="Working hours"
            body="Shown beside the availability badge, in the visitor's own timezone."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Hours"
                placeholder="9:00 AM – 6:00 PM"
                current={value("hours.window", "9:00 AM – 6:00 PM")}
                onSave={(v) => void set({ key: "hours.window", value: v })}
              />
              <TextField
                label="Timezone"
                placeholder="GMT+3"
                current={value("hours.timezone", "GMT+3")}
                onSave={(v) => void set({ key: "hours.timezone", value: v })}
              />
            </div>
          </Section>

          <Section
            title="Announcement"
            body="A single line shown site-wide, above the nav. Leave blank for none — this is separate from a promo, which carries a discount."
          >
            <TextField
              label="Message"
              placeholder="Booking for March. Two slots left."
              current={value("notice.text", "")}
              onSave={(v) => void set({ key: "notice.text", value: v })}
            />
          </Section>

          <Section
            title="Integrations"
            body="Configured or not. The values themselves are never sent to the browser."
          >
            <ul className="divide-y divide-[color:var(--border-hairline)]">
              {integrations.map((item) => (
                <li
                  key={item.env}
                  className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-primary">{item.name}</p>
                    <p className="mt-0.5 text-xs text-secondary">{item.what}</p>
                    <code className="mt-1 block font-mono text-[11px] text-secondary">
                      {item.env}
                    </code>
                  </div>
                  <span
                    className={`badge shrink-0 ${
                      item.configured ? "badge-warm" : "badge-cold"
                    }`}
                  >
                    {item.configured ? "configured" : "not set"}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        </>
      )}
    </div>
  );
}

function Section({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg">{title}</h2>
      <p className="mt-1 max-w-xl text-xs text-secondary">{body}</p>
      <div className="admin-card mt-4">{children}</div>
    </section>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 text-sm text-primary">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded"
      />
      {label}
    </label>
  );
}


function RateField({
  label,
  current,
  onSave,
}: {
  label: string;
  current: string;
  onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState(current);
  const id = `rate-${label.replace(/\W+/g, "-")}`;
  const dirty = draft !== current;

  return (
    <div>
      <label htmlFor={id} className="text-sm text-secondary">
        {label}
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id={id}
          type="number"
          step="0.001"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="hairline min-w-0 flex-1 rounded-lg bg-surface-1 px-3.5 py-2 text-sm text-primary"
        />
        <button
          type="button"
          disabled={!dirty}
          onClick={() => onSave(draft)}
          className="shrink-0 rounded-lg bg-primary px-3.5 py-2 text-xs font-medium text-canvas disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}

/** A whole number setting. Saves only when changed. */
function NumberField({
  label,
  current,
  onSave,
}: {
  label: string;
  current: string;
  onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState(current);
  const id = `num-${label.replace(/\W+/g, "-")}`;
  const dirty = draft !== current;

  return (
    <div>
      <label htmlFor={id} className="text-sm text-secondary">
        {label}
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id={id}
          type="number"
          min="0"
          step="1"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="hairline min-w-0 flex-1 rounded-lg bg-surface-1 px-3.5 py-2 text-sm text-primary"
        />
        <button
          type="button"
          disabled={!dirty}
          onClick={() => onSave(draft)}
          className="shrink-0 rounded-lg bg-primary px-3.5 py-2 text-xs font-medium text-canvas disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}

/** A free-text setting. Same shape as NumberField, different input. */
function TextField({
  label,
  current,
  placeholder,
  onSave,
}: {
  label: string;
  current: string;
  placeholder?: string;
  onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState(current);
  const id = `txt-${label.replace(/\W+/g, "-")}`;
  const dirty = draft !== current;

  return (
    <div>
      <label htmlFor={id} className="text-sm text-secondary">
        {label}
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id={id}
          type="text"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          className="hairline min-w-0 flex-1 rounded-lg bg-surface-1 px-3.5 py-2 text-sm text-primary placeholder:text-secondary"
        />
        <button
          type="button"
          disabled={!dirty}
          onClick={() => onSave(draft)}
          className="shrink-0 rounded-lg bg-primary px-3.5 py-2 text-xs font-medium text-canvas disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}
