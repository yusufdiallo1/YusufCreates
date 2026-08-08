import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin, requireServerSecret } from "./lib/auth";

/**
 * Mail that arrived at the domain.
 *
 * Written by one caller only — src/app/api/email/inbound/route.ts, after it has
 * verified Resend's signature — and read only by the admin. Convex cannot reach
 * Resend and the API key must stay behind `server-only`, so the split is the
 * same one the notification outbox already uses: Next talks to Resend, Convex
 * holds the truth.
 *
 * The write is gated by EMAIL_LOG_SECRET rather than a session, because the
 * caller is a route handler with no browser behind it. Without that gate anyone
 * could forge correspondence from any address into my inbox, which is a good
 * deal worse than losing a message.
 *
 * Nothing here trusts its input. Every string is capped, and the body is stored
 * exactly as received and rendered as plain text — see the schema comment.
 */

const MAX_ADDRESS = 254;
const MAX_SUBJECT = 400;
const MAX_FILENAME = 300;
const MAX_MESSAGE_ID = 400;

/*
 * Convex documents have a hard 1MB ceiling and a mail body can exceed it —
 * a long thread quoted back at itself does it easily. Truncating is the right
 * failure: a message that arrived and is 100k long is readable, while a
 * message that threw on insert is a message nobody knows existed.
 */
const MAX_TEXT = 100_000;

/** Addresses are only ever compared and displayed, never parsed. */
function addresses(list: string[] | null | undefined): string[] {
  if (!list) return [];
  return list
    .map((a) => a.trim().slice(0, MAX_ADDRESS))
    .filter((a) => a.length > 0);
}

/**
 * Stores a received message.
 *
 * Idempotent on Resend's email id, which is the whole reason that field is
 * indexed. Resend retries any delivery that does not answer 200, and it also
 * offers a replay button — without this, one flaky response turns into two
 * copies of the same message sitting in the inbox.
 *
 * Returns `{ duplicate }` in the shape invoices.applyStripeEvent uses, so the
 * route can tell "already had it" apart from "stored it" without guessing.
 */
export const record = mutation({
  args: {
    secret: v.string(),
    resendEmailId: v.string(),
    from: v.string(),
    to: v.array(v.string()),
    cc: v.optional(v.array(v.string())),
    receivedFor: v.optional(v.array(v.string())),
    subject: v.string(),
    text: v.string(),
    messageId: v.optional(v.string()),
    attachments: v.array(
      v.object({
        id: v.string(),
        filename: v.string(),
        contentType: v.string(),
        size: v.number(),
      }),
    ),
    receivedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);

    const resendEmailId = args.resendEmailId.trim();
    if (!resendEmailId) throw new Error("A Resend email id is required.");

    const seen = await ctx.db
      .query("inboundEmails")
      .withIndex("by_resend_id", (q) => q.eq("resendEmailId", resendEmailId))
      .unique();
    if (seen) return { duplicate: true as const };

    await ctx.db.insert("inboundEmails", {
      resendEmailId,
      from: args.from.trim().slice(0, MAX_ADDRESS),
      to: addresses(args.to),
      cc: args.cc ? addresses(args.cc) : undefined,
      receivedFor: args.receivedFor ? addresses(args.receivedFor) : undefined,
      // An empty subject is normal mail, not an error. Say so rather than
      // rendering a blank line the eye slides straight past.
      subject: args.subject.trim().slice(0, MAX_SUBJECT) || "(no subject)",
      text: args.text.slice(0, MAX_TEXT),
      messageId: args.messageId?.trim().slice(0, MAX_MESSAGE_ID) || undefined,
      attachments: args.attachments.map((a) => ({
        id: a.id,
        filename: a.filename.trim().slice(0, MAX_FILENAME) || "attachment",
        contentType: a.contentType,
        size: a.size,
      })),
      read: false,
      /*
       * Resend's timestamp, not ours, when it is available. A webhook that was
       * retried for an hour would otherwise sort as if it had just arrived,
       * which puts the newest-first list in the wrong order for exactly the
       * messages most likely to have been delayed.
       */
      receivedAt: args.receivedAt ?? Date.now(),
    });

    return { duplicate: false as const };
  },
});

/** Admin list, newest first. Unread before read. */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("inboundEmails").order("desc").take(200);
    return rows.sort((a, b) => {
      if (a.read !== b.read) return a.read ? 1 : -1;
      return b.receivedAt - a.receivedAt;
    });
  },
});

/**
 * How many are unread.
 *
 * Its own query rather than `listAll().length` so the sidebar badge and the
 * "needs you" feed do not each pull two hundred message bodies to count them.
 */
export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const unread = await ctx.db
      .query("inboundEmails")
      .withIndex("by_read", (q) => q.eq("read", false))
      .take(100);
    return unread.length;
  },
});

export const markRead = mutation({
  args: { id: v.id("inboundEmails"), read: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { read: args.read });
  },
});

export const remove = mutation({
  args: { id: v.id("inboundEmails") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

/**
 * One message, for the route that serves its attachments.
 *
 * Exists so that route can check the attachment id it was handed actually
 * belongs to the message it was handed — a caller who may read one message's
 * attachments must not be able to read another's by swapping an id.
 */
export const getById = query({
  args: { id: v.id("inboundEmails") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.get(args.id);
  },
});
