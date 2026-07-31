import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api } from "@/lib/convex-api";

/**
 * Drafts a blog post from a plain-English brief.
 *
 * Sibling of /api/compose, which drafts broadcasts. Kept separate rather than
 * given a mode flag: the two want genuinely different output — a broadcast is
 * four short paragraphs of plain text ending in a button, a post is markdown
 * with headings and no call to action — and one prompt trying to be both
 * writes something that is neither.
 *
 * Admin-gated: this spends tokens, and an open endpoint is someone else's
 * free text generator.
 */

export const runtime = "nodejs";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

const SYSTEM = `You draft blog posts for Yusuf Diallo, an independent designer and developer who builds websites and web apps for small businesses and founders.

Return ONLY a JSON object, no prose around it, with exactly these keys:

{
  "title": string,
  "excerpt": string,
  "body": string,
  "tags": string[]
}

Rules:
- title: under 70 characters. Plain and specific. No colons splitting a clever phrase, no "The Ultimate Guide", no clickbait.
- excerpt: one or two sentences, under 200 characters. What the post is actually about — this is the line shown in the list and the share card.
- body: markdown. Use ## for section headings, blank lines between paragraphs, - for lists, **bold** sparingly. Between 300 and 800 words unless the brief asks otherwise.
- tags: two to four lowercase single words or short phrases.

Register:
- Write as Yusuf, in first person.
- Direct and understated. No exclamation marks, no "excited to announce", no "in today's fast-paced world", no "let's dive in".
- Short sentences. Concrete over abstract. A specific number beats an adjective.
- Say the useful thing first. Do not open with a paragraph explaining what the post will cover.
- NEVER use "Introduction", "Overview", "Conclusion" or "Summary" as a heading. Headings name the actual thing being discussed. The first paragraph needs no heading at all.
- Aim for 500 to 800 words. A four-line post under three headings is an outline, not a post — each section needs a real paragraph or two under it.

STAY ON THE BRIEF. Write about exactly what it says. If the brief is one
line, the post is short. Do not invent client names, project outcomes,
figures or dates — inventing detail puts words in Yusuf's mouth that he did
not write and may not be true, and this publishes under his name.`;

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
      { error: "Describe what the post is about." },
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
        // Slightly above the broadcast route's 0.4: a post is longer and
        // benefits from a little variety in sentence shape.
        temperature: 0.5,
        max_tokens: 2400,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: brief },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[compose/post] groq error", res.status, detail.slice(0, 200));
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

    return NextResponse.json({
      title: str(draft.title, 140),
      excerpt: str(draft.excerpt, 300),
      body: str(draft.body, 20_000),
      tags: Array.isArray(draft.tags)
        ? draft.tags
            .filter((t): t is string => typeof t === "string")
            .map((t) => t.trim().toLowerCase().slice(0, 40))
            .filter(Boolean)
            .slice(0, 5)
        : [],
    });
  } catch (err) {
    console.error("[compose/post] failed:", err);
    return NextResponse.json(
      { error: "Could not draft that. Try again." },
      { status: 502 },
    );
  }
}
