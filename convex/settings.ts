import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";

/**
 * Key/value settings.
 *
 * Deliberately NOT for secrets. API keys stay in environment variables — a
 * settings table is readable by any query that forgets its auth check, and one
 * missing requireAdmin should not be able to leak a Stripe key.
 *
 * This holds things the marketing site needs to read and I need to change
 * without a deploy: availability, currency rates, response-time copy.
 */

export const get = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    return row?.value ?? null;
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("settings").collect();
  },
});

export const set = mutation({
  args: { key: v.string(), value: v.any() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    if (existing) await ctx.db.patch(existing._id, { value: args.value });
    else await ctx.db.insert("settings", { key: args.key, value: args.value });
  },
});
