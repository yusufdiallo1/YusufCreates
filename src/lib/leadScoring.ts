/**
 * Lead scoring. Pure functions so the same logic can run on the server and be
 * unit-reasoned about without a database.
 *
 * score = budget weight x urgency weight x fit weight, normalised to 0-100.
 * Enterprise submissions are always hot regardless of the other inputs.
 */

export type Band = "hot" | "warm" | "cold";

const BUDGET_WEIGHT: Record<string, number> = {
  "Under $1,000": 0.3,
  "$1,000 – $3,000": 0.5,
  "$3,000 – $6,000": 0.75,
  "$6,000 – $13,000": 0.9,
  "$13,000+": 1,
  "Not sure yet": 0.45,
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
  budget?: string;
  timeline?: string;
  projectType?: string;
  tier?: string;
  company?: string;
  message?: string;
  /** Set on the enterprise path, which never collects a budget band. */
  plan?: string;
  projectPurpose?: string;
}

export function scoreLead(input: ScoreInput): { score: number; band: Band } {
  // Enterprise is hot by definition — the qualification happens in the call.
  // The enterprise flow deliberately collects no budget, so scoring it through
  // the multiplication below would floor it at the "missing budget" default and
  // rank the largest enquiries lowest.
  if (
    input.plan === "enterprise" ||
    input.tier === "enterprise" ||
    input.projectType === "Enterprise project"
  ) {
    return { score: 100, band: "hot" };
  }

  const budget = BUDGET_WEIGHT[input.budget ?? ""] ?? 0.4;
  const urgency = URGENCY_WEIGHT[input.timeline ?? ""] ?? 0.5;
  const fit = FIT_WEIGHT[input.projectType ?? ""] ?? 0.6;

  let score = Math.round(budget * urgency * fit * 100);

  // Small additive signals: a named company and a considered message both
  // correlate with someone who has actually thought about the work.
  if (input.company?.trim()) score += 6;
  if ((input.message?.trim().length ?? 0) > 120) score += 8;
  // The purpose field is required, so length is the only signal here — a
  // considered answer beats three words.
  if ((input.projectPurpose?.trim().length ?? 0) > 60) score += 6;

  score = Math.max(0, Math.min(100, score));

  // "Not sure yet" on budget is the honest answer from someone who has never
  // commissioned this work before, and individuals give it constantly. Left
  // to the raw multiplication they land in cold and get deprioritised, which
  // is the wrong read — so an otherwise-real enquiry floors at warm.
  const undecidedBudget = input.budget === "Not sure yet" || !input.budget;
  const notJustBrowsing = input.timeline !== "Just exploring";
  if (undecidedBudget && notJustBrowsing && score < 32) score = 32;

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
