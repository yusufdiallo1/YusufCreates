/**
 * Currency symbols drawn as SVG.
 *
 * The Gulf currencies got official symbols recently — the UAE dirham in 2024
 * (U+1EC00) and the Saudi riyal in 2025 (U+20C0) — and almost no installed
 * font has them yet. Using the codepoints renders a tofu box on most devices,
 * which is worse than the "AED" text prefix it would replace.
 *
 * Drawn instead, so they render identically everywhere and inherit
 * currentColor like every other mark on the site. USD, GBP and EUR keep their
 * text glyphs: those are in every font ever shipped.
 */

type MarkProps = {
  size?: number;
  className?: string;
};

function base(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "square" as const,
    "aria-hidden": true as const,
    focusable: "false" as const,
  };
}

/**
 * UAE dirham. A capital D with two horizontal strokes through the bowl,
 * echoing the two bars of the official mark.
 */
export function DirhamMark({ size = 16, className }: MarkProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M7 4h5a7 7 0 0 1 0 14H7V4" />
      <path d="M3 9.5h15" />
      <path d="M3 14h15" />
    </svg>
  );
}

/**
 * Saudi riyal. Two uprights joined by a horizontal, with two strokes running
 * beneath — the shape of the 2025 mark reduced to a 24 grid.
 */
export function RiyalMark({ size = 16, className }: MarkProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M8 3v11a4 4 0 0 1-4 4" />
      <path d="M15 4v10" />
      <path d="M4 11.5 19 8" />
      <path d="M9 17.5 20 15" />
      <path d="M13 21.5 20 20" />
    </svg>
  );
}

/**
 * The right mark for a currency, or null when the plain glyph is fine.
 *
 * Returning null rather than a text span keeps the decision in one place:
 * a caller renders the mark when there is one and falls back to
 * CURRENCY_SYMBOL when there is not.
 */
export function CurrencyMark({
  code,
  size = 16,
  className,
}: { code: string } & MarkProps) {
  if (code === "AED") return <DirhamMark size={size} className={className} />;
  if (code === "SAR") return <RiyalMark size={size} className={className} />;
  return null;
}

/** Whether a currency uses a drawn mark rather than a text glyph. */
export function hasCurrencyMark(code: string): boolean {
  return code === "AED" || code === "SAR";
}
