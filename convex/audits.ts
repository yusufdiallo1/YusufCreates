import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";

/**
 * Free site audits.
 *
 * Queued rather than synchronous: PageSpeed takes 15-40 seconds on a cold URL,
 * which no serverless request should sit through. The page subscribes to the
 * row and fills in when the result lands.
 */

const DAY = 24 * 60 * 60 * 1000;

/** Public: starts an audit. Rate limited by email, per day. */
export const request = mutation({
  args: { url: v.string(), email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();

    // Three a day per address. Email is trivially faked, so this is the
    // secondary control — Turnstile on the route is the primary one, and a
    // global cap protects the API quota regardless.
    const since = Date.now() - DAY;
    const recent = await ctx.db
      .query("audits")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();

    if (recent.filter((a) => a.createdAt >= since).length >= 3) {
      return { ok: false as const, reason: "limit" as const };
    }

    const id = await ctx.db.insert("audits", {
      url: args.url.trim(),
      email,
      status: "queued",
      createdAt: Date.now(),
    });

    return { ok: true as const, id };
  },
});

/**
 * Public read by id, for the page that is waiting on its own report.
 *
 * Returns the report and NOT the whole row. It used to hand back everything
 * `ctx.db.get` produced, which included the `email` the audit was requested
 * with and the `leadId` it created — neither of which the page renders. A
 * document id is short and is handed to every caller, so treating it as a
 * secret that protects an address was the wrong assumption; the fix is to
 * stop sending the address rather than to hope the id stays private.
 */
export const get = query({
  args: { id: v.id("audits") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row) return null;

    return {
      _id: row._id,
      url: row.url,
      status: row.status,
      score: row.score,
      categories: row.categories,
      fixes: row.fixes,
      error: row.error,
      siteName: row.siteName,
      siteLogo: row.siteLogo,
      siteDescription: row.siteDescription,
      createdAt: row.createdAt,
    };
  },
});

/** Written by the route handler once PageSpeed replies. */
export const complete = mutation({
  args: {
    secret: v.string(),
    id: v.id("audits"),
    score: v.optional(v.number()),
    categories: v.optional(
      v.object({
        performance: v.optional(v.number()),
        accessibility: v.optional(v.number()),
        bestPractices: v.optional(v.number()),
        seo: v.optional(v.number()),
      }),
    ),
    fixes: v.optional(
      v.array(
        v.object({
          title: v.string(),
          detail: v.string(),
          impact: v.string(),
        }),
      ),
    ),
    issues: v.optional(
      v.array(
        v.object({
          title: v.string(),
          detail: v.optional(v.string()),
          category: v.string(),
          score: v.optional(v.number()),
          savingsMs: v.optional(v.number()),
        }),
      ),
    ),
    siteName: v.optional(v.string()),
    siteLogo: v.optional(v.string()),
    siteDescription: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { secret, id, ...fields }) => {
    const expected = process.env.EMAIL_LOG_SECRET;
    if (!expected || secret !== expected) throw new Error("Not authorised.");

    await ctx.db.patch(id, {
      ...fields,
      status: fields.error ? "failed" : "complete",
    });
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("audits").order("desc").take(100);
  },
});
