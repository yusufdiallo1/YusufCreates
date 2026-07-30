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
    viewport: { width: 1080, height: 1350 },
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

    // Filenames are prefixed with the deck slug rather than being a bare
    // "01.png" repeated in every folder. Instagram's picker sorts by filename
    // and shows them in one flat recents view, so identical names across decks
    // came back in the wrong order on upload. A globally unique, alphabetically
    // sortable name means selecting all five gives the intended sequence.
    //
    // One slide per page load, captured full-viewport. Element screenshots
    // scroll the target into view to photograph it, and the layered background
    // did not reliably repaint at the new offset — producing an occasional
    // slide with its chrome intact and everything below the fold flat black.
    // Rendering one at a time keeps every capture at scroll offset zero.
    for (let i = 0; i < carousel.slides.length; i++) {
      await p.setContent(page([carousel.slides[i]], HANDLE, i, carousel.slides.length), { waitUntil: "load" });
      await p.evaluate(async () => {
        await document.fonts.load('700 104px "InterEmbedded"');
        await document.fonts.ready;
      });

      const n = String(i + 1).padStart(2, "0");
      const file = path.join(dir, `${carousel.slug}-${n}.png`);
      await p.screenshot({ path: file, clip: { x: 0, y: 0, width: 1080, height: 1350 } });

      // A slide that failed to paint compresses to a fraction of a real one,
      // because it is mostly flat black. Cheap check, catches at the source.
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
  console.log(`\n${count} slides written to "YusufCreates Social Media/posts/"`);
  if (warnings) console.log(`${warnings} overflow warning(s) — see above.`);
})();
