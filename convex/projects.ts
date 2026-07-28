import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";
import { publishStatus } from "./schema";

/** Published projects only — safe for the public site. */
export const listPublished = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .take(args.limit ?? 50);
  },
});

/** Featured, published projects for the homepage grid. */
export const listFeatured = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_featured", (q) =>
        q.eq("featured", true).eq("status", "published"),
      )
      .take(args.limit ?? 3);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const project = await ctx.db
      .query("projects")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    // Unpublished projects are invisible to the public query.
    if (!project || project.status !== "published") return null;
    return project;
  },
});

/** Admin listing: includes drafts and archived. */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("projects").collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    client: v.string(),
    year: v.number(),
    category: v.string(),
    summary: v.string(),
    coverUrl: v.optional(v.string()),
    status: publishStatus,
    order: v.number(),
    featured: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const existing = await ctx.db
      .query("projects")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) throw new Error("A project with that slug already exists.");

    return await ctx.db.insert("projects", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("projects"),
    patch: v.object({
      title: v.optional(v.string()),
      client: v.optional(v.string()),
      year: v.optional(v.number()),
      category: v.optional(v.string()),
      coverUrl: v.optional(v.string()),
      gallery: v.optional(v.array(v.string())),
      summary: v.optional(v.string()),
      problem: v.optional(v.string()),
      process: v.optional(v.string()),
      result: v.optional(v.string()),
      techStack: v.optional(v.array(v.string())),
      liveUrl: v.optional(v.string()),
      status: v.optional(publishStatus),
      order: v.optional(v.number()),
      featured: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, args.patch);
  },
});

export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});
