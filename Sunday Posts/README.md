# Sunday Posts

Twenty carousels at **1080×1350 (4:5)**, rendered from code. Same brand and same
template as `YusufCreates Social Media/build-v2`, different subjects.

```
Sunday Posts/
├── build/
│   ├── template.js   # copied from build-v2 — layout, glass, graphic blocks
│   ├── content.js    # all copy and figures  ← edit this
│   ├── render.js     # screenshots each slide
│   ├── inter.b64     # embedded font
│   └── inter.woff2
├── posts/            # generated PNGs, one folder per carousel
├── CAPTIONS.md       # captions, hashtags, posting order
└── README.md
```

## Rendering

From the repo root — **not from inside this folder**, or the `playwright`
require fails:

```bash
node "Sunday Posts/build/render.js"
```

Writes 100 slides across 20 carousels. It fails loudly rather than producing
wrong output: it aborts if the embedded font doesn't load, warns if a slide
overflows its safe area, and warns if a PNG lands under 400KB.

That last check exists because of a real bug. Element screenshots scroll the
target into view to photograph it, and the layered background didn't always
repaint at the new offset — producing slides with their chrome intact and
everything below the fold flat black. The markup was correct, so only the image
was wrong, and it reached a live upload. This renderer loads one slide per page
so every capture happens at scroll offset zero, and the size check catches the
failure mode if it ever returns.

## Why these twenty

Nothing here repeats a subject from `YusufCreates Social Media`. No CLAUDE.md,
skills, hooks, rewind, permission modes, context management, MCP, subagents,
cost, Cursor rules, ultrathink, or the who-to-follow set.

| Group | Decks |
|---|---|
| The work | Ledger, Weather, small tools, on-device OCR, bilingual/RTL |
| Craft | Forms, empty states, loading, microcopy, dark mode |
| Business | Briefs, ownership, aftercare, rebuild-vs-redesign, self-audit |
| Build in public | This site, Care slots, deadlines, saying no, one person vs agency |

## ⚠️ Figures must stay in sync

| Content | Source of truth |
|---|---|
| All prices | `src/lib/pricing.ts` |
| Build and Care slots | `convex/capacity.ts` — `BUILD_SLOTS`, `CARE_SLOTS` |
| Projects, metrics, live URLs | `convex/seed.ts` |

Current: Launch $400 · Growth $750/$950 · Web app from $2,500 · iOS & macOS from
$3,200 · Enterprise from $5,500 · Care Plan $180/mo, or $1,800/year.

**Tier descriptions drift more quietly than prices.** A deck in the other folder
once promised "unlimited small edits" when `pricing.ts` had deliberately
replaced that with "100 small fixes and 20 big fixes a month" — the price was
right and the promise was wrong, which is worse, because it's a commitment you'd
have to honour or retract. Check `BUILD_TIERS`, `ENTERPRISE_FEATURES`,
`CARE_FEATURES` and `EVERY_PLAN`, not just the numbers.

No deck claims traffic, revenue or client counts — none of that is recorded in
the repo, and inventing it on a public post is a liability. The figures in
`sun-16-this-site` (27 tables, 36 routes, 10 emails) are counted from the
codebase and will drift as it grows.

## Before publishing

Two checks worth running, both cheap:

- **Every headline should end in terminal punctuation.** One shipped reading
  "Your context is full of things you'll never" — the sentence simply stopped.
  A headline that doesn't terminate is one the reader is left holding.
- **Apostrophes should be typographic** (`’`, not `'`) to match the rest of the
  set. Straight quotes are visible at feed scale.
