# Captions — Prompts

Handle: **@yusufcreatesdev** · 10 carousels · 5 slides each · 1080×1350 (4:5)

Instagram truncates around 125 characters, so the first line of each caption is
written to stand alone before the "more" cut.

**Commands go stale.** Before re-posting any of these, check the command still
exists — `/output-style` was removed and a caption teaching it would send people
to a dead command. See `README.md`.

---

## `pr-01-slash-commands`

> You can add your own slash commands to Claude Code. One markdown file, and it
> appears in the menu next to the built-in ones.
>
> `.claude/commands/ship.md` becomes `/ship`. The filename is the command name.
> Put it in the repo and everyone on the team gets it on their next pull —
> which is the part people miss. It's not a personal shortcut, it's shared
> tooling.
>
> INSIDE IT — a description, an argument hint, and the instructions in plain
> English. `$ARGUMENTS` gets replaced with whatever you type after the command.
>
> THE NEWER FORM — skills. A folder instead of a single file, so it can carry
> scripts and reference docs alongside the instructions. Start with a command,
> move it when it outgrows one file.
>
> THE RULE — if you've typed the same prompt twice from memory, it should have
> been a file the first time.

```
#claudecode #aitools #developertools #webdev #productivity #buildinpublic
#softwaredevelopment #codingtips #ai #devtools #programming #automation
#frontenddeveloper #indiehacker #terminal
```

---

## `pr-02-effort`

> There's a dial for how hard Claude Code thinks, and most people have never
> touched it.
>
> `/effort` — low, medium, high, xhigh, max. It sets how much reasoning happens
> before it acts.
>
> WHEN TO TURN IT DOWN — renames, formatting, mechanical edits across a hundred
> files. There's no decision being made, so paying for deliberation is waste.
>
> WHEN TO TURN IT UP — architecture calls, a bug that only appears in
> production, anything you'd normally sleep on before deciding.
>
> PER PROMPT — the word "ultrathink" anywhere in a message raises the effort for
> that turn only, without changing the session. Useful when one question is much
> harder than the rest of what you're doing.
>
> THE PRINCIPLE — maximum effort on a rename is waste. Default effort on an
> architecture decision is how you get a confident wrong answer.

```
#claudecode #aitools #developertools #ai #codingtips #softwaredevelopment
#buildinpublic #devtools #programming #webdev #aiassisted #productivity
#engineering #indiehacker #promptengineering
```

---

## `pr-03-model`

> You're probably using one model for everything. There are several, and they're
> not shaped or priced the same.
>
> `/model` switches mid-session, or start with `claude --model`. It takes an
> alias, so you don't need to remember a full model ID.
>
> THE ROUGH SPLIT — the largest for hard reasoning and architecture. The middle
> for everyday building. The fastest for search, summaries and bulk edits.
>
> THE TRICK NOBODY USES — a subagent can run a different model from your main
> session. Set it in the subagent's frontmatter and the reading-heavy work runs
> on something cheap and fast, while the model you actually want writing code
> stays on the main thread.
>
> THE PRINCIPLE — reaching for the biggest model on every task is the same
> mistake as never reaching for it.
>
> (No model names here on purpose — they change faster than a post can be
> edited. Check the docs for what's current.)

```
#claudecode #aitools #ai #developertools #llm #codingtips #devtools
#softwaredevelopment #buildinpublic #programming #aiassisted #webdev
#engineering #machinelearning #indiehacker
```

---

## `pr-04-interrupt`

> You can stop it mid-sentence. Watching a wrong approach finish is a habit
> worth breaking.
>
> Escape. That's the whole thing. One press stops the response where it is, and
> everything it already did stays — files it wrote are still written, and the
> conversation keeps its context.
>
> WHAT MOST PEOPLE DO — wait four minutes for an answer they already know is
> wrong, then re-explain from scratch. You pay for the whole wrong answer and
> still have to describe the right one.
>
> WHAT TO DO INSTEAD — interrupt two sentences in, while the context is still
> loaded, and correct it. "Not that file." "Simpler than that."
>
> THE OTHER ESCAPE — press it twice on an empty prompt and you get the rewind
> menu. Press it twice with text typed and it clears the box but keeps it in
> history, so Up brings it back.
>
> THE PRINCIPLE — the moment you think "that's not what I meant" is the cheapest
> moment to say so.

```
#claudecode #aitools #developertools #productivity #codingtips #devtools
#ai #softwaredevelopment #buildinpublic #programming #webdev #terminal
#aiassisted #workflow #indiehacker
```

---

## `pr-05-code-review`

> There's a review command built into Claude Code. Most people write their own
> prompt for this every single time.
>
> `/code-review` reads the changes on your branch and reports what it finds.
> There's a `/security-review` too, pointed specifically at vulnerabilities.
>
> DEPTH IS A CHOICE — ask for less and you get the few findings it's confident
> about. Ask for more and you get broader, noisier, more thorough coverage.
> `--fix` applies what it finds to your working tree.
>
> THE HONEST PART — it will not run itself. That's deliberate. A review you
> didn't ask for is a review you'll skim, so you have to type it, which means
> you have to decide the change is worth reviewing.
>
> IT DOES NOT REPLACE reading your own diff. It catches the thing you read past
> at 11pm.

```
#claudecode #codereview #aitools #developertools #softwaredevelopment
#codingtips #devtools #ai #buildinpublic #programming #webdev #cleancode
#engineering #security #indiehacker
```

---

## `pr-06-memory`

> Claude Code keeps notes on your project that survive clearing the
> conversation. Three different kinds, and they behave differently.
>
> `/memory` lists all of them and opens them in your editor.
>
> CLAUDE.md — committed to the repo, so the whole team gets the same rules.
> CLAUDE.local.md — yours alone, gitignored, for the things that are true only
> on your machine.
> Auto memory — notes it writes as you work, without being asked.
>
> THE CATCH nobody mentions: auto notes go stale quietly. A note written three
> weeks ago describes the code as it was then. If it names a file or a flag,
> that file might be gone. Worth reading occasionally and deleting what's wrong
> — a confidently outdated note is worse than no note.
>
> THE RULE — a correction typed into the chat lasts one session. The same
> sentence in CLAUDE.md lasts until you change it.

```
#claudecode #aitools #developertools #devtools #codingtips #buildinpublic
#softwaredevelopment #ai #programming #webdev #documentation #workflow
#aiassisted #productivity #indiehacker
```

---

## `pr-07-multiline`

> Your prompts are short because Enter sends. You're writing one-liners to avoid
> fighting the input box.
>
> FOUR WAYS TO GET A NEWLINE —
> → Shift+Enter, in most modern terminals
> → Ctrl+J, works anywhere with no setup
> → A backslash then Enter, works anywhere
> → Option+Enter on macOS, if Option is set as Meta
>
> ONE-TIME SETUP — `/terminal-setup` installs the Shift+Enter binding properly.
> Covers VS Code, Cursor, Alacritty, Zed and others.
>
> WHY IT MATTERS — a request with the goal on one line and the constraints
> beneath it gets read as a spec. The same words in a single run-on line get
> read as a vague wish. Structure beats length.
>
> THE HABIT — write the whole thought, then send once. Three half-prompts in a
> row cost more than one complete one.

```
#claudecode #terminal #developertools #devtools #codingtips #productivity
#ai #aitools #softwaredevelopment #buildinpublic #programming #webdev
#commandline #workflow #indiehacker
```

---

## `pr-08-debugging`

> "It's broken" is not a bug report. You'd reject it from a colleague, and it
> gets you a guess from an AI.
>
> THREE THINGS, EVERY TIME — what should have happened, what happened instead
> (paste it, don't paraphrase), and the exact steps that trigger it.
>
> THE MISTAKE — leading with your theory. "The auth middleware is broken, fix
> it" points it at one file. If your theory was wrong, now you're both wrong,
> and it'll produce a confident change to code that was fine.
>
> SAY THIS INSTEAD — "login fails with this error, find the cause." Now it reads
> the trace and follows it wherever it actually goes.
>
> BEFORE THE FIX — ask it to explain the cause before changing anything. A fix
> you don't understand is a fix you can't verify, and the same bug comes back
> wearing different clothes.
>
> THE PRINCIPLE — give it evidence, not conclusions. It's better at reading a
> stack trace than at reading your mind.

```
#debugging #claudecode #aitools #developertools #codingtips #softwaredevelopment
#devtools #ai #buildinpublic #programming #webdev #problemsolving
#engineering #aiassisted #indiehacker
```

---

## `pr-09-refactor`

> "Clean this up" is how you lose a working file. The refactor and the bug fix
> arrive in the same diff and you can't tell them apart.
>
> ONE KIND OF CHANGE AT A TIME. Restructure, or fix behaviour — never both in
> one pass. When every line looks changed, you can't see which change did what,
> so you approve all of it or none of it.
>
> THE ORDER —
> → Get the current behaviour under test first
> → Commit, so there's a point to return to
> → Refactor structure only, no behaviour changes
> → Run the same tests, untouched, still green
>
> THE PHRASING — constraints do more work here than instructions. "Leave the
> public API exactly as it is." "Don't add a dependency." "Match the pattern in
> the file above."
>
> THE DEFINITION — if the tests changed, it wasn't a refactor. That's the only
> check that catches a rewrite pretending to be a tidy-up.

```
#refactoring #cleancode #claudecode #aitools #developertools #codingtips
#softwaredevelopment #devtools #testing #buildinpublic #programming #webdev
#engineering #ai #indiehacker
```

---

## `pr-10-structure`

> Same request, different shape, different result. Not longer — ordered.
>
> FOUR PARTS, IN THIS ORDER —
> → GOAL: the outcome, in one sentence
> → CONTEXT: @ the files, don't describe them
> → CONSTRAINTS: what it must not do
> → DONE: how you'll both know it worked
>
> It fits in five lines. "Show checkout errors inline, not in an alert.
> @src/checkout/Form.tsx. No new dependencies. Done when a declined card shows
> the message under the field."
>
> THE PART PEOPLE SKIP is the last one. Without it, it stops when the code looks
> finished. With it, there's something to check against — and it'll often verify
> the work itself before handing it back to you.
>
> THE TEST — if you can't say how you'd know it succeeded, you haven't finished
> thinking about the task yet. No amount of rephrasing fixes that.

```
#promptengineering #claudecode #aitools #developertools #codingtips #ai
#softwaredevelopment #devtools #buildinpublic #programming #webdev
#aiassisted #productivity #engineering #indiehacker
```

---

## Posting order

Front-load the ones with an immediate payoff — a reader who tries `/effort` or
Escape once has a reason to come back. The method decks land better after the
account has demonstrated it knows the tool.

| # | Deck | Why here |
|---|---|---|
| 1 | `pr-04-interrupt` | Costs nothing to try, works immediately |
| 2 | `pr-01-slash-commands` | Most "I didn't know you could do that" of the set |
| 3 | `pr-10-structure` | The spine — best single save in the set |
| 4 | `pr-02-effort` | Genuinely unknown, genuinely useful |
| 5 | `pr-08-debugging` | Broadest appeal, no setup needed |
| 6 | `pr-07-multiline` | Small, universal, instantly fixable annoyance |
| 7 | `pr-05-code-review` | Pairs with the review-is-the-job thread |
| 8 | `pr-06-memory` | Follows naturally from slash commands |
| 9 | `pr-09-refactor` | Narrower audience, higher credibility |
| 10 | `pr-03-model` | Most likely to date — post while current |
