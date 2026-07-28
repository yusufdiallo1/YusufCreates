"use client";

import { useState } from "react";
import Link from "next/link";
import { TextReveal } from "@/components/motion/TextReveal";
import { Reveal } from "@/components/motion/Reveal";
import { FieldError } from "@/components/ui/FieldError";
import { validateEmail } from "@/lib/validate";

/**
 * ContactCTA — the closing band on every marketing page.
 *
 * Alongside the primary CTA there is a single email field for people who are
 * not ready for the full brief. It writes a cold lead with source "cta-band".
 *
 * SlideToConfirm is deliberately NOT used here: the gesture is reserved for
 * irreversible actions, and leaving an email address is neither costly nor
 * hard to undo. Using it on a low-commitment action would make it meaningless
 * where it matters.
 */

type Status = "idle" | "sending" | "sent" | "error";

export function ContactCTA() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [fieldError, setFieldError] = useState<string | null>(null);
  // Errors appear only after a submit attempt or after leaving the field —
  // scolding someone mid-typing is the thing that makes forms feel hostile.
  const [touched, setTouched] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (status === "sending") return;

    const problem = validateEmail(email);
    if (problem) {
      setTouched(true);
      setFieldError(problem);
      return;
    }
    setFieldError(null);

    setStatus("sending");
    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "cta-band" }),
      });
      if (!response.ok) throw new Error("Request failed");
      setStatus("sent");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="relative overflow-hidden px-6 py-32">
      {/* A single soft accent wash behind the headline — no gradient mesh. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-64 w-[min(42rem,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-[100px]"
        style={{ background: "var(--accent-glow)" }}
      />

      <div className="mx-auto max-w-3xl text-center">
        <TextReveal as="h2" by="word" className="block text-4xl">
          Let&apos;s build the thing.
        </TextReveal>

        <Reveal delay={0.1}>
          <p className="mx-auto mt-4 max-w-md text-secondary">
            Tell me what you need. I reply to everything within a day.
          </p>
        </Reveal>

        <Reveal delay={0.18}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/start"
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas transition-opacity duration-fast hover:opacity-90"
            >
              Start a project
            </Link>
            <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-hairline)] px-3 py-1.5 text-xs text-secondary">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-accent"
              />
              Available for new work
            </span>
          </div>
        </Reveal>

        <Reveal delay={0.24}>
          {/* noValidate: the browser's own bubble is unstyleable, renders in OS
              chrome that ignores the theme entirely, and disappears on the next
              keystroke. Validation is ours, so the message can match the page
              and persist for screen readers. */}
          <form
            noValidate
            onSubmit={onSubmit}
            className="mx-auto mt-12 max-w-md"
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <label htmlFor="cta-email" className="sr-only">
                Your email address
              </label>
              <input
                id="cta-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                aria-invalid={touched && fieldError ? true : undefined}
                aria-describedby={fieldError ? "cta-email-error" : undefined}
                onChange={(e) => {
                  setEmail(e.target.value);
                  // Clear as soon as it becomes valid, so the message goes away
                  // the moment it stops being true.
                  if (touched) setFieldError(validateEmail(e.target.value));
                }}
                onBlur={() => {
                  if (email.trim() === "") return;
                  setTouched(true);
                  setFieldError(validateEmail(email));
                }}
                placeholder="you@company.com"
                disabled={status === "sending" || status === "sent"}
                className="hairline min-w-0 flex-1 rounded-full bg-surface-1 px-4 py-2.5 text-sm text-primary placeholder:text-secondary disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={status === "sending" || status === "sent"}
                className="shrink-0 rounded-full border border-[color:var(--border-hairline)] px-4 py-2.5 text-sm text-primary transition-colors duration-fast hover:bg-surface-2 disabled:opacity-60"
              >
                {status === "sending" ? "Sending…" : "Send me a note"}
              </button>
            </div>

            <div className="px-4 text-left">
              <FieldError id="cta-email-error">
                {touched ? fieldError : null}
              </FieldError>
            </div>
          </form>

          <p
            role="status"
            aria-live="polite"
            className="mt-3 min-h-5 text-xs text-secondary"
          >
            {status === "sent"
              ? "Got it — I'll be in touch."
              : status === "error"
                ? "That didn't send. Try hello@yusufcreates.com instead."
                : ""}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
