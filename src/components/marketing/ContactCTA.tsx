"use client";

import { useState } from "react";
import Link from "next/link";
import { TextReveal } from "@/components/motion/TextReveal";
import { Reveal } from "@/components/motion/Reveal";
import { AmbientLight } from "@/components/motion/AmbientLight";
import { WordReveal } from "@/components/motion/WordReveal";
import { Magnetic } from "@/components/motion/Magnetic";
import { Marquee } from "@/components/motion/Marquee";
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

/**
 * What the closing marquee says.
 *
 * The kinds of work, not the tools — the tech ticker at the top of the
 * homepage already lists those, and repeating them here would make the page
 * end where it began. These are the things someone might actually be looking
 * for when they arrive at the bottom still deciding.
 */
const CLOSING_WORDS = [
  "Websites",
  "Web apps",
  "iOS and macOS",
  "Rescues",
  "Aftercare",
  "Ecommerce",
  "Landing pages",
  "Design systems",
  "Integrations",
];

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
    /* AmbientLight replaces the static wash that used to sit here. It is the
       site's ONE light source — a second would give the glass surfaces two
       directions to agree with, which is the specific thing that reads as
       wrong. Below `full` it renders a centred static glow, which is exactly
       what the old wash was. */
    <AmbientLight asSection className="relative overflow-hidden px-6 py-24">
      {/*
        The content now sits inside a panel with an edge.

        It used to be a centred stack floating directly on the ambient wash,
        which gave the tallest, loudest section on the page nothing to hold it
        — the eye had no boundary to land on, so it read as an unfinished
        footer rather than the close. A single bordered surface turns the same
        content into a deliberate ending.

        py-24 rather than py-32 for the same reason: the emptiness was doing
        the opposite of what emptiness is supposed to do here.
      */}
      <div className="glass-depth glass-near glass-panel relative mx-auto max-w-2xl overflow-hidden px-6 py-14 text-center sm:px-12">
        {/* A hairline of accent along the top edge — the one place this
            section spends colour on something other than the button. */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color:var(--accent)]/50 to-transparent"
        />

        <TextReveal as="h2" by="word" className="block text-4xl">
          Let&apos;s build the thing.
        </TextReveal>

        <WordReveal className="mx-auto mt-4 max-w-md text-secondary">
          Tell me what you need. I reply to everything within a day.
        </WordReveal>

        <Reveal delay={0.18}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Magnetic>
              <Link
                href="/pricing"
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas transition-opacity duration-fast hover:opacity-90"
              >
                Start a project
              </Link>
            </Magnetic>
            <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-hairline)] px-3 py-1.5 text-xs text-secondary">
              <span
                aria-hidden="true"
                className="size-1.5 animate-pulse rounded-full bg-accent"
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
            className="mx-auto mt-10 max-w-md"
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

      {/*
        The closing marquee.

        The last thing on every marketing page is a form, and a form is a full
        stop. This is the line under it: the kinds of work, moving, so the page
        ends on something alive rather than on an empty input.

        Outside the panel and at the section's full width — inside it the row
        would have nowhere to travel and would read as a list that happens to
        be sliding. The items are quiet by design; the centre-focus falloff in
        Marquee is what gives the row a reading point.
      */}
      <div className="relative mt-16 -mb-6">
        <Marquee speed={90} gap={0} className="text-secondary">
          {CLOSING_WORDS.map((word) => (
            <span
              key={word}
              className="flex items-center whitespace-nowrap text-lg"
            >
              {word}
              <span aria-hidden="true" className="px-8 text-lg opacity-40">
                ·
              </span>
            </span>
          ))}
        </Marquee>
      </div>
    </AmbientLight>
  );
}
