# YusufCreates Social Media

Instagram carousels at 1080×1920 (9:16), rendered from code so the branding and
the numbers stay consistent with the site.

```
YusufCreates Social Media/
├── build/
│   ├── template.js   # layout, glass, logo geometry
│   ├── content.js    # all copy and figures  ← edit this
│   ├── render.js     # screenshots each slide
│   ├── inter.b64     # embedded font (see below)
│   └── inter.woff2
├── posts/            # generated PNGs, one folder per carousel
├── CAPTIONS.md       # captions, hashtags, posting order
└── README.md
```

## Rendering

From the repo root:

```bash
node "YusufCreates Social Media/build/render.js"
```

Writes 55 slides across 11 carousels. The script fails loudly rather than
producing wrong output: it aborts if the embedded font doesn't load, and warns
per slide if content overflows the safe area.

## Design

Standard left-to-right layout — logo lockup top-left, type left-aligned,
progress running from the left edge, CTA arrows pointing right.

Everything visual comes from the site's own design system rather than an
approximation of it:

- **Glass** — the real `backdrop-filter` chain from `src/app/globals.css` plus
  the SVG refraction filter (`feTurbulence` → `feDisplacementMap`) lifted from
  `src/components/ui/LiquidGlass.tsx`. Headless Chromium supports both, so these
  are genuine effects, not a flat imitation.
- **Logo** — vector geometry copied from `src/components/ui/Logo.tsx`, so the
  mark is sharp at any size instead of an upscaled PNG.
- **Colour and type** — tokens mirrored from `globals.css`.

One detail worth knowing before editing the template: **the font is embedded.**
The site's stack leads with SF Pro, which headless Chromium can't resolve — left
alone it falls back to a serif and the render looks nothing like production.
`inter.b64` is the same self-hosted Inter that `next/font` serves to non-Apple
visitors.

## ⚠️ Figures must stay in sync

Prices and capacity in `build/content.js` are **real**, copied from the codebase.
They are not placeholders, and they will go stale silently.

| Content | Source of truth |
|---|---|
| All tier prices | `src/lib/pricing.ts` — `BASE_USD`, `PUBLISHED`, `GROWTH` |
| Build slot count | `convex/capacity.ts` — `BUILD_SLOTS` (currently 2) |
| Project details, metrics, live URLs | `convex/seed.ts` |

Current published prices: Launch $400 · Growth $750 (three pages) / $950 (four
to nine) · Web app from $2,500 · iOS & macOS from $3,200 · Enterprise from
$5,500 · Care Plan $180/mo. Also quoted in SAR and AED.

**If a price changes in `pricing.ts`, update `content.js` and re-render.** A
carousel showing last quarter's price is a public commitment you'd have to
honour or walk back.

No deck claims traffic, revenue, or client counts — none of that is recorded in
the repo, and inventing it on a public post is a liability.
