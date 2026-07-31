import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

/**
 * Custom payment links.
 *
 * A record of what was asked for, not a source of truth about payment —
 * Stripe owns that. This exists because the link used to live only in the
 * HTTP response that created it: close the tab and there was no way to find
 * the URL again, and no trace that money had been requested.
 */

export const record = mutation({
  args: {
    stripeId: v.string(),
    url: v.string(),
    label: v.string(),
    amount: v.number(),
    currency: v.string(),
    forWhom: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Idempotent on the Stripe id, so a retried create cannot produce two
    // rows for one link.
    const existing = await ctx.db
      .query("paymentLinks")
      .withIndex("by_stripe", (q) => q.eq("stripeId", args.stripeId))
      .unique();
    if (existing) return existing._id;

    return await ctx.db.insert("paymentLinks", {
      ...args,
      label: args.label.trim().slice(0, 200),
      forWhom: args.forWhom?.trim().slice(0, 200),
      active: true,
      createdAt: Date.now(),
    });
  },
});

/** Newest first. Unpaid before paid, since those are the ones still open. */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("paymentLinks").order("desc").take(200);
    return rows.sort((a, b) => {
      const aPaid = a.paidAt !== undefined;
      const bPaid = b.paidAt !== undefined;
      if (aPaid !== bPaid) return aPaid ? 1 : -1;
      return b.createdAt - a.createdAt;
    });
  },
});

/**
 * Marks a link paid, from the Stripe webhook.
 *
 * Gated on a shared secret rather than admin auth — the webhook runs with no
 * session — and the same secret the audit route already uses. This must never
 * be reachable from a browser: a client-callable "mark paid" is a
 * client-callable way to fake a payment.
 */
export const markPaid = mutation({
  args: {
    secret: v.string(),
    stripeId: v.string(),
    paidAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const expected = process.env.EMAIL_LOG_SECRET;
    if (!expected || args.secret !== expected) {
      throw new Error("Not authorised.");
    }

    const row = await ctx.db
      .query("paymentLinks")
      .withIndex("by_stripe", (q) => q.eq("stripeId", args.stripeId))
      .unique();
    if (!row || row.paidAt !== undefined) return;

    await ctx.db.patch(row._id, {
      paidAt: Date.now(),
      paidAmount: args.paidAmount,
    });
  },
});

export const setActive = mutation({
  args: { id: v.id("paymentLinks"), active: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { active: args.active });
  },
});

export const remove = mutation({
  args: { id: v.id("paymentLinks") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    // Deletes the record, not the Stripe link. Deactivate in Stripe first if
    // the URL should stop working.
    await ctx.db.delete(args.id);
  },
});
