import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";

/**
 * The daily overview.
 *
 * One paragraph, written each morning by Claude from the same numbers the
 * dashboard already shows, and stored so opening the admin costs nothing.
 *
 * WHY IT IS STORED RATHER THAN GENERATED ON VIEW. A model call on every page
 * load would be slow, expensive, and — worse — non-deterministic: refreshing
 * the Overview would rewrite the summary in front of you, which makes it read
 * as noise rather than as a briefing. Written once, read all day.
 *
 * Kept in its own table rather than in `settings` so it can carry structured
 * fields (when it was written, what it was written from) without stuffing them
 * into a JSON blob that nothing can query.
 */

/**
 * The most recent digest, or null before the first one has been written.
 *
 * Admin-gated like everything else here — it summarises revenue, overdue
 * invoices and who is waiting on a reply.
 */
export const latest = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("digests").order("desc").first();
  },
});

/**
 * Written by the cron route, which has no admin session.
 *
 * Gated by the shared secret rather than by requireAdmin, matching the pattern
 * in convex/automation.ts. The secret is checked here rather than trusted from
 * the caller, because a mutation that writes to an admin-only surface is worth
 * exactly as much as its weakest caller.
 */
export const save = mutation({
  args: {
    secret: v.string(),
    summary: v.string(),
    /** What the model was given, so a wrong summary can be traced. */
    basis: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const expected = process.env.EMAIL_LOG_SECRET;
    if (!expected || args.secret !== expected) {
      throw new Error("Not authorised.");
    }

    const id = await ctx.db.insert("digests", {
      summary: args.summary.trim().slice(0, 4000),
      basis: args.basis?.slice(0, 8000),
      createdAt: Date.now(),
    });

    /*
     * Keep the last 30 and drop the rest.
     *
     * A digest is worth reading for a day and worth comparing for a month;
     * beyond that it is a row nobody will ever open. Trimmed on write rather
     * than by a second cron, so there is one fewer scheduled job that can
     * silently stop running.
     */
    const all = await ctx.db.query("digests").order("desc").collect();
    for (const old of all.slice(30)) await ctx.db.delete(old._id);

    return id;
  },
});

/**
 * The facts the summary is written from.
 *
 * Deliberately NOT api.admin.dashboard. That query is admin-gated (the cron
 * has no session), and it carries presentation concerns the summary has no use
 * for — daily lead sparklines, a funnel, the twelve-item cap on the needs-you
 * list. This gathers the smaller set a paragraph can actually be written from,
 * which also keeps the model's input small enough to stay cheap and focused.
 *
 * Returns plain numbers and short strings only. Anything the model does not
 * need is a thing it can misread.
 */
export const facts = query({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    const expected = process.env.EMAIL_LOG_SECRET;
    if (!expected || args.secret !== expected) {
      throw new Error("Not authorised.");
    }

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const monthStart = new Date(new Date(now).setDate(1)).setHours(0, 0, 0, 0);
    const prevMonthStart = new Date(monthStart);
    prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);

    const [leads, invoices, builds, projects] = await Promise.all([
      ctx.db.query("leads").order("desc").take(300),
      ctx.db.query("invoices").collect(),
      ctx.db.query("expressBuilds").order("desc").take(100),
      ctx.db.query("clientProjects").collect(),
    ]);

    const paid = invoices.filter((i) => i.status === "paid");
    // netReceived only exists for Stripe-paid invoices; falling back to the
    // gross amount keeps a hand-marked payment from reading as zero revenue.
    const net = (i: (typeof invoices)[number]) => i.netReceived ?? i.amount;

    const undecided = leads.filter(
      (l) => !l.decision && l.status !== "won" && l.status !== "lost",
    );

    return {
      generatedAt: now,
      currency: paid[0]?.currency ?? "USD",

      requestsWaiting: undecided.length,
      oldestRequestHours: undecided.length
        ? Math.round(
            (now - Math.min(...undecided.map((l) => l._creationTime))) / 3600000,
          )
        : 0,
      newLeads7: leads.filter((l) => l._creationTime >= now - 7 * day).length,
      newLeads30: leads.filter((l) => l._creationTime >= now - 30 * day).length,

      revenueThisMonth: paid
        .filter((i) => (i.paidAt ?? 0) >= monthStart)
        .reduce((s, i) => s + net(i), 0),
      revenuePrevMonth: paid
        .filter(
          (i) =>
            (i.paidAt ?? 0) >= prevMonthStart.getTime() &&
            (i.paidAt ?? 0) < monthStart,
        )
        .reduce((s, i) => s + net(i), 0),

      overdueCount: invoices.filter((i) => i.status === "overdue").length,
      overdueValue: invoices
        .filter((i) => i.status === "overdue")
        .reduce((s, i) => s + i.amount, 0),
      unpaidSentValue: invoices
        .filter((i) => i.status === "sent")
        .reduce((s, i) => s + i.amount, 0),

      activeProjects: projects.filter(
        (p) => p.status === "active" || p.status === "review",
      ).length,
      buildsAwaitingApproval: builds.filter(
        (b) => b.status === "pending_approval",
      ).length,
    };
  },
});

/** Lets the admin regenerate today's briefing by hand. */
export const clearToday = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const newest = await ctx.db.query("digests").order("desc").first();
    if (!newest) return;
    const sameDay =
      new Date(newest.createdAt).toDateString() === new Date().toDateString();
    if (sameDay) await ctx.db.delete(newest._id);
  },
});
