// The single booking-status derivation (07-02 Task 2 · MANAGE-02 · D-79 / D-102).
//
// PURE table-driven unit test — no DB/IO — mirroring tests/payments/commission.test.ts. /bookings,
// /host/bookings and /bookings/[id] all render from this one derivation, so these assertions are what stops
// the two sides drifting. It proves the correctness facts the views rest on:
//   - D-102: `completed` is DERIVED AT READ TIME and NEVER stored — a `confirmed` booking whose endsAt has
//     passed displays as Completed. Proven AT the endsAt boundary (the off-by-one that would misfile a
//     booking between the Upcoming and Past tabs), and proven to apply to `confirmed` ONLY.
//   - The side-specific labels: the same DB status reads differently to the booker and the host wherever
//     the next action differs (approved / requested).
//   - `--success` is reserved for `confirmed` alone (05/06-UI-SPEC: approved is NOT paid yet).
//   - D-79: no label ever carries a money string — refund detail is a SIBLING line, never in the badge.
//
// DS-10 (plan 10-10) RETYPED THE TONE. The view's `tone` is now `StatusTone`, the closed four-tone
// vocabulary in @/lib/design/status-tones, shared with the payout ledger view. The tone assertions below
// were rewritten against it: the two in-flight/closed treatments this file used to name collapse to
// `neutral`, and the success treatment is `positive`. The MEANINGS are unchanged and are what these
// assertions still protect — `approved` must never read as the paid signal, and only `confirmed` may.
// Nothing about labels, icons or the D-102 derivation moved.

import { describe, it, expect } from "vitest";
import {
  deriveDisplayStatus,
  deriveBookingStatusView,
  declinedCopy,
  type BookingDbStatus,
} from "@/components/booking/booking-status";

const NOW = new Date("2026-07-02T10:00:00Z");
const FUTURE = new Date("2026-07-02T12:00:00Z");
const PAST = new Date("2026-07-02T08:00:00Z");

const ALL_STATUSES: BookingDbStatus[] = [
  "pending",
  "confirmed",
  "cancelled",
  "declined",
  "completed",
  "requested",
  "approved",
];

describe("deriveDisplayStatus — read-time `completed` (D-102)", () => {
  it("a confirmed booking whose endsAt has passed derives as completed", () => {
    expect(deriveDisplayStatus("confirmed", new Date(NOW.getTime() - 1), NOW)).toBe("completed");
  });

  it("a confirmed booking whose endsAt is still ahead stays confirmed", () => {
    expect(deriveDisplayStatus("confirmed", new Date(NOW.getTime() + 1), NOW)).toBe("confirmed");
  });

  it("endsAt exactly === now is already completed (the session has ended)", () => {
    expect(deriveDisplayStatus("confirmed", new Date(NOW.getTime()), NOW)).toBe("completed");
  });

  it("ONLY confirmed derives to completed — a past cancelled booking stays cancelled", () => {
    expect(deriveDisplayStatus("cancelled", PAST, NOW)).toBe("cancelled");
  });

  it("no other past status is rewritten by the derivation", () => {
    for (const s of ALL_STATUSES.filter((s) => s !== "confirmed")) {
      expect(deriveDisplayStatus(s, PAST, NOW)).toBe(s);
    }
  });

  it("is pure in `now` — it never consults the machine clock", () => {
    // Same inputs, a `now` far in the past ⇒ the SAME confirmed result, regardless of the real time.
    const longAgo = new Date("2020-01-01T00:00:00Z");
    expect(deriveDisplayStatus("confirmed", PAST, longAgo)).toBe("confirmed");
  });
});

describe("deriveBookingStatusView — side-specific labels (MANAGE-02)", () => {
  it("approved reads 'Approved — pay now' to the booker and 'Awaiting payment' to the host", () => {
    expect(deriveBookingStatusView("approved", FUTURE, NOW, "booker").label).toBe("Approved — pay now");
    expect(deriveBookingStatusView("approved", FUTURE, NOW, "host").label).toBe("Awaiting payment");
  });

  it("requested reads 'Awaiting host' to the booker and 'Requested' to the host", () => {
    expect(deriveBookingStatusView("requested", FUTURE, NOW, "booker").label).toBe("Awaiting host");
    expect(deriveBookingStatusView("requested", FUTURE, NOW, "host").label).toBe("Requested");
  });

  it("pending / confirmed / declined / cancelled read identically to both sides", () => {
    for (const s of ["pending", "confirmed", "declined", "cancelled"] as const) {
      expect(deriveBookingStatusView(s, FUTURE, NOW, "booker").label).toBe(
        deriveBookingStatusView(s, FUTURE, NOW, "host").label,
      );
    }
  });

  it("the cancelled label is always and only 'Cancelled' (D-79 — refund detail is a sibling line)", () => {
    expect(deriveBookingStatusView("cancelled", FUTURE, NOW, "booker").label).toBe("Cancelled");
    expect(deriveBookingStatusView("cancelled", PAST, NOW, "host").label).toBe("Cancelled");
  });

  it("a past confirmed booking renders the derived Completed view to both sides", () => {
    expect(deriveBookingStatusView("confirmed", PAST, NOW, "booker").label).toBe("Completed");
    expect(deriveBookingStatusView("confirmed", PAST, NOW, "host").label).toBe("Completed");
  });
});

describe("deriveBookingStatusView — tone + icon contract (UI-SPEC § Status badge matrix)", () => {
  it("confirmed (still ahead) is the ONE positive tone", () => {
    expect(deriveBookingStatusView("confirmed", FUTURE, NOW, "booker").tone).toBe("positive");
    expect(deriveBookingStatusView("confirmed", FUTURE, NOW, "host").tone).toBe("positive");
  });

  it("the positive tone is NEVER returned for any other display status", () => {
    for (const side of ["booker", "host"] as const) {
      for (const s of ALL_STATUSES) {
        const view = deriveBookingStatusView(s, PAST, NOW, side);
        // Every status evaluated at a PAST endsAt: confirmed has derived to completed, so nothing is positive.
        expect(view.tone).not.toBe("positive");
        expect(view.tone).toBe("neutral");
      }
    }
  });

  it("approved is neutral — it is in flight, NOT paid yet, and must never read as the paid signal", () => {
    // DS-10 folded the old bordered treatment into `neutral`: approved was never a distinct tone, only a
    // distinct border. What must stay true is that it is not the positive one, which is asserted here
    // directly rather than through the name of a treatment that no longer exists.
    const view = deriveBookingStatusView("approved", FUTURE, NOW, "booker");
    expect(view.tone).toBe("neutral");
    expect(view.tone).not.toBe("positive");
  });

  it("every status returns a non-empty label and an icon", () => {
    for (const side of ["booker", "host"] as const) {
      for (const s of ALL_STATUSES) {
        const view = deriveBookingStatusView(s, FUTURE, NOW, side);
        expect(view.label.length).toBeGreaterThan(0);
        expect(view.icon.length).toBeGreaterThan(0);
      }
    }
  });

  it("NO label ever contains a currency symbol or a digit (D-79 — money is never in the badge)", () => {
    for (const side of ["booker", "host"] as const) {
      for (const s of ALL_STATUSES) {
        for (const endsAt of [FUTURE, PAST]) {
          const { label } = deriveBookingStatusView(s, endsAt, NOW, side);
          expect(label).not.toMatch(/[₱$€£]/);
          expect(label).not.toMatch(/\d/);
        }
      }
    }
  });
});

// ── T8 (07-18): cancelled_by discriminates a booker-cancel from a genuine host decline ──────────────────
// `cancelUnpaidHold` stores a booker cancelling their own unpaid `requested` hold as `declined` +
// cancelled_by='booker'; a real host decline (declineRequest) and the SLA auto-decline leave cancelled_by
// NULL. So the SAME `declined` enum value carries two truthfully-different meanings, and only cancelled_by
// tells them apart. These cases pin the remap and are the content-pin for the /bookings/[id] declined branch.

describe("deriveDisplayStatus — cancelled_by-aware remap (T8)", () => {
  it("declined + cancelledBy 'booker' remaps to cancelled (the booker cancelled their own hold)", () => {
    expect(deriveDisplayStatus("declined", FUTURE, NOW, "booker")).toBe("cancelled");
    expect(deriveDisplayStatus("declined", PAST, NOW, "booker")).toBe("cancelled");
  });

  it("declined + cancelledBy null stays declined (genuine host decline / SLA lapse — durable rows keep meaning)", () => {
    expect(deriveDisplayStatus("declined", FUTURE, NOW, null)).toBe("declined");
  });

  it("declined + cancelledBy 'host' stays declined (the host is the actor)", () => {
    expect(deriveDisplayStatus("declined", FUTURE, NOW, "host")).toBe("declined");
  });

  it("the cancelledBy arg is OPTIONAL — omitting it leaves declined as declined (existing call sites unaffected)", () => {
    expect(deriveDisplayStatus("declined", PAST, NOW)).toBe("declined");
  });

  it("cancelledBy 'booker' remaps ONLY declined — confirmed/cancelled/completed are untouched", () => {
    expect(deriveDisplayStatus("cancelled", PAST, NOW, "booker")).toBe("cancelled");
    expect(deriveDisplayStatus("confirmed", new Date(NOW.getTime() + 1), NOW, "booker")).toBe("confirmed");
    // a past confirmed still derives to completed regardless of a (nonsensical) cancelledBy value
    expect(deriveDisplayStatus("confirmed", PAST, NOW, "booker")).toBe("completed");
  });
});

describe("deriveBookingStatusView — a booker-cancelled request reads Cancelled, not Declined (T8)", () => {
  it("declined + cancelledBy 'booker' reads 'Cancelled' / Ban / neutral on BOTH sides", () => {
    for (const side of ["booker", "host"] as const) {
      const view = deriveBookingStatusView("declined", FUTURE, NOW, side, "booker");
      expect(view.label).toBe("Cancelled");
      expect(view.icon).toBe("Ban");
      expect(view.tone).toBe("neutral");
    }
  });

  it("declined + cancelledBy null still reads 'Declined' (unchanged)", () => {
    expect(deriveBookingStatusView("declined", FUTURE, NOW, "booker", null).label).toBe("Declined");
    expect(deriveBookingStatusView("declined", FUTURE, NOW, "host").label).toBe("Declined");
  });
});

describe("declinedCopy — truthful attribution of who ended a declined-status request (T8)", () => {
  it("cancelledBy 'booker' names the booker's own action and never blames the host", () => {
    const { heading, body } = declinedCopy("booker");
    expect(heading.toLowerCase()).toContain("cancelled");
    expect(body).not.toContain("The host couldn't take");
    // PARAMETER-FREE by design: no {date}/{time} token leaks into the copy (the caller renders venue/time
    // as a sibling line, exactly as the `cancelled` branch does).
    expect(body).not.toMatch(/\{.*\}/);
  });

  it("cancelledBy null returns the host-decline copy, parameter-free", () => {
    const { heading, body } = declinedCopy(null);
    expect(heading).toContain("wasn't available");
    expect(body).toContain("The host couldn't take your booking");
    expect(body).not.toMatch(/\{.*\}/);
  });

  it("cancelledBy 'host' also returns the host-decline copy (the host is the actor)", () => {
    expect(declinedCopy("host")).toEqual(declinedCopy(null));
  });
});
