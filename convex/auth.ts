import GitHub from "@auth/core/providers/github";
import { convexAuth } from "@convex-dev/auth/server";

/**
 * Auth. GitHub is the only provider, and sign-in is restricted to a single
 * account via ADMIN_GITHUB_ID.
 *
 * The check runs in the callback rather than in the UI: anything client-side
 * is advisory only, since an attacker can complete the OAuth flow directly.
 * Throwing here aborts the sign-in after the user row is removed, so no
 * account persists for a non-admin login.
 *
 * ADMIN_GITHUB_ID must be set in the Convex dashboard, and must be the numeric
 * GitHub user id rather than the login handle — handles can be changed and
 * reclaimed by someone else.
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [GitHub],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, { userId, profile }) {
      const allowed = process.env.ADMIN_GITHUB_ID;

      // Fail closed. An unset variable must never mean "allow everyone".
      if (!allowed) {
        await ctx.db.delete(userId);
        throw new Error("ADMIN_GITHUB_ID is not configured; sign-in refused.");
      }

      const incoming = String(
        (profile as { id?: string | number }).id ?? "",
      );

      if (incoming !== String(allowed)) {
        await ctx.db.delete(userId);
        throw new Error("This account is not permitted to sign in.");
      }
    },
  },
});
