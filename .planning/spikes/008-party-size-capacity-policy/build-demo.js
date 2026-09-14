const fs = require("node:fs");
const path = require("node:path");
const root = __dirname;
const template = fs.readFileSync(path.join(root, "index.template.html"), "utf8");
const logic = fs.readFileSync(path.join(root, "capacity-policy.js"), "utf8");
const output = template.replace("/* INLINE_CAPACITY_POLICY */", logic);
if (output.includes("capacity-policy.js") || output.includes("/* INLINE_CAPACITY_POLICY */")) {
  throw new Error("Demo must be self-contained for file:// preview.");
}
fs.writeFileSync(path.join(root, "index.html"), output);
console.log("Built self-contained index.html");
