import { NextResponse } from "next/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { sendEmail } from "@/lib/email";
import { logEmailSend } from "@/lib/emailLog";
import { BuildDeclined } from "@emails/BuildDeclined";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Declines a brief and tells the client why.
 *
 * The mirror of the approve route, and it exists for the same reason: Convex
 * cannot send mail, and a decline nobody is told about leaves someone waiting
 * indefinitely for an answer that has already been given. Silence after a
 * brief reads as being ignored, which is worse than a no.
 *
 * Mutation first, email second — same ordering as approve. A recorded decline
 * with a failed email can be retried; an email saying no on a build still
 * sitting in pending_approval contradicts the portal it points at.
 */

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isConvexConfigured) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const authToken = await convexAuthNextjsToken();
  const allowed = await fetchQuery(
    api.admin.amIAdmin,
    {},
    { token: authToken },
  ).catch(() => false);
  if (!allowed) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  let body: { id?: string; note?: string };
  try {
    body = (await request.json()) as { id?: string; note?: string };
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const id = body.id as Id<"expressBuilds"> | undefined;
  if (!id) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  await fetchMutation(
    api.express.decline,
    { id, note: body.note },
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

  // Declining twice must not email twice.
  if (build.decisionEmailSentAt) {
    return NextResponse.json({ ok: true, email: "already-sent" });
  }

  const subject = "About your brief";

  const result = await sendEmail({
    to: build.email,
    subject,
    react: BuildDeclined({
      name: build.name,
      // Read back from the row rather than from the request, so the email and
      // the portal cannot disagree about what was said.
      note: build.declineNote ?? undefined,
    }),
  });

  await logEmailSend({
    to: build.email,
    template: "BuildDeclined",
    subject,
    result,
  });

  if (result.status === "sent") {
    await fetchMutation(
      api.express.markDecisionEmailSent,
      { id },
      { token: authToken },
    );
  }

  return NextResponse.json({ ok: true, email: result.status });
}
