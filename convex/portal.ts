import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireAdmin } from "./lib/auth";
import { purgeForClient } from "./credentials";
import { completion } from "./intakeSections";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

/**
 * Client portal.
 *
 * Clients see CLIENT PROJECTS — the work being done for them — not the public
 * portfolio. Those are separate tables on purpose: a portfolio piece is
 * marketing I control, a client project is a live engagement with milestones,
 * files and invoices attached.
 *
 * THE RULE THIS FILE ENFORCES: a project id is never taken from the request.
 * It is resolved from the authenticated session and checked against ownership.
 * Changing an id in the URL is the first thing anyone tries, and it must
 * return nothing.
 */

async function requireClient(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"clients">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated.");

  const user = await ctx.db.get(userId);
  const email = (user as { email?: string } | null)?.email?.toLowerCase();
  if (!email) throw new Error("Not authorised.");

  const client = await ctx.db
    .query("clients")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique();

  if (!client) throw new Error("Not authorised.");
  return client;
}

/**
 * Throws unless the caller owns this project.
 *
 * Ownership is read from the project's own clientId rather than a list on the
 * client, so there is exactly one source of truth and no way for the two to
 * disagree.
 */
async function assertOwns(
  ctx: QueryCtx | MutationCtx,
  client: Doc<"clients">,
  projectId: Id<"clientProjects">,
): Promise<Doc<"clientProjects">> {
  const project = await ctx.db.get(projectId);
  // Deliberately the same error for "not yours" and "does not exist" —
  // distinguishing them confirms which ids are real.
  if (!project || project.clientId !== client._id) {
    throw new Error("Not authorised.");
  }
  return project;
}

/** Everything the portal home needs, for the caller's own projects only. */
export const overview = query({
  args: {},
  handler: async (ctx) => {
    const client = await requireClient(ctx);

    const projects = await ctx.db
      .query("clientProjects")
      .withIndex("by_client", (q) => q.eq("clientId", client._id))
      .collect();

    const withProgress = await Promise.all(
      projects.map(async (project) => {
        const milestones = await ctx.db
          .query("milestones")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();

        const done = milestones.filter((m) => m.status === "done").length;

        return {
          _id: project._id,
          title: project.name,
          description: project.description ?? null,
          status: project.status,
          // The single figure that kills most "any update?" emails, so it is
          // computed here rather than left to the reader.
          percentComplete:
            milestones.length === 0
              ? 0
              : Math.round((done / milestones.length) * 100),
          milestones: milestones.sort((a, b) => a.order - b.order),
        };
      }),
    );

    /*
     * The deposit gate.
     *
     * Until the first 40% is paid, the portal shows the invoice and nothing
     * else. Progress, chat and calls are what the engagement buys, and handing
     * them over before it has been paid for makes the deposit optional in
     * practice however firmly the email words it.
     *
     * LOCKED ONLY WHEN MONEY IS ACTUALLY OWED, never by default. A client with
     * no deposit invoice at all — added by hand, on a retainer, or on some
     * other arrangement — is not locked out. The gate engages when a deposit
     * has been ISSUED and not paid, which is a fact about this project rather
     * than an assumption about the client.
     *
     * Computed here rather than in the browser: a client who can see the
     * locked flag can also flip it, and "hidden in the UI" is not a gate. The
     * queries behind each section check their own permissions too — this
     * decides what to SHOW, and those decide what to serve.
     */
    const invoices = await ctx.db.query("invoices").collect();
    const mine = invoices.filter(
      (i) =>
        i.status !== "draft" &&
        i.clientEmail.toLowerCase() === client.email.toLowerCase(),
    );
    const deposits = mine.filter((i) => i.stage === "deposit");
    const depositPaid = deposits.some((i) => i.status === "paid");
    const depositOutstanding = deposits.some(
      (i) => i.status === "sent" || i.status === "overdue",
    );

    return {
      name: client.name,
      projects: withProgress,
      access: {
        locked: depositOutstanding && !depositPaid,
        depositPaid,
        /** Drives the copy: "pay to start" reads wrong on an overdue invoice. */
        overdue: deposits.some((i) => i.status === "overdue"),
      },
    };
  },
});

export const deliverables = query({
  args: { projectId: v.id("clientProjects") },
  handler: async (ctx, args) => {
    const client = await requireClient(ctx);
    await assertOwns(ctx, client, args.projectId);

    return await ctx.db
      .query("deliverables")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();
  },
});

export const approveDeliverable = mutation({
  args: { id: v.id("deliverables") },
  handler: async (ctx, args) => {
    const client = await requireClient(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Not found.");
    // Checked against the deliverable's own project, not a caller-supplied id.
    await assertOwns(ctx, client, item.projectId);

    await ctx.db.patch(args.id, { approvedAt: Date.now() });
  },
});

export const messages = query({
  args: { projectId: v.id("clientProjects") },
  handler: async (ctx, args) => {
    const client = await requireClient(ctx);
    await assertOwns(ctx, client, args.projectId);

    return await ctx.db
      .query("portalMessages")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("asc")
      .take(200);
  },
});

export const postMessage = mutation({
  args: { projectId: v.id("clientProjects"), body: v.string() },
  handler: async (ctx, args) => {
    const client = await requireClient(ctx);
    await assertOwns(ctx, client, args.projectId);

    const body = args.body.trim().slice(0, 4000);
    if (!body) return;

    await ctx.db.insert("portalMessages", {
      projectId: args.projectId,
      // From the verified session, never the request — otherwise a client
      // could post a message that renders as being from me.
      authorType: "client",
      authorName: client.name,
      body,
      createdAt: Date.now(),
    });
  },
});

/** Invoices raised against the caller's own projects. */
export const invoices = query({
  args: {},
  handler: async (ctx) => {
    const client = await requireClient(ctx);
    const all = await ctx.db.query("invoices").collect();

    return all
      .filter(
        (i) =>
          i.status !== "draft" &&
          i.clientEmail.toLowerCase() === client.email.toLowerCase(),
      )
      .map((i) => ({
        _id: i._id,
        reference: i.reference,
        description: i.description,
        amount: i.amount,
        currency: i.currency,
        status: i.status,
        stage: i.stage,
        /*
         * The token drives the embedded payment: the client pays here rather
         * than being sent to Stripe's hosted page. It is unguessable and only
         * ever reaches the person whose email matches the invoice, which the
         * filter above has already established.
         */
        token: i.token,
        /* Kept as a fallback for anything issued before embedded pay. */
        payUrl: i.stripeHostedUrl ?? null,
        paidAt: i.paidAt ?? null,
      }));
  },
});

/* --------------------------------------------------------------- admin --- */

/** Clients with their projects, so the admin list is one round trip. */
/**
 * The caller's own signed contracts. Permanent.
 *
 * Contracts are scoped to the CLIENT, not to a project, because one is signed
 * before any project exists — deliverables could not host them. No id is taken
 * from the request: the client is resolved from the session and by_client does
 * the rest, so there is nothing in the URL to tamper with.
 *
 * The storage id is deliberately NOT returned. It would be a permanent bearer
 * credential in the browser; the PDF is fetched through a route that checks
 * the session every time.
 */
export const contracts = query({
  args: {},
  handler: async (ctx) => {
    const client = await requireClient(ctx);

    const rows = await ctx.db
      .query("contracts")
      .withIndex("by_client", (q) => q.eq("clientId", client._id))
      .collect();

    return rows
      .filter((row) => row.signedAt && !row.voidedAt)
      .sort((a, b) => (b.signedAt ?? 0) - (a.signedAt ?? 0))
      .map((row) => ({
        _id: row._id,
        signedAt: row.signedAt,
        clientName: row.clientName,
        amount: row.amount,
        currency: row.currency,
        templateVersion: row.templateVersion,
        hasPdf: Boolean(row.signedPdfFileId),
      }));
  },
});

/** Ownership check for the portal's PDF route. Same rule: no id is trusted. */
export const mayReadContract = query({
  args: { id: v.id("contracts") },
  handler: async (ctx, args) => {
    const client = await requireClient(ctx);
    const contract = await ctx.db.get(args.id);
    // Same answer for "not yours" and "does not exist".
    if (!contract || contract.clientId !== client._id) return null;
    if (!contract.signedPdfFileId || contract.voidedAt) return null;

    return {
      storageId: contract.signedPdfFileId,
      clientName: contract.clientName,
      signedAt: contract.signedAt,
    };
  },
});

export const listClients = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const clients = await ctx.db.query("clients").order("desc").collect();

    return await Promise.all(
      clients.map(async (client) => {
        const projects = await ctx.db
          .query("clientProjects")
          .withIndex("by_client", (q) => q.eq("clientId", client._id))
          .collect();

        /*
         * Intake completion joined here rather than fetched per row.
         *
         * It belongs on the project line because that is where the decision
         * is made — "this one has started and I am still missing half the
         * assets" is only obvious when the two facts sit together.
         */
        const withIntake = await Promise.all(
          projects.map(async (project) => {
            const intake = await ctx.db
              .query("intakes")
              .withIndex("by_project", (q) => q.eq("projectId", project._id))
              .unique();

            return {
              ...project,
              // null means no form has been sent, which is a different state
              // from 0% and needs a different prompt.
              intake: intake
                ? {
                    ...completion(intake.sections),
                    complete: Boolean(intake.completedAt),
                  }
                : null,
            };
          }),
        );

        return { ...client, projects: withIntake };
      }),
    );
  },
});

/**
 * Creates a client and their first project together.
 *
 * One step rather than two, because a client with no project has nothing to
 * see — the portal link would open on an empty page.
 */
export const createClient = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    company: v.optional(v.string()),
    projectName: v.string(),
    projectDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const email = args.email.trim().toLowerCase();

    const existing = await ctx.db
      .query("clients")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    const clientId =
      existing?._id ??
      (await ctx.db.insert("clients", {
        email,
        name: args.name,
        company: args.company,
        createdAt: Date.now(),
      }));

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        company: args.company,
      });
    }

    /*
     * Adopt any contracts this person already signed.
     *
     * A contract is almost always signed BEFORE the portal account exists —
     * signing is what starts the engagement, and the account is created after.
     * So contracts.clientId is left unset at signature when there is nobody to
     * point at, and claimed here. Without this the signed contract would sit
     * in the admin, invisible to the one person entitled to a permanent copy.
     */
    const unclaimed = await ctx.db
      .query("contracts")
      .withIndex("by_client", (q) => q.eq("clientId", undefined))
      .collect();
    for (const contract of unclaimed) {
      if (contract.clientEmail.toLowerCase() === email) {
        await ctx.db.patch(contract._id, { clientId });
      }
    }

    const projectId = await ctx.db.insert("clientProjects", {
      clientId,
      name: args.projectName,
      description: args.projectDescription,
      status: "planning",
      startedAt: Date.now(),
      createdAt: Date.now(),
    });

    return { clientId, projectId };
  },
});

export const addProject = mutation({
  args: {
    clientId: v.id("clients"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("clientProjects", {
      clientId: args.clientId,
      name: args.name,
      description: args.description,
      status: "planning",
      startedAt: Date.now(),
      createdAt: Date.now(),
    });
  },
});

export const setProjectStatus = mutation({
  args: {
    id: v.id("clientProjects"),
    status: v.union(
      v.literal("planning"),
      v.literal("active"),
      v.literal("review"),
      v.literal("complete"),
      v.literal("on_hold"),
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { status: args.status });
  },
});

export const removeClient = mutation({
  args: { id: v.id("clients") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    /*
     * Credentials first, and immediately — regardless of any deleteAfter
     * timer still running on them.
     *
     * "The client is gone but I still hold their passwords" is not a state
     * that should be reachable for even a moment, and a 30-day timer on a
     * relationship that has already ended is just an expiry date on a
     * liability nobody is watching.
     */
    await purgeForClient(ctx, args.id);

    // Cascade, or the projects, milestones and messages become unreachable
    // rows that still hold the client's data.
    const projects = await ctx.db
      .query("clientProjects")
      .withIndex("by_client", (q) => q.eq("clientId", args.id))
      .collect();

    for (const project of projects) {
      for (const table of ["milestones", "deliverables", "portalMessages"] as const) {
        const rows = await ctx.db
          .query(table)
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();
        for (const row of rows) await ctx.db.delete(row._id);
      }

      // Intakes and their uploaded files go too. An orphaned intake is still
      // a live token pointing at a form full of their answers.
      const intakes = await ctx.db
        .query("intakes")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .collect();

      for (const intake of intakes) {
        const files = await ctx.db
          .query("intakeFiles")
          .withIndex("by_intake", (q) => q.eq("intakeId", intake._id))
          .collect();
        for (const file of files) {
          await ctx.storage.delete(file.storageId);
          await ctx.db.delete(file._id);
        }
        await ctx.db.delete(intake._id);
      }

      await ctx.db.delete(project._id);
    }

    await ctx.db.delete(args.id);
  },
});

export const setMilestones = mutation({
  args: {
    projectId: v.id("clientProjects"),
    milestones: v.array(
      v.object({
        title: v.string(),
        description: v.optional(v.string()),
        status: v.union(
          v.literal("todo"),
          v.literal("in_progress"),
          v.literal("done"),
        ),
        dueAt: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Replaced wholesale: the admin edits the list as a whole, and diffing
    // would leave orphans behind on a rename.
    const existing = await ctx.db
      .query("milestones")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const m of existing) await ctx.db.delete(m._id);

    for (let i = 0; i < args.milestones.length; i++) {
      const m = args.milestones[i];
      await ctx.db.insert("milestones", {
        projectId: args.projectId,
        title: m.title,
        description: m.description,
        status: m.status,
        order: i,
        dueAt: m.dueAt,
        completedAt: m.status === "done" ? Date.now() : undefined,
      });
    }
  },
});

export const adminMessages = query({
  args: { projectId: v.id("clientProjects") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("portalMessages")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("asc")
      .take(200);
  },
});

export const adminReply = mutation({
  args: { projectId: v.id("clientProjects"), body: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.insert("portalMessages", {
      projectId: args.projectId,
      authorType: "admin",
      authorName: "Yusuf",
      body: args.body.trim().slice(0, 4000),
      createdAt: Date.now(),
    });
  },
});

/**
 * Files for a project, admin side.
 *
 * Separate from the client query because that one refuses anything the signed
 * in client does not own — correct for them, useless for me.
 */
export const adminDeliverables = query({
  args: { projectId: v.id("clientProjects") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("deliverables")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();
  },
});

/**
 * Publishes a file to the client's portal.
 *
 * Version is derived here rather than supplied: two uploads of the same name
 * should read as v1 and v2 without me having to remember which was which.
 */
export const addDeliverable = mutation({
  args: {
    projectId: v.id("clientProjects"),
    name: v.string(),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const existing = await ctx.db
      .query("deliverables")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const sameName = existing.filter((d) => d.name === args.name.trim());

    return await ctx.db.insert("deliverables", {
      projectId: args.projectId,
      name: args.name.trim().slice(0, 200),
      url: args.url,
      version: sameName.length + 1,
      uploadedAt: Date.now(),
    });
  },
});

export const removeDeliverable = mutation({
  args: { id: v.id("deliverables") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

/** Milestones for the admin editor, in display order. */
export const adminMilestones = query({
  args: { projectId: v.id("clientProjects") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("milestones")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("asc")
      .collect();
  },
});

/* ---------------------------------------------------------------------------
   Delivery receipts and typing presence.

   Both sides of the thread run the same three calls, differing only in which
   direction they act on. They are separated by identity rather than by an
   argument: a client must not be able to mark their OWN message as read by the
   admin, and passing "who am I" as a parameter is exactly how that becomes
   possible.
   --------------------------------------------------------------------------- */

/** How long a keypress keeps the typing indicator alive. */
const TYPING_TTL_MS = 5000;

/**
 * Marks the other side's messages as delivered, then read.
 *
 * Called by the recipient when the thread is on screen. Delivery and reading
 * are stamped in the same call because by the time a live query has returned a
 * message to a visible thread, both are true — separating them would mean
 * inventing a moment between "your browser has it" and "it is on screen" that
 * does not exist for an open panel.
 *
 * Writes only to messages that are missing the stamp, so an open thread does
 * not rewrite the same rows on every reactive tick.
 */
export const markThreadSeen = mutation({
  args: { projectId: v.id("clientProjects") },
  handler: async (ctx, args) => {
    const client = await requireClient(ctx);
    await assertOwns(ctx, client, args.projectId);

    const now = Date.now();
    const messages = await ctx.db
      .query("portalMessages")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    for (const m of messages) {
      // The client marks the ADMIN's messages. Never their own.
      if (m.authorType !== "admin") continue;
      if (m.deliveredAt && m.readAt) continue;
      await ctx.db.patch(m._id, {
        deliveredAt: m.deliveredAt ?? now,
        readAt: m.readAt ?? now,
      });
    }
  },
});

/** The admin equivalent: stamps the CLIENT's messages. */
export const adminMarkThreadSeen = mutation({
  args: { projectId: v.id("clientProjects") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const now = Date.now();
    const messages = await ctx.db
      .query("portalMessages")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    for (const m of messages) {
      if (m.authorType !== "client") continue;
      if (m.deliveredAt && m.readAt) continue;
      await ctx.db.patch(m._id, {
        deliveredAt: m.deliveredAt ?? now,
        readAt: m.readAt ?? now,
      });
    }
  },
});

/**
 * Pushes the caller's typing expiry a few seconds into the future.
 *
 * `typing: false` clears it immediately, for the case where someone selects
 * their draft and deletes it — waiting the full TTL there would show them as
 * typing when the box is visibly empty.
 */
export const setTyping = mutation({
  args: { projectId: v.id("clientProjects"), typing: v.boolean() },
  handler: async (ctx, args) => {
    const client = await requireClient(ctx);
    await assertOwns(ctx, client, args.projectId);
    await ctx.db.patch(args.projectId, {
      clientTypingUntil: args.typing ? Date.now() + TYPING_TTL_MS : undefined,
    });
  },
});

export const adminSetTyping = mutation({
  args: { projectId: v.id("clientProjects"), typing: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.projectId, {
      adminTypingUntil: args.typing ? Date.now() + TYPING_TTL_MS : undefined,
    });
  },
});

/**
 * Is the other side typing right now?
 *
 * Returned as a boolean computed against the server clock, not as the raw
 * timestamp. Comparing an expiry to Date.now() in the browser would trust a
 * clock we do not control, and a client skewed five minutes fast would never
 * see the indicator at all.
 *
 * Because this is a Convex query it re-runs when the document changes — but
 * NOT when time simply passes, so the UI also re-checks on its own timer. See
 * TypingIndicator.
 */
export const typingState = query({
  args: { projectId: v.id("clientProjects") },
  handler: async (ctx, args) => {
    const client = await requireClient(ctx);
    await assertOwns(ctx, client, args.projectId);
    const project = await ctx.db.get(args.projectId);
    const now = Date.now();
    return {
      otherSideTyping: Boolean(
        project?.adminTypingUntil && project.adminTypingUntil > now,
      ),
    };
  },
});

export const adminTypingState = query({
  args: { projectId: v.id("clientProjects") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const project = await ctx.db.get(args.projectId);
    const now = Date.now();
    return {
      otherSideTyping: Boolean(
        project?.clientTypingUntil && project.clientTypingUntil > now,
      ),
    };
  },
});

/**
 * Project insights — the numbers behind the progress bar.
 *
 * DERIVED, NEVER STORED. Every figure here is computed from rows that already
 * exist for other reasons: milestone completion stamps, message timestamps,
 * deliverable uploads, calls. Nothing has to be kept up to date, nothing can
 * go stale, and there is no counter to drift out of sync with reality.
 *
 * WHAT THIS IS NOT. The original ask was "analytics on their site" — traffic
 * to the thing I built them. That needs their site instrumented and reporting
 * somewhere, which is a separate integration and not something this portal can
 * invent. What it CAN answer honestly is how the engagement itself is going,
 * which is the question a client actually opens the portal with.
 *
 * The reply-time figure is deliberately included even though it is the one
 * that can embarrass me. A response-time commitment nobody measures is
 * marketing; one the client can see is a promise.
 */
export const insights = query({
  args: { projectId: v.id("clientProjects") },
  handler: async (ctx, args) => {
    const client = await requireClient(ctx);
    await assertOwns(ctx, client, args.projectId);

    const project = await ctx.db.get(args.projectId);
    if (!project) return null;

    const [milestones, deliverables, messages, calls] = await Promise.all([
      ctx.db
        .query("milestones")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
        .collect(),
      ctx.db
        .query("deliverables")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
        .collect(),
      ctx.db
        .query("portalMessages")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
        .order("asc")
        .collect(),
      ctx.db
        .query("calls")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
        .collect(),
    ]);

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const done = milestones.filter((m) => m.status === "done");

    /*
     * How long I take to reply, measured rather than claimed.
     *
     * Walks the thread in order and measures each client message to the next
     * admin message. Runs of consecutive client messages collapse into one
     * wait — someone sending three lines in a row has asked once, and counting
     * that as three fast replies would flatter the number dishonestly.
     */
    let waitTotal = 0;
    let waitCount = 0;
    let askedAt: number | null = null;
    for (const m of messages) {
      if (m.authorType === "client") {
        askedAt ??= m.createdAt;
      } else if (askedAt !== null) {
        waitTotal += m.createdAt - askedAt;
        waitCount++;
        askedAt = null;
      }
    }

    /*
     * Milestones finished in each of the last two weeks.
     *
     * Two windows rather than a single average: "three this week, one last
     * week" says something an average across a whole project cannot.
     */
    const doneThisWeek = done.filter(
      (m) => (m.completedAt ?? 0) >= now - 7 * day,
    ).length;
    const donePrevWeek = done.filter(
      (m) =>
        (m.completedAt ?? 0) >= now - 14 * day &&
        (m.completedAt ?? 0) < now - 7 * day,
    ).length;

    return {
      percentComplete:
        milestones.length === 0
          ? 0
          : Math.round((done.length / milestones.length) * 100),
      milestonesDone: done.length,
      milestonesTotal: milestones.length,
      doneThisWeek,
      donePrevWeek,

      /** null when nothing has been delivered yet, so the UI can omit it. */
      lastUpdateAt:
        [
          ...done.map((m) => m.completedAt ?? 0),
          ...deliverables.map((d) => d.uploadedAt),
        ].sort((a, b) => b - a)[0] || null,

      filesDelivered: deliverables.length,
      filesApproved: deliverables.filter((d) => d.approvedAt).length,

      messagesTotal: messages.length,
      /** Mean minutes from a question to my reply, or null if never asked. */
      replyMinutes:
        waitCount === 0 ? null : Math.round(waitTotal / waitCount / 60000),

      callsHeld: calls.filter((c) => c.startedAt).length,

      startedAt: project.startedAt ?? null,
      daysRunning: project.startedAt
        ? Math.max(0, Math.round((now - project.startedAt) / day))
        : null,
      targetLaunch: project.targetLaunch ?? null,
      daysToTarget: project.targetLaunch
        ? Math.round((project.targetLaunch - now) / day)
        : null,
    };
  },
});
