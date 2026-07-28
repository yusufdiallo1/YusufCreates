import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";

export const listByStatus = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.status === undefined) {
      return await ctx.db.query("invoices").order("desc").collect();
    }
    const status = args.status;
    return await ctx.db
      .query("invoices")
      .withIndex("by_status", (q) => q.eq("status", status))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    leadId: v.optional(v.id("leads")),
    projectId: v.optional(v.id("projects")),
    amount: v.number(),
    currency: v.string(),
    vatAmount: v.optional(v.number()),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("invoices", {
      ...args,
      status: "draft",
      issuedAt: Date.now(),
    });
  },
});

export const setStatus = mutation({
  args: { id: v.id("invoices"), status: v.string(), stripeId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, {
      status: args.status,
      ...(args.stripeId ? { stripeId: args.stripeId } : {}),
    });
  },
});
