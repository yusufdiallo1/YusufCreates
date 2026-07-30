/**
 * Carousel content — YusufCreates.
 *
 * PRICES AND CAPACITY ARE REAL, not placeholders. Every figure below is taken
 * from the codebase and must stay in sync with it:
 *
 *   src/lib/pricing.ts      — BASE_USD / PUBLISHED / GROWTH / BUILD_TIERS
 *   convex/capacity.ts      — BUILD_SLOTS = 2, CARE_SLOTS = 2
 *   convex/seed.ts          — the six seeded projects and their live URLs
 *
 * If a price changes in pricing.ts, change it here too. Nothing in these decks
 * claims traffic, revenue or client counts, because none of that is recorded
 * anywhere in the repo and inventing it on a public post is a liability.
 */

const HANDLE = "@yusufcreatesdev";

const carousels = [
  // =====================================================================
  // CRAFT / AUDIENCE-BUILDING
  // =====================================================================

  // 1. The hook deck. Strongest opener for a cold audience.
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

  // 2. Stack — build in public.
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

  // 3. Process.
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

  // =====================================================================
  // FEATURED PROJECTS — all figures from convex/seed.ts
  // =====================================================================

  // 4. DocuTrackr Family.
  {
    slug: "04-work-docutrackr-family",
    title: "DocuTrackr Family",
    slides: [
      {
        eyebrow: "Featured work",
        headline: [["A passport", "primary"], ["expires quietly.", "primary"], ["Then loudly.", "accent"]],
        body: "DocuTrackr Family — a document vault that catches expiries before they become emergencies.",
        cta: "Swipe",
      },
      {
        eyebrow: "The problem",
        headline: [["Nothing was", "primary"], ["watching the dates.", "muted"]],
        body: "Passports and visas sit across email threads, photo libraries and drawers. People miss renewals not through carelessness — a lapsed passport gets discovered at the airport.",
      },
      {
        eyebrow: "The build",
        headline: [["Scanning that", "primary"], ["never uploads.", "muted"]],
        body: "OCR runs in the browser with Tesseract.js, so no document leaves the device. Alerts at 90, 60, 30 and 7 days, plus a six-month passport rule check against upcoming flights.",
      },
      {
        eyebrow: "The numbers",
        headline: [["Built for a", "primary"], ["whole household.", "muted"]],
        stats: [
          { value: "10", label: "Household members supported" },
          { value: "100", label: "Peace of Mind Score range" },
          { value: "4", label: "Alert stages before expiry" },
        ],
      },
      {
        eyebrow: "Live now",
        headline: [["Shipped, with", "primary"], ["paying users.", "accent"]],
        body: "Free, Family and Lifetime tiers. Next.js, Convex, Stripe, Resend, Tesseract.js. Live at docutrackr.app.",
        cta: "Link in bio",
      },
    ],
  },

  // 5. DocuTrackr Business.
  {
    slug: "05-work-docutrackr-business",
    title: "DocuTrackr Business",
    slides: [
      {
        eyebrow: "Featured work",
        headline: [["The spreadsheet", "primary"], ["that quietly costs", "primary"], ["them fines.", "danger"]],
        body: "DocuTrackr Business — HR document compliance for companies across the GCC.",
        cta: "Swipe",
      },
      {
        eyebrow: "The problem",
        headline: [["Hundreds of visas,", "primary"], ["tracked by hand.", "muted"]],
        body: "HR teams across the UAE, Saudi Arabia, Qatar and Kuwait manage employee visas, medicals and work permits manually. A missed renewal triggers fines and can ground an employee entirely.",
      },
      {
        eyebrow: "The build",
        headline: [["AI that reads", "primary"], ["the contract.", "muted"]],
        body: "Contract extraction pulls parties, dates and risks out of uploaded PDFs and flags renewal clauses automatically. Role-based team access, shared folders with access logs.",
      },
      {
        eyebrow: "The numbers",
        headline: [["Built for real", "primary"], ["compliance load.", "muted"]],
        stats: [
          { value: "87", label: "Countries with renewal guides" },
          { value: "100", label: "Daily compliance score, out of" },
          { value: "7d", label: "Card-required trial" },
        ],
      },
      {
        eyebrow: "Live now",
        headline: [["Starter, Business,", "primary"], ["Enterprise.", "accent"]],
        body: "Shipped with a founder-facing admin dashboard for org and billing oversight. Next.js, Convex, Stripe, Claude. Live at business.docutrackr.app.",
        cta: "Link in bio",
      },
    ],
  },

  // 6. The smaller shipped projects.
  {
    slug: "06-work-shipped",
    title: "Things I shipped",
    slides: [
      {
        eyebrow: "Portfolio",
        headline: [["Four small apps.", "primary"], ["All live.", "accent"], ["All free.", "muted"]],
        body: "Built to answer one question each, properly. No accounts, no upsell.",
        cta: "Swipe",
      },
      {
        eyebrow: "Ledger",
        headline: [["How much is", "primary"], ["left this month?", "muted"]],
        body: "Budget trackers open on a wall of transactions. This one leads with the remaining balance, then spending by category, then the list — last, where it belongs.",
      },
      {
        eyebrow: "StopWatch",
        headline: [["Four timers,", "primary"], ["one calm screen.", "muted"]],
        body: "Focus timer, stopwatch, world clock and countdown behind a single sidebar. Pomodoro rounds roll into breaks automatically. Pleasant to leave open all day.",
      },
      {
        eyebrow: "Weather",
        headline: [["It admits when", "primary"], ["it doesn’t know.", "accent"]],
        body: "When the forecast API can’t be reached, it switches to clearly labelled sample data and says so in a banner — rather than presenting invented numbers as real.",
      },
      {
        eyebrow: "Margin",
        headline: [["Writing and", "primary"], ["reading, split.", "muted"]],
        body: "Markdown notes where drafting and reviewing are distinct modes, not a preview pane fighting for width. Nothing leaves the device.",
        cta: "All live — link in bio",
      },
    ],
  },

  // =====================================================================
  // PRICING — figures from src/lib/pricing.ts
  // =====================================================================

  // 7. The full ladder.
  {
    slug: "07-pricing",
    title: "Pricing",
    slides: [
      {
        eyebrow: "Pricing",
        headline: [["No “request", "primary"], ["a quote.”", "primary"], ["Here’s the price.", "accent"]],
        body: "Fixed prices, agreed before I start. No hourly billing, no surprise invoices.",
        cta: "Swipe",
      },
      {
        eyebrow: "The ladder",
        headline: [["Pick your", "primary"], ["starting point.", "muted"]],
        tiers: [
          {
            name: "Launch",
            price: "$400",
            detail: "One page, done properly. Contact form, SEO basics, deployed and handed over.",
          },
          {
            name: "Growth",
            price: "$750",
            detail: "A full site, three to nine pages. Blog you edit yourself, analytics, no cookie banner.",
            featured: true,
            badge: "Most popular",
          },
          {
            name: "Web app",
            price: "from $2,500",
            detail: "Software, not a brochure. Accounts, roles, database, payments, dashboards.",
          },
        ],
      },
      {
        eyebrow: "Going further",
        headline: [["Native and", "primary"], ["enterprise.", "muted"]],
        tiers: [
          {
            name: "iOS & macOS",
            price: "from $3,200",
            detail: "Shares one backend with your web build. Works offline. No App Store queue, no store cut.",
          },
          {
            name: "Enterprise",
            price: "from $5,500",
            detail: "Up to 25 pages, bilingual with full RTL, WCAG 2.2 AA, SSO, staged rollout, SLA.",
          },
          {
            name: "Care Plan",
            price: "$180/mo",
            detail: "Aftercare, not a build tier. Hosting, 100 small and 20 big fixes a month, SEO monitoring.",
          },
        ],
      },
      {
        eyebrow: "In every plan",
        headline: [["No tier tax on", "primary"], ["the basics.", "muted"]],
        checks: [
          "Sign-in and accounts where the project needs them",
          "An admin area you actually control",
          "Yours outright on final payment",
          "Fast on a phone, not just a laptop",
        ],
      },
      {
        eyebrow: "Next step",
        headline: [["Know which one", "primary"], ["you need?", "accent"]],
        body: "Prices shown in USD — also quoted in SAR and AED. DM the tier name and what you’re building.",
        cta: "DM to start",
        ctaHi: true,
      },
    ],
  },

  // 8. The Growth flat-price story — a genuinely unusual policy worth a deck.
  {
    slug: "08-pricing-flat",
    title: "Why pages are flat-priced",
    slides: [
      {
        eyebrow: "Pricing",
        headline: [["I stopped", "primary"], ["charging per", "primary"], ["page.", "accent"]],
        body: "The old model punished you for having a fifth idea. Here’s what replaced it.",
        cta: "Swipe",
      },
      {
        eyebrow: "The old way",
        headline: [["Nine pages cost", "primary"], ["more than an app.", "danger"]],
        body: "At $450 a page above three, a nine-page site came to $4,500 — more than the web app tier. That’s absurd, and it was my own pricing doing it.",
      },
      {
        eyebrow: "The real problem",
        headline: [["It made adding", "primary"], ["a page a", "primary"], ["negotiation.", "muted"]],
        body: "A client wanting one more page had to have a conversation about money instead of a decision about the site. Pricing shouldn’t make the work worse.",
      },
      {
        eyebrow: "Now",
        headline: [["Two numbers.", "primary"], ["That’s it.", "accent"]],
        tiers: [
          { name: "Three pages", price: "$750", detail: "Exactly three, one flat figure." },
          {
            name: "Four to nine",
            price: "$950",
            detail: "The same price whether you end up needing four pages or nine.",
            featured: true,
            badge: "Flat",
          },
        ],
      },
      {
        eyebrow: "Why it works",
        headline: [["The ninth page", "primary"], ["isn’t much more", "primary"], ["work.", "muted"]],
        body: "Most of the cost is design, build setup and deployment — none of which scale with page count. Charging as if they did was never honest.",
        cta: "See full pricing",
      },
    ],
  },

  // =====================================================================
  // PROMO — capacity from convex/capacity.ts (BUILD_SLOTS = 2)
  // =====================================================================

  // 9. Capacity. Honest scarcity: this is a real constraint in the code.
  {
    slug: "09-promo-slots",
    title: "Build slots",
    slides: [
      {
        eyebrow: "Capacity",
        headline: [["I take two", "primary"], ["builds at a", "primary"], ["time.", "accent"]],
        body: "Not a scarcity tactic — it’s what one person can build properly without the quality slipping.",
        cta: "Swipe",
      },
      {
        eyebrow: "Why two",
        headline: [["Because I build", "primary"], ["them myself.", "muted"]],
        body: "No subcontractors. No junior doing the parts you won’t look at closely. Fewer clients at once is the entire reason the work stays good.",
      },
      {
        eyebrow: "How it works",
        headline: [["Slots are", "primary"], ["counted, not", "primary"], ["claimed.", "muted"]],
        bigNote: {
          value: "2",
          label: "Build slots · availability derived from live projects, not a toggle I remember to flip",
        },
      },
      {
        eyebrow: "The waitlist",
        headline: [["You pick a", "primary"], ["month, not a", "primary"], ["Tuesday.", "muted"]],
        body: "A build start is a week, not an appointment. Promising a specific day six weeks out is a promise nobody can keep, so the waitlist works in months.",
      },
      {
        eyebrow: "Join it",
        headline: [["Take a slot", "primary"], ["before they go.", "accent"]],
        body: "Tell me what you’re building and which month suits. I’ll say straight away whether it fits the capacity I have.",
        cta: "DM to check availability",
        ctaHi: true,
      },
    ],
  },

  // =====================================================================
  // EVERGREEN / SAVEABLE
  // =====================================================================

  // 10. Landing page mistakes.
  {
    slug: "10-five-mistakes",
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
        body: "Every extra button splits attention. One primary action per screen. Everything else is a link — quieter, and further down.",
      },
      {
        eyebrow: "03",
        eyebrowColor: "#e5484d",
        headline: [["A carousel", "primary"], ["nobody swipes.", "muted"]],
        body: "Hero sliders lose most of their audience after the first frame. You built five panels and almost everyone saw one. Pick the best and delete the rest.",
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

  // 11. Accessibility — a genuine differentiator, since it's in every tier.
  {
    slug: "11-accessibility",
    title: "Accessibility",
    slides: [
      {
        eyebrow: "Craft",
        headline: [["Your site fails", "primary"], ["for 1 in 12", "primary"], ["men.", "accent"]],
        body: "Colour blindness affects roughly 8% of them. And that’s the easiest problem on this list to fix.",
        cta: "Swipe",
      },
      {
        eyebrow: "Contrast",
        headline: [["Grey on grey", "primary"], ["isn’t elegant.", "muted"]],
        body: "It’s unreadable outdoors. Body text needs 4.5:1 against its background. Large text and icons can sit at 3:1 — not less, however good it looks on your monitor.",
      },
      {
        eyebrow: "The trap",
        headline: [["One accent can’t", "primary"], ["do both jobs.", "muted"]],
        body: "My brand purple passes 3:1 for borders and icons but not 4.5:1 under white text. So there’s a second, darker token used only for filled buttons.",
      },
      {
        eyebrow: "Keyboard",
        headline: [["Try it without", "primary"], ["a mouse.", "muted"]],
        body: "Tab through your own site right now. If you can’t see where you are, or you get trapped in a modal, neither can anyone relying on a keyboard or screen reader.",
      },
      {
        eyebrow: "The point",
        headline: [["It’s not a", "primary"], ["feature. It’s the", "primary"], ["floor.", "accent"]],
        body: "Accessibility is in every tier I sell, not an upsell on the expensive one. Building it in from the start costs nothing. Retrofitting it costs a rebuild.",
        cta: "Save this",
      },
    ],
  },
  // =====================================================================
  // AI CODING TOOLS — Claude Code and Cursor.
  //
  // Every claim in this section is verified against official documentation,
  // not recalled. File paths, frontmatter fields and hook event names are
  // exact, because a wrong path is a post that teaches people something
  // broken. Deliberately excluded: subscription prices, model names, rate
  // limits and token costs — all of which change faster than a post can be
  // edited, and none of which are checkable from this repo.
  //
  // Verified: docs.claude.com/en/docs/claude-code (memory, skills, subagents,
  // hooks, permission modes) and cursor.com/docs/context/rules.
  // =====================================================================

  // 12. The context-file deck. The single highest-leverage habit, and the one
  //     most people skip. Uses this repo’s own CLAUDE.md as the example.
  {
    slug: "12-claude-code-context",
    title: "Stop re-explaining your codebase",
    slides: [
      {
        eyebrow: "Claude Code",
        headline: [["You re-explain", "primary"], ["your codebase", "primary"], ["every session.", "accent"]],
        body: "There is one file that fixes this, and most people never create it.",
        cta: "Swipe",
      },
      {
        eyebrow: "The file",
        headline: [["CLAUDE.md, at", "primary"], ["your repo root.", "muted"]],
        body: "It loads automatically at the start of every session. Your stack, your conventions, the commands to run — written once instead of typed into the chat again on Monday.",
      },
      {
        eyebrow: "The syntax",
        headline: [["One line beats", "primary"], ["one more copy.", "muted"]],
        body: "Write @AGENTS.md and it imports that file inline. My entire CLAUDE.md is that single line, so Claude Code and every other agent read the same instructions and can’t drift apart.",
      },
      {
        eyebrow: "The mistake",
        headline: [["Longer is not", "primary"], ["better.", "danger"]],
        body: "Past roughly 200 lines, adherence drops — it’s competing for the same context the actual work needs. Keep it short. Scope the rest to file paths with .claude/rules/ so it loads only when relevant.",
      },
      {
        eyebrow: "The habit",
        headline: [["Correct it once.", "primary"], ["Not weekly.", "accent"]],
        body: "When you catch yourself giving the same correction twice, that’s not a prompt — that’s a missing line in CLAUDE.md. Every repo I work in has one before I write any code.",
        cta: "Follow for more",
      },
    ],
  },

  // 13. Skills, subagents and hooks. The three features that separate people
  //     who use Claude Code from people who have configured it.
  {
    slug: "13-claude-code-setup",
    title: "Three features you’re not using",
    slides: [
      {
        eyebrow: "Claude Code",
        headline: [["Three features", "primary"], ["you’re paying", "primary"], ["for, unused.", "accent"]],
        body: "Not obscure flags. The difference between a chat window and a system that knows your project.",
        cta: "Swipe",
      },
      {
        eyebrow: "01 — Skills",
        eyebrowColor: "#4cc38a",
        headline: [["Your workflow,", "primary"], ["written down once.", "muted"]],
        body: "A SKILL.md in .claude/skills/ becomes a command you can invoke by name. Your deploy checklist, your review standard — repeatable instead of remembered.",
      },
      {
        eyebrow: "02 — Subagents",
        eyebrowColor: "#4cc38a",
        headline: [["Delegate the", "primary"], ["messy reading.", "muted"]],
        body: "Files in .claude/agents/ can be given their own model and a restricted tool list. An auditor with read access only, whose thousand lines of searching never touch your main conversation.",
      },
      {
        eyebrow: "03 — Hooks",
        eyebrowColor: "#4cc38a",
        headline: [["Rules the model", "primary"], ["cannot talk", "primary"], ["past.", "muted"]],
        body: "Configured in settings.json, hooks fire on real events — PreToolUse, PostToolUse, SessionStart. A PreToolUse hook exiting with code 2 blocks the command outright. That’s enforcement, not instruction.",
      },
      {
        eyebrow: "The shift",
        headline: [["Configure it", "primary"], ["like a tool.", "accent"]],
        body: "Prompting harder has a ceiling. Setup doesn’t — every one of these is a file you commit, so it works the same next week and for anyone else who clones the repo.",
        cta: "Save this",
      },
    ],
  },

  // 14. Cursor rules. Paths and frontmatter fields verified against
  //     cursor.com/docs/context/rules — the .md-is-ignored detail is the
  //     genuinely useful part, since it fails silently.
  {
    slug: "14-cursor-rules",
    title: "Cursor rules that actually load",
    slides: [
      {
        eyebrow: "Cursor",
        headline: [["Your Cursor", "primary"], ["rules are being", "primary"], ["ignored.", "danger"]],
        body: "There’s a silent failure here that people spend weeks not noticing.",
        cta: "Swipe",
      },
      {
        eyebrow: "The trap",
        headline: [[".md in that", "primary"], ["folder does", "primary"], ["nothing.", "danger"]],
        body: "Project rules live in .cursor/rules and must be .mdc files. A plain .md sitting in there is skipped with no warning — so you assume it’s loaded and blame the model for ignoring you.",
      },
      {
        eyebrow: "The frontmatter",
        headline: [["Four ways a", "primary"], ["rule can load.", "muted"]],
        rows: [
          { k: "01", v: "alwaysApply — in every request" },
          { k: "02", v: "globs — only for matching files" },
          { k: "03", v: "description — Agent decides" },
          { k: "04", v: "None of them — @-mention manually" },
        ],
      },
      {
        eyebrow: "The default",
        headline: [["Not everything", "primary"], ["is always-on.", "muted"]],
        body: "alwaysApply: true on every rule rebuilds the problem you were solving — a context window full of instructions that don’t apply. Scope with globs and let the rest load on demand.",
      },
      {
        eyebrow: "Both tools",
        headline: [["AGENTS.md is", "primary"], ["the common", "primary"], ["ground.", "accent"]],
        body: "Cursor reads AGENTS.md at the project root, and Claude Code reaches it with a one-line import. Write your conventions once, and switching editors stops costing you your setup.",
        cta: "Save this",
      },
    ],
  },

  // 15. The judgement deck. Honest about what these tools don’t do — the
  //     angle that separates a working developer from an AI hype account.
  {
    slug: "15-ai-tools-honestly",
    title: "What AI coding tools don’t fix",
    slides: [
      {
        eyebrow: "Hard truths",
        headline: [["AI writes the", "primary"], ["code. You still", "primary"], ["own it.", "accent"]],
        body: "I build with these tools daily. Here’s the part the demos leave out.",
        cta: "Swipe",
      },
      {
        eyebrow: "Speed",
        headline: [["Faster typing,", "primary"], ["same thinking.", "muted"]],
        body: "The bottleneck was never how fast the code appeared. Deciding what to build, and what to leave out, is still the whole job — and it’s still yours.",
      },
      {
        eyebrow: "Review",
        headline: [["Plausible is not", "primary"], ["the same as", "primary"], ["correct.", "danger"]],
        body: "Generated code reads well by construction, which is exactly what makes a wrong version dangerous. If you shipped it without understanding it, you can’t fix it at 2am when it breaks.",
      },
      {
        eyebrow: "Taste",
        headline: [["It will not save", "primary"], ["you from a bad", "primary"], ["decision.", "muted"]],
        body: "Ask for a worse architecture and you’ll get one, built quickly and consistently. These tools amplify judgement in both directions.",
      },
      {
        eyebrow: "The upside",
        headline: [["Used well, it’s", "primary"], ["a real edge.", "accent"]],
        body: "It’s why one person can ship accounts, payments, admin and native apps properly. Not because the work got smaller — because none of it starts from a blank file now.",
        cta: "See what I’ve shipped",
      },
    ],
  },
];

module.exports = { carousels, HANDLE };
