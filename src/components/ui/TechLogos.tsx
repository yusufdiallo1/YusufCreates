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
 * Skills with no mark, and why.
 *
 * "Responsive design" is a practice, not a product — a logo would be an
 * invention. Groq is absent from simple-icons at this version.
 */
function lookup(name: string): IconRecord | null {
  const title = TITLE_FOR[name] ?? name;
  return byTitle.get(title.toLowerCase()) ?? null;
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
