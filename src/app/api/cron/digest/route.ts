import { NextResponse } from "next/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { groqComplete } from "@/lib/groq";

/**
 * Writes the morning briefing.
 *
 * Runs once a day, reads the same figures the Overview shows, and asks the
 * model for a short paragraph about what actually needs attention. The result is
 * stored, so opening the admin never waits on a model call — see convex/digest.ts
 * for why that matters.
 *
 * GATED THE SAME WAY AS /api/cron/notify. Vercel signs scheduled invocations
 * with CRON_SECRET; EMAIL_LOG_SECRET is accepted too so it can be triggered by
 * hand while testing. Without a gate this is a publicly callable URL that
 * spends inference tokens on every request.
 *
 * FAILS QUIETLY BY DESIGN. A missing digest is a missing paragraph — the
 * Overview renders its real numbers regardless. Nothing here is allowed to be
 * the reason a scheduled job page turns red.
 */

export const runtime = "nodejs";

function authorised(request: Request): boolean {
  const auth = request.headers.get("authorization");

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;

  const shared = process.env.EMAIL_LOG_SECRET;
  if (shared && auth === `Bearer ${shared}`) return true;
  if (shared && request.headers.get("x-cron-secret") === shared) return true;

  return false;
}

export async function POST(request: Request) {
  if (!isConvexConfigured) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }
  if (!authorised(request)) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const secret = process.env.EMAIL_LOG_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "EMAIL_LOG_SECRET is not set." },
      { status: 503 },
    );
  }
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ skipped: "no GROQ_API_KEY" });
  }

  const facts = await fetchQuery(api.digest.facts, { secret });

  const money = (n: number) =>
    `${facts.currency} ${Math.round(n).toLocaleString("en-US")}`;

  /*
   * Handed to the model as labelled lines, not raw JSON.
   *
   * JSON invites the model to describe the shape of the object — "revenue
   * this month is 4200" becomes "the revenueThisMonth field shows 4200".
   * Plain labelled figures produce prose about the business instead.
   */
  const basis = [
    `Requests awaiting a decision: ${facts.requestsWaiting}` +
      (facts.requestsWaiting > 0
        ? ` (oldest has waited ${facts.oldestRequestHours}h)`
        : ""),
    `Express builds awaiting approval: ${facts.buildsAwaitingApproval}`,
    `New enquiries, last 7 days: ${facts.newLeads7}`,
    `New enquiries, last 30 days: ${facts.newLeads30}`,
    `Revenue this month: ${money(facts.revenueThisMonth)}`,
    `Revenue last month: ${money(facts.revenuePrevMonth)}`,
    `Overdue invoices: ${facts.overdueCount} worth ${money(facts.overdueValue)}`,
    `Issued and unpaid: ${money(facts.unpaidSentValue)}`,
    `Active projects: ${facts.activeProjects}`,
  ].join("\n");

  const result = await groqComplete({
    maxTokens: 400,
    system: [
      "You write a one-paragraph morning briefing for a solo web developer about his own business.",
      "",
      "Rules:",
      "- Three sentences at most. This is read in five seconds, standing up.",
      "- Lead with whatever is most time-sensitive: someone waiting on a reply beats a revenue figure.",
      "- Use ONLY the figures given. Never estimate, never extrapolate, never invent a trend from a single number.",
      "- If a month-on-month comparison is meaningful, make it. If last month is zero, say nothing about the direction — a jump from nothing is not growth.",
      "- If nothing needs attention, say so plainly and stop. Do not manufacture urgency.",
      "- Address him directly as 'you'. No greeting, no sign-off, no headings, no bullet points.",
    ].join("\n"),
    user: basis,
  });

  if (!result.ok) {
    // Logged, not returned: a failed briefing is a missing paragraph, and the
    // Overview renders its real numbers regardless.
    console.error("Digest failed:", result.error);
    return NextResponse.json({ error: "Could not write the digest." }, { status: 502 });
  }

  await fetchMutation(api.digest.save, { secret, summary: result.text, basis });

  return NextResponse.json({ ok: true, summary: result.text });
}
