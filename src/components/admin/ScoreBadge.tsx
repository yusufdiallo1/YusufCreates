/**
 * How ready a lead is, in plain English.
 *
 * This used to render the raw model output — "hot 68", "warm 32", "cold 11".
 * Nobody except the person who wrote scoreLead() knows what 68 means, whether
 * it is out of 100, or what separates it from 59. A number with no scale is
 * not information, it is a demand that you go and learn the scale.
 *
 * So the badge says what to DO about it. The score still exists in the data
 * and still sorts the table — it is a good sort key and a bad label.
 *
 * The band word is always spelled out and never conveyed by colour alone, so
 * this survives greyscale printing and colour vision deficiency.
 *
 * Thresholds match scoreLead() in src/lib/leadScoring.ts. They are duplicated
 * rather than imported because that module also pulls in scoring weights the
 * client has no reason to ship.
 */

export type Band = "hot" | "warm" | "cold";

export function bandFor(score: number): Band {
  return score >= 60 ? "hot" : score >= 32 ? "warm" : "cold";
}

/**
 * The label, and the reason behind it.
 *
 * `label` is what appears in the badge and in the filter. `why` is the tooltip
 * — it explains the judgement rather than restating it, which is the part a
 * number was pretending to do.
 *
 * The CSS class names stay hot/warm/cold: a dozen other files reuse
 * .badge-hot / .badge-warm / .badge-cold as generic status colours, and
 * renaming them here would be a rename of the whole status palette.
 */
export const BANDS: Record<Band, { label: string; why: string }> = {
  hot: {
    label: "Ready to buy",
    why: "Clear budget and a real deadline. Reply today.",
  },
  warm: {
    label: "Worth a call",
    why: "A real project, but the details are still loose.",
  },
  cold: {
    label: "Just looking",
    why: "No timeline or budget yet. No rush.",
  },
};

export function ScoreBadge({ score }: { score: number }) {
  const band = bandFor(score);
  const { label, why } = BANDS[band];
  return (
    <span className={`badge badge-${band}`} title={why}>
      {label}
    </span>
  );
}
