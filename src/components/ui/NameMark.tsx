"use client";

/**
 * NameMark — "YUSUF DIALLO" with the Y drawn as the logo mark.
 *
 * Only the Y is a mark: chevron, arm folding into the stem, and the accent
 * cursor block, with the deliberate one-stroke gap intact. Every other letter,
 * including the D, is ordinary type at the same weight and tracking.
 *
 * The whole thing carries a single accessible name; the pieces are hidden from
 * assistive tech.
 */

const STROKE = 15;

/** Logo mark geometry, unchanged from Logo.tsx. */
const CHEVRON = "M61 48 L92 79 L61 110";
const ARM = "M159 48 L115 92 L115 137";

interface NameMarkProps {
  className?: string;
  /** Colour of the letterforms. Defaults to the primary text colour. */
  color?: string;
  /** Colour of the Y's cursor block. */
  accent?: string;
}

export function NameMark({
  className,
  color = "var(--text-primary, #f7f8f8)",
  accent = "var(--accent, #5e6ad2)",
}: NameMarkProps) {
  const stroke = {
    fill: "none",
    stroke: color,
    strokeWidth: STROKE,
    strokeLinecap: "square" as const,
    strokeLinejoin: "miter" as const,
  };

  return (
    <span
      className={className}
      role="img"
      aria-label="Yusuf Diallo"
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: "0.06em",
        whiteSpace: "nowrap",
      }}
    >
      {/* Y — the logo mark. */}
      <svg
        viewBox="40 30 140 155"
        aria-hidden="true"
        style={{ height: "0.78em", width: "auto", overflow: "visible" }}
      >
        <path d={CHEVRON} {...stroke} />
        <path d={ARM} {...stroke} />
        <rect x={99} y={155} width={34} height={17} fill={accent} />
      </svg>

      <span aria-hidden="true">USUF DIALLO</span>
    </span>
  );
}
