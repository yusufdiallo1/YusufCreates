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
 * Every mark inherits currentColor rather than brand colour. Twenty logos in
 * twenty palettes is a ransom note, and these sit beside body text where one
 * ink keeps the rhythm.
 */

type IconRecord = { title: string; path: string };

const ALL: IconRecord[] = Object.values(
  simpleIcons as unknown as Record<string, IconRecord>,
).filter(
  (icon): icon is IconRecord =>
    Boolean(icon) && typeof icon?.title === "string" && typeof icon?.path === "string",
);

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
};

/**
 * Two skills still have no mark, and both are correct.
 *
 * "Responsive design" is a practice rather than a product, so a logo would be
 * an invention. Conductor is in neither simple-icons nor @lobehub/icons, and
 * drawing it from memory is exactly what produced a Swift blob and a Netlify
 * plus sign the first time round.
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

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d={icon.path} />
    </svg>
  );
}
