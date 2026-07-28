/**
 * Carousel content — YusufCreates.
 *
 * These decks are about the studio and the craft, not about any one client
 * product. The reference deck supplied the layout only; none of its copy or
 * subject matter carries over.
 */

const HANDLE = "@yusufcreatesdev";

const carousels = [
  // ---------------------------------------------------------------------
  // 1. Craft — why most interfaces look cheap, and what fixes it.
  // ---------------------------------------------------------------------
  {
    slug: "01-why-it-looks-cheap",
    title: "Why your UI looks cheap",
    slides: [
      {
        eyebrow: "Craft",
        headline: [["Your app works.", "primary"], ["It still looks", "primary"], ["cheap.", "accent"]],
        body: "It’s almost never the layout. It’s five details nobody thinks to name.",
        cta: "Swipe",
      },
      {
        eyebrow: "Depth",
        headline: [["Shadows fake it.", "primary"], ["Light earns it.", "muted"]],
        body: "Stacked drop shadows read as stickers. Real depth comes from a surface ladder and a hairline border — each layer a step lighter than the one beneath.",
      },
      {
        eyebrow: "Type",
        headline: [["Big text needs", "primary"], ["negative tracking.", "muted"]],
        body: "Type set at 90px with default letter-spacing looks loose and amateur. Tighten display sizes and leave body text alone. That single change does more than a new typeface.",
      },
      {
        eyebrow: "Colour",
        headline: [["Pure black is", "primary"], ["a beginner tell.", "muted"]],
        body: "#000 makes everything above it look like it’s floating in a void. A near-black with a hint of blue gives the whole interface somewhere to sit.",
      },
      {
        eyebrow: "The gap",
        headline: [["Polish isn’t paint.", "primary"], ["It’s decisions.", "accent"]],
        body: "Every one of these is a token you set once, not a thing you fix per screen. That’s the difference between a design and a design system.",
        cta: "Follow for more",
      },
    ],
  },

  // ---------------------------------------------------------------------
  // 2. Build in public — the actual stack, and why.
  // ---------------------------------------------------------------------
  {
    slug: "02-the-stack",
    title: "The stack",
    slides: [
      {
        eyebrow: "Build in public",
        headline: [["The stack I", "primary"], ["reach for, and", "primary"], ["why.", "accent"]],
        body: "Not the trendiest. The one that gets a real product in front of real users fastest.",
        cta: "Swipe",
      },
      {
        eyebrow: "The choices",
        headline: [["Four tools.", "primary"], ["No debate.", "muted"]],
        rows: [
          { k: "01", v: "Next.js — routing and rendering, solved" },
          { k: "02", v: "TypeScript — catches it before the user does" },
          { k: "03", v: "Convex — realtime backend, zero ops" },
          { k: "04", v: "Tailwind — tokens, not stylesheets" },
        ],
      },
      {
        eyebrow: "The rule",
        headline: [["Boring where it", "primary"], ["doesn’t show.", "muted"]],
        body: "Spend your novelty budget on the thing users actually touch. Nobody has ever chosen a product because of its ORM.",
      },
      {
        eyebrow: "The tradeoff",
        headline: [["Own your data.", "primary"], ["Rent everything", "primary"], ["else.", "muted"]],
        body: "Managed services for infrastructure you’d rather not run at 3am. But the schema, the repo and the domain stay yours — always.",
      },
      {
        eyebrow: "Your turn",
        headline: [["What’s in yours?", "primary"], ["Tell me below.", "accent"]],
        body: "Genuinely curious what people are shipping with in 2026. Drop your stack in the comments.",
        cta: "Comment your stack",
      },
    ],
  },

  // ---------------------------------------------------------------------
  // 3. Process — how the studio actually runs a project.
  // ---------------------------------------------------------------------
  {
    slug: "03-how-i-work",
    title: "How I work",
    slides: [
      {
        eyebrow: "Process",
        headline: [["Most projects", "primary"], ["die in the", "primary"], ["deck phase.", "accent"]],
        body: "Here’s the four-step version that doesn’t.",
        cta: "Swipe",
      },
      {
        eyebrow: "01 — Frame",
        eyebrowColor: "#4cc38a",
        headline: [["One sentence,", "primary"], ["or we don’t start.", "muted"]],
        body: "If the problem can’t be said in a sentence, it isn’t understood yet. Scope, stack and everything we cut all fall out of getting this line right.",
      },
      {
        eyebrow: "02 — System",
        eyebrowColor: "#4cc38a",
        headline: [["Tokens before", "primary"], ["screens.", "muted"]],
        body: "Colour, type, spacing, radius — decided once, in one file. Screens designed one at a time start drifting by screen three. A system doesn’t drift.",
      },
      {
        eyebrow: "03 — Ship",
        eyebrowColor: "#4cc38a",
        headline: [["Live URL in", "primary"], ["week one.", "muted"]],
        body: "Rough is fine. Invisible is not. Feedback on something you can open on your phone beats feedback on a mockup every single time.",
      },
      {
        eyebrow: "04 — Sharpen",
        eyebrowColor: "#4cc38a",
        headline: [["Then make it", "primary"], ["feel expensive.", "accent"]],
        body: "Motion, contrast, empty states, the copy nobody reads until it’s wrong. Most people skip this part. It’s the part people actually notice.",
        cta: "Work with me",
      },
    ],
  },

  // ---------------------------------------------------------------------
  // 4. Studio — the offer.
  // ---------------------------------------------------------------------
  {
    slug: "04-studio",
    title: "YusufCreates studio",
    slides: [
      {
        eyebrow: "Open for work",
        headline: [["Design and code.", "primary"], ["Same person.", "accent"]],
        body: "No handoff. No telephone game. No “the developer said that isn’t possible.”",
        cta: "Swipe",
      },
      {
        eyebrow: "The problem",
        headline: [["Two vendors,", "primary"], ["one blurry", "primary"], ["product.", "muted"]],
        body: "A designer hands over a file. A developer interprets it. What ships is the average of two guesses — and it always looks like it.",
      },
      {
        eyebrow: "What you get",
        headline: [["Designed and", "primary"], ["built as one.", "muted"]],
        body: "Interface, front-end, backend, deploy. The thing that gets designed is the thing that gets shipped, because it never changes hands.",
        stats: [
          { value: "1", label: "Point of contact" },
          { value: "0", label: "Handoff files" },
          { value: "7d", label: "To first live URL" },
        ],
      },
      {
        eyebrow: "Good fit",
        headline: [["Founders who’ve", "primary"], ["stopped waiting.", "muted"]],
        body: "MVPs that need to exist this quarter. Products that work but look unfinished. Sites that undersell what’s actually behind them.",
      },
      {
        eyebrow: "Let’s talk",
        headline: [["Tell me what", "primary"], ["you’re building.", "accent"]],
        body: "First conversation is free, and I’ll say straight away if I’m not the right fit. DM or link in bio.",
        cta: "Link in bio",
      },
    ],
  },
];

module.exports = { carousels, HANDLE };
