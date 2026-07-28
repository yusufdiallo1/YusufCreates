"use client";

/**
 * NameMark — "YUSUF DIALLO" set with the Y and D drawn as marks rather than
 * typed as glyphs.
 *
 * The Y is the logo mark itself: chevron, arm folding into the stem, and the
 * accent cursor block, with the deliberate one-stroke gap intact. The D is
 * drawn in the same language — square caps, mitred joins, right angles and a
 * 45 degree chamfer instead of a bowl — so the pair reads as a set rather than
 * one custom letter dropped into a word.
 *
 * The remaining letters are ordinary type at the same weight and tracking.
 * The whole thing carries a single accessible name; the individual pieces are
 * hidden from assistive tech.
 */

const STROKE = 15;

/** Logo mark geometry, unchanged from Logo.tsx. */
const CHEVRON = "M61 48 L92 79 L61 110";
const ARM = "M159 48 L115 92 L115 137";

/**
 * D built from the same vocabulary: a stem, square top and bottom arms, and a
 * 45 degree chamfer closing the right side — echoing the Y's diagonals.
 */
const D_STEM = "M64 40 L64 172";
const D_TOP = "M64 40 L128 40 L160 72";
const D_BOTTOM = "M64 172 L128 172 L160 140";
const D_SPINE = "M160 72 L160 140";

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

      <span aria-hidden="true">USUF</span>

      <span aria-hidden="true" style={{ width: "0.32em" }} />

      {/* D — same stroke language as the mark. */}
      <svg
        viewBox="40 30 140 155"
        aria-hidden="true"
        style={{ height: "0.78em", width: "auto", overflow: "visible" }}
      >
        <path d={D_STEM} {...stroke} />
        <path d={D_TOP} {...stroke} />
        <path d={D_SPINE} {...stroke} />
        <path d={D_BOTTOM} {...stroke} />
      </svg>

      <span aria-hidden="true">IALLO</span>
    </span>
  );
}
