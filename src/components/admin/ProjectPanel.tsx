"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { FileUpload,
  DeleteSlide,
} from "@/components/admin/shared/Fields";
import { CredentialsPanel } from "@/components/admin/CredentialsPanel";
import { IntakePanel } from "@/components/admin/IntakePanel";
import { MonitoringPanel } from "@/components/admin/MonitoringPanel";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Runs one client project: progress, onboarding, credentials, monitoring,
 * files and the chat thread.
 *
 * This is the other half of the portal. Everything the client sees there —
 * the progress bar, the milestone list, their files, my replies — is written
 * from this panel. Without it the portal renders correctly and stays empty
 * forever, which is worse than not having a portal at all.
 *
 * Nothing here needs a save-and-publish step: `useQuery` on the client side is
 * reactive, so a milestone ticked here moves their progress bar while they are
 * looking at it.
 */

const STATUS_LABEL = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
} as const;

type Status = keyof typeof STATUS_LABEL;

type Draft = {
  title: string;
  description: string;
  status: Status;
};

export function ProjectPanel({
  projectId,
  projectName,
  onClose,
}: {
  projectId: Id<"clientProjects">;
  projectName: string;
  onClose: () => void;
}) {
  /*
   * One tab mounts at a time, and that is not only a performance choice here.
   * Credentials and intake both hold live queries over sensitive data, and an
   * unopened tab that keeps a subscription running is data pulled to the
   * browser for a panel nobody is looking at.
   */
  const [tab, setTab] = useState<
    "progress" | "intake" | "credentials" | "monitoring" | "files" | "chat"
  >("progress");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[color:var(--bg-canvas)]/70 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Manage ${projectName}`}
        className="glass-depth glass-near relative h-full w-full max-w-lg overflow-y-auto p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg text-primary">{projectName}</h2>
            <p className="mt-1 text-xs text-secondary">
              Changes here appear in their portal immediately.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-sm text-secondary transition-colors duration-hover ease-hover hover:text-primary"
          >
            Close
          </button>
        </div>

        {/* Wraps rather than scrolls: six pills at 12px fit two rows on a
            phone, and a horizontally-scrolling tab strip hides the tabs at
            the end from anyone who does not think to swipe it. */}
        <div role="tablist" className="mt-6 flex flex-wrap gap-2">
          {(
            [
              ["progress", "Progress"],
              ["intake", "Intake"],
              ["credentials", "Credentials"],
              ["monitoring", "Monitoring"],
              ["files", "Files"],
              ["chat", "Chat"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`hairline rounded-full px-3.5 py-1.5 text-xs transition-colors duration-hover ease-hover ${
                tab === id ? "bg-surface-2 text-primary" : "text-secondary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "progress" ? <Milestones projectId={projectId} /> : null}
          {tab === "intake" ? <IntakePanel projectId={projectId} /> : null}
          {tab === "credentials" ? (
            <CredentialsPanel projectId={projectId} />
          ) : null}
          {tab === "monitoring" ? (
            <MonitoringPanel projectId={projectId} />
          ) : null}
          {tab === "files" ? <Files projectId={projectId} /> : null}
          {tab === "chat" ? <Chat projectId={projectId} /> : null}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ progress --- */

function Milestones({ projectId }: { projectId: Id<"clientProjects"> }) {
  const saved = useQuery(api.portal.adminMilestones, { projectId });
  const save = useMutation(api.portal.setMilestones);

  const [rows, setRows] = useState<Draft[] | null>(null);
  const [saving, setSaving] = useState(false);

  /*
   * The server list seeds the editor once. Re-seeding on every change would
   * fight the person typing, because saving pushes a new value straight back
   * down the reactive query.
   */
  useEffect(() => {
    if (saved && rows === null) {
      setRows(
        saved.map((m) => ({
          title: m.title,
          description: m.description ?? "",
          status: m.status as Status,
        })),
      );
    }
  }, [saved, rows]);

  if (rows === null) {
    return <p className="text-sm text-secondary">Loading…</p>;
  }

  const update = (i: number, patch: Partial<Draft>) =>
    setRows((r) => r!.map((row, j) => (j === i ? { ...row, ...patch } : row)));

  const done = rows.filter((r) => r.status === "done").length;
  const percent = rows.length === 0 ? 0 : Math.round((done / rows.length) * 100);

  const commit = async (next: Draft[]) => {
    setSaving(true);
    try {
      await save({
        projectId,
        milestones: next
          .filter((r) => r.title.trim() !== "")
          .map((r) => ({
            title: r.title.trim(),
            description: r.description.trim() || undefined,
            status: r.status,
          })),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-secondary">
          {done} of {rows.length} done
        </span>
        <span className="text-sm text-primary tabular-nums">{percent}%</span>
      </div>

      <div className="mt-2 h-1.5 rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-[color:var(--accent)] transition-[width] duration-slow"
          style={{ width: `${percent}%` }}
        />
      </div>

      <ul className="mt-5 space-y-3">
        {rows.map((row, i) => (
          <li key={i} className="hairline rounded-lg bg-surface-1 p-3">
            <input
              value={row.title}
              placeholder="Milestone"
              aria-label={`Milestone ${i + 1} title`}
              onChange={(e) => update(i, { title: e.target.value })}
              className="w-full bg-transparent text-sm text-primary outline-none"
            />
            <input
              value={row.description}
              placeholder="Detail (optional)"
              aria-label={`Milestone ${i + 1} detail`}
              onChange={(e) => update(i, { description: e.target.value })}
              className="mt-1 w-full bg-transparent text-xs text-secondary outline-none"
            />

            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex gap-1.5">
                {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={row.status === s}
                    onClick={() => {
                      const next = rows.map((r, j) =>
                        j === i ? { ...r, status: s } : r,
                      );
                      setRows(next);
                      // Status is the thing the client is watching, so it
                      // saves on click rather than waiting for Save.
                      void commit(next);
                    }}
                    className={`rounded-full px-2.5 py-1 text-[11px] transition-colors duration-hover ease-hover ${
                      row.status === s
                        ? "bg-surface-3 text-primary"
                        : "text-secondary hover:text-primary"
                    }`}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  const next = rows.filter((_, j) => j !== i);
                  setRows(next);
                  void commit(next);
                }}
                className="text-xs text-secondary transition-colors duration-hover ease-hover hover:text-[color:var(--text-notice)]"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() =>
            setRows([...rows, { title: "", description: "", status: "todo" }])
          }
          className="hairline rounded-full px-3.5 py-1.5 text-xs text-primary"
        >
          Add milestone
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void commit(rows)}
          className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-canvas transition-opacity duration-hover ease-hover hover:opacity-90 disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- files --- */

function Files({ projectId }: { projectId: Id<"clientProjects"> }) {
  const files = useQuery(api.portal.adminDeliverables, { projectId });
  const add = useMutation(api.portal.addDeliverable);
  const remove = useMutation(api.portal.removeDeliverable);
  const [name, setName] = useState("");

  return (
    <div>
      <div className="hairline rounded-lg bg-surface-1 p-4">
        <label htmlFor="file-name" className="text-sm text-secondary">
          File name
        </label>
        <input
          id="file-name"
          value={name}
          placeholder="Homepage design v2"
          onChange={(e) => setName(e.target.value)}
          className="hairline mt-2 w-full rounded-lg bg-surface-2 px-3.5 py-2.5 text-sm text-primary"
        />

        <div className="mt-3">
          <FileUpload
            label="Upload"
            onUploaded={async (url) => {
              // Falls back to the filename rather than refusing the upload —
              // the file is already stored by this point, so rejecting it here
              // would orphan it.
              await add({ projectId, name: name.trim() || "Deliverable", url });
              setName("");
            }}
          />
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {files?.map((f) => (
          <li
            key={f._id}
            className="hairline flex items-center justify-between gap-3 rounded-lg bg-surface-1 px-3.5 py-2.5"
          >
            <div className="min-w-0">
              <a
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-sm text-primary hover:text-accent"
              >
                {f.name}
              </a>
              <p className="mt-0.5 text-xs text-secondary">
                v{f.version}
                {f.approvedAt ? " · approved by client" : ""}
              </p>
            </div>
            <DeleteSlide
              what="this file"
              onDelete={async () => {
                await remove({ id: f._id });
              }}
            />
          </li>
        ))}
      </ul>

      {files && files.length === 0 ? (
        <p className="mt-4 text-xs text-secondary">
          Nothing shared yet. Files uploaded here appear in their portal.
        </p>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------- chat --- */

function Chat({ projectId }: { projectId: Id<"clientProjects"> }) {
  const messages = useQuery(api.portal.adminMessages, { projectId });
  const reply = useMutation(api.portal.adminReply);
  const [body, setBody] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const send = async () => {
    const text = body.trim();
    if (!text) return;
    setBody("");
    await reply({ projectId, body: text });
  };

  return (
    <div>
      <div className="max-h-80 space-y-3 overflow-y-auto">
        {messages?.map((m) => (
          <div
            key={m._id}
            className={`max-w-[85%] rounded-xl px-3.5 py-2.5 ${
              m.authorType === "admin"
                ? "ml-auto bg-surface-3"
                : "hairline bg-surface-1"
            }`}
          >
            <p className="text-sm text-primary">{m.body}</p>
            <p className="mt-1 text-[11px] text-secondary">
              {m.authorName} ·{" "}
              {new Date(m.createdAt).toLocaleString("en-GB", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {messages && messages.length === 0 ? (
        <p className="text-xs text-secondary">
          No messages yet. Anything sent here reaches them in their portal.
        </p>
      ) : null}

      <div className="mt-4 flex gap-2">
        <input
          value={body}
          placeholder="Reply…"
          aria-label="Reply to client"
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          className="hairline flex-1 rounded-full bg-surface-1 px-4 py-2.5 text-sm text-primary"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={body.trim() === ""}
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-canvas transition-opacity duration-hover ease-hover hover:opacity-90 disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}
