---
status: awaiting_human_verify
trigger: "Two bugs in `e2e/helpers/visual-drive.ts`, both aborting BEFORE their screenshot capture, both blocking Phase 12's visual baselines. CI run 32228371235 (dev @ 2f4fc71) — first execution of these drives in history."
created: 2026-08-19T00:00:00Z
updated: 2026-08-19T00:00:00Z
---

## Current Focus

hypothesis: >
  BUG A — `page.clock.install()` is called with NO `time` argument (surfaces.spec.ts:311,
  theme-swap.spec.ts:184), so the page clock starts at REAL wall-clock time (2026-08-19) while the
  hold's `expires_at` is re-frozen to `VRT_CLOCK_ISO` = 2026-09-15T04:00:00Z. The gap is ~27 days
  = ~2.33e9 ms. Playwright's `Clock.fastForward` truncates its argument with a BITWISE OR
  (`shiftTicks(this._now.ticks, ticks | 0)`), which is int32 — max 2,147,483,647 ms ≈ 24.86 days.
  2.33e9 wraps NEGATIVE, so `_innerFastForwardTo` sees `to < this._now.ticks` and throws "Cannot
  fast-forward to the past". BOTH guards are innocently true because `delta` really IS positive;
  the truncation happens INSIDE Playwright, after the guards.

  BUG B — `collisionDrive` never authenticates a booker. `checkoutDrive` calls `signUpBooker`;
  `collisionDrive` does not. The shipped, passing `e2e/collision-in-place.spec.ts:242` DOES
  (`await signUpBooker(page, seed)` before its first `goto`). So the CTA click hits `placeHold`
  anonymously, which returns `{ok:false, reason:"sign-in"}` (src/app/actions/booking.ts:394), and
  `book-cta.tsx:221-238` does `router.push('/login?callbackURL=...')`. No hold is ever ATTEMPTED,
  so no collision can be refused. Neither hypothesis in the drive's own diagnostic is correct.

test: "DONE — both hypotheses CONFIRMED by measurement, not inference. See Evidence."

expecting: "DONE."

reasoning_checkpoint:
  hypothesis: >
    A: `fastForward(delta)` fails because Playwright casts `delta` with `| 0` (signed int32) and the
    delta is ~2.32e9 ms, which wraps negative. B: the collision drive's CTA click never reaches the
    hold path because there is no session, so it is redirected to `/login`.
  confirming_evidence:
    - "A: local reproduction printed `delta = 2316858550`, `delta | 0 = -1978108746`, and `fastForward(delta)` threw the CI error verbatim; `fastForward(2147483647)` OK / `fastForward(2147483648)` throws."
    - "A: `page.clock.install()` with no arg was measured to install at REAL system time (22ms from node's `Date.now()`), which is what makes the delta weeks wide."
    - "B: CI log for `collision-notice-1280-court` prints `Expected: \"notice\" / Received: \"navigated\"` — the page left the listing without a notice, which is what a `/login` push looks like (the callbackURL is percent-encoded, so the URL no longer contains the literal listing path)."
    - "B: live-Postgres probe proved every DB-side premise correct — both units covered, windows non-overlapping, `pending` hold refused per-unit with 23P01. So nothing DB-side could have failed; nothing reached the DB."
  falsification_test: >
    A: if `fastForward` accepted 2.32e9 ms locally, the int32 theory is dead. B: if the CI poll had
    reported `Received: "pending"`, the page stayed on the listing and the cause would be a product
    or fixture problem rather than a missing session.
  fix_rationale: >
    A: move the distance onto `pauseAt`, which has NO int32 cast (verified in the same source and by
    local measurement landing the clock exactly on target), and leave `fastForward` only the 1s that
    plan 12-03 measured as necessary to fire the countdown's tick. Root cause, not symptom: the jump
    now cannot exceed the ceiling by construction, and the ceiling is asserted so it says so if it
    ever does. B: sign a booker up before the first `goto`, which is the gate that was never passed —
    not a retry, not a longer timeout.
  blind_spots: >
    Neither fix is executable end-to-end off Linux. Unverified locally: that `pauseAt` across ~27
    days behaves identically inside the real checkout page's React tree as it did in the isolated
    probe (the Playwright source shows pending timers are clamped to the target and run once, so no
    interval storm, but that is read rather than observed in-page); and that `signUpBooker` inside
    the collision drive leaves the seeded selection intact across the signup navigation (the
    checkout drive does exactly this and reached `interact` in the same CI run, which is strong but
    is not the collision drive).

next_action: >
  Push to `dev` and read the next `gate-visual` run: `checkout` must pass its 14:52 assertion and
  fail only on the missing baseline; `collision-notice` must reach `[data-testid=collision-notice]`.
  Do NOT dispatch `baselines` — minting is the operator's (D-27).

## Symptoms

expected: >
  `gate-visual` reaches its screenshot capture for the `checkout` and `collision-notice` surfaces
  in both `e2e/visual/surfaces.spec.ts` and `e2e/visual/theme-swap.spec.ts`.

actual: >
  31 failed / 35 passed / 1 skipped / 1 did not run. `checkout` aborts in ~6s with
  `Error: clock.fastForward: Error: Cannot fast-forward to the past` (15 occurrences).
  `collision-notice` aborts after its 45s poll with the drive's own "no collision notice"
  diagnostic (court theme, both specs; grove never ran — the surface is SERIAL).

errors: |
  Error: clock.fastForward: Error: Cannot fast-forward to the past
  Error: collision-notice @ 1280px · court: no collision notice. Either the hold SUCCEEDED — in
    which case the inserted conflict did not occupy the hours that were selected ... — or the
    refusal took the plain-notice branch instead of D-55's in-place one.
  [browser] Uncaught Error: Hydration failed because the server rendered text didn't match the
    client. (x12, on the checkout route)
  occurrences of "shelf-life failure" (visual-drive.ts:556 guard): 0
  occurrences of "which is backwards" (visual-drive.ts:572 guard): 0

reproduction: >
  Dispatch/`push` the `gate-visual` job on Linux. NOT reproducible locally: the `visual`
  Playwright project is not constructed off Linux (D-29), so `--project=visual` errors
  `Project(s) "visual" not found` on this Windows machine, by design.

started: >
  Never worked. CI run 32228371235 is the FIRST execution of these drives in history — the visual
  project cannot run off Linux, and plan 12-14's handoff records Task 2 as not started. First-run
  discovery, not a regression.

## Eliminated

- hypothesis: "`readExpiresAt` returns a `Date` or a string, so `expiresAt - pageNow` is `NaN` and `expect(NaN).toBeGreaterThan(0)` silently passes."
  evidence: "`e2e/helpers/booker-seed.ts:438-449` ends `return row.expires_at!.getTime()` — a number, with two `expect`s above it that would fail on a null/absent row. The subtraction is numeric. (Also: `expect(NaN).toBeGreaterThan(0)` DOES fail in Playwright's expect, so the premise had no escape hatch either.)"
  timestamp: 2026-08-19T00:00:00Z

- hypothesis: "The shelf-life premise is broken — `VRT_CLOCK_ISO` is in the past."
  evidence: "`VRT_CLOCK_ISO` = 2026-09-15T04:00:00Z; today is 2026-08-19. Still ~27 days in the future. The guard at visual-drive.ts:556 correctly did not fire."
  timestamp: 2026-08-19T00:00:00Z

- hypothesis: "The seeded FIXTURE conflict only covers one unit of the two-unit listing (plan 12-14's flagged highest-risk claim), so the collision window stays bookable."
  evidence: "`scripts/seed-baseline-fixtures.ts` `seedCollisionConflict()` loops `for (let unit = 1; unit <= exclusive.unitCount; unit++)` with `unitCount: 2` — both units, `confirmed`, over 2026-09-16T01:00Z-03:00Z. Separately, the fixture's conflict is NOT what drives the collision surface at all: `collisionDrive` inserts its OWN conflict over `WINDOWS.collision` (12:00-13:00 local) / `WINDOWS.swapCollision` (17:00-18:00 local), also on BOTH units. Confirmed by direct DB query — see Evidence."
  timestamp: 2026-08-19T00:00:00Z

- hypothesis: "The EXCLUDE constraint's partial predicate does not cover the statuses in play."
  evidence: "`drizzle/0005_booking_exclusion.sql` predicates on `status IN ('pending','confirmed')`. The inserted conflicts are `confirmed`; a hold is `pending`. Both covered."
  timestamp: 2026-08-19T00:00:00Z

## Evidence

- timestamp: 2026-08-19T00:00:00Z
  checked: "Playwright's injected clock implementation, `node_modules/playwright-core/lib/coreBundle.js` (the bundled `packages/injected/src/clock.ts` source string)."
  found: |
    async fastForward(ticks) {
      this._replayLogOnce();
      await this._runWithDisabledRealTimeSync(async () => {
        await this._innerFastForwardTo(shiftTicks(this._now.ticks, ticks | 0));
      });
    }
    async _innerFastForwardTo(to) {
      if (to < this._now.ticks) throw new Error("Cannot fast-forward to the past");
      ...
    }
  implication: >
    `ticks | 0` is a 32-bit signed truncation. Any `fastForward` argument above 2,147,483,647 ms
    (~24.86 days) wraps to a negative number and is rejected as "the past". This is the ONLY
    place that error string exists, and the guard that rejects it runs on the ALREADY-TRUNCATED
    value — which is exactly why a positive `delta` can pass `toBeGreaterThan(0)` in the test and
    still be "the past" inside Playwright. The contradiction is fully explained.

- timestamp: 2026-08-19T00:00:00Z
  checked: "The clock install call sites: `e2e/visual/surfaces.spec.ts:311` and `e2e/visual/theme-swap.spec.ts:184`."
  found: "Both are `if (drive.needsClock) await page.clock.install();` — no `{ time }` option."
  implication: >
    The page clock starts at the current REAL system time. The drive then re-freezes the hold's
    `expires_at` to `VRT_CLOCK_ISO` (2026-09-15T04:00:00Z) to make the deadline label
    deterministic. `delta = expiresAt - AT_14_52_MS - frozenNow` is therefore
    (~27 days) - (14m52s) ≈ 2.33e9 ms — over the int32 ceiling. `scripts/seed-baseline-fixtures.ts`'s
    own header states the coupling that was missed: "the spec MUST install that same instant."
    It doesn't.

- timestamp: 2026-08-19T00:00:00Z
  checked: "`collisionDrive` (visual-drive.ts:614-703) vs the shipped `e2e/collision-in-place.spec.ts` it says it copies, and `checkoutDrive` beside it."
  found: >
    `collision-in-place.spec.ts:242` calls `await signUpBooker(page, seed)` before its first
    `goto`. `checkoutDrive.navigate` calls `signUpBooker` too. `collisionDrive.navigate` calls
    NEITHER `signUpBooker` nor any other auth step, and `playwright.config.ts` declares no
    `storageState` for either project — so the context is anonymous.
  implication: >
    The CTA click reaches `placeHold` with no session. `src/app/actions/booking.ts:394` returns
    `{ ok:false, reason:"sign-in" }` and `src/components/booking/book-cta.tsx:221-238` does
    `router.push('/login?callbackURL=' + encodeURIComponent(...))`. No hold is attempted, so no
    collision is possible and no notice can render. The drive's diagnostic offers two hypotheses
    and the truth is a third one it does not name.

- timestamp: 2026-08-19T00:00:00Z
  checked: "Local reproduction of Bug A's arithmetic via the Playwright library API (no webServer, no `visual` project needed): `install()` with no arg, then the drive's exact sequence."
  found: |
    node  Date.now()            = 1787127048428  2026-08-19T08:10:48.428Z
    page  Date.now()            = 1787127048450  2026-08-19T08:10:48.452Z   (install() == REAL time)
    GUARD 1  expiresAt-pageNow  = 2317751550 > 952000            => true  (passes)
    GUARD 2  delta              = 2316858550 > 0                 => true  (passes)
    delta | 0                   = -1978108746
    fastForward(delta)          => THREW: clock.fastForward: Error: Cannot fast-forward to the past
    fastForward(2147483647)     => OK
    fastForward(2147483648)     => THREW: Cannot fast-forward to the past
    -- and the proposed fix, measured:
    pauseAt(target-1s)          => OK, page now = 2026-09-15T03:45:07.000Z
    fastForward(1000)           => OK, page now = 2026-09-15T03:45:08.000Z  remainder=892000ms (14:52)
  implication: >
    Bug A is REPRODUCED locally, byte-for-byte on the error string, and the ceiling is exactly
    2^31-1. `install()` with no `time` installs at real system time — so the earlier guess that it
    installs at the epoch was wrong, which is why this was measured rather than reasoned. The fix
    lands the remainder on exactly 892000 ms = 14:52, so the surface's determinism assertion is
    satisfied by construction rather than by luck.

- timestamp: 2026-08-19T00:00:00Z
  checked: "Live Postgres (`fitout-db-1`): ran `scripts/seed-baseline-fixtures.ts`, then probed the seeded rows and simulated the drive's insert + a `pending` hold over both drive windows."
  found: |
    vrt_booking_conflict_u1 unit=1 confirmed 2026-09-16T01:00:00Z -> 2026-09-16T03:00:00Z
    vrt_booking_conflict_u2 unit=2 confirmed 2026-09-16T01:00:00Z -> 2026-09-16T03:00:00Z
    unit_count = 2
    collision      : drive inserts 2026-09-16T04:00:00Z -> 2026-09-16T05:00:00Z   (12:00-13:00 +08)
    swapCollision  : drive inserts 2026-09-16T09:00:00Z -> 2026-09-16T10:00:00Z   (17:00-18:00 +08)
    collision     unit1/unit2: hold REFUSED  code=23P01 constraint=booking_no_overlap
    swapCollision unit1/unit2: hold REFUSED  code=23P01 constraint=booking_no_overlap
  implication: >
    Every DB-side premise of the collision drive is CORRECT: both units are covered, the drive's
    windows do not overlap the committed fixture's own conflict, the `HH:mm` URL params resolve to
    the same instants the drive inserts, and a `pending` hold over either window is refused
    per-(listing,unit). Plan 12-14's flagged highest-risk claim ("the fixture must cover both
    units") holds. The bug is therefore NOT fixture arithmetic and NOT the collision feature — it is
    upstream of both.

- timestamp: 2026-08-19T00:00:00Z
  checked: "The CI log's actual poll failure detail for `collision-notice-1280-court` (`gh run view 32228371235 --log-failed`)."
  found: |
    expect(received).toBe(expected) // Object.is equality
    Expected: "notice"
    Received: "navigated"
    - Timeout 45000ms exceeded while waiting on the predicate
  implication: >
    DISCRIMINATOR SETTLED. The page LEFT `/listings/vrt_listing_exclusive`. That rules out the
    drive's own second hypothesis (a plain-notice branch on a page that stayed put) and rules out
    "the hold succeeded" only in the sense that a granted hold would have gone to `/book?hold=`
    instead. It is the `/login?callbackURL=<percent-encoded listing path>` push — the encoding is
    why the URL no longer contains the literal listing path and the poll called it `navigated`.
    Note the drive polled the full 45s on a TERMINAL state it could never recover from, and its
    message named two hypotheses neither of which was the truth.

- timestamp: 2026-08-19T00:00:00Z
  checked: "THE HYDRATION MISMATCH — which route, which node, and whether it correlates with the clock. Timestamps of all 12 errors cross-referenced against the Playwright test timeline."
  found: |
    Tree: <PublicListingPage> → <AvailabilityCalendar> → <Day> → <td data-day="2026-08-18">
    +  data-disabled={undefined}    (client)
    -  data-disabled="true"         (server)
    All 12 occurrences fall inside checkout drive runs (07:40:15-07:41:36 = the 4 checkout rows x 3
    attempts, plus 07:45:16 = theme-swap checkout retry#2). ZERO occurrences during
    listing-detail (8 rows x 3), listing-lightbox (2 x 3), listing-sheet (2 x 3) or
    collision-notice — all of which load the SAME listing page with the same `?date=`.
    `checkout` is the ONLY drive with `needsClock: true`.
  implication: >
    It is on the LISTING page (the extract's "checkout route" label was the surface being driven,
    not the route that logged), and it is a CONSEQUENCE of `page.clock.install()` — a harness
    artifact, not an independent product defect. The clock-vs-no-clock split is a clean controlled
    comparison: ~36 no-clock loads of that page produced zero, 12/12 clock loads produced one each.

- timestamp: 2026-08-19T00:00:00Z
  checked: "The mechanism behind that mismatch: whether Playwright's fake `Date` breaks `@date-fns/tz`'s `class TZDate extends Date`, which `availability-calendar.tsx:505` uses to build `todayStart` for `disabled={[{ before: todayStart }, …]}`."
  found: |
    clock=false: {"protoIsSub":true, "isSubInstance":true, "tag":"sub"}
    clock=true : {"protoIsSub":false,"isSubInstance":false}          // the subclass getter is GONE
  implication: >
    Playwright's `ClockDate` returns `new NativeDate(...)` from its constructor, so `Reflect.construct`
    through `extends` discards the subclass prototype: under a fake clock `new TZDate(y, m, d, tz)`
    is no longer a TZDate, the 4th argument is read as `hours` and the timezone string coerces to
    NaN. `todayStart` becomes an Invalid Date on the client, `{ before: todayStart }` matches
    nothing, and 2026-08-18 loses its `data-disabled`. Confined to the listing page the checkout
    drive passes THROUGH: the captured checkout route uses `tz()` only server-side
    (`book/page.tsx:24`), and the one client component that constructs a `TZDate`
    (`book-cta.tsx:85`) lives on the listing page, not on `/book`. So the mismatch is not in the
    baselined frame. NOT FIXED HERE — it is a real constraint on any future fake-clock baseline of
    a TZDate-rendering client surface, and it belongs in its own change.

## Resolution

root_cause: |
  BUG A — `page.clock.fastForward(ticks)` truncates its argument with `ticks | 0`, a signed 32-bit
  cast (undocumented; measured ceiling 2_147_483_647 ms). The visual specs install the clock with no
  `time`, so it holds real system time, while `checkoutDrive` re-freezes the hold's `expires_at` to
  `VRT_CLOCK_ISO` (weeks out) for determinism. The resulting jump of 2_316_858_550 ms wrapped to
  -1_978_108_746 and Playwright rejected it as "the past". Both guards were innocently true: `delta`
  really was positive, and the wrap happens after they run, inside the browser-side clock.

  BUG B — `collisionDrive` never authenticated a booker. `placeHold` applies the D-41 session gate
  FIRST (`src/app/actions/booking.ts:122-128`), so an anonymous click returns `reason: "sign-in"` and
  `book-cta.tsx:221-238` pushes `/login?callbackURL=…`. No hold was ever attempted, so no collision
  could be refused. `expectSelectionSeeded` passed because an anonymous booker IS allowed to press
  Book — they are just sent to sign in — so the drive walked into a 45s poll for an impossible state.

  HYDRATION MISMATCH — a CONSEQUENCE of Bug A's clock, not an independent defect. See Evidence.

fix: |
  BUG A (`checkoutDrive.interact`): the absolute `pauseAt` now carries the whole distance
  (`expiresAt - AT_14_52_MS - LAST_TICK_MS`) — `pauseAt` computes `toConsume` with no `| 0` and so
  crosses distances `fastForward` cannot — and `fastForward` carries only the last 1000 ms, which
  preserves plan 12-03's measured requirement that a jump from an already-paused clock is what
  actually lands the countdown's tick. The delta is now computed from a DB constant rather than from
  a `Date.now()` read taken while the clock still ran, so it is exact. GUARD ADDED (the one that
  should have existed): `delta <= MAX_FAST_FORWARD_MS`, with a message naming the `| 0` truncation,
  so Playwright's opaque error can never be the first thing a reader sees again.

  BUG B (`collisionDrive`): `signUpBooker` before the first `goto`, matching
  `collision-in-place.spec.ts:242` and `checkoutDrive`; the booker is deleted in `cleanup` (after the
  conflict rows, because `booking.booker_id` is ON DELETE RESTRICT). DIAGNOSTIC STRENGTHENED: the
  poll's `navigated` value now carries the destination URL, because the received value is what
  discriminates a granted hold (`/book?hold=`) from a lost session (`/login`) from a page that stayed
  put (`pending`).

  No guard weakened, no timeout widened, no retry added, no baseline dispatched.

verification: |
  LOCAL, PASSING:
   - Bug A reproduced and the fix measured: remainder lands on exactly 892000 ms = 14:52.
   - int32 ceiling measured: 2147483647 accepted / 2147483648 throws.
   - Every DB premise of Bug B proved correct against live Postgres (both units, non-overlapping
     windows, 23P01 per-unit refusal) — which is what cleared the fixture and the 12-13 feature.
   - Bug B's discriminator read off the CI log itself: `Received: "navigated"`.
   - Hydration mismatch attributed by controlled comparison (12/12 clock runs vs 0/~36 no-clock
     runs of the same page) and its mechanism reproduced (Date-subclass prototype loss).
   - `npx tsc --noEmit` clean. `npx vitest run` 141 files / 1307 tests passed, 0 failed.
     `npm run lint` 0 errors / 12 warnings (the known pre-existing set; none in the changed file).

  REQUIRES CI (cannot run off Linux, D-29 — `--project=visual` does not exist here):
   - That `checkout` reaches its `toContainText("14:52")` assertion and then fails ONLY on the
     missing baseline.
   - That `collision-notice` reaches `[data-testid="collision-notice"]`.

files_changed:
  - "e2e/helpers/visual-drive.ts — MAX_FAST_FORWARD_MS + LAST_TICK_MS constants; checkoutDrive.interact pause/jump split + ceiling guard; collisionDrive signUpBooker + booker cleanup + discriminating poll value"
