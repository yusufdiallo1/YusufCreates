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

/** Syntax palette for the code windows. Tuned to sit beside --accent. */
const S = {
  comment: "#7d8590",
  key: "#c678dd",
  str: "#98c379",
  num: "#d19a66",
  fn: "#61afef",
  punct: "#7f848e",
};

const GLASS_SHADOW = `0 24px 60px rgba(0,0,0,0.45),
  inset 0 1px 1px rgba(255,255,255,0.5),
  inset 0 -8px 20px rgba(255,255,255,0.06),
  inset 0 0 0 1px rgba(255,255,255,0.13)`;

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
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

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
  return `<svg viewBox="0 0 32 30" style="height:26px;width:auto" aria-hidden="true">
    <rect x="9.5" y="1.5" width="21" height="21" rx="5" fill="none" stroke="${C.text}" stroke-width="2.2" opacity="0.45"/>
    <rect x="1.5" y="7.5" width="21" height="21" rx="5" fill="${C.text}"/>
  </svg>`;
}

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

function glass(radius = 24, hi = false) {
  return `background-color:${C.glassBg};
    -webkit-backdrop-filter:url(#lgRefract);
    backdrop-filter:url(#lgRefract);
    box-shadow:${hi ? GLASS_SHADOW_HI : GLASS_SHADOW};
    border-radius:${radius}px;`;
}

/** Solid panel. Code and terminals need opaque ground, not refraction —
 *  monospace over a blurred gradient is where legibility goes to die. */
function panel(radius = 20) {
  return `background:linear-gradient(180deg, #262a33 0%, #1b1e25 100%);
    border:1px solid rgba(255,255,255,0.20);
    border-radius:${radius}px;
    box-shadow:0 30px 70px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.14);`;
}

function tone(t) {
  return t === "primary" ? C.text
    : t === "muted" ? "#7e838c"
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
          ${it.on ? `background:rgba(94,106,210,0.10);border-left:3px solid ${C.accent};padding-left:${pad - 3}px;` : ""}">
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
      ? isBad ? "rgba(94,106,210,0.20)" : "rgba(255,255,255,0.07)"
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
              ? `<div style="flex:1;width:2px;background:linear-gradient(180deg,${C.accent},rgba(94,106,210,0.12))"></div>`
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
          border-radius:99px;flex:none;background:rgba(94,106,210,0.16);
          box-shadow:inset 0 0 0 1px rgba(94,106,210,0.4)">
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
  const eyebrowColor = s.eyebrowColor || C.accent;
  const hasGraphic = !!(
    s.code || s.terminal || s.tree || s.compare || s.steps ||
    s.figure || s.bars || s.checks || s.rows || s.tiers || s.stats
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
    (s.checks ? checks(s.checks) : "");

  const cta = s.cta
    ? `<div style="margin-top:${hasGraphic ? 22 : 34}px">${pill(s.cta, s.ctaHi)}</div>`
    : "";

  return `<section class="slide">
    <div class="bg" aria-hidden="true">
      <div class="orb orb-a"></div>
      <div class="orb orb-b"></div>
      <div class="grain"></div>
    </div>

    ${topBar()}

    <main>
      ${eyebrow}
      <h1 style="margin:0;font-size:${size}px;font-weight:700;line-height:1.06;
          letter-spacing:-0.032em;max-width:${hasGraphic ? 880 : 900}px">${headline}</h1>
      ${body}
      ${graphic}
      ${cta}
    </main>

    ${footer(index, total, handle)}
  </section>`;
}

const PAGE_CSS = `
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

function page(slides, handle) {
  const body = slides.map((s, i) => slide(s, i, slides.length, handle)).join("");
  return `<!doctype html><html><head><meta charset="utf-8">
    <style>${PAGE_CSS}</style>
  </head><body>${refractionFilter()}${body}</body></html>`;
}

module.exports = { page, slide, C };
