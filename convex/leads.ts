import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/** Record a marketing enquiry. Called from the public contact form. */
export const create = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    message: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("leads", { ...args, createdAt: Date.now() });
  },
});

/** List recent leads, newest first. Used by the admin dashboard. */
export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db.query("leads").order("desc").take(args.limit ?? 50);
  },
});
