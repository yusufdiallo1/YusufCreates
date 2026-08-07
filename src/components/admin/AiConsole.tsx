"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { KbAdmin } from "@/components/admin/KbAdmin";

/**
 * The AI console.
 *
 * Three things that were previously one: an assistant I can actually give
 * work to, the public chat logs, and the knowledge base those answers come
 * from. They belong on one page because they feed each other — reading what
 * visitors asked is how you decide what the knowledge base is missing, and
 * the assistant can write the entry for you once you have.
 *
 * The knowledge base tab is the existing KbAdmin unchanged. It already did
 * its job; this only gives it neighbours.
 */

type Tab = "assistant" | "conversations" | "knowledge";

const TABS: { id: Tab; label: string }[] = [
  { id: "assistant", label: "Assistant" },
  { id: "conversations", label: "Conversations" },
  { id: "knowledge", label: "Knowledge" },
];

export function AiConsole() {
  const [tab, setTab] = useState<Tab>("assistant");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">AI</h1>
        <p className="mt-1 text-sm text-secondary">
          Your assistant, what visitors asked it, and what it knows.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="AI sections"
        className="hairline-b flex gap-1"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm transition-colors duration-hover ease-hover ${
              tab === t.id
                ? "border-[color:var(--accent)] text-primary"
                : "border-transparent text-secondary hover:text-primary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/*
        Mounted one at a time. The assistant holds a conversation in local
        state, so keeping all three alive would preserve it across tabs — but
        the conversations tab subscribes to every chat message, and paying for
        that query while reading the knowledge base is the worse trade.
      */}
      {tab === "assistant" ? <Assistant /> : null}
      {tab === "conversations" ? <Conversations /> : null}
      {tab === "knowledge" ? <KbAdmin heading={false} /> : null}
    </div>
  );
}

/* ------------------------------------------------------------ assistant --- */

type Turn = { role: "user" | "assistant"; content: string; tools?: string[] };

/** Openers that demonstrate what it can do, rather than describing it. */
const SUGGESTIONS = [
  "How's the pipeline looking?",
  "What have visitors been asking the chat bot?",
  "Draft a newsletter about the express tier for next Tuesday 9am",
  "What's missing from the knowledge base?",
];

function Assistant() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Follow the conversation down as it grows, but only once there is
  // something to follow — an empty pane must not jump on mount.
  useEffect(() => {
    if (turns.length > 0) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;

    const next: Turn[] = [...turns, { role: "user", content: question }];
    setTurns(next);
    setInput("");
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/admin-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((t) => ({ role: t.role, content: t.content })),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "That didn't go through.");
        /*
         * The question stays in the thread rather than being rolled back.
         * Retrying is one click, and silently deleting what someone typed to
         * report a failure is worse than leaving it there.
         */
        return;
      }

      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || "(no answer)",
          tools: data.toolsUsed?.length ? data.toolsUsed : undefined,
        },
      ]);
    } catch {
      setError("Could not reach the assistant.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-card flex h-[min(70vh,640px)] flex-col p-0">
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {turns.length === 0 ? (
          <div className="flex h-full flex-col justify-center">
            <p className="text-sm text-secondary">
              Ask about the business, or tell it to do something. It reads live
              data and can write to the knowledge base, draft a broadcast, and
              update enquiries.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="hairline rounded-full px-3.5 py-2 text-left text-xs text-secondary transition-colors duration-hover ease-hover hover:text-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {turns.map((turn, i) => (
          <div
            key={i}
            className={turn.role === "user" ? "flex justify-end" : ""}
          >
            <div
              className={
                turn.role === "user"
                  ? "max-w-[85%] rounded-2xl bg-surface-2 px-4 py-2.5 text-sm text-primary"
                  : "max-w-[92%] text-sm whitespace-pre-wrap text-primary"
              }
            >
              {turn.content}
              {turn.tools ? (
                <p className="mt-2 text-[11px] text-secondary">
                  {/* What it actually touched. Without this a written change
                      is indistinguishable from a sentence claiming one. */}
                  used {[...new Set(turn.tools)].join(", ").replace(/_/g, " ")}
                </p>
              ) : null}
            </div>
          </div>
        ))}

        {busy ? (
          <p className="text-sm text-secondary" role="status">
            Thinking…
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-[color:var(--text-notice)]">
            {error}
          </p>
        ) : null}

        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="hairline-t flex items-center gap-3 p-4"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask, or tell it to do something…"
          aria-label="Message the assistant"
          className="min-w-0 flex-1 bg-transparent text-base text-primary outline-none placeholder:text-secondary sm:text-sm"
        />
        <button
          type="submit"
          disabled={busy || input.trim() === ""}
          className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-medium text-canvas transition-opacity duration-hover ease-hover hover:opacity-90 disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}

/* -------------------------------------------------------- conversations --- */

function Conversations() {
  const stats = useQuery(api.chat.stats, {});
  const threads = useQuery(api.chat.threads, { limit: 600 });
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Conversations" value={stats?.sessions} />
        <Stat label="Messages" value={stats?.messages} />
        <Stat label="Questions asked" value={stats?.questions} />
        <Stat label="Last 24 hours" value={stats?.last24h} />
      </div>

      {threads === undefined ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-1" />
          ))}
        </div>
      ) : threads.length === 0 ? (
        <p className="hairline rounded-xl px-5 py-8 text-center text-sm text-secondary">
          Nobody has used the chat widget yet. Conversations appear here as they
          happen.
        </p>
      ) : (
        <ul className="space-y-2">
          {threads.map((thread) => {
            const expanded = open === thread.sessionId;
            return (
              <li key={thread.sessionId} className="hairline rounded-xl">
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? null : thread.sessionId)}
                  className="flex w-full items-start justify-between gap-4 px-4 py-3.5 text-left"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-primary">
                      {thread.opener || "(no question)"}
                    </span>
                    <span className="mt-0.5 block text-xs text-secondary">
                      {thread.turns} {thread.turns === 1 ? "message" : "messages"}
                      {" · "}
                      {relative(thread.lastTs)}
                    </span>
                  </span>
                  <span aria-hidden="true" className="shrink-0 text-secondary">
                    {expanded ? "−" : "+"}
                  </span>
                </button>

                {expanded ? (
                  <div className="hairline-t space-y-3 px-4 py-4">
                    {thread.messages.map((m, i) => (
                      <div key={i}>
                        <p className="text-[11px] text-secondary uppercase">
                          {m.role === "user" ? "Visitor" : "Assistant"}
                        </p>
                        <p className="mt-1 text-sm whitespace-pre-wrap text-primary">
                          {m.content}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value?: number }) {
  return (
    <div className="admin-card">
      <p className="text-xs text-secondary">{label}</p>
      <p className="mt-2 text-2xl text-primary tabular-nums">
        {/* undefined is still loading; 0 is a real answer and must show as one. */}
        {value === undefined ? "—" : value}
      </p>
    </div>
  );
}

/** Hours and days, because a chat log is read in "when", not in dates. */
function relative(ts: number): string {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
