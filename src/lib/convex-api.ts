/**
 * Single import point for the Convex API.
 *
 * `convex/_generated/` is created by `npx convex dev`. A committed placeholder
 * lives there so the site builds on a fresh clone, before any deployment has
 * been provisioned; running `npx convex dev` overwrites it with the real typed
 * API and nothing here needs to change.
 *
 * Always gate calls on `isConvexConfigured` — with the placeholder in place,
 * property access is safe but invoking a query is not.
 */
export { api, internal } from "../../convex/_generated/api";

/** True only when a Convex deployment URL is present. */
export const isConvexConfigured = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
