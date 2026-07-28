import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";

/**
 * Newsletter subscribers.
 *
 * Confirmed opt-in: a new row is unconfirmed until the welcome email link is
 * clicked. Re-subscribing an existing address updates the row rather than
 * creating a duplicate, and clears any previous unsubscribe.
 */
export const subscribe = mutation({
  args: { email: v.string(), source: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscribers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { unsubscribedAt: undefined });
      return existing._id;
    }

    return await ctx.db.insert("subscribers", {
      email: args.email,
      source: args.source ?? "footer",
      confirmed: false,
      createdAt: Date.now(),
    });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("subscribers").order("desc").take(500);
  },
});
