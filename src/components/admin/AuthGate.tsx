"use client";

import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import Link from "next/link";

/**
 * Explicit three-state auth boundary.
 *
 * usePreloadedQuery can hydrate before the client websocket has authenticated,
 * so a plain `isAuthenticated ? … : …` check briefly renders the signed-out
 * branch to a signed-in user. AuthLoading covers that window rather than
 * letting it flash.
 *
 * This is presentation only — it is not a security boundary. Every Convex
 * query and mutation re-verifies identity server-side.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  // Authenticated/Unauthenticated require a Convex auth provider above them,
  // which does not exist until a deployment is configured. Say so plainly
  // rather than crashing the route.
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return (
      <div className="p-8">
        <h1 className="text-2xl">Backend not configured</h1>
        <p className="mt-2 max-w-prose text-sm text-secondary">
          Run <code className="text-primary">npx convex dev</code> to provision
          a deployment. The admin area needs it to authenticate.
        </p>
      </div>
    );
  }

  return (
    <>
      <AuthLoading>
        <div
          role="status"
          aria-live="polite"
          className="p-8 text-sm text-secondary"
        >
          Checking your session…
        </div>
      </AuthLoading>

      <Unauthenticated>
        <div className="p-8">
          <h1 className="text-2xl">Sign in required</h1>
          <p className="mt-2 text-sm text-secondary">
            This area is restricted.
          </p>
          <Link
            href="/signin"
            data-cursor="link"
            className="mt-6 inline-block text-accent hover:text-primary"
          >
            Go to sign in
          </Link>
        </div>
      </Unauthenticated>

      <Authenticated>{children}</Authenticated>
    </>
  );
}
