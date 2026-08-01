# YusufCreates — motion graphics V2

Ten 20s branded videos at **1080×1920 (9:16)** for Reels, Stories and TikTok,
rendered from HTML with HyperFrames. Every one ends on the animated logo and
**yusufcreates.com**.

```bash
cd "YusufCreates Social Media/Videos"
cp compositions/<name>.html index.html
npx hyperframes render . -q high -o ./renders/<name>.mp4
```

This project runs **from inside its own folder** — it carries its own
`package.json` and pinned CLI. `index.html` is a scratch slot; the real sources
are in `compositions/`.

> **CLI pin moved 0.7.86 → 0.7.87** during this build, verified with
> `npx hyperframes check` before any render. Bump with
> `npx hyperframes@latest upgrade --project .`.

## The ten

Pricing-led, because that is what converts and what people actually ask about.

| File | Beat | Figures |
|---|---|---|
| `v-01-express` | Live in two hours or you keep the balance | $69, $35/$34 split, 2hr |
| `v-02-price-ladder` | The whole ladder, published | 400 / 750 / 2,500 / 3,200 / 5,500 |
| `v-03-no-quote` | "Request a quote" is a delay tactic | count-up to $400 |
| `v-04-flat-pages` | Four pages or nine, same price | $750 → $950 |
| `v-05-care` | Numbers, not "unlimited" | $180/mo, $1,800/yr, 100 + 20 |
| `v-06-revive` | Rescue the site you have | count-up to $650 |
| `v-07-two-slots` | Two slots, counted not claimed | BUILD_SLOTS = 2 |
| `v-08-deposit` | Half up front, half on delivery | 40% / 60% |
| `v-09-own-it` | Yours outright on final payment | — |
| `v-10-week-one` | Live in week one, rough is fine | — |

## Structure — every video

| Phase | Time | What |
|---|---|---|
| Scene A | 0.0 – 6.0 | The hook |
| Scene B | 6.0 – 12.0 | The substance |
| Scene C | 12.0 – 15.8 | The turn |
| **Outro** | 15.8 – 20.0 | Mark draws → wordmark → **yusufcreates.com** |

The outro is **per-video** so its entry seam matches that video's final scene,
but the beat itself is identical everywhere: the mark draws on, the accent
block lands as the *cause*, the impact recoil ignites the wordmark cascade,
then a 0.5s stillness before the URL arrives with an underline wipe.

## ⚠️ Figures are real

Nothing was rounded for rhythm. Every number traces to source:

| Content | Source of truth |
|---|---|
| $69 / $35 / 2 hours | `src/lib/pricing.ts` — `EXPRESS_*` |
| $400 / $2,500 / $3,200 / $5,500 | `src/lib/pricing.ts` — `BASE_USD` |
| $750 / $950, flat from 4 pages | `src/lib/pricing.ts` — `GROWTH` |
| $650 | `src/lib/pricing.ts` — `REVIVE_PRICE_USD` |
| $180/mo, $1,800/yr | `BASE_USD.care`, `CARE_ANNUAL_USD` |
| 100 small / 20 big fixes | `src/lib/pricing.ts` — `CARE_FEATURES` |
| 40% / 60% deposit | `PricingFaq.tsx`, `InvoiceView.tsx` |
| Two build slots | `convex/capacity.ts` — `BUILD_SLOTS` |
| Mark geometry | `src/components/ui/Logo.tsx` — copied verbatim |

**A published price in a rendered video is harder to correct than one in a
post.** If `BASE_USD` changes, re-render every affected file.

**Express terms are not build terms.** `v-08` labels the express 50/50 split
explicitly as *"Express tier only"* — the standard split is 40/60, and
conflating them would be a promise that isn't true.

## Motion doctrine

The house current is **LEFT**. Ordinary seams ride it; reserved vectors are
spent on meaning.

- **Cut-the-curve LEFT** at A→B and B→C — exit `power4.in` to `x:-230`, entry
  `power4.out` from `x:+230` igniting at 0.35 opacity mid-path. The two halves
  of one `power4.inOut`, so velocity matches exactly at the cut.
- **Inverse zoom** into the outro on nine of ten — both sides *shrink*, so
  `d(scale)/dt` keeps its sign across the cut. Spent because the brand landing
  is an arrival beat.
- **Upward** into the outro on `v-09-own-it` only — the conclusion rises above
  what came before.
- **No idle wobble.** Every phase owns a sustained-motion route: staged
  reveals, sequenced UI life (the count-ups, `v-10`'s rail), or camera push.
- **Stillness before climax** — a 0.3–0.75s comma before each payoff.
- Entry ≤ 800ms, stagger ≤ 500ms. No `bounce.out` / `elastic.out`.

## The framework rules that bite

Two mistakes cost a full rebuild of the first composition — both are silent in
preview and only caught by `check`:

1. **Never tween a `.clip` element.** The framework owns its visibility. Every
   scene needs an inner non-clip wrapper (`#sA-i`) carrying the motion.
2. **Every scene exit needs a hard kill** — `tl.set("#sA-i", {autoAlpha:0}, 6.0)`
   at the next clip's start. Without it a non-linear seek lands past the fade
   and leaves stale visibility state.

Also: no two overlapping tweens on one property (use a `keyframes` array), and
`#root` must be opaque or the mid-window cut flashes white.

## Validation

All ten pass `npx hyperframes check` with **0 errors** across lint, runtime,
layout, motion, and contrast — every text element WCAG AA.
