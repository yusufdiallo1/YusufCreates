import { NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { requestIdentity } from "@/lib/requestIdentity";
import { issueInvoiceToStripe } from "@/lib/issueInvoice";
import { storeSignedPdf } from "@/lib/contractPdf";
import { isRenderablePng } from "@/lib/pngGuard";
import { CONSENT_TEXT } from "@convex/lib/contractTemplate";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Signing. The one interaction that does everything.
 *
 * ORDER IS THE WHOLE DESIGN HERE. The signature commits to Convex first, in a
 * single transaction that also raises both invoices. Only then does anything
 * external get attempted. Stripe can time out, the PDF renderer can throw, and
 * the signature is still recorded — the pending stamps say what is outstanding
 * and a sweep finishes the job.
 *
 * The opposite order is the tempting one and it is wrong: "create the Stripe
 * invoice, then record the signature" loses a real, legally-meaningful act
 * because a third party was slow.
 *
 * Public, but the token is the credential — the same posture as the invoice
 * and proposal pages. EMAIL_LOG_SECRET never leaves the server; the browser
 * posts a token and this route is what holds the authority.
 *
 * Node runtime: the PDF renderer and the signature upload both need it.
 */

export const runtime = "nodejs";

/** A drawn signature is a few KB of PNG. Anything near this is not one. */
const MAX_SIGNATURE_BYTES = 256 * 1024;

export async function POST(request: Request) {
  const secret = process.env.EMAIL_LOG_SECRET;
  if (!isConvexConfigured || !secret) {
    return NextResponse.json(
      { ok: false, error: "Signing is not configured." },
      { status: 503 },
    );
  }

  let body: {
    token?: string;
    typedName?: string;
    consent?: boolean;
    signature?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 400 },
    );
  }

  const token = body.token?.trim();
  const typedName = body.typedName?.trim();

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing contract." },
      { status: 400 },
    );
  }
  // Consent and a name are not UI niceties — they are two of the four things
  // that make an electronic signature hold. Re-checked here because the
  // browser's checkbox proves nothing about what was actually posted.
  if (body.consent !== true) {
    return NextResponse.json(
      { ok: false, error: "Consent is required to sign electronically." },
      { status: 400 },
    );
  }
  if (!typedName || typedName.length < 2) {
    return NextResponse.json(
      { ok: false, error: "Your full name is required." },
      { status: 400 },
    );
  }

  const { rawIp, ipHash, userAgent } = requestIdentity(request);

  const verdict = await fetchMutation(api.contracts.checkRate, {
    secret,
    kind: "sign",
    key: ipHash,
  }).catch(() => ({ ok: true as const, retryAfterMs: 0 }));

  if (!verdict.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Give it a minute." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(verdict.retryAfterMs / 1000)) },
      },
    );
  }

  /*
   * The signature image is uploaded BEFORE the commit, because the commit
   * wants its storage id and a mutation cannot upload. If this fails the
   * signature still goes ahead without an image — the drawn squiggle is
   * corroborating detail, not the thing that makes the signature hold, and
   * refusing to sign over a failed image upload would be the wrong trade.
   */
  let signatureStorageId: Id<"_storage"> | undefined;
  if (body.signature?.startsWith("data:image/png;base64,")) {
    signatureStorageId = await uploadSignature(body.signature, secret);
  }

  /* ---- THE COMMIT ---- */
  let signed;
  try {
    signed = await fetchMutation(api.contracts.recordSignature, {
      secret,
      token,
      typedName,
      signatureStorageId,
      ip: rawIp || undefined,
      userAgent: userAgent || undefined,
      /*
       * The server's constant, NOT anything from the request body. Letting
       * the caller supply the wording would let them record consent to terms
       * of their own choosing, which is the opposite of what a consent record
       * is for.
       */
      consentText: CONSENT_TEXT,
    });
  } catch (err) {
    /*
     * Never echo the underlying error.
     *
     * Convex wraps a thrown Error with a request id, a stack trace and the
     * source file and line. Passing that through told anyone posting a
     * guessed token exactly which check rejected them and where it lives —
     * the same discipline the Stripe webhook already applies to signature
     * failures. The detail goes to the log, not the response.
     */
    console.warn("[contracts] sign rejected:", err);
    return NextResponse.json(
      { ok: false, error: "That contract cannot be signed." },
      { status: 400 },
    );
  }

  // A double-submitted slider lands here: already signed, so hand back the
  // link the first call produced rather than raising a second deposit.
  if (signed.alreadySigned && signed.payUrl) {
    return NextResponse.json({ ok: true, payUrl: signed.payUrl });
  }

  /* ---- Everything past this point may fail without losing the signature ---- */

  let payUrl: string | null = signed.payUrl;

  if (!payUrl && signed.invoice) {
    const issued = await issueInvoiceToStripe(signed.invoice, secret);
    if (issued.ok) {
      payUrl = issued.url;
      await fetchMutation(api.contracts.clearPending, {
        secret,
        contractId: signed.contractId,
        which: "deposit",
      }).catch(() => {});
    } else {
      // depositPendingAt stays set; sweepContractRetries picks it up.
      console.error("[contracts] deposit issue failed after signature:", issued.error);
    }
  }

  // The PDF is rendered after the pay link is in hand, so a slow render never
  // delays the redirect to Stripe. A failure leaves pdfPendingAt set.
  try {
    await storeSignedPdf(signed.contractId, secret);
  } catch (err) {
    console.error("[contracts] signed PDF render failed:", err);
  }

  return NextResponse.json({ ok: true, payUrl });
}

async function uploadSignature(
  dataUrl: string,
  secret: string,
): Promise<Id<"_storage"> | undefined> {
  try {
    const base64 = dataUrl.slice("data:image/png;base64,".length);
    const bytes = Buffer.from(base64, "base64");
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_SIGNATURE_BYTES) {
      return undefined;
    }
    /*
     * Prove it decodes before it is stored.
     *
     * A structurally-valid PNG with a corrupt pixel stream made the PDF
     * renderer hang for minutes and then throw an uncaughtException. These
     * bytes come from a browser canvas via a public endpoint, so "it will be
     * a real PNG" is not an assumption available to us.
     */
    if (!isRenderablePng(bytes)) {
      console.warn("[contracts] signature image rejected: not a decodable PNG");
      return undefined;
    }

    const uploadUrl = await fetchMutation(api.files.generateServerUploadUrl, {
      secret,
    });
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "content-type": "image/png" },
      body: new Uint8Array(bytes),
    });
    if (!response.ok) return undefined;

    const { storageId } = (await response.json()) as {
      storageId: Id<"_storage">;
    };
    return storageId;
  } catch {
    return undefined;
  }
}
