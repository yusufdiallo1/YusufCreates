import { NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api, isConvexConfigured } from "@/lib/convex-api";

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

  // Run in the background: the client subscribes to the row and fills in when
  // this finishes. Awaiting a 40-second PageSpeed call here would time out.
  void runAudit(queued.id, url.toString());

  return NextResponse.json({ ok: true, id: queued.id });
}

async function runAudit(id: string, url: string) {
  const secret = process.env.EMAIL_LOG_SECRET;
  const key = process.env.PAGESPEED_API_KEY;
  if (!secret) return;

  const finish = (fields: Record<string, unknown>) =>
    fetchMutation(api.audits.complete, {
      secret,
      id: id as never,
      ...fields,
    }).catch(() => {});

  if (!key) {
    await finish({ error: "The audit service is not configured yet." });
    return;
  }

  try {
    const endpoint = new URL(
      "https://www.googleapis.com/pagespeedonline/v5/runPagespeed",
    );
    endpoint.searchParams.set("url", url);
    endpoint.searchParams.set("key", key);
    // Mobile only. Running both strategies doubles the quota cost, and mobile
    // is the stricter and more representative of the two.
    endpoint.searchParams.set("strategy", "mobile");
    for (const c of ["performance", "accessibility", "best-practices", "seo"]) {
      endpoint.searchParams.append("category", c);
    }

    const res = await fetch(endpoint, { signal: AbortSignal.timeout(90_000) });
    if (!res.ok) {
      await finish({
        error:
          res.status === 400
            ? "That site could not be reached — check the address is public and loads."
            : "The audit service is busy. Try again shortly.",
      });
      return;
    }

    const data = (await res.json()) as {
      lighthouseResult?: {
        categories?: Record<string, { score?: number }>;
        audits?: Record<
          string,
          {
            score?: number | null;
            title?: string;
            details?: { overallSavingsMs?: number };
          }
        >;
      };
    };

    const cats = data.lighthouseResult?.categories ?? {};
    const pct = (n?: number) =>
      n === undefined ? undefined : Math.round(n * 100);

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

    await finish({ score, categories, fixes });
  } catch (err) {
    await finish({
      error:
        err instanceof Error && err.name === "TimeoutError"
          ? "That site took too long to respond to be audited."
          : "The audit could not be completed.",
    });
  }
}
