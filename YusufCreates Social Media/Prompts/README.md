# Prompts

Ten carousels at **1080×1350 (4:5)** on getting more out of Claude Code. Same
brand and template as the rest of this folder.

```bash
node "Prompts/build/render.js"
```

Run from the repo root — not from inside this folder, or the `playwright`
require fails. Writes 50 slides across 10 carousels.

## Why these ten

Thirty-three AI decks already exist across `build-v2`, `AI Tips` and `build`,
so nothing here repeats CLAUDE.md, skills, subagents, hooks, MCP, rewind,
permission modes, context management, headless mode, cost, prompt caching, RAG,
Cursor rules, Cursor Agent, worktrees, sessions, screenshots, @-mentions,
scheduling, codebase onboarding, non-code uses, tool limits, or who-to-follow.

| Group | Decks |
|---|---|
| Making it yours | Slash commands, effort levels, model choice |
| Working with it | Interrupting, `/code-review`, `/memory`, multiline input |
| Method | Debugging, refactoring, prompt structure |

## ⚠️ Verified, not recalled

Every command and path was checked against the current docs before writing.
**Three things had changed since the earlier AI decks were published**, and
publishing from memory would have taught all three wrong:

| Was | Now |
|---|---|
| `/output-style` | **Removed.** Output styles live behind `/config` → "Output style". |
| `ultrathink` as the reasoning control | `/effort` — `low` · `medium` · `high` · `xhigh` · `max`. `ultrathink` still works as a *prompt keyword*, not a setting. |
| `/review` | `/code-review` (and `/security-review`). User-invocable only — it will not run itself. |

That last column is why `pr-02-effort` frames `ultrathink` as a per-turn
keyword rather than the main event, and why there is no output-styles deck in
this set at all — the command it would have taught no longer exists.

**These decks go stale fastest.** Re-read the docs before re-posting one, not
just before writing a new one.

Deliberately excluded, and worth keeping excluded: subscription prices, model
names, rate limits, token costs and version numbers. All change faster than a
published post can be edited. `pr-03-model` therefore talks about *sizes* of
model — largest, middle, fastest — and never names one.

## The three that carry the set

- **`pr-10-structure`** is the spine: goal, context, constraints, done. The
  fourth is the one people skip, and it's the one that makes verification
  possible at all.
- **`pr-08-debugging`** says the unintuitive part — leading with your theory
  anchors it to your guess. Give it evidence, not conclusions.
- **`pr-04-interrupt`** is the cheapest habit here. Escape stops the response
  and keeps the work; watching a wrong approach finish is pure waste.

## Before publishing

- **Every headline must end in terminal punctuation.** One shipped elsewhere
  reading "Your context is full of things you'll never" — the sentence simply
  stopped.
- **Apostrophes must be typographic** (`’`, not `'`).
- **Figures in a headline must match the block beneath it.** `pr-10` first
  rendered as "It fits in five lines" above a seven-line example; the example
  was cut, not the headline.
- The renderer guards the rest: one slide per page load, a warning on any slide
  that overflows its safe area, and a warning on any PNG under 400KB.
