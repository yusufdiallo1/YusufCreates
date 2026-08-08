import { NextResponse } from "next/server";

/**
 * Anything under /api that matches no real route: 404, on every method.
 *
 * Without this, an unmatched POST falls through to rendering the not-found
 * PAGE — which is HTML, and which production currently serves with a status
 * of 200. A GET to the same path correctly 404s. The split is easy to miss
 * because nobody browses to an API path with a POST.
 *
 * It is not cosmetic. Three things downstream read that status:
 *
 *   1. convex/notify.ts pokes /api/notify/dispatch and now warns when the
 *      response is not ok. A 404 disguised as a 200 defeats exactly that
 *      check — the poke would look successful while sending nothing, which
 *      is the silent degradation the warning exists to catch.
 *   2. Any integration configured with a slightly wrong path gets a
 *      confident success for a request nothing handled.
 *   3. It cost real debugging time already: a POST to this deployment's
 *      /api/notify/dispatch answered 200 before that route existed at all,
 *      which reads as "the endpoint is live".
 *
 * A catch-all does NOT shadow real routes. Next resolves static segments
 * before dynamic ones, so /api/stripe/webhook, /api/health and the rest still
 * reach their own handlers; only genuinely unmatched paths land here.
 *
 * JSON rather than HTML, because everything under /api is machine-read. A
 * client that asked for an endpoint should not have to parse a marketing page
 * to discover it was not found.
 */

export const runtime = "nodejs";

/*
 * NOT `dynamic = "force-static"`, which is the obvious-looking optimisation
 * and is wrong here. A route exporting POST, PUT or DELETE cannot be
 * statically generated, and Next answers the whole route with
 * DYNAMIC_SERVER_USAGE — a 500 on every unmatched path, which is a good deal
 * worse than the 200 this file exists to fix.
 *
 * There is nothing to optimise anyway: the handler below touches no database,
 * checks no auth and allocates one small object.
 */

function notFound() {
  return NextResponse.json(
    { error: "Not found." },
    {
      status: 404,
      // Never cached. A 404 cached at the edge outlives the deploy that adds
      // the real route, which turns a typo into a mystery outage.
      headers: { "cache-control": "no-store" },
    },
  );
}

export const GET = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
export const HEAD = notFound;
export const OPTIONS = notFound;
