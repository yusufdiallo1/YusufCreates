import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
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
 * 1. Nobody pays before I have approved the brief. A request lands as
 *    pending_approval; I read it and either approve — which creates the
 *    client, their project and their portal, and unlocks payment — or decline
 *    it. Taking money for work I have not agreed to do is the one thing this
 *    flow must not allow.
 * 1b. Paying does not start the clock either. It moves the request to
 *    paid_review and notifies me; I check what actually arrived and start the
 *    two hours deliberately. A card clearing at 3am, or against a brief still
 *    missing its copy, must not burn a window I cannot work in.
 * 2. Whether the balance is owed is decided ONCE, at delivery, and written
 *    down. Deriving it later from timestamps means the answer could change if
 *    the window constant ever moves — and this decides who keeps money.
 */

/** Two hours, in milliseconds. */
export const WINDOW_MS = 2 * 60 * 60 * 1000;

/**
 * Total price in minor units, and the share taken up front.
 *
 * 40/60, matching invoices.ts — the deposit covers being committed to, the
 * balance is what the finished work is worth. The balance is derived as the
 * REMAINDER rather than as a second percentage: rounding both independently
 * lets the two instalments sum to a penny either side of the quoted total,
 * and a client who adds up their receipts and gets a different number is
 * right to ask why.
 */
export const EXPRESS_TOTAL = 6900;
export const DEPOSIT_SHARE = 0.4;
export const EXPRESS_DEPOSIT = Math.round(EXPRESS_TOTAL * DEPOSIT_SHARE);

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
      status: "pending_approval",
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

    /*
     * The finished site is released when the balance is settled.
     *
     * Withheld HERE rather than hidden in the component: a URL sent to the
     * browser is a URL anyone can read out of the network tab, so "hidden in
     * the UI" is not withheld at all. The preview stays visible throughout —
     * they should see what they are paying to unlock.
     *
     * Waived counts as settled. If I missed the deadline the balance is gone,
     * and holding the work back over money they no longer owe would turn the
     * guarantee into a hostage.
     */
    const settled =
      Boolean(row.balancePaidAt) ||
      Boolean(row.balanceWaived) ||
      row.balanceAmount <= 0;

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
      /*
       * Whether I waived the cost outright, as opposed to losing the balance
       * by running late. Both settle the account, but they are not the same
       * thing to say: telling someone "I missed the window" about a build I
       * chose to do for nothing is both untrue and gives away the gesture.
       */
      paymentSkipped: row.paymentSkipped ?? false,
      depositPaidAt: row.depositPaidAt ?? null,
      balancePaidAt: row.balancePaidAt ?? null,
      acceptedAt: row.acceptedAt ?? null,
      dueAt: row.dueAt ?? null,
      deliveredAt: row.deliveredAt ?? null,
      /** Null until the balance is settled. See `settled` above. */
      deliveredUrl: settled ? (row.deliveredUrl ?? null) : null,
      /** So the portal can say "ready, pay to unlock" without leaking it. */
      deliveredLocked: Boolean(row.deliveredUrl) && !settled,
      plan: row.plan ?? "express",
      approvedAt: row.approvedAt ?? null,
      declinedAt: row.declinedAt ?? null,
      declineNote: row.declineNote ?? null,
      deliveryDate: row.deliveryDate ?? null,
      previewUrl: row.previewUrl ?? null,
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

    /*
     * Money in does NOT start the clock.
     *
     * It used to, and that was wrong: a two-hour promise begins running the
     * instant a card clears, which could be 3am, or while the brief is still
     * missing the copy and images it says it needs. Either way the window
     * burns on work I cannot start.
     *
     * So paying moves it to `paid_review` and notifies me. I check what came
     * in and start the clock deliberately. The client is told this plainly —
     * "payment received, I am checking it over" — because a countdown that
     * has not visibly started needs explaining.
     */
    await ctx.db.patch(row._id, {
      depositPaidAt: Date.now(),
      stripeSessionId: args.stripeSessionId,
      status: "paid_review",
      // Cleared so the notification sweep picks this up as new.
      paidNotifiedAt: undefined,
    });
  },
});

/**
 * Starts the two hours, by hand, after I have checked what was paid for.
 *
 * The deliberate act the whole flow hangs on. Separate from approval (which
 * only opens payment) and from payment (which only proves they are serious),
 * because this is the one that puts a deadline against my name.
 */
export const startBuild = mutation({
  args: { id: v.id("expressBuilds") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("No such build.");
    if (!row.depositPaidAt && !row.paymentSkipped) {
      throw new Error("Nothing has been paid, and payment was not skipped.");
    }
    if (row.acceptedAt) return; // Already running.

    await startClock(ctx, row);
  },
});

/**
 * Starts the work without taking money first.
 *
 * For the ones where charging is the wrong move — a friend, a rebuild of my
 * own mistake, a client I already owe. It skips the deposit and the review
 * step together: I would not waive a fee for someone whose brief I had not
 * already read.
 */
export const skipPaymentAndStart = mutation({
  args: { id: v.id("expressBuilds"), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("No such build.");
    if (row.acceptedAt) return;

    await ctx.db.patch(args.id, {
      paymentSkipped: true,
      manualNote: args.note?.trim().slice(0, 200),
      /*
       * Skipping payment skips ALL of it, not just the deposit.
       *
       * This used to zero the deposit alone, which left the balance intact
       * and still due — so a build I had deliberately waived went on
       * displaying "$27.60 paid · $41.40 due", chased the client for the
       * balance on delivery, raised an invoice for it by cron, and counted
       * it as outstanding on the dashboard. "Skip payment" that still asks
       * for 60% of the money is not skipping payment.
       *
       * balanceWaived is the flag the whole file already reads as "settled,
       * nothing owed" — the same one a missed express window sets — so
       * setting it here makes every downstream check agree without adding a
       * second notion of free.
       */
      depositAmount: 0,
      balanceAmount: 0,
      balanceWaived: true,
    });

    const fresh = await ctx.db.get(args.id);
    if (fresh) await startClock(ctx, fresh);
  },
});

/**
 * Approves the request: opens payment AND builds everything downstream.
 *
 * This is the one decision that needs a human, so it is the one place that
 * does the work. Sliding to approve creates the client, creates their
 * project, links the lead, and leaves the request payable — none of which I
 * should have to do by hand, because every detail needed is already on the
 * row they submitted.
 *
 * It does NOT start the clock. An approved request they have not opened yet
 * must not already be running down; paying is what starts it.
 *
 * `deliveryDate` is for non-express plans, where the date is agreed rather
 * than computed from a two-hour window.
 */
export const approve = mutation({
  args: {
    id: v.id("expressBuilds"),
    deliveryDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("No such build.");
    // Idempotent: a double-slide must not mint a second client or project.
    if (row.approvedAt) return;

    const now = Date.now();
    const email = row.email.trim().toLowerCase();

    /*
     * Match an existing client by email before creating one.
     *
     * A returning client sending a second request is the normal case, not the
     * exception, and giving them a duplicate row would split their projects
     * across two portals — each showing half their work.
     */
    const existingClient = await ctx.db
      .query("clients")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    /*
     * Their enquiry, if they sent one.
     *
     * Matched on email rather than carried through the form, because a
     * request can arrive by a route the lead form never touched. Newest
     * first: someone who enquired twice means the recent one.
     */
    const lead =
      row.leadId != null
        ? await ctx.db.get(row.leadId)
        : (
            await ctx.db
              .query("leads")
              .withIndex("by_email", (q) => q.eq("email", email))
              .order("desc")
              .take(1)
          )[0];

    const company = row.company ?? lead?.company;

    let clientId: Id<"clients">;
    if (existingClient) {
      clientId = existingClient._id;
      // Fill gaps rather than overwrite: a company typed into the admin by
      // hand should not be blanked by a request that omitted one.
      await ctx.db.patch(clientId, {
        company: existingClient.company ?? company,
        leadId: existingClient.leadId ?? lead?._id,
      });
    } else {
      clientId = await ctx.db.insert("clients", {
        email,
        name: row.name,
        company,
        leadId: lead?._id,
        createdAt: now,
      });
    }

    /*
     * The project, named from the brief.
     *
     * `planning` rather than `active`: approving means I have agreed to do it,
     * not that I have started. It moves to active when the deposit clears and
     * the clock starts, which is the same instant for both records.
     */
    const projectId = await ctx.db.insert("clientProjects", {
      clientId,
      name: projectNameFrom(row.brief, row.name),
      description: row.brief,
      status: "planning",
      targetLaunch: args.deliveryDate,
      createdAt: now,
    });

    await ctx.db.patch(args.id, {
      approvedAt: now,
      deliveryDate: args.deliveryDate,
      status: "awaiting_payment",
      clientId,
      projectId,
      leadId: lead?._id,
    });

    // The enquiry is now a job. Marking it here rather than expecting me to
    // remember means the leads list stops showing work already underway.
    if (lead && lead.status !== "won") {
      await ctx.db.patch(lead._id, { status: "won" });
    }

    return { clientId, projectId };
  },
});

/**
 * A project name from the brief's first line.
 *
 * The request form asks for a brief, not a project name — asking for both
 * would be asking the same question twice. The first sentence is almost
 * always what the thing is ("Two page site for a coffee roastery"), which
 * makes a better label than anything I would type. Falls back to their name
 * so the project is never nameless.
 */
function projectNameFrom(brief: string, name: string): string {
  const firstLine = brief.trim().split(/[\n.]/)[0]?.trim() ?? "";
  if (firstLine.length >= 3 && firstLine.length <= 80) return firstLine;
  if (firstLine.length > 80) return `${firstLine.slice(0, 77).trimEnd()}…`;
  return `${name}'s project`;
}

/**
 * Everything a decision email needs, including the address.
 *
 * Separate from byToken, which deliberately withholds the email so a leaked
 * token cannot be used to read it back. This one is admin-gated and called
 * from the approve and decline routes on the server.
 */
export const forDecisionEmail = query({
  args: { id: v.id("expressBuilds") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const row = await ctx.db.get(args.id);
    if (!row) return null;

    return {
      name: row.name,
      email: row.email,
      token: row.token,
      currency: row.currency,
      depositAmount: row.depositAmount,
      balanceAmount: row.balanceAmount,
      plan: row.plan ?? "express",
      deliveryDate: row.deliveryDate ?? null,
      declineNote: row.declineNote ?? null,
      portalEmailSentAt: row.portalEmailSentAt ?? null,
      decisionEmailSentAt: row.decisionEmailSentAt ?? null,
    };
  },
});

/**
 * Records that the portal link went out.
 *
 * Stamped by the route after Resend accepts it, not by `approve` — approving
 * and successfully emailing are two different things, and marking it sent
 * when it was not is how a client ends up waiting on an email nobody will
 * ever resend.
 */
export const markPortalEmailSent = mutation({
  args: { id: v.id("expressBuilds") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { portalEmailSentAt: Date.now() });
  },
});

/** Same, for the decline email. */
export const markDecisionEmailSent = mutation({
  args: { id: v.id("expressBuilds") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { decisionEmailSentAt: Date.now() });
  },
});

/** Turns a brief down. They keep the portal link; it just says no. */
export const decline = mutation({
  args: { id: v.id("expressBuilds"), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("No such build.");

    const note = args.note?.trim().slice(0, 1000);
    await ctx.db.patch(args.id, {
      declinedAt: Date.now(),
      status: "declined",
      // Stored as well as emailed, so the portal shows the same reason the
      // email gave. Someone who deletes the email should not lose the answer.
      declineNote: note || undefined,
    });

    /*
     * Close the enquiry too.
     *
     * No client and no project are created — declining is the path where
     * nothing downstream should exist. But the lead has to stop showing as
     * open, or the leads list keeps asking me to chase something I have
     * already said no to.
     */
    const email = row.email.trim().toLowerCase();
    const lead =
      row.leadId != null
        ? await ctx.db.get(row.leadId)
        : (
            await ctx.db
              .query("leads")
              .withIndex("by_email", (q) => q.eq("email", email))
              .order("desc")
              .take(1)
          )[0];

    if (lead && lead.status !== "lost") {
      await ctx.db.patch(lead._id, { status: "lost" });
      await ctx.db.patch(args.id, { leadId: lead._id });
    }
  },
});

/**
 * Starts the clock. Called from the payment path, not by hand.
 *
 * dueAt is stored rather than computed on read: the countdown they watch and
 * the deadline I am judged against have to be the same instant, and a derived
 * value would shift if WINDOW_MS ever changed mid-build.
 *
 * Express only. Other plans count down to the agreed deliveryDate, which is
 * already set at approval and does not move when money arrives.
 */
async function startClock(ctx: MutationCtx, row: Doc<"expressBuilds">) {
  const now = Date.now();
  const isExpress = (row.plan ?? "express") === "express";
  await ctx.db.patch(row._id, {
    acceptedAt: now,
    ...(isExpress ? { dueAt: now + WINDOW_MS } : {}),
    status: "building",
  });

  /*
   * The project moves with the request.
   *
   * Approving created it as `planning`; money arriving is what makes it real
   * work. Leaving it behind would give the client a portal saying "building"
   * next to a project saying "planning" — the same job in two states.
   */
  if (row.projectId) {
    await ctx.db.patch(row.projectId, {
      status: "active",
      startedAt: now,
    });
  }
}

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

    /*
     * The deadline this is judged against.
     *
     * Express has a computed dueAt; every other plan has the delivery date
     * agreed at approval. A plan with neither has no deadline to miss, so it
     * cannot be late — which is different from being on time, and the reason
     * this is a null check rather than a default of "now".
     */
    const deadline = row.dueAt ?? row.deliveryDate ?? null;
    if (!row.acceptedAt) throw new Error("This build was never started.");

    const now = Date.now();
    const late = deadline !== null && now > deadline;

    await ctx.db.patch(args.id, {
      deliveredAt: now,
      deliveredUrl: args.url.trim().slice(0, 500),
      status: "delivered",
      balanceWaived: late,
    });

    // The project is finished too. Without this the client's portal lists a
    // delivered site under a project still marked active.
    if (row.projectId) {
      await ctx.db.patch(row.projectId, { status: "complete" });
    }

    return {
      late,
      minutesLate: late && deadline ? Math.round((now - deadline) / 60_000) : 0,
    };
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

/**
 * Marks the deposit paid by hand, with no Stripe involved.
 *
 * Two reasons this exists rather than being a test-only shim:
 *
 * 1. Testing. The whole flow — accept, clock, deliver, late-waiver — is
 *    unreachable until a row leaves awaiting_payment, and paying $35 to
 *    check a countdown is a bad trade.
 * 2. It happens for real. Someone pays by transfer, or in person, or the
 *    webhook drops one. Without this the order is stuck forever and the
 *    only fix is editing the database directly.
 *
 * Admin-gated, and it records HOW it was marked. `manual: true` means the
 * money was not seen by Stripe, which matters when reconciling later — an
 * unmarked manual payment is indistinguishable from one that actually
 * cleared.
 */
export const markDepositPaidManually = mutation({
  args: { id: v.id("expressBuilds"), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("No such build.");
    if (row.depositPaidAt) return;

    await ctx.db.patch(args.id, {
      depositPaidAt: Date.now(),
      manualPayment: true,
      manualNote: args.note?.trim().slice(0, 200),
    });
    // Same rule as a card payment: money in starts the clock. A transfer
    // behaving differently from a card is a difference nobody would predict.
    await startClock(ctx, row);
  },
});


export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("expressBuilds").order("desc").take(100);

    /*
     * Waiting on me first.
     *
     * pending_approval outranks everything because it is the only state where
     * nothing happens until I act — a brief sitting unread is a client
     * waiting with no clock and no way to pay. building comes next since it
     * is running down, then awaiting_payment, which is their move rather than
     * mine.
     *
     * `queued` is ranked alongside building rather than dropped: no new row
     * reaches it now that payment starts the clock directly, but rows created
     * before that change can still be sitting in it, and an unranked status
     * would sort them in with the finished work where I would never see them.
     */
    const rank = (s: string) =>
      s === "pending_approval"
        ? 0
        : s === "queued" || s === "building"
          ? 1
          : s === "awaiting_payment"
            ? 2
            : 3;

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

/**
 * Deletes a request and everything it created.
 *
 * Cascading, because approving a request mints records elsewhere — a client,
 * a project, its milestones and messages, the chat thread. Deleting only the
 * request left all of those behind as rows nothing points at, and the client
 * still holding a portal link that resolves to "Nothing here".
 *
 * The client row is only removed if this request is the ONLY thing they have.
 * Someone on their third project must not lose the other two because I tidied
 * up a duplicate enquiry.
 */
export const remove = mutation({
  args: { id: v.id("expressBuilds") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const row = await ctx.db.get(args.id);
    if (!row) return;

    // The chat thread for this request.
    const messages = await ctx.db
      .query("buildMessages")
      .withIndex("by_build", (q) => q.eq("buildId", args.id))
      .collect();
    for (const m of messages) await ctx.db.delete(m._id);

    /*
     * The balance invoice raised for this build, if there was one.
     *
     * Left behind, it outlives the thing it was for: it stays payable at
     * /invoice/<token> — getByToken is public by design, so the link keeps
     * working — and keeps counting toward the outstanding total on the
     * dashboard. A deleted request that still asks to be paid is worse than
     * either outcome on its own.
     */
    if (row.invoiceId) await ctx.db.delete(row.invoiceId);

    if (row.projectId) {
      // Rows hanging off the project, then the project itself.
      for (const table of ["milestones", "deliverables", "portalMessages"] as const) {
        const rows = await ctx.db
          .query(table)
          .withIndex("by_project", (q) => q.eq("projectId", row.projectId!))
          .collect();
        for (const r of rows) await ctx.db.delete(r._id);
      }
      await ctx.db.delete(row.projectId);
    }

    /*
     * The client, only when nothing else of theirs survives.
     *
     * Checked after the project is gone, so a client whose sole project was
     * this one is removed and a client with others is left intact.
     */
    if (row.clientId) {
      const remaining = await ctx.db
        .query("clientProjects")
        .withIndex("by_client", (q) => q.eq("clientId", row.clientId!))
        .collect();
      if (remaining.length === 0) {
        await ctx.db.delete(row.clientId);
      }
    }

    await ctx.db.delete(args.id);
  },
});

/* ---------------------------------------------------------------- chat --- */

/**
 * The thread for a build, by portal token.
 *
 * Token-scoped rather than admin-gated: this is the client's own view, and
 * they have no account. Anyone holding the token is the client by definition
 * — the token IS the credential, which is why it is 24 random characters and
 * never appears in a URL we publish.
 */
export const messages = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const build = await ctx.db
      .query("expressBuilds")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!build) return [];

    return await ctx.db
      .query("buildMessages")
      .withIndex("by_build", (q) => q.eq("buildId", build._id))
      .collect();
  },
});

/** The client writes. Rate-limited by length rather than by count. */
export const sendMessage = mutation({
  args: { token: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    const body = args.body.trim().slice(0, 2000);
    if (!body) return;

    const build = await ctx.db
      .query("expressBuilds")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!build) throw new Error("No such build.");

    await ctx.db.insert("buildMessages", {
      buildId: build._id,
      fromClient: true,
      body,
      createdAt: Date.now(),
    });

    /*
     * Flag it so I actually find out.
     *
     * Cleared rather than set: the notification sweep looks for a message
     * newer than messageNotifiedAt, so blanking it marks this thread as
     * needing a nudge. Without this, a client asking "can the logo be bigger?"
     * during a two-hour build waits until I next happen to open the admin —
     * which on a two-hour build is the whole build.
     */
    await ctx.db.patch(build._id, { messageNotifiedAt: undefined });
  },
});

/** My side. Admin-gated, keyed by id rather than token. */
export const replyMessage = mutation({
  args: { id: v.id("expressBuilds"), body: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const body = args.body.trim().slice(0, 2000);
    if (!body) return;

    await ctx.db.insert("buildMessages", {
      buildId: args.id,
      fromClient: false,
      body,
      createdAt: Date.now(),
    });
  },
});

/** Admin view of one thread. */
export const threadFor = query({
  args: { id: v.id("expressBuilds") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("buildMessages")
      .withIndex("by_build", (q) => q.eq("buildId", args.id))
      .collect();
  },
});

/**
 * Marks the other side's messages read.
 *
 * `fromClient` picks the direction: the client clears MY replies, I clear
 * THEIRS. Nobody marks their own messages read, which is why the caller does
 * not get to choose the flag — it falls out of which entry point they used.
 *
 * Already-read rows are skipped rather than re-stamped, so the timestamp is
 * when it was first seen rather than when the tab was last open.
 */
async function markRead(
  ctx: MutationCtx,
  buildId: Id<"expressBuilds">,
  fromClient: boolean,
) {
  const unread = await ctx.db
    .query("buildMessages")
    .withIndex("by_build", (q) => q.eq("buildId", buildId))
    .collect();

  const now = Date.now();
  for (const m of unread) {
    if (m.fromClient === fromClient && !m.readAt) {
      await ctx.db.patch(m._id, { readAt: now });
    }
  }
}

/** The client has looked at the thread, so my replies are no longer unread. */
export const markMessagesRead = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const build = await ctx.db
      .query("expressBuilds")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!build) return;
    await markRead(ctx, build._id, false);
  },
});

/** I have looked at the thread, so their messages are no longer unread. */
export const markThreadRead = mutation({
  args: { id: v.id("expressBuilds") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await markRead(ctx, args.id, true);
  },
});

/**
 * Posts the work-in-progress link.
 *
 * Separate from `deliver`, which ends the job and settles the balance. This
 * is for "here is what I have so far" — the client can watch it take shape
 * without that counting as delivery.
 */
export const setPreviewUrl = mutation({
  args: { id: v.id("expressBuilds"), url: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, {
      previewUrl: args.url.trim().slice(0, 500) || undefined,
    });
  },
});

/* ------------------------------------------------------------- intake --- */

/**
 * Prices, in minor units, matching src/lib/pricing.ts.
 *
 * Duplicated here rather than imported because Convex functions cannot reach
 * into src/. The risk is drift, so it is one table with one job: if a figure
 * moves in pricing.ts it moves here, and the deposit is derived rather than
 * stored twice.
 *
 * Enterprise and revive are deliberately absent. Both are scoped before they
 * are quoted, so a request from either arrives with no figure attached and I
 * set one when I approve it — putting a guess on the record would mean
 * showing a client a price nobody agreed to.
 */
const PLAN_TOTAL_MINOR: Record<string, number> = {
  "one-page": 40_000,
  "multi-page": 75_000,
  "web-app": 250_000,
  native: 320_000,
  support: 18_000,
  express: EXPRESS_TOTAL,
};

/**
 * Turns a submitted enquiry into a request in the inbox.
 *
 * Called by the lead route straight after the lead is saved, so every
 * enquiry lands somewhere I can accept or decline it. Before this, a form
 * submission went only to the leads list — which had no accept, no decline
 * and no email — and the request inbox only ever saw express orders.
 *
 * The lead row is still written and still scored. This does not replace it:
 * a lead is a person who asked, a request is the job they asked for, and
 * declining the job should not delete the fact that they enquired.
 */
export const createFromLead = mutation({
  args: {
    secret: v.string(),
    leadId: v.id("leads"),
    name: v.string(),
    email: v.string(),
    company: v.optional(v.string()),
    brief: v.string(),
    plan: v.string(),
    pages: v.optional(v.number()),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const expected = process.env.EMAIL_LOG_SECRET;
    if (!expected || args.secret !== expected) throw new Error("Not authorised.");

    const email = args.email.trim().toLowerCase().slice(0, 254);
    const brief = args.brief.trim().slice(0, 4000);
    if (!brief) return null;

    /*
     * One open request per person.
     *
     * Someone who fills the form twice — a correction, a second thought — is
     * not two jobs, and two rows would mean two portals and two decisions for
     * one conversation. An already-decided request is left alone, so a client
     * coming back after a decline does get a fresh one.
     */
    const existing = await ctx.db
      .query("expressBuilds")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();
    const open = existing.find(
      (r) => r.status === "pending_approval" || r.status === "awaiting_payment",
    );
    if (open) {
      await ctx.db.patch(open._id, { brief, leadId: args.leadId });
      return { id: open._id, token: open.token, reused: true };
    }

    const total = PLAN_TOTAL_MINOR[args.plan] ?? 0;
    // 40% up front, the same split every other plan uses. A zero total
    // (enterprise, revive) yields a zero deposit, which is correct: there is
    // nothing to pay until the scope call produces a figure.
    const deposit = Math.round(total * DEPOSIT_SHARE);

    const token = makeToken();
    const id = await ctx.db.insert("expressBuilds", {
      name: args.name.trim().slice(0, 120),
      email,
      company: args.company?.trim().slice(0, 160),
      brief,
      // Pages only means something for the page-based plans; elsewhere it is
      // a column this table happens to have.
      pages: Math.min(9, Math.max(1, Math.round(args.pages ?? 1))),
      plan: args.plan,
      status: "pending_approval",
      depositAmount: deposit,
      balanceAmount: total - deposit,
      currency: (args.currency ?? "usd").toLowerCase(),
      token,
      leadId: args.leadId,
      createdAt: Date.now(),
    });

    return { id, token, reused: false };
  },
});

/* -------------------------------------------------------- testimonial --- */

/**
 * Mints the testimonial invitation for a finished build.
 *
 * Asked from inside the portal while it is still open, rather than emailed
 * weeks later: the moment someone has just received work they are happy with
 * is the only moment they will write about it. A request that arrives after
 * the portal closes arrives after they have moved on.
 *
 * Optional, always. A testimonial extracted as a condition of delivery is
 * worth nothing to either of us.
 */
export const inviteTestimonial = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("expressBuilds")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!row) return null;
    // Only for work actually finished. Nothing else has anything to review.
    if (row.status !== "delivered") return null;
    if (row.testimonialToken) return { token: row.testimonialToken };

    const testimonialToken = makeToken();
    await ctx.db.insert("testimonials", {
      author: row.name,
      quote: "",
      featured: false,
      order: 999,
      approved: false,
      requestToken: testimonialToken,
    });

    await ctx.db.patch(row._id, {
      testimonialToken,
      testimonialAskedAt: Date.now(),
    });
    return { token: testimonialToken };
  },
});

/**
 * Every client who has ever paid or been worked for.
 *
 * Reads from the request rows rather than a separate ledger: the request IS
 * the record of the engagement, and a second table would be a second thing to
 * keep in step. Ordered by most recent activity, since that is how I look for
 * someone — "the roastery, a few weeks ago" rather than by name.
 */
export const customerLog = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("expressBuilds").order("desc").take(500);

    return rows
      .filter((r) => r.depositPaidAt || r.paymentSkipped || r.acceptedAt)
      .map((r) => ({
        _id: r._id,
        name: r.name,
        email: r.email,
        company: r.company ?? null,
        plan: r.plan ?? "express",
        status: r.status,
        token: r.token,
        paid: (r.depositPaidAt ? r.depositAmount : 0) +
          (r.balancePaidAt ? r.balanceAmount : 0),
        currency: r.currency,
        paymentSkipped: r.paymentSkipped ?? false,
        balanceWaived: r.balanceWaived ?? false,
        deliveredAt: r.deliveredAt ?? null,
        lastActivity: r.deliveredAt ?? r.acceptedAt ?? r.createdAt,
      }));
  },
});
