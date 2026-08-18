// THE PARSE GATE FOR THE SEARCHED WINDOW (plan 12-02 · D-59 #1 · T-12-02-PARAMTAMPER / T-12-02-FORMATMIX).
//
// `search-result-card.tsx` has always written `?date=YYYY-MM-DD&start=HH:mm&end=HH:mm` onto every listing
// link, and its own header has always said the purpose is "so the listing calendar can pre-open that
// day". Until this plan, nothing on the listing route read any of it: `start`/`end` were parsed ONLY
// behind `resume === "1"`, and `initialDate` was unconditionally venue-local today. Reading those params
// unconditionally is what D-59 #1 requires — and it walks straight into a live format collision on the
// same route, which is what most of this file is about.
//
// ⚠ THE COLLISION, STATED ONCE. `start` has two formats on `/listings/[id]`:
//
//     search card  →  start=17:00                          venue-local wall clock, on the hour
//     resume=1     →  start=2026-08-21T09:00:00.000Z       UTC ISO instant (slotSelectionSchema)
//
// Same param name, same route, two meanings. It was inert only because a searched window never carries
// `resume=1`. Cases (5a) and (5b) below assert the two schemas reject each other's format from BOTH
// directions, because a one-directional assertion would still be green the day someone "helpfully"
// widens `slotSelectionSchema` to accept `HH:mm` — the exact edit the interfaces block forbids.
//
// WHAT THIS FILE IS NOT. It is not a test of the listing page's SEEDING rules (which day is inside the
// horizon, whether the hours are actually free, whether the listing is bookable). Those are server
// decisions made against the read model in `(detail)/page.tsx` and asserted in
// `e2e/public-listing.spec.ts`. This file asserts one thing: what the schema turns an untrusted URL into.

import { describe, it, expect } from "vitest";
import {
  searchedWindowSchema,
  slotSelectionSchema,
  NO_SEARCHED_WINDOW,
} from "@/lib/validation/booking";

/** The schema never rejects a well-typed object — it degrades. Unwrap once so each case reads as data. */
function parseWindow(raw: Record<string, unknown>) {
  const res = searchedWindowSchema.safeParse(raw);
  expect(
    res.success,
    `searchedWindowSchema REJECTED ${JSON.stringify(raw)} instead of degrading to an empty window. A ` +
      `listing page must never 404, throw or empty because a link carried a malformed param ` +
      `(T-12-02-PARAMTAMPER) — fix the schema, not this assertion.`,
  ).toBe(true);
  return res.success ? res.data : NO_SEARCHED_WINDOW;
}

describe("searchedWindowSchema — the searched window is parsed as its OWN shape", () => {
  it("(1) a valid venue-local window round-trips, canonicalised", () => {
    const win = parseWindow({ date: "2026-08-21", start: "09:00", end: "11:00" });

    expect(win.date).toEqual({ year: 2026, month: 8, day: 21, iso: "2026-08-21" });
    expect(win.startHour).toBe(9);
    expect(win.endHour).toBe(11);

    // `date` is a CANONICAL literal rather than the raw string — the property `parsePickedDate` is
    // strict for in the first place, because the value reaches a `::date` cast on the search path.
    expect(win.date?.iso).toBe("2026-08-21");

    // The bare-hour form the card never writes but a hand-typed URL might.
    const bare = parseWindow({ date: "2026-08-21", start: "9", end: "11" });
    expect(bare.startHour).toBe(9);
    expect(bare.endHour).toBe(11);
  });

  it("(2) a half-past start is rejected, and it takes the whole window with it (D-22)", () => {
    const win = parseWindow({ date: "2026-08-21", start: "09:30", end: "11:00" });

    // The DAY survives — a booker who searched a Friday still gets Friday.
    expect(win.date?.iso).toBe("2026-08-21");
    // The WINDOW does not. Not "rounded to 9", not "kept as 11 alone": both hours go.
    expect(win.startHour).toBeNull();
    expect(win.endHour).toBeNull();

    // The mirror case, so the rule is not accidentally about `start` only.
    const endOffHour = parseWindow({ date: "2026-08-21", start: "09:00", end: "11:45" });
    expect(endOffHour.startHour).toBeNull();
    expect(endOffHour.endHour).toBeNull();
  });

  it("(3) a UTC ISO instant arriving in `start` is rejected — the venue-local slot is not an instant", () => {
    const win = parseWindow({
      date: "2026-08-21",
      start: "2026-08-21T09:00:00.000Z",
      end: "2026-08-21T11:00:00.000Z",
    });

    expect(
      win.startHour,
      "a UTC ISO instant was accepted into the venue-local HH:mm slot. That is RESEARCH Pitfall 4 " +
        "landing: 09:00Z is 5:00 PM in Manila, so the page would open the booker's window eight hours " +
        "from where they asked for it.",
    ).toBeNull();
    expect(win.endHour).toBeNull();
    // The date half of an ISO instant must not sneak through the date parser either.
    expect(parseWindow({ date: "2026-08-21T00:00:00.000Z" }).date).toBeNull();
  });

  it("(4) `end` not strictly after `start` discards the whole window", () => {
    for (const [start, end] of [
      ["11:00", "09:00"], // end before start
      ["11:00", "11:00"], // zero-length
    ] as const) {
      const win = parseWindow({ date: "2026-08-21", start, end });
      expect(win.startHour, `start=${start} end=${end} should have been discarded`).toBeNull();
      expect(win.endHour).toBeNull();
      expect(win.date?.iso, "the day still survives a bad window").toBe("2026-08-21");
    }

    // A PARTIAL window is discarded whole, for the same reason: a start with no end is not a window.
    const lone = parseWindow({ date: "2026-08-21", start: "09:00" });
    expect(lone.startHour).toBeNull();
    expect(lone.endHour).toBeNull();
  });

  it("(5) garbage yields NO window rather than a throw (T-12-02-PARAMTAMPER)", () => {
    // A well-formed-but-impossible day: the round-trip guard in `parsePickedDate` catches it.
    expect(parseWindow({ date: "2026-02-31" }).date).toBeNull();

    for (const date of ["", "not-a-date", "2026-8-21", "21-08-2026", "'; DROP TABLE listing;--"]) {
      const win = parseWindow({ date, start: "09:00", end: "11:00" });
      expect(win.date, `date=${JSON.stringify(date)} should not have parsed`).toBeNull();
      // The window is independent of the date's fate — the page decides what to do with a dayless window.
      expect(win.startHour).toBe(9);
    }

    // Absent params are the default browse case, and must be as quiet as a valid one.
    expect(parseWindow({})).toEqual(NO_SEARCHED_WINDOW);

    // A REPEATED param arrives as string[] from Next's searchParams. That fails `z.string()` — the one
    // input shape the schema genuinely rejects — so the caller falls back to NO_SEARCHED_WINDOW rather
    // than crashing the RSC. Asserted through safeParse directly, since `parseWindow` demands success.
    const repeated = searchedWindowSchema.safeParse({ date: ["2026-08-21", "2026-08-22"] });
    expect(repeated.success).toBe(false);
  });

  it("(5a) FORMAT COLLISION, direction 1: slotSelectionSchema REJECTS the searched window's HH:mm", () => {
    const res = slotSelectionSchema.safeParse({
      startUtc: "09:00",
      endUtc: "11:00",
      fullDay: false,
    });
    expect(
      res.success,
      "slotSelectionSchema accepted a venue-local HH:mm. Its contract is a UTC ISO instant " +
        "(z.string().datetime()) and the D-41 resume path depends on that — widening it to accept both " +
        "formats is explicitly forbidden (RESEARCH Pitfall 4). `resume=1` is the discriminator.",
    ).toBe(false);
  });

  it("(5b) FORMAT COLLISION, direction 2: searchedWindowSchema REJECTS the resume path's UTC instants", () => {
    const win = parseWindow({
      start: "2026-08-21T09:00:00.000Z",
      end: "2026-08-21T11:00:00.000Z",
    });
    expect(win.startHour).toBeNull();
    expect(win.endHour).toBeNull();

    // GUARD THE GUARD: both schemas must be capable of accepting SOMETHING, or the two rejections above
    // are green for the trivial reason that neither schema parses anything at all.
    expect(
      slotSelectionSchema.safeParse({
        startUtc: "2026-08-21T09:00:00.000Z",
        endUtc: "2026-08-21T11:00:00.000Z",
        fullDay: false,
      }).success,
    ).toBe(true);
    expect(parseWindow({ start: "09:00", end: "11:00" }).startHour).toBe(9);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — stated so the next reader under-trusts this file
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • WHETHER THE PAGE HONOURS THE WINDOW. Horizon bounds, the bookable gate, the open-capacity fork,
//     and "are those hours actually free" are all decided in `(detail)/page.tsx` against the read model.
//     `e2e/public-listing.spec.ts` asserts those against a real rendered page.
//   • TIMEZONE MATH. `startHour` is an integer in the venue's wall clock; nothing here turns it into an
//     instant. The instant is derived from the read model's own slot boundaries, never recomputed.
//   • THE RESUME PATH ITSELF. `slotSelectionSchema` is exercised here only as the OTHER side of the
//     format collision; `tests/validation/booking-schemas.test.ts` owns its own behaviour.
