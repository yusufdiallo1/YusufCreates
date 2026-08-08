import { NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { requestIdentity } from "@/lib/requestIdentity";

/**
 * Records that a contract was opened.
 *
 * A route rather than a mutation called from the browser, for one reason:
 * Convex cannot see the request's network address, and an "IP" the client
 * hands us is not evidence of anything. The server reads it from the edge and
 * vouches for it with the server secret, which is also why contracts.recordView
 * is secret-gated rather than public.
 *
 * Deliberately quiet. A failed view stamp is not worth an error in front of
 * someone about to sign, so every failure path returns 200 and logs nothing at
 * them. The stamp only drives follow-up chasing; losing one costs a nudge.
 */

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.EMAIL_LOG_SECRET;
  if (!isConvexConfigured || !secret) {
    return NextResponse.json({ ok: false });
  }

  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!body.token) return NextResponse.json({ ok: false }, { status: 400 });

  const { rawIp, userAgent } = requestIdentity(request);

  try {
    await fetchMutation(api.contracts.recordView, {
      secret,
      token: body.token,
      ip: rawIp || undefined,
      userAgent: userAgent || undefined,
    });
  } catch {
    // See above — swallowed on purpose.
  }

  return NextResponse.json({ ok: true });
}
