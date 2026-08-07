"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { Field, TextArea } from "@/components/admin/shared/Fields";
import { SlideToConfirm } from "@/components/ui/SlideToConfirm";

/**
 * Broadcast composer.
 *
 * Split view: writing on the left, the real rendered email on the right. The
 * preview is rendered on the server through the same component the send uses,
 * because @react-email/render cannot run in the browser — and a preview that
 * only approximates the output tells you the layout is fine when it is not.
 *
 * Debounced, because it is a network round trip per change. 400ms is long
 * enough to skip mid-word renders and short enough to feel live.
 */
/** Who a broadcast can go to. Resolved server-side from the id alone. */
const AUDIENCES = [
  { id: "newsletter", label: "Newsletter", hint: "Confirmed signups" },
  { id: "clients", label: "Clients", hint: "Everyone with a project" },
  { id: "enterprise", label: "Enterprise", hint: "Enterprise clients only" },
  { id: "all", label: "Everyone", hint: "Newsletter and clients" },
  { id: "custom", label: "Custom", hint: "Type the addresses yourself" },
] as const;

type AudienceId = (typeof AUDIENCES)[number]["id"];

export function BroadcastComposer() {
  /*
   * The audience is chosen, not assumed.
   *
   * Every send used to go to confirmed newsletter subscribers with no
   * choice — there was no way to tell existing clients something without
   * also telling the mailing list, or the reverse.
   */
  const [audience, setAudience] = useState<AudienceId>("newsletter");
  const [customEmail, setCustomEmail] = useState("");

  const counts = useQuery(api.subscribers.audienceCounts, {});

  /*
   * The custom list, parsed the same way the send route parses it.
   *
   * Deliberately mirrors the server rather than trusting it: the header says
   * "going to N people" before anything is sent, and that promise has to
   * match what actually goes out. Same separators, same dedupe.
   */
  const customList = (() => {
    const parts = customEmail
      .split(/[,;\s\n]+/)
      .map((p) => p.trim())
      .filter((p) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p));
    return [...new Set(parts.map((p) => p.toLowerCase()))];
  })();
  const customCount = customList.length;

  const count =
    audience === "custom" ? customCount : (counts?.[audience] ?? 0);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  // Explicit, not inferred from whether the fields are filled — a button
  // should be removable without clearing text you may want back.
  const [includeButton, setIncludeButton] = useState(false);

  const [brief, setBrief] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  const [html, setHtml] = useState("");
  const [testState, setTestState] = useState<"idle" | "sending" | "sent">(
    "idle",
  );
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    // Nothing to render yet. The empty case is handled by deriving `preview`
    // below rather than clearing state here — a synchronous setState in an
    // effect body cascades an extra render on every keystroke.
    if (!subject && !body) return;

    timer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/broadcast/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject,
            body,
            ctaLabel: includeButton ? ctaLabel : "",
            ctaUrl: includeButton ? ctaUrl : "",
          }),
        });
        if (res.ok) setHtml((await res.json()).html);
      } catch {
        // A failed preview is not worth an error state — the next keystroke
        // retries anyway.
      }
    }, 400);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [subject, body, ctaLabel, ctaUrl, includeButton]);

  // Derived, so clearing the fields blanks the preview without an effect
  // writing state on every keystroke.
  const preview = subject || body ? html : "";

  const ready = subject.trim() !== "" && body.trim() !== "";
  /*
   * The test send is OFFERED, not required.
   *
   * It used to gate the real send: `testState === "sent"` had to be true, and
   * editing any field reset it, so changing one word in the subject meant
   * mailing yourself again before you could send at all. For a newsletter you
   * have already sent nineteen times that is friction spent on a mistake you
   * are not making, and the slide-to-confirm below is already the deliberate
   * act that stops an accidental send.
   *
   * The button is still there and still first in the order, because it is
   * genuinely the only way to catch a broken link before it reaches everyone.
   * It is now a recommendation rather than a lock.
   */
  const canSend = ready && count > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Broadcast</h1>
        <p className="mt-1 text-sm text-secondary">
          {/* The suppression note is about the mailing lists. A custom list is
              exactly who you typed, so claiming addresses were filtered out of
              it would be untrue. */}
          {audience === "custom"
            ? `Going to ${count} ${count === 1 ? "address" : "addresses"}, exactly as typed.`
            : counts === undefined
              ? "Loading recipients…"
              : `Going to ${count} ${count === 1 ? "person" : "people"}. Unconfirmed and unsubscribed addresses are never included.`}
        </p>

        {/* Chosen before anything is written. Which list this goes to
            changes what is worth saying, so it belongs above the subject
            rather than beside the send button. */}
        <div
          role="radiogroup"
          aria-label="Audience"
          className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-5"
        >
          {AUDIENCES.map((a) => {
            const active = audience === a.id;
            const n = a.id === "custom" ? null : (counts?.[a.id] ?? 0);
            return (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setAudience(a.id)}
                className={`rounded-xl border p-3 text-left transition-colors duration-hover ease-hover ${
                  active
                    ? "border-[color:var(--accent)] bg-surface-2"
                    : "border-[color:var(--border-hairline)] bg-surface-1 hover:bg-surface-2"
                }`}
              >
                <span className="block text-sm text-primary">
                  {a.label}
                  {n !== null ? (
                    <span className="ml-1.5 text-xs text-secondary tabular-nums">
                      {n}
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-xs text-secondary">
                  {a.hint}
                </span>
              </button>
            );
          })}
        </div>

        {audience === "custom" ? (
          <div className="mt-3">
            <label htmlFor="bc-custom" className="text-xs text-secondary">
              Send to
            </label>
            {/*
              A textarea, not type="email".

              An email input validates its whole value as ONE address, so a
              comma-separated list fails the browser's own check before it can
              be sent. Several lines also read better than one long field once
              there is more than a name or two in it.
            */}
            <textarea
              id="bc-custom"
              rows={3}
              autoComplete="off"
              value={customEmail}
              onChange={(e) => setCustomEmail(e.target.value)}
              placeholder={"someone@example.com\nanother@example.com"}
              className="hairline mt-1.5 w-full max-w-sm rounded-lg bg-surface-1 px-3.5 py-2.5 text-sm text-primary"
            />
            <p className="mt-1.5 text-xs text-secondary">
              {customCount > 0
                ? `${customCount} ${customCount === 1 ? "address" : "addresses"}. Separate with commas or new lines.`
                : "One per line, or separated by commas."}
            </p>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {/* Describe it, and the model fills the fields in — including
              whether a button belongs here at all. Everything it writes is
              editable; nothing sends without you reading it. */}
          <div className="admin-card">
            <p className="text-sm text-primary">Draft it for me</p>
            <p className="mt-1 text-xs text-secondary">
              Say what you want to tell people. Mention a link if there should
              be a button — it will not invent one.
            </p>
            <TextArea
              label="Brief"
              rows={3}
              value={brief}
              onChange={setBrief}
            />
            <button
              type="button"
              disabled={brief.trim() === "" || drafting}
              onClick={async () => {
                setDrafting(true);
                setDraftError(null);
                try {
                  const res = await fetch("/api/compose", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ brief }),
                  });
                  const json = await res.json();
                  if (!res.ok) {
                    setDraftError(json.error ?? "Could not draft that.");
                    return;
                  }
                  setSubject(json.subject ?? "");
                  setBody(json.body ?? "");
                  setIncludeButton(Boolean(json.includeButton));
                  setCtaLabel(json.buttonLabel ?? "");
                  setCtaUrl(json.buttonUrl ?? "");
                  // Reset the button's label so it stops claiming a test was
                  // sent for copy that has since changed. Nothing is gated on
                  // this any more — it is only what the button says.
                  setTestState("idle");
                } catch {
                  setDraftError("Could not reach the drafting service.");
                } finally {
                  setDrafting(false);
                }
              }}
              className="mt-3 rounded-full bg-[color:var(--accent-solid)] px-4 py-2 text-xs font-medium text-white transition-opacity duration-hover ease-hover hover:opacity-90 disabled:opacity-40"
            >
              {drafting ? "Drafting…" : "Draft with AI"}
            </button>
            {draftError ? (
              <p
                role="alert"
                className="mt-2 text-xs text-[color:var(--text-notice)]"
              >
                {draftError}
              </p>
            ) : null}
          </div>

          <Field label="Subject" value={subject} onChange={setSubject} />
          <TextArea
            label="Body"
            rows={14}
            value={body}
            onChange={setBody}
            help="A blank line starts a new paragraph."
          />
          <div>
            <label className="flex items-center gap-2.5 text-sm text-secondary">
              <input
                type="checkbox"
                checked={includeButton}
                onChange={(e) => setIncludeButton(e.target.checked)}
                className="size-4 rounded"
              />
              Include a button
            </label>

            {includeButton ? (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Field
                  label="Button label"
                  value={ctaLabel}
                  onChange={setCtaLabel}
                />
                <Field
                  label="Button URL"
                  value={ctaUrl}
                  onChange={setCtaUrl}
                  placeholder="https://"
                />
              </div>
            ) : (
              <p className="mt-2 text-xs text-secondary">
                Most updates do not need one — a newsletter that always ends in
                a call to action reads as marketing.
              </p>
            )}
          </div>

          <div className="admin-card space-y-4">
            <div>
              <p className="text-sm text-primary">Send yourself a test</p>
              <p className="mt-1 text-xs text-secondary">
                Optional, but it is the only way to catch a broken link before
                it reaches {count} people.
              </p>
              <button
                type="button"
                disabled={!ready || testState === "sending"}
                onClick={async () => {
                  setTestState("sending");
                  setError(null);
                  try {
                    const res = await fetch("/api/broadcast/send", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        subject,
                        body,
                        ctaLabel: includeButton ? ctaLabel : "",
                        ctaUrl: includeButton ? ctaUrl : "",
                        test: true,
                      }),
                    });
                    if (!res.ok) throw new Error("failed");
                    setTestState("sent");
                  } catch {
                    setTestState("idle");
                    setError("The test didn't send. Check the Resend key.");
                  }
                }}
                className="hairline mt-3 rounded-full px-4 py-2 text-xs text-primary transition-colors duration-hover ease-hover hover:bg-surface-2 disabled:opacity-40"
              >
                {testState === "sending"
                  ? "Sending…"
                  : testState === "sent"
                    ? "Test sent — check your inbox"
                    : "Send a test to myself"}
              </button>
            </div>

            <div className="rule" />

            <div>
              <p className="text-sm text-primary">Send for real</p>
              <p className="mt-1 text-xs text-secondary">
                {ready
                  ? "This cannot be recalled."
                  : "Add a subject and a body first."}
              </p>
              <div className="mt-3 max-w-sm">
                <SlideToConfirm
                  purpose="send-broadcast"
                  label={`Slide to send to ${AUDIENCES.find((a) => a.id === audience)?.label ?? ""} (${count})`}
                  disabled={!canSend}
                  ariaLabel={`Slide to send this broadcast to ${count} recipients in the ${audience} audience`}
                  onConfirm={async () => {
                    setError(null);
                    const res = await fetch("/api/broadcast/send", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        subject,
                        body,
                        ctaLabel: includeButton ? ctaLabel : "",
                        ctaUrl: includeButton ? ctaUrl : "",
                        audience,
                        customEmail,
                      }),
                    });
                    const json = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      setError(json.error ?? "The send failed.");
                      throw new Error("send failed");
                    }
                    setResult(
                      `Sent to ${json.sent}${json.failed ? `, ${json.failed} failed` : ""}.`,
                    );
                  }}
                />
              </div>
              {result ? (
                <p role="status" className="mt-3 text-xs text-primary">
                  {result}
                </p>
              ) : null}
              {error ? (
                <p
                  role="alert"
                  className="mt-3 text-xs text-[color:var(--text-notice)]"
                >
                  {error}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm text-secondary">Preview</p>
          <div className="hairline mt-2 overflow-hidden rounded-xl bg-white">
            {preview ? (
              // Sandboxed: the preview is rendered email markup, and it should
              // not be able to run anything or navigate the admin.
              <iframe
                title="Email preview"
                srcDoc={preview}
                sandbox=""
                className="h-[36rem] w-full"
              />
            ) : (
              <div className="flex h-[36rem] items-center justify-center text-sm text-secondary">
                Start typing to see the email.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
