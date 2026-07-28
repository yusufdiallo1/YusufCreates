import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { sendEmail, siteUrl } from "@/lib/email";
import { logEmailSend } from "@/lib/emailLog";
import { Broadcast } from "@emails/Broadcast";

/**
 * Sends a broadcast, or a test to myself.
 *
 * Two rules that matter more than anything else here:
 *
 * 1. The recipient list is fetched SERVER-SIDE. Accepting a list from the
 *    client would turn this into an open relay for anyone who could reach the
 *    endpoint — the single worst thing this codebase could ship.
 * 2. Admin identity is re-verified from the session token, not trusted from
 *    the request. Sending mail to the whole list is irreversible.
 *
 * Every recipient gets their own unsubscribe link, built from their token.
 * A bulk send without one is a CAN-SPAM problem and a fast route to being
 * marked as spam.
 */

export const runtime = "nodejs";

/** Resend caps batch size; chunking keeps each call inside it. */
const CHUNK = 50;

export async function POST(request: Request) {
  if (!isConvexConfigured) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const token = await convexAuthNextjsToken();
  const allowed = await fetchQuery(api.admin.amIAdmin, {}, { token }).catch(
    () => false,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  let body: {
    subject?: string;
    body?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    test?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const subject = body.subject?.trim();
  const content = body.body?.trim();
  if (!subject || !content) {
    return NextResponse.json(
      { error: "Subject and body are both required." },
      { status: 400 },
    );
  }

  // Test send: one email, to me, before anything reaches the list.
  if (body.test) {
    const admin = process.env.ADMIN_EMAIL;
    if (!admin) {
      return NextResponse.json(
        { error: "ADMIN_EMAIL is not set." },
        { status: 500 },
      );
    }
    const result = await sendEmail({
      to: admin,
      subject: `[test] ${subject}`,
      react: Broadcast({
        subject,
        body: content,
        ctaLabel: body.ctaLabel,
        ctaUrl: body.ctaUrl,
        unsubscribeUrl: `${siteUrl()}/newsletter/unsubscribe?token=test`,
      }),
    });
    await logEmailSend({
      to: admin,
      template: "BroadcastTest",
      subject,
      result,
    });
    return NextResponse.json({ ok: result.status === "sent", sent: 1 });
  }

  // Real send. Confirmed, not unsubscribed — fetched here, never accepted
  // from the caller.
  const recipients = await fetchQuery(
    api.subscribers.listSendable,
    {},
    { token },
  ).catch(() => []);

  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "No confirmed subscribers to send to." },
      { status: 400 },
    );
  }

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i += CHUNK) {
    const chunk = recipients.slice(i, i + CHUNK);
    await Promise.all(
      chunk.map(async (subscriber: { email: string; token?: string }) => {
        const result = await sendEmail({
          to: subscriber.email,
          subject,
          react: Broadcast({
            subject,
            body: content,
            ctaLabel: body.ctaLabel,
            ctaUrl: body.ctaUrl,
            // Per-recipient, from their own token — a shared link would let
            // anyone unsubscribe anyone.
            unsubscribeUrl: `${siteUrl()}/newsletter/unsubscribe?token=${subscriber.token ?? ""}`,
          }),
        });

        if (result.status === "sent") sent += 1;
        else failed += 1;

        await logEmailSend({
          to: subscriber.email,
          template: "Broadcast",
          subject,
          result,
        });
      }),
    );
  }

  return NextResponse.json({ ok: true, sent, failed });
}
