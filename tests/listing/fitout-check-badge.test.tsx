// @vitest-environment jsdom

// HVER-05 · D-212 · D-237 — THE BADGE RENDERS FOR `approved` + `approved`, AND FOR NOTHING ELSE.
//
// Two halves, and they are not interchangeable:
//
//   (A) THE PREDICATE, driven over EVERY pair of both pgEnums — 6 × 5 = 30 combinations, of which
//       exactly one may be true. This is the half that matters, because the wrong answer here is not a
//       broken component: it is FitOut telling a booker "we checked this" about a row nobody checked.
//       Enumerating the whole product rather than the headline case is deliberate. Phase 18 already
//       watched a plausible-looking mutation (a not-equals against the suspended value) leave the
//       headline fixture GREEN; only the other values caught it.
//
//   (B) THE COMPONENT, which takes a BOOLEAN. It cannot be tested against `grandfathered` because it
//       never receives it — and that is the design, not a gap in this file. The reduction happens in
//       the RSC, so the client half's whole contract is "true renders the label, false renders
//       nothing". `listing-card.tsx:11`'s precedent, applied where the cost of re-deriving is a lie.
//
// The pairs are derived FROM THE pgEnums, never from a hand-kept list — `bookable-gate.test.ts`'s rule:
// adding a value to either enum reddens this file and forces a decision about it, instead of quietly
// leaving the new state untested. A new host state is exactly where a wrongly-badged row would come
// from.
//
// Nothing here retypes the copy: both strings are imported, so a copy edit moves the assertion with it
// and cannot leave a stale sentence pinned in a test. The BAN on what the copy may say lives in
// `tests/design/trust-signals.test.ts` (FIFTH_SIGNAL_FILES); what it may IMPLY is asserted below.

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import {
  FitoutCheckBadge,
  FITOUT_CHECK_LABEL,
  FITOUT_CHECK_EXPLAINER,
} from "@/components/listing/fitout-check-badge";
import { isFitoutChecked } from "@/lib/listing/fitout-check";
import { hostVerificationStatus, listingReviewState } from "@/lib/db/schema";

afterEach(cleanup);

/** Every (host status, listing review state) pair the two enums can produce. */
const ALL_PAIRS = hostVerificationStatus.enumValues.flatMap((hostStatus) =>
  listingReviewState.enumValues.map((reviewState) => ({ hostStatus, reviewState })),
);

describe("isFitoutChecked — D-212, both terms `approved` and nothing else", () => {
  it("is TRUE for approved host + approved listing", () => {
    expect(isFitoutChecked("approved", "approved")).toBe(true);
  });

  it("is FALSE for every one of the other pairs the two enums can make", () => {
    // The count is asserted first: a flatMap over an emptied enum would satisfy the loop below
    // perfectly while proving nothing at all.
    expect(ALL_PAIRS).toHaveLength(
      hostVerificationStatus.enumValues.length * listingReviewState.enumValues.length,
    );
    expect(ALL_PAIRS.length).toBeGreaterThan(1);

    const badged = ALL_PAIRS.filter((p) => isFitoutChecked(p.hostStatus, p.reviewState));
    expect(
      badged,
      "exactly one pair may be badged. Any other member here is a row FitOut would be claiming to " +
        "have checked when it did not — D-212, and the majority of the day-one catalogue.",
    ).toEqual([{ hostStatus: "approved", reviewState: "approved" }]);
  });

  it("is FALSE for a GRANDFATHERED LISTING owned by an APPROVED HOST — the host-only-rule case", () => {
    // THE SHARPEST READING IN THE PHASE, as its own named case so a failure says which rule broke.
    // A host-only rule badges this row, and nobody ever checked this listing: `grandfathered` was
    // written by a migration (D-207), not by a person. This single assertion is why the predicate
    // takes two terms.
    expect(isFitoutChecked("approved", "grandfathered")).toBe(false);
    // …and the mirror image: an approved listing under a grandfathered host is equally unchecked.
    expect(isFitoutChecked("grandfathered", "approved")).toBe(false);
    // …and both grandfathered, which is the common shape of the migrated catalogue.
    expect(isFitoutChecked("grandfathered", "grandfathered")).toBe(false);
  });

  it("is FALSE for every non-approved value on EITHER side, named one by one", () => {
    // Spelled out rather than derived, because these are the five values a negative spelling would
    // silently let through — the whole reason the predicate uses positive literals.
    for (const hostStatus of ["grandfathered", "pending", "rejected", "unverified", "suspended"]) {
      expect(isFitoutChecked(hostStatus, "approved"), `host '${hostStatus}' was badged`).toBe(false);
    }
    for (const reviewState of ["grandfathered", "pending", "rejected", "withdrawn"]) {
      expect(isFitoutChecked("approved", reviewState), `listing '${reviewState}' was badged`).toBe(
        false,
      );
    }
  });

  it("is FALSE when a status is missing entirely — the LEFT JOIN's nullable side", () => {
    // A host with no ops row at all is the common case, not an edge one. Fail closed: absent is
    // unchecked, never checked.
    expect(isFitoutChecked(null, "approved")).toBe(false);
    expect(isFitoutChecked(undefined, "approved")).toBe(false);
    expect(isFitoutChecked("approved", null)).toBe(false);
    expect(isFitoutChecked("approved", undefined)).toBe(false);
    expect(isFitoutChecked(null, null)).toBe(false);
  });
});

describe("FitoutCheckBadge — a boolean in, real text or nothing out", () => {
  it("renders the label when checked", () => {
    render(<FitoutCheckBadge checked={true} />);
    // REAL TEXT, never an icon-only marker (`drop-in-badge.tsx`'s rule): the assertion is that a
    // booker can READ the words, not that some element exists.
    expect(screen.getByText(FITOUT_CHECK_LABEL)).toBeTruthy();
  });

  it("renders NOTHING when not checked — null, never an 'unchecked' placeholder", () => {
    const { container } = render(<FitoutCheckBadge checked={false} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText(FITOUT_CHECK_LABEL)).toBeNull();
    // There is no second chip to find either. Teaching bookers to read absence as a warning would be
    // a claim FitOut cannot support about the ungated grandfathered catalogue.
    expect(container.textContent).toBe("");
  });

  it("carries no seal styling — no accent, no success colour, no icon", () => {
    // A trust chip styled like a seal IS a quality claim. The neutral secondary token is what every
    // other descriptive chip on these surfaces uses, and the check here is over the RENDERED class
    // list so a variant change is what fails, not a source grep.
    const { container } = render(<FitoutCheckBadge checked={true} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.className).not.toMatch(/brand|success|emerald|green/i);
    expect(el.querySelector("svg")).toBeNull();
  });
});

describe("the copy states what FitOut checked, and does not imply more (D-237 / SC-6)", () => {
  it("says who did it and what they looked at", () => {
    expect(FITOUT_CHECK_LABEL).toBe("Checked by FitOut");
    expect(FITOUT_CHECK_EXPLAINER).toContain("this host's account and this listing");
  });

  it("carries the deliberate negative — it says the space was NOT visited", () => {
    // Success Criterion 6 says the badge must never imply inspection. The strongest compliance is to
    // say what did not happen, so this sentence is load-bearing rather than a nicety: deleting it
    // leaves a chip that a booker may reasonably read as a site visit.
    expect(FITOUT_CHECK_EXPLAINER).toContain("We haven't visited the space.");
  });

  it("claims no document, no vendor, and no inspection", () => {
    // There is no document in the product (HVER-02 forbids the column) and no third party (D-206
    // defers the vendor), so any of these words would be a sentence with no row behind it.
    const copy = `${FITOUT_CHECK_LABEL} ${FITOUT_CHECK_EXPLAINER}`.toLowerCase();
    for (const claim of [
      "document",
      "id check",
      "identity",
      "passport",
      "licence",
      "license",
      "inspect",
      "insur",
      "vetted",
      "background check",
      "partner",
      "third party",
      "safe",
      "guarantee",
    ]) {
      expect(copy.includes(claim), `the copy claims '${claim}', which nothing in this product does`).toBe(
        false,
      );
    }
  });
});
