// @vitest-environment jsdom

// OC-07 — the reduction notice, as an executable contract (09-UI-SPEC § 3, copy rule O6).
//
// WHY THIS FILE EXISTS AT ALL. By the time this alert renders, the booker's hold already holds FEWER
// passes than they asked for and no money has moved. The next thing they touch is a coral confirm that
// charges them. Every assertion below is about the gap between those two facts:
//
//   (1) THE SENTENCE, VERBATIM. Not "contains the new total" — the whole sentence, including the words
//   `Nothing has been charged yet.` A booker who is told less than the full story here consents to a
//   charge they did not read, which is a core-value trust failure on the money path (T-09-43).
//
//   (2) THE SINGULAR. `only 1 is still available`, not `only 1 are`. The one-pass case is the MOST likely
//   partial grant, not the edge one.
//
//   (3) IT IS NOT AN ERROR. Losing a spot to someone faster is a normal marketplace outcome; the alarm
//   token has no use at all this phase (§ Color). Asserted over the classes that actually PAINT — the
//   shipped Button base carries `aria-invalid:`-prefixed alarm utilities that can never apply here, and
//   counting those would make the gate unpassable for every button in the repo while proving nothing
//   about the colour a booker sees (the 09-11 lesson).
//
//   (4) IT CANNOT BE DISMISSED. No close control, no toggle, nothing with a dismissing accessible name.
//   A dismissible reduction is the exact failure mode Open Q6 rejected a dialog to avoid.
//
//   (5) NO STRIKETHROUGH ON THE OLD FIGURE. Struck pricing is discount grammar; the booker is getting
//   less, not a deal (Open Q7).
//
// The SECOND describe drives the reserve-page RSC itself, because three of this plan's guarantees are
// properties of the PAGE and cannot be asserted on the component: that a tampered `?requested=` cannot
// produce an absurd estimate (T-09-24), that the alert sits earlier in the tab order than the coral
// confirm (T-09-43), and that a drop-in booking mounts no head-count stepper at all (D-126 / T-09-25).
// The page is an async Server Component, so it is awaited to a tree and rendered; its three reads are
// served by a table-keyed `db.select()` stub, which keeps the fixtures readable and the run fast.

import * as React from "react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { getTableName } from "drizzle-orm";

const getSession = vi.hoisted(() => vi.fn());
const dbState = vi.hoisted(() => ({
  resolve: null as null | ((table: unknown) => unknown[]),
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT:${to}`);
  },
  // The shipped PaxStepper refreshes the RSC after a re-price; case (13) mounts it.
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: (...args: unknown[]) => getSession(...args) } },
}));
// ReserveActions imports the confirm action; the page never calls it, and pulling the real "use server"
// module into jsdom would drag the whole payments rail in with it.
vi.mock("@/app/actions/booking", () => ({ confirmBooking: vi.fn() }));
vi.mock("@/lib/db", () => {
  type Chain = {
    from: (t: unknown) => Chain;
    where: () => Chain;
    orderBy: () => Chain;
    limit: () => Chain;
    then: (
      onOk: (rows: unknown[]) => unknown,
      onErr?: (e: unknown) => unknown,
    ) => Promise<unknown>;
  };
  const chain = (): Chain => {
    let table: unknown = null;
    const c: Chain = {
      from(t) {
        table = t;
        return c;
      },
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
import { PartialGrantNotice } from "@/components/booking/partial-grant-notice";
import { HoldProvider } from "@/components/booking/hold-provider";
import ReservePage from "@/app/listings/[id]/book/page";

afterEach(cleanup);

/** Only unprefixed utilities paint unconditionally — see the header note (3). */
function paintedClasses(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll<HTMLElement>("*")).flatMap((el) =>
    Array.from(el.classList).filter((c) => !c.includes(":")),
  );
}

const ALARM = /destructive|-red-|-amber-|-orange-|-yellow-/;

const BASE = {
  dateLabel: "Friday, Aug 8 (Makati time)",
  newTotalLabel: "₱367.50",
  oldTotalLabel: "₱1,102.50",
  pickAnotherHref: "/listings/lst_1",
};

/** The visible text of the alert body, whitespace-normalized the way a reader sees it. */
function bodyText(): string {
  const status = screen.getByRole("status");
  return within(status)
    .getByText(/^You picked/)
    .textContent!.replace(/\s+/g, " ")
    .trim();
}

describe("PartialGrantNotice — OC-07 / O6", () => {
  it("(1) states the reduction, BOTH figures and the no-charge reassurance, singular", () => {
    render(<PartialGrantNotice {...BASE} grantedPasses={1} requestedPasses={3} />);

    expect(bodyText()).toBe(
      "You picked 3 passes, but only 1 is still available. Your booking is set to 1 — " +
        "₱367.50 instead of the ₱1,102.50 estimated for 3. Nothing has been charged yet.",
    );
    expect(screen.getByRole("status").textContent).toContain("Only 1 left for Friday, Aug 8 (Makati time)");
  });

  it("(2) says `are` when more than one pass was granted", () => {
    render(
      <PartialGrantNotice
        {...BASE}
        grantedPasses={2}
        requestedPasses={3}
        newTotalLabel="₱735.00"
      />,
    );

    expect(bodyText()).toBe(
      "You picked 3 passes, but only 2 are still available. Your booking is set to 2 — " +
        "₱735.00 instead of the ₱1,102.50 estimated for 3. Nothing has been charged yet.",
    );
  });

  it("(3) is never an alarm, and the old figure is never struck through", () => {
    const { container } = render(
      <PartialGrantNotice {...BASE} grantedPasses={1} requestedPasses={3} />,
    );

    const painted = paintedClasses(container);
    expect(painted.filter((c) => ALARM.test(c))).toEqual([]);
    expect(painted.filter((c) => c.includes("line-through"))).toEqual([]);
    expect(container.querySelector("[aria-invalid]")).toBeNull();
    expect(container.querySelector('[data-variant="destructive"]')).toBeNull();
    // The old figure is present as ordinary text, in the same tabular-nums grammar as the new one.
    const olds = screen.getAllByText("₱1,102.50");
    expect(olds).toHaveLength(1);
    expect(olds[0].className).toContain("tabular-nums");
    expect(screen.getByText("₱367.50").className).toContain("tabular-nums");
  });

  it("(4) is a polite live region with NO way to dismiss it", () => {
    const { container } = render(
      <PartialGrantNotice {...BASE} grantedPasses={1} requestedPasses={3} />,
    );

    expect(screen.getByRole("status")).toBeTruthy();
    // No assertive interruption, and no alert role left over from the shipped shell.
    expect(screen.queryByRole("alert")).toBeNull();

    const interactive = Array.from(
      container.querySelectorAll<HTMLElement>("button, a, [role='button']"),
    );
    for (const el of interactive) {
      const name = `${el.textContent ?? ""} ${el.getAttribute("aria-label") ?? ""}`;
      expect(name).not.toMatch(/dismiss|close/i);
    }
    // The ONE interactive control is the escape route (no close button rode along).
    expect(interactive).toHaveLength(1);
  });

  it("(5) offers `Pick another date` as a neutral link to the supplied href", () => {
    render(<PartialGrantNotice {...BASE} grantedPasses={1} requestedPasses={3} />);

    const link = screen.getByRole("link", { name: "Pick another date" });
    expect(link.getAttribute("href")).toBe("/listings/lst_1");
    // Secondary to the page's coral confirm — never the accent itself (§ Color).
    expect(link.className).not.toContain("bg-brand");
  });
});

// ───────────────────────────────────────────────────────────────────────────────────────────────────────
// The reserve page itself.
// ───────────────────────────────────────────────────────────────────────────────────────────────────────

// A Friday, pinned: 2025-08-08 IS a Friday (2026-08-08 is not — 09-08's calendar slip). Venue is Manila,
// open 6:00 AM – 10:00 PM, so the persisted entry window is 22:00Z the previous day → 14:00Z.
const DAY_OPEN = new Date("2025-08-07T22:00:00.000Z");
const DAY_CLOSE = new Date("2025-08-08T14:00:00.000Z");

const PER_HEAD = 35000; // ₱350.00/person
const money = (cents: number) => formatMoney(cents, "php");

/**
 * The open listing DELIBERATELY still carries hourly/day rates AND a per-head surcharge (09-07's lesson:
 * 09-06 requires a per-head price to publish but never CLEARS the exclusive columns, and OC-17 lets a host
 * switch modes on a listing that already had them). With them absent, the mode fork below could pass by
 * accident — the surcharge line and the stepper would be missing because their inputs were, not because
 * the page keyed on the occupancy mode.
 */
const OPEN_LISTING = {
  title: "Iron Yard",
  primarySpaceType: "gym",
  city: "Makati",
  timezone: "Asia/Manila",
  hourlyRateCents: 50000,
  dayRateCents: 400000,
  included: 1,
  extraHeadFee: 10000,
  maxOccupancy: 10,
  perHeadPriceCents: PER_HEAD,
};

const EXCLUSIVE_LISTING = { ...OPEN_LISTING, perHeadPriceCents: null };

function openBooking(grantedPasses: number) {
  const space = PER_HEAD * grantedPasses;
  const fee = Math.round((space * 500) / 10000); // SERVICE_FEE_BPS default, mirrored for the fixture only
  return {
    id: "bk_1",
    listingId: "lst_1",
    bookerId: "usr_1",
    startsAt: DAY_OPEN,
    endsAt: DAY_CLOSE,
    status: "pending" as const,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    quotedTotalCents: space + fee,
    spacePriceCents: space,
    serviceFeeCents: fee,
    cancellationPolicy: "standard",
    currency: "php",
    fullDay: false,
    openCapacity: true,
    declaredPax: grantedPasses,
  };
}

let rows: Record<string, unknown[]>;

function seed(bookingRow: unknown, listingRow: unknown) {
  rows = { booking: [bookingRow], listing: [listingRow], listing_photo: [] };
}

/**
 * `HoldProvider` is the page's LAYOUT in production (`app/listings/[id]/book/layout.tsx`, plan 12-03),
 * and rendering the page tree without it throws — `useHold` refuses to return a null-ish default, for
 * the reason its own file gives. Wrapping here reproduces the real composition rather than weakening
 * the hook: the page publishes its `expiresAt` into this provider and `ReserveView` reads `expired`
 * back out of it, so a bare `render(tree)` is a tree this route never renders.
 */
async function renderPage(search: Record<string, string> = {}) {
  const tree = await ReservePage({
    params: Promise.resolve({ id: "lst_1" }),
    searchParams: Promise.resolve({ hold: "bk_1", ...search }),
  });
  return render(<HoldProvider>{tree as React.ReactElement}</HoldProvider>);
}

/** The alert, found structurally rather than by role — the page has other live regions. */
const alertEl = (container: HTMLElement) => container.querySelector('[data-slot="alert"]');

beforeEach(() => {
  getSession.mockResolvedValue({ user: { id: "usr_1" } });
  seed(openBooking(1), OPEN_LISTING);
  dbState.resolve = (table) => rows[getTableName(table as never)] ?? [];
});

describe("Reserve page — the drop-in fork (OPEN-02 · OC-02 / OC-07 / OC-08)", () => {
  it("(6) a partial grant is stated above the confirm, with BOTH figures", async () => {
    const { container } = await renderPage({ requested: "3" });

    const alert = alertEl(container);
    expect(alert).toBeTruthy();
    expect(alert!.textContent).toContain("Only 1 left for Friday, Aug 8 (Makati time)");
    // NEW = the row's frozen total for 1 pass. OLD = the display-only all-in estimate for the 3 asked for.
    expect(alert!.textContent).toContain(money(36750));
    expect(alert!.textContent).toContain(money(110250));
    expect(alert!.textContent).toContain("Nothing has been charged yet.");

    // T-09-43 — reachable BEFORE the coral confirm, so it cannot be paid past unheard.
    const confirm = screen.getByRole("button", { name: "Confirm & pay" });
    expect(alert!.compareDocumentPosition(confirm) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("(7) no `requested` param → no notice at all", async () => {
    const { container } = await renderPage();

    expect(alertEl(container)).toBeNull();
    expect(screen.queryByText(/Nothing has been charged yet\./)).toBeNull();
  });

  it("(8) `?requested=1` on a 1-pass booking is not a reduction → no notice", async () => {
    const { container } = await renderPage({ requested: "1" });

    expect(alertEl(container)).toBeNull();
  });

  it("(9) a junk or negative `requested` renders no notice and does not throw (T-09-24)", async () => {
    // "" parses to 0 and "-5" to a negative — both fail the "actually above what was granted" gate rather
    // than the integer gate, which is why both are listed. A well-formed number in any notation (`3e2`)
    // is NOT junk: it is clamped like any other, which case (10) covers.
    for (const requested of ["abc", "-5", "1.5", "", "0", "1e", "Infinity", "NaN"]) {
      cleanup();
      const { container } = await renderPage({ requested });
      expect(alertEl(container), `requested=${requested}`).toBeNull();
    }
  });

  it("(10) `?requested=99999` is CLAMPED to the listing's cap before any figure is composed", async () => {
    seed(openBooking(1), { ...OPEN_LISTING, maxOccupancy: 4 });
    const { container } = await renderPage({ requested: "99999" });

    const alert = alertEl(container);
    expect(alert!.textContent).toContain("You picked 4 passes");
    // 4 × ₱350.00 + 5% = ₱1,470.00 — the CAP's estimate, not 99999's.
    expect(alert!.textContent).toContain(money(147000));
    expect(alert!.textContent).not.toContain("99999");
    // And the charge is untouched by any of it: still the frozen quote for the ONE granted pass.
    expect(container.textContent).toContain(`You'll pay ${money(36750)} now`);
  });

  it("(11) an open booking mounts NO head-count stepper (D-126 / T-09-25)", async () => {
    seed(openBooking(3), OPEN_LISTING);
    const { container } = await renderPage();

    expect(screen.queryByText("How many people are coming?")).toBeNull();
    expect(screen.queryByText("How many passes?")).toBeNull();
    expect(screen.queryByRole("button", { name: /Add a (guest|pass)/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Remove a (guest|pass)/ })).toBeNull();
    expect(container.querySelector("#declared-pax")).toBeNull();
  });

  it("(12) the summary states a DAY and a pass count — never a window or a run length (O2/OC-08)", async () => {
    seed(openBooking(3), OPEN_LISTING);
    const { container } = await renderPage();

    expect(
      screen.getByText("Friday, Aug 8 · Drop-in pass, any time 6:00 AM – 10:00 PM (Makati time)"),
    ).toBeTruthy();
    expect(screen.getByText("Drop-in")).toBeTruthy();
    expect(screen.getByText(`${money(PER_HEAD)}/person × 3 passes`)).toBeTruthy();
    // No duration term anywhere in the summary column, and no hourly/day run line.
    expect(container.textContent).not.toMatch(/\d+ hours?\b/);
    expect(container.textContent).not.toContain("/hr ×");
    expect(container.textContent).not.toContain("/day ×");
    expect(container.textContent).not.toContain("Full day");
    // The listing's LEFTOVER extra_head_fee must not surface as a surcharge line: an open booking's price
    // is perHead × granted with no surcharge term, so those centavos are not in the frozen price.
    expect(screen.queryByText(/Extra guests/)).toBeNull();
  });

  it("(13) an EXCLUSIVE booking is untouched by all of it", async () => {
    seed(
      {
        ...openBooking(3),
        openCapacity: false,
        startsAt: new Date("2025-08-08T02:00:00.000Z"),
        endsAt: new Date("2025-08-08T04:00:00.000Z"),
      },
      EXCLUSIVE_LISTING,
    );
    // Even with the query param a crafted URL could carry, an exclusive row can never show the notice.
    const { container } = await renderPage({ requested: "9" });

    expect(alertEl(container)).toBeNull();
    expect(screen.queryByText("Drop-in")).toBeNull();
    // The shipped two-line block: a date, a real time range, and the run length.
    expect(screen.getByText("Friday, Aug 8")).toBeTruthy();
    expect(container.textContent).toContain("10:00 AM – 12:00 PM");
    expect(container.textContent).toContain("2 hours");
    // …the shipped D-108 surfaces still work off the same leftover columns.
    expect(screen.getByText("How many people are coming?")).toBeTruthy();
    expect(screen.getByText(/Extra guests/)).toBeTruthy();
  });
});
