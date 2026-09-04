/* Spike 002 — match QUALITY, not just speed.  `node quality.js`
 *
 * `crossover.js` says ILIKE is free at FitOut's scale. Free and wrong is not a win, so this asks the
 * other half: does the zero-migration option actually FIND things?
 *
 * Three zero-migration candidates and one that needs the migration:
 *
 *   A1 · ILIKE phrase   `%pickleball court%` — the words must be ADJACENT and in order.
 *   A2 · ILIKE per-word every word ANDed independently across the concatenated document. Still zero
 *                       migration; fixes word order and intervening text.
 *   B  · FTS no index   stems, so `climbing` finds `climb` and `studios` finds `studio`.
 *   C  · FTS + GIN      identical matching to B, different cost. The migration.
 *
 * The probes are chosen so the strategies DISAGREE. A test set where everything scores the same
 * measures nothing.
 */
"use strict";
const postgres = require("../../../node_modules/postgres");
const { execFileSync } = require("child_process");
const path = require("path");
const sql = postgres("postgres://fitout:fitout@localhost:5432/fitout_spike", { max: 1, onnotice: () => {} });

const GATE = `FROM listing l WHERE l.status='published' AND l.deleted_at IS NULL`;
const DOC = `(coalesce(l.title,'') || ' ' || coalesce(l.description,'') || ' ' || coalesce(l.city,'') || ' ' || coalesce(l.neighborhood,''))`;
const TSDOC = `to_tsvector('english', ${DOC})`;

const strategies = {
  "A1 ILIKE phrase": (t) => ({ text: `SELECT count(*)::int n ${GATE} AND ${DOC} ILIKE $1`, args: [`%${t}%`] }),
  "A2 ILIKE per-word": (t) => {
    const words = t.split(/\s+/).filter(Boolean);
    const conds = words.map((_, i) => `${DOC} ILIKE $${i + 1}`).join(" AND ");
    return { text: `SELECT count(*)::int n ${GATE} AND (${conds})`, args: words.map((w) => `%${w}%`) };
  },
  "B  FTS no index": (t) => ({ text: `SELECT count(*)::int n ${GATE} AND ${TSDOC} @@ plainto_tsquery('english', $1)`, args: [t] }),
  "C  FTS + GIN": (t) => ({ text: `SELECT count(*)::int n ${GATE} AND ${TSDOC} @@ plainto_tsquery('english', $1)`, args: [t] }),
};

const PROBES = [
  { q: "pickleball court", expect: "should find 'Poblacion Pickleball Court'", want: "many" },
  { q: "court pickleball", expect: "SAME INTENT, words reversed", want: "many" },
  { q: "pickleball in ortigas", expect: "with a stop-word between the two content words", want: "some" },
  { q: "climbing", expect: "stem test — no listing says 'climbing'; some say 'climb'", want: "any" },
  { q: "studios", expect: "plural — catalogue says 'Studio'", want: "many" },
  { q: "showers lockers", expect: "two amenity words from different sentences", want: "many" },
  { q: "sunlit", expect: "brand adjective — free text is the ONLY way to reach it", want: "many" },
  { q: "yog", expect: "PREFIX of 'yoga' — substring matching finds it, word matching does not", want: "n/a" },
];

(async () => {
  // A mid-sized catalogue: big enough for real selectivity, small enough to re-seed quickly.
  process.stdout.write("seeding 5000... ");
  const script = execFileSync("node", [path.join(__dirname, "seed.js"), "5000"], { maxBuffer: 1 << 29, encoding: "utf8" });
  execFileSync("docker", ["exec", "-i", "fitout-db-1", "psql", "-U", "fitout", "-d", "fitout_spike", "-q", "-v", "ON_ERROR_STOP=1"],
    { input: script, maxBuffer: 1 << 29 });
  await sql.unsafe(`CREATE INDEX IF NOT EXISTS spike_listing_fts_en ON listing USING GIN (to_tsvector('english',
    coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(city,'') || ' ' || coalesce(neighborhood,'')))`);
  await sql.unsafe("ANALYZE listing");
  const [{ n: total }] = await sql`SELECT count(*)::int n FROM listing WHERE status='published'`;
  console.log(`${total} published\n`);

  const names = Object.keys(strategies);
  const w = (s, n) => String(s).padEnd(n);
  const r = (s, n) => String(s).padStart(n);
  console.log(w("query", 24) + names.map((k) => r(k, 20)).join("") + "   what it tests");
  console.log("-".repeat(24 + names.length * 20 + 40));

  const results = [];
  for (const p of PROBES) {
    const counts = {};
    for (const k of names) {
      const q = strategies[k](p.q);
      const [{ n }] = await sql.unsafe(q.text, q.args);
      counts[k] = n;
    }
    results.push({ query: p.q, expect: p.expect, counts });
    console.log(w(JSON.stringify(p.q), 24) + names.map((k) => r(counts[k], 20)).join("") + "   " + p.expect);
  }

  await sql.unsafe("DROP INDEX IF EXISTS spike_listing_fts_en");
  require("fs").writeFileSync(path.join(__dirname, "quality-log.json"),
    JSON.stringify({ ranAt: new Date().toISOString(), published: total, results }, null, 2));
  console.log("\nwrote quality-log.json");
  await sql.end();
})();
