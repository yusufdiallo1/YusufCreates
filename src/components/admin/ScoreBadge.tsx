/**
 * Lead temperature.
 *
 * The band name is always spelled out, never conveyed by colour alone —
 * this has to survive greyscale printing and colour vision deficiency, and
 * "hot" is more precise than a shade of orange anyway.
 *
 * Thresholds match scoreLead() in src/lib/leadScoring.ts. They are duplicated
 * rather than imported because that module also pulls in scoring weights the
 * client has no reason to ship.
 */
export function bandFor(score: number): "hot" | "warm" | "cold" {
  return score >= 60 ? "hot" : score >= 32 ? "warm" : "cold";
}

export function ScoreBadge({ score }: { score: number }) {
  const band = bandFor(score);
  return (
    <span className={`badge badge-${band}`} title={`Score ${score} of 100`}>
      {band}
      {/* Was opacity-70, which dims the figure below AA inside an already
          tinted badge. The band word carries the emphasis; the number does
          not need to be quieter to be secondary. */}
      <span className="tabular-nums">{score}</span>
    </span>
  );
}
