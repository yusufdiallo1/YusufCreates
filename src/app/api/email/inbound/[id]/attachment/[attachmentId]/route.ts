import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { getClient } from "@/lib/email";
import type { Id } from "@convex/_generated/dataModel";

/**
 * An attachment from an inbound message.
 *
 * The bytes were never pulled into our own storage — see the schema comment on
 * inboundEmails. Resend keeps them and issues a signed URL that EXPIRES, which
 * is the reason this is a route rather than a stored link: the URL has to be
 * minted at the moment it is clicked.
 *
 * Identity is re-verified from the session token rather than trusted from the
 * proxy match, because both ids in the path are caller-supplied. And the
 * attachment is checked against the message it claims to belong to — otherwise
 * anyone who could read one message's attachments could read every one in the
 * account by swapping an id, which is a good deal more than they were given.
 *
 * Deliberately NOT api.files.getUrl: that query is public by design, and a
 * Convex storage URL is a bearer credential that never expires. Nothing a
 * stranger emailed me belongs behind a permanent public link.
 */

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/email/inbound/[id]/attachment/[attachmentId]">,
) {
  const resend = getClient();
  if (!isConvexConfigured || !resend) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const token = await convexAuthNextjsToken();
  const allowed = await fetchQuery(api.admin.amIAdmin, {}, { token }).catch(
    () => false,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  const { id, attachmentId } = await ctx.params;

  const message = await fetchQuery(
    api.inboundEmails.getById,
    { id: id as Id<"inboundEmails"> },
    { token },
  ).catch(() => null);

  if (!message) {
    return NextResponse.json({ error: "No such message." }, { status: 404 });
  }

  // The ownership check. An attachment id that is not on THIS message is a 404,
  // not a fetch — Resend would happily serve it otherwise.
  if (!message.attachments.some((a) => a.id === attachmentId)) {
    return NextResponse.json({ error: "No such attachment." }, { status: 404 });
  }

  const { data, error } = await resend.emails.receiving.attachments.get({
    emailId: message.resendEmailId,
    id: attachmentId,
  });

  if (error || !data) {
    console.error(
      `[email/inbound] could not resolve attachment ${attachmentId}:`,
      error?.message ?? "no data",
    );
    return NextResponse.json({ error: "Could not fetch." }, { status: 502 });
  }

  /*
   * Redirect rather than proxy. The file is already behind a short-lived signed
   * URL, streaming it through here would put an arbitrary stranger's payload
   * through our own runtime for no benefit, and 307 keeps the whole thing out
   * of any cache — which matters, because the URL it points at goes stale.
   */
  return NextResponse.redirect(data.download_url, {
    status: 307,
    headers: { "cache-control": "no-store" },
  });
}
