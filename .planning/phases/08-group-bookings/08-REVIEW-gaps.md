---
phase: 08-group-bookings
reviewed: 2026-07-29T12:05:00Z
depth: deep
scope: "gap-closure plans 08-18, 08-19, 08-20, 08-21 (diff af67c94..HEAD, src/ + tests/), plus follow-up 08-22 (HG-01 closure, commits a3e3cfa/a066c5d)"
files_reviewed: 10
files_reviewed_list:
  - src/app/actions/booking.ts
  - src/lib/paymongo.ts
  - src/lib/validation/listing.ts
  - src/app/actions/listing.ts
  - src/app/(host)/host/listings/[id]/edit/wizard.tsx
  - src/app/(host)/host/listings/page.tsx
  - tests/booking/confirm-double-submit.test.ts
  - tests/payments/paymongo-calls.test.ts
  - tests/paymongo/checkout-idempotency-real.test.ts
  - tests/validation/listing-schema.test.ts
  - tests/listing/crud.test.ts
findings:
  blocking: 0
  high: 0
  medium: 0
  low: 1
  nit: 2
  total: 3
  resolved: 1
status: issues
---

# Phase 8 Gap-Closure Review — Plans 08-18, 08-19, 08-20, 08-21 (+ follow-up 08-22)

**Reviewed:** 2026-07-29 (updated after 08-22)
**Depth:** deep (cross-file trace: booking.ts ↔ paymongo.ts ↔ pricing.ts ↔ units.ts ↔ listing.ts ↔
listing action ↔ wizard.tsx)
**Files Reviewed:** 10 (6 source, 4 test — 08-22 added `src/app/actions/listing.ts` and
`tests/listing/crud.test.ts` to the reviewed set)
**Status:** issues — 1 RESOLVED (was HIGH), 1 LOW, 2 NIT remain. **No BLOCKER, HIGH, or MEDIUM open.**

## Summary

The core money-path fix (08-18/19/21) remains sound on re-verification — nothing in this pass changed
that assessment. This update addresses the one HIGH finding from the prior pass (HG-01: the new
surcharge-reachability gate could be bypassed by editing an already-published listing) after a follow-up
plan (08-22, commits `a3e3cfa` + `a066c5d`) closed it.

**HG-01 is CONFIRMED CLOSED.** I re-read `src/app/actions/listing.ts` (`saveListingStep`) and
`src/lib/validation/listing.ts` in full, traced the guard's ordering against the write, confirmed both
bypass vectors and the sparse-save case are covered, confirmed `saveListingStep` is the only write path to
the three fields in question, and ran the tests myself (not just read them): `npx tsc --noEmit` clean;
`tests/listing/crud.test.ts` 11/11 (including the 6 new HG-01 cases) and
`tests/validation/listing-schema.test.ts` 24/24 pass against live Docker Postgres; the full 08-18–21
regression set (`confirm-double-submit`, `checkout-session-expire`, `paymongo-calls`,
`checkout-idempotency-real`) still passes unchanged (59 passed / 4 correctly skipped).

## Resolved

### ~~HG-01: `publishSchema`'s surcharge-reachability gate could be bypassed by editing an already-published listing~~ — **RESOLVED (`a3e3cfa` + `a066c5d`, plan 08-22)**

> **Closed 2026-07-29 by 08-22.** `saveListingStep` (`src/app/actions/listing.ts:131-142`) now carries its
> own edit-path guard, gated on `owned.status === "published"`, evaluated on the **effective** post-save
> values (`d.<field> ?? owned.<field> ?? default` — `extraHeadFee ?? 0`, `included ?? 1`, `maxOccupancy ??
> 0`, mirroring `paxSurcharge`'s own coalescing). It rejects `effFee > 0 && effIncluded >= effMax` BEFORE
> the `patch` object is built and BEFORE the `db.transaction` write, so a rejected edit is never partially
> or fully persisted. The reject copy is now a single exported constant
> (`SURCHARGE_UNREACHABLE_MESSAGE`, `src/lib/validation/listing.ts:37-38`) referenced by BOTH the
> `publishSchema.superRefine` (publish-time) and this new edit-path guard (post-publish edit-time), so the
> two enforcement points cannot drift apart.
>
> **Both bypass vectors verified closed**, by hand-tracing and by the 6 new DB-backed cases in
> `tests/listing/crud.test.ts` (which I ran myself against live Postgres):
> - *Raise `included`* to meet/exceed a persisted `maxOccupancy` — case (1), REJECT, row unchanged.
> - *Lower `maxOccupancy`* below a persisted `included` — case (2), REJECT, row unchanged.
> - *Sparse save* — a payload naming only ONE of the two fields (e.g. `{ maxOccupancy: 3 }` alone,
>   evaluated against a persisted `included: 3`) — case (6), REJECT. This is the case that would have
>   silently passed if the guard read only the incoming patch instead of the effective (incoming ??
>   persisted) value; it doesn't.
> - *Draft autosave unaffected* — case (4): the guard is gated on `owned.status === "published"`, so a
>   draft with `included === maxOccupancy` still autosaves exactly as before (`publishSchema` catches it
>   at the eventual publish, same as 08-20 originally shipped).
> - *Flat exemption preserved* — case (5): `extraHeadFee: 0` still accepts `included === maxOccupancy`
>   post-publish, matching the publish-time exemption.
>
> **No other write path exists.** `grep -n "\.update(listing)" src/` returns exactly 4 call sites, all
> inside `src/app/actions/listing.ts`: `saveListingStep` (now guarded), `publishListing` (writes only
> `status`/`publishedAt`), `unlistListing` (`status` only), `softDeleteListing` (`deletedAt` only). No
> other server action, script, or route writes `included`/`extraHeadFee`/`maxOccupancy` to a `listing` row
> — `saveListingStep` is confirmed the sole edit path, and it is now guarded.
>
> **Ordering is correct.** The guard (`listing.ts:131-142`) sits after `draftSchema.safeParse` and strictly
> before the `patch` build (`:147`) and the `db.transaction` write (`:183`) — a rejection short-circuits
> with an early `return`, so no partial write can occur.
>
> Mutation-verified per the 08-22 SUMMARY (removing the `if (owned.status === "published")` guard reds
> cases (1),(2),(6) while (3),(4),(5) stay green) — consistent with hand-tracing the code; I did not
> re-perform the deletion myself (out of scope for a read-only review), but the logic is unambiguous:
> without the guard, `saveListingStep` falls straight through to the unconditional `patch`/write with no
> other check on these three fields, so cases (1)/(2)/(6) (which assert `res.ok === false`) could not pass.
>
> The original HG-01 entry (from the pre-08-22 pass) is kept below for the record.

<details><summary>Original HG-01 entry (pre-08-22)</summary>

**Severity (at the time):** HIGH

**File:** `src/lib/validation/listing.ts:107-125` (the new 08-20 gate) — bypassed via
`src/app/actions/listing.ts:97-189` (`saveListingStep`, then-unmodified) and
`src/app/(host)/host/listings/[id]/edit/wizard.tsx` (then-unmodified except the one copy line)

**Issue:** `publishSchema.superRefine` (08-20) rejected `included >= maxOccupancy` when `extraHeadFee > 0`,
but it was invoked in exactly one place: `publishListing`. The wizard's per-step autosave
(`saveListingStep`) validated with `draftSchema` only — no cross-field rule — and ran identically whether
the listing was a draft or already `published`. A host editing pricing on an *already-live* listing (the
routine "change my price" workflow, not a crafted-client edge case) could silently reproduce the exact
unreachable-surcharge revenue-loss bug 08-20 existed to close, with zero rejection. Mirrored the
already-documented `08-REVIEW.md` WR-09 pattern for `maxOccupancy` positivity.

**Status at the time:** open, no fix in the 08-18–21 diff.

</details>

## Low

### LW-01: `expireCheckoutSession`'s idempotent-tolerance branch matches on unstructured provider error text, with no re-probe safety net

**File:** `src/lib/paymongo.ts:271-276`

**Issue:** The 08-21 fix correctly narrows tolerance to messages matching both `/\(400\)/` and
`/already\b.*\bexpired/i`, and it is well-tested (unit cases (a)-(d) in
`tests/payments/paymongo-calls.test.ts:189-219` pin exactly the observed string and prove a different 400
detail / a 500 still throw). This is the right design given PayMongo's `paymongoFetch` throws a plain
`Error` with no structured error code (`src/lib/paymongo.ts:94-98`) — there is no better signal available
today. Flagging only as a durability note: if PayMongo ever changes the wording of this specific 400
detail (localizes it, reorders "already"/"expired", or moves to a different status code for a repeat
expire), the tolerate branch silently stops matching and the fail-closed catch reverts to genuine-failure
behavior — i.e., the T-08-84 recovery-path livelock this plan closed would silently reappear, with no
automated test to catch a wording change made server-side by a third party (the unit tests pin the
*currently observed* string; the gated real-API test in `checkout-idempotency-real.test.ts` would catch a
regression, but only when a human explicitly opts in and runs it — it is not part of CI).

**Fix:** no code change needed now — this is inherent to the "no typed error field" constraint the plan
itself documents. Worth a note in `deferred-items.md` or an ops runbook: periodically re-run the gated
`RUN_LIVE_PAYMONGO_PROBE=1` suite (e.g., before a PayMongo API version bump, or on a schedule) to confirm
the 400 detail string is unchanged, since a drift here degrades silently to "denial" (safe) rather than
"double-charge" (unsafe) — so it fails in the safe direction, but still worth monitoring.

## Nit

### NT-01: A pre-existing (untouched) test's title now overstates what it proves, given the 08-19/08-21 findings

**File:** `tests/payments/paymongo-calls.test.ts:122-137` (not modified by the 08-18–21 diff — confirmed
via `git diff af67c94..HEAD`, which only adds a new `describe` block starting at line 173)

**Issue:** The test titled `"uses the IDENTICAL Idempotency-Key on a retry of the same session, so a
duplicate expire is a no-op"` still passes and is still a valid assertion about the request *header*
shape (the same key is sent twice), but the phrase "so a duplicate expire is a no-op" is now known false
at the wire level — 08-19 proved a repeat expire returns HTTP 400, and it is only a no-op because 08-21's
wrapper now tolerates that 400. The test's own mock (`fetchMock.mockImplementation` returning 200 on every
call) doesn't simulate the real repeat-400 behavior, so it never actually exercised the claim in its own
title.

**Fix:** out of scope for this diff (the file wasn't touched here), but worth a one-line title/comment
update in a future pass — e.g. "...so a duplicate expire request is *sent* identically (the actual
200-vs-400 provider behavior is proven in the 08-21 describe block below and in
`checkout-idempotency-real.test.ts`)."

### NT-02: `saveListingStep`'s new surcharge-reachability rejection is never surfaced to the host by field — the wizard shows only the generic autosave error

**File:** `src/app/(host)/host/listings/[id]/edit/wizard.tsx` (the `persist()` function, unmodified by
08-22) — `res.fieldErrors` is never read; only `res.error` is toasted.

**Issue:** When `saveListingStep` rejects an edit under the new HG-01 guard, it returns
`{ ok: false, error: "Please check the form and try again.", fieldErrors: { included: [...] } }`. The
wizard's `persist()` helper only does `toast.error(res.error)` — it never reads `res.fieldErrors` — so a
host who trips the guard sees the generic sentence, not `SURCHARGE_UNREACHABLE_MESSAGE` ("Base price
covers must be fewer than the maximum capacity, or the extra guest fee never applies."). This is a UX
polish gap, **not** a bypass or correctness issue: the edit is still correctly rejected and never
persisted (confirmed by the row-unchanged assertions in `crud.test.ts` cases (1)/(2)/(6)) — the host is
just left without a clear reason why the step didn't save.

**Fix:** thread `res.fieldErrors?.included?.[0]` into the toast (or the field-level `FormMessage`) when
present, falling back to `res.error` otherwise — the same pattern `publishListing`'s checklist already
uses for its `fieldErrors`.

## What I verified and found correct (no finding)

- **Ordering invariant (confirmBooking):** the SELECT reads `checkoutSessionId` before any mutation
  (`booking.ts:494-509`); the expire-before-create gate (`:613-625`) runs strictly after the hold
  extension and strictly before `createCheckoutSession` (`:660-673`); the column write that names the new
  session (`:699-708`) happens strictly after `createCheckoutSession` resolves and before the redirect.
  No reordering bug found.
- **Fail-closed / no-leak on a genuine expire failure:** the catch at `booking.ts:616-624` never
  references the caught error — the audit meta carries only `{ holdId, checkoutSessionId }` and the client
  response is a fixed sentence with no interpolation. Verified by code and by
  `confirm-double-submit.test.ts` case (3).
- **`expireCheckoutSession` idempotence is correctly scoped:** the tolerate branch requires BOTH `(400)`
  and an `already...expired` match; a different 400 detail and a 500 both still throw, pinned by unit
  cases (b)/(c) and the pre-existing "already paid" test (which still passes unmodified, since "already
  paid" doesn't match the "expired" half of the AND-ed regex).
- **`publishSchema`'s coalescing exactly matches `paxSurcharge`'s**, and now so does the new
  `saveListingStep` edit-path guard: all three use `included ?? 1` / `extraHeadFee ?? 0` (differing only in
  the `maxOccupancy` default, which is irrelevant since `publishSchema` requires it positive and the
  edit-guard's `?? 0` fallback only matters for a null-maxOccupancy edge case that fails closed, not open).
  The clamp that makes `included >= maxOccupancy` mathematically unreachable is confirmed at
  `src/lib/availability/units.ts:453-455`.
- **The publish-time gate is on `publishSchema` only, never `draftSchema`** — confirmed by reading the
  full file; `draftSchema.safeParse` cases in `listing-schema.test.ts:204-208` confirm a partial draft
  with `included >= maxOccupancy` still autosaves (and, post-08-22, case (4) in `crud.test.ts` confirms the
  same through the real action, since the edit-guard only fires when `owned.status === "published"`).
- **`publishListing` re-validates the PERSISTED row, not client input** — confirmed at
  `src/app/actions/listing.ts:249-278`.
- **Test quality:** mutation-verify headers in `confirm-double-submit.test.ts`, `paymongo-calls.test.ts`,
  and now `crud.test.ts` name the exact code to delete and the expected RED/GREEN split; hand-tracing
  confirms each predicted split is consistent with the shipped code. I ran the suites myself (not just
  read them): `npx tsc --noEmit` clean; `paymongo-calls.test.ts` + `listing-schema.test.ts` +
  `crud.test.ts` 59/59 passing (real-API describe correctly skipped by default);
  `confirm-double-submit.test.ts` + `checkout-session-expire.test.ts` passing against live Docker
  Postgres. I did not perform any mutation deletions myself, since that would require editing source files
  and this review is read-only.
- **No injection / secret leak on the money path:** `paymongoFetch` is unmodified by the 08-18–21 diff;
  `getCheckoutSession` (08-19) is a read-only GET with no production caller.
- **Diff scope:** `git diff af67c94..HEAD --stat -- src/ tests/` for the original 4-plan set showed
  exactly the 8 files declared in scope; the 08-22 follow-up (`a3e3cfa`/`a066c5d`) touches exactly the 2
  source files (+1 test file) its own commit messages declare (`src/app/actions/listing.ts`,
  `src/lib/validation/listing.ts`, `tests/listing/crud.test.ts`) — no unrelated file was smuggled into
  either changeset.

---
_Reviewed: 2026-07-29 (updated post-08-22)_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
