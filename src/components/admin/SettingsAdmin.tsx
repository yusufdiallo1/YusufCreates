"use client";

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

          {/*
            No currency-rate controls. There were fields for GBP and EUR here,
            warning that a stale rate would make the pricing page quote the
            wrong number — but the site only ever offered USD, SAR and AED,
            and nothing read either value. Editing them changed nothing while
            implying the prices had moved, which is worse than not offering
            the control. SAR and AED are pegged, so there is no rate to keep.
          */}
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

