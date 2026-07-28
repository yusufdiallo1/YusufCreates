"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-level error boundary.
 *
 * Offers a retry first, because a good share of these are transient — a failed
 * fetch, a cold start, a dropped websocket — and reloading genuinely fixes
 * them.
 *
 * The digest is shown deliberately. It identifies the error in server logs
 * without exposing a stack trace, so someone reporting a problem can quote a
 * reference that means something.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[route error]", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-lg flex-col justify-center px-6 py-24">
      <p className="font-mono text-xs tracking-[0.1em] text-secondary uppercase">
        Error
      </p>
      <h1 className="mt-4 text-3xl">Something broke.</h1>
      <p className="mt-3 text-secondary">
        That&apos;s on me, not you. Trying again often works — a lot of these
        are momentary.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas transition-opacity duration-fast hover:opacity-90"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full px-5 py-2.5 text-sm text-primary transition-colors duration-fast hover:bg-surface-2"
        >
          Back to home
        </Link>
      </div>

      {error.digest ? (
        <p className="mt-10 font-mono text-xs text-secondary">
          Reference {error.digest}
        </p>
      ) : null}

      <p className="mt-3 text-sm text-secondary">
        Still stuck?{" "}
        <a href="mailto:hello@yusufcreates.com" className="text-accent">
          hello@yusufcreates.com
        </a>
      </p>
    </main>
  );
}
