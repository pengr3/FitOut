---
status: complete
phase: 10-design-system-foundation-theme-runtime
source: 10-01..10-17-SUMMARY.md (17 plans), 10-UI-SPEC.md, 10-REVIEW.md, 10-REVIEW-FIX.md
started: 2026-08-12T17:35:00Z
updated: 2026-08-12T18:05:00Z
verified_against: dev @ 8140e71 (post third fix pass)
environment: "Docker fitout-db-1 on :5432, next dev on :3000 (cold restart, .next cleared)"
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Stop any running server. `npm run db:up`, then `npm run dev` from cold. Server boots, homepage loads with live data, no root-layout crash and no console errors.
result: pass
evidence: |
  Auto-verified. `fitout-db-1` up on :5432; killed the process holding :3000,
  `rm -rf .next`, restarted cold. Ready in 938ms. `GET /` -> 200 with live seed
  data (`uat_listing_bookable`, `seed_listing_*`, real ₱ prices). Zero error or
  warning lines in the server log apart from the pre-existing Next.js
  "middleware -> proxy" deprecation notice, which is unrelated to this phase.
  No error markers in the served HTML. The root layout evaluates cleanly from
  cold — the specific risk WR-05 introduced and then guarded.

### 2. Two brand themes render side by side on identical components
expected: `/dev/theme` shows court and grove panes over the same component tree — visibly different accent, type and corner radius, neither looking like a test fixture.
result: pass
evidence: |
  Auto-verified via Playwright screenshot at 1400x950. Court renders coral
  (--brand #da2d34), grove teal (--brand #13807c), over identical copy and
  components ("Find a space to play", "Book this space", button hierarchy).
  Corner radius and type leading visibly differ per theme. 3 `[data-theme]`
  subtrees present (2 court incl. root, 1 grove) — nesting works.

### 3. Invalid form field shows the error at rest and a visible focus ring when focused
expected: An `aria-invalid` field shows a destructive border + error text at rest. On keyboard focus, a clearly visible focus ring appears and the field remains legible.
result: pass
evidence: |
  Auto-verified via Playwright, /dev/theme §6 "Hourly rate" field, rest vs
  focused screenshots. At rest: destructive border + red helper text, no ring.
  Focused: solid dark ring clearly visible around the field, destructive border
  retained. This is the CR-01 fix landing correctly — the old behaviour painted
  a 1.44:1 destructive wash that displaced the focus ring entirely.

### 4. Reduced motion is honoured
expected: With `prefers-reduced-motion: reduce`, transitions/animations are suppressed on real shipped elements; with no preference, motion plays.
result: pass
evidence: |
  Auto-verified — `npx playwright test e2e/reduced-motion.spec.ts` against the
  running dev server: 2 passed (4.1s), both directions asserted in real chromium.

### 5. Booking slot picker — selected slot stays legible
expected: On a listing's availability picker, select a time slot. The slot fills with the brand colour and the "N of M free" sub-label underneath stays clearly readable against that fill (not washed out).
result: pass
evidence: |
  Auto-verified via Playwright on /listings/uat_listing_bookable (2x DPI).
  It is a range picker: first click sets a start anchor, second completes the
  range. Both states captured.
    - Anchor state: solid coral ring, clearly visible. This is the other half of
      the CR-01 fix — the anchor ring was `ring-brand/50` at 2.23:1 (court) /
      2.03:1 (grove) and is now solid.
    - Filled state: `bg-brand` coral fill with solid white `text-brand-foreground`
      label, high contrast and clearly legible — CR-03's fix (was
      `text-brand-foreground/80` at 3.38:1, now solid at 4.57:1).
  Scope limit, recorded honestly: `uat_listing_bookable` is a single-unit
  listing, so the "N of M free" sub-label — the exact element CR-03 names — is
  not rendered on it. What was visually confirmed is the fill/ink pairing the
  fix changed, not that specific string. A multi-unit listing would be needed to
  observe the sub-label itself; the fix is test-covered either way.

### 6. Notification panel scrolls when the list is long
expected: With enough notifications to overflow, open the notification bell. The panel caps its height and scrolls internally — it does not run off the bottom of the screen.
result: pass
reported: "Approved for the mentioned scope. However it is noticed upon inspection that each notification entry spills on the left edge of the notification area, therefore readability drops."
evidence: |
  Verified by the developer on /bookings signed in as host@fitout.test (20
  notifications). The panel caps its height, scrolls internally, and shows
  "Showing your 20 most recent." IN-14's fix holds in the real app.
  A SEPARATE defect was found during this test — see gap G-01. It is not a
  failure of what test 6 asserts, so this test is recorded as a pass and the
  new observation is tracked as its own gap.

### 7. Login redirect honours a relative callbackURL and rejects an external one
expected: `/login?callbackURL=/bookings` sends you to /bookings after sign-in. `/login?callbackURL=/\evil.com` (backslash) does NOT leave the site — it lands on the homepage.
result: pass
reported: "both behave correctly, redirect stays on localhost"
evidence: |
  Verified end-to-end by the developer in a real browser against the running
  app, both directions: the relative callbackURL routes to /bookings, and the
  backslash form `/\evil.com` does not leave localhost.
  CORRECTION (added 2026-08-12 after /gsd-secure-phase 10, which superseded the
  original wording here). This test verified ONE spelling of the attack. That
  spelling is genuinely closed. The guard as a whole is NOT sound.
  `10-SECURITY.md` SEC-01 records a residual post-authentication open redirect
  (CWE-601) confirmed live at HEAD, reproduced independently twice against the
  shipped `src/lib/safe-callback-url.ts`:
      /..//evil.com       -> guard returns "//evil.com" -> navigates to evil.com
      /.//evil.com        -> same
      /a/../..//evil.com  -> same
  The guard returns the parsed `.pathname`, and dot-segment removal re-exposes a
  leading `//` that the caller's second parse reads as an authority — so the
  origin check at :67 passes on a string that later resolves cross-origin.
  This test's original evidence claimed the guard was "confirmed working in the
  real navigation path". That was an overclaim from a single-vector check and is
  retracted. The test result stays `pass` because what it asserts — the relative
  callbackURL routes, and `/\evil.com` does not leave localhost — is true and
  was observed. The defect is tracked as SEC-01, not as a UAT failure.

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0
blocked: 0
gaps_found: 1
auto_verified: 5
developer_verified: 2

## Gaps

- id: G-01
  truth: "Each notification row is legible within the panel — its text wraps or truncates inside the panel width rather than being clipped."
  status: failed
  reason: "User reported: each notification entry spills on the left edge of the notification area, therefore readability drops."
  severity: minor
  test: 6
  root_cause: |
    Radix `ScrollArea.Viewport` renders its children inside a wrapper div that
    computes to `display: table; min-width: 100%`. `display: table` shrink-wraps
    to content, so `min-width` sets a floor with no ceiling: a long unbreakable
    line expands the wrapper past the panel and the overflow is clipped.
    Measured in Chromium via Playwright, signed in, panel open:
      viewport width      384.0px   (max-h-96 / w-96 panel)
      inner wrapper width 976.9px   (display: table, min-width: 100%)
      row width           976.9px   -> overflows right by 592.9px, flush left (0)
    NOT a regression from this phase. Removing IN-14's `max-h-[inherit]` from
    the viewport leaves the row at exactly 976.9px, so the horizontal overflow
    is independent of that fix and pre-dates it. Phase 10's IN-14 fix is what
    made the list scrollable enough to read, which is how the clipping became
    visible. The user described it as spilling on the left; the measurement puts
    the overflow on the right, with rows flush at the left edge.
  artifacts:
    - path: "src/components/ui/scroll-area.tsx"
      issue: "Viewport sets no width constraint on the Radix table wrapper, so children may exceed the panel width."
    - path: "src/components/notifications/notification-bell.tsx"
      issue: "Row text has no min-w-0 / truncate, so it lays out at natural width inside the unbounded wrapper."
  missing:
    - "Constrain the Radix viewport wrapper — `[&>div]:!block` on ScrollAreaPrimitive.Viewport. Probed live: forcing the wrapper to display:block takes inner and row from 976.9px to 384.0px, exactly the viewport width."
    - "Guard the horizontal case before applying it globally: ScrollBar already supports orientation='horizontal', where the table shrink-wrap is the desired behaviour. Both shipped call sites (notification-bell max-h-96, slot-picker max-h-72) are vertical-only, so `!block` is safe today but would break a future horizontal ScrollArea."
    - "Add min-w-0 + truncation (or wrapping) to the notification row's text column so a long listing title degrades gracefully rather than relying solely on the wrapper fix."
    - "Add a gate: assert the rendered row width does not exceed the viewport width, so this cannot silently return."
  debug_session: ""
  note: "Pre-existing defect surfaced by phase 10 UAT, not introduced by it. Fix is verified but out of phase 10's scope — route deliberately rather than folding it in."
