import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";

const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

/** Same shape as the tokens elsewhere: unguessable, and safe in a URL. */
function makeToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/**
 * A human reference for the invoice, of the form INV-BAL-XXXX.
 *
 * Quoted by clients in emails and bank transfers, so it has to be short
 * enough to read aloud and distinct enough not to be confused with another.
 */
function makeReference(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes, (b) =>
    ALPHABET[b % ALPHABET.length].toUpperCase(),
  ).join("");
  return `INV-BAL-${suffix}`;
}

/**
 * The parts of the flow that run without me.
 *
 * Approving or declining a request is the one decision that needs a human.
 * Everything after it is bookkeeping on a timer, and bookkeeping I have to
 * remember to do is bookkeeping that eventually does not happen — a missed
 * deadline nobody notices, an invoice never raised, a client waiting on a
 * reply to a message I never saw.
 *
 * Three rules hold for every sweep here:
 *
 * 1. THE STAMP IS WRITTEN WITH THE EFFECT. Crons have no memory; they run on
 *    a timer and see the same rows again. Each job marks the row it acted on
 *    in the same mutation that applies the change, so a job that dies partway
 *    cannot leave the effect applied and the row unmarked — which would email
 *    the same client every five minutes forever.
 *
 * 2. MONEY DECISIONS ARE WRITTEN DOWN, NOT DERIVED. The overdue sweep sets
 *    balanceWaived rather than letting the portal infer lateness on read. The
 *    answer to "does this client owe me money" must not change because a
 *    constant moved.
 *
 * 3. SENDING IS SOMEONE ELSE'S JOB. Convex cannot send email. These mutations
 *    decide WHAT should happen and record it; a Next route reads the queue and
 *    sends. A failed send therefore leaves a retryable row rather than a
 *    silently-skipped client.
 */

/** Deposit unpaid this long after approval → remind them. */
const REMIND_AFTER_MS = 48 * 60 * 60 * 1000;

/** Still unpaid this long after approval → let it go. */
const EXPIRE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------- overdue --- */

/**
 * A deadline passed with nothing delivered.
 *
 * This is the promise the express build is sold on: miss the window and the
 * balance is written off. It has to be automatic, because the one person who
 * must not be relied upon to notice that I am late is me.
 *
 * Applies to any plan with a deadline — express counts to dueAt, other plans
 * to the delivery date agreed at approval.
 */
export const sweepOverdue = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const building = await ctx.db
      .query("expressBuilds")
      .withIndex("by_status", (q) => q.eq("status", "building"))
      .take(200);

    const waived = [];
    for (const row of building) {
      if (row.overdueHandledAt) continue;

      const deadline = row.dueAt ?? row.deliveryDate ?? null;
      if (deadline === null || now <= deadline) continue;

      await ctx.db.patch(row._id, {
        balanceWaived: true,
        overdueHandledAt: now,
      });
      waived.push({ id: row._id, token: row.token, name: row.name });
    }

    return { waived: waived.length, rows: waived };
  },
});

/* -------------------------------------------------------------- unpaid --- */

/**
 * Approved but never paid for.
 *
 * Two stages rather than one. A reminder at 48 hours catches the common case
 * — the email got buried — and expiry at seven days stops the list filling
 * with requests nobody is going to act on. Expiring silently would be worse
 * than not expiring: the client believes they still have a live quote.
 */
export const sweepUnpaid = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const awaiting = await ctx.db
      .query("expressBuilds")
      .withIndex("by_status", (q) => q.eq("status", "awaiting_payment"))
      .take(200);

    const remind = [];
    const expire = [];

    for (const row of awaiting) {
      const since = now - (row.approvedAt ?? row.createdAt);

      if (since >= EXPIRE_AFTER_MS && !row.expiredAt) {
        await ctx.db.patch(row._id, { status: "expired", expiredAt: now });
        expire.push({ id: row._id, token: row.token, name: row.name });
        continue;
      }

      if (since >= REMIND_AFTER_MS && !row.reminderSentAt) {
        await ctx.db.patch(row._id, { reminderSentAt: now });
        remind.push({ id: row._id, token: row.token, name: row.name });
      }
    }

    return { reminded: remind.length, expired: expire.length, remind, expire };
  },
});

/* ------------------------------------------------------------- invoice --- */

/**
 * A balance still unpaid well after delivery → raise a formal invoice.
 *
 * Delayed rather than immediate, because the portal collects the balance
 * itself now: the site is released when they pay, so most people pay within
 * minutes of the delivery email. Invoicing at the same moment would put a
 * bill in someone's inbox for money they are already paying on screen.
 *
 * This is the fallback for the ones who do not — a formal invoice with a
 * reference they can send to their finance team.
 *
 * Waived balances are skipped, which is the whole point of the waiver: being
 * late must not still generate a bill.
 */
const INVOICE_AFTER_MS = 72 * 60 * 60 * 1000;

export const sweepInvoices = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const delivered = await ctx.db
      .query("expressBuilds")
      .withIndex("by_status", (q) => q.eq("status", "delivered"))
      .take(200);

    const due = [];
    for (const row of delivered) {
      if (row.invoiceIssuedAt) continue;
      if (row.balanceWaived) continue;
      if (row.balancePaidAt) continue;
      if (row.balanceAmount <= 0) continue;
      // Give the in-portal payment a chance first.
      if (now - (row.deliveredAt ?? now) < INVOICE_AFTER_MS) continue;

      await ctx.db.patch(row._id, { invoiceIssuedAt: Date.now() });
      due.push({
        id: row._id,
        token: row.token,
        name: row.name,
        amount: row.balanceAmount,
        currency: row.currency,
      });
    }

    return { issued: due.length, rows: due };
  },
});

/* ---------------------------------------------------------- send queue --- */

/**
 * Rows a sweep has acted on that still need an email sent.
 *
 * Read by the Next cron route, which is the only side that can talk to
 * Resend. Kept as a query over the stamps rather than a separate queue table:
 * the stamp already records that the thing happened, and a second table would
 * be a second thing to keep in step with the first.
 */
async function collectNotifications(ctx: QueryCtx) {
    const out: {
      id: Id<"expressBuilds">;
      kind: "overdue" | "reminder" | "expired";
      token: string;
      name: string;
      email: string;
      currency: string;
      balanceAmount: number;
      depositAmount: number;
      isExpress: boolean;
    }[] = [];

    // Shaped from the row rather than passed whole: the queue crosses into a
    // Next route, and a build row carries a brief and internal stamps that a
    // send job has no business receiving.
    const shape = (r: Doc<"expressBuilds">) => ({
      id: r._id,
      token: r.token,
      name: r.name,
      email: r.email,
      currency: r.currency,
      balanceAmount: r.balanceAmount,
      depositAmount: r.depositAmount,
      isExpress: (r.plan ?? "express") === "express",
    });

    for (const status of ["building", "awaiting_payment", "expired"] as const) {
      const rows = await ctx.db
        .query("expressBuilds")
        .withIndex("by_status", (q) => q.eq("status", status))
        .take(200);

      for (const r of rows) {
        if (r.overdueHandledAt && !r.overdueEmailSentAt) {
          out.push({ ...shape(r), kind: "overdue" });
        } else if (r.expiredAt && !r.expiredEmailSentAt) {
          out.push({ ...shape(r), kind: "expired" });
        } else if (r.reminderSentAt && !r.reminderEmailSentAt) {
          out.push({ ...shape(r), kind: "reminder" });
        }
      }
    }

    return out;
}

export const pendingNotifications = internalQuery({
  args: {},
  handler: async (ctx) => await collectNotifications(ctx),
});

/**
 * Requests whose balance invoice still has to be raised in Stripe.
 *
 * `sweepInvoices` has already stamped these, which is what stops a second
 * sweep picking them up; this returns the detail the Next route needs to
 * actually create the invoice. The stamp being set before the Stripe call
 * succeeds is deliberate — a duplicate invoice demanding money twice is a
 * worse failure than an invoice that has to be raised by hand.
 */
async function collectInvoices(ctx: QueryCtx) {
    const rows = await ctx.db
      .query("expressBuilds")
      .withIndex("by_status", (q) => q.eq("status", "delivered"))
      .take(200);

    return rows
      .filter((r) => r.invoiceIssuedAt && !r.invoiceId && !r.balanceWaived)
      .map((r) => ({
        id: r._id,
        name: r.name,
        email: r.email,
        brief: r.brief,
        amount: r.balanceAmount,
        currency: r.currency,
        plan: r.plan ?? "express",
        leadId: r.leadId ?? null,
      }));
}

export const pendingInvoices = internalQuery({
  args: {},
  handler: async (ctx) => await collectInvoices(ctx),
});

/**
 * Raises the balance invoice for a delivered request.
 *
 * Secret-gated rather than admin-gated: the caller is a cron route acting on
 * my behalf, with no browser session to check.
 *
 * One invoice, not a pair. `invoices.createPair` splits a project 40/60 up
 * front; by the time this runs the deposit is long paid and only the balance
 * is outstanding, so raising a second deposit line would bill for money
 * already received.
 */
async function applyRaiseInvoice(ctx: MutationCtx, id: Id<"expressBuilds">) {
  const token = makeToken();
  const reference = makeReference();

    const row = await ctx.db.get(id);
    if (!row) throw new Error("No such request.");
    // Re-checked here, not just in the query: the waiver may have landed
    // between the sweep stamping this and the route getting to it.
    if (row.balanceWaived || row.invoiceId) return null;

    const invoiceId = await ctx.db.insert("invoices", {
      leadId: row.leadId ?? undefined,
      clientName: row.name,
      clientEmail: row.email,
      description: `Balance — ${row.brief.trim().split(/[\n.]/)[0]?.trim() ?? "project"}`,
      amount: row.balanceAmount,
      currency: row.currency,
      stage: "balance",
      tier: row.plan ?? "express",
      status: "sent",
      token: token,
      reference: reference,
      issuedAt: Date.now(),
    });

    await ctx.db.patch(id, { invoiceId });
    return { invoiceId };
}

export const raiseBalanceInvoice = internalMutation({
  args: { id: v.id("expressBuilds") },
  handler: async (ctx, args) => await applyRaiseInvoice(ctx, args.id),
});

/** Marks a notification as delivered so it is not sent twice. */
async function applyNotified(ctx: MutationCtx, id: Id<"expressBuilds">, kind: string) {
    const field =
      kind === "overdue"
        ? "overdueEmailSentAt"
        : kind === "reminder"
          ? "reminderEmailSentAt"
          : kind === "expired"
            ? "expiredEmailSentAt"
            : null;
    if (!field) throw new Error(`Unknown notification kind: ${kind}`);
    await ctx.db.patch(id, { [field]: Date.now() });
}

export const markNotified = internalMutation({
  args: { id: v.id("expressBuilds"), kind: v.string() },
  handler: async (ctx, args) => await applyNotified(ctx, args.id, args.kind),
});

/* ------------------------------------------------- server-route access --- */

/**
 * Secret-gated wrappers, for the Next cron route.
 *
 * The queues above are `internal` so nothing on the public API can read a
 * client's email address or trigger a send. But the one caller that must
 * reach them — the cron route — is a server handler with no browser session
 * to authenticate, so it presents the same shared secret the Stripe webhook
 * uses for its privileged mutations.
 *
 * Thin on purpose: these check the secret and delegate. Any logic that lived
 * here would be logic the internal version did not have.
 */
function assertSecret(secret: string) {
  const expected = process.env.EMAIL_LOG_SECRET;
  if (!expected || secret !== expected) throw new Error("Not authorised.");
}

export const pendingNotificationsPublic = query({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    assertSecret(args.secret);
    return await collectNotifications(ctx);
  },
});

export const markNotifiedPublic = mutation({
  args: { secret: v.string(), id: v.id("expressBuilds"), kind: v.string() },
  handler: async (ctx, args) => {
    assertSecret(args.secret);
    await applyNotified(ctx, args.id, args.kind);
  },
});

export const pendingInvoicesPublic = query({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    assertSecret(args.secret);
    return await collectInvoices(ctx);
  },
});

export const raiseBalanceInvoicePublic = mutation({
  args: { secret: v.string(), id: v.id("expressBuilds") },
  handler: async (ctx, args) => {
    assertSecret(args.secret);
    return await applyRaiseInvoice(ctx, args.id);
  },
});
