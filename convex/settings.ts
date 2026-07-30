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

/**
 * The floating currency rates, for the public pricing page.
 *
 * Narrow on purpose. The pricing page briefly read `getAll`, which is
 * admin-gated — so every visitor hit "Not authenticated" and the error
 * boundary took the whole component down. Widening getAll would have been the
 * wrong fix: it returns every setting, and this page needs exactly two.
 *
 * Rates are not secret. They are printed on the page.
 */
export const publicRates = query({
  args: {},
  handler: async (ctx) => {
    const read = async (key: string) => {
      const row = await ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();
      const n = Number(row?.value);
      // A blank or malformed setting falls back in the client rather than
      // pricing at zero here.
      return Number.isFinite(n) && n > 0 ? n : null;
    };

    return { GBP: await read("rate.GBP"), EUR: await read("rate.EUR") };
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
