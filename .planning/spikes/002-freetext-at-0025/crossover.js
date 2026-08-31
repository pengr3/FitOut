/* Spike 002 — where does the migration stop being optional?  `node crossover.js`
 *
 * `bench.js` produced absolute timings. Absolutes are the wrong unit for a scope decision: what the
 * PM needs is the DELTA over the query stage 1 ALREADY runs, and the row count at which that delta
 * stops being acceptable.
 *
 * TWO THINGS THE FIRST BENCH TAUGHT, both of which shape this one:
 *
 *   1. `LIMIT 21` hides the cost of a MATCHING term — the scan stops as soon as it has a page. The
 *      expensive query is the one that finds NOTHING, because nothing lets it stop early. So the
 *      only honest worst case is a zero-hit term, and that is all this script measures.
 *
 *   2. A zero-hit search is exactly when the D-53 relaxation ladder fires, and the ladder runs the
 *      search AGAIN, up to four more times. So the budget below is divided by 5: the real page cost
 *      of a bad query is five scans, not one.
 */
"use strict";
const postgres = require("../../../node_modules/postgres");
const { execFileSync } = require("child_process");
const path = require("path");

const sql = postgres("postgres://fitout:fitout@localhost:5432/fitout_spike", { max: 1, onnotice: () => {} });

const SCALES = [500, 2500, 5000, 10000, 15000, 25000, 50000];

/* The budget, stated before the numbers are seen so it cannot be fitted to them.
 *
 * 150 ms is the point at which a search feels sluggish rather than instant. Stage 1 is only part of
 * the page — stage 2 then runs a SEQUENTIAL per-candidate `getAvailability` loop whenever a date is
 * picked — so free text may not have the whole budget. Allow it a third: 50 ms of added DB time for
 * the whole PAGE, and a zero-result page runs the search up to 5 times through the relaxation
 * ladder. Hence 10 ms per scan. */
const PAGE_BUDGET_MS = 50;
const LADDER_RUNS = 5;
const PER_SCAN_BUDGET_MS = PAGE_BUDGET_MS / LADDER_RUNS;

const GATE = `
  FROM listing l
  JOIN "user" u ON u.id = l.host_id
  LEFT JOIN host_payout hp ON hp.user_id = u.id
  WHERE l.status = 'published'
    AND l.deleted_at IS NULL
    AND u.email_verified = true
    AND COALESCE(hp.payouts_enabled, false) = true
    AND EXISTS (SELECT 1 FROM operating_hours oh WHERE oh.listing_id = l.id)`;

const BASELINE = `SELECT l.id ${GATE} ORDER BY l.created_at DESC LIMIT 21`;
const WITH_Q = `SELECT l.id ${GATE} AND (l.title ILIKE $1 OR l.description ILIKE $1 OR l.city ILIKE $1 OR l.neighborhood ILIKE $1) ORDER BY l.created_at DESC LIMIT 21`;

async function one(text, args) {
  const rows = await sql.unsafe(`EXPLAIN (ANALYZE, FORMAT JSON) ${text}`, args);
  return rows[0]["QUERY PLAN"][0]["Execution Time"];
}

/* INTERLEAVED A/B, and the first run is why.
 *
 * Measuring all the baselines and then all the +q runs gave a non-monotonic baseline and two
 * NEGATIVE deltas — the surrounding gate's cost drifts between batches (its hash-join build side
 * grows with host count, and the machine is not quiet). Batch-vs-batch subtraction measures that
 * drift as much as the predicate.
 *
 * So each pair is run back to back and the DELTA is taken per pair, then medianed. Drift common to
 * both halves of a pair cancels, which is the only way a sub-millisecond predicate cost is
 * measurable at all on a laptop running Docker. */
async function pairedDelta(baseText, qText, qArgs, pairs = 15) {
  for (let i = 0; i < 3; i++) { await sql.unsafe(baseText); await sql.unsafe(qText, qArgs); }
  const base = [], withQ = [], deltas = [];
  for (let i = 0; i < pairs; i++) {
    const b = await one(baseText, []);
    const q = await one(qText, qArgs);
    base.push(b); withQ.push(q); deltas.push(q - b);
  }
  const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
  return { base: med(base), withQ: med(withQ), delta: med(deltas) };
}

(async () => {
  const rows = [];
  for (const n of SCALES) {
    process.stdout.write(`  seeding ${n}... `);
    const script = execFileSync("node", [path.join(__dirname, "seed.js"), String(n)], { maxBuffer: 1 << 29, encoding: "utf8" });
    execFileSync("docker", ["exec", "-i", "fitout-db-1", "psql", "-U", "fitout", "-d", "fitout_spike", "-q", "-v", "ON_ERROR_STOP=1"],
      { input: script, maxBuffer: 1 << 29 });
    const [{ count }] = await sql`SELECT count(*)::int FROM listing WHERE status='published'`;

    const { base, withQ, delta } = await pairedDelta(BASELINE, WITH_Q, ["%zzzqqnotpresent%"]);
    rows.push({ n, published: count, base: +base.toFixed(3), withQ: +withQ.toFixed(3), delta: +delta.toFixed(3), page: +(delta * LADDER_RUNS).toFixed(1) });
    console.log(`${count} published   baseline ${base.toFixed(2)}ms   +q ${withQ.toFixed(2)}ms   delta ${delta.toFixed(2)}ms`);
  }

  const w = (s, n) => String(s).padStart(n);
  console.log("\n" + "=".repeat(88));
  console.log(w("published", 11) + w("gate only", 12) + w("gate + q", 12) + w("added", 10) + w("x5 ladder", 12) + "   verdict");
  console.log("-".repeat(88));
  let crossed = null;
  for (const r of rows) {
    const ok = r.delta <= PER_SCAN_BUDGET_MS;
    if (!ok && !crossed) crossed = r;
    console.log(w(r.published, 11) + w(r.base.toFixed(2), 12) + w(r.withQ.toFixed(2), 12) +
      w(r.delta.toFixed(2), 10) + w(r.page.toFixed(0) + " ms", 12) + "   " + (ok ? "within budget" : "OVER BUDGET"));
  }
  console.log("=".repeat(88));
  console.log(`\nbudget: ${PER_SCAN_BUDGET_MS} ms added per scan (${PAGE_BUDGET_MS} ms page / ${LADDER_RUNS} relaxation runs)`);
  console.log(crossed
    ? `crossover: ILIKE leaves budget between ${rows[rows.indexOf(crossed) - 1].published} and ${crossed.published} published listings.`
    : `crossover: never reached within ${SCALES[SCALES.length - 1]} listings.`);

  require("fs").writeFileSync(path.join(__dirname, "crossover-log.json"),
    JSON.stringify({ ranAt: new Date().toISOString(), budget: { PAGE_BUDGET_MS, LADDER_RUNS, PER_SCAN_BUDGET_MS }, rows }, null, 2));
  console.log("wrote crossover-log.json");
  await sql.end();
})();
