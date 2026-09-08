"use strict";
const fs = require("node:fs");
let html = fs.readFileSync("index.template.html", "utf8");
html = html.replace("{{CSS}}", fs.readFileSync("stress.css", "utf8")).replace("{{JS}}", fs.readFileSync("stress.js", "utf8"));
if (/\{\{[A-Z_]+\}\}/.test(html) || /<(script|link)[^>]+src=/.test(html)) throw new Error("Unresolved token or external asset");
fs.writeFileSync("index.html", html);
console.log("Built index.html");
