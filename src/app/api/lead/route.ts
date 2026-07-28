import { NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { scoreLead, suspicionFromSignals } from "@/lib/leadScoring";

/**
 * Lead submission.
 *
 * Four spam layers, in order of cost:
 *   1. Honeypot — a hidden field no human fills in.
 *   2. Time trap — under two seconds on the form is automation.
 *   3. Turnstile — verified here, server-side. A token echoed back by the
 *      browser proves nothing; it has to be exchanged with Cloudflare, and
 *      that exchange needs the secret key, which never reaches the client.
 *   4. Slide signals — recorded and used to flag for review, never to block.
 *      Keyboard and reduced-motion users legitimately produce zero pointer
 *      samples, so rejecting on that alone would lock out real people.
 *
 * Scoring runs here rather than in the browser so a caller cannot inflate
 * their own priority.
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

interface Payload {
  name?: string;
  email?: string;
  phone?: string;
  contactPreference?: string;
  company?: string;
  role?: string;
  projectType?: string;
  projectTypeOther?: string;
  /** Plan id from src/lib/inquiry.ts — decides which fields are meaningful. */
  plan?: string;
  projectPurpose?: string;
  audience?: string;
  currentState?: string;
  existingUrl?: string;
  pageCount?: string | number;
  procurementProcess?: string;
  /** Sent as "yes"/"no" by the checkbox; stored as a boolean. */
  ndaRequired?: string;
  targetLaunch?: string;
  decisionMakers?: string;
  supportScope?: string;
  tier?: string;
  budget?: string;
  timeline?: string;
  message?: string;
  source?: string;
  turnstileToken?: string;
  elapsedMs?: number;
  /** Honeypot. Any value means a bot filled every field it could see. */
  companyWebsite?: string;
  slideSignals?: {
    durationMs: number;
    pointerSamples: number;
    peakVelocity: number;
    usedKeyboard: boolean;
  };
}

export async function POST(request: Request) {
  if (!isConvexConfigured) {
    return NextResponse.json(
      { error: "Backend not configured." },
      { status: 503 },
    );
  }

  let payload: Payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  // Layer 1 and 2. Both return success so the bot learns nothing.
  if (payload.companyWebsite) return NextResponse.json({ ok: true });
  if (payload.elapsedMs !== undefined && payload.elapsedMs < 2000) {
    return NextResponse.json({ ok: true });
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

  // Layer 3.
  if (!(await verifyTurnstile(payload.turnstileToken, ip))) {
    return NextResponse.json({ error: "Verification failed." }, { status: 400 });
  }

  // Layer 4 — recorded, not enforced.
  const suspicion = suspicionFromSignals(payload.slideSignals);
  const { score } = scoreLead({
    budget: payload.budget,
    timeline: payload.timeline,
    projectType: payload.projectType,
    tier: payload.tier,
    company: payload.company,
    message: payload.message,
    plan: payload.plan,
    projectPurpose: payload.projectPurpose,
  });

  const trim = (s: string | undefined) => s?.trim() || undefined;

  // The checkbox posts "yes"/"no". Absent means the field was never shown for
  // this plan, which is different from an explicit "no" — keep it undefined.
  const ndaRequired =
    payload.ndaRequired === undefined
      ? undefined
      : payload.ndaRequired === "yes";

  // Number input arrives as a string, and "" must not become 0.
  const rawPages =
    typeof payload.pageCount === "number"
      ? payload.pageCount
      : Number(payload.pageCount);
  const pageCount =
    Number.isFinite(rawPages) && rawPages > 0 ? Math.round(rawPages) : undefined;

  // "Something else" carries its description into the stored project type so
  // the notification email is readable without opening the record.
  const projectType =
    payload.projectType === "Something else" && payload.projectTypeOther
      ? `Something else: ${payload.projectTypeOther}`
      : payload.projectType;

  try {
    await fetchMutation(api.leads.submit, {
      name: payload.name?.trim() ?? "",
      email,
      phone: trim(payload.phone),
      contactPreference: trim(payload.contactPreference),
      company: trim(payload.company),
      role: trim(payload.role),
      projectType: projectType || undefined,
      projectPurpose: trim(payload.projectPurpose),
      audience: trim(payload.audience),
      currentState: trim(payload.currentState),
      existingUrl: trim(payload.existingUrl),
      pageCount,
      procurementProcess: trim(payload.procurementProcess),
      ndaRequired,
      targetLaunch: trim(payload.targetLaunch),
      decisionMakers: trim(payload.decisionMakers),
      supportScope: trim(payload.supportScope),
      tier: payload.tier || undefined,
      budget: payload.budget || undefined,
      timeline: payload.timeline || undefined,
      message:
        suspicion === "review"
          ? `${payload.message ?? ""}\n\n[flagged for review: no pointer activity]`
          : payload.message || undefined,
      source: payload.source ?? "website",
      turnstileToken: payload.turnstileToken,
      slideSignals: payload.slideSignals,
      score,
    });
  } catch {
    return NextResponse.json({ error: "Could not save that." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, score });
}
