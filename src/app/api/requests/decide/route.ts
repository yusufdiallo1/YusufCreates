import { NextResponse } from "next/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { sendEmail, siteUrl } from "@/lib/email";
import { logEmailSend } from "@/lib/emailLog";
import { RequestAccepted } from "@emails/RequestAccepted";
import { RequestDeclined } from "@emails/RequestDeclined";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Approves or declines a project request, and tells the client.
 *
 * A ROUTE RATHER THAN A MUTATION because Convex cannot send mail. The decision
 * itself lives in convex/leads.ts; this wraps it with the one thing a database
 * function cannot do.
 *
 * ORDER MATTERS, and it is deliberately mutation-first. A decision that is
 * recorded but unannounced can be chased from the admin. An email promising a
 * portal for a request still sitting undecided sends someone to a page that
 * does not know who they are — the worse failure, and the harder one to
 * notice.
 *
 * The email is therefore never the thing that "completes" the decision. If it
 * fails, the response says so and the decision stands; the admin can resend.
 */

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isConvexConfigured) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const authToken = await convexAuthNextjsToken();

  /*
   * Admin identity re-verified here even though the mutations check it too.
   * The lead id is caller-supplied, and accepting a request creates a client
   * and an obligation — the cheap check belongs in front of the expensive
   * consequence.
   */
  const allowed = await fetchQuery(
    api.admin.amIAdmin,
    {},
    { token: authToken },
  ).catch(() => false);
  if (!allowed) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  let body: {
    id?: string;
    decision?: "approve" | "decline";
    mode?: "instant" | "slot";
    scheduledMonth?: string;
    reason?: string;
    /** Lets the admin decide, per request, whether to actually send. */
    notify?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const id = body.id as Id<"leads"> | undefined;
  if (!id || (body.decision !== "approve" && body.decision !== "decline")) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  // Read BEFORE the mutation: approving flips status to "won", and the email
  // wants the brief as it was submitted.
  const lead = await fetchQuery(api.leads.get, { id }, { token: authToken });
  if (!lead) {
    return NextResponse.json({ error: "No such request." }, { status: 404 });
  }

  if (body.decision === "approve") {
    await fetchMutation(
      api.leads.approve,
      {
        id,
        mode: body.mode ?? "instant",
        scheduledMonth: body.mode === "slot" ? body.scheduledMonth : undefined,
      },
      { token: authToken },
    );
  } else {
    await fetchMutation(
      api.leads.decline,
      { id, reason: body.reason },
      { token: authToken },
    );
  }

  // Notification is opt-out per decision. Declining a spam submission should
  // not write to a stranger, and that is a judgement only the admin can make.
  if (body.notify === false) {
    return NextResponse.json({ ok: true, email: "skipped" });
  }

  const approved = body.decision === "approve";
  const subject = approved
    ? "I'm taking your project on — here's your portal"
    : "About your project request";

  const result = await sendEmail({
    to: lead.email,
    subject,
    react: approved
      ? RequestAccepted({
          name: lead.name,
          // The portal is session-based, not token-based: access comes from
          // signing in as the address the invoice is addressed to.
          portalUrl: `${siteUrl()}/portal`,
          scheduledMonth:
            body.mode === "slot" ? body.scheduledMonth : undefined,
          projectName: lead.projectType ?? undefined,
        })
      : RequestDeclined({
          name: lead.name,
          reason: body.reason,
          // Offered only when the request was declined for TIMING. A "hold a
          // slot" button under "this isn't something I'd do well" is a
          // contradiction.
          slotUrl: body.mode === "slot" ? `${siteUrl()}/waitlist` : undefined,
        }),
  });

  await logEmailSend({
    to: lead.email,
    template: approved ? "RequestAccepted" : "RequestDeclined",
    subject,
    result,
  });

  return NextResponse.json({ ok: true, email: result.status });
}
