# Wednesday Posts

Ten carousels at **1080×1350 (4:5)**, rendered from code. Same brand and
template as the rest of this folder — only the subjects are new.

```
Wednesday Posts/
├── build/
│   ├── template.js   # shared with build-v2, Sunday, Monday, Tuesday
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
node "YusufCreates Social Media/Wednesday Posts/build/render.js"
```

Writes 50 slides across 10 carousels. It fails loudly rather than producing
wrong output: it aborts if the embedded font doesn't load, warns if a slide
overflows its safe area, and warns if a PNG lands under 400KB.

## Why these ten

Eighty-three decks precede these across `build/`, `build-v2/`, `Sunday Posts`,
`Monday Posts` and `Tuesday Posts`, so the constraint was genuinely new
subjects.

| Group | Decks |
|---|---|
| The invisible files | 404 and 500 pages, link previews, robots and sitemap |
| Engineering | Database indexes, time zones, no-RAG, prompt caching |
| Business and craft | Social proof, handover docs, starting out |

Four draw on real decisions in this repo rather than general advice:

- **`wed-04-indexes`** quotes the 48 indexes in `convex/schema.ts` — the point
  being that the count reflects queries written with an index in mind, not a
  large schema.
- **`wed-06-no-rag`** documents a deliberate architectural choice recorded in
  `src/lib/systemPrompt.ts`: a few dozen Q&A pairs fit in the prompt, so
  retrieval would add infrastructure, latency and a class of bugs to solve a
  problem that doesn't exist yet. It also states plainly where that stops being
  true.
- **`wed-07-prompt-cache`** reflects the constraint written above that same
  file: the system prompt must stay byte-identical between requests, so nothing
  varying may be interpolated into it.
- **`wed-01-404`**, **`wed-02-link-preview`** and **`wed-03-robots`** all point
  at files that exist here — `not-found.tsx`, `error.tsx`,
  `opengraph-image.tsx`, `sitemap.ts` and `robots.ts`.

## ⚠️ Figures must stay in sync

| Content | Source of truth |
|---|---|
| All prices | `src/lib/pricing.ts` |
| Index count | `convex/schema.ts` — currently 48 |
| The no-RAG reasoning | `src/lib/systemPrompt.ts` |
| Build and Care slots | `convex/capacity.ts` |

The index count in `wed-04` will drift as the schema grows. It's a claim about
this codebase, so re-count before re-posting that deck.

**Tier descriptions drift more quietly than prices.** Check `BUILD_TIERS`,
`ENTERPRISE_FEATURES`, `CARE_FEATURES` and `EVERY_PLAN` — not just the numbers.

No deck claims traffic, revenue or client counts. None of that is recorded in
the repo, and inventing it on a public post is a liability. Note that
`wed-08-proof` argues specifically against fabricated social proof — posting it
alongside invented testimonials would be self-refuting.

## Before publishing

Two cheap checks, both learned from bugs that reached a live upload:

- **Every headline must end in terminal punctuation.** One shipped reading
  "Your context is full of things you'll never" — the sentence simply stopped.
- **Apostrophes must be typographic** (`’`, not `'`). Straight quotes are
  visible at feed scale beside the rest of the set.

The renderer guards the third: it loads one slide per page so captures happen at
scroll offset zero, avoiding the scroll-repaint bug that once produced slides
with their chrome intact and everything below the fold black.
