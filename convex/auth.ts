import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

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
  callbacks: {
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

      if (incoming !== allowed.toLowerCase()) {
        await ctx.db.delete(userId);
        throw new Error("This account is not permitted to sign in.");
      }
    },
  },
});
