/**
 * Carousel content — YusufCreates v2, graphic.
 *
 * Same rules as v1, and they matter more here because these slides show code:
 *
 *   - Prices and capacity are real. Sources: src/lib/pricing.ts,
 *     convex/capacity.ts, convex/seed.ts. If a price moves there, move it here.
 *   - Tool claims are verified against official docs, not recalled. Every path,
 *     frontmatter field and hook event name below was checked against
 *     docs.claude.com/en/docs/claude-code and cursor.com/docs/context/rules.
 *   - No subscription prices, model names or rate limits. They go stale faster
 *     than a published post can be edited.
 *
 * Code blocks are hand-tokenised as [text, kind] pairs rather than regex-
 * highlighted, so the colour is deliberate and nothing is mis-lexed on a public
 * post. Kinds: comment, key, str, num, fn, punct, accent, text.
 */

const HANDLE = "@yusufcreatesdev";

const carousels = [
  // =====================================================================
  // AI CODING TOOLS
  // =====================================================================

  // 1. CLAUDE.md. The file tree and the real one-line file carry this deck.
  {
    slug: "v2-01-claude-code-context",
    title: "Stop re-explaining your codebase",
    slides: [
      {
        eyebrow: "Claude Code",
        headline: [["You re-explain", "primary"], ["your codebase", "primary"], ["every session.", "accent"]],
        body: "One file fixes it. Most people never create it.",
        cta: "Swipe",
      },
      {
        eyebrow: "The file",
        headline: [["It goes at the", "primary"], ["root.", "muted"]],
        tree: {
          title: "your-project",
          items: [
            { name: "CLAUDE.md", on: true, note: "loads every session" },
            { name: "AGENTS.md", note: "your conventions" },
            { name: ".claude/", dir: true },
            { name: "rules/", dir: true, depth: 1, note: "scoped by path" },
            { name: "src/", dir: true },
            { name: "package.json", depth: 0 },
          ],
        },
      },
      {
        eyebrow: "The syntax",
        headline: [["My whole", "primary"], ["CLAUDE.md.", "accent"]],
        code: {
          file: "CLAUDE.md",
          accentFile: true,
          lines: [
            [["@AGENTS.md", "accent"]],
            "",
            [["# That is the entire file.", "comment"]],
            [["# One line, imported inline.", "comment"]],
          ],
        },
        body: "Claude Code and every other agent now read the same instructions and can’t drift apart.",
      },
      {
        eyebrow: "The mistake",
        headline: [["Longer is not", "primary"], ["better.", "danger"]],
        bars: [
          { label: "Under 200 lines", value: "followed", pct: 92, on: true },
          { label: "800-line CLAUDE.md", value: "drifts", pct: 34 },
        ],
        body: "Past roughly 200 lines adherence drops — it competes for the context the actual work needs. Scope the rest to file paths with .claude/rules/.",
      },
      {
        eyebrow: "The habit",
        headline: [["Correct it once.", "primary"], ["Not weekly.", "accent"]],
        body: "Caught yourself giving the same correction twice? That’s not a prompt. That’s a missing line in CLAUDE.md.",
        cta: "Follow for more",
      },
    ],
  },

  // 2. Skills, subagents, hooks — each as a real file or terminal.
  {
    slug: "v2-02-claude-code-setup",
    title: "Three features you're not using",
    slides: [
      {
        eyebrow: "Claude Code",
        headline: [["Three features", "primary"], ["you’re not", "primary"], ["using.", "accent"]],
        body: "The difference between a chat window and a system that knows your project.",
        cta: "Swipe",
      },
      {
        eyebrow: "01 — Skills",
        eyebrowColor: "#4cc38a",
        headline: [["Your workflow,", "primary"], ["written down.", "muted"]],
        code: {
          file: ".claude/skills/ship/SKILL.md",
          lines: [
            [["---", "punct"]],
            [["name", "key"], [": ", "punct"], ["ship", "str"]],
            [["description", "key"], [": ", "punct"], ["Deploy checklist", "str"]],
            [["---", "punct"]],
            "",
            [["1. Typecheck, then build.", "text"]],
            [["2. Verify prices match pricing.ts", "text"]],
          ],
        },
        body: "Becomes a command you invoke by name. Repeatable instead of remembered.",
      },
      {
        eyebrow: "02 — Subagents",
        eyebrowColor: "#4cc38a",
        headline: [["Delegate the", "primary"], ["messy reading.", "muted"]],
        code: {
          file: ".claude/agents/auditor.md",
          lines: [
            [["---", "punct"]],
            [["name", "key"], [": ", "punct"], ["auditor", "str"]],
            [["tools", "key"], [": ", "punct"], ["[Read, Grep]", "str"], ["  # no writes", "comment"]],
            [["---", "punct"]],
            "",
            [["Audit, report. Never edit.", "text"]],
          ],
        },
        body: "Its own model and a restricted tool list. A thousand lines of searching that never touch your main conversation.",
      },
      {
        eyebrow: "03 — Hooks",
        eyebrowColor: "#4cc38a",
        headline: [["Rules it cannot", "primary"], ["talk past.", "muted"]],
        terminal: {
          title: "PreToolUse — guard.sh",
          lines: [
            ["git push --force origin main", "cmd"],
            ["", "out"],
            ["blocked by hook: exit code 2", "bad"],
            ["never force-push to main", "out"],
          ],
        },
        body: "Configured in settings.json, firing on real events. Exit code 2 blocks the command outright. Enforcement, not instruction.",
      },
      {
        eyebrow: "The shift",
        headline: [["Configure it", "primary"], ["like a tool.", "accent"]],
        body: "Prompting harder has a ceiling. Setup doesn’t — each of these is a file you commit, so it works the same next week and for anyone who clones the repo.",
        cta: "Save this",
      },
    ],
  },

  // 3. Cursor rules. The .md-vs-.mdc comparison is the whole deck.
  {
    slug: "v2-03-cursor-rules",
    title: "Cursor rules that actually load",
    slides: [
      {
        eyebrow: "Cursor",
        headline: [["Your Cursor", "primary"], ["rules are being", "primary"], ["ignored.", "danger"]],
        body: "A silent failure people spend weeks not noticing.",
        cta: "Swipe",
      },
      {
        eyebrow: "The trap",
        headline: [["One letter.", "primary"], ["That’s the bug.", "danger"]],
        compare: {
          bad: {
            label: "Skipped",
            code: '.cursor/rules/\n  style<span style="color:#e5484d;font-weight:700">.md</span>',
            note: "Plain .md — skipped with no warning at all.",
          },
          good: {
            label: "Loaded",
            code: '.cursor/rules/\n  style<span style="color:#4cc38a;font-weight:700">.mdc</span>',
            note: "Project rules must be .mdc files.",
          },
        },
        body: "So you assume it loaded, and blame the model for ignoring you.",
      },
      {
        eyebrow: "The frontmatter",
        headline: [["Four ways a", "primary"], ["rule loads.", "muted"]],
        code: {
          file: ".cursor/rules/style.mdc",
          accentFile: true,
          lines: [
            [["---", "punct"]],
            [["alwaysApply", "key"], [": ", "punct"], ["true", "num"], ["   # every request", "comment"]],
            [["globs", "key"], [": ", "punct"], ['"**/*.tsx"', "str"], [" # matching files", "comment"]],
            [["description", "key"], [": ", "punct"], ["…", "str"], ["    # Agent decides", "comment"]],
            [["---", "punct"]],
            "",
            [["# None of the three? @-mention it.", "comment"]],
          ],
        },
      },
      {
        eyebrow: "The default",
        headline: [["Not everything", "primary"], ["is always-on.", "muted"]],
        body: "alwaysApply: true on every rule rebuilds the problem you were solving — a context window full of instructions that don’t apply. Scope with globs, let the rest load on demand.",
      },
      {
        eyebrow: "Both tools",
        headline: [["AGENTS.md is", "primary"], ["common ground.", "accent"]],
        body: "Cursor reads it at the project root. Claude Code reaches it with a one-line import. Write your conventions once and switching editors stops costing you your setup.",
        cta: "Save this",
      },
    ],
  },

  // 4. The honest deck. Deliberately not promotional — an account that only
  //    praises its own tooling reads as an ad.
  {
    slug: "v2-04-ai-tools-honestly",
    title: "What AI coding tools don't fix",
    slides: [
      {
        eyebrow: "Hard truths",
        headline: [["AI writes the", "primary"], ["code. You still", "primary"], ["own it.", "accent"]],
        body: "I build with these daily. Here’s what the demos leave out.",
        cta: "Swipe",
      },
      {
        eyebrow: "Speed",
        headline: [["Faster typing.", "primary"], ["Same thinking.", "muted"]],
        bars: [
          { label: "Writing the code", value: "much faster", pct: 88, on: true },
          { label: "Knowing what to build", value: "unchanged", pct: 30 },
        ],
        body: "The bottleneck was never how fast code appeared on screen.",
      },
      {
        eyebrow: "Review",
        headline: [["Plausible isn’t", "primary"], ["correct.", "danger"]],
        code: {
          file: "looks-fine.ts",
          lines: [
            [["const", "key"], [" total ", "text"], ["= ", "punct"], ["items", "text"], [".", "punct"], ["reduce", "fn"], ["(", "punct"]],
            [["  (", "punct"], ["a", "text"], [", ", "punct"], ["b", "text"], [") ", "punct"], ["=>", "key"], [" a ", "text"], ["+ ", "punct"], ["b", "text"], [".", "punct"], ["price", "text"], [", ", "punct"], ["0", "num"], [")", "punct"]],
            "",
            [["// Reads perfectly. Ships a bug", "comment"]],
            [["// the moment price is undefined.", "comment"]],
          ],
        },
        body: "Generated code reads well by construction — which is what makes a wrong version dangerous.",
      },
      {
        eyebrow: "Taste",
        headline: [["It won’t save you", "primary"], ["from a bad call.", "muted"]],
        body: "Ask for a worse architecture and you’ll get one, built quickly and consistently. These tools amplify judgement in both directions.",
      },
      {
        eyebrow: "The upside",
        headline: [["Used well, it’s", "primary"], ["a real edge.", "accent"]],
        body: "It’s why one person can ship accounts, payments, admin and native apps properly. Not because the work got smaller — because none of it starts from a blank file.",
        cta: "See what I’ve shipped",
      },
    ],
  },

  // =====================================================================
  // THE SITE — promotion, with the real figures from the codebase
  // =====================================================================

  // 5. Pricing, graphic. Prices from src/lib/pricing.ts.
  {
    slug: "v2-05-pricing",
    title: "Pricing",
    slides: [
      {
        eyebrow: "Pricing",
        headline: [["No “request", "primary"], ["a quote.”", "primary"], ["Here’s the price.", "accent"]],
        body: "Fixed, agreed before I start. No hourly billing, no surprise invoices.",
        cta: "Swipe",
      },
      {
        eyebrow: "The ladder",
        headline: [["Pick your", "primary"], ["starting point.", "muted"]],
        tiers: [
          { name: "Launch", price: "$400", detail: "One page, done properly. Contact form, SEO basics, deployed." },
          {
            name: "Growth",
            price: "$750",
            detail: "Three to nine pages. Blog you edit yourself, analytics.",
            featured: true,
            badge: "Most popular",
          },
          { name: "Web app", price: "from $2,500", detail: "Accounts, roles, database, payments, dashboards." },
        ],
      },
      {
        eyebrow: "Going further",
        headline: [["Native and", "primary"], ["enterprise.", "muted"]],
        tiers: [
          { name: "iOS & macOS", price: "from $3,200", detail: "Native, one shared backend. Works offline, syncs on reconnect." },
          { name: "Enterprise", price: "from $5,500", detail: "Up to 25 pages, bilingual RTL, WCAG 2.2 AA, SSO, SLA." },
          { name: "Care Plan", price: "$180/mo", detail: "Hosting, unlimited small edits, monthly reporting." },
        ],
      },
      {
        eyebrow: "In every plan",
        headline: [["No tier tax on", "primary"], ["the basics.", "muted"]],
        checks: [
          "Sign-in and accounts where needed",
          "An admin area you control",
          "Yours outright on final payment",
          "Fast on a phone, not just a laptop",
        ],
      },
      {
        eyebrow: "Next step",
        headline: [["Know which one", "primary"], ["you need?", "accent"]],
        body: "Quoted in USD, SAR and AED. DM the tier name and what you’re building.",
        cta: "DM to start",
        ctaHi: true,
      },
    ],
  },

  // 6. Capacity. BUILD_SLOTS = 2 in convex/capacity.ts.
  {
    slug: "v2-06-promo-slots",
    title: "Build slots",
    slides: [
      {
        eyebrow: "Capacity",
        headline: [["I take two", "primary"], ["builds at a", "primary"], ["time.", "accent"]],
        body: "Not a scarcity tactic. It’s what one person can build properly.",
        cta: "Swipe",
      },
      {
        eyebrow: "Why two",
        headline: [["Because I build", "primary"], ["them myself.", "muted"]],
        body: "No subcontractors. No junior doing the parts you won’t look at closely. Fewer clients at once is the entire reason the work stays good.",
      },
      {
        eyebrow: "How it works",
        headline: [["Counted, not", "primary"], ["claimed.", "muted"]],
        figure: {
          value: "2",
          label: "Build slots — availability derived from live projects, not a toggle I remember to flip",
        },
      },
      {
        eyebrow: "The waitlist",
        headline: [["You pick a", "primary"], ["month, not a", "primary"], ["Tuesday.", "muted"]],
        body: "A build start is a week, not an appointment. Promising a specific day six weeks out is a promise nobody can keep.",
      },
      {
        eyebrow: "Join it",
        headline: [["Take a slot", "primary"], ["before they go.", "accent"]],
        body: "Tell me what you’re building and which month suits. I’ll say straight away whether it fits.",
        cta: "DM to check availability",
        ctaHi: true,
      },
    ],
  },
];

module.exports = { carousels, HANDLE };
