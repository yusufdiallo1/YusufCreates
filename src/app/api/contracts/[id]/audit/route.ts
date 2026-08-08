import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api, isConvexConfigured } from "@/lib/convex-api";
import type { Id } from "@convex/_generated/dataModel";

/**
 * One contract's audit trail as JSON.
 *
 * Downloadable because an audit trail nobody can take away and check is not
 * much of an audit trail. The file carries the recomputed body hash alongside
 * the stored one, so whoever opens it can see whether the chain held at the
 * moment it was exported rather than taking the stored value on trust.
 */

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/contracts/[id]/audit">,
) {
  if (!isConvexConfigured) {
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
  const trail = await fetchQuery(
    api.contracts.auditTrail,
    { id: id as Id<"contracts"> },
    { token },
  ).catch(() => null);

  if (!trail) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const name = trail.contract.clientName
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return new NextResponse(JSON.stringify(trail, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="audit-${name || "contract"}-${id}.json"`,
      "cache-control": "private, no-store",
    },
  });
}
