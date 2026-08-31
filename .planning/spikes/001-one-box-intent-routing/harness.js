/* Spike 001 — the scored harness + forensic log.
 *
 *   node harness.js            run the corpus offline (no network), print the scored table
 *   node harness.js --live     also exercise stage 5 against the real Photon API
 *
 * Writes `run-log.json` — every case, its matches, its emitted params, the stage trace and the
 * per-case wall time. The verdict in README.md is read off this file, not off the terminal.
 */
"use strict";
require("./data.js");
const Router = require("./router.js");
const { CORPUS, NOW } = require("./corpus.js");

const LIVE = process.argv.includes("--live");

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function grade(actual, c, suggestions) {
  const missing = [];
  const wrong = [];
  for (const [k, v] of Object.entries(c.expect || {})) {
    if (!(k in actual)) missing.push(k);
    else if (!eq(actual[k], v)) wrong.push(`${k}=${JSON.stringify(actual[k])} want ${JSON.stringify(v)}`);
  }
  const present = (c.expectAbsent || []).filter((k) => k in actual);
  const extra = Object.keys(actual).filter(
    (k) => !(k in (c.expect || {})) && !["lat", "lng", "placeKind"].includes(k),
  );
  const sugWant = c.expectSuggestion;
  const sugGot = (suggestions || []).map((s) => s.value);
  const sugMissing = sugWant && !sugGot.includes(sugWant) ? sugWant : null;
  return {
    pass: !missing.length && !wrong.length && !present.length && !sugMissing,
    missing, wrong, present, extra, sugMissing, sugGot,
  };
}

(async () => {
  const geocode = LIVE ? Router.photonGeocoder(globalThis.fetch) : null;
  const rows = [];
  let pass = 0;
  const t0 = Date.now();

  for (const c of CORPUS) {
    const r = await Router.route(c.input, { now: NOW, geocode });
    const g = grade(r.params, c, r.suggestions);
    if (g.pass) pass++;
    rows.push({
      input: c.input,
      note: c.note || null,
      params: r.params,
      matches: r.matches.map((m) => `${m.stage}:${m.kind}=${m.value}${m.via ? ` (${m.via})` : ""}`),
      suggestions: (r.suggestions || []).map((m) => `${m.stage}:${m.kind}=${m.value} (${m.via})`),
      residue: r.residue,
      trace: r.trace,
      ms: r.ms,
      grade: g,
    });
  }

  const totalMs = Date.now() - t0;

  // ── table ───────────────────────────────────────────────────────────────────────────────────
  const w = (s, n) => String(s === "" ? "(empty)" : s).slice(0, n).padEnd(n);
  console.log("");
  console.log(`Spike 001 — one-box intent routing.  clock=${NOW.toISOString()}  mode=${LIVE ? "LIVE" : "offline"}`);
  console.log("=".repeat(118));
  console.log(w("input", 34) + w("→ params", 62) + w("stages", 14) + "ok");
  console.log("-".repeat(118));
  for (const r of rows) {
    const p = Object.entries(r.params)
      .filter(([k]) => !["lat", "lng", "placeKind"].includes(k))
      .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join("+") : v}`)
      .join(" ") || "(default browse)";
    const stages = [...new Set(r.matches.map((m) => m.split(":")[0]))].join(",") || "-";
    console.log(w(r.input, 34) + w(p, 62) + w(stages, 14) + (r.grade.pass ? "PASS" : "FAIL"));
    if (r.suggestions.length) console.log("".padEnd(34) + "  ? suggest: " + r.suggestions.join(", "));
    if (!r.grade.pass) {
      if (r.grade.missing.length) console.log("".padEnd(34) + "  ! missing: " + r.grade.missing.join(", "));
      if (r.grade.wrong.length) console.log("".padEnd(34) + "  ! wrong:   " + r.grade.wrong.join("; "));
      if (r.grade.present.length) console.log("".padEnd(34) + "  ! invented:" + r.grade.present.join(", "));
      if (r.grade.sugMissing) console.log("".padEnd(34) + "  ! no suggestion for: " + r.grade.sugMissing);
    }
  }
  console.log("-".repeat(118));

  // ── stage histogram: WHERE does intent actually get resolved? ────────────────────────────────
  const stageHits = {};
  rows.forEach((r) => r.matches.forEach((m) => { const s = m.split(":")[0]; stageHits[s] = (stageHits[s] || 0) + 1; }));
  const reachedResidue = rows.filter((r) => r.residue).length;

  console.log(`score      ${pass}/${CORPUS.length} (${Math.round((pass / CORPUS.length) * 100)}%)`);
  console.log(`latency    ${totalMs}ms total, ${(totalMs / CORPUS.length).toFixed(2)}ms/query mean, max ${Math.max(...rows.map((r) => r.ms))}ms`);
  console.log(`resolved   ${Object.entries(stageHits).sort().map(([k, v]) => `${k}:${v}`).join("  ")}`);
  console.log(`residue    ${reachedResidue}/${CORPUS.length} queries left text the closed set could not claim`);
  console.log(`geocoder   ${LIVE ? "live" : "not called"} — reached by ${rows.filter((r) => r.trace.some((t) => t.stage === "S5")).length} queries`);
  console.log("");

  require("fs").writeFileSync(
    require("path").join(__dirname, "run-log.json"),
    JSON.stringify({ ranAt: new Date().toISOString(), clock: NOW.toISOString(), mode: LIVE ? "live" : "offline", score: { pass, of: CORPUS.length }, totalMs, stageHits, rows }, null, 2),
  );
  console.log("wrote run-log.json");
})();
