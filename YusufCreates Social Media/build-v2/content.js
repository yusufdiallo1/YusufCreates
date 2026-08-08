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
  // =====================================================================
  // ROUND FOUR — tooling, MCP, subagents, and the people worth following
  //
  // On the creator decks: monogram avatars, never photographs. A real
  // headshot is the subject's copyright, and putting someone's face on a
  // branded post implies an endorsement they never gave. Every line about
  // a named person is a sourced fact, and the one quote is explicitly
  // labelled a paraphrase — inventing a quotation and attributing it is
  // both dishonest and the kind of thing this audience checks.
  // =====================================================================

  // 17. The splash. Opens the set — instantly recognisable to the audience.
  {
    slug: "v2-17-first-session",
    title: "Your first five minutes",
    slides: [
      {
        eyebrow: "Claude Code",
        headline: [["This screen,", "primary"], ["then most", "primary"], ["people guess.", "accent"]],
        body: "Five minutes of setup decides whether it’s a chat window or a system that knows your project.",
        cta: "Swipe",
      },
      {
        eyebrow: "What you see",
        headline: [["Read the", "primary"], ["banner.", "muted"]],
        splash: {
          title: "Terminal",
          version: "v2.1.220",
          model: "Opus 5 (1M context) with high effort",
          cwd: "~/YusufCreates/YusufCreates",
          warning: "3 MCP servers need authentication · run /mcp",
          footer: "shift+tab to cycle modes",
        },
        body: "Model, context size, effort, directory. Every one of those is a setting you can change.",
      },
      {
        eyebrow: "Minute one",
        headline: [["Run /init.", "accent"], ["Then edit it.", "muted"]],
        body: "It writes a CLAUDE.md by reading your codebase. The generated file is a starting point, not the answer — cut it down to what’s actually true and keep it short.",
      },
      {
        eyebrow: "Minute two",
        headline: [["Check where", "primary"], ["you are.", "muted"]],
        steps: [
          { k: "/context", v: "What is filling the window right now" },
          { k: "/doctor", v: "Setup problems, and it can fix them" },
          { k: "/mcp", v: "Which servers are connected" },
          { k: "Shift+Tab", v: "Pick a permission mode before you start" },
        ],
      },
      {
        eyebrow: "The habit",
        headline: [["Set up once.", "primary"], ["Benefit daily.", "accent"]],
        body: "Everyone types their first prompt in under a minute. The people getting real value spent five on this screen first.",
        cta: "Save this",
      },
    ],
  },

  // 18. MCP. Verified against the docs; kept conceptual, since server lists move.
  {
    slug: "v2-18-mcp",
    title: "Connect it to your actual tools",
    slides: [
      {
        eyebrow: "Claude Code",
        headline: [["Stop pasting", "primary"], ["data into the", "primary"], ["chat.", "accent"]],
        body: "MCP lets it query your tools directly. Most people never connect one.",
        cta: "Swipe",
      },
      {
        eyebrow: "The idea",
        headline: [["One protocol,", "primary"], ["any tool.", "muted"]],
        compare: {
          neutral: true,
          bad: {
            label: "Without",
            code: "copy → paste\n→ hope",
            note: "You become the integration. Stale the moment you paste it.",
          },
          good: {
            label: "With MCP",
            code: "it queries\nthe source",
            note: "Live data, every time it asks.",
          },
        },
      },
      {
        eyebrow: "What connects",
        headline: [["Your stack,", "primary"], ["already.", "muted"]],
        rows: [
          { k: "01", v: "GitHub — issues, PRs, workflows" },
          { k: "02", v: "Databases — query the real schema" },
          { k: "03", v: "Figma — read the actual design" },
          { k: "04", v: "Sentry, Linear, Slack, Notion" },
        ],
      },
      {
        eyebrow: "Setup",
        headline: [["Config, not", "primary"], ["code.", "muted"]],
        terminal: {
          title: "zsh",
          lines: [
            ["claude", "cmd"],
            ["", "out"],
            ["3 MCP servers need authentication", "bad"],
            ["run /mcp", "out"],
            ["", "out"],
            ["→ /mcp, authenticate, done", "ok"],
          ],
        },
        body: "An open standard, so the same servers work in other tools too.",
      },
      {
        eyebrow: "The shift",
        headline: [["It stops", "primary"], ["guessing about", "primary"], ["your system.", "accent"]],
        body: "The difference between an assistant that reasons about your codebase and one that can actually look at the database it’s writing queries against.",
        cta: "Save this",
      },
    ],
  },

  // 19. Subagents in depth — the follow-up to deck 02's one-slide version.
  {
    slug: "v2-19-subagents",
    title: "Delegate to a fresh context",
    slides: [
      {
        eyebrow: "Claude Code",
        headline: [["Your context is", "primary"], ["full of things you", "primary"], ["won’t read again.", "accent"]],
        body: "Every file it searched is still sitting there, crowding out the work. Subagents fix that.",
        cta: "Swipe",
      },
      {
        eyebrow: "The file",
        headline: [["An agent is", "primary"], ["just markdown.", "muted"]],
        code: {
          file: ".claude/agents/auditor.md",
          accentFile: true,
          lines: [
            [["---", "punct"]],
            [["name", "key"], [": ", "punct"], ["auditor", "str"]],
            [["description", "key"], [": ", "punct"], ["Reviews, never edits", "str"]],
            [["tools", "key"], [": ", "punct"], ["[Read, Grep, Glob]", "str"]],
            [["---", "punct"]],
            "",
            [["Report findings. Do not fix them.", "text"]],
          ],
        },
      },
      {
        eyebrow: "Why it works",
        headline: [["It reads a lot.", "primary"], ["You see the", "primary"], ["answer.", "muted"]],
        bars: [
          { label: "Inline — every file lands in your context", value: "crowded", pct: 94 },
          { label: "Subagent — only the conclusion comes back", value: "clean", pct: 26, on: true },
        ],
      },
      {
        eyebrow: "The safety",
        headline: [["Take away the", "primary"], ["write tools.", "accent"]],
        body: "An agent given only Read and Grep cannot edit anything, whatever it decides. That’s a guarantee from the tool list, not a promise in a prompt.",
      },
      {
        eyebrow: "The catch",
        headline: [["Rewind won’t", "primary"], ["undo them.", "danger"]],
        body: "Subagent edits land outside your session’s checkpoints. If one writes, use git — /rewind won’t bring it back.",
        cta: "Save this",
      },
    ],
  },

  // 20. Cursor Tab vs Agent — the other half of the audience.
  {
    slug: "v2-20-cursor-agent",
    title: "Tab or Agent",
    slides: [
      {
        eyebrow: "Cursor",
        headline: [["You’re using", "primary"], ["Cursor like", "primary"], ["autocomplete.", "accent"]],
        body: "Tab is the famous part. Agent is the part that does the work.",
        cta: "Swipe",
      },
      {
        eyebrow: "The split",
        headline: [["Two different", "primary"], ["tools.", "muted"]],
        compare: {
          neutral: true,
          bad: {
            label: "Tab",
            code: "predicts your\nnext edit",
            note: "Fast, local, inline. Best when you already know the shape.",
          },
          good: {
            label: "Agent",
            code: "plans across\nfiles",
            note: "Reads the codebase, edits many files, runs commands.",
          },
        },
      },
      {
        eyebrow: "Plan first",
        headline: [["Say what, not", "primary"], ["how.", "muted"]],
        body: "Agent works best on an outcome — “make the checkout handle a declined card” — not a sequence of instructions. If you already know every step, Tab is faster.",
      },
      {
        eyebrow: "Give it rules",
        headline: [["It doesn’t know", "primary"], ["your conventions.", "muted"]],
        body: "Without .cursor/rules or AGENTS.md it writes generic code that passes review and doesn’t match anything around it. Rules are what make Agent output look like your codebase.",
      },
      {
        eyebrow: "The habit",
        headline: [["Tab for typing.", "primary"], ["Agent for", "primary"], ["thinking.", "accent"]],
        body: "Most people use one and ignore the other. They solve genuinely different problems, and knowing which you’re in is most of the skill.",
        cta: "Follow for more",
      },
    ],
  },

  // 21. The prompt-quality deck. Applies to every tool.
  {
    slug: "v2-21-better-prompts",
    title: "Why it keeps missing",
    slides: [
      {
        eyebrow: "Craft",
        headline: [["It keeps giving", "primary"], ["you the wrong", "primary"], ["thing.", "accent"]],
        body: "Usually the prompt described a solution instead of a problem.",
        cta: "Swipe",
      },
      {
        eyebrow: "The swap",
        headline: [["Outcome beats", "primary"], ["instruction.", "muted"]],
        compare: {
          bad: {
            label: "Vague",
            code: "make the form\nbetter",
            note: "Better how? It has to guess, and it guesses generically.",
          },
          good: {
            label: "Specific",
            code: "show errors\ninline, on blur",
            note: "One outcome, checkable. It either did that or it didn’t.",
          },
        },
      },
      {
        eyebrow: "Give it the map",
        headline: [["Point at the", "primary"], ["files.", "muted"]],
        body: "@-mention the file instead of describing it. Reading the real thing beats inferring it from your summary, every time.",
      },
      {
        eyebrow: "Say what not to do",
        headline: [["Constraints are", "primary"], ["the useful part.", "muted"]],
        checks: [
          "Don’t add a dependency for this",
          "Match the pattern in the file above",
          "Leave the public API unchanged",
          "Show me the plan before editing",
        ],
      },
      {
        eyebrow: "The rule",
        headline: [["If you can’t", "primary"], ["check it, it", "primary"], ["can’t hit it.", "accent"]],
        body: "Before sending, ask how you’d know it succeeded. If you can’t answer, neither can it — and that’s the prompt to rewrite.",
        cta: "Save this",
      },
    ],
  },

  // 22. Nate Herk. Facts only, and the quote explicitly a paraphrase.
  {
    slug: "v2-22-nate-herk",
    title: "Nate Herk",
    slides: [
      {
        eyebrow: "Who to follow",
        headline: [["He left Goldman", "primary"], ["Sachs to build", "primary"], ["automations.", "accent"]],
        body: "Nate Herk is the clearest teacher in AI automation right now. Here’s what’s worth taking from him.",
        cta: "Swipe",
      },
      {
        eyebrow: "The person",
        headline: [["Real builds,", "primary"], ["on camera.", "muted"]],
        people: [
          {
            initials: "NH",
            name: "Nate Herk",
            handle: "@nateherk",
            note: "Founder of Uppit AI. Teaches n8n workflows and AI agents to people who don’t come from a technical background.",
          },
        ],
        body: "30M+ views, and the largest AI automation community on Skool.",
      },
      {
        eyebrow: "His 2026 call",
        headline: [["Speed to lead.", "accent"]],
        quote: {
          text: "Speed-to-lead is the number one workflow to build in 2026.",
          initials: "NH",
          name: "Nate Herk",
          source: "Paraphrased from his 2026 automation guidance",
        },
      },
      {
        eyebrow: "Why it holds",
        headline: [["Answer first,", "primary"], ["win the job.", "muted"]],
        bars: [
          { label: "Reply within 5 minutes", value: "you win it", pct: 91, on: true },
          { label: "Reply the next day", value: "they moved on", pct: 24 },
        ],
        body: "Nothing clever in it. The first credible reply usually takes the work, and that’s an automation, not a personality trait.",
      },
      {
        eyebrow: "The filter",
        headline: [["Watch who", "primary"], ["shows the", "primary"], ["failures.", "accent"]],
        body: "His builds break on camera and he fixes them. That’s the difference between teaching and editing — and it’s the thing to look for in anyone you follow.",
        cta: "Follow for more",
      },
    ],
  },

  // 23. The wider list, as cards.
  {
    slug: "v2-23-follow-list",
    title: "Five worth following",
    slides: [
      {
        eyebrow: "AI + Claude Code",
        headline: [["Five people", "primary"], ["worth your", "primary"], ["feed.", "accent"]],
        body: "Most AI content is a thumbnail and a promise. These ship things.",
        cta: "Swipe",
      },
      {
        eyebrow: "Automation",
        headline: [["Builders, not", "primary"], ["announcers.", "muted"]],
        people: [
          {
            initials: "NH",
            name: "Nate Herk",
            handle: "@nateherk",
            note: "n8n workflows and AI agents, built end to end on camera.",
          },
          {
            initials: "NS",
            name: "Nick Saraev",
            handle: "nicksaraev.com",
            note: "Automation as an actual business, not just a demo.",
          },
        ],
      },
      {
        eyebrow: "More",
        headline: [["Different", "primary"], ["angles.", "muted"]],
        people: [
          {
            initials: "JC",
            name: "Jono Catliff",
            handle: "no-code",
            note: "End-to-end no-code builds for non-technical founders.",
          },
          {
            initials: "SS",
            name: "Simon Scrapes",
            handle: "scraping",
            note: "Scraping and data pipelines — the unglamorous half that makes agents useful.",
          },
        ],
      },
      {
        eyebrow: "The best one",
        headline: [["Still the docs.", "primary"], ["Genuinely.", "accent"]],
        people: [
          {
            initials: "AI",
            name: "code.claude.com/docs",
            handle: "the source",
            note: "Updated the day a feature ships. Every Claude Code deck I post is checked against it first.",
          },
        ],
      },
      {
        eyebrow: "The filter",
        headline: [["Do they show", "primary"], ["it breaking?", "accent"]],
        body: "Anyone whose builds always work first try is editing, not teaching. Follow the ones who leave the failure in.",
        cta: "Comment who I missed",
      },
    ],
  },

  // 24. Cost. Honest, and it maps to the service.
  {
    slug: "v2-24-cost",
    title: "Where the money goes",
    slides: [
      {
        eyebrow: "Claude Code",
        headline: [["Your context is", "primary"], ["the bill.", "accent"]],
        body: "Not the number of prompts. The amount you’re carrying when you send them.",
        cta: "Swipe",
      },
      {
        eyebrow: "See it",
        headline: [["/cost and", "primary"], ["/context.", "muted"]],
        body: "One shows what this session has spent. The other shows what’s filling the window — usually a giant file pasted an hour ago and never used again.",
      },
      {
        eyebrow: "The habit",
        headline: [["Clear between", "primary"], ["tasks.", "muted"]],
        bars: [
          { label: "One long session, four jobs", value: "expensive", pct: 88 },
          { label: "/clear between each", value: "cheap", pct: 31, on: true },
        ],
        body: "You pay to re-send everything already in the window. A stale conversation costs money on every turn.",
      },
      {
        eyebrow: "Delegate",
        headline: [["Send the reading", "primary"], ["elsewhere.", "muted"]],
        body: "A subagent with a smaller model can do the searching and hand back a paragraph. You pay for a thousand lines once, in its context, not in yours forever.",
      },
      {
        eyebrow: "The cap",
        headline: [["Set a ceiling", "primary"], ["on scripts.", "accent"]],
        code: {
          file: "ci.sh",
          lines: [
            [["claude", "fn"], [" -p ", "punct"], ['"review this PR"', "str"], [" \\", "punct"]],
            [["  --max-budget-usd", "key"], [" ", "text"], ["2.00", "num"]],
            "",
            [["# A loop that misbehaves stops", "comment"]],
            [["# at two dollars, not two hundred.", "comment"]],
          ],
        },
        cta: "Save this",
      },
    ],
  },

  // 25. Git discipline. The counterweight to every "let it run" post.
  {
    slug: "v2-25-git-discipline",
    title: "Commit before you let it run",
    slides: [
      {
        eyebrow: "Hard truths",
        headline: [["Let it run.", "primary"], ["But commit", "primary"], ["first.", "danger"]],
        body: "Every “I let the agent go wild” story that ends badly has the same missing step.",
        cta: "Swipe",
      },
      {
        eyebrow: "The gap",
        headline: [["Checkpoints", "primary"], ["aren’t history.", "muted"]],
        compare: {
          bad: {
            label: "Checkpoints",
            code: "session only\n30 days",
            note: "Gone with the session. No bash changes, no subagent edits.",
          },
          good: {
            label: "Git",
            code: "permanent\nbranchable",
            note: "Everything, forever, and someone else can read it.",
          },
        },
      },
      {
        eyebrow: "The move",
        headline: [["A branch costs", "primary"], ["you nothing.", "muted"]],
        terminal: {
          title: "zsh",
          lines: [
            ["git checkout -b agent-refactor", "cmd"],
            ["git commit -am 'before'", "cmd"],
            ["", "out"],
            ["now let it do whatever it wants", "ok"],
          ],
        },
      },
      {
        eyebrow: "Review",
        headline: [["Read the diff,", "primary"], ["not the summary.", "muted"]],
        body: "The summary is written by the thing that made the changes. git diff is written by git. Only one of those is evidence.",
      },
      {
        eyebrow: "The rule",
        headline: [["Autonomy needs", "primary"], ["an undo.", "accent"]],
        body: "The faster you let it work, the more you need a clean commit behind you. That’s not caution — it’s what makes going fast survivable.",
        cta: "Save this",
      },
    ],
  },

  // 26. The closer. Ties tooling back to the service without a price.
  {
    slug: "v2-26-what-changed",
    title: "What actually changed",
    slides: [
      {
        eyebrow: "Build in public",
        headline: [["The job changed.", "primary"], ["Not the", "primary"], ["standard.", "accent"]],
        body: "A year of building with these tools, honestly summarised.",
        cta: "Swipe",
      },
      {
        eyebrow: "Faster",
        headline: [["Nothing starts", "primary"], ["from empty.", "muted"]],
        body: "Scaffolding, boilerplate, the third CRUD screen, the migration nobody wants to write. That work didn’t get easier — it got delegated.",
      },
      {
        eyebrow: "Harder",
        headline: [["Reviewing is", "primary"], ["now the job.", "danger"]],
        bars: [
          { label: "Time writing code", value: "way down", pct: 28 },
          { label: "Time reading code", value: "way up", pct: 86, on: true },
        ],
        body: "Generating stopped being the constraint, so judging became the constraint.",
      },
      {
        eyebrow: "Unchanged",
        headline: [["It’s yours when", "primary"], ["it breaks.", "muted"]],
        body: "Nobody accepts “the AI wrote it” at 2am. Everything I ship is still read line by line, because the responsibility never moved.",
      },
      {
        eyebrow: "The result",
        headline: [["Two builds.", "primary"], ["One person.", "accent"]],
        body: "Fewer clients at once, built by the person you spoke to. The tooling carries the parts that don’t need judgement — that’s the whole model.",
        cta: "Two slots — DM me",
        ctaHi: true,
      },
    ],
  },

  // =====================================================================
  // APPLE — macOS 27 "Golden Gate" / iOS 27, all on the goldengate theme
  // =====================================================================
  //
  // Eight decks, one release. Every claim was checked against live sources in
  // August 2026 rather than recalled — Apple's own newsroom post and WWDC26
  // session pages where they exist, MacRumors' iOS 27 and macOS 27 roundups and
  // 9to5Mac otherwise. The rule from the top of this file applies hardest here,
  // because this audience has the betas installed and will check.
  //
  // Excluded on purpose: the unconfirmed "MacBook Neo" model name, Icon Composer
  // and SF Symbols version numbers, Apple Intelligence RAM tiers, and any
  // subscription price. Anthropic's and Google's Foundation Models packages are
  // described as announced rather than shipping, because that is what Apple
  // said — "soon" — and shipping is the part developers would act on.

  // 27. The headline change, and the one non-developers also feel.
  {
    slug: "v2-27-liquid-glass",
    title: "Apple just fixed Liquid Glass",
    theme: "goldengate",
    slides: [
      {
        eyebrow: "macOS 27 · Golden Gate",
        headline: [["Apple just", "primary"], ["fixed", "accent"], ["Liquid Glass.", "primary"]],
        body: "Golden Gate ships in September. Here's what actually changed.",
        glassTile: { glyph: "27", size: 292 },
        graphicTop: true,
        cta: "Swipe",
      },
      {
        eyebrow: "The fix everyone asked for",
        headline: [["One slider.", "primary"], ["Clear to tinted.", "accent"]],
        body: "iOS 26 gave you two looks and made you pick. 27 gives you the whole range in between, systemwide — and it still respects Reduce Transparency and Increase Contrast.",
        glassSlider: {
          label: "Liquid Glass",
          value: 58,
          min: "Clear",
          max: "Tinted",
          caption: "System Settings → Appearance",
          samples: [
            { tint: 0.05, label: "Clear" },
            { tint: 0.45, label: "Mid" },
            { tint: 0.88, label: "Tinted" },
          ],
        },
      },
      {
        eyebrow: "The material",
        headline: [["Darker edges.", "primary"], ["Brighter highlights.", "accent"]],
        body: "The glass now diffuses busy content instead of smearing it — which was the actual complaint, not the transparency.",
        versus: {
          before: {
            tag: "Tahoe 26",
            sample: "Hard to read",
            tint: 0.22,
            lines: ["Thin, even rim", "Content bled through", "Contrast fought the wallpaper"],
          },
          after: {
            tag: "Golden Gate 27",
            sample: "Easy to read",
            tint: 0.5,
            lines: ["Darkened edge inside the rim", "Brighter specular highlight", "Diffuses what's behind it"],
          },
        },
      },
      {
        eyebrow: "What it means for you",
        headline: [["Your UI has to", "primary"], ["work at both ends.", "muted"]],
        body: "The slider belongs to the user, not to your app. A layout that only holds up at one setting is a layout that breaks for somebody.",
        checks: [
          "Test at fully clear and fully tinted",
          "Never rely on blur alone for legibility",
          "Give text a real fill behind it",
          "Re-check every overlay and floating bar",
        ],
      },
      {
        eyebrow: "The catch",
        headline: [["Apple silicon", "primary"], ["only.", "accent"]],
        body: "Golden Gate is also the last release with full Rosetta 2, so Intel apps are on a timer too.",
        checks: [
          "M1 or newer — Intel Macs end at Tahoe",
          "Last release with full Rosetta 2",
          "Public beta is out now",
          "Ships September 2026",
        ],
        cta: "iOS & macOS builds — DM me",
        ctaHi: true,
      },
    ],
  },

  // 28. The structural half of the redesign. Less screenshotted than the
  // material, more likely to break an actual layout.
  {
    slug: "v2-28-mac-windows",
    title: "Sidebars stopped floating",
    theme: "goldengate",
    slides: [
      {
        eyebrow: "macOS 27 · Windows",
        headline: [["Sidebars stopped", "primary"], ["floating.", "accent"]],
        body: "The half of the redesign nobody screenshots — and the half most likely to break your layout.",
        cta: "Swipe",
      },
      {
        eyebrow: "The window",
        headline: [["Four changes", "primary"], ["at once.", "muted"]],
        macWindow: {
          title: "General",
          sidebar: [
            { label: "Wi-Fi", color: "#3d7ff2" },
            { label: "Bluetooth", color: "#3d7ff2" },
            { label: "Battery", color: "#3fb950" },
            { label: "General", color: "#8a8578", on: true },
            { label: "Appearance", color: "#c0762f" },
          ],
          rows: [
            { label: "About", color: "#8a8578" },
            { label: "Software Update", color: "#3d7ff2" },
            { label: "Storage", color: "#8a8578" },
            { label: "AppleCare & Warranty", color: "#e5484d" },
          ],
          notes: ["Edge-to-edge sidebar", "Uniform toolbar", "Tighter corners"],
        },
      },
      {
        eyebrow: "One by one",
        headline: [["What moved.", "primary"]],
        rows: [
          { k: "01", v: "Sidebars run to the window edge instead of floating inset" },
          { k: "02", v: "Coloured sidebar icons are back after Tahoe greyed them out" },
          { k: "03", v: "Corner radii are uniform again, not dramatically rounded" },
          { k: "04", v: "Window shadows retuned so active and inactive read apart" },
        ],
      },
      {
        eyebrow: "The toolbar",
        headline: [["Scrolling under", "primary"], ["a bar is solved.", "accent"]],
        body: "When content scrolls beneath a floating bar, a uniform toolbar now keeps the text legible. Standard toolbars get it automatically — custom ones go through the scroll edge effect APIs.",
        checks: [
          "Automatic for standard toolbars",
          "Custom bars: scroll edge effect APIs",
          "Check anything you drew yourself",
        ],
      },
      {
        eyebrow: "Before September",
        headline: [["Open your app", "primary"], ["on the beta.", "muted"]],
        body: "Every one of these is a layout change, not a repaint. The gap between \"it still compiles\" and \"it still looks right\" is where these releases hurt.",
        cta: "iOS & macOS builds — DM me",
        ctaHi: true,
      },
    ],
  },

  // 29. Icons. The one thing every shipping app has to redo by hand.
  {
    slug: "v2-29-app-icons",
    title: "Icons bend light on purpose now",
    theme: "goldengate",
    slides: [
      {
        eyebrow: "iOS 27 · Icons",
        headline: [["Icons bend light", "primary"], ["on purpose now.", "accent"]],
        body: "Refraction became a per-layer control. Your flat PNG is the thing that looks dated.",
        glassTile: { glyph: "27", size: 292 },
        graphicTop: true,
        cta: "Swipe",
      },
      {
        eyebrow: "Per layer",
        headline: [["Selectively", "primary"], ["applied.", "accent"]],
        body: "A layer can pick up and bend what sits behind it — or stay flat. It's a dial, not a switch, and it's set per layer rather than per icon.",
        glassTile: {
          tiles: [
            { glyph: "27", refraction: 0, caption: "No refraction" },
            { glyph: "27", refraction: 0.5, caption: "Subtle" },
            { glyph: "27", refraction: 1, caption: "Full", on: true },
          ],
        },
      },
      {
        eyebrow: "The tool",
        headline: [["Icon Composer", "primary"], ["was rebuilt.", "muted"]],
        rows: [
          { k: "01", v: "Build the icon from multiple Liquid Glass layers" },
          { k: "02", v: "Annotate a layer to add refraction or tune content effects" },
          { k: "03", v: "Interactive preview shows how it actually renders" },
        ],
      },
      {
        eyebrow: "Also sharper",
        headline: [["Artwork got", "primary"], ["its contrast back.", "accent"]],
        body: "Icons render with more definition than 26, and the glass reads as a finish over your artwork rather than an overlay on top of it. That was the other half of the complaint.",
      },
      {
        eyebrow: "What to do",
        headline: [["Re-cut it", "primary"], ["as layers.", "muted"]],
        body: "One flattened image can't participate in any of this. Splitting the artwork back into layers is the whole job, and it's the one thing you can't automate.",
        cta: "Need it done? DM me",
        ctaHi: true,
      },
    ],
  },

  // 30. The biggest developer story of the release, and the one most relevant
  // to an audience that already uses Claude every day.
  {
    slug: "v2-30-foundation-models",
    title: "Apple opened Foundation Models to any LLM",
    theme: "goldengate",
    slides: [
      {
        eyebrow: "WWDC26 · Foundation Models",
        headline: [["Apple opened", "primary"], ["its AI framework", "primary"], ["to everyone.", "accent"]],
        body: "Any LLM provider can now plug into the framework Apple's own models use.",
        cta: "Swipe",
      },
      {
        eyebrow: "The shape of it",
        headline: [["One call site.", "primary"], ["Any model.", "accent"]],
        body: "Swap the model, keep the code. Every model conforms to the same protocol, so the session API never changes.",
        code: {
          file: "Chat.swift",
          lines: [
            [["import ", "key"], ["FoundationModels", "text"]],
            "",
            [["let ", "key"], ["model", "text"], [" = ", "punct"], ["SystemLanguageModel", "fn"], ["()", "punct"]],
            [["// or PrivateCloudComputeLanguageModel()", "comment"]],
            [["// or MLXLanguageModel(modelID:)", "comment"]],
            "",
            [["let ", "key"], ["session", "text"], [" = ", "punct"], ["LanguageModelSession", "fn"], ["(model: model)", "punct"]],
            [["let ", "key"], ["reply", "text"], [" = ", "punct"], ["try await ", "key"], ["session", "text"], [".", "punct"], ["respond", "fn"], ["(to: prompt)", "punct"]],
          ],
        },
      },
      {
        eyebrow: "Who's coming",
        headline: [["Claude and Gemini,", "primary"], ["as Swift packages.", "accent"]],
        body: "Anthropic and Google are both shipping packages that extend the framework. Announced at WWDC26 as coming soon — not in your Package.resolved yet.",
        checks: [
          "A provider ships one Swift package",
          "It implements LanguageModel + LanguageModelExecutor",
          "Your app selects it and calls it identically",
        ],
      },
      {
        eyebrow: "Also open",
        headline: [["The framework", "primary"], ["core is going", "primary"], ["open source.", "accent"]],
        rows: [
          { k: "01", v: "CoreAILanguageModel for local models" },
          { k: "02", v: "MLXLanguageModel for anything on Hugging Face" },
          { k: "03", v: "A Python SDK, and an fm CLI on macOS 27" },
        ],
      },
      {
        eyebrow: "Why it matters",
        headline: [["Model choice", "primary"], ["stopped being", "primary"], ["a rewrite.", "accent"]],
        body: "The provider used to be baked into the integration. Now it's a line. That changes what it costs to be wrong about which model you picked.",
        cta: "Building with this? DM me",
        ctaHi: true,
      },
    ],
  },

  // 31. The on-device model itself. Concrete APIs, because this audience wants
  // the names, not the adjectives.
  {
    slug: "v2-31-on-device-ai",
    title: "The on-device model can see now",
    theme: "goldengate",
    slides: [
      {
        eyebrow: "iOS 27 · On-device AI",
        headline: [["The on-device", "primary"], ["model can", "primary"], ["see now.", "accent"]],
        body: "Images go straight into the prompt. Free, local, and offline.",
        cta: "Swipe",
      },
      {
        eyebrow: "Multimodal",
        headline: [["Attach an image", "primary"], ["to a prompt.", "accent"]],
        code: {
          file: "Scan.swift",
          lines: [
            [["let ", "key"], ["response", "text"], [" = ", "punct"], ["try await ", "key"], ["session", "text"], [".", "punct"], ["respond", "fn"], [" {", "punct"]],
            [["  ", "text"], ["\"What animal is this?\"", "str"]],
            [["  ", "text"], ["Attachment", "fn"], ["(", "punct"], ["UIImage", "fn"], ["(…))", "punct"]],
            [["}", "punct"]],
          ],
        },
        body: "UIImage, NSImage, CGImage, Core Image, CoreVideo buffers or a file URL — any size, any aspect ratio.",
      },
      {
        eyebrow: "You can measure it now",
        headline: [["Context stopped", "primary"], ["being a guess.", "accent"]],
        rows: [
          { k: "01", v: "model.contextSize — 8192 on device" },
          { k: "02", v: "model.tokenCount(for:) before you send" },
          { k: "03", v: "Private Cloud Compute gives you 32K" },
          { k: "04", v: "response.usage breaks out cached and reasoning tokens" },
        ],
      },
      {
        eyebrow: "Failure got typed",
        headline: [["Errors you can", "primary"], ["actually handle.", "accent"]],
        body: "contextSizeExceeded, rateLimited, refusal, guardrailViolation, timeout. Typed cases instead of one opaque failure, so an app can degrade instead of dying.",
        checks: [
          "Guardrails retuned to cut false positives",
          "reasoningLevel: .light or .deep",
          "Built-in OCR and barcode tools",
          "Spotlight-backed search for local RAG",
        ],
      },
      {
        eyebrow: "The honest part",
        headline: [["Small model.", "primary"], ["Real limits.", "muted"]],
        body: "8K on device is 8K. This is for classification, extraction and short structured generation — not for the thing you'd hand to Claude. Knowing which is which is the actual skill.",
        cta: "iOS & macOS builds — DM me",
        ctaHi: true,
      },
    ],
  },

  // 32. Siri. The consumer headline, with the caveats that most coverage buries.
  {
    slug: "v2-32-siri-ai",
    title: "Siri AI, and the fine print",
    theme: "goldengate",
    slides: [
      {
        eyebrow: "iOS 27 · Siri AI",
        headline: [["Siri got", "primary"], ["rebuilt.", "accent"], ["Read the fine print.", "primary"]],
        body: "It's a genuine rewrite. It's also not available to everyone in September.",
        cta: "Swipe",
      },
      {
        eyebrow: "What it does",
        headline: [["Four things it", "primary"], ["couldn't do.", "muted"]],
        rows: [
          { k: "01", v: "Answers questions about what's on your screen" },
          { k: "02", v: "Searches your own messages, mail and photos" },
          { k: "03", v: "Goes to the web for current information" },
          { k: "04", v: "Takes actions across apps, systemwide" },
        ],
      },
      {
        eyebrow: "New surface",
        headline: [["Siri is an app", "primary"], ["now.", "accent"]],
        body: "A dedicated app with conversation history, synced through iCloud. Plus a more expressive voice with controls for pace and expressiveness.",
      },
      {
        eyebrow: "The fine print",
        headline: [["Not everywhere.", "primary"], ["Not every phone.", "accent"]],
        checks: [
          "iPhone 15 Pro or later — Apple Intelligence devices only",
          "Not in the EU at launch on iOS, iPadOS or watchOS",
          "Not in China pending regulatory approval",
          "Server features carry daily usage limits",
        ],
      },
      {
        eyebrow: "If you ship apps",
        headline: [["App Intents", "primary"], ["are the door.", "accent"]],
        body: "\"Takes actions across apps\" means the actions you expose. An app with no intents is an app Siri can't drive — and that gap is about to become visible to users.",
        cta: "Wiring this up? DM me",
        ctaHi: true,
      },
    ],
  },

  // 33. SwiftUI. Named modifiers only — this is the deck people screenshot to
  // send to a colleague, so every symbol has to be right.
  {
    slug: "v2-33-swiftui",
    title: "SwiftUI's quiet wins",
    theme: "goldengate",
    slides: [
      {
        eyebrow: "WWDC26 · SwiftUI",
        headline: [["The SwiftUI", "primary"], ["changes nobody", "primary"], ["talked about.", "accent"]],
        body: "No keynote slide. They'll still delete more of your code than anything that got one.",
        cta: "Swipe",
      },
      {
        eyebrow: "Toolbars",
        headline: [["You control", "primary"], ["what survives", "primary"], ["a resize.", "accent"]],
        rows: [
          { k: "01", v: "visibilityPriority — what drops first when space runs out" },
          { k: "02", v: "toolbarOverflowMenu — park the low-priority items" },
          { k: "03", v: "topBarPinnedTrailing — pin the one action that matters" },
          { k: "04", v: "toolbarMinimizeBehavior — collapse the bar on scroll" },
        ],
      },
      {
        eyebrow: "Free performance",
        headline: [["AsyncImage", "primary"], ["caches now.", "accent"]],
        body: "It respects standard HTTP cache headers by default — no code change. And @State became a macro, so a class in @State initialises lazily, once per view lifetime.",
        compare: {
          neutral: true,
          bad: { label: "Before", code: "Re-fetched\non every appear", note: "Cache was yours to build" },
          good: { label: "iOS 27", code: "Honours\ncache headers", note: "Default behaviour, zero code" },
        },
      },
      {
        eyebrow: "Interaction",
        headline: [["Drag to reorder,", "primary"], ["anywhere.", "accent"]],
        checks: [
          "Reorderable containers — List, LazyVGrid, the lot",
          "swipeActionsContainer on any ScrollView",
          "Alerts and dialogs take item bindings, like sheets",
          "Reordering lands on watchOS for the first time",
        ],
      },
      {
        eyebrow: "The pattern",
        headline: [["Apple shipped", "primary"], ["your utilities.", "muted"]],
        body: "Image caching, reordering, overflow menus — every team wrote these by hand. The win isn't the feature, it's the code you get to delete.",
        cta: "iOS & macOS builds — DM me",
        ctaHi: true,
      },
    ],
  },

  // 34. The practical one. What actually has to happen before September.
  {
    slug: "v2-34-ship-checklist",
    title: "What to fix before September",
    theme: "goldengate",
    slides: [
      {
        eyebrow: "Golden Gate · September",
        headline: [["You have", "primary"], ["weeks,", "accent"], ["not months.", "primary"]],
        body: "Golden Gate and iOS 27 ship in September. Here's the list, in the order it'll hurt.",
        cta: "Swipe",
      },
      {
        eyebrow: "01 — Hardware",
        headline: [["Intel is", "primary"], ["over.", "accent"]],
        body: "Golden Gate needs M1 or newer. Tahoe was the last release for Intel Macs, and Golden Gate is the last one with full Rosetta 2 — so shipping an x86 binary now has a visible end date.",
        checks: [
          "Ship arm64, or a universal binary",
          "Audit dependencies for x86-only blobs",
          "Anything Rosetta-reliant needs a plan",
        ],
      },
      {
        eyebrow: "02 — Layout",
        headline: [["Open it", "primary"], ["on the beta.", "muted"]],
        body: "Edge-to-edge sidebars, uniform toolbars and tighter corner radii are layout changes. It compiling proves nothing.",
        checks: [
          "Check every custom toolbar and floating bar",
          "Test at both ends of the Liquid Glass slider",
          "Confirm text has a real fill, not just blur",
        ],
      },
      {
        eyebrow: "03 — Icon",
        headline: [["Re-cut the", "primary"], ["icon.", "accent"]],
        body: "A flat image can't take part in per-layer refraction. Icon Composer wants layers, and that's manual work you can't defer to a script.",
      },
      {
        eyebrow: "04 — Intents",
        headline: [["Make your app", "primary"], ["drivable.", "accent"]],
        body: "Siri AI acts across apps through the intents you expose. Ship none and you're invisible to the single most promoted feature of the release.",
        checks: [
          "Expose the actions users actually ask for",
          "Test them by voice, not just in code",
        ],
      },
      {
        eyebrow: "The honest version",
        headline: [["Most of this", "primary"], ["is half a day.", "muted"]],
        body: "The icon and the intents aren't. Those are the two worth starting now, and the two everyone leaves until the release notes are already out.",
        cta: "Two build slots — DM me",
        ctaHi: true,
      },
    ],
  },

  // =====================================================================
  // PROMOTIONAL — the studio itself, on the brandglass theme
  // =====================================================================
  //
  // Eight decks selling yusufcreates.app. The theme is `brandglass`: the house
  // indigo palette exactly, carrying the Golden Gate material. Promotional posts
  // are the last place to experiment with brand colour.
  //
  // ⚠️ EVERY FIGURE BELOW HAS A SOURCE IN THIS REPO. Nothing is rounded for
  // rhythm and nothing is invented for effect:
  //   prices, features, windows  -> src/lib/pricing.ts
  //   slot counts                -> convex/capacity.ts (BUILD_SLOTS, CARE_SLOTS)
  //   project facts and metrics  -> convex/seed.ts
  //   promises and process       -> src/components/marketing/HowIWork.tsx, Process.tsx
  //   service categories         -> src/components/marketing/WhatIDo.tsx
  // If one moves there, move it here. A stale price on a public post is a
  // number a client will hold you to.
  //
  // Still excluded, and worth keeping excluded: traffic, revenue, client counts,
  // testimonials and "trusted by" claims. None of it is recorded in this repo,
  // and inventing social proof is both a lie and the easiest thing to disprove.

  // 35. Express. The cheapest thing on the site and the easiest yes — so it
  // leads the promotional run.
  {
    slug: "v2-35-express",
    title: "A site live in two hours",
    theme: "brandglass",
    slides: [
      {
        eyebrow: "Express · $69",
        headline: [["Your site,", "primary"], ["live in", "primary"], ["two hours.", "accent"]],
        body: "Or you keep the balance. That guarantee is the product.",
        cta: "Swipe",
      },
      {
        eyebrow: "How the money works",
        headline: [["40% up front.", "primary"], ["60% only if", "primary"], ["I'm on time.", "accent"]],
        body: "The deposit is $27.60. The rest is due on delivery — and if the two hours are missed, it is written off. Not discounted. Written off.",
        figure: { value: "2h", label: "From the moment I start the clock, not from the moment your card clears" },
      },
      {
        eyebrow: "What you get",
        headline: [["Two pages,", "primary"], ["done properly.", "muted"]],
        checks: [
          "Up to two pages, whatever you need on them",
          "Mobile and desktop, both done properly",
          "A live countdown you can watch",
          "Yours outright — hosting and domain in your name",
        ],
      },
      {
        eyebrow: "The honest part",
        headline: [["The clock starts", "primary"], ["when I start it.", "accent"]],
        body: "Paying moves your request to review and pings me. I check what actually arrived first — a card clearing at 3am, or a brief with no copy in it, shouldn't burn a window nobody can work in.",
      },
      {
        eyebrow: "Start",
        headline: [["It's one", "primary"], ["decision.", "accent"]],
        body: "Priced under seventy dollars deliberately — this is something you decide in a sitting, not something you collect quotes for.",
        cta: "yusufcreates.app/express",
        ctaHi: true,
      },
    ],
  },

  // 36. Revive. Different audience entirely — people who already have a site
  // and have been told to start again.
  {
    slug: "v2-36-revive",
    title: "You don't need a rebuild",
    theme: "brandglass",
    slides: [
      {
        eyebrow: "Revive · $650",
        headline: [["You probably", "primary"], ["don't need a", "primary"], ["rebuild.", "accent"]],
        body: "You have a site. It's slow, half broken, and nobody will touch it. That's a repair job.",
        cta: "Swipe",
      },
      {
        eyebrow: "Why this exists",
        headline: [["\"Start again\"", "primary"], ["is the", "primary"], ["expensive answer.", "accent"]],
        body: "It's also usually the wrong one. Most sites that feel broken have four or five specific problems, not a fundamental one — and quoting a rebuild is how that gets hidden.",
      },
      {
        eyebrow: "What's included",
        headline: [["Audit first,", "primary"], ["then fixes.", "muted"]],
        checks: [
          "A full audit of what is actually wrong",
          "Speed, accessibility and SEO fixes applied",
          "Broken links, forms and checkout paths repaired",
          "Mobile layout fixed properly, not patched",
          "Dependencies and security patches brought current",
        ],
      },
      {
        eyebrow: "And afterwards",
        headline: [["Handover notes,", "primary"], ["so nobody's", "primary"], ["stuck again.", "accent"]],
        body: "Plus an admin you can use, if there isn't one already. A site rescued once and abandoned again is back where it started inside a year — that's what the Care Plan is for.",
      },
      {
        eyebrow: "Free first step",
        headline: [["Get the audit", "primary"], ["for nothing.", "accent"]],
        body: "Speed, accessibility and SEO, in plain language, with three specific things to fix. Free, no obligation, and useful even if you never hire me.",
        cta: "yusufcreates.app/audit",
        ctaHi: true,
      },
    ],
  },

  // 37. The promises. The trust deck — no prices, no products, just the terms.
  {
    slug: "v2-37-how-i-work",
    title: "Six promises in writing",
    theme: "brandglass",
    slides: [
      {
        eyebrow: "How I work",
        headline: [["Six promises.", "primary"], ["All in writing.", "accent"]],
        body: "The things that actually go wrong with freelancers, answered before you ask.",
        cta: "Swipe",
      },
      {
        eyebrow: "Communication",
        headline: [["You'll never", "primary"], ["wonder how", "primary"], ["it's going.", "accent"]],
        rows: [
          { k: "01", v: "I reply within one business day — including to the ones that aren't a fit" },
          { k: "02", v: "A written update every week: what shipped, what's next, what changed" },
          { k: "03", v: "You email me directly, not a form" },
        ],
      },
      {
        eyebrow: "Ownership",
        headline: [["You own", "primary"], ["everything.", "accent"]],
        body: "Code, designs, domains, accounts. All of it transfers on final payment — no licence, no lock-in, no ongoing fee to keep using the thing you paid for.",
      },
      {
        eyebrow: "If it goes wrong",
        headline: [["Two rounds,", "primary"], ["then you can", "primary"], ["walk.", "accent"]],
        body: "Every milestone includes two rounds of revisions. If it still isn't right, you can end the project there and pay only for the milestones already delivered.",
        checks: [
          "Repos and accounts in your name from day one",
          "Another developer can pick it up without me",
          "Send your NDA and I'll sign it",
        ],
      },
      {
        eyebrow: "The point",
        headline: [["None of this", "primary"], ["is unusual.", "muted"]],
        body: "It's just written down. Most of what goes wrong on a freelance project is an expectation nobody agreed to out loud — so these are on the site, not in a pitch.",
        cta: "yusufcreates.app/about",
        ctaHi: true,
      },
    ],
  },

  // 38. Real work. The only deck with client-facing product detail in it, and
  // every figure comes straight out of convex/seed.ts.
  {
    slug: "v2-38-real-work",
    title: "Things I actually shipped",
    theme: "brandglass",
    slides: [
      {
        eyebrow: "Work",
        headline: [["Two products.", "primary"], ["Both live.", "accent"], ["Both paying.", "primary"]],
        body: "Not concepts, not dribbble shots. Sites you can open right now.",
        cta: "Swipe",
      },
      {
        eyebrow: "DocuTrackr Family",
        headline: [["It catches", "primary"], ["expiries before", "primary"], ["the airport does.", "accent"]],
        body: "A document vault for families. Alerts at 90, 60, 30 and 7 days, a six-month passport rule check against upcoming flights, and household sharing.",
        stats: [
          { value: "10", label: "Household members supported" },
          { value: "4", label: "Alert stages before expiry" },
          { value: "0", label: "Documents that leave the device" },
        ],
      },
      {
        eyebrow: "Privacy by architecture",
        headline: [["The OCR runs", "primary"], ["in your browser.", "accent"]],
        body: "Not on a server that promises not to look. Tesseract.js reads the document on the device, and sensitive fields are encrypted with AES-256-GCM.",
      },
      {
        eyebrow: "DocuTrackr Business",
        headline: [["The spreadsheet", "primary"], ["that quietly", "primary"], ["costs fines.", "accent"]],
        body: "HR document compliance for GCC companies. Role-based access, AI contract extraction that flags renewal clauses, and a daily compliance score.",
        stats: [
          { value: "87", label: "Countries with renewal guides" },
          { value: "100", label: "Daily compliance score, out of" },
          { value: "7", label: "Day trial, card required" },
        ],
      },
      {
        eyebrow: "See them",
        headline: [["Open them", "primary"], ["yourself.", "accent"]],
        body: "Every project on the site links to the live thing, with the problem, the approach and the result written out. No case study that can't be clicked.",
        cta: "yusufcreates.app/work",
        ctaHi: true,
      },
    ],
  },

  // 39. Native. A distinct product line, and the "no App Store" angle is the
  // genuinely unusual part.
  {
    slug: "v2-39-native-apps",
    title: "Native iOS and macOS, no store",
    theme: "brandglass",
    slides: [
      {
        eyebrow: "iOS & macOS · from $3,200",
        headline: [["A real native app.", "primary"], ["No App Store.", "accent"]],
        body: "No review queue, no store cut, no waiting a week to ship a fix.",
        cta: "Swipe",
      },
      {
        eyebrow: "Not a wrapper",
        headline: [["Not a website", "primary"], ["in a box.", "muted"]],
        checks: [
          "Native iOS, macOS, or both",
          "Works offline, syncs when it reconnects",
          "Push notifications",
          "Signed builds distributed straight to your users",
        ],
      },
      {
        eyebrow: "Why it isn't double",
        headline: [["One backend.", "primary"], ["Two front ends.", "accent"]],
        body: "It's a second codebase with its own build, signing and distribution — so it costs more than the web app. But the backend, auth and admin are shared rather than rebuilt, which is why it isn't twice the price.",
        bars: [
          { label: "Web app", value: "$2,500", pct: 62, on: false },
          { label: "iOS & macOS", value: "from $3,200", pct: 80, on: true },
        ],
      },
      {
        eyebrow: "The distribution bit",
        headline: [["Ship a fix", "primary"], ["this afternoon.", "accent"]],
        body: "Going direct means no review queue between you and your users. For internal tools and business apps that's not a compromise — it's the whole reason to do it this way.",
      },
      {
        eyebrow: "Scoped on a call",
        headline: [["\"From\" means", "primary"], ["from.", "muted"]],
        body: "Native work is quoted after a thirty-minute call, free, because the range is genuinely wide. You'll get a real number before anything starts.",
        cta: "yusufcreates.app/services",
        ctaHi: true,
      },
    ],
  },

  // 40. Care Plan. Recurring revenue deck, and the "numbers not unlimited"
  // story is the honest hook.
  {
    slug: "v2-40-care-plan",
    title: "The part after launch",
    theme: "brandglass",
    slides: [
      {
        eyebrow: "Care Plan · $180/mo",
        headline: [["Most people", "primary"], ["quote the build", "primary"], ["and vanish.", "accent"]],
        body: "The part after launch is where sites actually die.",
        cta: "Swipe",
      },
      {
        eyebrow: "What's in it",
        headline: [["Numbers,", "primary"], ["not \"unlimited\".", "accent"]],
        checks: [
          "Hosting and maintenance",
          "100 small fixes a month",
          "20 big fixes a month",
          "SEO monitoring",
          "Monthly analytics report",
          "Priority support",
        ],
      },
      {
        eyebrow: "Why not unlimited",
        headline: [["Because it", "primary"], ["was never true.", "accent"]],
        body: "\"Unlimited\" invites the one client who tests it and gives me nothing to point at when they do. A hundred a month is past what any normal site needs, and it's a promise I can actually keep.",
      },
      {
        eyebrow: "The split",
        headline: [["Small fix,", "primary"], ["big fix.", "muted"]],
        compare: {
          neutral: true,
          bad: { label: "Small — 100/mo", code: "Copy, price,\nimage, link", note: "The stuff you'd otherwise sit on for weeks" },
          good: { label: "Big — 20/mo", code: "New section,\nnew behaviour", note: "Work with design and testing in it" },
        },
      },
      {
        eyebrow: "Annual",
        headline: [["Twelve months", "primary"], ["for the price", "primary"], ["of ten.", "accent"]],
        body: "$1,800 a year instead of $2,160. Two free months, and a year I can plan around — which is cheaper for both of us than the churn it prevents.",
        cta: "yusufcreates.app/pricing",
        ctaHi: true,
      },
    ],
  },

  // 41. The free audit. Pure lead magnet — no price anywhere in the deck.
  {
    slug: "v2-41-free-audit",
    title: "Free audit of your site",
    theme: "brandglass",
    slides: [
      {
        eyebrow: "Free site audit",
        headline: [["I'll tell you", "primary"], ["what's wrong", "primary"], ["with your site.", "accent"]],
        body: "Free, in plain language, whether or not you ever hire me.",
        cta: "Swipe",
      },
      {
        eyebrow: "What you get",
        headline: [["Three specific", "primary"], ["things to fix.", "accent"]],
        body: "Not a 40-page PDF full of colour-coded severity levels you'll never read. Three things, in order, that would actually make a difference.",
        rows: [
          { k: "01", v: "Speed — what's slow and what's making it slow" },
          { k: "02", v: "Accessibility — what a screen reader can't get to" },
          { k: "03", v: "SEO — what search engines can't see" },
        ],
      },
      {
        eyebrow: "No jargon",
        headline: [["Written for you,", "primary"], ["not for a", "primary"], ["developer.", "accent"]],
        body: "If a report needs a developer to interpret it, it isn't a report — it's a sales funnel with extra steps.",
      },
      {
        eyebrow: "The catch",
        headline: [["There isn't", "primary"], ["one.", "accent"]],
        body: "Take the three fixes to whoever already maintains your site. Genuinely. A site that gets better is a better advert for how I work than a report you ignored.",
      },
      {
        eyebrow: "Run it",
        headline: [["Takes a", "primary"], ["minute.", "accent"]],
        body: "Paste your URL. That's the whole thing.",
        cta: "yusufcreates.app/audit",
        ctaHi: true,
      },
    ],
  },

  // 42. Bilingual and RTL. The regional angle, and a genuine differentiator —
  // most one-person studios will not take Arabic work.
  {
    slug: "v2-42-arabic-rtl",
    title: "Arabic that isn't a flipped stylesheet",
    theme: "brandglass",
    slides: [
      {
        eyebrow: "Bilingual builds",
        headline: [["Arabic isn't", "primary"], ["a flipped", "primary"], ["stylesheet.", "accent"]],
        body: "Most \"RTL support\" is `direction: rtl` and hope. It shows immediately.",
        cta: "Swipe",
      },
      {
        eyebrow: "What actually breaks",
        headline: [["The details", "primary"], ["nobody mirrors.", "accent"]],
        checks: [
          "Icons with direction — arrows, chevrons, progress",
          "Numbers and dates, which stay left-to-right inside RTL text",
          "Shadows and gradients that had a light source",
          "Form layouts, tables and anything with a fixed side",
        ],
      },
      {
        eyebrow: "Languages",
        headline: [["Five, properly.", "primary"]],
        body: "English, Arabic, French, Russian and Swedish — with real right-to-left mirroring where it applies, not a stylesheet flip that leaves the icons pointing the wrong way.",
      },
      {
        eyebrow: "Why it matters here",
        headline: [["A GCC business", "primary"], ["needs both.", "accent"]],
        body: "Not an English site with an Arabic page bolted on. Bilingual English and Arabic with full RTL mirroring is part of the Enterprise tier, and it's built in from the first layout rather than retrofitted.",
      },
      {
        eyebrow: "Talk to me",
        headline: [["Thirty minutes,", "primary"], ["free.", "accent"]],
        body: "We talk about what the business needs to happen, not how many pages it has. Two build slots at a time — that's the whole capacity.",
        cta: "yusufcreates.app",
        ctaHi: true,
      },
    ],
  },

  // =====================================================================
  // TIPS — craft lessons, on the brandglass theme
  // =====================================================================
  //
  // Eight teaching decks. The rule that makes these worth posting: every one is
  // a mistake that was actually made in THIS repo, with the real number
  // attached. Sources are named per deck below.
  //
  // Generic advice is what everyone else posts and nobody saves. "Watch your
  // bundle size" is a platitude; "a wildcard import cost 5.0 MB, 58% of all the
  // JavaScript on the page, to draw twenty-two 24px glyphs" is a story someone
  // sends to a colleague. Keep the numbers, or don't write the deck.

  // 43. The bundle. Best numbers of any lesson in the repo.
  // Source: src/components/ui/TechLogos.tsx
  {
    slug: "v2-43-bundle-bloat",
    title: "One import cost 5MB",
    theme: "brandglass",
    slides: [
      {
        eyebrow: "Performance",
        headline: [["One import", "primary"], ["cost me", "primary"], ["5 megabytes.", "accent"]],
        body: "58% of all the JavaScript on the page. To draw twenty-two 24px logos.",
        cta: "Swipe",
      },
      {
        eyebrow: "The line",
        headline: [["This can't be", "primary"], ["tree-shaken.", "accent"]],
        code: {
          file: "TechLogos.tsx",
          lines: [
            [["import ", "key"], ["* as ", "punct"], ["simpleIcons ", "text"], ["from ", "key"], ["\"simple-icons\"", "str"]],
            "",
            [["const ", "key"], ["ALL", "text"], [" = ", "punct"], ["Object", "fn"], [".", "punct"], ["values", "fn"], ["(simpleIcons)", "punct"]],
            [["  ", "text"], [".", "punct"], ["filter", "fn"], ["(…)", "punct"]],
          ],
        },
        body: "A namespace import reads every export at module scope. The bundler can't prove which of 3,450 brands are reachable, so it ships all of them.",
      },
      {
        eyebrow: "The fix",
        headline: [["Import by name.", "primary"], ["One per brand.", "accent"]],
        code: {
          file: "TechLogos.tsx",
          lines: [
            [["import ", "key"], ["{", "punct"]],
            [["  siReact", "text"], [",", "punct"], [" siSwift", "text"], [",", "punct"], [" siStripe", "text"], [",", "punct"]],
            [["  ", "text"], ["// …twenty-two, not three thousand", "comment"]],
            [["} ", "punct"], ["from ", "key"], ["\"simple-icons\"", "str"]],
          ],
        },
        stats: [
          { value: "5.0MB", label: "Before" },
          { value: "58%", label: "Of all page JS" },
          { value: "~0", label: "After" },
        ],
      },
      {
        eyebrow: "The objection",
        headline: [["\"Export names", "primary"], ["are unstable.\"", "muted"]],
        body: "They are. That's the argument for named imports, not against them — a name that stops resolving is a build error. Looking icons up by title instead means a logo silently vanishes from a live page.",
        compare: {
          bad: { label: "Lookup by title", code: "Silently\nvanishes", note: "You find out from a user" },
          good: { label: "Named import", code: "Build\nerror", note: "You find out at the upgrade" },
        },
      },
      {
        eyebrow: "The habit",
        headline: [["Read your", "primary"], ["bundle once", "primary"], ["a month.", "accent"]],
        body: "Nobody notices five megabytes arriving one dependency at a time. The whole cost here was invisible in code review and obvious in one look at the analyser.",
        cta: "yusufcreates.app/blog",
        ctaHi: true,
      },
    ],
  },

  // 44. Frosted glass. The single most-repeated mistake in this style of UI.
  // Source: src/app/globals.css, the .nav-pill block.
  {
    slug: "v2-44-glass-legibility",
    title: "Your blur is not doing the work",
    theme: "brandglass",
    slides: [
      {
        eyebrow: "UI craft",
        headline: [["Your blur", "primary"], ["isn't doing", "primary"], ["the work.", "accent"]],
        body: "Frosted glass that only works when backdrop-filter renders is glass that doesn't work.",
        cta: "Swipe",
      },
      {
        eyebrow: "Why",
        headline: [["backdrop-filter", "primary"], ["is allowed", "primary"], ["to fail.", "accent"]],
        checks: [
          "Dropped under prefers-reduced-transparency",
          "Unsupported on older engines",
          "Quietly skipped by some compositors",
        ],
        body: "Three ways it disappears, none of which you'll see on your own machine.",
      },
      {
        eyebrow: "The rule",
        headline: [["The fill has to", "primary"], ["guarantee it", "primary"], ["on its own.", "accent"]],
        body: "Set the background opacity so text behind the panel is unreadable with the blur switched off entirely. Then let the blur make it beautiful.",
        versus: {
          before: {
            tag: "62% fill",
            sample: "Still readable",
            tint: 0.2,
            lines: ["A paragraph scrolling under", "stayed legible straight", "across the nav labels"],
          },
          after: {
            tag: "84% fill",
            sample: "Reads as glass",
            tint: 0.62,
            lines: ["16% bleeds through as a wash", "Light and colour still pass", "Letterforms don't resolve"],
          },
        },
      },
      {
        eyebrow: "One more",
        headline: [["Real glass", "primary"], ["brightens.", "accent"]],
        body: "Push brightness above 1. Without it the panel darkens whatever is behind it and the whole thing reads as a drop shadow instead of a pane.",
      },
      {
        eyebrow: "The test",
        headline: [["Turn the blur", "primary"], ["off and look.", "muted"]],
        body: "Comment out the backdrop-filter and scroll a paragraph underneath. If you can read a single word through the panel, the fill is too light — no matter how good it looks with the blur on.",
        cta: "yusufcreates.app/blog",
        ctaHi: true,
      },
    ],
  },

  // 45. Contrast. The two-token trap is the non-obvious part.
  // Source: src/app/globals.css, --accent-solid and --danger-solid.
  {
    slug: "v2-45-contrast",
    title: "One accent colour is not enough",
    theme: "brandglass",
    slides: [
      {
        eyebrow: "Accessibility",
        headline: [["Your accent", "primary"], ["passes and", "primary"], ["fails at once.", "accent"]],
        body: "Same colour, two contexts, two different thresholds. Almost everyone ships this bug.",
        cta: "Swipe",
      },
      {
        eyebrow: "Two thresholds",
        headline: [["4.5 for text.", "primary"], ["3 for the", "primary"], ["rest.", "accent"]],
        rows: [
          { k: "4.5", v: "Body text against its background" },
          { k: "3.0", v: "Borders, icons, large text, UI indicators" },
          { k: "—", v: "Decoration that carries no meaning is exempt" },
        ],
      },
      {
        eyebrow: "The trap",
        headline: [["It's a border", "primary"], ["and a button.", "accent"]],
        body: "My accent measures 4.42:1 under white text. Fine as a border or an icon — it clears 3:1. Not fine as a filled button, where the label is body text and needs 4.5:1.",
        bars: [
          { label: "As a border — needs 3:1", value: "4.42:1", pct: 74, on: true },
          { label: "As a button fill — needs 4.5:1", value: "4.42:1", pct: 74, on: false },
        ],
      },
      {
        eyebrow: "The fix",
        headline: [["Ship two", "primary"], ["tokens.", "accent"]],
        code: {
          file: "globals.css",
          lines: [
            [["  ", "text"], ["/* borders, icons, large text */", "comment"]],
            [["  --accent", "key"], [": ", "punct"], ["#5e6ad2", "num"], [";", "punct"]],
            "",
            [["  ", "text"], ["/* under white text only */", "comment"]],
            [["  --accent-solid", "key"], [": ", "punct"], ["#5560c4", "num"], [";", "punct"]],
          ],
        },
        body: "One step darker, same hue. The brand doesn't change; the button becomes legible.",
      },
      {
        eyebrow: "Where to look",
        headline: [["Check every", "primary"], ["filled surface.", "muted"]],
        body: "Buttons, badges, toasts, selected rows, anything where your brand colour sits under white text. That's where the failures hide — never in the paragraph you did test.",
        cta: "yusufcreates.app/audit",
        ctaHi: true,
      },
    ],
  },

  // 46. Money. The undercharging bug is genuinely alarming and very transferable.
  // Source: src/lib/pricing.ts — convert() and splitPrice().
  {
    slug: "v2-46-money-rounding",
    title: "Your deposit and balance don't add up",
    theme: "brandglass",
    slides: [
      {
        eyebrow: "Payments",
        headline: [["My deposit", "primary"], ["and balance", "primary"], ["didn't add up.", "accent"]],
        body: "Every euro order quietly undercharged by €5. Nothing errored. Nothing logged.",
        cta: "Swipe",
      },
      {
        eyebrow: "The bug",
        headline: [["Two halves,", "primary"], ["rounded", "primary"], ["separately.", "accent"]],
        body: "Convert the deposit, convert the balance, and each one rounds its own way. €65 total, €30 deposit, €35 balance — except the halves were converted from the dollar figure independently and summed to €60.",
        figure: { value: "€5", label: "Missing from every order, silently, until someone reconciled a month of them" },
      },
      {
        eyebrow: "The rule",
        headline: [["Split the", "primary"], ["converted total.", "accent"]],
        code: {
          file: "pricing.ts",
          lines: [
            [["const ", "key"], ["total", "text"], [" = ", "punct"], ["convert", "fn"], ["(usd, currency)", "punct"]],
            [["const ", "key"], ["deposit", "text"], [" = ", "punct"], ["Math", "fn"], [".", "punct"], ["round", "fn"], ["(total * fraction)", "punct"]],
            [["const ", "key"], ["balance", "text"], [" = ", "punct"], ["total - deposit", "text"]],
          ],
        },
        body: "The deposit absorbs the rounding. The balance is whatever's left. Now the two always sum to the price on the card.",
      },
      {
        eyebrow: "The second bug",
        headline: [["A fixed", "primary"], ["rounding step", "primary"], ["isn't fair.", "accent"]],
        body: "\"Nearest 25\" is a 0.1% error on a $5,500 price and 8% on a $34.50 one. Small prices came out visibly wrong while the big ones looked perfect — so nobody noticed.",
        rows: [
          { k: "<100", v: "Round to 1 — any step at all is a percentage point" },
          { k: "<1000", v: "Round to 5" },
          { k: "1000+", v: "Round to 25" },
        ],
      },
      {
        eyebrow: "The habit",
        headline: [["Assert it", "primary"], ["in a test.", "accent"]],
        body: "deposit + balance === total, in every currency you support. It's one line, and it's the only thing standing between you and a month of undercharging nobody reports.",
        cta: "yusufcreates.app/blog",
        ctaHi: true,
      },
    ],
  },

  // 47. Hydration. The React lesson people hit constantly and fix wrongly.
  // Source: src/lib/glass.ts, src/components/ui/GlassControl.tsx.
  {
    slug: "v2-47-hydration",
    title: "Stop fixing hydration with useEffect",
    theme: "brandglass",
    slides: [
      {
        eyebrow: "React",
        headline: [["Stop fixing", "primary"], ["hydration with", "primary"], ["useEffect.", "accent"]],
        body: "It works. It also guarantees one frame of the wrong thing, every single load.",
        cta: "Swipe",
      },
      {
        eyebrow: "The setup",
        headline: [["Two readers,", "primary"], ["one value.", "accent"]],
        body: "An inline script sets a theme before paint to avoid a flash. A module reads the same value after hydration. If they disagree, React throws a mismatch — so people reach for the effect.",
      },
      {
        eyebrow: "The usual fix",
        headline: [["Render wrong,", "primary"], ["then correct it.", "muted"]],
        code: {
          file: "the-pattern-to-avoid.tsx",
          lines: [
            [["const ", "key"], ["[v, setV]", "text"], [" = ", "punct"], ["useState", "fn"], ["(", "punct"], ["DEFAULT", "text"], [")", "punct"]],
            "",
            [["useEffect", "fn"], ["(() => ", "punct"], ["{", "punct"]],
            [["  ", "text"], ["setV", "fn"], ["(", "punct"], ["read", "fn"], ["())", "punct"], ["  ", "text"], ["// one frame too late", "comment"]],
            [["}, [])", "punct"]],
          ],
        },
        body: "The mismatch warning goes away because the first render is now deliberately wrong. The flash it was warning about does not.",
      },
      {
        eyebrow: "The primitive",
        headline: [["useSync-", "primary"], ["ExternalStore.", "accent"]],
        code: {
          file: "GlassControl.tsx",
          lines: [
            [["const ", "key"], ["settings", "text"], [" = ", "punct"], ["useSyncExternalStore", "fn"], ["(", "punct"]],
            [["  subscribe", "text"], [",", "punct"]],
            [["  getSnapshot", "text"], [",", "punct"], ["   ", "text"], ["// client", "comment"]],
            [["  getServerSnapshot", "text"], [",", "punct"], ["  ", "text"], ["// SSR — must match the script", "comment"]],
            [[")", "punct"]],
          ],
        },
        body: "Built for exactly this: an external source React doesn't own. First client render gets the real value.",
      },
      {
        eyebrow: "The other half",
        headline: [["Your CSS default", "primary"], ["must match", "primary"], ["the script.", "accent"]],
        body: "The no-JS default in your stylesheet and the value the inline script writes have to be the same number. Two sources of truth for one value is the actual bug — the hydration warning was only the symptom.",
        cta: "yusufcreates.app/blog",
        ctaHi: true,
      },
    ],
  },

  // 48. Auth. Real holes, found and closed in this repo.
  // Source: convex/auth.ts.
  {
    slug: "v2-48-auth-mistakes",
    title: "Your login form leaks your username",
    theme: "brandglass",
    slides: [
      {
        eyebrow: "Security",
        headline: [["Your login form", "primary"], ["is leaking", "primary"], ["half the answer.", "accent"]],
        body: "If you sign in with an email address, you've published the username.",
        cta: "Swipe",
      },
      {
        eyebrow: "The leak",
        headline: [["The placeholder", "primary"], ["gave it away.", "accent"]],
        body: "Most auth libraries validate the identifier as an email. So the one admin account gets named after a real inbox — an address that's in the page, in a WHOIS record, and on the contact page.",
        compare: {
          bad: { label: "Email identifier", code: "you@site.com", note: "Findable in four places" },
          good: { label: "Username", code: "an opaque\nstring", note: "Not an address, gives away nothing" },
        },
      },
      {
        eyebrow: "How",
        headline: [["Override the", "primary"], ["profile, not", "primary"], ["the validator.", "accent"]],
        body: "Take the identifier as an opaque string and store it on whichever column the library keys accounts on. It's a name, not an address, and nothing ever tries to post mail to it.",
      },
      {
        eyebrow: "The other one",
        headline: [["Locking signup", "primary"], ["isn't enough.", "accent"]],
        body: "Checking the address at the form is a suggestion. Anyone completing the flow another way still gets a row. Delete the user and abort the sign-in server-side, so no account is ever created.",
        checks: [
          "Verify the password server-side against a stored hash",
          "Never compare credentials in the browser",
          "Lock signup to one address — and enforce it after the fact too",
        ],
      },
      {
        eyebrow: "The principle",
        headline: [["Assume the form", "primary"], ["is skipped.", "muted"]],
        body: "Every check that lives in the UI is decoration. The question worth asking is always what happens when someone posts straight to the endpoint.",
        cta: "yusufcreates.app/blog",
        ctaHi: true,
      },
    ],
  },

  // 49. CSP. The report-only step is the tip; everyone skips it and reverts.
  // Source: next.config.ts.
  {
    slug: "v2-49-csp",
    title: "Ship CSP without breaking your site",
    theme: "brandglass",
    slides: [
      {
        eyebrow: "Security headers",
        headline: [["Ship a CSP", "primary"], ["without", "primary"], ["breaking things.", "accent"]],
        body: "Everyone who enforces it on day one reverts it by day two.",
        cta: "Swipe",
      },
      {
        eyebrow: "The move",
        headline: [["Report-Only", "primary"], ["first.", "accent"]],
        code: {
          file: "next.config.ts",
          lines: [
            [["{ ", "punct"], ["key", "text"], [": ", "punct"], ["\"Content-Security-Policy-Report-Only\"", "str"], [",", "punct"]],
            [["  value", "text"], [": ", "punct"], ["csp ", "text"], ["}", "punct"]],
            "",
            [["// swap to Content-Security-Policy to enforce", "comment"]],
          ],
        },
        body: "Same policy, same reports, nothing blocked. You find out what your own site actually loads before you switch it on.",
      },
      {
        eyebrow: "What you'll find",
        headline: [["Third parties", "primary"], ["you forgot.", "accent"]],
        rows: [
          { k: "01", v: "Your payment provider's script host" },
          { k: "02", v: "Whatever your captcha or bot check loads" },
          { k: "03", v: "Fonts, analytics, and one embed from two years ago" },
        ],
      },
      {
        eyebrow: "Free win",
        headline: [["frame-ancestors:", "primary"], ["none.", "accent"]],
        body: "Nobody can put your site in an iframe. That's clickjacking closed in one directive, and unlike the script rules it will not break anything you own.",
        checks: [
          "frame-ancestors 'none' — start here, it's safe",
          "Then script-src, once the reports are quiet",
          "Enforce only when a week of reports is clean",
        ],
      },
      {
        eyebrow: "The honest bit",
        headline: [["unsafe-inline", "primary"], ["is a", "primary"], ["compromise.", "muted"]],
        body: "Most frameworks inline styles or scripts, so a strict policy needs nonces wired through the whole render. Report-Only with unsafe-inline is still enormously better than no header — don't let perfect stop you shipping it.",
        cta: "yusufcreates.app/blog",
        ctaHi: true,
      },
    ],
  },

  // 50. Mobile performance. Two non-obvious compositor rules.
  // Source: src/app/globals.css — the touch and animation blocks.
  {
    slug: "v2-50-blur-performance",
    title: "Never animate a blurred layer",
    theme: "brandglass",
    slides: [
      {
        eyebrow: "Performance",
        headline: [["Never move", "primary"], ["a blurred", "primary"], ["layer.", "accent"]],
        body: "Two rules about blur that cost me a lot of frames on real phones.",
        cta: "Swipe",
      },
      {
        eyebrow: "Rule one",
        headline: [["Opacity only.", "primary"]],
        body: "Resize or reposition anything with a backdrop-filter and the compositor re-snapshots what's behind it every single frame. Opacity is the one property that doesn't force that.",
        compare: {
          bad: { label: "Re-snapshots", code: "transform\nwidth · top", note: "New backdrop every frame" },
          good: { label: "Safe", code: "opacity", note: "Snapshot is reused" },
        },
      },
      {
        eyebrow: "Rule two",
        headline: [["Your phone", "primary"], ["isn't your", "primary"], ["laptop.", "accent"]],
        body: "Touch devices are overwhelmingly on integrated GPUs, where blur radius is the single most expensive part of the effect — and it scales with the radius, not the element.",
        code: {
          file: "globals.css",
          lines: [
            [["@media ", "key"], ["(hover: none) ", "punct"], ["{", "punct"]],
            [["  ", "text"], ["backdrop-filter", "key"], [": ", "punct"], ["blur", "fn"], ["(", "punct"], ["calc", "fn"], ["(", "punct"], ["var", "fn"], ["(--glass-blur) * ", "punct"], ["0.6", "num"], ["))", "punct"], [";", "punct"]],
            [["}", "punct"]],
          ],
        },
      },
      {
        eyebrow: "It looks the same",
        headline: [["60% blur,", "primary"], ["on a screen", "primary"], ["held further away.", "accent"]],
        body: "Nobody has ever noticed. A phone is smaller, denser and further from your eye than a monitor — the radius that reads as glass there is smaller than the one you tuned on a laptop.",
      },
      {
        eyebrow: "How to catch it",
        headline: [["Throttle the", "primary"], ["CPU and scroll.", "muted"]],
        body: "6x slowdown in devtools, then scroll past every glass surface. Effects that are free on your machine are where mid-range Android drops to fifteen frames a second.",
        cta: "yusufcreates.app/audit",
        ctaHi: true,
      },
    ],
  },
];

module.exports = { carousels, HANDLE };
