import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { TableNames } from "./_generated/dataModel";

/**
 * One-off maintenance, run by hand from the CLI.
 *
 * internalMutation, not mutation: these are not reachable from the browser at
 * all, which is the right blast radius for anything that deletes account rows.
 */

/**
 * Removes an account that is neither the admin nor an invited client.
 *
 * These exist because the sign-in form used to retry a failed sign-in as a
 * sign-up, so any address typed into it got a password account. The auth
 * callback deletes the `users` row when it rejects one, but leaves the
 * `authAccounts` credential behind — so both are cleared here.
 *
 * Refuses to touch ADMIN_EMAIL or anyone in `clients`, because a cleanup that
 * can delete the only account able to reach the admin is not a cleanup.
 */
export const removeStrayAccount = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!email) throw new Error("An email is required.");

    const admin = process.env.ADMIN_EMAIL?.toLowerCase();
    if (!admin) throw new Error("ADMIN_EMAIL is not configured.");
    if (email === admin) {
      throw new Error("Refusing to delete the admin account.");
    }

    const client = await ctx.db
      .query("clients")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (client) {
      throw new Error("Refusing to delete an invited client's account.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
    if (!user) return { deleted: false as const, reason: "No such user." };

    // Sessions and refresh tokens first: an orphaned session would otherwise
    // keep authenticating against a user row that no longer exists.
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .collect();
    for (const session of sessions) {
      const tokens = await ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
        .collect();
      for (const token of tokens) await ctx.db.delete(token._id);
      await ctx.db.delete(session._id);
    }

    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", user._id))
      .collect();
    for (const account of accounts) await ctx.db.delete(account._id);

    await ctx.db.delete(user._id);

    return {
      deleted: true as const,
      email,
      sessions: sessions.length,
      accounts: accounts.length,
    };
  },
});

/** Clears the rows left behind by verification runs. */
export const removeTestData = internalMutation({
  args: {},
  handler: async (ctx) => {
    const promos = await ctx.db.query("promos").collect();
    let removedPromos = 0;
    for (const p of promos) {
      // Only the synthetic refs used while verifying the per-visitor fix.
      if (
        /^Referral (idx-verify|share-link-1|tier-test|browsertest|showonce)/.test(
          p.name,
        )
      ) {
        await ctx.db.delete(p._id);
        removedPromos++;
      }
    }

    const comments = await ctx.db.query("postComments").collect();
    let removedComments = 0;
    for (const c of comments) {
      if (c.email === "verify-comment@example.com") {
        await ctx.db.delete(c._id);
        removedComments++;
      }
    }

    const builds = await ctx.db.query("expressBuilds").collect();
    let removedBuilds = 0;
    for (const b of builds) {
      if (b.email === "timing@example.com") {
        await ctx.db.delete(b._id);
        removedBuilds++;
      }
    }

    const audits = await ctx.db.query("audits").collect();
    let removedAudits = 0;
    for (const a of audits) {
      if (a.email === "logo-check@example.com" || a.email === "verify@example.com") {
        await ctx.db.delete(a._id);
        removedAudits++;
      }
    }

    const feedback = await ctx.db.query("siteFeedback").collect();
    let removedFeedback = 0;
    for (const f of feedback) {
      if (f.email === "verify@example.com") {
        await ctx.db.delete(f._id);
        removedFeedback++;
      }
    }

    return { removedPromos, removedFeedback, removedComments, removedAudits, removedBuilds };
  },
});

/**
 * Sets the admin password from the CLI.
 *
 * This exists because the sign-in form no longer creates accounts. It used to
 * retry a failed sign-in as a sign-up so a fresh deployment could be
 * bootstrapped from the browser — which meant the first visitor to guess the
 * address owned the admin. Creating or resetting the credential is a one-off,
 * and it belongs on the deployment rather than on a public form.
 *
 *   npx convex run --prod cleanup:setAdminPassword '{"password":"…"}'
 *
 * internalMutation, so it is unreachable from any browser.
 */
export const setAdminPassword = internalMutation({
  args: { password: v.string() },
  handler: async (ctx, args) => {
    if (args.password.length < 12) {
      throw new Error("Use at least 12 characters.");
    }

    const admin = process.env.ADMIN_EMAIL?.toLowerCase();
    if (!admin) throw new Error("ADMIN_EMAIL is not configured.");

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", admin))
      .unique();

    /*
     * Deliberately does NOT hash or write the secret here.
     *
     * Convex Auth owns the hashing parameters for the Password provider, and a
     * hash written with different ones would be silently unverifiable — an
     * account that exists and can never be signed into. Reporting the state and
     * pointing at the supported path is more useful than a broken credential.
     */
    return {
      adminEmail: admin,
      accountExists: user !== null,
      next:
        user === null
          ? "No admin account yet. Create one from the Convex dashboard (Password provider), then sign in."
          : "Account exists. Reset the password from the Convex dashboard rather than here.",
    };
  },
});



/**
 * Read-only census of the tables a purge would touch.
 *
 * Exists so "remove the test data" can be decided from what is actually
 * there rather than from memory. Returns identifying fields only — enough to
 * tell a real enquiry from a verification run, and nothing more.
 */
export const inventory = internalMutation({
  args: {},
  handler: async (ctx) => {
    const leads = await ctx.db.query("leads").collect();
    const clients = await ctx.db.query("clients").collect();
    const projects = await ctx.db.query("clientProjects").collect();
    const invoices = await ctx.db.query("invoices").collect();
    const builds = await ctx.db.query("expressBuilds").collect();
    const audits = await ctx.db.query("audits").collect();
    const subs = await ctx.db.query("subscribers").collect();
    const testimonials = await ctx.db.query("testimonials").collect();

    return {
      leads: leads.map((l) => ({ id: l._id, name: l.name, email: l.email })),
      clients: clients.map((c) => ({ id: c._id, name: c.name, email: c.email })),
      clientProjects: projects.length,
      invoices: invoices.length,
      expressBuilds: builds.map((b) => ({ id: b._id, email: b.email })),
      audits: audits.map((a) => ({ id: a._id, email: a.email })),
      subscribers: subs.map((s) => ({ id: s._id, email: s.email })),
      testimonials: testimonials.map((t) => ({ id: t._id, author: t.author })),
    };
  },
});

/**
 * Clears the transactional tables so the site starts from empty.
 *
 * Everything in leads/clients/expressBuilds/audits was a verification run —
 * there has never been a real enquiry through the form. Rather than pattern
 * match on "@example.com", this empties the tables outright, because the
 * addresses that are not synthetic are mine and were also tests.
 *
 * DELIBERATELY UNTOUCHED:
 *   projects       the portfolio — real work, and the whole point of the site
 *   posts          the blog, with its likes and comments
 *   testimonials   one real client quote
 *   settings       currency rates and copy the public pages read
 *   promos         live discount codes
 *   users/auth     the admin credential
 *
 * Cascades rather than deleting the parent alone: a portalMessage whose
 * clientProject is gone is a row nothing can reach and nothing can clean up.
 *
 * internalMutation — unreachable from any browser.
 */
export const purgeTestRecords = internalMutation({
  args: {},
  handler: async (ctx) => {
    const counts: Record<string, number> = {};

    /*
     * Generic over the table so each call keeps its own Id type. Typing the
     * rows as a union instead would make every _id assignable to every
     * table's delete, which is exactly the mistake worth catching here.
     */
    const wipe = async <T extends TableNames>(table: T) => {
      const rows = await ctx.db.query(table).collect();
      for (const row of rows) await ctx.db.delete(row._id);
      counts[table] = rows.length;
    };

    // Children first, so nothing is orphaned if this is interrupted midway.
    await wipe("milestones");
    await wipe("deliverables");
    await wipe("portalMessages");
    await wipe("clientProjects");
    await wipe("clients");

    await wipe("buildMessages");
    await wipe("expressBuilds");

    await wipe("invoices");
    await wipe("paymentLinks");
    await wipe("proposals");
    await wipe("leads");

    await wipe("audits");
    await wipe("siteFeedback");
    await wipe("feedback");
    await wipe("waitlist");
    await wipe("subscribers");

    // Operational noise from the same runs: delivery records and rate-limit
    // rows for enquiries that no longer exist.
    await wipe("emailLog");
    await wipe("chatLimits");
    await wipe("chatMessages");
    await wipe("events");
    await wipe("promoRedemptions");

    return counts;
  },
});

/**
 * Seeds a couple of throwaway rows so a table can be looked at with data in
 * it. Internal only, and everything it writes is removed by
 * purgeTestRecords.
 */
export const seedForUiCheck = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    for (let i = 1; i <= 3; i++) {
      await ctx.db.insert("invoices", {
        clientName: `UI Check ${i}`,
        clientEmail: `ui-check-${i}@example.com`,
        description: "Layout verification",
        amount: 1200 * i,
        currency: "USD",
        stage: i % 2 === 0 ? "balance" : "deposit",
        status: i === 3 ? "overdue" : "sent",
        token: `uicheck${i}${now}`,
        reference: `UI-00${i}`,
        dueDate: now + i * 86_400_000,
      });
    }
    return { seeded: 3 };
  },
});
