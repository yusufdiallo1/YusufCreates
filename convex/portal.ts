import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireAdmin } from "./lib/auth";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

/**
 * Client portal.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE: a client sees exactly the projects on
 * their own record and nothing else. The project id is never taken from the
 * request — it is derived from the authenticated session and checked against
 * that list. Changing an id in the URL is the first thing anyone tries, and it
 * must return nothing.
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

/** Throws unless the caller owns this project. Every read goes through it. */
function assertOwns(client: Doc<"clients">, projectId: Id<"projects">) {
  if (!client.projectIds.includes(projectId)) {
    // Deliberately the same error as "not a client" — distinguishing them
    // would confirm that a project id exists.
    throw new Error("Not authorised.");
  }
}

/** Everything the portal home needs, for the caller's own projects only. */
export const overview = query({
  args: {},
  handler: async (ctx) => {
    const client = await requireClient(ctx);

    const projects = await Promise.all(
      client.projectIds.map((id) => ctx.db.get(id)),
    );

    const withProgress = await Promise.all(
      projects
        .filter((p): p is Doc<"projects"> => p !== null)
        .map(async (project) => {
          const milestones = await ctx.db
            .query("milestones")
            .withIndex("by_project", (q) => q.eq("projectId", project._id))
            .collect();

          const done = milestones.filter((m) => m.status === "done").length;

          return {
            _id: project._id,
            title: project.title,
            // Percentage complete is the single figure that kills most
            // "any update?" emails, so it is computed here rather than left
            // to the client to work out from a list.
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
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const client = await requireClient(ctx);
    assertOwns(client, args.projectId);

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
    // Ownership is checked against the deliverable's project, not a value
    // supplied by the caller.
    assertOwns(client, item.projectId);

    await ctx.db.patch(args.id, { approvedAt: Date.now() });
  },
});

export const messages = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const client = await requireClient(ctx);
    assertOwns(client, args.projectId);

    return await ctx.db
      .query("portalMessages")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("asc")
      .take(200);
  },
});

export const postMessage = mutation({
  args: { projectId: v.id("projects"), body: v.string() },
  handler: async (ctx, args) => {
    const client = await requireClient(ctx);
    assertOwns(client, args.projectId);

    const body = args.body.trim().slice(0, 4000);
    if (!body) return;

    await ctx.db.insert("portalMessages", {
      projectId: args.projectId,
      // authorType comes from the verified session, never from the request —
      // otherwise a client could post a message that appears to be from me.
      authorType: "client",
      authorName: client.name,
      body,
      createdAt: Date.now(),
    });
  },
});

/** Invoices for the caller's own projects. */
export const invoices = query({
  args: {},
  handler: async (ctx) => {
    const client = await requireClient(ctx);
    const all = await ctx.db.query("invoices").collect();

    return all
      .filter(
        (i) =>
          i.status !== "draft" &&
          i.projectId !== undefined &&
          client.projectIds.includes(i.projectId),
      )
      .map((i) => ({
        _id: i._id,
        reference: i.reference,
        description: i.description,
        amount: i.amount,
        currency: i.currency,
        status: i.status,
        stage: i.stage,
        // The hosted payment link, so they can pay from the portal.
        payUrl: i.stripeHostedUrl ?? null,
        paidAt: i.paidAt ?? null,
      }));
  },
});

/* --------------------------------------------------------------- admin --- */

export const listClients = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("clients").order("desc").collect();
  },
});

export const createClient = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    company: v.optional(v.string()),
    projectIds: v.array(v.id("projects")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const email = args.email.trim().toLowerCase();

    const existing = await ctx.db
      .query("clients")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        company: args.company,
        projectIds: args.projectIds,
      });
      return existing._id;
    }

    return await ctx.db.insert("clients", {
      email,
      name: args.name,
      company: args.company,
      projectIds: args.projectIds,
      createdAt: Date.now(),
    });
  },
});

export const removeClient = mutation({
  args: { id: v.id("clients") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

export const setMilestones = mutation({
  args: {
    projectId: v.id("projects"),
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

    // Replace wholesale: the admin edits the list as a whole, and diffing
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
  args: { projectId: v.id("projects") },
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
  args: { projectId: v.id("projects"), body: v.string() },
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
