/**
 * AI Tips — carousel content.
 *
 * Fifteen decks on Claude Code and AI-assisted development. Twenty-three
 * AI-related decks already exist across the other folders, so nothing here
 * repeats CLAUDE.md, skills, subagents, hooks, MCP, rewind, permission modes,
 * context management, headless mode, cost, prompt caching, RAG, ultrathink,
 * Cursor rules, Cursor Agent, or the who-to-follow set.
 *
 * VERIFIED, NOT RECALLED. Every command, flag and file path below was checked
 * against code.claude.com/docs — chiefly `common-workflows`, `sessions`,
 * `worktrees` and `plugins`. A wrong flag on a public post teaches people
 * something broken, and this audience runs the command.
 *
 * Deliberately excluded, and worth keeping excluded: subscription prices,
 * model names, rate limits and token costs. All change faster than a published
 * post can be edited.
 *
 * Code blocks are hand-tokenised as [text, kind] pairs so nothing is mis-lexed
 * on a public post. Kinds: comment, key, str, num, fn, punct, accent, text.
 */

const HANDLE = "@yusufcreatesdev";

const carousels = [
  // =====================================================================
  // SESSIONS AND PARALLEL WORK
  // =====================================================================

  // 1. Worktrees. The highest-leverage thing most people have never tried.
  {
    slug: "ai-01-worktrees",
    title: "Run two Claudes at once",
    slides: [
      {
        eyebrow: "Claude Code",
        headline: [["You can run two", "primary"], ["of these at", "primary"], ["once.", "accent"]],
        body: "Different branches, different terminals, no collisions. One flag.",
        cta: "Swipe",
      },
      {
        eyebrow: "The flag",
        headline: [["One command", "primary"], ["per feature.", "muted"]],
        terminal: {
          title: "two terminals",
          lines: [
            ["claude --worktree feature-auth", "cmd"],
            ["claude --worktree fix-checkout", "cmd"],
            ["", "out"],
            ["separate checkouts, separate branches", "ok"],
          ],
        },
        body: "Each gets its own git worktree — a real checkout on its own branch.",
      },
      {
        eyebrow: "Why it matters",
        headline: [["Edits stop", "primary"], ["fighting.", "muted"]],
        body: "Two sessions in one directory overwrite each other’s work. Two worktrees cannot — they’re different folders on different branches, so a long refactor and a quick fix can run side by side.",
      },
      {
        eyebrow: "The catch",
        headline: [["Needs one", "primary"], ["commit first.", "danger"]],
        body: "A worktree branches from an existing commit, so an empty repository fails outright. Commit something before you reach for it.",
      },
      {
        eyebrow: "The habit",
        headline: [["Stop waiting for", "primary"], ["it to finish.", "accent"]],
        body: "The long task no longer blocks the short one. That’s the whole change, and it costs a single flag.",
        cta: "Save this",
      },
    ],
  },

  // 2. Resuming sessions.
  {
    slug: "ai-02-resume",
    title: "Stop re-explaining yesterday",
    slides: [
      {
        eyebrow: "Claude Code",
        headline: [["You closed the", "primary"], ["terminal. The", "primary"], ["session survived.", "accent"]],
        body: "Every conversation is saved locally. Most people start over anyway.",
        cta: "Swipe",
      },
      {
        eyebrow: "The commands",
        headline: [["Two ways back", "primary"], ["in.", "muted"]],
        compare: {
          neutral: true,
          bad: {
            label: "Last one",
            code: "claude --continue",
            note: "Resumes the most recent session in this directory.",
          },
          good: {
            label: "Pick one",
            code: "claude --resume",
            note: "Opens a picker of every saved session here.",
          },
        },
      },
      {
        eyebrow: "Mid-session",
        headline: [["/resume works", "primary"], ["from inside.", "muted"]],
        body: "You don’t have to quit to switch. It opens the same picker, so you can jump between two threads of work without losing either.",
      },
      {
        eyebrow: "The one nobody knows",
        headline: [["Find it by the", "primary"], ["pull request.", "muted"]],
        code: {
          file: "zsh",
          accentFile: true,
          lines: [
            [["claude", "fn"], [" --from-pr ", "key"], ["1234", "num"]],
            "",
            [["# Sessions that created a PR are", "comment"]],
            [["# linked to it. Months later, that", "comment"]],
            [["# number is enough to find them.", "comment"]],
          ],
        },
      },
      {
        eyebrow: "The habit",
        headline: [["Resume, don’t", "primary"], ["restart.", "accent"]],
        body: "Re-explaining a task you already explained is the most common waste in this tool, and it’s one flag to stop.",
        cta: "Save this",
      },
    ],
  },

  // 3. Images. Genuinely underused and instantly demonstrable.
  {
    slug: "ai-03-screenshots",
    title: "Paste the screenshot",
    slides: [
      {
        eyebrow: "Claude Code",
        headline: [["Stop describing", "primary"], ["the bug.", "primary"], ["Paste it.", "accent"]],
        body: "It reads images. Screenshots, mockups, diagrams, error dialogs.",
        cta: "Swipe",
      },
      {
        eyebrow: "How",
        headline: [["Three ways in.", "primary"]],
        rows: [
          { k: "01", v: "Drag the image into the window" },
          { k: "02", v: "Ctrl+V — Cmd+V in iTerm2" },
          { k: "03", v: "Give it a path to the file" },
        ],
      },
      {
        eyebrow: "What it’s for",
        headline: [["Some things", "primary"], ["can’t be", "primary"], ["written down.", "muted"]],
        checks: [
          "The error dialog, exactly as it appeared",
          "A design mockup to build from",
          "A schema diagram, before changing it",
          "The layout bug you can see but can’t name",
        ],
      },
      {
        eyebrow: "Why it wins",
        headline: [["Your description", "primary"], ["is a lossy", "primary"], ["copy.", "muted"]],
        body: "Explaining a broken layout in words takes a paragraph and still loses the detail that mattered. The screenshot has all of it.",
      },
      {
        eyebrow: "The habit",
        headline: [["If you can see", "primary"], ["it, send it.", "accent"]],
        body: "The moment you start writing “there’s a weird gap under the header”, stop and paste the picture instead.",
        cta: "Save this",
      },
    ],
  },

  // 4. @-mentions in depth. Beyond the one-slide version.
  {
    slug: "ai-04-at-mentions",
    title: "The @ that saves a minute",
    slides: [
      {
        eyebrow: "Claude Code",
        headline: [["Don’t ask it to", "primary"], ["find the file.", "accent"]],
        body: "Hand it over. @ is the difference between searching and reading.",
        cta: "Swipe",
      },
      {
        eyebrow: "The syntax",
        headline: [["Point, don’t", "primary"], ["describe.", "muted"]],
        code: {
          file: "prompt",
          accentFile: true,
          lines: [
            [["Explain the logic in ", "text"], ["@src/lib/auth.ts", "accent"]],
            "",
            [["# Type @ for a path menu.", "comment"]],
            [["# Enter to accept, Enter to send.", "comment"]],
          ],
        },
        body: "That includes the whole file, immediately — no search step at all.",
      },
      {
        eyebrow: "Directories too",
        headline: [["A listing, not", "primary"], ["the contents.", "muted"]],
        body: "@src/components gives the structure rather than every file inside it. Useful for orientation; not a way to load a folder.",
      },
      {
        eyebrow: "The hidden effect",
        headline: [["It pulls in the", "primary"], ["local rules.", "muted"]],
        body: "An @ reference also loads CLAUDE.md from that file’s directory and its parents. Mentioning a file brings its conventions with it.",
      },
      {
        eyebrow: "The habit",
        headline: [["Name the file", "primary"], ["every time.", "accent"]],
        body: "Reading the real thing always beats inferring it from your summary — and you already know where it is.",
        cta: "Save this",
      },
    ],
  },

  // 5. Plan mode as a habit, not a feature. Distinct from v2-08's mode tour.
  {
    slug: "ai-05-plan-first",
    title: "Read the plan, not the diff",
    slides: [
      {
        eyebrow: "Claude Code",
        headline: [["Reviewing 400", "primary"], ["lines is too", "primary"], ["late.", "accent"]],
        body: "Reviewing the plan takes thirty seconds and catches more.",
        cta: "Swipe",
      },
      {
        eyebrow: "The shift",
        headline: [["Approve the", "primary"], ["approach first.", "muted"]],
        compare: {
          bad: {
            label: "After",
            code: "400 lines\nof diff",
            note: "Sunk cost. You’ll skim it, and you know you will.",
          },
          good: {
            label: "Before",
            code: "6 bullet\npoints",
            note: "You read every word, because there are eighty of them.",
          },
        },
      },
      {
        eyebrow: "How",
        headline: [["Shift+Tab, or", "primary"], ["start in it.", "muted"]],
        terminal: {
          title: "zsh",
          lines: [
            ["claude --permission-mode plan", "cmd"],
            ["", "out"],
            ["⏸ plan mode on", "ok"],
            ["reads files · proposes · writes nothing", "out"],
          ],
        },
      },
      {
        eyebrow: "When it earns it",
        headline: [["Anything you", "primary"], ["can’t describe", "primary"], ["precisely.", "muted"]],
        body: "If you could write the instructions exactly, you don’t need a plan. If you’re saying “make the checkout handle declined cards”, you do.",
      },
      {
        eyebrow: "The habit",
        headline: [["Cheap to reject.", "primary"], ["Expensive to", "primary"], ["unpick.", "accent"]],
        body: "Rejecting a plan costs one message. Unpicking a wrong refactor costs an afternoon.",
        cta: "Save this",
      },
    ],
  },

  // =====================================================================
  // WORKING WELL — habits rather than features
  // =====================================================================

  // 6. Verification. The single most important habit.
  {
    slug: "ai-06-verify",
    title: "Make it prove it worked",
    slides: [
      {
        eyebrow: "Hard truths",
        headline: [["“Done” is not", "primary"], ["evidence.", "accent"]],
        body: "The most useful habit in AI-assisted development, and the least used.",
        cta: "Swipe",
      },
      {
        eyebrow: "The gap",
        headline: [["It believes", "primary"], ["itself.", "muted"]],
        body: "A confident summary is generated by the same process that wrote the code. If the code is wrong, the summary describes the wrong thing confidently.",
      },
      {
        eyebrow: "The fix",
        headline: [["Ask for the", "primary"], ["output.", "muted"]],
        checks: [
          "Run the tests and show me the result",
          "Show me the diff, not a description",
          "Take a screenshot of the page",
          "Curl the endpoint and paste the response",
        ],
      },
      {
        eyebrow: "Why it works",
        headline: [["A command has", "primary"], ["no opinion.", "muted"]],
        body: "Test output is produced by the test runner. A screenshot is produced by the browser. Neither is written by the thing that made the change.",
      },
      {
        eyebrow: "The habit",
        headline: [["Trust the", "primary"], ["artefact, not", "primary"], ["the summary.", "accent"]],
        body: "Every time you accept a claim without evidence, you’re the one who ships it.",
        cta: "Save this",
      },
    ],
  },

  // 7. Small steps.
  {
    slug: "ai-07-small-steps",
    title: "Why the big ask fails",
    slides: [
      {
        eyebrow: "Craft",
        headline: [["“Build the whole", "primary"], ["feature” is why", "primary"], ["it went wrong.", "accent"]],
        body: "Scope is the variable that decides whether this works.",
        cta: "Swipe",
      },
      {
        eyebrow: "The failure",
        headline: [["Wrong early,", "primary"], ["wrong", "primary"], ["everywhere.", "muted"]],
        body: "A misunderstanding in step one propagates through steps two to nine. By the time you see it, unpicking costs more than starting again.",
      },
      {
        eyebrow: "The size",
        headline: [["One reviewable", "primary"], ["change.", "muted"]],
        bars: [
          { label: "One clear change", value: "you review it", pct: 92, on: true },
          { label: "Nine changes at once", value: "you skim it", pct: 26 },
        ],
        body: "The right size is whatever you’ll actually read.",
      },
      {
        eyebrow: "The exception",
        headline: [["Mechanical work", "primary"], ["scales fine.", "muted"]],
        body: "Renaming across a hundred files, or the same transformation applied everywhere, is safe to hand over whole — there’s one decision, repeated, not a hundred decisions.",
      },
      {
        eyebrow: "The rule",
        headline: [["Small when it", "primary"], ["thinks. Big when", "primary"], ["it types.", "accent"]],
        body: "Judgement in small pieces. Repetition in large ones. Most bad sessions get that backwards.",
        cta: "Save this",
      },
    ],
  },

  // 8. Knowing when to stop.
  {
    slug: "ai-08-when-to-stop",
    title: "The third attempt is a signal",
    slides: [
      {
        eyebrow: "Hard truths",
        headline: [["If it’s failed", "primary"], ["twice, stop", "primary"], ["asking.", "accent"]],
        body: "The third attempt at the same prompt almost never works. Here’s what does.",
        cta: "Swipe",
      },
      {
        eyebrow: "Why",
        headline: [["It’s missing", "primary"], ["something you", "primary"], ["know.", "muted"]],
        body: "Repeated failure on a specific task usually means context it doesn’t have — a constraint, a file it hasn’t read, a detail you’ve had in your head the whole time.",
      },
      {
        eyebrow: "Instead",
        headline: [["Change the", "primary"], ["input, not the", "primary"], ["wording.", "muted"]],
        steps: [
          { k: "Add", v: "@ the file it clearly hasn’t read" },
          { k: "Narrow", v: "Ask for one piece, not the whole" },
          { k: "Reset", v: "/clear — the thread may be poisoned" },
          { k: "Take over", v: "Write the hard part yourself" },
        ],
      },
      {
        eyebrow: "The last one",
        headline: [["Doing it", "primary"], ["yourself is a", "primary"], ["valid answer.", "muted"]],
        body: "Twenty minutes of your own work beats an hour of re-prompting. The tool is not obliged to be the way every problem gets solved.",
      },
      {
        eyebrow: "The habit",
        headline: [["Two strikes,", "primary"], ["then think.", "accent"]],
        body: "Rephrasing the same request a third time is the clearest sign the problem isn’t the phrasing.",
        cta: "Save this",
      },
    ],
  },

  // 9. Tests as the specification.
  {
    slug: "ai-09-tests-first",
    title: "Write the test first",
    slides: [
      {
        eyebrow: "Craft",
        headline: [["A failing test", "primary"], ["is the clearest", "primary"], ["prompt there is.", "accent"]],
        body: "It says exactly what “done” means, in a form that can be checked.",
        cta: "Swipe",
      },
      {
        eyebrow: "Why",
        headline: [["Prose is", "primary"], ["ambiguous. A", "primary"], ["test isn’t.", "muted"]],
        body: "“Handle empty input gracefully” has ten readings. A test asserting what happens on empty input has one, and it either passes or it doesn’t.",
      },
      {
        eyebrow: "The loop",
        headline: [["Red, then let", "primary"], ["it go green.", "muted"]],
        steps: [
          { k: "You", v: "Write the test. Watch it fail" },
          { k: "It", v: "Makes the test pass" },
          { k: "The runner", v: "Says whether that’s true" },
          { k: "You", v: "Read the diff, not the summary" },
        ],
      },
      {
        eyebrow: "The trap",
        headline: [["Don’t let it", "primary"], ["write both.", "danger"]],
        body: "A test written alongside the code tends to assert what the code does rather than what it should do. Own the specification; delegate the implementation.",
      },
      {
        eyebrow: "The payoff",
        headline: [["Verification", "primary"], ["comes free.", "accent"]],
        body: "You never have to wonder whether it worked. That was the expensive part, and the test answered it before the work started.",
        cta: "Save this",
      },
    ],
  },

  // 10. Reading the code you ship.
  {
    slug: "ai-10-read-it",
    title: "You are still the author",
    slides: [
      {
        eyebrow: "Hard truths",
        headline: [["If you shipped", "primary"], ["it, you wrote", "primary"], ["it.", "accent"]],
        body: "Whatever produced the characters. That’s not a moral point — it’s a practical one.",
        cta: "Swipe",
      },
      {
        eyebrow: "The moment",
        headline: [["It breaks at", "primary"], ["2am.", "muted"]],
        body: "Nobody accepts “the AI wrote it” from the person who deployed it. You’ll be the one reading that file under pressure, and the first read shouldn’t be then.",
      },
      {
        eyebrow: "The tell",
        headline: [["Could you", "primary"], ["explain it?", "muted"]],
        body: "Not defend it — explain it. Why that approach, what it does when the input is empty, what happens if that call fails. If you can’t, you haven’t reviewed it, you’ve approved it.",
      },
      {
        eyebrow: "What to read",
        headline: [["Not every line.", "primary"], ["The right ones.", "muted"]],
        checks: [
          "Anything touching money or auth",
          "Anything that deletes",
          "Anything you don’t recognise",
          "The error paths, always",
        ],
      },
      {
        eyebrow: "The trade",
        headline: [["It got faster.", "primary"], ["It didn’t get", "primary"], ["yours to skip.", "accent"]],
        body: "Generating stopped being the constraint, so reviewing became the constraint. That’s the actual job now.",
        cta: "Save this",
      },
    ],
  },

  // =====================================================================
  // AUTOMATION AND SCALE
  // =====================================================================

  // 11. Scheduled work. Verified from the docs table.
  {
    slug: "ai-11-scheduled",
    title: "Let it work while you sleep",
    slides: [
      {
        eyebrow: "Claude Code",
        headline: [["It can run", "primary"], ["without you", "primary"], ["there.", "accent"]],
        body: "Four ways to schedule it, and they’re not interchangeable.",
        cta: "Swipe",
      },
      {
        eyebrow: "Where it runs",
        headline: [["That’s the whole", "primary"], ["decision.", "muted"]],
        rows: [
          { k: "01", v: "Routines — runs with your machine off" },
          { k: "02", v: "Desktop tasks — needs local files" },
          { k: "03", v: "GitHub Actions — tied to repo events" },
          { k: "04", v: "/loop — while the session is open" },
        ],
      },
      {
        eyebrow: "The rule",
        headline: [["Local files mean", "primary"], ["local runs.", "muted"]],
        body: "Anything touching uncommitted changes or files that never leave your laptop has to run on your machine. Everything else can run where you aren’t.",
      },
      {
        eyebrow: "Write it differently",
        headline: [["It can’t ask you", "primary"], ["a question.", "danger"]],
        body: "A scheduled prompt runs alone, so vagueness has nowhere to go. Say what success looks like and what to do with the result — including where to put it.",
      },
      {
        eyebrow: "Worth automating",
        headline: [["The jobs you", "primary"], ["keep not doing.", "accent"]],
        body: "Reviewing open PRs. Auditing dependencies. Checking what broke overnight. Not glamorous, and that’s exactly why they slip.",
        cta: "Save this",
      },
    ],
  },

  // 12. Codebase onboarding.
  {
    slug: "ai-12-new-codebase",
    title: "Day one in a strange codebase",
    slides: [
      {
        eyebrow: "Claude Code",
        headline: [["A codebase you", "primary"], ["didn’t write, in", "primary"], ["an hour.", "accent"]],
        body: "The order of the questions is what makes this work.",
        cta: "Swipe",
      },
      {
        eyebrow: "Wide first",
        headline: [["Shape before", "primary"], ["detail.", "muted"]],
        code: {
          file: "prompt",
          accentFile: true,
          lines: [
            [["give me an overview of this codebase", "text"]],
            [["what are the key data models?", "text"]],
            [["how is authentication handled?", "text"]],
          ],
        },
        body: "Broad, then narrow. Starting with a specific file teaches you that file and nothing else.",
      },
      {
        eyebrow: "Then trace",
        headline: [["Follow one", "primary"], ["thing end to", "primary"], ["end.", "muted"]],
        body: "“Trace the login process from front end to database.” One complete path teaches you more about a system’s shape than ten isolated explanations.",
      },
      {
        eyebrow: "Ask for the map",
        headline: [["Conventions and", "primary"], ["vocabulary.", "muted"]],
        body: "Request the project’s own terms and patterns explicitly. Every codebase has words that mean something specific locally, and nobody writes them down.",
      },
      {
        eyebrow: "Then write it",
        headline: [["Turn the answers", "primary"], ["into CLAUDE.md.", "accent"]],
        body: "You just did the work of understanding the project. Capturing it means neither of you repeats it next week.",
        cta: "Save this",
      },
    ],
  },

  // 13. It has its own docs. Small, surprising, verified.
  {
    slug: "ai-13-ask-it",
    title: "Ask it about itself",
    slides: [
      {
        eyebrow: "Claude Code",
        headline: [["Stop searching", "primary"], ["for the flag.", "accent"]],
        body: "It has its own documentation, current regardless of your version.",
        cta: "Swipe",
      },
      {
        eyebrow: "Just ask",
        headline: [["In the same", "primary"], ["window.", "muted"]],
        code: {
          file: "prompt",
          accentFile: true,
          lines: [
            [["how does Claude Code handle permissions?", "text"]],
            [["what skills are available?", "text"]],
            [["what are the limitations?", "text"]],
          ],
        },
        body: "No tab switch, no out-of-date blog post, no guessing at a flag name.",
      },
      {
        eyebrow: "Why it’s better",
        headline: [["Tutorials go", "primary"], ["stale. Docs", "primary"], ["don’t.", "muted"]],
        body: "A tutorial from six months ago describes a version that no longer exists. The built-in answers track the current documentation.",
      },
      {
        eyebrow: "There’s a tour",
        headline: [["/powerup runs", "primary"], ["lessons.", "muted"]],
        body: "Interactive lessons with animated demos, inside the tool. Most people have never typed it.",
      },
      {
        eyebrow: "The habit",
        headline: [["Ask the thing", "primary"], ["you’re using.", "accent"]],
        body: "Every deck I post about this is checked against the docs first — and the fastest way to reach them is the window already open.",
        cta: "Follow for more",
      },
    ],
  },

  // 14. AI for non-code work. Genuinely underused.
  {
    slug: "ai-14-not-just-code",
    title: "It works outside your repo",
    slides: [
      {
        eyebrow: "Claude Code",
        headline: [["It’s not only", "primary"], ["for code.", "accent"]],
        body: "It works in any directory. Most people never point it at one.",
        cta: "Swipe",
      },
      {
        eyebrow: "Anywhere",
        headline: [["A folder of", "primary"], ["markdown is a", "primary"], ["project.", "muted"]],
        body: "A notes vault, a documentation folder, a pile of drafts. It searches, edits and reorganises text the same way it does code.",
      },
      {
        eyebrow: "What that unlocks",
        headline: [["Structure, not", "primary"], ["prose.", "muted"]],
        checks: [
          "Reorganising notes that grew by accident",
          "Finding every mention of a decision",
          "Turning a folder into a documentation site",
          "Rewriting a hundred files consistently",
        ],
      },
      {
        eyebrow: "It coexists",
        headline: [["Your other tools", "primary"], ["keep working.", "muted"]],
        body: "The .claude directory sits alongside anything else, and files are read fresh on each call — so an edit made in another app is seen the next time it reads that file.",
      },
      {
        eyebrow: "The point",
        headline: [["Text is text.", "accent"]],
        body: "Anything that is many files and a consistent change is the same problem, whether or not it compiles.",
        cta: "Save this",
      },
    ],
  },

  // 15. The closer — the honest limits.
  {
    slug: "ai-15-limits",
    title: "What it will not do for you",
    slides: [
      {
        eyebrow: "Hard truths",
        headline: [["It will not make", "primary"], ["you a better", "primary"], ["engineer.", "accent"]],
        body: "It’ll make you a faster one. Those aren’t the same, and the difference compounds.",
        cta: "Swipe",
      },
      {
        eyebrow: "The trap",
        headline: [["Working code", "primary"], ["you don’t", "primary"], ["understand.", "danger"]],
        body: "It’s genuinely possible to ship a feature you couldn’t have written. That’s fine occasionally and corrosive as a habit — the debt is knowledge, and it comes due during an incident.",
      },
      {
        eyebrow: "What still scales",
        headline: [["Judgement.", "primary"], ["Only judgement.", "muted"]],
        bars: [
          { label: "Typing speed", value: "solved", pct: 94, on: true },
          { label: "Knowing what to build", value: "unchanged", pct: 28 },
        ],
      },
      {
        eyebrow: "The way through",
        headline: [["Read what it", "primary"], ["writes.", "muted"]],
        body: "Not as review — as reading. It’s a fast route to unfamiliar patterns, but only if you look at them rather than approving them.",
      },
      {
        eyebrow: "Honestly",
        headline: [["Best tool I’ve", "primary"], ["used. Still just", "primary"], ["a tool.", "accent"]],
        body: "It’s why one person can ship accounts, payments, admin and native apps properly. It is not why the work is any good — that part didn’t move.",
        cta: "Follow for more",
      },
    ],
  },
];

module.exports = { carousels, HANDLE };
