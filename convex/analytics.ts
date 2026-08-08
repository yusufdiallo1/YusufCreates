import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";
import { viewportBucket } from "./lib/analyticsBuckets";

/**
 * Analytics, read from the daily rollup.
 *
 * The previous version scanned raw events on every load with `.take(5000)`
 * per type. Because `by_type_ts` is ascending, that returned the OLDEST five
 * thousand rows in the window and dropped the rest — so past 5000 events the
 * dashboard reported on the first part of the period and presented it as the
 * whole month. A slow query is a problem you notice; a silently truncated one
 * is not.
 *
 * So: history comes from `analyticsDaily`, written nightly by
 * analyticsRollup. TODAY is still computed from raw events, because today is
 * incomplete by definition and is one day's worth of rows.
 */

const DAY = 86_400_000;

function dateKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

/** Every YYYY-MM-DD from `days` ago up to and including today. */
function dateRange(days: number): string[] {
  const out: string[] = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) out.push(dateKey(now - i * DAY));
  return out;
}

/** Sum across every dimension of a metric. */
function totalOf(
  totals: Map<string, Map<string, number>>,
  metric: string,
): number {
  let sum = 0;
  for (const value of totals.get(metric)?.values() ?? []) sum += value;
  return sum;
}

export const summary = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const days = Math.min(Math.max(args.days ?? 30, 1), 365);
    const dates = dateRange(days);
    const todayKey = dates[dates.length - 1];

    /*
     * The rolled-up window, minus today.
     *
     * One indexed read per date — thirty small reads for a month, against a
     * scan of every event in it. The cost stays flat as the events table
     * grows, which is the entire point of the rollup.
     */
    const rolled = (
      await Promise.all(
        dates
          .slice(0, -1)
          .map((date) =>
            ctx.db
              .query("analyticsDaily")
              .withIndex("by_date", (q) => q.eq("date", date))
              .collect(),
          ),
      )
    ).flat();

    /* Today, from raw events. Bounded by being a single day. */
    const todayStart = Date.parse(`${todayKey}T00:00:00.000Z`);
    const todayEvents = await ctx.db
      .query("events")
      .filter((q) => q.gte(q.field("ts"), todayStart))
      .take(5000);

    /* ---------------------------------------------------------- shaping */

    /** metric → dimension → value, across the whole window. */
    const totals = new Map<string, Map<string, number>>();
    const bump = (metric: string, dimension: string, by = 1) => {
      const inner = totals.get(metric) ?? new Map<string, number>();
      inner.set(dimension, (inner.get(dimension) ?? 0) + by);
      totals.set(metric, inner);
    };

    /** metric → date → value, for the time series. */
    const byDay = new Map<string, Map<string, number>>();
    const bumpDay = (metric: string, date: string, by = 1) => {
      const inner = byDay.get(metric) ?? new Map<string, number>();
      inner.set(date, (inner.get(date) ?? 0) + by);
      byDay.set(metric, inner);
    };

    for (const row of rolled) {
      bump(row.metric, row.dimension ?? "all", row.value);
      bumpDay(row.metric, row.date, row.value);
    }

    /* Today folded in with the same shape, so the series has no gap at its
       right-hand end and the totals include the current day. */
    const todaySessions = new Set<string>();
    const todayVisitors = new Set<string>();

    for (const e of todayEvents) {
      if (e.sessionId) todaySessions.add(e.sessionId);
      if (e.visitorId) todayVisitors.add(e.visitorId);

      if (e.type === "pageview") {
        bump("pageviews", "all");
        bumpDay("pageviews", todayKey);
        if (e.path) bump("pages", e.path);
        if (e.referrer) bump("referrers", e.referrer);
        if (e.device) bump("devices", e.device);
        if (e.browser) bump("browsers", e.browser);
        if (e.country) bump("countries", e.country);
        /*
         * The SAME helper the rollup uses. Today and history must agree on
         * what a bucket means, or one visit lands in different rows
         * depending on which side of midnight it is read from. This branch
         * was missing here entirely, so a day with traffic showed
         * "No viewport data" until the nightly job caught up.
         */
        if (typeof e.viewportW === "number") {
          bump("viewports", viewportBucket(e.viewportW));
        }
      }

      const label = e.meta?.cta ?? e.meta?.step ?? e.meta?.label;
      if (e.type === "cta_click" && label) bump("ctas", String(label));
      if (e.type === "form_start") bump("form_starts", "all");
      if (e.type === "form_submit") bump("submissions", "all");
      if (e.type === "faq_open" && label) bump("faq", String(label));
      // How the audience splits between first-timers, returners and referrals.
      if (e.type === "entry_state" && label) {
        bump("entry_states", String(label));
      }
      if (e.type === "pricing_tier_click" && label) {
        bump("tier_clicks", String(label));
      }
      if (e.type === "pricing_currency" && label) {
        bump("currencies", String(label));
      }
      if (e.type === "scroll_depth" && typeof e.meta?.value === "number") {
        bump("scroll", String(e.meta.value));
      }
    }

    bump("sessions", "all", todaySessions.size);
    bump("visitors", "all", todayVisitors.size);
    bumpDay("sessions", todayKey, todaySessions.size);

    const total = (metric: string, dimension = "all") =>
      totals.get(metric)?.get(dimension) ?? 0;

    /** Top N of a metric's dimensions, biggest first. */
    const top = (metric: string, n = 10) =>
      [...(totals.get(metric) ?? new Map<string, number>())]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, n);

    const series = (metric: string) =>
      dates.map((date) => ({
        day: date,
        count: byDay.get(metric)?.get(date) ?? 0,
      }));

    const sessions = total("sessions");
    const submissions = total("submissions");
    const engagedRaw = totalOf(totals, "ctas");
    const starts = total("form_starts");

    /*
     * Nested by construction, so the funnel cannot widen.
     *
     * The old one was four independent distinct-session counts presented as a
     * funnel: a session that submitted without ever firing cta_click counted
     * at step four and not at step two, so step four could exceed step two
     * and the chart would read as a funnel that gained people. Each step here
     * is capped by the one before it.
     */
    const engaged = Math.min(engagedRaw, sessions);
    const started = Math.min(starts, engaged || sessions);
    const sent = Math.min(submissions, started || sessions);

    return {
      totals: {
        visitors: total("visitors"),
        sessions,
        pageviews: total("pageviews"),
        formStarts: starts,
        formSubmits: submissions,
        /* Null rather than 0 when there is no denominator: a conversion rate
           out of zero sessions is unknown, not zero. */
        conversionRate:
          sessions > 0
            ? Math.round((submissions / sessions) * 1000) / 10
            : null,
      },

      funnel: [
        { step: "Visited", count: sessions },
        { step: "Engaged", count: engaged },
        { step: "Started the form", count: started },
        { step: "Sent an enquiry", count: sent },
      ],

      daily: series("pageviews"),
      sessionsDaily: series("sessions"),

      topPages: top("pages"),
      referrers: top("referrers"),
      ctas: top("ctas"),
      devices: top("devices", 5),
      browsers: top("browsers", 6),
      countries: top("countries", 8),
      viewports: top("viewports", 6),
      tierClicks: top("tier_clicks", 8),
      currencies: top("currencies", 6),
      faq: top("faq", 8),
      /* Five dimensions at most — the entry states are a closed set, so this
         is the whole distribution rather than a top-N of something open. */
      entryStates: top("entry_states", 5),
      scroll: top("scroll", 4),

      /* Whether the rollup has ever run. Without this, "no data yet" and
         "the nightly job is broken" look identical on the page. */
      rolledDays: new Set(rolled.map((r) => r.date)).size,
    };
  },
});
