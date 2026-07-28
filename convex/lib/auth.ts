import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/**
 * Server-side identity guard for every admin query and mutation.
 *
 * Never trust the client: arguments, headers and any "isAdmin" flag sent from
 * the browser are attacker-controlled. Identity comes only from the auth token
 * Convex validated, and the account is re-checked against ADMIN_GITHUB_ID on
 * every call so revoking access takes effect immediately rather than at the
 * next sign-in.
 */
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new Error("Not authenticated.");
  }

  const allowed = process.env.ADMIN_GITHUB_ID;
  if (!allowed) {
    throw new Error("ADMIN_GITHUB_ID is not configured.");
  }

  // Re-verify against the linked GitHub account, not a stored role flag.
  const account = await ctx.db
    .query("authAccounts")
    .withIndex("userIdAndProvider", (q) =>
      q.eq("userId", userId).eq("provider", "github"),
    )
    .unique();

  if (!account || String(account.providerAccountId) !== String(allowed)) {
    throw new Error("Not authorised.");
  }

  return userId;
}
