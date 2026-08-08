import { NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { requestIdentity } from "@/lib/requestIdentity";
import { shareCookieName, shareCookiePath } from "@/lib/shareSession";

/**
 * Checks a code. On the second one, grants the session.
 *
 * The session lives in an httpOnly cookie so no script on the page can read
 * it, scoped to this share's own path so one shared document cannot be used
 * to reach another.
 *
 * Every failure returns the same message and the same status. "Wrong code",
 * "expired", "too many attempts" and "no such link" are all one answer here —
 * telling them apart hands a prober a map.
 */

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.EMAIL_LOG_SECRET;
  if (!isConvexConfigured || !secret) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  let body: { token?: string; stage?: "one" | "two"; code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  if (!body.token || !body.code || (body.stage !== "one" && body.stage !== "two")) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { rawIp, ipHash, userAgent } = requestIdentity(request);

  const verdict = await fetchMutation(api.contracts.checkRate, {
    secret,
    kind: "share",
    key: ipHash,
  }).catch(() => ({ ok: true as const, retryAfterMs: 0 }));

  if (!verdict.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Give it a minute." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(verdict.retryAfterMs / 1000)),
        },
      },
    );
  }

  const result = await fetchMutation(api.contractShares.verifyChallenge, {
    secret,
    token: body.token,
    stage: body.stage,
    code: body.code,
    ip: rawIp || undefined,
    userAgent: userAgent || undefined,
  }).catch(() => ({ ok: false as const }));

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: "That code isn't right, or it has expired." },
      { status: 400 },
    );
  }

  if (result.next === "two") {
    return NextResponse.json({ ok: true, next: "two" });
  }

  const response = NextResponse.json({ ok: true, next: "done" });
  response.cookies.set({
    name: shareCookieName(body.token),
    value: result.sessionToken,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    // Scoped to this share. A cookie set at "/" would travel with every
    // request to the site, including ones that have nothing to do with it —
    // which is also why the gated PDF sits under this path rather than /api.
    path: shareCookiePath(body.token),
    expires: new Date(result.expiresAt),
  });
  return response;
}
