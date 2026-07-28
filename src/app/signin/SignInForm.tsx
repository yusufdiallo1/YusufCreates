"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { GithubIcon } from "@/components/ui/SocialIcons";
import { Logo } from "@/components/ui/Logo";

/**
 * Admin sign-in.
 *
 * GitHub is the only provider, and the account is checked against
 * ADMIN_GITHUB_ID inside the Convex callback. Nothing here is a security
 * boundary — this is only the button that starts the flow. An account that is
 * not the admin completes OAuth and is then rejected and deleted server-side.
 */
export function SignInForm() {
  const { signIn } = useAuthActions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      await signIn("github", { redirectTo: "/dashboard" });
    } catch {
      setError("Could not start sign-in. Check the OAuth configuration.");
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-sm text-center">
      <Logo variant="mark" className="mx-auto h-8 w-auto" />

      <h1 className="mt-8 text-2xl">Sign in</h1>
      <p className="mt-2 text-sm text-secondary">
        This area is restricted to the site owner.
      </p>

      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas transition-opacity duration-fast hover:opacity-90 disabled:opacity-60"
      >
        <GithubIcon size={18} />
        {busy ? "Redirecting…" : "Continue with GitHub"}
      </button>

      <p role="status" aria-live="polite" className="mt-4 min-h-5 text-xs text-danger">
        {error}
      </p>
    </div>
  );
}
