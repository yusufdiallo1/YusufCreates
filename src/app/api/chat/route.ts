import Anthropic from "@anthropic-ai/sdk";
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
 * Date-stamped, as asked. Kept in one constant so switching tiers is a
 * one-line change if the guardrails do not hold under testing.
 */
const MODEL = "claude-haiku-4-5-20251001";

/** A chat widget, not an essay generator. This is the main cost control. */
const MAX_TOKENS = 1024;

const MAX_MESSAGES = 20;
const MAX_CHARS = 2000;

interface Turn {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
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

  const client = new Anthropic({ apiKey: key });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      let full = "";

      try {
        const response = client.messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: [
            {
              type: "text",
              text: system,
              // The prompt is identical on every request, so this turns most
              // of the input cost into a cache read. It only applies once the
              // prefix clears the model's minimum cacheable length — worth
              // checking usage.cache_read_input_tokens on the second request
              // to confirm it is actually taking effect.
              cache_control: { type: "ephemeral" },
            },
          ],
          messages,
        });

        response.on("text", (delta) => {
          full += delta;
          controller.enqueue(encoder.encode(delta));
        });

        await response.finalMessage();
      } catch (err) {
        console.error("[chat] stream failed:", err);
        controller.enqueue(
          encoder.encode(
            "\n\nSomething went wrong on my end. Try again, or use the contact form at /start.",
          ),
        );
      } finally {
        controller.close();

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
