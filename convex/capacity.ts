import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";
import type { QueryCtx } from "./_generated/server";

/**
 * Capacity and the waitlist.
 *
 * Two builds and two care plans at a time. That ceiling is DERIVED on every
 * read from live projects, live subscriptions and outstanding offers — never
 * stored as a flag. A stored "available" toggle is wrong the moment a project
 * finishes at 11pm on a Friday, and the failure is invisible: the site keeps
 * taking work you cannot start.
 */

export const BUILD_SLOTS = 2;
export const CARE_SLOTS = 2;

/**
 * How many months ahead a visitor can book.
 *
 * Four, not six. A start date half a year out is not a booking, it is a maybe
 * — and a grid of distant months makes the near ones look less scarce than
 * they are.
 */
const HORIZON = 4;

/** An offer that goes unanswered stops holding a slot after this long. */
const OFFER_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** First millisecond of a month, UTC, so a month is one comparable number. */
function monthStart(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

function addMonths(ms: number, n: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1);
}

/**
 * Work occupying a slot right now.
 *
 * "complete" frees a slot; everything else holds one. on_hold deliberately
 * still counts — a paused project is still mine to finish, and treating it as
 * free is how you end up with three live builds.
 */
async function occupied(ctx: QueryCtx) {
  const projects = await ctx.db.query("clientProjects").collect();
  const builds = projects.filter((p) => p.status !== "complete").length;

  const invoices = await ctx.db.query("invoices").collect();
  const care = new Set(
    invoices
      .filter((i) => i.stripeSubscriptionId && i.status !== "void")
      .map((i) => i.stripeSubscriptionId),
  ).size;

  return { builds, care };
}

/** Waitlist entries still holding a slot: waiting, or offered but not lapsed. */
async function held(ctx: QueryCtx) {
  const rows = await ctx.db.query("waitlist").collect();
  const now = Date.now();

  return rows.filter(
    (r) =>
      r.status === "waiting" ||
      (r.status === "offered" &&
        r.offeredAt !== undefined &&
        now - r.offeredAt < OFFER_TTL_MS),
  );
}

/**
 * Months a visitor can pick, with what is left in each.
 *
 * Public — this is what the booking UI renders. It exposes counts, never who
 * holds a slot.
 */
export const slots = query({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const current = monthStart(now);

    const { builds, care } = await occupied(ctx);
    const waiting = await held(ctx);

    const months = [];
    for (let i = 0; i < HORIZON; i++) {
      const month = addMonths(current, i);

      const claimedBuild = waiting.filter(
        (r) => r.kind === "build" && r.slotMonth === month,
      ).length;
      const claimedCare = waiting.filter(
        (r) => r.kind === "care" && r.slotMonth === month,
      ).length;

      // Current work only blocks the current month. A build running now does
      // not stop someone booking three months out, which is the whole point
      // of a waitlist.
      const buildTaken = (i === 0 ? builds : 0) + claimedBuild;
      const careTaken = (i === 0 ? care : 0) + claimedCare;

      months.push({
        month,
        buildOpen: Math.max(0, BUILD_SLOTS - buildTaken),
        careOpen: Math.max(0, CARE_SLOTS - careTaken),
      });
    }

    return {
      months,
      buildSlots: BUILD_SLOTS,
      careSlots: CARE_SLOTS,
      // Drives the "available now" indicator across the site, so the badge
      // and the booking form can never disagree.
      openNow: {
        build: Math.max(
          0,
          BUILD_SLOTS -
            builds -
            waiting.filter((r) => r.kind === "build" && r.slotMonth === current)
              .length,
        ),
        care: Math.max(
          0,
          CARE_SLOTS -
            care -
            waiting.filter((r) => r.kind === "care" && r.slotMonth === current)
              .length,
        ),
      },
    };
  },
});

/**
 * Joins the waitlist for a specific month.
 *
 * The capacity check and the insert happen in ONE mutation, so two people
 * submitting simultaneously cannot both take the last slot — Convex mutations
 * are serialisable transactions, and that is the only reason this is safe
 * without a lock.
 */
export const join = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    company: v.optional(v.string()),
    projectType: v.optional(v.string()),
    note: v.optional(v.string()),
    kind: v.union(v.literal("build"), v.literal("care")),
    slotMonth: v.number(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const now = new Date();
    const current = monthStart(now);

    // Reject a month outside the horizon rather than accepting a bad date.
    if (args.slotMonth < current || args.slotMonth > addMonths(current, HORIZON - 1)) {
      return { ok: false as const, reason: "bad-month" as const };
    }

    // One live entry per person. Re-submitting updates rather than queueing
    // the same person twice.
    const existing = (
      await ctx.db
        .query("waitlist")
        .withIndex("by_email", (q) => q.eq("email", email))
        .collect()
    ).find((r) => r.status === "waiting" || r.status === "offered");

    const { builds, care } = await occupied(ctx);
    const waiting = await held(ctx);

    const isCurrent = args.slotMonth === current;
    const takenNow = args.kind === "build" ? builds : care;
    const limit = args.kind === "build" ? BUILD_SLOTS : CARE_SLOTS;

    const claimed = waiting.filter(
      (r) =>
        r.kind === args.kind &&
        r.slotMonth === args.slotMonth &&
        r._id !== existing?._id,
    ).length;

    if ((isCurrent ? takenNow : 0) + claimed >= limit) {
      return { ok: false as const, reason: "full" as const };
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name.trim(),
        company: args.company,
        projectType: args.projectType,
        note: args.note?.slice(0, 2000),
        kind: args.kind,
        slotMonth: args.slotMonth,
      });
      return { ok: true as const, id: existing._id, updated: true as const };
    }

    const id = await ctx.db.insert("waitlist", {
      name: args.name.trim(),
      email,
      company: args.company,
      projectType: args.projectType,
      note: args.note?.slice(0, 2000),
      kind: args.kind,
      slotMonth: args.slotMonth,
      status: "waiting",
      createdAt: Date.now(),
    });

    return { ok: true as const, id, updated: false as const };
  },
});

/* --------------------------------------------------------------- admin --- */

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("waitlist").order("desc").take(200);
    const { builds, care } = await occupied(ctx);

    return {
      rows,
      occupied: { builds, care },
      limits: { build: BUILD_SLOTS, care: CARE_SLOTS },
    };
  },
});

export const setStatus = mutation({
  args: {
    id: v.id("waitlist"),
    status: v.union(
      v.literal("waiting"),
      v.literal("offered"),
      v.literal("converted"),
      v.literal("declined"),
      v.literal("expired"),
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, {
      status: args.status,
      // Stamped on offer so the slot is released automatically if the offer
      // is never answered.
      ...(args.status === "offered" ? { offeredAt: Date.now() } : {}),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("waitlist") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});
