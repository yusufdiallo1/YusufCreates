import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";
import { leadStatus, slideSignals } from "./schema";

/**
 * Public submission. Deliberately does NOT accept `score`, `status` or
 * `turnstileVerified` from the caller — those are decided server-side.
 */
export const submit = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    company: v.optional(v.string()),
    role: v.optional(v.string()),
    projectType: v.optional(v.string()),
    tier: v.optional(v.string()),
    budget: v.optional(v.string()),
    timeline: v.optional(v.string()),
    pageCount: v.optional(v.number()),
    message: v.optional(v.string()),
    source: v.optional(v.string()),
    currency: v.optional(v.string()),
    vatNumber: v.optional(v.string()),
    crNumber: v.optional(v.string()),
    entityType: v.optional(v.string()),
    turnstileToken: v.optional(v.string()),
    slideSignals: v.optional(slideSignals),
  },
  handler: async (ctx, args) => {
    const { turnstileToken, ...lead } = args;

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lead.email)) {
      throw new Error("A valid email address is required.");
    }

    // Turnstile is verified in the route handler before this runs; the token's
    // presence is recorded, never treated as proof on its own.
    const turnstileVerified = Boolean(turnstileToken);

    return await ctx.db.insert("leads", {
      ...lead,
      status: "new" as const,
      turnstileVerified,
      score: scoreLead(args),
    });
  },
});

/** Cheap heuristic score. Behavioural signals weigh against automation. */
function scoreLead(args: {
  budget?: string;
  company?: string;
  message?: string;
  slideSignals?: {
    durationMs: number;
    pointerSamples: number;
    usedKeyboard: boolean;
  };
}): number {
  let score = 0;
  if (args.company) score += 15;
  if (args.budget) score += 25;
  if (args.message && args.message.length > 80) score += 20;

  const s = args.slideSignals;
  if (s) {
    // A real drag produces many pointer samples over a human interval.
    if (s.pointerSamples > 8) score += 20;
    if (s.durationMs > 300 && s.durationMs < 15000) score += 20;
    if (s.usedKeyboard) score += 20; // keyboard use is a strong human signal
  }
  return Math.min(score, 100);
}

export const list = query({
  args: {
    status: v.optional(leadStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    if (args.status !== undefined) {
      const status = args.status;
      return await ctx.db
        .query("leads")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc")
        .take(args.limit ?? 50);
    }

    return await ctx.db
      .query("leads")
      .order("desc")
      .take(args.limit ?? 50);
  },
});

export const get = query({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.get(args.id);
  },
});

export const setStatus = mutation({
  args: { id: v.id("leads"), status: leadStatus },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { status: args.status });
  },
});
