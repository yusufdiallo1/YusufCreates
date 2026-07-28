"use client";

import { useRef, useState } from "react";
import { FieldError } from "@/components/ui/FieldError";
import { validateEmail } from "@/lib/validate";

/**
 * Newsletter signup.
 *
 * An ordinary button, deliberately — subscribing is reversible and low
 * commitment, so SlideToConfirm would be friction for its own sake and would
 * dilute the gesture where it matters.
 *
 * Two spam layers are here in the markup: a honeypot that is hidden from both
 * sighted users and screen readers, and a time trap. Turnstile verification
 * happens server-side in the route handler.
 */

type Status = "idle" | "sending" | "sent" | "error";

export function NewsletterForm({ className }: { className?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  // Honeypot. A real person never fills this in.
  const [company, setCompany] = useState("");
  // Lazily stamped on first render rather than at module scope, so the timer
  // measures time-on-form rather than time-since-page-load.
  const mountedAt = useRef<number | null>(null);
  mountedAt.current ??= Date.now();

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

    // Time trap: a genuine submission takes more than two seconds.
    const elapsed = Date.now() - (mountedAt.current ?? 0);
    if (company !== "" || elapsed < 2000) {
      // Report success to the bot without writing anything.
      setStatus("sent");
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "footer" }),
      });
      if (!res.ok) throw new Error("Failed");
      setStatus("sent");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className={className}>
      <label htmlFor="newsletter-email" className="text-xs text-secondary uppercase">
        Newsletter
      </label>
      <p className="mt-2 text-sm text-secondary">
        Occasional notes on what I&apos;m building. No schedule, no filler.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          id="newsletter-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          aria-invalid={touched && fieldError ? true : undefined}
          aria-describedby={fieldError ? "newsletter-email-error" : undefined}
          onChange={(e) => {
            setEmail(e.target.value);
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
          {status === "sending" ? "…" : "Subscribe"}
        </button>
      </div>

      {/* Honeypot. aria-hidden and tabIndex -1 keep it away from screen
          readers and keyboard users; only a bot filling every field hits it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="company-website">Company website</label>
        <input
          id="company-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      <FieldError id="newsletter-email-error">
        {touched ? fieldError : null}
      </FieldError>

      <p className="mt-2 text-xs text-secondary">
        By subscribing you agree to the{" "}
        <a
          href="/legal/privacy"
          className="text-accent transition-colors duration-fast hover:text-primary"
        >
          privacy policy
        </a>
        . One click to unsubscribe, any time.
      </p>

      <p role="status" aria-live="polite" className="mt-2 min-h-5 text-xs text-secondary">
        {status === "sent"
          ? "Check your inbox to confirm."
          : status === "error"
            ? "That didn't send. Try again in a moment."
            : ""}
      </p>
    </form>
  );
}
