import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import { ADMIN_PATH } from "@/lib/constants";

/**
 * Route protection.
 *
 * PROXY, NOT MIDDLEWARE. Next.js 16 renamed the convention — same file
 * position, same signature, same behaviour, new name; `middleware.ts` still
 * works but logs a deprecation warning on every dev boot. The Convex helpers
 * are still called convexAuthNextjsMiddleware because that is the package's
 * own naming, and renaming the file does not rename their exports.
 *
 * Every back-office route requires an authenticated session. This is the edge
 * gate; it is NOT the only check — each Convex query and mutation re-verifies
 * identity server-side, because a proxy cannot protect data reached by any
 * other path. Next's own docs are explicit that this layer is for optimistic
 * checks and must not be treated as the authorization boundary.
 */
/*
 * The back office, plus /admin itself.
 *
 * The old path is still matched so a stale bookmark hits the auth gate and is
 * redirected rather than falling through to a 404 that quietly confirms the
 * admin moved. It resolves to nothing either way — the route no longer exists.
 */
const isProtected = createRouteMatcher([`${ADMIN_PATH}(.*)`, "/admin(.*)"]);
// The portal handles its own three-state auth in-page rather than redirecting:
// a client arriving from an email link should see an explanation, not a
// sign-in form for an account they may not realise they have.
// The Convex middleware throws without a deployment URL, which would take down
// every route. Until `npx convex dev` has run, pass requests through untouched.
const configured = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

const convexMiddleware = convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    /*
     * Only the admin cares whether there is a session, and this matcher runs
     * on every page. Verifying the token unconditionally put a round-trip in
     * front of every marketing page for an answer none of them read.
     *
     * The sign-in page is deliberately not checked at all: it renders the
     * same form whether or not a session exists, so asking costs a round-trip
     * to change nothing.
     */
    const protectedRoute = isProtected(request);
    if (!protectedRoute) return;

    /*
     * /admin is a door, not a key: it always lands on the sign-in page.
     *
     * It used to redirect to ADMIN_PATH, where an existing session cookie
     * meant the back office simply opened — typing /admin on a browser that
     * was already signed in walked straight in with no password asked for.
     *
     * Matched as exactly /admin or /admin/... and NOT as a prefix, because
     * ADMIN_PATH also begins with "/admin" and a prefix test would send the
     * real path here forever.
     */
    const path = request.nextUrl.pathname;
    if (path === "/admin" || path.startsWith("/admin/")) {
      return nextjsMiddlewareRedirect(request, "/sign-in-admin");
    }

    const authed = await convexAuth.isAuthenticated();

    if (protectedRoute && !authed) {
      return nextjsMiddlewareRedirect(request, "/sign-in-admin");
    }

    /*
     * Landing on the sign-in page while signed in is deliberately NOT
     * redirected onward.
     *
     * That bounce is what made /admin read as an auto-login: the redirect
     * above arrived here and was thrown into the back office before anything
     * was typed. Reaching the sign-in page should always show the form. The
     * sign-in action is what moves you on — the page itself never does.
     */
  },
);

export default function proxy(
  request: NextRequest,
  event: Parameters<typeof convexMiddleware>[1],
) {
  /*
   * Without Convex there is no way to verify a session — so the admin FAILS
   * CLOSED rather than open.
   *
   * This used to pass every request straight through, which meant a missing
   * or mistyped NEXT_PUBLIC_CONVEX_URL turned the entire back office into a
   * public URL. A misconfiguration must never be the thing that unlocks it.
   *
   * Marketing pages still render, because they need no session and taking the
   * whole site down over an unset variable helps nobody.
   */
  if (!configured) {
    const path = request.nextUrl.pathname;
    const isAdminPath =
      path === "/admin" ||
      path.startsWith("/admin/") ||
      path === ADMIN_PATH ||
      path.startsWith(`${ADMIN_PATH}/`);

    if (isAdminPath) {
      return NextResponse.redirect(new URL("/sign-in-admin", request.url));
    }
    return NextResponse.next();
  }
  return convexMiddleware(request, event);
}

export const config = {
  /*
   * Skip Next internals and static files, run on everything else — with two
   * deliberate exclusions:
   *
   *   api/stripe/webhook  Stripe POSTs here with a signature over the raw
   *                       body. Anything that redirects, rewrites or touches
   *                       the request breaks verification, and a webhook that
   *                       silently fails means invoices never mark paid.
   *
   *   .well-known         Apple Pay domain verification is served from here.
   *                       If the file does not return exactly its own bytes,
   *                       Apple Pay does not appear — with no error at all,
   *                       it simply is not offered.
   */
  // A single negated pattern rather than a separate api entry: Next only
  // accepts a lookahead at the start of a matcher, so excluding the webhook
  // from a second "/(api|trpc)(.*)" line is not expressible.
  matcher: ["/((?!_next|\\.well-known|api/stripe/webhook|.*\\.[^/]+$).*)"],
};
