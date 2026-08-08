import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { requireAdmin } from "./lib/auth";
import { normaliseUrl, hostnameOf } from "./lib/url";
import { enqueueNotification } from "./notify";

/**
 * Monitoring for shipped client sites.
 *
 * The Care Plan is £450 a month and currently shows the client nothing, which
 * is how retainers churn. Not because the work stops — because invisible
 * maintenance is indistinguishable from none.
 *
 * WHY THIS RUNS ON CONVEX AND NOT ON A VERCEL CRON:
 *
 * Vercel's Hobby plan rejects any cron more frequent than once a day, at
 * DEPLOY time — see the warning in src/app/api/cron/notify/route.ts. A
 * five-minute uptime check is therefore impossible there. Convex's scheduler
 * has no such limit, and a Convex action can fetch, so the checks live here
 * and only the EMAIL leaves through Next.js via the outbox in convex/notify.
 *
 * RATE LIMITING IS NOT OPTIONAL. PageSpeed is metered and uptime checks
 * multiply by the number of sites. Every sweep below works in bounded batches
 * and staggers with the scheduler rather than fanning out with Promise.all.
 */

/** One check must not hang the sweep. Ten seconds is generous for a HEAD. */
const CHECK_TIMEOUT_MS = 10_000;

/** An incident opens at 2 and closes at 2. One timeout is noise, not an outage. */
const FAILURES_TO_OPEN = 2;
const SUCCESSES_TO_CLOSE = 2;

/** How long an outage must last before the client hears about it. */
const CLIENT_NOTIFY_AFTER_MS = 15 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Raw checks past this are purged. The rollup and incidents outlive them. */
const CHECK_RETENTION_DAYS = 35;

/* ==================================================================== *
 *  UPTIME                                                              *
 * ==================================================================== */

export const sitesToCheckInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const sites = await ctx.db.query("monitoredSites").collect();
    return sites.map((s) => ({ _id: s._id, url: s.url }));
  },
});

/**
 * The five-minute sweep.
 *
 * HEAD rather than GET: it asks the same question of the same server and
 * transfers no body, which matters when it runs 288 times a day per site.
 *
 * Checks run sequentially. A handful of sites is not worth the fan-out, and a
 * serial loop means one hanging host delays the sweep rather than racing
 * every other check against the same action timeout.
 */
export const sweepUptime = internalAction({
  args: {},
  /*
   * Return type written out, not inferred. An action that calls back into its
   * own module through `internal.monitoring.*` makes TypeScript chase a cycle
   * and give up with an implicit-any error; naming the type breaks it.
   */
  handler: async (ctx): Promise<number> => {
    const sites: { _id: Id<"monitoredSites">; url: string }[] =
      await ctx.runQuery(internal.monitoring.sitesToCheckInternal);

    for (const site of sites) {
      const result = await probe(site.url);
      await ctx.runMutation(internal.monitoring.recordCheckInternal, {
        siteId: site._id,
        ...result,
      });
    }

    return sites.length;
  },
});

async function probe(
  url: string,
): Promise<{ ok: boolean; statusCode?: number; responseMs?: number }> {
  /*
   * Re-validated on every check, not only when the URL is saved. A hostname
   * that used to be public can start resolving somewhere private, and this
   * runs on a schedule from inside the trust boundary.
   */
  const target = normaliseUrl(url);
  if (!target) return { ok: false };

  const started = Date.now();
  try {
    const res = await fetch(target, {
      method: "HEAD",
      redirect: "follow",
      // Some hosts and WAFs refuse unknown agents outright, which would read
      // as an outage rather than as a site that is up and fussy.
      headers: { "user-agent": "Mozilla/5.0 (compatible; YusufCreatesMonitor/1.0)" },
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    });

    return {
      // Anything below 400 is alive. A 301 or a 403 is a server answering.
      ok: res.status < 400,
      statusCode: res.status,
      responseMs: Date.now() - started,
    };
  } catch {
    // DNS failure, TLS failure, connection refused, or the timeout above.
    return { ok: false, responseMs: Date.now() - started };
  }
}

/**
 * Records one result and moves the incident state machine.
 *
 * A mutation, so the counter update, the incident row and the notification
 * enqueue are one transaction. Splitting them would allow a state where an
 * incident is open and nobody was ever told.
 */
export const recordCheckInternal = internalMutation({
  args: {
    siteId: v.id("monitoredSites"),
    ok: v.boolean(),
    statusCode: v.optional(v.number()),
    responseMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const site = await ctx.db.get(args.siteId);
    if (!site) return;

    const now = Date.now();

    await ctx.db.insert("uptimeChecks", {
      siteId: args.siteId,
      ts: now,
      ok: args.ok,
      statusCode: args.statusCode,
      responseMs: args.responseMs,
    });

    const failures = args.ok ? 0 : site.consecutiveFailures + 1;
    const successes = args.ok ? site.consecutiveSuccesses + 1 : 0;

    await ctx.db.patch(args.siteId, {
      consecutiveFailures: failures,
      consecutiveSuccesses: successes,
      lastCheckAt: now,
      lastStatus: args.statusCode,
    });

    const open = await openIncident(ctx, args.siteId);

    /* ---------------------------------------------------------- opening --- */
    if (!args.ok && failures === FAILURES_TO_OPEN && !open) {
      const cause = args.statusCode
        ? `HTTP ${args.statusCode}`
        : "No response before the 10s timeout";

      const incidentId = await ctx.db.insert("incidents", {
        siteId: args.siteId,
        openedAt: now,
        cause,
      });

      // Me, immediately.
      await enqueueNotification(ctx, {
        kind: "incident_open_admin",
        payload: { siteUrl: site.url, openedAt: now, cause },
      });

      /*
       * The client, only if it is still down in fifteen minutes.
       *
       * Scheduled rather than queued with a future dueAt, because it must be
       * re-checked before it sends: most blips resolve inside two checks, and
       * an alarm about something that fixed itself before they read it is how
       * a client learns to ignore the alerts that matter.
       */
      await ctx.scheduler.runAfter(
        CLIENT_NOTIFY_AFTER_MS,
        internal.monitoring.notifyClientIfStillDown,
        { incidentId },
      );
    }

    /* ---------------------------------------------------------- closing --- */
    if (args.ok && successes === SUCCESSES_TO_CLOSE && open) {
      const durationMinutes = Math.max(
        1,
        Math.round((now - open.openedAt) / 60_000),
      );

      await ctx.db.patch(open._id, { closedAt: now });

      await enqueueNotification(ctx, {
        kind: "incident_closed_admin",
        payload: {
          siteUrl: site.url,
          openedAt: open.openedAt,
          cause: open.cause,
          durationMinutes,
        },
      });

      /*
       * The all-clear goes only to a client who was told about the outage.
       * "Your site is back" about an outage they never heard of is a worse
       * message than silence.
       */
      if (open.clientNotifiedAt) {
        const client = site.clientId ? await ctx.db.get(site.clientId) : null;
        if (client) {
          await enqueueNotification(ctx, {
            kind: "incident_closed_client",
            payload: {
              to: client.email,
              name: client.name,
              siteUrl: site.url,
              openedAt: open.openedAt,
              cause: open.cause,
              durationMinutes,
              resolutionNote: open.resolutionNote,
            },
          });
        }
      }
    }
  },
});

async function openIncident(
  ctx: MutationCtx,
  siteId: Id<"monitoredSites">,
): Promise<Doc<"incidents"> | null> {
  const rows = await ctx.db
    .query("incidents")
    .withIndex("by_site", (q) => q.eq("siteId", siteId))
    .order("desc")
    .take(1);

  const latest = rows[0];
  return latest && latest.closedAt === undefined ? latest : null;
}

/** Fires 15 minutes after an incident opens, and checks it is still real. */
export const notifyClientIfStillDown = internalMutation({
  args: { incidentId: v.id("incidents") },
  handler: async (ctx, args) => {
    const incident = await ctx.db.get(args.incidentId);
    // Already recovered, or already told. Either way, nothing to send.
    if (!incident || incident.closedAt || incident.clientNotifiedAt) return;

    const site = await ctx.db.get(incident.siteId);
    if (!site?.clientId) return;

    // Only paying clients get told. A site monitored without a Care Plan is
    // one I am watching for my own reasons, and its owner never opted in.
    if (!site.careplanActive) return;

    const client = await ctx.db.get(site.clientId);
    if (!client) return;

    await enqueueNotification(ctx, {
      kind: "incident_open_client",
      payload: {
        to: client.email,
        name: client.name,
        siteUrl: site.url,
        openedAt: incident.openedAt,
        cause: incident.cause,
      },
    });

    await ctx.db.patch(args.incidentId, { clientNotifiedAt: Date.now() });
  },
});

/* ==================================================================== *
 *  DAILY — rollup, retention, expiry warnings                          *
 * ==================================================================== */

/**
 * Rolls 30 days of checks into one number per site, then throws the old
 * checks away.
 *
 * Computed here rather than on read for the same reason the analytics page
 * was rebuilt on a rollup: a portal card that scans 8,640 rows per site gets
 * slower every month until someone caps the scan and starts quietly reporting
 * on a fraction of the window.
 */
export const rollupUptime = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const from = now - 30 * DAY_MS;
    const sites = await ctx.db.query("monitoredSites").collect();

    for (const site of sites) {
      const checks = await ctx.db
        .query("uptimeChecks")
        .withIndex("by_site_ts", (q) =>
          q.eq("siteId", site._id).gte("ts", from),
        )
        .collect();

      if (checks.length > 0) {
        const ok = checks.filter((c) => c.ok).length;
        await ctx.db.patch(site._id, {
          uptimePercent30d: Math.round((ok / checks.length) * 10000) / 100,
        });
      }

      // Retention. Bounded per run so one site with a long backlog cannot
      // blow the mutation's limits — the next daily run picks up the rest.
      const stale = await ctx.db
        .query("uptimeChecks")
        .withIndex("by_site_ts", (q) =>
          q.eq("siteId", site._id).lt("ts", now - CHECK_RETENTION_DAYS * DAY_MS),
        )
        .take(2000);

      for (const check of stale) await ctx.db.delete(check._id);
    }

    return sites.length;
  },
});

/**
 * SSL and domain expiry.
 *
 * A lapsed domain is the most expensive thing that can happen to a client
 * site and it is entirely preventable — someone else registers it, the email
 * on it stops, and recovery ranges from an awkward fee to impossible.
 *
 * Warnings at 30, 14 and 7 days, to BOTH of us. The renewal is usually paid
 * on a card held by the client's registrar account, so an alert only I can
 * see is an alert that reached the wrong person.
 */
export const sweepExpiry = internalAction({
  args: {},
  /* Annotated for the same reason as sweepUptime — see the note there. */
  handler: async (ctx): Promise<number> => {
    const sites: { _id: Id<"monitoredSites">; url: string }[] =
      await ctx.runQuery(internal.monitoring.sitesForExpiryInternal);

    for (const site of sites) {
      const target = normaliseUrl(site.url);
      if (!target) continue;

      const [ssl, domain]: [number | null, number | null] = await Promise.all([
        ctx.runAction(internal.monitoringNode.certificateExpiry, {
          hostname: target.hostname,
        }),
        lookupDomainExpiry(hostnameOf(site.url)),
      ]);

      await ctx.runMutation(internal.monitoring.recordExpiryInternal, {
        siteId: site._id,
        sslExpiresAt: ssl ?? undefined,
        domainExpiresAt: domain ?? undefined,
      });
    }

    return sites.length;
  },
});

export const sitesForExpiryInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const sites = await ctx.db.query("monitoredSites").collect();
    return sites.map((s) => ({ _id: s._id, url: s.url }));
  },
});

/**
 * Domain expiry via RDAP.
 *
 * RDAP rather than WHOIS: it is JSON over HTTPS, so it needs no socket and no
 * per-registry text parsing, and rdap.org redirects to the authoritative
 * server for the TLD. WHOIS would mean scraping free-form text whose format
 * differs by registrar.
 *
 * Best-effort. Plenty of TLDs expose no expiry event at all, and a missing
 * date has to mean "unknown" rather than "expired".
 */
async function lookupDomainExpiry(domain: string): Promise<number | null> {
  try {
    const res = await fetch(`https://rdap.org/domain/${domain}`, {
      headers: { accept: "application/rdap+json" },
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      events?: { eventAction?: string; eventDate?: string }[];
    };

    const event = data.events?.find((e) => e.eventAction === "expiration");
    if (!event?.eventDate) return null;

    const ts = Date.parse(event.eventDate);
    return Number.isFinite(ts) ? ts : null;
  } catch {
    return null;
  }
}

export const recordExpiryInternal = internalMutation({
  args: {
    siteId: v.id("monitoredSites"),
    sslExpiresAt: v.optional(v.number()),
    domainExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const site = await ctx.db.get(args.siteId);
    if (!site) return;

    const now = Date.now();

    /*
     * A lookup that returned nothing must not erase a date we already had.
     * RDAP is flaky and a transient failure should not silently turn a known
     * expiry into "unknown", which is the one state that sends no warnings.
     */
    await ctx.db.patch(args.siteId, {
      sslExpiresAt: args.sslExpiresAt ?? site.sslExpiresAt,
      domainExpiresAt: args.domainExpiresAt ?? site.domainExpiresAt,
    });

    const client = site.clientId ? await ctx.db.get(site.clientId) : null;
    const sent = site.expiryAlertsSent ?? [];
    const nowSent = [...sent];

    for (const [kind, expiresAt] of [
      ["ssl", args.sslExpiresAt ?? site.sslExpiresAt],
      ["domain", args.domainExpiresAt ?? site.domainExpiresAt],
    ] as const) {
      if (!expiresAt) continue;

      const daysLeft = Math.ceil((expiresAt - now) / DAY_MS);

      for (const threshold of [30, 14, 7]) {
        /*
         * `<=` catches a threshold the sweep slept through — a job that
         * missed the exact day-14 run should still warn on day 13, not skip
         * silently to day 7.
         */
        if (daysLeft > threshold) continue;

        // Keyed by expiry date, so next year's renewal warns again rather
        // than being suppressed by last year's marker.
        const key = `${kind}:${threshold}:${new Date(expiresAt).toISOString().slice(0, 10)}`;
        if (nowSent.includes(key)) continue;
        nowSent.push(key);

        await enqueueNotification(ctx, {
          kind: "expiry_admin",
          payload: { siteUrl: site.url, kind, expiresAt, daysLeft },
        });

        if (client && site.careplanActive) {
          await enqueueNotification(ctx, {
            kind: "expiry_client",
            payload: {
              to: client.email,
              name: client.name,
              siteUrl: site.url,
              kind,
              expiresAt,
              daysLeft,
            },
          });
        }

        // One threshold per run. Crossing two at once means the job was down;
        // sending both together is noise, and the lower one fires tomorrow.
        break;
      }
    }

    if (nowSent.length !== sent.length) {
      await ctx.db.patch(args.siteId, { expiryAlertsSent: nowSent });
    }
  },
});

/* ==================================================================== *
 *  LIGHTHOUSE                                                          *
 * ==================================================================== */

/**
 * Weekly PageSpeed run, one site per scheduled tick.
 *
 * Staggered rather than looped, and that is the rate limit. PageSpeed is
 * metered, a single run routinely takes 30-60 seconds, and firing them
 * together is how a quota gets exhausted and every site reports nothing.
 *
 * Three minutes apart is comfortably slower than the API's per-minute
 * ceiling even without a key.
 */
export const sweepLighthouse = internalMutation({
  args: {},
  handler: async (ctx) => {
    const sites = await ctx.db.query("monitoredSites").collect();

    for (const [index, site] of sites.entries()) {
      await ctx.scheduler.runAfter(
        index * 3 * 60_000,
        internal.monitoring.runLighthouse,
        { siteId: site._id },
      );
    }

    return sites.length;
  },
});

export const runLighthouse = internalAction({
  args: { siteId: v.id("monitoredSites") },
  handler: async (ctx, args) => {
    const site = await ctx.runQuery(internal.monitoring.siteInternal, {
      siteId: args.siteId,
    });
    if (!site) return;

    const target = normaliseUrl(site.url);
    if (!target) return;

    const endpoint = new URL(
      "https://www.googleapis.com/pagespeedonline/v5/runPagespeed",
    );
    endpoint.searchParams.set("url", target.toString());

    const apiKey = process.env.PAGESPEED_API_KEY;
    if (apiKey) endpoint.searchParams.set("key", apiKey);

    // Mobile only. Running both strategies doubles the quota cost, and mobile
    // is the stricter and more representative of the two.
    endpoint.searchParams.set("strategy", "mobile");
    for (const c of ["performance", "accessibility", "best-practices", "seo"]) {
      endpoint.searchParams.append("category", c);
    }

    try {
      const res = await fetch(endpoint, {
        signal: AbortSignal.timeout(105_000),
      });
      if (!res.ok) return;

      const data = (await res.json()) as {
        lighthouseResult?: {
          categories?: Record<string, { score?: number | null }>;
          audits?: Record<string, { numericValue?: number }>;
        };
      };

      const cats = data.lighthouseResult?.categories ?? {};
      const audits = data.lighthouseResult?.audits ?? {};

      /*
       * Null is not zero.
       *
       * Lighthouse returns `score: null` for a category it could not compute
       * — best-practices does this regularly. Treating that as 0 would show a
       * confident zero for a site that renders perfectly well, and would then
       * fire a false "performance collapsed" alert.
       */
      const pct = (n?: number | null) =>
        typeof n === "number" && Number.isFinite(n)
          ? Math.round(n * 100)
          : undefined;

      await ctx.runMutation(internal.monitoring.recordLighthouseInternal, {
        siteId: args.siteId,
        performance: pct(cats.performance?.score),
        accessibility: pct(cats.accessibility?.score),
        bestPractices: pct(cats["best-practices"]?.score),
        seo: pct(cats.seo?.score),
        lcp: audits["largest-contentful-paint"]?.numericValue,
        inp: audits["interaction-to-next-paint"]?.numericValue,
        cls: audits["cumulative-layout-shift"]?.numericValue,
      });
    } catch {
      // A timeout or a quota rejection. The previous week's row still stands,
      // and a missing point on a sparkline is better than a fabricated one.
    }
  },
});

export const siteInternal = internalQuery({
  args: { siteId: v.id("monitoredSites") },
  handler: async (ctx, args) => {
    const site = await ctx.db.get(args.siteId);
    return site ? { url: site.url } : null;
  },
});

export const recordLighthouseInternal = internalMutation({
  args: {
    siteId: v.id("monitoredSites"),
    performance: v.optional(v.number()),
    accessibility: v.optional(v.number()),
    bestPractices: v.optional(v.number()),
    seo: v.optional(v.number()),
    lcp: v.optional(v.number()),
    inp: v.optional(v.number()),
    cls: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const site = await ctx.db.get(args.siteId);
    if (!site) return;

    const previous = await ctx.db
      .query("lighthouseRuns")
      .withIndex("by_site_ts", (q) => q.eq("siteId", args.siteId))
      .order("desc")
      .take(1);

    await ctx.db.insert("lighthouseRuns", { ...args, ts: Date.now() });
    await ctx.db.patch(args.siteId, { lastLighthouseAt: Date.now() });

    /*
     * A drop of more than ten points, week over week.
     *
     * Almost always someone uploading a 4MB photo straight off a camera.
     * Catching it the same week is exactly what the retainer is for — a month
     * later nobody remembers what changed and finding it means bisecting a
     * month of edits.
     */
    const before = previous[0]?.performance;
    const after = args.performance;

    if (
      typeof before === "number" &&
      typeof after === "number" &&
      before - after > 10
    ) {
      await enqueueNotification(ctx, {
        kind: "lighthouse_drop",
        payload: {
          siteUrl: site.url,
          previous: before,
          current: after,
          lcp: args.lcp,
          cls: args.cls,
        },
      });
    }
  },
});

/* ==================================================================== *
 *  MONTHLY REPORT                                                      *
 * ==================================================================== */

/**
 * The first of the month.
 *
 * This email is the entire justification for the retainer. A client paying
 * £450 a month and receiving nothing spends the year quietly wondering what
 * it is for, and then cancels — not because the work stopped, but because
 * they never saw it.
 *
 * Care Plan sites only. Sending a maintenance report to someone who is not
 * paying for maintenance sets an expectation I have not agreed to.
 */
export const sendMonthlyReports = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const from = now - 30 * DAY_MS;

    const sites = await ctx.db
      .query("monitoredSites")
      .withIndex("by_active", (q) => q.eq("careplanActive", true))
      .collect();

    const base = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
    let sent = 0;

    for (const site of sites) {
      if (!site.clientId) continue;
      const client = await ctx.db.get(site.clientId);
      if (!client) continue;

      const incidents = await ctx.db
        .query("incidents")
        .withIndex("by_site", (q) =>
          q.eq("siteId", site._id).gte("openedAt", from),
        )
        .collect();

      const runs = await ctx.db
        .query("lighthouseRuns")
        .withIndex("by_site_ts", (q) => q.eq("siteId", site._id).gte("ts", from))
        .collect();

      const latest = runs[runs.length - 1];
      const earliest = runs[0];

      await enqueueNotification(ctx, {
        kind: "monthly_report",
        payload: {
          to: client.email,
          name: client.name,
          siteUrl: site.url,
          // Last month, named from the report's own window rather than from
          // "now" — on the 1st, "this month" is one hour old.
          month: new Date(now - 15 * DAY_MS).toLocaleDateString("en-GB", {
            month: "long",
            year: "numeric",
          }),
          uptimePercent: site.uptimePercent30d ?? 100,
          incidents: incidents.map((i) => ({
            openedAt: i.openedAt,
            durationMinutes: i.closedAt
              ? Math.max(1, Math.round((i.closedAt - i.openedAt) / 60_000))
              : Math.max(1, Math.round((now - i.openedAt) / 60_000)),
            resolutionNote: i.resolutionNote,
          })),
          performance: latest?.performance,
          performancePrevious: earliest?.performance,
          accessibility: latest?.accessibility,
          seo: latest?.seo,
          sslExpiresAt: site.sslExpiresAt,
          domainExpiresAt: site.domainExpiresAt,
          fixed: [],
          upcoming: [],
          dashboardUrl: `${base}/portal`,
        },
      });

      sent += 1;
    }

    if (sent > 0) console.info(`[monitoring] queued ${sent} monthly report(s)`);
    return sent;
  },
});

/* ==================================================================== *
 *  ADMIN + PORTAL READS                                                *
 * ==================================================================== */

/**
 * Every site, worst first.
 *
 * Sorted in the query rather than in the table, because DataTable has no
 * default sort and its third-press-clears behaviour explicitly returns to
 * "the query's own order". This IS the meaningful order: anything wrong is at
 * the top, and clearing a sort should land back here rather than on insertion
 * order.
 */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const sites = await ctx.db.query("monitoredSites").collect();
    const now = Date.now();

    const rows = await Promise.all(
      sites.map(async (site) => {
        const open = await ctx.db
          .query("incidents")
          .withIndex("by_site", (q) => q.eq("siteId", site._id))
          .order("desc")
          .take(1);

        const latest = await ctx.db
          .query("lighthouseRuns")
          .withIndex("by_site_ts", (q) => q.eq("siteId", site._id))
          .order("desc")
          .take(1);

        const client = site.clientId ? await ctx.db.get(site.clientId) : null;
        const down = Boolean(open[0] && open[0].closedAt === undefined);

        const sslDays = site.sslExpiresAt
          ? Math.ceil((site.sslExpiresAt - now) / DAY_MS)
          : null;
        const domainDays = site.domainExpiresAt
          ? Math.ceil((site.domainExpiresAt - now) / DAY_MS)
          : null;

        return {
          _id: site._id,
          url: site.url,
          host: hostnameOf(site.url),
          clientName: client?.name ?? null,
          careplanActive: site.careplanActive,
          down,
          lastStatus: site.lastStatus,
          lastCheckAt: site.lastCheckAt,
          uptimePercent30d: site.uptimePercent30d ?? null,
          performance: latest[0]?.performance ?? null,
          sslDays,
          domainDays,
        };
      }),
    );

    /*
     * Severity, then whether it is a paying site. Down first, then anything
     * expiring inside a fortnight, then poor performance — the order in which
     * I would want to be told.
     */
    const severity = (r: (typeof rows)[number]) => {
      if (r.down) return 0;
      if ((r.domainDays !== null && r.domainDays <= 14) ||
          (r.sslDays !== null && r.sslDays <= 14)) return 1;
      if (r.performance !== null && r.performance < 50) return 2;
      if (r.uptimePercent30d !== null && r.uptimePercent30d < 99.5) return 3;
      return 4;
    };

    return rows.sort(
      (a, b) =>
        severity(a) - severity(b) ||
        Number(b.careplanActive) - Number(a.careplanActive) ||
        a.host.localeCompare(b.host),
    );
  },
});

/** One site, for the project panel and the portal card. */
export const forProject = query({
  args: { projectId: v.id("clientProjects") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const sites = await ctx.db
      .query("monitoredSites")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return await Promise.all(sites.map((site) => detail(ctx, site)));
  },
});

/**
 * The client's own view, resolved from their session.
 *
 * No clientId argument, following the rule in convex/portal.ts: a client id
 * is never taken from the request.
 */
export const mySites = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    const user = await ctx.db.get(userId);
    const email = (user as { email?: string } | null)?.email?.toLowerCase();
    if (!email) return [];

    const client = await ctx.db
      .query("clients")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!client) return [];

    const sites = await ctx.db
      .query("monitoredSites")
      .withIndex("by_client", (q) => q.eq("clientId", client._id))
      .collect();

    return await Promise.all(sites.map((site) => detail(ctx, site)));
  },
});

async function detail(ctx: QueryCtx, site: Doc<"monitoredSites">) {
  const now = Date.now();
  const from = now - 30 * DAY_MS;

  const incidents = await ctx.db
    .query("incidents")
    .withIndex("by_site", (q) => q.eq("siteId", site._id).gte("openedAt", from))
    .order("desc")
    .collect();

  const runs = await ctx.db
    .query("lighthouseRuns")
    .withIndex("by_site_ts", (q) =>
      q.eq("siteId", site._id).gte("ts", now - 84 * DAY_MS),
    )
    .collect();

  /*
   * One segment per day for the last 30, derived from incidents rather than
   * from raw checks.
   *
   * Incidents are sparse — usually zero rows — where the checks behind them
   * are 8,640 per site per month. Reading the checks here is the mistake the
   * analytics rollup existed to fix.
   */
  const days: { day: number; ok: boolean }[] = [];
  for (let i = 29; i >= 0; i -= 1) {
    const start = new Date(now - i * DAY_MS).setHours(0, 0, 0, 0);
    const end = start + DAY_MS;
    const hit = incidents.some(
      (inc) => inc.openedAt < end && (inc.closedAt ?? now) >= start,
    );
    days.push({ day: start, ok: !hit });
  }

  return {
    _id: site._id,
    url: site.url,
    host: hostnameOf(site.url),
    careplanActive: site.careplanActive,
    down: incidents.some((i) => i.closedAt === undefined),
    uptimePercent30d: site.uptimePercent30d ?? null,
    lastCheckAt: site.lastCheckAt,
    sslExpiresAt: site.sslExpiresAt,
    domainExpiresAt: site.domainExpiresAt,
    /*
     * Days remaining computed here, not in the component.
     *
     * A React component reading Date.now() during render is impure — it gives
     * a different answer on every re-render for reasons unrelated to its
     * props. The server already knows `now`, so it is the right place to
     * subtract.
     */
    sslDays: site.sslExpiresAt
      ? Math.ceil((site.sslExpiresAt - now) / DAY_MS)
      : null,
    domainDays: site.domainExpiresAt
      ? Math.ceil((site.domainExpiresAt - now) / DAY_MS)
      : null,
    performance: runs.length > 0 ? (runs[runs.length - 1].performance ?? null) : null,
    trend: runs.map((r) => r.performance ?? 0),
    days,
    incidents: incidents.slice(0, 10).map((i) => ({
      _id: i._id,
      openedAt: i.openedAt,
      closedAt: i.closedAt,
      cause: i.cause,
      resolutionNote: i.resolutionNote,
    })),
  };
}

/* ==================================================================== *
 *  ADMIN WRITES                                                        *
 * ==================================================================== */

export const addSite = mutation({
  args: {
    url: v.string(),
    projectId: v.optional(v.id("clientProjects")),
    careplanActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const target = normaliseUrl(args.url);
    if (!target) {
      throw new Error("That is not a public web address I can reach.");
    }

    const project = args.projectId ? await ctx.db.get(args.projectId) : null;

    return await ctx.db.insert("monitoredSites", {
      url: target.toString(),
      projectId: args.projectId,
      clientId: project?.clientId,
      careplanActive: args.careplanActive,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      createdAt: Date.now(),
    });
  },
});

export const setCareplan = mutation({
  args: { siteId: v.id("monitoredSites"), active: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.siteId, { careplanActive: args.active });
  },
});

export const removeSite = mutation({
  args: { siteId: v.id("monitoredSites") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    for (const table of ["uptimeChecks", "lighthouseRuns"] as const) {
      let batch = await ctx.db
        .query(table)
        .withIndex("by_site_ts", (q) => q.eq("siteId", args.siteId))
        .take(1000);
      while (batch.length > 0) {
        for (const row of batch) await ctx.db.delete(row._id);
        batch = await ctx.db
          .query(table)
          .withIndex("by_site_ts", (q) => q.eq("siteId", args.siteId))
          .take(1000);
      }
    }

    const incidents = await ctx.db
      .query("incidents")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();
    for (const row of incidents) await ctx.db.delete(row._id);

    await ctx.db.delete(args.siteId);
  },
});

/** What I did about it, shown to the client in the report and the history. */
export const setResolution = mutation({
  args: { incidentId: v.id("incidents"), note: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.incidentId, {
      resolutionNote: args.note.trim().slice(0, 1000) || undefined,
    });
  },
});

/** The manual re-check button. Same path as the sweep, one site. */
export const recheck = internalAction({
  args: { siteId: v.id("monitoredSites") },
  handler: async (ctx, args) => {
    const site = await ctx.runQuery(internal.monitoring.siteInternal, {
      siteId: args.siteId,
    });
    if (!site) return;

    const result = await probe(site.url);
    await ctx.runMutation(internal.monitoring.recordCheckInternal, {
      siteId: args.siteId,
      ...result,
    });
  },
});

export const recheckNow = mutation({
  args: { siteId: v.id("monitoredSites") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.scheduler.runAfter(0, internal.monitoring.recheck, {
      siteId: args.siteId,
    });
  },
});
