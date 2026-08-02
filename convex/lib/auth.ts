import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/**
 * Server-side identity guard for every admin query and mutation.
 *
 * Never trust the client: arguments, headers and any "isAdmin" flag sent from
 * the browser are attacker-controlled. Identity comes only from the auth token
 * Convex validated, and the account is re-checked against ADMIN_EMAIL on every
 * call rather than read from a stored role flag — so revoking access takes
 * effect immediately instead of at the next sign-in.
 *
 * This checks the email on the user record because sign-in uses the Password
 * provider. convex/auth.ts refuses to create an account for any other address,
 * so the two checks agree; this one is the authoritative gate for data access.
 *
 * Fails closed. An unset ADMIN_EMAIL denies everyone rather than admitting
 * anyone, which is the only safe direction for a misconfiguration.
 */
/**
 * The login identifier for the admin account.
 *
 * Separate from ADMIN_EMAIL, which is where notifications are SENT. Sign-in
 * is by username now, so the thing typed into the form and the address mail
 * goes to are two different values — conflating them meant the inbox that
 * receives alerts was also the credential, and it shipped in the form.
 *
 * Falls back to ADMIN_EMAIL so a deployment that has not set the new variable
 * keeps working rather than locking me out.
 */
function adminIdentifier(): string | undefined {
  return process.env.ADMIN_USERNAME ?? process.env.ADMIN_EMAIL;
}

export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new Error("Not authenticated.");
  }

  const allowed = adminIdentifier();
  if (!allowed) {
    throw new Error("ADMIN_USERNAME is not configured.");
  }

  const user = await ctx.db.get(userId);
  const email = (user as { email?: string } | null)?.email;

  if (!email || email.toLowerCase() !== allowed.toLowerCase()) {
    throw new Error("Not authorised.");
  }

  return userId;
}

/**
 * The same check phrased as a question.
 *
 * The admin shell needs to know whether to render a signed-out state, and
 * doing that by catching an exception from every query on a fresh page load
 * is noisy and easy to get wrong.
 */
export async function isAdmin(ctx: QueryCtx | MutationCtx): Promise<boolean> {
  try {
    await requireAdmin(ctx);
    return true;
  } catch {
    return false;
  }
}
