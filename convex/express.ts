import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

/**
 * Express builds — up to two pages, delivered within two hours.
 *
 * Every timing rule lives here rather than in a component, because the clock
 * is the product and a countdown computed in the browser is a countdown the
 * browser can be wrong about.
 *
 * Two decisions that shape the whole file:
 *
 * 1. The clock starts when I ACCEPT, not when they pay. An order landing at
 *    3am must not already be late by breakfast, and accepting is the point
 *    where I can decline a brief that is not really two pages.
 * 2. Whether the balance is owed is decided ONCE, at delivery, and written
 *    down. Deriving it later from timestamps means the answer could change if
 *    the window constant ever moves — and this decides who keeps money.
 */

/** Two hours, in milliseconds. */
export const WINDOW_MS = 2 * 60 * 60 * 1000;

/** Total price in minor units. Half up front, half only if I am on time. */
export const EXPRESS_TOTAL = 6900;
export const EXPRESS_DEPOSIT = EXPRESS_TOTAL / 2;

const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

function makeToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/**
 * Starts an order. Created before payment so the Stripe session has something
 * to attach to, and so an abandoned checkout is visible rather than invisible.
 */
export const create = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    brief: v.string(),
    pages: v.number(),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim().slice(0, 120);
    const email = args.email.trim().toLowerCase().slice(0, 254);
    const brief = args.brief.trim().slice(0, 4000);

    if (!name || !brief) throw new Error("A name and a brief are required.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new Error("A valid email address is required.");
    }

    // Two pages is the entire scope. Accepting three here is how a $69 job
    // becomes a $700 one.
    const pages = Math.min(2, Math.max(1, Math.round(args.pages)));

    const token = makeToken();
    const id = await ctx.db.insert("expressBuilds", {
      name,
      email,
      brief,
      pages,
      status: "awaiting_payment",
      depositAmount: EXPRESS_DEPOSIT,
      balanceAmount: EXPRESS_TOTAL - EXPRESS_DEPOSIT,
      currency: (args.currency ?? "usd").toLowerCase(),
      token,
      createdAt: Date.now(),
    });

    return { id, token };
  },
});

/** Their own view. Keyed by token, so no account is needed. */
export const byToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("expressBuilds")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!row) return null;

    // The brief is theirs, but nothing internal goes out with it.
    return {
      _id: row._id,
      name: row.name,
      brief: row.brief,
      pages: row.pages,
      status: row.status,
      currency: row.currency,
      depositAmount: row.depositAmount,
      balanceAmount: row.balanceAmount,
      balanceWaived: row.balanceWaived ?? false,
      depositPaidAt: row.depositPaidAt ?? null,
      balancePaidAt: row.balancePaidAt ?? null,
      acceptedAt: row.acceptedAt ?? null,
      dueAt: row.dueAt ?? null,
      deliveredAt: row.deliveredAt ?? null,
      deliveredUrl: row.deliveredUrl ?? null,
    };
  },
});

/**
 * Marks the deposit paid. Called from the Stripe webhook with the shared
 * secret — the webhook has no session, and a client-callable "mark paid" is a
 * client-callable way to start a build for free.
 */
export const markDepositPaid = mutation({
  args: { secret: v.string(), token: v.string(), stripeSessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const expected = process.env.EMAIL_LOG_SECRET;
    if (!expected || args.secret !== expected) throw new Error("Not authorised.");

    const row = await ctx.db
      .query("expressBuilds")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!row || row.depositPaidAt) return;

    await ctx.db.patch(row._id, {
      depositPaidAt: Date.now(),
      stripeSessionId: args.stripeSessionId,
      // Paid, but the clock has not started. That is my move.
      status: "queued",
    });
  },
});

/**
 * Starts the clock.
 *
 * dueAt is stored rather than computed on read: the countdown they watch and
 * the deadline I am judged against have to be the same instant, and a derived
 * value would shift if WINDOW_MS ever changed mid-build.
 */
export const accept = mutation({
  args: { id: v.id("expressBuilds") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("No such build.");
    if (!row.depositPaidAt) throw new Error("The deposit has not been paid.");
    if (row.acceptedAt) return;

    const now = Date.now();
    await ctx.db.patch(args.id, {
      acceptedAt: now,
      dueAt: now + WINDOW_MS,
      status: "building",
    });
  },
});

/**
 * Delivers it, and settles who owes what.
 *
 * The balance decision is made here and written down. Late means they keep
 * it — that is the promise, and it is not re-evaluated later.
 */
export const deliver = mutation({
  args: { id: v.id("expressBuilds"), url: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("No such build.");
    if (!row.dueAt) throw new Error("This build was never accepted.");

    const now = Date.now();
    const late = now > row.dueAt;

    await ctx.db.patch(args.id, {
      deliveredAt: now,
      deliveredUrl: args.url.trim().slice(0, 500),
      status: "delivered",
      balanceWaived: late,
    });

    return { late, minutesLate: late ? Math.round((now - row.dueAt) / 60_000) : 0 };
  },
});

export const markBalancePaid = mutation({
  args: { secret: v.string(), token: v.string() },
  handler: async (ctx, args) => {
    const expected = process.env.EMAIL_LOG_SECRET;
    if (!expected || args.secret !== expected) throw new Error("Not authorised.");

    const row = await ctx.db
      .query("expressBuilds")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!row || row.balancePaidAt) return;

    await ctx.db.patch(row._id, { balancePaidAt: Date.now() });
  },
});

/* --------------------------------------------------------------- admin --- */

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("expressBuilds").order("desc").take(100);

    // Waiting on me first: queued needs accepting, building is running down.
    const rank = (s: string) =>
      s === "queued" ? 0 : s === "building" ? 1 : s === "awaiting_payment" ? 2 : 3;

    return rows.sort(
      (a, b) => rank(a.status) - rank(b.status) || b.createdAt - a.createdAt,
    );
  },
});

export const cancel = mutation({
  args: { id: v.id("expressBuilds") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { status: "cancelled" });
  },
});

export const remove = mutation({
  args: { id: v.id("expressBuilds") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});
