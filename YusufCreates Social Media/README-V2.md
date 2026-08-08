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
node "YusufCreates Social Media/build-v2/render.js"                    # everything
node "YusufCreates Social Media/build-v2/render.js" v2-27-liquid-glass # one deck
```

Writes 171 slides across 34 carousels. It fails loudly rather than producing wrong
output: it aborts if the embedded font doesn't load, and warns per slide if
content overflows the safe area.

**Pass a slug.** Without one every deck re-renders, which republishes finished
slides into `posts-v2/` beside the copies already filed under `DONE/` and makes
it impossible to see which files a change actually touched. The argument is a
substring match, so `v2-27` is enough.

If Playwright reports a missing executable, the browser cache was cleared —
`npx playwright install chromium`.

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
| `glassTile` | Liquid Glass app-icon squircle; `tiles: []` renders a row |
| `glassSlider` | The macOS 27 opacity slider, with live glass samples |
| `macWindow` | A light macOS window — sidebar, toolbar, rows |
| `versus` | Two neutral glass cards side by side |

Set `graphicTop: true` to render the graphic above the headline instead of below
it — used for cover slides that lead with an object rather than type.

A new block has to be registered in **two** places in `slide()`: the `hasGraphic`
check and the `graphic` concatenation. Miss the first and the headline keeps its
cover-sized type, the slide overflows, and the only warning is the overflow line
at render time.

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

## Themes

A carousel can set `theme: "goldengate"`. Anything without a theme key gets
`default` and renders exactly as it always has.

| Theme | Used by | Look |
|---|---|---|
| `default` | decks 01–26 | Near-black ground, indigo accent, blurred orbs |
| `goldengate` | decks 27–34 | Warm espresso ground, champagne accent, violet second accent, wallpaper sheets |
| `brandglass` | decks 35–50 | `default`'s palette exactly, with `goldengate`'s material |

`brandglass` is `{...THEMES.default}` plus the ground and the glass. It exists
because the promotional decks wanted the newer material and **the brand palette
is settled** — a post selling the studio is the last place to experiment with
its colours. Nothing in it changes a hue.

A theme opts into the sheet ground by defining `sheets`; without that key it
gets the original blurred orbs. The four sheet gradients are named by role
(`light`, `accent`, `cool`, `deep`) rather than by colour, so the same ribbon
geometry renders bronze on one theme and indigo on another.

`goldengate` exists because those eight decks are *about* Apple's Liquid Glass,
and a post arguing that Apple improved a material while rendering it in the old
house style argues against itself. Three things carry it:

- **The ground** is the wallpaper — bowed ribbons in bone, bronze and violet,
  blurred at 34px, with barely-blurred **specular creases** stroked along the
  seams. The creases are what stop it reading as a brown gradient. Blur much
  past 40 and the sheets merge into mush; that was the first version.
- **The glass disperses.** `#lgDisperse` displaces the red, green and blue
  channels by different amounts through one turbulence and recombines them, so
  edges fringe violet on one side and amber on the other. A single-channel
  displacement, at any strength, only ever looks like a smeared blur.
- **The brand stays.** `brand` is a separate token from `accent` and is indigo
  in both themes — the logo lockup, the verified badge and the eyebrow dot never
  go warm, because that is the identity rather than the palette.

Themes are applied by mutating the live `C` object, not by threading a parameter
through twenty block functions. If you add a colour to one theme, add it to both.

### Colour must come from `C`, never from a literal

Every `rgba(94,106,210, …)` wash in this file was once a hard-coded indigo. The
Golden Gate deck's first render had lilac check circles on a bronze slide
because `checks()` still had two of them. They now read `C.accentRgb`. Anything
new must too.

## ⚠️ The `MONO` quoting trap

`MONO` uses **single** quotes around `'SF Mono'`. This is not style — it is load
bearing, and it was wrong for a long time.

`MONO` is interpolated into twelve inline `style="…"` attributes. With double
quotes around `"SF Mono"`, the first one closed the attribute early and the
browser silently discarded every declaration after the font-family: font-size,
colour, weight, all of it. Monospace text rendered at the default 16px in
near-black instead of 30px in the syntax palette.

This affected published decks. `DONE/v2-01-.../-02.png` shows it plainly: the
filenames in the tree are tiny and almost invisible, while the notes down the
right-hand side — the one span in that block that does *not* use `MONO` — render
correctly. Every deck with a code window, terminal, file tree, `rows` or `steps`
was hit.

**Decks 01–26 in `DONE/` were rendered before this was fixed and are still
wrong.** Re-rendering them is a one-line command each and would visibly improve
them, but they are already posted, so that is a judgement call rather than a
cleanup.

`FONT` keeps its double quotes and is fine — it is only ever used inside a
`<style>` block, never in an attribute.

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

**Golden Gate series** — eight decks on macOS 27 / iOS 27, all on the
`goldengate` theme. Ordered widest audience first; posting order is in
`CAPTIONS-V2.md`.

| Slug | Angle |
|---|---|
| `v2-27-liquid-glass` | The opacity slider and the three material changes |
| `v2-28-mac-windows` | Edge-to-edge sidebars, uniform toolbars, tighter corners |
| `v2-29-app-icons` | Per-layer refraction and the rebuilt Icon Composer |
| `v2-30-foundation-models` | Any LLM provider via a Swift package |
| `v2-31-on-device-ai` | Image attachments, token counting, typed errors |
| `v2-32-siri-ai` | Siri AI, and the regional and hardware fine print |
| `v2-33-swiftui` | Toolbar APIs, `@State` as a macro, AsyncImage caching |
| `v2-34-ship-checklist` | What to fix before September, in order |

**Promotional series** — eight decks selling the site, on `brandglass`. Posting
order is in `CAPTIONS-V2.md`; every deck ends on a `yusufcreates.app` URL.

| Slug | Angle | Source of its figures |
|---|---|---|
| `v2-35-express` | $69, live in two hours or the balance is written off | `EXPRESS_*` in `pricing.ts` |
| `v2-36-revive` | $650 to fix the site you already have | `REVIVE_*` in `pricing.ts` |
| `v2-37-how-i-work` | The six promises, in writing | `HowIWork.tsx` |
| `v2-38-real-work` | DocuTrackr Family and Business, with real metrics | `convex/seed.ts` |
| `v2-39-native-apps` | Native iOS/macOS from $3,200, no App Store | `BASE_USD.native`, `BUILD_TIERS` |
| `v2-40-care-plan` | $180/mo, and why it isn't "unlimited" | `CARE_FEATURES`, `CARE_ANNUAL_USD` |
| `v2-41-free-audit` | The free audit — pure lead magnet, no price | `(marketing)/audit/page.tsx` |
| `v2-42-arabic-rtl` | Bilingual and RTL done properly | `WhatIDo.tsx`, `ENTERPRISE_FEATURES` |

**Tips series** — eight craft decks on `brandglass`. Posting order is in
`CAPTIONS-V2.md`.

The rule that makes these worth posting: **every deck is a mistake actually made
in this repo, with the real number attached.** Generic advice is what everyone
else posts and nobody saves. If a new deck in this series has no number in it,
it isn't finished.

| Slug | Lesson | Where it happened |
|---|---|---|
| `v2-43-bundle-bloat` | A wildcard import can't be tree-shaken — 5.0 MB, 58% of page JS | `ui/TechLogos.tsx` |
| `v2-44-glass-legibility` | The fill carries legibility; backdrop-filter is allowed to fail | `globals.css` `.nav-pill` |
| `v2-45-contrast` | One accent passes at 3:1 and fails at 4.5:1 — ship two tokens | `globals.css` `--accent-solid` |
| `v2-46-money-rounding` | Converting halves separately undercharged every EUR order | `pricing.ts` `splitPrice()` |
| `v2-47-hydration` | `useSyncExternalStore`, not `useState` + an effect | `lib/glass.ts`, `GlassControl.tsx` |
| `v2-48-auth-mistakes` | An email identifier publishes the username | `convex/auth.ts` |
| `v2-49-csp` | Report-Only first; `frame-ancestors 'none'` is the free win | `next.config.ts` |
| `v2-50-blur-performance` | Only opacity is safe to animate on a blurred layer | `globals.css` touch block |

⚠️ **The promotional decks carry live prices.** They are the decks most likely
to go quietly wrong, because a price moves in `pricing.ts` and nothing here
notices. The figures baked into images as of this writing: Express $69 with a
$27.60 deposit · Revive $650 · Launch $400 · Web app from $2,500 · iOS & macOS
from $3,200 · Enterprise from $5,500 · Care $180/mo or $1,800/year · two build
slots. Re-check every one before re-posting.

⚠️ **These expire.** Golden Gate ships September 2026. Every "ships in
September" line goes wrong the day it does, and the checklist deck becomes a
post-mortem. Re-read before re-posting, or retire them.

Sources were checked live in August 2026 — Apple's newsroom post and WWDC26
session pages where they exist, MacRumors' iOS 27 and macOS 27 roundups and
9to5Mac otherwise. Deliberately left out: the unconfirmed "MacBook Neo" model
name, Icon Composer and SF Symbols version numbers, Apple Intelligence RAM
tiers. Anthropic's and Google's Foundation Models packages are described as
announced rather than shipping, because that is what Apple said.

Captions: `CAPTIONS-V2.md` covers `v2-07` onward plus the posting order.
`v2-01`–`v2-04` reuse decks 12–15 in `CAPTIONS.md`; `v2-05`/`v2-06` reuse decks
7 and 9.

**Alt text:** headlines are baked into the image, so screen readers get nothing
without it. Paste each slide's headline into Instagram's alt text field
(Advanced settings → Write alt text).
