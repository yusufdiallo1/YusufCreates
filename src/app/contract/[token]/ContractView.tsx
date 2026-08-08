"use client";

import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { SlideToConfirm } from "@/components/ui/SlideToConfirm";
import { SignaturePad } from "@/components/ui/SignaturePad";
import { renderMarkdown } from "@/lib/markdown";

/**
 * The contract, and the act of signing it.
 *
 * Four things have to be captured for an electronic signature to hold under
 * the ESIGN Act and state UETA, and all four are on this page rather than
 * assumed:
 *
 *   intent    — the slider, which is a deliberate act, not a checkbox
 *   consent   — an explicit tick agreeing to sign electronically
 *   attribution — a typed name, plus the IP and user agent the server records
 *   the record  — the body shown here IS the stored snapshot, byte for byte
 *
 * The body is deliberately rendered from the snapshot the server sent rather
 * than re-merged from a template. What they read has to be what was hashed.
 */

type Contract = {
  body: string;
  clientName: string;
  amount: number;
  currency: string;
  status: string;
  signedAt?: number;
  expiresAt: number;
  lapsed: boolean;
  signable: boolean;
  consentText: string;
  payUrl: string | null;
};

export function ContractView({
  token,
  contract,
}: {
  token: string;
  contract: Contract;
}) {
  const [consented, setConsented] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [signedNoPay, setSignedNoPay] = useState(false);
  const viewSent = useRef(false);

  /*
   * Record the open from the browser rather than the server component,
   * because the server render happens on a prefetch too and would report a
   * view nobody made. The ref guards React's double-invoke in development.
   */
  useEffect(() => {
    if (viewSent.current || !contract.signable) return;
    viewSent.current = true;
    void fetch("/api/contracts/view", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    }).catch(() => {
      // A missed view stamp is not worth showing anyone an error over.
    });
  }, [token, contract.signable]);

  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: contract.currency || "USD",
    maximumFractionDigits: 0,
  }).format(contract.amount);

  if (contract.signedAt || signedNoPay) {
    return (
      <Frame>
        <h1 className="text-2xl">Signed. Thank you.</h1>
        {contract.payUrl ? (
          <>
            <p className="mt-3 text-sm text-secondary">
              The deposit invoice is ready.
            </p>
            <a
              href={contract.payUrl}
              className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm font-medium text-canvas"
            >
              Pay the deposit
            </a>
          </>
        ) : (
          /*
           * Signed, but Stripe did not answer in time. The signature is
           * safely recorded — this is the honest version of that, and a sweep
           * raises the invoice shortly. Saying "something went wrong" here
           * would suggest the signing failed, which it did not.
           */
          <p className="mt-3 text-sm text-secondary">
            Your invoice is being prepared and will be emailed to you in a few
            minutes. Nothing further is needed from you right now.
          </p>
        )}
      </Frame>
    );
  }

  if (contract.lapsed) {
    return (
      <Frame>
        <h1 className="text-2xl">This contract has expired</h1>
        <p className="mt-3 text-sm text-secondary">
          Contracts stay open for 14 days. Reply to the email it came from and
          I&apos;ll send a fresh one — it takes a second.
        </p>
      </Frame>
    );
  }

  const ready = consented && typedName.trim().length > 1;

  return (
    <Frame>
      <p className="font-mono text-xs tracking-[0.06em] text-secondary">
        Contract
      </p>
      <h1 className="mt-3 text-3xl">{contract.clientName}</h1>
      <p className="mt-2 text-lg text-secondary">{money}</p>

      <article className="legal-prose mt-10">
        {renderMarkdown(contract.body)}
      </article>

      <section className="hairline-t mt-14 pt-10">
        <h2 className="text-lg text-primary">Sign</h2>

        <label className="mt-6 flex items-start gap-3">
          <input
            type="checkbox"
            checked={consented}
            onChange={(e) => setConsented(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0"
          />
          <span className="text-sm text-secondary">{contract.consentText}</span>
        </label>

        <div className="mt-6 max-w-sm">
          <label htmlFor="typedName" className="text-sm text-secondary">
            Your full legal name
          </label>
          <input
            id="typedName"
            type="text"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            autoComplete="name"
            className="hairline mt-2 w-full rounded-lg bg-surface-1 px-4 py-3 text-sm text-primary"
          />
        </div>

        <div className="mt-6 max-w-lg">
          <SignaturePad onChange={setSignature} />
        </div>

        <div className="mt-8 max-w-sm">
          <SlideToConfirm
            purpose="submit-lead"
            label={ready ? "Slide to sign" : "Tick the box and add your name"}
            completedLabel="Signed"
            ariaLabel="Slide to sign this contract"
            onConfirm={async () => {
              if (!ready) {
                throw new Error("Consent and a name are required.");
              }
              setFailed(null);

              const response = await fetch("/api/contracts/sign", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  token,
                  typedName: typedName.trim(),
                  consent: true,
                  signature,
                }),
              });

              const result = (await response.json().catch(() => null)) as {
                ok?: boolean;
                payUrl?: string | null;
                error?: string;
              } | null;

              if (!response.ok || !result?.ok) {
                // Throwing rolls the slider back, so the page does not claim
                // to have signed something it did not.
                setFailed(
                  result?.error ??
                    "That didn't go through. Try again in a moment.",
                );
                throw new Error(result?.error ?? "Signing failed.");
              }

              if (result.payUrl) {
                window.location.href = result.payUrl;
                // Hold the pending state until the browser actually leaves.
                await new Promise((r) => setTimeout(r, 4000));
                return;
              }

              // Signed, but no payment link came back. Show the honest state
              // rather than sending them nowhere.
              setSignedNoPay(true);
            }}
          />
        </div>

        {failed ? (
          <p
            role="alert"
            className="mt-4 text-sm text-[color:var(--text-notice)]"
          >
            {failed}
          </p>
        ) : null}

        <p className="mt-8 text-xs text-secondary">
          Signing records the date and time, your network address and your
          browser, along with a cryptographic fingerprint of the exact text
          above. You&apos;ll get a copy of the signed contract for your records.
        </p>
      </section>
    </Frame>
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
