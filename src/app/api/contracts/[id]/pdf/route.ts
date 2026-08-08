import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { contractFilename, servePdf } from "@/lib/servePdf";
import type { Id } from "@convex/_generated/dataModel";

/**
 * The signed PDF, for the admin.
 *
 * Identity is re-verified from the session token rather than trusted from the
 * middleware match — the contract id is caller-supplied, and this is the one
 * document in the system with legal weight.
 */

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/contracts/[id]/pdf">,
) {
  const secret = process.env.EMAIL_LOG_SECRET;
  if (!isConvexConfigured || !secret) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const token = await convexAuthNextjsToken();
  const allowed = await fetchQuery(api.admin.amIAdmin, {}, { token }).catch(
    () => false,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const loaded = await fetchQuery(
    api.contracts.getById,
    { id: id as Id<"contracts"> },
    { token },
  ).catch(() => null);

  if (!loaded?.contract.signedPdfFileId) {
    return NextResponse.json({ error: "No signed PDF." }, { status: 404 });
  }

  return servePdf(
    loaded.contract.signedPdfFileId,
    contractFilename(loaded.contract.clientName, loaded.contract.signedAt),
    secret,
  );
}
