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
          { name: "iOS & macOS", price: "from $3,200", detail: "Shares your web backend. Works offline. No App Store queue, no store cut." },
          { name: "Enterprise", price: "from $5,500", detail: "Up to 25 pages, bilingual RTL, WCAG 2.2 AA, SSO, SLA." },
          { name: "Care Plan", price: "$180/mo", detail: "Hosting, 100 small fixes and 20 big fixes a month, SEO monitoring." },
        ],
      },
      {
        eyebrow: "In every plan",
        headline: [["No tier tax on", "primary"], ["the basics.", "muted"]],
        checks: [
          "Sign-in and accounts where the project needs them",
          "An admin area you actually control",
          "Yours outright on final payment",
        ],
      },
      {
        eyebrow: "Next step",
        headline: [["Know which one", "primary"], ["you need?", "accent"]],
        body: "Care Plan billed yearly is $1,800 — twelve months for the price of ten. Quoted in USD, SAR and AED.",
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
  // =====================================================================
  // ROUND TWO — more AI tooling, plus craft decks
  //
  // Checkpointing, permission modes, context management and headless mode
  // all verified against code.claude.com/docs (July 2026). The rewind
  // limitations in deck 07 are quoted from the checkpointing page directly;
  // they are the part people learn the hard way.
  // =====================================================================

  // 7. Checkpoints. The single most useful thing people don't know exists.
  {
    slug: "v2-07-rewind",
    title: "Undo everything Claude just did",
    slides: [
      {
        eyebrow: "Claude Code",
        headline: [["It broke your", "primary"], ["code. Press", "primary"], ["Esc twice.", "accent"]],
        body: "There’s an undo for the last hour of edits, and most people don’t know it exists.",
        cta: "Swipe",
      },
      {
        eyebrow: "Checkpoints",
        headline: [["Every prompt is", "primary"], ["a save point.", "muted"]],
        body: "Claude Code snapshots your files before each message you send. Automatically, all session, with no setup.",
        figure: {
          value: "100",
          label: "Most recent checkpoints kept per session — kept with the conversation, so /rewind still works after you resume",
        },
      },
      {
        eyebrow: "How",
        headline: [["Esc, Esc.", "primary"], ["Or /rewind.", "accent"]],
        body: "Double-Esc opens the menu when the input is empty. Then pick a point and choose what to roll back:",
        rows: [
          { k: "01", v: "Restore code and conversation" },
          { k: "02", v: "Restore conversation only" },
          { k: "03", v: "Restore code only" },
          { k: "04", v: "Summarize, to free context" },
        ],
      },
      {
        eyebrow: "The catch",
        headline: [["Two things it", "primary"], ["will not undo.", "danger"]],
        compare: {
          bad: {
            label: "Not tracked",
            code: "rm file.txt\nmv old.txt new.txt",
            note: "Bash changes aren’t checkpointed. Nor are subagent edits.",
          },
          good: {
            label: "Tracked",
            code: "Edit / Write\nfile tools",
            note: "Only direct file edits made by Claude’s own tools.",
          },
        },
      },
      {
        eyebrow: "The rule",
        headline: [["Local undo.", "primary"], ["Not git.", "accent"]],
        body: "Checkpoints die with the session after 30 days. They’re a safety net for the last hour, not version history. Commit anyway.",
        cta: "Save this",
      },
    ],
  },

  // 8. Permission modes. Named exactly as the docs name them.
  {
    slug: "v2-08-permission-modes",
    title: "Stop approving every edit",
    slides: [
      {
        eyebrow: "Claude Code",
        headline: [["You’re clicking", "primary"], ["approve 200", "primary"], ["times a day.", "accent"]],
        body: "There’s a key for that. Most people never press it.",
        cta: "Swipe",
      },
      {
        eyebrow: "The key",
        headline: [["Shift + Tab", "primary"], ["cycles modes.", "muted"]],
        steps: [
          { k: "default", v: "Asks before it touches anything" },
          { k: "acceptEdits", v: "Files yes, commands still ask" },
          { k: "plan", v: "Reads and proposes. Writes blocked" },
          { k: "auto", v: "Runs, with a classifier watching" },
        ],
      },
      {
        eyebrow: "Plan mode",
        headline: [["Read first.", "primary"], ["Write never,", "primary"], ["until you say.", "muted"]],
        body: "It explores the codebase and comes back with a plan. Nothing is written until you approve it. Best mode for a task you can’t yet describe precisely.",
      },
      {
        eyebrow: "Auto mode",
        headline: [["Not the same as", "primary"], ["no supervision.", "muted"]],
        body: "A classifier still blocks the things you’d regret — deploys, mass deletions, force pushes, anything leaking secrets. Speed without handing over the keys entirely.",
      },
      {
        eyebrow: "The habit",
        headline: [["Match the mode", "primary"], ["to the risk.", "accent"]],
        body: "Plan for anything architectural. acceptEdits for a refactor you understand. default when you’re somewhere unfamiliar. One keypress, not a setting you forget.",
        cta: "Follow for more",
      },
    ],
  },

  // 9. Context. /clear vs /compact is a genuinely common confusion.
  {
    slug: "v2-09-context",
    title: "Why it forgot what you said",
    slides: [
      {
        eyebrow: "Claude Code",
        headline: [["It forgot what", "primary"], ["you told it an", "primary"], ["hour ago.", "accent"]],
        body: "Not a bug. You ran out of context, and there are two different fixes.",
        cta: "Swipe",
      },
      {
        eyebrow: "The difference",
        headline: [["/compact is not", "primary"], ["/clear.", "danger"]],
        compare: {
          bad: {
            label: "/clear",
            code: "New conversation.\nEmpty context.",
            note: "Starts fresh. Use between unrelated tasks.",
          },
          good: {
            label: "/compact",
            code: "Same session,\nsummarised.",
            note: "Keeps the thread. Use mid-task when it’s getting full.",
          },
        },
        body: "Both keep CLAUDE.md — your instructions are never what gets dropped.",
      },
      {
        eyebrow: "See it first",
        headline: [["/context shows", "primary"], ["where it went.", "muted"]],
        body: "A coloured grid of what’s actually filling the window — which tools, which files, how much memory. Usually the answer is one enormous file you pasted an hour ago.",
      },
      {
        eyebrow: "Better",
        headline: [["Summarise from", "primary"], ["the midpoint.", "muted"]],
        body: "In the /rewind menu, “Summarize from here” compresses a verbose debugging stretch while leaving your original instructions intact. Sharper than compacting the lot.",
      },
      {
        eyebrow: "The habit",
        headline: [["Clear between", "primary"], ["tasks. Always.", "accent"]],
        body: "Most context problems are one long session doing four unrelated jobs. Finish a thing, /clear, start the next one clean.",
        cta: "Save this",
      },
    ],
  },

  // 10. Headless. The feature almost nobody uses, and the most impressive.
  {
    slug: "v2-10-headless",
    title: "Claude Code without the chat",
    slides: [
      {
        eyebrow: "Claude Code",
        headline: [["It runs without", "primary"], ["the chat", "primary"], ["window.", "accent"]],
        body: "One flag turns it into something you can script. Almost nobody uses this.",
        cta: "Swipe",
      },
      {
        eyebrow: "The flag",
        headline: [["-p, and it", "primary"], ["just answers.", "muted"]],
        terminal: {
          title: "zsh",
          lines: [
            ['claude -p "summarise today\'s commits"', "cmd"],
            ["", "out"],
            ["Three fixes shipped: hydration on", "out"],
            ["mobile, stale chat pricing, a webhook", "out"],
            ["missing payment_intent.succeeded.", "out"],
          ],
        },
        body: "Non-interactive. Runs, prints, exits — like any other command.",
      },
      {
        eyebrow: "Structured",
        headline: [["JSON out, so", "primary"], ["you can pipe it.", "muted"]],
        code: {
          file: "release.sh",
          lines: [
            [["claude", "fn"], [" -p ", "punct"], ['"write release notes"', "str"], [" \\", "punct"]],
            [["  --output-format", "key"], [" json ", "text"], ["\\", "punct"]],
            [["  --max-budget-usd", "key"], [" ", "text"], ["2.00", "num"]],
            "",
            [["# A spend cap, so a loop can’t", "comment"]],
            [["# run away with your bill.", "comment"]],
          ],
        },
      },
      {
        eyebrow: "What for",
        headline: [["The jobs nobody", "primary"], ["wants to do.", "muted"]],
        checks: [
          "Release notes from the commit log",
          "A first-pass review on every PR",
          "Triaging what broke overnight",
          "Codemods across a hundred files",
        ],
      },
      {
        eyebrow: "The shift",
        headline: [["It’s a tool, not", "primary"], ["just a chat.", "accent"]],
        body: "The moment it runs in a script, it stops being something you visit and starts being part of how the project builds itself.",
        cta: "Save this",
      },
    ],
  },

  // 11. Craft — the deck that sells the work without mentioning price.
  {
    slug: "v2-11-fast-sites",
    title: "Why your site feels slow",
    slides: [
      {
        eyebrow: "Craft",
        headline: [["Your site loads", "primary"], ["fast. It still", "primary"], ["feels slow.", "accent"]],
        body: "Speed you measure and speed people feel are two different things.",
        cta: "Swipe",
      },
      {
        eyebrow: "The jump",
        headline: [["Everything moves", "primary"], ["after it loads.", "danger"]],
        body: "An image without width and height reserves no space, so the text under it jumps when it arrives. It’s the single most common reason a fast site feels cheap.",
      },
      {
        eyebrow: "Fonts",
        headline: [["Invisible text,", "primary"], ["then a flash.", "muted"]],
        body: "A web font loading without a fallback strategy leaves the page blank, then repaints. font-display and a matched fallback metric make it a non-event.",
      },
      {
        eyebrow: "The real one",
        headline: [["Nothing responds", "primary"], ["for 200ms.", "muted"]],
        bars: [
          { label: "Feels instant", value: "under 100ms", pct: 96, on: true },
          { label: "Feels laggy", value: "over 200ms", pct: 38 },
        ],
        body: "A button that waits for the server before acknowledging the tap feels broken, even at 300ms. Respond immediately, reconcile after.",
      },
      {
        eyebrow: "The point",
        headline: [["Perceived speed", "primary"], ["is a design", "primary"], ["decision.", "accent"]],
        body: "Not a server upgrade. Reserve the space, own the first frame, answer every tap straight away.",
        cta: "Work with me",
      },
    ],
  },

  // 12. Solo-developer angle. The honest version of "one person can do this",
  //     which is also the most persuasive thing about the service.
  {
    slug: "v2-12-one-person",
    title: "How one person ships this much",
    slides: [
      {
        eyebrow: "Build in public",
        headline: [["One person.", "primary"], ["Accounts,", "primary"], ["payments, admin.", "accent"]],
        body: "Not because the work got smaller. Because nothing starts from an empty file now.",
        cta: "Swipe",
      },
      {
        eyebrow: "The stack",
        headline: [["Boring where", "primary"], ["it doesn’t show.", "muted"]],
        rows: [
          { k: "01", v: "Next.js — routing and rendering, solved" },
          { k: "02", v: "TypeScript — catches it before the user" },
          { k: "03", v: "Convex — realtime backend, zero ops" },
          { k: "04", v: "Stripe — payments you don’t rebuild" },
        ],
      },
      {
        eyebrow: "The multiplier",
        headline: [["Setup, not", "primary"], ["prompting.", "muted"]],
        body: "CLAUDE.md so conventions are never re-explained. Skills for anything done twice. Hooks for the rules that must not be talked past. The tooling knows the project.",
      },
      {
        eyebrow: "The honest part",
        headline: [["Review is now", "primary"], ["the whole job.", "danger"]],
        body: "Generating code stopped being the constraint, so judging it became the constraint. Everything shipped is still read line by line, because it’s still mine when it breaks.",
      },
      {
        eyebrow: "The result",
        headline: [["Fewer clients.", "primary"], ["Better work.", "accent"]],
        body: "Two builds at a time, built by the person you spoke to. That’s the entire model, and it only works because the tooling carries the parts that don’t need judgement.",
        cta: "Two slots — DM me",
        ctaHi: true,
      },
    ],
  },
  // =====================================================================
  // ROUND THREE — skills in depth, thinking control, and who to follow
  //
  // Skills frontmatter verified against code.claude.com/docs/en/skills.
  // `ultrathink` and the effort levels are from
  // code.claude.com/docs/en/model-config.
  //
  // Deliberately NOT taught as built-ins: /goal and similar commands that
  // come from third-party plugins or personal setups. They aren't in the
  // Claude Code docs, so a post presenting them as standard would send
  // people looking for something that isn't there. Deck 15 teaches the
  // mechanism that produces them instead, which is the transferable part.
  // =====================================================================

  // 13. Skills, properly. The single feature that changes how the tool works.
  {
    slug: "v2-13-skills",
    title: "Skills are the real unlock",
    slides: [
      {
        eyebrow: "Claude Code",
        headline: [["Stop pasting", "primary"], ["the same", "primary"], ["instructions.", "accent"]],
        body: "A skill turns a checklist you keep re-typing into a command. It’s the feature that changes how the tool works.",
        cta: "Swipe",
      },
      {
        eyebrow: "The file",
        headline: [["One folder.", "primary"], ["One SKILL.md.", "muted"]],
        code: {
          file: ".claude/skills/ship/SKILL.md",
          accentFile: true,
          lines: [
            [["---", "punct"]],
            [["name", "key"], [": ", "punct"], ["ship", "str"]],
            [["description", "key"], [": ", "punct"], ["Pre-deploy checklist", "str"]],
            [["---", "punct"]],
            "",
            [["1. Typecheck, then build.", "text"]],
            [["2. Prices match pricing.ts?", "text"]],
            [["3. No secrets in the bundle.", "text"]],
          ],
        },
        body: "That’s the whole thing. It becomes /ship.",
      },
      {
        eyebrow: "Why it beats CLAUDE.md",
        headline: [["It costs nothing", "primary"], ["until it’s used.", "accent"]],
        bars: [
          { label: "CLAUDE.md — loads every session", value: "always", pct: 100 },
          { label: "SKILL.md — loads when invoked", value: "on demand", pct: 22, on: true },
        ],
        body: "So a long reference document is free to keep. Move anything from CLAUDE.md that’s a procedure rather than a fact.",
      },
      {
        eyebrow: "Who invokes it",
        headline: [["Two switches", "primary"], ["worth knowing.", "muted"]],
        compare: {
          neutral: true,
          bad: {
            label: "You only",
            code: "disable-model-\n  invocation: true",
            note: "For anything with side effects. Claude shouldn’t decide to deploy.",
          },
          good: {
            label: "Claude only",
            code: "user-invocable:\n  false",
            note: "For background knowledge that isn’t a useful command.",
          },
        },
      },
      {
        eyebrow: "The rule",
        headline: [["Written twice?", "primary"], ["Make it a skill.", "accent"]],
        body: "Skills follow the open Agent Skills standard, so they aren’t locked to one tool. The second time you paste a procedure, you’ve found your next one.",
        cta: "Save this",
      },
    ],
  },

  // 14. Thinking control. Genuinely underused, and trivially actionable.
  {
    slug: "v2-14-ultrathink",
    title: "Make it think harder",
    slides: [
      {
        eyebrow: "Claude Code",
        headline: [["One word makes", "primary"], ["it think", "primary"], ["harder.", "accent"]],
        body: "It’s in the docs, it costs nothing, and almost nobody types it.",
        cta: "Swipe",
      },
      {
        eyebrow: "The word",
        headline: [["ultrathink.", "accent"], ["Anywhere in the", "primary"], ["prompt.", "muted"]],
        terminal: {
          title: "claude",
          lines: [
            ["ultrathink — why does this only", "cmd"],
            ["fail in production?", "cmd"],
            ["", "out"],
            ["Thinking…", "ok"],
          ],
        },
        body: "Not a mode you switch on. A keyword you include, for the one question that deserves it.",
      },
      {
        eyebrow: "When",
        headline: [["Hard calls, not", "primary"], ["easy edits.", "muted"]],
        checks: [
          "A bug that only happens in production",
          "Choosing between two architectures",
          "Anything you’d normally sleep on",
          "Reviewing your own reasoning",
        ],
      },
      {
        eyebrow: "The dial",
        headline: [["Or set effort", "primary"], ["per skill.", "muted"]],
        code: {
          file: "SKILL.md",
          lines: [
            [["---", "punct"]],
            [["name", "key"], [": ", "punct"], ["architecture-review", "str"]],
            [["effort", "key"], [": ", "punct"], ["high", "accent"]],
            [["---", "punct"]],
            "",
            [["# low · medium · high · xhigh · max", "comment"]],
          ],
        },
        body: "Overrides the session level whenever that skill runs.",
      },
      {
        eyebrow: "The habit",
        headline: [["Cheap for the", "primary"], ["hard 5%.", "accent"]],
        body: "Most prompts don’t need it. The ones where being wrong costs you a day absolutely do — and it’s one word.",
        cta: "Follow for more",
      },
    ],
  },

  // 15. Automation via hooks. This is the honest, transferable version of the
  //     "/goal" style commands people see and can't find in the docs.
  {
    slug: "v2-15-hooks-automation",
    title: "Make it keep going",
    slides: [
      {
        eyebrow: "Claude Code",
        headline: [["Make it finish", "primary"], ["the job without", "primary"], ["you.", "accent"]],
        body: "The commands you’ve seen that keep an agent working are mostly hooks. Here’s the actual mechanism.",
        cta: "Swipe",
      },
      {
        eyebrow: "The event",
        headline: [["Stop fires when", "primary"], ["it tries to stop.", "muted"]],
        body: "A Stop hook can refuse. Claude wanted to finish the turn; the hook says the goal isn’t met yet, and it carries on. That’s the whole trick behind “keep going until done”.",
      },
      {
        eyebrow: "The others",
        headline: [["Four you’ll", "primary"], ["actually use.", "muted"]],
        steps: [
          { k: "PreToolUse", v: "Block a command before it runs" },
          { k: "PostToolUse", v: "Format or lint after every edit" },
          { k: "SessionStart", v: "Load context at the start of each session" },
          { k: "Stop", v: "Refuse to finish until the work is done" },
        ],
      },
      {
        eyebrow: "The honest bit",
        headline: [["Not every command", "primary"], ["is built in.", "danger"]],
        body: "A lot of the slash commands in demos come from plugins or someone’s personal setup. If it isn’t in the docs, it isn’t standard — but you can usually build it yourself from a hook and a skill.",
      },
      {
        eyebrow: "The shift",
        headline: [["Configuration", "primary"], ["beats prompting.", "accent"]],
        body: "Prompting harder has a ceiling. A hook is a file you commit, so it works the same tomorrow, next month, and for anyone else who clones the repo.",
        cta: "Save this",
      },
    ],
  },

  // 16. Who to follow. Names verified as real, active creators; framed as a
  //     recommendation rather than an endorsement of specific claims.
  {
    slug: "v2-16-who-to-follow",
    title: "Who to actually follow",
    slides: [
      {
        eyebrow: "AI + Claude Code",
        headline: [["Who to follow,", "primary"], ["if you want", "primary"], ["signal.", "accent"]],
        body: "Most AI content is hype. These people ship things and show the work.",
        cta: "Swipe",
      },
      {
        eyebrow: "Automation",
        headline: [["Nate Herk", "accent"], ["— n8n and", "primary"], ["AI agents.", "muted"]],
        body: "Left Goldman Sachs for automation full time. Builds real n8n workflows and agent systems on camera, for people who don’t come from a technical background.",
      },
      {
        eyebrow: "More worth a follow",
        headline: [["Four others", "primary"], ["doing the work.", "muted"]],
        rows: [
          { k: "01", v: "Nick Saraev — automation as a business" },
          { k: "02", v: "Jono Catliff — no-code, end to end" },
          { k: "03", v: "Simon Scrapes — scraping and pipelines" },
          { k: "04", v: "Anthropic’s own docs — the actual source" },
        ],
      },
      {
        eyebrow: "The filter",
        headline: [["Do they show", "primary"], ["the failures?", "muted"]],
        body: "Anyone whose builds always work first try is editing, not teaching. The useful channels show the thing breaking and what they did about it.",
      },
      {
        eyebrow: "The best source",
        headline: [["Still the docs.", "primary"], ["Genuinely.", "accent"]],
        body: "Every Claude Code deck I post is checked against code.claude.com before it goes out. Tutorials go stale in weeks. The docs are updated the day the feature ships.",
        cta: "Follow for more",
      },
    ],
  },
];

module.exports = { carousels, HANDLE };
