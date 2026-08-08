import { internalMutation } from "./_generated/server";
import { extractVariables } from "./lib/merge";
import {
  SEED_CONTRACT_BODY,
  SEED_TEMPLATE_NAME,
} from "./lib/contractTemplate";

/**
 * One-off data migrations, run by hand from the CLI.
 *
 * Kept as internalMutation so nothing reachable from a browser can trigger
 * one, and kept in this file rather than scattered through the modules they
 * touch so it is obvious what has been run and what has not. A migration that
 * has served its purpose stays here with a note rather than being deleted —
 * knowing a backfill happened is the point of having written it down.
 *
 *   npx convex run migrations:backfillProposalAccepted
 */

/**
 * Splits the old overloaded "signed" proposal status into accepted vs signed.
 *
 * Accepting a hosted proposal used to write status "signed" even though no
 * signature existed. Now that contracts are real, "signed" has to mean signed.
 *
 * The two cases are distinguishable without guessing, because the two code
 * paths already stamped different timestamps: respond() wrote acceptedAt and
 * never signedAt, while the admin's setStatus wrote signedAt. So a row with
 * acceptedAt and no signedAt was an acceptance mislabelled, and anything else
 * is left alone — including rows where an admin genuinely marked a proposal
 * signed after a paper contract.
 *
 * Idempotent: running it twice changes nothing the second time.
 */
/**
 * Publishes the current SEED_CONTRACT_BODY as the next template version.
 *
 * Needed because contracts:seedTemplate no-ops once any template exists, so
 * editing the seed in code has no effect on a deployment that has already run
 * it. This inserts rather than overwrites — the old version stays readable,
 * which is the whole point of versioning, and any contract generated from it
 * keeps its own snapshot regardless.
 *
 *   npx convex run migrations:publishSeedTemplate
 */
export const publishSeedTemplate = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("contractTemplates").collect();
    const current = all.find((t) => t.active);
    if (current?.body === SEED_CONTRACT_BODY) {
      return { published: false as const, reason: "Already current." };
    }

    for (const row of all) {
      if (row.active) await ctx.db.patch(row._id, { active: false });
    }

    const version = all.reduce((max, r) => Math.max(max, r.version), 0) + 1;
    const id = await ctx.db.insert("contractTemplates", {
      name: SEED_TEMPLATE_NAME,
      body: SEED_CONTRACT_BODY,
      variables: extractVariables(SEED_CONTRACT_BODY),
      version,
      active: true,
      createdAt: Date.now(),
      note: "Rewritten as a plain-English working agreement — no legal boilerplate.",
    });

    return { published: true as const, version, id };
  },
});

/**
 * Drops governingLaw and venue from the contract defaults.
 *
 * The template stopped being a legal document and no longer has a
 * jurisdiction clause, so these are keys nothing reads. Left in place they
 * read as configuration somebody forgot to fill in, which is worse than
 * absent — the next person to open Settings would try to set them.
 *
 *   npx convex run migrations:pruneContractDefaults
 */
export const pruneContractDefaults = internalMutation({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "contract.defaults"))
      .unique();
    if (!row) return { pruned: [] as string[] };

    const value = { ...(row.value as Record<string, unknown>) };
    const pruned: string[] = [];
    for (const key of ["governingLaw", "venue"]) {
      if (key in value) {
        delete value[key];
        pruned.push(key);
      }
    }
    if (pruned.length > 0) await ctx.db.patch(row._id, { value });
    return { pruned };
  },
});

export const backfillProposalAccepted = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("proposals")
      .withIndex("by_status", (q) => q.eq("status", "signed"))
      .collect();

    let changed = 0;
    for (const row of rows) {
      if (row.acceptedAt && !row.signedAt) {
        await ctx.db.patch(row._id, { status: "accepted" });
        changed += 1;
      }
    }

    return { examined: rows.length, changed };
  },
});
