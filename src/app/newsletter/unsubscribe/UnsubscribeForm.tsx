"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/lib/convex-api";

/**
 * The confirming step for an unsubscribe.
 *
 * SlideToConfirm is deliberately not used. Leaving a mailing list is exactly
 * the kind of thing that should be easy — putting deliberate friction in front
 * of an opt-out is a dark pattern, and one-click unsubscribe is a requirement
 * under bulk-sender rules, not a nicety.
 */
export function UnsubscribeForm({ token }: { token: string }) {
  const unsubscribe = useMutation(api.subscribers.unsubscribe);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  if (state === "done") {
    return (
      <>
        <h1 className="text-3xl">You&apos;re unsubscribed.</h1>
        <p className="mt-4 text-secondary">
          Nothing further will be sent. No hard feelings — the door is open if
          you change your mind.
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-3xl">Unsubscribe?</h1>
      <p className="mt-4 text-secondary">
        You&apos;ll stop receiving the newsletter. This does not affect replies
        to anything you&apos;ve sent me directly.
      </p>

      <button
        type="button"
        disabled={state === "busy"}
        onClick={async () => {
          setState("busy");
          try {
            const result = await unsubscribe({ token });
            setState(result.ok ? "done" : "error");
          } catch {
            setState("error");
          }
        }}
        className="mx-auto mt-8 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas transition-opacity duration-fast hover:opacity-90 disabled:opacity-60"
      >
        {state === "busy" ? "Removing…" : "Yes, unsubscribe me"}
      </button>

      {state === "error" ? (
        <p role="alert" className="mt-4 text-xs text-[color:var(--text-notice)]">
          That link didn&apos;t work. Reply to any email and I&apos;ll remove
          you by hand.
        </p>
      ) : null}
    </>
  );
}
