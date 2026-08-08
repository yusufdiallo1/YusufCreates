import { NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { requestIdentity } from "@/lib/requestIdentity";
import { sendEmail } from "@/lib/email";
import { logEmailSend } from "@/lib/emailLog";
import { ContractShareCode } from "@emails/ContractShareCode";

/**
 * Issues and emails one access code.
 *
 * The 60-second clock on the first code starts HERE — when the recipient
 * presses the button, not when they opened the link. That is the whole reason
 * this is a separate request: a timer that starts on page load would be spent
 * before the email arrived.
 *
 * The plaintext code exists in this function and in one email. It is never
 * returned to the browser and never written to the database — only its salted
 * hash is stored.
 */

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.EMAIL_LOG_SECRET;
  if (!isConvexConfigured || !secret) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  let body: { token?: string; stage?: "one" | "two" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  if (!body.token || (body.stage !== "one" && body.stage !== "two")) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { rawIp, ipHash, userAgent } = requestIdentity(request);

  // Every attempt sends an email, so this is the expensive one to leave open.
  const verdict = await fetchMutation(api.contracts.checkRate, {
    secret,
    kind: "share",
    key: ipHash,
  }).catch(() => ({ ok: true as const, retryAfterMs: 0 }));

  if (!verdict.ok) {
    return NextResponse.json(
      { error: "Too many requests. Give it a minute." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(verdict.retryAfterMs / 1000)),
        },
      },
    );
  }

  let issued;
  try {
    issued = await fetchMutation(api.contractShares.issueChallenge, {
      secret,
      token: body.token,
      stage: body.stage,
      ip: rawIp || undefined,
      userAgent: userAgent || undefined,
    });
  } catch {
    // Same answer for a dead link and a stage-two request that skipped stage
    // one — neither should tell a prober which it was.
    return NextResponse.json(
      { error: "This link is no longer valid." },
      { status: 400 },
    );
  }

  const secondsValid = Math.max(
    1,
    Math.round((issued.expiresAt - Date.now()) / 1000),
  );

  const subject = `Your access code: ${issued.code}`;
  const result = await sendEmail({
    to: issued.recipientEmail,
    subject,
    react: ContractShareCode({
      code: issued.code,
      stage: issued.stage,
      secondsValid,
    }),
  });
  await logEmailSend({
    to: issued.recipientEmail,
    template: "ContractShareCode",
    subject,
    result,
  });

  if (result.status !== "sent") {
    // Worth surfacing: the code is already live and ticking, and nobody has
    // it. Silence here would look like a code that never arrived.
    return NextResponse.json(
      { error: "Could not send the code. Try again in a moment." },
      { status: 502 },
    );
  }

  // expiresAt only — the code itself never comes back to the browser.
  return NextResponse.json({ ok: true, expiresAt: issued.expiresAt });
}
