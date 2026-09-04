/* Spike 004 — inline spike 001's router so the comparison runs the REAL thing.
 *
 * The right-hand side of this head-to-head must be the router 001 measured, not a retelling of it.
 * It is pulled from `../001-one-box-intent-routing/` at build time for the same reason 001 has a
 * build step: a preview surface snapshots the page as a `data:` URL and relative sources silently
 * never load. Inlining keeps one implementation and makes the demo portable.
 */
"use strict";
const fs = require("fs"), path = require("path");
const S1 = path.join(__dirname, "..", "001-one-box-intent-routing");
const read = (p) => fs.readFileSync(p, "utf8");

let html = read(path.join(__dirname, "index.template.html"))
  .replace('<script src="../001-one-box-intent-routing/data.js"></script>', () => `<script>\n${read(path.join(S1, "data.js"))}\n</script>`)
  .replace('<script src="../001-one-box-intent-routing/router.js"></script>', () => `<script>\n${read(path.join(S1, "router.js"))}\n</script>`);

if (html.includes("001-one-box-intent-routing/")) { console.error("FAILED: a relative src survived."); process.exit(1); }
fs.writeFileSync(path.join(__dirname, "index.html"), html);
console.log(`wrote index.html (${(html.length / 1024).toFixed(1)} kB, self-contained)`);
