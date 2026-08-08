"use client";

import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/ui/Logo";

/**
 * The two-code gate.
 *
 * THE COUNTDOWN STARTS ON THE BUTTON, NOT ON PAGE LOAD. The first code lives
 * for 60 seconds, and email routinely takes 5-30 of them; a timer that began
 * when the link was opened would frequently be spent before the message
 * landed. Pressing "send my code" is the recipient saying they are looking at
 * the screen now.
 *
 * When it does run out, the Resend button is right there and says so plainly.
 * A short-lived code is only good security if running out is a normal,
 * one-click event rather than a dead end.
 */

type Stage = "idle" | "one" | "two" | "opening";

export function ShareGate({
  token,
  maskedEmail,
}: {
  token: string;
  maskedEmail: string;
}) {
  const [stage, setStage] = useState<Stage>("idle");
  const [code, setCode] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () =>
      setRemaining(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [expiresAt]);

  useEffect(() => {
    if (stage === "one" || stage === "two") inputRef.current?.focus();
  }, [stage]);

  const digitsNeeded = stage === "two" ? 14 : 10;

  async function requestCode(next: "one" | "two") {
    setBusy(true);
    setError(null);
    setCode("");
    try {
      const response = await fetch("/api/contracts/share/challenge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, stage: next }),
      });
      const result = (await response.json().catch(() => null)) as {
        ok?: boolean;
        expiresAt?: number;
        error?: string;
      } | null;

      if (!response.ok || !result?.ok || !result.expiresAt) {
        setError(result?.error ?? "Couldn't send the code.");
        return;
      }
      setExpiresAt(result.expiresAt);
      setStage(next);
    } catch {
      setError("Couldn't send the code. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (stage !== "one" && stage !== "two") return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/contracts/share/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, stage, code }),
      });
      const result = (await response.json().catch(() => null)) as {
        ok?: boolean;
        next?: "two" | "done";
        error?: string;
      } | null;

      if (!response.ok || !result?.ok) {
        setError(result?.error ?? "That code isn't right.");
        setCode("");
        return;
      }

      if (result.next === "two") {
        // Straight into issuing the second code — making them press another
        // button between the two would be ceremony, not security.
        await requestCode("two");
        return;
      }

      setStage("opening");
      // Reload so the SERVER resolves the new cookie and renders the document.
      // Rendering it client-side would mean the page had it all along.
      window.location.reload();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const expired = expiresAt !== null && remaining === 0;

  return (
    <main className="mx-auto max-w-md px-6 py-20">
      <Logo variant="mark" className="h-7 w-auto" />

      {stage === "idle" ? (
        <div className="mt-10">
          <h1 className="text-2xl">Verify it&apos;s you</h1>
          <p className="mt-3 text-sm text-secondary">
            This document is protected by two short codes, sent one after the
            other to <strong className="text-primary">{maskedEmail}</strong>.
          </p>
          <p className="mt-2 text-sm text-secondary">
            The first one expires in 60 seconds, so press this when you&apos;re
            ready to check your inbox.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void requestCode("one")}
            className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-medium text-canvas disabled:opacity-40"
          >
            {busy ? "Sending…" : "Send my code"}
          </button>
        </div>
      ) : stage === "opening" ? (
        <div className="mt-10">
          <h1 className="text-2xl">Opening…</h1>
        </div>
      ) : (
        <div className="mt-10">
          <h1 className="text-2xl">
            {stage === "one" ? "Enter your code" : "One more code"}
          </h1>
          <p className="mt-3 text-sm text-secondary">
            {stage === "one"
              ? `We've emailed a ${digitsNeeded}-digit code to ${maskedEmail}.`
              : `Last step — a ${digitsNeeded}-digit code is on its way to ${maskedEmail}.`}
          </p>

          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            maxLength={digitsNeeded}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && code.length === digitsNeeded) {
                void submit();
              }
            }}
            aria-label={`${digitsNeeded}-digit code`}
            className="hairline mt-6 w-full rounded-lg bg-surface-1 px-4 py-3 text-center font-mono text-lg tracking-[0.25em] text-primary"
          />

          <p
            className="mt-3 text-center text-xs text-secondary"
            aria-live="polite"
          >
            {expired
              ? "That code has expired."
              : `Expires in ${remaining}s`}
          </p>

          <button
            type="button"
            disabled={busy || code.length !== digitsNeeded || expired}
            onClick={() => void submit()}
            className="mt-5 w-full rounded-full bg-primary px-6 py-3 text-sm font-medium text-canvas disabled:opacity-40"
          >
            {busy ? "Checking…" : "Continue"}
          </button>

          {expired ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void requestCode(stage)}
              className="mt-4 w-full text-sm text-accent hover:text-primary disabled:opacity-40"
            >
              Send a new code
            </button>
          ) : null}

          {error ? (
            <p role="alert" className="mt-4 text-sm text-[color:var(--text-notice)]">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </main>
  );
}
