import { NextResponse } from "next/server";
import { isConvexConfigured } from "@/lib/convex-api";
import { drain } from "@/lib/notifyDrain";

/**
 * Sends whatever Convex has queued, now.
 *
 * A thin wrapper over `drain` in src/lib/notifyDrain.ts — the work lives
 * there because /api/cron/notify calls it too, and a Next route file may only
 * export handlers and config.
 *
 * This endpoint exists for immediacy. Convex pokes it the moment a
 * notification comes due, which is what makes an outage alert arrive in
 * seconds rather than tomorrow morning.
 *
 * ⚠ The daily-cron fallback is not a preference. Vercel's Hobby plan rejects
 * any cron more frequent than once a day AT DEPLOY TIME — see the warning at
 * the top of src/app/api/cron/notify/route.ts. Adding a second vercel.json
 * entry is not the fix; this poke is.
 */

export const runtime = "nodejs";

/*
 * Rendering a batch of React Email templates and handing them to Resend one
 * at a time adds up. The default cap would abort a large drain partway,
 * leaving the remainder queued — recoverable, but wasteful.
 */
export const maxDuration = 60;

/**
 * Two callers are allowed, matching /api/cron/notify exactly: Vercel Cron
 * with CRON_SECRET, and anything holding EMAIL_LOG_SECRET — which is what the
 * Convex action uses, and what lets me trigger a drain by hand.
 */
function authorised(request: Request): boolean {
  const auth = request.headers.get("authorization");

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;

  const shared = process.env.EMAIL_LOG_SECRET;
  if (shared && auth === `Bearer ${shared}`) return true;
  if (shared && request.headers.get("x-cron-secret") === shared) return true;

  return false;
}

export async function POST(request: Request) {
  if (!isConvexConfigured) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }
  if (!authorised(request)) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  /*
   * Checked, not asserted — the same trap /api/cron/notify documents. Every
   * mutation underneath declares `secret: v.string()`, so a deployment with
   * only CRON_SECRET set would pass the auth check above and then fail
   * argument validation on every single row, invisibly, forever.
   */
  const secret = process.env.EMAIL_LOG_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "EMAIL_LOG_SECRET is not configured; nothing can be sent." },
      { status: 503 },
    );
  }

  const result = await drain(secret);
  return NextResponse.json({ ok: true, ...result });
}
