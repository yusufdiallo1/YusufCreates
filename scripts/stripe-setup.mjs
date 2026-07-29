/**
 * Creates the Stripe products and prices for every tier.
 *
 * Idempotent by lookup_key: re-running finds what already exists rather than
 * creating duplicates. That matters because a duplicate price is invisible in
 * the dashboard until a client is charged the wrong one.
 *
 *   node scripts/stripe-setup.mjs           # create or verify
 *   node scripts/stripe-setup.mjs --dry     # show what would happen
 *
 * Prices are IMMUTABLE in Stripe. Changing an amount means creating a new
 * price and archiving the old one — never editing in place — so this script
 * refuses to silently replace a price whose amount has drifted, and tells you
 * instead.
 */

import Stripe from "stripe";
import { readFileSync } from "node:fs";

const dry = process.argv.includes("--dry");

function env(key) {
  const raw = readFileSync(".env.local", "utf8");
  const match = raw.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match?.[1].trim().replace(/^["']|["']$/g, "") ?? "";
}

const secret = env("STRIPE_SECRET_KEY");
if (!secret) {
  console.error(
    "STRIPE_SECRET_KEY is empty in .env.local — nothing to do.\n" +
      "Add it, then re-run.",
  );
  process.exit(1);
}

const stripe = new Stripe(secret, { apiVersion: "2026-06-24.dahlia" });

/**
 * One-off tiers plus the recurring care plan.
 *
 * Growth is deliberately absent: its price is 1800 + 450 per page above three,
 * so it is computed per client rather than a fixed price. Enterprise is
 * absent for the same reason — it is quoted from a scoping call.
 */
const CATALOGUE = [
  {
    key: "launch",
    name: "Launch — one-page site",
    description: "A single scrolling page. Launch, portfolio, or a landing page.",
    amount: 900_00,
    recurring: null,
  },
  {
    key: "growth_base",
    name: "Growth — multi-page site (base, 3 pages)",
    description:
      "Three pages included. Additional pages are added as separate line items.",
    amount: 1800_00,
    recurring: null,
  },
  {
    key: "growth_page",
    name: "Growth — additional page",
    description: "Each page beyond the first three.",
    amount: 450_00,
    recurring: null,
  },
  {
    key: "app",
    name: "Web app or SaaS MVP",
    description: "Accounts, data, billing — something people log into.",
    amount: 6000_00,
    recurring: null,
  },
  {
    key: "enterprise_deposit",
    name: "Enterprise — deposit",
    description:
      "Starting figure for enterprise work. Final scope is set in the proposal.",
    amount: 13000_00,
    recurring: null,
  },
  {
    key: "care_monthly",
    name: "Care Plan",
    description:
      "Ongoing support: fixes, uptime, and regular changes. Cancel any time.",
    amount: 450_00,
    recurring: { interval: "month" },
  },
];

const CURRENCY = "usd";

async function findProduct(key) {
  // Searched by metadata rather than name, so renaming a product in the
  // dashboard does not cause this to create a second one.
  const found = await stripe.products.search({
    query: `metadata['yc_key']:'${key}'`,
    limit: 1,
  });
  return found.data[0] ?? null;
}

async function findPrice(lookupKey) {
  const found = await stripe.prices.list({
    lookup_keys: [lookupKey],
    limit: 1,
  });
  return found.data[0] ?? null;
}

async function main() {
  console.log(
    `${dry ? "DRY RUN — nothing will be created\n" : ""}Stripe catalogue setup\n`,
  );

  const results = [];

  for (const item of CATALOGUE) {
    const lookupKey = `yc_${item.key}`;

    let product = await findProduct(item.key);
    if (!product) {
      if (dry) {
        console.log(`  would create product  ${item.name}`);
      } else {
        product = await stripe.products.create(
          {
            name: item.name,
            description: item.description,
            metadata: { yc_key: item.key },
          },
          { idempotencyKey: `product:${item.key}` },
        );
        console.log(`  created product       ${item.name}`);
      }
    } else {
      console.log(`  product exists        ${item.name}`);
    }

    const existingPrice = await findPrice(lookupKey);

    if (existingPrice) {
      if (existingPrice.unit_amount !== item.amount) {
        // Refused rather than fixed: prices are immutable, so "updating" one
        // means archiving and replacing it, which changes what existing
        // subscriptions are billed. That is a decision, not a script's call.
        console.log(
          `  ⚠ price MISMATCH      ${lookupKey}: Stripe has ` +
            `${(existingPrice.unit_amount / 100).toFixed(2)}, ` +
            `code says ${(item.amount / 100).toFixed(2)}\n` +
            `    Prices cannot be edited. Archive the old one in the ` +
            `dashboard and re-run, or change the amount in this script.`,
        );
      } else {
        console.log(`  price exists          ${lookupKey}`);
      }
      results.push([item.key, existingPrice.id]);
      continue;
    }

    if (dry) {
      console.log(
        `  would create price    ${lookupKey} @ ${(item.amount / 100).toFixed(2)} ${CURRENCY.toUpperCase()}`,
      );
      continue;
    }

    const price = await stripe.prices.create(
      {
        product: product.id,
        unit_amount: item.amount,
        currency: CURRENCY,
        lookup_key: lookupKey,
        ...(item.recurring ? { recurring: item.recurring } : {}),
      },
      { idempotencyKey: `price:${item.key}` },
    );

    console.log(
      `  created price         ${lookupKey} @ ${(item.amount / 100).toFixed(2)} ${CURRENCY.toUpperCase()}`,
    );
    results.push([item.key, price.id]);
  }

  if (!dry && results.length > 0) {
    console.log("\nPrice ids:");
    for (const [key, id] of results) console.log(`  ${key.padEnd(20)} ${id}`);
    console.log(
      "\nThe Care Plan price id is the one to keep — subscriptions need it:",
    );
    const care = results.find(([k]) => k === "care_monthly");
    if (care) console.log(`  STRIPE_PRICE_CARE_MONTHLY=${care[1]}`);
  }
}

main().catch((err) => {
  console.error("\nFailed:", err.message);
  process.exit(1);
});
