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
  /*
   * The accept path gets rollback and a pending state for free from
   * SlideToConfirm. Decline and "request changes" are plain buttons, so a
   * failed mutation left the page exactly as it was — no error, no spinner,
   * nothing — and the only trace was an unhandled rejection in a console the
   * client is not looking at. They click again, and again.
   */
  const [failed, setFailed] = useState<string | null>(null);

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
          Signed. Nothing further is needed.
        </p>
      ) : proposal.status === "accepted" ? (
        /*
         * Accepted but the contract is not signed yet — almost always because
         * they closed the tab mid-redirect. The link back is the whole value
         * of this branch: without it they are stranded, having said yes to
         * something with no way to finish it.
         */
        <div className="mt-12">
          <p className="text-sm text-secondary">
            Accepted. One thing left — the contract needs signing.
          </p>
          <button
            type="button"
            onClick={async () => {
              setFailed(null);
              try {
                const result = await respond({ token, action: "accept" });
                if (result.ok && result.contractToken) {
                  window.location.href = `/contract/${result.contractToken}`;
                }
              } catch {
                setFailed("Couldn't open the contract. Try again in a moment.");
              }
            }}
            className="mt-3 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas"
          >
            Open the contract
          </button>
          {failed ? (
            <p
              role="alert"
              className="mt-4 text-sm text-[color:var(--text-notice)]"
            >
              {failed}
            </p>
          ) : null}
        </div>
      ) : proposal.status === "lost" ? (
        <p className="mt-12 text-sm text-secondary">
          Declined. If that was a mistake, just reply to the email.
        </p>
      ) : (
        <div className="mt-14 space-y-6">
          <div>
            <p className="text-sm text-primary">Happy with this?</p>
            <p className="mt-1 text-xs text-secondary">
              Accepting takes you straight to the contract to sign.
            </p>
            <div className="mt-3 max-w-sm">
              <SlideToConfirm
                purpose="submit-lead"
                label="Slide to accept"
                completedLabel="Accepted"
                ariaLabel="Slide to accept this proposal"
                onConfirm={async () => {
                  const result = await respond({ token, action: "accept" });
                  if (!result.ok || !result.contractToken) {
                    // Throwing rolls the slider back, which is the honest
                    // outcome: nothing was accepted.
                    throw new Error("Could not open the contract.");
                  }
                  /*
                   * Straight there, and deliberately not via setDone. A
                   * confirmation screen with a link is one more decision
                   * between saying yes and signing, and every step in that
                   * window is a place to cool off.
                   *
                   * The await never resolves before the browser leaves, which
                   * keeps the slider in its pending state rather than
                   * flashing "Accepted" over a page that is already going.
                   */
                  window.location.href = `/contract/${result.contractToken}`;
                  await new Promise((r) => setTimeout(r, 4000));
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
                    setFailed(null);
                    try {
                      await respond({
                        token,
                        action: "changes",
                        message: changes,
                      });
                      setDone("Sent — I'll revise and send it back.");
                    } catch {
                      setFailed("That didn't send. Try again in a moment.");
                    }
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
                    setFailed(null);
                    try {
                      await respond({ token, action: "decline" });
                      setDone("Understood — thanks for looking.");
                    } catch {
                      setFailed("That didn't send. Try again in a moment.");
                    }
                  }}
                  className="text-sm text-secondary hover:text-primary"
                >
                  Decline
                </button>
              </div>
            )}

            {failed ? (
              <p
                role="alert"
                className="mt-4 text-sm text-[color:var(--text-notice)]"
              >
                {failed}
              </p>
            ) : null}
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
