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
/**
 * D-89 / D-103 — THE CHECKOUT-RETURN PARAMETER'S CONSUMER, GIVEN A FOOTPRINT SO IT CAN BE COUNTED.
 *
 * The real component renders `null` by contract — it removes a query string and shows nothing — so
 * WHERE IT IS MOUNTED is invisible to every render assertion in the repository. That is precisely the
 * property D-89 makes load-bearing (mounted on the pending branch it navigates a booker who has
 * already paid back to checkout, mid-webhook) and the one D-103 widens, so the mount point stops being
 * a claim in a comment and becomes a count. It also has to be mocked rather than mounted: it reads
 * `usePathname`, which the navigation mock above deliberately does not provide.
 */
vi.mock("@/components/booking/consume-paid-param", async () => {
  const react = await import("react");
  return {
    ConsumePaidParam: () =>
      react.createElement("span", { "data-testid": "consume-paid-param" }),
  };
});
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
// The three verified refund windows have ONE owner (D-83). Imported, never retyped: a hand-typed
// expectation here would keep passing after the module's copy moved, which is the drift it exists to stop.
import { ALL_RAILS_REFUND_WINDOW } from "@/lib/booking/refund-window";
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

/**
 * ⚠ THE HARNESS NOW SERVES THREE TABLES, NOT TWO (plan 13-18).
 *
 * The cancelled branch reads the `audit` table when — and only when — a refund figure is owed, to find
 * out whether the money was ever actually dispatched (`@/lib/booking/refund-dispatch`). Before this
 * parameter existed the table-keyed stub answered every non-`booking` read with the LISTING row, so
 * that probe would have come back non-empty for every render and quietly flipped the party-cancellation
 * case onto the by-hand copy. The default is `[]` — no operator alert — which is the ordinary world.
 *
 * ⚠ AND WHAT THIS CANNOT PROVE, said here rather than implied. The stub ignores the `where`, so these
 * renders assert BRANCH SELECTION and the copy that results, never the query. The query — its jsonb
 * booking scoping, its outcome filter and its four-action set — is proved against a real Postgres in
 * `tests/paymongo/instapay-refund.test.ts` and `tests/booking/cancellation.test.ts`, each with a
 * negative control that a hardwired `true` would fail. Two layers, each proving its own half.
 */
async function renderPage(
  row: Booking,
  search: Record<string, string> = {},
  auditRows: unknown[] = [],
) {
  dbState.resolve = (table) => {
    const name = getTableName(table as never);
    if (name === "booking") return [row];
    if (name === "audit") return auditRows;
    return [{ ...LISTING }];
  };
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

/**
 * EVERY `<dt>` TERM IN THE RENDER, IN DOCUMENT ORDER — the retargeted closed-set walk (D-98).
 *
 * 13-09 closed the booker-facing trust set at four with an exact ROW COUNT inside
 * `tests/booking/trust-block.test.tsx`, and it measured that the count was the half that worked: with a
 * fifth `Trusted host` row spliced into the component, the twelve-token ban in
 * `tests/design/trust-signals.test.ts` reported **6 passed** and only the count went red. D-98 deletes
 * the component, so that count has nothing left to assert about — and deleting it with the component
 * would drop the one protection that caught the signal nobody listed.
 *
 * IT IS RETARGETED HERE RATHER THAN RETIRED, and the target is the PAGE. With the panel gone, the only
 * definition list a booking render still opens is the facts panel, which is therefore the one place a
 * fifth signal could now land — a `Verified host` row, a tenure line, a tick with a tooltip. The
 * assertion is the ORDERED LIST of terms rather than their number, which is strictly stronger than
 * 13-09's count: a fifth row fails it, and so does a renamed or reordered one.
 *
 * ⚠ THE FOUR STATE COMPONENTS DECLARE `[]`, AND THAT IS A CLAIM RATHER THAN AN ABSENCE. The pending,
 * not-completed, reversed and lapsed-approval surfaces open no `<dl>` of their own — the trust block was
 * the only one they ever rendered — so an empty list says *this surface makes no definition-list claim
 * about anybody*, and a row appearing on one of them is exactly as red as a row appearing on the facts
 * panel. The six non-empty rows are what keep the walk from being vacuously green.
 */
function termsOf(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("dt")).map((dt) =>
    (dt.textContent ?? "").replace(/\s+/g, " ").trim(),
  );
}

/**
 * The facts panel's closed row set. The money row's term is the ONE thing that differs between
 * branches (D-90: *"Total"* over a hold nobody paid is a money statement FitOut cannot stand behind),
 * so it is the parameter — exactly as it is a parameter of `factsPanel` in the page itself.
 *
 * The itemisation rows are unconditional here because the fixture's two parts SUM to the frozen quote,
 * which is the positive match the page requires before it prints them.
 */
const FACTS = (totalTerm: string): readonly string[] => [
  "Space",
  "Where",
  "When",
  "Host",
  "Space cost",
  "Service fee",
  totalTerm,
];

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
// a meaning sentence, a reference, the D-94 money-statement boundary and — since 13-19 — the D-98
// closed `<dt>` term set. Enumerating them as data is also what makes the COUNT assertions honest:
// 13-09 measured that a token ban stayed green over a real fifth trust signal and only an exact count
// caught it, which is why that count was retargeted onto this table rather than deleted with the
// component it used to live beside.
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
  /**
   * D-98 — the CLOSED SET of `<dt>` terms this render is allowed to open, in document order. See
   * `termsOf` for why this is the retarget of 13-09's row count and why `[]` is a claim.
   */
  readonly terms: readonly string[];
  /**
   * D-99 — does this render state, in words, that the booking has been PAID?
   *
   * TRUE on exactly two of the ten: `confirmed` and the derived `completed`. Both have been paid by
   * construction — the `checkout_session.payment.paid` webhook is the only writer of the confirmed
   * status, and `completed` is derived off a confirmed row.
   *
   * ⚠ FALSE IS THE HALF THAT MATTERS, AND IT IS D-90 EXACTLY. `requested` and `approved` are
   * PAY-ON-APPROVAL holds: nobody has been charged one centavo, and a paid statement there would be
   * the false money claim this whole phase exists to remove. `pending` has not settled. The reversed
   * and indeterminate cancellations may never have carried a charge at all (D-96). A statement that
   * FitOut is holding a payment is a claim about somebody's money, and it is only true where it is
   * true.
   */
  readonly paid: boolean;
  /**
   * D-103 — does this render CONSUME `?paid=1` from the address bar?
   *
   * ⚠ FALSE ON THE PENDING BRANCH IS D-89, AND IT IS THE MOST EXPENSIVE FALSE IN THIS TABLE. The
   * pending poller calls `router.refresh()` eight times at 2.5s intervals, and Next re-renders the
   * CURRENT route — so a parameter stripped mid-settlement drops the very next poll into the
   * no-parameter path, which probes and then redirects to checkout. A booker who has ALREADY PAID is
   * navigated to a payment page in the middle of their own webhook. Both pending rows below say false,
   * and under a forced `?paid=1` both land on the same settling state, which is the point.
   *
   * TRUE IS EVERY BRANCH WHERE THE PARAMETER IS INERT: no branch predicate reads it, no poller runs,
   * and no redirect can be re-entered. The PM watched a stale `?paid=1` sit in the address bar
   * indefinitely on a booking whose time had elapsed — a swept hold that ended `cancelled`, and the
   * derived `completed` render, are exactly those.
   *
   * NOT TRUE on `requested` and `approved`, and that is a decision rather than an oversight: neither
   * is terminal. An approved hold's own next step is the checkout that appends this parameter, so a
   * consumer there would be stripping a string on the way INTO the flow that sets it.
   */
  readonly consumesParam: boolean;
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
    terms: FACTS("You'll pay if approved"),
    paid: false,
    consumesParam: false,
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
    terms: FACTS("Total"),
    paid: false,
    consumesParam: false,
  },
  {
    name: "pending (settling)",
    row: booking({ status: "pending", paymentId: null, expiresAt: LIVE_HOLD_EXPIRY }),
    search: { paid: "1" },
    heading: "Confirming your payment",
    // 13-07's recorded reading: this branch's specified sentence IS the money statement's two lines, so
    // rendering it a second time under the heading would put one sentence on the page twice. D-102
    // rewrote both lines — nothing on this branch may assert a payment the webhook has not confirmed.
    meaning: "We're waiting on your payment provider to confirm it.",
    money: true,
    terms: [],
    paid: false,
    consumesParam: false,
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
    terms: [],
    paid: false,
    consumesParam: false,
  },
  {
    name: "confirmed",
    row: booking(),
    heading: "Booking confirmed",
    meaning: "This time is yours.",
    money: false,
    terms: FACTS("Total"),
    paid: true,
    consumesParam: true,
  },
  {
    name: "completed (derived)",
    row: booking({ startsAt: PAST_START, endsAt: PAST_END }),
    heading: "This session is done",
    meaning: "This session is finished.",
    money: false,
    terms: FACTS("Total"),
    paid: true,
    consumesParam: true,
  },
  {
    name: "declined",
    row: booking({ status: "declined", paymentId: null }),
    heading: "This request wasn't available",
    meaning: "The host couldn't take your booking.",
    money: false,
    terms: FACTS("Quoted total"),
    paid: false,
    consumesParam: true,
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
    terms: FACTS("Total"),
    paid: false,
    consumesParam: true,
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
    terms: [],
    paid: false,
    consumesParam: true,
  },
  {
    name: "cancelled (reversed)",
    row: booking({ status: "cancelled", paymentId: null, checkoutSessionId: "cs_rev" }),
    session: { id: "cs_rev", status: "paid", sourceType: "card", paidAt: null },
    heading: "We couldn't complete this booking",
    meaning: "This time was taken before your payment landed.",
    money: true,
    terms: [],
    paid: false,
    consumesParam: true,
  },
];

async function drive(r: Render, extraSearch: Record<string, string> = {}) {
  if (r.session !== undefined) probe.session = r.session;
  if (r.now) clock.now = r.now;
  return renderPage(r.row, { ...(r.search ?? {}), ...extraSearch });
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

    // ── the support path ─────────────────────────────────────────────────────────────────────────
    //
    // NOTHING IS ASSERTED HERE ANY MORE, AND THE ABSENCE IS D-98 RATHER THAN A GAP. This used to
    // assert the trust panel's PRESENCE as a proxy for the guarded support row it ended with, because
    // `SUPPORT_EMAIL` is null (D-64) and demanding a control would go red on the day an operator fills
    // the constant in. The panel is deleted, so the proxy is gone with it. The support path still
    // ships on the two surfaces 13-UI-SPEC's guard-state table gives the in-panel control — the
    // reversed state and the pending state past its escalation — and it is `payment-states.test.tsx`
    // and `reversed-state.test.tsx` that own those. The confirmed detail carries no support affordance
    // today and did not before the panel either: the panel's row rendered NOTHING while the constant
    // is null. `tests/design/site-contacts.test.ts` remains the other half, unmodified.
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
    it(`(4·${r.name}) shows its heading, its meaning sentence and the reference`, async () => {
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

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// 13-CONTEXT D-98 — THE FOUR-ROW TRUST PANEL IS GONE, AND THE CLOSED SET IS STILL ENFORCED
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// WHY THE PANEL WENT. The PM used it in live UAT and judged it filler, and the evidence is on their
// side: at launch EVERY host and EVERY listing reads the same month, so *Host since* and *Listing
// published* carry no information at all; and on a cancelled or reversed booking a row promising that
// FitOut holds the payment until after the session is worse than uninformative, because the session is
// not happening. D-98 supersedes D-67 (the panel on every status) and D-68 (the four-row set).
//
// WHAT DID NOT GO. TRUST-04 is a CONSTRAINT — only real trust signals may be shown — not a mandate to
// show four. `tests/design/trust-signals.test.ts` keeps its twelve-token ban over the whole Phase-13
// file set, unmodified. Removing the panel removes signals; it must not remove the ban on inventing new
// ones, and the two cases below are the count half of that pair (see `termsOf`).
describe("D-98 — no trust panel renders on any status, and the term set stays closed", () => {
  for (const r of RENDERS) {
    it(`(9·${r.name}) opens exactly the declared <dt> terms — a fifth is a defect whatever it says`, async () => {
      const { container } = await drive(r);

      expect(
        termsOf(container as unknown as HTMLElement),
        `${r.name}: the definition-list terms on this render are not the declared closed set. ` +
          "13-09 measured that a twelve-token ban stayed GREEN on a real fifth signal (`Trusted " +
          "host`) and only an exact row count caught it; this is that count, retargeted from the " +
          "deleted panel to the page, and stated as the ordered SET so a rename fails it too. If a " +
          "surface wants one more row about the host, the answer is no — there is no column behind " +
          "it and D-80 forbids adding one.",
      ).toEqual([...r.terms]);
    });

    it(`(10·${r.name}) renders no trust panel at all`, async () => {
      const { container } = await drive(r);

      // Asserted over the RENDERED TREE and not over the source: 13-07's finding is that a source scan
      // cannot see what it was not told to look for, and a panel re-introduced through an import would
      // be invisible to a grep for the component's name at the call site.
      expect(
        (container as unknown as HTMLElement).querySelectorAll('[data-testid="trust-block"]'),
        `${r.name}: the four-row trust panel is still rendering. D-98 removes it from EVERY branch — ` +
          "its two dated rows say the same month for every host and every listing at launch, and its " +
          "payment row is false on a booking that is not happening.",
      ).toHaveLength(0);
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// 13-CONTEXT D-99 — THE PAGE SAYS IT IS PAID, AND SAYS IT ONLY WHERE IT IS TRUE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// THE DEFECT THIS CLOSES, IN THE PM'S OWN WORDS: *"the ticket shows booking confirmed and not paid…
// there's no obvious key wherein it stated that it is already paid for."* They were right. The page
// showed a STATUS and a TOTAL, and a booker cannot tell from those two whether they still owe it —
// `Total: ₱1,050.00` on a ticket reads at least as easily as an amount due.
//
// THE NEGATIVE HALF IS THE DANGEROUS ONE, and it is D-90 restated one correction later: a paid
// statement on `requested` or on an `approved`-but-unpaid hold would tell a booker they had been
// charged for something PAY-ON-APPROVAL means they have not been charged for. On a reversed or
// indeterminate cancellation it would assert a charge the D-84 probe may never have confirmed (D-96).
// So this is asserted per status over all ten renders, in both directions, rather than once on the
// happy path.
describe("D-99 — the paid statement mounts on exactly the two paid renders", () => {
  for (const r of RENDERS) {
    it(`(11·${r.name}) ${r.paid ? "states" : "does NOT state"} that the booking is paid`, async () => {
      await drive(r);
      expect(
        screen.queryAllByTestId("paid-statement"),
        r.paid
          ? `${r.name}: this booking HAS been paid and the page does not say so. A status word and a ` +
              "row labelled Total do not tell a booker whether they still owe the figure beside it."
          : `${r.name}: a paid statement rendered on a status where it may be FALSE. D-90: ` +
              "request-to-book is pay-on-approval, so a pending request has been charged nothing; " +
              "D-96: an unanswered probe means the booker in front of us may never have been charged " +
              "at all. Never tell a booker they paid for something they did not.",
      ).toHaveLength(r.paid ? 1 : 0);
    });
  }

  it("(12) the two are exactly the two statuses that have been paid by construction", async () => {
    // The closed-set half, as a NAMED SET — the shape case (7) uses for D-94, and for its reason: ten
    // passing booleans and an eleventh status quietly gaining a paid claim look identical from inside
    // the loop above.
    expect(RENDERS.filter((r) => r.paid).map((r) => r.name).sort()).toEqual(
      ["completed (derived)", "confirmed"].sort(),
    );
  });

  it("(13) the confirmed heading says PAID, not merely confirmed", async () => {
    const { container } = await renderPage(booking());
    expect(
      flat(container as unknown as HTMLElement),
      "the `<h1>` still reads only that the booking is confirmed. Confirmed and paid are two " +
        "different facts to a booker holding a ticket, and the one they cannot infer is the second.",
    ).toContain("Booking confirmed & paid");
  });

  it("(14) names the amount that was paid, and carries the hold promise on the held branch", async () => {
    const { container } = await renderPage(booking());
    const statement = screen.getByTestId("paid-statement").textContent!.replace(/\s+/g, " ").trim();

    expect(statement, "the figure a booker checks against their bank app").toContain(
      money(QUOTED_CENTS),
    );
    // THE ONE SENTENCE WORTH KEEPING OUT OF THE DELETED PANEL (D-98 → D-99). It is the
    // hold-until-session payout model stated to a booker, which is the answer to *where is my money* —
    // it earns its place as a PAYMENT statement even though the panel it used to sit in did not.
    expect(statement).toContain("FitOut holds your payment until after your session.");
    void container;
  });

  it("(15) the COMPLETED render never claims the payment is still being held", async () => {
    // ⚠ THE TRUTHFULNESS CATCH, and it is the reason this is two sentences and not one. "FitOut holds
    // your payment until after your session" is FALSE once the session has happened: the payout sweep
    // runs at endsAt + PAYOUT_DELAY_HOURS, so on a completed booking the hold has arrived at its end
    // or already released. The paid FACT is still stated — the amount, in full — and the clause that
    // would have become a lie is simply absent rather than reworded into a second unverified claim
    // about where the money is now.
    await drive(RENDERS.find((r) => r.name === "completed (derived)")!);
    const statement = screen.getByTestId("paid-statement").textContent!.replace(/\s+/g, " ").trim();

    expect(statement, "the amount is still named on a finished session").toContain(
      money(QUOTED_CENTS),
    );
    expect(
      statement,
      "the completed render promises a hold that has already ended. A money sentence that is true " +
        "on Monday and false on Wednesday is the surface contradicting itself.",
    ).not.toContain("until after your session");
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

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// TRUST-05 / D-76 — THE RECEIPT ENTRY IS OFFERED EXACTLY WHERE THE RECEIPT EXISTS (plan 13-12)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `/bookings/[id]/receipt` refuses every row where money did not move, and its refusal is deliberately
// INDISTINGUISHABLE from a stranger's booking — the same bare 404, the same three strings. That is
// correct for the route and it is exactly what makes an over-offered entry expensive: a booker who
// follows a link this page gave them lands on *"we couldn't find that booking"* about their own
// booking, and has no way to tell that from having lost it.
//
// So the entry's predicate is not a nicety, and it cannot be asserted by looking at one render. Case
// (16) walks all TEN and asserts membership of a CLOSED SET — the phase's own lesson (13-09: a ban list
// cannot catch the item nobody thought of, so prefer a closed-set count). The set is written out by
// NAME rather than recomputed from each row, because a test that re-derived the predicate would be
// asserting its own copy of the thing under test.
//
// ⚠ AND CASE (16) ALONE CANNOT FAIL, WHICH IS WHY CASE (17) EXISTS. Measured, not reasoned: with the
// page's predicate replaced by a bare `true`, case (16) stayed GREEN at 44/44. The reason is structural
// — of the ten declared renders, only two reach a site that renders the entry at all (the confirmed
// branch and the GENERIC cancelled landing), and the one declared cancelled row that reaches the
// generic landing carries a refund figure, so it qualifies under both the real predicate and the broken
// one. Case (16) therefore measures BRANCH PLACEMENT and nothing else, and the phase's own warning
// applies to it exactly: *a test can enforce the bug — check which fixture a money assertion actually
// runs against.*
//
// Case (17) is the assertion the predicate needs, and it is the pair 13-10 used on the reversed row:
// the SAME branch, driven twice, differing only in whether money moved. A `cancelled` row with no
// refund figure and no payment id is the swept unpaid hold `page.tsx`'s own comment names — a booker
// who was never charged one centavo — and it is the only shape on which offering a receipt is a real
// defect rather than a hypothetical one.
describe("TRUST-05 — the receipt entry appears on the money-moved renders and on no other", () => {
  /**
   * The three renders that qualify, and why each of the other seven does not.
   *
   *   • `confirmed` and `completed (derived)` — the confirm UPDATE ran; it is the only statement in the
   *     codebase that writes `payment_id`. `completed` is the SAME row a moment later (D-102).
   *   • `cancelled (party)` — a booking somebody paid for and then cancelled, carrying the refund figure
   *     the cancel action wrote. D-76 names this case as the one MOST likely to need a document.
   *
   *   • `requested` / `approved` — pay-on-approval holds. Nothing has been charged (D-90).
   *   • `pending (settling)` / `pending (not completed)` — the money has not landed, by definition.
   *   • `declined` — a request nobody paid for.
   *   • `cancelled (lapsed approval)` — an approval that ran out before payment; no session, no charge.
   *   • `cancelled (reversed)` — NOT an omission. The route admits this shape only when the D-84 probe
   *     CONFIRMS the session was paid, and this branch returns a component that holds that probe result
   *     itself. An entry rendered from the row signature alone would be offered on precisely the rows
   *     where the receipt may not exist — the abandoned-hold reading of the same signature (D-96).
   */
  const WITH_ENTRY = new Set(["confirmed", "completed (derived)", "cancelled (party)"]);

  it("(16) offers `View receipt` on exactly the three money-moved renders", async () => {
    for (const r of RENDERS) {
      cleanup();
      const { container } = await drive(r);
      const text = flat(container as unknown as HTMLElement);
      const expected = WITH_ENTRY.has(r.name);
      expect(
        text.includes("View receipt"),
        expected
          ? `${r.name}: money moved on this row and the receipt exists for it, but the page offers no ` +
              "way to reach it. TRUST-05 asks that a booker can view and print an itemised receipt; a " +
              "real URL nobody links to is not that."
          : `${r.name}: the page offers a receipt for a booking whose money never moved. The route ` +
            `404s it (D-76), and that 404 is byte-identical to the one a stranger gets — so the link ` +
            `sends a booker to the not-found copy about their OWN booking, with no way to tell that ` +
            `from having lost it.`,
      ).toBe(expected);
    }
  });

  it("(17) withholds it from a cancelled row nobody ever paid for — the branch's OTHER reading", async () => {
    // The generic cancelled landing, reached the same way `cancelled (party)` reaches it (`cancelledBy`
    // is set, so neither the reversal branch nor the D-97 lapse branch claims the row) — but with NO
    // refund figure and NO payment id. `page.tsx` labels this row's money term "Quoted total" for the
    // same reason the entry must be absent: nobody was charged.
    const { container } = await renderPage(
      booking({ status: "cancelled", cancelledBy: "booker", refundCents: null, paymentId: null }),
    );
    const text = flat(container as unknown as HTMLElement);

    // THE THREAT FIRST (13-11's ordering rule).
    expect(
      text,
      "a swept, never-paid hold was offered a receipt. The route 404s it (D-76) with the same bare " +
        "answer a stranger's booking gets, so this link sends a booker who was never charged to the " +
        "not-found copy about their OWN booking. This is the assertion case (16) cannot make: with " +
        "the predicate replaced by `true`, that case stays green and this one does not.",
    ).not.toContain("View receipt");

    // GUARD THE GUARD — the fixture really did reach the generic cancelled landing, so the absence
    // above is about the predicate rather than about a row that rendered some other branch entirely.
    expect(
      text,
      "the fixture did not land on the generic cancelled branch, so the absence above proves nothing",
    ).toContain("This booking was cancelled");
    expect(text, "the fixture is not the never-paid reading of that branch").toContain("Quoted total");
  });

  it("(18) the entry is never the accent, on either branch that renders it", async () => {
    for (const name of ["confirmed", "cancelled (party)"]) {
      cleanup();
      const r = RENDERS.find((x) => x.name === name);
      expect(r, `the render table no longer declares "${name}"`).toBeTruthy();
      const { container } = await drive(r!);
      const link = [...container.querySelectorAll("a")].find(
        (a) => a.textContent?.trim() === "View receipt",
      );
      expect(link, `${name}: the receipt entry is not an anchor`).toBeTruthy();
      // One accent per surface (08-UI-SPEC Open Q3), and on both of these branches it is already spoken
      // for — by `Invite people` on the confirmed render and by `Find another space` on the cancelled
      // one. Asserted through the RENDERED class list rather than by reading the source, because the
      // variant reaches the DOM through a CVA recipe and a source scan would only see the prop.
      expect(
        link!.className,
        `${name}: the receipt entry is painted with the accent recipe. It is a calm, secondary way to ` +
          "a record — never the thing this surface is asking the booker to do.",
      ).not.toContain("bg-brand");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// PLAN 13-18 — THE CANCELLED BRANCH'S SECOND MONEY TRUTH IS DURABLE ON THE DESTINATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// THE DEFECT THESE TWO CASES CLOSE. A booker cancels; the money is owed; the dispatch does not happen
// (the call raised, the rail is not API-refundable, the destination could not be verified, or the
// amount is above the InstaPay ceiling). Every one of those paths writes a `needs_attention` audit row
// and a person moves the money by hand. The only place the booker was ever told was a `toast.warning`
// on the cancel form — which then navigated away from itself — and THIS page, the destination, read
// `refund_cents` and announced the money was on its way. It was not.
//
// WHY BOTH DIRECTIONS ARE ASSERTED, AND WHY THAT IS NOT CEREMONY. 13-17 measured five vacuous cases in
// one spec where a fail-closed short-circuit returned the same value the assertion demanded. An
// absence here — "the in-transit sentence is gone" — is satisfied perfectly by a page that renders no
// money sentence at all, or by a fixture that landed on some other branch. So case (19) asserts the
// REPLACEMENT is present in the same breath, and case (20) asserts the ordinary render still says the
// ordinary thing, from the SAME fixture with only the audit rows changed. One flipped input, two
// opposite outputs: neither result is reachable without the branch actually running.

describe("STATE-08 / D-83 — a refund that did NOT dispatch says so, durably, on /bookings/{id}", () => {
  /** The party-cancellation fixture: cancelled, `cancelled_by` set, ₱1,000.00 owed back. */
  const cancelledWithRefund = () =>
    booking({ status: "cancelled", cancelledBy: "booker", refundCents: 100_000 });

  /** What the operator-alert probe finds when a dispatch failed. Shape-irrelevant — see `renderPage`. */
  const ALERT_ROWS = [{ id: "aud_1" }];

  const OWED = money(100_000);

  it("(19) states the by-hand truth — with the amount, the reference, and NO window", async () => {
    const { container } = await renderPage(cancelledWithRefund(), {}, ALERT_ROWS);
    const text = flat(container as unknown as HTMLElement);

    // ── GUARD THE GUARD, FIRST. Every assertion below is about ONE branch's copy; a fixture that
    //    landed on the reversal branch, the D-97 lapse or a 404 would satisfy several of them for
    //    entirely the wrong reason.
    expect(text, "the fixture did not reach the generic cancelled landing").toContain(
      "This booking was cancelled",
    );
    expect(
      screen.getByTestId("money-statement"),
      "the money panel did not mount at all — an absent panel passes every absence below",
    ).toBeTruthy();

    // ── THE FACT IS ON THE PAGE, AND IT IS IN THE MONEY PANEL rather than merely somewhere in the
    //    document. Scoped, because an unscoped match would be satisfied by the facts panel's own
    //    total, which carries the same figure for a different reason.
    const panel = flat(screen.getByTestId("money-statement"));
    expect(panel, "the by-hand panel does not name the amount that is owed").toContain(OWED);
    expect(
      panel,
      "the by-hand panel does not say the money is coming back. The booker has to be told what " +
        "happens next; an amount with no verb is a figure, not a statement.",
    ).toContain("coming back to you");
    expect(
      panel,
      "the by-hand panel does not say a person is moving it. That sentence IS the caveat — without " +
        "it the panel reads as an ordinary refund and the booker waits for something automatic.",
    ).toContain("returned by hand");

    // ── TRUST-02 — the reference travels WITH the money sentence, because the sentence is the thing
    //    a person quotes when they get in touch about it.
    expect(panel, "the by-hand sentence does not carry the booking reference").toContain(REFERENCE);
    // …and it is still rendered as its own copyable element, which is where they take it from.
    expect(screen.getByTestId("booking-reference").textContent).toBe(REFERENCE);

    // ── D-83, THE MONEY-TRUTH RULE. Nothing was sent back, so the word claiming it was may not
    //    appear in this panel. Built from two pieces for the reason every gate in this phase is:
    //    a raw grep for the token over this file must not be satisfied by the assertion banning it.
    const claimed = ["ref", "unded"].join("");
    expect(
      panel.toLowerCase(),
      `the by-hand panel claims the money was already sent back ("${claimed}"). Nothing has been ` +
        "sent: the amount is on the FitOut platform wallet and a person still has to move it. This " +
        "is D-83's ban, and it is the same class of false money statement D-69 removed from the " +
        "reversed state, pointing the other way.",
    ).not.toContain(claimed);

    // ── THE OLD SENTENCE IS GONE FROM THIS RENDER. Not re-worded, not demoted — replaced. Two
    //    sentences about one figure, one of them false, is worse than either alone.
    expect(
      panel,
      "the in-transit sentence is still on the page. It is the false half on this branch: the POST " +
        "was never accepted, so nothing is in transit.",
    ).not.toContain("on its way");

    // ── D-83's WINDOW RULE — the assertion this plan's objective names explicitly. Exactly three
    //    windows exist in this product and every one of them describes an AUTOMATIC return on a rail
    //    that accepted one. Nobody knows when a hand-moved transfer lands, so this branch states
    //    none. Asserted against the SHIPPED sentence (imported, never retyped) and against the raw
    //    durations, so a hand-typed window would be caught even if the module's copy changed.
    expect(
      text,
      "a refund window is stated on the path where nothing was dispatched. D-83 permits three, and " +
        "all three are promises about an automatic return we did not make here.",
    ).not.toContain(ALL_RAILS_REFUND_WINDOW);
    for (const duration of ["30 days", "24 hours"]) {
      expect(text, `the page states "${duration}" on the non-dispatch path`).not.toContain(duration);
    }
  });

  it("(20) …and the ORDINARY cancellation still states the in-transit sentence and its window", async () => {
    // THE COMPANION, AND THE PROOF THE BRANCH IS LIVE. Same fixture, same page, ONE input flipped:
    // no operator alert. If the by-hand copy were unconditional — or if the probe answered `true`
    // for everything, which is exactly what the harness's table stub would have done before this
    // plan parameterised it — this case is the one that goes red, and case (19) never would.
    const { container } = await renderPage(cancelledWithRefund(), {}, []);
    const text = flat(container as unknown as HTMLElement);
    const panel = flat(screen.getByTestId("money-statement"));

    expect(panel, "the ordinary cancelled render lost its in-transit sentence").toContain(
      `${OWED} refund on its way`,
    );
    expect(
      text,
      "the ordinary cancelled render lost the verified window that pairs with that sentence (D-83)",
    ).toContain(ALL_RAILS_REFUND_WINDOW);

    // …and it says nothing about a person moving the money, because nobody has to.
    expect(
      panel,
      "the by-hand caveat renders on a cancellation whose refund dispatched normally. That would " +
        "tell a booker whose money really is in transit to wait for a human instead.",
    ).not.toContain("returned by hand");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// 13-CONTEXT D-103 — THE CHECKOUT-RETURN PARAMETER IS CONSUMED WHERE IT IS INERT, AND NOWHERE ELSE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// THE OBSERVATION, FROM THE PM IN LIVE UAT: `?paid=1` was still in the address bar on a booking whose
// time had already elapsed. It was: `ConsumePaidParam` mounted on the confirmation moment alone, so
// every OTHER landing a paid checkout can reach — a swept hold that ended `cancelled`, a reversal, the
// derived `completed` render one session later — kept a stale parameter forever, on a URL the booker
// may well bookmark or share.
//
// ⚠ AND THE FIX MAY NOT WEAKEN D-89 BY ONE INCH, WHICH IS WHY THIS IS A TABLE AND NOT A CASE. Mounting
// that consumer on the PENDING branch is the phase's most expensive mistake: the poller re-renders this
// RSC for the CURRENT url every 2.5s, so a stripped parameter drops the next poll into the no-parameter
// path — a probe, and then `redirect(…/book?hold=…)` — and a booker who has already paid is navigated
// back to a checkout page in the middle of their own webhook. `e2e/confirmation-decay.spec.ts` counts
// `framenavigated` events over a real poller and was watched failing with the mount hoisted; that spec
// proves the CONSEQUENCE. This table proves the MOUNT POINT, per status, in both directions — which is
// the half that goes quiet the moment somebody adds a branch and nobody re-reads the comment.
//
// THE RULE THE COLUMN ENCODES: consume it where it is INERT — no branch predicate reads it, no poller
// runs, no redirect can be re-entered — and never anywhere else. See the `consumesParam` prop doc.
describe("D-103 — where the checkout-return parameter decays, per status", () => {
  for (const r of RENDERS) {
    it(`${r.name} ${r.consumesParam ? "consumes ?paid=1" : "leaves ?paid=1 alone"}`, async () => {
      // FORCED ONTO EVERY ROW, including the eight that never carry it in the other cases. The
      // question is what each branch DOES with the parameter, so every branch has to be handed one.
      const { container } = await drive(r, { paid: "1" });
      const mounts = (container as unknown as HTMLElement).querySelectorAll(
        '[data-testid="consume-paid-param"]',
      );

      expect(
        mounts.length,
        r.consumesParam
          ? `the ${r.name} render leaves \`?paid=1\` in the address bar. This branch is terminal and ` +
              `the parameter is inert on it — no predicate here reads it and nothing re-enters — so a ` +
              `stale checkout-return marker simply sits on a URL the booker can bookmark or share ` +
              `(D-103). It is also exactly what the PM watched happen on an elapsed booking.`
          : `the ${r.name} render CONSUMED \`?paid=1\`. On the pending branch that is D-89 and it is ` +
              `the phase's most expensive defect: the poller re-renders this route every 2.5s, so the ` +
              `next poll after the strip falls through to the probe and the redirect, and a booker who ` +
              `has ALREADY PAID lands on a checkout page mid-webhook. On a non-terminal branch it is ` +
              `stripping a marker on the way INTO the flow that sets it.`,
      ).toBe(r.consumesParam ? 1 : 0);
    });
  }

  it("the table still says both things — a column of one value proves nothing", async () => {
    // The both-directions guard, as a permanent assertion. Every case above reads its expectation
    // FROM the row, so a table that had drifted to all-true (or all-false) would be perfectly green
    // while asserting nothing at all. 13-09's finding: a walk cannot catch the item nobody declared,
    // and a per-row expectation cannot catch a table that only declares one answer.
    const consuming = RENDERS.filter((r) => r.consumesParam).map((r) => r.name);
    const leaving = RENDERS.filter((r) => !r.consumesParam).map((r) => r.name);
    expect(consuming.length, "no render consumes the parameter — the decay is gone entirely").toBe(6);
    expect(
      leaving,
      "the two pending rows and the two non-terminal ones must all leave it alone; losing one from " +
        "this list is how D-89 gets weakened without anybody editing its comment",
    ).toEqual([
      "requested",
      "approved",
      "pending (settling)",
      "pending (not completed)",
    ]);
  });
});
