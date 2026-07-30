import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

/**
 * Feedback from the footer form.
 *
 * Public write, admin read. The write is deliberately narrow: three short
 * fields, length-capped, with no way to set `read` or `createdAt` from the
 * caller — an open mutation that accepts arbitrary fields is a free database.
 */

const MAX_NAME = 120;
const MAX_EMAIL = 254;
const MAX_MESSAGE = 4000;

export const submit = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    message: v.string(),
    path: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim().slice(0, MAX_NAME);
    const email = args.email.trim().toLowerCase().slice(0, MAX_EMAIL);
    const message = args.message.trim().slice(0, MAX_MESSAGE);

    if (!name || !message) {
      throw new Error("A name and a message are required.");
    }
    // Same shape check as the lead form. Deliberately loose — the only thing
    // worth rejecting here is an obvious non-address.
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new Error("A valid email address is required.");
    }

    await ctx.db.insert("siteFeedback", {
      name,
      email,
      message,
      path: args.path?.slice(0, 200),
      read: false,
      createdAt: Date.now(),
    });

    return { ok: true as const };
  },
});

/** Admin list, newest first. Unread before read. */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("siteFeedback").order("desc").take(200);
    return rows.sort((a, b) => {
      if (a.read !== b.read) return a.read ? 1 : -1;
      return b.createdAt - a.createdAt;
    });
  },
});

export const markRead = mutation({
  args: { id: v.id("siteFeedback"), read: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { read: args.read });
  },
});

export const remove = mutation({
  args: { id: v.id("siteFeedback") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});
