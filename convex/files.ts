import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin, requireServerSecret } from "./lib/auth";

/**
 * File storage for cover images and avatars.
 *
 * Upload is admin-only: an open upload URL is free hosting for anyone who
 * finds it. Reading is public, because the resulting URLs are embedded in
 * pages that are themselves public.
 *
 * NOT everything stored here can live under that second rule — see getUrl.
 */

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * The same thing for our own server routes.
 *
 * A client signing a contract cannot call generateUploadUrl — they are not an
 * admin — but their signature image and the countersigned PDF still have to
 * land in storage. The route holds the secret and does the upload on their
 * behalf, so the browser never gets an upload URL of its own.
 */
export const generateServerUploadUrl = mutation({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Resolves a storage id to a servable URL.
 *
 * PUBLIC, and that is a deliberate limit on what may be stored through it: a
 * Convex storage URL is a bearer credential that never expires, so anything
 * reachable from here is effectively public forever.
 *
 * Signed contracts and signature images therefore do NOT go through this.
 * They are read by resolveForServer below, behind a route that checks who is
 * asking. If you are about to call getUrl on something with legal weight,
 * that is the bug.
 */
export const getUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => await ctx.storage.getUrl(args.storageId),
});

/** Storage URL for a server route that has already decided the caller may have it. */
export const resolveForServer = query({
  args: { secret: v.string(), storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const remove = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.storage.delete(args.storageId);
  },
});
