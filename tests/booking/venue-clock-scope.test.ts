// The "show the timezone only when it VARIES" rule (quick 260824-ej2 · PM ruling 2026-08-24).
//
// WHAT THESE CASES ARE FOR. `src/lib/booking/venue-clock-scope.ts` decides whether a host LIST row
// names its venue's city. Getting it wrong is invisible in two opposite directions and neither one
// fails anything else in the suite:
//
//   • TOO EAGER — the suffix stays on every row, F-2's 357px When column stays, and the Approve
//     control on `/host/bookings` keeps sitting past its container's clip edge.
//   • TOO KEEN — the suffix disappears from a list whose rows are genuinely in two different zones,
//     which is the case Walk A of the Phase 14 UAT PASSED on, and passed on precisely BECAUSE the
//     city name on each line did the work. Two rows would then read as one clock while being two.
//
// So case (1) is Walk A, reproduced from the UAT log's own fixture and asserted against the two label
// strings that log records verbatim, and case (2) is the seeded catalogue that F-2 was measured on.
//
// EVERY ASSERTION HERE WAS WATCHED FAILING against the defect it names, with two probes run against
// `venue-clock-scope.ts` and reverted:
//
//   (a) THE RULE KEYED ON THE CITY INSTEAD OF THE CLOCK (`row.city !== first`) — the plausible wrong
//       definition, since the suffix renders a city. **2 failed / 5 passed**: case (6) on the
//       predicate (`expected true to be false`) and case (2) on what a host reads, printing all five
//       catalogue rows keeping a suffix they do not need —
//           +  "Sat, Jul 4, 10:00 AM – 12:00 PM (Quezon City time)"
//           -  "Sat, Jul 4, 10:00 AM – 12:00 PM"
//       ⚠ WALK A STAYED GREEN UNDER THAT PROBE, and that is the point of having both directions: a
//       definition can be wrong in exactly the way that keeps a passing walk passing.
//   (b) THE PROJECTOR ALWAYS OMITTING (`return () => null`) — the shape a call site produces by
//       computing "varies" inside its own map, against one row, where it is always false.
//       **2 failed / 5 passed**, case (1) first and by name:
//           +  "Mon, Aug 24, 8:00 AM – 10:00 AM"
//           -  "Mon, Aug 24, 8:00 AM – 10:00 AM (Makati time)"
//       with case (5) red on the same missing suffix. The predicate cases stayed green, which is the
//       other half of the split: "the rule is right" and "the rule is applied" are two claims.
//
// The composed strings are asserted through `composeWhenLabelShort` — the real formatter, unmodified —
// rather than against the projector's return value alone, because "returns the city" and "renders the
// suffix" are two different claims and only the second one is what a host reads.

import { describe, expect, it } from "vitest";

import { composeWhenLabelShort, type WhenLabelInput } from "@/lib/booking/when-label";
import { resolveListCity, venueClocksVary } from "@/lib/booking/venue-clock-scope";

/** U+2013 EN DASH — the range separator `when-label.ts` composes with, as an escape not a glyph. */
const DASH = "–";

/** The pricing-shape snapshots every label below shares: an ordinary hourly, exclusive booking. */
const HOURLY = {
  fullDay: false,
  openCapacity: false,
  spacePriceCents: 100_000,
  quotedTotalCents: 105_000,
  dayRateCents: 500_000,
} satisfies Omit<WhenLabelInput, "startsAt" | "endsAt" | "timezone" | "city">;

type Row = { timezone: string; city: string | null; startsAt: Date; endsAt: Date };

/** Compose the row exactly as a host list page does: the shared formatter, city from the projector. */
function labelsFor(rows: readonly Row[]): string[] {
  const listCity = resolveListCity(rows);
  return rows.map((r) =>
    composeWhenLabelShort({
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      timezone: r.timezone,
      city: listCity(r),
      ...HOURLY,
    }),
  );
}

describe("venueClocksVary — the predicate", () => {
  const makati = { timezone: "Asia/Manila", city: "Makati" };
  const quezon = { timezone: "Asia/Manila", city: "Quezon City" };
  const venice = { timezone: "America/Los_Angeles", city: "Los Angeles" };

  it("(6) is false for nothing, for one row, and for many rows on one clock", () => {
    expect(venueClocksVary([])).toBe(false);
    expect(venueClocksVary([venice])).toBe(false);
    // FIVE DIFFERENT CITIES, ONE CLOCK. This is the seeded catalogue, and it is the whole point of
    // keying the rule on the timezone: these rows all name the same instant as each other.
    expect(venueClocksVary([makati, quezon, makati, quezon, makati])).toBe(false);
  });

  it("(7) is true as soon as two rendered rows sit on different clocks", () => {
    expect(venueClocksVary([makati, venice])).toBe(true);
    expect(venueClocksVary([venice, makati])).toBe(true);
    // The differing row LAST, so a predicate that only ever compares the first two is red here.
    expect(venueClocksVary([makati, quezon, makati, venice])).toBe(true);
  });
});

describe("resolveListCity — what a host actually reads", () => {
  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // WALK A, from `14-UAT-LOG.md` § Walk A — the verdict this rule is not allowed to break.
  // ─────────────────────────────────────────────────────────────────────────────────────────────
  //
  // One host, two published listings in genuinely different zones, both with a session on the
  // venue's own local today. The run happened at 2026-08-23 22:11 UTC, a moment at which the two
  // venues were on DIFFERENT CALENDAR DATES — Monday 24 August in Makati, Sunday 23 August in Los
  // Angeles — so the two dates run BACKWARDS down one list headed *Today*. The PM read that as two
  // real sessions rather than as a bug, and said so because each line named its city.
  //
  // The instants below are the UTC bounds of those two venue-local windows: 08:00-10:00 Manila
  // (GMT+8) and 18:00-20:00 Los Angeles (GMT-7).
  const WALK_A: Row[] = [
    {
      timezone: "Asia/Manila",
      city: "Makati",
      startsAt: new Date("2026-08-24T00:00:00Z"),
      endsAt: new Date("2026-08-24T02:00:00Z"),
    },
    {
      timezone: "America/Los_Angeles",
      city: "Los Angeles",
      startsAt: new Date("2026-08-24T01:00:00Z"),
      endsAt: new Date("2026-08-24T03:00:00Z"),
    },
  ];

  it("(1) WALK A: two rows on two clocks BOTH still name their city, byte for byte", () => {
    expect(labelsFor(WALK_A)).toEqual([
      `Mon, Aug 24, 8:00 AM ${DASH} 10:00 AM (Makati time)`,
      `Sun, Aug 23, 6:00 PM ${DASH} 8:00 PM (Los Angeles time)`,
    ]);
  });

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // F-2, from `14-UAT-LOG.md` § F-2 — the defect this rule exists to remove.
  // ─────────────────────────────────────────────────────────────────────────────────────────────
  //
  // The seeded catalogue (`scripts/seed.ts:48-52`) is five Metro Manila listings in five DIFFERENT
  // cities and ONE timezone. Every one of those five rows names the same instant as every other, so
  // repeating a city on each of them disambiguates nothing and costs the widest column on the route.
  const CATALOGUE_CITIES = ["Makati", "Mandaluyong", "Pasig", "Quezon City", "Muntinlupa"];
  const CATALOGUE: Row[] = CATALOGUE_CITIES.map((city, i) => ({
    timezone: "Asia/Manila",
    city,
    startsAt: new Date(`2026-07-0${i + 1}T02:00:00Z`),
    endsAt: new Date(`2026-07-0${i + 1}T04:00:00Z`),
  }));

  it("(2) the seeded catalogue's five cities on ONE clock drop the suffix entirely", () => {
    const labels = labelsFor(CATALOGUE);
    expect(labels).toEqual([
      `Wed, Jul 1, 10:00 AM ${DASH} 12:00 PM`,
      `Thu, Jul 2, 10:00 AM ${DASH} 12:00 PM`,
      `Fri, Jul 3, 10:00 AM ${DASH} 12:00 PM`,
      `Sat, Jul 4, 10:00 AM ${DASH} 12:00 PM`,
      `Sun, Jul 5, 10:00 AM ${DASH} 12:00 PM`,
    ]);
    // Stated as its own clause too: no row may carry a dangling or partial zone phrase.
    for (const label of labels) expect(label).not.toContain(" time)");
  });

  it("(3) one row alone names no zone — there is no second clock to be confused with", () => {
    expect(labelsFor([CATALOGUE[0]])).toEqual([`Wed, Jul 1, 10:00 AM ${DASH} 12:00 PM`]);
  });

  it("(4) an empty list yields a usable projector rather than a throw", () => {
    const listCity = resolveListCity<Row>([]);
    expect(labelsFor([])).toEqual([]);
    expect(listCity(CATALOGUE[0])).toBeNull();
  });

  it("(5) in a varying list a row with no city stays bare, and its neighbours keep theirs", () => {
    const rows: Row[] = [
      WALK_A[0],
      { ...WALK_A[1], city: null },
    ];
    expect(labelsFor(rows)).toEqual([
      `Mon, Aug 24, 8:00 AM ${DASH} 10:00 AM (Makati time)`,
      // Never " ( time)" — the formatter's own omission rule, untouched by this ruling.
      `Sun, Aug 23, 6:00 PM ${DASH} 8:00 PM`,
    ]);
  });
});
