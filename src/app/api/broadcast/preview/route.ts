import { NextResponse } from "next/server";
import { render } from "@react-email/components";
import { fetchQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api } from "@/lib/convex-api";
import { Broadcast } from "@emails/Broadcast";

/**
 * Renders the broadcast for the live preview.
 *
 * Server-side because @react-email/render is server-only — it cannot run in
 * the browser. The alternative, a parallel React preview component, drifts
 * from the real output and defeats the entire point of a preview.
 *
 * Admin-gated: this is not sensitive, but an open render endpoint is free
 * compute for anyone who finds it.
 */
export const runtime = "nodejs";

export async function POST(request: Request) {
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
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const html = await render(
    Broadcast({
      subject: body.subject ?? "",
      body: body.body ?? "",
      ctaLabel: body.ctaLabel,
      ctaUrl: body.ctaUrl,
      // A placeholder, so the preview shows the footer the recipient sees.
      unsubscribeUrl: "#preview",
    }),
  );

  return NextResponse.json({ html });
}
