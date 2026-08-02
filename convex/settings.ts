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

/**
 * Reads one setting by key. ADMIN ONLY.
 *
 * This used to have no guard at all, which made the whole table readable
 * from any browser: `key` is caller-supplied, so anything ever written
 * through `set` could be fetched by naming it. The header above says a
 * settings table is "readable by any query that forgets its auth check" —
 * this was that query.
 *
 * The public pages do not need it. They read `publicRates` and `publicCopy`,
 * which return a fixed handful of values that are printed on the page
 * anyway; that is the right shape for public access, and this is not.
 */
export const get = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
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

/**
 * Site-wide copy the public pages read at runtime.
 *
 * Public because every value here is printed on the page anyway. Narrow for
 * the same reason getAll is not used: it returns every setting, and these
 * pages need four of them.
 */
export const publicCopy = query({
  args: {},
  handler: async (ctx) => {
    const read = async (key: string) => {
      const row = await ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();
      const value = typeof row?.value === "string" ? row.value.trim() : "";
      return value || null;
    };

    return {
      replyWindow: await read("reply.window"),
      hoursWindow: await read("hours.window"),
      hoursTimezone: await read("hours.timezone"),
      noticeText: await read("notice.text"),
    };
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
