import { NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { logEmailSend } from "@/lib/emailLog";
import { sendEmail, siteUrl } from "@/lib/email";
import { NewsletterWelcome } from "@emails/NewsletterWelcome";

/**
 * Newsletter signup.
 *
 * Confirmed opt-in: the row starts unconfirmed and is only marked confirmed
 * once the link in the welcome email is clicked. Slower list growth,
 * materially better deliverability, and the safer position under GDPR and
 * PDPL.
 *
 * Writing to Convex first means a signup is never lost to an email provider
 * outage — the welcome email hangs off the stored record, so a failed send can
 * be retried against a row that already exists.
 */
export async function POST(request: Request) {
  if (!isConvexConfigured) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  let body: {
    email?: string;
    source?: string;
    companyWebsite?: string;
    elapsedMs?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  // Honeypot and time trap. Both report success so the bot learns nothing.
  if (body.companyWebsite) return NextResponse.json({ ok: true });
  if (body.elapsedMs !== undefined && body.elapsedMs < 2000) {
    return NextResponse.json({ ok: true });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }

  let result: { token: string; alreadyConfirmed: boolean };
  try {
    result = await fetchMutation(api.subscribers.subscribe, {
      email,
      source: body.source ?? "footer",
    });
  } catch {
    return NextResponse.json({ error: "Could not save." }, { status: 502 });
  }

  // Already confirmed: no second email. Sending another confirmation to
  // someone already on the list is a good way to earn a spam complaint.
  if (!result.alreadyConfirmed) {
    const confirmUrl = `${siteUrl()}/newsletter/confirm?token=${result.token}`;
    const subject = "Confirm your subscription";
    const send = await sendEmail({
      to: email,
      subject,
      react: NewsletterWelcome({ confirmUrl }),
    });

    // Logged, never fatal — the subscriber row is already saved.
    await logEmailSend({
      to: email,
      template: "NewsletterWelcome",
      subject,
      result: send,
    });
  }

  return NextResponse.json({ ok: true });
}
