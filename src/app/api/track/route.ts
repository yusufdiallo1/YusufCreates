import { NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api, isConvexConfigured } from "@/lib/convex-api";

/**
 * Analytics ingest.
 *
 * Public by necessity — anonymous pageviews cannot be authenticated. That
 * makes it a write endpoint anyone can hit, so everything is bounded here:
 * the event type must be one of a fixed set, strings are truncated, and the
 * meta object is whitelisted rather than passed through.
 *
 * Always returns 204, whatever happens. A tracking failure must be invisible.
 */

const TYPES = [
  "pageview",
  "cta_click",
  "form_start",
  "form_submit",
  "chat_open",
  "chat_message",
] as const;

type EventType = (typeof TYPES)[number];

const isEventType = (v: unknown): v is EventType =>
  typeof v === "string" && (TYPES as readonly string[]).includes(v);

const clip = (v: unknown, max: number): string | undefined => {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t.slice(0, max) : undefined;
};

export async function POST(request: Request) {
  if (!isConvexConfigured) return new NextResponse(null, { status: 204 });

  try {
    const body = (await request.json()) as {
      type?: string;
      sessionId?: string;
      path?: string;
      meta?: Record<string, unknown>;
    };

    if (!isEventType(body.type)) {
      return new NextResponse(null, { status: 204 });
    }

    await fetchMutation(api.events.track, {
      type: body.type,
      path: clip(body.path, 256),
      sessionId: clip(body.sessionId, 64),
      // Whitelisted, not spread: an open meta field on a public endpoint is a
      // free-form write primitive pointed at the database.
      meta: {
        cta: clip(body.meta?.cta, 64),
        referrer: clip(body.meta?.referrer, 256),
        step: clip(body.meta?.step, 32),
      },
    });
  } catch {
    // Swallowed deliberately.
  }

  return new NextResponse(null, { status: 204 });
}
