/* Spike 001 — inline the two source modules into a single-file demo.
 *
 * WHY THIS EXISTS. `index.template.html` loads `data.js` and `router.js` as classic <script src>,
 * which resolves fine when you double-click the file. It does NOT resolve when a preview surface
 * snapshots the page as a `data:` URL — the relative sources silently never load and the demo is
 * inert. `.planning/sketches/MANIFEST.md` records the same trap for the sketch stylesheets.
 *
 * The fix is a build step rather than a copy-paste, so the browser demo and the Node harness keep
 * executing the SAME router. Forking them would make the demo's behaviour unfalsifiable — the one
 * thing a spike cannot afford.
 *
 *   node build-demo.js   →   index.html   (open it from anywhere; no server, no network for S1-S4)
 */
"use strict";
const fs = require("fs"), path = require("path");
const read = (f) => fs.readFileSync(path.join(__dirname, f), "utf8");

const html = read("index.template.html")
  .replace('<script src="data.js"></script>', () => `<script>\n${read("data.js")}\n</script>`)
  .replace('<script src="router.js"></script>', () => `<script>\n${read("router.js")}\n</script>`);

if (html.includes('src="data.js"') || html.includes('src="router.js"')) {
  console.error("FAILED: a <script src> survived — the demo would be inert. Check the template.");
  process.exit(1);
}
fs.writeFileSync(path.join(__dirname, "index.html"), html);
console.log(`wrote index.html (${(html.length / 1024).toFixed(1)} kB, self-contained)`);
