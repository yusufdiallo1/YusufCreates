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
/*
 * Archive a mismatched price and create a replacement.
 *
 * Opt-in, because it changes what customers are billed: a subscription on the
 * archived price keeps its old amount until moved, so replacing the Care Plan
 * price does NOT re-price anyone already on it. Existing one-off payment links
 * pointing at the archived price stop working, which is the intended outcome
 * when a figure was published wrongly.
 */
const replace = process.argv.includes("--replace");

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
 * The five plans, matching src/lib/pricing.ts exactly.
 *
 * Growth is TWO prices rather than a base plus per-page add-on: three pages is
 * one figure, four through nine is another, flat. That is a real product
 * decision, not a rounding — a client adding a page should not trigger a
 * conversation about money.
 *
 * Enterprise is a deposit rather than the full figure, because the total comes
 * out of a scoping call and varies per engagement.
 */
/*
 * Mirrors src/lib/pricing.ts. When a figure changes there it changes here too,
 * and the script creates a NEW price — Stripe prices are immutable, so the old
 * one is archived rather than edited.
 *
 * Keys are stable across price changes; the key identifies the product, the
 * price id identifies the amount.
 */
const CATALOGUE = [
  {
    key: "launch",
    name: "Launch",
    description:
      "One page, done properly. Landing page or one-pager, contact form, SEO basics, auth and admin where needed, deployed and handed over.",
    amount: 400_00,
    recurring: null,
  },
  {
    key: "growth_3",
    name: "Growth — up to 3 pages",
    description:
      "A full site at three pages. Blog and pages you edit yourself, analytics, auth and admin.",
    amount: 750_00,
    recurring: null,
  },
  {
    key: "growth_4_9",
    name: "Growth — 4 to 9 pages",
    description:
      "A full site, four to nine pages. Same price whether it is four pages or nine.",
    amount: 950_00,
    recurring: null,
  },
  {
    key: "app",
    name: "Web app / SaaS",
    description:
      "Software, not a brochure. Accounts and roles, database, card payments, dashboards, integrations. Starting figure.",
    amount: 2500_00,
    recurring: null,
  },
  {
    key: "native",
    name: "iOS and macOS app",
    description:
      "A real native app, not a wrapped website. Shares one backend with the web build, works offline, push notifications, signed builds distributed straight to your users. No App Store listing. Starting figure.",
    amount: 3200_00,
    recurring: null,
  },
  {
    key: "enterprise_deposit",
    name: "Enterprise — deposit",
    description:
      "Starting figure for enterprise work. Final scope and total are set in the proposal.",
    amount: 5500_00,
    recurring: null,
  },
  {
    // The one-off rescue fee. Care follows it; this is the way in.
    key: "revive",
    name: "Revive — fix an existing site",
    description:
      "A full audit, then speed, accessibility, SEO, mobile and security fixes applied to a site you already have. Handover notes included. Continue on the Care Plan to keep it that way.",
    amount: 650_00,
    recurring: null,
  },
  {
    key: "care_monthly",
    name: "Care Plan",
    description:
      "Hosting and maintenance, 100 small fixes and 20 big fixes a month, SEO monitoring, monthly report, priority support. Cancel any time.",
    amount: 180_00,
    recurring: { interval: "month" },
  },
  {
    // Twelve months for the price of ten. A separate price on its own product
    // rather than a second price on care_monthly, because this script keys
    // products by yc_key and one key must mean one price.
    key: "care_yearly",
    name: "Care Plan — annual",
    description:
      "Hosting and maintenance, 100 small fixes and 20 big fixes a month, SEO monitoring, monthly report, priority support. Twelve months for the price of ten.",
    amount: 1800_00,
    recurring: { interval: "year" },
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
        // Idempotency keys mean a repeat call returns the ORIGINAL object
        // rather than creating a second one. Comparing the timestamp is how
        // we report honestly instead of claiming to have created something
        // Stripe simply handed back.
        const before = Math.floor(Date.now() / 1000) - 5;
        product = await stripe.products.create(
          {
            name: item.name,
            description: item.description,
            metadata: { yc_key: item.key },
          },
          { idempotencyKey: `product:${item.key}` },
        );
        console.log(
          product.created >= before
            ? `  created product       ${item.name}`
            : `  product exists        ${item.name}`,
        );
      }
    } else if (
      product.name !== item.name ||
      product.description !== item.description
    ) {
      /*
       * Name and description were only ever set at creation, so editing either
       * here changed nothing on an existing product — the catalogue said one
       * thing and Stripe kept showing the old text on checkout and invoices.
       *
       * Safe to update in place, unlike `amount`: prices are immutable in
       * Stripe and still require --replace, but product copy is not.
       */
      if (dry) {
        console.log(`  would update product  ${item.name}`);
      } else {
        await stripe.products.update(product.id, {
          name: item.name,
          description: item.description,
        });
        console.log(`  updated product       ${item.name}`);
      }
    } else {
      console.log(`  product exists        ${item.name}`);
    }

    const existingPrice = await findPrice(lookupKey);

    if (existingPrice) {
      if (existingPrice.unit_amount !== item.amount) {
        const was = (existingPrice.unit_amount / 100).toFixed(2);
        const now = (item.amount / 100).toFixed(2);

        if (!replace) {
          // Refused rather than fixed by default: prices are immutable, so
          // "updating" one means archiving and replacing it, which changes
          // what new customers are billed. Pass --replace to do it.
          console.log(
            `  ⚠ price MISMATCH      ${lookupKey}: Stripe has ${was}, ` +
              `code says ${now}\n` +
              `    Re-run with --replace to archive the old price and ` +
              `create the new one.`,
          );
          results.push([item.key, existingPrice.id]);
          continue;
        }

        if (dry) {
          console.log(`  would replace price   ${lookupKey}: ${was} → ${now}`);
          continue;
        }

        // The lookup_key has to be freed before it can be reused, and the old
        // price archived so nothing new can be sold at the wrong figure.
        await stripe.prices.update(existingPrice.id, {
          active: false,
          lookup_key: `${lookupKey}_archived_${existingPrice.id.slice(-8)}`,
        });

        const fresh = await stripe.prices.create({
          product: product.id,
          unit_amount: item.amount,
          currency: CURRENCY,
          lookup_key: lookupKey,
          ...(item.recurring ? { recurring: item.recurring } : {}),
        });

        console.log(`  replaced price        ${lookupKey}: ${was} → ${now}`);
        results.push([item.key, fresh.id]);
        continue;
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

    const priceBefore = Math.floor(Date.now() / 1000) - 5;
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
      price.created >= priceBefore
        ? `  created price         ${lookupKey} @ ${(item.amount / 100).toFixed(2)} ${CURRENCY.toUpperCase()}`
        : `  price exists          ${lookupKey}`,
    );
    results.push([item.key, price.id]);
  }

  if (!dry && results.length > 0) {
    console.log("\nPrice ids:");
    for (const [key, id] of results) console.log(`  ${key.padEnd(20)} ${id}`);
    console.log(
      "\nThe Care Plan price ids are the ones to keep — subscriptions need them:",
    );
    const care = results.find(([k]) => k === "care_monthly");
    if (care) console.log(`  STRIPE_PRICE_CARE_MONTHLY=${care[1]}`);
    const careYear = results.find(([k]) => k === "care_yearly");
    if (careYear) console.log(`  STRIPE_PRICE_CARE_YEARLY=${careYear[1]}`);
  }
}

main().catch((err) => {
  console.error("\nFailed:", err.message);
  process.exit(1);
});
