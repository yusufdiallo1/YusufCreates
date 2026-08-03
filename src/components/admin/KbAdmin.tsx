"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import {
  DeleteRow,
  Field,
  TagInput,
  TextArea,
} from "@/components/admin/shared/Fields";
import { Empty, Skeleton } from "@/components/admin/ProjectsAdmin";
import { buildSystemPrompt } from "@/lib/systemPrompt";
import type { Doc } from "@convex/_generated/dataModel";

/**
 * Knowledge base for the site assistant.
 *
 * The console below shows the exact prompt that will be sent, assembled by the
 * same function the chat route uses. If the two were separate, the count shown
 * here would describe a prompt that is not the one in use.
 */

const EMPTY = { question: "", answer: "", tags: [] as string[], priority: 5 };

export function KbAdmin({
  /** False when embedded under a page that already has an h1. */
  heading = true,
}: {
  heading?: boolean;
} = {}) {
  const entries = useQuery(api.kb.list, {});
  const create = useMutation(api.kb.create);
  const update = useMutation(api.kb.update);
  const remove = useMutation(api.kb.remove);

  const [editing, setEditing] = useState<Doc<"kb"> | "new" | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  const prompt = buildSystemPrompt(
    (entries ?? []).map((e) => ({
      question: e.question,
      answer: e.answer,
      priority: e.priority,
    })),
  );

  // A rough figure, and labelled as such. The exact number needs Anthropic's
  // count-tokens endpoint; a character heuristic is close enough to answer
  // "is this prompt getting too big" and not close enough to quote.
  const approxTokens = Math.round(prompt.length / 3.7);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {/*
            Suppressed when this sits inside the AI console, which supplies
            the page's own h1. Two h1s is a real problem, not a cosmetic one:
            a screen reader user navigating by heading finds the page titled
            twice and cannot tell which is the page.
          */}
          {heading ? <h1 className="text-2xl">Knowledge base</h1> : null}
          <p className="mt-1 text-sm text-secondary">
            Question and answer pairs the assistant can draw on. Higher priority
            appears earlier and is offered as an opening suggestion.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-canvas transition-opacity duration-fast hover:opacity-90"
        >
          Add entry
        </button>
      </div>

      <div className="admin-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-primary">Assembled system prompt</p>
            <p className="mt-1 text-xs text-secondary">
              {(entries ?? []).length} entries · ~{approxTokens.toLocaleString()}{" "}
              tokens · {prompt.length.toLocaleString()} characters
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPrompt((v) => !v)}
            className="hairline rounded-full px-3.5 py-1.5 text-xs text-primary transition-colors duration-fast hover:bg-surface-2"
          >
            {showPrompt ? "Hide" : "Show prompt"}
          </button>
        </div>

        {showPrompt ? (
          <pre className="hairline mt-4 max-h-96 overflow-auto rounded-lg bg-surface-1 p-4 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-secondary">
            {prompt}
          </pre>
        ) : null}

        <p className="mt-3 text-xs text-secondary">
          Token count is approximate. The prompt is cached between requests, so
          it must stay byte-identical — nothing per-visitor is interpolated into
          it.
        </p>
      </div>

      {entries === undefined ? (
        <Skeleton />
      ) : entries.length === 0 ? (
        <Empty
          title="No entries yet"
          body="Without these the assistant can only answer from the built-in persona and pricing."
        />
      ) : (
        <ul className="space-y-2">
          {[...entries]
            .sort((a, b) => b.priority - a.priority)
            .map((entry) => (
              <li key={entry._id}>
                <button
                  type="button"
                  onClick={() => setEditing(entry)}
                  className="admin-card block w-full text-left transition-colors duration-fast hover:bg-surface-2"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-sm text-primary">
                      {entry.question}
                    </span>
                    <span className="shrink-0 text-xs text-secondary tabular-nums">
                      P{entry.priority}
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs text-secondary">
                    {entry.answer}
                  </p>
                </button>
              </li>
            ))}
        </ul>
      )}

      {editing ? (
        <KbDrawer
          entry={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (draft) => {
            if (editing === "new") await create(draft);
            else await update({ id: editing._id, ...draft });
            setEditing(null);
          }}
          onDelete={
            editing === "new"
              ? undefined
              : async () => {
                  await remove({ id: editing._id });
                  setEditing(null);
                }
          }
        />
      ) : null}
    </div>
  );
}

function KbDrawer({
  entry,
  onClose,
  onSave,
  onDelete,
}: {
  entry: Doc<"kb"> | null;
  onClose: () => void;
  onSave: (d: typeof EMPTY) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [draft, setDraft] = useState(() =>
    entry
      ? {
          question: entry.question,
          answer: entry.answer,
          tags: entry.tags,
          priority: entry.priority,
        }
      : EMPTY,
  );
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const valid = draft.question.trim() !== "" && draft.answer.trim() !== "";

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
        aria-label={entry ? "Edit entry" : "New entry"}
        className="glass-depth glass-near relative h-full w-full max-w-md overflow-y-auto p-6"
      >
        <h2 className="text-lg text-primary">
          {entry ? "Edit entry" : "New entry"}
        </h2>

        <div className="mt-6 space-y-4">
          <Field
            label="Question"
            value={draft.question}
            onChange={(v) => set("question", v)}
            help="Phrase it the way a visitor would ask it."
          />
          <TextArea
            label="Answer"
            rows={6}
            value={draft.answer}
            onChange={(v) => set("answer", v)}
            help="Be specific. The assistant is told never to invent detail, so anything missing here it will decline to answer."
          />
          <TagInput
            label="Tags"
            values={draft.tags}
            onChange={(v) => set("tags", v)}
          />
          <Field
            label="Priority"
            type="number"
            value={String(draft.priority)}
            onChange={(v) => set("priority", Number(v) || 0)}
            help="0–10. The top four are offered as opening suggestions."
          />
        </div>

        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            disabled={!valid || saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave(draft);
              } finally {
                setSaving(false);
              }
            }}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-secondary hover:text-primary"
          >
            Cancel
          </button>
        </div>

        {onDelete ? (
          <div className="mt-10">
            <DeleteRow what={draft.question} onDelete={onDelete} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
