import * as simpleIcons from "simple-icons";

/**
 * Brand marks for the tech stack, from simple-icons.
 *
 * These were hand-drawn from memory before, which produced two that were
 * visibly wrong — Swift rendered as a blob, Netlify as a plus sign — and
 * fourteen skills with no mark at all because I would not guess at them.
 * simple-icons ships the official geometry for 3,450 brands under CC0, so
 * every mark here is the real one and the coverage problem disappears.
 *
 * Paths are read at module scope by title, not by the library's camelCase
 * export names. Those names are unstable across versions ("siNextdotjs"
 * today), and a rename would silently drop a logo rather than fail the build.
 * A title lookup that misses returns null and the skill renders as text,
 * which is the same graceful outcome as before.
 *
 * At rest every mark inherits currentColor. Twenty logos in twenty palettes
 * is a ransom note, and these sit beside body text where one ink keeps the
 * rhythm. Brand colour arrives on hover — and on tap, since a phone has no
 * hover — so the colour is a reward for pointing at something rather than the
 * default state of the page.
 */

type IconRecord = { title: string; path: string; hex?: string };

const ALL: IconRecord[] = Object.values(
  simpleIcons as unknown as Record<string, IconRecord>,
).filter(
  (icon): icon is IconRecord =>
    Boolean(icon) && typeof icon?.title === "string" && typeof icon?.path === "string",
);

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

const byTitle = new Map(ALL.map((icon) => [icon.title.toLowerCase(), icon]));

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
  conductor: {
    title: "Conductor",
    path: "M8.38 1.0h9.58a0.97 0.97 0 0 1 0.97 0.97v1.51a0.97 0.97 0 0 1 -0.97 0.97h-9.58a0.97 0.97 0 0 1 -0.97 -0.97v-1.51a0.97 0.97 0 0 1 0.97 -0.97zM6.02 5.69h2.72a0.95 0.95 0 0 1 0.95 0.95v1.48a0.95 0.95 0 0 1 -0.95 0.95h-2.72a0.95 0.95 0 0 1 -0.95 -0.95v-1.48a0.95 0.95 0 0 1 0.95 -0.95zM15.33 5.69h2.65a0.95 0.95 0 0 1 0.95 0.95v1.48a0.95 0.95 0 0 1 -0.95 0.95h-2.65a0.95 0.95 0 0 1 -0.95 -0.95v-1.48a0.95 0.95 0 0 1 0.95 -0.95zM6.02 10.31h2.72a0.95 0.95 0 0 1 0.95 0.95v1.48a0.95 0.95 0 0 1 -0.95 0.95h-2.72a0.95 0.95 0 0 1 -0.95 -0.95v-1.48a0.95 0.95 0 0 1 0.95 -0.95zM6.04 14.93h2.68a0.97 0.97 0 0 1 0.97 0.97v1.51a0.97 0.97 0 0 1 -0.97 0.97h-2.68a0.97 0.97 0 0 1 -0.97 -0.97v-1.51a0.97 0.97 0 0 1 0.97 -0.97zM15.35 14.93h2.61a0.97 0.97 0 0 1 0.97 0.97v1.51a0.97 0.97 0 0 1 -0.97 0.97h-2.61a0.97 0.97 0 0 1 -0.97 -0.97v-1.51a0.97 0.97 0 0 1 0.97 -0.97zM8.36 19.62h7.34a0.95 0.95 0 0 1 0.95 0.95v1.48a0.95 0.95 0 0 1 -0.95 0.95h-7.34a0.95 0.95 0 0 1 -0.95 -0.95v-1.48a0.95 0.95 0 0 1 0.95 -0.95z",
  },
  groq: {
    title: "Groq",
    path: "M12.036 2c-3.853-.035-7 3-7.036 6.781-.035 3.782 3.055 6.872 6.908 6.907h2.42v-2.566h-2.292c-2.407.028-4.38-1.866-4.408-4.23-.029-2.362 1.901-4.298 4.308-4.326h.1c2.407 0 4.358 1.915 4.365 4.278v6.305c0 2.342-1.944 4.25-4.323 4.279a4.375 4.375 0 01-3.033-1.252l-1.851 1.818A7 7 0 0012.029 22h.092c3.803-.056 6.858-3.083 6.879-6.816v-6.5C18.907 4.963 15.817 2 12.036 2z",
  },
};

/**
 * Skill name to the brand's registered title, where they differ.
 *
 * Only entries that genuinely need translating. "Framer Motion" is filed
 * under Framer; "Google SEO" is not a product, so it borrows Google's mark.
 */
const TITLE_FOR: Record<string, string> = {
  "Framer Motion": "Framer",
  "Google SEO": "Google",
  "Claude Code": "Claude",
  // The brand is registered as HTML5; the skill is listed as HTML, because
  // that is what it is called when you are writing it.
  HTML: "HTML5",
};

/**
 * One skill still has no mark, and that is correct.
 *
 * "Responsive design" is a practice rather than a product, so a logo would be
 * an invention. Conductor now has one — traced from the official mark, see
 * EXTRA above.
 */
function lookup(name: string): IconRecord | null {
  const title = (TITLE_FOR[name] ?? name).toLowerCase();
  return byTitle.get(title) ?? EXTRA[title] ?? null;
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
