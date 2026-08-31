// TRUST-02 / TRUST-03 — the confirmation email's two open clauses, and the evidence that they were
// actually closed rather than declared closed.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS FILE EXISTS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// D-78 drew the Phase-13 email boundary at the SHELL (renderEmail) and handed the two CONTENT clauses
// — the booking reference in the subject, and the cancellation policy in the body — forward to Phase 15.
// Phase 15 shipped the shell, the injection probe and the inbox walk, and neither phase executed the
// handoff. `.planning/v1.1-MILESTONE-AUDIT.md` § "The two that are genuinely open" is where that was
// finally caught, and this file is the evidence trail it asked for.
//
// BOTH REDS WERE WATCHED, before the implementation existed. Every assertion below is written against
// exports that ALREADY EXIST, so the first run failed on the ASSERTIONS — not on a module that had not
// been written yet, which proves nothing about copy and everything about import resolution. The verbatim
// failure output is recorded in the plan's SUMMARY.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE EXPECTED SENTENCE IS DERIVED, NEVER TYPED
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// A hand-typed "Free cancellation until …" here would make this file pass forever while the emailed
// promise drifted away from the money math — the exact refund dispute the whole disclosure apparatus
// exists to prevent (D-81). So the expectation is composed the same way every other surface composes it:
// `rungBoundaries` → `composeDeadlineLabel` per rung → `bestFutureRungIndex` → `policySummaryLine`, all
// of it rooted in `LADDER`, the same constant `quoteRefund` evaluates. Move a rung in `cancellation.ts`
// and this file's expectation moves with it.
//
// NO DATABASE. `tests/setup.ts` mocks Resend globally and forces a fake key, so the sends are captured
// in-process; `sendForType`'s `booking_confirmed` branch reads its whole input off the event. This is the
// `tests/auth/email-escaping.test.ts` idiom — plain vitest, `mockResend`, no `setupTestDb`.
//
// EVERY INSTANT IS AN ABSOLUTE LITERAL — never `new Date()`. A fixture that seeds from the clock makes a
// red depend on the hour it ran, and the hour it ran is the one thing a failure report never carries.

import { describe, it, expect } from "vitest";

import { sendBookingConfirmed } from "@/lib/email";
import { sendForType } from "@/inngest/functions/notify";
import { bestFutureRungIndex, rungBoundaries } from "@/lib/payments/cancellation";
import { composeDeadlineLabel } from "@/lib/booking/when-label";
import { policySummaryLine } from "@/components/booking/cancellation-policy-disclosure";
import { escapeHtml } from "@/lib/email-shell";
import { mockResend } from "../helpers/mocks";
import type { NotificationPayload } from "@/lib/db/schema";

// ── Fixture: one booking, eleven days out, so EVERY tier still has a future rung ────────────────────
const STARTS_AT = new Date("2026-09-12T10:00:00.000Z");
const NOW = new Date("2026-09-01T02:00:00.000Z");
const TZ = "Asia/Manila";
const CITY = "Manila";
const REFERENCE = "FIT-8QK2M4RA";
const TIER = "standard" as const;

const TO = "booker@fitout.invalid";
const SPACE = "Sunrise Court — Bay 2";
const WHEN = "Sat 12 Sep, 6:00–7:00 PM (Manila time)";
const URL = "https://fitout.test/bookings/bk_trust_1";

/** The boundary instants, formatted venue-local by the ONE formatter that owns venue-local rendering. */
const boundaryLabels = rungBoundaries(TIER, STARTS_AT).map((r) =>
  composeDeadlineLabel(r.boundary, TZ, CITY),
);
/** The best rung still open at `NOW` — the same index the RSC computes and forwards to the component. */
const bestRungIndex = bestFutureRungIndex(TIER, STARTS_AT, NOW);
/** The sentence the SCREEN states for this booking. The inbox must state the same one. */
const EXPECTED_POLICY = policySummaryLine(TIER, { openCapacity: false }, boundaryLabels, bestRungIndex);

/**
 * The COPY a recipient reads, as one searchable string (the `notify.test.ts` rule). `renderEmail` escapes
 * the five HTML-significant characters into the HTML part, so a sentence assertion belongs on the
 * plain-text twin, which is projected from the SAME `EmailContent` with the raw strings.
 */
function copy(email: { text?: string } | undefined): string {
  const text = email?.text;
  if (!text) throw new Error("captured email has no plain-text part — the twin IS the copy under test");
  return text;
}

/**
 * A well-formed `booking_confirmed` payload carrying the pre-composed policy sentence (D-RPT-01). Cast at
 * the boundary, the `notify.test.ts` idiom, so this file compiles against the union both BEFORE and AFTER
 * the widening — which is what makes the fan-out case below a genuine red rather than a compile error.
 */
function confirmedPayload(overrides: Record<string, unknown> = {}): NotificationPayload {
  return {
    type: "booking_confirmed",
    listingTitle: SPACE,
    whenLabel: WHEN,
    totalLabel: "₱1,050.00",
    referenceLabel: REFERENCE,
    href: URL,
    policyLabel: EXPECTED_POLICY,
    ...overrides,
  } as NotificationPayload;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE GUARD — green today, and not evidence of anything. It is what keeps the two reds MEANINGFUL.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
describe("the fixture provably exercises a DATED rung (the concreteness guard)", () => {
  it("has a still-future rung at NOW, and the derived sentence names its venue-local instant", () => {
    // If this ever went red, the fixture would have drifted past its own ladder and the two clause
    // assertions below would be asserting the DATELESS tier-name fallback — passing while proving nothing.
    expect(bestRungIndex).toBeGreaterThanOrEqual(0);
    expect(boundaryLabels[bestRungIndex]).toBeTruthy();
    expect(EXPECTED_POLICY).toContain(boundaryLabels[bestRungIndex]);
    // Venue-local, with the city suffix the shared formatter owns — never a raw ISO instant.
    expect(EXPECTED_POLICY).toContain(`(${CITY} time)`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// TRUST-02 — "the booking reference is findable from an inbox search"
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
describe("TRUST-02 — the confirmation email's SUBJECT carries the FIT- reference", () => {
  it("puts the reference in the subject line, where an inbox search can reach it", async () => {
    await sendBookingConfirmed(TO, SPACE, WHEN, REFERENCE, URL);

    const email = mockResend.last();
    expect(email).toBeDefined();
    // The body has always carried it. The SUBJECT is the searchable surface — a booker looking for
    // "FIT-8QK2M4RA" in their mail client scans subjects first, and threads collapse to their subject.
    expect(email!.subject).toContain(REFERENCE);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// TRUST-03 — "the cancellation policy is disclosed on the surface the booker actually keeps"
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
describe("TRUST-03 — the confirmation email BODY discloses the cancellation policy, with a date", () => {
  it("states the policy sentence in the plain-text part, verbatim as the screen states it", async () => {
    await sendBookingConfirmed(TO, SPACE, WHEN, REFERENCE, URL);

    const email = mockResend.last();
    expect(email).toBeDefined();
    expect(copy(email)).toContain(EXPECTED_POLICY);
  });

  it("states the same sentence in the html part, escaped by the one shell escaper", async () => {
    await sendBookingConfirmed(TO, SPACE, WHEN, REFERENCE, URL);

    const email = mockResend.last();
    expect(email).toBeDefined();
    // `escapeHtml` rather than a raw compare: the shell escapes every sink on the way into the HTML
    // projection (WR-01 / EMAIL-01), so the escaped form is what a correct render actually contains.
    expect(email!.html ?? "").toContain(escapeHtml(EXPECTED_POLICY));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE WIRING — the payload is the SOLE input to both channels (D-91), so the sentence must SURVIVE it
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
describe("TRUST-03 fan-out — the pre-composed sentence reaches the inbox through sendForType", () => {
  it("threads payload.policyLabel into the confirmation email rather than dropping it", async () => {
    // The CR-02 defect, in its exact shape: a payload field the emitter composes correctly and the
    // dispatcher silently never reads. No database — `booking_confirmed` reads its whole input here.
    const result = await sendForType({
      type: "booking_confirmed",
      recipientId: "trust03_recipient",
      bookingId: null,
      email: "fanout@fitout.invalid",
      payload: confirmedPayload(),
    });

    expect(result.sent).toBe(true);
    const [email] = mockResend.sent().filter((e) => e.to === "fanout@fitout.invalid");
    expect(email).toBeDefined();
    expect(copy(email)).toContain(EXPECTED_POLICY);
    // And the reference still rides the subject on this path too — one sender, one guarantee.
    expect(email.subject).toContain(REFERENCE);
  });
});
