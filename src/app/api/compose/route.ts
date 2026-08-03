import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api } from "@/lib/convex-api";

/**
 * Drafts a broadcast from a plain-English brief.
 *
 * Returns structured fields rather than prose, so the composer can populate
 * subject, body and the button independently.
 *
 * Every draft now carries a button, mapped from what the brief is about — a
 * broadcast with nothing to click is a broadcast that asked for attention and
 * then wasted it. The model picks from a fixed list of real pages rather than
 * writing a URL, because an invented link is worse than no link at all.
 *
 * It is also grounded in the actual price list. Without that a brief saying
 * "we have a new pricing tier" produced invented figures and invented
 * positioning, stated in the first person as though I had written them.
 *
 * Admin-gated: this spends tokens, and an open endpoint is someone else's
 * free text generator.
 */

import {
  BASE_USD,
  CARE_ANNUAL_USD,
  GROWTH,
  PAGE_EXTRAS,
  growthPriceUsd,
} from "@/lib/pricing";
import { SITE } from "@/lib/constants";

const SITE_URL = SITE.url;

export const runtime = "nodejs";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

/**
 * What the model is allowed to state as fact.
 *
 * Derived from pricing.ts rather than written out, so a price change here is
 * impossible to forget — the previous prompt carried no pricing at all, which
 * is why a brief saying "new pricing tier" produced invented figures and
 * invented positioning.
 */
const PRICING_FACTS = [
  `- Launch, a one-page site: $${BASE_USD.launch}`,
  `- Growth, a multi-page site: $${GROWTH.basePrice} up to three pages, then $${PAGE_EXTRAS.nearRate} a page and $${PAGE_EXTRAS.farRate} from the ${PAGE_EXTRAS.farFrom}th (nine pages: $${growthPriceUsd(GROWTH.maxPages)})`,
  `- Web app or SaaS: from $${BASE_USD.app.toLocaleString("en-US")}`,
  `- iOS and macOS app: from $${BASE_USD.native.toLocaleString("en-US")}`,
  `- Enterprise: from $${BASE_USD.enterprise.toLocaleString("en-US")}, scoped on a call`,
  `- Care Plan: $${BASE_USD.care} a month, or $${CARE_ANNUAL_USD.toLocaleString("en-US")} a year`,
].join("\n");

const SYSTEM = `You draft short email newsletters for Yusuf Diallo, an independent designer and developer who builds websites and web apps.

Return ONLY a JSON object, no prose around it, with exactly these keys:

{
  "subject": string,
  "body": string,
  "includeButton": boolean,
  "buttonLabel": string,
  "buttonUrl": string
}

Rules:
- subject: under 60 characters, plain and specific. No emoji, no "Newsletter #4", no clickbait.
- body: 2 to 4 short paragraphs separated by blank lines. Plain text, no markdown, no headings, no bullet lists.
- Write in a direct, understated register. No exclamation marks. No "excited to announce", no "game-changing", no "dive in".
- Write as Yusuf, in first person.
- buttonLabel: 2 to 4 words, an action. "Read the post", not "Click here".

STAY ON THE BRIEF. Write about exactly what the brief says and nothing else.
Do not pad with claims about who the work is for, what it costs, or what it
includes unless the brief says so. If the brief is one line, the email is
short. Inventing detail to fill space is the single worst thing you can do
here — it puts words in Yusuf's mouth that he did not write and may not be
true.

FACTS you may rely on. Everything else must come from the brief:
${PRICING_FACTS}

ALWAYS include a button. Every broadcast should give the reader one thing to
do. Set includeButton true and pick the page that matches the brief:
- pricing, plans, tiers, cost, a new tier → ${SITE_URL}/pricing
- a blog post or writing → ${SITE_URL}/blog
- starting a project, availability, slots → ${SITE_URL}/start
- work, portfolio, a case study → ${SITE_URL}/work
- anything else → ${SITE_URL}
If the brief supplies its own URL, use that instead. Never invent a URL that
is not either from the brief or in this list.`;

export async function POST(request: Request) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not set." },
      { status: 503 },
    );
  }

  const token = await convexAuthNextjsToken();
  const allowed = await fetchQuery(api.admin.amIAdmin, {}, { token }).catch(
    () => false,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  let body: { brief?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const brief = body.brief?.trim().slice(0, 2000);
  if (!brief) {
    return NextResponse.json(
      { error: "Describe what you want to send." },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        // Low, because the register matters more than variety here — this
        // should sound like the rest of the site every time.
        temperature: 0.4,
        max_tokens: 900,
        // Guarantees parseable output instead of hoping the prompt holds.
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: brief },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[compose] groq error", res.status, detail.slice(0, 200));
      return NextResponse.json(
        {
          error:
            res.status === 401
              ? "The Groq key was rejected. Check GROQ_API_KEY."
              : "The drafting service is unavailable right now.",
        },
        { status: 502 },
      );
    }

    const json = await res.json();
    const raw = json.choices?.[0]?.message?.content ?? "{}";

    let draft: Record<string, unknown>;
    try {
      draft = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "The draft came back malformed. Try rephrasing the brief." },
        { status: 502 },
      );
    }

    const str = (v: unknown, max: number) =>
      typeof v === "string" ? v.trim().slice(0, max) : "";

    const buttonUrl = str(draft.buttonUrl, 500);
    const buttonLabel = str(draft.buttonLabel, 60);

    return NextResponse.json({
      subject: str(draft.subject, 120),
      body: str(draft.body, 6000),
      // Belt and braces: a button with no URL, or a URL the model invented
      // without http, is worse than no button — so it is dropped rather than
      // shipped broken.
      includeButton:
        draft.includeButton === true &&
        buttonUrl.startsWith("http") &&
        buttonLabel !== "",
      buttonLabel,
      buttonUrl,
    });
  } catch (err) {
    console.error("[compose] failed:", err);
    return NextResponse.json(
      { error: "Could not draft that. Try again." },
      { status: 502 },
    );
  }
}
