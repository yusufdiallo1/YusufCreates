import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";

/** Public: knowledge base entries backing the AI assistant. */
export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) =>
    await ctx.db.query("kb").take(args.limit ?? 200),
});

/** Convex cannot index into an array, so tag matching filters after the scan. */
export const listByTag = query({
  args: { tag: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("kb").collect();
    return all
      .filter((entry) => entry.tags.includes(args.tag))
      .sort((a, b) => b.priority - a.priority);
  },
});

export const create = mutation({
  args: {
    question: v.string(),
    answer: v.string(),
    tags: v.array(v.string()),
    priority: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("kb", args);
  },
});

export const remove = mutation({
  args: { id: v.id("kb") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

export const update = mutation({
  args: {
    id: v.id("kb"),
    question: v.optional(v.string()),
    answer: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    priority: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...patch }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, patch);
  },
});
