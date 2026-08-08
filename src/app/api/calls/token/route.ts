import { NextResponse } from "next/server";
import { RtcRole, RtcTokenBuilder } from "agora-token";
import { fetchQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api, isConvexConfigured } from "@/lib/convex-api";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Mints an Agora RTC join token.
 *
 * WHY THIS EXISTS AT ALL. The Agora App ID is public — it is compiled into the
 * browser bundle by design. On its own it is an identifier, not a credential,
 * so a project left in "Testing mode" will admit anyone who knows the App ID
 * and a channel name. For a call between a client and their developer, on a
 * channel that also carries their whiteboard, that is not good enough.
 *
 * With an App Certificate configured, every join needs a token that is scoped
 * to ONE channel, ONE uid and ONE hour, and can only be minted here — behind
 * the same session check that guards the rest of the portal. The certificate
 * never leaves the server.
 *
 * THE AUTHORISATION IS THE POINT. `calls.get` re-runs the full participant
 * check server-side, so a caller cannot mint a token for a channel belonging
 * to someone else's project by passing its id. Never take the channel name
 * from the request body: that would let anyone name any channel and be handed
 * a valid token for it.
 */

/** One hour. Long enough for a real meeting, short enough that a leak expires. */
const TTL_SECONDS = 3600;

export async function POST(request: Request) {
  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
  const certificate = process.env.AGORA_APP_CERTIFICATE;

  if (!appId) {
    return NextResponse.json(
      { error: "Calling is not configured." },
      { status: 503 },
    );
  }
  if (!isConvexConfigured) {
    return NextResponse.json(
      { error: "Backend is not configured." },
      { status: 503 },
    );
  }

  let body: { callId?: string };
  try {
    body = (await request.json()) as { callId?: string };
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  if (!body.callId) {
    return NextResponse.json({ error: "Missing callId." }, { status: 400 });
  }

  /*
   * The session is what decides this, not the request.
   *
   * calls.get throws unless the caller is the admin or the client who owns the
   * project, so an unauthorised caller never reaches the token builder — and
   * the channel name comes back from the database rather than from them.
   */
  const authToken = await convexAuthNextjsToken();
  let call: { channel: string; endedAt?: number } | null = null;
  try {
    call = await fetchQuery(
      api.calls.get,
      { callId: body.callId as Id<"calls"> },
      { token: authToken },
    );
  } catch {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  if (!call) {
    return NextResponse.json({ error: "No such call." }, { status: 404 });
  }
  if (call.endedAt) {
    return NextResponse.json({ error: "That call has ended." }, { status: 410 });
  }

  /*
   * Testing mode: no certificate, so no token to mint.
   *
   * Returned explicitly rather than as an error, because it IS a working
   * configuration for local development — the client SDK joins with a null
   * token. `secured: false` travels with it so the UI can say plainly that the
   * channel is not protected rather than implying it is.
   */
  if (!certificate) {
    return NextResponse.json({
      appId,
      channel: call.channel,
      token: null,
      uid: 0,
      secured: false,
    });
  }

  /*
   * uid 0 lets Agora assign one.
   *
   * The token must be built for the SAME uid the client joins with, and the
   * SDK reports the assigned uid only after joining — so a token minted for a
   * guessed uid would be rejected. Building for 0 and joining with null keeps
   * the two in agreement.
   */
  const expiresAt = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    certificate,
    call.channel,
    0,
    RtcRole.PUBLISHER,
    expiresAt,
    expiresAt,
  );

  return NextResponse.json({
    appId,
    channel: call.channel,
    token,
    uid: 0,
    secured: true,
  });
}
