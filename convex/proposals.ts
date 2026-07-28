import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";
import { proposalStatus } from "./schema";

export const listByStatus = query({
  args: { status: v.optional(proposalStatus) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.status === undefined) {
      return await ctx.db.query("proposals").order("desc").collect();
    }
    const status = args.status;
    return await ctx.db
      .query("proposals")
      .withIndex("by_status", (q) => q.eq("status", status))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    leadId: v.id("leads"),
    tier: v.optional(v.string()),
    amount: v.number(),
    currency: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("proposals", { ...args, status: "draft" });
  },
});

export const setStatus = mutation({
  args: { id: v.id("proposals"), status: proposalStatus },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, {
      status: args.status,
      ...(args.status === "sent" ? { sentAt: Date.now() } : {}),
      ...(args.status === "signed" ? { signedAt: Date.now() } : {}),
    });
  },
});

/** 128 bits. The token is the only credential on a hosted proposal. */
function makeToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Public read by token, and it records the first open.
 *
 * viewedAt is set once and never reset, so "sent but never opened" and "read
 * and ignored" stay distinguishable — silence means different things and
 * should be answered differently.
 */
export const getByToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const proposal = await ctx.db
      .query("proposals")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    // A draft is not viewable; nothing should confirm a near-miss token.
    if (!proposal || proposal.status === "draft") return null;

    if (!proposal.viewedAt) {
      await ctx.db.patch(proposal._id, { viewedAt: Date.now() });
    }

    return proposal;
  },
});

/** Client responds. Public by necessity — the token is the credential. */
export const respond = mutation({
  args: {
    token: v.string(),
    action: v.union(
      v.literal("accept"),
      v.literal("decline"),
      v.literal("changes"),
    ),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const proposal = await ctx.db
      .query("proposals")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!proposal || proposal.status === "draft") return { ok: false as const };

    if (args.action === "accept") {
      await ctx.db.patch(proposal._id, {
        status: "signed",
        acceptedAt: Date.now(),
      });
    } else if (args.action === "decline") {
      await ctx.db.patch(proposal._id, {
        status: "lost",
        declinedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(proposal._id, {
        changeRequest: args.message?.slice(0, 4000),
      });
    }

    return { ok: true as const };
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("proposals").order("desc").take(200);
  },
});

export const upsert = mutation({
  args: {
    id: v.optional(v.id("proposals")),
    leadId: v.id("leads"),
    clientName: v.optional(v.string()),
    clientEmail: v.optional(v.string()),
    tier: v.optional(v.string()),
    amount: v.number(),
    currency: v.string(),
    understanding: v.optional(v.string()),
    scope: v.optional(v.string()),
    excluded: v.optional(v.string()),
    timeline: v.optional(v.string()),
    paymentTerms: v.optional(v.string()),
    assumptions: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);

    if (id) {
      await ctx.db.patch(id, fields);
      return id;
    }

    return await ctx.db.insert("proposals", {
      ...fields,
      status: "draft",
      token: makeToken(),
    });
  },
});

/** Issues the proposal, which is what makes the hosted link live. */
export const send = mutation({
  args: { id: v.id("proposals") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { status: "sent", sentAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("proposals") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});
