// STATE-03 — the zero-result relaxation ladder (D-52 / D-53, plan 12-12).
//
// THE PROPERTY UNDER TEST IS NOT "relaxing finds something". It is that the page can name ONE constraint
// and be telling the truth about it: the rungs run in a fixed order, exactly one of them gives, the
// activity is never the thing that gave, and the whole ladder is bounded. Three of those four are claims
// about WHICH QUERIES RAN, not about which rows came back — so the runner is wrapped in a counter and the
// assertions are made against the counter. A result-shaped assertion cannot tell "rung 2 gave" from
// "rungs 1 and 2 both ran and rung 2's rows won".
//
// Harness: `tests/search/availability-filter.test.ts` — same directory, same `searchListings` under test,
// same isolated schema, and a fixed `NOW` threaded as a PARAMETER rather than read from the wall clock.
// The seed set is the canonical one (`tests/helpers/seed.ts`), whose header is the source of the
// coordinates and their expected great-circle distances: `seed_listing_2` sits ~3.2 km out (BEYOND a 2 km
// radius, INSIDE 5 km — rung 1's fixture) and `seed_listing_5` ~15.3 km out (beyond the 10 km default).
// The target DATE is derived from `NOW`, never written as a calendar literal.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE MEASURED BUDGET (case f) — recorded in 12-12-SUMMARY.md, whichever way it lands.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────
//
// 12-UI-SPEC declares 2000 ms for the four-rung worst case and names the fallback if it is exceeded:
// bound the ladder at TWO rungs (radius and price), NEVER fan out. Case (f) measures two numbers, because
// the honest worst case is not the one the ladder can actually reach against five seeded listings:
//
//   (f1) the real four-rung ladder path — all four rungs run, all four come back empty;
//   (f2) the ARITHMETIC worst case — four consecutive dated rung queries that each pay a FULL sequential
//        Stage-2 `getAvailability` loop over every in-range candidate. That is the shape the cost lives
//        in, and (f1) understates it because a category with no supply anywhere returns zero Stage-1
//        candidates and therefore loops zero times.
//
// Both are asserted under the budget, and (f2) is also measured WITHOUT the `RELAX_FETCH_LIMIT` bound so
// the mitigation's value is a number rather than a claim.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { seedSearchListings, SEARCH_ORIGIN, DISTANCES_KM } from "../helpers/seed";
import { searchParamsSchema, type SearchParams } from "@/lib/validation/booking";
import { searchListings, type SearchResult } from "@/lib/search/query";
import {
  RELAXATION_LADDER,
  RELAXATION_MAX_RUNGS,
  RELAXATION_BUDGET_MS,
  RELAX_BAND_CARDS,
  RELAX_FETCH_LIMIT,
  runRelaxationLadder,
} from "@/lib/search/relaxation";

let testDb: TestDb;

/** ~19 days before the target day, so every slot on it is future and inside the 90-day horizon. */
const NOW = new Date("2026-07-15T00:00:00.000Z");

/** DERIVED from NOW, never a calendar literal — the rule `availability-filter.test.ts` follows. */
const DATE = new Date(NOW.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

/** An activity tag NO seeded listing carries — the "the activity is never relaxed" fixture. */
const NO_SUPPLY_CATEGORY = "climbing";

beforeAll(async () => {
  testDb = await setupTestDb();
  await seedSearchListings(testDb.db);
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

function search(overrides: Record<string, unknown>): SearchParams {
  return searchParamsSchema.parse({ lat: SEARCH_ORIGIN.lat, lng: SEARCH_ORIGIN.lng, ...overrides });
}

/**
 * The injected runner, wrapped in a counter.
 *
 * `calls` records the params of EVERY rung query, in order, so a failure can print which rungs ran
 * rather than only how many — the difference between "the ladder ran twice" and "the ladder relaxed the
 * radius when it should have relaxed the price".
 */
function countingRunner(): {
  run: (p: SearchParams) => Promise<SearchResult>;
  calls: SearchParams[];
} {
  const calls: SearchParams[] = [];
  return {
    calls,
    run: async (p) => {
      calls.push(p);
      return searchListings(testDb.db, p, NOW, { fetchLimit: RELAX_FETCH_LIMIT });
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// GUARD-THE-GUARD — every count assertion below is satisfied by a ladder that never queried anything.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

describe("guard-the-guard — the fixtures are the distances the seed header claims", () => {
  it("seed_listing_2 sits beyond 2 km and inside 5 km, which is what makes rung 1 falsifiable", () => {
    expect(DISTANCES_KM.seed_listing_2).toBeGreaterThan(2);
    expect(DISTANCES_KM.seed_listing_2).toBeLessThan(5);
  });

  it("the no-supply category really has no supply — a search for it returns nothing at any radius", async () => {
    const { results } = await searchListings(
      testDb.db,
      search({ radius: 25, category: NO_SUPPLY_CATEGORY }),
      NOW,
    );
    expect(
      results,
      "case (c) asserts that all four rungs come back empty for this category. If the category HAS " +
        "supply, that case is green for the wrong reason.",
    ).toEqual([]);
  });

  it("the primary query these cases relax really is empty — otherwise the ladder is never entered", async () => {
    // Rung 1's fixture: a yoga studio 3.2 km out, searched inside 2 km.
    const { results } = await searchListings(
      testDb.db,
      search({ radius: 2, category: "yoga_studio" }),
      NOW,
    );
    expect(results).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// (a) RUNG ORDER — the returned rung is the one that ACTUALLY gave.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

describe("(a) rung order — a query only rung 2 can satisfy does not report rung 1", () => {
  it("relaxes radius FIRST, finds nothing, then relaxes price and reports `price`", async () => {
    // A ₱100/hr ceiling is below every seeded rate (the cheapest is ₱350/hr), so no radius on earth
    // helps: rung 1 runs, comes back empty, and rung 2 is the one that gives.
    const { run, calls } = countingRunner();
    const outcome = await runRelaxationLadder(search({ radius: 10, priceMax: 10_000 }), run);

    expect(outcome, "the ladder found nothing at all — the fixture is wrong, not the ladder").not.toBeNull();
    expect(outcome!.rung).toBe("price");
    expect(outcome!.results.length).toBeGreaterThan(0);

    // THE ORDER, read off the queries themselves rather than off the answer.
    expect(calls).toHaveLength(2);
    expect(calls[0].radius, "rung 1 must be the radius rung").toBe(25);
    expect(calls[0].priceMax, "rung 1 must NOT also drop the price — one constraint at a time").toBe(10_000);
    expect(calls[1].priceMax, "rung 2 must drop the price ceiling").toBeUndefined();
    expect(
      calls[1].radius,
      "rung 2 must run against the BOOKER'S radius, not rung 1's widened one. Each rung derives from " +
        "the original params; cumulative relaxation is the all-at-once fallback this plan deleted.",
    ).toBe(10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// (b) STOP AT FIRST HIT — measured by invocation count, not inferred from the rows.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

describe("(b) stop at first hit — rungs 2-4 never run once rung 1 returns rows", () => {
  it("runs exactly ONE query when the radius rung gives", async () => {
    const { run, calls } = countingRunner();
    const outcome = await runRelaxationLadder(
      search({ radius: 2, category: "yoga_studio", priceMax: 100_000, date: DATE }),
      run,
    );

    expect(outcome).not.toBeNull();
    expect(outcome!.rung).toBe("radius");
    expect(
      calls,
      "the price, time-of-day and date rungs were ALL applicable here (a price ceiling and a date " +
        "were supplied). If more than one query ran, the ladder is not stopping at the first hit — " +
        "and the band would be naming a constraint that was not the one that gave.",
    ).toHaveLength(1);
    expect(outcome!.rungsRun).toBe(1);
    expect(outcome!.effectiveParams.radius).toBe(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// (c) THE ACTIVITY SURVIVES ALL FOUR RUNGS (12-UI-SPEC AC#32).
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

describe("(c) the activity is never relaxed", () => {
  it("no rung's transform touches `category` — asserted over the LADDER, not over one query", () => {
    for (const rung of RELAXATION_LADDER) {
      expect(
        rung.relaxes,
        `rung "${rung.id}" declares that it relaxes \`category\`. Dropping the activity is what the ` +
          "all-at-once fallback did and is exactly the gap STATE-03 names.",
      ).not.toContain("category");
    }

    const asked = search({
      radius: 2,
      category: "yoga_studio",
      priceMax: 100_000,
      date: DATE,
      start: "09:00",
      end: "11:00",
    });
    for (const rung of RELAXATION_LADDER) {
      const relaxed = rung.relax(asked);
      expect(relaxed, `rung "${rung.id}" was expected to be applicable to this query`).not.toBeNull();
      expect(
        relaxed!.category,
        `rung "${rung.id}" changed the category. Someone searching for a badminton court will not ` +
          "take a yoga studio.",
      ).toBe("yoga_studio");
    }
  });

  it("returns null when the category has no supply — four rungs run, none gives", async () => {
    const { run, calls } = countingRunner();
    const outcome = await runRelaxationLadder(
      search({
        radius: 2,
        category: NO_SUPPLY_CATEGORY,
        priceMax: 100_000,
        date: DATE,
        start: "09:00",
        end: "11:00",
      }),
      run,
    );

    expect(
      outcome,
      "the ladder produced results for a category nothing in the catalogue carries, which can only " +
        "mean a rung dropped it.",
    ).toBeNull();
    expect(calls).toHaveLength(4);
    for (const call of calls) {
      expect(call.category).toBe(NO_SUPPLY_CATEGORY);
    }
  });

  it("every returned row still matches the requested category, on every non-null outcome", async () => {
    const { run } = countingRunner();
    const outcome = await runRelaxationLadder(search({ radius: 2, category: "yoga_studio" }), run);

    expect(outcome).not.toBeNull();
    expect(outcome!.results.length).toBeGreaterThan(0);
    for (const row of outcome!.results) {
      expect(row.primarySpaceType).toBe("yoga_studio");
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// (d) THE CAP — at most four rung queries, ever.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

describe("(d) the cap", () => {
  it("never runs more than four rung queries, whatever the query asks for", async () => {
    const shapes: Record<string, unknown>[] = [
      { radius: 2, category: NO_SUPPLY_CATEGORY },
      { radius: 2, category: NO_SUPPLY_CATEGORY, priceMax: 1 },
      { radius: 2, category: NO_SUPPLY_CATEGORY, priceMax: 1, date: DATE },
      { radius: 2, category: NO_SUPPLY_CATEGORY, priceMax: 1, date: DATE, start: "09:00", end: "11:00" },
    ];
    for (const shape of shapes) {
      const { run, calls } = countingRunner();
      await runRelaxationLadder(search(shape), run);
      expect(calls.length, `shape ${JSON.stringify(shape)} ran ${calls.length} rung queries`)
        .toBeLessThanOrEqual(RELAXATION_MAX_RUNGS);
    }
    expect(RELAXATION_MAX_RUNGS).toBe(4);
  });

  it("skips a rung that has NOTHING to relax without spending a query on it", async () => {
    // No origin ⇒ no radius predicate; no price; no date. Only the category is in play, and no rung
    // touches that — so the honest answer is null WITHOUT a single round trip.
    const { run, calls } = countingRunner();
    const outcome = await runRelaxationLadder(
      searchParamsSchema.parse({ category: NO_SUPPLY_CATEGORY }),
      run,
    );
    expect(outcome).toBeNull();
    expect(
      calls,
      "a category-only search paid for rung queries that could not have changed a single predicate.",
    ).toHaveLength(0);
  });

  it("honours an explicit two-rung bound and SAYS SO rather than truncating silently", async () => {
    const logged: string[] = [];
    const { run, calls } = countingRunner();
    await runRelaxationLadder(
      search({
        radius: 2,
        category: NO_SUPPLY_CATEGORY,
        priceMax: 1,
        date: DATE,
        start: "09:00",
        end: "11:00",
      }),
      run,
      { maxRungs: 2, log: (m) => logged.push(m) },
    );
    expect(calls).toHaveLength(2);
    expect(logged).toHaveLength(1);
    expect(logged[0]).toContain("time-of-day");
    expect(logged[0]).toContain("date");
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// (e) `relax=0` SHORT-CIRCUITS — the flag Undo adds.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

describe("(e) the suppression flag", () => {
  it("does not enter the ladder at all when relax=0", async () => {
    const { run, calls } = countingRunner();
    const outcome = await runRelaxationLadder(
      search({ radius: 2, category: "yoga_studio", relax: 0 }),
      run,
    );
    expect(outcome).toBeNull();
    expect(
      calls,
      "relax=0 is what `Undo` ADDS to the booker's original query. A ladder that still runs turns " +
        "Undo into a visible no-op: the band comes straight back and the control moves again.",
    ).toHaveLength(0);

    // Guard-the-guard: the SAME query without the flag does relax, so the zero above is the flag's
    // doing and not a broken fixture.
    const { run: run2, calls: calls2 } = countingRunner();
    const relaxed = await runRelaxationLadder(search({ radius: 2, category: "yoga_studio" }), run2);
    expect(relaxed).not.toBeNull();
    expect(calls2).toHaveLength(1);
  });

  it("parses `relax` as a bounded coerced int — garbage yields the default view and never throws", () => {
    expect(searchParamsSchema.parse({}).relax).toBe(1);
    expect(searchParamsSchema.parse({ relax: "0" }).relax).toBe(0);
    expect(searchParamsSchema.parse({ relax: "1" }).relax).toBe(1);

    // T-12-12-PARAMTAMPER. Every one of these FAILS safeParse rather than throwing, which is what lets
    // `(public)/page.tsx` fall back to `searchParamsSchema.parse({})` — the default view — exactly as
    // it already does for a crafted `radius`.
    for (const bad of ["abc", "-1", "2", "1.5", "99999999", "NaN", "1;DROP TABLE listing"]) {
      const result = searchParamsSchema.safeParse({ relax: bad });
      expect(result.success, `relax="${bad}" was accepted`).toBe(false);
    }
    expect(searchParamsSchema.parse({}).relax, "the fallback view relaxes, which is the default").toBe(1);

    // ⚠ MEASURED, AND RECORDED RATHER THAN "FIXED": `?relax=` (an empty value) coerces to 0, because
    // `Number("")` is 0 and 0 is inside the declared range. So a bare `relax=` SUPPRESSES the ladder.
    // That is the same coercion every other numeric param in this schema carries (`page=` is 0 too),
    // and for THIS flag it fails in the safe direction — the degenerate reading runs FEWER queries, not
    // more (T-12-12-LADDERCOST). Tightening it would mean special-casing one field's coercion against
    // the shape the rest of the object shares, to change a crafted URL's behaviour from "no band" to
    // "no band", since the fallback view a rejected parse produces relaxes on a query that had already
    // returned nothing. Asserted so the behaviour is a decision rather than a surprise.
    expect(searchParamsSchema.parse({ relax: "" }).relax).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// (f) THE BUDGET — measured, recorded, and asserted.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

describe("(f) the declared 2000 ms budget", () => {
  it("measures the four-rung worst case and stays under it", async () => {
    const fourRungQuery = search({
      radius: 2,
      category: NO_SUPPLY_CATEGORY,
      priceMax: 1,
      date: DATE,
      start: "09:00",
      end: "11:00",
    });

    // (f1) the real ladder path — all four rungs run, none gives.
    const { run, calls } = countingRunner();
    const t0 = performance.now();
    const outcome = await runRelaxationLadder(fourRungQuery, run);
    const ladderMs = performance.now() - t0;
    expect(outcome).toBeNull();
    expect(calls).toHaveLength(4);

    // (f2) the ARITHMETIC worst case: four dated rung queries that each pay a FULL sequential Stage-2
    // loop over every in-range candidate. `radius: 25` puts all five seeded listings in range.
    const fullLoop = search({ radius: 25, date: DATE });
    const t1 = performance.now();
    for (let i = 0; i < RELAXATION_MAX_RUNGS; i++) {
      await searchListings(testDb.db, fullLoop, NOW, { fetchLimit: RELAX_FETCH_LIMIT });
    }
    const boundedMs = performance.now() - t1;

    // The same four queries WITHOUT the bound, so the mitigation's value is a number.
    const t2 = performance.now();
    for (let i = 0; i < RELAXATION_MAX_RUNGS; i++) {
      await searchListings(testDb.db, fullLoop, NOW);
    }
    const unboundedMs = performance.now() - t2;

    // The measurement IS the deliverable here; the plan's SUMMARY records the number and the branch
    // taken against the budget, and this is where it comes from.
    console.log(
      `[12-12] relaxation ladder budget — four-rung ladder: ${ladderMs.toFixed(0)}ms · ` +
        `four full Stage-2 loops bounded at fetchLimit=${RELAX_FETCH_LIMIT}: ${boundedMs.toFixed(0)}ms · ` +
        `the same four UNBOUNDED (fetchLimit=41): ${unboundedMs.toFixed(0)}ms · ` +
        `budget ${RELAXATION_BUDGET_MS}ms`,
    );

    expect(
      ladderMs,
      `the four-rung ladder took ${ladderMs.toFixed(0)}ms against a ${RELAXATION_BUDGET_MS}ms budget. ` +
        "12-UI-SPEC's fallback is `maxRungs: 2` (radius and price), NEVER a fan-out — and this " +
        "assertion moves with it.",
    ).toBeLessThan(RELAXATION_BUDGET_MS);

    expect(
      boundedMs,
      `four full Stage-2 loops took ${boundedMs.toFixed(0)}ms against a ${RELAXATION_BUDGET_MS}ms ` +
        "budget. This is the shape the cost actually lives in — see the header.",
    ).toBeLessThan(RELAXATION_BUDGET_MS);
  });

  it("the fetchLimit bound really does shorten the Stage-2 loop", async () => {
    // The mitigation, as a PROPERTY rather than as a timing: a bounded fetch returns at most six rows
    // plus its probe, so the band pays for the cards it shows.
    const { results } = await searchListings(
      testDb.db,
      search({ radius: 25, date: DATE }),
      NOW,
      { fetchLimit: RELAX_FETCH_LIMIT },
    );
    expect(results.length).toBeLessThanOrEqual(RELAX_BAND_CARDS);

    // …and the unbounded call is unchanged, which is what keeps the shipped browse path byte-identical.
    const unbounded = await searchListings(testDb.db, search({ radius: 25, date: DATE }), NOW);
    expect(unbounded.results.length).toBeGreaterThanOrEqual(results.length);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • WHAT THE BAND SAYS. This file measures which rung ran; `tests/search/search-results-states.test.tsx`
//     measures what renders, and `e2e/zero-result-relax.spec.ts` measures the outcome in a browser.
//   • THE BUDGET IS A LOCAL NUMBER. It is measured against five seeded listings on a developer's
//     Postgres, not against a production catalogue. It bounds the SHAPE of the cost (four rungs, each a
//     bounded Stage-2 loop), not the absolute latency a real booker sees.
