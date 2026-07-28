"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/lib/convex-api";
import { Logo } from "@/components/ui/Logo";
import { SlideToConfirm } from "@/components/ui/SlideToConfirm";
import type { Doc } from "@convex/_generated/dataModel";

/**
 * Hosted proposal.
 *
 * Fetched through a mutation rather than a query because opening it records
 * the first view — that is what lets silence be read correctly. "Sent but
 * never opened" and "read and ignored" are different problems needing
 * different follow-ups.
 */
export function ProposalView({ token }: { token: string }) {
  const load = useMutation(api.proposals.getByToken);
  const respond = useMutation(api.proposals.respond);

  const [proposal, setProposal] = useState<Doc<"proposals"> | null | undefined>(
    undefined,
  );
  const [done, setDone] = useState<string | null>(null);
  const [changes, setChanges] = useState("");
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    void load({ token }).then(setProposal).catch(() => setProposal(null));
  }, [load, token]);

  if (proposal === undefined) {
    return <Frame><p className="text-sm text-secondary">Loading…</p></Frame>;
  }

  if (proposal === null) {
    return (
      <Frame>
        <h1 className="text-2xl">This link isn&apos;t valid</h1>
        <p className="mt-3 text-sm text-secondary">
          It may have been replaced by a newer version. Reply to the email it
          came from and I&apos;ll send a fresh one.
        </p>
      </Frame>
    );
  }

  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: proposal.currency || "USD",
    maximumFractionDigits: 0,
  }).format(proposal.amount);

  if (done) {
    return (
      <Frame>
        <h1 className="text-2xl">{done}</h1>
        <p className="mt-3 text-sm text-secondary">
          I&apos;ll be in touch shortly.
        </p>
      </Frame>
    );
  }

  return (
    <Frame>
      <p className="font-mono text-xs tracking-[0.06em] text-secondary">
        Proposal
      </p>
      <h1 className="mt-3 text-3xl">
        {proposal.clientName ?? "Your project"}
      </h1>
      <p className="mt-2 text-lg text-secondary">{money}</p>

      <div className="mt-10 space-y-8">
        <Section title="What I understand" body={proposal.understanding} />
        <Section title="Scope" body={proposal.scope} />
        <Section title="Not included" body={proposal.excluded} />
        <Section title="Timeline" body={proposal.timeline} />
        <Section title="Payment" body={proposal.paymentTerms} />
        <Section title="Assumptions" body={proposal.assumptions} />
      </div>

      {proposal.status === "signed" ? (
        <p className="mt-12 text-sm text-secondary">
          Accepted. Nothing further is needed.
        </p>
      ) : proposal.status === "lost" ? (
        <p className="mt-12 text-sm text-secondary">
          Declined. If that was a mistake, just reply to the email.
        </p>
      ) : (
        <div className="mt-14 space-y-6">
          <div>
            <p className="text-sm text-primary">Happy with this?</p>
            <p className="mt-1 text-xs text-secondary">
              Accepting is not a signature — I&apos;ll send the contract next.
            </p>
            <div className="mt-3 max-w-sm">
              <SlideToConfirm
                purpose="submit-lead"
                label="Slide to accept"
                completedLabel="Accepted"
                ariaLabel="Slide to accept this proposal"
                onConfirm={async () => {
                  await respond({ token, action: "accept" });
                  setDone("Accepted — thank you.");
                }}
              />
            </div>
          </div>

          <div className="hairline-t pt-6">
            {asking ? (
              <>
                <label htmlFor="changes" className="text-sm text-secondary">
                  What would you change?
                </label>
                <textarea
                  id="changes"
                  rows={4}
                  value={changes}
                  onChange={(e) => setChanges(e.target.value)}
                  className="hairline mt-2 w-full rounded-lg bg-surface-1 px-4 py-3 text-sm text-primary"
                />
                <button
                  type="button"
                  disabled={changes.trim() === ""}
                  onClick={async () => {
                    await respond({ token, action: "changes", message: changes });
                    setDone("Sent — I'll revise and send it back.");
                  }}
                  className="mt-3 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas disabled:opacity-40"
                >
                  Send
                </button>
              </>
            ) : (
              <div className="flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={() => setAsking(true)}
                  className="text-sm text-accent hover:text-primary"
                >
                  Request changes
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await respond({ token, action: "decline" });
                    setDone("Understood — thanks for looking.");
                  }}
                  className="text-sm text-secondary hover:text-primary"
                >
                  Decline
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </Frame>
  );
}

function Section({ title, body }: { title: string; body?: string }) {
  if (!body?.trim()) return null;
  return (
    <section>
      <h2 className="text-sm text-secondary">{title}</h2>
      <p className="mt-2 text-sm whitespace-pre-wrap text-primary">{body}</p>
    </section>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Logo variant="mark" className="h-7 w-auto" />
      <div className="mt-10">{children}</div>
    </main>
  );
}
