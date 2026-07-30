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
 * Every back-office route requires an authenticated session. This is
 * the edge gate; it is NOT the only check — each Convex query and mutation
 * re-verifies identity server-side, because middleware cannot protect data
 * reached by any other path.
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
// Sign-in is the Password provider at /sign-in-admin. The old /signin page
// used GitHub OAuth, which convex/auth.ts no longer configures, so sending
// anyone there was sending them to a dead end.
const isSignIn = createRouteMatcher(["/sign-in-admin"]);

// The Convex middleware throws without a deployment URL, which would take down
// every route. Until `npx convex dev` has run, pass requests through untouched.
const configured = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

const convexMiddleware = convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    /*
     * Only the two route groups below care whether there is a session, but
     * this matcher runs on every page. Verifying the token unconditionally
     * put a round-trip in front of every marketing page for an answer they
     * never read — so the check is made lazily, per branch.
     */
    const protectedRoute = isProtected(request);
    const signInRoute = isSignIn(request);
    if (!protectedRoute && !signInRoute) return;

    const authed = await convexAuth.isAuthenticated();

    if (protectedRoute && !authed) {
      return nextjsMiddlewareRedirect(request, "/sign-in-admin");
    }

    if (signInRoute && authed) {
      return nextjsMiddlewareRedirect(request, ADMIN_PATH);
    }
  },
);

export default function middleware(
  request: NextRequest,
  event: Parameters<typeof convexMiddleware>[1],
) {
  if (!configured) return NextResponse.next();
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
