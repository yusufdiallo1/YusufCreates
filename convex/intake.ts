import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireAdmin } from "./lib/auth";
import { makeToken } from "./lib/token";
import { enqueueNotification } from "./notify";
import {
  SECTIONS,
  completion,
  initialSections,
  outstandingLabels,
} from "./intakeSections";

/**
 * The onboarding intake.
 *
 * Sent the moment a deposit clears. Missing assets is the single largest
 * cause of project delay, and the reason is almost never refusal — it is that
 * eleven things were asked for in one email and none were answered.
 *
 * Reached by token, like invoices and proposals. There is no client sign-in
 * on this deployment, and a form that needs an account to open is a form that
 * gets filled in late or not at all.
 *
 * THE RULES THIS FILE ENFORCES:
 *
 * 1. The token resolves the project. A project id is never taken from the
 *    request — the same rule convex/portal.ts holds for the signed-in portal.
 * 2. Every save is a partial. There is no submit button and no all-or-nothing
 *    write, so a client who closes the tab mid-sentence loses one field at
 *    worst.
 * 3. Skipped is not outstanding. It is a real answer, and the nudges must
 *    respect it.
 */

async function byToken(
  ctx: QueryCtx | MutationCtx,
  token: string,
): Promise<Doc<"intakes">> {
  const intake = await ctx.db
    .query("intakes")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();

  // The same error for "wrong token" and "no such token", so nothing confirms
  // to a guesser that they were close.
  if (!intake) throw new Error("Not authorised.");
  return intake;
}

/* ==================================================================== *
 *  CLIENT SIDE                                                         *
 * ==================================================================== */

export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const intake = await ctx.db
      .query("intakes")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    // null rather than a throw: the page turns this into a 404, and an error
    // boundary on a bad link is a worse experience than "not found".
    if (!intake) return null;

    const project = await ctx.db.get(intake.projectId);
    const client = await ctx.db.get(intake.clientId);

    const files = await ctx.db
      .query("intakeFiles")
      .withIndex("by_intake", (q) => q.eq("intakeId", intake._id))
      .collect();

    return {
      _id: intake._id,
      projectName: project?.name ?? "your project",
      clientName: client?.name ?? "",
      sections: intake.sections,
      responses: (intake.responses ?? {}) as Record<string, unknown>,
      completedAt: intake.completedAt,
      lastSavedAt: intake.lastSavedAt,
      files: files.map((f) => ({
        _id: f._id,
        sectionId: f.sectionId,
        fieldId: f.fieldId,
        name: f.name,
        size: f.size,
      })),
    };
  },
});

/**
 * Saves one field.
 *
 * One field, not the whole form. The client autosaves on a debounce, so this
 * runs constantly — writing the entire response blob each time would make
 * two people editing different sections overwrite each other, and would turn
 * every keystroke into a full-document write.
 */
export const saveField = mutation({
  args: {
    token: v.string(),
    sectionId: v.string(),
    fieldId: v.string(),
    value: v.any(),
  },
  handler: async (ctx, args) => {
    const intake = await byToken(ctx, args.token);

    const responses = {
      ...((intake.responses ?? {}) as Record<string, unknown>),
      [`${args.sectionId}.${args.fieldId}`]: args.value,
    };

    await ctx.db.patch(intake._id, {
      responses,
      lastSavedAt: Date.now(),
    });

    return { savedAt: Date.now() };
  },
});

export const setSectionStatus = mutation({
  args: {
    token: v.string(),
    sectionId: v.string(),
    status: v.union(
      v.literal("outstanding"),
      v.literal("complete"),
      v.literal("skipped"),
    ),
  },
  handler: async (ctx, args) => {
    const intake = await byToken(ctx, args.token);
    await applyStatus(ctx, intake, args.sectionId, args.status, false);
  },
});

async function applyStatus(
  ctx: MutationCtx,
  intake: Doc<"intakes">,
  sectionId: string,
  status: "outstanding" | "complete" | "skipped",
  markedByAdmin: boolean,
) {
  const sections = {
    ...intake.sections,
    [sectionId]: {
      status,
      completedAt: status === "outstanding" ? undefined : Date.now(),
      markedByAdmin: markedByAdmin || undefined,
    },
  };

  /*
   * Complete when nothing is outstanding — skipped counts.
   *
   * A client who genuinely cannot answer three questions has still finished
   * the form, and holding it open forever would mean nudging them for the
   * rest of the project about things they already told me they do not have.
   */
  const anyOutstanding = SECTIONS.some(
    (s) => (sections[s.id]?.status ?? "outstanding") === "outstanding",
  );

  await ctx.db.patch(intake._id, {
    sections,
    lastSavedAt: Date.now(),
    completedAt: anyOutstanding ? undefined : (intake.completedAt ?? Date.now()),
  });
}

/**
 * An upload URL for a client holding a valid token.
 *
 * A sibling of api.files.generateUploadUrl, which cannot be reused: that one
 * is requireAdmin-gated, deliberately, because an open upload URL is free
 * hosting for anyone who finds it. This one is gated on the token instead —
 * still not open, and scoped to one intake.
 */
export const generateUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await byToken(ctx, args.token);
    return await ctx.storage.generateUploadUrl();
  },
});

export const attachFile = mutation({
  args: {
    token: v.string(),
    sectionId: v.string(),
    fieldId: v.string(),
    storageId: v.id("_storage"),
    name: v.string(),
    size: v.number(),
    contentType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const intake = await byToken(ctx, args.token);

    await ctx.db.insert("intakeFiles", {
      intakeId: intake._id,
      sectionId: args.sectionId,
      fieldId: args.fieldId,
      storageId: args.storageId,
      name: args.name.slice(0, 200),
      size: args.size,
      contentType: args.contentType,
      uploadedAt: Date.now(),
    });

    await ctx.db.patch(intake._id, { lastSavedAt: Date.now() });
  },
});

export const removeFile = mutation({
  args: { token: v.string(), fileId: v.id("intakeFiles") },
  handler: async (ctx, args) => {
    const intake = await byToken(ctx, args.token);

    const file = await ctx.db.get(args.fileId);
    // Checked against the token's own intake: a file id from another intake
    // must not be deletable just because the caller holds *a* valid token.
    if (!file || file.intakeId !== intake._id) throw new Error("Not authorised.");

    await ctx.storage.delete(file.storageId);
    await ctx.db.delete(args.fileId);
    await ctx.db.patch(intake._id, { lastSavedAt: Date.now() });
  },
});

/* ==================================================================== *
 *  ADMIN SIDE                                                          *
 * ==================================================================== */

export const createForProject = mutation({
  args: { projectId: v.id("clientProjects") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const existing = await ctx.db
      .query("intakes")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .unique();

    // Idempotent. Sending the link twice must not create a second form and
    // silently split the answers across two rows.
    if (existing) return { token: existing.token, created: false };

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("No such project.");

    const token = makeToken();
    await ctx.db.insert("intakes", {
      projectId: args.projectId,
      clientId: project.clientId,
      token,
      sections: initialSections(),
      responses: {},
      lastSavedAt: Date.now(),
      createdAt: Date.now(),
    });

    return { token, created: true };
  },
});

/** The admin view: everything, plus the summary text worth pasting. */
export const forProject = query({
  args: { projectId: v.id("clientProjects") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const intake = await ctx.db
      .query("intakes")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .unique();

    if (!intake) return null;

    const files = await ctx.db
      .query("intakeFiles")
      .withIndex("by_intake", (q) => q.eq("intakeId", intake._id))
      .collect();

    return {
      _id: intake._id,
      token: intake.token,
      sections: intake.sections,
      responses: (intake.responses ?? {}) as Record<string, unknown>,
      completedAt: intake.completedAt,
      lastSavedAt: intake.lastSavedAt,
      createdAt: intake.createdAt,
      nudgedDays: intake.nudgedDays ?? [],
      ...completion(intake.sections),
      files: files.map((f) => ({
        _id: f._id,
        sectionId: f.sectionId,
        fieldId: f.fieldId,
        name: f.name,
        size: f.size,
      })),
    };
  },
});

/** Ticking a section off after handling it on a call. */
export const markSectionComplete = mutation({
  args: {
    projectId: v.id("clientProjects"),
    sectionId: v.string(),
    status: v.union(
      v.literal("outstanding"),
      v.literal("complete"),
      v.literal("skipped"),
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const intake = await ctx.db
      .query("intakes")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .unique();
    if (!intake) throw new Error("No intake for that project.");

    await applyStatus(ctx, intake, args.sectionId, args.status, true);
  },
});

/**
 * Storage ids for the "download everything as one zip" route.
 *
 * Admin-gated and separate from `forProject` because storage ids are the one
 * thing on an intake that should not travel to a browser as a matter of
 * course — api.files.getUrl has no auth at all, so an id is effectively a
 * public link to the file.
 */
export const filesForDownload = query({
  args: { projectId: v.id("clientProjects") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const intake = await ctx.db
      .query("intakes")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .unique();
    if (!intake) return null;

    const project = await ctx.db.get(args.projectId);
    const files = await ctx.db
      .query("intakeFiles")
      .withIndex("by_intake", (q) => q.eq("intakeId", intake._id))
      .collect();

    const withUrls = await Promise.all(
      files.map(async (f) => ({
        name: f.name,
        sectionId: f.sectionId,
        uploadedAt: f.uploadedAt,
        url: await ctx.storage.getUrl(f.storageId),
      })),
    );

    return {
      projectName: project?.name ?? "project",
      // A file whose storage row has gone is dropped rather than failing the
      // whole download over one missing asset.
      files: withUrls.filter(
        (f): f is typeof f & { url: string } => f.url !== null,
      ),
    };
  },
});

/* ==================================================================== *
 *  NUDGES                                                              *
 * ==================================================================== */

const DAY_MS = 24 * 60 * 60 * 1000;
const NUDGE_DAYS = [3, 7];

/**
 * Day 3 and day 7, naming only what is still outstanding.
 *
 * A generic "please complete your form" gets ignored, because it asks the
 * reader to go and work out what they owe. "I still need your logo and your
 * domain access" gets actioned, because it is already the to-do list.
 *
 * Two nudges and then it stops. A third is nagging, and by then the problem
 * is not the email — it is that something is genuinely blocked and needs a
 * conversation instead.
 */
export const sweepNudges = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Small table, and every row has to be age-checked anyway. An index on
    // createdAt would not avoid the scan.
    const intakes = await ctx.db.query("intakes").collect();

    let queued = 0;

    for (const intake of intakes) {
      if (intake.completedAt) continue;

      const ageDays = Math.floor((now - intake.createdAt) / DAY_MS);
      const sent = intake.nudgedDays ?? [];

      const due = NUDGE_DAYS.filter((d) => ageDays >= d && !sent.includes(d));
      if (due.length === 0) continue;

      // The latest milestone only. If a deployment was down for a week, the
      // client should get one current nudge, not day 3 and day 7 together.
      const day = Math.max(...due);

      const outstanding = outstandingLabels(intake.sections);
      /*
       * Nothing outstanding but not marked complete — everything was skipped.
       * There is nothing to ask for, so the days are recorded as sent and the
       * client is left alone.
       */
      if (outstanding.length === 0) {
        await ctx.db.patch(intake._id, { nudgedDays: [...sent, ...due] });
        continue;
      }

      const client = await ctx.db.get(intake.clientId);
      const project = await ctx.db.get(intake.projectId);
      if (!client) continue;

      const base = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

      await enqueueNotification(ctx, {
        kind: "intake_nudge",
        payload: {
          to: client.email,
          name: client.name,
          projectName: project?.name ?? "your project",
          outstanding,
          intakeUrl: `${base}/portal/onboarding/${intake.token}`,
          day,
        },
      });

      /*
       * Marked BEFORE the email is confirmed sent, and both due days are
       * marked at once.
       *
       * The outbox owns delivery and retries from here. If this recorded only
       * the day it sent, a deployment that missed day 3 would fire both
       * nudges the moment it came back.
       */
      await ctx.db.patch(intake._id, { nudgedDays: [...sent, ...due] });
      queued += 1;
    }

    if (queued > 0) console.info(`[intake] queued ${queued} nudge(s)`);
    return queued;
  },
});
