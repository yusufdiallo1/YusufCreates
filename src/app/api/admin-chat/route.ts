import { NextResponse } from "next/server";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api, isConvexConfigured } from "@/lib/convex-api";

/**
 * The admin assistant.
 *
 * Distinct from /api/chat, which is the public widget: that one's job is to
 * refuse confidently and capture a lead. This one is the opposite — it is me,
 * signed in, asking about my own data and telling it to change things. So it
 * gets tool calling over real queries and mutations, and no guardrails about
 * what it may discuss.
 *
 * Every tool runs through the same Convex functions the UI uses, forwarding
 * my auth token. Nothing here has its own privileges: if requireAdmin would
 * reject the call from a browser, it rejects it from here too. That is the
 * whole security model, and it is why the tool list can be this direct.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
/*
 * Same model as the public chat and the composer. Its tool calling was
 * verified against this exact list rather than assumed — the public route's
 * comments warn that it is unreliable, which was true of the older model it
 * was written for.
 */
const MODEL = "llama-3.3-70b-versatile";

const MAX_TOKENS = 1400;
const MAX_MESSAGES = 24;
const MAX_CHARS = 4000;

/** Tool loops are bounded: a model that keeps calling must still terminate. */
const MAX_TOOL_ROUNDS = 4;

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_call_id?: string;
  tool_calls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
};

/**
 * What the assistant can do.
 *
 * Reads are unrestricted. Writes are deliberately few and each one is
 * reversible from the admin UI — there is no delete here, and nothing that
 * sends email to a client without me pressing the button myself. A model that
 * misreads "clear the leads" should not be able to act on it.
 */
const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "get_overview",
      description:
        "Current business snapshot: lead counts, revenue paid this month and outstanding, pipeline by project type, and what needs attention.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_leads",
      description:
        "List enquiries, newest first, with name, email, project type, score, temperature and status.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            description:
              "Optional filter: new, contacted, qualified, proposal, won or lost.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_chat_stats",
      description:
        "How much the public chat widget is being used: total messages, distinct visitor sessions, messages in the last 24 hours, and how many were visitor questions.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_chat_threads",
      description:
        "Recent public chat conversations grouped by visitor session, so you can read what people actually asked. Use this to find questions worth adding to the knowledge base.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "How many messages to scan. Defaults to 200.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_knowledge",
      description:
        "The knowledge base entries that back the public chat assistant: question, answer, tags and priority.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "add_knowledge",
      description:
        "Add an entry to the knowledge base so the public assistant can answer that question in future. Write the answer in my voice: plain, direct, no marketing language.",
      parameters: {
        type: "object",
        properties: {
          question: { type: "string", description: "The question as a visitor would ask it." },
          answer: { type: "string", description: "The answer, in my voice." },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Lowercase topic tags, e.g. pricing, timeline, process.",
          },
          priority: {
            type: "number",
            description: "Higher wins when several entries match. 0 unless it matters.",
          },
        },
        required: ["question", "answer"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "schedule_broadcast",
      description:
        "Create a DRAFT newsletter broadcast, optionally scheduled for a future time. This only drafts it — nothing is emailed to anyone until I send it from the Broadcast page.",
      parameters: {
        type: "object",
        properties: {
          subject: { type: "string", description: "The email subject line." },
          audience: {
            type: "string",
            description: "newsletter, clients, enterprise or all. Defaults to newsletter.",
          },
          scheduledAt: {
            type: "string",
            description:
              "ISO 8601 datetime for when it should go out, e.g. 2026-08-10T09:00:00Z. Omit for no schedule.",
          },
        },
        required: ["subject"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "set_lead_status",
      description:
        "Move an enquiry to a different status in the pipeline. Get the lead id from get_leads first.",
      parameters: {
        type: "object",
        properties: {
          leadId: { type: "string", description: "The lead's id from get_leads." },
          status: {
            type: "string",
            description: "new, contacted, qualified, proposal, won or lost.",
          },
        },
        required: ["leadId", "status"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "add_lead_note",
      description: "Attach a note to an enquiry, so the context is on the record.",
      parameters: {
        type: "object",
        properties: {
          leadId: { type: "string", description: "The lead's id from get_leads." },
          note: { type: "string", description: "What to record." },
        },
        required: ["leadId", "note"],
      },
    },
  },
] as const;

/** Everything the tools return is JSON the model reads back as a string. */
async function runTool(
  name: string,
  args: Record<string, unknown>,
  token: string | undefined,
): Promise<unknown> {
  const auth = { token };

  switch (name) {
    case "get_overview":
      return await fetchQuery(api.admin.overview, {}, auth);

    case "get_leads": {
      const rows = await fetchQuery(api.admin.leads, {}, auth);
      const status = typeof args.status === "string" ? args.status : null;
      const filtered =
        status && status !== "all"
          ? rows.filter((r: { status?: string }) => r.status === status)
          : rows;
      // Trimmed to what the model can act on. Sending whole rows wastes the
      // context window on brief text it did not ask for.
      return filtered.slice(0, 40).map((r: Record<string, unknown>) => ({
        id: r._id,
        name: r.name,
        email: r.email,
        projectType: r.projectType,
        plan: r.plan,
        score: r.score,
        status: r.status,
      }));
    }

    case "get_chat_stats":
      return await fetchQuery(api.chat.stats, {}, auth);

    case "get_chat_threads": {
      const limit = typeof args.limit === "number" ? args.limit : 200;
      const threads = await fetchQuery(api.chat.threads, { limit }, auth);
      return threads.slice(0, 15).map((t) => ({
        turns: t.turns,
        opener: t.opener,
        messages: t.messages.slice(0, 12),
      }));
    }

    case "get_knowledge":
      return await fetchQuery(api.kb.list, { limit: 200 }, auth);

    case "add_knowledge": {
      const question = String(args.question ?? "").trim();
      const answer = String(args.answer ?? "").trim();
      if (!question || !answer) return { error: "Both question and answer are required." };

      const id = await fetchMutation(
        api.kb.create,
        {
          question,
          answer,
          tags: Array.isArray(args.tags) ? args.tags.map(String) : [],
          priority: typeof args.priority === "number" ? args.priority : 0,
        },
        auth,
      );
      return { ok: true, id, saved: question };
    }

    case "schedule_broadcast": {
      const subject = String(args.subject ?? "").trim();
      if (!subject) return { error: "A subject is required." };

      /*
       * An unparseable date must not silently become "now" — that would
       * schedule a send for the moment of the mistake. Left undefined, the
       * broadcast is simply an unscheduled draft, which is recoverable.
       */
      let scheduledAt: number | undefined;
      if (typeof args.scheduledAt === "string" && args.scheduledAt.trim()) {
        const parsed = Date.parse(args.scheduledAt);
        if (Number.isNaN(parsed)) {
          return { error: `Could not read "${args.scheduledAt}" as a date. Nothing was scheduled.` };
        }
        scheduledAt = parsed;
      }

      const id = await fetchMutation(
        api.broadcasts.create,
        {
          subject,
          audienceId: typeof args.audience === "string" ? args.audience : "newsletter",
          scheduledAt,
        },
        auth,
      );
      return {
        ok: true,
        id,
        subject,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        note: "Saved as a DRAFT. Nothing has been emailed — send it from the Broadcast page.",
      };
    }

    case "set_lead_status": {
      await fetchMutation(
        api.admin.setLeadStatus,
        {
          id: String(args.leadId) as never,
          status: String(args.status) as never,
        },
        auth,
      );
      return { ok: true };
    }

    case "add_lead_note": {
      await fetchMutation(
        api.admin.addLeadNote,
        { id: String(args.leadId) as never, note: String(args.note ?? "") },
        auth,
      );
      return { ok: true };
    }

    default:
      return { error: `No such tool: ${name}` };
  }
}

const SYSTEM = `You are Yusuf's back-office assistant on yusufcreates.com. You are talking to Yusuf himself, signed in to the admin. He is a solo freelance developer.

Use the tools to answer from real data. Never invent a number, a name or a date — if you do not have it, call a tool or say you do not know.

When he asks you to do something, do it, then say plainly what you did. Do not ask permission for reads. For writes, just do it and report it — he can undo anything from the admin.

Be brief and concrete. He is scanning, not reading. Short paragraphs, no headings, no bullet lists unless you are genuinely listing records. Never use marketing language.

Working hours are Saturday to Thursday, 09:00-21:00 AST (UTC+3), closed Fridays. Today's date is ${new Date().toISOString().slice(0, 10)}.`;

export async function POST(request: Request) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "GROQ_API_KEY is not set." }, { status: 503 });
  }
  if (!isConvexConfigured) {
    return NextResponse.json({ error: "Convex is not configured." }, { status: 503 });
  }

  /*
   * The auth gate.
   *
   * Every tool forwards this token to Convex, where requireAdmin checks it
   * again on each call. Failing here as well means an unauthenticated request
   * never reaches the model at all — otherwise anyone could burn my Groq
   * quota to be told "not authorised" nine times.
   */
  const token = await convexAuthNextjsToken().catch(() => undefined);
  if (!token) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const isAdmin = await fetchQuery(api.admin.amIAdmin, {}, { token }).catch(
    () => false,
  );
  if (!isAdmin) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const incoming = Array.isArray(body?.messages) ? body.messages : null;
  if (!incoming) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const history: ChatMessage[] = incoming
    .slice(-MAX_MESSAGES)
    .filter(
      (m: { role?: string; content?: string }) =>
        (m.role === "user" || m.role === "assistant") && typeof m.content === "string",
    )
    .map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content.slice(0, MAX_CHARS),
    }));

  if (history.length === 0) {
    return NextResponse.json({ error: "Nothing to answer." }, { status: 400 });
  }

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM },
    ...history,
  ];

  /*
   * Tool loop.
   *
   * The model may need several rounds — read the leads, then note one of
   * them. Bounded so a model that keeps calling cannot spin: at the cap it
   * gets one final turn with tools withheld, which forces it to answer in
   * words rather than returning nothing.
   */
  const used: string[] = [];

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const last = round === MAX_TOOL_ROUNDS;

    const upstream = await fetchGroq(key, {
      model: MODEL,
      messages,
      max_tokens: MAX_TOKENS,
      ...(last ? {} : { tools: TOOLS, tool_choice: "auto" }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      console.error("[admin-chat] groq error", upstream.status, detail.slice(0, 300));
      return NextResponse.json(
        {
          error:
            upstream.status === 401
              ? "The Groq key was rejected. Check GROQ_API_KEY."
              : "The assistant is unavailable right now.",
        },
        { status: 502 },
      );
    }

    const data = await upstream.json();
    const choice = data?.choices?.[0]?.message;
    if (!choice) {
      return NextResponse.json({ error: "Empty reply." }, { status: 502 });
    }

    const calls = choice.tool_calls;
    if (!calls || calls.length === 0) {
      return NextResponse.json({
        reply: choice.content ?? "",
        toolsUsed: used,
      });
    }

    // The assistant turn carrying the calls has to go back verbatim, or the
    // tool results below have nothing to attach to.
    messages.push({
      role: "assistant",
      content: choice.content ?? null,
      tool_calls: calls,
    });

    for (const call of calls) {
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(call.function.arguments || "{}");
      } catch {
        // A malformed argument string is the model's error to recover from,
        // so it is reported as a tool result rather than thrown.
      }

      used.push(call.function.name);

      let result: unknown;
      try {
        result = await runTool(call.function.name, parsed, token);
      } catch (err) {
        /*
         * A failing tool is reported back INTO the conversation rather than
         * ending the request. The model can then say what went wrong, which
         * is far more useful than a 500 with no explanation.
         */
        result = {
          error: err instanceof Error ? err.message : "That failed.",
        };
      }

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result).slice(0, 12000),
      });
    }
  }

  return NextResponse.json({ error: "Gave up after too many steps." }, { status: 500 });
}

/** One place for the upstream call, so the loop above stays readable. */
function fetchGroq(key: string, payload: unknown) {
  return fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}
