import { NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { getClient } from "@/lib/email";

/**
 * Inbound mail, from Resend.
 *
 * The MX record for yusufcreates.com points at Resend, so everything sent to
 * any address at the domain arrives here — including every reply to a proposal,
 * contract or invoice, because EMAIL_FROM is hello@yusufcreates.com. Before
 * this route existed those replies reached Resend's storage and were read by
 * nobody.
 *
 * Four rules, each preventing a specific failure:
 *
 * 1. Node runtime, not edge — signature verification needs Node crypto.
 * 2. The RAW body. Calling request.json() reserialises the payload and the
 *    signature no longer matches, so every event would be rejected.
 * 3. Signature verified before anything is read. An unverified inbound endpoint
 *    lets anyone forge correspondence from any address into my inbox.
 * 4. Idempotent by Resend's email id, enforced inside the Convex mutation.
 *    Resend retries anything that does not answer 200, and offers a replay
 *    button — without the guard, one flaky response becomes two copies.
 *
 * Nothing is lost if this route is broken or unreachable: Resend stores every
 * received message regardless of webhook state, so a gap can be backfilled with
 * resend.emails.receiving.list(). That is the reason a failure here answers 500
 * rather than swallowing the event.
 */

export const runtime = "nodejs";

/**
 * A plain-text body, whatever the sender actually sent.
 *
 * Most mail is multipart and `text` is simply there. When it is not — some
 * clients send HTML alone — the tags are stripped rather than the message being
 * dropped, because a mangled message is still readable and a missing one is
 * not.
 *
 * This is deliberately NOT a sanitiser and must never be treated as one. It is
 * safe only because the result is rendered as text: the schema stores no HTML
 * and the admin renders with whitespace-pre-wrap. If anything ever renders this
 * as markup, this function is the bug.
 */
function plainText(text: string | null, html: string | null): string {
  if (text && text.trim()) return text;
  if (!html) return "";
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function POST(request: Request) {
  const resend = getClient();
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

  if (!resend || !webhookSecret) {
    // 503 rather than 500: this is "not wired up yet", which is a different
    // thing from "wired up and broken", and Resend's delivery log should say so.
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const raw = await request.text();

  /*
   * Two things here will silently break this if they are copied from Resend's
   * own quick-start snippet, which is out of date against resend@6.18.0:
   *
   *   - The HEADER names are svix-*, but the SDK's option KEYS are id,
   *     timestamp and signature. Passing the svix-* spelling type-checks as an
   *     excess-property error at best and fails every verification at worst.
   *   - verify() is SYNCHRONOUS and THROWS. Every other call in this SDK
   *     returns { data, error }; this one does not, so a `const { error } =`
   *     here would destructure undefined and let forged events straight through.
   *
   * No svix dependency is needed for any of it — resend bundles
   * standardwebhooks already.
   */
  let event: ReturnType<typeof resend.webhooks.verify>;
  try {
    event = resend.webhooks.verify({
      payload: raw,
      headers: {
        id: request.headers.get("svix-id") ?? "",
        timestamp: request.headers.get("svix-timestamp") ?? "",
        signature: request.headers.get("svix-signature") ?? "",
      },
      webhookSecret,
    });
  } catch (err) {
    // Never echo the reason: a precise error tells a prober exactly how to
    // forge a request.
    console.warn(
      "[email/inbound] signature verification failed:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  /*
   * Acknowledged and ignored. One endpoint can be subscribed to more than one
   * event, and answering an error for a type we simply do not handle would
   * make Resend retry it forever.
   */
  if (event.type !== "email.received") {
    return NextResponse.json({ received: true, stored: false });
  }

  if (!isConvexConfigured) {
    // 200 so Resend stops retrying an event we structurally cannot store. The
    // message is still in Resend's own storage and can be backfilled.
    return NextResponse.json({ received: true, stored: false });
  }

  const serverSecret = process.env.EMAIL_LOG_SECRET;
  if (!serverSecret) {
    // 500 so Resend DOES retry — this is a misconfiguration we can fix, and
    // the message should not need a manual backfill while we do.
    return NextResponse.json({ error: "Server secret unset." }, { status: 500 });
  }

  const emailId = event.data.email_id;

  /*
   * The webhook carries metadata only — sender, subject, attachment names —
   * and never the body. Resend split it that way because serverless request
   * bodies have size limits a long thread would exceed, so the body is a second
   * call. Unlike verify() above, this one returns { data, error }.
   *
   * html_format 'cid' rather than the default 'data_uri', which base64-inlines
   * every inline image into `html`. That field is read only when `text` is
   * empty, and stripped of markup when it is — so the default would pull
   * roughly 1.33x the bytes of every signature logo down this route on every
   * delivery and every retry, to throw them away.
   */
  const { data, error } = await resend.emails.receiving.get(emailId, {
    html_format: "cid",
  });

  if (error || !data) {
    console.error(
      `[email/inbound] could not fetch ${emailId}:`,
      error?.message ?? "no data",
    );
    // 500 so it is retried. The alternative is a message that arrived, was
    // acknowledged, and exists nowhere I will ever look.
    return NextResponse.json({ error: "Could not fetch." }, { status: 500 });
  }

  const receivedAt = Date.parse(data.created_at);

  try {
    const result = await fetchMutation(api.inboundEmails.record, {
      secret: serverSecret,
      resendEmailId: data.id,
      from: data.from,
      to: data.to,
      cc: data.cc ?? undefined,
      receivedFor: data.received_for ?? undefined,
      subject: data.subject,
      text: plainText(data.text, data.html),
      messageId: data.message_id,
      attachments: data.attachments.map((a) => ({
        id: a.id,
        // Nullable on the wire, and a nameless attachment is still worth
        // listing — the mutation supplies the fallback label.
        filename: a.filename ?? "",
        contentType: a.content_type,
        size: a.size,
      })),
      receivedAt: Number.isNaN(receivedAt) ? undefined : receivedAt,
    });

    if (!result.duplicate) {
      console.info(`[email/inbound] stored ${emailId} from ${data.from}`);
    }
  } catch (err) {
    console.error("[email/inbound] could not store:", err);
    // 500 so Resend retries — the idempotency guard makes that safe.
    return NextResponse.json({ error: "Could not store." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
