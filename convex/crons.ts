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

export default crons;
