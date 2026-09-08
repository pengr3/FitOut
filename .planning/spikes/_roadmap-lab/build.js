"use strict";

const fs = require("node:fs");
const path = require("node:path");

module.exports = function build(config) {
  const shared = __dirname;
  const outputDir = config.outputDir;
  let html = fs.readFileSync(path.join(shared, "index.template.html"), "utf8");
  const replacements = {
    "{{TITLE}}": config.title,
    "{{LAYOUT}}": config.layout,
    "{{NOTE}}": config.note,
    "{{CURRENT_A}}": config.layout === "vertical" ? 'aria-current="page"' : "",
    "{{CURRENT_B}}": config.layout === "cards" ? 'aria-current="page"' : "",
    "{{CURRENT_C}}": config.layout === "stepper" ? 'aria-current="page"' : "",
    "{{CSS}}": fs.readFileSync(path.join(shared, "roadmap.css"), "utf8"),
    "{{JS}}": fs.readFileSync(path.join(shared, "roadmap.js"), "utf8"),
  };
  for (const [token, value] of Object.entries(replacements)) html = html.split(token).join(value);
  if (/\{\{[A-Z_]+\}\}/.test(html) || /<(script|link)[^>]+src=/.test(html)) {
    throw new Error("Build left an unresolved token or external asset reference");
  }
  fs.writeFileSync(path.join(outputDir, "index.html"), html);
  console.log(`Built ${path.join(outputDir, "index.html")}`);
};
