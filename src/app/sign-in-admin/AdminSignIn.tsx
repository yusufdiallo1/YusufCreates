"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { Logo } from "@/components/ui/Logo";

/**
 * Admin sign-in — Convex Auth, Password provider.
 *
 * The password is sent to Convex and checked against a stored hash there. It
 * is never compared in the browser, so nothing sensitive ships in the bundle.
 *
 * The field is disappearing ink: characters stay legible for a moment then
 * fade, and Reveal fades the whole value back in. That is presentation only —
 * the security is entirely server-side.
 */

const ADMIN_EMAIL = "committed1@gmail.com";

export function AdminSignIn() {
  const router = useRouter();
  const { signIn } = useAuthActions();
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
    if (busy || value === "") return;

    setBusy(true);
    setError(null);

    const attempt = async (flow: "signIn" | "signUp") => {
      const form = new FormData();
      form.set("email", ADMIN_EMAIL);
      form.set("password", value);
      form.set("flow", flow);
      await signIn("password", form);
    };

    try {
      await attempt("signIn");
      router.push("/admin");
    } catch {
      // First run: no account exists yet, so create it. Convex still rejects
      // any address other than ADMIN_EMAIL server-side.
      try {
        await attempt("signUp");
        router.push("/admin");
      } catch {
        setError("That is not right.");
        setBusy(false);
      }
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm text-center">
      <Logo variant="mark" className="mx-auto h-8 w-auto" />
      <h1 className="mt-8 text-2xl">Admin</h1>

      <div className="relative mt-8">
        <label htmlFor="passphrase" className="sr-only">
          Password
        </label>
        <input
          id="passphrase"
          type="text"
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
        disabled={busy || value === ""}
        className="mt-6 w-full rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas transition-opacity duration-fast hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Checking…" : "Continue"}
      </button>

      <p role="status" aria-live="polite" className="mt-4 min-h-5 text-xs text-danger">
        {error}
      </p>
    </form>
  );
}
