import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";

/**
 * Anonymous analytics write.
 *
 * Public by necessity — a pageview from a logged-out visitor cannot be
 * authenticated. So the shape is constrained instead: the type is a fixed
 * union rather than a free string, and meta is a NAMED OBJECT rather than
 * v.any(), which would make this a free-form write primitive pointed at the
 * database. Every string is clipped on arrival regardless of what was sent.
 *
 * No PII by construction. The identifiers are random values minted in the
 * visitor's own storage, the referrer is reduced to a hostname before it
 * leaves the browser, and nothing here records an address, a name or an IP.
 */
export const track = mutation({
  args: {
    type: v.union(
      v.literal("pageview"),
      v.literal("scroll_depth"),
      v.literal("cta_click"),
      v.literal("outbound_click"),
      v.literal("form_start"),
      v.literal("form_step"),
      v.literal("form_error"),
      v.literal("form_submit"),
      v.literal("pricing_currency"),
      v.literal("pricing_slider"),
      v.literal("pricing_tier_click"),
      v.literal("promo_applied"),
      v.literal("faq_open"),
      v.literal("chat_open"),
      v.literal("chat_message"),
      v.literal("web_vital"),
      v.literal("entry_state"),
    ),
    path: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    visitorId: v.optional(v.string()),
    referrer: v.optional(v.string()),
    utmSource: v.optional(v.string()),
    utmMedium: v.optional(v.string()),
    utmCampaign: v.optional(v.string()),
    device: v.optional(v.string()),
    browser: v.optional(v.string()),
    os: v.optional(v.string()),
    viewportW: v.optional(v.number()),
    country: v.optional(v.string()),
    /*
     * Named keys, not a free-form bag. Each is one thing an event might be
     * about: which CTA, which step, which tier, the value of a web vital,
     * how far down the page. A new event type reuses these rather than
     * inventing a key, which keeps the write surface fixed.
     */
    meta: v.optional(
      v.object({
        cta: v.optional(v.string()),
        step: v.optional(v.string()),
        label: v.optional(v.string()),
        value: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const clip = (s: string | undefined, n: number) => s?.slice(0, n);
    const num = (n: number | undefined, max: number) =>
      typeof n === "number" && Number.isFinite(n)
        ? Math.min(Math.max(Math.round(n), 0), max)
        : undefined;

    return await ctx.db.insert("events", {
      type: args.type,
      path: clip(args.path, 256),
      sessionId: clip(args.sessionId, 64),
      visitorId: clip(args.visitorId, 64),
      referrer: clip(args.referrer, 128),
      utmSource: clip(args.utmSource, 64),
      utmMedium: clip(args.utmMedium, 64),
      utmCampaign: clip(args.utmCampaign, 64),
      device: clip(args.device, 16),
      browser: clip(args.browser, 24),
      os: clip(args.os, 24),
      viewportW: num(args.viewportW, 10_000),
      country: clip(args.country, 2),
      meta: args.meta
        ? {
            cta: clip(args.meta.cta, 64),
            step: clip(args.meta.step, 48),
            label: clip(args.meta.label, 120),
            value: num(args.meta.value, 1_000_000),
          }
        : undefined,
      ts: Date.now(),
    });
  },
});

/** Raw events by type. Admin only — for ad-hoc inspection. */
export const listByType = query({
  args: {
    type: v.string(),
    since: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("events")
      .withIndex("by_type_ts", (q) =>
        q.eq("type", args.type).gte("ts", args.since ?? 0),
      )
      .order("desc")
      .take(args.limit ?? 200);
  },
});
