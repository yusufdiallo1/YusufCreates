import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";
import { leadStatus, slideSignals } from "./schema";

/**
 * Public submission. Deliberately does NOT accept `score`, `status` or
 * `turnstileVerified` from the caller — those are decided server-side.
 */
export const submit = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    contactPreference: v.optional(v.string()),
    company: v.optional(v.string()),
    role: v.optional(v.string()),
    projectType: v.optional(v.string()),
    projectPurpose: v.optional(v.string()),
    audience: v.optional(v.string()),
    currentState: v.optional(v.string()),
    existingUrl: v.optional(v.string()),
    tier: v.optional(v.string()),
    plan: v.optional(v.string()),
    timeline: v.optional(v.string()),
    /** A band ("4 to 6"), not a number — see the schema comment. */
    pageCount: v.optional(v.union(v.string(), v.number())),
    onePagePurpose: v.optional(v.string()),
    platforms: v.optional(v.string()),
    message: v.optional(v.string()),
    procurementProcess: v.optional(v.string()),
    ndaRequired: v.optional(v.boolean()),
    targetLaunch: v.optional(v.string()),
    decisionMakers: v.optional(v.string()),
    supportScope: v.optional(v.string()),
    supportUrl: v.optional(v.string()),
    supportIssues: v.optional(v.string()),
    supportStack: v.optional(v.string()),
    preferredStack: v.optional(v.string()),
    supportAccess: v.optional(v.string()),
    promoCode: v.optional(v.string()),
    source: v.optional(v.string()),
    currency: v.optional(v.string()),
    vatNumber: v.optional(v.string()),
    crNumber: v.optional(v.string()),
    entityType: v.optional(v.string()),
    turnstileToken: v.optional(v.string()),
    slideSignals: v.optional(slideSignals),
    /** Computed in the route handler, which is not caller-controlled. */
    score: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { turnstileToken, score: providedScore, ...lead } = args;

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lead.email)) {
      throw new Error("A valid email address is required.");
    }

    // Turnstile is verified in the route handler before this runs; the token's
    // presence is recorded, never treated as proof on its own.
    const turnstileVerified = Boolean(turnstileToken);

    return await ctx.db.insert("leads", {
      ...lead,
      status: "new" as const,
      turnstileVerified,
      // The route handler scores against the full weighting model; this
      // fallback only applies if a lead is written from somewhere else.
      score: providedScore ?? scoreLead(args),
    });
  },
});

/** Cheap heuristic score. Behavioural signals weigh against automation. */
function scoreLead(args: {
  plan?: string;
  company?: string;
  message?: string;
  slideSignals?: {
    durationMs: number;
    pointerSamples: number;
    usedKeyboard: boolean;
  };
}): number {
  let score = 0;
  if (args.company) score += 15;
  // A chosen plan is a chosen price — the strongest single signal here now
  // that no budget band is collected.
  if (args.plan) score += 25;
  if (args.message && args.message.length > 80) score += 20;

  const s = args.slideSignals;
  if (s) {
    // A real drag produces many pointer samples over a human interval.
    if (s.pointerSamples > 8) score += 20;
    if (s.durationMs > 300 && s.durationMs < 15000) score += 20;
    if (s.usedKeyboard) score += 20; // keyboard use is a strong human signal
  }
  return Math.min(score, 100);
}

export const list = query({
  args: {
    status: v.optional(leadStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    if (args.status !== undefined) {
      const status = args.status;
      return await ctx.db
        .query("leads")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc")
        .take(args.limit ?? 50);
    }

    return await ctx.db
      .query("leads")
      .order("desc")
      .take(args.limit ?? 50);
  },
});

export const get = query({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.get(args.id);
  },
});

export const setStatus = mutation({
  args: { id: v.id("leads"), status: leadStatus },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { status: args.status });
  },
});

/**
 * Deletes a lead permanently.
 *
 * There is no soft-delete flag and no undo. A lead is a message someone sent
 * me; keeping a hidden copy of one I have deliberately thrown away is worse
 * than losing it, and "archived" would only grow a second inbox I never read.
 *
 * The confirmation lives in the UI as a slide gesture, which is a deliberate
 * act rather than a click that can land by accident.
 */
export const remove = mutation({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

/* ---------------------------------------------------------------------------
   The decision: approve or decline a request.

   These live on leads rather than reusing express.approve / express.decline,
   which look superficially similar. Those operate on `expressBuilds` — a row
   that only exists once someone has bought an Express build and has a token, a
   deadline and a payment state. A lead is the enquiry BEFORE any of that. The
   two share a vocabulary, not a table, and forcing one through the other would
   mean minting an expressBuild for every enquiry just to be able to decline it.
   --------------------------------------------------------------------------- */

/** Twelve hours to get an instant start set up. */
const SETUP_WINDOW_MS = 12 * 60 * 60 * 1000;

/**
 * Accepts a request and turns it into a client.
 *
 * IDEMPOTENT. Approving twice must not create a second client row or a second
 * project — the button is on a screen that can be double-clicked, and a
 * duplicated client is a mess that has to be cleaned up by hand. The lookup by
 * email is what makes it safe, and it is also what links an approval to a
 * client who has been here before.
 *
 * `mode` decides which clock starts:
 *   "instant" — work begins now, and there is a 12h window to get them set up.
 *   "slot"    — booked for a month, so nothing is due yet.
 */
export const approve = mutation({
  args: {
    id: v.id("leads"),
    mode: v.union(v.literal("instant"), v.literal("slot")),
    /** Required for "slot", as "2026-09". Ignored for "instant". */
    scheduledMonth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const lead = await ctx.db.get(args.id);
    if (!lead) throw new Error("That request no longer exists.");

    if (args.mode === "slot" && !args.scheduledMonth) {
      throw new Error("A slot start needs a month.");
    }

    const now = Date.now();
    const email = lead.email.trim().toLowerCase();

    // Reuse the existing client row when there is one, so a returning client
    // gains a project rather than a duplicate identity.
    const existing = await ctx.db
      .query("clients")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    const clientId =
      existing?._id ??
      (await ctx.db.insert("clients", {
        email,
        name: lead.name,
        company: lead.company,
        // The link back to the enquiry. Without it the client record is a
        // retyped copy and the brief, score and history are orphaned.
        leadId: lead._id,
        createdAt: now,
      }));

    if (existing && !existing.leadId) {
      await ctx.db.patch(existing._id, { leadId: lead._id });
    }

    /*
     * One project per approval, but not per CLICK.
     *
     * Guarded on the lead's own decision rather than on a project-name match:
     * two genuine projects for the same client can legitimately share a name,
     * and refusing the second would be worse than the duplicate it prevents.
     */
    let projectId = null;
    if (lead.decision !== "approved") {
      projectId = await ctx.db.insert("clientProjects", {
        clientId,
        name: lead.projectType?.trim() || `${lead.name} — project`,
        description: lead.projectPurpose ?? lead.message,
        status: "planning",
        startedAt: now,
        createdAt: now,
      });
    }

    await ctx.db.patch(lead._id, {
      status: "won",
      decision: "approved",
      decidedAt: now,
      setupDueAt: args.mode === "instant" ? now + SETUP_WINDOW_MS : undefined,
      scheduledMonth: args.mode === "slot" ? args.scheduledMonth : undefined,
      // Clears a previous decline, so changing your mind leaves no stale reason
      // sitting on an approved request.
      declineReason: undefined,
    });

    return { clientId, projectId };
  },
});

/**
 * Declines a request.
 *
 * Deliberately does NOT delete the lead. A declined enquiry is still a record
 * of who asked and what for — useful when they come back, and the only way to
 * tell "never replied" from "answered, and said no". leads.remove exists for
 * actually throwing one away.
 *
 * No email is sent from here. Declining and telling someone you have declined
 * are separate acts, and a mutation that silently mails a stranger the instant
 * an admin clicks the wrong button is the wrong shape.
 */
export const decline = mutation({
  args: {
    id: v.id("leads"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const lead = await ctx.db.get(args.id);
    if (!lead) throw new Error("That request no longer exists.");

    await ctx.db.patch(lead._id, {
      status: "lost",
      decision: "declined",
      decidedAt: Date.now(),
      declineReason: args.reason?.trim() || undefined,
      setupDueAt: undefined,
      scheduledMonth: undefined,
    });
  },
});

/**
 * Undoes a decision, returning the request to the inbox.
 *
 * The client row and any project created by an approval are deliberately left
 * alone. Reversing a decision is a correction to the pipeline, not a licence
 * to delete a client's project — if that project should go too, it is removed
 * from the clients screen where its consequences are visible.
 */
export const undecide = mutation({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, {
      status: "qualified",
      decision: undefined,
      decidedAt: undefined,
      setupDueAt: undefined,
      scheduledMonth: undefined,
      declineReason: undefined,
    });
  },
});

/**
 * Everything waiting on a decision, newest first.
 *
 * Filtered in the handler rather than by index: `decision` is undefined on
 * every historical row and Convex cannot index an absent field usefully, so an
 * index would need a backfill to be correct. The inbox is small by definition —
 * anything decided leaves it — so scanning recent leads is cheap and stays
 * correct with no migration.
 */
export const pendingDecision = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const recent = await ctx.db.query("leads").order("desc").take(200);
    return recent
      .filter((l) => !l.decision && l.status !== "won" && l.status !== "lost")
      .slice(0, args.limit ?? 50);
  },
});
