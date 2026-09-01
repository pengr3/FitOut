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

---

## From 18-13 — the host-side review signals

### D6 — two e2e teardowns cannot delete a host whose listing was materially edited

**Found during:** 18-13's by-hand e2e re-run of the host surfaces (D-24: `e2e/` does not run in CI).
**Not caused by 18-13**, which adds no write of any kind — the three commits are reads, copy and tests.

**The failure, verbatim:**

```
1) [chromium] › e2e\host-headings.spec.ts:974:7 › AC#35 — one first-level heading per document…
   PostgresError: update or delete on table "listing" violates RESTRICT setting of foreign key
   constraint "listing_review_listing_id_listing_id_fk" on table "listing_review"
     at Object.teardown (e2e/host-headings.spec.ts:313:16)   ← `DELETE FROM "user" WHERE email = …`
1 failed · 2 skipped · 42 passed
```

**The assertion itself PASSED.** This is a fixture teardown, and the 42 other cases in the run are
green. The spec's own comment already names the shape of the problem — *"ORDER IS LOAD-BEARING …
deleting a user first fails with a foreign-key error that says nothing about ordering"* — it simply
predates the row that now blocks it.

**The cause, measured rather than inferred.** The spec walks the edit wizard at
`/host/listings/[id]/edit` and saves a step. Plan 18-06's `flipToPendingOnMaterialEdit` therefore
appends a `listing_review` row, and `listing_review.listing_id` is `onDelete: "restrict"` by design
(D-221: a review decision is a compliance record and must never cascade-delete with the thing it
decided about). The teardown deletes the HOST, which cascades to the listing, which the restrict
blocks. Confirmed in the dev database immediately after the failure — exactly one leaked row,
`state='pending'`, `decided_at IS NULL`, which is the material-edit flip's signature and nothing else's:

```
 id        | listing_id                   | state   | decided_at | title
 f2cd12d6… | e2e_head_listing_a658f1c8…   | pending | (null)     | Heading Court a658f1
```

**⚠ IT IS A PATTERN, AND THAT WAS MEASURED, NOT PREDICTED.** The same failure landed in a SECOND spec
in the same by-hand sweep, at a different teardown, with an identical FK error and an identically
passing assertion:

```
1) [chromium] › e2e\keyboard-composites.spec.ts:1502:7 › GATE-02 keyboard — the listing wizard and its
   drawer › /host/listings/[id]/edit · the host nav drawer at 320 — trapped, escapable, focus returned
   PostgresError: … violates RESTRICT setting of foreign key constraint
   "listing_review_listing_id_listing_id_fk" on table "listing_review"
     at e2e/keyboard-composites.spec.ts:1352:22   ← `DELETE FROM "user" WHERE email = …`
1 failed · 6 passed
```

Its leaked row has the same signature (`e2e_kbc_listing_…`, `pending`, `decided_at IS NULL`). Two of
the two specs that both (a) drive the edit wizard and (b) tear down by deleting the host are affected;
no spec that does one without the other is.

**Why it is deferred rather than fixed here.** The fix is one line per teardown — delete the listing's
`listing_review` rows before the user — but the count is already two and the shape is generic: EVERY
e2e fixture that drives a material edit and then deletes its host has it, and `e2e/helpers/*`'s
seed/teardown contract is the right place to answer it ONCE. Patching the two specs that happened to
be re-run would hide the pattern behind a green run and leave the third one to be discovered the same
way. It belongs to whoever owns the re-review write's fixture contract (18-06's line), not to a plan
that only reads the column.

**Not one of the three already-diagnosed reds** (`cancel.spec.ts:232`, `calendar-hit-area.spec.ts` ×4,
`price-parity.spec.ts:287`). This is a fourth, with a known cause and a known fix.

**Cleanup performed:** the leaked fixture rows from both runs were removed from the dev database by
hand, so the next local run starts clean.
