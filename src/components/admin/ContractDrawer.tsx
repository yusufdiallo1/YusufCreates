"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { renderMarkdown } from "@/lib/markdown";
import type { Doc } from "@convex/_generated/dataModel";

/**
 * One contract: what it says, and what happened to it.
 *
 * The body shown is the STORED SNAPSHOT, not a re-merge of the current
 * template. That is the whole point of the snapshot, and a preview that
 * re-rendered from the live template would be a different document that
 * happens to look similar — exactly the failure this design exists to avoid.
 */
export function ContractDrawer({
  contract,
  onClose,
}: {
  contract: Doc<"contracts">;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"document" | "trail">("document");
  const detail = useQuery(api.contracts.getById, { id: contract._id });
  const verdict = useQuery(api.contracts.verifyChain, { id: contract._id });

  const stamp = (ts: number | undefined) =>
    ts ? `${new Date(ts).toISOString().replace("T", " ").slice(0, 19)} UTC` : "—";

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
        aria-label={`Contract for ${contract.clientName}`}
        className="glass-depth glass-near relative h-full w-full max-w-2xl overflow-y-auto p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="admin-title truncate">{contract.clientName}</h2>
            <p className="admin-meta mt-1">
              Template v{contract.templateVersion} ·{" "}
              {contract.signedAt
                ? `signed ${stamp(contract.signedAt)}`
                : contract.status}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-sm text-secondary hover:text-primary"
          >
            Close
          </button>
        </div>

        {/* The integrity verdict sits at the top rather than buried in the
            trail — if the chain is broken, nothing below it can be trusted and
            that should be the first thing read, not the last. */}
        {verdict ? (
          <div
            className={`hairline mt-5 rounded-lg p-3 text-[13px] ${
              verdict.ok ? "text-secondary" : "text-[color:var(--danger)]"
            }`}
            role={verdict.ok ? undefined : "alert"}
          >
            {verdict.ok ? (
              <>
                Audit chain verified — {verdict.events} events, unaltered.
              </>
            ) : (
              <>
                <strong>This contract&apos;s audit chain does not verify.</strong>
                <ul className="mt-2 list-disc pl-5">
                  {verdict.problems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ) : null}

        <div className="mt-5 flex gap-2">
          {(["document", "trail"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-pressed={tab === id}
              className={`hairline rounded-full px-3.5 py-1.5 text-xs ${
                tab === id ? "bg-surface-2 text-primary" : "text-secondary"
              }`}
            >
              {id === "document" ? "Document" : "Signature record"}
            </button>
          ))}
          {contract.signedPdfFileId ? (
            <a
              href={`/api/contracts/${contract._id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="hairline rounded-full px-3.5 py-1.5 text-xs text-accent hover:text-primary"
            >
              Open PDF
            </a>
          ) : null}
        </div>

        {tab === "document" ? (
          <article className="legal-prose mt-6">
            {renderMarkdown(contract.bodySnapshot)}
          </article>
        ) : (
          <div className="mt-6 space-y-6">
            <section>
              <p className="admin-section-title">The signer</p>
              <dl className="mt-2 space-y-1.5 text-[13px]">
                <Row label="Name typed" value={contract.signerTypedName ?? "—"} />
                <Row label="Email" value={contract.clientEmail} />
                <Row label="Signed at" value={stamp(contract.signedAt)} />
                <Row label="Address" value={contract.signerIp ?? "—"} mono />
                <Row label="Browser" value={contract.signerUserAgent ?? "—"} />
              </dl>
            </section>

            <section>
              <p className="admin-section-title">Fingerprints</p>
              <dl className="mt-2 space-y-1.5 text-[13px]">
                <Row label="Text" value={contract.bodyHash ?? "—"} mono />
                <Row label="Chain root" value={contract.auditRoot ?? "—"} mono />
              </dl>
            </section>

            {contract.consentText ? (
              <section>
                <p className="admin-section-title">Consent given</p>
                <p className="mt-2 text-[13px] text-secondary">
                  {contract.consentText}
                </p>
              </section>
            ) : null}

            <section>
              <p className="admin-section-title">Events</p>
              <ol className="mt-2 space-y-3">
                {(detail?.events ?? [])
                  .slice()
                  .sort((a, b) => a.seq - b.seq)
                  .map((event) => (
                    <li key={event._id} className="hairline rounded-lg p-3">
                      <p className="text-[13px] text-primary">
                        {event.seq}. {event.type.replace(/_/g, " ")}
                      </p>
                      <p className="admin-meta mt-0.5">
                        {stamp(event.at)}
                        {event.ip ? ` · ${event.ip}` : ""}
                      </p>
                      <p className="mt-1 font-mono text-[10px] break-all text-secondary">
                        {event.hash}
                      </p>
                    </li>
                  ))}
              </ol>
            </section>

            <a
              href={`/api/contracts/${contract._id}/audit`}
              className="inline-block text-sm text-accent hover:text-primary"
            >
              Download the audit trail as JSON
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <dt className="w-28 shrink-0 text-secondary">{label}</dt>
      <dd
        className={`min-w-0 break-all text-primary ${mono ? "font-mono text-[11px]" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
