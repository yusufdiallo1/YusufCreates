import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";

/** Public: anonymous analytics ping. No PII should be sent in `meta`. */
/**
 * Anonymous analytics write.
 *
 * Public by necessity — a pageview from a logged-out visitor cannot be
 * authenticated. So the shape is constrained instead: the type is a fixed
 * union rather than a free string, and meta is a named object rather than
 * v.any(), which would make this a free-form write primitive pointed at the
 * database.
 */
export const track = mutation({
  args: {
    type: v.union(
      v.literal("pageview"),
      v.literal("cta_click"),
      v.literal("form_start"),
      v.literal("form_submit"),
      v.literal("chat_open"),
      v.literal("chat_message"),
    ),
    path: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    meta: v.optional(
      v.object({
        cta: v.optional(v.string()),
        referrer: v.optional(v.string()),
        step: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    // Bound the stored strings regardless of what the caller sent.
    const clip = (s: string | undefined, n: number) => s?.slice(0, n);
    return await ctx.db.insert("events", {
      type: args.type,
      path: clip(args.path, 256),
      sessionId: clip(args.sessionId, 64),
      meta: args.meta
        ? {
            cta: clip(args.meta.cta, 64),
            referrer: clip(args.meta.referrer, 256),
            step: clip(args.meta.step, 32),
          }
        : undefined,
      ts: Date.now(),
    });
  },
});

export const listByType = query({
  args: { type: v.string(), since: v.optional(v.number()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("events")
      .withIndex("by_type_ts", (q) =>
        args.since === undefined
          ? q.eq("type", args.type)
          : q.eq("type", args.type).gte("ts", args.since),
      )
      .order("desc")
      .take(args.limit ?? 200);
  },
});
