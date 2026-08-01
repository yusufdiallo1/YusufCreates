/**
 * Lead scoring. Pure functions so the same logic can run on the server and be
 * unit-reasoned about without a database.
 *
 * score = value weight x urgency weight x fit weight, normalised to 0-100.
 * Enterprise submissions are always hot regardless of the other inputs.
 *
 * The value weight comes from the PLAN, not from a self-reported budget band.
 * Every plan has a published price, so the plan someone picks is a decision
 * about money rather than an estimate of one — a better signal, and one that
 * cannot be answered "not sure yet".
 */

export type Band = "hot" | "warm" | "cold";

/**
 * Keyed by plan id, scaled to the published price of each.
 *
 * Support sits mid-table rather than low: a care plan is small monthly but
 * recurring, and scoring it by first-invoice size alone would rank the most
 * durable revenue on the site as the coldest lead.
 */
const VALUE_WEIGHT: Record<string, number> = {
  native: 1, // $3,200
  app: 0.95, // $2,500
  "web-app": 0.95,
  "multi-page": 0.7, // $750–950
  revive: 0.65, // scoped from the audit
  support: 0.6, // $180/mo, recurring
  "one-page": 0.45, // $400
};

const URGENCY_WEIGHT: Record<string, number> = {
  "As soon as possible": 1,
  "1–3 months": 0.8,
  "3–6 months": 0.5,
  "Just exploring": 0.25,
};

/**
 * Keyed by plan id (see src/lib/inquiry.ts) with the older free-text project
 * types kept alongside, so leads captured before the plan chooser existed
 * still score rather than silently falling to the default.
 */
const FIT_WEIGHT: Record<string, number> = {
  // Plan ids.
  "web-app": 1,
  "multi-page": 0.85,
  "one-page": 0.8,
  support: 0.7,
  // Legacy project-type strings.
  "Web app or SaaS": 1,
  "Multilingual build": 0.95,
  "Marketing site": 0.8,
  "Rescue an existing build": 0.75,
  "Ongoing support": 0.7,
  "Something else": 0.5,
};

export interface ScoreInput {
  timeline?: string;
  projectType?: string;
  tier?: string;
  company?: string;
  message?: string;
  /** Plan id — the value signal, since every plan has a published price. */
  plan?: string;
  projectPurpose?: string;
}

export function scoreLead(input: ScoreInput): { score: number; band: Band } {
  // Enterprise is hot by definition — the qualification happens in the call.
  // It has no published price to weight against, so scoring it through the
  // multiplication below would floor it at the default and rank the largest
  // enquiries lowest.
  if (
    input.plan === "enterprise" ||
    input.tier === "enterprise" ||
    input.projectType === "Enterprise project"
  ) {
    return { score: 100, band: "hot" };
  }

  // Falls back to projectType so leads captured before the plan chooser
  // existed still weight on something real rather than all landing on 0.6.
  const value =
    VALUE_WEIGHT[input.plan ?? ""] ?? VALUE_WEIGHT[input.projectType ?? ""] ?? 0.6;
  const urgency = URGENCY_WEIGHT[input.timeline ?? ""] ?? 0.5;
  const fit = FIT_WEIGHT[input.projectType ?? ""] ?? 0.6;

  let score = Math.round(value * urgency * fit * 100);

  // Small additive signals: a named company and a considered message both
  // correlate with someone who has actually thought about the work.
  if (input.company?.trim()) score += 6;
  if ((input.message?.trim().length ?? 0) > 120) score += 8;
  // The purpose field is required, so length is the only signal here — a
  // considered answer beats three words.
  if ((input.projectPurpose?.trim().length ?? 0) > 60) score += 6;

  score = Math.max(0, Math.min(100, score));

  /*
   * The cheapest plans are still real work.
   *
   * A one-page site on a relaxed timeline multiplies down into cold, which is
   * the wrong read: they picked a plan and a price, which is more commitment
   * than most enquiries carry. Anyone who is not explicitly browsing floors
   * at warm.
   */
  const notJustBrowsing = input.timeline !== "Just exploring";
  if (notJustBrowsing && score < 32) score = 32;

  const band: Band = score >= 60 ? "hot" : score >= 32 ? "warm" : "cold";
  return { score, band };
}

/**
 * Behavioural read on the slide signals.
 *
 * This is a signal, never a verdict. Keyboard users and anyone with reduced
 * motion legitimately produce zero pointer samples, so a low reading must
 * never hard-block a submission on its own.
 */
export function suspicionFromSignals(signals?: {
  durationMs: number;
  pointerSamples: number;
  peakVelocity: number;
  usedKeyboard: boolean;
}): "none" | "review" {
  if (!signals) return "none";
  if (signals.usedKeyboard) return "none";

  const noPointerActivity = signals.pointerSamples === 0;
  const impossiblyFast = signals.durationMs > 0 && signals.durationMs < 120;

  return noPointerActivity || impossiblyFast ? "review" : "none";
}
