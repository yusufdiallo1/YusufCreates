import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";

/** Public: clients leave feedback against a project. */
export const submit = mutation({
  args: {
    projectId: v.id("projects"),
    rating: v.number(),
    comment: v.optional(v.string()),
    from: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5.");
    }
    return await ctx.db.insert("feedback", { ...args, resolved: false });
  },
});

export const listByProject = query({
  args: { projectId: v.id("projects"), resolved: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("feedback")
      .withIndex("by_project", (q) =>
        args.resolved === undefined
          ? q.eq("projectId", args.projectId)
          : q.eq("projectId", args.projectId).eq("resolved", args.resolved),
      )
      .collect();
  },
});

export const resolve = mutation({
  args: { id: v.id("feedback"), resolved: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { resolved: args.resolved });
  },
});

/**
 * All feedback, grouped by project.
 *
 * listByProject needs a projectId, so there was no way to see everything at
 * once. Joined in one handler rather than N queries from the client, and
 * sorted unresolved-first because that is the only part that needs acting on.
 */
export const listGrouped = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const [items, projects] = await Promise.all([
      ctx.db.query("feedback").order("desc").take(500),
      ctx.db.query("projects").collect(),
    ]);

    const byProject = new Map(projects.map((p) => [p._id, p]));
    const groups = new Map<
      string,
      { title: string; slug: string; items: typeof items; unresolved: number }
    >();

    for (const item of items) {
      const project = byProject.get(item.projectId);
      const key = String(item.projectId);
      const group = groups.get(key) ?? {
        title: project?.title ?? "Unknown project",
        slug: project?.slug ?? "",
        items: [] as typeof items,
        unresolved: 0,
      };
      group.items.push(item);
      if (!item.resolved) group.unresolved += 1;
      groups.set(key, group);
    }

    return [...groups.entries()]
      .map(([projectId, g]) => ({ projectId, ...g }))
      .sort((a, b) => b.unresolved - a.unresolved);
  },
});
