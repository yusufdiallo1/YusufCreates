/**
 * Renders each v2 carousel to 1080x1350 PNGs via headless Chromium.
 *
 * Run from the repo root:  node "YusufCreates Social Media/build-v2/render.js"
 * Output: YusufCreates Social Media/posts-v2/<slug>/<slug>-<n>.png
 *
 * 4:5 because Instagram carousels cap there. Filenames carry the deck slug
 * because Instagram's picker sorts by filename in one flat view, and bare
 * "01.png" files from different decks upload shuffled.
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { page } = require("./template");
const { carousels, HANDLE } = require("./content");

const OUT = path.join(__dirname, "..", "posts-v2");
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

    await p.setContent(page(carousel.slides, HANDLE), { waitUntil: "load" });

    // The embedded font must be applied before capture, or the screenshot
    // lands on a fallback face and every metric shifts.
    await p.evaluate(async () => {
      await document.fonts.load('700 104px "InterEmbedded"');
      await document.fonts.load('400 24px "InterEmbedded"');
      await document.fonts.ready;
    });
    if (!(await p.evaluate(() => document.fonts.check('700 104px "InterEmbedded"')))) {
      throw new Error("InterEmbedded failed to load — aborting");
    }

    // Guard against silent clipping. <main> is the only flexible region, so
    // content taller than it means the slide overflowed its safe area — the
    // 4:5 canvas is unforgiving and a graphic block is easy to oversize.
    const overflows = await p.evaluate(() =>
      [...document.querySelectorAll("section.slide main")]
        .map((m, i) => ({ i, over: m.scrollHeight - m.clientHeight }))
        .filter((x) => x.over > 1)
    );
    for (const o of overflows) {
      console.warn(`  ! ${carousel.slug} slide ${o.i + 1} overflows by ${o.over}px`);
      warnings++;
    }

    const nodes = await p.locator("section.slide").all();
    for (let i = 0; i < nodes.length; i++) {
      const n = String(i + 1).padStart(2, "0");
      const file = path.join(dir, `${carousel.slug}-${n}.png`);
      await nodes[i].screenshot({ path: file });
      count++;
    }
    console.log(`${carousel.slug}: ${nodes.length} slides`);
  }

  await browser.close();
  console.log(`\n${count} slides written to "YusufCreates Social Media/posts-v2/" at ${W}x${H}`);
  if (warnings) console.log(`${warnings} overflow warning(s) — see above.`);
})();
