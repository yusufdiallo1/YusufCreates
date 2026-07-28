"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Logo } from "@/components/ui/Logo";

/**
 * Admin entry.
 *
 * The password field is disappearing ink: each character stays legible for a
 * moment and then fades, and the reveal toggle fades the whole value back in.
 *
 * The typed value is NOT the credential. Authentication is Convex Auth via
 * GitHub, checked server-side against ADMIN_GITHUB_ID — a password compared in
 * the browser would sit in the JS bundle for anyone to read, which is no
 * protection at all. This field is a deliberate speed bump in front of the
 * OAuth handoff, and it is treated as exactly that.
 */

const PASSPHRASE = "yusufjallow1!";

export function AdminSignIn() {
  const { signIn } = useAuthActions();
  const [value, setValue] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Characters recently typed, rendered as fading ghosts above the input.
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
    if (value !== PASSPHRASE) {
      setError("That is not right.");
      return;
    }
    setBusy(true);
    try {
      // The real gate. Convex verifies the GitHub account server-side.
      await signIn("github", { redirectTo: "/admin" });
    } catch {
      setError("Could not start sign-in.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm text-center">
      <Logo variant="mark" className="mx-auto h-8 w-auto" />
      <h1 className="mt-8 text-2xl">Admin</h1>

      <div className="relative mt-8">
        <label htmlFor="passphrase" className="sr-only">
          Passphrase
        </label>
        <input
          id="passphrase"
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Passphrase"
          className={`hairline w-full rounded-full bg-surface-1 px-5 py-3 text-center text-sm tracking-[0.3em] ink-input ${
            revealed ? "ink-visible" : ""
          }`}
        />

        {/* Fading characters. Purely decorative — the real value lives in the
            input, which screen readers read normally. */}
        {!revealed ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm tracking-[0.3em]"
          >
            <span className="invisible">{value.slice(0, -ghosts.length || undefined)}</span>
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
        disabled={busy}
        className="mt-6 w-full rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas transition-opacity duration-fast hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Continuing…" : "Continue"}
      </button>

      <p role="status" aria-live="polite" className="mt-4 min-h-5 text-xs text-danger">
        {error}
      </p>
    </form>
  );
}
