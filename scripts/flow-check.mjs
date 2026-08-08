#!/usr/bin/env node
/**
 * Flow check — how far is it from arriving to being able to act.
 *
 * Five ways people actually reach this site, walked end to end, counting the
 * clicks each one costs. A path that takes more than five clicks is a design
 * failure rather than a copy failure: no amount of rewriting a button fixes a
 * route that has too many steps in it.
 *
 * WHAT IT DOES NOT DO: submit anything. Every path stops at the moment the
 * final action becomes available — the slider is on screen and enabled, or the
 * email field is focusable. Going one step further would write real leads into
 * the database every time somebody ran the checks, and "can they get here" is
 * the question anyway. Whether the submit works is the manual pass's job.
 *
 * Run it against a dev server, by hand:
 *
 *   bun dev
 *   node scripts/flow-check.mjs                     # http://localhost:3000
 *   node scripts/flow-check.mjs http://localhost:3001
 *
 * DELIBERATELY NOT WIRED INTO postbuild. That hook runs check-secrets and
 * check-sha256, both of which are hermetic and need nothing but the built
 * output. This needs a server, a database with published content and a browser
 * — three things a CI build should not have to provide to tell you whether the
 * bundle is safe to ship.
 *
 * DO NOT run `next build` against the same tree while the dev server is up.
 * They share .next, and the build replacing it mid-session leaves the dev
 * server serving a half-written manifest — which shows up here as two or three
 * paths failing for reasons that have nothing to do with the paths.
 */

import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const MAX_CLICKS = 5;

/** ANSI, but only when something is going to read it. */
const colour = process.stdout.isTTY;
const green = (s) => (colour ? `\x1b[32m${s}\x1b[0m` : s);
const red = (s) => (colour ? `\x1b[31m${s}\x1b[0m` : s);
const dim = (s) => (colour ? `\x1b[2m${s}\x1b[0m` : s);

/**
 * One walk through the site, counting what it costs.
 *
 * Clicks are counted HERE rather than by instrumenting the page, because the
 * number that matters is the number a person performs — not the number of
 * navigation events the router happens to emit.
 */
class Walk {
  constructor(page, name) {
    this.page = page;
    this.name = name;
    this.clicks = 0;
    this.scrolled = 0;
  }

  async click(locator, what) {
    /*
     * How far down the page the thing they had to click actually sits.
     *
     * NOT window.scrollY. Playwright scrolls the target into view as part of
     * click(), so sampling the window before a click always reads 0 and
     * sampling after it reads whatever the next page reset to — both report
     * "0px" for a button buried a thousand pixels down. Measuring the
     * ELEMENT's own position answers the real question deterministically.
     */
    await this.measureReach(locator);
    this.clicks += 1;
    await locator.click();
    // The site smooth-scrolls on navigation and animates step transitions;
    // without settling, the next locator resolves against the outgoing view.
    await this.page.waitForTimeout(600);
    return what;
  }

  /** Scroll needed to bring `locator` into view from the top of its page. */
  async measureReach(locator) {
    const needed = await locator
      .evaluate((el) => {
        const top = el.getBoundingClientRect().top + window.scrollY;
        // Visible once its top clears the fold, so anything inside the first
        // viewport costs no scrolling at all.
        return Math.max(0, Math.round(top - window.innerHeight + el.offsetHeight));
      })
      .catch(() => 0);
    this.scrolled = Math.max(this.scrolled, needed);
  }

  /**
   * The window's own position, for paths that end by scrolling rather than
   * clicking. A running maximum, never a total — scroll resets on every
   * navigation, so summing would be meaningless.
   */
  async measureScroll() {
    const y = await this.page.evaluate(() => window.scrollY);
    this.scrolled = Math.max(this.scrolled, Math.round(y));
  }

  async scrollToBottom() {
    await this.page.evaluate(() =>
      window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }),
    );
    await this.page.waitForTimeout(400);
    await this.measureScroll();
  }
}

/**
 * Into the enquiry form from a pricing page.
 *
 * Targeted by HREF, not by accessible name. The nav's own "Start a project"
 * button is on every page and sits earlier in the DOM than the tier cards, so
 * a name-based locator matches the nav first and navigates back to /pricing —
 * a loop that looks like a passing click and gets nowhere.
 */
async function enterFormFromPricing(walk) {
  const tier = walk.page.locator('a[href^="/start"]').first();

  /*
   * WAITED FOR, not probed.
   *
   * The tier cards are client-rendered and their prices come from a Convex
   * query, so an instantaneous isVisible() is a race — and it resolved
   * differently depending on how much work the PREVIOUS page had queued.
   * A referral arrival claims a promo code on load, which was enough of a
   * delay to make this path "fail" while the identical path without ?ref
   * passed. That is a flaky test reporting a design problem that does not
   * exist, which is worse than no test.
   */
  await tier.waitFor({ state: "visible", timeout: 10_000 });
  await walk.click(tier, "picked a tier");
}

/**
 * Reaching the enquiry form and being able to answer its first question.
 *
 * The check stops at "the form is on screen and its current step is
 * answerable". Everything past that is typing, which costs no clicks and is
 * therefore not what this measures — and actually submitting would write real
 * leads every time the checks ran.
 */
async function reachSubmit(walk) {
  const page = walk.page;

  /*
   * WAITED FOR, not probed — same lesson as the tier link above.
   *
   * The form is client-rendered behind a navigation, and a fixed sleep after
   * the click is a guess about how long that takes on whatever machine is
   * running this. Guessing low reports a working path as broken; guessing
   * high makes five paths take a minute. Waiting on the thing itself is
   * neither.
   */
  await page.waitForURL(/\/start/, { timeout: 10_000 }).catch(() => {});
  if (!page.url().includes("/start")) return false;

  const heading = page.getByRole("heading", { name: /^start a project$/i });
  await heading.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
  if (!(await heading.isVisible().catch(() => false))) return false;

  /*
   * Either the plan picker is showing, or a tier arrived in the URL and the
   * form skipped straight past it to the contact step. Both are a form that
   * can be filled in; which one you get is the point of the preselection.
   */
  const answerable = page
    .locator("#name")
    .or(page.getByRole("button", { name: /one-page site|multi-page site/i }))
    .first();

  await answerable.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
  return answerable.isVisible().catch(() => false);
}

/**
 * Reaching a place to leave an email address.
 *
 * Three different controls, because three different pages close differently
 * and none of them is wrong: the closing band's capture (#cta-email) on pages
 * that carry ContactCTA, the newsletter signup on the blog, and the audit
 * tool's own field — which IS the lead capture on that page rather than a
 * separate one bolted underneath it.
 */
async function reachEmailCapture(walk) {
  await walk.scrollToBottom();

  const field = walk.page
    .locator("#cta-email, #newsletter-email, #audit-email")
    .first();

  await field.waitFor({ state: "visible", timeout: 5000 });
  return field.isEnabled();
}

const PATHS = [
  {
    name: "cold → hired",
    async run(walk) {
      await walk.page.goto(BASE, { waitUntil: "networkidle" });
      await walk.measureScroll();

      // The hero's primary action, which for a cold visitor is pricing.
      // Scoped to the hero so the nav's identical button cannot win.
      await walk.click(
        walk.page.locator("section a[href='/pricing']").first(),
        "hero CTA",
      );

      await enterFormFromPricing(walk);
      return reachSubmit(walk);
    },
  },
  {
    name: "referral → hired",
    async run(walk) {
      /*
       * A referred visitor is detected from document.referrer against the
       * published client domains, which this cannot forge from outside the
       * browser. The promo path is what is exercised instead — the same
       * arrival, via the link a client would actually share.
       */
      await walk.page.goto(`${BASE}/?ref=flowcheck`, {
        waitUntil: "networkidle",
      });
      await walk.measureScroll();

      await walk.click(
        walk.page.locator("section a[href='/pricing']").first(),
        "hero CTA",
      );

      await enterFormFromPricing(walk);
      return reachSubmit(walk);
    },
  },
  {
    name: "/pricing direct → hired",
    async run(walk) {
      await walk.page.goto(`${BASE}/pricing`, { waitUntil: "networkidle" });
      await walk.measureScroll();

      await enterFormFromPricing(walk);
      return reachSubmit(walk);
    },
  },
  {
    name: "blog reader → lead",
    async run(walk) {
      await walk.page.goto(`${BASE}/blog`, { waitUntil: "networkidle" });
      await walk.measureScroll();
      return reachEmailCapture(walk);
    },
  },
  {
    name: "audit tool → lead",
    async run(walk) {
      await walk.page.goto(`${BASE}/audit`, { waitUntil: "networkidle" });
      await walk.measureScroll();
      return reachEmailCapture(walk);
    },
  },
];

const browser = await chromium.launch();
let failures = 0;

/*
 * Warm every route before measuring anything.
 *
 * Against `next dev` the first request to a route compiles it, which can take
 * longer than any reasonable per-locator timeout — so the first path walked
 * would fail on compilation time and every path after it would pass. That
 * reads as a real finding about the first journey and is not one. Two runs in
 * a row disagreeing is worse than no check at all.
 */
{
  const warm = await browser.newContext();
  const page = await warm.newPage();
  for (const route of ["/", "/pricing", "/start", "/blog", "/audit"]) {
    await page
      .goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 120_000 })
      .catch(() => {});
  }
  await warm.close();
}

console.log(dim(`Walking ${PATHS.length} paths against ${BASE}\n`));

for (const path of PATHS) {
  // A fresh context per path: the journey record lives in localStorage and
  // decides which CTA the hero shows, so a shared profile would make the
  // second path a returning visitor and the third a lead.
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const walk = new Walk(page, path.name);

  let reached = false;
  let error = null;
  try {
    reached = await path.run(walk);
    await walk.measureScroll();
  } catch (err) {
    error = err;
  }

  const withinBudget = walk.clicks <= MAX_CLICKS;
  const passed = reached && withinBudget && !error;
  if (!passed) failures += 1;

  const verdict = passed ? green("PASS") : red("FAIL");
  console.log(
    `${verdict}  ${path.name.padEnd(24)} ${walk.clicks} click${walk.clicks === 1 ? " " : "s"}` +
      dim(`  ·  ${walk.scrolled}px scrolled`),
  );

  if (error) console.log(red(`      ${error.message.split("\n")[0]}`));
  else if (!reached) console.log(red("      never reached the final action"));
  else if (!withinBudget) {
    console.log(red(`      over the ${MAX_CLICKS}-click budget`));
  }

  await context.close();
}

await browser.close();

console.log(
  failures === 0
    ? green(`\nAll ${PATHS.length} paths within ${MAX_CLICKS} clicks.`)
    : red(`\n${failures} of ${PATHS.length} paths failed.`),
);

process.exit(failures === 0 ? 0 : 1);
