"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { sessionId, track } from "@/lib/track";
import { ThinkingMark } from "@/components/chat/ThinkingMark";

/**
 * Site assistant.
 *
 * A floating pill that expands into a glass panel. Streams the reply as it
 * arrives, because a chat that sits blank for three seconds reads as broken
 * even when it is working.
 *
 * Accessibility decisions worth naming:
 *
 * - Focus is trapped while open and returns to the pill on close, so a
 *   keyboard user is never left tabbing behind an overlay.
 * - The live region announces the COMPLETED reply, not every token. A live
 *   region updating per-token is unusable with a screen reader — it
 *   interrupts itself continuously.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

interface Turn {
  role: "user" | "assistant";
  content: string;
}

export function ChatPanel({ suggestions = [] }: { suggestions?: string[] }) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Escape closes; Tab cycles within the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        pillRef.current?.focus();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Keep the newest message in view as it streams.
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [turns]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    setError(null);
    setDraft("");
    const next: Turn[] = [...turns, { role: "user", content: trimmed }];
    setTurns([...next, { role: "assistant", content: "" }]);
    setBusy(true);
    track("chat_message");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionId(), messages: next }),
      });

      if (res.status === 429) {
        const wait = res.headers.get("Retry-After") ?? "60";
        setTurns(next);
        setError(`That's a lot at once — try again in ${wait} seconds.`);
        return;
      }
      if (!res.ok || !res.body) throw new Error("failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setTurns([...next, { role: "assistant", content: acc }]);
      }
    } catch {
      setTurns(next);
      setError("That didn't get through. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  const last = turns[turns.length - 1];
  // Show the CTA when the finished answer is about money or hiring — matched
  // on the response text rather than asked of the model, because a
  // model-emitted marker leaks into the visible reply when it drifts.
  const showCta =
    !busy &&
    last?.role === "assistant" &&
    /pricing|price|cost|quote|hire|hiring|budget|\$/i.test(last.content);

  return (
    <>
      <button
        ref={pillRef}
        type="button"
        onClick={() => {
          setOpen(true);
          track("chat_open");
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="glass-depth glass-near glass-pill fixed right-5 bottom-5 z-40 flex items-center gap-2 px-4 py-3 text-sm text-primary shadow-lg lg:right-8 lg:bottom-8"
      >
        <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
        Ask a question
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Site assistant"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.28, ease: EASE }}
            /*
              Full-screen on mobile, a floating panel from sm up.

              Anchored to the bottom at a fixed height, the on-screen keyboard
              pushed the panel off the top of the viewport — the input stayed
              visible but everything above it disappeared. Pinning to all four
              edges lets the browser resize it as the keyboard opens instead.

              dvh, never vh: on mobile Safari vh is the LARGEST viewport
              height, so a vh-sized panel extends under the browser chrome.
            */
            className="glass-depth glass-near fixed inset-0 z-50 flex w-full flex-col !rounded-none !p-0 sm:inset-auto sm:right-5 sm:bottom-5 sm:h-[min(32rem,80dvh)] sm:w-[min(24rem,calc(100vw-2.5rem))] sm:!rounded-[28px] lg:right-8 lg:bottom-8"
          >
            <div className="flex items-center justify-between px-5 py-4">
              <p className="text-sm text-primary">Ask about the work</p>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  pillRef.current?.focus();
                }}
                aria-label="Close assistant"
                className="rounded-full p-1.5 text-secondary transition-colors duration-fast hover:text-primary"
              >
                <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true">
                  <path
                    d="M4 4l8 8M12 4l-8 8"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div
              ref={logRef}
              className="flex-1 space-y-4 overflow-y-auto px-5 pb-4"
            >
              {turns.length === 0 ? (
                <div>
                  <p className="text-sm text-secondary">
                    I can answer questions about services, pricing and how
                    Yusuf works. For anything else, the contact form is
                    quicker.
                  </p>
                  {suggestions.length > 0 ? (
                    <ul className="mt-4 space-y-2">
                      {suggestions.map((q) => (
                        <li key={q}>
                          <button
                            type="button"
                            onClick={() => void send(q)}
                            className="w-full rounded-lg bg-surface-2/60 px-3 py-2 text-left text-xs text-primary transition-colors duration-fast hover:bg-surface-2"
                          >
                            {q}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              {turns.map((turn, i) => (
                <div
                  key={i}
                  className={
                    turn.role === "user"
                      ? "ml-auto w-fit max-w-[85%] rounded-2xl bg-surface-2 px-3.5 py-2 text-sm text-primary"
                      : "text-sm whitespace-pre-wrap text-secondary"
                  }
                >
                  {turn.content ||
                    (turn.role === "assistant" && busy ? (
                      <ThinkingMark className="size-7 text-accent" />
                    ) : (
                      ""
                    ))}
                </div>
              ))}

              {showCta ? (
                <Link
                  href="/start"
                  onClick={() => track("cta_click", { cta: "chat-start" })}
                  className="inline-block rounded-full bg-[color:var(--accent-solid)] px-4 py-2 text-xs font-medium text-white"
                >
                  Start a project
                </Link>
              ) : null}

              {error ? (
                <p
                  role="alert"
                  className="text-xs text-[color:var(--text-notice)]"
                >
                  {error}
                </p>
              ) : null}
            </div>

            {/* Completed replies only. Announcing every token makes a screen
                reader interrupt itself continuously. */}
            <p className="sr-only" role="status" aria-live="polite">
              {!busy && last?.role === "assistant" ? last.content : ""}
            </p>

            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void send(draft);
              }}
              className="flex items-center gap-2 px-4 py-3"
            >
              <label htmlFor="chat-input" className="sr-only">
                Your question
              </label>
              <input
                ref={inputRef}
                id="chat-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask something…"
                disabled={busy}
                className="hairline min-w-0 flex-1 rounded-full bg-surface-1 px-4 py-2.5 text-sm text-primary placeholder:text-secondary disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={busy || draft.trim() === ""}
                className="shrink-0 rounded-full bg-primary px-4 py-2.5 text-xs font-medium text-canvas transition-opacity duration-fast hover:opacity-90 disabled:opacity-40"
              >
                {busy ? (
                  <ThinkingMark className="size-4" />
                ) : (
                  "Send"
                )}
              </button>
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
