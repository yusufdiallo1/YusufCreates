import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { requireAdmin } from "./lib/auth";

/**
 * The notification outbox.
 *
 * Convex decides that something should be said. Next.js says it. That split
 * already existed for the express flow — Convex cannot reach Resend, and the
 * Resend key must stay behind `server-only` in src/lib/email.ts — and this
 * generalises it.
 *
 * What is new is immediacy. The express queue is drained by a Vercel cron
 * that runs ONCE A DAY, because the Hobby plan rejects anything more frequent
 * at deploy time. That is fine for "your deposit reminder". It is not fine
 * for "your client's site has been down for two minutes".
 *
 * So a row that is due now also pokes /api/notify/dispatch directly. The poke
 * is best-effort and the ROW is the truth:
 *
 *   - poke succeeds  → sent within seconds
 *   - poke fails     → the row is still queued, and the daily cron drain
 *                      picks it up
 *
 * That ordering matters. An alert that arrives late is recoverable. An alert
 * marked sent that never went is not, which is why nothing here marks a row
 * sent — only the dispatcher does, and only on a real Resend success.
 */

/**
 * Enqueue and, if it is due now, poke the dispatcher.
 *
 * A plain function rather than only a mutation, because most callers are
 * already inside a mutation — the intake nudge sweep, the monitoring sweeps —
 * and a mutation calling a mutation is the wrong shape. Called directly, the
 * enqueue joins the caller's transaction: if their write rolls back, so does
 * the notification, and nothing is ever announced about a change that did not
 * happen.
 */
export async function enqueueNotification(
  ctx: MutationCtx,
  args: {
    kind: string;
    payload: unknown;
    /** Omit for "now". Set for the 15-minute client incident delay. */
    dueAt?: number;
  },
): Promise<Id<"notifications">> {
  const now = Date.now();
  const dueAt = args.dueAt ?? now;

  const id = await ctx.db.insert("notifications", {
    kind: args.kind,
    payload: args.payload,
    dueAt,
    attempts: 0,
  });

  /*
   * Scheduled rather than awaited: a mutation cannot fetch, and must not be
   * held open by the network either. A scheduled call is also cancelled if
   * the transaction rolls back, so this can never poke the dispatcher about
   * a row that does not exist.
   */
  if (dueAt <= now) {
    await ctx.scheduler.runAfter(0, internal.notify.dispatchNow, {});
  } else {
    // Woken when it comes due, so a delayed send does not sit until the next
    // daily drain.
    await ctx.scheduler.runAt(dueAt, internal.notify.dispatchNow, {});
  }

  return id;
}

/** The same thing as a callable, for actions and for testing by hand. */
export const enqueue = internalMutation({
  args: {
    kind: v.string(),
    payload: v.any(),
    dueAt: v.optional(v.number()),
  },
  handler: async (ctx, args) =>
    await enqueueNotification(ctx, {
      kind: args.kind,
      payload: args.payload,
      dueAt: args.dueAt,
    }),
});

/**
 * Pokes the Next.js dispatcher.
 *
 * Fire-and-forget: a failure here loses nothing, because the row stays queued
 * and the daily cron drain is the safety net. But it is NOT silent. What it
 * costs is immediacy — an outage alert degrades from "seconds" to "tomorrow
 * morning" — and a degradation nobody can see is one nobody fixes.
 */
export const dispatchNow = internalAction({
  args: {},
  handler: async () => {
    const base = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
    const secret = process.env.EMAIL_LOG_SECRET;

    /*
     * Said out loud, because the failure it causes is silence — notifications
     * queue up and nothing anywhere explains why. These are CONVEX
     * environment variables, set with `npx convex env set`, and they are NOT
     * the same store as Vercel's. Each deployment has its own, so dev can be
     * stale while prod is correct.
     */
    if (!base || !secret) {
      console.warn(
        "[notify] SITE_URL or EMAIL_LOG_SECRET is not set in the Convex environment; notifications will only send on the daily cron drain.",
      );
      return;
    }

    try {
      const res = await fetch(`${base}/api/notify/dispatch`, {
        method: "POST",
        headers: { authorization: `Bearer ${secret}` },
        /*
         * Redirects are NOT followed, deliberately.
         *
         * If SITE_URL is the apex and the site canonicalises to www (or the
         * reverse), following the redirect strips the Authorization header —
         * fetch drops it on any CROSS-ORIGIN hop, and apex→www is
         * cross-origin. The dispatcher would then answer 401 with a correct
         * secret, which is a genuinely baffling thing to debug.
         *
         * Refusing to follow turns that into a 308 logged below, naming the
         * exact variable to change.
         */
        redirect: "manual",
        // Short. The dispatcher does the work; this only starts it, and
        // holding a Convex action open on a slow mailer helps nobody.
        signal: AbortSignal.timeout(20_000),
      });

      if (res.status >= 300 && res.status < 400) {
        console.warn(
          `[notify] SITE_URL (${base}) redirects — it must be the canonical origin, or the auth header is dropped on the hop. Notifications will only send on the daily cron drain until it is fixed.`,
        );
        return;
      }

      if (!res.ok) {
        console.warn(
          `[notify] the dispatcher answered ${res.status}. Notifications stay queued for the daily cron drain.`,
        );
      }
    } catch (err) {
      // Unreachable, DNS, or the timeout above. Still worth a line: the queue
      // is safe, but the immediacy this whole path exists for is gone.
      console.warn(
        `[notify] could not reach the dispatcher at ${base}: ${
          err instanceof Error ? err.message : "unknown error"
        }`,
      );
    }
  },
});

/* ---------------------------------------------------------------- drain --- */

/**
 * Everything due and unsent.
 *
 * Secret-gated and public rather than internal, because it is called with
 * `fetchQuery` from a Next route handler which has no Convex identity —
 * exactly the pattern api.automation.pendingNotificationsPublic already uses.
 */
export const pendingPublic = query({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    if (
      !process.env.EMAIL_LOG_SECRET ||
      args.secret !== process.env.EMAIL_LOG_SECRET
    ) {
      throw new Error("Not authorised.");
    }

    const now = Date.now();
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_due", (q) => q.eq("sentAt", undefined).lte("dueAt", now))
      .take(50);

    /*
     * Five attempts, then it stops.
     *
     * A row that has failed five times is failing for a reason retrying will
     * not fix — a dead address, a template that throws — and leaving it in
     * the queue means every subsequent drain spends its budget on it first.
     * It stays in the table unsent, which is the record that it did not go.
     */
    return rows
      .filter((r) => r.attempts < 5)
      .map((r) => ({
        id: r._id,
        kind: r.kind,
        payload: r.payload as unknown,
        attempts: r.attempts,
      }));
  },
});

export const markSentPublic = mutation({
  args: {
    secret: v.string(),
    id: v.id("notifications"),
    /** Absent on success. Present, and the row stays queued for a retry. */
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (
      !process.env.EMAIL_LOG_SECRET ||
      args.secret !== process.env.EMAIL_LOG_SECRET
    ) {
      throw new Error("Not authorised.");
    }

    const row = await ctx.db.get(args.id);
    if (!row) return;

    if (args.error) {
      await ctx.db.patch(args.id, {
        attempts: row.attempts + 1,
        lastError: args.error.slice(0, 500),
      });
      return;
    }

    await ctx.db.patch(args.id, {
      sentAt: Date.now(),
      attempts: row.attempts + 1,
    });
  },
});

/* ------------------------------------------------------------ push subs --- */

/**
 * Push endpoints, read by the dispatcher to fan an alert out to my devices.
 *
 * Secret-gated for the same reason as the drain above: the caller is a route
 * handler, not a signed-in browser. The values are useless without the VAPID
 * private key, but they are still a list of my devices and do not belong on
 * an open endpoint.
 */
export const pushSubscriptionsPublic = query({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    if (
      !process.env.EMAIL_LOG_SECRET ||
      args.secret !== process.env.EMAIL_LOG_SECRET
    ) {
      throw new Error("Not authorised.");
    }
    return await ctx.db.query("pushSubscriptions").collect();
  },
});

/** Called by the browser after a successful `pushManager.subscribe`. */
export const subscribePush = mutation({
  args: { endpoint: v.string(), p256dh: v.string(), auth: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Endpoints are re-issued by the browser and can repeat. Upserting keeps
    // one row per device rather than one per permission prompt.
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { p256dh: args.p256dh, auth: args.auth });
      return existing._id;
    }

    return await ctx.db.insert("pushSubscriptions", {
      endpoint: args.endpoint,
      p256dh: args.p256dh,
      auth: args.auth,
      createdAt: Date.now(),
    });
  },
});

export const unsubscribePush = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});

/**
 * Dropped by the dispatcher when the push service returns 404 or 410.
 *
 * That pair means the endpoint is permanently gone — the browser was
 * uninstalled, or the permission revoked. Keeping it costs a failed request
 * on every future alert.
 */
export const pruneSubscriptionPublic = mutation({
  args: { secret: v.string(), endpoint: v.string() },
  handler: async (ctx, args) => {
    if (
      !process.env.EMAIL_LOG_SECRET ||
      args.secret !== process.env.EMAIL_LOG_SECRET
    ) {
      throw new Error("Not authorised.");
    }
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});

/** Whether this browser is already subscribed, for the admin toggle. */
export const isPushSubscribed = query({
  args: { endpoint: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .unique();
    return Boolean(existing);
  },
});

/**
 * Housekeeping. Sent rows past 30 days are deleted; the email log is the
 * durable record of what went out, and this table is a queue, not an archive.
 */
export const sweepSent = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const old = await ctx.db
      .query("notifications")
      .withIndex("by_due")
      .filter((q) =>
        q.and(
          q.neq(q.field("sentAt"), undefined),
          q.lt(q.field("dueAt"), cutoff),
        ),
      )
      .take(500);

    for (const row of old) await ctx.db.delete(row._id);
    return old.length;
  },
});
