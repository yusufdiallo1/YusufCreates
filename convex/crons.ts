import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

/**
 * Scheduled work.
 *
 * Deliberately minimal. Most things that look like they need a cron do not —
 * post scheduling is a filter on read, and promo expiry is derived on read,
 * precisely so there is no job whose failure silently breaks them.
 *
 * These two genuinely need one: rate-limit rows accumulate forever otherwise,
 * and a testimonial request has to fire on a delay measured in weeks.
 */
const crons = cronJobs();

crons.daily(
  "sweep chat rate limits",
  { hourUTC: 3, minuteUTC: 0 },
  internal.maintenance.sweepChatLimits,
);

/*
 * The request flow's own housekeeping. See convex/automation.ts.
 *
 * These DO need a cron, unlike the read-time derivations above, because each
 * one has an external consequence — money written off, an email sent, an
 * invoice raised — that has to happen at a particular time whether or not
 * anybody has the admin open.
 *
 * The overdue sweep runs every five minutes because it is the one with a
 * promise attached: an express client is owed their waiver the moment the
 * window passes, and an hourly job could leave them believing they still owe
 * money for the best part of an hour.
 */
crons.interval(
  "waive overdue balances",
  { minutes: 5 },
  internal.automation.sweepOverdue,
);

crons.interval(
  "chase and expire unpaid deposits",
  { hours: 1 },
  internal.automation.sweepUnpaid,
);

crons.interval(
  "raise balance invoices",
  { minutes: 15 },
  internal.automation.sweepInvoices,
);

/*
 * Nightly analytics rollup.
 *
 * 03:30 UTC — after the chat-limit sweep at 03:00 so the two are not
 * competing, and late enough that "yesterday" is unambiguously complete in
 * every timezone the site is read from.
 *
 * This is the job that keeps the analytics page from degrading. Without it
 * every chart re-scans a growing events table on each load; the previous
 * implementation capped that read at 5000 rows and silently reported on a
 * fraction of the window rather than slowing down, which is the worse
 * failure of the two.
 */
crons.daily(
  "roll up analytics",
  { hourUTC: 3, minuteUTC: 30 },
  internal.analyticsRollup.rollupDay,
  {},
);

/*
 * Chase and expire contracts.
 *
 * Earns a cron by the test at the top of this file: both stages have an
 * external consequence at a particular time. Whether a contract is still
 * SIGNABLE is derived on read, so a missed run cannot let an expired one be
 * signed — what the job produces is the chasing email at 48 hours and the
 * lapse notice at 14 days, neither of which can be derived by anyone.
 *
 * Fifteen minutes, matching the invoice sweep. See the note in
 * src/app/api/cron/notify/route.ts about why stamping frequently and sending
 * daily was not good enough here.
 */
crons.interval(
  "chase and expire contracts",
  { minutes: 15 },
  internal.contracts.sweepContracts,
);

/*
 * Deliver what the sweep queued, without waiting for the daily Vercel cron.
 *
 * Sending lives in a Next route because Convex cannot talk to Resend, and that
 * route is on a DAILY schedule — Vercel's Hobby plan rejects anything faster
 * at deploy time. So a 48-hour alert stamped on time could still arrive at 72.
 *
 * Convex's scheduler has no such limit and Convex actions can fetch, so this
 * calls the same route on a sane cadence. The Vercel cron stays as the
 * backstop: if this fails, mail is late rather than lost.
 */
crons.interval(
  "deliver queued contract email",
  { minutes: 20 },
  internal.contracts.pokeNotify,
);

export default crons;
