import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { viewportBucket } from "./lib/analyticsBuckets";

/**
 * Nightly rollup of raw events into daily aggregates.
 *
 * The analytics page used to read raw events on every load, capped at 5000
 * rows per event type. That cap is worse than a slow query: `by_type_ts` is
 * ascending, so `.take(5000)` returned the OLDEST five thousand events in the
 * window and silently dropped everything after — the dashboard reported on
 * the first part of the month and called it the month.
 *
 * Charts now read `analyticsDaily`, which is a few hundred rows for a year.
 * Only today is computed from raw events, because today is still being
 * written to and is small.
 *
 * Idempotent: re-running for a date replaces that date's rows rather than
 * adding to them, so a retry after a failure cannot double a figure.
 */

/** One day in ms. */
const DAY = 86_400_000;

/** UTC date key. Deliberately UTC everywhere so buckets never shift. */
function dateKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

export const rollupDay = internalMutation({
  args: {
    /** YYYY-MM-DD. Defaults to yesterday, which is the first complete day. */
    date: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const date = args.date ?? dateKey(Date.now() - DAY);
    const from = Date.parse(`${date}T00:00:00.000Z`);
    if (Number.isNaN(from)) throw new Error(`Bad date: ${date}`);
    const to = from + DAY;

    /*
     * Read by time across every type.
     *
     * by_type_ts is keyed on type first, so a whole-day read would mean one
     * query per type. The table is scanned by creation order instead and
     * filtered to the window — a day's events is a bounded set, and this runs
     * once a night rather than on a page load.
     */
    const events = await ctx.db
      .query("events")
      .filter((q) => q.and(q.gte(q.field("ts"), from), q.lt(q.field("ts"), to)))
      .collect();

    /** metric → dimension → count. */
    const tally = new Map<string, Map<string, number>>();
    const add = (metric: string, dimension: string, by = 1) => {
      const inner = tally.get(metric) ?? new Map<string, number>();
      inner.set(dimension, (inner.get(dimension) ?? 0) + by);
      tally.set(metric, inner);
    };

    /* Sets, because a session or a visitor is counted once per day however
       many events it produced. */
    const sessions = new Set<string>();
    const visitors = new Set<string>();

    for (const e of events) {
      if (e.sessionId) sessions.add(e.sessionId);
      if (e.visitorId) visitors.add(e.visitorId);

      add("events", e.type);

      if (e.type === "pageview") {
        add("pageviews", "all");
        if (e.path) add("pages", e.path);
        if (e.referrer) add("referrers", e.referrer);
        if (e.device) add("devices", e.device);
        if (e.browser) add("browsers", e.browser);
        if (e.os) add("os", e.os);
        if (e.country) add("countries", e.country);
        if (e.utmSource) add("utm_source", e.utmSource);
        if (e.utmCampaign) add("utm_campaign", e.utmCampaign);
        /* Bucketed rather than stored raw — the question is which
           breakpoints matter, and a thousand distinct widths cannot answer
           it. Shared with the live path so the two cannot drift. */
        if (typeof e.viewportW === "number") {
          add("viewports", viewportBucket(e.viewportW));
        }
      }

      const label = e.meta?.cta ?? e.meta?.step ?? e.meta?.label;
      if (e.type === "cta_click" && label) add("ctas", String(label));
      if (e.type === "outbound_click" && label) add("outbound", String(label));
      if (e.type === "form_submit") add("submissions", "all");
      if (e.type === "form_start") add("form_starts", "all");
      if (e.type === "form_error" && label) add("form_errors", String(label));
      if (e.type === "faq_open" && label) add("faq", String(label));
      if (e.type === "pricing_tier_click" && label) add("tier_clicks", String(label));
      if (e.type === "pricing_currency" && label) add("currencies", String(label));
      if (e.type === "scroll_depth" && typeof e.meta?.value === "number") {
        add("scroll", `${e.meta.value}`);
      }
      if (e.type === "web_vital" && label && typeof e.meta?.value === "number") {
        /* Summed with a count alongside, so a p-value can be derived without
           storing every sample. */
        add("vital_sum", String(label), e.meta.value);
        add("vital_count", String(label));
      }
    }

    add("sessions", "all", sessions.size);
    add("visitors", "all", visitors.size);

    /* Replace rather than append, so a re-run is safe. */
    const existing = await ctx.db
      .query("analyticsDaily")
      .withIndex("by_date", (q) => q.eq("date", date))
      .collect();
    for (const row of existing) await ctx.db.delete(row._id);

    let written = 0;
    for (const [metric, inner] of tally) {
      for (const [dimension, value] of inner) {
        await ctx.db.insert("analyticsDaily", {
          date,
          metric,
          dimension,
          value,
        });
        written++;
      }
    }

    return { date, events: events.length, rows: written };
  },
});

/**
 * Backfills a range, for the first run or after a gap.
 *
 *   npx convex run --prod analyticsRollup:backfill '{"days":90}'
 */
export const backfill = internalMutation({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args): Promise<{ days: number }> => {
    const days = Math.min(Math.max(args.days ?? 30, 1), 400);
    const now = Date.now();

    for (let i = 1; i <= days; i++) {
      const date = dateKey(now - i * DAY);
      const from = Date.parse(`${date}T00:00:00.000Z`);
      const to = from + DAY;

      const events = await ctx.db
        .query("events")
        .filter((q) =>
          q.and(q.gte(q.field("ts"), from), q.lt(q.field("ts"), to)),
        )
        .collect();

      /* Skip empty days entirely rather than writing zero rows for them —
         a missing date and a date with no traffic are the same answer, and
         one of them costs nothing to store. */
      if (events.length === 0) continue;

      /* Reuses the same logic by scheduling the single-day rollup, so the
         two can never disagree about what a metric means. */
      await ctx.scheduler.runAfter(0, internal.analyticsRollup.rollupDay, {
        date,
      });
    }

    return { days };
  },
});
