import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { requireAdmin, requireServerSecret } from "./lib/auth";
import { chainHash, genesisHash, sha256Hex } from "./lib/hash";

/**
 * Sharing a contract with someone, over a link that grants nothing by itself.
 *
 * Reaching the document takes two codes, emailed in sequence: a 10-digit one
 * that dies after 60 seconds, then a 14-digit one. A forwarded URL, a link
 * left in a browser history, or a leaked email preview is inert without live
 * access to the recipient's inbox at that moment.
 *
 * WHAT IS STORED: only sha256(code + salt). The codes themselves exist in one
 * email and in memory for the length of one request. A dump of this table
 * gives an attacker nothing to replay.
 *
 * THE 60-SECOND WINDOW is deliberately short and it is why the clock starts
 * when the recipient presses "send my code" rather than when the link is
 * opened. Email delivery is commonly 5-30 seconds and occasionally worse; a
 * timer that starts before they are looking at the screen would lock people
 * out of their own contract.
 */

/** How long a share link stays alive at all, regardless of the codes. */
const SHARE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const STAGE_ONE_TTL_MS = 60 * 1000;
const STAGE_TWO_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 30 * 60 * 1000;
/** Five wrong guesses burns the challenge rather than allowing a grind. */
const MAX_ATTEMPTS = 5;

const STAGE_ONE_DIGITS = 10;
const STAGE_TWO_DIGITS = 14;

/**
 * Uniform decimal digits.
 *
 * `byte % 10` is NOT uniform — 256 is not a multiple of 10, so 0-5 come up
 * slightly more often than 6-9. It is a small bias but it is free to avoid:
 * reject anything at or above 250 (the largest multiple of 10 under 256) and
 * draw again.
 */
function digits(count: number): string {
  const out: string[] = [];
  while (out.length < count) {
    const bytes = new Uint8Array(count * 2);
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (out.length >= count) break;
      if (byte < 250) out.push(String(byte % 10));
    }
  }
  return out.join("");
}

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Comparison that does not leak how much of the hash matched.
 *
 * Both sides are already hashes, so this is belt and braces — but a length-
 * sensitive early-return compare on a secret-derived value is the kind of
 * thing that is free to get right and awkward to explain later.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Mirrors contracts.appendEvent — sharing is part of the contract's history. */
async function appendShareEvent(
  ctx: MutationCtx,
  contractId: Id<"contracts">,
  type:
    | "share_created"
    | "share_code_issued"
    | "share_code_failed"
    | "share_opened",
  meta: Record<string, unknown>,
  ip?: string,
  userAgent?: string,
): Promise<void> {
  const contract = await ctx.db.get(contractId);
  if (!contract) return;

  const last = await ctx.db
    .query("contractEvents")
    .withIndex("by_contract", (q) => q.eq("contractId", contractId))
    .order("desc")
    .first();

  const seq = last ? last.seq + 1 : 0;
  const prevHash = last ? last.hash : genesisHash(contract.bodySnapshot);
  const at = Date.now();
  const hash = chainHash(prevHash, { type, at, seq, ip, userAgent, meta });

  await ctx.db.insert("contractEvents", {
    contractId,
    seq,
    type,
    at,
    ip,
    userAgent,
    meta,
    prevHash,
    hash,
  });
}

/* ------------------------------------------------------------------ *
 * Admin
 * ------------------------------------------------------------------ */

export const createShare = mutation({
  args: {
    contractId: v.id("contracts"),
    recipientEmail: v.string(),
    scope: v.union(
      v.literal("contract"),
      v.literal("pdf"),
      v.literal("audit"),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireAdmin(ctx);
    const email = args.recipientEmail.trim().toLowerCase();
    if (!email.includes("@")) throw new Error("A real email address, please.");

    const contract = await ctx.db.get(args.contractId);
    if (!contract) throw new Error("No such contract.");

    const now = Date.now();
    const token = randomHex(16);
    const user = await ctx.db.get(userId);

    const shareId = await ctx.db.insert("contractShares", {
      contractId: args.contractId,
      token,
      recipientEmail: email,
      scope: args.scope,
      createdBy: (user as { email?: string } | null)?.email,
      createdAt: now,
      expiresAt: now + SHARE_TTL_MS,
      accessCount: 0,
    });

    await appendShareEvent(ctx, args.contractId, "share_created", {
      shareId,
      recipientEmail: email,
      scope: args.scope,
    });

    return { token, shareId, recipientEmail: email };
  },
});

export const listShares = query({
  args: { contractId: v.id("contracts") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rows = await ctx.db
      .query("contractShares")
      .withIndex("by_contract", (q) => q.eq("contractId", args.contractId))
      .order("desc")
      .collect();

    // Liveness is derived HERE rather than in the component, because reading
    // the clock during a render is impure — the same row would say "live" on
    // one render and "expired" on the next with no state change to explain it.
    const now = Date.now();
    return rows.map((row) => ({
      ...row,
      state: row.revokedAt
        ? ("revoked" as const)
        : now > row.expiresAt
          ? ("expired" as const)
          : ("live" as const),
    }));
  },
});

export const revokeShare = mutation({
  args: { id: v.id("contractShares") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { revokedAt: Date.now() });
  },
});

/* ------------------------------------------------------------------ *
 * The gate
 * ------------------------------------------------------------------ */

/**
 * Is this link live?
 *
 * Returns the bare minimum — enough to render the gate, and specifically NOT
 * the contract, the recipient's full address or the scope. Everything real is
 * behind both codes.
 */
export const shareStatus = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const share = await ctx.db
      .query("contractShares")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!share) return null;
    if (share.revokedAt || Date.now() > share.expiresAt) return null;

    // Masked so the page can say "we'll email a...@example.com" — enough for
    // the recipient to recognise, not enough to harvest.
    const [local, domain] = share.recipientEmail.split("@");
    const masked = `${local.slice(0, 1)}${"•".repeat(Math.max(local.length - 1, 1))}@${domain}`;

    return { maskedEmail: masked, live: true as const };
  },
});

/**
 * Issues the next code and returns it to the ROUTE so the route can email it.
 *
 * The plaintext code is returned exactly once, to a caller holding the server
 * secret, and is never written down. Convex cannot send email, so there is no
 * way to avoid handing it back — but it goes no further than the route that
 * puts it in an envelope.
 */
export const issueChallenge = mutation({
  args: {
    secret: v.string(),
    token: v.string(),
    stage: v.union(v.literal("one"), v.literal("two")),
    ip: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);

    const share = await ctx.db
      .query("contractShares")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!share || share.revokedAt || Date.now() > share.expiresAt) {
      throw new Error("This link is no longer valid.");
    }

    // Stage two is only reachable by having cleared stage one. Without this
    // check, anyone could ask for the second code directly and the first would
    // be decoration.
    if (args.stage === "two") {
      const stageOne = await ctx.db
        .query("contractShareChallenges")
        .withIndex("by_share_stage", (q) =>
          q.eq("shareId", share._id).eq("stage", "one"),
        )
        .unique();
      if (!stageOne?.consumedAt) {
        throw new Error("Not authorised.");
      }
    }

    const now = Date.now();
    const code = digits(
      args.stage === "one" ? STAGE_ONE_DIGITS : STAGE_TWO_DIGITS,
    );
    const salt = randomHex(16);
    const expiresAt =
      now + (args.stage === "one" ? STAGE_ONE_TTL_MS : STAGE_TWO_TTL_MS);

    const existing = await ctx.db
      .query("contractShareChallenges")
      .withIndex("by_share_stage", (q) =>
        q.eq("shareId", share._id).eq("stage", args.stage),
      )
      .unique();

    const row = {
      shareId: share._id,
      stage: args.stage,
      codeHash: sha256Hex(code + salt),
      salt,
      issuedAt: now,
      expiresAt,
      attempts: 0,
      consumedAt: undefined,
    };

    if (existing) {
      // Reissuing replaces the old code outright — a resent code must
      // invalidate the previous one, or "resend" quietly widens the window.
      await ctx.db.patch(existing._id, row);
    } else {
      await ctx.db.insert("contractShareChallenges", row);
    }

    await appendShareEvent(
      ctx,
      share.contractId,
      "share_code_issued",
      { shareId: share._id, stage: args.stage },
      args.ip,
      args.userAgent,
    );

    return {
      code,
      expiresAt,
      recipientEmail: share.recipientEmail,
      stage: args.stage,
    };
  },
});

/**
 * Checks a code, and on the final stage grants a session.
 *
 * Every failure returns the SAME message. Distinguishing "wrong code" from
 * "expired" from "no such challenge" tells someone probing exactly which
 * knob to turn.
 */
export const verifyChallenge = mutation({
  args: {
    secret: v.string(),
    token: v.string(),
    stage: v.union(v.literal("one"), v.literal("two")),
    code: v.string(),
    ip: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    const fail = { ok: false as const };

    const share = await ctx.db
      .query("contractShares")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!share || share.revokedAt || Date.now() > share.expiresAt) return fail;

    const challenge = await ctx.db
      .query("contractShareChallenges")
      .withIndex("by_share_stage", (q) =>
        q.eq("shareId", share._id).eq("stage", args.stage),
      )
      .unique();

    if (!challenge || challenge.consumedAt) return fail;

    const now = Date.now();
    if (now > challenge.expiresAt) return fail;
    if (challenge.attempts >= MAX_ATTEMPTS) return fail;

    // The attempt is counted BEFORE the comparison, so a crash or a race
    // cannot give a free guess.
    await ctx.db.patch(challenge._id, { attempts: challenge.attempts + 1 });

    const supplied = sha256Hex(args.code.replace(/\D/g, "") + challenge.salt);
    if (!constantTimeEqual(supplied, challenge.codeHash)) {
      await appendShareEvent(
        ctx,
        share.contractId,
        "share_code_failed",
        { shareId: share._id, stage: args.stage },
        args.ip,
        args.userAgent,
      );
      return fail;
    }

    await ctx.db.patch(challenge._id, { consumedAt: now });

    if (args.stage === "one") {
      return { ok: true as const, next: "two" as const };
    }

    // Both codes cleared. The session token goes back to the route to be set
    // as an httpOnly cookie; only its hash is kept here, for the same reason
    // the codes are hashed.
    const sessionToken = randomHex(32);
    await ctx.db.insert("contractShareSessions", {
      shareId: share._id,
      sessionTokenHash: sha256Hex(sessionToken),
      issuedAt: now,
      expiresAt: now + SESSION_TTL_MS,
      ip: args.ip,
      userAgent: args.userAgent,
    });

    await ctx.db.patch(share._id, {
      lastAccessAt: now,
      accessCount: share.accessCount + 1,
    });

    await appendShareEvent(
      ctx,
      share.contractId,
      "share_opened",
      { shareId: share._id },
      args.ip,
      args.userAgent,
    );

    return {
      ok: true as const,
      next: "done" as const,
      sessionToken,
      expiresAt: now + SESSION_TTL_MS,
    };
  },
});

/** Resolves a share session cookie to what it is allowed to see. */
export const resolveSession = query({
  args: { secret: v.string(), sessionToken: v.string(), token: v.string() },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);

    const session = await ctx.db
      .query("contractShareSessions")
      .withIndex("by_token", (q) =>
        q.eq("sessionTokenHash", sha256Hex(args.sessionToken)),
      )
      .unique();
    if (!session || Date.now() > session.expiresAt) return null;

    const share = await ctx.db.get(session.shareId);
    if (!share || share.revokedAt || Date.now() > share.expiresAt) return null;
    // The cookie must belong to the link in the URL, not merely to some link.
    if (share.token !== args.token) return null;

    const contract = await ctx.db.get(share.contractId);
    if (!contract || contract.voidedAt) return null;

    const events =
      share.scope === "audit"
        ? await ctx.db
            .query("contractEvents")
            .withIndex("by_contract", (q) =>
              q.eq("contractId", contract._id),
            )
            .collect()
        : [];

    return {
      scope: share.scope,
      clientName: contract.clientName,
      signedAt: contract.signedAt,
      body: share.scope === "pdf" ? null : contract.bodySnapshot,
      bodyHash: contract.bodyHash ?? null,
      auditRoot: contract.auditRoot ?? null,
      signedPdfFileId: contract.signedPdfFileId ?? null,
      events: events.sort((a, b) => a.seq - b.seq),
    };
  },
});
