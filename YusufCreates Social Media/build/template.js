/**
 * YusufCreates Instagram carousel renderer — liquid glass.
 *
 * Standard left-to-right layout: logo lockup top-left, type left-aligned,
 * progress running left from the edge, CTA arrows pointing right.
 *
 * SIZE: 1080x1350 (4:5). Instagram carousels cap at 4:5 — an earlier version of
 * this file rendered 9:16, which Instagram centre-cropped on upload, cutting off
 * the logo lockup at the top and the progress dots at the bottom. 4:5 is the
 * tallest ratio a carousel accepts, so it stays. Type and spacing below are
 * scaled for that height; changing the canvas means re-tuning both.
 *
 * The glass is genuine: the real backdrop-filter chain from globals.css and
 * the SVG refraction filter from LiquidGlass.tsx. Headless Chromium supports
 * both, so these are the same effects the site ships.
 */

const fs = require("fs");
const path = require("path");

// -- Brand tokens, mirrored from globals.css --------------------------------
const C = {
  canvas: "#08090a",
  surface1: "#0f1011",
  surface2: "#161718",
  surface3: "#23252a",
  text: "#f7f8f8",
  secondary: "#8a8f98",
  hairline: "rgba(255,255,255,0.08)",
  glassBorder: "rgba(255,255,255,0.13)",
  glassBg: "rgba(14,14,22,0.24)",
  accent: "#5e6ad2",
  accentGlow: "rgba(94,106,210,0.35)",
  danger: "#e5484d",
  green: "#4cc38a",
  amber: "#f5a623",
};

/** The exact specular stack from --glass-shadow. */
const GLASS_SHADOW = `0 24px 60px rgba(0,0,0,0.45),
  inset 0 1px 1px rgba(255,255,255,0.5),
  inset 0 -8px 20px rgba(255,255,255,0.06),
  inset 0 0 0 1px rgba(255,255,255,0.13)`;

/** Brighter variant for the one element per slide that should lead. */
const GLASS_SHADOW_HI = `0 28px 70px rgba(0,0,0,0.5),
  inset 0 1px 2px rgba(255,255,255,0.65),
  inset 0 -8px 24px rgba(255,255,255,0.09),
  inset 0 0 0 1px rgba(255,255,255,0.20)`;

const INTER_B64 = fs
  .readFileSync(path.join(__dirname, "inter.b64"), "utf8")
  .trim();

const FONT_FACE = `@font-face{
  font-family:"InterEmbedded";
  src:url(data:font/woff2;base64,${INTER_B64}) format("woff2");
  font-weight:100 900;font-style:normal;font-display:block;
}`;

const FONT = '"InterEmbedded", Inter, system-ui, sans-serif';

// -- Logo mark, verbatim from Logo.tsx --------------------------------------
const STROKE = 15;
const CHEVRON = "M61 48 L92 79 L61 110";
const ARM = "M159 48 L115 92 L115 137";

function markSvg(px, color = C.text, accent = C.accent) {
  return `<svg viewBox="40 30 140 155" style="height:${px}px;width:auto;overflow:visible" aria-hidden="true">
    <path d="${CHEVRON}" fill="none" stroke="${color}" stroke-width="${STROKE}" stroke-linecap="square" stroke-linejoin="miter"/>
    <path d="${ARM}" fill="none" stroke="${color}" stroke-width="${STROKE}" stroke-linecap="square" stroke-linejoin="miter"/>
    <rect x="99" y="155" width="34" height="17" fill="${accent}"/>
  </svg>`;
}

function verifiedBadge(px) {
  return `<svg viewBox="0 0 24 24" style="height:${px}px;width:${px}px;flex:none" aria-hidden="true">
    <path fill="${C.accent}" d="M12 .8l2.6 2 3.2-.5 1.2 3 3 1.2-.5 3.2 2 2.6-2 2.6.5 3.2-3 1.2-1.2 3-3.2-.5-2.6 2-2.6-2-3.2.5-1.2-3-3-1.2.5-3.2-2-2.6 2-2.6-.5-3.2 3-1.2 1.2-3 3.2.5z"/>
    <path fill="${C.canvas}" d="M10.6 15.9l-3.3-3.3 1.5-1.5 1.8 1.8 4.6-4.6 1.5 1.5z"/>
  </svg>`;
}

/** The stacked-cards glyph that marks a post as swipeable. */
function carouselGlyph() {
  return `<svg viewBox="0 0 32 30" style="height:26px;width:auto" aria-hidden="true">
    <rect x="9.5" y="1.5" width="21" height="21" rx="5" fill="none" stroke="${C.text}" stroke-width="2.2" opacity="0.45"/>
    <rect x="1.5" y="7.5" width="21" height="21" rx="5" fill="${C.text}"/>
  </svg>`;
}

/** The refraction filter from LiquidGlass.tsx, shared by every glass surface. */
function refractionFilter() {
  return `<svg aria-hidden="true" style="position:absolute;width:0;height:0">
    <defs>
      <filter id="lgRefract" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.008" numOctaves="2" seed="4" result="noise"/>
        <feGaussianBlur in="noise" stdDeviation="2" result="softNoise"/>
        <feDisplacementMap in="SourceGraphic" in2="softNoise" scale="12"
          xChannelSelector="R" yChannelSelector="G" result="displaced"/>
        <feGaussianBlur in="displaced" stdDeviation="7"/>
      </filter>
    </defs>
  </svg>`;
}

function glass(radius = 28, hi = false) {
  return `background-color:${C.glassBg};
    -webkit-backdrop-filter:url(#lgRefract);
    backdrop-filter:url(#lgRefract);
    box-shadow:${hi ? GLASS_SHADOW_HI : GLASS_SHADOW};
    border-radius:${radius}px;`;
}

/** Progress indicator. The active step is a glass capsule rather than a plain
 *  bar so it belongs to the same material as the rest of the slide. */
function dots(index, total) {
  const items = Array.from({ length: total }, (_, i) => {
    const on = i === index;
    if (on) {
      return `<span style="display:block;width:26px;height:8px;border-radius:99px;
        background:${C.text};box-shadow:0 0 14px rgba(255,255,255,0.45)"></span>`;
    }
    return `<span style="display:block;width:8px;height:8px;border-radius:99px;
      background:rgba(255,255,255,0.18);box-shadow:inset 0 0 0 1px rgba(255,255,255,0.10)"></span>`;
  }).join("");
  return `<div style="display:flex;align-items:center;gap:10px">${items}</div>`;
}

/** Top bar. Lockup on the left, carousel glyph on the right. */
function topBar() {
  return `<header style="display:flex;align-items:center;justify-content:space-between">
    <div style="display:flex;flex-direction:row;align-items:center;gap:16px;
        padding:11px 19px 11px 22px;${glass(99)}">
      ${markSvg(30)}
      <div style="display:flex;flex-direction:row;align-items:center;gap:7px">
        <span style="font-size:26px;letter-spacing:-0.022em;line-height:1">
          <span style="font-weight:400;color:${C.text}">Yusuf</span><span style="font-weight:600;color:${C.accent}">Creates</span>
        </span>
        ${verifiedBadge(20)}
      </div>
    </div>
    <div style="display:flex;align-items:center;justify-content:center;width:54px;height:54px;${glass(18)}">
      ${carouselGlyph()}
    </div>
  </header>`;
}

/** Footer. Progress on the left, handle on the right. */
function footer(index, total, handle) {
  return `<footer style="display:flex;align-items:center;justify-content:space-between">
    ${dots(index, total)}
    <span style="font-size:22px;color:${C.secondary};letter-spacing:-0.01em">${handle}</span>
  </footer>`;
}

/** Glass CTA chip. */
function pill(label, hi = false) {
  return `<div style="display:inline-flex;align-items:center;gap:11px;padding:16px 28px;
      ${glass(99, hi)}font-size:24px;font-weight:500;color:${C.text}">
    <span>${label}</span><span style="opacity:0.8">&rarr;</span>
  </div>`;
}

/** Resolves a tone keyword to a colour. */
function tone(t) {
  return t === "primary" ? C.text
    : t === "muted" ? "#7e838c"
    : t === "accent" ? C.accent
    : t === "danger" ? C.danger
    : t === "green" ? C.green
    : t === "amber" ? C.amber
    : t;
}

/**
 * Renders one slide.
 *
 * Headline entries are one per line so a coloured clause never straddles a
 * line break; each may carry its own tone.
 */
function slide(s, index, total, handle) {
  const eyebrowColor = s.eyebrowColor || C.accent;

  // Sized for the 1350px canvas. A slide carrying a block of content drops a
  // step so the block keeps its room; text-only slides keep the display size.
  const dense = !!(s.stats || s.rows || s.tiers || s.checks || s.bigNote);
  const lines = s.headline.map((p) => (Array.isArray(p) ? p[0] : p));
  const longest = Math.max(...lines.map((l) => l.length));

  let size;
  if (dense) {
    size = longest > 24 ? 54 : longest > 19 ? 60 : longest > 15 ? 66 : 72;
    if (lines.length >= 3) size = Math.min(size, 52);
  } else {
    size = longest > 24 ? 76 : longest > 19 ? 86 : longest > 15 ? 96 : 104;
    if (lines.length >= 4) size = Math.min(size, 68);
    else if (lines.length === 3) size = Math.min(size, 84);
  }

  const headline = s.headline
    .map((part) => {
      const [text, t] = Array.isArray(part) ? part : [part, "primary"];
      const color = tone(t);
      const glow =
        t === "accent" ? `text-shadow:0 0 60px ${C.accentGlow};`
        : t === "danger" ? "text-shadow:0 0 60px rgba(229,72,77,0.3);"
        : t === "green" ? "text-shadow:0 0 60px rgba(76,195,138,0.28);"
        : t === "amber" ? "text-shadow:0 0 60px rgba(245,166,35,0.28);"
        : "";
      return `<span style="display:block;color:${color};${glow}">${text}</span>`;
    })
    .join("");

  // Eyebrow tab, anchored to the left edge with a status dot.
  const eyebrow = s.eyebrow
    ? `<div style="display:inline-flex;align-items:center;gap:10px;
          align-self:flex-start;padding:10px 18px;margin-bottom:22px;${glass(99)}">
        <span style="width:9px;height:9px;border-radius:99px;background:${eyebrowColor};
          box-shadow:0 0 14px ${eyebrowColor}"></span>
        <span style="font-size:19px;font-weight:600;letter-spacing:0.13em;
          text-transform:uppercase;color:${C.text}">${s.eyebrow}</span>
      </div>`
    : "";

  const body = s.body
    ? `<p style="margin:${dense ? 20 : 28}px 0 0;font-size:${dense ? 25 : 29}px;line-height:1.48;color:${C.secondary};
        max-width:900px;letter-spacing:-0.005em">${s.body}</p>`
    : "";

  const cta = s.cta
    ? `<div style="margin-top:${dense ? 24 : 34}px;display:flex;justify-content:flex-start">${pill(s.cta, s.ctaHi)}</div>`
    : "";

  // Stat tiles.
  const stats = s.stats
    ? `<div style="display:flex;gap:16px;margin-top:28px">${s.stats
        .map(
          (st) => `<div style="flex:1;padding:26px 22px;${glass(20)}">
            <div style="font-size:54px;font-weight:700;color:${C.text};letter-spacing:-0.03em;line-height:1">${st.value}</div>
            <div style="font-size:20px;color:${C.secondary};margin-top:10px;line-height:1.3">${st.label}</div>
          </div>`
        )
        .join("")}</div>`
    : "";

  // List rows, index chip first.
  const rows = s.rows
    ? `<div style="display:flex;flex-direction:column;gap:14px;margin-top:28px">${s.rows
        .map(
          (r) => `<div style="display:flex;align-items:center;gap:20px;
              padding:22px 26px;${glass(18)}">
            <span style="font-size:23px;font-weight:700;color:${C.accent};min-width:42px">${r.k}</span>
            <span style="font-size:25px;color:${C.text};letter-spacing:-0.01em">${r.v}</span>
          </div>`
        )
        .join("")}</div>`
    : "";

  /**
   * Pricing tier panel. The featured tier gets the brighter specular stack and
   * an accent ribbon so it wins attention without changing size — scale would
   * break the rhythm of the stack.
   */
  const tiers = s.tiers
    ? `<div style="display:flex;flex-direction:column;gap:16px;margin-top:28px">${s.tiers
        .map(
          (t) => `<div style="position:relative;padding:26px 28px;${glass(20, t.featured)}
              ${t.featured ? `border-top:2px solid ${C.accent};` : ""}">
            ${
              t.badge
                ? `<span style="position:absolute;top:-14px;left:28px;padding:7px 15px;border-radius:99px;
                    background:${C.accent};color:#fff;font-size:17px;font-weight:600;
                    letter-spacing:0.06em;text-transform:uppercase;
                    box-shadow:0 6px 24px ${C.accentGlow}">${t.badge}</span>`
                : ""
            }
            <div style="display:flex;align-items:baseline;justify-content:space-between;gap:16px">
              <span style="font-size:30px;font-weight:600;color:${C.text};letter-spacing:-0.02em">${t.name}</span>
              <span style="font-size:36px;font-weight:700;color:${t.featured ? C.accent : C.text};letter-spacing:-0.03em">${t.price}</span>
            </div>
            <div style="font-size:22px;color:${C.secondary};margin-top:10px;line-height:1.4">${t.detail}</div>
          </div>`
        )
        .join("")}</div>`
    : "";

  /** Feature checklist — a tick per line. */
  const checks = s.checks
    ? `<div style="display:flex;flex-direction:column;gap:16px;margin-top:28px">${s.checks
        .map(
          (c) => `<div style="display:flex;align-items:center;gap:20px">
            <span style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;
              border-radius:99px;flex:none;${glass(99)}">
              <svg viewBox="0 0 24 24" style="width:24px;height:24px" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="${C.accent}"
                  stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <span style="font-size:26px;color:${C.text};letter-spacing:-0.01em">${c}</span>
          </div>`
        )
        .join("")}</div>`
    : "";

  /** Oversized offer figure, for the promo deck. */
  const bigNote = s.bigNote
    ? `<div style="margin-top:28px;padding:32px 36px;${glass(24, true)}">
        <div style="font-size:132px;font-weight:700;color:${C.accent};letter-spacing:-0.05em;
          line-height:0.95;text-shadow:0 0 70px ${C.accentGlow}">${s.bigNote.value}</div>
        <div style="font-size:24px;color:${C.text};margin-top:14px;line-height:1.4">${s.bigNote.label}</div>
      </div>`
    : "";

  return `<section class="slide">
    <!-- Colour field. The glass needs real luminance variation to refract. -->
    <div class="bg" aria-hidden="true">
      <div class="orb orb-a"></div>
      <div class="orb orb-b"></div>
      <div class="orb orb-c"></div>
      <div class="grain"></div>
    </div>

    ${topBar()}

    <main>
      ${eyebrow}
      <h1 style="margin:0;font-size:${size}px;font-weight:700;line-height:1.04;
          letter-spacing:-0.032em;max-width:910px">${headline}</h1>
      ${body}
      ${stats}
      ${rows}
      ${tiers}
      ${checks}
      ${bigNote}
      ${cta}
    </main>

    ${footer(index, total, handle)}
  </section>`;
}

/** Page CSS: layout pinning, the colour field, and grain. */
const PAGE_CSS = `
  ${FONT_FACE}
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;background:#000}
  body{font-family:${FONT};-webkit-font-smoothing:antialiased}

  section.slide{
    position:relative;width:1080px;height:1350px;
    background:${C.canvas};
    display:flex;flex-direction:column;
    padding:56px 60px 50px;
    margin:0 auto;
    overflow:hidden;
    isolation:isolate;
    direction:ltr;
    text-align:left;
  }
  section.slide h1,
  section.slide p{text-align:left}
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
    top:-260px;right:-200px;width:860px;height:860px;
    background:radial-gradient(circle at 35% 35%,
      rgba(94,106,210,0.50) 0%,
      rgba(94,106,210,0.20) 38%,
      transparent 70%);
  }
  .orb-b{
    bottom:-320px;left:-240px;width:920px;height:920px;
    background:radial-gradient(circle at 60% 40%,
      rgba(124,92,220,0.34) 0%,
      rgba(60,80,190,0.14) 42%,
      transparent 72%);
  }
  .orb-c{
    top:430px;left:44%;width:620px;height:620px;
    background:radial-gradient(circle at center,
      rgba(255,255,255,0.075) 0%,
      rgba(255,255,255,0.022) 40%,
      transparent 68%);
  }
  .grain{
    position:absolute;inset:0;opacity:0.055;mix-blend-mode:overlay;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E");
  }
`;

/**
 * `offset` and `total` let the renderer emit one slide per page while still
 * drawing the correct progress dots — necessary since rendering moved to one
 * slide at a time to avoid the scroll-repaint bug.
 */
function page(slides, handle, offset = 0, total = slides.length) {
  const body = slides
    .map((s, i) => slide(s, offset + i, total, handle))
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8">
    <style>${PAGE_CSS}</style>
  </head><body>${refractionFilter()}${body}</body></html>`;
}

module.exports = { page, slide, C };
