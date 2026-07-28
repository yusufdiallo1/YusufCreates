import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";
import type { Doc } from "./_generated/dataModel";

/**
 * Promotions.
 *
 * Two rules govern this file:
 *
 * 1. Status is derived on read, never stored. A stored status is stale the
 *    moment a window closes, and a promo that expires "whenever a job next
 *    runs" honours a discount it should not.
 * 2. Validation is server-side only. There is deliberately no query that
 *    lists codes — shipping the promo table to the browser hands every code
 *    to anyone who opens devtools.
 */

export type PromoStatus =
  | "scheduled"
  | "active"
  | "paused"
  | "expired"
  | "exhausted";

function statusOf(promo: Doc<"promos">, now: number): PromoStatus {
  if (promo.paused) return "paused";
  if (promo.startsAt > now) return "scheduled";
  if (promo.endsAt !== undefined && promo.endsAt <= now) return "expired";
  if (
    promo.maxRedemptions !== undefined &&
    promo.redemptionCount >= promo.maxRedemptions
  ) {
    return "exhausted";
  }
  return "active";
}

/** Enterprise is excluded from automatic promos unless named explicitly. */
function coversTier(promo: Doc<"promos">, tier: string | undefined): boolean {
  if (promo.appliesTo.length > 0) return tier ? promo.appliesTo.includes(tier) : false;
  // Discounting a five-figure build with a site-wide banner cheapens it, and
  // enterprise pricing is negotiated in the proposal anyway.
  return tier !== "enterprise";
}

function applyDiscount(promo: Doc<"promos">, price: number): number {
  const next =
    promo.discountType === "percentage"
      ? price * (1 - promo.discountValue / 100)
      : promo.discountType === "fixed"
        ? price - promo.discountValue
        : promo.discountValue;

  // Clamped in the mutation as well as the UI. Never trust one layer with a
  // number that becomes an invoice.
  return Math.max(0, Math.round(next));
}

/**
 * The one automatic promo currently running, for the banner and card badges.
 *
 * Returns display fields only — never the code, never the whole row.
 */
export const activeAutomatic = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const rows = await ctx.db
      .query("promos")
      .withIndex("by_kind", (q) => q.eq("kind", "automatic"))
      .collect();

    const live = rows.find((p) => statusOf(p, now) === "active");
    if (!live) return null;

    return {
      id: live._id,
      name: live.name,
      bannerText: live.bannerText ?? null,
      showCountdown: live.showCountdown,
      endsAt: live.endsAt ?? null,
      discountType: live.discountType,
      discountValue: live.discountValue,
      appliesTo: live.appliesTo,
    };
  },
});

/**
 * Validates a code. The only public way to touch a code promo.
 *
 * Distinguishes invalid from expired from already-used, because a generic
 * failure makes people retype the same code repeatedly. That does leak whether
 * a code exists, which is an acceptable trade for a marketing code — mitigated
 * by the rate limit on the route that calls this.
 */
export const validateCode = query({
  args: {
    code: v.string(),
    tier: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const code = args.code.trim().toUpperCase();
    if (!code) return { valid: false as const, reason: "invalid" as const };

    const promo = await ctx.db
      .query("promos")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();

    if (!promo) return { valid: false as const, reason: "invalid" as const };

    const status = statusOf(promo, Date.now());
    if (status === "expired") {
      return { valid: false as const, reason: "expired" as const };
    }
    if (status === "exhausted") {
      return { valid: false as const, reason: "exhausted" as const };
    }
    if (status !== "active") {
      return { valid: false as const, reason: "invalid" as const };
    }

    if (!coversTier(promo, args.tier)) {
      return { valid: false as const, reason: "wrong-tier" as const };
    }

    if (args.email) {
      const already = await ctx.db
        .query("promoRedemptions")
        .withIndex("by_email", (q) => q.eq("email", args.email!.toLowerCase()))
        .collect();
      if (already.some((r) => r.promoId === promo._id)) {
        return { valid: false as const, reason: "already-used" as const };
      }
    }

    return {
      valid: true as const,
      promoId: promo._id,
      name: promo.name,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
    };
  },
});

/**
 * Records a redemption when an invoice is issued.
 *
 * The count is incremented in the SAME mutation that writes the row, so two
 * concurrent submissions cannot both pass a maxRedemptions check and oversell
 * a limited promo — Convex mutations are serialisable transactions.
 */
export const redeem = mutation({
  args: {
    promoId: v.id("promos"),
    email: v.string(),
    tier: v.optional(v.string()),
    originalPrice: v.number(),
    discountedPrice: v.number(),
    leadId: v.optional(v.id("leads")),
    invoiceId: v.optional(v.id("invoices")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const promo = await ctx.db.get(args.promoId);
    if (!promo) throw new Error("No such promo.");

    if (
      promo.maxRedemptions !== undefined &&
      promo.redemptionCount >= promo.maxRedemptions
    ) {
      throw new Error("That promotion is fully redeemed.");
    }

    await ctx.db.insert("promoRedemptions", {
      promoId: args.promoId,
      leadId: args.leadId,
      invoiceId: args.invoiceId,
      email: args.email.toLowerCase(),
      tier: args.tier,
      originalPrice: args.originalPrice,
      discountedPrice: Math.max(0, args.discountedPrice),
      redeemedAt: Date.now(),
    });

    await ctx.db.patch(args.promoId, {
      redemptionCount: promo.redemptionCount + 1,
    });
  },
});

/* --------------------------------------------------------------- admin --- */

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const rows = await ctx.db.query("promos").order("desc").collect();
    return rows.map((p) => ({ ...p, status: statusOf(p, now) }));
  },
});

export const redemptions = query({
  args: { promoId: v.id("promos") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("promoRedemptions")
      .withIndex("by_promo", (q) => q.eq("promoId", args.promoId))
      .order("desc")
      .take(200);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    kind: v.union(v.literal("automatic"), v.literal("code")),
    code: v.optional(v.string()),
    discountType: v.union(
      v.literal("percentage"),
      v.literal("fixed"),
      v.literal("override"),
    ),
    discountValue: v.number(),
    appliesTo: v.array(v.string()),
    startsAt: v.number(),
    endsAt: v.optional(v.number()),
    maxRedemptions: v.optional(v.number()),
    bannerText: v.optional(v.string()),
    showCountdown: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const code = args.code?.trim().toUpperCase();
    if (args.kind === "code") {
      if (!code) throw new Error("A code promotion needs a code.");
      const clash = await ctx.db
        .query("promos")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique();
      if (clash) throw new Error("That code is already in use.");
    }

    return await ctx.db.insert("promos", {
      ...args,
      code: args.kind === "code" ? code : undefined,
      redemptionCount: 0,
      // Created paused. Going live is a separate, deliberate act — a
      // site-wide discount should never start because a form was submitted.
      paused: true,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("promos"),
    name: v.optional(v.string()),
    discountValue: v.optional(v.number()),
    appliesTo: v.optional(v.array(v.string())),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    maxRedemptions: v.optional(v.number()),
    bannerText: v.optional(v.string()),
    showCountdown: v.optional(v.boolean()),
    paused: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...patch }) => {
    await requireAdmin(ctx);

    // Only one automatic promo runs at a time. Unpausing one pauses the rest
    // in the same transaction, so there is no moment where two are live.
    if (patch.paused === false) {
      const promo = await ctx.db.get(id);
      if (promo?.kind === "automatic") {
        const others = await ctx.db
          .query("promos")
          .withIndex("by_kind", (q) => q.eq("kind", "automatic"))
          .collect();
        for (const other of others) {
          if (other._id !== id && !other.paused) {
            await ctx.db.patch(other._id, { paused: true });
          }
        }
      }
    }

    await ctx.db.patch(id, patch);
  },
});

/**
 * Archive rather than delete once a promo has been redeemed — the redemption
 * history is a financial record and invoices reference it.
 */
export const archive = mutation({
  args: { id: v.id("promos") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const promo = await ctx.db.get(args.id);
    if (!promo) return;

    if (promo.redemptionCount > 0) {
      await ctx.db.patch(args.id, { paused: true, endsAt: Date.now() });
      return { archived: true as const };
    }

    await ctx.db.delete(args.id);
    return { archived: false as const };
  },
});

export { applyDiscount };
