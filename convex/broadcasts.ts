import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";

export const listByStatus = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.status === undefined) {
      return await ctx.db.query("broadcasts").order("desc").collect();
    }
    const status = args.status;
    return await ctx.db
      .query("broadcasts")
      .withIndex("by_status", (q) => q.eq("status", status))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    subject: v.string(),
    audienceId: v.optional(v.string()),
    scheduledAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("broadcasts", { ...args, status: "draft" });
  },
});

export const updateStats = mutation({
  args: {
    id: v.id("broadcasts"),
    patch: v.object({
      status: v.optional(v.string()),
      resendId: v.optional(v.string()),
      sentAt: v.optional(v.number()),
      openRate: v.optional(v.number()),
      clickRate: v.optional(v.number()),
      recipientCount: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, args.patch);
  },
});
