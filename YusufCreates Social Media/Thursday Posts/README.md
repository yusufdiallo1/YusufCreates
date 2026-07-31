# Thursday Posts

Ten carousels at **1080×1350 (4:5)**, rendered from code. Same brand and
template as the rest of this folder — only the subjects are new.

```
Thursday Posts/
├── build/
│   ├── template.js   # shared with build-v2 and the other day folders
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
node "YusufCreates Social Media/Thursday Posts/build/render.js"
```

Writes 50 slides across 10 carousels. It fails loudly rather than producing
wrong output: it aborts if the embedded font doesn't load, warns if a slide
overflows its safe area, and warns if a PNG lands under 400KB.

## Why these ten

Ninety-three decks precede these across `build/`, `build-v2/` and the Sunday to
Wednesday folders, so the constraint was genuinely new subjects.

| Group | Decks |
|---|---|
| Security and data | Obscurity, narrow public writes, an auth bug, soft delete, scheduled jobs |
| Craft and content | File uploads, blog posts, pricing pages |
| Working together | Client updates, shipping |

Three come from real code and real mistakes here rather than general advice:

- **`thu-02-public-writes`** documents the rule written above
  `convex/engagement.ts`: public writes take fixed fields with length caps and
  nothing else, and the slide about soft limits is taken from that file's own
  admission that a browser-keyed like can be cleared and repeated.
- **`thu-03-auth-bug`** is a bug that shipped here — the sign-in form retried a
  failed sign-in as a sign-up, so every typed address became an account. The
  cleanup in `convex/cleanup.ts` had to remove both the user row and the
  credential, and refuses to touch the admin or any invited client.
- **`thu-01-obscurity`** is honest about this site's own obscured admin path:
  it reduces automated scanning and proves nothing on its own.

## ⚠️ Figures must stay in sync

| Content | Source of truth |
|---|---|
| All prices | `src/lib/pricing.ts` |
| Public-write rules | `convex/engagement.ts` |
| The auth cleanup and its guard | `convex/cleanup.ts` |
| Build and Care slots | `convex/capacity.ts` |

**Tier descriptions drift more quietly than prices.** Check `BUILD_TIERS`,
`ENTERPRISE_FEATURES`, `CARE_FEATURES` and `EVERY_PLAN` — not just the numbers.

No deck claims traffic, revenue or client counts. None of that is recorded in
the repo, and inventing it on a public post is a liability.

`thu-08-pricing-page` argues against hiding prices, which this site already
follows — if published pricing ever changes to "contact us", that deck has to
come down.

## Before publishing

Two cheap checks, both learned from bugs that reached a live upload:

- **Every headline must end in terminal punctuation.** One shipped reading
  "Your context is full of things you'll never" — the sentence simply stopped.
- **Apostrophes must be typographic** (`’`, not `'`). Straight quotes are
  visible at feed scale beside the rest of the set.

The renderer guards the third: it loads one slide per page so captures happen at
scroll offset zero, avoiding the scroll-repaint bug that once produced slides
with their chrome intact and everything below the fold black.
