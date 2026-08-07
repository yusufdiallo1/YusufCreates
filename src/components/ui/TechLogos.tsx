import {
  siAnimedotjs,
  siClaude,
  siConvex,
  siCss,
  siCursor,
  siFramer,
  siGithub,
  siGoogle,
  siGooglecloud,
  siHtml5,
  siJavascript,
  siNetlify,
  siNextdotjs,
  siReact,
  siResend,
  siStripe,
  siSupabase,
  siSwift,
  siTailwindcss,
  siTypescript,
  siVercel,
  siVite,
} from "simple-icons";

/**
 * Brand marks for the tech stack, from simple-icons.
 *
 * These were hand-drawn from memory before, which produced two that were
 * visibly wrong — Swift rendered as a blob, Netlify as a plus sign — and
 * fourteen skills with no mark at all because I would not guess at them.
 * simple-icons ships the official geometry under CC0, so every mark here is
 * the real one and the coverage problem disappears.
 *
 * IMPORTED BY NAME, ONE PER BRAND. This file used to do:
 *
 *     import * as simpleIcons from "simple-icons";
 *     const ALL = Object.values(simpleIcons).filter(...)
 *
 * which reads every export at module scope and so cannot be tree-shaken — the
 * bundler has no way to prove which of the 3,450 brands are reachable. The
 * result was a 5.0 MB client chunk on the homepage to draw twenty-two 24px
 * glyphs, which was 58% of all the JavaScript on the site.
 *
 * The old approach looked up by `title` rather than by these camelCase export
 * names, on the reasoning that the names are unstable across versions and a
 * rename would silently drop a logo. That trade is the wrong way round: a
 * named import that no longer resolves is a BUILD ERROR, which is strictly
 * better than a mark quietly vanishing from a live page. The version is
 * pinned in package.json, so the upgrade is where you find out.
 *
 * At rest every mark inherits currentColor. Twenty logos in twenty palettes
 * is a ransom note, and these sit beside body text where one ink keeps the
 * rhythm. Brand colour arrives on hover — and on tap, since a phone has no
 * hover — so the colour is a reward for pointing at something rather than the
 * default state of the page.
 */

type IconRecord = { title: string; path: string; hex?: string };

/**
 * Skill name → mark. Keyed by the name as it appears in src/lib/skills.ts, so
 * there is no separate title-translation step to keep in sync.
 *
 * "Responsive design" is deliberately absent — it is a practice rather than a
 * product, so a logo would be an invention.
 */
const BY_SKILL: Record<string, IconRecord> = {
  HTML: siHtml5,
  CSS: siCss,
  JavaScript: siJavascript,
  "Next.js": siNextdotjs,
  TypeScript: siTypescript,
  "Tailwind CSS": siTailwindcss,
  React: siReact,
  // Framer Motion is filed under Framer.
  "Framer Motion": siFramer,
  Vite: siVite,
  "Anime.js": siAnimedotjs,
  Convex: siConvex,
  Supabase: siSupabase,
  Stripe: siStripe,
  Resend: siResend,
  "Google Cloud": siGooglecloud,
  "Claude Code": siClaude,
  Cursor: siCursor,
  Swift: siSwift,
  Vercel: siVercel,
  Netlify: siNetlify,
  GitHub: siGithub,
  // Not a product, so it borrows Google's mark.
  "Google SEO": siGoogle,
};

/**
 * Perceived brightness of a brand hex, 0–1.
 *
 * Six of these brands are officially black — Vercel, Next.js, GitHub, Cursor,
 * Resend and Anime.js. On a near-black canvas their "brand colour" is
 * invisible, so hovering would make the mark vanish rather than light up.
 * Those fall back to full white, which is what each of them uses on a dark
 * background in its own material anyway.
 */
function luminance(hex: string): number {
  const n = parseInt(hex, 16);
  if (Number.isNaN(n)) return 1;
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** The colour a mark should take on hover, or null to leave it alone. */
function brandColor(icon: IconRecord): string | null {
  if (!icon.hex) return null;
  return luminance(icon.hex) < 0.06 ? "#ffffff" : `#${icon.hex}`;
}

/**
 * Marks that simple-icons does not carry.
 *
 * Groq is taken from @lobehub/icons, which covers AI brands specifically. The
 * path is inlined rather than imported: that package ships React components
 * per brand behind a directory-import entry point, so pulling one in drags a
 * component tree into the bundle to draw a single 24-grid path. Same viewBox
 * as everything else, so it needs no special handling.
 */
const EXTRA: Record<string, IconRecord> = {
  // Keyed by skill name, same as BY_SKILL, so lookup is one shape.
  /*
   * Conductor is in neither simple-icons nor @lobehub/icons, so the path was
   * traced from the official mark rather than drawn from memory — the blocks
   * were detected programmatically from the source image and mapped onto the
   * same 24 grid as everything else. Drawing it by eye is what produced a
   * Swift blob and a Netlify plus sign the first time this file existed.
   *
   * No hex: the brand mark is white on a dark badge, and on this canvas that
   * means currentColor is already right. brandColor() falls back to the ink
   * colour when hex is absent, which is exactly the wanted behaviour.
   */
  Conductor: {
    title: "Conductor",
    path: "M8.38 1.0h9.58a0.97 0.97 0 0 1 0.97 0.97v1.51a0.97 0.97 0 0 1 -0.97 0.97h-9.58a0.97 0.97 0 0 1 -0.97 -0.97v-1.51a0.97 0.97 0 0 1 0.97 -0.97zM6.02 5.69h2.72a0.95 0.95 0 0 1 0.95 0.95v1.48a0.95 0.95 0 0 1 -0.95 0.95h-2.72a0.95 0.95 0 0 1 -0.95 -0.95v-1.48a0.95 0.95 0 0 1 0.95 -0.95zM15.33 5.69h2.65a0.95 0.95 0 0 1 0.95 0.95v1.48a0.95 0.95 0 0 1 -0.95 0.95h-2.65a0.95 0.95 0 0 1 -0.95 -0.95v-1.48a0.95 0.95 0 0 1 0.95 -0.95zM6.02 10.31h2.72a0.95 0.95 0 0 1 0.95 0.95v1.48a0.95 0.95 0 0 1 -0.95 0.95h-2.72a0.95 0.95 0 0 1 -0.95 -0.95v-1.48a0.95 0.95 0 0 1 0.95 -0.95zM6.04 14.93h2.68a0.97 0.97 0 0 1 0.97 0.97v1.51a0.97 0.97 0 0 1 -0.97 0.97h-2.68a0.97 0.97 0 0 1 -0.97 -0.97v-1.51a0.97 0.97 0 0 1 0.97 -0.97zM15.35 14.93h2.61a0.97 0.97 0 0 1 0.97 0.97v1.51a0.97 0.97 0 0 1 -0.97 0.97h-2.61a0.97 0.97 0 0 1 -0.97 -0.97v-1.51a0.97 0.97 0 0 1 0.97 -0.97zM8.36 19.62h7.34a0.95 0.95 0 0 1 0.95 0.95v1.48a0.95 0.95 0 0 1 -0.95 0.95h-7.34a0.95 0.95 0 0 1 -0.95 -0.95v-1.48a0.95 0.95 0 0 1 0.95 -0.95z",
  },
  Groq: {
    title: "Groq",
    path: "M12.036 2c-3.853-.035-7 3-7.036 6.781-.035 3.782 3.055 6.872 6.908 6.907h2.42v-2.566h-2.292c-2.407.028-4.38-1.866-4.408-4.23-.029-2.362 1.901-4.298 4.308-4.326h.1c2.407 0 4.358 1.915 4.365 4.278v6.305c0 2.342-1.944 4.25-4.323 4.279a4.375 4.375 0 01-3.033-1.252l-1.851 1.818A7 7 0 0012.029 22h.092c3.803-.056 6.858-3.083 6.879-6.816v-6.5C18.907 4.963 15.817 2 12.036 2z",
  },
};

/**
 * One skill still has no mark, and that is correct.
 *
 * "Responsive design" is a practice rather than a product, so a logo would be
 * an invention. Conductor has one — traced from the official mark, see EXTRA
 * above.
 */
function lookup(name: string): IconRecord | null {
  return BY_SKILL[name] ?? EXTRA[name] ?? null;
}

export function hasTechLogo(name: string): boolean {
  return lookup(name) !== null;
}

export function TechLogo({
  name,
  size = 16,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const icon = lookup(name);
  if (!icon) return null;

  const colour = brandColor(icon);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      /*
       * The colour is carried as a custom property rather than applied here.
       * A hover rule in CSS can then read it, which keeps one selector in
       * globals.css responsible for the behaviour instead of every caller
       * repeating a hover class — and lets the same rule answer both hover
       * and the tap state a phone uses instead.
       */
      style={colour ? ({ "--brand": colour } as React.CSSProperties) : undefined}
      className={`tech-logo ${className ?? ""}`}
    >
      <path d={icon.path} />
    </svg>
  );
}
