import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { fetchQuery } from "convex/nextjs";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { contractFilename, servePdf } from "@/lib/servePdf";
import { shareCookieName } from "@/lib/shareSession";

/**
 * The shared PDF, behind the two-code session.
 *
 * Sits under /contract/share/<token>/ rather than /api on purpose: the session
 * cookie is path-scoped to the share so it cannot leak onto unrelated
 * requests, and a cookie scoped there is never sent to /api.
 */

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/contract/share/[token]/pdf">,
) {
  const secret = process.env.EMAIL_LOG_SECRET;
  if (!isConvexConfigured || !secret) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const { token } = await ctx.params;
  const jar = await cookies();
  const sessionToken = jar.get(shareCookieName(token))?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const session = await fetchQuery(api.contractShares.resolveSession, {
    secret,
    sessionToken,
    token,
  }).catch(() => null);

  if (!session?.signedPdfFileId || session.scope === "audit") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return servePdf(
    session.signedPdfFileId,
    contractFilename(session.clientName, session.signedAt),
    secret,
  );
}
