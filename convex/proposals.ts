import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";
import { proposalStatus } from "./schema";

export const listByStatus = query({
  args: { status: v.optional(proposalStatus) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.status === undefined) {
      return await ctx.db.query("proposals").order("desc").collect();
    }
    const status = args.status;
    return await ctx.db
      .query("proposals")
      .withIndex("by_status", (q) => q.eq("status", status))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    leadId: v.id("leads"),
    tier: v.optional(v.string()),
    amount: v.number(),
    currency: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("proposals", { ...args, status: "draft" });
  },
});

export const setStatus = mutation({
  args: { id: v.id("proposals"), status: proposalStatus },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, {
      status: args.status,
      ...(args.status === "sent" ? { sentAt: Date.now() } : {}),
      ...(args.status === "signed" ? { signedAt: Date.now() } : {}),
    });
  },
});
