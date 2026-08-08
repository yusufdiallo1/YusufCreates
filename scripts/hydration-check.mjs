/**
 * Hydration check — every marketing route, under both motion preferences.
 *
 * The bug this exists to catch is specific and was shipped twice: a component
 * that branches on `useReducedMotion()` in a way that reaches the DOM. That
 * hook returns `null` on the server and a boolean on the client, so the server
 * renders the animated variant and a visitor who has asked for reduced motion
 * hydrates against markup they were never sent. React cannot patch it, throws
 * the tree away and re-renders the whole route on the client.
 *
 * It is invisible in ordinary testing because the majority preference — no
 * reduced motion — is the one that happens to match what the server rendered.
 * You only see it if you go looking with the preference ON, which is what this
 * does.
 *
 * Usage:  node scripts/hydration-check.mjs [baseUrl]
 * Expects a dev server already running (bun dev), because React's development
 * build names the mismatching component and production only emits a numbered
 * error.
 */

import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";

const ROUTES = [
  "/",
  "/about",
  "/work",
  "/services",
  "/pricing",
  "/enterprise",
  "/start",
  "/blog",
  "/audit",
  "/waitlist",
  "/legal/privacy",
];

/* The strings React uses for a hydration failure, across dev and prod. */
const HYDRATION_SIGNALS = [
  "did not match",
  "Hydration failed",
  "hydration mismatch",
  "server rendered HTML didn't match",
  "There was an error while hydrating",
  "Minified React error #418",
  "Minified React error #423",
  "Minified React error #425",
];

const isHydrationError = (text) =>
  HYDRATION_SIGNALS.some((signal) =>
    text.toLowerCase().includes(signal.toLowerCase()),
  );

async function checkRoute(route, reducedMotion) {
  /*
   * A browser per check, torn down in a finally.
   *
   * Reusing one Chromium across all twenty-two loads had it killed part-way
   * through the sweep, which surfaced as a spurious "Target page, context or
   * browser has been closed" on whichever route came last — a harness failure
   * reported as a site failure, which is the worst kind. This is slower and it
   * is honest.
   */
  const browser = await chromium.launch();
  const context = await browser.newContext({
    reducedMotion: reducedMotion ? "reduce" : "no-preference",
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const problems = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error" && msg.type() !== "warning") return;
    const text = msg.text();
    if (isHydrationError(text)) problems.push(text.split("\n")[0].slice(0, 200));
  });
  page.on("pageerror", (err) => {
    if (isHydrationError(err.message)) {
      problems.push(err.message.split("\n")[0].slice(0, 200));
    }
  });

  try {
    /*
     * domcontentloaded, NOT networkidle.
     *
     * Convex holds a live websocket open for the duration of the page, so on
     * any route with a subscription the network never goes idle and the wait
     * times out — /blog did exactly that, and a harness timeout reported as a
     * hydration failure is worse than no harness at all.
     *
     * Hydration is what is being measured here and it happens shortly after
     * DOMContentLoaded, so the fixed settle below is both sufficient and
     * deterministic.
     */
    await page.goto(`${BASE}${route}`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    // Hydration errors surface a beat after the document settles.
    await page.waitForTimeout(3000);
  } catch (err) {
    problems.push(`NAVIGATION: ${err.message.split("\n")[0]}`);
  }

  try {
    await context.close();
    await browser.close();
  } catch {
    // Already gone; the results above are still valid.
  }
  return problems;
}

let failures = 0;

for (const route of ROUTES) {
  for (const reduced of [false, true]) {
    const label = `${route}${reduced ? "  [reduced-motion]" : ""}`;
    const problems = await checkRoute(route, reduced);
    if (problems.length === 0) {
      console.log(`  ok    ${label}`);
    } else {
      failures += problems.length;
      console.log(`  FAIL  ${label}`);
      for (const p of new Set(problems)) console.log(`          ${p}`);
    }
  }
}

console.log(
  failures === 0
    ? "\nNo hydration errors on any route, under either motion preference."
    : `\n${failures} hydration problem(s) found.`,
);
process.exit(failures === 0 ? 0 : 1);
