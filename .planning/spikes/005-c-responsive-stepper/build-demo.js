"use strict";
const path = require("node:path");
require("../_roadmap-lab/build")({
  outputDir: __dirname,
  layout: "stepper",
  title: "C · Responsive stepper",
  note: "The sequence is fastest to scan on a wide screen, then changes geometry into a vertical track at the 320px floor.",
});
