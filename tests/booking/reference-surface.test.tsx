// @vitest-environment jsdom

// TRUST-02 / D-78 — THE REFERENCE IS ON EVERY SURFACE, AND WHAT REACHES THE CLIPBOARD IS THE EXACT
// STRING.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS FILE EXISTS BESIDE `booking-reference.test.tsx`
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// That file is the COMPONENT's contract: given a reference, it renders it verbatim, in mono tabular
// figures, with a copy control that reports success as a value rather than as an absence of failure.
// Every one of those assertions is satisfied perfectly by a tree where the component is mounted
// NOWHERE — which is exactly the state two of the ten booking renders were in before plan 13-10.
//
// TRUST-02's requirement is a claim about SURFACES: *"present on EVERY status"*, plus the receipt, the
// confirmation moment and the group page. "Every" is the requirement's own word, and the falsifiable
// form of it is a render per surface with a count — not a source scan, because 13-07 measured that a
// source scan cannot see a token arriving through an import, and not a presence check on one branch,
// because the branch that loses it will be a different one.
//
// ⚠ TWO OF THE FOUR SURFACES IN THAT LIST DO NOT EXIST YET, AND THAT IS SCOPE RATHER THAN AN OMISSION.
// `/bookings/[id]/receipt` is D-74's net-new route and belongs to a later plan; the confirmation moment
// is D-60/D-61's and belongs to another. Neither is asserted here because neither is in the tree — a
// case that asserted them would be a case that cannot pass, and one that quietly skipped them would be
// the unfalsifiable list this phase has already been bitten by. What IS asserted is every surface that
// exists: the ten status renders and the group management page.
//
// ⚠ AND THE CLIPBOARD ASSERTION IS DRIVEN FROM A REAL PAGE RENDER, not from the component in isolation.
// The property is end to end — the deriver runs in the RSC, the finished string is threaded down
// through however many components sit between, and THAT is what a booker's clipboard receives. A
// component-level assertion proves the last hop of that chain and none of the earlier ones, and it is
// an earlier hop that would lower-case it, truncate it or hand it the booking id by mistake.

import * as React from "react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { getTableName } from "drizzle-orm";

const getSession = vi.hoisted(() => vi.fn());
const dbState = vi.hoisted(() => ({ resolve: null as null | ((table: unknown) => unknown[]) }));
const clock = vi.hoisted(() => ({ now: new Date("2026-08-20T02:00:00.000Z") }));
const probe = vi.hoisted(() => ({ session: null as unknown }));
const group = vi.hoisted(() => ({ owned: null as unknown, headcount: null as unknown }));
const toastSuccess = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT:${to}`);
  },
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { success: toastSuccess, error: toastError } }));
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: (...args: unknown[]) => getSession(...args) } },
}));
vi.mock("@/app/actions/cancel-booking", () => ({ cancelUnpaidHold: vi.fn() }));
vi.mock("@/app/actions/group", () => ({
  createGroup: vi.fn(),
  regenerateLink: vi.fn(),
  removeAttendee: vi.fn(),
}));
vi.mock("@/app/actions/re-request", () => ({ reRequestSameWindow: vi.fn() }));
vi.mock("@/lib/booking/bookings-query", () => ({ readDbNow: async () => clock.now }));
vi.mock("@/lib/availability/read-model", () => ({ getAvailability: async () => ({ slots: [] }) }));
vi.mock("@/lib/group/rsvp", () => ({
  getOwnedGroupByBooking: async () => group.owned,
  getHeadcount: async () => group.headcount,
  getRoster: async () => [],
}));
vi.mock("@/lib/payments/checkout-probe", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/payments/checkout-probe")>();
  return { ...actual, probeCheckoutSession: async () => probe.session };
});
vi.mock("@/lib/db", () => {
  type Chain = {
    from: (t: unknown) => Chain;
    innerJoin: () => Chain;
    where: () => Chain;
    orderBy: () => Chain;
    limit: () => Chain;
    then: (onOk: (rows: unknown[]) => unknown, onErr?: (e: unknown) => unknown) => Promise<unknown>;
  };
  const chain = (): Chain => {
    let table: unknown = null;
    const c: Chain = {
      from(t) {
        table = t;
        return c;
      },
      innerJoin: () => c,
      where: () => c,
      orderBy: () => c,
      limit: () => c,
      then: (onOk, onErr) =>
        Promise.resolve(dbState.resolve ? dbState.resolve(table) : []).then(onOk, onErr),
    };
    return c;
  };
  return { db: { select: () => chain() } };
});

import { bookingReference } from "@/lib/booking/reference";
import BookingPage from "@/app/(app)/bookings/[id]/page";
import GroupPage from "@/app/(app)/bookings/[id]/group/page";

afterEach(cleanup);

const USER_ID = "usr_booker_1";
const BOOKING_ID = "bkg_1";
const LISTING_ID = "lst_1";
const TZ = "Asia/Manila";

/**
 * THE EXPECTED STRING IS DERIVED BY THE SHIPPED DERIVER, NOT RETYPED.
 *
 * A hand-typed `FIT-XXXXXXXX` here would pass forever while the page rendered a DIFFERENT reference —
 * the test would be comparing two constants and the page would be comparing itself to nothing. What is
 * asserted is that the surface renders THIS booking id's reference, which is a claim only the deriver
 * can settle. (`booking-reference.test.tsx` takes the opposite and equally correct approach for the
 * COMPONENT, where a literal is right precisely because the component must not derive anything.)
 */
const REFERENCE = bookingReference(BOOKING_ID);

const LISTING = {
  title: "Iron Yard Boxing",
  primarySpaceType: "gym",
  city: "Makati",
  timezone: TZ,
  dayRateCents: 288_888,
  occupancyMode: "exclusive",
  addressLine1: "88 Kalayaan Avenue",
  addressLine2: null,
  postalCode: "1210",
  neighborhood: "Poblacion",
  region: "Metro Manila",
  country: "PH",
  location: { x: 121.0244, y: 14.5547 },
  showExactAddress: false,
  publishedAt: new Date("2026-06-01T00:00:00.000Z"),
  listingBookingMode: "instant",
  hostCreatedAt: new Date("2026-05-02T00:00:00.000Z"),
  hostFirstName: "Marisol",
};

const FUTURE_START = new Date("2026-08-25T02:00:00.000Z");
const FUTURE_END = new Date("2026-08-25T03:00:00.000Z");
const PAST_START = new Date("2026-08-15T02:00:00.000Z");
const PAST_END = new Date("2026-08-15T03:00:00.000Z");
const LIVE_HOLD_EXPIRY = new Date("2026-08-20T02:10:00.000Z");

type Booking = Record<string, unknown>;

function booking(over: Booking = {}): Booking {
  return {
    id: BOOKING_ID,
    listingId: LISTING_ID,
    bookerId: USER_ID,
    startsAt: FUTURE_START,
    endsAt: FUTURE_END,
    status: "confirmed",
    quotedTotalCents: 105_000,
    spacePriceCents: 100_000,
    serviceFeeCents: 5_000,
    cancellationPolicy: "standard",
    openCapacity: false,
    fullDay: false,
    currency: "php",
    expiresAt: null,
    refundCents: null,
    cancelledBy: null,
    bookingMode: "instant",
    paymentId: "pay_1",
    checkoutSessionId: null,
    ...over,
  };
}

/** The ten status renders, by the name TRUST-02's "every status" is a claim about. */
const RENDERS: readonly {
  name: string;
  row: Booking;
  search?: Record<string, string>;
  session?: unknown;
}[] = [
  { name: "requested", row: booking({ status: "requested", paymentId: null, bookingMode: "request" }) },
  { name: "approved", row: booking({ status: "approved", paymentId: null, bookingMode: "request" }) },
  {
    name: "pending (settling)",
    row: booking({ status: "pending", paymentId: null, expiresAt: LIVE_HOLD_EXPIRY }),
    search: { paid: "1" },
  },
  {
    name: "pending (not completed)",
    row: booking({
      status: "pending",
      paymentId: null,
      expiresAt: LIVE_HOLD_EXPIRY,
      checkoutSessionId: "cs_1",
    }),
    session: { id: "cs_1", status: "active", sourceType: null, paidAt: null },
  },
  { name: "confirmed", row: booking() },
  { name: "completed (derived)", row: booking({ startsAt: PAST_START, endsAt: PAST_END }) },
  { name: "declined", row: booking({ status: "declined", paymentId: null }) },
  {
    name: "cancelled (party)",
    row: booking({ status: "cancelled", cancelledBy: "booker", refundCents: 100_000 }),
  },
  {
    name: "cancelled (lapsed approval)",
    row: booking({ status: "cancelled", paymentId: null, bookingMode: "request" }),
  },
  {
    name: "cancelled (reversed)",
    row: booking({ status: "cancelled", paymentId: null, checkoutSessionId: "cs_rev" }),
    session: { id: "cs_rev", status: "paid", sourceType: "card", paidAt: null },
  },
];

async function renderDetail(
  row: Booking,
  search: Record<string, string> = {},
  session: unknown = null,
) {
  probe.session = session;
  dbState.resolve = (table) =>
    getTableName(table as never) === "booking" ? [row] : [{ ...LISTING }];
  const tree = await BookingPage({
    params: Promise.resolve({ id: BOOKING_ID }),
    searchParams: Promise.resolve(search),
  });
  return render(tree as React.ReactElement);
}

/** Install a clipboard, or remove it entirely when `writeText` is null (`share-link-box.tsx`'s trap). */
function setClipboard(writeText: ((text: string) => Promise<void>) | null): void {
  Object.defineProperty(navigator, "clipboard", {
    value: writeText === null ? undefined : { writeText },
    configurable: true,
    writable: true,
  });
}

beforeEach(() => {
  getSession.mockResolvedValue({ user: { id: USER_ID, email: "jane@example.com" } });
  clock.now = new Date("2026-08-20T02:00:00.000Z");
  probe.session = null;
  group.owned = null;
  group.headcount = null;
  dbState.resolve = null;
  toastSuccess.mockReset();
  toastError.mockReset();
  setClipboard(null);
});

describe("TRUST-02 — the reference renders on every surface that exists", () => {
  it("(1) declares ten status renders, which is what `every status` is a claim about", () => {
    // Guard the guard, first. Every case below iterates this table; a table that lost a row would
    // shrink the claim in silence while reporting a clean pass.
    expect(RENDERS).toHaveLength(10);
    expect(new Set(RENDERS.map((r) => r.name)).size, "two renders share a name").toBe(10);
  });

  for (const r of RENDERS) {
    it(`(2·${r.name}) renders EXACTLY one reference, and it is this booking's`, async () => {
      await renderDetail(r.row, r.search ?? {}, r.session ?? null);

      const nodes = screen.getAllByTestId("booking-reference");
      expect(
        nodes,
        `${r.name}: TRUST-02 requires the reference on EVERY status. A count rather than a presence ` +
          "check, because two of them is its own defect: a booker reading a page with the same token " +
          "twice does not know which one to quote, and the second one arrives when a branch renders " +
          "its own beside a shared component's.",
      ).toHaveLength(1);
      expect(
        nodes[0].textContent,
        `${r.name}: the rendered reference is not this booking id's. Retyping it here would have made ` +
          "this assertion compare two constants.",
      ).toBe(REFERENCE);
    });

    it(`(3·${r.name}) exposes the copy control by its accessible name`, async () => {
      await renderDetail(r.row, r.search ?? {}, r.session ?? null);
      // GATE-04's scope rule: the CONTROL stays on a role query and never gets a hook of its own, so
      // asserting it by name asserts the accessible name as a side effect. A reference a person cannot
      // take without transcribing it is the failure the control exists to remove.
      expect(
        screen.getAllByRole("button", { name: "Copy booking reference" }),
        `${r.name}: no copy control beside the reference.`,
      ).toHaveLength(1);
    });
  }

  it("(4) renders it on the group management page too", async () => {
    // The fourth surface in D-78's list that exists today. The other two — the receipt route and the
    // confirmation moment — are later plans' and are deliberately not asserted; see the header.
    group.owned = {
      groupId: "grp_1",
      bookingId: BOOKING_ID,
      accessToken: "tok_aaaaaaaaaaaaaaaaaaaa",
      capacitySnapshot: 8,
      voidedAt: null,
      organizerId: USER_ID,
      listingId: LISTING_ID,
      listingTitle: LISTING.title,
      timezone: TZ,
      city: LISTING.city,
      startsAt: FUTURE_START,
      endsAt: FUTURE_END,
      fullDay: false,
      spacePriceCents: 100_000,
      quotedTotalCents: 105_000,
      dayRateCents: 288_888,
      declaredPax: 4,
      extraHeadFee: 10_000,
    };
    group.headcount = { confirmed: 2, capacity: 8, full: false };
    dbState.resolve = () => [{ id: BOOKING_ID, bookerId: USER_ID, status: "confirmed" }];

    const tree = await GroupPage({ params: Promise.resolve({ id: BOOKING_ID }) });
    render(tree as React.ReactElement);

    const nodes = screen.getAllByTestId("booking-reference");
    expect(nodes, "the group page carries the reference (D-78's fourth surface)").toHaveLength(1);
    expect(nodes[0].textContent).toBe(REFERENCE);
  });
});

describe("TRUST-02 — what reaches the clipboard is the EXACT string, end to end", () => {
  it("(5) writes the reference the RSC derived — not lower-cased, not truncated, prefix intact", async () => {
    const written: string[] = [];
    setClipboard(async (text) => {
      written.push(text);
    });

    await renderDetail(booking());
    fireEvent.click(screen.getByRole("button", { name: "Copy booking reference" }));
    await waitFor(() => expect(written).toHaveLength(1));

    // ONE assertion, four properties, and they are asserted as an EQUALITY rather than as four
    // `not.toBe` checks: "not lower-cased" and "not truncated" are each satisfied by an infinite
    // number of wrong strings, and equality against the deriver's own output is the only form that
    // excludes all of them at once.
    expect(
      written[0],
      "the clipboard did not receive the exact reference the server derived. Phase 15's confirmation " +
        "mail interpolates this same string into its subject line (D-78), which is what makes the " +
        "reference in an inbox and the reference on this page the same token to a person comparing " +
        "them — so any normalisation anywhere on this path breaks a promise two phases apart.",
    ).toBe(REFERENCE);

    // And the four properties named individually anyway, because the failure message above is what a
    // future reader will be looking at and "expected X to be Y" on two similar strings is hard to read.
    expect(written[0].startsWith("FIT-"), "the FIT- prefix was stripped").toBe(true);
    expect(written[0], "the reference was lower-cased").toBe(written[0].toUpperCase());
    expect(written[0].length, "the reference was truncated or padded").toBe("FIT-XXXXXXXX".length);
    expect(written[0]).toMatch(/^FIT-[0-9A-Z]{8}$/);

    expect(toastSuccess).toHaveBeenCalledWith("Reference copied");
    expect(toastError, "a successful copy must not also report a failure").not.toHaveBeenCalled();
  });

  it("(6) reports a failure rather than a silent success when the clipboard is absent", async () => {
    // The `share-link-box.tsx:39-57` trap, asserted from the SURFACE this time: `await
    // navigator.clipboard?.writeText(x)` resolves to `undefined` when the API is missing, so a
    // `try/catch` around it sees no error and the page cheerfully announces a copy over an empty
    // clipboard. `booking-reference.test.tsx` pins this for the component; here it is pinned for the
    // composition, which is what a booker in an in-app webview actually meets.
    setClipboard(null);

    await renderDetail(booking());
    fireEvent.click(screen.getByRole("button", { name: "Copy booking reference" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    expect(toastSuccess, "a copy that never happened must not be announced as one").not.toHaveBeenCalled();
  });
});
