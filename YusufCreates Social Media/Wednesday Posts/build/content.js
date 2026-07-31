/**
 * Wednesday Posts — carousel content.
 *
 * Ten decks. Eighty-three precede these across build/, build-v2/, Sunday,
 * Monday and Tuesday Posts, so the constraint is genuinely new subjects rather
 * than new angles on covered ground.
 *
 * FIGURES ARE REAL. Sources, and they must stay in sync:
 *
 *   src/lib/pricing.ts       — every price
 *   convex/schema.ts         — 48 indexes, quoted in deck 04
 *   src/lib/systemPrompt.ts  — the no-RAG decision in deck 06
 *   src/app/opengraph-image.tsx, sitemap.ts, robots.ts — decks 02 and 05
 *   convex/capacity.ts       — BUILD_SLOTS = 2, CARE_SLOTS = 2
 *
 * Tier *descriptions* drift more quietly than prices — check BUILD_TIERS,
 * ENTERPRISE_FEATURES, CARE_FEATURES and EVERY_PLAN, not just the numbers.
 *
 * Nothing claims traffic, revenue or client counts. None of that is recorded
 * anywhere in the repo, and inventing it on a public post is a liability.
 *
 * Code blocks are hand-tokenised as [text, kind] pairs so nothing is mis-lexed
 * on a public post. Kinds: comment, key, str, num, fn, punct, accent, text.
 */

const HANDLE = "@yusufcreatesdev";

const carousels = [
  // =====================================================================
  // THE INVISIBLE FILES — real files in this repo nobody thinks about
  // =====================================================================

  // 1. 404 and error pages. Everyone has them; almost nobody designs them.
  {
    slug: "wed-01-404",
    title: "Your 404 is doing nothing",
    slides: [
      {
        eyebrow: "Craft",
        headline: [["Somebody landed", "primary"], ["on your 404", "primary"], ["today.", "accent"]],
        body: "It said “Page not found” and they left. That page is a rescue, not an apology.",
        cta: "Swipe",
      },
      {
        eyebrow: "Who sees it",
        headline: [["Not just broken", "primary"], ["links.", "muted"]],
        body: "Old links from other sites, a mistyped URL, a page you deleted, an email from two years ago. These are people actively trying to reach you.",
      },
      {
        eyebrow: "The job",
        headline: [["Get them", "primary"], ["somewhere.", "muted"]],
        checks: [
          "A link to the page they probably wanted",
          "Search, if you have it",
          "Your main navigation, still visible",
          "A way to contact you",
        ],
      },
      {
        eyebrow: "The other one",
        headline: [["500 is worse,", "primary"], ["and rarer.", "danger"]],
        body: "A 404 means they asked for something missing. A 500 means you broke. That page needs a plain apology, a retry, and a way to reach a human — and it must not depend on the thing that just failed.",
      },
      {
        eyebrow: "Test it",
        headline: [["Type a URL that", "primary"], ["doesn’t exist.", "accent"]],
        body: "Right now, on your own site. If what comes back is a blank page with grey text on it, you’re losing people who were trying to find you.",
        cta: "Save this",
      },
    ],
  },

  // 2. OG images. Real file in this repo, huge practical impact.
  {
    slug: "wed-02-link-preview",
    title: "Your link looks broken",
    slides: [
      {
        eyebrow: "Craft",
        headline: [["Someone shared", "primary"], ["your site. It", "primary"], ["looked broken.", "accent"]],
        body: "A grey box and a URL. The preview card is the first thing most people ever see of you.",
        cta: "Swipe",
      },
      {
        eyebrow: "Where it shows",
        headline: [["Everywhere you", "primary"], ["don’t control.", "muted"]],
        body: "WhatsApp, Slack, iMessage, LinkedIn, X. Your carefully designed homepage is irrelevant if the card that gets pasted into a group chat is empty.",
      },
      {
        eyebrow: "The tags",
        headline: [["Four lines of", "primary"], ["metadata.", "muted"]],
        code: {
          file: "og tags",
          accentFile: true,
          lines: [
            [["og:title", "key"], ["        ", "text"], ["What it is", "str"]],
            [["og:description", "key"], ["  ", "text"], ["Why they’d click", "str"]],
            [["og:image", "key"], ["        ", "text"], ["1200 x 630", "num"]],
            [["og:url", "key"], ["          ", "text"], ["The canonical one", "str"]],
          ],
        },
        body: "Missing any of them and the platform guesses. It usually guesses badly.",
      },
      {
        eyebrow: "Better",
        headline: [["Generate it,", "primary"], ["don’t draw it.", "muted"]],
        body: "A per-page image built at request time means every blog post and project gets its own card with its own title, instead of one generic logo everywhere.",
      },
      {
        eyebrow: "Test it",
        headline: [["Paste your URL", "primary"], ["into a chat.", "accent"]],
        body: "Send it to yourself on WhatsApp. Whatever appears is what every person who shares your site is showing their friends.",
        cta: "Save this",
      },
    ],
  },

  // 3. Sitemap and robots. Small files, real consequences.
  {
    slug: "wed-03-robots",
    title: "Two files Google reads first",
    slides: [
      {
        eyebrow: "SEO",
        headline: [["Two tiny files", "primary"], ["decide what", "primary"], ["gets indexed.", "accent"]],
        body: "Most sites have neither, or have one that quietly blocks the whole site.",
        cta: "Swipe",
      },
      {
        eyebrow: "robots.txt",
        headline: [["Permission, not", "primary"], ["security.", "muted"]],
        body: "It tells well-behaved crawlers what to skip. It does not hide anything — a page listed as disallowed is still public, and you’ve just published its address.",
      },
      {
        eyebrow: "The disaster",
        headline: [["One line takes", "primary"], ["you off Google.", "danger"]],
        compare: {
          bad: {
            label: "Blocks everything",
            code: "User-agent: *\nDisallow: /",
            note: "Correct on staging. Catastrophic if it ships to production.",
          },
          good: {
            label: "Normal",
            code: "User-agent: *\nAllow: /",
            note: "Plus a link to your sitemap.",
          },
        },
      },
      {
        eyebrow: "sitemap.xml",
        headline: [["A list of what", "primary"], ["you actually", "primary"], ["have.", "muted"]],
        body: "Every page worth indexing, with a last-modified date. Generate it from your routes so it can’t go stale — a hand-written sitemap is wrong within a month.",
      },
      {
        eyebrow: "Check yours",
        headline: [["Visit /robots.txt", "primary"], ["right now.", "accent"]],
        body: "It takes five seconds. Sites do launch with the staging block still in place, and the symptom is simply never appearing in search.",
        cta: "Save this",
      },
    ],
  },

  // =====================================================================
  // ENGINEERING — real decisions in this codebase
  // =====================================================================

  // 4. Database indexes. 48 of them in convex/schema.ts.
  {
    slug: "wed-04-indexes",
    title: "Why it gets slower every month",
    slides: [
      {
        eyebrow: "Engineering",
        headline: [["It was fast in", "primary"], ["development. It’s", "primary"], ["slow now.", "accent"]],
        body: "Almost always the same cause, and it doesn’t appear until you have real data.",
        cta: "Swipe",
      },
      {
        eyebrow: "Why",
        headline: [["A hundred rows", "primary"], ["hide everything.", "muted"]],
        bars: [
          { label: "100 rows, no index", value: "instant", pct: 96, on: true },
          { label: "100,000 rows, no index", value: "seconds", pct: 18 },
        ],
        body: "Without an index the database reads every row to answer every query. At development scale that’s free. At real scale it’s the whole bill.",
      },
      {
        eyebrow: "The fix",
        headline: [["Index what you", "primary"], ["filter and sort", "primary"], ["by.", "muted"]],
        body: "Any column in a where clause or an order-by is a candidate. My own schema carries 48 of them — not because it’s huge, but because every query was written with one in mind.",
      },
      {
        eyebrow: "The cost",
        headline: [["They aren’t", "primary"], ["free.", "muted"]],
        body: "Every index makes writes slower and storage bigger. Indexing every column is as thoughtless as indexing none — index for the queries you actually run.",
      },
      {
        eyebrow: "The habit",
        headline: [["Seed it with", "primary"], ["real volume.", "accent"]],
        body: "Ten thousand rows in development, not ten. Performance problems that only appear in production are usually problems you refused to look for.",
        cta: "Save this",
      },
    ],
  },

  // 5. Time zones. Universal bug source, never covered.
  {
    slug: "wed-05-timezones",
    title: "The date is wrong for someone",
    slides: [
      {
        eyebrow: "Engineering",
        headline: [["Your date is", "primary"], ["wrong for", "primary"], ["someone.", "accent"]],
        body: "Time zones are where confident developers go to be humbled.",
        cta: "Swipe",
      },
      {
        eyebrow: "The rule",
        headline: [["Store UTC.", "primary"], ["Always.", "muted"]],
        body: "One canonical instant in the database, converted to local time only when it’s shown. Storing local time throws away the information you need to convert it correctly later.",
      },
      {
        eyebrow: "The bug",
        headline: [["Midnight is a", "primary"], ["different day", "primary"], ["elsewhere.", "danger"]],
        body: "A deadline stored as a date with no time is midnight somewhere — and already yesterday for a user eight hours ahead. This is how “expires today” fires a day early.",
      },
      {
        eyebrow: "The other one",
        headline: [["Servers lie", "primary"], ["about now.", "muted"]],
        body: "Rendering a date on the server and again in the browser produces two different strings when their zones differ. That’s a hydration mismatch, and it’s the most common one there is.",
      },
      {
        eyebrow: "The habit",
        headline: [["Change your", "primary"], ["laptop’s zone.", "accent"]],
        body: "Set it to Tokyo for an afternoon and use your own app. Every date bug you have will surface within ten minutes.",
        cta: "Save this",
      },
    ],
  },

  // 6. The no-RAG decision. Real, documented, and against the trend.
  {
    slug: "wed-06-no-rag",
    title: "I didn’t build a vector database",
    slides: [
      {
        eyebrow: "Build in public",
        headline: [["My site has an", "primary"], ["AI assistant. No", "primary"], ["vector database.", "accent"]],
        body: "That was a decision, not an oversight. Here’s the reasoning.",
        cta: "Swipe",
      },
      {
        eyebrow: "The default",
        headline: [["Everyone reaches", "primary"], ["for RAG.", "muted"]],
        body: "Chunk the content, embed it, store the vectors, retrieve the relevant ones per question. It’s the standard architecture, and for a large corpus it’s correct.",
      },
      {
        eyebrow: "The maths",
        headline: [["A few dozen", "primary"], ["answers fit.", "muted"]],
        compare: {
          neutral: true,
          bad: {
            label: "With RAG",
            code: "embed · store\nretrieve · rank",
            note: "Infrastructure, latency, and a new class of retrieval bugs.",
          },
          good: {
            label: "Without",
            code: "include\neverything",
            note: "It all fits in the prompt. Nothing to retrieve wrongly.",
          },
        },
      },
      {
        eyebrow: "The tradeoff",
        headline: [["This stops", "primary"], ["working at", "primary"], ["scale.", "muted"]],
        body: "At a few thousand documents I would need retrieval. I’m nowhere near that, so adding it now would be solving a problem I don’t have with a system I’d have to debug.",
      },
      {
        eyebrow: "The lesson",
        headline: [["The best", "primary"], ["architecture is", "primary"], ["the smallest one.", "accent"]],
        body: "That still works. Choosing the impressive answer over the sufficient one is how projects get expensive without getting better.",
        cta: "Follow for more",
      },
    ],
  },

  // 7. Prompt caching. Specific, technical, genuinely useful.
  {
    slug: "wed-07-prompt-cache",
    title: "One character costs you money",
    slides: [
      {
        eyebrow: "Engineering",
        headline: [["One character", "primary"], ["can double your", "primary"], ["AI bill.", "accent"]],
        body: "A subtle caching rule that catches almost everyone building with an LLM.",
        cta: "Swipe",
      },
      {
        eyebrow: "The mechanism",
        headline: [["Identical", "primary"], ["prefixes are", "primary"], ["cheap.", "muted"]],
        body: "Send the same opening block and the provider can reuse its work instead of reprocessing it. Long system prompts become dramatically cheaper — as long as they’re byte-identical.",
      },
      {
        eyebrow: "The bug",
        headline: [["A timestamp", "primary"], ["breaks it.", "danger"]],
        code: {
          file: "systemPrompt.ts",
          lines: [
            [["// Every request is now unique.", "comment"]],
            [["// Cache hit rate: zero.", "comment"]],
            "",
            [["`You are… ", "str"], ["${new Date()}", "accent"], ["`", "str"]],
          ],
        },
        body: "A session id, a user name, the current time — anything varying at the front means no request ever matches the last one.",
      },
      {
        eyebrow: "The fix",
        headline: [["Static first.", "primary"], ["Variable after.", "muted"]],
        body: "Everything that changes belongs in the messages, not the system prompt. Mine is assembled by one function precisely so it can’t drift between requests.",
      },
      {
        eyebrow: "Check it",
        headline: [["Your provider", "primary"], ["reports the", "primary"], ["hit rate.", "accent"]],
        body: "If it’s near zero and your prompt is long, something in the prefix is varying — and you’re paying full price on every single call.",
        cta: "Save this",
      },
    ],
  },

  // =====================================================================
  // BUSINESS AND CRAFT — new angles
  // =====================================================================

  // 8. Testimonials and proof.
  {
    slug: "wed-08-proof",
    title: "Nobody believes your testimonials",
    slides: [
      {
        eyebrow: "Craft",
        headline: [["“Great to work", "primary"], ["with!” — J.S.", "muted"]],
        body: "Nobody believes that. Anonymous praise reads as invented, because most of it is.",
        cta: "Swipe",
      },
      {
        eyebrow: "What makes it real",
        headline: [["A name and a", "primary"], ["face.", "muted"]],
        body: "Full name, role, company, photo. Every initial you replace with a letter halves the credibility, and an unnamed quote is worth roughly nothing.",
      },
      {
        eyebrow: "Better than praise",
        headline: [["A number they", "primary"], ["can check.", "muted"]],
        compare: {
          bad: {
            label: "Vague",
            code: "Great to work\nwith!",
            note: "Says nothing. Could be about anyone, by anyone.",
          },
          good: {
            label: "Specific",
            code: "Live in 3 weeks.\nEnquiries doubled.",
            note: "A claim with edges. It could be wrong, so it reads as true.",
          },
        },
      },
      {
        eyebrow: "The best proof",
        headline: [["Something they", "primary"], ["can open.", "muted"]],
        body: "A live URL beats any quote. Anyone can write a testimonial; not everyone can point at working software and say I built that.",
      },
      {
        eyebrow: "If you have none",
        headline: [["Say so, and", "primary"], ["show the work.", "accent"]],
        body: "Early on, honesty plus a real project beats a wall of invented praise. People are much better at spotting fake social proof than we assume.",
        cta: "Save this",
      },
    ],
  },

  // 9. Documentation for the client.
  {
    slug: "wed-09-handover-docs",
    title: "Write it down for the next person",
    slides: [
      {
        eyebrow: "Working together",
        headline: [["The next", "primary"], ["developer might", "primary"], ["not be me.", "accent"]],
        body: "Which is exactly why the handover has to be written down.",
        cta: "Swipe",
      },
      {
        eyebrow: "Not this",
        headline: [["A folder of", "primary"], ["screenshots.", "muted"]],
        body: "Documentation that describes where buttons are goes stale the first time anything moves. It’s also the part nobody reads.",
      },
      {
        eyebrow: "This",
        headline: [["The things", "primary"], ["nobody can", "primary"], ["guess.", "muted"]],
        rows: [
          { k: "01", v: "Where everything is hosted" },
          { k: "02", v: "Which env vars exist and why" },
          { k: "03", v: "How to deploy, exactly" },
          { k: "04", v: "The decisions that look wrong" },
        ],
      },
      {
        eyebrow: "The last one",
        headline: [["Explain the odd", "primary"], ["choices.", "muted"]],
        body: "Every codebase has something that looks like a mistake and isn’t. Unexplained, the next person will “fix” it and break something they can’t see.",
      },
      {
        eyebrow: "The test",
        headline: [["Could a stranger", "primary"], ["deploy it?", "accent"]],
        body: "If the answer needs a phone call to me, it isn’t handed over. That’s the bar, and it’s also what stops a client being quietly locked in.",
        cta: "Save this",
      },
    ],
  },

  // 10. The closer — what I’d tell someone starting out.
  {
    slug: "wed-10-starting-out",
    title: "If you’re starting out",
    slides: [
      {
        eyebrow: "Hard truths",
        headline: [["Nobody is", "primary"], ["waiting for your", "primary"], ["portfolio.", "accent"]],
        body: "Five things I’d tell anyone trying to get their first paid work.",
        cta: "Swipe",
      },
      {
        eyebrow: "01",
        headline: [["Ship something", "primary"], ["small. Publicly.", "muted"]],
        body: "One live URL beats ten tutorials finished. Nobody can open a course certificate, and nobody hires from one.",
      },
      {
        eyebrow: "02",
        headline: [["Free work has", "primary"], ["a cost.", "muted"]],
        body: "It sets the price, and a client who paid nothing values it accordingly. Build your own thing for free instead — at least then you own it.",
      },
      {
        eyebrow: "03",
        headline: [["Charge before", "primary"], ["you feel ready.", "muted"]],
        body: "You never feel ready. The gap between your first paid project and your tenth is enormous, and the only way across it is the first one.",
      },
      {
        eyebrow: "04 & 05",
        headline: [["Finish things.", "primary"], ["Then say what", "primary"], ["they cost.", "accent"]],
        body: "A finished small thing beats an abandoned ambitious one. And put your prices where people can see them — the enquiries you lose to a published price were never going to buy.",
        cta: "Follow for more",
      },
    ],
  },
];

module.exports = { carousels, HANDLE };
