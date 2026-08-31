/* Spike 003 — bbox vs radius: which "where" is authoritative?  `node probe.js`
 *
 * MAP-02 says a booker can move or zoom the map and re-search the visible area. The shipped search
 * has a different "where": an origin plus a radius preset, enforced by
 * `ST_DWithin(location::geography, origin::geography, radius_m)`. When the map moves while the bar
 * still holds "Makati, within 10 km", two constraints disagree and something has to win.
 *
 * This probe measures the three things that decide it, rather than arguing them:
 *
 *   Q1  Does a bbox predicate need a NEW INDEX? (GATE-06 — a new index is a migration.)
 *   Q2  How do the three combination policies differ in what they RETURN?
 *   Q3  What happens to the D-53 relaxation ladder, whose FIRST RUNG IS `radius`, when a bbox is
 *       the real constraint? A band that says "we widened your search to 25 km" over an unchanged
 *       result set is the exact failure D-53 exists to prevent.
 */
"use strict";
const postgres = require("../../../node_modules/postgres");
const sql = postgres("postgres://fitout:fitout@localhost:5432/fitout_spike", { max: 1, onnotice: () => {} });

const GATE = `FROM listing l WHERE l.status='published' AND l.deleted_at IS NULL`;

// Makati, Poblacion — the densest place in the real catalogue.
const ORIGIN = { lat: 14.55718, lng: 121.02638 };
// A viewport panned NORTH-EAST toward Ortigas: it overlaps the 10 km circle but is not inside it.
const VIEWPORT = { minLng: 121.03, minLat: 14.56, maxLng: 121.12, maxLat: 14.65 };

const radiusSql = (km) =>
  `ST_DWithin(l.location::geography, ST_SetSRID(ST_MakePoint(${ORIGIN.lng}, ${ORIGIN.lat}),4326)::geography, ${km * 1000})`;
const bboxSql = (v = VIEWPORT) =>
  `l.location && ST_MakeEnvelope(${v.minLng}, ${v.minLat}, ${v.maxLng}, ${v.maxLat}, 4326)`;

/* MEDIAN OF 9, WARMED — and the first draft of this file did not do that, which produced a finding
 * that was not true. A single cold run timed the 10 km radius at 77.5 ms on `listing_status_idx`
 * and I nearly recorded "the radius query is slow and the geography index is unused". Warmed and
 * medianed it is 2.9 ms on `listing_location_geog_gist`, exactly the index drizzle/0007 created for
 * it. `index-probe.js` is the follow-up that settled it. Same lesson as spike 002: a single
 * measurement of a cold cache is a story, not a number. */
async function plan(where, reps = 9) {
  const text = `SELECT count(*)::int n ${GATE} AND ${where}`;
  for (let i = 0; i < 3; i++) await sql.unsafe(text);
  const runs = [], nodesSeen = [], idxSeen = [];
  for (let i = 0; i < reps; i++) {
    const p = (await sql.unsafe(`EXPLAIN (ANALYZE, FORMAT JSON) ${text}`))[0]["QUERY PLAN"][0];
    runs.push(p["Execution Time"]);
    const nodes = [], idx = [];
    (function walk(x) { nodes.push(x["Node Type"]); if (x["Index Name"]) idx.push(x["Index Name"]); (x.Plans || []).forEach(walk); })(p.Plan);
    nodesSeen.push(nodes.find((x) => /Scan/.test(x))); idxSeen.push(idx.join("+") || "(none)");
  }
  const [{ n }] = await sql.unsafe(text);
  return { n, ms: +runs.sort((a, b) => a - b)[Math.floor(reps / 2)].toFixed(3), scan: nodesSeen[0], index: [...new Set(idxSeen)][0] };
}

(async () => {
  const [{ n: total }] = await sql`SELECT count(*)::int n FROM listing WHERE status='published' AND deleted_at IS NULL`;
  console.log(`\nSpike 003 — bbox vs radius.  ${total} published listings in fitout_spike.\n`);

  // ── Q1 · does bbox need a new index? ─────────────────────────────────────────────────────────
  console.log("Q1 · WHICH INDEX SERVES WHICH PREDICATE (GATE-06: a new index is a migration)");
  console.log("-".repeat(96));
  const w = (s, n) => String(s).padEnd(n);
  const r = (s, n) => String(s).padStart(n);
  console.log(w("predicate", 34) + r("rows", 7) + r("ms", 9) + "  scan / index");
  for (const [label, where] of [
    ["radius 10 km (ST_DWithin)", radiusSql(10)],
    ["radius 25 km (ST_DWithin)", radiusSql(25)],
    ["bbox (&& ST_MakeEnvelope)", bboxSql()],
    ["bbox AND radius 10 km", `${bboxSql()} AND ${radiusSql(10)}`],
  ]) {
    const p = await plan(where);
    console.log(w(label, 34) + r(p.n, 7) + r(p.ms, 9) + "  " + p.scan + " / " + p.index);
  }

  // ── Q2 · the three policies, side by side ───────────────────────────────────────────────────
  console.log("\nQ2 · WHAT EACH POLICY RETURNS once the map has been panned away from the origin");
  console.log("-".repeat(96));
  const policies = {
    "A · bbox wins (radius dropped)": bboxSql(),
    "B · radius wins (map is a viewport only)": radiusSql(10),
    "D · intersection (both apply)": `${bboxSql()} AND ${radiusSql(10)}`,
  };
  for (const [label, where] of Object.entries(policies)) {
    const p = await plan(where);
    console.log(w(label, 44) + r(p.n + " results", 16) + r(p.ms + " ms", 12));
  }
  const onlyInBox = await plan(`${bboxSql()} AND NOT ${radiusSql(10)}`);
  const onlyInCircle = await plan(`${radiusSql(10)} AND NOT ${bboxSql()}`);
  console.log(`\n    visible on the map but OUTSIDE the radius : ${onlyInBox.n}`);
  console.log(`    inside the radius but OFF-SCREEN          : ${onlyInCircle.n}`);
  console.log(`    → policy B shows ${onlyInCircle.n} pins the booker cannot see and hides ${onlyInBox.n} they can.`);
  console.log(`    → policy D can return 0 while the map is full of listings — two constraints disagreeing,`);
  console.log(`      with nothing on screen to say which one emptied the page.`);

  // ── Q3 · the D-53 collision ──────────────────────────────────────────────────────────────────
  console.log("\nQ3 · THE RELAXATION LADDER. Rung 1 is `radius` (src/lib/search/relaxation.ts:75).");
  console.log("-".repeat(96));
  // A viewport small enough to return nothing — the state that fires the ladder.
  const EMPTY_VIEW = { minLng: 121.115, minLat: 14.742, maxLng: 121.125, maxLat: 14.748 };
  for (const [policy, mk] of [
    ["bbox governs", (km) => `${bboxSql(EMPTY_VIEW)}`],
    ["radius governs", (km) => radiusSql(km)],
  ]) {
    const before = await plan(mk(10));
    const after = await plan(mk(25));
    const moved = before.n !== after.n;
    console.log(
      w(policy, 20) + `rung 1 fires: radius 10 km -> 25 km   ` +
      r(`${before.n} -> ${after.n} results`, 24) + "   " + (moved ? "band tells the truth" : "BAND LIES — nothing changed"),
    );
  }
  console.log(`
    With a bbox governing, widening the radius changes NOTHING, because the radius is not the
    constraint that emptied the page. The band would still render "We widened your search to 25 km"
    beside an identical empty grid — and \`e2e/zero-result-relax.spec.ts\` compares the band's
    changed-constraint value against the control's rendered text, so it would stay GREEN while the
    page lies. The ladder needs a rung that relaxes what is actually binding.`);

  await sql.end();
})();
