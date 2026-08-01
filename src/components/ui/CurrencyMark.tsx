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
  /**
   * Height as a multiple of the current font size. Defaults to cap height,
   * which is where a real currency glyph sits — a symbol drawn to the full
   * em box stands taller than the digits beside it and reads as oversized.
   */
  size?: number;
  className?: string;
};

/**
 * Sized in em, not pixels.
 *
 * A fixed pixel size is wrong everywhere except the one place it was picked
 * for: the same mark appears beside a 48px headline price and 12px body
 * copy, and at 16px it swamps the second and is lost against the first.
 * In em it tracks whatever text it sits in, for free.
 */
function base(size: number) {
  return {
    width: `${size}em`,
    height: `${size}em`,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    /*
     * Scaled with the mark so the weight matches the surrounding digits.
     * A constant stroke on a smaller glyph reads as bolder than the text
     * it belongs to.
     */
    strokeWidth: 2.2,
    strokeLinecap: "square" as const,
    "aria-hidden": true as const,
    focusable: "false" as const,
    // Sits on the text baseline rather than the line box, so it lines up
    // with the digits instead of floating above them.
    style: { verticalAlign: "-0.08em" },
  };
}

/** Cap height, near enough — the default for both marks. */
const CAP = 0.72;

/**
 * UAE dirham. A capital D with two horizontal strokes through the bowl,
 * echoing the two bars of the official mark.
 */
export function DirhamMark({ size = CAP, className }: MarkProps) {
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
export function RiyalMark({ size = CAP, className }: MarkProps) {
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
  size = CAP,
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
