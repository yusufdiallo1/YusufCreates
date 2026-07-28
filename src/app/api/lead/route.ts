import { NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { scoreLead, suspicionFromSignals } from "@/lib/leadScoring";
import { adminEmail, sendEmail, siteUrl } from "@/lib/email";
import { LeadConfirmation } from "@emails/LeadConfirmation";
import { LeadNotification } from "@emails/LeadNotification";

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
  const { score, band } = scoreLead({
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

  let leadId: LeadId | undefined;
  try {
    leadId = await fetchMutation(api.leads.submit, {
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

  /*
   * Emails go out after the lead is safely stored, and no failure here changes
   * the response. The enquiry is the thing that matters; a missing confirmation
   * is an annoyance, a lost enquiry is lost work. Both sends are logged so a
   * silent failure is still discoverable.
   */
  const name = payload.name?.trim() || "there";
  const summary = buildSummary(payload);

  await Promise.allSettled([
    logged({
      to: email,
      template: "LeadConfirmation",
      subject: "Thanks — I've got your enquiry",
      leadId,
      react: LeadConfirmation({
        name,
        planLabel: projectType,
        summary,
      }),
    }),
    (async () => {
      const admin = adminEmail();
      if (!admin) return;
      await logged({
        to: admin,
        template: "LeadNotification",
        subject: `${band ?? "new"} ${score} · ${projectType ?? "Enquiry"} · ${name}`,
        leadId,
        // Replying to the notification reaches the client directly, which is
        // the fastest possible path from "I got a lead" to "I answered it".
        replyTo: email,
        react: LeadNotification({
          name,
          email,
          phone: trim(payload.phone),
          contactPreference: trim(payload.contactPreference),
          planLabel: projectType,
          score,
          band,
          fields: summary,
          message: payload.message?.trim() || undefined,
          adminUrl: `${siteUrl()}/admin`,
        }),
      });
    })(),
  ]);

  return NextResponse.json({ ok: true, score });
}

/** Id of a stored lead, as returned by the submit mutation. */
type LeadId = (typeof api.leads.submit)["_returnType"];

/** Sends and records the outcome. Never throws. */
async function logged({
  to,
  template,
  subject,
  react,
  replyTo,
  leadId,
}: {
  to: string;
  template: string;
  subject: string;
  react: React.ReactElement;
  replyTo?: string;
  leadId?: LeadId;
}) {
  const result = await sendEmail({ to, subject, react, replyTo });
  try {
    await fetchMutation(api.subscribers.logEmail, {
      to,
      template,
      subject,
      status: result.status,
      providerId: result.status === "sent" ? result.id : undefined,
      error: result.status === "failed" ? result.error : undefined,
      leadId,
    });
  } catch {
    // A logging failure must not surface either.
  }
}

/** The submitted fields worth showing, in a stable order, skipping blanks. */
function buildSummary(p: Payload): { label: string; value: string }[] {
  const rows: [string, string | number | boolean | undefined][] = [
    ["Company", p.company],
    ["Role", p.role],
    ["Purpose", p.projectPurpose],
    ["Audience", p.audience],
    ["Current state", p.currentState],
    ["Existing site", p.existingUrl],
    ["Pages", p.pageCount],
    ["Budget", p.budget],
    ["Timeline", p.timeline],
    ["Support scope", p.supportScope],
    ["Procurement", p.procurementProcess],
    ["NDA required", p.ndaRequired === "yes" ? "Yes" : undefined],
    ["Target launch", p.targetLaunch],
    ["Sign-off", p.decisionMakers],
  ];

  return rows
    .filter(([, v]) => v !== undefined && String(v).trim() !== "")
    .map(([label, v]) => ({ label, value: String(v).trim() }));
}
