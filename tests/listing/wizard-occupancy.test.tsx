// @vitest-environment jsdom

// OPEN-01 / 09-UI-SPEC § 1a–1f — the wizard's occupancy fork, asserted against RENDERED output.
//
// WHY A RENDER TEST. Every fact here is a wiring fact that a refactor breaks silently, with a green
// typecheck, on the screen 09-UI-SPEC calls "the highest-stakes comprehension moment in the phase":
//
//   § 1c — a drop-in host must be asked for a price PER PERSON and a daily cap, and must NOT be asked for
//   an hourly rate, a day rate or a per-extra-guest surcharge. A host who fills in an hourly rate for a
//   listing that is sold by the head has answered a question their listing does not pose.
//
//   § 1d — the booking-mode step is REMOVED from the drop-in flow (OC-10), so the step count must read 8
//   and the step after pricing must be the cancellation step. A count that still says 9 is a progress bar
//   that lies, and a control that vanishes with no explanation is why the review-step line is mandatory.
//
//   § 1e — the publish checklist must name what THIS mode's publish gate actually requires. A row for a
//   field the gate never checks sends the host chasing a phantom; a gate requirement with no row leaves
//   them at a dead Publish button with nothing marked unmet (07-15's two-places rule).
//
//   § 1f / O7 — a locked control must say why, until when, and offer a way out, and the lock must be
//   NON-COLOUR-ONLY (a glyph and the word "Locked", not opacity alone) and ANNOUNCED, not merely visible.
//
//   § 1b — NO card is pre-selected on a new listing. `occupancy_mode` is NOT NULL with a DEFAULT, so this
//   is the one assertion that can catch the wizard quietly inheriting a decision nobody made.
//
// ⚠️ THE OPEN FIXTURE DELIBERATELY KEEPS ITS HOURLY AND DAY RATES (09-07's lesson). A drop-in listing CAN
// still carry them — 09-06 requires a price per person but never clears the exclusive columns, and OC-17
// permits the switch — so a fork that keyed on "the rates happen to be null" would pass a test built on a
// null-rate fixture and then render an hourly-rate field on a real converted listing. Keeping the rates
// populated means these tests can only pass if the fork keys on the MODE.
//
// The wizard is a client component whose server couplings are the listing actions, the auth client and two
// heavy child components (the Cloudinary uploader, the address autocomplete). Those are stubbed; every
// piece of markup this file asserts on is the wizard's own.

import * as React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";

// jsdom implements no ResizeObserver, and Radix's radio indicator measures itself with one. Stubbing it
// here (rather than in the shared setup) keeps the blast radius to this file — the measurement plays no
// part in anything asserted below, which is all copy, ARIA state and which fields exist.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver =
  globalThis.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver);

vi.mock("@/app/actions/listing", () => ({
  saveListingStep: vi.fn(async () => ({ ok: true as const })),
  publishListing: vi.fn(async () => ({ ok: true as const })),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/ui/sonner", () => ({ Toaster: () => null }));
vi.mock("@/lib/auth-client", () => ({ authClient: { sendVerificationEmail: vi.fn() } }));
vi.mock("@/components/listing/photo-uploader", () => ({ PhotoUploader: () => null }));
vi.mock("@/components/listing/address-autocomplete", () => ({ AddressAutocomplete: () => null }));

// next/link has no App-Router context in jsdom — swap ONLY the primitive, keep the markup around it real
// (the same remedy tests/listing/listing-card.test.tsx uses).
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href: string; children: React.ReactNode } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import {
  ListingWizard,
  type ModeLockDisplay,
  type WizardListing,
} from "@/app/(host)/host/listings/[id]/edit/wizard";

afterEach(cleanup);

// ── Fixtures ─────────────────────────────────────────────────────────────────────────────────────────
// `primarySpaceType` is a D-08 vocabulary value, not the colloquial word (09-06's fixture lesson).
function makeListing(overrides: Partial<WizardListing> = {}): WizardListing {
  return {
    id: "listing-1",
    title: "Sunset Strength Floor",
    description: "Platforms, racks and a lot of chalk.",
    primarySpaceType: "gym_fitness_floor",
    addressLine1: "1 Ayala Ave",
    addressLine2: null,
    city: "Makati",
    region: "NCR",
    postalCode: "1200",
    country: "PH",
    neighborhood: null,
    lat: 14.5547,
    lng: 121.0244,
    maxOccupancy: 30,
    hourlyRateCents: 50000,
    dayRateCents: 300000,
    occupancyMode: "exclusive",
    perHeadPriceCents: null,
    included: null,
    extraHeadFee: null,
    currency: "php",
    bookingMode: "instant",
    cancellationPolicy: "standard",
    showExactAddress: false,
    status: "published",
    amenities: [],
    activityTags: [],
    photoCount: 3,
    photos: [],
    ...overrides,
  };
}

/** A published drop-in listing that STILL carries its exclusive rates — see the file header. */
function makeOpenListing(overrides: Partial<WizardListing> = {}): WizardListing {
  return makeListing({
    occupancyMode: "open_capacity",
    perHeadPriceCents: 35000,
    ...overrides,
  });
}

const UNLOCKED: ModeLockDisplay = { locked: false };
const LOCKED: ModeLockDisplay = {
  locked: true,
  lockedByCount: 3,
  unlocksAtLabel: "Fri, Aug 8, 10:00 PM (Makati time)",
};

const TITLE = {
  occupancy: "How do people use your space?",
  pricing: "Set your rates",
  booking: "How do you want to accept bookings?",
  cancellation: "What happens if a guest cancels?",
  review: "Review and publish",
};

function mount(listing: WizardListing, modeLock: ModeLockDisplay = UNLOCKED, emailVerified = false) {
  return render(
    <ListingWizard
      listing={listing}
      hostEmail="host@example.com"
      emailVerified={emailVerified}
      modeLock={modeLock}
    />,
  );
}

function heading(): string {
  return screen.getByRole("heading", { level: 1 }).textContent ?? "";
}

/** One "Save and continue" (autosave is stubbed ok, so the wizard simply advances). */
async function advance() {
  const btn = screen.getByRole("button", { name: /Get started|Save and continue/ });
  await act(async () => {
    fireEvent.click(btn);
  });
}

/** Walk forward until the given step heading is on screen. Throws (with the real heading) if unreachable. */
async function advanceTo(title: string) {
  for (let i = 0; i < 12; i += 1) {
    if (heading() === title) return;
    await advance();
  }
  throw new Error(`never reached "${title}" — stuck at "${heading()}"`);
}

function radios(): HTMLElement[] {
  return screen.getAllByRole("radio");
}

function cardFor(cardTitle: string): HTMLElement {
  const el = screen.getByText(cardTitle).closest("label");
  if (!el) throw new Error(`no card wrapper for "${cardTitle}"`);
  return el as HTMLElement;
}

describe("wizard occupancy fork (OPEN-01)", () => {
  // ── § 1c — the pricing step ────────────────────────────────────────────────────────────────────────
  it("(1) drop-in pricing asks for a price per person and people per day, and nothing hourly", async () => {
    mount(makeOpenListing());
    await advanceTo(TITLE.pricing);

    expect(screen.getByText("Price per person")).toBeTruthy();
    expect(screen.getByText("People per day")).toBeTruthy();
    expect(
      screen.getByText("The most people you'll let in on one day. This is your drop-in cap."),
    ).toBeTruthy();

    // The fixture HAS both rates persisted, so these can only be absent because the fork keys on the mode.
    expect(screen.queryByText("Hourly rate")).toBeNull();
    expect(screen.queryByText("Day rate")).toBeNull();
    // D-110 — the whole group-pricing block, not just the fee input.
    expect(screen.queryByText("Group pricing (optional)")).toBeNull();
    expect(screen.queryByText("Extra guest fee")).toBeNull();
  });

  it("(2) whole-space pricing is unchanged — both rates, group pricing, no per-person field", async () => {
    mount(makeListing());
    await advanceTo(TITLE.pricing);

    expect(screen.getByText("Hourly rate")).toBeTruthy();
    expect(screen.getByText("Day rate")).toBeTruthy();
    expect(screen.getByText("Group pricing (optional)")).toBeTruthy();
    expect(screen.queryByText("Price per person")).toBeNull();
    expect(screen.queryByText("People per day")).toBeNull();
  });

  // ── § 1d — the walked step list ────────────────────────────────────────────────────────────────────
  it("(3) the drop-in flow walks 8 steps and the booking-mode step is not one of them", async () => {
    mount(makeOpenListing());
    expect(screen.getByText("Step 1 of 8")).toBeTruthy();

    await advanceTo(TITLE.pricing);
    // The step after pricing is where booking mode used to be. It must be the cancellation step.
    await advance();
    expect(heading()).toBe(TITLE.cancellation);
    expect(screen.queryByText(TITLE.booking)).toBeNull();
  });

  it("(4) the whole-space flow walks 9 steps and still visits booking mode", async () => {
    mount(makeListing());
    expect(screen.getByText("Step 1 of 9")).toBeTruthy();

    await advanceTo(TITLE.pricing);
    await advance();
    expect(heading()).toBe(TITLE.booking);
  });

  it("(5) the drop-in review explains the removed step, verbatim, and summarises the listing", async () => {
    // emailVerified: a listing that is READY to publish still needs the explanation.
    mount(makeOpenListing(), UNLOCKED, true);
    await advanceTo(TITLE.review);

    expect(
      screen.getByText(
        "Drop-in passes are always instant — people book without waiting for your approval.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText("Drop-in passes · ₱350.00 per person · up to 30 people a day · Instant book"),
    ).toBeTruthy();
  });

  // ── § 1e — the publish checklist ───────────────────────────────────────────────────────────────────
  it("(6) the drop-in checklist lists a drop-in cap and a price per person, never the rates", async () => {
    mount(makeOpenListing());
    await advanceTo(TITLE.review);

    expect(screen.getByText("Almost there — finish these to publish:")).toBeTruthy();
    expect(screen.getByText("Drop-in cap")).toBeTruthy();
    expect(screen.getByText("Price per person")).toBeTruthy();
    expect(screen.queryByText("Hourly rate")).toBeNull();
    expect(screen.queryByText("Day rate")).toBeNull();
    expect(screen.queryByText("Capacity")).toBeNull();
  });

  it("(7) the whole-space checklist is unchanged — capacity and both rates, no drop-in rows", async () => {
    mount(makeListing());
    await advanceTo(TITLE.review);

    expect(screen.getByText("Capacity")).toBeTruthy();
    expect(screen.getByText("Hourly rate")).toBeTruthy();
    expect(screen.getByText("Day rate")).toBeTruthy();
    expect(screen.queryByText("Drop-in cap")).toBeNull();
    expect(screen.queryByText("Price per person")).toBeNull();
  });

  // ── § 1f / O7 — the lock ───────────────────────────────────────────────────────────────────────────
  it("(8) a locked listing states why, until when, offers a way out, and disables the other card", async () => {
    mount(makeListing(), LOCKED);
    await advanceTo(TITLE.occupancy);

    // WHY.
    expect(
      screen.getByText("You can't change this while bookings are still to come"),
    ).toBeTruthy();
    // WHEN — the count, the plural agreement and the venue-local instant the page composed.
    expect(
      screen.getByText(
        "3 bookings on this space are still ahead. You can switch after the last one finishes on Fri, Aug 8, 10:00 PM (Makati time). To switch sooner, cancel those bookings first — that refunds your guests in full.",
      ),
    ).toBeTruthy();
    // A WAY OUT.
    const link = screen.getByRole("link", { name: "View your bookings" });
    expect(link.getAttribute("href")).toBe("/host/bookings");

    // The stored mode stays selected and legible; only the OTHER card locks.
    const whole = cardFor("Whole space");
    const dropIn = cardFor("Drop-in passes");
    expect(whole.getAttribute("aria-disabled")).toBeNull();
    expect(dropIn.getAttribute("aria-disabled")).toBe("true");
    // Never opacity-only — the word is in the DOM.
    expect(dropIn.textContent).toContain("Locked");
    expect(whole.textContent).not.toContain("Locked");

    // ANNOUNCED, not merely visible: the radios point at the alert.
    const group = screen.getByRole("radiogroup");
    expect(group.getAttribute("aria-describedby")).toBe("mode-lock-notice");
  });

  it("(9) an unlocked listing renders no lock at all", async () => {
    mount(makeListing(), UNLOCKED);
    await advanceTo(TITLE.occupancy);

    expect(screen.getByText("Whole space")).toBeTruthy(); // positive control: the step really rendered
    expect(screen.queryByText("Locked")).toBeNull();
    expect(
      screen.queryByText("You can't change this while bookings are still to come"),
    ).toBeNull();
    expect(screen.queryByRole("link", { name: "View your bookings" })).toBeNull();
    expect(screen.getByRole("radiogroup").getAttribute("aria-describedby")).toBeNull();
  });

  // ── § 1b — no pre-selection ────────────────────────────────────────────────────────────────────────
  it("(10) a brand-new draft has NO card selected, while an existing listing shows its stored mode", async () => {
    // A freshly created draft: the column already reads `exclusive` because of its DEFAULT, and nothing
    // else on the row shows a human ever decided. Nothing may be selected.
    const { unmount } = mount(
      makeListing({
        status: "draft",
        hourlyRateCents: null,
        dayRateCents: null,
        perHeadPriceCents: null,
      }),
    );
    await advanceTo(TITLE.occupancy);
    for (const r of radios()) {
      expect(r.getAttribute("aria-checked")).toBe("false");
    }
    unmount();

    // Positive control — without it, the assertion above would also pass if no card could EVER select.
    mount(makeListing());
    await advanceTo(TITLE.occupancy);
    const checked = radios().filter((r) => r.getAttribute("aria-checked") === "true");
    expect(checked).toHaveLength(1);
    expect(cardFor("Whole space").contains(checked[0])).toBe(true);
  });
});
