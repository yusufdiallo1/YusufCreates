/**
 * YusufCreates Instagram carousel renderer — v2, graphic.
 *
 * Two things drove this rewrite, both learned from a real upload:
 *
 * 1. SIZE. v1 rendered 1080x1920 (9:16). Instagram carousels cap at 4:5, so
 *    every slide was letterboxed and centre-cropped — the logo lockup and the
 *    progress dots were being cut off. 1080x1350 is the tallest ratio a
 *    carousel accepts, and the whole layout is now designed inside it.
 *
 * 2. GRAPHICS. v1 was a headline and a paragraph on a gradient. Legible, but
 *    flat, and it made every slide look identical in the feed. Each slide type
 *    here renders a real object instead: a code window with syntax colour, a
 *    terminal, a file tree, a two-column comparison, a numbered figure.
 *
 * Everything visual still derives from the site's own design system — the glass
 * chain from globals.css and the logo geometry from Logo.tsx — so v2 belongs to
 * the same brand as v1 rather than approximating it.
 */

const fs = require("fs");
const path = require("path");

// -- Themes -----------------------------------------------------------------
//
// `default` is the house palette, mirrored from globals.css, and is what all 26
// existing decks render with. `goldengate` is the warm Apple "Golden Gate"
// palette for the macOS 27 deck — same layout engine, different material.
//
// A theme is applied by mutating `C` rather than threaded through the twenty-odd
// block functions that read it. Page building is synchronous string
// concatenation, so there is no window in which a half-applied palette can be
// observed, and the alternative was a `theme` parameter on every function
// signature in this file.
const THEMES = {
  default: {
    name: "default",
    canvas: "#08090a",
    surface1: "#0f1011",
    surface2: "#161718",
    surface3: "#23252a",
    text: "#f7f8f8",
    secondary: "#8a8f98",
    hairline: "rgba(255,255,255,0.08)",
    glassBorder: "rgba(255,255,255,0.13)",
    glassBg: "rgba(14,14,22,0.24)",
    glassSheen: "",
    accent: "#5e6ad2",
    accentGlow: "rgba(94,106,210,0.35)",
    // Accent as a bare RGB triple, so the many rgba(accent, x) washes scattered
    // through the blocks follow the theme. They used to be literal indigo, which
    // is how the Golden Gate deck first rendered with lilac check circles.
    accentRgb: "94,106,210",
    avatarRgb: "124,92,220",
    // `brand` is the logo lockup's colour and stays indigo in every theme —
    // it is the identity, not the palette.
    brand: "#5e6ad2",
    // The second colour glass disperses toward. Real glass splits light, so the
    // two fringe colours are what sell the material.
    fringeCool: "rgba(124,140,240,0.55)",
    fringeWarm: "rgba(233,196,146,0.55)",
    muted: "#7e838c",
    danger: "#e5484d",
    green: "#4cc38a",
    amber: "#f5a623",
    refract: "lgRefract",
    panelTop: "#262a33",
    panelBottom: "#1b1e25",
    panelBorder: "rgba(255,255,255,0.20)",
    glassShadow: `0 24px 60px rgba(0,0,0,0.45),
  inset 0 1px 1px rgba(255,255,255,0.5),
  inset 0 -8px 20px rgba(255,255,255,0.06),
  inset 0 0 0 1px rgba(255,255,255,0.13)`,
    glassShadowHi: `0 28px 70px rgba(0,0,0,0.5),
  inset 0 1px 2px rgba(255,255,255,0.65),
  inset 0 -8px 24px rgba(255,255,255,0.09),
  inset 0 0 0 1px rgba(255,255,255,0.20)`,
  },

  // The glass here is built to demonstrate the three material changes the deck
  // is reporting: a darkened edge inside the bright rim, a brighter specular
  // highlight along the top, and tighter corner radii than Tahoe's.
  goldengate: {
    name: "goldengate",
    canvas: "#0a0806",
    surface1: "#12100c",
    surface2: "#1b1712",
    surface3: "#2a231b",
    text: "#f6f1ea",
    // Warm taupe, lifted off the obvious #a89684 so body copy clears 4.5:1 on
    // the espresso ground with room to spare — a post about Apple fixing
    // legibility cannot itself fail contrast.
    secondary: "#b3a290",
    hairline: "rgba(255,240,224,0.09)",
    glassBorder: "rgba(255,240,224,0.16)",
    glassBg: "rgba(58,44,31,0.26)",
    // Specular highlight along the top edge, inline so it survives without a
    // pseudo-element.
    glassSheen: `linear-gradient(180deg, rgba(255,248,238,0.16) 0%,
      rgba(255,248,238,0.04) 15%, rgba(255,248,238,0) 38%)`,
    accent: "#e0b681",
    accentGlow: "rgba(224,182,129,0.35)",
    accentRgb: "224,182,129",
    // Violet is not decoration here. It is the brand colour holding its place in
    // a warm deck, and it is the cool half of the dispersion — glass that only
    // fringes amber on a bronze ground reads as a gradient, not as glass.
    accentAlt: "#8b93ea",
    accentAltRgb: "124,140,240",
    avatarRgb: "124,140,240",
    brand: "#8b93ea",
    eyebrowDot: "#8b93ea",
    fringeCool: "rgba(139,147,234,0.72)",
    fringeWarm: "rgba(240,200,150,0.72)",
    muted: "#9a8f7e",
    danger: "#e07a5f",
    green: "#a3b18a",
    amber: "#e8b84b",
    refract: "lgDisperse",
    canvasRgb: "10,8,6",
    busy: {
      base: "#6b4f38",
      a: ["#f6ecd9", "#a97e50"],
      b: ["#3d2f22", "#c99a68"],
      dark: "#2a2019",
    },
    sheets: {
      light: ["#fdf6e8", "#e0c6a2", "#8a6a4a"],
      accent: ["#e6a86e", "#9a6f45", "#402c1d"],
      cool: ["#9aa0f2", "#5e6ad2", "#241f4d"],
      deep: ["#3d3128", "#1d1811", "#0d0b08"],
      bloomWarm: "196,132,60",
      bloomCool: "124,140,240",
    },
    panelTop: "#2b241c",
    panelBottom: "#1a1611",
    panelBorder: "rgba(255,240,224,0.18)",
    // Bright rim listed before the dark ring, so the rim paints over its outer
    // pixel and what is left reads as a lit edge with a shadow just inside it.
    glassShadow: `0 26px 64px rgba(0,0,0,0.55),
  inset 0 2px 2px rgba(255,250,242,0.8),
  inset 2.5px 0 0 rgba(139,147,234,0.5),
  inset -2.5px 0 0 rgba(240,200,150,0.5),
  inset 0 -8px 22px rgba(255,226,190,0.07),
  inset 0 0 0 1px rgba(255,240,224,0.18),
  inset 0 0 0 2.5px rgba(0,0,0,0.34)`,
    glassShadowHi: `0 30px 74px rgba(0,0,0,0.6),
  inset 0 2.5px 3px rgba(255,252,246,0.92),
  inset 3px 0 0 rgba(139,147,234,0.68),
  inset -3px 0 0 rgba(240,200,150,0.68),
  inset 0 -10px 26px rgba(255,226,190,0.10),
  inset 0 0 0 1px rgba(255,240,224,0.24),
  inset 0 0 0 3px rgba(0,0,0,0.36)`,
  },
};

// The house palette, with the Golden Gate material.
//
// The promo decks needed the dispersion glass and the sheet ground that the
// Apple series got, but the brand colours are settled and a promotional post is
// the last place to experiment with them. So this is `default`'s palette exactly
// — same canvas, same indigo — carrying `goldengate`'s material: ribbon ground,
// lit creases, chromatic dispersion. Nothing here changes a hue.
THEMES.brandglass = {
  ...THEMES.default,
  name: "brandglass",
  refract: "lgDisperse",
  canvasRgb: "8,9,10",
  busy: {
    base: "#3a3f6b",
    a: ["#e8ecff", "#6b74c8"],
    b: ["#1c1f38", "#7d8cf2"],
    dark: "#141628",
  },
  glassBg: "rgba(18,20,34,0.28)",
  glassSheen: `linear-gradient(180deg, rgba(226,232,255,0.15) 0%,
    rgba(226,232,255,0.04) 15%, rgba(226,232,255,0) 38%)`,
  fringeCool: "rgba(139,147,234,0.72)",
  fringeWarm: "rgba(226,232,255,0.55)",
  sheets: {
    light: ["#e8ecff", "#8b93ea", "#343a72"],
    accent: ["#7d8cf2", "#4a52b0", "#171a38"],
    cool: ["#9aa0f2", "#5e6ad2", "#241f4d"],
    deep: ["#1c1f2b", "#101218", "#08090a"],
    bloomWarm: "124,140,240",
    bloomCool: "94,106,210",
  },
  glassShadow: `0 26px 64px rgba(0,0,0,0.55),
  inset 0 2px 2px rgba(236,240,255,0.72),
  inset 2.5px 0 0 rgba(139,147,234,0.5),
  inset -2.5px 0 0 rgba(226,232,255,0.4),
  inset 0 -8px 22px rgba(190,200,255,0.06),
  inset 0 0 0 1px rgba(226,232,255,0.16),
  inset 0 0 0 2.5px rgba(0,0,0,0.34)`,
  glassShadowHi: `0 30px 74px rgba(0,0,0,0.6),
  inset 0 2.5px 3px rgba(240,244,255,0.88),
  inset 3px 0 0 rgba(139,147,234,0.68),
  inset -3px 0 0 rgba(226,232,255,0.55),
  inset 0 -10px 26px rgba(190,200,255,0.09),
  inset 0 0 0 1px rgba(226,232,255,0.22),
  inset 0 0 0 3px rgba(0,0,0,0.36)`,
};

/** The live palette. Mutated by setTheme; never reassigned. */
const C = { ...THEMES.default };

function setTheme(name) {
  Object.assign(C, THEMES[name] || THEMES.default);
}

/** Syntax palette for the code windows. Tuned to sit beside --accent. */
const S = {
  comment: "#7d8590",
  key: "#c678dd",
  str: "#98c379",
  num: "#d19a66",
  fn: "#61afef",
  punct: "#7f848e",
};

const INTER_B64 = fs
  .readFileSync(path.join(__dirname, "inter.b64"), "utf8")
  .trim();

const FONT_FACE = `@font-face{
  font-family:"InterEmbedded";
  src:url(data:font/woff2;base64,${INTER_B64}) format("woff2");
  font-weight:100 900;font-style:normal;font-display:block;
}`;

const FONT = '"InterEmbedded", Inter, system-ui, sans-serif';

// SINGLE quotes around "SF Mono", and it matters. This lands in twelve inline
// style="..." attributes; with double quotes it closed the attribute early and
// the browser silently discarded every declaration after the font-family —
// font-size, colour, weight, the lot. That is why file trees and code windows
// rendered their monospace text at the default 16px in near-black instead of
// 30px in the syntax palette. FONT only ever appears inside a <style> block, so
// its double quotes are fine.
const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

// -- Logo mark, verbatim from Logo.tsx --------------------------------------
const STROKE = 15;
const CHEVRON = "M61 48 L92 79 L61 110";
const ARM = "M159 48 L115 92 L115 137";

function markSvg(px, color = C.text, accent = C.brand) {
  return `<svg viewBox="40 30 140 155" style="height:${px}px;width:auto;overflow:visible" aria-hidden="true">
    <path d="${CHEVRON}" fill="none" stroke="${color}" stroke-width="${STROKE}" stroke-linecap="square" stroke-linejoin="miter"/>
    <path d="${ARM}" fill="none" stroke="${color}" stroke-width="${STROKE}" stroke-linecap="square" stroke-linejoin="miter"/>
    <rect x="99" y="155" width="34" height="17" fill="${accent}"/>
  </svg>`;
}

function verifiedBadge(px) {
  return `<svg viewBox="0 0 24 24" style="height:${px}px;width:${px}px;flex:none" aria-hidden="true">
    <path fill="${C.brand}" d="M12 .8l2.6 2 3.2-.5 1.2 3 3 1.2-.5 3.2 2 2.6-2 2.6.5 3.2-3 1.2-1.2 3-3.2-.5-2.6 2-2.6-2-3.2.5-1.2-3-3-1.2.5-3.2-2-2.6 2-2.6-.5-3.2 3-1.2 1.2-3 3.2.5z"/>
    <path fill="${C.canvas}" d="M10.6 15.9l-3.3-3.3 1.5-1.5 1.8 1.8 4.6-4.6 1.5 1.5z"/>
  </svg>`;
}

function carouselGlyph() {
  return `<svg viewBox="0 0 32 30" style="height:26px;width:auto" aria-hidden="true">
    <rect x="9.5" y="1.5" width="21" height="21" rx="5" fill="none" stroke="${C.text}" stroke-width="2.2" opacity="0.45"/>
    <rect x="1.5" y="7.5" width="21" height="21" rx="5" fill="${C.text}"/>
  </svg>`;
}

/**
 * Both refraction filters are always emitted; the unused one costs nothing.
 *
 * `lgRefractWarm` is the same displacement map with a colour matrix that pushes
 * what passes through it toward amber — the Golden Gate material tints what it
 * refracts rather than staying neutral.
 */
function refractionFilter() {
  const displace = `
        <feTurbulence type="fractalNoise" baseFrequency="0.008" numOctaves="2" seed="4" result="noise"/>
        <feGaussianBlur in="noise" stdDeviation="2" result="softNoise"/>
        <feDisplacementMap in="SourceGraphic" in2="softNoise" scale="12"
          xChannelSelector="R" yChannelSelector="G" result="displaced"/>`;
  return `<svg aria-hidden="true" style="position:absolute;width:0;height:0">
    <defs>
      <filter id="lgRefract" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
        ${displace}
        <feGaussianBlur in="displaced" stdDeviation="7"/>
      </filter>
      <filter id="lgRefractWarm" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
        ${displace}
        <feGaussianBlur in="displaced" stdDeviation="7" result="soft"/>
        <feColorMatrix in="soft" type="matrix"
          values="1.08 0.03 0    0 0.012
                  0.02 1.00 0.01 0 0.006
                  0    0.01 0.88 0 0
                  0    0    0    1 0"/>
      </filter>

      <!--
        Chromatic dispersion. Red, green and blue are displaced by different
        amounts through the same turbulence and recombined, so the backdrop
        splits into a violet fringe on one side of a curve and an amber one on
        the other — which is the thing your eye actually reads as "glass".
        A single-channel displacement, however strong, only ever looks like a
        smeared blur.
      -->
      <filter id="lgDisperse" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.006" numOctaves="2" seed="9" result="n"/>
        <feGaussianBlur in="n" stdDeviation="2.5" result="sn"/>
        <feDisplacementMap in="SourceGraphic" in2="sn" scale="26"
          xChannelSelector="R" yChannelSelector="G" result="dR"/>
        <feDisplacementMap in="SourceGraphic" in2="sn" scale="16"
          xChannelSelector="R" yChannelSelector="G" result="dG"/>
        <feDisplacementMap in="SourceGraphic" in2="sn" scale="7"
          xChannelSelector="R" yChannelSelector="G" result="dB"/>
        <feColorMatrix in="dR" type="matrix" result="cR"
          values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/>
        <feColorMatrix in="dG" type="matrix" result="cG"
          values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"/>
        <feColorMatrix in="dB" type="matrix" result="cB"
          values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"/>
        <feBlend in="cR" in2="cG" mode="screen" result="cRG"/>
        <feBlend in="cRG" in2="cB" mode="screen" result="split"/>
        <feGaussianBlur in="split" stdDeviation="5" result="softSplit"/>
        <feColorMatrix in="softSplit" type="saturate" values="1.4"/>
      </filter>
    </defs>
  </svg>`;
}

/**
 * Golden Gate ground — the wallpaper's overlapping curved sheets.
 *
 * Each ribbon is a vertical band that bows sideways as it falls. Blurred hard
 * and overlapped at low opacity they merge into the bone / bronze / graphite
 * sheets the macOS 27 wallpaper is built from, and that is the single thing
 * that makes a slide read as Golden Gate rather than as a warm recolour of the
 * house theme.
 *
 * A scrim goes over the top, bloom kept to the right where no copy sits. The
 * ribbons are pretty and the headline is the point; without the scrim the bone
 * sheet runs straight under the body text and takes it down to ~3:1.
 */
function ggEdge(x, bow) {
  const l = (m) => x + bow * m;
  return `M ${x} -200
    C ${l(1)} 300, ${l(1)} 760, ${l(-0.35)} 1200
    C ${l(-0.75)} 1400, ${l(-1)} 1480, ${l(-1.15)} 1550`;
}

function ggRibbon(x, w, bow, fill, opacity) {
  const r = (m) => x + w + bow * m;
  const d = `${ggEdge(x, bow)}
    L ${r(-1.15)} 1550
    C ${r(-1)} 1480, ${r(-0.75)} 1400, ${r(-0.35)} 1200
    C ${r(1)} 760, ${r(1)} 300, ${x + w} -200 Z`;
  return `<path d="${d}" fill="url(#${fill})" opacity="${opacity}"/>`;
}

/**
 * A lit crease along a sheet's edge.
 *
 * This is the detail that separates "blurred brown gradient" from "liquid
 * glass". The sheets themselves are soft, but where two of them fold past each
 * other the light catches a hard thin line — and because that line is barely
 * blurred while everything around it is, the eye reads the whole ground as a
 * glossy surface rather than a backdrop.
 */
function ggCrease(x, bow, width, opacity) {
  return `<path d="${ggEdge(x, bow)}" fill="none" stroke="url(#ggLit)"
    stroke-width="${width}" opacity="${opacity}" stroke-linecap="round"/>`;
}

function ggGround() {
  const grad = (id, [a, b, c]) => `<linearGradient id="${id}" x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0%" stop-color="${a}"/>
      <stop offset="52%" stop-color="${b}"/>
      <stop offset="100%" stop-color="${c}"/>
    </linearGradient>`;

  const s = C.sheets;
  const bg = C.canvasRgb;

  // Blur is 34, not the 52 this started at. Past about forty the ribbons stop
  // being distinguishable sheets and collapse into one wash, which is exactly
  // the failure the first render had.
  return `<div style="position:absolute;inset:-160px;filter:blur(34px)">
    <svg viewBox="0 0 1080 1350" preserveAspectRatio="none"
      style="position:absolute;inset:0;width:100%;height:100%" aria-hidden="true">
      <defs>
        ${grad("ggLight", s.light)}
        ${grad("ggAccent", s.accent)}
        ${grad("ggCool", s.cool)}
        ${grad("ggDeep", s.deep)}
      </defs>
      ${ggRibbon(-300, 560, 320, "ggLight", 0.5)}
      ${ggRibbon(150, 470, -280, "ggCool", 0.6)}
      ${ggRibbon(540, 450, 260, "ggAccent", 0.72)}
      ${ggRibbon(900, 430, -200, "ggCool", 0.34)}
      ${ggRibbon(360, 120, -240, "ggDeep", 0.5)}
    </svg>
  </div>
  <div style="position:absolute;inset:-160px;filter:blur(5px)">
    <svg viewBox="0 0 1080 1350" preserveAspectRatio="none"
      style="position:absolute;inset:0;width:100%;height:100%" aria-hidden="true">
      <defs>
        <linearGradient id="ggLit" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stop-color="rgba(255,252,246,0)"/>
          <stop offset="26%" stop-color="rgba(255,250,240,0.95)"/>
          <stop offset="58%" stop-color="rgba(226,206,240,0.65)"/>
          <stop offset="100%" stop-color="rgba(255,250,240,0)"/>
        </linearGradient>
      </defs>
      ${ggCrease(620, 260, 3.5, 0.85)}
      ${ggCrease(150, -280, 2.5, 0.5)}
      ${ggCrease(900, -200, 3, 0.45)}
    </svg>
  </div>
  <div style="position:absolute;inset:0;background:
    linear-gradient(108deg, rgba(${bg},0.90) 0%, rgba(${bg},0.80) 30%,
      rgba(${bg},0.46) 60%, rgba(${bg},0.24) 100%)"></div>
  <div style="position:absolute;inset:0;background:
    radial-gradient(76% 50% at 20% 44%, rgba(${bg},0.42) 0%, rgba(${bg},0) 74%)"></div>
  <div style="position:absolute;inset:0;mix-blend-mode:screen;background:
    radial-gradient(60% 44% at 84% 62%, rgba(${s.bloomWarm},0.20) 0%, rgba(${s.bloomWarm},0) 70%),
    radial-gradient(46% 36% at 70% 14%, rgba(${s.bloomCool},0.14) 0%, rgba(${s.bloomCool},0) 72%)"></div>`;
}

function glass(radius = 24, hi = false) {
  return `background-color:${C.glassBg};
    ${C.glassSheen ? `background-image:${C.glassSheen};` : ""}
    -webkit-backdrop-filter:url(#${C.refract});
    backdrop-filter:url(#${C.refract});
    box-shadow:${hi ? C.glassShadowHi : C.glassShadow};
    border-radius:${radius}px;`;
}

/** Solid panel. Code and terminals need opaque ground, not refraction —
 *  monospace over a blurred gradient is where legibility goes to die. */
function panel(radius = 20) {
  return `background:linear-gradient(180deg, ${C.panelTop} 0%, ${C.panelBottom} 100%);
    border:1px solid ${C.panelBorder};
    border-radius:${radius}px;
    box-shadow:0 30px 70px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.14);`;
}

function tone(t) {
  return t === "primary" ? C.text
    : t === "muted" ? C.muted
    : t === "accent" ? C.accent
    : t === "danger" ? C.danger
    : t === "green" ? C.green
    : t === "amber" ? C.amber
    : t;
}

// -- Graphic blocks ---------------------------------------------------------

/** macOS-style window chrome. Gives every code/terminal block a real frame. */
function chrome(label, accentDot) {
  const dot = (c) =>
    `<span style="width:12px;height:12px;border-radius:99px;background:${c};display:block"></span>`;
  return `<div style="display:flex;align-items:center;gap:9px;padding:16px 22px;
      background:rgba(255,255,255,0.07);
      border-bottom:1px solid rgba(255,255,255,0.13)">
    ${dot("#ff5f57")}${dot("#febc2e")}${dot("#28c840")}
    <span style="margin-left:10px;font-family:${MONO};font-size:20px;font-weight:500;
      color:${accentDot ? "#9aa4ee" : "#b6bcc6"};letter-spacing:-0.01em">${label}</span>
  </div>`;
}

/**
 * Code window. Lines are pre-tokenised by the content file as [text, kind]
 * pairs so the colouring is intentional rather than regex-guessed.
 */
function codeWindow(cw) {
  const src = [...cw.lines];
  while (src.length && src[0] === "") src.shift();
  while (src.length && src[src.length - 1] === "") src.pop();
  const lines = src
    .map((ln) => {
      if (ln === "") return `<div style="height:24px"></div>`;
      const spans = (Array.isArray(ln) ? ln : [[ln, "text"]])
        .map(([t, kind]) => {
          const color =
            kind === "comment" ? S.comment
            : kind === "key" ? S.key
            : kind === "str" ? S.str
            : kind === "num" ? S.num
            : kind === "fn" ? S.fn
            : kind === "punct" ? S.punct
            : kind === "accent" ? C.accent
            : C.text;
          const weight = kind === "accent" ? 600 : 400;
          return `<span style="color:${color};font-weight:${weight}">${t}</span>`;
        })
        .join("");
      return `<div style="white-space:pre">${spans}</div>`;
    })
    .join("");

  return `<div style="${panel(18)}overflow:hidden;margin-top:26px">
    ${chrome(cw.file, cw.accentFile)}
    <div style="padding:30px 32px;font-family:${MONO};font-size:30px;
      line-height:1.6;letter-spacing:-0.01em">${lines}</div>
  </div>`;
}

/** Terminal block. Prompt lines get an accent caret, output stays muted. */
function terminal(t) {
  const src = [...t.lines];
  const blank = (ln) => (Array.isArray(ln) ? ln[0] : ln) === "";
  while (src.length && blank(src[0])) src.shift();
  while (src.length && blank(src[src.length - 1])) src.pop();
  const lines = src
    .map((ln) => {
      const [text, kind] = Array.isArray(ln) ? ln : [ln, "out"];
      if (kind === "cmd") {
        return `<div style="white-space:pre;color:${C.text};font-weight:500"><span style="color:${C.accent};font-weight:700">❯ </span>${text}</div>`;
      }
      if (kind === "ok") {
        return `<div style="white-space:pre;color:${C.green}">${text}</div>`;
      }
      if (kind === "bad") {
        return `<div style="white-space:pre;color:${C.danger}">${text}</div>`;
      }
      return `<div style="white-space:pre;color:#c3c9d4">${text}</div>`;
    })
    .join("");

  return `<div style="${panel(18)}overflow:hidden;margin-top:26px">
    ${chrome(t.title || "zsh", true)}
    <div style="padding:30px 32px;font-family:${MONO};font-size:30px;
      line-height:1.64;letter-spacing:-0.01em">${lines}</div>
  </div>`;
}

/**
 * File tree. The `on` flag marks the file the slide is actually about, so the
 * eye lands on it without a caption pointing at it.
 */
function fileTree(tree) {
  const rows = tree.items
    .map((it) => {
      const pad = 26 + (it.depth || 0) * 34;
      const isDir = it.dir;
      const color = it.on ? C.accent : isDir ? C.text : "#b3b9c4";
      const weight = it.on ? 600 : isDir ? 500 : 400;
      const icon = isDir
        ? `<svg viewBox="0 0 24 24" style="width:26px;height:26px;flex:none" aria-hidden="true">
             <path fill="${it.on ? C.accent : "#8b93a1"}" d="M2 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z"/>
           </svg>`
        : `<svg viewBox="0 0 24 24" style="width:26px;height:26px;flex:none" aria-hidden="true">
             <path fill="none" stroke="${it.on ? C.accent : "#8b93a1"}" stroke-width="1.9"
               d="M6 2.8h7l5 5v13.4H6z"/>
           </svg>`;
      return `<div style="display:flex;align-items:center;gap:16px;padding:17px 28px 17px ${pad}px;
          ${it.on ? `background:rgba(${C.accentRgb},0.10);border-left:3px solid ${C.accent};padding-left:${pad - 3}px;` : ""}">
        ${icon}
        <span style="font-family:${MONO};font-size:30px;color:${color};
          font-weight:${weight};letter-spacing:-0.01em">${it.name}</span>
        ${
          it.note
            ? `<span style="margin-left:auto;font-size:23px;color:${it.on ? C.accent : "#9aa1ad"}">${it.note}</span>`
            : ""
        }
      </div>`;
    })
    .join("");

  return `<div style="${panel(18)}overflow:hidden;margin-top:26px">
    ${chrome(tree.title || "your-project", true)}
    <div style="padding:12px 0">${rows}</div>
  </div>`;
}

/**
 * Two-column comparison. The wrong/right framing carries a lot of these
 * slides, and a red-vs-green pair reads instantly at feed scale.
 */
function compare(cmp) {
  // `neutral: true` for pairs that are both valid — two settings, two
  // approaches. Red-versus-green there would assert a wrong answer that the
  // slide isn't making, so those get accent-versus-grey instead.
  const neutral = cmp.neutral === true;

  const col = (side, isBad) => {
    const tint = neutral
      ? isBad ? `rgba(${C.accentRgb},0.20)` : "rgba(255,255,255,0.07)"
      : isBad ? "rgba(229,72,77,0.20)" : "rgba(76,195,138,0.18)";
    const label = neutral ? (isBad ? C.accent : "#b6bcc6") : isBad ? C.danger : C.green;
    const icon = neutral
      ? `<circle cx="12" cy="12" r="10" fill="${isBad ? C.accent : "#6b7280"}"/>
         <path d="M12 7v10" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`
      : isBad
        ? `<circle cx="12" cy="12" r="10" fill="${C.danger}"/><path d="M8 8l8 8M16 8l-8 8" stroke="#fff" stroke-width="2.3" stroke-linecap="round"/>`
        : `<circle cx="12" cy="12" r="10" fill="${C.green}"/><path d="M7 12.5l3.5 3.5L17 9" fill="none" stroke="#08090a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;

    return `
    <div style="flex:1;${panel(18)}overflow:hidden">
      <div style="display:flex;align-items:center;gap:11px;padding:17px 22px;
          border-bottom:1px solid rgba(255,255,255,0.13);
          background:${tint}">
        <svg viewBox="0 0 24 24" style="width:23px;height:23px;flex:none" aria-hidden="true">
          ${icon}
        </svg>
        <span style="font-size:22px;font-weight:600;letter-spacing:0.04em;
          text-transform:uppercase;color:${label}">${side.label}</span>
      </div>
      <div style="padding:26px 24px 28px">
        <div style="font-family:${MONO};font-size:32px;font-weight:600;color:#ffffff;
          line-height:1.45;letter-spacing:-0.015em">${side.code.replace(/\n/g, "<br>")}</div>
        ${
          side.note
            ? `<div style="margin-top:18px;font-size:23px;color:#a2a8b2;line-height:1.42">${side.note}</div>`
            : ""
        }
      </div>
    </div>`;
  };
  return `<div style="display:flex;gap:18px;margin-top:26px;align-items:stretch">
    ${col(cmp.bad, true)}${col(cmp.good, false)}
  </div>`;
}

/** Numbered steps with a connecting spine. */
function steps(list) {
  return `<div style="margin-top:26px;display:flex;flex-direction:column;gap:14px">${list
    .map(
      (s, i) => `<div style="display:flex;align-items:stretch;gap:18px">
        <div style="display:flex;flex-direction:column;align-items:center;flex:none">
          <div style="width:52px;height:52px;border-radius:99px;flex:none;
              display:flex;align-items:center;justify-content:center;
              background:${C.accent};color:#fff;font-size:24px;font-weight:700;
              box-shadow:0 6px 22px ${C.accentGlow}">${i + 1}</div>
          ${
            i < list.length - 1
              ? `<div style="flex:1;width:2px;background:linear-gradient(180deg,${C.accent},rgba(${C.accentRgb},0.12))"></div>`
              : ""
          }
        </div>
        <div style="flex:1;padding:20px 24px;${panel(16)}">
          <div style="font-family:${MONO};font-size:31px;color:${C.accent};font-weight:700;letter-spacing:-0.01em">${s.k}</div>
          <div style="font-size:24px;color:#a2a8b2;margin-top:9px;line-height:1.4">${s.v}</div>
        </div>
      </div>`
    )
    .join("")}</div>`;
}

/** Oversized figure with a caption. */
function figure(f) {
  return `<div style="margin-top:26px;padding:34px 38px;${glass(24, true)}">
    <div style="font-size:190px;font-weight:700;color:${C.accent};letter-spacing:-0.05em;
      line-height:0.95;text-shadow:0 0 80px ${C.accentGlow}">${f.value}</div>
    <div style="font-size:28px;color:${C.text};margin-top:16px;line-height:1.4">${f.label}</div>
  </div>`;
}

/**
 * Claude Code startup splash — the banner you see when a session opens.
 *
 * Redrawn rather than screenshotted: a screenshot of a real session leaks the
 * working directory, the plan tier and whatever warnings happen to be firing.
 * The mascot is a simple pixel block in Anthropic's clay tone, close enough to
 * be recognisable at feed scale without passing itself off as their artwork.
 */
function claudeSplash(cs) {
  const px = 11;
  // Rows of the mascot block. 1 = filled, 0 = gap. Squarer than a literal
  // trace, with the eyes punched out, so it still reads as a face at the size
  // a phone renders this.
  const grid = [
    "0011111100",
    "0111111110",
    "1111111111",
    "1100110011",
    "1111111111",
    "1111111111",
    "0111111110",
    "0110000110",
  ];
  const cells = grid
    .map((row, y) =>
      row
        .split("")
        .map((c, x) =>
          c === "1"
            ? `<rect x="${x * px}" y="${y * px}" width="${px}" height="${px}" fill="#d97757"/>`
            : ""
        )
        .join("")
    )
    .join("");

  const warn = cs.warning
    ? `<div style="margin-top:18px;font-family:${MONO};font-size:22px;color:${C.amber};line-height:1.5">
         <span style="color:${C.amber}">⚠ </span>${cs.warning}
       </div>`
    : "";

  return `<div style="${panel(18)}overflow:hidden;margin-top:26px">
    ${chrome(cs.title || "Terminal", true)}
    <div style="padding:30px 32px">
      <div style="display:flex;align-items:flex-start;gap:26px">
        <svg viewBox="0 0 ${px * 10} ${px * 8}" style="width:${px * 10}px;height:${px * 8}px;flex:none"
          aria-hidden="true">${cells}</svg>
        <div style="font-family:${MONO};font-size:24px;line-height:1.45;letter-spacing:-0.01em">
          <div><span style="color:${C.text};font-weight:700">Claude Code</span>
            <span style="color:#9aa1ad"> ${cs.version || ""}</span></div>
          <div style="color:#b6bcc6;margin-top:4px">${cs.model || ""}</div>
          <div style="color:#8a8f98;margin-top:4px">${cs.cwd || ""}</div>
        </div>
      </div>
      ${warn}
      ${
        cs.footer
          ? `<div style="margin-top:22px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.10);
               font-family:${MONO};font-size:22px;color:${C.accent};font-weight:600">▸▸ ${cs.footer}</div>`
          : ""
      }
    </div>
  </div>`;
}

/**
 * Creator card. Monogram avatar rather than a photograph.
 *
 * Deliberate: real headshots are the subject's copyright, and putting someone's
 * face on a branded post implies an endorsement they never gave. Initials in
 * the accent colour carry the same "this is a person" signal with none of that.
 * Every line beside the avatar has to be a sourced fact — no invented quotes.
 */
function people(list) {
  return `<div style="margin-top:26px;display:flex;flex-direction:column;gap:18px">${list
    .map(
      (p) => `<div style="display:flex;align-items:center;gap:22px;padding:24px 26px;${panel(18)}">
        <div style="width:78px;height:78px;border-radius:99px;flex:none;
            display:flex;align-items:center;justify-content:center;
            background:linear-gradient(145deg, rgba(${C.accentRgb},0.85), rgba(${C.avatarRgb},0.55));
            box-shadow:0 8px 26px ${C.accentGlow}, inset 0 1px 0 rgba(255,255,255,0.35);
            font-size:30px;font-weight:700;color:#fff;letter-spacing:-0.02em">${p.initials}</div>
        <div style="min-width:0">
          <div style="font-size:30px;font-weight:600;color:${C.text};letter-spacing:-0.02em">${p.name}</div>
          <div style="font-size:23px;color:${C.accent};margin-top:4px;font-family:${MONO}">${p.handle}</div>
          <div style="font-size:23px;color:#a2a8b2;margin-top:8px;line-height:1.4">${p.note}</div>
        </div>
      </div>`
    )
    .join("")}</div>`;
}

/**
 * Pull quote with attribution. Only ever paraphrase, and label it as such —
 * a fabricated quotation attributed to a real person is defamation-shaped, and
 * this audience will check.
 */
function quote(q) {
  return `<div style="margin-top:26px;padding:34px 36px;${glass(24, true)}position:relative">
    <div style="position:absolute;top:14px;left:26px;font-size:96px;line-height:1;
      color:${C.accent};opacity:0.30;font-weight:700">"</div>
    <div style="position:relative;font-size:36px;line-height:1.35;color:${C.text};
      letter-spacing:-0.02em;font-weight:500;padding-left:34px">${q.text}</div>
    <div style="display:flex;align-items:center;gap:16px;margin-top:24px;padding-left:34px">
      <div style="width:52px;height:52px;border-radius:99px;flex:none;
          display:flex;align-items:center;justify-content:center;
          background:linear-gradient(145deg, rgba(${C.accentRgb},0.85), rgba(${C.avatarRgb},0.55));
          box-shadow:0 6px 18px ${C.accentGlow};
          font-size:21px;font-weight:700;color:#fff">${q.initials}</div>
      <div>
        <div style="font-size:25px;color:${C.text};font-weight:600">${q.name}</div>
        <div style="font-size:20px;color:#8a8f98;margin-top:2px">${q.source}</div>
      </div>
    </div>
  </div>`;
}

/** Labelled bar meter — for "most people never do this" style contrasts. */
function bars(list) {
  return `<div style="margin-top:26px;display:flex;flex-direction:column;gap:30px">${list
    .map(
      (b) => `<div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px">
          <span style="font-size:27px;color:${C.text};letter-spacing:-0.01em">${b.label}</span>
          <span style="font-size:27px;font-weight:700;color:${b.on ? C.accent : "#a2a8b2"}">${b.value}</span>
        </div>
        <div style="height:22px;border-radius:99px;background:rgba(255,255,255,0.07);overflow:hidden">
          <div style="width:${b.pct}%;height:100%;border-radius:99px;
            background:${b.on ? `linear-gradient(90deg,${C.accent},#8b95e8)` : "rgba(255,255,255,0.18)"};
            ${b.on ? `box-shadow:0 0 22px ${C.accentGlow}` : ""}"></div>
        </div>
      </div>`
    )
    .join("")}</div>`;
}

/** Feature checklist. */
function checks(list) {
  return `<div style="display:flex;flex-direction:column;gap:16px;margin-top:26px">${list
    .map(
      (c) => `<div style="display:flex;align-items:center;gap:16px">
        <span style="display:flex;align-items:center;justify-content:center;width:46px;height:46px;
          border-radius:99px;flex:none;background:rgba(${C.accentRgb},0.16);
          box-shadow:inset 0 0 0 1px rgba(${C.accentRgb},0.4)">
          <svg viewBox="0 0 24 24" style="width:22px;height:22px" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="${C.accent}"
              stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <span style="font-size:29px;color:${C.text};letter-spacing:-0.01em">${c}</span>
      </div>`
    )
    .join("")}</div>`;
}

/** Key/value rows. */
function rows(list) {
  return `<div style="display:flex;flex-direction:column;gap:14px;margin-top:26px">${list
    .map(
      (r) => `<div style="display:flex;align-items:center;gap:20px;padding:26px 30px;${panel(16)}">
        <span style="font-family:${MONO};font-size:23px;font-weight:700;color:${C.accent};min-width:42px">${r.k}</span>
        <span style="font-size:29px;color:${C.text};letter-spacing:-0.01em">${r.v}</span>
      </div>`
    )
    .join("")}</div>`;
}

/** Pricing tiers. */
function tiers(list) {
  return `<div style="display:flex;flex-direction:column;gap:16px;margin-top:26px">${list
    .map(
      (t) => `<div style="position:relative;padding:30px 32px;${glass(20, t.featured)}
          ${t.featured ? `border-top:2px solid ${C.accent};` : ""}">
        ${
          t.badge
            ? `<span style="position:absolute;top:-14px;left:28px;padding:7px 15px;border-radius:99px;
                background:${C.accent};color:#fff;font-size:17px;font-weight:600;
                letter-spacing:0.06em;text-transform:uppercase;
                box-shadow:0 6px 20px ${C.accentGlow}">${t.badge}</span>`
            : ""
        }
        <div style="display:flex;align-items:baseline;justify-content:space-between;gap:16px">
          <span style="font-size:33px;font-weight:600;color:${C.text};letter-spacing:-0.02em">${t.name}</span>
          <span style="font-size:40px;font-weight:700;color:${t.featured ? C.accent : C.text};letter-spacing:-0.03em">${t.price}</span>
        </div>
        <div style="font-size:24px;color:#a2a8b2;margin-top:12px;line-height:1.4">${t.detail}</div>
      </div>`
    )
    .join("")}</div>`;
}

/** Stat tiles. */
function stats(list) {
  return `<div style="display:flex;gap:16px;margin-top:26px">${list
    .map(
      (st) => `<div style="flex:1;padding:26px 22px;${glass(20)}">
        <div style="font-size:62px;font-weight:700;color:${C.text};letter-spacing:-0.03em;line-height:1">${st.value}</div>
        <div style="font-size:22px;color:#a2a8b2;margin-top:12px;line-height:1.3">${st.label}</div>
      </div>`
    )
    .join("")}</div>`;
}

// -- Golden Gate blocks -----------------------------------------------------
//
// These four exist because the macOS 27 deck reports on interface changes, and
// a slide that describes a slider in body copy while showing a code window is a
// wasted slide. Each one renders the thing it is talking about.

/**
 * The busy warm ground that glass samples sit on.
 *
 * Glass only reads as glass when there is something behind it worth refracting.
 * A sample chip over flat colour just looks like a lighter rectangle, which is
 * exactly the comparison these slides cannot afford to be making.
 */
function ggBusyStrip(id) {
  // Colours come from the theme. These were literal bronze, which is how the
  // brandglass decks first rendered warm sample chips on an indigo slide —
  // the same leak as the lilac check circles, in the other direction.
  const b = C.busy;
  return `<svg viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden="true"
      style="position:absolute;inset:0;width:100%;height:100%">
    <defs>
      <linearGradient id="bs${id}a" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${b.a[0]}"/><stop offset="100%" stop-color="${b.a[1]}"/>
      </linearGradient>
      <linearGradient id="bs${id}b" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stop-color="${b.b[0]}"/><stop offset="100%" stop-color="${b.b[1]}"/>
      </linearGradient>
    </defs>
    <rect width="400" height="200" fill="${b.base}"/>
    <path d="M -20 210 C 60 130, 70 60, 90 -10 L 190 -10 C 150 70, 120 140, 110 210 Z"
      fill="url(#bs${id}a)"/>
    <path d="M 150 210 C 210 130, 260 70, 420 20 L 420 210 Z" fill="url(#bs${id}b)" opacity="0.9"/>
    <path d="M 250 -10 C 230 70, 250 150, 300 210 L 210 210 C 180 140, 190 60, 205 -10 Z"
      fill="${b.dark}" opacity="0.55"/>
  </svg>`;
}

/**
 * One Liquid Glass sample chip.
 *
 * `tint` is the slider position, 0 (clear) to 1 (tinted). `modern` switches on
 * the two material changes Golden Gate actually made — a darkened edge inside
 * the bright rim, and a stronger specular highlight — so the same helper draws
 * both the iOS 26 and the macOS 27 version of the material.
 */
function ggChip(tint, label, modern, radius = 20) {
  // The modern chip gets the full material: dispersion fringes down both
  // edges, a bright specular top, and a dark ring inside the rim. The legacy
  // one gets a flat even hairline and barely diffuses what is behind it, which
  // is what the complaints about Tahoe were actually describing.
  const rim = modern
    ? `inset 0 2px 2px rgba(255,252,246,0.92),
       inset 2.5px 0 0 ${C.fringeCool},
       inset -2.5px 0 0 ${C.fringeWarm},
       inset 0 0 0 1px rgba(255,240,224,0.34),
       inset 0 0 0 2.5px rgba(0,0,0,0.36)`
    : `inset 0 1px 1px rgba(255,250,242,0.28),
       inset 0 0 0 1px rgba(255,240,224,0.14)`;
  const blur = (modern ? 4 + tint * 20 : 1 + tint * 5).toFixed(1);
  const sat = modern ? 1.5 : 0.92;
  return `<div style="position:relative;flex:1;border-radius:${radius}px;
      display:flex;align-items:center;justify-content:center;
      background-color:rgba(24,17,11,${(0.04 + tint * 0.62).toFixed(3)});
      background-image:linear-gradient(180deg, rgba(255,248,238,${modern ? 0.18 : 0.05}) 0%,
        rgba(255,248,238,0.02) 18%, rgba(255,248,238,0) 42%);
      -webkit-backdrop-filter:blur(${blur}px) saturate(${sat});
      backdrop-filter:blur(${blur}px) saturate(${sat});
      box-shadow:${rim}">
    ${
      label
        ? `<span style="font-size:27px;font-weight:600;color:#fdf8f0;letter-spacing:-0.01em;
             text-shadow:${modern ? "0 1px 3px rgba(0,0,0,0.55)" : "0 0 2px rgba(0,0,0,0.25)"}">${label}</span>`
        : ""
    }
  </div>`;
}

/**
 * The app icon from the Golden Gate marketing shot — a squircle of stacked warm
 * layers with the numerals knocked out of a specular gradient.
 *
 * `refraction` (0–1) drives how hard the layers bend the light behind them,
 * which is the per-layer control iOS 27 added. Slide 5 renders the same tile at
 * three settings, so the difference is shown rather than asserted.
 */
function glassTile(cfg) {
  const list = cfg.tiles || [{ glyph: cfg.glyph, refraction: 1 }];
  const multi = list.length > 1;
  const size = cfg.size || (multi ? 204 : 316);
  const r = Math.round(size * 0.232); // Apple's squircle sits near 23% of the side.
  const glyphSize = Math.round(size * (multi ? 0.4 : 0.46));

  const tile = (t, i) => {
    const bend = t.refraction === undefined ? 1 : t.refraction;
    // The layers are drawn, then displaced by the shared refraction filter at a
    // strength set per tile. At bend 0 they stay flat and the tile reads like a
    // sticker; at 1 the edges lens the way the real icons do.
    const art = `
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"
        style="position:absolute;inset:0;width:100%;height:100%">
        <defs>
          <linearGradient id="gtA${i}" x1="0.1" y1="0" x2="0.85" y2="1">
            <stop offset="0%" stop-color="#fdf6ea"/>
            <stop offset="55%" stop-color="#dcc09a"/>
            <stop offset="100%" stop-color="#8d6a48"/>
          </linearGradient>
          <linearGradient id="gtB${i}" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stop-color="#4a3626"/>
            <stop offset="60%" stop-color="#9c7047"/>
            <stop offset="100%" stop-color="#d8ae7c"/>
          </linearGradient>
          <filter id="gtBend${i}" x="-25%" y="-25%" width="150%" height="150%"
            color-interpolation-filters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2"
              seed="${7 + i}" result="n"/>
            <feGaussianBlur in="n" stdDeviation="1.5" result="sn"/>
            <feDisplacementMap in="SourceGraphic" in2="sn" scale="${(bend * 17).toFixed(1)}"
              xChannelSelector="R" yChannelSelector="G" result="dr"/>
            <feDisplacementMap in="SourceGraphic" in2="sn" scale="${(bend * 8).toFixed(1)}"
              xChannelSelector="R" yChannelSelector="G" result="db"/>
            <feColorMatrix in="dr" type="matrix" result="cr"
              values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/>
            <feColorMatrix in="db" type="matrix" result="cb"
              values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"/>
            <feBlend in="cr" in2="cb" mode="screen"/>
          </filter>
        </defs>
        <g filter="url(#gtBend${i})">
          <rect width="100" height="100" fill="#8a6746"/>
          <path d="M -8 76 C 22 44, 32 14, 38 -8 L 72 -8 C 60 22, 42 52, 38 108 L -8 108 Z"
            fill="url(#gtA${i})"/>
          <path d="M 38 108 C 44 56, 64 26, 108 4 L 108 108 Z" fill="url(#gtB${i})"/>
          <path d="M 72 -8 C 62 22, 46 52, 42 108 L 36 108 C 40 52, 58 22, 66 -8 Z"
            fill="rgba(255,251,244,0.6)"/>
        </g>
      </svg>`;

    // The reflection lives inside the wrapper's height rather than hanging out
    // of it. Absolutely positioning it past the box was silently overlapping
    // whatever came next on the slide — on the cover, the CTA pill.
    const reflH = Math.round(size * 0.34);
    return `<div style="flex:none;display:flex;flex-direction:column;align-items:center;gap:14px">
      <div style="position:relative;width:${size}px;height:${size + reflH + 12}px">
        <div style="position:absolute;top:0;left:0;width:${size}px;height:${size}px;
            border-radius:${r}px;overflow:hidden;
            box-shadow:0 ${Math.round(size * 0.11)}px ${Math.round(size * 0.22)}px rgba(0,0,0,0.62),
              inset 0 2.5px 3px rgba(255,252,246,0.92),
              inset 3px 0 0 ${C.fringeCool},
              inset -3px 0 0 ${C.fringeWarm},
              inset 0 0 0 1px rgba(255,240,224,0.34),
              inset 0 0 0 3px rgba(0,0,0,0.32)">
          ${art}
          <div style="position:absolute;inset:0;background:linear-gradient(152deg,
            rgba(255,252,246,0.5) 0%, rgba(255,252,246,0.08) 24%,
            rgba(255,252,246,0) 52%, rgba(0,0,0,0.3) 100%)"></div>
          <!--
            The glyph is cream and the art has a cream band running through it,
            so without this scrim the numerals disappear wherever the two meet.
            A soft dark pool centred under the glyph buys the contrast back
            without flattening the layers around it.
          -->
          <div style="position:absolute;inset:0;background:radial-gradient(58% 46% at 50% 50%,
            rgba(46,28,12,0.52) 0%, rgba(46,28,12,0.22) 55%, rgba(46,28,12,0) 78%)"></div>
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
            <span style="font-size:${glyphSize}px;font-weight:700;letter-spacing:-0.045em;
              line-height:1;background:linear-gradient(180deg,#fffefb 0%,#fbf1e0 48%,#dcbf99 100%);
              -webkit-background-clip:text;background-clip:text;color:transparent;
              filter:drop-shadow(0 2px 3px rgba(40,22,8,0.75)) drop-shadow(0 0 14px rgba(40,22,8,0.45))">${t.glyph}</span>
          </div>
        </div>
        <div style="position:absolute;top:${size + 12}px;left:6%;width:88%;height:${reflH}px;
            border-radius:${r}px;overflow:hidden;transform:scaleY(-1);opacity:0.22;
            -webkit-mask-image:linear-gradient(180deg,transparent 0%,#000 100%);
            mask-image:linear-gradient(180deg,transparent 0%,#000 100%)">
          ${art}
        </div>
      </div>
      ${
        t.caption
          ? `<div style="font-size:21px;color:${t.on ? C.accent : C.secondary};
               font-weight:${t.on ? 600 : 400};letter-spacing:-0.005em">${t.caption}</div>`
          : ""
      }
    </div>`;
  };

  return `<div style="margin-top:26px;display:flex;justify-content:${multi ? "space-between" : "flex-start"};
    align-items:flex-start;gap:${multi ? 22 : 0}px">${list.map(tile).join("")}</div>`;
}

/**
 * The Liquid Glass slider, with live samples above it.
 *
 * The samples are the point. iOS 26 shipped two looks and Golden Gate ships the
 * whole range between them, which is a claim about a continuum — so the block
 * draws three positions on that continuum over identical busy content, with the
 * same word set in each, and lets the legibility difference make the argument.
 */
function glassSlider(gs) {
  const samples = gs.samples || [];
  const value = gs.value === undefined ? 62 : gs.value;

  const strip = `<div style="position:relative;height:172px;border-radius:18px;overflow:hidden;
      box-shadow:inset 0 0 0 1px rgba(255,240,224,0.14)">
    ${ggBusyStrip("gs")}
    <div style="position:absolute;inset:20px;display:flex;gap:16px">
      ${samples.map((s) => ggChip(s.tint, s.label, true, 16)).join("")}
    </div>
  </div>`;

  const track = `<div style="position:relative;height:16px;border-radius:99px;
      background:rgba(255,240,224,0.16);
      box-shadow:inset 0 1px 2px rgba(0,0,0,0.4)">
    <div style="position:absolute;left:0;top:0;bottom:0;width:${value}%;border-radius:99px;
      background:linear-gradient(90deg,#9a7245,${C.accent});
      box-shadow:0 0 20px ${C.accentGlow}"></div>
    <div style="position:absolute;left:${value}%;top:50%;width:44px;height:44px;
      transform:translate(-50%,-50%);border-radius:99px;
      background:linear-gradient(180deg,#fffdf8,#e4d5bf);
      box-shadow:0 6px 16px rgba(0,0,0,0.55), inset 0 1px 1px rgba(255,255,255,0.9)"></div>
  </div>`;

  return `<div style="margin-top:26px;padding:26px 28px 28px;${glass(20, true)}">
    ${strip}
    <div style="margin-top:30px;display:flex;align-items:center;gap:24px">
      <span style="font-size:27px;color:${C.text};font-weight:500;letter-spacing:-0.015em;
        flex:none">${gs.label}</span>
      <div style="flex:1">${track}</div>
    </div>
    <div style="margin-top:14px;display:flex;justify-content:space-between;font-size:21px;
      color:${C.secondary}">
      <span>${gs.min}</span><span>${gs.max}</span>
    </div>
    ${
      gs.caption
        ? `<div style="margin-top:20px;padding-top:18px;border-top:1px solid rgba(255,240,224,0.12);
             font-family:${MONO};font-size:22px;color:${C.accent};font-weight:600">${gs.caption}</div>`
        : ""
    }
  </div>`;
}

/**
 * A Golden Gate settings window.
 *
 * Rendered light, because that is what the release actually looks like, and a
 * light window on this dark ground carries the slide on its own. The three
 * changes it exists to show are structural rather than decorative: the sidebar
 * runs to the window edge instead of floating inset, the toolbar is one uniform
 * bar, and the corner radius is tighter and consistent.
 */
function macWindow(w) {
  const dot = (c) => `<span style="width:13px;height:13px;border-radius:99px;background:${c};
    display:block;box-shadow:inset 0 0 0 0.5px rgba(0,0,0,0.14)"></span>`;

  const side = w.sidebar
    .map(
      (it) => `<div style="display:flex;align-items:center;gap:13px;padding:11px 18px;
        ${it.on ? `background:${C.accent};` : ""}">
      <span style="width:27px;height:27px;border-radius:8px;flex:none;
        background:${it.on ? "rgba(255,255,255,0.35)" : it.color};
        box-shadow:inset 0 1px 0 rgba(255,255,255,0.4)"></span>
      <span style="font-size:22px;letter-spacing:-0.01em;
        color:${it.on ? "#fffaf2" : "#3a352d"};font-weight:${it.on ? 600 : 400}">${it.label}</span>
    </div>`
    )
    .join("");

  const body = w.rows
    .map(
      (r, i) => `<div style="display:flex;align-items:center;gap:14px;padding:17px 22px;
        ${i ? "border-top:1px solid rgba(60,50,38,0.10);" : ""}">
      <span style="width:26px;height:26px;border-radius:7px;flex:none;background:${r.color};
        box-shadow:inset 0 1px 0 rgba(255,255,255,0.4)"></span>
      <span style="font-size:23px;color:#2c2822;letter-spacing:-0.01em">${r.label}</span>
      <span style="margin-left:auto;color:#7c7367;font-size:23px">&rsaquo;</span>
    </div>`
    )
    .join("");

  const notes = (w.notes || [])
    .map(
      (n) => `<span style="display:inline-flex;align-items:center;gap:9px;font-size:20px;
        color:${C.accent};font-weight:500">
      <span style="width:7px;height:7px;border-radius:99px;background:${C.accent};
        box-shadow:0 0 10px ${C.accentGlow}"></span>${n}</span>`
    )
    .join("");

  return `<div style="margin-top:26px">
    <div style="border-radius:18px;overflow:hidden;background:#f4eee5;
        box-shadow:0 34px 80px rgba(0,0,0,0.62), inset 0 0 0 1px rgba(255,255,255,0.5)">
      <div style="display:flex;align-items:center;gap:9px;padding:16px 20px;
          background:#e9e1d5;border-bottom:1px solid rgba(60,50,38,0.13)">
        ${dot("#ff5f57")}${dot("#febc2e")}${dot("#28c840")}
        <span style="margin-left:16px;font-size:22px;font-weight:600;color:#2c2822;
          letter-spacing:-0.015em">${w.title}</span>
      </div>
      <div style="display:flex;align-items:stretch">
        <div style="width:290px;flex:none;padding:12px 0;background:#e4dccf;
          border-right:1px solid rgba(60,50,38,0.10)">${side}</div>
        <div style="flex:1;padding:6px 0">${body}</div>
      </div>
    </div>
    ${notes ? `<div style="margin-top:18px;display:flex;gap:26px;flex-wrap:wrap">${notes}</div>` : ""}
  </div>`;
}

/**
 * Two glass samples side by side, Tahoe against Golden Gate.
 *
 * Deliberately not the `compare` block: that one is red-wrong versus
 * green-right, and Tahoe is not wrong — it is the previous release. Muted
 * against accent makes the same visual split without asserting a verdict the
 * slide is not making.
 */
function versus(v) {
  const card = (c, modern) => `<div style="flex:1;padding:20px;${glass(20, modern)}">
    <div style="position:relative;height:150px;border-radius:14px;overflow:hidden;
        box-shadow:inset 0 0 0 1px rgba(255,240,224,0.12)">
      ${ggBusyStrip(modern ? "vR" : "vL")}
      <div style="position:absolute;inset:16px;display:flex">
        ${ggChip(c.tint === undefined ? 0.34 : c.tint, c.sample, modern, 13)}
      </div>
    </div>
    <div style="margin-top:18px;font-size:25px;font-weight:600;letter-spacing:-0.02em;
      color:${modern ? C.accent : C.secondary}">${c.tag}</div>
    <div style="margin-top:12px;display:flex;flex-direction:column;gap:9px">
      ${c.lines
        .map(
          (l) => `<div style="display:flex;gap:11px;font-size:21px;line-height:1.34;
            color:${modern ? C.text : C.secondary}">
          <span style="color:${modern ? C.accent : "#6f6558"};flex:none">${modern ? "+" : "–"}</span>
          <span>${l}</span>
        </div>`
        )
        .join("")}
    </div>
  </div>`;

  return `<div style="margin-top:26px;display:flex;gap:18px;align-items:stretch">
    ${card(v.before, false)}${card(v.after, true)}
  </div>`;
}

// -- Chrome ----------------------------------------------------------------

function dots(index, total) {
  const items = Array.from({ length: total }, (_, i) => {
    const on = i === index;
    if (on) {
      return `<span style="display:block;width:26px;height:8px;border-radius:99px;
        background:${C.text};box-shadow:0 0 14px rgba(255,255,255,0.45)"></span>`;
    }
    return `<span style="display:block;width:8px;height:8px;border-radius:99px;
      background:rgba(255,255,255,0.18)"></span>`;
  }).join("");
  return `<div style="display:flex;align-items:center;gap:8px">${items}</div>`;
}

function topBar() {
  return `<header style="display:flex;align-items:center;justify-content:space-between;flex:none">
    <div style="display:flex;align-items:center;gap:13px;padding:11px 19px 11px 22px;${glass(99)}">
      ${markSvg(30)}
      <div style="display:flex;align-items:center;gap:7px">
        <span style="font-size:26px;letter-spacing:-0.022em;line-height:1">
          <span style="font-weight:400;color:${C.text}">Yusuf</span><span style="font-weight:600;color:${C.brand}">Creates</span>
        </span>
        ${verifiedBadge(20)}
      </div>
    </div>
    <div style="display:flex;align-items:center;justify-content:center;width:54px;height:54px;${glass(18)}">
      ${carouselGlyph()}
    </div>
  </header>`;
}

function footer(index, total, handle) {
  return `<footer style="display:flex;align-items:center;justify-content:space-between;flex:none">
    ${dots(index, total)}
    <span style="font-size:22px;color:${C.secondary};letter-spacing:-0.01em">${handle}</span>
  </footer>`;
}

function pill(label, hi = false) {
  return `<div style="display:inline-flex;align-items:center;gap:11px;padding:16px 28px;
      ${glass(99, hi)}font-size:24px;font-weight:500;color:${C.text}">
    <span>${label}</span><span style="opacity:0.8">&rarr;</span>
  </div>`;
}

/**
 * Renders one slide.
 *
 * At 4:5 the vertical budget is roughly half of v1's, so headline sizing is
 * tighter and a slide carrying a graphic drops a size step to leave the graphic
 * room. Cover slides (no graphic) keep the big display type.
 */
function slide(s, index, total, handle) {
  const eyebrowColor = s.eyebrowColor || C.eyebrowDot || C.accent;
  const hasGraphic = !!(
    s.code || s.terminal || s.tree || s.compare || s.steps ||
    s.splash || s.people || s.quote ||
    s.figure || s.bars || s.checks || s.rows || s.tiers || s.stats ||
    s.glassTile || s.glassSlider || s.macWindow || s.versus
  );

  const lines = s.headline.map((p) => (Array.isArray(p) ? p[0] : p));
  const longest = Math.max(...lines.map((l) => l.length));

  let size;
  if (hasGraphic) {
    size = longest > 24 ? 62 : longest > 18 ? 70 : 76;
    if (lines.length >= 3) size = Math.min(size, 58);
  } else {
    size = longest > 24 ? 78 : longest > 19 ? 88 : longest > 15 ? 96 : 104;
    if (lines.length >= 4) size = Math.min(size, 70);
    else if (lines.length === 3) size = Math.min(size, 84);
  }

  const headline = s.headline
    .map((part) => {
      const [text, t] = Array.isArray(part) ? part : [part, "primary"];
      const color = tone(t);
      const glow =
        t === "accent" ? `text-shadow:0 0 50px ${C.accentGlow};`
        : t === "danger" ? "text-shadow:0 0 50px rgba(229,72,77,0.3);"
        : t === "green" ? "text-shadow:0 0 50px rgba(76,195,138,0.28);"
        : "";
      return `<span style="display:block;color:${color};${glow}">${text}</span>`;
    })
    .join("");

  const eyebrow = s.eyebrow
    ? `<div style="display:inline-flex;align-items:center;gap:10px;align-self:flex-start;
          padding:10px 18px;margin-bottom:20px;${glass(99)}">
        <span style="width:9px;height:9px;border-radius:99px;background:${eyebrowColor};
          box-shadow:0 0 12px ${eyebrowColor}"></span>
        <span style="font-size:19px;font-weight:600;letter-spacing:0.13em;
          text-transform:uppercase;color:${C.text}">${s.eyebrow}</span>
      </div>`
    : "";

  const body = s.body
    ? `<p style="margin:${hasGraphic ? 20 : 28}px 0 0;font-size:${hasGraphic ? 26 : 29}px;
        line-height:1.48;color:${C.secondary};max-width:900px;letter-spacing:-0.005em">${s.body}</p>`
    : "";

  const graphic =
    (s.splash ? claudeSplash(s.splash) : "") +
    (s.people ? people(s.people) : "") +
    (s.quote ? quote(s.quote) : "") +
    (s.code ? codeWindow(s.code) : "") +
    (s.terminal ? terminal(s.terminal) : "") +
    (s.tree ? fileTree(s.tree) : "") +
    (s.compare ? compare(s.compare) : "") +
    (s.steps ? steps(s.steps) : "") +
    (s.figure ? figure(s.figure) : "") +
    (s.bars ? bars(s.bars) : "") +
    (s.rows ? rows(s.rows) : "") +
    (s.tiers ? tiers(s.tiers) : "") +
    (s.stats ? stats(s.stats) : "") +
    (s.checks ? checks(s.checks) : "") +
    (s.glassTile ? glassTile(s.glassTile) : "") +
    (s.glassSlider ? glassSlider(s.glassSlider) : "") +
    (s.macWindow ? macWindow(s.macWindow) : "") +
    (s.versus ? versus(s.versus) : "");

  const cta = s.cta
    ? `<div style="margin-top:${hasGraphic ? 22 : 34}px">${pill(s.cta, s.ctaHi)}</div>`
    : "";

  // A theme opts into the sheet ground by defining `sheets`; everything else
  // keeps the original pair of blurred orbs.
  const ground = C.sheets
    ? ggGround()
    : `<div class="orb orb-a"></div><div class="orb orb-b"></div>`;

  return `<section class="slide">
    <div class="bg" aria-hidden="true">
      ${ground}
      <div class="grain"></div>
    </div>

    ${topBar()}

    <main>
      ${s.graphicTop ? `<div style="margin-bottom:30px">${graphic}</div>` : ""}
      ${eyebrow}
      <h1 style="margin:0;font-size:${size}px;font-weight:700;line-height:1.06;
          letter-spacing:-0.032em;max-width:${hasGraphic ? 880 : 900}px">${headline}</h1>
      ${body}
      ${s.graphicTop ? "" : graphic}
      ${cta}
    </main>

    ${footer(index, total, handle)}
  </section>`;
}

/**
 * Built per page rather than once at module load: it interpolates `C.canvas`,
 * and a module-level const would bake in whichever palette happened to be
 * active when this file was first required — always the default one.
 */
const pageCss = () => `
  ${FONT_FACE}
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;background:#000}
  body{font-family:${FONT};-webkit-font-smoothing:antialiased}

  section.slide{
    position:relative;width:1080px;height:1350px;
    background:${C.canvas};
    display:flex;flex-direction:column;
    padding:52px 56px 46px;
    margin:0 auto;
    overflow:hidden;
    isolation:isolate;
    direction:ltr;text-align:left;
  }
  section.slide h1,section.slide p{text-align:left}
  section.slide main{
    flex:1 1 auto;min-height:0;
    display:flex;flex-direction:column;justify-content:center;
    position:relative;z-index:1;
  }
  section.slide header,section.slide footer{position:relative;z-index:1}
  h1,p{margin:0}

  .bg{position:absolute;inset:0;z-index:0;overflow:hidden}
  .orb{position:absolute;border-radius:50%;filter:blur(85px)}
  .orb-a{
    top:-260px;right:-200px;width:840px;height:840px;
    background:radial-gradient(circle at 35% 35%,
      rgba(94,106,210,0.46) 0%, rgba(94,106,210,0.18) 40%, transparent 70%);
  }
  .orb-b{
    bottom:-320px;left:-240px;width:900px;height:900px;
    background:radial-gradient(circle at 60% 40%,
      rgba(124,92,220,0.30) 0%, rgba(60,80,190,0.12) 44%, transparent 72%);
  }
  .grain{
    position:absolute;inset:0;opacity:0.05;mix-blend-mode:overlay;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E");
  }
`;

/**
 * `offset` and `total` let the renderer emit one slide per page while still
 * drawing the correct progress dots. Without them a single-slide page would
 * always report "1 of 1" — which is exactly what happened when rendering moved
 * to one slide at a time to dodge the scroll-repaint bug.
 */
function page(slides, handle, offset = 0, total = slides.length, theme) {
  setTheme(theme);
  const body = slides.map((s, i) => slide(s, offset + i, total, handle)).join("");
  return `<!doctype html><html><head><meta charset="utf-8">
    <style>${pageCss()}</style>
  </head><body>${refractionFilter()}${body}</body></html>`;
}

module.exports = { page, slide, C, THEMES };
