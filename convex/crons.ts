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

export default crons;
