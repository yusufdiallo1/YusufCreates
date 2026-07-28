import "server-only";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/lib/convex-api";
import type { SendResult } from "@/lib/email";

/**
 * Records the outcome of an email send.
 *
 * The mutation is gated by EMAIL_LOG_SECRET, which must be set on BOTH the
 * Next runtime and the Convex deployment. Without that gate anyone could forge
 * rows in the one table that answers "did this actually go out", and a
 * poisoned log is worse than no log.
 *
 * Never throws. A failed log must not turn a successful send — or a
 * successfully saved lead — into an error response.
 */
export async function logEmailSend({
  to,
  template,
  subject,
  result,
  leadId,
}: {
  to: string;
  template: string;
  subject: string;
  result: SendResult;
  leadId?: string;
}): Promise<void> {
  const secret = process.env.EMAIL_LOG_SECRET;

  // Without the secret the mutation will reject. Say so in the server log
  // rather than firing a call that is guaranteed to fail — a missing log is a
  // real gap, but not a reason to fail the request.
  if (!secret) {
    console.warn(
      `[emailLog] EMAIL_LOG_SECRET unset; not recording ${template} to ${to}`,
    );
    return;
  }

  try {
    await fetchMutation(api.subscribers.logEmail, {
      secret,
      to,
      template,
      subject,
      status: result.status,
      providerId: result.status === "sent" ? result.id : undefined,
      error: result.status === "failed" ? result.error : undefined,
      leadId: leadId as never,
    });
  } catch (err) {
    console.warn(
      `[emailLog] failed to record ${template} to ${to}:`,
      err instanceof Error ? err.message : err,
    );
  }
}
