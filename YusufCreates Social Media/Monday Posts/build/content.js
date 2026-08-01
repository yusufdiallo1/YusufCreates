/**
 * Monday Posts — carousel content.
 *
 * Ten decks, none repeating a subject from "YusufCreates Social Media" (v1 or
 * v2) or "Sunday Posts". Sixty-one decks precede these; the constraint is real
 * ground, not a new angle on old ground.
 *
 * FIGURES ARE REAL. Sources, and they must stay in sync:
 *
 *   src/lib/pricing.ts       — every price
 *   src/lib/leadScoring.ts   — the scoring bands quoted in sun/monday decks
 *   scripts/check-secrets.mjs — the credential patterns in deck 03
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
  // ENGINEERING — real mechanisms from this codebase
  // =====================================================================

  // 1. The secret guard. A real postbuild step, and a genuinely common leak.
  {
    slug: "mon-01-secrets",
    title: "Your API key is in the bundle",
    slides: [
      {
        eyebrow: "Security",
        headline: [["Your API key", "primary"], ["might be in the", "primary"], ["page source.", "danger"]],
        body: "One prefix decides whether a variable stays on your server or ships to every visitor.",
        cta: "Swipe",
      },
      {
        eyebrow: "The rule",
        headline: [["One prefix", "primary"], ["changes", "primary"], ["everything.", "muted"]],
        compare: {
          bad: {
            label: "Public",
            code: "NEXT_PUBLIC_KEY",
            note: "Inlined into the bundle. Every visitor downloads it.",
          },
          good: {
            label: "Server only",
            code: "STRIPE_SECRET_KEY",
            note: "Stays on the server. Never reaches the browser.",
          },
        },
        body: "Prefix it to use it in a component, and you have published it.",
      },
      {
        eyebrow: "Check it",
        headline: [["Grep your own", "primary"], ["build output.", "muted"]],
        terminal: {
          title: "zsh",
          lines: [
            ["npm run build", "cmd"],
            ["grep -r 'sk_live' .next/static", "cmd"],
            ["", "out"],
            ["no matches — good", "ok"],
            ["any match at all — rotate it now", "bad"],
          ],
        },
      },
      {
        eyebrow: "Automate it",
        headline: [["Make the build", "primary"], ["fail instead.", "accent"]],
        code: {
          file: "package.json",
          accentFile: true,
          lines: [
            [['"postbuild"', "key"], [": ", "punct"], ['"node scripts/check-secrets.mjs"', "str"]],
            "",
            [["# Scans the bundle for known key", "comment"]],
            [["# shapes. Exits non-zero on a hit,", "comment"]],
            [["# so a leak cannot deploy.", "comment"]],
          ],
        },
      },
      {
        eyebrow: "The point",
        headline: [["A rule nobody", "primary"], ["can forget.", "accent"]],
        body: "This runs on every build of my own site. Discipline fails eventually; a script that exits non-zero does not.",
        cta: "Save this",
      },
    ],
  },

  // 2. Webhooks. A real bug I shipped and fixed — specific and useful.
  {
    slug: "mon-02-webhooks",
    title: "The payment that never arrived",
    slides: [
      {
        eyebrow: "Engineering",
        headline: [["The customer", "primary"], ["paid. My system", "primary"], ["never knew.", "danger"]],
        body: "A webhook bug I shipped, found and fixed. It is the most common way payments break.",
        cta: "Swipe",
      },
      {
        eyebrow: "The bug",
        headline: [["I subscribed to", "primary"], ["the wrong", "primary"], ["events.", "muted"]],
        body: "Money moved, the card cleared, the customer saw a receipt. My webhook was not listening for the event that says so, so nothing downstream ever ran.",
      },
      {
        eyebrow: "Why it hides",
        headline: [["Nothing errors.", "primary"], ["That’s the", "primary"], ["problem.", "muted"]],
        body: "No exception, no failed request, no alert. Just an event nobody subscribed to, and an order that quietly never existed.",
      },
      {
        eyebrow: "The fix",
        headline: [["Handle failure", "primary"], ["as well as", "primary"], ["success.", "muted"]],
        checks: [
          "Payment succeeded — fulfil the order",
          "Payment failed — tell them why",
          "Refund issued — reverse it",
          "Subscription cancelled — stop billing",
        ],
      },
      {
        eyebrow: "The lesson",
        headline: [["Test the money", "primary"], ["path last, and", "primary"], ["hardest.", "accent"]],
        body: "Every other bug annoys someone. This one takes their money and gives nothing back — and it fails silently, so nobody reports it.",
        cta: "Save this",
      },
    ],
  },

  // 3. Rate limiting. Universal, never covered.
  {
    slug: "mon-03-rate-limit",
    title: "Your contact form is a bill",
    slides: [
      {
        eyebrow: "Security",
        headline: [["Your contact", "primary"], ["form is an open", "primary"], ["invoice.", "danger"]],
        body: "Anything public that costs you money per call needs a limit. Most sites have none.",
        cta: "Swipe",
      },
      {
        eyebrow: "The maths",
        headline: [["One script,", "primary"], ["one night.", "muted"]],
        body: "A form that sends an email costs a fraction of a penny. Ten thousand submissions overnight is a bill, a blocked sending domain, and an inbox nobody can use.",
      },
      {
        eyebrow: "Worse",
        headline: [["AI endpoints", "primary"], ["cost real", "primary"], ["money.", "muted"]],
        bars: [
          { label: "Contact form — pennies", value: "annoying", pct: 22 },
          { label: "Unmetered AI endpoint", value: "expensive", pct: 94, on: true },
        ],
        body: "A chat endpoint with no cap is somebody else’s free API, billed to you.",
      },
      {
        eyebrow: "The fix",
        headline: [["Limit by IP.", "primary"], ["Then by", "primary"], ["account.", "muted"]],
        body: "A few requests per minute is invisible to a real person and fatal to a script. Add a spend cap at the provider as the backstop that actually holds.",
      },
      {
        eyebrow: "The habit",
        headline: [["Ask what it", "primary"], ["costs to call.", "accent"]],
        body: "Every public endpoint, before it ships. If the answer is money, it needs a limit — not a plan to add one after the bill arrives.",
        cta: "Save this",
      },
    ],
  },

  // 4. Lead scoring. Real logic from src/lib/leadScoring.ts.
  {
    slug: "mon-04-lead-scoring",
    title: "I score every enquiry",
    slides: [
      {
        eyebrow: "Build in public",
        headline: [["Every enquiry", "primary"], ["gets a score", "primary"], ["out of 100.", "accent"]],
        body: "Not to rank people. To make sure the right ones get answered first.",
        cta: "Swipe",
      },
      {
        eyebrow: "The inputs",
        headline: [["Three signals,", "primary"], ["multiplied.", "muted"]],
        steps: [
          { k: "Budget", v: "What range they picked" },
          { k: "Urgency", v: "When they want to start" },
          { k: "Fit", v: "Whether it is work I do well" },
          { k: "Detail", v: "A long, specific message scores up" },
        ],
      },
      {
        eyebrow: "The bands",
        headline: [["Three buckets.", "primary"], ["That’s it.", "muted"]],
        bars: [
          { label: "Hot — 60 and above", value: "answer today", pct: 88, on: true },
          { label: "Warm — 32 to 59", value: "answer this week", pct: 52 },
          { label: "Cold — under 32", value: "answered, later", pct: 24 },
        ],
      },
      {
        eyebrow: "The safeguard",
        headline: [["Undecided isn’t", "primary"], ["uninterested.", "muted"]],
        body: "Someone who has not settled a budget but is clearly serious gets floored into warm rather than dropping to cold. The most valuable client I could have is often the one still working it out.",
      },
      {
        eyebrow: "Why bother",
        headline: [["Everyone gets a", "primary"], ["reply. Order is", "primary"], ["the only variable.", "accent"]],
        body: "One person, two slots. Triage is the difference between fast and arbitrary.",
        cta: "Follow for more",
      },
    ],
  },

  // 5. SEO structured data. Concrete, actionable, unmined.
  {
    slug: "mon-05-structured-data",
    title: "Tell Google what you are",
    slides: [
      {
        eyebrow: "SEO",
        headline: [["Google is", "primary"], ["guessing what", "primary"], ["your site is.", "accent"]],
        body: "There is a way to just tell it, and most sites skip it entirely.",
        cta: "Swipe",
      },
      {
        eyebrow: "The idea",
        headline: [["A machine-", "primary"], ["readable", "primary"], ["description.", "muted"]],
        code: {
          file: "JSON-LD",
          accentFile: true,
          lines: [
            [["{", "punct"]],
            [['  "@type"', "key"], [": ", "punct"], ['"ProfessionalService"', "str"], [",", "punct"]],
            [['  "name"', "key"], [": ", "punct"], ['"YusufCreates"', "str"], [",", "punct"]],
            [['  "areaServed"', "key"], [": ", "punct"], ['"Worldwide"', "str"]],
            [["}", "punct"]],
          ],
        },
        body: "A block of JSON in the page saying, unambiguously, what this is.",
      },
      {
        eyebrow: "What it buys",
        headline: [["The rich result,", "primary"], ["not just the", "primary"], ["blue link.", "muted"]],
        body: "Star ratings, prices, opening hours, FAQ accordions in the results page. Every one of those is structured data, not luck.",
      },
      {
        eyebrow: "The catch",
        headline: [["It has to be", "primary"], ["true.", "danger"]],
        body: "Marking up reviews you do not have is a manual penalty, not a clever trick. Describe what is genuinely on the page and nothing else.",
      },
      {
        eyebrow: "Start here",
        headline: [["One block. Ten", "primary"], ["minutes.", "accent"]],
        body: "Organisation or LocalBusiness on the homepage, then Article on posts. Test it in Google’s Rich Results tool before you ship it.",
        cta: "Save this",
      },
    ],
  },

  // =====================================================================
  // CRAFT — new subjects
  // =====================================================================

  // 6. Images. Enormous real-world impact, never covered.
  {
    slug: "mon-06-images",
    title: "Images are why it’s slow",
    slides: [
      {
        eyebrow: "Craft",
        headline: [["Your site is", "primary"], ["slow because of", "primary"], ["one photo.", "accent"]],
        body: "Almost always. And it is the easiest thing on the page to fix.",
        cta: "Swipe",
      },
      {
        eyebrow: "The size",
        headline: [["A phone camera", "primary"], ["shoots for", "primary"], ["print.", "muted"]],
        bars: [
          { label: "Straight from the camera — 4MB", value: "seconds", pct: 96 },
          { label: "Resized and WebP — 80KB", value: "instant", pct: 14, on: true },
        ],
        body: "Nobody needs a 4000px wide image in a 600px wide column.",
      },
      {
        eyebrow: "The format",
        headline: [["JPEG is not", "primary"], ["the only", "primary"], ["option now.", "muted"]],
        body: "WebP and AVIF are dramatically smaller at the same quality, and every browser that matters supports them. Most frameworks will convert for you if you let them.",
      },
      {
        eyebrow: "The jump",
        headline: [["Always set width", "primary"], ["and height.", "muted"]],
        body: "Without them the browser reserves no space, so everything below shifts when the image lands. That jump is the single most common reason a fast site feels cheap.",
      },
      {
        eyebrow: "The order",
        headline: [["Lazy-load", "primary"], ["everything", "primary"], ["below the fold.", "accent"]],
        body: "Load what they can see; defer the rest. Four changes, no redesign, and usually the biggest speed win available to you.",
        cta: "Save this",
      },
    ],
  },

  // 7. Mobile nav.
  {
    slug: "mon-07-mobile-nav",
    title: "Nobody can tap that",
    slides: [
      {
        eyebrow: "Craft",
        headline: [["Your menu works", "primary"], ["perfectly. On a", "primary"], ["mouse.", "accent"]],
        body: "Four things that break navigation on a phone, and all of them are cheap to fix.",
        cta: "Swipe",
      },
      {
        eyebrow: "Size",
        headline: [["A finger is not", "primary"], ["a cursor.", "muted"]],
        body: "Tap targets need roughly 44 by 44 points. A 20px icon with no padding is a coin toss, and the miss lands on whatever is next to it.",
      },
      {
        eyebrow: "Reach",
        headline: [["The top of the", "primary"], ["screen is far", "primary"], ["away.", "muted"]],
        body: "Phones got taller; thumbs did not. Primary actions belong in the lower half, where the hand already is.",
      },
      {
        eyebrow: "Hover",
        headline: [["There is no", "primary"], ["hover on a", "primary"], ["phone.", "danger"]],
        body: "A dropdown that opens on hover either never opens or opens on the tap that was meant to navigate. Both are broken; the second is worse because it looks fine to you.",
      },
      {
        eyebrow: "Escape",
        headline: [["Every menu", "primary"], ["needs a way", "primary"], ["out.", "accent"]],
        body: "Close button, tap outside, and the back gesture. A full-screen menu with no exit is a trap, and the exit is the browser.",
        cta: "Save this",
      },
    ],
  },

  // 8. Analytics without surveillance. Ties to a real product decision.
  {
    slug: "mon-08-no-cookie-banner",
    title: "The cookie banner is optional",
    slides: [
      {
        eyebrow: "Craft",
        headline: [["Nobody wants", "primary"], ["your cookie", "primary"], ["banner.", "accent"]],
        body: "You can usually delete it. It exists because of what you chose to measure.",
        cta: "Swipe",
      },
      {
        eyebrow: "Why it exists",
        headline: [["Consent is for", "primary"], ["tracking people.", "muted"]],
        body: "The banner is not a legal decoration. It is required because the analytics you installed follows individuals across sites. Change that and the requirement goes with it.",
      },
      {
        eyebrow: "The swap",
        headline: [["Count visits,", "primary"], ["not people.", "muted"]],
        compare: {
          bad: {
            label: "Tracking",
            code: "cookies\ncross-site IDs",
            note: "Follows a person. Needs consent, and gets blocked anyway.",
          },
          good: {
            label: "Counting",
            code: "aggregate\nno identifiers",
            note: "Pages, referrers, countries. No banner needed.",
          },
        },
      },
      {
        eyebrow: "What you lose",
        headline: [["Honestly, some", "primary"], ["of it matters.", "muted"]],
        body: "Individual user journeys and long attribution windows. If you are running paid acquisition at scale you may genuinely need those. Most sites are not, and never look at them.",
      },
      {
        eyebrow: "What you gain",
        headline: [["A faster site", "primary"], ["and no modal.", "accent"]],
        body: "Analytics without a cookie banner is in the Growth tier and above. Fewer scripts, no consent overlay, and numbers that are not distorted by blockers.",
        cta: "Save this",
      },
    ],
  },

  // =====================================================================
  // BUSINESS — new angles
  // =====================================================================

  // 9. Deposits. A real payment structure, not covered.
  {
    slug: "mon-09-deposit",
    title: "Why I take a deposit",
    slides: [
      {
        eyebrow: "Working together",
        headline: [["I take 40%", "primary"], ["before I start.", "accent"]],
        body: "Here is exactly what that protects, on both sides.",
        cta: "Swipe",
      },
      {
        eyebrow: "The split",
        headline: [["Forty, then", "primary"], ["sixty.", "muted"]],
        steps: [
          { k: "40% up front", v: "Books the slot and starts the build" },
          { k: "The build", v: "Live URL in week one" },
          { k: "60% on delivery", v: "Before handover completes" },
          { k: "Handover", v: "Domain, repo and accounts, yours" },
        ],
      },
      {
        eyebrow: "What it protects",
        headline: [["A slot is a real", "primary"], ["thing to give", "primary"], ["away.", "muted"]],
        body: "Two builds at a time means saying no to other work to hold your place. A deposit is what makes that commitment mutual rather than a favour.",
      },
      {
        eyebrow: "For you",
        headline: [["It caps your", "primary"], ["exposure too.", "muted"]],
        body: "You are never more than 40% in before you have seen something real, because the site is live in week one. If it is going wrong, you know early and cheaply.",
      },
      {
        eyebrow: "The rest",
        headline: [["Fixed price,", "primary"], ["agreed first.", "accent"]],
        body: "No hourly billing, no surprise invoice at the end. The number we agree before I start is the number.",
        cta: "See pricing",
      },
    ],
  },

  // 10. Scope creep, honestly. The closer.
  {
    slug: "mon-10-scope",
    title: "The project that never ends",
    slides: [
      {
        eyebrow: "Hard truths",
        headline: [["“Can we just", "primary"], ["add one small", "primary"], ["thing?”", "accent"]],
        body: "Said nine times, it is a different project. Here is how to keep it from happening.",
        cta: "Swipe",
      },
      {
        eyebrow: "Why it happens",
        headline: [["Nobody is being", "primary"], ["difficult.", "muted"]],
        body: "Seeing something real generates ideas you could not have had in a brief. That is the process working — the failure is having nowhere to put those ideas.",
      },
      {
        eyebrow: "The fix",
        headline: [["A list, not a", "primary"], ["debate.", "muted"]],
        body: "Everything new goes on a written list instead of into this build. Nothing is rejected and nothing is smuggled in. Most of it turns out to matter less than it did on the day.",
      },
      {
        eyebrow: "Version two",
        headline: [["Later is a real", "primary"], ["answer.", "muted"]],
        checks: [
          "Ship what was agreed, on time",
          "Launch, and watch real usage",
          "Half the list stops mattering",
          "Build the half that still does",
        ],
      },
      {
        eyebrow: "The honest bit",
        headline: [["Scope creep is", "primary"], ["usually a vague", "primary"], ["brief.", "accent"]],
        body: "If we both know what success looks like before I start, there is far less to renegotiate later. That is why the brief matters more than the contract.",
        cta: "DM to start",
        ctaHi: true,
      },
    ],
  },
];

module.exports = { carousels, HANDLE };
