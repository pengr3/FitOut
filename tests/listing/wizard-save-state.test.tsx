// @vitest-environment jsdom

// HFLOW-02 / 14-CONTEXT D-150 — the wizard's save state, asserted against RENDERED output AND against
// the source that produces it.
//
// WHAT SILENT FAILURE THIS FILE CATCHES.
//
// An indicator that reads a CLOCK instead of a RESULT says "Saved" after a save that failed. Nothing on
// screen distinguishes the two: the word appears, in the same ink, at roughly the same moment, and the
// host reads it and moves on. They find out at the end of a nine-step form — when the listing will not
// publish, or when the price they typed is not the price a booker is charged — and by then the edit
// that was lost is several steps behind them. That is the whole reason D-150 forbids a timer BY NAME
// rather than merely preferring a result: the timer version is the one that looks right.
//
// The three properties that fail invisibly, and where each is asserted:
//
//   1. THE STATE IS THE SERVER'S ANSWER. Cases (1) and (2) stub the autosave action to refuse and to
//      succeed and read the region back. A region wired to an optimistic string passes (2) and fails
//      (1), which is exactly why both arms are driven rather than just the happy one.
//
//   2. THERE IS NO SCHEDULED CALLBACK ON THE SAVE PATH. Case (3) reads this TWICE, independently,
//      because either reading alone is satisfiable by a shape that fails the other. The RENDERED half
//      advances a fake clock far past any plausible delay and asserts the word is still there — which
//      catches a delayed CLEAR. The SOURCE half scans the file — which catches a delayed SET, i.e. an
//      indicator that schedules "Saved" before the response lands, and which the rendered half cannot
//      see because its stubbed action resolves immediately.
//
//   3. ONE OUTCOME PRODUCES ONE ANNOUNCEMENT. The two autosave toasts were REPLACED by this region,
//      not joined by it (GATE-03 rule 6), so cases (1) and (2) assert the toast spies at ZERO on the
//      advance path. Case (6) asserts the opposite for the two paths that END IN A NAVIGATION, where a
//      toast is the only report that can outlive the surface rendering it — deleting those would be
//      this fix overshooting into a regression, and an absence nobody asserts is an absence nobody
//      notices.
//
// Case (4) is the return-to-idle rule and case (5) is the naming rule. Both are about the region's
// SHAPE rather than its content: it must PERSIST across states (a region that unmounts is a new region
// to assistive technology every time, and cannot be held on to between presses), and it must carry an
// author-supplied name, because the status role is nameFrom:author and takes none from its own text.
//
// ⚠ THE COPY IS IMPORTED, NEVER RETYPED. `wizard.tsx` exports the three strings for the same reason it
// exports `STEPS` (plan 14-09): a test that retypes locked copy agrees with the surface until the two
// drift apart in a single edit, at which point it agrees with neither. The SERVER's sentences are the
// other way round — they are stated here as the stub's return value, so the assertion and the thing
// asserted are the same literal by construction (`tests/host/request-refusal.test.tsx`'s idiom).
//
// The wizard is a client component whose server couplings are the listing actions, the auth client and
// two heavy child components. Those are stubbed exactly as `tests/listing/wizard-occupancy.test.tsx`
// and `tests/listing/wizard-rail.test.tsx` stub them, with ONE inversion: the autosave action is
// mutable here, because half of this file's job is to watch it refuse.

import * as React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";

// jsdom implements no ResizeObserver, and Radix's radio indicator measures itself with one. Stubbing it
// here (rather than in the shared setup) keeps the blast radius to this file — the measurement plays no
// part in anything asserted below, which is all copy, ARIA state and call counts.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver =
  globalThis.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver);

const scrollIntoViewSpy = vi.fn();
Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
  configurable: true,
  value: scrollIntoViewSpy,
});

// A STABLE router stub, unlike the occupancy file's fresh-per-call one, because case (6) asserts that
// the two surviving toasts precede a NAVIGATION — which cannot be checked against a `vi.fn()` minted
// inside the hook and never findable again.
const nav = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));

// MUTABLE, and this is the inversion. The other two wizard files pin the autosave to succeed; this one
// re-points it per case, because "the region says what the server said" is only a claim if the server
// is made to say more than one thing.
const actions = vi.hoisted(() => ({
  saveListingStep: vi.fn(),
  publishListing: vi.fn(),
}));

const toastSpy = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("@/app/actions/listing", () => actions);
vi.mock("next/navigation", () => ({ useRouter: () => nav }));
vi.mock("sonner", () => ({ toast: toastSpy }));
vi.mock("@/components/ui/sonner", () => ({ Toaster: () => null }));
vi.mock("@/lib/auth-client", () => ({ authClient: { sendVerificationEmail: vi.fn() } }));
vi.mock("@/components/listing/photo-uploader", () => ({ PhotoUploader: () => null }));
vi.mock("@/components/listing/address-autocomplete", () => ({ AddressAutocomplete: () => null }));

// next/link has no App-Router context in jsdom — swap ONLY the primitive, keep the markup around it
// real (the same remedy the other two wizard files use).
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
  STEPS,
  SAVE_STATE_SAVING_LABEL,
  SAVE_STATE_SAVED_LABEL,
  SAVE_STATE_FAILED_PREFIX,
  type ModeLockDisplay,
  type WizardListing,
} from "@/app/(host)/host/listings/[id]/edit/wizard";
import {
  composeMaterialChangeRule,
  type RejectedListingContext,
} from "@/lib/listing/re-review-copy";

const REVIEW_TITLE = STEPS[STEPS.length - 1].title;
const FIRST_TITLE = STEPS[0].title;
const DETAILS_TITLE = STEPS[1].title;

/**
 * `src/app/actions/listing.ts:114`, verbatim — one of the four sentences `saveListingStep` really
 * returns. Stated as the stub's return value so the assertion and the thing asserted are the same
 * literal: a client-side re-authoring would be a second wording of a refusal, which is a second thing
 * somebody has to keep in agreement with the action that refused.
 *
 * Deliberately NOT "Please check the form and try again." — that sentence is short enough to be
 * mistaken for a generic fallback a client could have invented on its own.
 */
const SAVE_REFUSAL = "We couldn't find that listing, or it isn't yours to edit.";

/** `listing.ts:302`, verbatim. The publish GATE's refusal, which is a different outcome — see case (6). */
const PUBLISH_REFUSAL = "We couldn't find that listing, or it isn't yours to publish.";

const UNLOCKED: ModeLockDisplay = { locked: false };

/**
 * The two scheduled-callback spellings, EACH BUILT IN TWO PIECES.
 *
 * The rule this file enforces is "no scheduled callback on the save path", and the check is a text
 * scan. A test that wrote either name whole would be a file containing the thing it forbids — harmless
 * today, and a false positive the first time anyone points a repo-wide scan at `tests/`. Same
 * discipline `wizard-rail.test.tsx` applies to the accent utility and `wizard.tsx` applies to the two
 * toast spellings in its own prose.
 */
const SCHEDULED_CALLBACKS = ["setTime" + "out", "setInter" + "val"] as const;

const WIZARD_SOURCE_PATH = "src/app/(host)/host/listings/[id]/edit/wizard.tsx";

/**
 * The wizard's source with comments removed.
 *
 * COMMENTS STRIPPED FIRST, and not as a nicety: `wizard.tsx`'s own header argues at length about the
 * shortcut D-150 forbids, and a scan that counted prose would report a correct file as red for
 * explaining itself. The stripper is the blunt line-oriented one the design suite uses, which is
 * sufficient here because every comment in the region of interest is on its own line.
 */
function wizardSourceStripped(): string {
  const raw = readFileSync(resolve(process.cwd(), WIZARD_SOURCE_PATH), "utf8");
  return raw
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\/\*|\*)/.test(line))
    .join("\n");
}

/**
 * THE SAVE PATH, as a source slice: the autosave helper and the three call sites that drive it.
 *
 * Scoped rather than whole-file on purpose. A future plan may have a perfectly good reason to schedule
 * something ELSEWHERE in this 1800-line component — a picker debounce, say — and a whole-file ban would
 * go red for a change that has nothing to do with whether the host is told the truth about their draft.
 * Narrowing this slice, on the other hand, is the edit that would make the rule stop meaning anything,
 * so it is anchored on the two function names that bound it and fails loudly if either disappears.
 */
function savePathSource(): string {
  const src = wizardSourceStripped();
  const start = src.indexOf("async function persist(");
  const end = src.indexOf("async function resendVerification(");
  expect(start, `${WIZARD_SOURCE_PATH} no longer declares the autosave helper`).toBeGreaterThan(-1);
  expect(end, `${WIZARD_SOURCE_PATH} no longer declares resendVerification`).toBeGreaterThan(start);
  return src.slice(start, end);
}

// ── Fixtures ─────────────────────────────────────────────────────────────────────────────────────────
// `primarySpaceType` is a D-08 vocabulary value, not the colloquial word (09-06's fixture lesson). Every
// publish-checklist field is filled, so `emailVerified` alone decides whether the review step offers
// `Publish listing` or `Save as draft` — which is what case (6) needs to reach both navigating paths.
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

function mount(
  emailVerified = false,
  listing: WizardListing = makeListing(),
  reReviewContext: RejectedListingContext | null = null,
) {
  return render(
    <ListingWizard
      listing={listing}
      hostEmail="host@example.com"
      emailVerified={emailVerified}
      modeLock={UNLOCKED}
      reReviewContext={reReviewContext}
    />,
  );
}

/** The rendered step question. Throws if the document ever holds more than one level-one heading. */
function heading(): string {
  return screen.getByRole("heading", { level: 1 }).textContent ?? "";
}

/** One press of the advance control. */
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

/**
 * THE region — counted, never sampled.
 *
 * "At least one" is the shape rule 6 forbids, so every read of the region's text also re-asserts that
 * there is exactly one of it. Two regions announcing one save is the defect this decision exists to
 * remove, and it is the realistic regression because both halves look correct on screen.
 */
function region(): HTMLElement {
  const found = screen.getAllByRole("status");
  expect(found, "the wizard must render exactly ONE status region").toHaveLength(1);
  return found[0];
}

/** Collapse JSX line wrapping so a sentence can be matched whole (`state08-alerts.test.tsx`'s helper). */
function regionText(): string {
  return (region().textContent ?? "").replace(/\s+/g, " ").trim();
}

beforeEach(() => {
  vi.clearAllMocks();
  actions.saveListingStep.mockResolvedValue({ ok: true });
  actions.publishListing.mockResolvedValue({ ok: true });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────

describe("LVER-06 — the rejected listing notice is server-derived and persistent", () => {
  it("renders authoritative rejected notice on direct entry and keeps it after navigation and refusal", async () => {
    const reason = "The map pin does not match the address supplied by the host.";
    mount(false, makeListing(), { reason });

    expect(screen.getByRole("heading", { level: 2, name: "This listing needs changes" })).toBeTruthy();
    expect(screen.getByText("FitOut didn't approve this listing.")).toBeTruthy();
    expect(screen.getByText(reason)).toBeTruthy();
    expect(screen.getByText(composeMaterialChangeRule())).toBeTruthy();

    await advance();
    expect(heading()).toBe(DETAILS_TITLE);
    expect(screen.getByText(reason)).toBeTruthy();

    actions.saveListingStep.mockResolvedValue({ ok: false, error: SAVE_REFUSAL });
    await advance();

    expect(heading(), "a refusal must keep the current section open").toBe(DETAILS_TITLE);
    expect(screen.getAllByText(reason)).toHaveLength(1);
    expect(screen.queryByText("Changes received")).toBeNull();
  });

  it("ignores forged query-string rejection data when the server supplies no context", () => {
    window.history.replaceState(
      {},
      "",
      "/host/listings/listing-1/edit?reReview=rejected&reason=Forged+browser+reason",
    );

    mount();

    expect(screen.queryByRole("heading", { name: "This listing needs changes" })).toBeNull();
    expect(screen.queryByText("Forged browser reason")).toBeNull();
  });

  it("keeps the explanation complete when the current rejection has no reason", () => {
    mount(false, makeListing(), { reason: null });

    expect(screen.getByRole("heading", { name: "This listing needs changes" })).toBeTruthy();
    expect(screen.getByText("FitOut didn't approve this listing.")).toBeTruthy();
    expect(screen.getByText(composeMaterialChangeRule())).toBeTruthy();
  });

  it("keeps a long stored reason selectable and untruncated", () => {
    const reason = "The entrance and map location need a wider, unobstructed view. ".repeat(12).trim();
    mount(false, makeListing(), { reason });

    const rendered = screen.getByText(reason);
    expect(rendered.className).toContain("select-text");
    expect(rendered.className).toContain("[overflow-wrap:anywhere]");
    expect(rendered.className).not.toMatch(/line-clamp|truncate|select-none/);
  });
});

describe("LVER-09 — a guarded rejected-listing transition authorizes one mounted receipt", () => {
  it("latches Changes received, focuses and scrolls once, and suppresses the true result's generic outcome", async () => {
    actions.saveListingStep
      .mockResolvedValueOnce({ ok: true, flipped: true })
      .mockResolvedValue({ ok: true, flipped: false });
    mount(false, makeListing(), { reason: "The map pin needs to match the address." });

    await advance();

    const receipt = screen.getByRole("region", { name: "Changes received" });
    expect(receipt.textContent).toContain(
      "Your listing is back in review. It can't take bookings until FitOut finishes checking it.",
    );
    expect(document.activeElement).toBe(receipt);
    expect(scrollIntoViewSpy).toHaveBeenCalledTimes(1);
    expect(heading(), "the first true result must remain visible before ordinary navigation").toBe(
      FIRST_TITLE,
    );
    expect(regionText(), "the receipt replaces the generic saved announcement for this outcome").toBe(
      "",
    );
    expect(toastSpy.success).not.toHaveBeenCalled();
    expect(nav.push).not.toHaveBeenCalled();

    await advance();
    expect(heading()).toBe(DETAILS_TITLE);
    expect(receipt.isConnected, "later saves must not erase the mounted receipt").toBe(true);
    expect(document.activeElement).toBe(receipt);
    expect(scrollIntoViewSpy, "later saves must not move or scroll focus again").toHaveBeenCalledTimes(1);
  });

  it.each([
    ["guarded false", { ok: true, flipped: false }],
    ["generic success", { ok: true }],
    ["failure", { ok: false, error: SAVE_REFUSAL }],
  ] as const)("does not render success for %s", async (_name, result) => {
    actions.saveListingStep.mockResolvedValue(result);
    mount(false, makeListing(), { reason: "The photos need correction." });

    await advance();

    expect(screen.queryByRole("region", { name: "Changes received" })).toBeNull();
    expect(scrollIntoViewSpy).not.toHaveBeenCalled();
  });

  it("does not let a true action result authorize receipt outside server-derived rejected context", async () => {
    actions.saveListingStep.mockResolvedValue({ ok: true, flipped: true });
    mount();

    await advance();

    expect(screen.queryByRole("region", { name: "Changes received" })).toBeNull();
    expect(heading()).toBe(DETAILS_TITLE);
  });

  it("keeps a true Save as draft result in-page instead of toasting or navigating away", async () => {
    mount(false, makeListing(), { reason: "The listing details need correction." });
    await advanceTo(REVIEW_TITLE);
    toastSpy.success.mockClear();
    nav.push.mockClear();
    actions.saveListingStep.mockResolvedValue({ ok: true, flipped: true });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save as draft" }));
    });

    expect(screen.getByRole("region", { name: "Changes received" })).toBeTruthy();
    expect(toastSpy.success).not.toHaveBeenCalled();
    expect(nav.push).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────

describe("(1) a refused autosave is reported ON THE SURFACE, in the server's own words", () => {
  it("renders the server's sentence verbatim behind the prefix, and fires NO toast", async () => {
    actions.saveListingStep.mockResolvedValue({ ok: false, error: SAVE_REFUSAL });
    mount();

    await advance();

    expect(regionText()).toContain(SAVE_REFUSAL);
    expect(
      regionText(),
      "the region must PREFIX the server's sentence, never re-author it",
    ).toBe(SAVE_STATE_FAILED_PREFIX + SAVE_REFUSAL);

    // ZERO, not "fewer". The failure mode this asserts against is the region being ADDED while the
    // toast stays — two announcements for one outcome, and the half that scrolls away is the half
    // carrying the explanation.
    expect(
      toastSpy.error,
      "a refused autosave must not also raise a toast (GATE-03 rule 6)",
    ).not.toHaveBeenCalled();
    expect(toastSpy.success).not.toHaveBeenCalled();
  });

  it("leaves the host on the step they were on", async () => {
    actions.saveListingStep.mockResolvedValue({ ok: false, error: SAVE_REFUSAL });
    mount();

    expect(heading()).toBe(FIRST_TITLE);
    await advance();

    // The advance is the SAVE. Moving on from a step whose answers were not persisted is how a host
    // reaches the end of the form with a draft that is missing everything they typed.
    expect(heading(), "a refused save must not advance the wizard").toBe(FIRST_TITLE);
  });

  it("is driven by the RESULT, not by the call: a second, succeeding save clears it", async () => {
    actions.saveListingStep.mockResolvedValue({ ok: false, error: SAVE_REFUSAL });
    mount();
    await advance();
    expect(regionText()).toBe(SAVE_STATE_FAILED_PREFIX + SAVE_REFUSAL);

    // Same press, same code path, different answer. A region that latched on first failure — or one
    // reading anything other than the returned result — cannot pass both halves of this case.
    actions.saveListingStep.mockResolvedValue({ ok: true });
    await advance();

    expect(regionText()).toBe(SAVE_STATE_SAVED_LABEL);
    expect(heading()).toBe(DETAILS_TITLE);
  });
});

describe("(2) a successful autosave reports in the region and nowhere else", () => {
  it("reads the saved word, and raises NO success toast on the advance path", async () => {
    mount();

    await advance();

    expect(regionText()).toBe(SAVE_STATE_SAVED_LABEL);
    expect(
      toastSpy.success,
      "the advance path's success toast was REPLACED by the region, not joined by it",
    ).not.toHaveBeenCalled();
    expect(toastSpy.error).not.toHaveBeenCalled();
  });

  it("says the saving word while the answer is still outstanding", async () => {
    // A save that never resolves, so the in-flight state can be observed at all. Resolved by hand at
    // the end so React is not left with a pending update after the test.
    let release: ((result: { ok: true }) => void) | undefined;
    actions.saveListingStep.mockReturnValue(
      new Promise<{ ok: true }>((r) => {
        release = r;
      }),
    );
    mount();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Get started/ }));
    });

    expect(regionText()).toBe(SAVE_STATE_SAVING_LABEL);

    await act(async () => {
      release?.({ ok: true });
    });
    expect(regionText()).toBe(SAVE_STATE_SAVED_LABEL);
  });
});

describe("(3) NO TIMER — read as a rendered behaviour and as a source fact, independently", () => {
  it("still reads the saved word after a long clock advance with no further interaction", async () => {
    // `toFake` is spelled out rather than left to the default so that promises are untouched: the
    // stubbed action resolves on a microtask, and a fake clock that swallowed those would hang this
    // test for a reason that has nothing to do with the rule under test. The two names faked here are
    // exactly the two the rule forbids.
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"],
    });
    mount();

    await advance();
    expect(regionText()).toBe(SAVE_STATE_SAVED_LABEL);

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });

    // Thirty seconds is well past any plausible "clear it after a moment" delay. A scheduled clear —
    // the exact shortcut D-150 forbids by name, an optimistic string wearing a delay — empties the
    // region here while the draft on the server is unchanged.
    expect(
      regionText(),
      "the saved state cleared itself on a schedule: the region is reporting elapsed time, not a result",
    ).toBe(SAVE_STATE_SAVED_LABEL);
  });

  it("contains no scheduled callback anywhere on the save path, read from SOURCE", () => {
    // THE OTHER READING, and it is not a duplicate of the one above. The rendered half cannot see a
    // delayed SET — an indicator that schedules "Saved" before the response arrives — because these
    // stubs resolve immediately and the two are indistinguishable from the outside. This half can.
    const path = savePathSource();
    for (const spelling of SCHEDULED_CALLBACKS) {
      expect(
        path.includes(spelling),
        `the wizard's save path schedules a callback (${spelling}). D-150: the region reads the ` +
          `actual result of the save action. A scheduled transition reports the passage of time, ` +
          `which the server has no opinion about.`,
      ).toBe(false);
    }
  });

  it("guard-the-guard: the source slice it scans is real, non-empty and the save path", () => {
    // Every zero above is worthless if the slice opened nothing. An anchor that stopped matching
    // would make the scan pass by scanning an empty string, which is the one way this rule can fail
    // open — so the slice is asserted to contain the three call sites the rule is about.
    const path = savePathSource();
    expect(path.length).toBeGreaterThan(200);
    for (const caller of ["saveAndContinue", "saveAsDraft", "handlePublish", "saveListingStep"]) {
      expect(path, `the save-path slice no longer contains ${caller}`).toContain(caller);
    }
  });
});

describe("(4) the region returns to idle on the next edit, and PERSISTS while doing it", () => {
  it("empties its text but stays in the document when a field changes", async () => {
    mount();

    await advance();
    expect(heading()).toBe(DETAILS_TITLE);
    expect(regionText()).toBe(SAVE_STATE_SAVED_LABEL);

    await act(async () => {
      fireEvent.change(screen.getByLabelText("Title"), {
        target: { value: "Sunset Strength Floor, upstairs" },
      });
    });

    // EMPTY, NOT ABSENT. "Saved" is a claim about the draft the server holds; the moment a field
    // changes it stops being true. But the element itself must survive that transition — a region
    // that unmounts is a new region to assistive technology every time it comes back, and a test
    // cannot hold on to it between presses. `region()` throws if it is gone or duplicated.
    expect(regionText()).toBe("");
    expect(region().isConnected, "the region must PERSIST at idle, not unmount").toBe(true);
  });

  it("survives a save → edit → save round trip without duplicating itself", async () => {
    mount();

    await advance();
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Title"), { target: { value: "A" } });
    });
    expect(regionText()).toBe("");

    await advance();
    expect(regionText()).toBe(SAVE_STATE_SAVED_LABEL);
  });
});

describe("(5) exactly one region, and it has a name of its own", () => {
  it("renders one status region in the whole document at the first step and after a save", async () => {
    mount();
    expect(screen.getAllByRole("status")).toHaveLength(1);

    await advance();
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });

  it("resolves to a NON-EMPTY accessible name that is not a second copy of the sentence", async () => {
    mount();
    await advance();

    // Through `{ name }`, i.e. `dom-accessibility-api` via testing-library, rather than an attribute
    // read: the status role is nameFrom:author, so a region with perfectly good text in it and no
    // author-supplied label still computes to `""` and is unaddressable. That library is not imported
    // directly, here or anywhere in this repository (`tests/design/live-regions.test.tsx:25`).
    const named = screen.queryAllByRole("status", { name: /\S/ });
    expect(named, "the save-state region has no accessible name (live-regions rule 5)").toHaveLength(1);

    // …and the name is a LABEL, not the sentence again. `live-regions.ts` records the measured hazard:
    // a NAMED live region can be announced by its NAME INSTEAD of its content on the VoiceOver/Safari
    // pairing, so a name equal to the sentence reads it twice (`share-link-box.tsx:109-121`).
    const label = named[0].getAttribute("aria-label") ?? "";
    expect(label.trim().length).toBeGreaterThan(0);
    expect(label).not.toBe(SAVE_STATE_SAVED_LABEL);
    expect(label).not.toContain(SAVE_STATE_FAILED_PREFIX);
  });
});

describe("(6) the two toasts that PRECEDE A NAVIGATION survive", () => {
  it("the draft path still reports by toast, because the surface is about to be replaced", async () => {
    // `emailVerified: false` leaves one publish-checklist row unmet, so the review step offers
    // `Save as draft` rather than `Publish listing`.
    mount(false);
    await advanceTo(REVIEW_TITLE);
    toastSpy.success.mockClear();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save as draft" }));
    });

    expect(
      toastSpy.success,
      "the draft toast is the ONLY possible report on a path that navigates away",
    ).toHaveBeenCalledWith("Draft saved");
    expect(nav.push).toHaveBeenCalledWith("/host/listings");
  });

  it("the publish path still reports by toast", async () => {
    mount(true);
    await advanceTo(REVIEW_TITLE);
    toastSpy.success.mockClear();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Publish listing" }));
    });

    expect(toastSpy.success).toHaveBeenCalledWith("Your listing is live!");
    expect(nav.push).toHaveBeenCalledWith("/host/listings");
  });

  it("a refused PUBLISH keeps its own toast and leaves the SAVE state truthful", async () => {
    // THE DISTINCTION THIS CASE EXISTS TO PIN. The publish gate refusing is not the save refusing:
    // the draft above it saved, and the region says so. Routing the gate's sentence into a region
    // named for the save state would overwrite a true "Saved" with a "couldn't save" that never
    // happened — a second wrong answer added while fixing the first.
    actions.publishListing.mockResolvedValue({ ok: false, error: PUBLISH_REFUSAL });
    mount(true);
    await advanceTo(REVIEW_TITLE);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Publish listing" }));
    });

    expect(toastSpy.error).toHaveBeenCalledWith(PUBLISH_REFUSAL);
    expect(regionText()).toBe(SAVE_STATE_SAVED_LABEL);
    expect(nav.push).not.toHaveBeenCalled();
  });

  it("a refused autosave on the draft path reports in the region and does NOT navigate", async () => {
    mount(false);
    await advanceTo(REVIEW_TITLE);
    toastSpy.success.mockClear();
    nav.push.mockClear();
    actions.saveListingStep.mockResolvedValue({ ok: false, error: SAVE_REFUSAL });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save as draft" }));
    });

    // The FAILURE arm of a navigating path does not navigate, which is exactly what makes it a
    // region case rather than a toast case. The surviving toast is the success arm only.
    expect(regionText()).toBe(SAVE_STATE_FAILED_PREFIX + SAVE_REFUSAL);
    expect(toastSpy.success).not.toHaveBeenCalled();
    expect(toastSpy.error).not.toHaveBeenCalled();
    expect(nav.push).not.toHaveBeenCalled();
  });
});
