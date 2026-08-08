"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { Field, Markdown } from "@/components/admin/shared/Fields";
import { renderMarkdown } from "@/lib/markdown";
import type { Doc } from "@convex/_generated/dataModel";

/**
 * The contract template, its variables, and every version there has ever been.
 *
 * VERSIONS ARE IMMUTABLE. Saving inserts the next one rather than editing the
 * last; "restore" copies an old body into a NEW version rather than bringing a
 * row back to life. Nothing here can change what an existing contract says —
 * each one snapshots its text at generation, which is the whole reason
 * versioning exists rather than being the thing that protects them.
 */

const UNSET = "[SET THIS]";

export function ContractTemplateAdmin() {
  const active = useQuery(api.contracts.activeTemplate, {});
  const versions = useQuery(api.contracts.listTemplates, {});
  const defaults = useQuery(api.contracts.getDefaults, {});

  const save = useMutation(api.contracts.saveTemplate);
  const saveDefaults = useMutation(api.contracts.saveDefaults);
  const installSeed = useMutation(api.contracts.installSeedTemplate);

  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Doc<"contractTemplates"> | null>(null);

  /*
   * Adopt the loaded template DURING RENDER, not in an effect.
   *
   * This is React's own answer for resetting state when its source changes: an
   * effect would render once with the stale value and again with the fresh
   * one, and the lint rule that forbids it is right to. Keyed on the version
   * id, so it adopts the newly saved version after a save and otherwise leaves
   * the editor alone — a useQuery re-firing mid-edit must never overwrite what
   * is being typed.
   */
  const [loadedVersion, setLoadedVersion] = useState<string | null>(null);
  if (active && active._id !== loadedVersion) {
    setLoadedVersion(active._id);
    setBody(active.body);
    setName(active.name);
  }

  const [defaultsLoaded, setDefaultsLoaded] = useState(false);
  if (defaults && !defaultsLoaded) {
    setDefaultsLoaded(true);
    setValues(defaults as Record<string, string>);
  }

  const preview = useQuery(
    api.contracts.previewBody,
    body ? { body } : "skip",
  );

  const needsName =
    !values.supplierName || values.supplierName.includes(UNSET);

  if (active === undefined) {
    return <p className="text-sm text-secondary">Loading…</p>;
  }

  if (active === null) {
    return (
      <div className="admin-card space-y-3">
        <p className="admin-section-title">No template yet</p>
        <p className="text-[13px] text-secondary">
          Contracts are generated from a versioned markdown template. Install
          the starting one and edit it from here.
        </p>
        <button
          type="button"
          onClick={() => void installSeed({})}
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-canvas"
        >
          Install the starting template
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Named plainly, at the top, because someone will eventually assume
          otherwise and it is cheaper to say it here than to find out later. */}
      <div
        className="hairline rounded-lg p-4 text-[13px] text-secondary"
        role="note"
      >
        <strong className="text-primary">
          This is a working agreement, not a legal document.
        </strong>{" "}
        It sets out the work, the money, the domain and who owns the code, in
        plain English. It has no governing-law clause and no legal boilerplate,
        which is the point — clients read it. For anything high-value or
        high-risk, get a lawyer to write you a second one.
      </div>

      {needsName ? (
        <div
          role="alert"
          className="hairline rounded-lg p-4 text-[13px] text-[color:var(--text-notice)]"
        >
          <strong>Your name isn&apos;t set.</strong> No contract can be
          generated until it is — accepting a proposal will fail rather than
          send out an agreement with <code>{UNSET}</code> where your name should
          be.
        </div>
      ) : null}

      <section className="admin-card space-y-4">
        <p className="admin-section-title">Values used in every contract</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Your full legal name"
            value={values.supplierName ?? ""}
            onChange={(v) => setValues({ ...values, supplierName: v })}
          />
          <Field
            label="Trading as (optional)"
            value={values.supplierTradingName ?? ""}
            onChange={(v) => setValues({ ...values, supplierTradingName: v })}
          />
          <Field
            label="Revision rounds included"
            value={values.revisionLimit ?? ""}
            onChange={(v) => setValues({ ...values, revisionLimit: v })}
          />
          <Field
            label="Feedback turnaround (working days)"
            value={values.feedbackDays ?? ""}
            onChange={(v) => setValues({ ...values, feedbackDays: v })}
          />
        </div>
        <button
          type="button"
          onClick={async () => {
            await saveDefaults({ values });
            setSaved("Values saved.");
          }}
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-canvas"
        >
          Save values
        </button>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <section className="admin-card space-y-4">
          <div className="flex items-baseline justify-between gap-4">
            <p className="admin-section-title">
              Template — currently v{active.version}
            </p>
            <span className="admin-meta">
              editing creates v{active.version + 1}
            </span>
          </div>

          <Field label="Name" value={name} onChange={setName} />
          <Markdown label="Body" value={body} onChange={setBody} />

          <Field
            label="What changed"
            value={note}
            onChange={setNote}
            help="Required. A version history without it is a list of dates."
          />

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={busy || !note.trim() || !body.trim()}
              onClick={async () => {
                setBusy(true);
                setError(null);
                setSaved(null);
                try {
                  await save({ name, body, note });
                  setNote("");
                  setSaved(`Saved as v${active.version + 1}.`);
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : "Could not save.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-canvas disabled:opacity-40"
            >
              {busy ? "Saving…" : "Save as a new version"}
            </button>
            {/* Inline and fading, rather than a toast that covers something. */}
            {saved ? (
              <span className="text-[13px] text-secondary" role="status">
                {saved}
              </span>
            ) : null}
            {error ? (
              <span
                role="alert"
                className="text-[13px] text-[color:var(--text-notice)]"
              >
                {error}
              </span>
            ) : null}
          </div>

          <p className="admin-meta">
            Contracts already signed keep the text they were signed with.
            Unsigned ones can be regenerated against this version from the
            Contracts tab.
          </p>
        </section>

        <aside className="space-y-6">
          <section className="admin-card">
            <p className="admin-section-title">Variables</p>
            <p className="admin-meta mt-1">
              Shown against your most recent proposal.
            </p>
            <dl className="mt-3 space-y-2">
              {(preview ? Object.keys(preview.values ?? {}) : []).map((key) => {
                const sample = (preview?.values as Record<string, string>)[key];
                const used = body.includes(`{{${key}}}`);
                return (
                  <div key={key} className="text-[12px]">
                    <dt
                      className={`font-mono ${used ? "text-primary" : "text-secondary line-through"}`}
                    >
                      {`{{${key}}}`}
                    </dt>
                    <dd className="mt-0.5 truncate text-secondary">
                      {sample || <span className="italic">empty</span>}
                    </dd>
                  </div>
                );
              })}
            </dl>

            {preview && preview.missing.length > 0 ? (
              <p
                role="alert"
                className="mt-4 text-[12px] text-[color:var(--text-notice)]"
              >
                The body asks for {preview.missing.join(", ")}, which nothing
                supplies. A contract cannot be generated while that is true.
              </p>
            ) : null}
          </section>

          <section className="admin-card">
            <p className="admin-section-title">Version history</p>
            <ul className="mt-3 space-y-2">
              {(versions ?? []).map((version) => (
                <li key={version._id} className="hairline rounded-lg p-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[13px] text-primary">
                      v{version.version}
                      {version.active ? (
                        <span className="badge badge-live ml-2">active</span>
                      ) : null}
                    </span>
                    <span className="admin-meta">
                      {new Date(version.createdAt).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                  {version.note ? (
                    <p className="admin-meta mt-1">{version.note}</p>
                  ) : null}
                  <div className="mt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setViewing(version)}
                      className="text-xs text-accent hover:text-primary"
                    >
                      View
                    </button>
                    {!version.active ? (
                      <button
                        type="button"
                        onClick={() => {
                          // Loads it into the editor rather than activating it
                          // directly — restoring is still a save, so it gets a
                          // version number and a note like anything else.
                          setBody(version.body);
                          setName(version.name);
                          setNote(`Restored from v${version.version}.`);
                        }}
                        className="text-xs text-accent hover:text-primary"
                      >
                        Restore
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      {viewing ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setViewing(null)}
            className="absolute inset-0 bg-[color:var(--bg-canvas)]/70 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Template version ${viewing.version}`}
            className="glass-depth glass-near relative h-full w-full max-w-2xl overflow-y-auto p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="admin-title">v{viewing.version}</h2>
                <p className="admin-meta mt-1">{viewing.note}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="text-sm text-secondary hover:text-primary"
              >
                Close
              </button>
            </div>
            <article className="legal-prose mt-6">
              {renderMarkdown(viewing.body)}
            </article>
          </div>
        </div>
      ) : null}
    </div>
  );
}
