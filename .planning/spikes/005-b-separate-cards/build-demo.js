"use strict";
const path = require("node:path");
require("../_roadmap-lab/build")({
  outputDir: __dirname,
  layout: "cards",
  title: "B · Separate cards",
  note: "Each gate gets its own container and more visual weight. The question is whether that clarity is worth four competing borders.",
});
