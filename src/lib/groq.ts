/**
 * One-shot Groq completions.
 *
 * The site's assistant streams (see api/chat), which is right when someone is
 * watching words arrive. The digest and the call notes are the opposite: a
 * cron job and a button, both of which want one finished string and nothing
 * else. Streaming those would mean parsing SSE to reassemble text nobody sees
 * until it is complete.
 *
 * GROQ, NOT ANTHROPIC. The project runs on Groq — it is the key that exists,
 * and the assistant already uses it. Adding a second provider would mean a
 * second key to keep alive and a second bill, to do a job the first one
 * already does.
 *
 * OpenAI-compatible endpoint, so the request shape is the standard one and the
 * system prompt is simply the first message.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * The same model the assistant uses.
 *
 * Deliberately not a bigger one for "summarising". These are short, factual
 * tasks over text that is already in front of the model — the constraint is
 * following instructions about what to leave out, which this handles, not
 * reasoning depth.
 */
export const GROQ_MODEL = "llama-3.3-70b-versatile";

export interface GroqResult {
  ok: boolean;
  text: string;
  /** Set when ok is false. Safe to log; never contains the prompt. */
  error?: string;
}

/**
 * Sends one prompt and returns the finished text.
 *
 * Never throws. Every caller here is a cron job or a background action where
 * an exception would be noise — the digest is a nice-to-have paragraph and the
 * notes are a convenience. Failures come back as `ok: false` so the caller can
 * decide, rather than as an unhandled rejection that turns a scheduled job red.
 */
export async function groqComplete({
  system,
  user,
  maxTokens = 800,
  temperature = 0.3,
}: {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<GroqResult> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return { ok: false, text: "", error: "GROQ_API_KEY is not set." };

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: maxTokens,
        temperature,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      // A hung upstream must not hold a cron invocation open indefinitely.
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      // The body can echo the prompt back; the status is the useful part.
      return { ok: false, text: "", error: `groq ${res.status}` };
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim() ?? "";

    if (!text) return { ok: false, text: "", error: "empty completion" };
    return { ok: true, text };
  } catch (e) {
    // AbortSignal.timeout throws a TimeoutError; anything else is a network
    // fault. Neither is worth distinguishing to a caller that only decides
    // whether to store a paragraph.
    return {
      ok: false,
      text: "",
      error: e instanceof Error ? e.name : "request failed",
    };
  }
}
