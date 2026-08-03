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

/**
 * Public conversations, grouped into threads rather than a flat message list.
 *
 * `conversations` above returns the newest 200 rows in insertion order, which
 * interleaves every visitor talking at once — readable as a firehose, useless
 * for answering "what did that person ask". Sessions are the unit worth
 * reviewing, so they are assembled here rather than in the component: the
 * grouping needs every row, and shipping all of them to the browser to fold
 * them there would send the same data twice.
 */
export const threads = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Newest first, then grouped. take() bounds the read; the cap is on
    // messages rather than threads because a single long conversation must
    // not be able to push every other thread out of the page.
    const rows = await ctx.db
      .query("chatMessages")
      .order("desc")
      .take(args.limit ?? 600);

    const bySession = new Map<
      string,
      {
        sessionId: string;
        messages: { role: string; content: string; ts: number }[];
        lastTs: number;
      }
    >();

    for (const row of rows) {
      const entry = bySession.get(row.sessionId) ?? {
        sessionId: row.sessionId,
        messages: [],
        lastTs: 0,
      };
      entry.messages.push({ role: row.role, content: row.content, ts: row.ts });
      entry.lastTs = Math.max(entry.lastTs, row.ts);
      bySession.set(row.sessionId, entry);
    }

    return [...bySession.values()]
      .map((thread) => ({
        ...thread,
        // Read back in the order they were said. The scan above is newest
        // first, so each thread arrives reversed.
        messages: thread.messages.sort((a, b) => a.ts - b.ts),
        turns: thread.messages.length,
        /** First thing the visitor asked — the only useful thread label. */
        opener:
          thread.messages.find((m) => m.role === "user")?.content.slice(0, 120) ??
          "",
      }))
      .sort((a, b) => b.lastTs - a.lastTs);
  },
});

/** Headline numbers for the console, computed where the rows already are. */
export const stats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("chatMessages").take(2000);

    const sessions = new Set(rows.map((r) => r.sessionId));
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

    return {
      messages: rows.length,
      sessions: sessions.size,
      last24h: rows.filter((r) => r.ts >= dayAgo).length,
      /** Visitor questions only — the ones worth turning into KB entries. */
      questions: rows.filter((r) => r.role === "user").length,
    };
  },
});
