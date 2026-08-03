import { NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api, isConvexConfigured } from "@/lib/convex-api";

/**
 * Analytics ingest.
 *
 * Public by necessity — anonymous pageviews cannot be authenticated. That
 * makes it a write endpoint anyone can hit, so everything is bounded here:
 * the event type must be one of a fixed set, strings are truncated, and every
 * field is whitelisted rather than passed through.
 *
 * The country comes from the CDN header rather than the client. It is the one
 * thing here the browser cannot be trusted to report and the one thing it
 * never needs to: Vercel resolves it at the edge, and a two-letter country is
 * not identifying.
 *
 * Always returns 204, whatever happens. A tracking failure must be invisible.
 */

const TYPES = [
  "pageview",
  "scroll_depth",
  "cta_click",
  "outbound_click",
  "form_start",
  "form_step",
  "form_error",
  "form_submit",
  "pricing_currency",
  "pricing_slider",
  "pricing_tier_click",
  "promo_applied",
  "faq_open",
  "chat_open",
  "chat_message",
  "web_vital",
] as const;

type EventType = (typeof TYPES)[number];

const isEventType = (v: unknown): v is EventType =>
  typeof v === "string" && (TYPES as readonly string[]).includes(v);

const clip = (v: unknown, max: number): string | undefined => {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t.slice(0, max) : undefined;
};

const num = (v: unknown, max: number): number | undefined =>
  typeof v === "number" && Number.isFinite(v)
    ? Math.min(Math.max(Math.round(v), 0), max)
    : undefined;

export async function POST(request: Request) {
  if (!isConvexConfigured) return new NextResponse(null, { status: 204 });

  try {
    const body = (await request.json()) as Record<string, unknown>;

    if (!isEventType(body.type)) {
      return new NextResponse(null, { status: 204 });
    }

    const meta = (body.meta ?? {}) as Record<string, unknown>;

    await fetchMutation(api.events.track, {
      type: body.type,
      path: clip(body.path, 256),
      sessionId: clip(body.sessionId, 64),
      visitorId: clip(body.visitorId, 64),
      referrer: clip(body.referrer, 128),
      utmSource: clip(body.utmSource, 64),
      utmMedium: clip(body.utmMedium, 64),
      utmCampaign: clip(body.utmCampaign, 64),
      device: clip(body.device, 16),
      browser: clip(body.browser, 24),
      os: clip(body.os, 24),
      viewportW: num(body.viewportW, 10_000),
      /* Edge-resolved, never client-supplied. */
      country: clip(request.headers.get("x-vercel-ip-country"), 2),
      // Whitelisted, not spread: an open meta field on a public endpoint is a
      // free-form write primitive pointed at the database.
      meta: {
        cta: clip(meta.cta, 64),
        step: clip(meta.step, 48),
        label: clip(meta.label, 120),
        value: num(meta.value, 1_000_000),
      },
    });
  } catch {
    // Swallowed deliberately.
  }

  return new NextResponse(null, { status: 204 });
}
