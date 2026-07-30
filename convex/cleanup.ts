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

/** Clears the rows left behind by verification runs. */
export const removeTestData = internalMutation({
  args: {},
  handler: async (ctx) => {
    const promos = await ctx.db.query("promos").collect();
    let removedPromos = 0;
    for (const p of promos) {
      // Only the synthetic refs used while verifying the per-visitor fix.
      if (
        /^Referral (idx-verify|share-link-1|tier-test|browsertest|showonce)/.test(
          p.name,
        )
      ) {
        await ctx.db.delete(p._id);
        removedPromos++;
      }
    }

    const comments = await ctx.db.query("postComments").collect();
    let removedComments = 0;
    for (const c of comments) {
      if (c.email === "verify-comment@example.com") {
        await ctx.db.delete(c._id);
        removedComments++;
      }
    }

    const feedback = await ctx.db.query("siteFeedback").collect();
    let removedFeedback = 0;
    for (const f of feedback) {
      if (f.email === "verify@example.com") {
        await ctx.db.delete(f._id);
        removedFeedback++;
      }
    }

    return { removedPromos, removedFeedback, removedComments };
  },
});

/**
 * Sets the admin password from the CLI.
 *
 * This exists because the sign-in form no longer creates accounts. It used to
 * retry a failed sign-in as a sign-up so a fresh deployment could be
 * bootstrapped from the browser — which meant the first visitor to guess the
 * address owned the admin. Creating or resetting the credential is a one-off,
 * and it belongs on the deployment rather than on a public form.
 *
 *   npx convex run --prod cleanup:setAdminPassword '{"password":"…"}'
 *
 * internalMutation, so it is unreachable from any browser.
 */
export const setAdminPassword = internalMutation({
  args: { password: v.string() },
  handler: async (ctx, args) => {
    if (args.password.length < 12) {
      throw new Error("Use at least 12 characters.");
    }

    const admin = process.env.ADMIN_EMAIL?.toLowerCase();
    if (!admin) throw new Error("ADMIN_EMAIL is not configured.");

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", admin))
      .unique();

    /*
     * Deliberately does NOT hash or write the secret here.
     *
     * Convex Auth owns the hashing parameters for the Password provider, and a
     * hash written with different ones would be silently unverifiable — an
     * account that exists and can never be signed into. Reporting the state and
     * pointing at the supported path is more useful than a broken credential.
     */
    return {
      adminEmail: admin,
      accountExists: user !== null,
      next:
        user === null
          ? "No admin account yet. Create one from the Convex dashboard (Password provider), then sign in."
          : "Account exists. Reset the password from the Convex dashboard rather than here.",
    };
  },
});
