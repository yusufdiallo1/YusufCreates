import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";

/**
 * Newsletter subscribers.
 *
 * Confirmed opt-in: a new row is unconfirmed until the link in the welcome
 * email is clicked. Re-subscribing an existing address updates the row rather
 * than creating a duplicate, and clears any previous unsubscribe.
 */

/** 128 bits, URL-safe. Used for both the confirm and unsubscribe links. */
function makeToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const subscribe = mutation({
  args: { email: v.string(), source: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscribers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existing) {
      // Reuse the token if there is one, so a link already sitting in an inbox
      // keeps working rather than being silently invalidated by a resubmit.
      const token = existing.token ?? makeToken();
      await ctx.db.patch(existing._id, {
        unsubscribedAt: undefined,
        token,
      });
      return {
        id: existing._id,
        token,
        alreadyConfirmed: existing.confirmed,
      };
    }

    const token = makeToken();
    const id = await ctx.db.insert("subscribers", {
      email: args.email,
      source: args.source ?? "footer",
      confirmed: false,
      createdAt: Date.now(),
      token,
    });
    return { id, token, alreadyConfirmed: false };
  },
});

/**
 * Completes the double opt-in. Public by necessity — the token in the link is
 * the only credential, which is why it carries 128 bits of entropy.
 */
export const confirm = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("subscribers")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!row) return { ok: false as const };

    // Idempotent: clicking twice, or a mail client prefetching the link, must
    // not read as a failure.
    if (!row.confirmed) {
      await ctx.db.patch(row._id, {
        confirmed: true,
        confirmedAt: Date.now(),
        unsubscribedAt: undefined,
      });
    }
    return { ok: true as const, email: row.email };
  },
});

/**
 * One-click unsubscribe. Keyed on the token rather than the address, so the
 * link cannot be edited to unsubscribe somebody else.
 */
export const unsubscribe = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("subscribers")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!row) return { ok: false as const };

    await ctx.db.patch(row._id, { unsubscribedAt: Date.now() });
    return { ok: true as const, email: row.email };
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("subscribers").order("desc").take(500);
  },
});

/** Confirmed and not unsubscribed — the only set a broadcast may go to. */
export const listSendable = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("subscribers").collect();
    return rows.filter((r) => r.confirmed && r.unsubscribedAt === undefined);
  },
});

/**
 * Append-only record of every send. Without it there is no way to answer
 * "did they actually get it" when someone says nothing arrived.
 *
 * Reachable only with a shared secret. This was previously open, which let
 * anyone forge rows in the one table that says whether a message actually went
 * out — a poisoned log is worse than no log.
 *
 * It stays a public mutation rather than an internalMutation because its
 * callers are Next route handlers using fetchMutation, which by design can
 * only reach public functions. The secret is what actually gates it.
 */
export const logEmail = mutation({
  args: {
    secret: v.string(),
    to: v.string(),
    template: v.string(),
    subject: v.string(),
    status: v.union(
      v.literal("sent"),
      v.literal("failed"),
      v.literal("skipped"),
    ),
    providerId: v.optional(v.string()),
    error: v.optional(v.string()),
    leadId: v.optional(v.id("leads")),
  },
  handler: async (ctx, { secret, ...row }) => {
    const expected = process.env.EMAIL_LOG_SECRET;

    // Fail closed. An unset secret must never mean "allow everyone".
    if (!expected || secret !== expected) {
      throw new Error("Not authorised.");
    }

    return await ctx.db.insert("emailLog", { ...row, sentAt: Date.now() });
  },
});

export const recentLog = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.query("emailLog").order("desc").take(args.limit ?? 100);
  },
});

/**
 * Recipients for a broadcast, by audience.
 *
 * The composer used to have no choice at all — every send went to confirmed
 * newsletter subscribers, so there was no way to tell existing clients about
 * something without also telling the mailing list, or the reverse.
 *
 * Confirmed-and-not-unsubscribed is enforced for the newsletter audience
 * regardless of what is asked for. Clients are people I already have a
 * working relationship with, so they are addressable without a double opt-in,
 * but they are still excluded once they unsubscribe.
 */
export const audienceRecipients = query({
  args: {
    audience: v.union(
      v.literal("newsletter"),
      v.literal("clients"),
      v.literal("enterprise"),
      v.literal("all"),
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    /*
     * The token comes with the address.
     *
     * Without it every broadcast went out with "unsubscribe?token=" and an
     * empty value, so the link 404'd for every recipient: the one link the
     * law requires to work was the one link that could not. The unsubscribe
     * mutation looks a subscriber up BY token, so there is no way to honour
     * the request without it.
     */
    const newsletter = async () => {
      const rows = await ctx.db.query("subscribers").collect();
      return rows
        .filter((r) => r.confirmed && r.unsubscribedAt === undefined)
        .map((r) => ({
          email: r.email,
          name: undefined as string | undefined,
          token: r.token,
        }));
    };

    const clients = async () => {
      const rows = await ctx.db.query("clients").collect();
      return rows.map((c) => ({ email: c.email, name: c.name }));
    };

    /** Clients whose lead came in through the enterprise path. */
    const enterprise = async () => {
      const leads = await ctx.db.query("leads").collect();
      const emails = new Set(
        leads
          .filter((l) => l.tier === "enterprise" || l.projectType === "enterprise")
          .map((l) => l.email.toLowerCase()),
      );
      const rows = await ctx.db.query("clients").collect();
      return rows
        .filter((c) => emails.has(c.email.toLowerCase()))
        .map((c) => ({ email: c.email, name: c.name }));
    };

    let list: { email: string; name?: string; token?: string }[];
    if (args.audience === "newsletter") list = await newsletter();
    else if (args.audience === "clients") list = await clients();
    else if (args.audience === "enterprise") list = await enterprise();
    /*
     * Newsletter first, so that on the "all" audience the subscriber row —
     * the one carrying an unsubscribe token — is the copy that survives the
     * dedupe below. A client who also subscribed is one person, and the
     * version of them that can unsubscribe is the one worth keeping.
     */
    else list = [...(await newsletter()), ...(await clients())];

    // One row per address. "All" overlaps by definition — someone on the
    // mailing list who later became a client is one person, not two sends.
    const seen = new Set<string>();
    return list.filter((r) => {
      const key = r.email.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },
});

/** Recipient counts per audience, for the composer's picker. */
export const audienceCounts = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const subs = await ctx.db.query("subscribers").collect();
    const newsletter = subs.filter(
      (r) => r.confirmed && r.unsubscribedAt === undefined,
    );
    const clients = await ctx.db.query("clients").collect();

    const leads = await ctx.db.query("leads").collect();
    const entEmails = new Set(
      leads
        .filter((l) => l.tier === "enterprise" || l.projectType === "enterprise")
        .map((l) => l.email.toLowerCase()),
    );
    const enterprise = clients.filter((c) =>
      entEmails.has(c.email.toLowerCase()),
    );

    const all = new Set(
      [...newsletter.map((r) => r.email), ...clients.map((c) => c.email)].map(
        (e) => e.toLowerCase(),
      ),
    );

    return {
      newsletter: newsletter.length,
      clients: clients.length,
      enterprise: enterprise.length,
      all: all.size,
    };
  },
});
