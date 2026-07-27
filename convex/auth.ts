import { convexAuth } from "@convex-dev/auth/server";

/**
 * Auth entry point. Providers are configured here; add e.g. GitHub, Google or
 * Resend OTP as needed. Keep provider secrets in the Convex dashboard
 * environment variables, never in this file.
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [],
});
