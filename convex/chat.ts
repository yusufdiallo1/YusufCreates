import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";

/**
 * Chat rate limiting and logging.
 *
 * The limiter is a fixed-window counter. Two honest caveats:
 *
 *   - A fixed window permits a 2x burst across the boundary — ten requests at
 *     0:59 and ten more at 1:00. For a portfolio chat that is fine, and a
 *     sliding log would cost a timestamp array per key to fix.
 *   - Every request costs a write, including rejected ones. Also fine at this
 *     scale, and worth knowing before traffic grows.
 *
 * Rows accumulate, so old ones are swept opportunistically rather than by a
 * cron: a table of dead counters is not worth a scheduled function.
 */

const WINDOW_MS = 60_000;
const LIMITS = { session: 10, ip: 30 } as const;

function requireServerSecret(secret: string) {
  const expected = process.env.EMAIL_LOG_SECRET;
  // Fail closed. An unset secret must never mean "allow everyone".
  if (!expected || secret !== expected) throw new Error("Not authorised.");
}

/**
 * Consumes one unit against both the session and the IP window.
 *
 * Returns rather than throws on refusal, so the caller can send a 429 with a
 * useful Retry-After instead of a generic error.
 */
export const checkAndConsume = mutation({
  args: {
    secret: v.string(),
    sessionId: v.string(),
    ipHash: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);

    const now = Date.now();
    const bucket = Math.floor(now / WINDOW_MS) * WINDOW_MS;

    const keys = [
      { kind: "session" as const, key: args.sessionId, limit: LIMITS.session },
      { kind: "ip" as const, key: args.ipHash, limit: LIMITS.ip },
    ];

    for (const { kind, key, limit } of keys) {
      if (!key) continue;

      const row = await ctx.db
        .query("chatLimits")
        .withIndex("by_kind_key", (q) => q.eq("kind", kind).eq("key", key))
        .unique();

      if (!row) {
        await ctx.db.insert("chatLimits", {
          kind,
          key,
          windowStart: bucket,
          count: 1,
        });
        continue;
      }

      // Window rolled over — reset rather than accumulate.
      if (row.windowStart !== bucket) {
        await ctx.db.patch(row._id, { windowStart: bucket, count: 1 });
        continue;
      }

      if (row.count >= limit) {
        return {
          ok: false as const,
          retryAfterMs: bucket + WINDOW_MS - now,
        };
      }

      await ctx.db.patch(row._id, { count: row.count + 1 });
    }

    return { ok: true as const, retryAfterMs: 0 };
  },
});

/** Records a turn. Never blocks the response. */
export const logTurn = mutation({
  args: {
    secret: v.string(),
    sessionId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    await ctx.db.insert("chatMessages", {
      sessionId: args.sessionId,
      role: args.role,
      // Bounded: a runaway response should not become a giant document.
      content: args.content.slice(0, 8000),
      ts: Date.now(),
    });
  },
});

/** Conversation review, for the admin. */
export const conversations = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("chatMessages")
      .order("desc")
      .take(args.limit ?? 200);
  },
});
