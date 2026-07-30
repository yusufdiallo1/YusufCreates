# YusufCreates Social Media — v2 (graphic)

Twenty-six carousels at **1080×1350 (4:5)**, rendered from code. Same brand as v1,
but each slide shows a real object — a code window, a terminal, a file tree, a
comparison, a meter — instead of a headline on a gradient.

v1 in `build/` + `posts/` is unchanged and still postable. This is additive.

```
build-v2/
├── template.js   # layout, glass, graphic blocks
├── content.js    # all copy and figures  ← edit this
├── render.js     # screenshots each slide
├── inter.b64     # embedded font
└── inter.woff2
posts-v2/         # generated PNGs, one folder per carousel
```

## Rendering

From the repo root — **not from inside `build-v2/`**, or the `playwright`
require fails:

```bash
node "YusufCreates Social Media/build-v2/render.js"
```

Writes 130 slides across 26 carousels. It fails loudly rather than producing wrong
output: it aborts if the embedded font doesn't load, and warns per slide if
content overflows the safe area.

## The two constraints that produced v2

**4:5, not 9:16.** Instagram carousels cap at 4:5. v1 originally rendered
1080×1920 (the Reels ratio), which Instagram centre-cropped on upload — cutting
the logo lockup off the top and the progress dots off the bottom of every slide.
4:5 is the tallest ratio a carousel accepts. The vertical budget is ~30% smaller
than 9:16, so type and spacing here are tuned for it; changing the canvas means
re-tuning both.

**Filenames carry the deck slug.** Instagram's picker sorts by filename in one
flat recents view, so five files called `01.png` from different decks came back
shuffled. `v2-03-cursor-rules-02.png` sorts unambiguously.

## Graphic blocks

Set one per slide in `content.js`. The template drops the headline a size step
when a graphic is present, so the block keeps its room.

| Key | Renders |
|---|---|
| `code` | Code window with window chrome and syntax colour |
| `terminal` | Terminal with accent prompt, green/red output |
| `tree` | File tree; `on: true` highlights the file in question |
| `compare` | Two columns, red "wrong" vs green "right" |
| `steps` | Numbered steps with a connecting spine |
| `figure` | One oversized numeral with a caption |
| `bars` | Labelled meters, for contrasts |
| `splash` | Claude Code startup banner, redrawn |
| `people` | Creator cards with monogram avatars |
| `quote` | Pull quote with attribution |
| `checks` `rows` `tiers` `stats` | Carried over from v1 |

Code is **hand-tokenised**, not regex-highlighted:

```js
code: {
  file: "CLAUDE.md",
  lines: [
    [["@AGENTS.md", "accent"]],
    "",
    [["# comment", "comment"]],
  ],
}
```

Kinds: `comment` `key` `str` `num` `fn` `punct` `accent` `text`. Hand-tokenising
means nothing is mis-lexed on a public post. Blank leading/trailing lines are
trimmed at render, so `""` is only for internal spacing.

Panels are **solid, not glass** — monospace over a blurred refraction filter is
where legibility dies. Glass is kept for the chrome, eyebrows, CTAs and tiles.

## ⚠️ Figures must stay in sync

| Content | Source of truth |
|---|---|
| All tier prices | `src/lib/pricing.ts` |
| Build slot count | `convex/capacity.ts` — `BUILD_SLOTS` |
| Project details, metrics, live URLs | `convex/seed.ts` |

Current: Launch $400 · Growth $750/$950 · Web app from $2,500 · iOS & macOS from
$3,200 · Enterprise from $5,500 · Care Plan $180/mo, or $1,800/year.

**Tier descriptions go stale the same way prices do, and more quietly.** A deck
once said the Care Plan included "unlimited small edits" — `pricing.ts`
deliberately replaced that wording with "100 small fixes and 20 big fixes a
month", with a comment explaining that "unlimited" was never true in the way
anyone reads it. The price was right and the promise was wrong, which is worse:
it's a commitment you'd have to honour or walk back. Check `BUILD_TIERS`,
`ENTERPRISE_FEATURES`, `CARE_FEATURES` and `EVERY_PLAN` — not just the numbers.

No deck claims traffic, revenue or client counts — none of that is recorded in
the repo, and inventing it on a public post is a liability.

## ⚠️ Tool claims are verified, not recalled

Every path, frontmatter field and hook event name was checked against
`docs.claude.com/en/docs/claude-code` and `cursor.com/docs/context/rules`. A
wrong path is worse than no post: it teaches people something broken, and this
audience spots it immediately.

Deliberately excluded, and worth keeping excluded: subscription prices, model
names, rate limits, token costs. They change faster than a published post can be
edited and none are checkable from this repo.

**These decks go stale fastest.** Both tools ship constantly. Re-read the docs
before re-posting one, not just before writing a new one.

## ⚠️ Real people: monograms, never photographs

Decks 22 and 23 name real creators. Two rules, both deliberate:

**No headshots.** A photograph is the subject's copyright, and putting someone's
face on a branded post implies an endorsement they never gave. The `people` and
`quote` blocks render initials in the accent colour instead — same "this is a
person" signal, none of the exposure. If you ever swap in real photos, get
permission first; the avatar slot is sized for it.

**No invented quotes.** Every line about a named person has to be sourced, and
the one quotation is explicitly labelled a paraphrase in its attribution line.
Fabricating a quote and attributing it to a real person is both dishonest and
exactly the kind of thing this audience checks.

The Claude Code splash in deck 17 is redrawn rather than screenshotted for a
related reason: a real screenshot leaks the working directory, the plan tier,
and whatever warnings happen to be firing that day.

## The decks

| Slug | Angle |
|---|---|
| `v2-01-claude-code-context` | CLAUDE.md, the `@import`, the 200-line limit |
| `v2-02-claude-code-setup` | Skills, subagents, hooks |
| `v2-03-cursor-rules` | `.mdc` vs `.md`, four activation modes |
| `v2-04-ai-tools-honestly` | What these tools don't fix |
| `v2-05-pricing` | The tier ladder |
| `v2-06-promo-slots` | Two build slots |
| `v2-07-rewind` | Checkpoints, `Esc Esc`, and what rewind won't undo |
| `v2-08-permission-modes` | `Shift+Tab`, plan mode, auto mode |
| `v2-09-context` | `/clear` vs `/compact`, `/context` |
| `v2-10-headless` | `claude -p`, JSON output, budget caps |
| `v2-11-fast-sites` | Perceived speed vs measured speed |
| `v2-12-one-person` | How one person ships this much |
| `v2-13-skills` | SKILL.md, lazy loading, invocation switches |
| `v2-14-ultrathink` | The `ultrathink` keyword and `effort` levels |
| `v2-15-hooks-automation` | Stop hooks, and why some commands aren't built in |
| `v2-16-who-to-follow` | Creators worth following, and how to filter |
| `v2-17-first-session` | The startup banner, `/init`, first five minutes |
| `v2-18-mcp` | Connecting real tools instead of pasting data |
| `v2-19-subagents` | Delegating to a fresh context |
| `v2-20-cursor-agent` | Cursor Tab vs Agent |
| `v2-21-better-prompts` | Outcome over instruction |
| `v2-22-nate-herk` | One creator, sourced facts, one paraphrase |
| `v2-23-follow-list` | Five worth following |
| `v2-24-cost` | Context is the bill |
| `v2-25-git-discipline` | Commit before you let it run |
| `v2-26-what-changed` | What a year with these tools actually changed |

Captions: `CAPTIONS-V2.md` covers `v2-07` onward plus the posting order.
`v2-01`–`v2-04` reuse decks 12–15 in `CAPTIONS.md`; `v2-05`/`v2-06` reuse decks
7 and 9.

**Alt text:** headlines are baked into the image, so screen readers get nothing
without it. Paste each slide's headline into Instagram's alt text field
(Advanced settings → Write alt text).
