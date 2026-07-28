import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin, isAdmin } from "./lib/auth";
import { leadStatus } from "./schema";

/**
 * Admin read models.
 *
 * Every function here calls requireAdmin first. There is deliberately no
 * "public with a filter" variant — a query that returns lead data at all is a
 * query that must prove identity, because the filter is client-supplied and
 * therefore attacker-supplied.
 */

/** Cheap check for the shell, so a signed-out visitor sees a sign-in prompt. */
export const amIAdmin = query({
  args: {},
  handler: async (ctx) => await isAdmin(ctx),
});

/**
 * Everything the Overview needs, in one round trip.
 *
 * Assembled server-side rather than as five separate queries: the dashboard
 * would otherwise fire a waterfall on every load, and the numbers could
 * disagree with each other if they resolved at different moments.
 */
export const overview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const leads = await ctx.db.query("leads").order("desc").take(500);
    const projects = await ctx.db.query("projects").collect();
    const invoices = await ctx.db.query("invoices").collect();

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthStart = new Date(new Date(now).setDate(1)).setHours(0, 0, 0, 0);

    const open = leads.filter(
      (l) => l.status !== "won" && l.status !== "lost",
    );

    // "Needs attention" is deliberately narrow: a new lead that has sat
    // unanswered. A list that includes everything gets ignored like a full
    // inbox, so this only surfaces what genuinely has not been touched.
    const needsAttention = leads
      .filter((l) => l.status === "new")
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 8)
      .map((l) => ({
        _id: l._id,
        name: l.name,
        email: l.email,
        company: l.company,
        score: l.score ?? 0,
        projectType: l.projectType,
        createdAt: l._creationTime,
        // Hours waiting, so the UI does not have to recompute per row.
        waitingHours: Math.floor((now - l._creationTime) / 3_600_000),
      }));

    // Pipeline value by tier, from the mid-point of each budget band. A band
    // cannot be summed directly, and the midpoint is a defensible estimate;
    // the top band uses its floor rather than inventing a ceiling.
    const BAND_MIDPOINT: Record<string, number> = {
      "Under $1,000": 500,
      "$1,000 – $3,000": 2000,
      "$3,000 – $6,000": 4500,
      "$6,000 – $13,000": 9500,
      "$13,000+": 13000,
      "Not sure yet": 0,
    };

    const byTier = new Map<string, { count: number; value: number }>();
    for (const l of open) {
      const key = l.projectType ?? l.tier ?? "Unspecified";
      const entry = byTier.get(key) ?? { count: 0, value: 0 };
      entry.count += 1;
      entry.value += BAND_MIDPOINT[l.budget ?? ""] ?? 0;
      byTier.set(key, entry);
    }

    const paidThisMonth = invoices
      .filter((i) => i.status === "paid" && (i.paidAt ?? 0) >= monthStart)
      .reduce((sum, i) => sum + i.amount, 0);

    const outstanding = invoices
      .filter((i) => i.status === "sent" || i.status === "overdue")
      .reduce((sum, i) => sum + i.amount, 0);

    return {
      counts: {
        leadsTotal: leads.length,
        leadsNew: leads.filter((l) => l.status === "new").length,
        leadsHot: open.filter((l) => (l.score ?? 0) >= 60).length,
        leadsLast7: leads.filter((l) => l._creationTime >= sevenDaysAgo).length,
        projectsPublished: projects.filter((p) => p.status === "published")
          .length,
        projectsDraft: projects.filter((p) => p.status === "draft").length,
      },
      revenue: {
        paidThisMonth,
        outstanding,
        currency: invoices[0]?.currency ?? "USD",
      },
      pipeline: [...byTier.entries()]
        .map(([tier, v]) => ({ tier, ...v }))
        .sort((a, b) => b.value - a.value),
      needsAttention,
    };
  },
});

/**
 * Leads for the table. Filtering happens here rather than in the browser so a
 * large list never ships in full to the client.
 */
export const leads = query({
  args: {
    status: v.optional(leadStatus),
    band: v.optional(
      v.union(v.literal("hot"), v.literal("warm"), v.literal("cold")),
    ),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const rows =
      args.status === undefined
        ? await ctx.db.query("leads").order("desc").take(400)
        : await ctx.db
            .query("leads")
            .withIndex("by_status", (q) => q.eq("status", args.status!))
            .order("desc")
            .take(400);

    const needle = args.search?.trim().toLowerCase();

    return rows
      .filter((l) => {
        if (args.band) {
          const s = l.score ?? 0;
          const band = s >= 60 ? "hot" : s >= 32 ? "warm" : "cold";
          if (band !== args.band) return false;
        }
        if (needle) {
          const hay = [l.name, l.email, l.company, l.projectType]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!hay.includes(needle)) return false;
        }
        return true;
      })
      .slice(0, args.limit ?? 200);
  },
});

/** Full record for the detail drawer. */
export const lead = query({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.get(args.id);
  },
});

/** Advance a lead through the pipeline. */
export const setLeadStatus = mutation({
  args: { id: v.id("leads"), status: leadStatus },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { status: args.status });
  },
});

/**
 * Private notes on a lead. Appended with a timestamp rather than overwritten,
 * because losing an earlier note to a stray edit is worse than a long field.
 */
export const addLeadNote = mutation({
  args: { id: v.id("leads"), note: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const lead = await ctx.db.get(args.id);
    if (!lead) throw new Error("No such lead.");

    const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
    const existing = lead.notes ?? "";
    const next = existing
      ? `${existing}\n\n[${stamp}] ${args.note.trim()}`
      : `[${stamp}] ${args.note.trim()}`;

    await ctx.db.patch(args.id, { notes: next });
  },
});

/**
 * Invoices for the admin board, grouped by status with their totals.
 *
 * Totals are summed per currency rather than added together — adding 900 USD
 * to 3300 AED gives a number that means nothing, and a dashboard that quietly
 * does it is worse than one that shows nothing.
 */
export const invoices = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const rows = await ctx.db.query("invoices").order("desc").take(300);

    const totals = new Map<string, { paid: number; outstanding: number }>();
    for (const inv of rows) {
      const entry = totals.get(inv.currency) ?? { paid: 0, outstanding: 0 };
      if (inv.status === "paid") entry.paid += inv.amount;
      if (inv.status === "sent" || inv.status === "overdue") {
        entry.outstanding += inv.amount;
      }
      totals.set(inv.currency, entry);
    }

    return {
      rows,
      totals: [...totals.entries()].map(([currency, v]) => ({
        currency,
        ...v,
      })),
    };
  },
});

/** Everything the command palette can jump to, in one call. */
export const paletteData = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) return { leads: [], projects: [] };

    const leads = await ctx.db.query("leads").order("desc").take(100);
    const projects = await ctx.db.query("projects").order("desc").take(50);

    return {
      leads: leads.map((l) => ({
        _id: l._id,
        name: l.name,
        company: l.company,
        email: l.email,
        score: l.score ?? 0,
      })),
      projects: projects.map((p) => ({
        _id: p._id,
        title: p.title,
        slug: p.slug,
        status: p.status,
      })),
    };
  },
});
