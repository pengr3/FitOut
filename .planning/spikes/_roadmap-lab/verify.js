"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("@playwright/test");

(async function () {
  const variants = [
    ["005a", "005-a-vertical-step-list"],
    ["005b", "005-b-separate-cards"],
    ["005c", "005-c-responsive-stepper"],
  ];
  const log = { startedAt: new Date().toISOString(), checks: [] };
  // Use the machine's installed Chrome: the project's pinned Playwright package is present, but its
  // managed browser image is CI-only on this workstation.
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  for (const [id, dir] of variants) {
    await page.goto(`http://127.0.0.1:41721/${dir}/index.html`);
    await page.screenshot({ path: path.join(__dirname, "..", dir, "preview-desktop.png"), fullPage: true });
    await page.getByRole("button", { name: "Phone · 320px", exact: true }).click();
    await page.screenshot({ path: path.join(__dirname, "..", dir, "preview-phone.png"), fullPage: true });
    await page.getByRole("button", { name: "Desktop", exact: true }).click();
    for (const [scenario, buttonLabel] of [
      ["unverified", "Identity needed"],
      ["pending", "Identity pending"],
      ["payouts", "Payouts next"],
      ["listing", "Listing next"],
      ["review", "In review"],
      ["ready", "Bookable"],
    ]) {
      await page.getByRole("button", { name: buttonLabel, exact: true }).click();
      const desktop = await page.locator("[data-roadmap]").evaluate(function (node) {
        return { steps: node.children.length, actions: node.querySelectorAll("button").length, overflow: node.scrollWidth > node.clientWidth };
      });
      await page.getByRole("button", { name: /Phone · 320px/i }).click();
      const phone = await page.locator("[data-frame]").evaluate(function (node) {
        return { width: Math.round(node.getBoundingClientRect().width), overflow: node.scrollWidth > node.clientWidth };
      });
      await page.getByRole("button", { name: /Desktop/i }).click();
      log.checks.push({ id, scenario, desktop, phone });
    }
  }
  await browser.close();
  log.finishedAt = new Date().toISOString();
  log.summary = {
    variants: variants.length,
    scenariosPerVariant: 6,
    totalChecks: log.checks.length,
    failures: log.checks.filter(function (entry) {
      return entry.desktop.steps !== 4 || entry.desktop.overflow || entry.phone.width !== 320 || entry.phone.overflow;
    }).length,
  };
  fs.writeFileSync("verification-log.json", JSON.stringify(log, null, 2));
  console.log(JSON.stringify(log.summary));
  if (log.summary.failures > 0) process.exitCode = 1;
})();
