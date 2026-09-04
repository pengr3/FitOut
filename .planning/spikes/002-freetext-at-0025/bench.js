/* Spike 002 — the GATE-06 question, in numbers.  `node bench.js`
 *
 * THE QUESTION. Adding a free-text `q` to search is the one part of the new query model that might
 * need a schema migration, and v1.1's GATE-06 says `drizzle/` stays at 0025 — a migration inside a
 * phase plan is a scope alarm to raise explicitly, never absorbed. So the honest way to put it to
 * the PM is not "FTS is better", it is: *here is what each option costs, and here is the row count
 * at which the free one stops being acceptable.*
 *
 * THREE STRATEGIES, one of which is not currently allowed:
 *
 *   A · ILIKE        `%term%` across title/description/city/neighborhood. Zero migration.
 *                    Cannot use a btree index (leading wildcard), so it is a sequential scan.
 *   B · FTS, no index  `to_tsvector(...) @@ plainto_tsquery(...)` computed at query time. Zero
 *                    migration. Better matching (stemming, word boundaries) but MORE CPU per row
 *                    than ILIKE, because it builds a tsvector for every candidate row.
 *   C · FTS + GIN    the same predicate with a GIN expression index. **This is the migration.**
 *                    Measured here only to price the alarm — the index is created in the throwaway
 *                    spike database and never proposed for `drizzle/`.
 *
 * Every strategy runs inside the REAL stage-1 gate from `src/lib/search/query.ts` — published, not
 * deleted, host email-verified, payouts enabled, and an operating_hours row must exist. A free-text
 * benchmark against a naked table would measure a query this product never runs.
 */
"use strict";
const postgres = require("../../../node_modules/postgres");

const sql = postgres("postgres://fitout:fitout@localhost:5432/fitout_spike", { max: 1, onnotice: () => {} });

const SCALES = [50, 500, 5000, 25000];
const TERMS = [
  { q: "yoga", why: "common category word" },
  { q: "sunlit", why: "occasional brand adjective — the case only free text can serve" },
  { q: "ortigas", why: "a place, which the catalog gazetteer also answers" },
  { q: "pickleball court", why: "two words" },
  { q: "zzzqqnotpresent", why: "zero hits — the worst case: no early exit" },
];

const GATE = `
  FROM listing l
  JOIN "user" u ON u.id = l.host_id
  LEFT JOIN host_payout hp ON hp.user_id = u.id
  WHERE l.status = 'published'
    AND l.deleted_at IS NULL
    AND u.email_verified = true
    AND COALESCE(hp.payouts_enabled, false) = true
    AND EXISTS (SELECT 1 FROM operating_hours oh WHERE oh.listing_id = l.id)`;

const TSDOC = `to_tsvector('simple',
    coalesce(l.title,'') || ' ' || coalesce(l.description,'') || ' ' ||
    coalesce(l.city,'') || ' ' || coalesce(l.neighborhood,''))`;

const STRATEGIES = {
  A_ilike: (t) => ({
    text: `SELECT l.id ${GATE} AND (l.title ILIKE $1 OR l.description ILIKE $1 OR l.city ILIKE $1 OR l.neighborhood ILIKE $1) LIMIT 21`,
    args: [`%${t}%`],
  }),
  B_fts_noindex: (t) => ({
    text: `SELECT l.id ${GATE} AND ${TSDOC} @@ plainto_tsquery('simple', $1) LIMIT 21`,
    args: [t],
  }),
  C_fts_gin: (t) => ({
    text: `SELECT l.id ${GATE} AND ${TSDOC} @@ plainto_tsquery('simple', $1) LIMIT 21`,
    args: [t],
  }),
};

const pct = (a, p) => a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))];

async function seed(n) {
  const { execFileSync } = require("child_process");
  const script = execFileSync("node", [require("path").join(__dirname, "seed.js"), String(n)], {
    maxBuffer: 1 << 28, encoding: "utf8",
  });
  require("fs").writeFileSync(require("path").join(require("os").tmpdir(), "spike002.sql"), script);
  execFileSync("docker", ["exec", "-i", "fitout-db-1", "psql", "-U", "fitout", "-d", "fitout_spike", "-q", "-v", "ON_ERROR_STOP=1"],
    { input: script, maxBuffer: 1 << 28 });
}

async function timeIt(q, reps) {
  const times = [];
  for (let i = 0; i < 3; i++) await sql.unsafe(q.text, q.args); // warm
  for (let i = 0; i < reps; i++) {
    const t = process.hrtime.bigint();
    await sql.unsafe(q.text, q.args);
    times.push(Number(process.hrtime.bigint() - t) / 1e6);
  }
  return times;
}

async function planOf(q) {
  const rows = await sql.unsafe(`EXPLAIN (ANALYZE, FORMAT JSON) ${q.text}`, q.args);
  const plan = rows[0]["QUERY PLAN"][0];
  const nodes = [];
  (function walk(p) { nodes.push(p["Node Type"]); (p.Plans || []).forEach(walk); })(plan.Plan);
  return {
    execMs: plan["Execution Time"],
    planMs: plan["Planning Time"],
    scan: nodes.find((n) => /Seq Scan|Bitmap Heap Scan|Index Scan|Bitmap Index Scan/.test(n)) || nodes[0],
    usedIndex: nodes.some((n) => /Bitmap Index Scan|Index Scan/.test(n) === true && true) && nodes.includes("Bitmap Index Scan"),
  };
}

(async () => {
  const results = [];
  console.log("\nSpike 002 — free-text search at migration 0025");
  console.log("Real stage-1 gate applied (published + verified + payable + has hours). LIMIT 21.\n");

  for (const n of SCALES) {
    process.stdout.write(`seeding ${n} listings... `);
    await seed(n);
    const [{ count }] = await sql`SELECT count(*)::int FROM listing WHERE status='published'`;
    console.log(`${count} published`);

    for (const strat of Object.keys(STRATEGIES)) {
      if (strat === "C_fts_gin") {
        await sql.unsafe(`CREATE INDEX IF NOT EXISTS spike_listing_fts ON listing USING GIN (to_tsvector('simple',
          coalesce(title,'') || ' ' || coalesce(description,'') || ' ' ||
          coalesce(city,'') || ' ' || coalesce(neighborhood,'')))`);
        await sql.unsafe("ANALYZE listing");
      } else {
        await sql.unsafe("DROP INDEX IF EXISTS spike_listing_fts");
        await sql.unsafe("ANALYZE listing");
      }

      for (const t of TERMS) {
        const q = STRATEGIES[strat](t.q);
        const hits = (await sql.unsafe(q.text.replace("LIMIT 21", ""), q.args)).length;
        const times = await timeIt(q, 15);
        const plan = await planOf(q);
        results.push({
          n, count, strategy: strat, term: t.q, why: t.why, hits,
          p50: +pct(times, 0.5).toFixed(3), p95: +pct(times, 0.95).toFixed(3),
          execMs: +plan.execMs.toFixed(3), planMs: +plan.planMs.toFixed(3), scan: plan.scan,
        });
      }
    }
  }
  await sql.unsafe("DROP INDEX IF EXISTS spike_listing_fts");

  // ── report ──────────────────────────────────────────────────────────────────────────────────
  const w = (s, n) => String(s).padEnd(n);
  const r = (s, n) => String(s).padStart(n);
  console.log("\n" + "=".repeat(104));
  console.log(w("listings", 10) + w("strategy", 16) + w("term", 18) + r("hits", 6) + r("db ms", 10) + r("p50 ms", 9) + r("p95 ms", 9) + "  scan");
  console.log("-".repeat(104));
  let lastKey = "";
  for (const x of results) {
    const key = `${x.n}|${x.strategy}`;
    console.log(
      w(key === lastKey ? "" : x.n, 10) + w(key === lastKey ? "" : x.strategy, 16) +
      w(x.term, 18) + r(x.hits, 6) + r(x.execMs, 10) + r(x.p50, 9) + r(x.p95, 9) + "  " + x.scan,
    );
    lastKey = key;
  }
  console.log("=".repeat(104));

  // ── the number the PM actually needs ────────────────────────────────────────────────────────
  console.log("\nWorst-case DB time per strategy (the zero-hit term — no early exit):\n");
  console.log(w("listings", 10) + r("A ILIKE", 12) + r("B FTS", 12) + r("C FTS+GIN", 12) + "   A vs C");
  for (const n of SCALES) {
    const g = (s) => results.find((x) => x.n === n && x.strategy === s && x.term === "zzzqqnotpresent");
    const a = g("A_ilike"), b = g("B_fts_noindex"), c = g("C_fts_gin");
    console.log(w(n, 10) + r(a.execMs, 12) + r(b.execMs, 12) + r(c.execMs, 12) + `   ${(a.execMs / c.execMs).toFixed(1)}x`);
  }

  require("fs").writeFileSync(
    require("path").join(__dirname, "bench-log.json"),
    JSON.stringify({ ranAt: new Date().toISOString(), scales: SCALES, terms: TERMS, results }, null, 2),
  );
  console.log("\nwrote bench-log.json");
  await sql.end();
})();
