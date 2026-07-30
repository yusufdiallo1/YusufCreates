# Monday Posts

Ten carousels at **1080×1350 (4:5)**, rendered from code. Same brand and same
template as `Sunday Posts` and `YusufCreates Social Media/build-v2` — only the
subjects are new.

```
Monday Posts/
├── build/
│   ├── template.js   # shared with the other folders
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
node "Monday Posts/build/render.js"
```

Writes 50 slides across 10 carousels. It fails loudly rather than producing
wrong output: it aborts if the embedded font doesn't load, warns if a slide
overflows its safe area, and warns if a PNG lands under 400KB.

## Why these ten

Sixty-one decks precede these across the other folders, so the constraint was
genuinely new ground rather than a new angle on old ground. Nothing here repeats
CLAUDE.md, skills, hooks, rewind, permission modes, context, MCP, subagents,
cost, Cursor, ultrathink, who-to-follow, forms, empty states, loading,
microcopy, dark mode, briefs, ownership, aftercare, rebuilds, audits, deadlines,
saying no, or agency-vs-solo.

| Group | Decks |
|---|---|
| Engineering | Secret leaks, webhooks, rate limiting, lead scoring, structured data |
| Craft | Images, mobile navigation, analytics without a cookie banner |
| Business | Deposits, scope creep |

Three lean on real mechanisms in this repo rather than general advice:

- **`mon-01-secrets`** quotes the actual `postbuild` guard in `package.json`,
  which runs `scripts/check-secrets.mjs` and scans the built bundle for known
  credential shapes.
- **`mon-02-webhooks`** is a bug I actually shipped — a payment webhook
  subscribed to the wrong events, so money moved and nothing downstream ran.
- **`mon-04-lead-scoring`** uses the real bands from `src/lib/leadScoring.ts`:
  hot at 60+, warm at 32–59, and the floor that stops an undecided-but-serious
  enquiry falling to cold.

## ⚠️ Figures must stay in sync

| Content | Source of truth |
|---|---|
| All prices | `src/lib/pricing.ts` |
| Lead score bands | `src/lib/leadScoring.ts` |
| Credential patterns | `scripts/check-secrets.mjs` |
| Build and Care slots | `convex/capacity.ts` |

**Tier descriptions drift more quietly than prices.** Check `BUILD_TIERS`,
`ENTERPRISE_FEATURES`, `CARE_FEATURES` and `EVERY_PLAN` — not just the numbers.

No deck claims traffic, revenue or client counts. None of that is recorded in
the repo, and inventing it on a public post is a liability.

The 40/60 deposit split in `mon-09-deposit` is a real commercial term. If it
ever changes, that deck is a public promise that has to change with it.

## Before publishing

Two cheap checks, both learned from bugs that reached a live upload:

- **Every headline must end in terminal punctuation.** One shipped reading
  "Your context is full of things you'll never" — the sentence simply stopped.
- **Apostrophes must be typographic** (`’`, not `'`). Straight quotes are
  visible at feed scale beside the rest of the set.

The renderer already guards the third: it loads one slide per page so captures
happen at scroll offset zero, which avoids the scroll-repaint bug that once
produced slides with their chrome intact and everything below the fold black.
