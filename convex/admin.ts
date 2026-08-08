import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin, isAdmin } from "./lib/auth";
import { leadStatus } from "./schema";
import { outstandingLabels } from "./intakeSections";

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

    /*
     * Pipeline value from the PUBLISHED price of the plan they chose, in USD.
     *
     * Previously the midpoint of a self-reported budget band. The plan is the
     * better number: it is what the work actually costs rather than what
     * someone guessed they might spend, so the total is a real figure instead
     * of an average of estimates.
     *
     * Enterprise and revive are deliberately 0 — both are scoped before they
     * are quoted, and inventing a figure here would put a number on the
     * dashboard that no one has agreed to. They still show in the count.
     *
     * Care is one month. Annualising unsigned recurring revenue would inflate
     * the pipeline by 12x on the strength of an enquiry.
     */
    const PLAN_VALUE: Record<string, number> = {
      native: 3200,
      "web-app": 2500,
      app: 2500,
      "multi-page": 750,
      "one-page": 400,
      support: 180,
      enterprise: 0,
      revive: 0,
    };

    const byTier = new Map<string, { count: number; value: number }>();
    for (const l of open) {
      const key = l.projectType ?? l.tier ?? "Unspecified";
      const entry = byTier.get(key) ?? { count: 0, value: 0 };
      entry.count += 1;
      entry.value += PLAN_VALUE[l.plan ?? ""] ?? PLAN_VALUE[l.tier ?? ""] ?? 0;
      byTier.set(key, entry);
    }

    /*
     * Totals PER CURRENCY, not one number across all of them.
     *
     * These used to sum `amount` over every invoice regardless of currency
     * and label the result with `invoices[0].currency` — the oldest invoice's
     * currency, chosen by insertion order and nothing else. One AED invoice
     * beside three USD ones produced a figure that was not a real amount in
     * any currency, presented as if it were. Pricing is quoted in USD, GBP,
     * EUR, SAR and AED, so this was reachable, not theoretical.
     *
     * Reported as a list so the dashboard can show "$2,400 · £600" rather
     * than adding pounds to dollars. `primary` keeps the single-currency
     * case — which is the normal one — a plain number to render.
     */
    const sumByCurrency = (rows: typeof invoices) => {
      const totals = new Map<string, number>();
      for (const i of rows) {
        const currency = i.currency ?? "USD";
        totals.set(currency, (totals.get(currency) ?? 0) + i.amount);
      }
      return [...totals.entries()]
        .map(([currency, amount]) => ({ currency, amount }))
        .sort((a, b) => b.amount - a.amount);
    };

    const paidByCurrency = sumByCurrency(
      invoices.filter(
        (i) => i.status === "paid" && (i.paidAt ?? 0) >= monthStart,
      ),
    );
    const outstandingByCurrency = sumByCurrency(
      invoices.filter((i) => i.status === "sent" || i.status === "overdue"),
    );

    /*
     * The currency actually in use, rather than whichever row sorted first.
     * Falls back to USD only when there are no invoices at all to read one
     * from — an empty dashboard, where the label is arbitrary anyway.
     */
    const primaryCurrency =
      outstandingByCurrency[0]?.currency ??
      paidByCurrency[0]?.currency ??
      "USD";

    const paidThisMonth =
      paidByCurrency.find((t) => t.currency === primaryCurrency)?.amount ?? 0;
    const outstanding =
      outstandingByCurrency.find((t) => t.currency === primaryCurrency)
        ?.amount ?? 0;

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
        currency: primaryCurrency,
        // The full breakdown, so a second currency is visible rather than
        // silently folded into the headline figure.
        paidByCurrency,
        outstandingByCurrency,
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
    /* Same shape when signed out, so the palette renders an empty result
       rather than throwing on a missing key. */
    if (!(await isAdmin(ctx))) {
      return {
        leads: [],
        projects: [],
        clients: [],
        invoices: [],
        proposals: [],
      };
    }

    /*
     * Five entity types, not two.
     *
     * The palette searched leads and portfolio projects, which meant finding
     * a client, an invoice or a proposal required knowing which screen it
     * lived on and going there first. Searching across all of them is the
     * difference between a shortcut and the way you navigate.
     *
     * Capped per type rather than overall so one busy table cannot crowd the
     * others out of the results — 300 rows is well under what the client can
     * filter instantly, and the palette only fetches while it is open.
     */
    const [leads, projects, clients, invoices, proposals] = await Promise.all([
      ctx.db.query("leads").order("desc").take(100),
      ctx.db.query("projects").order("desc").take(50),
      ctx.db.query("clients").order("desc").take(60),
      ctx.db.query("invoices").order("desc").take(60),
      ctx.db.query("proposals").order("desc").take(60),
    ]);

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
      clients: clients.map((c) => ({
        _id: c._id,
        name: c.name,
        email: c.email,
        company: c.company,
      })),
      invoices: invoices.map((i) => ({
        _id: i._id,
        reference: i.reference,
        clientName: i.clientName,
        amount: i.amount,
        currency: i.currency,
        status: i.status,
      })),
      proposals: proposals.map((p) => ({
        _id: p._id,
        clientName: p.clientName,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
      })),
    };
  },
});

/**
 * The operator dashboard.
 *
 * `overview` above answers "how is the business doing". This answers a
 * different and more urgent question: what needs me today. They are separate
 * queries because they have different shapes and different costs, and folding
 * the second into the first would make every page that wants a lead count pay
 * for a scan of six more tables.
 *
 * The single merged action list is the point. Before this, "needs attention"
 * meant unanswered new leads and nothing else — a proposal viewed and ignored
 * for a week, an overdue invoice and an unread client message were each
 * visible only on their own screen, which means each was visible only if you
 * thought to go and look. One prioritised list is the reason to open the
 * admin at all.
 */
export const dashboard = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const now = Date.now();
    const hour = 60 * 60 * 1000;
    const day = 24 * hour;

    const [
      leads,
      invoices,
      proposals,
      builds,
      testimonials,
      feedback,
      intakes,
      clientProjects,
      clients,
      monitoredSites,
      openIncidents,
    ] = await Promise.all([
      ctx.db.query("leads").order("desc").take(400),
      ctx.db.query("invoices").order("desc").take(300),
      ctx.db.query("proposals").order("desc").take(200),
      ctx.db.query("expressBuilds").order("desc").take(100),
      ctx.db.query("testimonials").collect(),
      ctx.db.query("siteFeedback").order("desc").take(100),
      /*
       * Collected whole rather than capped. All five are bounded by the
       * number of live client relationships — tens, not thousands — and a
       * `.take()` here would silently drop the one project whose intake is
       * the reason something is late.
       */
      ctx.db.query("intakes").collect(),
      ctx.db.query("clientProjects").collect(),
      ctx.db.query("clients").collect(),
      ctx.db.query("monitoredSites").collect(),
      // An incident with no closedAt is one happening right now.
      ctx.db
        .query("incidents")
        .withIndex("by_open", (q) => q.eq("closedAt", undefined))
        .collect(),
    ]);

    /*
     * Everything that wants a human, in one list.
     *
     * `priority` is a sort key, not a label — lower is more urgent. Money
     * already owed outranks money that might arrive, and anything with a
     * clock on it outranks anything without.
     */
    type Item = {
      id: string;
      priority: number;
      kind: string;
      label: string;
      detail: string;
      href: string;
      /** How long it has been waiting, in hours. */
      waited: number;
    };
    const needsYou: Item[] = [];

    // 1. An express build whose window is running. Nothing else has a
    //    two-hour promise attached to it.
    for (const b of builds) {
      if (b.status === "pending_approval") {
        needsYou.push({
          id: b._id,
          priority: 0,
          kind: "express",
          label: `${b.name} is waiting on approval`,
          detail: "Nothing is running until you accept it.",
          href: "/express",
          waited: Math.round((now - b.createdAt) / hour),
        });
      }
    }

    // 2. Overdue money. Already late, and it does not chase itself.
    for (const inv of invoices) {
      if (inv.status === "overdue") {
        needsYou.push({
          id: inv._id,
          priority: 1,
          kind: "invoice",
          label: `${inv.clientName} — ${inv.reference} is overdue`,
          detail: `${inv.currency} ${inv.amount.toLocaleString("en-US")} outstanding.`,
          href: "/invoices",
          waited: Math.round((now - (inv.dueDate ?? inv._creationTime)) / hour),
        });
      }
    }

    // 3. A proposal read and not answered. They know what it says; silence
    //    now means something, and three days is where it starts to.
    for (const p of proposals) {
      if (p.status === "sent" && p.viewedAt && now - p.viewedAt > 3 * day) {
        needsYou.push({
          id: p._id,
          priority: 2,
          kind: "proposal",
          label: `${p.clientName ?? "A proposal"} opened it and went quiet`,
          detail: "Read, not answered. Worth a nudge.",
          href: "/proposals",
          waited: Math.round((now - p.viewedAt) / hour),
        });
      }
      if (p.changeRequest) {
        needsYou.push({
          id: `${p._id}-changes`,
          priority: 1,
          kind: "proposal",
          label: `${p.clientName ?? "A client"} asked for changes`,
          detail: p.changeRequest.slice(0, 90),
          href: "/proposals",
          waited: Math.round((now - p._creationTime) / hour),
        });
      }
    }

    // 4. A hot lead nobody has replied to. Scored leads decay fast.
    for (const l of leads) {
      if (l.status !== "new") continue;
      const waited = now - l._creationTime;
      if (waited < day) continue;
      needsYou.push({
        id: l._id,
        priority: (l.score ?? 0) >= 60 ? 2 : 4,
        kind: "lead",
        label: `${l.name || l.email} has waited ${Math.round(waited / day)} days`,
        detail: l.projectType ?? l.plan ?? "New enquiry",
        href: "/leads",
        waited: Math.round(waited / hour),
      });
    }

    // 5. A testimonial someone wrote that is not published yet.
    for (const t of testimonials) {
      if (t.approved === false) {
        needsYou.push({
          id: t._id,
          priority: 5,
          kind: "testimonial",
          label: `${t.author} left a testimonial`,
          detail: "Waiting for approval.",
          href: "/content",
          waited: Math.round((now - t._creationTime) / hour),
        });
      }
    }

    // 6. Unread feedback from the site.
    for (const f of feedback) {
      if (!f.read) {
        needsYou.push({
          id: f._id,
          priority: 5,
          kind: "feedback",
          label: `${f.name} sent feedback`,
          detail: f.message.slice(0, 90),
          href: "/feedback",
          waited: Math.round((now - f.createdAt) / hour),
        });
      }
    }

    /*
     * 7. A project that has STARTED while its intake is still incomplete.
     *
     * The combination is the point, and neither half means much alone. An
     * unfinished intake on a project that has not begun is just a form
     * someone has not got to yet; a started project with everything in is
     * fine. Together they are the shape of every delayed project — work
     * running against information I do not have.
     *
     * Priority 1, alongside an overdue invoice: not screaming, but ahead of
     * anything that is merely waiting on a reply, because the cost grows
     * every day it is ignored.
     */
    for (const intake of intakes) {
      if (intake.completedAt) continue;

      const project = clientProjects.find((p) => p._id === intake.projectId);
      if (!project?.startedAt) continue;
      if (project.status === "complete") continue;

      const outstanding = outstandingLabels(intake.sections);
      if (outstanding.length === 0) continue;

      const client = clients.find((c) => c._id === intake.clientId);

      needsYou.push({
        id: intake._id,
        priority: 1,
        kind: "intake",
        label: `${project.name} started without its onboarding`,
        // Names what is missing, not how much. "3 sections outstanding" tells
        // me there is a problem; "your logo and domain access" tells me what
        // to go and ask for.
        detail: `Still need ${outstanding.slice(0, 2).join(" and ")}${
          outstanding.length > 2 ? ` (+${outstanding.length - 2} more)` : ""
        }${client ? ` — ${client.name}` : ""}`,
        href: "/clients",
        waited: Math.round((now - project.startedAt) / hour),
      });
    }

    /*
     * 8. A monitored site that is down right now.
     *
     * Priority 0 without qualification. Everything else on this list is
     * someone waiting; this is a client's site being unreachable while their
     * customers try to visit it.
     */
    for (const incident of openIncidents) {
      const site = monitoredSites.find((s) => s._id === incident.siteId);
      if (!site) continue;

      needsYou.push({
        id: incident._id,
        priority: 0,
        kind: "site",
        label: `${site.url.replace(/^https?:\/\//, "").replace(/\/$/, "")} is down`,
        detail: `${incident.cause}. ${
          incident.clientNotifiedAt ? "Client has been told." : "Client not told yet."
        }`,
        href: "/monitoring",
        waited: Math.round((now - incident.openedAt) / hour),
      });
    }

    needsYou.sort((a, b) => a.priority - b.priority || b.waited - a.waited);

    /* ----------------------------------------------------------- metrics */

    const monthStart = new Date(new Date(now).setDate(1)).setHours(0, 0, 0, 0);
    const thirtyDays = now - 30 * day;
    const sixtyDays = now - 60 * day;

    const paid = invoices.filter((i) => i.status === "paid");

    /*
     * Net of fees where Stripe told us, gross where it did not.
     *
     * netReceived is only populated for invoices paid through Stripe; one
     * marked paid by hand has no fee to subtract. Falling back to `amount`
     * keeps the figure honest rather than silently reporting zero for it.
     */
    const net = (i: (typeof invoices)[number]) => i.netReceived ?? i.amount;

    const revenueThisMonth = paid
      .filter((i) => (i.paidAt ?? 0) >= monthStart)
      .reduce((sum, i) => sum + net(i), 0);

    const revenuePrevMonth = paid
      .filter((i) => {
        const at = i.paidAt ?? 0;
        const prevStart = new Date(monthStart);
        prevStart.setMonth(prevStart.getMonth() - 1);
        return at >= prevStart.getTime() && at < monthStart;
      })
      .reduce((sum, i) => sum + net(i), 0);

    const fees = paid.reduce((sum, i) => sum + (i.stripeFee ?? 0), 0);

    const openLeads = leads.filter(
      (l) => l.status !== "won" && l.status !== "lost",
    );

    const pipelineValue = invoices
      .filter((i) => i.status === "sent" || i.status === "overdue")
      .reduce((sum, i) => sum + i.amount, 0);

    const leads30 = leads.filter((l) => l._creationTime >= thirtyDays).length;
    const leadsPrev30 = leads.filter(
      (l) => l._creationTime >= sixtyDays && l._creationTime < thirtyDays,
    ).length;

    const activeBuilds = builds.filter(
      (b) => b.status === "building" || b.status === "queued",
    ).length;

    /* Thirty daily buckets for the sparklines. Built from the same rows
       already in memory rather than a second pass over the tables. */
    const dailyLeads: number[] = [];
    for (let i = 29; i >= 0; i--) {
      const from = now - (i + 1) * day;
      const to = now - i * day;
      dailyLeads.push(
        leads.filter((l) => l._creationTime >= from && l._creationTime < to)
          .length,
      );
    }

    /* Funnel. Counted from the lead's CURRENT status, so it is monotonic by
       construction: reaching "won" means having passed every prior stage. */
    const rank: Record<string, number> = {
      new: 0,
      contacted: 1,
      qualified: 1,
      proposal: 2,
      won: 3,
      lost: -1,
    };
    const atLeast = (n: number) =>
      leads.filter((l) => (rank[l.status] ?? -1) >= n).length;

    return {
      needsYou: needsYou.slice(0, 12),
      needsYouTotal: needsYou.length,
      metrics: {
        revenueThisMonth,
        revenuePrevMonth,
        fees,
        pipelineValue,
        openLeads: openLeads.length,
        leads30,
        leadsPrev30,
        activeBuilds,
        currency: paid[0]?.currency ?? "USD",
      },
      dailyLeads,
      funnel: [
        { step: "Enquiries", count: leads.length },
        { step: "Contacted", count: atLeast(1) },
        { step: "Proposal", count: atLeast(2) },
        { step: "Won", count: atLeast(3) },
      ],
    };
  },
});
