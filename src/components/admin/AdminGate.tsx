"use client";

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
 *
 * THERE IS DELIBERATELY NO CACHE HERE ANY MORE.
 *
 * A module-scope `seenAsAdmin` flag used to remember "the server said yes once
 * this page session", so that while `amIAdmin` was in flight the admin
 * rendered immediately instead of showing "Checking…". It was justified as
 * presentation-only, and strictly speaking that is true — every Convex
 * function behind this calls requireAdmin, so the cache could never hand over
 * real data.
 *
 * But it is the reason the back office APPEARS to open with no authentication.
 * Navigating to the admin URL painted the entire interface before the server
 * had been asked anything, and only corrected itself once the query resolved.
 * A gate that shows you the room while it decides whether to let you in is not
 * doing the one job it has, and "the data is safe anyway" is not an answer to
 * someone watching it happen.
 *
 * The cost is a brief "Checking…" when crossing from the public site into the
 * admin. That is the honest state: at that instant we genuinely do not know.
 */
function AdminOnly({ children }: { children: React.ReactNode }) {
  const allowed = useQuery(api.admin.amIAdmin, {});

  if (allowed === undefined) {
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
          className="mt-8 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas transition-opacity duration-hover ease-hover hover:opacity-90"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
