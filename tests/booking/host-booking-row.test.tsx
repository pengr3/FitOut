// @vitest-environment jsdom

// T6 + T8 render proof for the HOST bookings mobile card (07-18).
//
// WHY A RENDER TEST. Both facts under test are wiring facts a refactor breaks silently:
//   - T6: the card must carry a `next/link` to /host/bookings/[id] so the host cancel flow (SC#3) is
//     reachable WITHOUT hand-typing a booking UUID — and the overlay must NOT swallow Approve/Decline on a
//     `requested` row. "the href helper exists" and "an anchor with that href is in the DOM, and the actions
//     still are too" are only the same statement if the component actually wires them, which is exactly what
//     this asserts against the rendered output.
//   - T8: a booker-cancelled request (stored `declined` + cancelled_by='booker') must read "Cancelled", not
//     "Declined" — i.e. the row threads cancelledBy into BookingStatusBadge.
//
// `next/link` is stubbed to a plain anchor (it needs an App-Router context absent in jsdom), mirroring
// tests/notifications/notification-render.test.tsx. RequestActions is a client component whose only server
// coupling is the approve/decline actions module (`"use server"` → pulls in the DB + next/headers); stubbing
// that module and `sonner` keeps the render pure without touching the controls themselves.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/app/actions/host-requests", () => ({
  approveRequest: vi.fn(),
  declineRequest: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { HostBookingRow, type HostBookingRowData } from "@/components/host/host-booking-row";

afterEach(cleanup);

function makeRow(overrides: Partial<HostBookingRowData> = {}): HostBookingRowData {
  return {
    bookingId: "bk_123",
    spaceTitle: "Sunset Court",
    bookerLabel: "Alex",
    whenLabel: "Sat, Aug 1, 10:00 AM – 11:00 AM (Makati time)",
    amountLabel: "₱1,050.00",
    refundLabel: null,
    status: "confirmed",
    startsAt: new Date("2026-08-01T02:00:00Z"),
    endsAt: new Date("2026-08-01T03:00:00Z"),
    now: new Date("2026-07-24T00:00:00Z"),
    payoutState: null,
    cancelledBy: null,
    ...overrides,
  };
}

describe("T6 — the host card links to /host/bookings/[id] (SC#3 reachable, no UUID typing)", () => {
  it("renders an anchor to the booking's detail page", () => {
    const { container } = render(<HostBookingRow row={makeRow({ bookingId: "bk_abc" })} />);
    expect(container.querySelector('a[href="/host/bookings/bk_abc"]')).not.toBeNull();
  });

  it("POSITIVE CONTROL: a `requested` row STILL renders Approve and Decline — the link does not swallow them", () => {
    render(<HostBookingRow row={makeRow({ status: "requested" })} />);
    expect(screen.getByRole("button", { name: /approve/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /decline/i })).toBeTruthy();
  });
});

describe("T8 — the host card tells the truth about who cancelled", () => {
  it("a booker-cancelled request (declined + cancelledBy 'booker') reads 'Cancelled', not 'Declined'", () => {
    render(<HostBookingRow row={makeRow({ status: "declined", cancelledBy: "booker" })} />);
    expect(screen.getByText("Cancelled")).toBeTruthy();
    expect(screen.queryByText("Declined")).toBeNull();
  });

  it("POSITIVE CONTROL: a genuine host decline (declined + cancelledBy null) still reads 'Declined'", () => {
    render(<HostBookingRow row={makeRow({ status: "declined", cancelledBy: null })} />);
    expect(screen.getByText("Declined")).toBeTruthy();
    expect(screen.queryByText("Cancelled")).toBeNull();
  });
});
