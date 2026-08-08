import "server-only";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@/lib/convex-api";
import { sendEmail, siteUrl, adminEmail } from "@/lib/email";
import { logEmailSend } from "@/lib/emailLog";
import { sendPush } from "@/lib/push";
import { renderNotification } from "@/lib/notifications";

/**
 * Drains the notification outbox.
 *
 * The other half of convex/notify.ts. Convex decides what should be said and
 * queues a row; this renders the template and actually sends it, because
 * Resend and the VAPID keys live on this side and must stay behind
 * `server-only`.
 *
 * Lives in lib rather than in the route that exposes it, because two callers
 * need it and a Next route file may only export handlers and config — an
 * extra named export there fails the build's route-type check.
 *
 * Called three ways, and the difference is the whole point:
 *
 *   1. /api/notify/dispatch, poked by a Convex action the moment a row is
 *      due. This is what makes an outage alert arrive in seconds.
 *   2. /api/cron/notify, poked by convex/contracts.pokeNotify every twenty
 *      minutes for the contract queues, which drains this one on the way past.
 *   3. /api/cron/notify again, on the daily Vercel cron, as the backstop for
 *      when both pokes failed — a deploy, a cold start, a network blip.
 *
 * A failure leaves the row queued rather than marking someone as told when
 * they were not.
 *
 * CONCURRENCY IS HANDLED BY CLAIMING, not by the mark-on-success above.
 *
 * This comment used to say a double-call sends nothing twice because a row is
 * only cleared on a real Resend success. That is true of SEQUENTIAL calls and
 * false of overlapping ones: the row is marked after the send returns, so two
 * drains that both read before either marked would both send. With (1) firing
 * on enqueue and (2) every twenty minutes, an incident is exactly when they
 * overlap. pendingPublic is now a mutation that claims what it hands out.
 */
export async function drain(
  secret: string,
): Promise<{ sent: number; failed: number; pushed: number }> {
  // fetchMutation, not fetchQuery — pendingPublic writes the claim.
  const pending = await fetchMutation(api.notify.pendingPublic, {
    secret,
  }).catch(() => []);

  if (pending.length === 0) return { sent: 0, failed: 0, pushed: 0 };

  // Fetched once for the whole batch. During an incident several rows want
  // the same device list, and re-reading it per row is pure overhead.
  const subscriptions = await fetchQuery(api.notify.pushSubscriptionsPublic, {
    secret,
  }).catch(() => []);

  const admin = adminEmail();
  const base = siteUrl();

  let sent = 0;
  let failed = 0;
  let pushed = 0;

  for (const row of pending) {
    try {
      const message = renderNotification(row.kind, row.payload, {
        siteUrl: base,
        adminEmail: admin,
      });

      /*
       * A kind with no template is not a retryable failure — every future
       * drain would render it, fail identically, and spend its budget on it
       * first. It is cleared so the queue keeps moving, and logged loudly,
       * because it means an enqueue site and the registry have drifted.
       */
      if (!message) {
        console.error(
          `[notify] no template for kind "${row.kind}"; dropping notification ${row.id}`,
        );
        await fetchMutation(api.notify.markSentPublic, { secret, id: row.id });
        continue;
      }

      if (!message.to) {
        // Almost always ADMIN_EMAIL being unset on an admin-bound alert.
        await fetchMutation(api.notify.markSentPublic, {
          secret,
          id: row.id,
          error: "No recipient address.",
        });
        failed += 1;
        continue;
      }

      const send = await sendEmail({
        to: message.to,
        subject: message.subject,
        react: message.react,
        replyTo: message.replyTo,
      });

      await logEmailSend({
        to: message.to,
        template: message.template,
        subject: message.subject,
        result: send,
      });

      if (send.status === "sent") {
        await fetchMutation(api.notify.markSentPublic, { secret, id: row.id });
        sent += 1;
      } else if (send.status === "skipped") {
        /*
         * RESEND_API_KEY is unset — a fresh clone, or local development.
         * Cleared rather than retried: retrying cannot succeed, and leaving
         * it queued means the first real deploy floods the inbox with every
         * alert since the beginning of time.
         */
        await fetchMutation(api.notify.markSentPublic, { secret, id: row.id });
      } else {
        await fetchMutation(api.notify.markSentPublic, {
          secret,
          id: row.id,
          error: send.error,
        });
        failed += 1;
      }

      /*
       * Push AFTER the email, and only for alerts addressed to me.
       *
       * After, because the email is the record and the push is the nudge to
       * go and read it. Buzzing the phone first means reaching for it before
       * there is anything to open.
       */
      if (message.push) {
        const res = await sendPush(subscriptions, message.push);
        pushed += res.sent;

        for (const endpoint of res.gone) {
          await fetchMutation(api.notify.pruneSubscriptionPublic, {
            secret,
            endpoint,
          }).catch(() => {});
        }
      }
    } catch (err) {
      /*
       * A template that throws must not take the rest of the batch with it.
       * During an incident the queue holds the admin alert AND the client
       * notification, and losing the second because the first had a bad date
       * is exactly the wrong failure.
       */
      await fetchMutation(api.notify.markSentPublic, {
        secret,
        id: row.id,
        error: err instanceof Error ? err.message : "Render failed.",
      }).catch(() => {});
      failed += 1;
    }
  }

  // Logged only when something happened — a line on every poke would train
  // me to scroll past the one that matters.
  if (sent > 0 || failed > 0) {
    console.info(
      `[notify/drain] sent=${sent} failed=${failed} pushed=${pushed}`,
    );
  }

  return { sent, failed, pushed };
}
