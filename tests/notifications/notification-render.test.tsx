// @vitest-environment jsdom

// T-07-84 — the RENDER side of notification safety.
//
// WHY A RENDER TEST AND NOT JUST A UNIT TEST ON safeHref. The property that matters is not "the helper
// returns null" — it is "a hostile href never reaches an `href` attribute in the DOM". Those are only the
// same statement if the component actually calls the helper on the path that builds the anchor, and that
// wiring is exactly what a refactor breaks. So this file asserts against the rendered output.
//
// WHY IT EXISTS AT ALL, given 07-07 already validates the scheme at the WRITE boundary. Because a durable
// row outlives the guard that wrote it. Rows written before that guard landed, rows from a future emitter
// that bypasses the shared boundary, and rows edited directly in the database all arrive at this renderer
// unexamined. Defence at one end of a durable pipe is not defence — 07-07's own summary flags this
// component as the surface it was defending in advance.
//
// The specific hazard, restated because it is counter-intuitive: React escapes TEXT, and `escapeHtml`
// escapes HTML metacharacters — neither touches a URL SCHEME. `javascript:alert(1)` survives both
// perfectly intact, and React will happily render it into `<a href>` without complaint.
//
// `next/link` is stubbed to a plain anchor: it needs an App-Router context that does not exist in jsdom,
// and for this question the stub is faithful — Link's entire contribution here is emitting `<a href>`,
// which is precisely the thing under test.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import type { NotificationPayload } from "@/lib/db/schema";

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

const { NotificationItem, safeHref, describeNotification } = await import(
  "@/components/notifications/notification-item"
);

afterEach(cleanup);

function confirmedPayload(overrides: Partial<Extract<NotificationPayload, { type: "booking_confirmed" }>> = {}) {
  return {
    type: "booking_confirmed" as const,
    listingTitle: "Sunset Court",
    whenLabel: "Sat, 3 May · 9:00–10:00 AM (Asia/Manila)",
    totalLabel: "₱1,050.00",
    referenceLabel: "FIT-ABCD1234",
    href: "/bookings/bk_1",
    ...overrides,
  };
}

function renderItem(payload: NotificationPayload, unread = true) {
  return render(
    <NotificationItem item={{ id: "n1", payload, unread, timeAgoLabel: "2h ago" }} />,
  );
}

describe("T-07-84 — a hostile href never becomes a rendered anchor", () => {
  // Every scheme/shape that survives HTML escaping but must not be navigable.
  const HOSTILE = [
    "javascript:alert(document.cookie)",
    "JavaScript:alert(1)", // scheme matching must not be case-sensitive
    "  javascript:alert(1)", // nor defeated by leading whitespace
    "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
    "vbscript:msgbox(1)",
    // Looks root-relative to a naive startsWith("/") check; a browser reads it as cross-origin.
    "//evil.example/steal",
  ];

  for (const href of HOSTILE) {
    it(`renders no anchor for ${JSON.stringify(href)}`, () => {
      const { container } = renderItem(confirmedPayload({ href }) as NotificationPayload);

      // THE ASSERTION: not one anchor in the subtree, hostile or otherwise.
      expect(container.querySelectorAll("a")).toHaveLength(0);
      // And the string appears nowhere as an attribute value under any name.
      expect(container.innerHTML).not.toContain("javascript:");
      expect(container.innerHTML).not.toContain("vbscript:");
      expect(container.innerHTML).not.toContain("data:text/html");

      // POSITIVE CONTROL: the notification is still READABLE — it degrades to static content rather than
      // disappearing. A renderer that returned null on a bad href would pass every assertion above while
      // silently swallowing notifications, which is its own (quieter) failure.
      expect(screen.getByText("Booking confirmed")).toBeTruthy();
      expect(screen.getByText(/Sunset Court/)).toBeTruthy();
    });
  }

  it("POSITIVE CONTROL: a legitimate href DOES render a navigable anchor", () => {
    const { container } = renderItem(confirmedPayload({ href: "/bookings/bk_1" }));
    const anchors = container.querySelectorAll("a");
    expect(anchors).toHaveLength(1);
    expect(anchors[0].getAttribute("href")).toBe("/bookings/bk_1");
  });

  it("POSITIVE CONTROL: an absolute https href also renders", () => {
    const { container } = renderItem(
      confirmedPayload({ href: "https://fitout.example/bookings/bk_1" }),
    );
    expect(container.querySelectorAll("a")).toHaveLength(1);
  });

  it("root-relative hrefs from the 07-10 emitters render fine (no renderer break)", () => {
    // 07-10's cancel-booking.ts emits root-relative hrefs. That is a known defect assigned to 07-11 for a
    // different reason; the renderer must not be the thing that breaks on them in the meantime.
    for (const href of ["/bookings", "/bookings/bk_x/cancel", "/host/bookings?tab=past"]) {
      const { container } = renderItem(confirmedPayload({ href }));
      expect(container.querySelectorAll("a")[0]?.getAttribute("href")).toBe(href);
      cleanup();
    }
  });
});

describe("T-07-84 — payload display strings render as escaped text, never as markup", () => {
  it("an HTML-injection attempt in a listing title stays inert text", () => {
    const hostileTitle = '<img src=x onerror="alert(1)">';
    const { container } = renderItem(confirmedPayload({ listingTitle: hostileTitle }));

    // No element was created from the string...
    expect(container.querySelector("img")).toBeNull();
    // ...and it is present as visible TEXT, which is the correct, honest rendering of a hostile title.
    expect(container.textContent).toContain(hostileTitle);
  });
});

describe("D-122 — group RSVP notifications render safely (escaped text + safeHref anchor)", () => {
  const absHref = "https://fitout.example/bookings/bk1/group";

  it("group_rsvp_received (yes) renders the coming copy and a navigable absolute anchor", () => {
    const { container } = renderItem({
      type: "group_rsvp_received",
      listingTitle: "Sunset Court",
      whenLabel: "Sat, 3 May · 9:00–10:00 AM (Asia/Manila)",
      attendeeLabel: "Cassie",
      answer: "yes",
      href: absHref,
    });
    expect(screen.getByText(/is coming/)).toBeTruthy();
    const anchors = container.querySelectorAll("a");
    expect(anchors).toHaveLength(1);
    // The ABSOLUTE group href passes safeHref and renders as the anchor target (07-10 convention).
    expect(anchors[0].getAttribute("href")).toBe(absHref);
  });

  it("group_rsvp_received (no) reads differently from the yes variant", () => {
    renderItem({
      type: "group_rsvp_received",
      listingTitle: "Sunset Court",
      whenLabel: "W",
      attendeeLabel: "Dev",
      answer: "no",
      href: absHref,
    });
    expect(screen.getByText(/can't make it/)).toBeTruthy();
  });

  it("G6: a guest-typed attendee name renders as inert TEXT, never as markup", () => {
    const hostileName = '<img src=x onerror="alert(1)">';
    const { container } = renderItem({
      type: "group_rsvp_received",
      listingTitle: "Sunset Court",
      whenLabel: "W",
      attendeeLabel: hostileName,
      answer: "yes",
      href: absHref,
    });
    // No element materialised from the string...
    expect(container.querySelector("img")).toBeNull();
    // ...and it is present verbatim as visible text (React auto-escaped it).
    expect(container.textContent).toContain(hostileName);
  });

  it("group_cancelled with a hostile href degrades to inert, readable content (render-side safeHref)", () => {
    const { container } = renderItem({
      type: "group_cancelled",
      listingTitle: "Sunset Court",
      whenLabel: "W",
      // A durable row could carry a scheme the write guard never saw; the renderer refuses it independently.
      href: "javascript:alert(1)" as string,
    });
    expect(container.querySelectorAll("a")).toHaveLength(0);
    expect(container.innerHTML).not.toContain("javascript:");
    expect(screen.getByText("Group booking cancelled")).toBeTruthy();
  });

  it("group_rsvp_confirmed renders a navigable anchor for an absolute href", () => {
    const { container } = renderItem({
      type: "group_rsvp_confirmed",
      listingTitle: "Sunset Court",
      whenLabel: "W",
      href: absHref,
    });
    expect(screen.getByText("You're on the list")).toBeTruthy();
    expect(container.querySelectorAll("a")).toHaveLength(1);
  });
});

describe("safeHref — the allow-list is closed, not a blocklist", () => {
  it("accepts only root-relative paths and http(s) URLs", () => {
    expect(safeHref("/bookings/1")).toBe("/bookings/1");
    expect(safeHref("http://x.example/a")).toBe("http://x.example/a");
    expect(safeHref("https://x.example/a")).toBe("https://x.example/a");
  });

  it("refuses everything else, including shapes no blocklist would anticipate", () => {
    for (const bad of [
      "javascript:alert(1)",
      "//evil.example",
      "mailto:a@b.example",
      "tel:+639171234567",
      "bookings/1", // bare relative — not a shape this product emits
      "#anchor",
      "",
      null,
      undefined,
      42,
      {},
    ]) {
      expect(safeHref(bad)).toBeNull();
    }
  });
});

describe("WR-04 — a host cancellation renders each side's OWN truthful copy", () => {
  // 07-17: `cancelBookingAsHost` emits booking_cancelled_by_host to BOTH parties. Pre-fix the host's
  // copy was the booker's verbatim — "Your host cancelled … ₱X refunded" — wrong on every clause for
  // the canceller, and the D-71 fee consequence appeared in neither channel. The `side` discriminant
  // fixes the audience; these cases pin both directions plus the durable-row fallback.
  const base = {
    type: "booking_cancelled_by_host" as const,
    listingTitle: "Sunset Court",
    whenLabel: "Sat, 3 May · 9:00–10:00 AM (Asia/Manila)",
    refundLabel: "₱1,050.00",
    href: "/host/bookings",
  };

  it("side:'host' states the HOST's situation: you cancelled, your guest is refunded, the fee", () => {
    const { title, body } = describeNotification({ ...base, side: "host", feeLabel: "₱300.00" });
    expect(title).toBe("You cancelled this booking");
    expect(body).toContain("₱1,050.00 refunded to your guest");
    expect(body).toContain("₱300.00 fee");
    // The canceller must never read the booker's sentence about themselves.
    expect(`${title} ${body}`).not.toContain("Your host cancelled");
  });

  it("side:'host' with NO fee charged renders no fee clause — a '₱0 fee' would be CR-01's disease anew", () => {
    const { title, body } = describeNotification({ ...base, side: "host" });
    expect(title).toBe("You cancelled this booking");
    expect(body).not.toContain("fee");
    expect(body).toContain("refunded to your guest");
  });

  it("POSITIVE CONTROL: side:'booker' renders today's booker copy byte-identically", () => {
    const { title, body } = describeNotification({ ...base, side: "booker" });
    expect(title).toBe("Your host cancelled");
    expect(body).toBe(
      "Sunset Court · Sat, 3 May · 9:00–10:00 AM (Asia/Manila) · ₱1,050.00 refunded",
    );
  });

  it("POSITIVE CONTROL: a durable pre-07-17 row (no side field) still renders the booker copy", () => {
    // A jsonb row outlives the code that wrote it. Rows written before the discriminant existed carry
    // no `side`; anything !== "host" — including undefined — must keep meaning exactly what it meant
    // the day it was written. The cast simulates that durable shape.
    const legacy = { ...base } as unknown as NotificationPayload;
    const { title, body } = describeNotification(legacy);
    expect(title).toBe("Your host cancelled");
    expect(body).toBe(
      "Sunset Court · Sat, 3 May · 9:00–10:00 AM (Asia/Manila) · ₱1,050.00 refunded",
    );
  });
});

describe("describeNotification — every payload kind has copy", () => {
  it("never returns an empty title or body for any kind", () => {
    // The union's exhaustiveness is enforced at COMPILE time by the `never` weld; this catches the other
    // half — a case that compiles but returns blank strings, which renders as an empty row.
    const samples: NotificationPayload[] = [
      confirmedPayload(),
      { type: "request_received", listingTitle: "A", whenLabel: "W", totalLabel: "T", href: "/b" },
      { type: "request_approved", listingTitle: "A", whenLabel: "W", totalLabel: "T", payByLabel: "P", href: "/b" },
      { type: "request_declined", listingTitle: "A", whenLabel: "W", expired: false, href: "/b" },
      { type: "request_declined", listingTitle: "A", whenLabel: "W", expired: true, href: "/b" },
      { type: "new_request_to_host", listingTitle: "A", whenLabel: "W", bookerLabel: "B", totalLabel: "T", respondByLabel: "R", href: "/b" },
      { type: "booking_cancelled_by_booker", listingTitle: "A", whenLabel: "W", bookerLabel: "B", href: "/b" },
      { type: "booking_cancelled_by_host", listingTitle: "A", whenLabel: "W", refundLabel: "R", side: "booker", href: "/b" },
      { type: "booking_cancelled_by_host", listingTitle: "A", whenLabel: "W", refundLabel: "R", side: "host", feeLabel: "F", href: "/b" },
      { type: "refund_issued", listingTitle: "A", whenLabel: "W", refundLabel: "R", href: "/b" },
      { type: "reminder_pre_expiry", listingTitle: "A", whenLabel: "W", totalLabel: "T", payByLabel: "P", href: "/b" },
      { type: "reminder_pre_session", listingTitle: "A", whenLabel: "W", href: "/b" },
      { type: "reminder_pre_sla", listingTitle: "A", whenLabel: "W", bookerLabel: "B", respondByLabel: "R", href: "/b" },
      { type: "group_rsvp_received", listingTitle: "A", whenLabel: "W", attendeeLabel: "N", answer: "yes", href: "/b" },
      { type: "group_rsvp_received", listingTitle: "A", whenLabel: "W", attendeeLabel: "N", answer: "no", href: "/b" },
      { type: "group_rsvp_confirmed", listingTitle: "A", whenLabel: "W", href: "/b" },
      { type: "group_cancelled", listingTitle: "A", whenLabel: "W", href: "/b" },
    ];

    for (const payload of samples) {
      const { Icon, title, body } = describeNotification(payload);
      expect(Icon, `icon for ${payload.type}`).toBeTruthy();
      expect(title.length, `title for ${payload.type}`).toBeGreaterThan(0);
      expect(body.length, `body for ${payload.type}`).toBeGreaterThan(0);
    }

    // Both declined variants must read differently — C6 makes a lapse and a refusal two sentences.
    const declined = describeNotification({ type: "request_declined", listingTitle: "A", whenLabel: "W", expired: false, href: "/b" });
    const lapsed = describeNotification({ type: "request_declined", listingTitle: "A", whenLabel: "W", expired: true, href: "/b" });
    expect(declined.title).not.toBe(lapsed.title);
  });
});
