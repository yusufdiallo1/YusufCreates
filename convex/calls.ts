import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

/**
 * Calls — scheduling, membership, whiteboard and transcript.
 *
 * Agora carries the audio and video. This module owns everything that decides
 * WHO is allowed into a channel and everything that has to survive the call.
 *
 * AUTHORISATION IS THE POINT OF THIS FILE. An Agora channel name is not a
 * secret — in testing mode anyone holding the App ID and the channel name can
 * join. So the channel name is random rather than derived from the project,
 * and the API route that mints a join token calls into these checks first.
 */

/** Random, unguessable, and URL-safe. Used for channels and guest keys. */
function randomKey(bytes = 16): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * The caller is either the admin or the client who owns the project.
 *
 * Returns who they are, because the rest of the module needs to stamp
 * authorship and the answer must come from the session rather than from an
 * argument — "I am the admin" is not something a request gets to assert.
 */
async function requireParticipant(
  ctx: QueryCtx,
  projectId: Id<"clientProjects">,
): Promise<{ role: "admin" | "client"; name: string; id: string }> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated.");

  const email = (identity.email ?? "").toLowerCase();
  const allowed = (
    process.env.ADMIN_USERNAME ??
    process.env.ADMIN_EMAIL ??
    ""
  ).toLowerCase();

  if (allowed && email === allowed) {
    return { role: "admin", name: "Yusuf", id: identity.subject };
  }

  const client = await ctx.db
    .query("clients")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique();
  if (!client) throw new Error("Not permitted.");

  const project = await ctx.db.get(projectId);
  if (!project || project.clientId !== client._id) {
    throw new Error("Not permitted.");
  }

  return { role: "client", name: client.name, id: identity.subject };
}

/** Calls on a project, newest first. */
export const list = query({
  args: { projectId: v.id("clientProjects") },
  handler: async (ctx, args) => {
    await requireParticipant(ctx, args.projectId);
    return await ctx.db
      .query("calls")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .take(30);
  },
});

export const get = query({
  args: { callId: v.id("calls") },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call) return null;
    await requireParticipant(ctx, call.projectId);
    return call;
  },
});

/**
 * Schedules a call, or starts one immediately when `scheduledAt` is omitted.
 *
 * Either side can start one. A client who needs five minutes should not have
 * to request a meeting and wait for it to be granted — the whole reason the
 * portal exists is to remove that round trip.
 */
export const schedule = mutation({
  args: {
    projectId: v.id("clientProjects"),
    title: v.optional(v.string()),
    scheduledAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const who = await requireParticipant(ctx, args.projectId);
    return await ctx.db.insert("calls", {
      projectId: args.projectId,
      channel: `yc-${randomKey(12)}`,
      title: args.title?.trim() || undefined,
      scheduledAt: args.scheduledAt,
      createdBy: who.role,
      createdAt: Date.now(),
    });
  },
});

/** Stamps the first join. Idempotent — later joins do not reset the clock. */
export const markStarted = mutation({
  args: { callId: v.id("calls") },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call) return;
    await requireParticipant(ctx, call.projectId);
    if (call.startedAt) return;
    await ctx.db.patch(args.callId, { startedAt: Date.now() });
  },
});

export const end = mutation({
  args: { callId: v.id("calls") },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call) return;
    await requireParticipant(ctx, call.projectId);
    await ctx.db.patch(args.callId, {
      endedAt: Date.now(),
      // Ending the call revokes any outstanding guest link. A link that still
      // works after the meeting is over is a link nobody remembers issuing.
      guestKey: undefined,
    });
  },
});

/**
 * Mints (or clears) a guest link.
 *
 * Admin only. A client inviting arbitrary strangers into a channel that also
 * carries their own project's whiteboard is not a decision the portal should
 * make on their behalf.
 */
export const setGuestLink = mutation({
  args: { callId: v.id("calls"), enabled: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const call = await ctx.db.get(args.callId);
    if (!call) throw new Error("No such call.");
    const guestKey = args.enabled ? randomKey(20) : undefined;
    await ctx.db.patch(args.callId, { guestKey });
    return guestKey ?? null;
  },
});

/* ---------------------------------------------------------------------------
   Whiteboard
   --------------------------------------------------------------------------- */

export const strokes = query({
  args: { callId: v.id("calls") },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call) return [];
    await requireParticipant(ctx, call.projectId);
    return await ctx.db
      .query("whiteboardStrokes")
      .withIndex("by_call", (q) => q.eq("callId", args.callId))
      .order("asc")
      .take(2000);
  },
});

export const addStroke = mutation({
  args: {
    callId: v.id("calls"),
    points: v.array(v.number()),
    colour: v.string(),
    width: v.number(),
  },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call) throw new Error("No such call.");
    const who = await requireParticipant(ctx, call.projectId);

    // A stroke is pairs of coordinates; an odd length means a dropped value,
    // and drawing it would put a point at an undefined y.
    if (args.points.length < 2 || args.points.length % 2 !== 0) return;

    await ctx.db.insert("whiteboardStrokes", {
      callId: args.callId,
      points: args.points,
      colour: args.colour,
      width: args.width,
      authorId: who.id,
      authorName: who.name,
      createdAt: Date.now(),
    });
  },
});

/** Removes the caller's most recent stroke. Undo, not "undo anyone's". */
export const undoStroke = mutation({
  args: { callId: v.id("calls") },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call) return;
    const who = await requireParticipant(ctx, call.projectId);

    const mine = await ctx.db
      .query("whiteboardStrokes")
      .withIndex("by_call", (q) => q.eq("callId", args.callId))
      .order("desc")
      .take(200);

    const last = mine.find((s: Doc<"whiteboardStrokes">) => s.authorId === who.id);
    if (last) await ctx.db.delete(last._id);
  },
});

/** Clears the whole board. Admin only — it destroys other people's work. */
export const clearBoard = mutation({
  args: { callId: v.id("calls") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const all = await ctx.db
      .query("whiteboardStrokes")
      .withIndex("by_call", (q) => q.eq("callId", args.callId))
      .collect();
    for (const stroke of all) await ctx.db.delete(stroke._id);
  },
});

/* ---------------------------------------------------------------------------
   Transcript and notes
   --------------------------------------------------------------------------- */

export const transcript = query({
  args: { callId: v.id("calls") },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call) return [];
    await requireParticipant(ctx, call.projectId);
    return await ctx.db
      .query("callTranscript")
      .withIndex("by_call", (q) => q.eq("callId", args.callId))
      .order("asc")
      .take(1000);
  },
});

/**
 * Appends one utterance.
 *
 * The speaker name comes from the session, not the argument — otherwise the
 * transcript, and therefore the summary, could be made to attribute a sentence
 * to whoever the caller chose.
 */
export const addTranscriptLine = mutation({
  args: { callId: v.id("calls"), text: v.string() },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call) return;
    const who = await requireParticipant(ctx, call.projectId);

    const text = args.text.trim().slice(0, 2000);
    if (!text) return;

    await ctx.db.insert("callTranscript", {
      callId: args.callId,
      speaker: who.name,
      text,
      at: Date.now(),
    });
  },
});

/** Written by the summarise route once a call ends. */
export const saveSummary = mutation({
  args: { callId: v.id("calls"), summary: v.string() },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call) throw new Error("No such call.");
    await requireParticipant(ctx, call.projectId);
    await ctx.db.patch(args.callId, {
      summary: args.summary,
      summaryAt: Date.now(),
    });
  },
});
