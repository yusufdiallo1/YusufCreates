import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";

/**
 * Newsletter subscribers.
 *
 * Confirmed opt-in: a new row is unconfirmed until the link in the welcome
 * email is clicked. Re-subscribing an existing address updates the row rather
 * than creating a duplicate, and clears any previous unsubscribe.
 */

/** 128 bits, URL-safe. Used for both the confirm and unsubscribe links. */
function makeToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const subscribe = mutation({
  args: { email: v.string(), source: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscribers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existing) {
      // Reuse the token if there is one, so a link already sitting in an inbox
      // keeps working rather than being silently invalidated by a resubmit.
      const token = existing.token ?? makeToken();
      await ctx.db.patch(existing._id, {
        unsubscribedAt: undefined,
        token,
      });
      return {
        id: existing._id,
        token,
        alreadyConfirmed: existing.confirmed,
      };
    }

    const token = makeToken();
    const id = await ctx.db.insert("subscribers", {
      email: args.email,
      source: args.source ?? "footer",
      confirmed: false,
      createdAt: Date.now(),
      token,
    });
    return { id, token, alreadyConfirmed: false };
  },
});

/**
 * Completes the double opt-in. Public by necessity — the token in the link is
 * the only credential, which is why it carries 128 bits of entropy.
 */
export const confirm = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("subscribers")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!row) return { ok: false as const };

    // Idempotent: clicking twice, or a mail client prefetching the link, must
    // not read as a failure.
    if (!row.confirmed) {
      await ctx.db.patch(row._id, {
        confirmed: true,
        confirmedAt: Date.now(),
        unsubscribedAt: undefined,
      });
    }
    return { ok: true as const, email: row.email };
  },
});

/**
 * One-click unsubscribe. Keyed on the token rather than the address, so the
 * link cannot be edited to unsubscribe somebody else.
 */
export const unsubscribe = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("subscribers")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!row) return { ok: false as const };

    await ctx.db.patch(row._id, { unsubscribedAt: Date.now() });
    return { ok: true as const, email: row.email };
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("subscribers").order("desc").take(500);
  },
});

/** Confirmed and not unsubscribed — the only set a broadcast may go to. */
export const listSendable = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("subscribers").collect();
    return rows.filter((r) => r.confirmed && r.unsubscribedAt === undefined);
  },
});

/**
 * Append-only record of every send. Without it there is no way to answer
 * "did they actually get it" when someone says nothing arrived.
 *
 * Reachable only with a shared secret. This was previously open, which let
 * anyone forge rows in the one table that says whether a message actually went
 * out — a poisoned log is worse than no log.
 *
 * It stays a public mutation rather than an internalMutation because its
 * callers are Next route handlers using fetchMutation, which by design can
 * only reach public functions. The secret is what actually gates it.
 */
export const logEmail = mutation({
  args: {
    secret: v.string(),
    to: v.string(),
    template: v.string(),
    subject: v.string(),
    status: v.union(
      v.literal("sent"),
      v.literal("failed"),
      v.literal("skipped"),
    ),
    providerId: v.optional(v.string()),
    error: v.optional(v.string()),
    leadId: v.optional(v.id("leads")),
  },
  handler: async (ctx, { secret, ...row }) => {
    const expected = process.env.EMAIL_LOG_SECRET;

    // Fail closed. An unset secret must never mean "allow everyone".
    if (!expected || secret !== expected) {
      throw new Error("Not authorised.");
    }

    return await ctx.db.insert("emailLog", { ...row, sentAt: Date.now() });
  },
});

export const recentLog = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.query("emailLog").order("desc").take(args.limit ?? 100);
  },
});
