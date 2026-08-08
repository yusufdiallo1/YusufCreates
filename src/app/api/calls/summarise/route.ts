import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { groqComplete } from "@/lib/groq";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Turns a call transcript into notes.
 *
 * The transcript is fetched from Convex using the CALLER'S session rather than
 * accepted from the request body. Two reasons, and the second is the important
 * one: a body-supplied transcript could be fabricated, and — since this route
 * spends tokens — an unauthenticated caller could otherwise run up a bill by
 * posting arbitrary text at it.
 *
 * Output is deliberately structured and short. A verbatim recap is the
 * transcript, which already exists; what nobody has time to reconstruct
 * afterwards is who agreed to do what.
 */

export async function POST(request: Request) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "Note taking is not configured." },
      { status: 503 },
    );
  }
  if (!isConvexConfigured) {
    return NextResponse.json(
      { error: "Backend is not configured." },
      { status: 503 },
    );
  }

  let body: { callId?: string };
  try {
    body = (await request.json()) as { callId?: string };
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }
  if (!body.callId) {
    return NextResponse.json({ error: "Missing callId." }, { status: 400 });
  }

  const authToken = await convexAuthNextjsToken();
  let lines: { speaker: string; text: string; at: number }[];
  try {
    lines = await fetchQuery(
      api.calls.transcript,
      { callId: body.callId as Id<"calls"> },
      { token: authToken },
    );
  } catch {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  if (!lines || lines.length === 0) {
    return NextResponse.json(
      { error: "There is nothing to summarise yet." },
      { status: 422 },
    );
  }

  // Speaker-attributed, because "who committed to this" is most of the value
  // and a flat wall of text loses it.
  const transcript = lines
    .map((l) => `${l.speaker}: ${l.text}`)
    .join("\n")
    .slice(0, 60_000);

  const result = await groqComplete({
    maxTokens: 1200,
    system: [
      "You write notes from a call between a web developer and their client.",
      "Return markdown with exactly these sections, in this order:",
      "## Summary — three sentences at most.",
      "## Decisions — what was actually agreed. Omit the section if nothing was.",
      "## Actions — a bullet per task as `**Owner** — task`. Omit if none.",
      "## Open questions — anything left unresolved. Omit if none.",
      "",
      "Rules:",
      "- Use only what is in the transcript. Never invent a decision, a date or a number.",
      "- The transcript comes from live speech recognition and will contain errors. Where a line is garbled, ignore it rather than guessing at it.",
      "- No preamble, no sign-off, no restating these instructions.",
    ].join("\n"),
    user: transcript,
  });

  if (!result.ok) {
    console.error("Call summary failed:", result.error);
    return NextResponse.json(
      { error: "Could not write the notes." },
      { status: 502 },
    );
  }

  return NextResponse.json({ summary: result.text });
}
