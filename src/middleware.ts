import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

/**
 * Route protection.
 *
 * Every /admin and /dashboard route requires an authenticated session. This is
 * the edge gate; it is NOT the only check — each Convex query and mutation
 * re-verifies identity server-side, because middleware cannot protect data
 * reached by any other path.
 */
// /dashboard no longer exists — the admin lives entirely under /admin.
const isProtected = createRouteMatcher(["/admin(.*)"]);
// Sign-in is the Password provider at /sign-in-admin. The old /signin page
// used GitHub OAuth, which convex/auth.ts no longer configures, so sending
// anyone there was sending them to a dead end.
const isSignIn = createRouteMatcher(["/sign-in-admin"]);

// The Convex middleware throws without a deployment URL, which would take down
// every route. Until `npx convex dev` has run, pass requests through untouched.
const configured = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

const convexMiddleware = convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    const authed = await convexAuth.isAuthenticated();

    if (isProtected(request) && !authed) {
      return nextjsMiddlewareRedirect(request, "/sign-in-admin");
    }

    if (isSignIn(request) && authed) {
      return nextjsMiddlewareRedirect(request, "/admin");
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
  // Skip Next internals and static files, run on everything else.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
