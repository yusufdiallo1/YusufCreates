import {
  mutation,
  query,
  internalMutation,
  internalAction,
} from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { requireAdmin, requireServerSecret } from "./lib/auth";
import { contractStatus } from "./schema";
import { chainHash, genesisHash, sha256Hex } from "./lib/hash";
import type { ChainEventInput } from "./lib/hash";
import {
  buildContractVariables,
  extractVariables,
  mergeTemplate,
  unresolvedRequired,
  type ContractDefaults,
} from "./lib/merge";
import {
  CONSENT_TEXT,
  SEED_CONTRACT_BODY,
  SEED_TEMPLATE_NAME,
  UNSET_MARKER,
} from "./lib/contractTemplate";
import { insertInvoicePair, splitAmount } from "./invoices";

/**
 * Contracts — the step between "yes" and "paid".
 *
 * Three rules run through this file:
 *
 * 1. THE SNAPSHOT IS THE CONTRACT. bodySnapshot is rendered once, at
 *    generation, and never re-derived. Editing a template afterwards must not
 *    reach backwards into something a person already signed.
 *
 * 2. THE CHAIN IS APPENDED, NEVER REWRITTEN. Every event hashes the previous
 *    event's hash, so removing or altering one breaks all of them and
 *    verifyChain says so.
 *
 * 3. SIGNING COMMITS BEFORE ANYTHING EXTERNAL IS ATTEMPTED. recordSignature
 *    is a single transaction that stamps the signature AND raises the
 *    invoices. Stripe and the PDF happen afterwards, in the route, and either
 *    can fail without the signature being lost — that is what the pending
 *    stamps are for.
 */

/** 14 days. Long enough to read, short enough that a stale link is not live forever. */
const EXPIRY_MS = 14 * 24 * 60 * 60 * 1000;

/** 128 bits. The token is the only credential on a hosted contract. */
function makeToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/* ------------------------------------------------------------------ *
 * Rate limiting
 * ------------------------------------------------------------------ */

/**
 * Reuses the chatLimits table rather than growing a second limiter.
 *
 * The argument for doing it in Convex rather than in the route is already
 * written out at the chatLimits definition and applies unchanged here:
 * serverless instances share no memory, so an in-process counter resets on
 * every cold start and limits nothing, while a Convex mutation is a
 * serialisable transaction and genuinely serialises two simultaneous requests
 * for the same key.
 *
 * Limits are set HERE, not passed in, so a caller cannot raise its own ceiling.
 */
const RATE_LIMITS: Record<"share" | "sign", { limit: number; windowMs: number }> =
  {
    // Signing is a once-per-contract act; anything above this is a script.
    sign: { limit: 10, windowMs: 10 * 60 * 1000 },
    // Code issuance is the expensive one — each attempt sends an email.
    share: { limit: 12, windowMs: 10 * 60 * 1000 },
  };

export const checkRate = mutation({
  args: {
    secret: v.string(),
    kind: v.union(v.literal("share"), v.literal("sign")),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    if (!args.key) return { ok: true as const, retryAfterMs: 0 };

    const { limit, windowMs } = RATE_LIMITS[args.kind];
    const now = Date.now();
    const bucket = Math.floor(now / windowMs) * windowMs;

    const row = await ctx.db
      .query("chatLimits")
      .withIndex("by_kind_key", (q) =>
        q.eq("kind", args.kind).eq("key", args.key),
      )
      .unique();

    if (!row) {
      await ctx.db.insert("chatLimits", {
        kind: args.kind,
        key: args.key,
        windowStart: bucket,
        count: 1,
      });
      return { ok: true as const, retryAfterMs: 0 };
    }

    // Window rolled over — reset rather than accumulate.
    if (row.windowStart !== bucket) {
      await ctx.db.patch(row._id, { windowStart: bucket, count: 1 });
      return { ok: true as const, retryAfterMs: 0 };
    }

    if (row.count >= limit) {
      return { ok: false as const, retryAfterMs: bucket + windowMs - now };
    }

    await ctx.db.patch(row._id, { count: row.count + 1 });
    return { ok: true as const, retryAfterMs: 0 };
  },
});

/* ------------------------------------------------------------------ *
 * The chain
 * ------------------------------------------------------------------ */

/**
 * Appends one event, linked to the last.
 *
 * seq is read from the tail of the by_contract index rather than counted, and
 * Convex mutations are serialisable transactions, so two events cannot claim
 * the same seq even under concurrent writes.
 */
async function appendEvent(
  ctx: MutationCtx,
  contractId: Id<"contracts">,
  input: Omit<ChainEventInput, "seq"> & { type: Doc<"contractEvents">["type"] },
  fallbackPrev: string,
): Promise<string> {
  const last = await ctx.db
    .query("contractEvents")
    .withIndex("by_contract", (q) => q.eq("contractId", contractId))
    .order("desc")
    .first();

  const seq = last ? last.seq + 1 : 0;
  const prevHash = last ? last.hash : fallbackPrev;

  const payload: ChainEventInput = {
    type: input.type,
    at: input.at,
    seq,
    ip: input.ip,
    userAgent: input.userAgent,
    meta: input.meta,
  };
  const hash = chainHash(prevHash, payload);

  await ctx.db.insert("contractEvents", {
    contractId,
    seq,
    type: input.type,
    at: input.at,
    ip: input.ip,
    userAgent: input.userAgent,
    meta: input.meta,
    prevHash,
    hash,
  });

  return hash;
}

/* ------------------------------------------------------------------ *
 * Templates
 * ------------------------------------------------------------------ */

async function activeTemplateRow(
  ctx: QueryCtx,
): Promise<Doc<"contractTemplates"> | null> {
  return await ctx.db
    .query("contractTemplates")
    .withIndex("by_active", (q) => q.eq("active", true))
    .first();
}

async function contractDefaults(ctx: QueryCtx): Promise<ContractDefaults> {
  const row = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", "contract.defaults"))
    .unique();
  return (row?.value ?? {}) as ContractDefaults;
}

/** Inserts version 1 if there is no template at all. Safe to run repeatedly. */
async function installSeed(ctx: MutationCtx) {
  const existing = await ctx.db.query("contractTemplates").first();
  if (existing) return { seeded: false as const };

  const id = await ctx.db.insert("contractTemplates", {
    name: SEED_TEMPLATE_NAME,
    body: SEED_CONTRACT_BODY,
    variables: extractVariables(SEED_CONTRACT_BODY),
    version: 1,
    active: true,
    createdAt: Date.now(),
    note: "Seeded. Not yet reviewed by a lawyer.",
  });

  /* supplierName is the one thing that cannot be guessed and must not be
     guessed — it is the name on the agreement. Seeded with the marker so
     generation refuses until it is set, rather than sending out a contract
     signed by nobody. */
  const existingDefaults = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", "contract.defaults"))
    .unique();
  if (!existingDefaults) {
    await ctx.db.insert("settings", {
      key: "contract.defaults",
      value: {
        supplierName: UNSET_MARKER,
        supplierTradingName: "YusufCreates",
        revisionLimit: "Two",
        feedbackDays: "three",
      } satisfies ContractDefaults,
    });
  }

  return { seeded: true as const, id };
}

/**
 * Two doors to the same seed, because they have different callers.
 *
 * The internal one is for `npx convex run contracts:seedTemplate` on a fresh
 * deployment, before anyone has signed in. The admin one is the button in the
 * template editor, for the far more likely case of noticing there is no
 * template while looking at the page that needs one.
 */
export const seedTemplate = internalMutation({
  args: {},
  handler: async (ctx) => await installSeed(ctx),
});

export const installSeedTemplate = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await installSeed(ctx);
  },
});

export const listTemplates = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("contractTemplates").order("desc").take(100);
  },
});

export const activeTemplate = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await activeTemplateRow(ctx);
  },
});

export const getDefaults = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await contractDefaults(ctx);
  },
});

export const saveDefaults = mutation({
  args: { values: v.any() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "contract.defaults"))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { value: args.values });
      return existing._id;
    }
    return await ctx.db.insert("settings", {
      key: "contract.defaults",
      value: args.values,
    });
  },
});

/**
 * Saving an edit INSERTS the next version rather than mutating the row.
 *
 * A signed contract keeps its own snapshot regardless, so versioning is not
 * what protects it. What versioning buys is being able to say "this contract
 * came from v3, and here is v3, unaltered" — the difference between an audit
 * trail and an assertion.
 */
export const saveTemplate = mutation({
  args: {
    name: v.string(),
    body: v.string(),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAdmin(ctx);
    if (!args.note.trim()) {
      throw new Error("Say what changed — a version history of dates is not one.");
    }

    const all = await ctx.db.query("contractTemplates").collect();
    const nextVersion =
      all.reduce((max, row) => Math.max(max, row.version), 0) + 1;

    // Exactly one active row. Enforced here rather than trusted, because
    // by_active cannot express uniqueness.
    for (const row of all) {
      if (row.active) await ctx.db.patch(row._id, { active: false });
    }

    const user = await ctx.db.get(userId);
    return await ctx.db.insert("contractTemplates", {
      name: args.name,
      body: args.body,
      variables: extractVariables(args.body),
      version: nextVersion,
      active: true,
      createdAt: Date.now(),
      createdBy: (user as { email?: string } | null)?.email,
      note: args.note.trim(),
    });
  },
});

/* ------------------------------------------------------------------ *
 * Generation
 * ------------------------------------------------------------------ */

/**
 * Builds a contract from a proposal and the active template.
 *
 * A plain helper rather than a mutation because proposals.respond calls it
 * inside its own transaction — the contract must exist by the time the client
 * is told to go and sign it, and a scheduled follow-up would leave a window
 * where Accept leads nowhere.
 */
export async function generateContract(
  ctx: MutationCtx,
  proposal: Doc<"proposals">,
): Promise<{ token: string; contractId: Id<"contracts"> }> {
  const template = await activeTemplateRow(ctx);
  if (!template) {
    throw new Error("No active contract template.");
  }

  const lead = await ctx.db.get(proposal.leadId);
  const defaults = await contractDefaults(ctx);
  const { deposit, balance } = splitAmount(proposal.amount);

  const values = buildContractVariables(
    proposal,
    lead,
    defaults,
    deposit,
    balance,
  );

  const unresolved = unresolvedRequired(values, UNSET_MARKER);
  if (unresolved.length > 0) {
    throw new Error(
      `Contract cannot be generated — these are unset: ${unresolved.join(", ")}. ` +
        `Set them in the admin under Contracts → Template.`,
    );
  }

  const { text, missing } = mergeTemplate(template.body, values);
  if (missing.length > 0) {
    throw new Error(
      `Template asks for variables nothing supplies: ${missing.join(", ")}.`,
    );
  }

  const now = Date.now();
  const token = makeToken();

  const contractId = await ctx.db.insert("contracts", {
    proposalId: proposal._id,
    leadId: proposal.leadId,
    templateId: template._id,
    templateVersion: template.version,
    bodySnapshot: text,
    variables: values,
    provider: "internal",
    token,
    status: "sent",
    clientName: values.clientName,
    clientEmail: proposal.clientEmail ?? lead?.email ?? "",
    amount: proposal.amount,
    currency: proposal.currency,
    sentAt: now,
    expiresAt: now + EXPIRY_MS,
    bodyHash: sha256Hex(text),
  });

  const genesis = genesisHash(text);
  await appendEvent(
    ctx,
    contractId,
    {
      type: "created",
      at: now,
      meta: { templateVersion: template.version, proposalId: proposal._id },
    },
    genesis,
  );
  await appendEvent(ctx, contractId, { type: "sent", at: now }, genesis);

  return { token, contractId };
}

/* ------------------------------------------------------------------ *
 * Public read — the token is the credential
 * ------------------------------------------------------------------ */

/**
 * The contract as the signer should see it, NOT the row.
 *
 * Returning the document would hand anyone with the link the lead id, the
 * previous signer's IP and the audit root. Same discipline as
 * invoices.getByToken.
 *
 * Expiry is DERIVED here rather than trusted from status: the sweep that
 * stamps "expired" runs on a schedule, and a contract must stop being signable
 * the moment it lapses, not the next time a cron happens to run.
 */
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const contract = await ctx.db
      .query("contracts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!contract) return null;
    if (contract.status === "draft") return null;
    if (contract.voidedAt) return null;

    const lapsed =
      Date.now() > contract.expiresAt ||
      contract.status === "expired" ||
      contract.status === "declined";

    return {
      body: contract.bodySnapshot,
      clientName: contract.clientName,
      amount: contract.amount,
      currency: contract.currency,
      status: contract.status,
      signedAt: contract.signedAt,
      expiresAt: contract.expiresAt,
      lapsed,
      signable: !lapsed && !contract.signedAt,
      consentText: CONSENT_TEXT,
      /* Set once the deposit exists, so the signed page can send them onward
         even if they closed the tab mid-redirect. */
      payUrl: contract.signedAt
        ? ((await depositUrl(ctx, contract)) ?? null)
        : null,
    };
  },
});

async function depositUrl(
  ctx: QueryCtx,
  contract: Doc<"contracts">,
): Promise<string | undefined> {
  if (!contract.depositInvoiceId) return undefined;
  const invoice = await ctx.db.get(contract.depositInvoiceId);
  return invoice?.stripeHostedUrl;
}

/* ------------------------------------------------------------------ *
 * Evidence-bearing writes — secret-gated, called only by our own routes
 * ------------------------------------------------------------------ */

/**
 * Records the first open.
 *
 * Secret-gated rather than public because it carries an IP, and a mutation the
 * browser can call with an arbitrary IP is not evidence of anything. Convex
 * cannot see the request address, so a Next route reads it and vouches for it
 * with the server secret.
 */
export const recordView = mutation({
  args: {
    secret: v.string(),
    token: v.string(),
    ip: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);

    const contract = await ctx.db
      .query("contracts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!contract || contract.signedAt || contract.voidedAt) {
      return { ok: false as const };
    }

    // viewedAt is set once and never reset, so "sent but never opened" and
    // "read and ignored" stay distinguishable — they mean different things.
    if (contract.viewedAt) return { ok: true as const };

    const now = Date.now();
    await ctx.db.patch(contract._id, {
      viewedAt: now,
      status: contract.status === "sent" ? "viewed" : contract.status,
    });
    await appendEvent(
      ctx,
      contract._id,
      { type: "viewed", at: now, ip: args.ip, userAgent: args.userAgent },
      genesisHash(contract.bodySnapshot),
    );

    return { ok: true as const };
  },
});

/**
 * THE COMMIT POINT.
 *
 * One transaction stamps the signature, appends the consent and signature
 * events to the chain, and raises both invoices. Everything external — Stripe,
 * the PDF, the confirmation email — happens after this returns and can fail
 * without costing anyone their signature.
 *
 * Idempotent by construction: a contract that already has signedAt returns
 * what the first call produced rather than signing twice or raising a second
 * deposit. That matters because this is the event that asks someone for money,
 * and a double-submitted slider must not produce two invoices.
 */
export const recordSignature = mutation({
  args: {
    secret: v.string(),
    token: v.string(),
    typedName: v.string(),
    signatureStorageId: v.optional(v.id("_storage")),
    ip: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    consentText: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);

    const contract = await ctx.db
      .query("contracts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!contract) throw new Error("No such contract.");
    if (contract.voidedAt) throw new Error("This contract was voided.");

    if (contract.signedAt) {
      const invoice = contract.depositInvoiceId
        ? await ctx.db.get(contract.depositInvoiceId)
        : null;
      return {
        alreadySigned: true as const,
        contractId: contract._id,
        depositInvoiceId: contract.depositInvoiceId ?? null,
        payUrl: invoice?.stripeHostedUrl ?? null,
        invoice: invoice ? invoiceForStripe(invoice) : null,
      };
    }

    if (Date.now() > contract.expiresAt || contract.status === "expired") {
      throw new Error("This contract has expired.");
    }
    if (!args.typedName.trim()) throw new Error("A name is required.");

    const now = Date.now();
    const genesis = genesisHash(contract.bodySnapshot);

    await appendEvent(
      ctx,
      contract._id,
      {
        type: "consented",
        at: now,
        ip: args.ip,
        userAgent: args.userAgent,
        meta: { consentText: args.consentText },
      },
      genesis,
    );

    const auditRoot = await appendEvent(
      ctx,
      contract._id,
      {
        type: "signed",
        at: now,
        ip: args.ip,
        userAgent: args.userAgent,
        meta: {
          typedName: args.typedName.trim(),
          bodyHash: contract.bodyHash,
        },
      },
      genesis,
    );

    // The client account usually does not exist yet — a contract is signed
    // before anyone has a portal login. Resolve it if it happens to be there
    // and let the client-creation path back-fill it otherwise.
    const client = contract.clientEmail
      ? await ctx.db
          .query("clients")
          .withIndex("by_email", (q) =>
            q.eq("email", contract.clientEmail.toLowerCase()),
          )
          .unique()
      : null;

    const pair = await insertInvoicePair(ctx, {
      leadId: contract.leadId,
      proposalId: contract.proposalId,
      contractId: contract._id,
      clientName: contract.clientName,
      clientEmail: contract.clientEmail,
      description: `${contract.clientName} — project work`,
      amount: contract.amount,
      currency: contract.currency,
      dueDate: now + 14 * 24 * 60 * 60 * 1000,
    });

    await ctx.db.patch(contract._id, {
      status: "signed",
      signedAt: now,
      signerTypedName: args.typedName.trim(),
      signerSignatureFileId: args.signatureStorageId,
      signerIp: args.ip,
      signerUserAgent: args.userAgent,
      consentAcceptedAt: now,
      consentText: args.consentText,
      auditRoot,
      clientId: client?._id,
      depositInvoiceId: pair.depositId,
      // Cleared by the route once Stripe and the PDF succeed. Left set, a
      // sweep picks them up — the signature is never the thing that is lost.
      depositPendingAt: now,
      pdfPendingAt: now,
    });

    // The proposal is genuinely signed now, not merely accepted.
    await ctx.db.patch(contract.proposalId, {
      status: "signed",
      signedAt: now,
    });

    const invoice = await ctx.db.get(pair.depositId);

    return {
      alreadySigned: false as const,
      contractId: contract._id,
      depositInvoiceId: pair.depositId,
      payUrl: null,
      invoice: invoice ? invoiceForStripe(invoice) : null,
    };
  },
});

/** Exactly the fields the Stripe issuing helper needs, and nothing else. */
function invoiceForStripe(invoice: Doc<"invoices">) {
  return {
    _id: invoice._id,
    clientName: invoice.clientName,
    clientEmail: invoice.clientEmail,
    description: invoice.description,
    amount: invoice.amount,
    currency: invoice.currency,
    stage: invoice.stage,
    reference: invoice.reference,
    stripeInvoiceId: invoice.stripeInvoiceId,
    stripeHostedUrl: invoice.stripeHostedUrl,
  };
}

/** Clears a pending stamp once the route has actually done the thing. */
export const clearPending = mutation({
  args: {
    secret: v.string(),
    contractId: v.id("contracts"),
    which: v.union(v.literal("deposit"), v.literal("pdf")),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    await ctx.db.patch(
      args.contractId,
      args.which === "deposit"
        ? { depositPendingAt: undefined }
        : { pdfPendingAt: undefined },
    );
  },
});

/**
 * Everything the PDF renderer needs, in one round trip.
 *
 * Secret-gated rather than admin-gated: the caller is the signing route acting
 * for a client who has just signed and is not an admin. It resolves the
 * signature image URL here so the renderer does not have to hold the secret
 * twice.
 */
export const getForPdf = query({
  args: { secret: v.string(), id: v.id("contracts") },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);

    const contract = await ctx.db.get(args.id);
    if (!contract) return null;

    const events = await ctx.db
      .query("contractEvents")
      .withIndex("by_contract", (q) => q.eq("contractId", args.id))
      .collect();

    const signatureUrl = contract.signerSignatureFileId
      ? await ctx.storage.getUrl(contract.signerSignatureFileId)
      : null;

    return { contract, events, signatureUrl };
  },
});

export const attachSignedPdf = mutation({
  args: {
    secret: v.string(),
    contractId: v.id("contracts"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    const contract = await ctx.db.get(args.contractId);
    if (!contract) throw new Error("No such contract.");

    await ctx.db.patch(args.contractId, {
      signedPdfFileId: args.storageId,
      pdfPendingAt: undefined,
    });
    await appendEvent(
      ctx,
      args.contractId,
      { type: "pdf_stored", at: Date.now() },
      genesisHash(contract.bodySnapshot),
    );
  },
});

/* ------------------------------------------------------------------ *
 * Verification
 * ------------------------------------------------------------------ */

/**
 * Recomputes the whole chain and says whether it still holds.
 *
 * This is the answer to "how would you know if someone edited the database?"
 * It is not proof against me — I own the deployment and could recompute every
 * hash. It is proof against everything short of that: a patched row, a deleted
 * event, a body edited after signing.
 */
export const verifyChain = query({
  args: { id: v.id("contracts") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const contract = await ctx.db.get(args.id);
    // One shape on every path. A union return forced every caller to narrow
    // before it could read `problems`, which is the one field it wants.
    if (!contract) {
      return {
        ok: false,
        problems: ["No such contract."],
        events: 0,
        bodyHash: "",
      };
    }

    const events = await ctx.db
      .query("contractEvents")
      .withIndex("by_contract", (q) => q.eq("contractId", args.id))
      .collect();

    const problems: string[] = [];

    const bodyHash = sha256Hex(contract.bodySnapshot);
    if (contract.bodyHash && contract.bodyHash !== bodyHash) {
      problems.push(
        "The stored body no longer matches its recorded hash — the text was changed after signing.",
      );
    }

    let prev = genesisHash(contract.bodySnapshot);
    events.sort((a, b) => a.seq - b.seq);

    for (const [index, event] of events.entries()) {
      if (event.seq !== index) {
        problems.push(`Event ${index} is numbered ${event.seq} — one is missing.`);
      }
      if (event.prevHash !== prev) {
        problems.push(`Event ${event.seq} (${event.type}) does not follow the one before it.`);
      }
      const expected = chainHash(event.prevHash, {
        type: event.type,
        at: event.at,
        seq: event.seq,
        ip: event.ip,
        userAgent: event.userAgent,
        meta: event.meta,
      });
      if (expected !== event.hash) {
        problems.push(`Event ${event.seq} (${event.type}) has been altered.`);
      }
      prev = event.hash;
    }

    if (contract.auditRoot) {
      const signed = events.filter((e) => e.type === "signed").at(-1);
      if (!signed) {
        problems.push("An audit root is recorded but no signature event exists.");
      } else if (signed.hash !== contract.auditRoot) {
        problems.push("The recorded audit root does not match the signature event.");
      }
    }

    return {
      ok: problems.length === 0,
      problems,
      events: events.length,
      bodyHash,
    };
  },
});

/* ------------------------------------------------------------------ *
 * Admin
 * ------------------------------------------------------------------ */

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("contracts").order("desc").take(200);
  },
});

export const getById = query({
  args: { id: v.id("contracts") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const contract = await ctx.db.get(args.id);
    if (!contract) return null;
    const events = await ctx.db
      .query("contractEvents")
      .withIndex("by_contract", (q) => q.eq("contractId", args.id))
      .collect();
    return { contract, events };
  },
});

/**
 * What a contract for this proposal WOULD say, rendered through the same merge
 * the generator uses.
 *
 * A preview built any other way is a different document that happens to look
 * similar, which is worse than no preview — this repo already lost a day to
 * two copies of the markdown renderer drifting apart.
 */
export const previewFor = query({
  args: { proposalId: v.id("proposals") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal) return null;

    const template = await activeTemplateRow(ctx);
    if (!template) {
      return { error: "No active contract template." as const };
    }

    const lead = await ctx.db.get(proposal.leadId);
    const defaults = await contractDefaults(ctx);
    const { deposit, balance } = splitAmount(proposal.amount);
    const values = buildContractVariables(
      proposal,
      lead,
      defaults,
      deposit,
      balance,
    );
    const { text, missing } = mergeTemplate(template.body, values);

    return {
      body: text,
      missing,
      unresolved: unresolvedRequired(values, UNSET_MARKER),
      templateVersion: template.version,
      values,
    };
  },
});

/** Preview an arbitrary body against a real proposal — for the template editor. */
export const previewBody = query({
  args: { body: v.string(), proposalId: v.optional(v.id("proposals")) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const proposal = args.proposalId
      ? await ctx.db.get(args.proposalId)
      : await ctx.db.query("proposals").order("desc").first();

    const defaults = await contractDefaults(ctx);
    if (!proposal) {
      return { body: args.body, missing: extractVariables(args.body), values: {} };
    }

    const lead = await ctx.db.get(proposal.leadId);
    const { deposit, balance } = splitAmount(proposal.amount);
    const values = buildContractVariables(
      proposal,
      lead,
      defaults,
      deposit,
      balance,
    );
    const { text, missing } = mergeTemplate(args.body, values);
    return { body: text, missing, values };
  },
});

/**
 * Everything, for the local export.
 *
 * The whole point of storing contracts here rather than at a provider is that
 * they are yours — which is only true if you can get them out. This is the
 * "get them out": every contract, its full event chain, and every template
 * version, in one call.
 *
 * Not paginated. There will be tens of these, not millions, and an export that
 * silently returns the first page is worse than one that is slow.
 */
export const exportAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const contracts = await ctx.db.query("contracts").collect();
    const templates = await ctx.db.query("contractTemplates").collect();

    const withEvents = [];
    for (const contract of contracts) {
      const events = await ctx.db
        .query("contractEvents")
        .withIndex("by_contract", (q) => q.eq("contractId", contract._id))
        .collect();
      withEvents.push({ contract, events: events.sort((a, b) => a.seq - b.seq) });
    }

    return { contracts: withEvents, templates, exportedAt: Date.now() };
  },
});

/** One contract's trail, for the per-row JSON download. */
export const auditTrail = query({
  args: { id: v.id("contracts") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const contract = await ctx.db.get(args.id);
    if (!contract) return null;

    const events = await ctx.db
      .query("contractEvents")
      .withIndex("by_contract", (q) => q.eq("contractId", args.id))
      .collect();

    return {
      contract,
      events: events.sort((a, b) => a.seq - b.seq),
      // Recomputed at export time rather than copied, so the file says whether
      // the chain held AT THE MOMENT IT WAS EXPORTED, which is the claim
      // anyone reading it cares about.
      recomputedBodyHash: sha256Hex(contract.bodySnapshot),
    };
  },
});

export const voidContract = mutation({
  args: { id: v.id("contracts"), reason: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const contract = await ctx.db.get(args.id);
    if (!contract) throw new Error("No such contract.");
    if (contract.signedAt) {
      throw new Error(
        "A signed contract cannot be voided — that is the point of signing it.",
      );
    }

    const now = Date.now();
    await ctx.db.patch(args.id, { voidedAt: now, voidReason: args.reason });
    await appendEvent(
      ctx,
      args.id,
      { type: "voided", at: now, meta: { reason: args.reason } },
      genesisHash(contract.bodySnapshot),
    );
  },
});

/**
 * Regenerates an unsigned contract against the current active template.
 *
 * Deliberately refuses on a signed one. The snapshot is what somebody agreed
 * to; "regenerating" it would be rewriting history with extra steps.
 */
export const regenerate = mutation({
  args: { id: v.id("contracts") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const old = await ctx.db.get(args.id);
    if (!old) throw new Error("No such contract.");
    if (old.signedAt) throw new Error("That contract is signed.");

    const proposal = await ctx.db.get(old.proposalId);
    if (!proposal) throw new Error("Its proposal is gone.");

    await ctx.db.patch(args.id, {
      voidedAt: Date.now(),
      voidReason: "Superseded by a regenerated contract.",
    });

    return await generateContract(ctx, proposal);
  },
});

/** Called from the proposals admin when a contract needs sending again. */
export const resend = mutation({
  args: { id: v.id("contracts") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const contract = await ctx.db.get(args.id);
    if (!contract) throw new Error("No such contract.");
    if (contract.signedAt) throw new Error("That contract is already signed.");

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "sent",
      sentAt: now,
      expiresAt: now + EXPIRY_MS,
      expiredAt: undefined,
      staleAlertAt: undefined,
    });
    await appendEvent(
      ctx,
      args.id,
      { type: "sent", at: now, meta: { resent: true } },
      genesisHash(contract.bodySnapshot),
    );

    return { token: contract.token };
  },
});

/* ------------------------------------------------------------------ *
 * Sweeps
 * ------------------------------------------------------------------ */

/** Viewed and left unsigned this long is an objection, not a delay. */
const STALE_AFTER_MS = 48 * 60 * 60 * 1000;

/**
 * Chases and expires.
 *
 * Follows the two-stage shape of automation.sweepUnpaid, and the same rule:
 * THE STAMP IS WRITTEN WITH THE EFFECT, in one mutation, so a partial failure
 * cannot email the same person every fifteen minutes forever.
 *
 * Expiry is stamped here even though getByToken already derives it, because
 * lapsing has an EXTERNAL consequence — an email — and the cron doctrine in
 * crons.ts only justifies a job when something must happen at a particular
 * time. Signability is derived; the letter saying so is stamped.
 */
export const sweepContracts = internalMutation({
  args: {},
  handler: async (ctx) => await sweepContractsInner(ctx),
});

/**
 * What still owes doing after a signature.
 *
 * Signing commits before Stripe or the PDF is attempted, so either can be left
 * outstanding. This is the queue that finishes the job — a client who signed
 * and never got an invoice is the worst failure this feature has, because from
 * their side they did everything right.
 */
async function collectRetries(ctx: QueryCtx) {
  const signed = await ctx.db
    .query("contracts")
    .withIndex("by_status", (q) => q.eq("status", "signed"))
    .take(200);

  return signed
    .filter((row) => row.depositPendingAt || row.pdfPendingAt)
    .map((row) => ({
      id: row._id,
      needsDeposit: Boolean(row.depositPendingAt),
      needsPdf: Boolean(row.pdfPendingAt),
      depositInvoiceId: row.depositInvoiceId ?? null,
    }));
}

export const pendingRetries = query({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    return await collectRetries(ctx);
  },
});

/** Queues for the Next route that actually sends the email. */
async function collectQueues(ctx: QueryCtx) {
  const now = Date.now();

  const staleRows = await ctx.db
    .query("contracts")
    .withIndex("by_status", (q) => q.eq("status", "viewed"))
    .take(200);

  const expiredRows = await ctx.db
    .query("contracts")
    .withIndex("by_status", (q) => q.eq("status", "expired"))
    .take(200);

  const signedRows = await ctx.db
    .query("contracts")
    .withIndex("by_status", (q) => q.eq("status", "signed"))
    .take(200);

  return {
    now,
    stale: staleRows
      .filter((r) => r.staleAlertAt && !r.signedAt && !r.voidedAt)
      .map((r) => ({
        id: r._id,
        clientName: r.clientName,
        clientEmail: r.clientEmail,
        viewedAt: r.viewedAt ?? null,
        amount: r.amount,
        currency: r.currency,
      })),
    expired: expiredRows
      .filter((r) => r.expiredAt && !r.expiredEmailAt && !r.voidedAt)
      .map((r) => ({
        id: r._id,
        clientName: r.clientName,
        clientEmail: r.clientEmail,
      })),
    // The signed-contract copy. Queued rather than sent inline, so it never
    // sits between accepting and paying.
    signed: signedRows
      // Waits for the PDF, so the email can honestly point at a copy that
      // exists. Telling someone their contract is filed before it is would be
      // a small lie with an obvious way of being found out.
      .filter((r) => r.signedAt && !r.signedEmailAt && r.signedPdfFileId)
      .map((r) => ({
        id: r._id,
        clientName: r.clientName,
        clientEmail: r.clientEmail,
        signedAt: r.signedAt ?? null,
        bodyHash: r.bodyHash ?? null,
      })),
  };
}

/** The invoice fields the retry needs, without an admin session. */
export const invoiceForRetry = query({
  args: { secret: v.string(), id: v.id("invoices") },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    const invoice = await ctx.db.get(args.id);
    return invoice ? invoiceForStripe(invoice) : null;
  },
});

export const pendingContractEmails = query({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    return await collectQueues(ctx);
  },
});

/**
 * Stamped by the sender once an email has actually gone.
 *
 * Separate from the sweep that queued it, because the sweep runs in Convex and
 * the sending happens in a Next route — the stamp has to follow the send, not
 * the decision to send.
 */
export const markContractEmailed = mutation({
  args: {
    secret: v.string(),
    id: v.id("contracts"),
    kind: v.union(
      v.literal("stale"),
      v.literal("expired"),
      v.literal("signed"),
    ),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    const now = Date.now();
    // "stale" needs no stamp here: staleAlertAt was written by the sweep with
    // the decision, and it is the guard that stops it repeating.
    if (args.kind === "expired") {
      await ctx.db.patch(args.id, { expiredEmailAt: now });
    } else if (args.kind === "signed") {
      await ctx.db.patch(args.id, { signedEmailAt: now });
    }
  },
});

/**
 * The same sweep, reachable by the Next cron route.
 *
 * Two exports, one implementation — the shape automation.ts already uses. The
 * internal one is for the Convex cron; this one carries the secret gate for a
 * server route with no session to authenticate.
 */
export const sweepContractsPublic = mutation({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    return await sweepContractsInner(ctx);
  },
});

async function sweepContractsInner(ctx: MutationCtx) {
  const now = Date.now();
  const stale = [];
  const expired = [];

  for (const status of ["sent", "viewed"] as const) {
    const rows = await ctx.db
      .query("contracts")
      .withIndex("by_status", (q) => q.eq("status", status))
      .take(200);

    for (const row of rows) {
      if (row.voidedAt || row.signedAt) continue;

      if (now > row.expiresAt && !row.expiredAt) {
        await ctx.db.patch(row._id, { status: "expired", expiredAt: now });
        await appendEvent(
          ctx,
          row._id,
          { type: "expired", at: now },
          genesisHash(row.bodySnapshot),
        );
        expired.push(row._id);
        continue;
      }

      if (
        row.viewedAt &&
        now - row.viewedAt >= STALE_AFTER_MS &&
        !row.staleAlertAt
      ) {
        await ctx.db.patch(row._id, { staleAlertAt: now });
        stale.push(row._id);
      }
    }
  }

  return { stale: stale.length, expired: expired.length };
}

/**
 * Pokes the Next drain route so queued contract email goes out promptly.
 *
 * THE PROBLEM THIS SOLVES: Vercel's Hobby plan rejects any cron faster than
 * daily, and rejects it at DEPLOY time — so /api/cron/notify runs at 06:00 and
 * nothing else. The Convex sweep can stamp a 48-hour alert within fifteen
 * minutes of it being due, but the email telling anyone could then sit for
 * another day. A "read and not signed" alert that arrives at 72 hours is not
 * the alert that was designed.
 *
 * Convex crons have no such limit and Convex ACTIONS can fetch, so this closes
 * the loop on Convex's own scheduler. It calls the existing route rather than
 * duplicating the sending, so there is still exactly one implementation.
 *
 * No-ops quietly when the site URL is unset. A deployment without it is a
 * local one, and failing loudly every fifteen minutes there would be noise.
 */
export const pokeNotify = internalAction({
  args: {},
  handler: async () => {
    const base = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
    const secret = process.env.EMAIL_LOG_SECRET;
    if (!base || !secret) return { poked: false as const };

    try {
      const response = await fetch(`${base}/api/cron/notify`, {
        method: "POST",
        headers: { "x-cron-secret": secret },
        /*
         * Redirects are NOT followed, for the same reason as the dispatcher
         * poke in convex/notify.ts — see the longer note there.
         *
         * If SITE_URL is the apex and the site canonicalises to www (or the
         * reverse), fetch drops the secret header on the cross-origin hop and
         * the route answers 401 to a request carrying the correct secret.
         * Refusing to follow turns that into a 308 named below.
         */
        redirect: "manual",
        // The route drains queues and sends mail; this only starts it.
        signal: AbortSignal.timeout(20_000),
      });

      if (response.status >= 300 && response.status < 400) {
        console.warn(
          `[contracts] SITE_URL (${base}) redirects — it must be the canonical origin, or the secret header is dropped on the hop. Contract mail will only send on the daily cron until it is fixed.`,
        );
        return { poked: false as const, status: response.status };
      }

      /*
       * A non-2xx is reported rather than returned as a success.
       *
       * This used to return `poked: true` on any response at all, so a 401
       * from a misconfigured SITE_URL read as a healthy poke — the one state
       * worth knowing about was the one it hid.
       */
      if (!response.ok) {
        console.warn(
          `[contracts] the notify route answered ${response.status}. Contract mail stays queued for the daily cron.`,
        );
        return { poked: false as const, status: response.status };
      }

      return { poked: true as const, status: response.status };
    } catch (err) {
      // The daily Vercel cron is still the backstop, so a failed poke delays
      // mail rather than losing it.
      console.warn("[contracts] poke failed:", err);
      return { poked: false as const };
    }
  },
});

export const setStatus = mutation({
  args: { id: v.id("contracts"), status: contractStatus },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const contract = await ctx.db.get(args.id);
    if (contract?.signedAt) {
      throw new Error("A signed contract's status is not editable.");
    }
    await ctx.db.patch(args.id, { status: args.status });
  },
});
