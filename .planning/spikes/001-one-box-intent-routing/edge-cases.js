/* Spike 001 — adversarial probe.  `node edge-cases.js`
 *
 * A 100% score on a corpus its own author wrote is weak evidence. This file attacks the router
 * from the four directions that would actually sink it in production:
 *
 *   P1  PRECISION   — does it CLAIM things it should not? A false category is worse than none:
 *                     it silently filters away the listings the booker wanted.
 *   P2  SCALE       — the seed catalog has 7 places. Metro Manila has hundreds. Both the fuzzy
 *                     rule and the prefix rule get MORE dangerous as the catalog grows, so the
 *                     honest question is where they break, not whether they work at n=7.
 *   P3  HOSTILE     — long input, punctuation, unicode, SQL-shaped strings, emoji.
 *   P4  COST        — per-query wall time at a realistic index size.
 */
"use strict";
require("./data.js");
const D = globalThis.SpikeData;
const Router = require("./router.js");

const NOW = new Date("2026-08-31T09:00:00+08:00");
const run = (s) => Router.route(s, { now: NOW });
const out = [];
const log = (...a) => { const s = a.join(" "); out.push(s); console.log(s); };

(async () => {
  // ── P1 · PRECISION ────────────────────────────────────────────────────────────────────────────
  log("\nP1 · PRECISION — must NOT claim a category");
  log("-".repeat(78));
  const shouldNotMatch = [
    ["dennis", "a person's name, 1 edit from 'tennis'"],
    ["denise", "ditto, 2 edits"],
    ["yogi", "1 edit from 'yoga'? (len<6, fuzzy must not fire)"],
    ["dancer", "1 edit from 'dance'"],
    ["parkinson", "starts with 'parking'"],
    ["makatizen", "starts with the city name"],
    ["climb", "shorter form of a tag"],
    ["boxing day sale", "the word in a non-fitness sense"],
    ["poblacion street food", "a real place + irrelevant words"],
  ];
  let falsePositives = 0;
  for (const [input, why] of shouldNotMatch) {
    const r = await run(input);
    const claimed = [r.params.category, r.params.place, r.params.amenity].filter(Boolean);
    const via = r.matches.map((m) => m.via).filter(Boolean).join(",");
    if (claimed.length) falsePositives++;
    log(`  ${input.padEnd(24)} ${claimed.length ? "CLAIMED " + JSON.stringify(claimed) : "(no claim)"}  ${via ? "via " + via : ""}   ${why}`);
  }
  log(`  → ${falsePositives}/${shouldNotMatch.length} claimed something`);

  // ── P2 · SCALE ────────────────────────────────────────────────────────────────────────────────
  log("\nP2 · SCALE — grow the catalog and re-ask the same questions");
  log("-".repeat(78));

  // Real Metro Manila barangay/district names, enough of them to create genuine collisions.
  const GROWN = [
    "Ortigas Center", "Ortigas East", "Ortigas Avenue", "Poblacion", "Poblacion Uno",
    "San Antonio", "San Antonio Village", "San Lorenzo", "San Miguel", "Santa Cruz",
    "Bel-Air", "Salcedo Village", "Legaspi Village", "Rockwell", "Century City",
    "Bonifacio Global City", "McKinley Hill", "Katipunan", "Loyola Heights", "Diliman",
    "Kamias", "Kamuning", "Cubao", "New Manila", "Greenhills", "Wack-Wack",
    "Highway Hills", "Pinatubo Street", "Alabang", "Ayala Alabang", "Filinvest City",
    "Kaunlaran", "Grace Park", "Bagumbayan", "Malate", "Ermita", "Intramuros",
  ];
  const before = { catalog: D.CATALOG.length };
  GROWN.forEach((n, i) => {
    if (D.CATALOG.some((c) => c.neighborhood === n)) return;
    D.CATALOG.push({ city: "Metro Manila", neighborhood: n, region: "Metro Manila", n: 1, lat: 14.5 + i * 0.001, lng: 121 + i * 0.001 });
  });
  log(`  catalog ${before.catalog} → ${D.CATALOG.length} places`);

  // The index is built at module load, so re-require in a fresh registry to pick the growth up.
  delete require.cache[require.resolve("./router.js")];
  const Router2 = require("./router.js");
  const run2 = (s) => Router2.route(s, { now: NOW });

  log("\n  prefix-rule behaviour once short forms collide:");
  for (const q of ["ortigas", "poblacion", "san", "kami", "ayala", "bonifacio", "greenhills"]) {
    const r = await run2(q);
    const m = r.matches.find((x) => x.kind === "city" || x.kind === "neighborhood");
    log(`    ${q.padEnd(14)} ${m ? `→ ${m.value} (${m.via || "exact"})` : `→ no place; residue=${JSON.stringify(r.residue)}`}`);
  }

  log("\n  fuzzy false-positive surface across the grown index:");
  const collisions = [];
  for (const e of Router2.INDEX) {
    if (e.words !== 1 || e.key.length < 6) continue;
    for (const f of Router2.INDEX) {
      if (f === e || f.words !== 1 || f.key.length < 6) continue;
      if (f.value !== e.value && Router2.within1(e.key, f.key)) collisions.push(`${e.key}~${f.key}`);
    }
  }
  log(`    ${collisions.length ? collisions.slice(0, 12).join(", ") : "none — no two index terms are within one edit"}`);

  // ── P3 · HOSTILE ──────────────────────────────────────────────────────────────────────────────
  log("\nP3 · HOSTILE INPUT");
  log("-".repeat(78));
  const hostile = [
    ["yoga" + " ".repeat(200) + "makati", "200 spaces"],
    ["a".repeat(5000), "5k chars"],
    ["yoga'; DROP TABLE listing; --", "SQL-shaped (params are bound server-side; router must not choke)"],
    ["<script>alert(1)</script> yoga", "HTML"],
    ["YOGA IN MAKATI", "shouting"],
    ["  yoga   in    makati  ", "ragged whitespace"],
    ["yoga 🧘 makati", "emoji"],
    ["Parañaque", "diacritic (n-tilde)"],
    ["yoga in makati in poblacion in ortigas", "three places at once"],
    ["pickleball pickleball pickleball", "repetition"],
    ["!!!???", "punctuation only"],
  ];
  for (const [input, why] of hostile) {
    const t = Date.now();
    let r, err = null;
    try { r = await run2(input); } catch (e) { err = e.message; }
    const ms = Date.now() - t;
    const p = r ? Object.entries(r.params).filter(([k]) => !["lat", "lng", "placeKind"].includes(k)).map(([k, v]) => `${k}=${Array.isArray(v) ? v.join("+") : v}`).join(" ") : "";
    const shown = input.length > 30 ? input.slice(0, 27) + "..." : input;
    log(`  ${shown.padEnd(32)} ${err ? "THREW: " + err : (p || "(nothing)").slice(0, 62).padEnd(62)} ${ms}ms   ${why}`);
  }

  // ── P4 · COST ─────────────────────────────────────────────────────────────────────────────────
  log("\nP4 · COST at the grown index");
  log("-".repeat(78));
  const bench = ["pickleball", "quezon city gym saturday", "yoga studio with showers and parking tomorrow"];
  for (const q of bench) {
    const t = Date.now();
    for (let i = 0; i < 2000; i++) await run2(q);
    const per = (Date.now() - t) / 2000;
    log(`  ${q.padEnd(46)} ${per.toFixed(4)} ms/query  (index=${Router2.INDEX.length} terms)`);
  }
  log("");

  require("fs").writeFileSync(require("path").join(__dirname, "edge-cases-log.txt"), out.join("\n") + "\n");
  console.log("wrote edge-cases-log.txt");
})();
