/**
 * Renders each carousel to 1080x1920 PNGs via headless Chromium.
 *
 * Run: node social/build/render.js
 * Output: social/out/<slug>/<n>.png
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { page } = require("./template");
const { carousels, HANDLE } = require("./content");

const OUT = path.join(__dirname, "..", "out");

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
  });
  const p = await ctx.newPage();

  let count = 0;

  for (const carousel of carousels) {
    const dir = path.join(OUT, carousel.slug);
    fs.mkdirSync(dir, { recursive: true });

    await p.setContent(page(carousel.slides, HANDLE), { waitUntil: "load" });

    // The embedded font must be parsed and applied before capture, otherwise
    // the screenshot lands on the fallback and the metrics shift.
    await p.evaluate(async () => {
      await document.fonts.load('700 112px "InterEmbedded"');
      await document.fonts.load('400 33px "InterEmbedded"');
      await document.fonts.ready;
    });
    const loaded = await p.evaluate(() =>
      document.fonts.check('700 112px "InterEmbedded"')
    );
    if (!loaded) throw new Error("InterEmbedded failed to load — aborting");

    // Guard against silent clipping: the <main> block is the only flexible
    // region, so if its content is taller than the space between the top bar
    // and the footer, the slide has overflowed and needs shorter copy.
    const overflows = await p.evaluate(() =>
      [...document.querySelectorAll("section.slide main")]
        .map((m, i) => ({ i, over: m.scrollHeight - m.clientHeight }))
        .filter((x) => x.over > 1)
    );
    for (const o of overflows) {
      console.warn(
        `  ! slide ${o.i + 1} overflows its safe area by ${o.over}px`
      );
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
  console.log(`\n${count} slides written to social/out/`);
})();
