import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";

/**
 * Normalises a client-supplied website into something safe to put in an href.
 *
 * Returns undefined for anything that is not plain http(s). A stored
 * "javascript:..." string would execute when the link is clicked, and this
 * value is rendered as a real anchor on a public page — so the check happens
 * on write, where it cannot be skipped by a different caller later.
 */
function cleanWebsite(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;

  // Bare domains are what people actually type; assume https rather than
  // rejecting "acme.com" as invalid.
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    if (!url.hostname.includes(".")) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export const listFeatured = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("testimonials")
      .withIndex("by_featured", (q) => q.eq("featured", true))
      .take((args.limit ?? 12) * 2);

    // Approval is checked here, not only in the admin. Without it a
    // client-submitted testimonial would appear on the homepage the moment it
    // arrived — before anyone had read it. `undefined` means a row I wrote
    // before submissions existed, so it counts as approved.
    return rows
      .filter((t) => t.approved !== false)
      .slice(0, args.limit ?? 12);
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("testimonials").collect();
  },
});

export const create = mutation({
  args: {
    author: v.string(),
    role: v.optional(v.string()),
    company: v.optional(v.string()),
    quote: v.string(),
    website: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
    featured: v.boolean(),
    order: v.number(),
    approved: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    // Anything created here is written by the admin, so it is approved unless
    // explicitly stated otherwise. Client submissions go through a separate
    // public mutation that always sets approved: false.
    return await ctx.db.insert("testimonials", {
      ...args,
      website: cleanWebsite(args.website),
      approved: args.approved ?? true,
    });
  },
});

/**
 * Client-submitted testimonial, via the tokenised link sent after a project.
 *
 * Public, and deliberately lands unapproved. Auto-publishing whatever arrives
 * at a public endpoint is how a spam quote ends up on the homepage.
 */
export const submitByToken = mutation({
  args: {
    token: v.string(),
    author: v.string(),
    role: v.optional(v.string()),
    company: v.optional(v.string()),
    quote: v.string(),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("testimonials")
      .withIndex("by_token", (q) => q.eq("requestToken", args.token))
      .unique();

    if (!invite) return { ok: false as const };

    await ctx.db.patch(invite._id, {
      author: args.author.slice(0, 120),
      role: args.role?.slice(0, 120),
      company: args.company?.slice(0, 120),
      quote: args.quote.slice(0, 1200),
      website: cleanWebsite(args.website),
      approved: false,
      // Consumed, so the link cannot be reused to overwrite the submission.
      requestToken: undefined,
    });

    return { ok: true as const };
  },
});

export const remove = mutation({
  args: { id: v.id("testimonials") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

export const update = mutation({
  args: {
    id: v.id("testimonials"),
    author: v.optional(v.string()),
    role: v.optional(v.string()),
    company: v.optional(v.string()),
    quote: v.optional(v.string()),
    website: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    featured: v.optional(v.boolean()),
    order: v.optional(v.number()),
    approved: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...patch }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, {
      ...patch,
      // Only touched when supplied — spreading an absent key would be a no-op,
      // but sanitising unconditionally would blank a saved URL on any edit
      // that did not resend it.
      ...(patch.website !== undefined
        ? { website: cleanWebsite(patch.website) }
        : {}),
    });
  },
});

/** Persists a drag reorder. Order is the array index, so gaps cannot appear. */
export const reorder = mutation({
  args: { ids: v.array(v.id("testimonials")) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    for (let i = 0; i < args.ids.length; i++) {
      await ctx.db.patch(args.ids[i], { order: i });
    }
  },
});
