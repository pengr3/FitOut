---
phase: 06-full-booking-payment-integration
plan: 03
subsystem: email
tags: [resend, email, escapehtml, booking-lifecycle, drizzle, listing, wizard, react-hook-form]

# Dependency graph
requires:
  - phase: 06-01
    provides: "APPROVAL_SLA_HOURS / APPROVAL_PAYMENT_WINDOW_HOURS config constants + listing.bookingMode DB default flip"
  - phase: 01
    provides: "src/lib/email.ts send()/escapeHtml() helpers + Resend transport + tests/helpers/mocks.ts mockResend"
provides:
  - "Five thin plain-HTML lifecycle email sends (booking confirmed, request received, request approved-pay-now, request declined/expired, new-request-to-host) over the existing email.ts"
  - "createDraftListing create-code default flipped request→instant (D-62)"
  - "Listing-editor Step-5 mode-toggle FormDescription carrying the D-61 new-bookings-only rule"
affects: [06-04, 06-05, 06-06, 06-07, 06-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lifecycle email leaf providers: thin plain-HTML sends (heading + body + one anchor CTA) reusing send()/escapeHtml(); every interpolated field escaped; config hours-by-value; caller-composed tz-named whenLabel; fire-and-forget contract at call sites"

key-files:
  created: []
  modified:
    - "src/lib/email.ts"
    - "src/app/actions/listing.ts"
    - "src/app/(host)/host/listings/[id]/edit/wizard.tsx"
    - "tests/listing/crud.test.ts"

key-decisions:
  - "Lifecycle emails extend email.ts (no React Email / new stack) — D-66; hardening deferred to Phase 7 (WR-04)"
  - "Every interpolated email field (space title, booker label, total, reference, CTA url) is escapeHtml'd before markup — WR-01 / T-06-06"
  - "SLA / payment-window rendered as config hour VALUES (APPROVAL_SLA_HOURS / APPROVAL_PAYMENT_WINDOW_HOURS), never internal constant names"
  - "createDraftListing default flipped request→instant (D-62 demand-first); wizard Step-5 copy states the D-61 new-bookings-only rule"

patterns-established:
  - "Fire-and-forget email contract (void sendXxx(...)) documented for consumers (06-04/05/06/07) so a Resend failure never rejects a webhook ACK or blocks a server action (T-06-07)"

requirements-completed: []  # BOOK-04, BOOK-06 remain In-progress — leaf providers/default flip only; behavior ships in 06-04/05/06/07 (cross-cutting, per 04-xx/05-xx precedent)

# Metrics
duration: ~10min
completed: 2026-07-20
---

# Phase 6 Plan 03: Lifecycle Emails + D-62 Default Flip + D-61 Copy Summary

**Five thin escapeHtml'd plain-HTML lifecycle email sends over the existing `src/lib/email.ts` (D-66, the first non-auth emails in the repo), plus the D-62 `createDraftListing` request→instant create-default flip and the D-61 wizard Step-5 mode-toggle copy.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-07-20T04:10Z (approx)
- **Completed:** 2026-07-20T04:19Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added five lifecycle email exports to `src/lib/email.ts` — `sendBookingConfirmed`, `sendRequestReceived`, `sendRequestApproved`, `sendRequestDeclined`, `sendNewRequestToHost` — each a thin plain-HTML send (heading line + one body line + a single anchor CTA) mirroring the existing `sendVerificationEmail` shape over the SAME `send()` / `escapeHtml()` helpers.
- Closed the WR-01 / T-06-06 injection sink: EVERY interpolated field (space title, booker label, quoted total, reference, and the CTA url) is `escapeHtml`'d before it enters the markup.
- Rendered the approval SLA and payment window as config hour VALUES (`APPROVAL_SLA_HOURS` / `APPROVAL_PAYMENT_WINDOW_HOURS`), never the internal constant names, so Phase-7 policy tuning flows through automatically.
- Flipped `createDraftListing`'s insert default `bookingMode: "request"` → `"instant"` (D-62 demand-first) and updated its doc comment.
- Expanded the listing-editor Step-5 `FormDescription` to the D-61 new-bookings-only rule.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the five lifecycle email sends to src/lib/email.ts** - `53e9b5c` (feat)
2. **Task 2: D-62 create-default flip + D-61 wizard mode-toggle copy + test** - `2ef456f` (feat)

**Plan metadata:** this SUMMARY + STATE.md + ROADMAP.md (docs commit)

## Files Created/Modified
- `src/lib/email.ts` — Added five lifecycle email exports + a config import (`APPROVAL_SLA_HOURS`, `APPROVAL_PAYMENT_WINDOW_HOURS`) + an `APP_URL` (BETTER_AUTH_URL) constant for the one caller-url-less CTA. All new sends escape every interpolated field and keep the existing dev-fallback/prod-withhold `send()` behavior untouched.
- `src/app/actions/listing.ts` — `createDraftListing` insert default `bookingMode` flipped to `"instant"` (D-62); doc comment updated to describe the demand-first default.
- `src/app/(host)/host/listings/[id]/edit/wizard.tsx` — Step-5 `FormDescription` now states the D-61 rule ("It applies to new bookings — any requests already in progress keep the mode they started under."); no structural RadioGroup change.
- `tests/listing/crud.test.ts` — the booking-mode test rewritten to assert the instant create-default + a request toggle.

## Decisions Made
- **Emails are leaf providers, not wired here.** The five sends exist and are tested-clean, but no call site invokes them yet — consumers are 06-04 (placeHold request branch + request-received/new-request-to-host), 06-05 (webhook confirmed email), 06-06 (SLA/payment-window auto-decline/expiry), 06-07 (approve → approved-pay-now / decline → declined). Per the established 04-xx/05-xx cross-cutting precedent, **BOOK-04 and BOOK-06 stay In-progress** — they complete when the shipping plans wire the behavior.
- **Signature contract honored exactly** from the plan interfaces block: `sendBookingConfirmed(to, spaceTitle, whenLabel, reference, bookingUrl)`, `sendRequestReceived(to, spaceTitle, whenLabel, bookingUrl)`, `sendRequestApproved(to, spaceTitle, whenLabel, totalLabel, payUrl)`, `sendRequestDeclined(to, spaceTitle, whenLabel, opts?: { expired?: boolean })`, `sendNewRequestToHost(to, spaceTitle, whenLabel, bookerLabel, totalLabel, requestsUrl)`. The caller composes `whenLabel` (which already names the venue timezone) and the server-frozen `totalLabel` — the sends never format a time or money.
- **Subject lines use the raw space title** (an email subject is a plain-text header field, not HTML markup — escaping there would render literal `&amp;`); all HTML-body interpolations are escaped.
- **Declined CTA** ("Find another space" → `/`) has no caller-supplied URL, so it builds an absolute link from `process.env.BETTER_AUTH_URL` (the repo's app-URL convention from auth.ts / paymongo-connect.ts) with a root-relative fallback — escaped like every other href.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Rewrote the crud.test.ts booking-mode assertion for the flipped default**
- **Found during:** Task 2 (D-62 create-default flip)
- **Issue:** The existing test `booking_mode is stored ... with the schema default (request) when unset` asserted `createDraftListing` yields `bookingMode === "request"`. Flipping the create-code default to `"instant"` makes that assertion fail — the test encoded the retired D-04 default.
- **Fix:** Rewrote the test to assert the instant create-default (D-62) and then toggle to `request` via `saveListingStep` (preserving both-directions toggle coverage). This also satisfies the plan's Task-2 instruction to add an `instant`-default assertion.
- **Files modified:** tests/listing/crud.test.ts
- **Verification:** `npx vitest run tests/listing` → 7 files / 50 tests green.
- **Committed in:** 2ef456f (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — a test that encoded the pre-flip default).
**Impact on plan:** Necessary to keep the suite green under the intended D-62 behavior change. No scope creep.

## Issues Encountered
- None. Postgres was already up (`fitout-db-1`); vitest ran with no `DATABASE_URL` shell override per the machine convention.

## Verification
- `npx tsc --noEmit` — exit 0 (clean).
- `npx eslint` on all four touched files — 0 errors (the wizard.tsx:198 `form.watch()` warning and the address-autocomplete.tsx:110 error are pre-existing and out-of-scope; unchanged by this plan).
- `npx vitest run tests/listing` — 50 passed (includes the new instant create-default + request-toggle assertion).
- `npx vitest run tests/booking tests/paymongo tests/payments` — 18 files, 113 passed / 4 todo (email-mocking suites; no regressions).
- Acceptance greps: 5 lifecycle exports present; `bookingMode: "instant"` in the createDraftListing insert; "applies to new bookings" in the wizard FormDescription.

## User Setup Required
None - no external service configuration required. (Real Resend delivery uses the existing `RESEND_API_KEY` env; when unset, `send()` logs the body in dev/test and withholds it in prod — unchanged behavior.)

## Next Phase Readiness
- All five lifecycle sends are importable, tested-clean, stable-signature leaf providers ready for 06-04/05/06/07 to consume fire-and-forget.
- The instant-by-default create path (D-62) and the D-61 editor copy are live; newly-created drafts default to `instant`.
- No blockers introduced. Downstream reminder unchanged from 06-01/06-02: any new occupancy/read predicate must mirror `{pending,confirmed,requested,approved}` or a request-held slot reads as free.

## Self-Check: PASSED
- Files: FOUND src/lib/email.ts, src/app/actions/listing.ts, src/app/(host)/host/listings/[id]/edit/wizard.tsx, tests/listing/crud.test.ts
- Commits: FOUND 53e9b5c, FOUND 2ef456f
- Lifecycle exports present: 5

---
*Phase: 06-full-booking-payment-integration*
*Completed: 2026-07-20*
