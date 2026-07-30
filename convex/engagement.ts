import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

/**
 * Likes and comments on blog posts.
 *
 * Both are public writes, so both are deliberately narrow: fixed fields,
 * length caps, and no way to set `approved` or a timestamp from the caller.
 *
 * Likes are keyed by a visitor id minted in the browser. That is not identity
 * and is not treated as such — someone determined can clear it and like again.
 * The alternative is requiring an account to like a blog post, which trades a
 * real feature for a theoretical one.
 */

const MAX_NAME = 120;
const MAX_EMAIL = 254;
const MAX_BODY = 4000;

/** Like count for a post, and whether this visitor is one of them. */
export const forPost = query({
  args: { postId: v.id("posts"), visitorId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const likes = await ctx.db
      .query("postLikes")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();

    const mine = args.visitorId
      ? likes.some((l) => l.visitorId === args.visitorId)
      : false;

    const comments = await ctx.db
      .query("postComments")
      .withIndex("by_post", (q) =>
        q.eq("postId", args.postId).eq("approved", true),
      )
      .collect();

    return {
      likes: likes.length,
      liked: mine,
      // Email is never returned to the public page — it exists so I can reply,
      // not so it can be scraped off a comment thread.
      comments: comments
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((c) => ({
          _id: c._id,
          name: c.name,
          body: c.body,
          createdAt: c.createdAt,
        })),
    };
  },
});

/** Toggles this visitor's like. */
export const toggleLike = mutation({
  args: { postId: v.id("posts"), visitorId: v.string() },
  handler: async (ctx, args) => {
    const visitorId = args.visitorId.trim().slice(0, 64);
    if (!visitorId) return { liked: false as const };

    const existing = await ctx.db
      .query("postLikes")
      .withIndex("by_post_visitor", (q) =>
        q.eq("postId", args.postId).eq("visitorId", visitorId),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { liked: false as const };
    }

    await ctx.db.insert("postLikes", {
      postId: args.postId,
      visitorId,
      createdAt: Date.now(),
    });
    return { liked: true as const };
  },
});

/** Submits a comment. Held for approval — never visible on submit. */
export const addComment = mutation({
  args: {
    postId: v.id("posts"),
    name: v.string(),
    email: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim().slice(0, MAX_NAME);
    const email = args.email.trim().toLowerCase().slice(0, MAX_EMAIL);
    const body = args.body.trim().slice(0, MAX_BODY);

    if (!name || !body) throw new Error("A name and a comment are required.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new Error("A valid email address is required.");
    }

    await ctx.db.insert("postComments", {
      postId: args.postId,
      name,
      email,
      body,
      // Never caller-controlled. An open mutation that accepts `approved`
      // is an open comment box with extra steps.
      approved: false,
      createdAt: Date.now(),
    });

    return { ok: true as const, held: true as const };
  },
});

/* ---------------------------------------------------------------- admin --- */

/** Every comment, newest first, pending before approved. */
export const listComments = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("postComments").order("desc").take(300);

    const posts = await ctx.db.query("posts").collect();
    const titleFor = new Map(posts.map((p) => [p._id, p.title]));

    return rows
      .sort((a, b) => {
        if (a.approved !== b.approved) return a.approved ? 1 : -1;
        return b.createdAt - a.createdAt;
      })
      .map((c) => ({ ...c, postTitle: titleFor.get(c.postId) ?? "Deleted post" }));
  },
});

export const approveComment = mutation({
  args: { id: v.id("postComments"), approved: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { approved: args.approved });
  },
});

export const removeComment = mutation({
  args: { id: v.id("postComments") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

/** Like and comment totals for the dashboard. */
export const stats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const likes = await ctx.db.query("postLikes").collect();
    const comments = await ctx.db.query("postComments").collect();
    return {
      likes: likes.length,
      comments: comments.length,
      pendingComments: comments.filter((c) => !c.approved).length,
    };
  },
});
