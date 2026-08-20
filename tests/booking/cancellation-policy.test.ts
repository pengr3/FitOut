// BOOK-07 / D-77 / D-81 — the two human ends of the cancellation tier: a host CHOOSING it, and a booker
// SEEING it before they commit money.
//
// Everything downstream of the tier NAME already had tests before this file existed — the ladder (07-03),
// the snapshot (07-08), the refund quote and the cancel screen (07-09). What was untested was whether the
// tier can be skipped on the way in, and whether what a booker is SHOWN is what the engine later APPLIES.
// Those are the two things this file pins, and they are pinned differently on purpose:
//
//   · The publish gate is driven through the REAL `publishListing` action against an isolated schema, so
//     it proves the SERVER refuses — the wizard's checklist is client state and can be bypassed (T-07-88).
//   · The disclosure agreement is proven by DERIVING BOTH SIDES FROM `LADDER` and asserting they meet.
//     No expected percentage or hour figure is hand-typed anywhere below. Edit a rung in cancellation.ts
//     and either this file's expectations move with it, or it goes red — it cannot silently pass while the
//     copy and the money drift apart. That drift is exactly how a disclosure becomes a refund dispute.
//
// Harness: the vi.doMock idiom (mock next/headers, @/lib/auth, @/lib/db, next/cache → import the actions)
// against an isolated schema, cloned from tests/listing/status-gate.test.ts.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { listing, listingPhoto, booking, user } from "@/lib/db/schema";
import type { DraftListingInput } from "@/lib/validation/listing";
import {
  LADDER,
  quoteRefund,
  rungBoundaries,
  bestFutureRungIndex,
  type CancellationTier,
} from "@/lib/payments/cancellation";
import {
  policyDisclosureLines,
  policySummaryLine,
  type DeadlineAnchorInput,
} from "@/components/booking/cancellation-policy-disclosure";
import { composePolicyDisclosure } from "@/lib/booking/policy-disclosure";

const HOUR = 60 * 60 * 1000;
const TIERS: CancellationTier[] = ["flexible", "standard", "strict"];

/**
 * 09-09: the deadline anchor is a REQUIRED argument (09-UI-SPEC § 5b). Every case in this file is about the
 * D-68 LADDER, which is byte-identical in both occupancy modes (OC-15) — so they all pass the EXCLUSIVE
 * anchor, and the drop-in wording is pinned separately in tests/booking/cancellation-copy.test.tsx.
 * Named rather than inlined so the compiler census this argument creates is visible at a glance.
 */
const EXCLUSIVE: DeadlineAnchorInput = { openCapacity: false };

let testDb: TestDb;
let testAuth: TestAuth;
type ListingActions = typeof import("@/app/actions/listing");
let createDraftListing: ListingActions["createDraftListing"];
let saveListingStep: ListingActions["saveListingStep"];
let publishListing: ListingActions["publishListing"];

const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

/** Every publish requirement EXCEPT the tier — so a case can add or withhold exactly that one field. */
const CORE_FIELDS: DraftListingInput = {
  title: "Bright Makati Studio",
  description: "Sprung floor, mirrors, sound system.",
  primarySpaceType: "dance_studio",
  addressLine1: "88 Ayala Ave",
  city: "Makati",
  region: "NCR",
  postalCode: "1226",
  country: "PH",
  neighborhood: "Salcedo",
  lat: 14.5547,
  lng: 121.0244,
  maxOccupancy: 12,
  hourlyRateCents: 100000,
  dayRateCents: 600000,
  bookingMode: "instant",
  showExactAddress: true,
};

let hostId: string;

async function addPhotos(listingId: string, n: number): Promise<void> {
  for (let i = 0; i < n; i++) {
    await testDb.db.insert(listingPhoto).values({
      id: `${listingId}_p${i}`,
      listingId,
      publicId: `pub_${listingId}_${i}`,
      url: `https://res.cloudinary.com/mock/${listingId}/${i}.jpg`,
      position: i,
    });
  }
}

async function readListing(id: string) {
  const [row] = await testDb.db.select().from(listing).where(eq(listing.id, id));
  return row;
}

/** A draft carrying every publish requirement except (optionally) the tier, with photos attached. */
async function seedPublishReadyDraft(tier?: "flexible" | "standard" | "strict"): Promise<string> {
  const created = await createDraftListing();
  if (!created.ok || !created.id) throw new Error("draft setup failed");
  await saveListingStep(created.id, tier ? { ...CORE_FIELDS, cancellationPolicy: tier } : CORE_FIELDS);
  await addPhotos(created.id, 3);
  return created.id;
}

beforeAll(async () => {
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);

  const res = (await signUp(testAuth, {
    email: "tier.host@example.com",
    password: "averylongpassword",
    name: "Tier Host",
    firstName: "Tia",
    intent: "host",
  })) as { user: { id: string } };
  hostId = res.user.id;
  // The email soft-gate is a SEPARATE publish requirement (01-CONTEXT D-07). Satisfy it so a rejection
  // in these cases can only ever be about the cancellation tier.
  await testDb.db.update(user).set({ emailVerified: true }).where(eq(user.id, hostId));

  const signIn = await testAuth.api.signInEmail({
    body: { email: "tier.host@example.com", password: "averylongpassword" },
    asResponse: true,
  });
  const setCookie = signIn.headers.get("set-cookie");
  sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";

  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.resetModules();
  ({ createDraftListing, saveListingStep, publishListing } = await import("@/app/actions/listing"));
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("next/cache");
  await teardownTestDb(testDb);
});

describe("the publish gate (D-77 / T-07-88) — server-enforced, never the client checklist", () => {
  it("(1) REFUSES to publish a listing whose cancellation_policy IS NULL", async () => {
    // Everything else about this listing is publish-ready, so the ONLY thing that can block it is the
    // tier. The action is called directly — there is no wizard in this process, which is precisely the
    // point: this is what a stale or crafted client that skipped the step reaches.
    const id = await seedPublishReadyDraft();
    expect((await readListing(id)).cancellationPolicy).toBeNull();

    const res = await publishListing(id);

    expect(res.ok).toBe(false);
    if (!res.ok) {
      // Named, calm, and it tells the host what to do — not "invalid input".
      expect(res.fieldErrors?.cancellationPolicy).toBeDefined();
      expect(res.fieldErrors?.cancellationPolicy?.[0]).toMatch(/cancellation policy/i);
      expect(res.error).toBe("Almost there — finish these to publish.");
    }
    // The listing did not sneak through: status is untouched, and it is still not publicly viewable.
    expect((await readListing(id)).status).toBe("draft");
    expect((await readListing(id)).publishedAt).toBeNull();
  });

  it("(2) PUBLISHES the same listing once a tier is chosen", async () => {
    // The mirror of case (1) — without this, (1) would pass against an action that refuses everything.
    const id = await seedPublishReadyDraft();
    await saveListingStep(id, { cancellationPolicy: "standard" });

    const res = await publishListing(id);

    expect(res.ok).toBe(true);
    const row = await readListing(id);
    expect(row.status).toBe("published");
    expect(row.cancellationPolicy).toBe("standard");
  });

  it("(3) does NOT brick existing drafts — a NULL-tier listing still SAVES as a draft", async () => {
    // The gate is on PUBLISH, not on creation or autosave (mirroring how bookability, not listing
    // creation, is gated on payout-readiness). Every listing drafted before Phase 7 carries NULL; if the
    // draft path required a tier, all of them would be stranded mid-edit.
    const created = await createDraftListing();
    if (!created.ok || !created.id) throw new Error("draft setup failed");

    const saved = await saveListingStep(created.id, { ...CORE_FIELDS, title: "Half-finished draft" });

    expect(saved.ok).toBe(true);
    const row = await readListing(created.id);
    expect(row.title).toBe("Half-finished draft");
    expect(row.cancellationPolicy).toBeNull(); // still unchosen, and that is fine for a draft
    expect(row.status).toBe("draft");
  });

  it("(4) a tier is retierable, and the change applies FORWARD ONLY (T-07-90)", async () => {
    // The listing side changes; the booking side must not. This complements 07-09's assertion that the
    // REFUND is unchanged by asserting the underlying facts: the snapshot column itself never moves.
    const id = await seedPublishReadyDraft("strict");
    expect((await publishListing(id)).ok).toBe(true);

    const startsAt = new Date(Date.now() + 30 * HOUR);
    await testDb.db.insert(booking).values({
      id: "bk_retier",
      listingId: id,
      unit: 1,
      bookerId: hostId,
      startsAt,
      endsAt: new Date(startsAt.getTime() + HOUR),
      status: "confirmed",
      bookingMode: "instant",
      cancellationPolicy: "strict", // the D-67 snapshot taken at creation
      spacePriceCents: 100000,
      serviceFeeCents: 5000,
      quotedTotalCents: 105000,
      currency: "php",
    });

    // The host retiers to the most booker-friendly option AFTER the booking exists.
    const retiered = await saveListingStep(id, { cancellationPolicy: "flexible" });
    expect(retiered.ok).toBe(true);

    expect((await readListing(id)).cancellationPolicy).toBe("flexible"); // listing side moved
    const [bk] = await testDb.db
      .select({ policy: booking.cancellationPolicy })
      .from(booking)
      .where(eq(booking.id, "bk_retier"));
    expect(bk.policy).toBe("strict"); // booking side did NOT

    // And the money follows the snapshot, not the listing: Strict at 30h out sits in the 48h→24h rung
    // (50%). Had the quote read the listing, Flexible would have paid out 100% — a host's later edit
    // rewriting the terms of a booking already agreed and already paid for.
    const quote = quoteRefund({
      tier: bk.policy!,
      spacePriceCents: 100000,
      serviceFeeCents: 5000,
      startsAt,
      now: new Date(),
    });
    expect(quote.refundBps).toBe(5000);
  });
});

describe("concrete rung boundaries (D-81) — the dates the checkout disclosure renders", () => {
  const startsAt = new Date("2026-07-10T12:00:00Z");

  it("(5) standard returns startsAt−24h then startsAt−6h, in that order, at 100% then 50%", async () => {
    const b = rungBoundaries("standard", startsAt);
    expect(b).toHaveLength(2);
    expect(b[0].refundBps).toBe(10000);
    expect(b[0].boundary.toISOString()).toBe("2026-07-09T12:00:00.000Z"); // −24h
    expect(b[1].refundBps).toBe(5000);
    expect(b[1].boundary.toISOString()).toBe("2026-07-10T06:00:00.000Z"); // −6h
  });

  it("(6) flexible has exactly one rung, at startsAt−12h", async () => {
    const b = rungBoundaries("flexible", startsAt);
    expect(b).toHaveLength(1);
    expect(b[0].refundBps).toBe(10000);
    expect(b[0].boundary.toISOString()).toBe("2026-07-10T00:00:00.000Z"); // −12h
  });
});

describe("disclosure == enforcement — both sides derived from LADDER", () => {
  it("(7) the disclosure emits one line per LADDER rung, in ladder order, plus a no-refund close", () => {
    // The tripwire. Nothing here is hand-typed: the expected line count, the hour figures and the
    // percentages are all read out of LADDER. Add a rung, move a rung, or change a percentage in
    // cancellation.ts and these expectations move with it automatically — while a HAND-TYPED disclosure
    // would keep rendering the old promise and this test would go red.
    for (const tier of TIERS) {
      const rungs = LADDER[tier];
      const lines = policyDisclosureLines(tier, EXCLUSIVE);

      expect(lines).toHaveLength(rungs.length + 1);

      rungs.forEach((rung, i) => {
        expect(lines[i].when).toContain(String(rung.minHours));
        if (rung.refundBps >= 10000) {
          expect(lines[i].outcome).toBe("full refund of the space price");
        } else {
          expect(lines[i].outcome).toContain(`${rung.refundBps / 100}%`);
        }
      });

      expect(lines[lines.length - 1].outcome).toBe("no refund");
    }
  });

  it("(8) the collapsed summary names the LADDER's own free-cancellation lead time", () => {
    for (const tier of TIERS) {
      const freeRung = LADDER[tier].find((r) => r.refundBps >= 10000)!;
      expect(policySummaryLine(tier, EXCLUSIVE)).toContain(String(freeRung.minHours));
    }
  });

  it("(9) concrete mode renders one date per rung, and refuses a mismatched boundary set", () => {
    const startsAt = new Date("2026-07-10T12:00:00Z");
    for (const tier of TIERS) {
      const labels = rungBoundaries(tier, startsAt).map((r) => r.boundary.toISOString());
      const lines = policyDisclosureLines(tier, EXCLUSIVE, labels);

      // Every rung line names a CONCRETE instant — never a bare percentage (D-81 / C3).
      labels.forEach((label, i) => expect(lines[i].when).toContain(label));
      expect(policySummaryLine(tier, EXCLUSIVE, labels)).toContain(labels[0]);
    }

    // Boundaries formatted for one tier and passed with a different tier would disclose dates from a
    // policy the booker isn't under. It throws instead of rendering — a wrong date here is worse than
    // an error, because only the booker would ever see it.
    const flexibleLabels = rungBoundaries("flexible", startsAt).map((r) => r.boundary.toISOString());
    expect(() => policyDisclosureLines("standard", EXCLUSIVE, flexibleLabels)).toThrow(/boundary labels/);
  });

  it("(10) every DISCLOSED boundary is the exact instant quoteRefund changes its answer", () => {
    // The claim the whole plan turns on. For each tier, at each boundary the disclosure shows: standing
    // exactly ON it must award the rung that was promised, and one millisecond LATER must award strictly
    // less. If the copy and the ladder ever disagree, this is where it surfaces — and it is checked
    // against quoteRefund itself, not against a restatement of it.
    const startsAt = new Date("2026-07-10T12:00:00Z");
    const money = { spacePriceCents: 100000, serviceFeeCents: 5000, startsAt };

    for (const tier of TIERS) {
      const boundaries = rungBoundaries(tier, startsAt);
      // Index-aligned with the disclosure's rung lines — the same array the checkout page formats.
      expect(policyDisclosureLines(tier, EXCLUSIVE)).toHaveLength(boundaries.length + 1);

      boundaries.forEach(({ refundBps, boundary }, i) => {
        const onTheDot = quoteRefund({ ...money, tier, now: boundary });
        expect(onTheDot.refundBps).toBe(refundBps);
        expect(onTheDot.spaceRefundCents).toBe((100000 * refundBps) / 10000);

        // A millisecond past the boundary drops to the NEXT rung — the one the disclosure's next line
        // promises — or to nothing when this was the last rung.
        const justAfter = quoteRefund({
          ...money,
          tier,
          now: new Date(boundary.getTime() + 1),
        });
        const expectedNext = boundaries[i + 1]?.refundBps ?? 0;
        expect(justAfter.refundBps).toBe(expectedNext);
      });

      // Past the final boundary the disclosure says "no refund". The engine must agree.
      const last = boundaries[boundaries.length - 1].boundary;
      const afterAll = quoteRefund({ ...money, tier, now: new Date(last.getTime() + HOUR) });
      expect(afterAll.refundBps).toBe(0);
      expect(afterAll.totalRefundCents).toBe(0);
    }
  });

  it("(T4-rung) concrete summary leads with the best STILL-FUTURE rung, never a lapsed one", () => {
    // T4-rung UAT gap: `policySummaryLine` used to ALWAYS lead with the ladder's top (100%) rung, so once
    // its boundary had passed the one-liner advertised a "Free cancellation until <past instant>" that the
    // engine would never honour. The expanded list was already correct; only this summary lied. The RSC now
    // computes `bestFutureRungIndex` server-side and passes it in; the summary names THAT rung.
    const startsAt = new Date("2026-07-10T12:00:00Z");
    const labels = rungBoundaries("standard", startsAt).map((r) => r.boundary.toISOString());

    // bestRungIndex = 1: the 100% window has lapsed; the summary leads with the 50% rung's own date and
    // never re-advertises the lapsed top rung or the word "Free".
    const midLine = policySummaryLine("standard", EXCLUSIVE, labels, 1);
    expect(midLine).toContain("50%");
    expect(midLine).toContain(labels[1]);
    expect(midLine).not.toContain("Free cancellation");
    expect(midLine).not.toContain(labels[0]); // the lapsed 100% boundary is never named

    // bestRungIndex = 0: the unchanged happy path — free cancellation up to the top boundary.
    expect(policySummaryLine("standard", EXCLUSIVE, labels, 0)).toBe(`Free cancellation until ${labels[0]}`);

    // bestRungIndex = -1: every boundary has passed. A truthful line that promises NO window — it names the
    // tier (the same fallback the no-100%-rung case returns) and NEVER says "Free cancellation".
    const lapsedLine = policySummaryLine("standard", EXCLUSIVE, labels, -1);
    expect(lapsedLine).toBe("Standard cancellation policy");
    expect(lapsedLine).not.toMatch(/free cancellation/i);
    expect(lapsedLine).not.toContain(labels[0]);
    expect(lapsedLine).not.toContain(labels[1]);

    // An omitted index in concrete mode keeps the pre-T4-rung top-rung lead, so a caller that has not
    // adopted the index cannot regress (this is exactly what case (9) above still asserts).
    expect(policySummaryLine("standard", EXCLUSIVE, labels)).toBe(`Free cancellation until ${labels[0]}`);
  });

  it("(T4-rung) generic mode (no labels, no index) is byte-unchanged", () => {
    // The listing page passes no boundaryLabels; `bestRungIndex` must be ignored there. The summary stays
    // relative-to-session-start, exactly as case (8) pins.
    expect(policySummaryLine("standard", EXCLUSIVE)).toBe("Free cancellation up to 24 hours before the session.");
    expect(policySummaryLine("flexible", EXCLUSIVE)).toBe("Free cancellation up to 12 hours before the session.");
    expect(policySummaryLine("strict", EXCLUSIVE)).toBe("Free cancellation up to 48 hours before the session.");
  });

  it("(T4-rung) end-to-end: bestFutureRungIndex feeds a truthful summary as `now` crosses the ladder", () => {
    const HR = 60 * 60 * 1000;
    const startsAt = new Date("2026-07-10T12:00:00Z");
    const labels = rungBoundaries("standard", startsAt).map((r) => r.boundary.toISOString());

    // Well before start → the 100% rung is open.
    const early = new Date(startsAt.getTime() - 30 * HR);
    expect(
      policySummaryLine("standard", EXCLUSIVE, labels, bestFutureRungIndex("standard", startsAt, early)),
    ).toBe(`Free cancellation until ${labels[0]}`);

    // Between the two boundaries → the 50% rung is the best still open.
    const mid = new Date(startsAt.getTime() - 12 * HR);
    const midLine = policySummaryLine(
      "standard",
      EXCLUSIVE,
      labels,
      bestFutureRungIndex("standard", startsAt, mid),
    );
    expect(midLine).toContain("50%");
    expect(midLine).toContain(labels[1]);
    expect(midLine).not.toContain("Free cancellation");

    // Near start → every boundary lapsed; the summary must not advertise ANY window.
    const late = new Date(startsAt.getTime() - 3 * HR);
    expect(
      policySummaryLine("standard", EXCLUSIVE, labels, bestFutureRungIndex("standard", startsAt, late)),
    ).toBe("Standard cancellation policy");
  });

  it("(11) the non-refundable service fee is disclosed at EVERY tier, including flexible", () => {
    // C2: the one place a booker could be surprised. Flexible is the dangerous case — a full refund is
    // its only rung, so a booker most reasonably assumes everything comes back. quoteRefund never
    // refunds the fee at any tier or any rung, so the line must never be conditional.
    for (const tier of TIERS) {
      const quote = quoteRefund({
        tier,
        spacePriceCents: 100000,
        serviceFeeCents: 5000,
        startsAt: new Date("2026-07-10T12:00:00Z"),
        now: new Date("2026-07-01T12:00:00Z"), // far out — the most generous rung on every tier
      });
      expect(quote.refundBps).toBe(10000);
      expect(quote.serviceFeeRefundCents).toBe(0);
      expect(quote.totalRefundCents).toBe(quote.spaceRefundCents);
    }
  });
});


// ===================================================================================================
// THE NEW CALL SITE (plan 13-10 - TRUST-03) - the booking DETAIL page's disclosure
// ===================================================================================================
//
// The cases above prove the COMPONENT and `quoteRefund` agree at every rung boundary. That is the right
// property and it says nothing about a surface: a page that fed the component the wrong tier, boundaries
// computed against the wrong instant, or a `bestRungIndex` from a different ladder would satisfy every
// one of them perfectly, because none of them touches a caller.
//
// `composePolicyDisclosure` is the caller's half, extracted into a named pure function precisely so it
// CAN be driven here - an async page component exports nothing a test can import (Next allows `default`,
// `metadata` and a fixed set of route-segment keys and nothing else), so the alternative was to restate
// the composition in this file, which would prove only that this file can do arithmetic.
//
// EVERY EXPECTATION BELOW IS DERIVED FROM `LADDER`. Not one percentage, hour figure or peso amount is
// hand-typed: move a rung in `cancellation.ts` and these move with it or go red.
describe("composePolicyDisclosure - the booking detail page's half of TRUST-03 (13-10)", () => {
  const startsAt = new Date("2026-07-10T12:00:00Z");
  const VENUE = { timezone: "Asia/Manila", city: "Makati" };
  const MONEY = { spacePriceCents: 100000, serviceFeeCents: 5000 };

  const compose = (tier: CancellationTier | null, now: Date, openCapacity = false) =>
    composePolicyDisclosure({ tier, startsAt, now, ...VENUE, openCapacity, ...MONEY });

  it("(13-10 a) emits one venue-local boundary label per LADDER rung, index-aligned with the ladder", () => {
    for (const tier of TIERS) {
      const boundaries = rungBoundaries(tier, startsAt);
      const composed = compose(tier, new Date(startsAt.getTime() - 100 * HOUR));

      expect(composed.tier).toBe(tier);
      expect(composed.boundaryLabels).toHaveLength(boundaries.length);

      // The labels ARE what the component renders as its rung dates, so they are fed straight into it:
      // a length mismatch is what the component THROWS on, and index alignment is what makes each date
      // belong to the rung beside it. Both asserted through the component rather than restated.
      const lines = policyDisclosureLines(tier, EXCLUSIVE, composed.boundaryLabels);
      expect(lines).toHaveLength(boundaries.length + 1);
      composed.boundaryLabels!.forEach((label, i) => expect(lines[i].when).toContain(label));

      // Venue-local, with the city suffix the shared formatter owns - never a raw ISO instant, and
      // never a second date format invented at a call site.
      for (const label of composed.boundaryLabels!) {
        expect(label.endsWith(" (Makati time)"), label).toBe(true);
        expect(label).not.toContain("T12:00:00");
      }
    }
  });

  it("(13-10 b) every boundary it discloses is the exact instant quoteRefund changes its answer", () => {
    // The claim the surface turns on, asserted against the engine rather than against a restatement of
    // it: standing ON a disclosed boundary must award the rung the copy beside it promises, and one
    // millisecond later must award strictly less.
    for (const tier of TIERS) {
      const boundaries = rungBoundaries(tier, startsAt);
      const composed = compose(tier, new Date(startsAt.getTime() - 100 * HOUR));
      expect(composed.boundaryLabels).toHaveLength(boundaries.length);

      boundaries.forEach(({ refundBps, boundary }, i) => {
        const atBoundary = compose(tier, boundary);
        const onTheDot = quoteRefund({ tier, ...MONEY, startsAt, now: boundary });
        expect(onTheDot.refundBps).toBe(refundBps);
        // The figure the page prints IS the engine's answer at the page's own instant.
        expect(atBoundary.todayRefundCents).toBe(onTheDot.totalRefundCents);

        const justAfter = compose(tier, new Date(boundary.getTime() + 1));
        const expectedNext = boundaries[i + 1]?.refundBps ?? 0;
        expect(justAfter.todayRefundCents).toBe((MONEY.spacePriceCents * expectedNext) / 10000);
      });

      // Past the final boundary the disclosure says "no refund" and the figure is zero. The two must
      // agree: a "no refund" rung list beside a non-zero peso promise is the disclosure dispute this
      // whole apparatus exists to prevent.
      const last = boundaries[boundaries.length - 1].boundary;
      const lapsed = compose(tier, new Date(last.getTime() + HOUR));
      expect(lapsed.todayRefundCents).toBe(0);
      expect(lapsed.bestRungIndex).toBe(-1);
      expect(
        policySummaryLine(tier, EXCLUSIVE, lapsed.boundaryLabels, lapsed.bestRungIndex),
      ).not.toMatch(/free cancellation/i);
    }
  });

  it("(13-10 c) `bestRungIndex` names the best rung STILL OPEN, so no lapsed window is advertised", () => {
    for (const tier of TIERS) {
      const boundaries = rungBoundaries(tier, startsAt);
      expect(compose(tier, new Date(boundaries[0].boundary.getTime() - 1)).bestRungIndex).toBe(0);
      // One millisecond past each boundary, the index has moved on to the next one (or run out).
      boundaries.forEach((_, i) => {
        const justAfter = new Date(boundaries[i].boundary.getTime() + 1);
        expect(compose(tier, justAfter).bestRungIndex).toBe(i + 1 < boundaries.length ? i + 1 : -1);
      });
    }
  });

  it("(13-10 d) a NULL snapshot tier discloses nothing at all - never the engine's Flexible fallback", () => {
    // PROJECT D-67 / the component's own NULL-TIER note. `tierOrDefault` exists so the refund ENGINE has
    // a safe fallback for pre-Phase-7 rows; presenting that internal net as "this host's cancellation
    // policy" would put a promise in a host's mouth they never made. Showing nothing is the conservative
    // failure - Flexible is the most generous rung, so no booker is worse off than what they were shown.
    const none = compose(null, new Date(startsAt.getTime() - 100 * HOUR));
    expect(none.tier).toBeNull();
    expect(none.boundaryLabels).toBeUndefined();
    expect(none.bestRungIndex).toBeUndefined();
    expect(none.todayRefundCents, "a null tier must quote no figure either").toBeNull();
  });

  it("(13-10 e) the drop-in anchor forks, and only the ALREADY-OPEN predicate can be true", () => {
    // OC-03 makes an open row's `startsAt` the venue's OPENING instant. WR-05's predicate is the one
    // comparison that decides whether the ladder still has anything to offer, and it is FALSE for every
    // exclusive booking by construction - `confirmBooking` refuses one past its own start (D-94).
    const afterOpen = new Date(startsAt.getTime() + HOUR);
    expect(compose("standard", afterOpen, true).windowAlreadyOpen).toBe(true);
    expect(compose("standard", afterOpen, false).windowAlreadyOpen).toBe(false);
    expect(compose("standard", new Date(startsAt.getTime() - HOUR), true).windowAlreadyOpen).toBe(
      false,
    );
    // The anchor flag is passed through untouched - it is the component's fork, not this module's.
    expect(compose("standard", afterOpen, true).openCapacity).toBe(true);
  });
});
