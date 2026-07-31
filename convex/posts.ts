import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";

/**
 * Public list.
 *
 * Filters on publishedAt as well as the flag, which is what makes scheduling
 * work: a post marked published with a future date stays hidden until that
 * moment arrives. Doing it here rather than with a cron means there is no job
 * to fail and no window where a scheduled post is late.
 */
export const listPublished = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const now = Date.now();
    const rows = await ctx.db
      .query("posts")
      .withIndex("by_published", (q) => q.eq("published", true))
      .order("desc")
      .take((args.limit ?? 20) * 2);

    return rows
      .filter((p) => (p.publishedAt ?? p._creationTime) <= now)
      .slice(0, args.limit ?? 20);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const post = await ctx.db
      .query("posts")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    // Same schedule check as listPublished — otherwise a direct link would
    // serve a post that has not gone live yet.
    if (!post || !post.published) return null;
    return (post.publishedAt ?? post._creationTime) <= Date.now() ? post : null;
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
    // Accepted at create so a post can be written and scheduled in one pass,
    // rather than saved as a draft and then immediately edited to publish it.
    published: v.optional(v.boolean()),
    publishedAt: v.optional(v.number()),
    kind: v.optional(
      v.union(v.literal("text"), v.literal("images"), v.literal("video")),
    ),
    images: v.optional(v.array(v.string())),
    imageRatio: v.optional(
      v.union(
        v.literal("4:5"),
        v.literal("1:1"),
        v.literal("16:9"),
        v.literal("auto"),
      ),
    ),
    videoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const existing = await ctx.db
      .query("posts")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) throw new Error("A post with that slug already exists.");

    const words = args.body.trim().split(/\s+/).length;
    return await ctx.db.insert("posts", {
      ...args,
      published: args.published ?? false,
      publishedAt: args.publishedAt ?? Date.now(),
      readingTime: Math.max(1, Math.round(words / 200)),
    });
  },
});

/*
 * No setPublished here.
 *
 * It toggled `published` and overwrote `publishedAt` with Date.now(), so
 * flipping a scheduled post on would have silently moved its date to the
 * present and published it immediately. Nothing called it — the drawer sends
 * both fields through `update` — so it was a trap waiting for the first
 * person to wire up a quick toggle in the list.
 */

/** Admin list — includes drafts, which listPublished deliberately hides. */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("posts").order("desc").take(200);
  },
});

export const getById = query({
  args: { id: v.id("posts") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.get(args.id);
  },
});

/** Roughly 200 words a minute, which is the usual reading speed for prose. */
function readingMinutes(body: string): number {
  return Math.max(1, Math.round(body.trim().split(/\s+/).length / 200));
}

export const update = mutation({
  args: {
    id: v.id("posts"),
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    body: v.optional(v.string()),
    excerpt: v.optional(v.string()),
    coverUrl: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    published: v.optional(v.boolean()),
    publishedAt: v.optional(v.number()),
    kind: v.optional(
      v.union(v.literal("text"), v.literal("images"), v.literal("video")),
    ),
    images: v.optional(v.array(v.string())),
    imageRatio: v.optional(
      v.union(
        v.literal("4:5"),
        v.literal("1:1"),
        v.literal("16:9"),
        v.literal("auto"),
      ),
    ),
    videoUrl: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...patch }) => {
    await requireAdmin(ctx);

    // Recomputed whenever the body changes, so the figure can never drift
    // from the text it describes.
    const readingTime =
      patch.body !== undefined ? readingMinutes(patch.body) : undefined;

    await ctx.db.patch(id, {
      ...patch,
      ...(readingTime !== undefined ? { readingTime } : {}),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("posts") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});
