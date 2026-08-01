import { NextResponse } from "next/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { sendEmail, siteUrl } from "@/lib/email";
import { logEmailSend } from "@/lib/emailLog";
import { BuildApproved } from "@emails/BuildApproved";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Approves a brief and emails the client their portal link.
 *
 * A route rather than a plain mutation because Convex cannot send mail, and
 * approving without telling anyone is the failure that stalls the whole flow:
 * the portal unlocks payment, but nothing prompts the client to go and look.
 *
 * Order matters. The mutation runs FIRST and the email second — an approval
 * that is recorded but unannounced can be chased from the admin, whereas an
 * email promising a live portal for a build still sitting in pending_approval
 * sends someone to a page with no pay button.
 *
 * Admin identity is re-verified from the session token, because the build id
 * is caller-supplied and approving is what makes a build payable.
 */

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isConvexConfigured) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const authToken = await convexAuthNextjsToken();
  const allowed = await fetchQuery(api.admin.amIAdmin, {}, { token: authToken }).catch(
    () => false,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  let body: { id?: string; deliveryDate?: number };
  try {
    body = (await request.json()) as { id?: string; deliveryDate?: number };
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const id = body.id as Id<"expressBuilds"> | undefined;
  if (!id) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  await fetchMutation(
    api.express.approve,
    { id, deliveryDate: body.deliveryDate },
    { token: authToken },
  );

  const build = await fetchQuery(
    api.express.forDecisionEmail,
    { id },
    { token: authToken },
  );
  if (!build) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  /*
   * Approving twice must not email twice. `approve` itself is already
   * idempotent — it returns early once approvedAt is set — but the send is a
   * separate step, so it needs its own guard or a double-click becomes two
   * "I'm taking it on" emails.
   */
  if (build.portalEmailSentAt) {
    return NextResponse.json({ ok: true, email: "already-sent" });
  }

  const money = (minor: number) =>
    (minor / 100).toLocaleString("en-US", {
      style: "currency",
      currency: build.currency.toUpperCase(),
    });

  const isExpress = build.plan === "express";
  const subject = isExpress
    ? "I'm taking your build on — here's your portal"
    : "I'm taking your project on — here's your portal";

  const result = await sendEmail({
    to: build.email,
    subject,
    react: BuildApproved({
      name: build.name,
      portalUrl: `${siteUrl()}/portal/${build.token}`,
      deposit: money(build.depositAmount),
      balance: money(build.balanceAmount),
      isExpress,
      deliveryDate: build.deliveryDate
        ? new Date(build.deliveryDate).toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })
        : undefined,
    }),
  });

  await logEmailSend({
    to: build.email,
    template: "BuildApproved",
    subject,
    result,
  });

  // Only a real send is recorded. A skip (no API key, as on a fresh clone) or
  // a failure leaves the stamp unset so it can be retried from the admin.
  if (result.status === "sent") {
    await fetchMutation(
      api.express.markPortalEmailSent,
      { id },
      { token: authToken },
    );
  }

  return NextResponse.json({ ok: true, email: result.status });
}
