/**
 * Prompts — carousel content.
 *
 * Ten decks on getting more out of Claude Code. Thirty-three AI decks already
 * exist across `build-v2`, `AI Tips` and `build`, so nothing here repeats
 * CLAUDE.md, skills, subagents, hooks, MCP, rewind, permission modes, context
 * management, headless mode, cost, prompt caching, RAG, ultrathink as a
 * standalone subject, Cursor rules, Cursor Agent, worktrees, sessions,
 * screenshots, @-mentions, scheduling, codebase onboarding, non-code uses,
 * tool limits, or the who-to-follow set.
 *
 * The open ground this set takes: custom slash commands, effort levels, model
 * choice, interrupting mid-run, /code-review, /memory, multiline input,
 * debugging method, refactor sequencing, and prompt structure.
 *
 * VERIFIED, NOT RECALLED. Every command, flag and path below was checked
 * against the current docs before writing, and three things changed since the
 * earlier decks were published:
 *
 *   - `/output-style` was REMOVED in v2.1.91. Output styles now live behind
 *     `/config` → "Output style". A deck teaching the old command would send
 *     people to a command that no longer exists.
 *   - `/effort` is now the reasoning control (low·medium·high·xhigh·max).
 *     `ultrathink` still works as a prompt keyword — it is not a setting.
 *   - The command is `/code-review`, not `/review`.
 *
 * Deliberately excluded, and worth keeping excluded: subscription prices,
 * rate limits, token costs, and version numbers in slide copy. All change
 * faster than a published post can be edited.
 *
 * Code blocks are hand-tokenised as [text, kind] pairs so nothing is mis-lexed
 * on a public post. Kinds: comment, key, str, num, fn, punct, accent, text.
 */

const HANDLE = "@yusufcreatesdev";

const carousels = [
  // =====================================================================
  // MAKING IT YOURS — commands, effort, models
  // =====================================================================

  // 1. Custom slash commands. The most useful thing nobody sets up.
  {
    slug: "pr-01-slash-commands",
    title: "Build your own slash command",
    slides: [
      {
        eyebrow: "Claude Code",
        headline: [["You can add your", "primary"], ["own slash", "primary"], ["commands.", "accent"]],
        body: "One markdown file. It shows up in the menu like the built-in ones.",
        cta: "Swipe",
      },
      {
        eyebrow: "The file",
        headline: [["The filename", "primary"], ["is the command.", "muted"]],
        tree: {
          title: "your-project",
          items: [
            { name: ".claude", dir: true },
            { name: "commands", dir: true, depth: 1 },
            { name: "ship.md", depth: 2, on: true, note: "/ship" },
            { name: "audit.md", depth: 2, note: "/audit" },
          ],
        },
        body: "Drop it in the repo and the whole team gets it on their next pull.",
      },
      {
        eyebrow: "Inside it",
        headline: [["Arguments get", "primary"], ["substituted.", "muted"]],
        code: {
          file: "ship.md",
          accentFile: true,
          lines: [
            [["---", "punct"]],
            [["description", "key"], [": ", "punct"], ["Run checks, then commit", "str"]],
            [["argument-hint", "key"], [": ", "punct"], ["[message]", "str"]],
            [["---", "punct"]],
            "",
            [["Run the tests. If they pass,", "text"]],
            [["commit with message: ", "text"], ["$ARGUMENTS", "accent"]],
          ],
        },
      },
      {
        eyebrow: "The upgrade",
        headline: [["Skills are the", "primary"], ["newer form.", "muted"]],
        body: "A folder instead of a file, so it can carry scripts and reference docs alongside the instructions. Commands still work — start with one, move it when it outgrows a single file.",
      },
      {
        eyebrow: "The habit",
        headline: [["Typed it twice?", "primary"], ["Make it a", "primary"], ["command.", "accent"]],
        body: "The prompt you keep rewriting from memory is a file you haven’t written yet.",
        cta: "Save this",
      },
    ],
  },

  // 2. Effort levels. Genuinely new — supersedes the ultrathink-only framing.
  {
    slug: "pr-02-effort",
    title: "Turn the thinking up and down",
    slides: [
      {
        eyebrow: "Claude Code",
        headline: [["There’s a dial", "primary"], ["for how hard", "primary"], ["it thinks.", "accent"]],
        body: "Most people leave it on default forever and never notice it exists.",
        cta: "Swipe",
      },
      {
        eyebrow: "The command",
        headline: [["Five levels.", "primary"]],
        terminal: {
          title: "claude",
          lines: [
            ["/effort", "cmd"],
            ["", "out"],
            ["low · medium · high · xhigh · max", "ok"],
            ["", "out"],
            ["high is the default", "out"],
          ],
        },
        body: "It changes how much reasoning happens before it acts.",
      },
      {
        eyebrow: "When to move it",
        headline: [["Down for typing.", "primary"], ["Up for thinking.", "muted"]],
        compare: {
          neutral: true,
          bad: {
            label: "Turn it down",
            code: "low",
            note: "Renames, formatting, mechanical edits across many files. There’s no decision to make.",
          },
          good: {
            label: "Turn it up",
            code: "xhigh",
            note: "Architecture, a bug that only happens in production, anything you’d normally sleep on.",
          },
        },
      },
      {
        eyebrow: "Per prompt",
        headline: [["Or just say", "primary"], ["ultrathink.", "accent"]],
        body: "The word anywhere in a message raises the effort for that turn only, without changing the session. Useful when one question in a session is much harder than the rest.",
      },
      {
        eyebrow: "The habit",
        headline: [["Match the dial", "primary"], ["to the problem.", "accent"]],
        body: "Maximum effort on a rename is waste. Default effort on an architecture call is how you get a confident wrong answer.",
        cta: "Save this",
      },
    ],
  },

  // 3. Model selection. Not covered anywhere.
  {
    slug: "pr-03-model",
    title: "Pick the right model",
    slides: [
      {
        eyebrow: "Claude Code",
        headline: [["You’re probably", "primary"], ["using one model", "primary"], ["for everything.", "accent"]],
        body: "There are several, and they’re not priced or shaped the same.",
        cta: "Swipe",
      },
      {
        eyebrow: "Switching",
        headline: [["One command,", "primary"], ["mid-session.", "muted"]],
        terminal: {
          title: "claude",
          lines: [
            ["/model", "cmd"],
            ["", "out"],
            ["opens a picker", "out"],
            ["", "out"],
            ["/model haiku", "cmd"],
            ["switched", "ok"],
          ],
        },
        body: "Or start a session on one: claude --model opus.",
      },
      {
        eyebrow: "The rough split",
        headline: [["Big model for", "primary"], ["decisions.", "muted"]],
        rows: [
          { k: "01", v: "Hard reasoning, architecture — the largest" },
          { k: "02", v: "Everyday building — the middle" },
          { k: "03", v: "Search, summaries, bulk edits — the fastest" },
        ],
      },
      {
        eyebrow: "The trick",
        headline: [["A subagent can", "primary"], ["use a different", "primary"], ["one.", "accent"]],
        body: "Set model in a subagent’s frontmatter and the reading-heavy work runs on something cheap while your main session stays on the model you actually want writing the code.",
      },
      {
        eyebrow: "The habit",
        headline: [["The default isn’t", "primary"], ["always right.", "accent"]],
        body: "Reaching for the biggest model on every task is the same mistake as never reaching for it.",
        cta: "Save this",
      },
    ],
  },

  // =====================================================================
  // WORKING WITH IT — steering, reviewing, remembering
  // =====================================================================

  // 4. Interrupting. Nobody teaches this and everybody needs it.
  {
    slug: "pr-04-interrupt",
    title: "Stop watching it go wrong",
    slides: [
      {
        eyebrow: "Claude Code",
        headline: [["You can stop it", "primary"], ["mid-sentence.", "accent"]],
        body: "Watching a wrong approach finish is a habit worth breaking.",
        cta: "Swipe",
      },
      {
        eyebrow: "The key",
        headline: [["Escape. That’s", "primary"], ["the whole thing.", "muted"]],
        body: "One press stops the response where it is. Everything it already did stays — files it wrote are still written, and the conversation keeps the context.",
      },
      {
        eyebrow: "What most people do",
        headline: [["Let it finish,", "primary"], ["then complain.", "danger"]],
        compare: {
          bad: {
            label: "Costly",
            code: "wait 4 min\nthen re-explain",
            note: "You pay for the whole wrong answer and still have to describe the right one.",
          },
          good: {
            label: "Cheap",
            code: "Esc\n“not that file —”",
            note: "Correct it two sentences in, while the context is still loaded.",
          },
        },
      },
      {
        eyebrow: "The other Escape",
        headline: [["Press it twice.", "primary"]],
        body: "With an empty prompt, double-Escape opens the rewind menu. With text typed, it clears the box and keeps it in history — Up brings it back.",
      },
      {
        eyebrow: "The habit",
        headline: [["Steer early.", "primary"], ["It’s not rude.", "accent"]],
        body: "The moment you think “that’s not what I meant” is the cheapest moment to say so.",
        cta: "Save this",
      },
    ],
  },

  // 5. /code-review. Real, user-invocable, and unknown.
  {
    slug: "pr-05-code-review",
    title: "Review it before you push",
    slides: [
      {
        eyebrow: "Claude Code",
        headline: [["There’s a review", "primary"], ["command built", "primary"], ["in.", "accent"]],
        body: "Most people write their own prompt for this every time.",
        cta: "Swipe",
      },
      {
        eyebrow: "The command",
        headline: [["It reads your", "primary"], ["branch.", "muted"]],
        terminal: {
          title: "claude",
          lines: [
            ["/code-review", "cmd"],
            ["", "out"],
            ["reviewing changes on this branch…", "out"],
            ["", "out"],
            ["3 findings", "ok"],
          ],
        },
        body: "There’s a /security-review too, aimed specifically at vulnerabilities.",
      },
      {
        eyebrow: "Depth",
        headline: [["Ask for more", "primary"], ["when it matters.", "muted"]],
        rows: [
          { k: "01", v: "low — the few things it’s sure about" },
          { k: "02", v: "high — broader, noisier, more thorough" },
          { k: "03", v: "--fix — applies findings to your working tree" },
        ],
      },
      {
        eyebrow: "The honest part",
        headline: [["It won’t run", "primary"], ["itself.", "danger"]],
        body: "This is deliberate — a review you didn’t ask for is a review you’ll skim. You have to type it, which means you have to decide the change is worth reviewing.",
      },
      {
        eyebrow: "The habit",
        headline: [["Second pass", "primary"], ["before the push.", "accent"]],
        body: "It doesn’t replace reading your own diff. It catches the thing you read past at 11pm.",
        cta: "Save this",
      },
    ],
  },

  // 6. /memory. Distinct from the CLAUDE.md deck — this is the command.
  {
    slug: "pr-06-memory",
    title: "It remembers between sessions",
    slides: [
      {
        eyebrow: "Claude Code",
        headline: [["It keeps notes", "primary"], ["on your project.", "accent"]],
        body: "Not the conversation — a separate memory that survives /clear.",
        cta: "Swipe",
      },
      {
        eyebrow: "The command",
        headline: [["/memory shows", "primary"], ["you all of it.", "muted"]],
        terminal: {
          title: "claude",
          lines: [
            ["/memory", "cmd"],
            ["", "out"],
            ["CLAUDE.md            project", "out"],
            ["CLAUDE.local.md      yours, untracked", "out"],
            ["memory/              auto-saved notes", "out"],
          ],
        },
        body: "It lists every memory file and opens them in your editor.",
      },
      {
        eyebrow: "Three kinds",
        headline: [["Shared, private,", "primary"], ["automatic.", "muted"]],
        rows: [
          { k: "01", v: "CLAUDE.md — committed, the whole team gets it" },
          { k: "02", v: "CLAUDE.local.md — yours alone, gitignored" },
          { k: "03", v: "Auto memory — written as you work" },
        ],
      },
      {
        eyebrow: "The catch",
        headline: [["Auto notes go", "primary"], ["stale quietly.", "danger"]],
        body: "A memory written three weeks ago describes the code as it was then. If it names a file or a flag, that file can be gone. Worth reading occasionally and deleting what’s wrong.",
      },
      {
        eyebrow: "The habit",
        headline: [["Put the rule in", "primary"], ["a file, not a", "primary"], ["message.", "accent"]],
        body: "A correction typed into the chat lasts one session. The same sentence in CLAUDE.md lasts until you change it.",
        cta: "Save this",
      },
    ],
  },

  // 7. Multiline input. Small, universal, immediately useful.
  {
    slug: "pr-07-multiline",
    title: "Enter keeps sending too early",
    slides: [
      {
        eyebrow: "Claude Code",
        headline: [["Your prompt is", "primary"], ["short because", "primary"], ["Enter sends.", "accent"]],
        body: "You’re writing one-liners to avoid fighting the input box.",
        cta: "Swipe",
      },
      {
        eyebrow: "The fix",
        headline: [["Four ways to", "primary"], ["get a newline.", "muted"]],
        rows: [
          { k: "01", v: "Shift+Enter — most modern terminals" },
          { k: "02", v: "Ctrl+J — works anywhere, no setup" },
          { k: "03", v: "\\ then Enter — works anywhere" },
          { k: "04", v: "Option+Enter — macOS, if Option is Meta" },
        ],
      },
      {
        eyebrow: "One-time setup",
        headline: [["Or bind it", "primary"], ["properly.", "muted"]],
        terminal: {
          title: "claude",
          lines: [
            ["/terminal-setup", "cmd"],
            ["", "out"],
            ["installs the Shift+Enter binding", "ok"],
          ],
        },
        body: "Covers VS Code, Cursor, Alacritty, Zed and others.",
      },
      {
        eyebrow: "Why it matters",
        headline: [["Structure beats", "primary"], ["length.", "muted"]],
        body: "A request with the goal on one line and the constraints beneath it gets read as a spec. The same words in a single run-on line get read as a vague wish.",
      },
      {
        eyebrow: "The habit",
        headline: [["Write the whole", "primary"], ["thought first.", "accent"]],
        body: "Send once, properly. Three half-prompts in a row cost more than one complete one.",
        cta: "Save this",
      },
    ],
  },

  // =====================================================================
  // METHOD — how to actually phrase the work
  // =====================================================================

  // 8. Debugging method. Explicitly flagged as thin ground.
  {
    slug: "pr-08-debugging",
    title: "How to hand it a bug",
    slides: [
      {
        eyebrow: "Claude Code",
        headline: [["“It’s broken”", "primary"], ["is not a bug", "primary"], ["report.", "accent"]],
        body: "You’d reject this from a colleague. It gets you a guess.",
        cta: "Swipe",
      },
      {
        eyebrow: "What it needs",
        headline: [["Three things,", "primary"], ["every time.", "muted"]],
        steps: [
          { k: "Expected", v: "What should have happened" },
          { k: "Actual", v: "What happened instead — paste it, don’t paraphrase" },
          { k: "Repro", v: "The exact steps that trigger it" },
        ],
      },
      {
        eyebrow: "The mistake",
        headline: [["Don’t lead with", "primary"], ["your theory.", "danger"]],
        compare: {
          bad: {
            label: "Anchored",
            code: "“the auth\nmiddleware is\nbroken, fix it”",
            note: "It now looks in one place. If you were wrong, you both are.",
          },
          good: {
            label: "Open",
            code: "“login fails\nwith this error.\nfind the cause”",
            note: "It reads the trace and follows it wherever it goes.",
          },
        },
      },
      {
        eyebrow: "Before the fix",
        headline: [["Ask for the", "primary"], ["cause first.", "muted"]],
        body: "“Explain why this happens before changing anything.” A fix you don’t understand is a fix you can’t verify, and the same bug comes back wearing different clothes.",
      },
      {
        eyebrow: "The habit",
        headline: [["Symptoms in.", "primary"], ["Diagnosis out.", "accent"]],
        body: "Give it evidence, not conclusions. It’s better at reading a stack trace than at reading your mind.",
        cta: "Save this",
      },
    ],
  },

  // 9. Refactoring. Flagged as open. Sequencing is the real content.
  {
    slug: "pr-09-refactor",
    title: "Refactoring without breaking it",
    slides: [
      {
        eyebrow: "Claude Code",
        headline: [["“Clean this up”", "primary"], ["is how you lose", "primary"], ["a working file.", "accent"]],
        body: "The refactor and the bug fix arrive in the same diff, and you can’t tell them apart.",
        cta: "Swipe",
      },
      {
        eyebrow: "The rule",
        headline: [["One kind of", "primary"], ["change at a", "primary"], ["time.", "muted"]],
        compare: {
          bad: {
            label: "Unreviewable",
            code: "restructure\n+ fix the bug\n+ rename",
            note: "Every line looks changed. You can’t see which change did what.",
          },
          good: {
            label: "Reviewable",
            code: "restructure only\n— behaviour\nidentical",
            note: "The tests should pass before and after, untouched.",
          },
        },
      },
      {
        eyebrow: "The order",
        headline: [["Cover it, then", "primary"], ["move it.", "muted"]],
        steps: [
          { k: "Test", v: "Get the current behaviour under test first" },
          { k: "Commit", v: "So there’s a point to return to" },
          { k: "Refactor", v: "Structure only — no behaviour changes" },
          { k: "Verify", v: "Same tests, still green, still untouched" },
        ],
      },
      {
        eyebrow: "The phrase",
        headline: [["Say what must", "primary"], ["not change.", "muted"]],
        body: "“Leave the public API exactly as it is.” “Don’t add a dependency.” “Match the pattern in the file above.” Constraints do more work here than instructions.",
      },
      {
        eyebrow: "The habit",
        headline: [["If the tests", "primary"], ["changed, it", "primary"], ["wasn’t a refactor.", "accent"]],
        body: "That’s the definition, and it’s the only check that catches a rewrite pretending to be a tidy-up.",
        cta: "Save this",
      },
    ],
  },

  // 10. Prompt structure. Deliberately distinct from v2-21 (problem-vs-solution)
  //     and ai-07 (scoping) — this one is about the shape of the message.
  {
    slug: "pr-10-structure",
    title: "The shape of a good prompt",
    slides: [
      {
        eyebrow: "Claude Code",
        headline: [["Same request.", "primary"], ["Different shape.", "primary"], ["Different result.", "accent"]],
        body: "Not longer — ordered. Four parts, in this order.",
        cta: "Swipe",
      },
      {
        eyebrow: "The four parts",
        headline: [["Goal, context,", "primary"], ["constraints,", "primary"], ["done.", "muted"]],
        steps: [
          { k: "Goal", v: "The outcome, in one sentence" },
          { k: "Context", v: "@ the files — don’t describe them" },
          { k: "Constraints", v: "What it must not do" },
          { k: "Done", v: "How you’ll both know it worked" },
        ],
      },
      {
        eyebrow: "In practice",
        headline: [["It fits in five", "primary"], ["lines.", "muted"]],
        code: {
          file: "prompt",
          accentFile: true,
          lines: [
            [["Show checkout errors inline,", "text"]],
            [["not in an alert.", "text"]],
            "",
            [["@src/checkout/Form.tsx", "accent"]],
            "",
            [["No new dependencies.", "text"]],
            [["Done when a declined card shows", "text"]],
            [["the message under the field.", "text"]],
          ],
        },
      },
      {
        eyebrow: "The part people skip",
        headline: [["Say what", "primary"], ["“done” means.", "muted"]],
        body: "Without it, it stops when the code looks finished. With it, there’s something to check against — and it’ll often verify the work itself before handing it back.",
      },
      {
        eyebrow: "The habit",
        headline: [["Write the test", "primary"], ["for your own", "primary"], ["prompt.", "accent"]],
        body: "If you can’t say how you’d know it succeeded, you haven’t finished thinking about the task yet — and no amount of rephrasing fixes that.",
        cta: "Save this",
      },
    ],
  },
];

module.exports = { carousels, HANDLE };
