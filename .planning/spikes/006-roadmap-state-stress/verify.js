"use strict";
const fs = require("node:fs");
const { chromium } = require("@playwright/test");

(async function () {
  const cases = [
    ["rejectedCooldown", "Rejected · cooldown", 0],
    ["rejectedReady", "Rejected · retry ready", 1],
    ["stalePending", "Stale pending", 1],
    ["grandfathered", "Grandfathered", 1],
    ["listingRejected", "Listing rejected", 1],
    ["ready", "Bookable", 0],
  ];
  const log = { startedAt: new Date().toISOString(), checks: [] };
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto("http://127.0.0.1:41721/006-roadmap-state-stress/index.html");
  for (const [scenario, label, expectedActions] of cases) {
    await page.getByRole("button", { name: label, exact: true }).click();
    const desktop = await page.locator("[data-roadmap]").evaluate(function (node) {
      return { cards: node.children.length, actions: node.querySelectorAll("button").length, overflow: node.scrollWidth > node.clientWidth, text: node.textContent };
    });
    const audit = await page.locator("[data-audit]").textContent();
    await page.getByRole("button", { name: "Phone · 320px", exact: true }).click();
    const phone = await page.locator("[data-frame]").evaluate(function (node) { return { className: node.className, width: Math.round(node.getBoundingClientRect().width), overflow: node.scrollWidth > node.clientWidth }; });
    await page.getByRole("button", { name: "Desktop", exact: true }).click();
    log.checks.push({ scenario, expectedActions, desktop, phone, audit });
  }
  await page.getByRole("button", { name: "Mixed portfolio", exact: true }).click();
  for (const [policy, label, expectedActions] of [["first-live", "Journey ends at first live listing", 0], ["all-clear", "Any rejected listing stays current", 1]]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    const result = await page.locator("[data-roadmap]").evaluate(function (node) { return { cards: node.children.length, actions: node.querySelectorAll("button").length, overflow: node.scrollWidth > node.clientWidth }; });
    log.checks.push({ scenario: "mixed", policy, expectedActions, desktop: result });
  }
  await page.screenshot({ path: "preview-mixed-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Phone · 320px", exact: true }).click();
  await page.screenshot({ path: "preview-mixed-phone.png", fullPage: true });
  await browser.close();
  log.finishedAt = new Date().toISOString();
  log.summary = {
    totalChecks: log.checks.length,
    failures: log.checks.filter(function (entry) {
      return entry.desktop.cards !== 4 || entry.desktop.actions !== entry.expectedActions || entry.desktop.overflow || (entry.phone && (entry.phone.width !== 320 || entry.phone.overflow)) || (entry.audit && !entry.audit.includes("passed"));
    }).length,
  };
  fs.writeFileSync("verification-log.json", JSON.stringify(log, null, 2));
  console.log(JSON.stringify(log.summary));
  if (log.summary.failures) process.exitCode = 1;
})();
