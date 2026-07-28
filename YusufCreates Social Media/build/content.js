/**
 * Carousel content — YusufCreates.
 *
 * PRICING NOTE: every figure in the pricing and promo decks is a placeholder.
 * Replace them with real rates before posting. They are grouped in the two
 * decks below so they are quick to find and edit.
 */

const HANDLE = "@yusufcreatesdev";

const carousels = [
  // ---------------------------------------------------------------------
  // 1. Craft — the hook deck. Strongest opener for a cold audience.
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
        body: "Type set at 90px with default letter-spacing looks loose and amateur. Tighten display sizes, leave body text alone. That single change beats a new typeface.",
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
  // 2. Stack — build in public.
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
  // 3. Process.
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
        body: "If the problem can’t be said in a sentence, it isn’t understood yet. Scope, stack and everything we cut fall out of getting this line right.",
      },
      {
        eyebrow: "02 — System",
        eyebrowColor: "#4cc38a",
        headline: [["Tokens before", "primary"], ["screens.", "muted"]],
        body: "Colour, type, spacing, radius — decided once, in one file. Screens designed one at a time drift by screen three. A system doesn’t drift.",
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
        body: "Motion, contrast, empty states, the copy nobody reads until it’s wrong. Most people skip this. It’s the part people notice.",
        cta: "Work with me",
      },
    ],
  },

  // ---------------------------------------------------------------------
  // 4. Studio — the offer.
  // ---------------------------------------------------------------------
  {
    slug: "04-studio",
    title: "Studio",
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
        body: "MVPs that need to exist this quarter. Products that work but look unfinished. Sites that undersell what’s behind them.",
      },
      {
        eyebrow: "Let’s talk",
        headline: [["Tell me what", "primary"], ["you’re building.", "accent"]],
        body: "First conversation is free, and I’ll say straight away if I’m not the right fit. DM or link in bio.",
        cta: "Link in bio",
      },
    ],
  },

  // ---------------------------------------------------------------------
  // 5. PRICING — ⚠️ PLACEHOLDER FIGURES. Replace before posting.
  // ---------------------------------------------------------------------
  {
    slug: "05-pricing",
    title: "Pricing",
    slides: [
      {
        eyebrow: "Pricing",
        headline: [["No “request", "primary"], ["a quote.”", "primary"], ["Here’s the price.", "accent"]],
        body: "Three ways to work together. Fixed scope, fixed number, no discovery-call maze.",
        cta: "Swipe",
      },
      {
        eyebrow: "The packages",
        headline: [["Pick your", "primary"], ["starting point.", "muted"]],
        tiers: [
          {
            name: "Landing",
            price: "$2,400",
            detail: "One high-converting page, designed and built. Copy support, analytics, live in 7 days.",
          },
          {
            name: "Product",
            price: "$7,500",
            detail: "Marketing site plus a working app. Auth, database, payments, deployed.",
            featured: true,
            badge: "Most picked",
          },
          {
            name: "Partner",
            price: "$3,200/mo",
            detail: "Ongoing design and engineering. Continuous shipping, no re-scoping every month.",
          },
        ],
      },
      {
        eyebrow: "Included",
        headline: [["Every project,", "primary"], ["every tier.", "muted"]],
        checks: [
          "A design system, not one-off screens",
          "Clean repo you own outright",
          "Accessibility built in from the start",
          "Deployed and live, not handed over as files",
        ],
      },
      {
        eyebrow: "No surprises",
        headline: [["Fixed price.", "primary"], ["Not hourly.", "accent"]],
        body: "You know the number before we start. If scope grows we agree a new one first — you will never open an invoice you weren’t expecting.",
      },
      {
        eyebrow: "Next step",
        headline: [["Know which one", "primary"], ["you need?", "accent"]],
        body: "DM the tier name and tell me what you’re building. If none of them fit, say so and we’ll shape something that does.",
        cta: "DM to start",
        ctaHi: true,
      },
    ],
  },

  // ---------------------------------------------------------------------
  // 6. PROMO — ⚠️ Slot count and deadline are placeholders. Update per month.
  // ---------------------------------------------------------------------
  {
    slug: "06-promo-slots",
    title: "Open slots",
    slides: [
      {
        eyebrow: "Open slots",
        headline: [["I’m taking on", "primary"], ["3 projects", "accent"], ["this quarter.", "primary"]],
        body: "That’s the honest number — it’s what one person can build properly without the quality slipping.",
        cta: "Swipe",
      },
      {
        eyebrow: "Why so few",
        headline: [["Because I build", "primary"], ["them myself.", "muted"]],
        body: "No subcontractors, no junior doing the parts you won’t look at closely. Fewer clients is the whole reason the work stays good.",
      },
      {
        eyebrow: "The slots",
        headline: [["Two left.", "primary"], ["One booked.", "muted"]],
        bigNote: {
          value: "2",
          label: "Slots remaining · starting this month",
        },
      },
      {
        eyebrow: "What you get",
        headline: [["Booked means", "primary"], ["you’re first.", "muted"]],
        checks: [
          "Priority start date, no waitlist",
          "Locked pricing for the whole project",
          "Direct line to me, not a ticket queue",
        ],
      },
      {
        eyebrow: "Claim one",
        headline: [["Take a slot", "primary"], ["before they go.", "accent"]],
        body: "DM the word SLOT and tell me what you’re building. I’ll tell you straight away whether it fits the time I have.",
        cta: "DM the word SLOT",
        ctaHi: true,
      },
    ],
  },

  // ---------------------------------------------------------------------
  // 7. Mistakes — evergreen, highly saveable.
  // ---------------------------------------------------------------------
  {
    slug: "07-five-mistakes",
    title: "Five mistakes",
    slides: [
      {
        eyebrow: "Hard truths",
        headline: [["5 things killing", "primary"], ["your landing", "primary"], ["page.", "danger"]],
        body: "Every one of these is costing you signups right now.",
        cta: "Swipe",
      },
      {
        eyebrow: "01",
        eyebrowColor: "#e5484d",
        headline: [["Your headline", "primary"], ["describes you.", "muted"]],
        body: "“We’re a platform for…” Nobody cares what you are. Say what changes for them, in their words, in the first six.",
      },
      {
        eyebrow: "02",
        eyebrowColor: "#e5484d",
        headline: [["Five CTAs is", "primary"], ["the same as none.", "muted"]],
        body: "Every extra button splits attention. One primary action per screen. Everything else is a link, quieter and further down.",
      },
      {
        eyebrow: "03",
        eyebrowColor: "#e5484d",
        headline: [["A carousel nobody", "primary"], ["swipes.", "muted"]],
        body: "Hero sliders average under 1% engagement past the first frame. You built five panels and 99% of people saw one. Pick the best one and delete the rest.",
      },
      {
        eyebrow: "04 & 05",
        eyebrowColor: "#e5484d",
        headline: [["Slow, and", "primary"], ["unreadable on", "primary"], ["a phone.", "muted"]],
        body: "Every extra second of load costs conversions. And most of your traffic is on a phone in daylight — check your contrast outdoors, not in a dark room.",
        cta: "Save this",
      },
    ],
  },
];

module.exports = { carousels, HANDLE };
