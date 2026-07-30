/**
 * Brand marks for the tech stack.
 *
 * Deliberately INCOMPLETE, and that is the point.
 *
 * Only marks that can be reproduced exactly are here — simple geometric forms
 * with published, unambiguous geometry. Anything whose logo would have to be
 * drawn from memory is absent, because an approximately-right brand mark is
 * worse than none: it is someone else's trademark rendered wrong, on a page
 * whose whole argument is that details are handled properly.
 *
 * Skills with no mark render their name alone, which the layout already
 * handles. To add one later, drop the official SVG path in and add the key.
 *
 * Every mark inherits `currentColor` rather than carrying brand colour. A row
 * of twenty logos in twenty palettes is a ransom note, and these sit beside
 * body text where a single ink keeps the rhythm.
 */

type LogoProps = {
  size?: number;
  className?: string;
};

function base(size: number) {
  return {
    width: size,
    height: size,
    fill: "currentColor",
    "aria-hidden": true as const,
    focusable: "false" as const,
  };
}

/** The triangle. */
function VercelLogo({ size = 16, className }: LogoProps) {
  return (
    <svg {...base(size)} viewBox="0 0 1155 1000" className={className}>
      <path d="m577.3 0 577.4 1000H0z" />
    </svg>
  );
}

/** Wordmark reduced to the N in a circle. */
function NextLogo({ size = 16, className }: LogoProps) {
  return (
    <svg {...base(size)} viewBox="0 0 24 24" className={className}>
      <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12c2.4 0 4.63-.7 6.5-1.92L7.4 7.72V17.1H5.6V6h2.24l11.1 14.28A11.96 11.96 0 0 0 24 12c0-6.63-5.37-12-12-12Zm5.55 6h1.78v9.05l-1.78-2.3V6Z" />
    </svg>
  );
}

/** Octocat silhouette. Same path as the footer's GithubIcon. */
function GithubLogo({ size = 16, className }: LogoProps) {
  return (
    <svg {...base(size)} viewBox="0 0 24 24" className={className}>
      <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.05 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.3 9.3 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.92-2.34 4.79-4.57 5.04.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.49A10.06 10.06 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

/** Nucleus and three orbits. */
function ReactLogo({ size = 16, className }: LogoProps) {
  return (
    <svg
      {...base(size)}
      viewBox="-11.5 -10.23 23 20.46"
      className={className}
      fill="none"
    >
      <circle r="2.05" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1" fill="none">
        <ellipse rx="11" ry="4.2" />
        <ellipse rx="11" ry="4.2" transform="rotate(60)" />
        <ellipse rx="11" ry="4.2" transform="rotate(120)" />
      </g>
    </svg>
  );
}

/** Two stacked waves. */
function TailwindLogo({ size = 16, className }: LogoProps) {
  return (
    <svg {...base(size)} viewBox="0 0 48 48" className={className}>
      <path d="M24 9.6c-6.4 0-10.4 3.2-12 9.6 2.4-3.2 5.2-4.4 8.4-3.6 1.83.46 3.13 1.79 4.58 3.25C27.35 21.24 30.09 24 36 24c6.4 0 10.4-3.2 12-9.6-2.4 3.2-5.2 4.4-8.4 3.6-1.83-.46-3.13-1.79-4.58-3.25C32.65 12.36 29.91 9.6 24 9.6ZM12 24C5.6 24 1.6 27.2 0 33.6c2.4-3.2 5.2-4.4 8.4-3.6 1.83.46 3.13 1.79 4.58 3.25C15.35 35.64 18.09 38.4 24 38.4c6.4 0 10.4-3.2 12-9.6-2.4 3.2-5.2 4.4-8.4 3.6-1.83-.46-3.13-1.79-4.58-3.25C20.65 26.76 17.91 24 12 24Z" />
    </svg>
  );
}

/** Square with TS. */
function TypeScriptLogo({ size = 16, className }: LogoProps) {
  return (
    <svg {...base(size)} viewBox="0 0 24 24" className={className}>
      <path d="M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0Zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 0 1 1.306.34v2.458a3.95 3.95 0 0 0-.643-.361 5.093 5.093 0 0 0-.717-.26 5.453 5.453 0 0 0-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 0 0-.623.242c-.17.104-.3.229-.393.374a.888.888 0 0 0-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444.191.14.423.276.696.409.273.132.582.269.926.41.472.197.897.407 1.273.628.376.222.7.473.97.756.27.282.478.606.622.972.145.365.217.79.217 1.274 0 .668-.127 1.229-.38 1.684a3.01 3.01 0 0 1-1.028 1.09 4.4 4.4 0 0 1-1.51.588c-.575.11-1.183.166-1.824.166a10.02 10.02 0 0 1-1.876-.174 5.616 5.616 0 0 1-1.542-.521v-2.626c.482.415 1.006.727 1.57.936.564.209 1.133.313 1.706.313.315 0 .589-.028.822-.086a1.89 1.89 0 0 0 .594-.24 1.09 1.09 0 0 0 .361-.363.9.9 0 0 0 .12-.457.968.968 0 0 0-.19-.59 2.078 2.078 0 0 0-.526-.49 5.522 5.522 0 0 0-.786-.443 22.4 22.4 0 0 0-1.006-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.624.125-1.16.376-1.607.25-.446.59-.812 1.019-1.098a4.58 4.58 0 0 1 1.494-.629 7.83 7.83 0 0 1 1.8-.201Zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375Z" />
    </svg>
  );
}

/*
 * Swift and Netlify were drawn here and then removed.
 *
 * Both looked plausible in code and wrong on screen — the Swift mark rendered
 * as an unreadable blob rather than the bird, and Netlify came out as a plus
 * sign rather than its rounded N. Neither survived being looked at, which is
 * the only test that counts for a logo. They are absent rather than
 * approximate.
 */

/**
 * The lookup. A skill absent from here renders without a mark, which is the
 * intended outcome rather than a gap to fill with a guess.
 */
const LOGOS: Record<
  string,
  (props: LogoProps) => React.ReactElement
> = {
  "Next.js": NextLogo,
  TypeScript: TypeScriptLogo,
  "Tailwind CSS": TailwindLogo,
  React: ReactLogo,
  Vercel: VercelLogo,
  GitHub: GithubLogo,
};

export function hasTechLogo(name: string): boolean {
  return name in LOGOS;
}

export function TechLogo({
  name,
  size = 16,
  className,
}: {
  name: string;
} & LogoProps) {
  const Mark = LOGOS[name];
  if (!Mark) return null;
  return <Mark size={size} className={className} />;
}
