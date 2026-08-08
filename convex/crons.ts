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
 * Notification outbox housekeeping.
 *
 * Only sweeps rows already SENT. Unsent rows are never touched by a timer —
 * a queued notification that quietly disappeared is indistinguishable from
 * one that was delivered, and the whole design in convex/notify.ts turns on
 * the row being the truth.
 */
crons.daily(
  "sweep sent notifications",
  { hourUTC: 4, minuteUTC: 0 },
  internal.notify.sweepSent,
);

/*
 * Credential expiry.
 *
 * The one cron here whose whole purpose is to DELETE data rather than move it
 * along. A credential store that only ever grows becomes a liability nobody
 * remembers accepting, so the 30-day timer set at project completion has to
 * be enforced by something that runs whether or not I remember it exists.
 *
 * Only touches rows with a deleteAfter actually set. An unset field means
 * "keep", not "delete immediately" — see the guard in purgeExpired.
 */
crons.daily(
  "purge expired credentials",
  { hourUTC: 4, minuteUTC: 30 },
  internal.credentials.purgeExpired,
);

/*
 * Intake nudges, at day 3 and day 7.
 *
 * 09:00 UTC so it lands in a working morning rather than overnight — this is
 * a request for someone's time, and a 4am timestamp on it reads as automated
 * in a way that makes it easier to ignore.
 *
 * Daily rather than hourly because the granularity is days. Running it more
 * often would only add chances to double-send.
 */
crons.daily(
  "nudge incomplete intakes",
  { hourUTC: 9, minuteUTC: 0 },
  internal.intake.sweepNudges,
);

/*
 * Site monitoring.
 *
 * These run HERE rather than on a Vercel cron because they have to. The Hobby
 * plan rejects any cron more frequent than once a day at deploy time, so a
 * five-minute uptime check is impossible there — Convex's scheduler has no
 * such limit, and a Convex action can fetch.
 *
 * Five minutes is the interval the whole incident rule is built on: an
 * incident opens after two consecutive failures, so the fastest a real outage
 * is detected is ten minutes, and the client hears at twenty-five. Shortening
 * this interval means more quota, not more certainty.
 */
crons.interval(
  "check monitored sites",
  { minutes: 5 },
  internal.monitoring.sweepUptime,
);

/*
 * Rolls 30 days of checks into one figure per site and purges the raw rows
 * past 35 days. 02:00, before the other daily jobs, so everything reading a
 * percentage that day reads a fresh one.
 */
crons.daily(
  "roll up uptime",
  { hourUTC: 2, minuteUTC: 0 },
  internal.monitoring.rollupUptime,
);

/*
 * SSL and domain expiry, with warnings at 30, 14 and 7 days.
 *
 * A lapsed domain is the most expensive thing that can happen to a client
 * site and it is entirely preventable, which is the whole argument for a job
 * that reports nothing at all for months at a time.
 */
crons.daily(
  "check ssl and domain expiry",
  { hourUTC: 5, minuteUTC: 0 },
  internal.monitoring.sweepExpiry,
);

/*
 * Weekly Lighthouse. Monday morning, so a regression shipped on Friday is
 * found at the start of the week rather than at the end of it.
 *
 * The sweep only SCHEDULES the runs — one site every three minutes. PageSpeed
 * is metered and a single run takes 30-60s, so firing them together is how a
 * quota gets exhausted and every site reports nothing.
 */
crons.weekly(
  "run lighthouse",
  { dayOfWeek: "monday", hourUTC: 6, minuteUTC: 0 },
  internal.monitoring.sweepLighthouse,
);

/*
 * The monthly report, on the 1st.
 *
 * This email is the entire justification for the retainer. 08:00 UTC so it
 * lands at the top of a working morning rather than overnight.
 */
crons.monthly(
  "send monthly care plan reports",
  { day: 1, hourUTC: 8, minuteUTC: 0 },
  internal.monitoring.sendMonthlyReports,
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
