import { NextResponse } from "next/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { sendEmail, siteUrl } from "@/lib/email";
import { logEmailSend } from "@/lib/emailLog";
import { ContractShareInvite } from "@emails/ContractShareInvite";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Creates a share link and emails the invitation.
 *
 * Admin-gated: the contract id comes from the caller, and creating a share is
 * the act of granting someone access to a signed agreement.
 */

export const runtime = "nodejs";

export async function POST(request: Request) {
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

  let body: {
    contractId?: string;
    recipientEmail?: string;
    scope?: "contract" | "pdf" | "audit";
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  if (!body.contractId || !body.recipientEmail) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }

  let share;
  try {
    share = await fetchMutation(
      api.contractShares.createShare,
      {
        contractId: body.contractId as Id<"contracts">,
        recipientEmail: body.recipientEmail,
        scope: body.scope ?? "pdf",
      },
      { token },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not share." },
      { status: 400 },
    );
  }

  const contract = await fetchQuery(
    api.contracts.getById,
    { id: body.contractId as Id<"contracts"> },
    { token },
  ).catch(() => null);

  const shareUrl = `${siteUrl()}/contract/share/${share.token}`;
  const subject = `${contract?.contract.clientName ?? "A document"} — shared with you`;

  const result = await sendEmail({
    to: share.recipientEmail,
    subject,
    react: ContractShareInvite({
      clientName: contract?.contract.clientName ?? "your project",
      shareUrl,
      scope: body.scope ?? "pdf",
    }),
  });
  await logEmailSend({
    to: share.recipientEmail,
    template: "ContractShareInvite",
    subject,
    result,
  });

  // The share exists whether or not the email went; say which, so a failed
  // send does not look like a failed share.
  const emailed = result.status === "sent";
  return NextResponse.json({
    ok: true,
    emailed,
    shareUrl,
    ...(emailed
      ? {}
      : {
          warning:
            "The link was created but the invitation email did not send. Send the link by hand.",
        }),
  });
}
