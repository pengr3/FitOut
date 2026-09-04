/* Spike 003 follow-up — is `listing_location_geog_gist` actually used?
 *
 * probe.js measured the 10 km radius at 77.5 ms on `listing_status_idx` while the bbox ran in
 * 0.58 ms on `listing_location_gist`. Two claims are hiding in that: that the radius is slow, and
 * that the geography index the product created FOR THIS QUERY (drizzle/0007) is not chosen. Both
 * are worth confirming before either goes in a README.
 */
"use strict";
const postgres = require("../../../node_modules/postgres");
const sql = postgres("postgres://fitout:fitout@localhost:5432/fitout_spike", { max: 1, onnotice: () => {} });
const O = { lat: 14.55718, lng: 121.02638 };
const GATE = `FROM listing l WHERE l.status='published' AND l.deleted_at IS NULL`;
const dwithin = (km) => `ST_DWithin(l.location::geography, ST_SetSRID(ST_MakePoint(${O.lng},${O.lat}),4326)::geography, ${km*1000})`;

async function m(where, reps = 9) {
  const text = `SELECT count(*)::int n ${GATE} AND ${where}`;
  for (let i = 0; i < 3; i++) await sql.unsafe(text);
  const runs = [], idxs = [];
  for (let i = 0; i < reps; i++) {
    const p = (await sql.unsafe(`EXPLAIN (ANALYZE, FORMAT JSON) ${text}`))[0]["QUERY PLAN"][0];
    runs.push(p["Execution Time"]);
    const acc = []; (function wk(x){ if(x["Index Name"]) acc.push(x["Index Name"]); (x.Plans||[]).forEach(wk); })(p.Plan);
    idxs.push(acc.join("+") || "seq");
  }
  const [{ n }] = await sql.unsafe(text);
  return { n, med: +runs.sort((a,b)=>a-b)[Math.floor(reps/2)].toFixed(3), idx: [...new Set(idxs)].join(" | ") };
}

(async () => {
  const [{ n: total }] = await sql`SELECT count(*)::int n FROM listing WHERE status='published' AND deleted_at IS NULL`;
  console.log(`\n${total} published. Radius selectivity vs index choice (median of 9):\n`);
  const w=(s,n)=>String(s).padEnd(n), r=(s,n)=>String(s).padStart(n);
  console.log(w("predicate",26)+r("rows",7)+r("% of set",10)+r("median ms",12)+"  index chosen");
  for (const km of [0.5, 1, 2, 5, 10, 25]) {
    const x = await m(dwithin(km));
    console.log(w(`ST_DWithin ${km} km`,26)+r(x.n,7)+r(((x.n/total)*100).toFixed(0)+"%",10)+r(x.med,12)+"  "+x.idx);
  }
  console.log("\nSame predicate with seqscan disabled (does the geography index work at all?):");
  await sql.unsafe("SET enable_seqscan = off");
  for (const km of [10]) {
    const x = await m(dwithin(km));
    console.log(w(`ST_DWithin ${km} km`,26)+r(x.n,7)+r("",10)+r(x.med,12)+"  "+x.idx);
  }
  await sql.unsafe("RESET enable_seqscan");
  console.log("\nIndexes present on listing:");
  const idx = await sql`SELECT indexname FROM pg_indexes WHERE tablename='listing' ORDER BY indexname`;
  idx.forEach(i => console.log("   " + i.indexname));
  await sql.end();
})();
