# AI Tips

Fifteen carousels at **1080×1350 (4:5)** on Claude Code and AI-assisted
development. Same brand and template as the rest of this folder.

```bash
node "YusufCreates Social Media/AI Tips/build/render.js"
```

Run from the repo root — not from inside this folder, or the `playwright`
require fails. Writes 75 slides across 15 carousels.

## Why these fifteen

Twenty-three AI decks already exist across the other folders, so nothing here
repeats CLAUDE.md, skills, subagents, hooks, MCP, rewind, permission modes,
context management, headless mode, cost, prompt caching, RAG, ultrathink,
Cursor rules, Cursor Agent, or who-to-follow.

| Group | Decks |
|---|---|
| Sessions and parallel work | Worktrees, resuming, screenshots, @-mentions, plan-first |
| Working well | Verification, small steps, when to stop, tests first, reading the code |
| Automation and scale | Scheduling, new codebases, asking it about itself, non-code work, the limits |

## ⚠️ Verified, not recalled

Every command, flag and path was checked against `code.claude.com/docs` —
chiefly `common-workflows`, `sessions` and `worktrees`. `--worktree`,
`--continue`, `--resume`, `--from-pr`, `--permission-mode plan` and `/powerup`
are all real and current as of writing.

A wrong flag on a public post teaches people something broken, and this
audience runs the command rather than taking it on trust.

Deliberately excluded, and worth keeping excluded: subscription prices, model
names, rate limits and token costs. All change faster than a published post can
be edited.

**These decks go stale fastest.** Re-read the docs before re-posting one, not
just before writing a new one.

## The three that carry the set

- **`ai-06-verify`** is the most important habit here: ask for the artefact,
  not the summary. Test output comes from the test runner; a screenshot comes
  from the browser. Neither is written by the thing that made the change.
- **`ai-10-read-it`** says the unflattering part plainly — if you shipped it,
  you wrote it, whatever produced the characters.
- **`ai-15-limits`** closes by naming what the tool does not do. An account
  that only sells the upside reads as an advert.

## Before publishing

- **Every headline must end in terminal punctuation.** One shipped elsewhere
  reading "Your context is full of things you'll never" — the sentence simply
  stopped.
- **Apostrophes must be typographic** (`’`, not `'`).
- The renderer guards the rest: one slide per page load, and a warning on any
  PNG under 400KB.
