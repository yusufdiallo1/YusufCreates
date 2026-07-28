import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";

export const listPublished = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) =>
    await ctx.db
      .query("posts")
      .withIndex("by_published", (q) => q.eq("published", true))
      .order("desc")
      .take(args.limit ?? 20),
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const post = await ctx.db
      .query("posts")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    return post && post.published ? post : null;
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    body: v.string(),
    excerpt: v.optional(v.string()),
    coverUrl: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const words = args.body.trim().split(/\s+/).length;
    return await ctx.db.insert("posts", {
      ...args,
      published: false,
      readingTime: Math.max(1, Math.round(words / 200)),
    });
  },
});

export const setPublished = mutation({
  args: { id: v.id("posts"), published: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, {
      published: args.published,
      publishedAt: args.published ? Date.now() : undefined,
    });
  },
});
