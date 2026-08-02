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
    /** Which list to send to. Resolved server-side from this name only. */
    audience?: "newsletter" | "clients" | "enterprise" | "all" | "custom";
    /** A single address, when audience is "custom". */
    customEmail?: string;
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

  /*
   * Real send, to the chosen audience.
   *
   * The list is resolved here from an audience NAME, never taken as
   * addresses from the caller — an endpoint that accepts a recipient list is
   * an open relay with an auth check in front of it.
   *
   * A custom address is the one exception, and it is a single address that
   * goes only to itself: useful for forwarding a broadcast to one person
   * without adding them to a list.
   */
  const audience =
    body.audience === "clients" ||
    body.audience === "enterprise" ||
    body.audience === "all" ||
    body.audience === "custom"
      ? body.audience
      : "newsletter";

  let recipients: { email: string; name?: string }[];

  if (audience === "custom") {
    const to = typeof body.customEmail === "string" ? body.customEmail.trim() : "";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
      return NextResponse.json(
        { error: "That custom address does not look like an email." },
        { status: 400 },
      );
    }
    recipients = [{ email: to }];
  } else {
    /*
     * A failure here is NOT an empty audience.
     *
     * This used to `.catch(() => [])`, which turned an expired session or a
     * Convex error into "No recipients in the newsletter audience" below —
     * sending me off to re-add subscribers who were there the whole time.
     * The two cases need opposite responses, so they get different answers.
     */
    try {
      recipients = await fetchQuery(
        api.subscribers.audienceRecipients,
        { audience },
        { token },
      );
    } catch {
      return NextResponse.json(
        { error: "Could not read the audience. Check you are still signed in." },
        { status: 502 },
      );
    }
  }

  if (recipients.length === 0) {
    return NextResponse.json(
      { error: `No recipients in the ${audience} audience.` },
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
            /*
             * Per-recipient, from their own token — a shared link would let
             * anyone unsubscribe anyone.
             *
             * When there is no token the link is omitted rather than sent
             * empty. `?token=` with nothing after it is a link that looks
             * like an unsubscribe and cannot ever be one; the template falls
             * back to the reply-to address, which a person can actually act
             * on. Clients mailed directly have no subscription row, so this
             * is a real case rather than a defensive branch.
             */
            unsubscribeUrl: subscriber.token
              ? `${siteUrl()}/newsletter/unsubscribe?token=${subscriber.token}`
              : undefined,
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
