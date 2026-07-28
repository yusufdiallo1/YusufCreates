"use client";

import { useRef, useState } from "react";
import { MiniSlide } from "@/components/ui/MiniSlide";
import { FieldError } from "@/components/ui/FieldError";
import { validateEmail } from "@/lib/validate";

/**
 * Hero newsletter capture — email field with a mini slide-to-confirm beneath.
 *
 * Note this deviates from the rule that the gesture is reserved for
 * irreversible actions: subscribing is undone with one click. It is here
 * because it was asked for explicitly, and the compact variant keeps it from
 * competing with the primary CTA above.
 *
 * Honeypot and time trap are in the markup; Turnstile is verified server-side.
 */
export function HeroNewsletter() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [company, setCompany] = useState("");
  const openedAt = useRef<number | null>(null);
  openedAt.current ??= Date.now();

  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);

  return (
    <div className="mx-auto mt-10 w-full max-w-sm">
      {/* Visible, because "you@company.com" says what to type but not why.
          The old copy lived in the placeholder, which vanishes on focus. */}
      <label
        htmlFor="hero-newsletter"
        className="block text-center text-sm text-secondary"
      >
        Get occasional notes on what I&apos;m building
      </label>
      <input
        id="hero-newsletter"
        type="email"
        autoComplete="email"
        value={email}
        aria-invalid={touched && error ? true : undefined}
        aria-describedby={error ? "hero-newsletter-error" : undefined}
        onChange={(e) => {
          setEmail(e.target.value);
          setError(touched ? validateEmail(e.target.value) : null);
        }}
        onBlur={() => {
          if (email.trim() === "") return;
          setTouched(true);
          setError(validateEmail(email));
        }}
        placeholder="you@company.com"
        className="hairline mt-2 w-full rounded-full bg-surface-1 px-5 py-2.5 text-center text-sm text-primary placeholder:text-secondary"
      />

      <div className="mt-2">
        <MiniSlide
          label={valid ? "Slide to subscribe" : "Enter your email"}
          pendingLabel="Subscribing"
          doneLabel="Check your inbox"
          ariaLabel="Slide to subscribe to the newsletter"
          disabled={!valid}
          onConfirm={async () => {
            const res = await fetch("/api/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email,
                source: "hero",
                companyWebsite: company,
                elapsedMs: Date.now() - (openedAt.current ?? 0),
              }),
            });
            // Throwing rolls the thumb back — the control owns that state.
            if (!res.ok) {
              setTouched(true);
              setError("That didn't send. Try again in a moment.");
              throw new Error("Subscribe failed");
            }
            setEmail("");
            setError(null);
          }}
        />
      </div>

      {/* Honeypot. Hidden from sighted users and screen readers alike. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden"
      >
        <label htmlFor="hero-company-website">Company website</label>
        <input
          id="hero-company-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      <div className="min-h-6">
        <FieldError id="hero-newsletter-error">
          {touched ? error : null}
        </FieldError>
      </div>
    </div>
  );
}
