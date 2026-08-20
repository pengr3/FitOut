// D-91 / TRUST-01 — THE POST-PAYMENT ADDRESS BOUNDARY, AS AN EXECUTABLE CONTRACT.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT IS ACTUALLY AT STAKE HERE, AND WHY IT IS NOT AN EXPANSION OF THE HOST'S PROMISE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `listing.show_exact_address` DEFAULTS TO FALSE (schema.ts:192), and `publicListing()` drops
// `addressLine1/2` + `postalCode` and fuzzes the coordinates for that case — the D-09 privacy rule.
// TRUST-01 wants the full address on the booking detail page, and a `requested` row can be created by
// anybody, so a naive "it's a booking page, show the street" would hand the host's doorstep to any
// visitor willing to submit a request.
//
// D-91 resolves it by reading what the host was ACTUALLY promised. The control in
// `host/listings/[id]/edit/wizard.tsx:878` says, in the host's own settings screen:
//
//     "Off by default — guests see an approximate area until they book."
//
// **Until they book.** Revealing the street to a booker on a confirmed (or derived-completed) booking is
// therefore the promise being KEPT, not widened. Revealing it on `requested`, on an `approved` hold
// nobody has paid for, on a `cancelled` booking or on a reversed payment is the promise being BROKEN —
// none of those is "booked" in the sense the sentence means.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE TABLE BELOW HAS TEN ROWS WHEN THE ENUM HAS SEVEN VALUES
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// 13-UI-SPEC § The Booking Detail Page enumerates TEN renders of one shell — `pending` splits into
// settling and not-completed, and `cancelled` splits into party-cancelled, lapsed-approval and
// payment-reversed. Those are the surfaces a booker can actually land on, and the ⚠ in D-91 is written
// against them ("`approved`-unpaid", "reversed") rather than against the enum.
//
// The function takes a DISPLAY STATUS, so several renders map onto one input — and that is exactly the
// property worth pinning: the boundary must be blind to which flavour of `cancelled` a page happens to
// be rendering, because a boundary with per-render exceptions is a boundary that leaks on the render
// nobody wrote a case for. Enumerating all ten and asserting through the mapping is what makes that
// falsifiable rather than assumed.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE FIXTURE ADDRESS LIVES HERE AND MUST NOT MOVE INTO `src/`
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `tests/design/site-contacts.test.ts`'s `ADDRESS` scan goes red on an address-shaped literal anywhere
// under `src/` until somebody writes an `EXCLUDED_ADDRESSES` row for it (13-UI-SPEC § Registry Safety).
// Example addresses belong in `e2e/` and `tests/` fixtures — which is here.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  bookedListingAddress,
  publicListing,
  type BookedAddressStatus,
  type BookedListingAddressInput,
  type PublicListingInput,
} from "@/lib/listing-public";
import { deriveDisplayStatus, type BookingDisplayStatus } from "@/components/booking/booking-status";

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE TWO UNIONS MUST BE THE SAME UNION — a COMPILE gate, not a runtime one
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// `listing-public.ts` declares its own status union rather than importing one from the component layer,
// following the module's own `ListingStatus` precedent (a pure lib must not depend on `src/components`).
// The cost of that choice is drift, and this is where it is paid: both directions are asserted, so
// neither union can gain or lose a value without `npx tsc --noEmit` failing in this file.
type StatusesAgreeForward = BookingDisplayStatus extends BookedAddressStatus ? true : false;
type StatusesAgreeBackward = BookedAddressStatus extends BookingDisplayStatus ? true : false;
const UNIONS_AGREE: [StatusesAgreeForward, StatusesAgreeBackward] = [true, true];

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/** The address half of a listing row, with the host's toggle in its DEFAULT (approximate) position. */
const ROW: BookedListingAddressInput = {
  addressLine1: "88 Kalayaan Avenue",
  addressLine2: "Unit 4B",
  postalCode: "1101",
  neighborhood: "Teachers Village",
  city: "Quezon City",
  region: "Metro Manila",
  country: "PH",
  // PostGIS axis order: x = longitude, y = latitude (RESEARCH Pitfall 1). Chosen with enough decimals
  // that the ~2dp coarsening is visible in the assertions below rather than a no-op.
  location: { x: 121.043611, y: 14.653889 },
  showExactAddress: false,
};

/** The same row widened to what `publicListing()` needs, so the two projections can be compared. */
function publicInput(row: BookedListingAddressInput): PublicListingInput {
  return {
    id: "listing-1",
    title: "Kalayaan Court",
    description: null,
    primarySpaceType: null,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    postalCode: row.postalCode,
    neighborhood: row.neighborhood,
    city: row.city,
    region: row.region,
    country: row.country,
    location: row.location,
    hourlyRateCents: 50000,
    dayRateCents: null,
    currency: "php",
    maxOccupancy: 8,
    status: "published",
    photos: [],
    amenities: [],
    activityTags: [],
  };
}

/** The address fields of a `PublicListing`, so the two shapes can be compared field for field. */
function publicAddressFields(row: BookedListingAddressInput) {
  const projected = publicListing(publicInput(row), { showExactAddress: row.showExactAddress });
  return {
    addressLine1: projected.addressLine1,
    addressLine2: projected.addressLine2,
    postalCode: projected.postalCode,
    neighborhood: projected.neighborhood,
    city: projected.city,
    region: projected.region,
    country: projected.country,
    lat: projected.lat,
    lng: projected.lng,
  };
}

/**
 * The same fields off a `BookedListingAddress`, dropping the two the public shape does not carry.
 *
 * `lines` and `exact` are this boundary's own additions — the composed display lines (which exist so no
 * call site ever names an address column) and the disclosure flag. They are excluded from the
 * field-for-field comparison and asserted separately, because comparing them against a projection that
 * has no such fields would be comparing nothing.
 */
function bookedAddressFields(row: BookedListingAddressInput, displayStatus: BookedAddressStatus) {
  const { exact: _exact, lines: _lines, ...fields } = bookedListingAddress(row, { displayStatus });
  return fields;
}

/**
 * 13-UI-SPEC § One shell, eight renders + § The status must state what it MEANS — the TEN renders a
 * booker can land on, each with the display status the page derives for it.
 *
 * `booked` is D-91's answer for that render, and it is written per RENDER rather than per enum value on
 * purpose: the ⚠ list names surfaces, and this column is where a reader checks the surface list against
 * the code rather than re-deriving it.
 */
const RENDERS: readonly {
  readonly render: string;
  readonly displayStatus: BookedAddressStatus;
  readonly booked: boolean;
}[] = [
  { render: "requested", displayStatus: "requested", booked: false },
  { render: "approved (unpaid hold)", displayStatus: "approved", booked: false },
  { render: "pending (settling)", displayStatus: "pending", booked: false },
  { render: "pending (checkout not completed)", displayStatus: "pending", booked: false },
  { render: "confirmed", displayStatus: "confirmed", booked: true },
  { render: "completed (derived, D-102)", displayStatus: "completed", booked: true },
  { render: "declined", displayStatus: "declined", booked: false },
  { render: "cancelled (party cancellation)", displayStatus: "cancelled", booked: false },
  { render: "cancelled (lapsed approval, D-97)", displayStatus: "cancelled", booked: false },
  { render: "cancelled (payment reversed, D-58/D-87)", displayStatus: "cancelled", booked: false },
];

describe("bookedListingAddress — the post-payment address boundary (D-91 / TRUST-01)", () => {
  it("(0) covers all ten renders, two of which are booked — the table is the requirement", () => {
    // The table above IS the assertion's population, so its shape is asserted before it is used. A row
    // silently deleted would shrink the population and every per-render check below would still pass.
    expect(RENDERS).toHaveLength(10);
    expect(RENDERS.filter((r) => r.booked)).toHaveLength(2);
    expect(RENDERS.filter((r) => !r.booked)).toHaveLength(8);
    expect(UNIONS_AGREE).toEqual([true, true]);
  });

  it("(1) reveals the exact street on EXACTLY the two booked renders, and on no other", () => {
    for (const { render, displayStatus, booked } of RENDERS) {
      const projected = bookedListingAddress(ROW, { displayStatus });

      if (booked) {
        expect(projected.addressLine1, `${render} should carry the street`).toBe(ROW.addressLine1);
        expect(projected.addressLine2, `${render} should carry the second line`).toBe(
          ROW.addressLine2,
        );
        expect(projected.postalCode, `${render} should carry the postal code`).toBe(ROW.postalCode);
        expect(projected.exact, `${render} is a booked render`).toBe(true);
      } else {
        // THE HOST-FACING PROMISE, STATED AS AN ABSENCE. "Approximate area until they book" — and none
        // of these eight is booked.
        expect(projected.addressLine1, `${render} must NOT carry the street`).toBeNull();
        expect(projected.addressLine2, `${render} must NOT carry the second line`).toBeNull();
        expect(projected.postalCode, `${render} must NOT carry the postal code`).toBeNull();
        expect(projected.exact, `${render} is not a booked render`).toBe(false);
      }

      // The coarse location is public on EVERY render — it is how a booker knows the general area, and
      // withholding it would be a different bug wearing this one's clothes.
      expect(projected.neighborhood).toBe(ROW.neighborhood);
      expect(projected.city).toBe(ROW.city);
    }
  });

  it("(2) fuzzes the point on the eight, and hands back the exact point on the two", () => {
    // The street is the headline, but the COORDINATE is the leak that survives a copy edit: a map pin
    // at the doorstep discloses the address whether or not the text does.
    for (const { render, displayStatus, booked } of RENDERS) {
      const projected = bookedListingAddress(ROW, { displayStatus });
      if (booked) {
        expect(projected.lat, `${render}`).toBe(ROW.location!.y);
        expect(projected.lng, `${render}`).toBe(ROW.location!.x);
      } else {
        expect(projected.lat, `${render}`).toBe(14.65);
        expect(projected.lng, `${render}`).toBe(121.04);
        expect(projected.lat, `${render}`).not.toBe(ROW.location!.y);
      }
    }
  });

  it("(3) on every NON-booked render it is field-for-field what publicListing() returns", () => {
    // THE STRONGEST FORM OF "no new disclosure": not "similar", not "also drops the street" — the same
    // nine values. It is also what prevents the two projections drifting: this module deliberately does
    // NOT refactor `publicListing` (the plan's own verification is that not one of its lines moves), so
    // the allow-list logic exists twice and this assertion is what keeps the copies honest.
    //
    // Asserted for BOTH positions of the host's toggle, because a host who opted IN is entitled to the
    // same treatment on a pre-booking surface that the public page already gives.
    for (const showExactAddress of [false, true]) {
      const row = { ...ROW, showExactAddress };
      const expected = publicAddressFields(row);
      for (const { render, displayStatus, booked } of RENDERS) {
        if (booked) continue;
        expect(
          bookedAddressFields(row, displayStatus),
          `${render} (showExactAddress=${showExactAddress}) diverged from the public projection`,
        ).toEqual(expected);
      }
    }
  });

  it("(4) IGNORES the host toggle on the two booked renders — 'until they book', not 'never'", () => {
    // The toggle's own sentence promises approximate *until they book*. Honouring it after the booking
    // would make the boundary a no-op for the default listing, which is every listing.
    for (const displayStatus of ["confirmed", "completed"] as const) {
      const off = bookedListingAddress({ ...ROW, showExactAddress: false }, { displayStatus });
      const on = bookedListingAddress({ ...ROW, showExactAddress: true }, { displayStatus });
      expect(off).toEqual(on);
      expect(off.addressLine1).toBe(ROW.addressLine1);
    }
  });

  it("(5) reads the DERIVED completed status, not a stored one (D-102 / the DB clock)", () => {
    // `completed` is never stored. It is derived from a `confirmed` row whose endsAt has passed, against
    // the POSTGRES clock — so this is the status the boundary must be fed, and feeding it the raw column
    // would mean a finished session silently lost its address.
    const endsAt = new Date("2026-08-19T10:00:00Z");
    const after = new Date("2026-08-19T10:00:01Z");
    const before = new Date("2026-08-19T09:59:59Z");

    expect(deriveDisplayStatus("confirmed", endsAt, after)).toBe("completed");
    expect(deriveDisplayStatus("confirmed", endsAt, before)).toBe("confirmed");

    // Both sides of the boundary instant keep the street — which is the point: the address does not
    // blink out when the session ends. The page is the booker's durable record.
    for (const now of [before, after]) {
      const displayStatus = deriveDisplayStatus("confirmed", endsAt, now);
      expect(bookedListingAddress(ROW, { displayStatus }).addressLine1).toBe(ROW.addressLine1);
    }
  });

  it("(5b) the COMPOSED LINES carry the street on the two and never on the eight", () => {
    // The lines are what a surface actually renders, so the boundary is only as good as they are: a
    // correct `addressLine1: null` beside a `lines` array built from the raw row would leak the street
    // to every one of the eight while every field assertion above stayed green.
    for (const { render, displayStatus, booked } of RENDERS) {
      const { lines } = bookedListingAddress(ROW, { displayStatus });
      const joined = lines.join(" | ");
      if (booked) {
        expect(lines[0], `${render}`).toBe("88 Kalayaan Avenue, Unit 4B");
        expect(joined, `${render}`).toContain(ROW.postalCode!);
      } else {
        expect(joined, `${render} leaked the street through its display lines`).not.toContain(
          ROW.addressLine1!,
        );
        expect(joined, `${render} leaked the second line`).not.toContain(ROW.addressLine2!);
        expect(joined, `${render} leaked the postal code`).not.toContain(ROW.postalCode!);
      }
      // The area line is on every render — and it is a LINE, never an empty string standing in for the
      // street that was withheld.
      expect(lines, `${render}`).toContain("Teachers Village, Quezon City, Metro Manila");
      for (const line of lines) expect(line.trim().length).toBeGreaterThan(0);
    }
  });

  it("(6) handles a row with nothing in it without inventing anything", () => {
    const empty: BookedListingAddressInput = {
      addressLine1: null,
      addressLine2: null,
      postalCode: null,
      neighborhood: null,
      city: null,
      region: null,
      country: null,
      location: null,
      showExactAddress: false,
    };
    for (const displayStatus of ["confirmed", "requested"] as const) {
      const projected = bookedListingAddress(empty, { displayStatus });
      expect(projected.addressLine1).toBeNull();
      expect(projected.lat).toBeNull();
      expect(projected.lng).toBeNull();
      // NO empty line, no lone comma, no placeholder — an empty array, so a caller rendering `lines`
      // renders no row at all rather than a row that says nothing.
      expect(projected.lines).toEqual([]);
    }
  });

  it("(7) is PURE — synchronous, non-mutating, and reaches no database", () => {
    // Purity is what makes this boundary auditable at all: an I/O-capable projection could be handed a
    // status by one caller and a row by another, and the two could disagree.
    expect(bookedListingAddress.constructor.name).toBe("Function");
    expect(bookedListingAddress.constructor.name).not.toBe("AsyncFunction");

    const before = JSON.parse(JSON.stringify(ROW));
    bookedListingAddress(ROW, { displayStatus: "confirmed" });
    expect(ROW, "the projection mutated its input").toEqual(before);

    // Same input, same output, twice — no hidden state.
    expect(bookedListingAddress(ROW, { displayStatus: "confirmed" })).toEqual(
      bookedListingAddress(ROW, { displayStatus: "confirmed" }),
    );

    // …and the module it lives in imports no database handle. Asserted over the source because an
    // import that is only used on one branch would never show up in a behavioural test.
    const source = readFileSync(resolve(process.cwd(), "src/lib/listing-public.ts"), "utf8");
    const importLines = source
      .split("\n")
      .filter((line) => /^\s*import\b/.test(line) || /^\s*(const|let)\s.*\brequire\(/.test(line));
    for (const line of importLines) {
      expect(line, "listing-public.ts must stay pure — no DB, no I/O").not.toMatch(
        /@\/lib\/db|drizzle-orm|node:fs|postgres/,
      );
    }
  });
});
