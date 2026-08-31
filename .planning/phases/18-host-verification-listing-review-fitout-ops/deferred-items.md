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
