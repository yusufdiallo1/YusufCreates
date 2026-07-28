import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";

/**
 * First-party analytics.
 *
 * Queried per event type through by_type_ts and merged, rather than collecting
 * the whole table and filtering. The events table is the fastest-growing thing
 * in the database — one row per pageview — so a full scan here would get
 * slower every day the site is up.
 */

const TYPES = [
  "pageview",
  "cta_click",
  "form_start",
  "form_submit",
  "chat_open",
  "chat_message",
] as const;

export const summary = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const since = Date.now() - (args.days ?? 30) * 24 * 60 * 60 * 1000;

    const perType = await Promise.all(
      TYPES.map((type) =>
        ctx.db
          .query("events")
          .withIndex("by_type_ts", (q) => q.eq("type", type).gte("ts", since))
          .take(5000),
      ),
    );

    const [pageviews, ctaClicks, formStarts, formSubmits, chatOpens] = perType;

    const count = (rows: { sessionId?: string }[]) =>
      new Set(rows.map((r) => r.sessionId).filter(Boolean)).size;

    const tally = (rows: { path?: string }[], key: "path" = "path") => {
      const map = new Map<string, number>();
      for (const row of rows) {
        const value = row[key];
        if (!value) continue;
        map.set(value, (map.get(value) ?? 0) + 1);
      }
      return [...map.entries()]
        .map(([label, n]) => ({ label, count: n }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    };

    // Referrers only appear on a session's first pageview, so this counts
    // sessions rather than views.
    const referrers = new Map<string, number>();
    for (const row of pageviews) {
      const ref = (row.meta as { referrer?: string } | undefined)?.referrer;
      if (!ref) continue;
      try {
        const host = new URL(ref).hostname.replace(/^www\./, "");
        referrers.set(host, (referrers.get(host) ?? 0) + 1);
      } catch {
        // A malformed referrer is not worth failing the whole query over.
      }
    }

    const ctas = new Map<string, number>();
    for (const row of ctaClicks) {
      const cta = (row.meta as { cta?: string } | undefined)?.cta ?? "unnamed";
      ctas.set(cta, (ctas.get(cta) ?? 0) + 1);
    }

    // Daily buckets for the chart, oldest first.
    const byDay = new Map<string, number>();
    for (const row of pageviews) {
      const day = new Date(row.ts).toISOString().slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }

    const sessions = count(pageviews);

    return {
      totals: {
        pageviews: pageviews.length,
        sessions,
        formStarts: count(formStarts),
        formSubmits: count(formSubmits),
        chatOpens: count(chatOpens),
      },
      // Each step as a share of the one before, which is where a funnel
      // actually leaks — absolute counts hide that.
      funnel: [
        { step: "Visited", count: sessions },
        { step: "Clicked a CTA", count: count(ctaClicks) },
        { step: "Started the form", count: count(formStarts) },
        { step: "Sent an enquiry", count: count(formSubmits) },
      ],
      topPages: tally(pageviews),
      referrers: [...referrers.entries()]
        .map(([label, n]) => ({ label, count: n }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      ctas: [...ctas.entries()]
        .map(([label, n]) => ({ label, count: n }))
        .sort((a, b) => b.count - a.count),
      daily: [...byDay.entries()]
        .map(([day, n]) => ({ day, count: n }))
        .sort((a, b) => a.day.localeCompare(b.day)),
    };
  },
});
