const fs = require("node:fs");
const path = require("node:path");
const root = __dirname;
const template = fs.readFileSync(path.join(root, "index.template.html"), "utf8");
const model = fs.readFileSync(path.join(root, "journey-model.js"), "utf8");
const output = template.replace("/* INLINE_JOURNEY_MODEL */", model);
if (output.includes("journey-model.js") || output.includes("/* INLINE_JOURNEY_MODEL */")) throw new Error("Demo must be self-contained.");
fs.writeFileSync(path.join(root, "index.html"), output);
console.log("Built self-contained index.html");
