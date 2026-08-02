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
/**
 * Sign-in is by USERNAME, not email.
 *
 * The Password provider validates its identifier as an email address by
 * default, which meant the one account on this deployment was named after a
 * real inbox — and that address shipped in the sign-in form. A username is
 * not an address, cannot be guessed from a WHOIS record, and gives away
 * nothing if the page is read.
 *
 * The `profile` override is what removes the email check: the identifier is
 * taken as an opaque string and stored on the user's `email` field, because
 * that is the column Convex Auth keys accounts on. It is a name, not an
 * address, and nothing ever tries to send mail to it.
 */
const UsernamePassword = Password({
  profile(params) {
    return { email: String(params.email ?? "").trim().toLowerCase() };
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [UsernamePassword],
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
      const allowed = process.env.ADMIN_USERNAME ?? process.env.ADMIN_EMAIL;

      // Fail closed. An unset variable must never mean "allow everyone".
      if (!allowed) {
        await ctx.db.delete(userId);
        throw new Error("ADMIN_USERNAME is not configured; sign-in refused.");
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
