"use client";

import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "convex/react";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { CallRoom } from "@/components/calls/CallRoom";
import { Logo } from "@/components/ui/Logo";
import type { Id } from "@convex/_generated/dataModel";

/**
 * The shell around a call.
 *
 * Auth is handled here rather than in CallRoom so the room itself never has to
 * reason about who is looking at it — by the time it renders, the session has
 * already been resolved and the server has already refused anyone who does not
 * belong on this project.
 */
export function CallPage({ callId }: { callId: string }) {
  if (!isConvexConfigured) {
    return <Shell>Calling is not configured.</Shell>;
  }

  return (
    <>
      <AuthLoading>
        <Shell>Checking…</Shell>
      </AuthLoading>

      <Unauthenticated>
        <Shell>
          Sign in from your portal link to join this call.
        </Shell>
      </Unauthenticated>

      <Authenticated>
        <Room callId={callId} />
      </Authenticated>
    </>
  );
}

function Room({ callId }: { callId: string }) {
  /*
   * amIAdmin decides whether the destructive controls appear — clearing the
   * board and minting a guest link. It is asked of the SERVER rather than
   * inferred from the URL, and the mutations behind those buttons check it
   * again anyway, so hiding them is presentation rather than protection.
   */
  const isAdmin = useQuery(api.admin.amIAdmin, {});
  const call = useQuery(api.calls.get, { callId: callId as Id<"calls"> });

  if (call === undefined || isAdmin === undefined) {
    return <Shell>Loading the call…</Shell>;
  }

  if (call === null) {
    return (
      <Shell>
        That call does not exist, or it is not yours to join.
      </Shell>
    );
  }

  if (call.endedAt) {
    return <Shell>This call has ended.</Shell>;
  }

  return (
    <main className="mx-auto min-h-dvh max-w-4xl px-6 py-10">
      <div className="mb-6 flex items-center gap-2.5">
        <Logo variant="mark" className="h-6 w-auto" />
        <span className="text-sm text-secondary">YusufCreates</span>
      </div>
      <CallRoom callId={callId as Id<"calls">} isAdmin={isAdmin === true} />
    </main>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-24 text-center">
      <Logo variant="mark" className="mx-auto h-7 w-auto" />
      <p className="mt-6 text-sm text-secondary">{children}</p>
    </main>
  );
}
