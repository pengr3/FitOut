/* Spike 003 — inline Leaflet, the CSS and the fixture into one file.
 *
 * Same reason as spike 001's build step: a preview surface snapshots the page as a `data:` URL and
 * relative <script src>/<link href> silently never load, leaving an inert page. Leaflet is used
 * for real here (its `getBounds()` is what emits the bbox), so it is vendored rather than CDN'd —
 * the demo must not need a network to answer a question about geometry.
 *
 * Basemap TILES remain a network dependency by design. Without them the map is blank and every
 * count, bbox and policy comparison still holds.
 */
"use strict";
const fs = require("fs"), path = require("path");
const read = (f) => fs.readFileSync(path.join(__dirname, f), "utf8");

let html = read("index.template.html")
  .replace('<link rel="stylesheet" href="leaflet.css" />', () => `<style>\n${read("leaflet.css")}\n</style>`)
  .replace('<script src="leaflet.js"></script>', () => `<script>\n${read("leaflet.js")}\n</script>`)
  .replace('<script src="listings.js"></script>', () => `<script>\n${read("listings.js")}\n</script>`);

for (const bad of ['href="leaflet.css"', 'src="leaflet.js"', 'src="listings.js"']) {
  if (html.includes(bad)) { console.error(`FAILED: ${bad} survived — the demo would be inert.`); process.exit(1); }
}
fs.writeFileSync(path.join(__dirname, "index.html"), html);
console.log(`wrote index.html (${(html.length / 1024).toFixed(0)} kB, self-contained except basemap tiles)`);
