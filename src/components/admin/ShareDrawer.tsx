"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { Field } from "@/components/admin/shared/Fields";
import type { Doc } from "@convex/_generated/dataModel";

/**
 * Share a signed contract with someone who is not the client.
 *
 * An accountant, a lawyer, the other side's finance team. The link they get is
 * inert on its own — two codes go to the address entered here, so sending the
 * link to the wrong person does not disclose anything.
 */
export function ShareDrawer({
  contract,
  onClose,
}: {
  contract: Doc<"contracts">;
  onClose: () => void;
}) {
  const shares = useQuery(api.contractShares.listShares, {
    contractId: contract._id,
  });
  const revoke = useMutation(api.contractShares.revokeShare);

  const [email, setEmail] = useState("");
  const [scope, setScope] = useState<"contract" | "pdf" | "audit">("pdf");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function share() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/contracts/share/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contractId: contract._id,
          recipientEmail: email,
          scope,
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        emailed?: boolean;
        shareUrl?: string;
        warning?: string;
        error?: string;
      } | null;

      if (!response.ok || !body?.ok) {
        setError(body?.error ?? "Could not create the link.");
        return;
      }
      // Says which of the two things happened. A created link whose email
      // failed looks identical to a working share unless it is spelled out.
      setResult(
        body.warning
          ? `${body.warning} Link: ${body.shareUrl}`
          : `Sent to ${email}.`,
      );
      setEmail("");
    } catch {
      setError("Could not create the link.");
    } finally {
      setBusy(false);
    }
  }

  const day = (ts: number) =>
    new Date(ts).toLocaleDateString("en-US", { day: "numeric", month: "short" });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[color:var(--bg-canvas)]/70 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Share this contract"
        className="glass-depth glass-near relative h-full w-full max-w-md overflow-y-auto p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="admin-title">Share securely</h2>
            <p className="admin-meta mt-1 truncate">{contract.clientName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-sm text-secondary hover:text-primary"
          >
            Close
          </button>
        </div>

        <p className="mt-5 text-[13px] text-secondary">
          They get a link, then two codes by email — a 10-digit one valid for
          60 seconds, then a 14-digit one. The link alone opens nothing.
        </p>

        <div className="mt-6 space-y-4">
          <Field
            label="Send to"
            type="email"
            value={email}
            onChange={setEmail}
          />

          <div>
            <label htmlFor="scope" className="text-[13px] text-secondary">
              What they can see
            </label>
            <select
              id="scope"
              value={scope}
              onChange={(e) =>
                setScope(e.target.value as "contract" | "pdf" | "audit")
              }
              className="hairline mt-2 w-full rounded-lg bg-surface-1 px-3.5 py-2.5 text-sm text-primary"
            >
              <option value="pdf">The signed PDF</option>
              <option value="contract">The contract text and the PDF</option>
              <option value="audit">The signature record only</option>
            </select>
          </div>

          <button
            type="button"
            disabled={busy || !email.includes("@")}
            onClick={() => void share()}
            className="w-full rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas disabled:opacity-40"
          >
            {busy ? "Sending…" : "Send the link"}
          </button>

          {result ? (
            <p className="text-[13px] break-all text-secondary" role="status">
              {result}
            </p>
          ) : null}
          {error ? (
            <p
              role="alert"
              className="text-[13px] text-[color:var(--text-notice)]"
            >
              {error}
            </p>
          ) : null}
        </div>

        {shares && shares.length > 0 ? (
          <section className="mt-10">
            <p className="admin-section-title">Existing links</p>
            <ul className="mt-3 space-y-2">
              {shares.map((s) => (
                <li key={s._id} className="hairline rounded-lg p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] text-primary">
                        {s.recipientEmail}
                      </p>
                      <p className="admin-meta mt-0.5">
                        {/* `state` is derived server-side. Reading the clock
                            during a render is impure — the same row would say
                            "live" on one render and "expired" on the next with
                            no state change to explain it. */}
                        {s.scope} · created {day(s.createdAt)} ·{" "}
                        {s.state === "live"
                          ? `opened ${s.accessCount}×`
                          : s.state}
                      </p>
                    </div>
                    {s.state === "live" ? (
                      <button
                        type="button"
                        onClick={() => void revoke({ id: s._id })}
                        className="shrink-0 text-xs text-[color:var(--danger)] hover:opacity-80"
                      >
                        Revoke
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
