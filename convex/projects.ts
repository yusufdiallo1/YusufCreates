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

/**
 * Featured, published projects for the homepage grid.
 *
 * The default used to be 3, which meant ticking "featured" on a fourth project
 * in the admin saved fine and then silently did nothing on the live site —
 * there was no cap in the mutation and no warning in the UI, just a read-side
 * `.take(3)` quietly discarding the rest. Marking something featured should
 * feature it.
 *
 * 12 is a guard against an accidental "feature everything", not a design
 * limit; callers that want fewer pass an explicit limit.
 */
export const listFeatured = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_featured", (q) =>
        q.eq("featured", true).eq("status", "published"),
      )
      .take(args.limit ?? 12);
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
    // Accepted at create as well as update, so a new case study can be
    // written in one pass rather than saved and then immediately edited.
    problem: v.optional(v.string()),
    process: v.optional(v.string()),
    result: v.optional(v.string()),
    techStack: v.optional(v.array(v.string())),
    liveUrl: v.optional(v.string()),
    gallery: v.optional(v.array(v.string())),
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

/** Persists a drag reorder. Order is the array index, so gaps cannot appear. */
export const reorder = mutation({
  args: { ids: v.array(v.id("projects")) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    for (let i = 0; i < args.ids.length; i++) {
      await ctx.db.patch(args.ids[i], { order: i });
    }
  },
});

/**
 * How many projects are published.
 *
 * Public and deliberately narrow — it returns a number, not the rows. The
 * About section stated a hardcoded 12, which was wrong the moment a project
 * was added or unpublished, and a portfolio that miscounts its own work is
 * the least convincing thing it can do.
 */
export const publishedCount = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("projects")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();
    return rows.length;
  },
});

/**
 * Hostnames of the sites I have built, for recognising a referred visitor.
 *
 * Someone arriving from a client's own site has already seen the work — the
 * homepage does not need to prove itself to them, and the site says so. This
 * is the list that decision is made against.
 *
 * Derived from liveUrl rather than stored separately, so it cannot drift: a
 * project that goes live is recognised the moment its URL is filled in, and
 * one that is unpublished stops being recognised on the same read.
 *
 * Public, and safe to be: every one of these hostnames is already printed on
 * the case study page it comes from. Only the HOST is returned — a full URL
 * would be a longer string carrying nothing extra, since the match is on
 * hostname either way.
 *
 * Deduplicated because one client can have several projects on one domain,
 * and `www.` is stripped to match how src/lib/track.ts normalises a referrer.
 */
export const clientDomains = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("projects")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();

    const hosts = new Set<string>();
    for (const row of rows) {
      if (!row.liveUrl) continue;
      try {
        hosts.add(new URL(row.liveUrl).hostname.replace(/^www\./, ""));
      } catch {
        // A malformed liveUrl is an admin typo, not a reason to fail the
        // query — every other project still resolves.
      }
    }
    return Array.from(hosts);
  },
});
