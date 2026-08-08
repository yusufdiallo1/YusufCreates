import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { contractFilename, servePdf } from "@/lib/servePdf";
import type { Id } from "@convex/_generated/dataModel";

/**
 * The signed PDF, for the client it belongs to.
 *
 * The id IS taken from the URL here, which the portal's own rule forbids —
 * so ownership is checked in Convex by mayReadContract against the session,
 * and a contract belonging to someone else returns exactly the same 404 as one
 * that does not exist. Nothing in the response distinguishes the two.
 */

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/portal/contracts/[id]/pdf">,
) {
  const secret = process.env.EMAIL_LOG_SECRET;
  if (!isConvexConfigured || !secret) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const token = await convexAuthNextjsToken();
  const { id } = await ctx.params;

  const allowed = await fetchQuery(
    api.portal.mayReadContract,
    { id: id as Id<"contracts"> },
    { token },
  ).catch(() => null);

  if (!allowed) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return servePdf(
    allowed.storageId,
    contractFilename(allowed.clientName, allowed.signedAt),
    secret,
  );
}
