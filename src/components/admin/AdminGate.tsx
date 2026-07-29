"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
} from "convex/react";
import { api, isConvexConfigured } from "@/lib/convex-api";

/**
 * Renders admin content only for a signed-in admin.
 *
 * This is presentation, not protection — a determined caller can hit the
 * Convex functions directly without ever loading this component, which is why
 * every one of them calls requireAdmin server-side. What this prevents is a
 * confusing page full of failed queries for someone who is simply logged out.
 *
 * All three auth states are handled explicitly. Collapsing AuthLoading into
 * Unauthenticated is the common bug: it flashes a sign-in prompt at an admin
 * who is, in fact, signed in.
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  if (!isConvexConfigured) {
    return (
      <Notice
        title="Backend not configured"
        body="Set NEXT_PUBLIC_CONVEX_URL to connect this admin to a Convex deployment."
      />
    );
  }

  return (
    <>
      <AuthLoading>
        {/* Deliberately quiet. A spinner here flashes on every navigation. */}
        <div className="py-24 text-center text-sm text-secondary">Checking…</div>
      </AuthLoading>

      <Unauthenticated>
        <Notice
          title="Sign in required"
          body="This area is private."
          action={{ href: "/sign-in-admin", label: "Sign in" }}
        />
      </Unauthenticated>

      <Authenticated>
        <AdminOnly>{children}</AdminOnly>
      </Authenticated>
    </>
  );
}

/**
 * Signed in is not the same as being the admin. A second account could hold a
 * valid session, so the identity is confirmed against the server.
 */
function AdminOnly({ children }: { children: React.ReactNode }) {
  const allowed = useQuery(api.admin.amIAdmin, {});

  /*
   * Remembered for the session once it comes back true.
   *
   * This gate wraps `children` inside the layout, so every navigation
   * re-evaluated it — and while the query was pending it replaced the whole
   * page with "Checking…". That blank flash on every click is what made the
   * admin feel slow; the data was already cached, the shell just kept
   * throwing it away.
   *
   * This is presentation only. It cannot widen access: every Convex query and
   * mutation behind this still calls requireAdmin server-side on every single
   * call, so a revoked session gets empty screens and errors, not data.
   */
  const [everAllowed, setEverAllowed] = useState(false);
  if (allowed === true && !everAllowed) setEverAllowed(true);

  if (allowed === undefined) {
    if (everAllowed) return <>{children}</>;
    return <div className="py-24 text-center text-sm text-secondary">Checking…</div>;
  }

  if (!allowed) {
    return (
      <Notice
        title="Not your account"
        body="That session is valid but not permitted here."
        action={{ href: "/", label: "Back to the site" }}
      />
    );
  }

  return <>{children}</>;
}

function Notice({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mx-auto max-w-sm py-24 text-center">
      <h1 className="text-xl text-primary">{title}</h1>
      <p className="mt-3 text-sm text-secondary">{body}</p>
      {action ? (
        <Link
          href={action.href}
          className="mt-8 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas transition-opacity duration-fast hover:opacity-90"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
