import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import type { MutationCtx } from "./_generated/server";

/**
 * Auth — Convex Auth with the Password provider.
 *
 * The password is verified server-side against a stored hash by Convex; it is
 * never compared in the browser, so nothing sensitive reaches the JS bundle.
 *
 * Sign-up is locked to a single address via ADMIN_EMAIL. Anyone else who
 * completes the flow has their user row deleted and the sign-in aborted, so no
 * account is ever created for a non-admin.
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
  /*
   * Four failed attempts an hour, down from a default of ten.
   *
   * One person signs in here and they know the password. Ten guesses an hour
   * is a sensible default for a product with real users who forget theirs; on
   * a single-admin surface it is nine more than anyone legitimate needs. The
   * allowance refills continuously rather than in a block, so a typo does not
   * lock the day.
   */
  signIn: { maxFailedAttempsPerHour: 4 },
  callbacks: {
    /**
     * Two kinds of account may exist, and nothing else.
     *
     * ADMIN_EMAIL is me. An address in the clients table is a client I have
     * explicitly invited — they get a portal account and nothing more.
     * Everyone else has their user row deleted and the sign-in aborted.
     *
     * Being a client grants no admin access whatsoever: requireAdmin in
     * convex/lib/auth.ts still checks the email against ADMIN_EMAIL on every
     * single call, so widening account creation here cannot widen admin
     * access. That separation is the whole reason this is safe to loosen.
     */
    async afterUserCreatedOrUpdated(ctx, { userId, profile }) {
      const allowed = process.env.ADMIN_EMAIL;

      // Fail closed. An unset variable must never mean "allow everyone".
      if (!allowed) {
        await ctx.db.delete(userId);
        throw new Error("ADMIN_EMAIL is not configured; sign-in refused.");
      }

      const incoming = String(
        (profile as { email?: string }).email ?? "",
      ).toLowerCase();

      if (incoming === allowed.toLowerCase()) return;

      // Invited clients only — an address that is not already in the table
      // cannot create an account by attempting to sign in.
      //
      // The callback is typed against AnyDataModel, so the app's indexes are
      // not visible here. The cast restores them; the query itself is exactly
      // what a typed context would produce.
      const db = ctx.db as unknown as MutationCtx["db"];
      const client = await db
        .query("clients")
        .withIndex("by_email", (q) => q.eq("email", incoming))
        .unique();

      if (!client) {
        await ctx.db.delete(userId);
        throw new Error("This account is not permitted to sign in.");
      }

      // Link the account to the client record so portal queries can resolve
      // which projects they own without trusting anything from the request.
      await db.patch(client._id, {
        userId: userId as unknown as never,
        lastLoginAt: Date.now(),
      });
    },
  },
});
