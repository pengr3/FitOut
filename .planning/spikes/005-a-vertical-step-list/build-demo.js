"use strict";
const path = require("node:path");
require("../_roadmap-lab/build")({
  outputDir: __dirname,
  layout: "vertical",
  title: "A · Vertical step list",
  note: "One border, one reading direction. The connector makes sequence explicit without pretending that progress is a percentage.",
});
