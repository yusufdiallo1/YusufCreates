import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";

/** Public: anonymous analytics ping. No PII should be sent in `meta`. */
export const track = mutation({
  args: {
    type: v.string(),
    path: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    meta: v.optional(v.any()),
  },
  handler: async (ctx, args) =>
    await ctx.db.insert("events", { ...args, ts: Date.now() }),
});

export const listByType = query({
  args: { type: v.string(), since: v.optional(v.number()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("events")
      .withIndex("by_type_ts", (q) =>
        args.since === undefined
          ? q.eq("type", args.type)
          : q.eq("type", args.type).gte("ts", args.since),
      )
      .order("desc")
      .take(args.limit ?? 200);
  },
});
