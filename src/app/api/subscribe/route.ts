import { NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api, isConvexConfigured } from "@/lib/convex-api";

/**
 * Newsletter signup.
 *
 * Confirmed opt-in: the row starts unconfirmed and is only marked confirmed
 * once the welcome email's link is clicked. Slower list growth, materially
 * better deliverability, and the safer position under GDPR and PDPL.
 *
 * Writing to Convex first means a signup is never lost to an email provider
 * outage; the Resend audience sync and welcome email hang off this record.
 */
export async function POST(request: Request) {
  if (!isConvexConfigured) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  let body: { email?: string; source?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }

  try {
    await fetchMutation(api.subscribers.subscribe, {
      email,
      source: body.source ?? "footer",
    });
  } catch {
    return NextResponse.json({ error: "Could not save." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
