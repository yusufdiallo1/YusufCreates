# Tuesday Posts

Twelve carousels at **1080×1350 (4:5)**, rendered from code. Same brand and
template as the rest of this folder — only the subjects are new.

```
Tuesday Posts/
├── build/
│   ├── template.js   # shared with build-v2, Sunday and Monday
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
node "YusufCreates Social Media/Tuesday Posts/build/render.js"
```

Writes 60 slides across 12 carousels. It fails loudly rather than producing
wrong output: it aborts if the embedded font doesn't load, warns if a slide
overflows its safe area, and warns if a PNG lands under 400KB.

## Why these twelve

Seventy-one decks precede these across `build/`, `build-v2/`, `Sunday Posts` and
`Monday Posts`, so the constraint was genuinely new subjects. Nothing here
repeats AI tooling, pricing tiers, capacity, the shipped projects, forms, empty
states, loading, microcopy, dark mode, images, mobile nav, cookie banners,
secrets, webhooks, rate limiting, lead scoring, structured data, briefs,
ownership, aftercare, rebuilds, audits, deadlines, saying no, deposits or scope.

| Group | Decks |
|---|---|
| Craft | Motion timing, focus rings, reduced motion, contrast, confirmation gestures |
| Engineering | Email deliverability, backups, error handling, naming |
| Business | Discovery calls, defining "done", fixed price |

Two draw on real decisions in this codebase:

- **`tue-05-confirm`** documents the actual rule behind `SlideToConfirm`:
  friction only where an action can't be cleanly undone — sending a brief,
  continuing to payment, starting a subscription, deleting in admin. Ordinary
  buttons stay ordinary buttons everywhere else.
- **`tue-03-reduced-motion`** reflects how `globals.css` and the motion
  primitives here actually handle `prefers-reduced-motion`.

Three decks (2, 3, 4) argue for accessibility. **Post them with alt text** —
publishing an accessibility carousel that screen readers can't read would
undercut the entire point.

## ⚠️ Figures must stay in sync

| Content | Source of truth |
|---|---|
| All prices | `src/lib/pricing.ts` |
| Build and Care slots | `convex/capacity.ts` |
| Confirmation-gesture placements | `src/components/ui/SlideToConfirm.tsx` |

**Tier descriptions drift more quietly than prices.** Check `BUILD_TIERS`,
`ENTERPRISE_FEATURES`, `CARE_FEATURES` and `EVERY_PLAN` — not just the numbers.

`tue-12-fixed-price` states publicly that scope is fixed alongside price, and
`tue-11-done` publishes a definition of handover. Both are commitments now, not
descriptions — if either changes, the deck changes with it.

No deck claims traffic, revenue or client counts. None of that is recorded in
the repo, and inventing it on a public post is a liability.

## Before publishing

Two cheap checks, both learned from bugs that reached a live upload:

- **Every headline must end in terminal punctuation.** One shipped reading
  "Your context is full of things you'll never" — the sentence simply stopped.
- **Apostrophes must be typographic** (`’`, not `'`). Straight quotes are
  visible at feed scale beside the rest of the set.

The renderer guards the third: it loads one slide per page so captures happen at
scroll offset zero, avoiding the scroll-repaint bug that once produced slides
with their chrome intact and everything below the fold black.
