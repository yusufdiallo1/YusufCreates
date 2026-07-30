import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * One-off maintenance, run by hand from the CLI.
 *
 * internalMutation, not mutation: these are not reachable from the browser at
 * all, which is the right blast radius for anything that deletes account rows.
 */

/**
 * Removes an account that is neither the admin nor an invited client.
 *
 * These exist because the sign-in form used to retry a failed sign-in as a
 * sign-up, so any address typed into it got a password account. The auth
 * callback deletes the `users` row when it rejects one, but leaves the
 * `authAccounts` credential behind — so both are cleared here.
 *
 * Refuses to touch ADMIN_EMAIL or anyone in `clients`, because a cleanup that
 * can delete the only account able to reach the admin is not a cleanup.
 */
export const removeStrayAccount = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!email) throw new Error("An email is required.");

    const admin = process.env.ADMIN_EMAIL?.toLowerCase();
    if (!admin) throw new Error("ADMIN_EMAIL is not configured.");
    if (email === admin) {
      throw new Error("Refusing to delete the admin account.");
    }

    const client = await ctx.db
      .query("clients")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (client) {
      throw new Error("Refusing to delete an invited client's account.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
    if (!user) return { deleted: false as const, reason: "No such user." };

    // Sessions and refresh tokens first: an orphaned session would otherwise
    // keep authenticating against a user row that no longer exists.
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .collect();
    for (const session of sessions) {
      const tokens = await ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
        .collect();
      for (const token of tokens) await ctx.db.delete(token._id);
      await ctx.db.delete(session._id);
    }

    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", user._id))
      .collect();
    for (const account of accounts) await ctx.db.delete(account._id);

    await ctx.db.delete(user._id);

    return {
      deleted: true as const,
      email,
      sessions: sessions.length,
      accounts: accounts.length,
    };
  },
});
