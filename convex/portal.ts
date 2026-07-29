import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireAdmin } from "./lib/auth";
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

    return { name: client.name, projects: withProgress };
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
        return { ...client, projects };
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
