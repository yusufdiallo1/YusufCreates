import type { Doc } from "../_generated/dataModel";

/**
 * {{variable}} merge for contract templates.
 *
 * Lives in convex/lib rather than src/lib because generation happens inside a
 * Convex mutation and Convex cannot import from src/. The admin preview
 * therefore reaches this through a Convex QUERY rather than re-implementing
 * it — there were once two copies of the markdown renderer in this repo and
 * they had already drifted apart by the time anyone noticed. A preview that
 * renders differently from the thing being sent is worse than no preview.
 */

const PATTERN = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g;

/** Every distinct {{key}} in the body, in the order it first appears. */
export function extractVariables(body: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const match of body.matchAll(PATTERN)) {
    const key = match[1];
    if (!seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}

/**
 * Substitute, and report which keys the template asked for and nobody supplied.
 *
 * "Unsupplied" means the key is absent from the values map — NOT that its
 * value is empty. Some values are meant to be empty: clientCompanyClause is ""
 * for a client with no company, and supplierTradingClause is "" when there is
 * no trading name. Treating empty as missing would block every contract for an
 * individual client, which is most of them.
 *
 * What is genuinely absent is not blanked either. Silently dropping a variable
 * produces a contract with an empty fee or an empty jurisdiction that reads as
 * though it were meant that way, and the first anyone knows is when it
 * matters. The gap stays visible in the text AND is returned.
 *
 * Required-but-blank is a different question with a different answer — see
 * unresolvedRequired below.
 */
export function mergeTemplate(
  body: string,
  values: Record<string, string>,
): { text: string; missing: string[] } {
  const missing: string[] = [];

  const text = body.replace(PATTERN, (_whole, key: string) => {
    const supplied = Object.prototype.hasOwnProperty.call(values, key);
    const value = values[key];
    if (!supplied || value === undefined || value === null) {
      if (!missing.includes(key)) missing.push(key);
      return `[[MISSING: ${key}]]`;
    }
    return value;
  });

  return { text, missing };
}

/**
 * Required values that are blank or still carrying the seed placeholder.
 *
 * This is what actually blocks generation. It fires the first time a contract
 * is generated after install, when governingLaw still says [SET YOUR STATE] —
 * loudly, at the moment it can be fixed, rather than shipping a contract whose
 * jurisdiction clause names a placeholder.
 */
export function unresolvedRequired(
  values: Record<string, string>,
  placeholder: string,
): string[] {
  return REQUIRED_VARIABLES.filter((key) => {
    const value = values[key];
    return (
      value === undefined ||
      value === null ||
      value.trim() === "" ||
      value.includes(placeholder)
    );
  });
}

/**
 * Values the template cannot be generated without.
 *
 * No governing law or jurisdiction: this is a working agreement, not a legal
 * instrument, and there is deliberately no such clause to fill. What is
 * required is the stuff a client would notice missing — what is being built,
 * what it costs, and whose name is on it.
 */
export const REQUIRED_VARIABLES = [
  "supplierName",
  "clientName",
  "proposalReference",
  "siteType",
  "projectScope",
  "totalAmount",
  "currency",
  "depositAmount",
  "balanceAmount",
] as const;

/**
 * Settings the template needs that do not come from the proposal.
 *
 * Stored in the `settings` table under "contract.defaults" so they are edited
 * once rather than retyped per contract.
 */
export type ContractDefaults = {
  supplierName?: string;
  supplierTradingName?: string;
  feedbackDays?: string;
  revisionLimit?: string;
};

function money(amount: number): string {
  // Whole units with thousands separators. Convex stores major units; the
  // minor-unit conversion belongs at the Stripe boundary and nowhere else.
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Builds the merge values from a proposal.
 *
 * Derived and conditional values are computed HERE, in TypeScript, rather than
 * in the template. The merge syntax has no conditionals on purpose — the
 * moment a template can branch, it is a program, and a program that produces
 * contracts needs testing that a textarea in an admin panel will never get.
 * So the template stays dumb and this decides whether a clause reads
 * ", of Acme Ltd," or nothing at all.
 */
export function buildContractVariables(
  proposal: Doc<"proposals">,
  lead: Doc<"leads"> | null,
  defaults: ContractDefaults,
  depositAmount: number,
  balanceAmount: number,
): Record<string, string> {
  const tradingName = defaults.supplierTradingName?.trim();
  // The company lives on the lead, not the proposal — the proposal only
  // carries an override name and email for when the signatory differs from
  // whoever filled the form.
  const clientCompany = lead?.company?.trim();

  return {
    supplierName: defaults.supplierName?.trim() ?? "",
    supplierTradingClause: tradingName ? ` trading as ${tradingName}` : "",

    clientName: proposal.clientName?.trim() || (lead?.name ?? ""),
    /* No trailing comma: the template supplies the punctuation that follows.
       Carrying one here produced `Ada Lovelace, of Acme Ltd,, "you"`. */
    clientCompanyClause: clientCompany ? `, of ${clientCompany}` : "",

    // The proposal's own id is the reference — it is stable, unique, and
    // already what the admin searches by.
    proposalReference: proposal._id,

    siteType: proposal.siteType?.trim() || "A website",
    projectScope: proposal.scope?.trim() ?? "",
    exclusions: proposal.excluded?.trim() ?? "",
    timeline: proposal.timeline?.trim() ?? "",
    startDate: START_DATE,

    /* Stated even when unknown. "We'll agree it before launch" is a real
       answer; leaving the domain section blank reads like an oversight and
       invites the question later, which is the thing the clause exists to
       prevent. */
    domain: proposal.domain?.trim() || "To be agreed before launch.",

    currency: proposal.currency.toUpperCase(),
    totalAmount: money(proposal.amount),
    depositAmount: money(depositAmount),
    balanceAmount: money(balanceAmount),

    revisionLimit: defaults.revisionLimit?.trim() || "Two",
    feedbackDays: defaults.feedbackDays?.trim() || "three",
  };
}

/**
 * Proposals carry a free-text timeline, not a start date, so there is nothing
 * to read. Rather than invent a date and put it in a contract — where a wrong
 * one becomes a term either party can hold the other to — this states the
 * thing that is actually true and already agreed in section 4.
 */
const START_DATE = "the date the deposit clears";
