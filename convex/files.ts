import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";

/**
 * File storage for cover images and avatars.
 *
 * Upload is admin-only: an open upload URL is free hosting for anyone who
 * finds it. Reading is public, because the resulting URLs are embedded in
 * pages that are themselves public.
 */

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Resolves a storage id to a servable URL. */
export const getUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => await ctx.storage.getUrl(args.storageId),
});

export const remove = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.storage.delete(args.storageId);
  },
});
