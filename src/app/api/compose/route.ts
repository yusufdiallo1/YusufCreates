import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api } from "@/lib/convex-api";

/**
 * Drafts a broadcast from a plain-English brief.
 *
 * Returns structured fields rather than prose, so the composer can populate
 * subject, body and the button independently — and so the button can be
 * dropped entirely when the message does not need one. A newsletter that
 * always ends in a call to action reads as marketing; most of these should
 * just be an update.
 *
 * Admin-gated: this spends tokens, and an open endpoint is someone else's
 * free text generator.
 */

export const runtime = "nodejs";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

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
- includeButton: true ONLY when there is a specific thing to click. An update with nothing to act on must have includeButton false and empty strings for the label and url.
- buttonLabel: 2 to 4 words, an action. "Read the post", not "Click here".
- buttonUrl: only use a URL the brief actually supplies. If the brief names no URL, use an empty string and set includeButton false. NEVER invent a URL.`;

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
