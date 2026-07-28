import { NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api, isConvexConfigured } from "@/lib/convex-api";

/**
 * Inline lead capture for the CTA band.
 *
 * Turnstile is verified here, server-side. A token echoed back by the browser
 * proves nothing on its own — it has to be exchanged with Cloudflare, and that
 * exchange needs the secret key, which must never reach the client.
 *
 * If TURNSTILE_SECRET_KEY is unset the check is skipped, so local development
 * works without it. Production should always set it.
 */

async function verifyTurnstile(token: string | undefined, ip: string | null) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // Not configured — skip rather than block.
  if (!token) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);

  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body },
  );
  const data = (await res.json()) as { success?: boolean };
  return data.success === true;
}

export async function POST(request: Request) {
  if (!isConvexConfigured) {
    return NextResponse.json(
      { error: "Backend not configured." },
      { status: 503 },
    );
  }

  let payload: { email?: string; source?: string; turnstileToken?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const email = payload.email?.trim() ?? "";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json(
      { error: "A valid email address is required." },
      { status: 400 },
    );
  }

  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;

  if (!(await verifyTurnstile(payload.turnstileToken, ip))) {
    return NextResponse.json(
      { error: "Verification failed." },
      { status: 400 },
    );
  }

  try {
    await fetchMutation(api.leads.submit, {
      // The visitor supplies only an email here; everything else is decided
      // server-side, including the cold score.
      name: "",
      email,
      source: payload.source === "cta-band" ? "cta-band" : "website",
      turnstileToken: payload.turnstileToken,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not save that." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
