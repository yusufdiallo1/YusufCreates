"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { Logo } from "@/components/ui/Logo";
import { FieldError } from "@/components/ui/FieldError";
import { ADMIN_PATH } from "@/lib/constants";

/**
 * Admin sign-in — Convex Auth, Password provider.
 *
 * The password is sent to Convex and checked against a stored hash there. It
 * is never compared in the browser, so nothing sensitive ships in the bundle.
 * That claim used to be false in a small way: the admin address was a
 * constant in this file, so it went out in a public chunk. Both fields are
 * typed now.
 *
 * Convex is the only side that decides anything. It checks the address
 * against ADMIN_EMAIL on every attempt and fails closed when that is unset,
 * so this form grants nothing on its own.
 *
 * The password field is disappearing ink: characters stay legible for a
 * moment then fade, and Reveal fades the whole value back in. That is
 * presentation only — the security is entirely server-side.
 */

export function AdminSignIn() {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [value, setValue] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recently typed characters, rendered as fading ghosts over the input.
  const [ghosts, setGhosts] = useState<{ id: number; ch: string }[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    if (ghosts.length === 0) return;
    const timer = setTimeout(() => setGhosts((g) => g.slice(1)), 1100);
    return () => clearTimeout(timer);
  }, [ghosts]);

  function onChange(next: string) {
    if (next.length > value.length) {
      const added = next.slice(value.length);
      setGhosts((g) => [
        ...g,
        ...Array.from(added).map((ch) => ({ id: nextId.current++, ch })),
      ]);
    }
    setValue(next);
    setError(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || value === "" || email.trim() === "") return;

    setBusy(true);
    setError(null);

    try {
      const form = new FormData();
      form.set("email", email.trim());
      form.set("password", value);
      form.set("flow", "signIn");
      await signIn("password", form);
      /*
       * Straight to the real path, not /admin.
       *
       * /admin now always redirects here so it can never act as an
       * auto-login, which means pushing to it after a successful sign-in
       * would bounce right back to this form — a loop that looks like the
       * password was rejected.
       */
      router.push(ADMIN_PATH);
    } catch {
      /*
       * No signUp fallback.
       *
       * It used to retry as signUp when sign-in failed, so that a fresh
       * deployment could create the account on first use. But Convex only
       * checks that the address matches ADMIN_EMAIL — not who is typing — so
       * before I had signed in even once, the first visitor to guess the
       * address could have claimed the admin account with a password of their
       * choosing. Creating it is a one-off, and it belongs on the deployment,
       * not on a public form.
       *
       * Deliberately vague: naming which part was wrong tells an attacker
       * whether the account exists.
       */
      setError("That didn't match. Try again.");
      setBusy(false);
    }
  }

  return (
    <form noValidate onSubmit={submit} className="w-full max-w-sm text-center">
      <Logo variant="mark" className="mx-auto h-8 w-auto" />
      <h1 className="mt-8 text-2xl">Admin</h1>

      {/* A username, not an email.
          Typed rather than hardcoded: the identifier used to be a constant in
          this file, which put a real inbox in a public JS chunk for anyone
          reading the page source. A username gives away nothing even when the
          page is read, and cannot be harvested or guessed from a domain
          record. Convex checks it on every attempt and fails closed, so
          sending it from here grants nothing. */}
      <div className="mt-8">
        <label htmlFor="admin-username" className="sr-only">
          Username
        </label>
        <input
          id="admin-username"
          /* Deliberately `text`. `type="email"` made the browser refuse to
             submit anything without an @, which is exactly what a username
             is. */
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          placeholder="Username"
          className="hairline w-full rounded-full bg-surface-1 px-5 py-3 text-center text-sm"
        />
      </div>

      <div className="relative mt-3">
        <label htmlFor="passphrase" className="sr-only">
          Password
        </label>
        <input
          id="passphrase"
          /*
           * A real password field when hidden.
           *
           * This was type="text" with transparent colour, which only hides the
           * glyphs from a casual glance — selecting the text highlights them,
           * a screenshot captures them, and the browser treats the value as an
           * ordinary field it may store or autofill in plain sight.
           *
           * Swapping the type keeps the disappearing-ink effect (the ghost
           * layer is rendered separately) while making the underlying control
           * behave like the credential input it is.
           */
          type={revealed ? "text" : "password"}
          autoComplete="current-password"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Password"
          className={`hairline w-full rounded-full bg-surface-1 px-5 py-3 text-center text-sm tracking-[0.3em] ink-input ${
            revealed ? "ink-visible" : ""
          }`}
        />

        {!revealed ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm tracking-[0.3em]"
          >
            {ghosts.map((ghost) => (
              <span key={ghost.id} className="ink-ghost">
                {ghost.ch}
              </span>
            ))}
          </span>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setRevealed((v) => !v)}
        className="mt-3 text-xs text-secondary transition-colors duration-fast hover:text-primary"
      >
        {revealed ? "Hide" : "Reveal"}
      </button>

      <button
        type="submit"
        disabled={busy || value === "" || email.trim() === ""}
        className="mt-6 w-full rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas transition-opacity duration-fast hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Checking…" : "Continue"}
      </button>

      {/* Notice amber, not danger red — a mistyped password is a retry, not a
          destructive outcome. min-h reserves the space so the button does not
          jump when the message appears. */}
      <div className="mt-4 min-h-5">
        <FieldError>{error}</FieldError>
      </div>
    </form>
  );
}
