import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { requireAdmin } from "./lib/auth";

/**
 * The credential vault.
 *
 * Clients WILL email passwords in plaintext. This exists to give them
 * somewhere better and, more importantly, to reduce what I am holding at all.
 *
 * THE RULES THIS FILE ENFORCES:
 *
 * 1. Nothing here ever returns a plaintext secret except `reveal`, which is
 *    an ACTION requiring a typed reason and writing an access-log row inside
 *    the same transaction that hands over the ciphertext.
 * 2. Nothing here returns a ciphertext to a browser either. A list view
 *    returns labels and a mask; the encrypted bytes never leave the backend.
 * 3. Reveal is one record at a time. There is no bulk decrypt, and adding one
 *    would defeat the log — "I read every password on the project" is not a
 *    reason, it is a breach.
 * 4. The client can never read back what they submitted. If they lose it they
 *    reset it at the source. That is correct behaviour, not a limitation.
 *
 * The encryption itself is in convex/credentialsNode.ts, which is a "use
 * node" module and therefore cannot contain any of the queries below.
 *
 * The best version of this table is an empty one. Every prompt around it —
 * in the portal, in the admin, at project completion — should push toward
 * delegated access and toward deletion.
 */

/** Kinds, mirrored by DELEGATION in src/components/portal/CredentialForm.tsx. */
export const credentialKind = v.union(
  v.literal("registrar"),
  v.literal("hosting"),
  v.literal("cms"),
  v.literal("analytics"),
  v.literal("email"),
  v.literal("api_key"),
  v.literal("other"),
);

/**
 * What a secret looks like when it is not being revealed.
 *
 * Fixed width, and deliberately not derived from the real length — a mask
 * that grows with the password tells anyone reading the screen how long it
 * is, which is a meaningful head start.
 */
const MASK = "••••••••••••";

/** The public shape. Everything here is safe to send to a browser. */
function summarise(row: Doc<"credentials">) {
  return {
    _id: row._id,
    label: row.label,
    kind: row.kind,
    username: row.username,
    notes: row.notes,
    masked: MASK,
    createdAt: row.createdAt,
    lastAccessedAt: row.lastAccessedAt,
    rotatedAt: row.rotatedAt,
    deleteAfter: row.deleteAfter,
  };
}

/* ==================================================================== *
 *  CLIENT SIDE — write only, via the intake token                      *
 * ==================================================================== */

/**
 * Resolves an intake token to the project it belongs to.
 *
 * The project id is never taken from the request, the same rule convex/
 * portal.ts enforces for the signed-in portal: a token proves which intake
 * you hold, and everything else is derived from it.
 */
async function projectForToken(
  ctx: QueryCtx | MutationCtx,
  token: string,
): Promise<Doc<"intakes">> {
  const intake = await ctx.db
    .query("intakes")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();

  // The same error for "wrong token" and "no such token". Distinguishing them
  // confirms to a guesser which tokens are real.
  if (!intake) throw new Error("Not authorised.");
  return intake;
}

export const intakeForTokenInternal = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const intake = await projectForToken(ctx, args.token);
    return { projectId: intake.projectId, clientId: intake.clientId };
  },
});

export const insertInternal = internalMutation({
  args: {
    projectId: v.id("clientProjects"),
    clientId: v.id("clients"),
    label: v.string(),
    kind: credentialKind,
    username: v.optional(v.string()),
    ciphertext: v.string(),
    iv: v.string(),
    authTag: v.string(),
    keyVersion: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("credentials", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

/**
 * Submit a credential from the portal.
 *
 * An action because encryption needs node:crypto, and a mutation cannot call
 * one. The plaintext exists in memory here and is never written anywhere —
 * the only thing that reaches the database is the ciphertext.
 */
export const submit = action({
  args: {
    token: v.string(),
    label: v.string(),
    kind: credentialKind,
    username: v.optional(v.string()),
    secret: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ ok: true }> => {
    const label = args.label.trim();
    const secret = args.secret;

    if (!label) throw new Error("Give it a name so I know what it opens.");
    if (!secret) throw new Error("There is nothing to save.");
    /*
     * A ceiling, not a policy. Real passwords and API keys sit far below
     * this; anything larger is a pasted file, which belongs in the upload
     * field where it can be handled as a file.
     */
    if (secret.length > 4096) {
      throw new Error("That is too long to be a password — upload it as a file instead.");
    }

    const { projectId, clientId } = await ctx.runQuery(
      internal.credentials.intakeForTokenInternal,
      { token: args.token },
    );

    const sealed = await ctx.runAction(internal.credentialsNode.encryptSecret, {
      plaintext: secret,
    });

    await ctx.runMutation(internal.credentials.insertInternal, {
      projectId,
      clientId,
      label,
      kind: args.kind,
      username: args.username?.trim() || undefined,
      notes: args.notes?.trim() || undefined,
      ...sealed,
    });

    return { ok: true };
  },
});

/**
 * What the client sees back: labels and masks, never a value.
 *
 * Write-only is the whole point. If they lose it, they reset it at the
 * source — which is both safer and the only way to be sure the thing they
 * end up with actually works.
 */
export const listForToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const intake = await projectForToken(ctx, args.token);

    const rows = await ctx.db
      .query("credentials")
      .withIndex("by_project", (q) => q.eq("projectId", intake.projectId))
      .collect();

    return rows.map(summarise);
  },
});

/* ==================================================================== *
 *  ADMIN SIDE                                                          *
 * ==================================================================== */

/** Labels, kinds and usernames. Never a secret, and never in bulk. */
export const listForProject = query({
  args: { projectId: v.id("clientProjects") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const rows = await ctx.db
      .query("credentials")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return rows.map(summarise);
  },
});

/** How many are held, for the "delete these?" prompt at project completion. */
export const countForProject = query({
  args: { projectId: v.id("clientProjects") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rows = await ctx.db
      .query("credentials")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    return rows.length;
  },
});

/**
 * Authorises, logs, and hands back the encrypted blob — all in one mutation.
 *
 * A mutation rather than a query because it WRITES the access log, and it
 * writes it BEFORE the plaintext exists. An audit trail that can be skipped
 * by a failure on the decrypt path is not an audit trail.
 *
 * Internal, so the only caller is the `reveal` action below. The ciphertext
 * it returns never reaches a browser.
 */
export const authoriseRevealInternal = internalMutation({
  args: { id: v.id("credentials"), reason: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAdmin(ctx);

    const reason = args.reason.trim();
    /*
     * Ten characters is not a security control — it is a speed bump against
     * typing "x" and moving on. The log is only worth keeping if the reasons
     * in it can still be understood in six months.
     */
    if (reason.length < 10) {
      throw new Error("Say why you need this — it goes in the access log.");
    }

    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("That credential no longer exists.");

    const user = await ctx.db.get(userId);
    const who = (user as { email?: string } | null)?.email ?? "admin";

    await ctx.db.insert("credentialAccess", {
      credentialId: args.id,
      accessedAt: Date.now(),
      accessedBy: who,
      reason,
    });

    await ctx.db.patch(args.id, { lastAccessedAt: Date.now() });

    return {
      label: row.label,
      username: row.username,
      ciphertext: row.ciphertext,
      iv: row.iv,
      authTag: row.authTag,
      keyVersion: row.keyVersion,
    };
  },
});

/**
 * Reveal one credential.
 *
 * An action, not a query, and that distinction is load-bearing. A query would
 * hold a live reactive subscription — the plaintext would sit in the client's
 * Convex cache for as long as the component stayed mounted, and re-deliver
 * itself on every reconnect. An action returns once and is gone.
 *
 * One record at a time. There is deliberately no batch form.
 */
export const reveal = action({
  args: { id: v.id("credentials"), reason: v.string() },
  handler: async (
    ctx,
    args,
  ): Promise<{ label: string; username?: string; secret: string }> => {
    const sealed = await ctx.runMutation(
      internal.credentials.authoriseRevealInternal,
      { id: args.id, reason: args.reason },
    );

    const secret: string = await ctx.runAction(
      internal.credentialsNode.decryptSecret,
      {
        ciphertext: sealed.ciphertext,
        iv: sealed.iv,
        authTag: sealed.authTag,
        keyVersion: sealed.keyVersion,
      },
    );

    return { label: sealed.label, username: sealed.username, secret };
  },
});

/** Who read this, when, and why. */
export const accessLog = query({
  args: { credentialId: v.id("credentials") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("credentialAccess")
      .withIndex("by_credential", (q) => q.eq("credentialId", args.credentialId))
      .order("desc")
      .take(50);
  },
});

/**
 * Add a credential from the admin side, for the ones that arrive by email
 * anyway.
 *
 * This exists because pretending otherwise does not help: a client will send
 * a password in a message, and the choice is between it living in an inbox
 * forever or being moved in here and deleted from there.
 */
export const addAsAdmin = action({
  args: {
    projectId: v.id("clientProjects"),
    label: v.string(),
    kind: credentialKind,
    username: v.optional(v.string()),
    secret: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ ok: true }> => {
    const project = await ctx.runQuery(
      internal.credentials.projectForAdminInternal,
      { projectId: args.projectId },
    );

    const sealed = await ctx.runAction(internal.credentialsNode.encryptSecret, {
      plaintext: args.secret,
    });

    await ctx.runMutation(internal.credentials.insertInternal, {
      projectId: args.projectId,
      clientId: project.clientId,
      label: args.label.trim(),
      kind: args.kind,
      username: args.username?.trim() || undefined,
      notes: args.notes?.trim() || undefined,
      ...sealed,
    });

    return { ok: true };
  },
});

export const projectForAdminInternal = internalQuery({
  args: { projectId: v.id("clientProjects") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("No such project.");
    return { clientId: project.clientId };
  },
});

/* ==================================================================== *
 *  LIFECYCLE — the part that matters most                              *
 * ==================================================================== */

/**
 * Delete one, now.
 *
 * The access log rows go with it. They reference a credential that will not
 * exist, and an audit trail pointing at nothing is just orphaned rows.
 */
export const remove = mutation({
  args: { id: v.id("credentials") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const log = await ctx.db
      .query("credentialAccess")
      .withIndex("by_credential", (q) => q.eq("credentialId", args.id))
      .collect();
    for (const entry of log) await ctx.db.delete(entry._id);

    await ctx.db.delete(args.id);
  },
});

/** Every credential on a project, now. Offered at project completion. */
export const purgeProject = mutation({
  args: { projectId: v.id("clientProjects") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await purgeForProject(ctx, args.projectId);
  },
});

async function purgeForProject(
  ctx: MutationCtx,
  projectId: Id<"clientProjects">,
): Promise<number> {
  const rows = await ctx.db
    .query("credentials")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();

  for (const row of rows) {
    const log = await ctx.db
      .query("credentialAccess")
      .withIndex("by_credential", (q) => q.eq("credentialId", row._id))
      .collect();
    for (const entry of log) await ctx.db.delete(entry._id);
    await ctx.db.delete(row._id);
  }

  return rows.length;
}

/**
 * Start the 30-day clock, chosen when I decline to delete at completion.
 *
 * A timer rather than "keep indefinitely" because indefinitely is how a
 * credential store becomes a liability nobody remembers accepting. Thirty
 * days is long enough to cover the fixes that surface just after launch.
 */
export const scheduleDeletion = mutation({
  args: {
    projectId: v.id("clientProjects"),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const days = args.days ?? 30;
    const deleteAfter = Date.now() + days * 24 * 60 * 60 * 1000;

    const rows = await ctx.db
      .query("credentials")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    for (const row of rows) await ctx.db.patch(row._id, { deleteAfter });
    return rows.length;
  },
});

/**
 * Deleting a client purges their credentials immediately, whatever the timer
 * says.
 *
 * Exported for convex/portal.ts to call inside its own delete transaction —
 * "the client is gone but I still hold their passwords" is not a state that
 * should be reachable for even a moment.
 */
export async function purgeForClient(
  ctx: MutationCtx,
  clientId: Id<"clients">,
): Promise<number> {
  const rows = await ctx.db
    .query("credentials")
    .withIndex("by_client", (q) => q.eq("clientId", clientId))
    .collect();

  for (const row of rows) {
    const log = await ctx.db
      .query("credentialAccess")
      .withIndex("by_credential", (q) => q.eq("credentialId", row._id))
      .collect();
    for (const entry of log) await ctx.db.delete(entry._id);
    await ctx.db.delete(row._id);
  }

  return rows.length;
}

/** Daily. Anything past its deleteAfter goes, with no further prompt. */
export const purgeExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const due = await ctx.db
      .query("credentials")
      .withIndex("by_deleteAfter", (q) => q.lte("deleteAfter", now))
      .take(200);

    let deleted = 0;
    for (const row of due) {
      /*
       * The index range includes rows where deleteAfter is undefined, which
       * sorts before every number. Those have no timer set and must not be
       * touched — an unset field is "keep", not "delete immediately".
       */
      if (row.deleteAfter === undefined) continue;

      const log = await ctx.db
        .query("credentialAccess")
        .withIndex("by_credential", (q) => q.eq("credentialId", row._id))
        .collect();
      for (const entry of log) await ctx.db.delete(entry._id);

      await ctx.db.delete(row._id);
      deleted += 1;
    }

    if (deleted > 0) {
      console.info(`[credentials] purged ${deleted} expired credential(s)`);
    }
    return deleted;
  },
});
