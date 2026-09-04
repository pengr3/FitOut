// D-03 / HSURF-02 — EACH OF `createDraftListing`'s REFUSALS REACHES THE DESTINATION THAT DESCRIBES IT.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY A ONE-DESTINATION FAILURE BRANCH WAS WRONG THE MOMENT THE ACTION COULD ACTUALLY FAIL
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `(host)/host/listings/new/page.tsx` routes the four refusing verification states to `/host/verify`
// BEFORE it calls the action, so for most of this phase the action's `{ ok: false }` returns were
// simply unreachable from the product path and where the branch sent them did not matter. Plan 19-10
// Task 1 changed that: infrastructure failure now RETURNS instead of throwing, so the branch is live —
// and the moment it is live, the two RACE windows it always technically had become windows a host can
// actually fall through:
//
//   • a SESSION LAPSING between the page's `getSession` and the action's `requireUserId`;
//   • an OPS SUSPENSION LANDING between the page's `loadHostVerification` and the action's.
//
// Both were being answered with the D-03 infrastructure sentence. For the suspension that is copy
// `src/lib/listing/create-signal.ts` BANS BY NAME: the host is told the platform broke, goes nowhere,
// and never learns their standing changed — while the one page written to explain it sits unvisited.
// For the lapsed session it is an apology where an offer of sign-in belongs.
//
// This file drives the page's failure block directly, one case per refusal the action can return, and
// asserts the exact destination. It is the COVERAGE half; `tests/host/verification-surface.test.ts`
// CLAIM 4 owns the ORDERING half (that the pre-action verification redirect precedes the action call),
// and `tests/design/listing-create-refusal-routing.test.ts` owns the CENSUS half (that the action's
// refusal set and this router stay in agreement). None of the three duplicates the others.
//
// ⚠ THE `redirect` MOCK RECORDS **AND** THROWS. Next's real `redirect()` throws to unwind the render,
// and the page depends on it: the failure block is three sequential `redirect(...)` statements, so a
// mock that merely recorded would run all three and every case would report the LAST destination
// while looking green for the wrong reason. The sentinel it throws is caught by `runPage` below, and
// anything that is not a redirect is re-thrown rather than swallowed.

import { describe, it, expect, beforeEach, vi } from "vitest";

import { HOST_VERIFICATION_LISTING_REFUSED } from "@/lib/host/verification-refusals";
import {
  LISTING_CREATE_FAILED_STATE,
  LISTING_CREATE_FAILED_PARAM,
} from "@/lib/listing/create-signal";

/**
 * The action's no-session sentence. SPELLED HERE, unlike the two above, because it is a bare literal
 * in `createDraftListing` rather than an exported constant — and it stays that way deliberately: it is
 * the ONE refusal of the three that the product path can never surface (the page redirects a
 * sessionless visitor at its first statement), so it has no host-facing copy to police. The census in
 * `tests/design/listing-create-refusal-routing.test.ts` is what keeps this in agreement with the
 * action; a change there reddens it by name.
 */
const NO_SESSION_ERROR = "You must be signed in to create a listing.";

const HOST_ID = "host-under-test";

const redirect = vi.hoisted(() =>
  vi.fn((to: string) => {
    throw new Error(`NEXT_REDIRECT:${to}`);
  }),
);
const createDraftListing = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

// The page's own PRE-action guards are not this file's subject; they are satisfied so control reaches
// the call. `canHost: true` clears the defense-in-depth check, and `approved` clears the courtesy
// verification read — CLAIM 4 already proves that read happens first.
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: async () => ({ user: { id: HOST_ID, canHost: true } }),
    },
  },
}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/host/verification-status", () => ({
  loadHostVerification: async () => ({
    status: "approved",
    reason: null,
    suspended: false,
    updatedAt: null,
  }),
}));
vi.mock("@/app/actions/listing", () => ({ createDraftListing }));

import NewListingPage from "@/app/(host)/host/listings/new/page";

/** Run the page and return the ONE destination it redirected to. */
async function runPage(): Promise<string> {
  try {
    await NewListingPage();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // A genuine error must never be mistaken for a redirect — that would turn a crashing page into a
    // green test reporting whatever the last recorded destination happened to be.
    if (!message.startsWith("NEXT_REDIRECT:")) throw err;
  }
  expect(
    redirect.mock.calls.length,
    "The page did not redirect exactly once. Every branch of `/host/listings/new` must end in a " +
      "redirect — it renders nothing at all — so zero means control fell off the end and more than " +
      "one means a redirect stopped unwinding the render.",
  ).toBe(1);
  return String(redirect.mock.calls[0][0]);
}

beforeEach(() => {
  redirect.mockClear();
  createDraftListing.mockReset();
});

describe("D-03 — /host/listings/new routes each refusal to the destination that describes it", () => {
  it("the VERIFICATION refusal goes to the account check, not to the grid sentence", async () => {
    createDraftListing.mockResolvedValue({
      ok: false,
      error: HOST_VERIFICATION_LISTING_REFUSED,
    });

    expect(
      await runPage(),
      "A host whose hosting was suspended BETWEEN the page's verification read and the action's is " +
        "being told the platform broke, rather than being sent to the one page that explains their " +
        "standing. That is copy about a check that DID fail dressed as infrastructure failure — the " +
        "wording `src/lib/listing/create-signal.ts` bans by name, and the host is left with no way to " +
        "learn what actually changed.",
    ).toBe("/host/verify");
  });

  it("the NO-SESSION refusal goes to sign-in, not to the grid sentence", async () => {
    createDraftListing.mockResolvedValue({ ok: false, error: NO_SESSION_ERROR });

    expect(
      await runPage(),
      "A host whose session lapsed BETWEEN the page's `getSession` and the action's is being " +
        "apologised to instead of being offered sign-in. The apology says nothing was saved and " +
        "invites them to press the button again — which will fail identically, forever, because the " +
        "thing that is missing is a session and nothing on the grid will give them one.",
    ).toBe("/login");
  });

  it("the INFRASTRUCTURE refusal goes to the grid carrying the D-03 query token", async () => {
    createDraftListing.mockResolvedValue({ ok: false, error: LISTING_CREATE_FAILED_STATE });

    expect(
      await runPage(),
      "The one refusal the D-03 sentence was written for is no longer reaching it. The copy module, " +
        "the query token and the grid notice are all still wired; if this is red, the branch that " +
        "carries a genuine infrastructure failure to them has been re-routed and the sentence is " +
        "orphaned again — the exact defect 19-VERIFICATION gap 2 recorded.",
    ).toBe(`/host/listings?${LISTING_CREATE_FAILED_PARAM}`);
  });

  it("success goes into the wizard for the returned id", async () => {
    createDraftListing.mockResolvedValue({ ok: true, id: "draft-123" });

    expect(
      await runPage(),
      "A successful create did not reach the wizard. The whole point of the draft-first flow (D-01) " +
        "is that the listing exists the moment creation begins and the host lands in it.",
    ).toBe("/host/listings/draft-123/edit");
  });
});
