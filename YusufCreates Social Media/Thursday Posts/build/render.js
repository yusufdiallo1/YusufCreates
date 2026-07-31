/**
 * Renders each Sunday carousel to 1080x1350 PNGs via headless Chromium.
 *
 * Run from the repo root — NOT from inside this folder, or the `playwright`
 * require fails:
 *
 *   node "Thursday Posts/build/render.js"
 *
 * Output: Thursday Posts/posts/<slug>/<slug>-<n>.png
 *
 * 4:5 because Instagram carousels cap there — 9:16 gets centre-cropped on
 * upload, which silently eats the logo lockup and the progress dots.
 *
 * Filenames carry the deck slug because Instagram's picker sorts by filename
 * in one flat recents view, and bare "01.png" files from different decks come
 * back shuffled.
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { page } = require("./template");
const { carousels, HANDLE } = require("./content");

const OUT = path.join(__dirname, "..", "posts");
const W = 1080;
const H = 1350;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
  });
  const p = await ctx.newPage();

  let count = 0;
  let warnings = 0;

  for (const carousel of carousels) {
    const dir = path.join(OUT, carousel.slug);
    fs.mkdirSync(dir, { recursive: true });

    // One slide per page load, captured as a full-viewport shot.
    //
    // Element screenshots look equivalent and are not: to photograph a slide
    // far down the page, Playwright scrolls it into view, and the layered
    // background does not always repaint at the new offset. That produced
    // slides with their chrome intact and everything below the fold flat
    // black — a bug that reached a real upload because the markup was correct
    // and only the image was wrong.
    for (let i = 0; i < carousel.slides.length; i++) {
      await p.setContent(page([carousel.slides[i]], HANDLE, i, carousel.slides.length), {
        waitUntil: "load",
      });

      // The embedded font must be applied before capture, or the screenshot
      // lands on a fallback face and every metric shifts.
      await p.evaluate(async () => {
        await document.fonts.load('700 104px "InterEmbedded"');
        await document.fonts.load('400 26px "InterEmbedded"');
        await document.fonts.ready;
      });
      if (i === 0 && !(await p.evaluate(() => document.fonts.check('700 104px "InterEmbedded"')))) {
        throw new Error("InterEmbedded failed to load — aborting");
      }

      // <main> is the only flexible region, so content taller than it means
      // the slide overflowed its safe area. The 4:5 canvas is unforgiving.
      const over = await p.evaluate(() => {
        const m = document.querySelector("section.slide main");
        return m.scrollHeight - m.clientHeight;
      });
      if (over > 1) {
        console.warn(`  ! ${carousel.slug} slide ${i + 1} overflows by ${over}px`);
        warnings++;
      }

      const n = String(i + 1).padStart(2, "0");
      const file = path.join(dir, `${carousel.slug}-${n}.png`);
      await p.screenshot({ path: file, clip: { x: 0, y: 0, width: W, height: H } });

      // A slide that failed to paint compresses to a fraction of a real one,
      // because it is mostly flat black. Nobody opens 100 PNGs by hand, so
      // this is the check that catches it before an upload does.
      const kb = fs.statSync(file).size / 1024;
      if (kb < 400) {
        console.warn(`  ! ${carousel.slug} slide ${i + 1} is only ${Math.round(kb)}KB — likely failed to paint`);
        warnings++;
      }
      count++;
    }
    console.log(`${carousel.slug}: ${carousel.slides.length} slides`);
  }

  await browser.close();
  console.log(`\n${count} slides written to "Thursday Posts/posts/" at ${W}x${H}`);
  if (warnings) console.log(`${warnings} warning(s) — see above.`);
})();
