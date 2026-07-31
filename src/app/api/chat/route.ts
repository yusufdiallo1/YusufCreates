import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { buildSystemPrompt } from "@/lib/systemPrompt";

/**
 * Site assistant.
 *
 * Node runtime, not edge: the Anthropic SDK and the Convex server client are
 * both happier there, and the rate limiter needs Node crypto for hashing.
 */
export const runtime = "nodejs";

/**
 * Groq, via its OpenAI-compatible endpoint.
 *
 * No SDK: the chat completions API is one POST and one SSE stream, and a
 * dependency here is one more thing to keep patched for no benefit.
 *
 * Model in a single constant so switching is a one-line change. Llama 3.3 70B
 * follows instructions well enough for the guardrails below, which matters
 * more than raw capability — this bot's job is to refuse confidently.
 */
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

/** A chat widget, not an essay generator. This is the main cost control. */
const MAX_TOKENS = 1024;

const MAX_MESSAGES = 20;
const MAX_CHARS = 2000;

interface Turn {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  let body: { sessionId?: string; messages?: Turn[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const sessionId = String(body.sessionId ?? "").slice(0, 64);
  const incoming = Array.isArray(body.messages) ? body.messages : [];

  // Bounded server-side. A client-side cap is a suggestion; this is the limit.
  const messages: Turn[] = incoming
    .filter(
      (m): m is Turn =>
        (m?.role === "user" || m?.role === "assistant") &&
        typeof m.content === "string",
    )
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));

  if (messages.length === 0) {
    return NextResponse.json({ error: "No message." }, { status: 400 });
  }

  const serverSecret = process.env.EMAIL_LOG_SECRET;

  // Rate limit before spending a token. Enforced in Convex because serverless
  // instances share no memory — an in-process counter resets on every cold
  // start and limits nothing.
  if (isConvexConfigured && serverSecret) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("cf-connecting-ip") ??
      "";
    // Hashed with a salt: storing raw addresses is a data-protection
    // liability for a marketing site, and the hash rate-limits just as well.
    const ipHash = ip
      ? createHash("sha256")
          .update(ip + (process.env.EMAIL_LOG_SECRET ?? ""))
          .digest("hex")
          .slice(0, 32)
      : "";

    try {
      const verdict = await fetchMutation(api.chat.checkAndConsume, {
        secret: serverSecret,
        sessionId,
        ipHash,
      });
      if (!verdict.ok) {
        return NextResponse.json(
          { error: "Too many messages. Give me a moment." },
          {
            status: 429,
            headers: {
              "Retry-After": String(Math.ceil(verdict.retryAfterMs / 1000)),
            },
          },
        );
      }
    } catch {
      // A limiter failure must not take the assistant down.
    }
  }

  // Knowledge base, stuffed whole. A few dozen Q&A pairs is far below the
  // point where retrieval beats simply including everything.
  let system = buildSystemPrompt([]);
  if (isConvexConfigured) {
    try {
      const entries = await fetchQuery(api.kb.list, {});
      system = buildSystemPrompt(
        entries.map((e: { question: string; answer: string; priority: number }) => ({
          question: e.question,
          answer: e.answer,
          priority: e.priority,
        })),
      );
    } catch {
      // Falls back to the persona-only prompt, which still refuses to invent.
    }
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      let full = "";

      try {
        const upstream = await fetch(GROQ_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: MODEL,
            max_tokens: MAX_TOKENS,
            temperature: 0.3,
            stream: true,
            // The system prompt is the first message in the OpenAI shape,
            // rather than a separate field.
            messages: [{ role: "system", content: system }, ...messages],
          }),
          // A hung upstream must not hold the connection open indefinitely.
          signal: AbortSignal.timeout(30_000),
        });

        if (!upstream.ok || !upstream.body) {
          throw new Error(`groq ${upstream.status}`);
        }

        // Server-sent events: "data: {json}\n\n", terminated by "data: [DONE]".
        // Chunks split mid-event, so the tail is carried into the next read.
        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const delta =
                JSON.parse(payload).choices?.[0]?.delta?.content ?? "";
              if (delta) {
                full += delta;
                controller.enqueue(encoder.encode(delta));
              }
            } catch {
              // A partial JSON frame is not fatal; the next read completes it.
            }
          }
        }
      } catch (err) {
        console.error("[chat] stream failed:", err);
        controller.enqueue(
          encoder.encode(
            "\n\nSomething went wrong on my end. Try again, or use the contact form at /start.",
          ),
        );
      } finally {
        controller.close();

        /*
         * Feedback the agent collected in conversation.
         *
         * The model emits a marker on the last line once it has all three
         * fields; it is parsed here and never reaches the reader, because the
         * chunk carrying it is only enqueued after the marker is cut.
         *
         * A marker rather than tool calling: this model's tool support is
         * unreliable enough that a dropped call would silently lose feedback
         * someone took the trouble to write.
         */
        const marker = full.match(
          /\[\[FEEDBACK\s+name="([^"]*)"\s+email="([^"]*)"\s+message="([^"]*)"\s*\]\]/,
        );
        if (marker && isConvexConfigured) {
          const [, name, email, message] = marker;
          if (name.trim() && message.trim() && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
            void fetchMutation(api.siteFeedback.submit, {
              name,
              email,
              message,
              path: "/chat",
            }).catch(() => {
              // Losing one is better than failing the whole reply after it
              // has already been streamed.
            });
          }
        }

        // Logged after the fact so it never delays the response.
        if (isConvexConfigured && serverSecret && sessionId) {
          const last = messages[messages.length - 1];
          void fetchMutation(api.chat.logTurn, {
            secret: serverSecret,
            sessionId,
            role: "user",
            content: last.content,
          }).catch(() => {});
          if (full) {
            void fetchMutation(api.chat.logTurn, {
              secret: serverSecret,
              sessionId,
              role: "assistant",
              content: full,
            }).catch(() => {});
          }
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
