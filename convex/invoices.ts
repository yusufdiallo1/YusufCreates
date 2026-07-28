import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";

/**
 * Invoices — bank transfer, split 50% deposit and 50% on completion.
 *
 * Bank details never appear on a public route. Each invoice carries an
 * unguessable token and is reachable only at /invoice/<token>, which is
 * noindex and emailed directly to the client. Published account details get
 * scraped, and a public page makes impersonating an invoice trivial.
 */

const invoiceStatus = v.union(
  v.literal("draft"),
  v.literal("sent"),
  v.literal("paid"),
  v.literal("overdue"),
  v.literal("void"),
);

/** 128 bits of entropy, URL-safe. Not guessable by enumeration. */
function makeToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Human-readable reference the client quotes on the transfer. */
function makeReference(stage: "deposit" | "balance"): string {
  const n = Math.floor(Math.random() * 9000) + 1000;
  return `YC-${stage === "deposit" ? "D" : "B"}${n}`;
}

/**
 * Public read, by token only.
 *
 * There is deliberately no unauthenticated query that lists invoices or looks
 * one up by client name or email — the token is the only key.
 */
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invoice = await ctx.db
      .query("invoices")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    // A draft or voided invoice must not be payable.
    if (!invoice) return null;
    if (invoice.status === "draft" || invoice.status === "void") return null;

    return invoice;
  },
});

/**
 * Client confirms they have sent the transfer.
 *
 * Records intent, not receipt — only the admin marks an invoice paid, after
 * the money lands. Anyone holding the link can call this, which is acceptable:
 * the worst case is a false "sent" flag, reconciled against the bank anyway.
 */
export const markSent = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invoice = await ctx.db
      .query("invoices")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!invoice || invoice.status !== "sent") return null;
    await ctx.db.patch(invoice._id, { markedSentAt: Date.now() });
    return invoice._id;
  },
});

export const listByStatus = query({
  args: { status: v.optional(invoiceStatus) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.status === undefined) {
      return await ctx.db.query("invoices").order("desc").collect();
    }
    const status = args.status;
    return await ctx.db
      .query("invoices")
      .withIndex("by_status", (q) => q.eq("status", status))
      .order("desc")
      .collect();
  },
});

/**
 * Creates both instalments at once, so a half-invoiced project cannot exist.
 * The deposit is issued immediately; the balance stays draft until delivery.
 */
export const createPair = mutation({
  args: {
    leadId: v.optional(v.id("leads")),
    projectId: v.optional(v.id("projects")),
    clientName: v.string(),
    clientEmail: v.string(),
    description: v.string(),
    /** Full project value; each instalment is half. */
    amount: v.number(),
    currency: v.string(),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const half = Math.round(args.amount / 2);
    const stages: ("deposit" | "balance")[] = ["deposit", "balance"];
    const ids: string[] = [];

    for (const stage of stages) {
      ids.push(
        await ctx.db.insert("invoices", {
          leadId: args.leadId,
          projectId: args.projectId,
          clientName: args.clientName,
          clientEmail: args.clientEmail,
          description: args.description,
          amount: half,
          currency: args.currency,
          stage,
          status: stage === "deposit" ? "sent" : "draft",
          token: makeToken(),
          reference: makeReference(stage),
          dueDate: stage === "deposit" ? args.dueDate : undefined,
          issuedAt: stage === "deposit" ? Date.now() : undefined,
        }),
      );
    }

    return { depositId: ids[0], balanceId: ids[1] };
  },
});

/**
 * Records the Stripe invoice created for one of our invoices.
 *
 * Secret-gated rather than admin-gated: the caller is a server route handler
 * acting on the admin's behalf, not a browser session.
 */
export const attachStripe = mutation({
  args: {
    secret: v.string(),
    id: v.id("invoices"),
    stripeInvoiceId: v.string(),
    stripeCustomerId: v.string(),
    stripeHostedUrl: v.optional(v.string()),
    stripePdfUrl: v.optional(v.string()),
  },
  handler: async (ctx, { secret, id, ...fields }) => {
    requireServerSecret(secret);
    await ctx.db.patch(id, { ...fields, status: "sent", issuedAt: Date.now() });
  },
});

/**
 * Applies a Stripe webhook outcome.
 *
 * Idempotent by event id: Stripe retries deliveries, and applying a refund or
 * a payment twice silently corrupts the revenue figures. The guard and the
 * write happen in one transaction, so two concurrent deliveries of the same
 * event cannot both pass it.
 */
export const applyStripeEvent = mutation({
  args: {
    secret: v.string(),
    stripeEventId: v.string(),
    eventType: v.string(),
    stripeInvoiceId: v.string(),
    status: v.optional(
      v.union(
        v.literal("sent"),
        v.literal("paid"),
        v.literal("overdue"),
        v.literal("void"),
      ),
    ),
    amountReceived: v.optional(v.number()),
    stripeFee: v.optional(v.number()),
    netReceived: v.optional(v.number()),
    paymentMethodUsed: v.optional(
      v.union(
        v.literal("card"),
        v.literal("apple_pay"),
        v.literal("google_pay"),
        v.literal("link"),
      ),
    ),
    declineReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);

    const seen = await ctx.db
      .query("webhookEvents")
      .withIndex("by_event", (q) => q.eq("stripeEventId", args.stripeEventId))
      .unique();
    if (seen) return { duplicate: true as const };

    await ctx.db.insert("webhookEvents", {
      stripeEventId: args.stripeEventId,
      type: args.eventType,
      receivedAt: Date.now(),
    });

    const invoice = await ctx.db
      .query("invoices")
      .withIndex("by_stripe_invoice", (q) =>
        q.eq("stripeInvoiceId", args.stripeInvoiceId),
      )
      .unique();

    // The event is still recorded above, so a retry does not reprocess an
    // invoice that simply does not exist here.
    if (!invoice) return { duplicate: false as const, matched: false as const };

    await ctx.db.patch(invoice._id, {
      ...(args.status ? { status: args.status } : {}),
      ...(args.status === "paid" ? { paidAt: Date.now() } : {}),
      ...(args.amountReceived !== undefined
        ? { amountReceived: args.amountReceived }
        : {}),
      ...(args.stripeFee !== undefined ? { stripeFee: args.stripeFee } : {}),
      ...(args.netReceived !== undefined
        ? { netReceived: args.netReceived }
        : {}),
      ...(args.paymentMethodUsed
        ? { paymentMethodUsed: args.paymentMethodUsed }
        : {}),
      ...(args.declineReason ? { declineReason: args.declineReason } : {}),
    });

    return {
      duplicate: false as const,
      matched: true as const,
      clientEmail: invoice.clientEmail,
      clientName: invoice.clientName,
      reference: invoice.reference,
    };
  },
});

/** Shared gate for the server-to-server mutations above. */
function requireServerSecret(secret: string) {
  const expected = process.env.EMAIL_LOG_SECRET;
  // Fail closed: an unset secret denies everyone rather than admitting all.
  if (!expected || secret !== expected) {
    throw new Error("Not authorised.");
  }
}

/** Single invoice by id, for the issuing flow. */
export const getById = query({
  args: { id: v.id("invoices") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.get(args.id);
  },
});

export const setStatus = mutation({
  args: { id: v.id("invoices"), status: invoiceStatus },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, {
      status: args.status,
      ...(args.status === "paid" ? { paidAt: Date.now() } : {}),
      ...(args.status === "sent" ? { issuedAt: Date.now() } : {}),
    });
  },
});
