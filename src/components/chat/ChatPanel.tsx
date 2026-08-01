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

/*
 * How the reply is paced onto the screen.
 *
 * MIN_MS is a floor on the whole exchange, not a fixed delay before it: the
 * text is being written the entire time, so the wait is spent reading rather
 * than watching a spinner.
 */
const MIN_MS = 7000;

/** ~45 chars/sec — a shade quicker than a fast typist, still readable. */
const CHARS_PER_MS = 0.045;

export function ChatPanel({ suggestions = [] }: { suggestions?: string[] }) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
   * The mobile nav overlay covers the page at the same stacking level as the
   * pill and paints after it, so the pill sat on top of the open menu and took
   * taps meant for the nav — which reads as the assistant being broken.
   *
   * Unmounted rather than hidden in CSS: a display:none button is still in the
   * tab order in some engines, and Tailwind's utility layer beats a component
   * rule on `display` anyway. Nav owns the flag on <html>.
   */
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => {
    const read = () =>
      setNavOpen(document.documentElement.dataset.navOpen === "true");
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-nav-open"],
    });
    return () => observer.disconnect();
  }, []);

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

      /*
       * The network fills `acc`; a separate paced loop below drains it to the
       * screen. They are deliberately not the same thing.
       *
       * Groq returns a full paragraph in well under a second, which arrives
       * as a wall of text — it reads as canned, and there is no way to start
       * reading the answer until all of it is there. Metering the release at
       * roughly reading speed means the first sentence is legible while the
       * rest is still coming, and the reply lands as something being written.
       */
      let acc = "";
      let done = false;
      let failed: unknown = null;

      const pump = (async () => {
        try {
          for (;;) {
            const chunk = await reader.read();
            if (chunk.done) break;
            acc += decoder.decode(chunk.value, { stream: true });
          }
        } catch (err) {
          // Recorded rather than thrown: this runs detached, and the paced
          // loop below would otherwise wait forever on a buffer that has
          // stopped growing.
          failed = err;
        } finally {
          done = true;
        }
      })();

      let shown = 0;
      const started = performance.now();

      for (;;) {
        /*
         * The feedback marker is an instruction to the server, not something
         * anyone should read. Cut from the visible text — including a partial
         * one, so the opening brackets never flash on screen while the rest
         * of it is still arriving.
         */
        const visible = acc
          .replace(/\[\[FEEDBACK[\s\S]*?\]\]/g, "")
          .replace(/\[\[FEEDBACK[\s\S]*$/, "")
          .trimEnd();

        if (failed) throw failed;
        if (done && shown >= visible.length) break;

        /*
         * Held at MIN_MS even when the whole answer is already buffered.
         *
         * An answer that appears instantly reads as a lookup, not as thought
         * — so the pace stretches to fill the floor when the reply is short,
         * and never drags past it when the reply is long. The SLOWER of the
         * two rates governs, which is why this is a min and not a max: a max
         * would let either branch race ahead and the floor would never hold.
         */
        const elapsed = performance.now() - started;
        const target = Math.min(
          // Reading speed — the cap on how fast text may appear.
          CHARS_PER_MS * elapsed,
          // The floor, as a rate: the whole reply spread over MIN_MS. For a
          // short answer this is the slower of the two and therefore governs;
          // for a long one reading speed governs and this never bites.
          (visible.length * elapsed) / MIN_MS,
        );
        shown = Math.min(visible.length, Math.max(shown, Math.ceil(target)));

        setTurns([...next, { role: "assistant", content: visible.slice(0, shown) }]);

        // One frame. Typing faster than the screen refreshes is not typing.
        await new Promise((r) => requestAnimationFrame(() => r(null)));
      }

      // Settled before returning, so a late rejection cannot surface as an
      // unhandled one after this handler has already finished.
      await pump;

      setTurns([
        ...next,
        {
          role: "assistant",
          content: acc
            .replace(/\[\[FEEDBACK[\s\S]*?\]\]/g, "")
            .replace(/\[\[FEEDBACK[\s\S]*$/, "")
            .trimEnd(),
        },
      ]);
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
      {navOpen ? null : (
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
      )}

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

              h-dvh alongside inset-0 because the root viewport is set to
              resizes-content — dvh tracks the shrinking visual viewport as
              the keyboard opens, so the composer stays above the keys
              instead of behind them.
            */
            className="glass-depth glass-near fixed inset-0 z-50 flex h-dvh w-full flex-col !rounded-none !p-0 sm:inset-auto sm:right-5 sm:bottom-5 sm:h-[min(32rem,80dvh)] sm:w-[min(24rem,calc(100vw-2.5rem))] sm:!rounded-[28px] lg:right-8 lg:bottom-8"
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
                  href="/pricing"
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
              /* Tighter on a phone, where the keyboard already takes half
                 the screen — and padded for the home indicator so the input
                 does not sit under it. */
              className="flex items-center gap-2 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-3 sm:pb-3"
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
                /* 16px on mobile: anything smaller makes iOS Safari zoom the
                   whole page on focus, which is its own bug to then undo. */
                className="hairline min-w-0 flex-1 rounded-full bg-surface-1 px-3.5 py-2 text-base text-primary placeholder:text-secondary disabled:opacity-60 sm:px-4 sm:py-2.5 sm:text-sm"
              />
              <button
                type="submit"
                disabled={busy || draft.trim() === ""}
                className="shrink-0 rounded-full bg-primary px-3.5 py-2 text-xs font-medium text-canvas transition-opacity duration-fast hover:opacity-90 disabled:opacity-40 sm:px-4 sm:py-2.5"
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
