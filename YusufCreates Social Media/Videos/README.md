# YusufCreates — motion graphics

Five 8s branded motion graphics at **1080×1920 (9:16)** for Reels and Stories,
rendered from HTML with HyperFrames.

```bash
# Render one (from this directory)
cp compositions/<name>.html index.html
npx hyperframes render . --skill=motion-graphics -q high -o ./renders/<name>.mp4
```

`index.html` is a scratch slot — the real sources are in `compositions/`. Copy
the one you want into place, then render.

## The five

| File | Beat |
|---|---|
| `01-logo-sting` | The mark draws itself, the accent block lands, the wordmark resolves |
| `02-looks-cheap` | "Your app works. It still looks cheap." → polish is decisions |
| `03-price-ladder` | Count-up to $400, then the tier ladder |
| `04-two-slots` | Two build slots, counted from live projects |
| `05-week-one` | Live URL in week one, on an advancing rail |

`01-logo-sting` is deliberately content-free — it works as an intro or outro
sting on anything else.

## ⚠️ Figures are real

| Content | Source of truth |
|---|---|
| $400 / $750 / $2,500 / $3,200 | `src/lib/pricing.ts` |
| Two build slots | `convex/capacity.ts` — `BUILD_SLOTS` |
| Mark geometry | `src/components/ui/Logo.tsx` — copied verbatim, never traced |
| Colours and type | `src/app/globals.css` |

A published price in a rendered video is harder to correct than one in a post —
if `BASE_USD` changes, `03-price-ladder` has to be re-rendered.

## Design constraints

Every composition follows the HyperFrames motion doctrine:

- **No idle wobble.** Each piece runs one continuous camera push for its full
  8s, so the frame is never waiting. Breathing and floating loops are banned —
  they read as "the video has nothing to say."
- **Stillness before climax.** A 0.3–0.75s comma before each payoff line.
- **Causal motion.** In the sting, the accent block's landing is what ignites
  the wordmark; nothing enters on its own schedule.
- **Entry ≤ 800ms, stagger ≤ 500ms.** No `bounce.out` or `elastic.out`.

All five pass `hyperframes check` with 0 errors and WCAG AA on every text
element.
