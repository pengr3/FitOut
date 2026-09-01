# Phase 18 — Deferred Items

Out-of-scope discoveries logged during execution. Per the executor's SCOPE BOUNDARY rule these are
**not** fixed by the plan that found them: each was proved pre-existing before being deferred.

---

## D1 — `e2e/cancel.spec.ts:232` "re-opening the review screen … redirects, never re-refunds" is RED

**Found during:** 18-03, the by-hand e2e audit (D-24 — these specs do not run in CI).

**Symptom:**

```
1 failed
  [chromium] › e2e\cancel.spec.ts:232:7 › booker cancellation — the previewed refund is the refund
  given (SC#2) › re-opening the review screen for an already-cancelled booking redirects, never re-refunds
  Error: expect(getByText(/refund on its way/i)).toBeVisible() — timed out 5000ms
    at e2e/cancel.spec.ts:249:56
```

**Proved pre-existing, not caused by the sell-gate change.** The five gate source files were reverted
to their pre-plan state (`git checkout 2db2a42 -- src/lib/bookability.ts src/lib/search/query.ts
src/app/actions/booking.ts 'src/app/listings/[id]/(detail)/page.tsx'
'src/app/(host)/host/listings/page.tsx'`) and the spec re-run: **the same single case failed
identically**, `1 failed | 1 passed`. The files were then restored to `HEAD` and
`git diff HEAD --stat` confirmed clean.

**Not fixed here.** It is in the cancel/refund display path, which plan 18-03 does not touch.

---

## D2 — `e2e/calendar-hit-area.spec.ts` × 4 is a CALENDAR-MONTH TIME BOMB

**Found during:** 18-03, the by-hand e2e audit (this spec consumes the `e2e/helpers/booker-seed.ts`
helper 18-03 edited, so it was run even though it is not in the plan's `files_modified`).

**Symptom** (4 cases, both themes, AC#14 and AC#15):

```
Error: court · 320px: the month grid rendered a row count this file does not expect. The height
figures below are 6 × (44 + 8), so a five-row month would make them wrong for a reason that has
nothing to do with the cell size.
expect(locator).toHaveCount(expected) failed
Expected: 6
Received: 5
```

**This is the failure mode the phase's own landmine list names** — a geometry assertion whose fixture
is `now()`-relative rather than a fixed date. The spec hard-codes `6 × (44 + 8)` heights and asserts
the month grid has **6 week-rows**. September 2026 is a **5-week** month, so the assertion became
false on a calendar boundary, not on a code change. The spec's own error message says exactly this.

**Not caused by 18-03**: the assertion is a row COUNT on a calendar that rendered normally. Had the
sell-gate wrongly refused the seeded listing, the page would have shown no calendar at all (count 0),
not a correct 5-row one.

**Fix belongs with the spec, not the gate:** pin the fixture month to a fixed 6-week month, or derive
the expected row count from the month under test rather than hard-coding 6.

---

## D3 — `e2e/price-parity.spec.ts:287` is FLAKY on `#search-category` (strict-mode violation)

**Found during:** 18-03, the by-hand e2e audit. Failed in a 5-spec batch, **green when re-run alone**.

**Symptom:**

```
Error: locator.click: Error: strict mode violation: locator('#search-category') resolved to 2 elements
  at e2e/price-parity.spec.ts:287:42
```

**Cause (diagnosed, not fixed):** `src/app/(public)/loading.tsx:51` renders a full `<SearchBar />` as
the Suspense fallback and `src/app/(public)/page.tsx:194` renders the real one. While the page is
still streaming, **both** are in the DOM, so an unscoped `#search-category` locator is ambiguous. The
window is wider on a cold dev-server compile, which is why a batch run hits it and a solo run does
not. Nothing in 18-03 touches either file.

**Fix belongs with the spec:** scope the locator to the results form, or `await` the fallback's
removal before clicking.

## From 18-09 (OPS-05 / D-245)

- **`appBaseUrl()` now has three definitions.** `src/app/actions/cancel-booking.ts:364`,
  `src/app/actions/group.ts:199`, and `notificationBaseUrl()` in `src/lib/notifications.ts`. All three
  read `process.env.BETTER_AUTH_URL` with the same `http://localhost:3000` fallback, so they cannot
  currently disagree — but there is no compiler census over them, which is D-253's shape in a new place.
  NOT fixed here: consolidating means editing two modules 18-09 does not own, for no behavioural gain.
  The honest fix is one exported helper (`src/lib/site.ts` is the natural owner) with three callers.

## From 18-12 (the `/ops` route)

### D3 — the ops row's title column is the SMALLER share at 320px, and no cap can fix it

**Found during:** 18-12, measuring `OPS_QUEUE_ROW_HEIGHT` off the rendered route.

**Measured** (dev catalogue, court and grove identical, 320px viewport):

```
row header line = 244px   status 137.08 / title 106.92     ("Waiting 6 days")
                          status 145.77 / title  98.23     (the longer wait figure)
```

`RowCard` renders `status` `shrink-0`, so the title column absorbs the whole squeeze and the status
takes the LARGER share — the opposite of the split `REQUEST_STATUS_CAP` encodes for `/host/requests`
(*"the deadline … does not outrank knowing WHICH space is being asked for"*). A long listing title
truncates to ~98px at the floor.

**Not fixed, and the reason is a probe rather than a preference.** `max-w-28` on the status content
was applied and re-measured: it buys the title 25–34px at the floor and costs **+12px at EVERY
width, including 1280**, because it wraps `Waiting {N} days` onto two lines — at a width where the
title column already has 810px and there is no squeeze to relieve. `REQUEST_STATUS_CAP`'s own
docblock forbids exactly that trade (*"the countdown itself must therefore always fit"*). And no cap
value avoids it: the uncapped status is 137–146px, so any cap narrow enough to change the split is
narrow enough to wrap the lead. The full transcript is in `OPS_QUEUE_ROW_HEIGHT`'s docblock.

**It is materially milder than the defect that earned the cap** (8.66px there, ~98px here), and this
row identifies its subject three other ways the host inbox's row does not: the meta line, the full
`Address` term in the `<dl>`, and the photographs.

**The honest fixes are both copy/product decisions on `src/components/ops/ops-queue-row.tsx`** — a
shorter lead string (`6 days` with `Waited` as a `<dt>`, say), or a deliberately two-line lead — and
neither is a measurement 18-12 may take on its own.

### D4 — the plate declares ONE of the queue's TWO row shapes

**Found during:** the same measurement.

A listing row is 526.13px at 320 and 842.09px at ≥1024; a host row is 258.06px and 238.06px. The
queue interleaves both kinds oldest-first (D-246), so which shape the first two rows take is a
property of the catalogue on the day. `OPS_QUEUE_ROW_HEIGHT` declares the LISTING shape, and the
argument is at the constant. **Not a defect and not deferred work** — recorded so a future reader who
measures a host-only queue against this bar knows the deviation was chosen rather than missed.

### D5 — the plate under-draws through the `sm:`–`lg:` band, structurally

The row's height is a CONTINUOUS function of container width between ~375 and 1024, because
`PhotoGallery`'s mosaic is aspect-ratio-driven. The declared bar under-claims by 98px at 640 and
170px at 768. A third declared step was considered and rejected (exact at one width inside the band,
wrong at every other). Same class as `HOST_BOOKING_ROW_HEIGHT`'s recorded 768–928px band; recorded
the same way, and the fix — if one is ever wanted — is a container-query height rather than a
breakpoint ladder.
