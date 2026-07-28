/**
 * Renders each carousel to 1080x1920 PNGs via headless Chromium.
 *
 * Run from the repo root:  node "YusufCreates Social Media/build/render.js"
 * Output: YusufCreates Social Media/posts/<slug>/<n>.png
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { page } = require("./template");
const { carousels, HANDLE } = require("./content");

const OUT = path.join(__dirname, "..", "posts");

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
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
      await document.fonts.load('700 112px "InterEmbedded"');
      await document.fonts.load('400 33px "InterEmbedded"');
      await document.fonts.ready;
    });
    if (!(await p.evaluate(() => document.fonts.check('700 112px "InterEmbedded"')))) {
      throw new Error("InterEmbedded failed to load — aborting");
    }

    // Guard against silent clipping: <main> is the only flexible region, so
    // content taller than it means the slide has overflowed its safe area.
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
      const file = path.join(dir, `${String(i + 1).padStart(2, "0")}.png`);
      await nodes[i].screenshot({ path: file });
      count++;
    }
    console.log(`${carousel.slug}: ${nodes.length} slides`);
  }

  await browser.close();
  console.log(`\n${count} slides written to "YusufCreates Social Media/posts/"`);
  if (warnings) console.log(`${warnings} overflow warning(s) — see above.`);
})();
