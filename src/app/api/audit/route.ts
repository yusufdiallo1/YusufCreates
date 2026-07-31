import { NextResponse, after } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { AuditResults } from "@emails/AuditResults";
import { AuditFailed } from "@emails/AuditFailed";
import { adminEmail, sendEmail } from "@/lib/email";
import { logEmailSend } from "@/lib/emailLog";
import { SITE } from "@/lib/constants";

/**
 * Free site audit.
 *
 * Two things make this endpoint dangerous, and both are handled here:
 *
 * 1. SSRF. It fetches a URL the visitor supplies. Without a guard, someone
 *    points it at 169.254.169.254 and reads cloud instance metadata, or at an
 *    internal address to map a private network. The allowlist below is
 *    deny-by-default: only public http(s) hosts pass.
 * 2. Quota. PageSpeed is metered. Per-email limits live in Convex; this
 *    handler also refuses obviously abusive input before spending a call.
 *
 * Accessibility comes from PageSpeed's own Lighthouse run rather than axe-core
 * directly — axe needs a DOM, and running a headless browser per request is
 * not viable in a serverless function. Lighthouse runs axe under the hood, so
 * the result is the same data without the infrastructure.
 */

export const runtime = "nodejs";

/*
 * PageSpeed regularly takes 30-60s on a slow site. The default cap would abort
 * the run partway and leave the row unfinished, which is the same stuck state
 * from the caller's point of view.
 */
export const maxDuration = 120;

/** Private ranges, loopback, link-local and anything not obviously public. */
function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();

  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local")) {
    return true;
  }
  if (h === "metadata.google.internal") return true;

  // IPv6 loopback and unique-local.
  if (h === "::1" || h.startsWith("fc") || h.startsWith("fd")) return true;

  const parts = h.split(".");
  if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
    const [a, b] = parts.map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    // AWS/GCP instance metadata.
    if (a === 169 && b === 254) return true;
  }

  return false;
}

function normaliseUrl(raw: string): URL | null {
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    // Only http(s). file:, gopher: and data: are all SSRF vectors.
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname.includes(".")) return null;
    if (isPrivateHost(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

/** Plain-English rewrites of the Lighthouse audits worth acting on. */
const FIX_COPY: Record<string, { title: string; detail: string }> = {
  "modern-image-formats": {
    title: "Your images are heavier than they need to be",
    detail:
      "Converting them to WebP would cut the page weight substantially without any visible loss of quality.",
  },
  "uses-responsive-images": {
    title: "Full-size images are being sent to phones",
    detail:
      "The browser downloads a desktop-sized image and then shrinks it, which wastes most of the download on a phone.",
  },
  "render-blocking-resources": {
    title: "Scripts and stylesheets are delaying the first paint",
    detail:
      "The page waits for these before showing anything, so visitors stare at a blank screen longer than they need to.",
  },
  "unused-javascript": {
    title: "JavaScript is being downloaded and never used",
    detail:
      "Code that never runs still has to be fetched, parsed and compiled before the page becomes interactive.",
  },
  "largest-contentful-paint-element": {
    title: "The main image loads late",
    detail:
      "The biggest thing on screen is not prioritised, so the page looks empty for longer than it should.",
  },
  "server-response-time": {
    title: "The server takes a while to respond",
    detail:
      "Nothing can start rendering until the first byte arrives, so this delays everything after it.",
  },
  "unminified-javascript": {
    title: "Code is shipped unminified",
    detail:
      "Whitespace and comments are being downloaded by every visitor. Minifying is a build setting, not a rewrite.",
  },
  "total-byte-weight": {
    title: "The page is simply very large",
    detail:
      "On a phone connection this is the difference between a site that feels instant and one that feels broken.",
  },
};


/**
 * Reads a site's own name, description and logo out of its HTML.
 *
 * A report that opens with someone's own logo and name reads as being about
 * them; one that opens with a bare URL reads as a form response. Everything
 * here is best-effort — a site with no metadata still gets a full audit, it
 * just gets its hostname as the title.
 *
 * Deliberately not a parser. Four regexes over the first 200KB is enough for
 * og: tags in a <head>, and pulling in a DOM library to read four strings
 * from a stranger's markup is a large dependency and a larger attack surface.
 */
async function readSiteIdentity(url: string): Promise<{
  siteName?: string;
  siteLogo?: string;
  siteDescription?: string;
}> {
  try {
    const res = await fetch(url, {
      // A site that blocks unknown agents outright would otherwise look
      // identityless rather than protected.
      headers: { "user-agent": "Mozilla/5.0 (compatible; YusufCreatesAudit/1.0)" },
      signal: AbortSignal.timeout(12_000),
      redirect: "follow",
    });
    if (!res.ok) return {};

    // Head only. The rest of the document cannot contain what we are after,
    // and a huge page should not be pulled into memory for four tags.
    const html = (await res.text()).slice(0, 200_000);

    const meta = (pattern: RegExp) => html.match(pattern)?.[1]?.trim();

    const siteName =
      meta(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)/i) ??
      meta(/<meta[^>]+name=["']application-name["'][^>]+content=["']([^"']+)/i) ??
      meta(/<title[^>]*>([^<]+)</i);

    const siteDescription =
      meta(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i) ??
      meta(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i);

    const rawLogo =
      meta(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i) ??
      meta(/<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)/i) ??
      meta(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)/i);

    // Resolved against the page, since these are routinely relative.
    let siteLogo: string | undefined;
    if (rawLogo) {
      try {
        const abs = new URL(rawLogo, res.url || url);
        if (abs.protocol === "https:" || abs.protocol === "http:") {
          siteLogo = abs.toString();
        }
      } catch {
        // A malformed href is simply no logo.
      }
    }

    const clean = (v?: string) =>
      v ? v.replace(/\s+/g, " ").slice(0, 200) : undefined;

    return {
      siteName: clean(siteName),
      siteDescription: clean(siteDescription),
      siteLogo,
    };
  } catch {
    // Unreachable, slow, or hostile to bots. The audit still runs.
    return {};
  }
}


/**
 * Which Lighthouse category an audit belongs to.
 *
 * The audits object is flat, so the only way to group a finding is to look it
 * up in each category's auditRefs. Falls back to "performance" because that
 * is where the majority live and an ungrouped finding is worse than a
 * slightly misfiled one.
 */
function categoryOf(
  auditId: string,
  categories?: Record<string, { auditRefs?: { id: string }[] }>,
): string {
  if (!categories) return "performance";
  for (const [name, cat] of Object.entries(categories)) {
    if (cat.auditRefs?.some((r) => r.id === auditId)) return name;
  }
  return "performance";
}

export async function POST(request: Request) {
  if (!isConvexConfigured) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  let body: { url?: string; email?: string; companyWebsite?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  // Honeypot. Reports success so the bot learns nothing.
  if (body.companyWebsite) return NextResponse.json({ ok: true });

  const email = body.email?.trim().toLowerCase() ?? "";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json(
      { error: "A valid email address is needed to send the results." },
      { status: 400 },
    );
  }

  const url = normaliseUrl(body.url ?? "");
  if (!url) {
    return NextResponse.json(
      { error: "That doesn't look like a public website address." },
      { status: 400 },
    );
  }

  const queued = await fetchMutation(api.audits.request, {
    url: url.toString(),
    email,
  }).catch(() => null);

  if (!queued) {
    return NextResponse.json({ error: "Could not start that." }, { status: 502 });
  }
  if (!queued.ok) {
    return NextResponse.json(
      { error: "That's three audits today already. Try again tomorrow." },
      { status: 429 },
    );
  }

  /*
   * after(), not a floating promise.
   *
   * `void runAudit(...)` looked like it backgrounded the work, but on a
   * serverless platform the instance is frozen the moment the response is
   * returned — so the PageSpeed call was killed mid-flight and the row sat at
   * "queued" forever. That is the audit that never appears.
   *
   * after() keeps the invocation alive until the callback settles, bounded by
   * maxDuration below. The client is subscribed to the row either way, so it
   * fills in the moment the mutation lands.
   */
  after(async () => {
    await runAudit(queued.id, url.toString(), email);
  });

  return NextResponse.json({ ok: true, id: queued.id });
}

async function runAudit(id: string, url: string, email: string) {
  const secret = process.env.EMAIL_LOG_SECRET;
  const key = process.env.PAGESPEED_API_KEY;
  if (!secret) return;

  const finish = async (fields: Record<string, unknown>) => {
    await fetchMutation(api.audits.complete, {
      secret,
      id: id as never,
      ...fields,
    }).catch(() => {});

    /*
     * A failed audit still asked someone for their email, so it must not end
     * in silence — that is a lead who tried to hire me and got nothing.
     *
     * Notifying myself means I can run it by hand and reply with real numbers,
     * which is a better first contact than the automated report would have
     * been. Sent for failures only; the success path sends the results.
     */
    if (!fields.error) return;

    const admin = adminEmail();
    if (!admin) return;

    try {
      await sendEmail({
        to: admin,
        subject: `Audit failed — ${url}`,
        react: AuditFailed({ url, email, reason: String(fields.error) }),
      });
    } catch {
      // Nothing further to do: the row already records the failure.
    }
  };


  try {
    const endpoint = new URL(
      "https://www.googleapis.com/pagespeedonline/v5/runPagespeed",
    );
    endpoint.searchParams.set("url", url);
    /*
     * The key is optional. PageSpeed serves keyless requests at a much lower
     * quota, which is fine at this volume — and a missing key failing every
     * audit outright is worse than an occasional rate limit. Set
     * PAGESPEED_API_KEY to raise the ceiling.
     */
    if (key) {
      endpoint.searchParams.set("key", key);
    } else {
      // Said out loud, because the failure it causes is a rate limit some
      // time later on someone else's audit — by which point nothing points
      // back to a missing environment variable.
      console.warn(
        "[audit] PAGESPEED_API_KEY is not set; using the anonymous quota.",
      );
    }
    // Mobile only. Running both strategies doubles the quota cost, and mobile
    // is the stricter and more representative of the two.
    endpoint.searchParams.set("strategy", "mobile");
    for (const c of ["performance", "accessibility", "best-practices", "seo"]) {
      endpoint.searchParams.append("category", c);
    }

    /*
     * 105s, inside the 120s function limit. A cold third-party site takes far
     * longer than this one does — 19s warm — and the previous 90s cap was
     * close enough to that range to abort real audits partway.
     *
     * It must stay below maxDuration: if the platform kills the function
     * first, `finish` never runs and the row sits unfinished forever, which
     * is the stuck state this timeout exists to avoid.
     */
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(105_000) });
    if (!res.ok) {
      await finish({
        error:
          res.status === 400
            ? "That site could not be reached — check the address is public and loads."
            : res.status === 429
              ? "The audit service is rate limited right now. Try again in a few minutes."
              : "The audit service is busy. Try again shortly.",
      });
      return;
    }

    const data = (await res.json()) as {
      lighthouseResult?: {
        // score is nullable in the API: a category Lighthouse could not
        // compute comes back as null, not absent.
        categories?: Record<
          string,
          { score?: number | null; auditRefs?: { id: string }[] }
        >;
        audits?: Record<
          string,
          {
            score?: number | null;
            scoreDisplayMode?: string;
            description?: string;
            title?: string;
            details?: { overallSavingsMs?: number };
          }
        >;
      };
    };

    const cats = data.lighthouseResult?.categories ?? {};
    /*
     * Null is not zero.
     *
     * Lighthouse returns `score: null` for a category it could not compute —
     * best-practices does this regularly. The old guard only checked for
     * undefined, so null fell through to Math.round(null * 100) and the
     * report showed a confident 0, which then dragged the overall average
     * down with it. A site that renders at all does not score zero here.
     *
     * Undefined means "no score", and the average below already skips it.
     */
    const pct = (n?: number | null) =>
      typeof n === "number" && Number.isFinite(n)
        ? Math.round(n * 100)
        : undefined;

    const categories = {
      performance: pct(cats.performance?.score),
      accessibility: pct(cats.accessibility?.score),
      bestPractices: pct(cats["best-practices"]?.score),
      seo: pct(cats.seo?.score),
    };

    const values = Object.values(categories).filter(
      (v): v is number => v !== undefined,
    );
    const score =
      values.length === 0
        ? undefined
        : Math.round(values.reduce((a, b) => a + b, 0) / values.length);

    // Three fixes, ranked by the time they would actually save. Raw
    // Lighthouse titles are jargon, so only audits with plain-English copy are
    // surfaced — a fix nobody understands is not a fix.
    const audits = data.lighthouseResult?.audits ?? {};
    const fixes = Object.entries(audits)
      .filter(([id, a]) => FIX_COPY[id] && (a.score ?? 1) < 0.9)
      .sort(
        ([, a], [, b]) =>
          (b.details?.overallSavingsMs ?? 0) - (a.details?.overallSavingsMs ?? 0),
      )
      .slice(0, 3)
      .map(([id, a]) => {
        const saving = a.details?.overallSavingsMs ?? 0;
        return {
          title: FIX_COPY[id].title,
          detail: FIX_COPY[id].detail,
          impact:
            saving > 100
              ? `About ${(saving / 1000).toFixed(1)} seconds faster.`
              : "A noticeable improvement on a phone connection.",
        };
      });

    /*
     * Every failing audit, not only the three with hand-written copy.
     *
     * The three fixes above are what someone acts on — ranked by time saved
     * and written in plain English. This is the honest total underneath, so
     * a site with thirty problems does not read as a site with three.
     *
     * Manual and informative audits are excluded: "does this site have a
     * privacy policy" is not something Lighthouse can score, and listing it
     * as a problem would be wrong.
     */
    const issues = Object.entries(audits)
      .filter(([, a]) => {
        if (a.scoreDisplayMode === "manual" ||
            a.scoreDisplayMode === "informative" ||
            a.scoreDisplayMode === "notApplicable") return false;
        return typeof a.score === "number" && a.score < 0.9;
      })
      .map(([id, a]) => ({
        title: a.title ?? id,
        detail: FIX_COPY[id]?.detail ?? a.description ?? undefined,
        category: categoryOf(id, data.lighthouseResult?.categories),
        score: typeof a.score === "number" ? a.score : undefined,
        savingsMs: a.details?.overallSavingsMs ?? undefined,
      }))
      // Worst first, then by the time they would save.
      .sort(
        (a, b) =>
          (a.score ?? 1) - (b.score ?? 1) ||
          (b.savingsMs ?? 0) - (a.savingsMs ?? 0),
      )
      .slice(0, 60);

    const identity = await readSiteIdentity(url);

    await finish({ score, categories, fixes, issues, ...identity });

    /*
     * The form says "where to send the results", so this is what makes that
     * true — it was collecting an address and sending nothing.
     *
     * After finish(), not before: the report page has to exist before the
     * email links to it. A send failure is swallowed deliberately, because the
     * results are already saved and visible on screen — failing the whole
     * audit over an email would lose work that succeeded.
     */
    const subject =
      typeof score === "number"
        ? `${new URL(url).hostname.replace(/^www\./, "")} scored ${score}/100`
        : "Your site audit is ready";

    try {
      const result = await sendEmail({
        to: email,
        subject,
        react: AuditResults({
          url,
          score,
          categories,
          fixes,
          reportUrl: `${SITE.url}/audit?id=${id}`,
        }),
      });
      await logEmailSend({ to: email, template: "AuditResults", subject, result });
    } catch {
      // Swallowed on purpose: the results are already saved and on screen.
      // Failing the audit over a bounced email would lose work that worked.
    }
  } catch (err) {
    await finish({
      error:
        err instanceof Error && err.name === "TimeoutError"
          ? "That site took too long to respond to be audited."
          : "The audit could not be completed.",
    });
  }
}
