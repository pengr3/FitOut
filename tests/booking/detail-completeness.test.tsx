// @vitest-environment jsdom

// TRUST-01 / BFLOW-08 — EVERY FACT IS ON THE ORDINARY DETAIL PAGE, AND THAT IS WHAT MAKES THE
// CONFIRMATION MOMENT SAFE TO DECAY.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS FILE EXISTS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// D-60 lets the post-payment moment be CONSUMED: the booker returns to `/bookings/{id}?paid=1`, sees the
// full confirmation screen, and the URL is rewritten so a refresh, a bookmark or a pasted link renders
// the ordinary detail page instead. The entire safety argument for that is one sentence — *nothing
// important may live ONLY in the moment; everything it states is repeated on the ordinary detail page.*
//
// A sentence in a planning document is not a guarantee. This file is the guarantee: it renders the
// confirmed detail with **no query parameter at all** and asserts each fact BFLOW-08 enumerates is
// present. Without it the moment could quietly become the only place a fact appears, and nothing in the
// repository would notice — least of all the moment's own tests, which would keep passing.
//
// It is also TRUST-01's per-status proof. The requirement's first clause is *"status plus what it
// MEANS"*, which is the clause most likely to be waved through in review because every branch already
// renders a status BADGE. A badge is a word; the sentence beside it is the requirement.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE HARNESS DRIVES THE REAL PAGE, AND IT HAS TO
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Every property here is a property of the PAGE and not of a component: which branch a row lands on,
// which facts that branch composes, and — for the D-94 boundary — which branches DO NOT mount the money
// statement. A component suite can assert none of those; it is handed the branch. So the async Server
// Component is awaited to a tree and rendered, with its three reads served by a table-keyed `db.select()`
// stub. The idiom is `tests/booking/partial-grant-notice.test.tsx`'s, including the reason it exists.
//
// ⚠ THE CLOCK IS A MOCK OF `readDbNow`, NOT A FAKE TIMER. The page has no JS clock read anywhere (the
// 07-06 boundary contract) — it threads ONE Postgres instant into every derivation — so the honest way
// to control time here is to control that reader. `vi.setSystemTime` would move a clock the page never
// looks at, and every date on the render would come out of the fixture instead, which is a test that
// proves the fixture.
//
// ⚠ AND THE THIRD-PARTY PROBE IS A MOCK WITH A DEFAULT OF null. `probeCheckoutSession` never raises and
// answers null on every unanswered path (no key, network fault, non-2xx, deadline) — which is the
// PRODUCTION default on a machine with no PayMongo key, and is the input D-96 turns on. `readPaymentState`
// is deliberately NOT mocked: it is the pure owner of the (booking status, session status) pairs, and a
// test that restated its four rows would be asserting its own copy of the discriminator.

import * as React from "react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { getTableName } from "drizzle-orm";

const getSession = vi.hoisted(() => vi.fn());
const dbState = vi.hoisted(() => ({ resolve: null as null | ((table: unknown) => unknown[]) }));
const clock = vi.hoisted(() => ({ now: new Date("2026-08-20T02:00:00.000Z") }));
const probe = vi.hoisted(() => ({ session: null as unknown }));

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT:${to}`);
  },
  // Three client leaves on these branches hold a router: the cancel dialog, the group button and the
  // pending poller. None of them is driven here; they must simply be able to mount.
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: (...args: unknown[]) => getSession(...args) } },
}));
// The three server-action modules the client leaves import. None is called; pulling the real
// `"use server"` modules into jsdom would drag the payments rail and the group writers in with them.
vi.mock("@/app/actions/cancel-booking", () => ({ cancelUnpaidHold: vi.fn() }));
vi.mock("@/app/actions/group", () => ({ createGroup: vi.fn() }));
vi.mock("@/app/actions/re-request", () => ({ reRequestSameWindow: vi.fn() }));
// THE PAGE'S ONE CLOCK — see the header for why this is mocked rather than the system time.
vi.mock("@/lib/booking/bookings-query", () => ({ readDbNow: async () => clock.now }));
// The lapse branch's courtesy availability read. An empty day resolves to `unavailable`, which is the
// deadline-free variant of `ExpiredApprovalState` and the one that needs no extra fixture.
vi.mock("@/lib/availability/read-model", () => ({
  getAvailability: async () => ({ slots: [] }),
}));
vi.mock("@/lib/group/rsvp", () => ({
  getOwnedGroupByBooking: async () => null,
  getHeadcount: async () => null,
}));
// PARTIAL mock: only the network call is replaced. `readPaymentState` stays real — see the header.
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

import { formatMoney } from "@/lib/money";
import { bookingReference } from "@/lib/booking/reference";
import { venueTzNote } from "@/lib/venue-time";
import { LADDER, rungBoundaries, quoteRefund } from "@/lib/payments/cancellation";
import { composeDeadlineLabel } from "@/lib/booking/when-label";
import BookingPage from "@/app/(app)/bookings/[id]/page";

afterEach(cleanup);

// ───────────────────────────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ───────────────────────────────────────────────────────────────────────────────────────────────────

const USER_ID = "usr_booker_1";
const LISTING_ID = "lst_1";
const TZ = "Asia/Manila";
const CITY = "Makati";

/** The frozen quote, and its two parts, which SUM to it — the positive match the itemisation needs. */
const SPACE_CENTS = 100_000;
const FEE_CENTS = 5_000;
const QUOTED_CENTS = SPACE_CENTS + FEE_CENTS;

const money = (cents: number) => formatMoney(cents, "php");

/**
 * The listing row, joined to its host, exactly as the page's own select shapes it.
 *
 * `showExactAddress` is FALSE on purpose. D-91's whole point is that a booked booking sees the street
 * even though the host chose "approximate" for the public page — so a fixture with the toggle ON would
 * make the address assertion below pass for the wrong reason, and would keep passing if the boundary
 * were deleted.
 */
const LISTING = {
  title: "Iron Yard Boxing",
  primarySpaceType: "gym",
  city: CITY,
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

/** Five days out, 10:00–11:00 venue-local. Comfortably above every rung on every tier. */
const FUTURE_START = new Date("2026-08-25T02:00:00.000Z");
const FUTURE_END = new Date("2026-08-25T03:00:00.000Z");
/** Five days back, for the DERIVED `completed` render (D-102 — never a stored status). */
const PAST_START = new Date("2026-08-15T02:00:00.000Z");
const PAST_END = new Date("2026-08-15T03:00:00.000Z");

type Booking = Record<string, unknown>;

function booking(over: Booking = {}): Booking {
  return {
    id: "bkg_1",
    listingId: LISTING_ID,
    bookerId: USER_ID,
    startsAt: FUTURE_START,
    endsAt: FUTURE_END,
    status: "confirmed",
    quotedTotalCents: QUOTED_CENTS,
    spacePriceCents: SPACE_CENTS,
    serviceFeeCents: FEE_CENTS,
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

const REFERENCE = bookingReference("bkg_1");

async function renderPage(row: Booking, search: Record<string, string> = {}) {
  dbState.resolve = (table) =>
    getTableName(table as never) === "booking" ? [row] : [{ ...LISTING }];
  const tree = await BookingPage({
    params: Promise.resolve({ id: String(row.id) }),
    searchParams: Promise.resolve(search),
  });
  return render(tree as React.ReactElement);
}

/** The whole document, whitespace-collapsed so an assertion is about a sentence and not about wrapping. */
function flat(container: HTMLElement): string {
  return (container.textContent ?? "").replace(/\s+/g, " ").trim();
}

beforeEach(() => {
  getSession.mockResolvedValue({ user: { id: USER_ID, email: "jane@example.com" } });
  clock.now = new Date("2026-08-20T02:00:00.000Z");
  probe.session = null;
  dbState.resolve = null;
});

// ───────────────────────────────────────────────────────────────────────────────────────────────────
// THE TEN RENDERS, as one table. Every case below iterates it, so a branch that stops rendering is a
// branch every assertion in this file loses at once rather than one it quietly stops visiting.
//
// It is a table and not eight `it()`s because the properties are per-render and identical: one `<h1>`,
// a meaning sentence, a reference, a trust block, and the D-94 money-statement boundary. Enumerating
// them as data is also what makes the COUNT assertions honest — 13-09 measured that a token ban stayed
// green over a real fifth trust signal and only an exact count caught it.
// ───────────────────────────────────────────────────────────────────────────────────────────────────

type Render = {
  readonly name: string;
  readonly row: Booking;
  readonly search?: Record<string, string>;
  /** Set when the probe must answer, for the two branches that ask it. */
  readonly session?: unknown;
  /** The moment the page's Postgres clock reports, when it must differ from the default. */
  readonly now?: Date;
  /** The `<h1>` this render must show. Retyped from the shipped copy, never imported. */
  readonly heading: string;
  /** A distinctive fragment of the ONE sentence saying what the status MEANS (TRUST-01). */
  readonly meaning: string;
  /** D-94: does this render mount `money-statement`? */
  readonly money: boolean;
};

const LIVE_HOLD_EXPIRY = new Date("2026-08-20T02:10:00.000Z"); // ten minutes past the default `now`

const RENDERS: readonly Render[] = [
  {
    name: "requested",
    row: booking({
      status: "requested",
      paymentId: null,
      bookingMode: "request",
      expiresAt: new Date("2026-08-21T02:00:00.000Z"),
    }),
    heading: "Request sent",
    meaning: "nothing is charged until they approve",
    money: false,
  },
  {
    name: "approved",
    row: booking({
      status: "approved",
      paymentId: null,
      bookingMode: "request",
      expiresAt: new Date("2026-08-21T02:00:00.000Z"),
    }),
    heading: "Your request was approved",
    meaning: "The host said yes.",
    money: false,
  },
  {
    name: "pending (settling)",
    row: booking({ status: "pending", paymentId: null, expiresAt: LIVE_HOLD_EXPIRY }),
    search: { paid: "1" },
    heading: "Payment received",
    // 13-07's recorded reading: this branch's specified sentence IS the money statement's two lines, so
    // rendering it a second time under the heading would put one sentence on the page twice.
    meaning: "Your payment reached us.",
    money: true,
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
    heading: "Your payment didn't go through",
    meaning: "This checkout didn't finish.",
    money: true,
  },
  {
    name: "confirmed",
    row: booking(),
    heading: "Booking confirmed",
    meaning: "This time is yours.",
    money: false,
  },
  {
    name: "completed (derived)",
    row: booking({ startsAt: PAST_START, endsAt: PAST_END }),
    heading: "This session is done",
    meaning: "This session is finished.",
    money: false,
  },
  {
    name: "declined",
    row: booking({ status: "declined", paymentId: null }),
    heading: "This request wasn't available",
    meaning: "The host couldn't take your booking.",
    money: false,
  },
  {
    name: "cancelled (party)",
    row: booking({
      status: "cancelled",
      cancelledBy: "booker",
      refundCents: 100_000,
    }),
    heading: "This booking was cancelled",
    meaning: "It's no longer held.",
    money: true,
  },
  {
    name: "cancelled (lapsed approval)",
    row: booking({
      status: "cancelled",
      paymentId: null,
      bookingMode: "request",
      checkoutSessionId: null,
    }),
    heading: "This approval expired",
    meaning: "we released the slot",
    money: false,
  },
  {
    name: "cancelled (reversed)",
    row: booking({ status: "cancelled", paymentId: null, checkoutSessionId: "cs_rev" }),
    session: { id: "cs_rev", status: "paid", sourceType: "card", paidAt: null },
    heading: "We couldn't complete this booking",
    meaning: "This time was taken before your payment landed.",
    money: true,
  },
];

async function drive(r: Render) {
  if (r.session !== undefined) probe.session = r.session;
  if (r.now) clock.now = r.now;
  return renderPage(r.row, r.search ?? {});
}

describe("TRUST-01 — the confirmed detail is complete with NO query parameter (BFLOW-08 / D-60)", () => {
  it("(1) states every fact the confirmation moment states, on a bare /bookings/{id}", async () => {
    const { container } = await renderPage(booking());
    const text = flat(container as unknown as HTMLElement);

    // ⚠ THE QUERY PARAMETER IS ABSENT, and that is the whole point of this case. `renderPage`'s
    // default `searchParams` is `{}`; a case that passed `?paid=1` would be asserting the moment.
    const detail = screen.getByTestId("booking-detail");
    expect(detail, "the ordinary detail shell did not render at all").toBeTruthy();

    // ── status, AND what it means ────────────────────────────────────────────────────────────────
    expect(text, "the status badge's word").toContain("Confirmed");
    expect(
      text,
      "TRUST-01's first clause: the status says what it MEANS, not only what it is. This is the " +
        "clause most likely to be waved through, because a badge already renders a word.",
    ).toContain("This time is yours. Show this page (or your email) when you arrive.");

    // ── the venue ────────────────────────────────────────────────────────────────────────────────
    expect(text, "the venue name").toContain(LISTING.title);

    // ── the FULL address (D-91: only on confirmed and derived-completed) ─────────────────────────
    expect(
      text,
      "the exact street is absent on a CONFIRMED booking. D-91 grants exactly this exception to the " +
        "D-09 privacy toggle — the host-facing control already promises 'guests see an approximate " +
        "area until they book' — and the fixture's toggle is deliberately OFF, so a pass here cannot " +
        "come from the listing being public.",
    ).toContain(LISTING.addressLine1);
    expect(text, "the postal code, which the boundary composes into the same lines").toContain(
      LISTING.postalCode,
    );

    // ── venue-local time WITH a named timezone ───────────────────────────────────────────────────
    expect(text, "the venue-local date").toContain("Tuesday, Aug 25, 2026");
    expect(text, "the venue-local window").toContain("10:00 AM – 11:00 AM");
    expect(
      text,
      "the NAMED timezone. A time with no zone beside it is the top failure mode of a booking app, " +
        "and `venueTzNote` is the one owner of this sentence.",
    ).toContain(venueTzNote(CITY, TZ));

    // ── the host ─────────────────────────────────────────────────────────────────────────────────
    expect(text, "the host's name — a booker arriving at a venue asks for a person").toContain(
      LISTING.hostFirstName,
    );

    // ── the ITEMISED total ───────────────────────────────────────────────────────────────────────
    expect(text, "the space cost line").toContain(money(SPACE_CENTS));
    expect(text, "the service fee line").toContain(money(FEE_CENTS));
    expect(text, "the frozen all-in total (D-49)").toContain(money(QUOTED_CENTS));
    for (const term of ["Space cost", "Service fee", "Total"]) {
      expect(text, `the itemisation's "${term}" row`).toContain(term);
    }

    // ── the cancellation deadline as a CONCRETE DATE, with today's refund AMOUNT ─────────────────
    //
    // Both halves derived from LADDER rather than typed: the label is the ladder's own top boundary
    // for this booking, rendered by the shared venue-local formatter, and the figure is `quoteRefund`'s
    // answer at the page's own instant. A hand-typed expectation here would keep passing after a rung
    // moved, which is the drift the whole disclosure apparatus exists to prevent.
    const topBoundary = rungBoundaries("standard", FUTURE_START)[0].boundary;
    expect(
      text,
      "the cancellation deadline is not a concrete venue-local date. A percentage with no date is a " +
        "policy the booker cannot act on.",
    ).toContain(composeDeadlineLabel(topBoundary, TZ, CITY));
    const today = quoteRefund({
      tier: "standard",
      spacePriceCents: SPACE_CENTS,
      serviceFeeCents: FEE_CENTS,
      startsAt: FUTURE_START,
      now: clock.now,
    });
    expect(today.totalRefundCents, "the fixture is not far enough out to sit on the top rung").toBe(
      SPACE_CENTS,
    );
    expect(
      text,
      "today's refund AMOUNT is absent. TRUST-01 asks for the deadline WITH the figure — a percentage " +
        "beside a date still leaves the booker doing the arithmetic that decides whether to cancel.",
    ).toContain(money(today.totalRefundCents));

    // ── the reference ────────────────────────────────────────────────────────────────────────────
    expect(screen.getByTestId("booking-reference").textContent, "TRUST-02's string").toBe(REFERENCE);

    // ── the support path (guard-open) ────────────────────────────────────────────────────────────
    //
    // ⚠ ASSERTED AS THE TRUST BLOCK'S PRESENCE, NOT AS A CONTROL. `SUPPORT_EMAIL` is null (D-64), so
    // `SupportPath` renders NOTHING today and a test that demanded a control would go red on the day
    // an operator fills the constant in — turning a correct configuration change into a failure. What
    // is asserted is that the block the guarded row lives inside is on the page, which is the half
    // that is this plan's to keep true. The other half is `tests/design/site-contacts.test.ts`.
    expect(screen.getByTestId("trust-block"), "TRUST-04's block (D-67)").toBeTruthy();
  });

  it("(2) renders the SAME facts inside the detail section, not merely somewhere on the page", async () => {
    // Scoped, because case (1) reads the whole document and would be satisfied by a fact that had
    // drifted into the shell, a toast or a stray fragment outside the section D-60's decay assertion
    // measures. `booking-detail` is the sibling that assertion names.
    await renderPage(booking());
    const detail = within(screen.getByTestId("booking-detail"));

    expect(detail.getByText(LISTING.title, { exact: false })).toBeTruthy();
    expect(detail.getByText(LISTING.addressLine1, { exact: false })).toBeTruthy();
    expect(detail.getByText(LISTING.hostFirstName, { exact: false })).toBeTruthy();
    expect(detail.getByTestId("booking-reference")).toBeTruthy();
    expect(detail.getByTestId("trust-block")).toBeTruthy();
  });
});

describe("TRUST-01 — every status states what it MEANS, and shows exactly one <h1>", () => {
  it("(3) declares ten renders, which is the number the status table specifies", () => {
    // Guard the guard, asserted first. Every case below iterates `RENDERS`, and a table that lost a
    // row would shrink every one of them into silence while reporting a clean pass — the shape 13-09
    // measured on its own closed-set claim and the reason that claim became a count.
    expect(RENDERS).toHaveLength(10);
    expect(new Set(RENDERS.map((r) => r.name)).size, "two renders share a name").toBe(10);
  });

  for (const r of RENDERS) {
    it(`(4·${r.name}) shows its heading, its meaning sentence, the reference and the trust block`, async () => {
      const { container } = await drive(r);
      const text = flat(container as unknown as HTMLElement);

      expect(text, `${r.name}: the shipped heading is not what rendered`).toContain(r.heading);
      expect(
        text,
        `${r.name}: TRUST-01's meaning sentence is absent. A status badge is a WORD; the sentence ` +
          "beside it is the requirement, and it is the clause a review waves through.",
      ).toContain(r.meaning);

      expect(
        screen.getByTestId("booking-reference").textContent,
        `${r.name}: TRUST-02 requires the reference on EVERY status — "every" is the requirement's own ` +
          "word, and two of these renders had none before plan 13-10.",
      ).toBe(REFERENCE);

      expect(
        screen.getAllByTestId("trust-block"),
        `${r.name}: TRUST-04's block is absent or duplicated. D-67 puts it on the states that look ` +
          "WRONG too, because trust matters most when something has.",
      ).toHaveLength(1);
    });

    it(`(5·${r.name}) renders EXACTLY one <h1>`, async () => {
      await drive(r);
      // A COUNT, not a presence check. `getByRole` throws on two matches, but reading the assertion as
      // a count is what says the property out loud: an outline with two document titles is as wrong as
      // one with none, and the second one arrives by a branch nesting a component that has its own.
      expect(
        screen.getAllByRole("heading", { level: 1 }),
        `${r.name}: this render does not have exactly one <h1>.`,
      ).toHaveLength(1);
    });
  }
});

describe("D-94 — the money statement mounts on exactly the four specified statuses", () => {
  for (const r of RENDERS) {
    it(`(6·${r.name}) ${r.money ? "mounts" : "does NOT mount"} money-statement`, async () => {
      await drive(r);
      const panels = screen.queryAllByTestId("money-statement");
      expect(
        panels,
        r.money
          ? `${r.name}: 13-UI-SPEC specifies a money sentence for this status and it did not render. ` +
              "STATE-06's whole argument is that one owner makes the sentence impossible to omit."
          : `${r.name}: a money statement rendered on a status that has NO specified sentence. D-94 ` +
              "says the component mounts only where a sentence is defined, and that an executor must " +
              "not invent a fifth — an invented one is an un-reviewed claim about somebody's money.",
      ).toHaveLength(r.money ? 1 : 0);
    });
  }

  it("(7) the four are exactly the four the copywriting contract names", async () => {
    // The closed-set half, as a NAMED SET rather than as ten independent booleans. Ten passing
    // booleans and a fifth status quietly gaining a sentence look identical from inside the loop above.
    const mounts = RENDERS.filter((r) => r.money).map((r) => r.name).sort();
    expect(mounts).toEqual(
      [
        "cancelled (party)",
        "cancelled (reversed)",
        "pending (not completed)",
        "pending (settling)",
      ].sort(),
    );
  });

  it("(8) a cancelled row with NO refund figure mounts none either, and says why", async () => {
    // The one case inside a mounting status that must NOT mount, and it is D-94 rather than an
    // omission: `refund_cents` is NULL on a hold nobody ever paid for, 13-UI-SPEC specifies a sentence
    // for the refund and the no-refund cases and for no third one, and writing a third would be
    // inventing the money claim D-94 forbids. The money FACT is still stated — as the panel's term.
    const { container } = await renderPage(
      booking({ status: "cancelled", cancelledBy: "booker", refundCents: null, paymentId: null }),
    );
    expect(screen.queryAllByTestId("money-statement")).toHaveLength(0);
    expect(
      flat(container as unknown as HTMLElement),
      'a hold nobody paid for must not carry a row labelled "Total"',
    ).toContain("Quoted total");
  });
});

describe("D-91 — the exact street is on the two BOOKED renders and on no other", () => {
  it("(9) reveals it on confirmed and derived-completed, and withholds it on the other eight", async () => {
    for (const r of RENDERS) {
      cleanup();
      const { container } = await drive(r);
      const text = flat(container as unknown as HTMLElement);
      const booked = r.name === "confirmed" || r.name === "completed (derived)";
      expect(
        text.includes(LISTING.addressLine1),
        booked
          ? `${r.name}: a booked render lost the exact street. D-91 grants this exception precisely ` +
              "for the renders where the host's own promise — 'an approximate area until they book' — " +
              "has been met."
          : `${r.name}: the exact street reached a render that is NOT booked in the sense the host was ` +
              "promised. D-91's ⚠ names requested, approved-unpaid, cancelled and reversed by name.",
      ).toBe(booked);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// 13-CONTEXT D-96 — WITH NO PROBE INFORMATION, NO COPY ASSERTS THAT A CHARGE OCCURRED
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// THE TWO ROWS BELOW ARE THE SAME ROW. `cancelled` + no `cancelled_by` + no `payment_id` + a real
// checkout session id is the signature of a REVERSED PAYMENT and of an ABANDONED HOLD that a later
// booker's stale-hold sweep flipped to `cancelled` (`availability/units.ts:487` / `:922`). 13-RESEARCH
// established there is NO row-level signal separating them; the provider is the only party that knows.
//
// So the fixtures differ in exactly one thing — what the probe says — and that is the point. When it
// answers `paid`, a charge is a fact and the copy may name the amount. When it answers nothing, the
// booker in front of us may never have been charged one centavo, and copy that says "You were charged
// ₱1,050.00" is false for them. This is the last place on `/bookings/**` where FitOut could state a
// money fact it has not verified, which is the whole point of D-69 and D-83.
describe("D-96 — the unanswered probe claims nothing about a charge", () => {
  const REVERSED_ROW = booking({
    status: "cancelled",
    paymentId: null,
    checkoutSessionId: "cs_x",
  });

  it("(10) with the probe SILENT, no amount appears and every money sentence is conditional", async () => {
    probe.session = null; // no key, network fault, non-2xx, or the 3s deadline — all answer null
    const { container } = await renderPage(REVERSED_ROW);
    const text = flat(container as unknown as HTMLElement);

    expect(
      screen.getByTestId("payment-state-reversed"),
      "the row still lands on the reversal surface: the booking IS cancelled and the time IS gone, " +
        "and both readings agree about that much.",
    ).toBeTruthy();

    expect(
      text,
      "THE DEFECT D-96 NAMES. With no probe information this row is indistinguishable from an " +
        "abandoned hold that was swept to cancelled, and that booker was never charged. An amount on " +
        "this render is a money fact FitOut has not verified.",
    ).not.toContain(money(QUOTED_CENTS));

    // The sentence must be true under BOTH readings: the booking ended, and IF anything was charged it
    // is coming back. Asserted as the conditional form, because that is the property — not as the
    // absence of one particular wording, which the next author would route around by rewording.
    expect(text, "the conditional money sentence").toContain(
      "If you were charged for this booking, that money is coming back to you.",
    );
    expect(
      text,
      "the by-hand branch's flat assertion of a charge must not appear on an unanswered probe",
    ).not.toContain("You were charged");

    // The meaning sentence may not assert a cause either: under the abandoned-hold reading nothing was
    // taken from anybody and no payment was ever in flight.
    expect(text, "the reversal-specific cause sentence").not.toContain(
      "This time was taken before your payment landed.",
    );
    expect(text).toContain("This booking was cancelled, so the time was released.");

    // …and it still carries the two things D-96 requires it to carry.
    expect(screen.getByTestId("booking-reference").textContent).toBe(REFERENCE);
    expect(screen.getByTestId("money-statement")).toBeTruthy();
  });

  it("(11) with the probe answering PAID on a by-hand rail, the charge IS named", async () => {
    // The complement, and the reason case (10) is about knowledge rather than about caution: once the
    // provider says the session was paid, a charge is a fact and refusing to name the amount would be
    // its own failure — the booker's bank app shows it and our screen would not.
    probe.session = { id: "cs_x", status: "paid", sourceType: "qrph", paidAt: null };
    const { container } = await renderPage(REVERSED_ROW);
    const text = flat(container as unknown as HTMLElement);

    expect(text).toContain(`You were charged ${money(QUOTED_CENTS)}`);
    expect(text).not.toContain("If you were charged for this booking");
  });

  it("(12) with the probe answering PAID on a refundable rail, the automatic branch names it too", async () => {
    probe.session = { id: "cs_x", status: "paid", sourceType: "card", paidAt: null };
    const { container } = await renderPage(REVERSED_ROW);
    const text = flat(container as unknown as HTMLElement);

    expect(text).toContain(money(QUOTED_CENTS));
    expect(text).not.toContain("If you were charged for this booking");
  });

  it("(13) the ABANDONED-HOLD reading of the same row reads truthfully end to end", async () => {
    // The row a stale-hold sweep produces, spelled out as its own fixture rather than left implicit:
    // `units.ts` flips an expired `pending` hold to `cancelled` and touches nothing else, so what is
    // left is exactly `REVERSED_ROW`. This case exists so the claim "the copy is true under BOTH
    // readings" is written down as a test rather than as a sentence in a comment.
    probe.session = null;
    const { container } = await renderPage(
      booking({
        status: "cancelled",
        paymentId: null,
        checkoutSessionId: "cs_swept",
        // A swept hold's `expires_at` is cleared when it goes terminal, exactly like a lapsed approval.
        expiresAt: null,
      }),
    );
    const text = flat(container as unknown as HTMLElement);

    // Nothing on this page may tell a booker who was never charged that they were.
    expect(text).not.toContain("You were charged");
    expect(text).not.toContain(money(QUOTED_CENTS));
    // The itemised panel is absent from this surface entirely — the reversal state renders no facts
    // `<dl>` — so there is no "Total" row to mislabel either. Asserted so a future widening of that
    // surface cannot quietly reintroduce the claim through the panel instead of through the sentence.
    expect(text).not.toContain("Total");
  });
});

describe("TRUST-03 — the disclosure is on the renders where cancelling is still possible", () => {
  it("(14) discloses concrete dates on a confirmed session that is still ahead", async () => {
    const { container } = await renderPage(booking());
    const text = flat(container as unknown as HTMLElement);
    // One line per LADDER rung, each naming an instant — derived here, never typed.
    for (const { boundary } of rungBoundaries("standard", FUTURE_START)) {
      expect(text).toContain(composeDeadlineLabel(boundary, TZ, CITY));
    }
    // And the rung count itself, so a disclosure that silently lost a rung is caught.
    expect(LADDER.standard.length, "the fixture's tier has more than one rung, or this proves little")
      .toBeGreaterThan(1);
  });

  it("(15) does NOT disclose one on a finished session, where there is nothing left to cancel", async () => {
    const { container } = await renderPage(booking({ startsAt: PAST_START, endsAt: PAST_END }));
    const text = flat(container as unknown as HTMLElement);
    expect(
      text,
      "a completed session disclosed a cancellation window. A policy on a booking that can no longer " +
        "be cancelled is a window that closed, and the cancel entry is correctly absent beside it.",
    ).not.toContain("Free cancellation until");
    expect(text).not.toContain("comes back.");
  });
});
