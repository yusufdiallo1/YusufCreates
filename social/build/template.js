/**
 * YusufCreates Instagram carousel renderer — liquid glass.
 *
 * The reference deck supplied only the *layout* skeleton: top bar, eyebrow,
 * oversized headline, body, footer with progress and handle. Everything
 * visual here comes from the site's own design system — the real
 * backdrop-filter glass from globals.css, the SVG refraction filter from
 * LiquidGlass.tsx, and the surface ladder.
 *
 * Rendering happens in headless Chromium, which supports both backdrop-filter
 * and SVG displacement maps, so these are the genuine effects rather than a
 * flat approximation of them.
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
};

/** The exact specular stack from --glass-shadow. */
const GLASS_SHADOW = `0 24px 60px rgba(0,0,0,0.45),
  inset 0 1px 1px rgba(255,255,255,0.5),
  inset 0 -8px 20px rgba(255,255,255,0.06),
  inset 0 0 0 1px rgba(255,255,255,0.13)`;

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

function carouselGlyph() {
  return `<svg viewBox="0 0 32 30" style="height:34px;width:auto" aria-hidden="true">
    <rect x="9.5" y="1.5" width="21" height="21" rx="5" fill="none" stroke="${C.text}" stroke-width="2.2" opacity="0.45"/>
    <rect x="1.5" y="7.5" width="21" height="21" rx="5" fill="${C.text}"/>
  </svg>`;
}

/**
 * The refraction filter from LiquidGlass.tsx. One shared definition per page;
 * every glass surface references it, so the lens distortion is consistent.
 */
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

/** Inline style for a liquid-glass surface at a given radius. */
function glass(radius = 28, extra = "") {
  return `background-color:${C.glassBg};
    -webkit-backdrop-filter:url(#lgRefract);
    backdrop-filter:url(#lgRefract);
    box-shadow:${GLASS_SHADOW};
    border-radius:${radius}px;${extra}`;
}

/**
 * Progress indicator. The active step is a glass capsule rather than a plain
 * bar so it belongs to the same material as the rest of the slide.
 */
function dots(index, total) {
  const items = Array.from({ length: total }, (_, i) => {
    const on = i === index;
    if (on) {
      return `<span style="display:block;width:30px;height:10px;border-radius:99px;
        background:${C.text};box-shadow:0 0 16px rgba(255,255,255,0.45)"></span>`;
    }
    return `<span style="display:block;width:10px;height:10px;border-radius:99px;
      background:rgba(255,255,255,0.18);box-shadow:inset 0 0 0 1px rgba(255,255,255,0.10)"></span>`;
  }).join("");
  return `<div style="display:flex;align-items:center;gap:10px">${items}</div>`;
}

/** Top bar. The lockup sits in a glass pill, echoing the site's floating nav. */
function topBar() {
  return `<header style="display:flex;align-items:center;justify-content:space-between">
    <div style="display:flex;align-items:center;gap:16px;padding:16px 28px 16px 22px;${glass(99)}">
      ${markSvg(40)}
      <div style="display:flex;align-items:center;gap:9px">
        <span style="font-size:33px;letter-spacing:-0.022em;line-height:1">
          <span style="font-weight:400;color:${C.text}">Yusuf</span><span style="font-weight:600;color:${C.accent}">Creates</span>
        </span>
        ${verifiedBadge(26)}
      </div>
    </div>
    <div style="display:flex;align-items:center;justify-content:center;width:74px;height:74px;${glass(24)}">
      ${carouselGlyph()}
    </div>
  </header>`;
}

function footer(index, total, handle) {
  return `<footer style="display:flex;align-items:center;justify-content:space-between">
    ${dots(index, total)}
    <span style="font-size:27px;color:${C.secondary};letter-spacing:-0.01em">${handle}</span>
  </footer>`;
}

/** Glass CTA chip. */
function pill(label) {
  return `<div style="display:inline-flex;align-items:center;gap:13px;padding:20px 34px;
      ${glass(99)}font-size:28px;font-weight:500;color:${C.text}">
    <span>${label}</span><span style="opacity:0.8">&rarr;</span>
  </div>`;
}

/**
 * Renders one slide.
 *
 * Headline entries are one-per-line so a coloured clause never straddles a
 * line break; each may carry its own tone.
 */
function slide(s, index, total, handle) {
  const eyebrowColor = s.eyebrowColor || C.accent;

  const lines = s.headline.map((p) => (Array.isArray(p) ? p[0] : p));
  const longest = Math.max(...lines.map((l) => l.length));
  let size = longest > 24 ? 84 : longest > 19 ? 96 : longest > 15 ? 108 : 118;
  if (lines.length >= 4) size = Math.min(size, 82);
  else if (lines.length === 3) size = Math.min(size, 96);

  const headline = s.headline
    .map((part) => {
      const [text, tone] = Array.isArray(part) ? part : [part, "primary"];
      const color =
        tone === "primary" ? C.text
        : tone === "muted" ? "#7e838c"
        : tone === "accent" ? C.accent
        : tone === "danger" ? C.danger
        : tone === "green" ? C.green
        : tone;
      // A soft glow under accented clauses lifts them off the canvas the way
      // the site's --accent-glow does, without turning into a neon effect.
      const glow =
        tone === "accent"
          ? `text-shadow:0 0 60px ${C.accentGlow};`
          : tone === "danger"
            ? "text-shadow:0 0 60px rgba(229,72,77,0.3);"
            : "";
      return `<span style="display:block;color:${color};${glow}">${text}</span>`;
    })
    .join("");

  // Eyebrow sits in its own small glass tab with a status dot.
  const eyebrow = s.eyebrow
    ? `<div style="display:inline-flex;align-items:center;gap:13px;align-self:flex-start;
          padding:13px 24px;margin-bottom:38px;${glass(99)}">
        <span style="width:11px;height:11px;border-radius:99px;background:${eyebrowColor};
          box-shadow:0 0 14px ${eyebrowColor}"></span>
        <span style="font-size:23px;font-weight:600;letter-spacing:0.13em;
          text-transform:uppercase;color:${C.text}">${s.eyebrow}</span>
      </div>`
    : "";

  const body = s.body
    ? `<p style="margin:40px 0 0;font-size:33px;line-height:1.5;color:${C.secondary};
        max-width:840px;letter-spacing:-0.005em">${s.body}</p>`
    : "";

  const cta = s.cta ? `<div style="margin-top:50px">${pill(s.cta)}</div>` : "";

  // Stats sit in individual glass tiles rather than as bare numbers.
  const stats = s.stats
    ? `<div style="display:flex;gap:20px;margin-top:56px">${s.stats
        .map(
          (st) => `<div style="flex:1;padding:34px 30px;${glass(24)}">
            <div style="font-size:66px;font-weight:600;color:${C.text};letter-spacing:-0.03em;line-height:1">${st.value}</div>
            <div style="font-size:23px;color:${C.secondary};margin-top:14px;line-height:1.3">${st.label}</div>
          </div>`
        )
        .join("")}</div>`
    : "";

  // Optional list rows — a glass panel per item, used by the checklist slides.
  const rows = s.rows
    ? `<div style="display:flex;flex-direction:column;gap:18px;margin-top:50px">${s.rows
        .map(
          (r) => `<div style="display:flex;align-items:center;gap:24px;padding:28px 32px;${glass(22)}">
            <span style="font-size:27px;font-weight:600;color:${C.accent};min-width:44px">${r.k}</span>
            <span style="font-size:30px;color:${C.text};letter-spacing:-0.01em">${r.v}</span>
          </div>`
        )
        .join("")}</div>`
    : "";

  return `<section class="slide">
    <!-- Colour field. The glass has to have something to refract, so the
         background carries real luminance variation rather than flat black. -->
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
      ${cta}
    </main>

    ${footer(index, total, handle)}
  </section>`;
}

/** Page-level CSS: layout pinning, the colour field, and grain. */
const PAGE_CSS = `
  ${FONT_FACE}
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;background:#000}
  body{font-family:${FONT};-webkit-font-smoothing:antialiased}

  section.slide{
    position:relative;width:1080px;height:1920px;
    background:${C.canvas};
    display:flex;flex-direction:column;
    padding:84px 76px 78px;
    margin:0 auto;
    overflow:hidden;
    isolation:isolate;
  }
  section.slide main{
    flex:1 1 auto;min-height:0;
    display:flex;flex-direction:column;justify-content:center;
    position:relative;z-index:1;
  }
  section.slide header,section.slide footer{position:relative;z-index:1}
  h1,p{margin:0}

  /* The colour field sits behind everything and is what the glass samples. */
  .bg{position:absolute;inset:0;z-index:0;overflow:hidden}
  .orb{position:absolute;border-radius:50%;filter:blur(90px)}
  .orb-a{
    top:-340px;right:-260px;width:1120px;height:1120px;
    background:radial-gradient(circle at 35% 35%,
      rgba(94,106,210,0.50) 0%,
      rgba(94,106,210,0.20) 38%,
      transparent 70%);
  }
  .orb-b{
    bottom:-420px;left:-320px;width:1180px;height:1180px;
    background:radial-gradient(circle at 60% 40%,
      rgba(124,92,220,0.34) 0%,
      rgba(60,80,190,0.14) 42%,
      transparent 72%);
  }
  /* A cool highlight keeps the mid-slide from going dead behind the headline. */
  .orb-c{
    top:640px;left:44%;width:820px;height:820px;
    background:radial-gradient(circle at center,
      rgba(255,255,255,0.075) 0%,
      rgba(255,255,255,0.022) 40%,
      transparent 68%);
  }
  /* Fine grain stops the large blurred gradients from banding on export. */
  .grain{
    position:absolute;inset:0;opacity:0.055;mix-blend-mode:overlay;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E");
  }
`;

function page(slides, handle) {
  const body = slides
    .map((s, i) => slide(s, i, slides.length, handle))
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8">
    <style>${PAGE_CSS}</style>
  </head><body>${refractionFilter()}${body}</body></html>`;
}

module.exports = { page, slide, C };
