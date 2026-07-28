import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";

/** Public: clients leave feedback against a project. */
export const submit = mutation({
  args: {
    projectId: v.id("projects"),
    rating: v.number(),
    comment: v.optional(v.string()),
    from: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5.");
    }
    return await ctx.db.insert("feedback", { ...args, resolved: false });
  },
});

export const listByProject = query({
  args: { projectId: v.id("projects"), resolved: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("feedback")
      .withIndex("by_project", (q) =>
        args.resolved === undefined
          ? q.eq("projectId", args.projectId)
          : q.eq("projectId", args.projectId).eq("resolved", args.resolved),
      )
      .collect();
  },
});

export const resolve = mutation({
  args: { id: v.id("feedback"), resolved: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { resolved: args.resolved });
  },
});
