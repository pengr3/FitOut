---
phase: 13-confirmation-bookings-trust
plan: 18
subsystem: booking
tags: [state-08, d-83, d-82, d-57, d-72, d-80, cancellation, refunds, audit, toast, gap-closure]

# Dependency graph
requires:
  - phase: 13-confirmation-bookings-trust
    plan: 02
    provides: "`BookingReference` and `SupportPath` — the reference element and the D-64-guarded support control, both reused verbatim rather than re-rolled"
  - phase: 13-confirmation-bookings-trust
    plan: 05
    provides: "`tests/design/status-vocab.test.ts`'s STATE-08 toast scan — the literal-only AST walk this plan extends past its own stated blind spot"
  - phase: 13-confirmation-bookings-trust
    plan: 04
    provides: "`payment-reversed-state.tsx` + `tests/design/reversed-copy.test.ts` — the by-hand money-truth copy and the two encoded bans that now cover a second surface"
provides:
  - "`src/lib/booking/refund-dispatch.ts` — `refundNeedsManualReturn(bookingId)`, the one reader of whether a cancellation's money was actually dispatched, derived from the `needs_attention` audit rows the action already writes (ZERO new columns)"
  - "`src/components/booking/manual-return-notice.tsx` — the cancelled branch's second money truth as durable in-page content: the amount, the reference, the guarded support path, no r-word, no completed action, NO refund window"
  - "`/bookings/{id}`'s cancelled branch forks between the in-transit sentence and the by-hand one, so the two mutually exclusive money claims can never both be true"
  - "`CancelActionResult.notice` REMOVED — the vanishing surface is gone at the source, not merely at the call site"
  - "STATE-08's opaque-argument closed set: every runtime-assembled toast argument under the three roots must be declared with a reason"
  - "`tests/booking/refund-dispatch.test.ts` — the predicate probed on every axis it filters, verified by hardwiring it in both directions"
affects: [phase-14, gate-db, ops-alert-queue]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A must-read fact is DERIVED on the destination from state that already exists, never PUSHED to a client that is about to navigate away — a returned string can only ever land on the surface the user is leaving"
    - "The operator alert queue doubles as the source of truth for the booker's sentence: one row, two audiences, no way for them to disagree"
    - "A gate whose blind spot is documented is still a gate with a hole; the closure is to invert the question — not `is this string bad?` (unanswerable) but `did a human declare this one?` (answerable, and fails closed)"
    - "A closed-set walk is probed with a real NON-member, and every `false` case is chosen so that removing the filter it names flips its answer"

key-files:
  created:
    - src/lib/booking/refund-dispatch.ts
    - src/components/booking/manual-return-notice.tsx
    - tests/booking/refund-dispatch.test.ts
    - .planning/phases/13-confirmation-bookings-trust/13-18-SUMMARY.md
  modified:
    - src/app/(app)/bookings/[id]/page.tsx
    - src/app/actions/cancel-booking.ts
    - src/components/booking/refund-destination-form.tsx
    - tests/booking/detail-completeness.test.tsx
    - tests/booking/cancellation.test.ts
    - tests/paymongo/instapay-refund.test.ts
    - tests/design/status-vocab.test.ts
    - tests/design/reversed-copy.test.ts
    - .planning/phases/13-confirmation-bookings-trust/deferred-items.md

key-decisions:
  - "The condition is derived from the `audit` table (`outcome='needs_attention'` + a four-action set + `meta->>'bookingId'`), not from a new column — D-80 forbids a migration, and the fact was already persisted exactly once by the code that discovers it"
  - "`audit.resolved_at` is deliberately NOT consulted: it records that an operator CLOSED the alert, not that money reached anybody. Filtering on it would swap the booker's only durable record for the in-transit sentence, which was false on this path all along"
  - "ONE sentence for four causes. The three server-composed notices distinguished them; the booker's consequence is identical in all four, and 13-UI-SPEC specifies two sentences for this branch and no more (D-94). The cause moves into the audit meta, which is the audience it was always for"
  - "`CancelActionResult.notice` removed entirely rather than left unread — a returned string is a push, and the only surface a push can land on here is the one the booker is leaving"
  - "`ManualReturnNotice` does NOT render `BookingReference`; it names the string in the sentence and leaves the copyable element to the cancelled branch's existing reference panel, which every status already renders"
  - "The STATE-08 closure is an opaque-argument allow-list keyed on the argument's SOURCE TEXT, not on a file — `res.error` is the same claim wherever it appears, and a rename is deliberately a fresh red"

requirements-completed: []

# Metrics
duration: 2h05m
completed: 2026-08-21
---

# Phase 13 Plan 18: The Sentence That Removed Itself Summary

**A booker whose refund could not be dispatched was told once, by a toast, on a page that immediately navigated away — and the page it navigated to told them the opposite. The fact now lives on the destination, derived from the operator-alert rows the cancellation already writes, with zero migrations; and the STATE-08 scan that could not see the violation can see it now.**

## Performance

- **Duration:** ~2h05m
- **Completed:** 2026-08-21
- **Commits:** 2 (`d470972` the fix, `89dc0f2` the gates) + this SUMMARY
- **Files:** 3 created, 9 modified

## What Was Wrong

`src/components/booking/refund-destination-form.tsx:88` rendered `toast.warning(res.notice)`.

`res.notice` was set on exactly one condition, and the action's own comment named it: *"the calm
post-cancel caveat for the destination paths where the money could NOT be dispatched."* Two lines later
the component ran `router.push('/bookings/{id}')` — so the sentence was announced on a surface that
removes itself on a timer, on a page that was already leaving.

The destination then read `booking.refund_cents` and rendered **"₱1,000.00 refund on its way"**, paired
with a verified refund window. On these paths nothing is on its way and no window applies. The booker's
only durable statement about their own money was false.

**A second gap, worse because nobody had named it.** The `notice` field only ever existed on the
UNREFUNDABLE-rail branch. When the rail *was* API-refundable and `createRefund` RAISED
(`refund_dispatch_failed`), and when a cancellation supplied no destination at all, the action wrote the
operator alert and told the booker **nothing** — while the same false in-transit sentence rendered on
their page. The derivation this plan added covers both, so it reaches strictly more bookers than the
field it replaced.

## The Verbatim Reds — Three, Each Watched

### RED 1 — the STATE-08 opaque-argument gate, against the shipped defect

The component was restored from a saved copy (never `git checkout`), the shipped call re-planted, and
the extended gate run:

```
 ❯ tests/design/status-vocab.test.ts (35 tests | 1 failed) 29ms
     × carries no toast whose sentence is assembled at runtime and undeclared (13-18) 8ms

AssertionError: a toast is showing the booker a sentence no gate in this repository can read. That is
how `toast.warning(res.notice)` — the server's words for `your money did not come back` — survived two
STATE-08 gates and three plans. …: expected [ Array(1) ] to deeply equal []

- []
+ [
+   "src/components/booking/refund-destination-form.tsx:97 — toast.warning(res.notice) — this toast's
+    sentence is assembled at runtime, so no scan in this repository can read it. …",
+ ]

 Test Files  1 failed (1)
      Tests  1 failed | 34 passed (35)
```

### RED 2 — the D-83 r-word ban, on the NEW surface

The banned token planted inside `manual-return-notice.tsx`'s marked region:

```
 ❯ tests/design/reversed-copy.test.ts (12 tests | 1 failed) 18ms
     × src/components/booking/manual-return-notice.tsx uses neither the banned token nor the false
       impossibility inside it 9ms

AssertionError: src/components/booking/manual-return-notice.tsx says something about the booker's money
that is not true: ["src/components/booking/manual-return-notice.tsx:111 — claims money was sent back on
the branch where nothing has been sent back. D-83 bans the token outright here: …"]

      Tests  1 failed | 11 passed (12)
```

### RED 3 — the defect itself, rendered

The page's fork disabled (`false && …`), so the cancelled branch behaves exactly as it shipped:

```
 ❯ tests/booking/detail-completeness.test.tsx (47 tests | 1 failed | 45 skipped) 85ms
     × (19) states the by-hand truth — with the amount, the reference, and NO window 69ms

AssertionError: the by-hand panel does not say the money is coming back. The booker has to be told what
happens next; an amount with no verb is a figure, not a statement.:
expected '₱1,000.00 refund on its wayRefunds to…' to contain 'coming back to you'

Expected: "coming back to you"
Received: "₱1,000.00 refund on its wayRefunds to GCash and Maya are usually back within 24 hours; a card
can take up to 30 days, depending on your bank."
```

That `Received` string **is** the defect, verbatim: the false in-transit sentence and a refund window,
on a booking where nothing was dispatched. Case (20) passed in the same run — the ordinary cancellation
was never broken, which is why the fix had to be a fork rather than a rewrite.

## The Fix

### 1. The derivation — `src/lib/booking/refund-dispatch.ts`

```
outcome = 'needs_attention'
AND action IN (refund_dispatch_failed, refund_transfer_failed,
               refund_manual_required, refund_over_instapay_ceiling)
AND meta->>'bookingId' = $1
LIMIT 1
```

**Zero migrations.** `drizzle/` still ends at `0025_audit_resolved_by.sql` (26 `.sql` files, unchanged).
The obvious implementation is a `refund_dispatched_at` column; D-80 forbids one, and the constraint
produced the better answer — the fact is already persisted, exactly once, by the code that discovers it.
A second representation would be a second thing to keep in sync, and the half that drifted would be the
half a booker reads.

`resolved_at` is deliberately **not** consulted. It records that an operator closed the alert, not that
money reached an account — nothing in this system observes that, because the transfer happens outside
it. Suppressing the caveat on it would restore the in-transit sentence, which was the false one.

The call is gated on `refund_cents > 0`, matching the cancelled branch's existing discipline for its
payment probe: a party cancellation with no refund pays no round trip.

### 2. The durable statement — `src/components/booking/manual-return-notice.tsx`

```
₱1,000.00 is coming back to you.
We couldn't send it back automatically, so we've flagged it to be returned by hand.
Your reference is FIT-XXXXXXXX — we've recorded it against this booking.
[ Email us about this payment ]      ← SupportPath, guarded, renders nothing today
```

Composed from `MoneyStatement` (STATE-06/D-73's single owner), with `SupportPath` reused verbatim — the
guard stays inside that component, so no caller holds an unguarded literal and
`tests/design/site-contacts.test.ts` is untouched and unweakened. `BookingReference` is **named** in the
sentence rather than re-rendered: the cancelled branch already renders the copyable element in its own
panel, and the sentence's job is to tell a person which token to quote.

Against the four copy rules:

| Rule | How it is met | What holds it |
|---|---|---|
| Never the r-word (D-83) | Not the participle, not the noun, not the stem | `reversed-copy.test.ts`, marked region, watched red |
| Never an impossibility (D-82) | *"couldn't send it back automatically"* — true of all four causes, and the money is not stuck | same gate, both spellings banned |
| Never a completed action (D-57) | *"is coming back to you"*; the only completed claim is the alert, which really was written | `detail-completeness` case (19) |
| **No refund window at all** (D-83) | The module that owns the three windows is not imported here | case (19) asserts the shipped sentence AND the raw `30 days` / `24 hours` are absent |

### 3. The fork, and the removal at the source

`/bookings/{id}`'s cancelled branch picks one of the two sentences; they are mutually exclusive claims
about the same figure, and rendering both would be worse than either. `CancelActionResult.notice` is
**gone** — the toast cannot be reintroduced by reading a field that no longer exists. `destUnverifiable`
moved into the `refund_manual_required` audit meta, which is the audience it was really for.

### 4. The gate, past its own stated blind spot

The STATE-08 scan reads string **literals** reachable from a toast call. `res.notice` is not a literal.
The scan's NOT-COVERED section said so, the component's comment said so, and both stayed green while the
violation shipped.

Closed by inverting the question. Instead of *"is this runtime string bad?"* (unanswerable without
resolving an import graph — 13-07's finding), the gate asks *"did a human declare this one, with a
reason?"* Every `toast`/`toast.*` call under the three roots whose arguments carry **no** readable string
must have its argument expression in `OPAQUE_TOAST_ARGUMENTS`. Nine such calls ship today; **one** row
covers them all (`res.error` — the failure arm, where nothing changed and the control is still there to
press). `res.notice` has no row and cannot get one silently.

**Stated plainly, because the previous hole was also documented:**

- ✓ It sees every opaque toast argument under the three roots and fails closed on anything new.
- ✗ It **cannot** read what `res.error` holds at runtime. The row is a human's claim about the action-result
  contract and is only as good as that human was; what the gate guarantees is that the claim exists and is
  attached to a live call site (asserted — a row for an expression nobody passes is red).
- ✗ It is keyed on source text, so `res.error` → `result.error` is a fresh red. Intended: a rename is a re-read.
- ✗ A renamed import (`toast as notify`) is still invisible. Unchanged, and still recorded.

`reversed-copy.test.ts` was widened from one declared file to a two-entry `MANUAL_SURFACES` table with a
size assertion — the two bans were never about `payment-reversed-state.tsx`, they were about a money
truth it happened to be the only holder of.

## Non-Vacuity — Every Walk Probed

`tests/booking/refund-dispatch.test.ts` exists because the two end-to-end suites **cannot say which
filter did the work**: both of their `false` cases are bookings whose only audit rows are `outcome: 'ok'`,
so a predicate that had dropped the action set *or* the outcome test would pass them identically. That is
13-12's shape (44/44 green with the predicate replaced by `true`).

Every case there flips when the filter it names is removed, and the four-action walk meets a real
non-member (`guest_email_blocked` — a genuine `needs_attention` action from the guest-email seam).

Verified by hardwiring the predicate, both directions:

```
# return rows.length >= 0   (hardwired TRUE)
 ❯ tests/booking/refund-dispatch.test.ts (11 tests | 5 failed)
     × answers FALSE for a needs_attention action OUTSIDE the set — the walk's control
     × answers FALSE when the SAME action was recorded as a success — the outcome filter
     × answers FALSE for a DIFFERENT booking's alert — the jsonb scoping
     × answers FALSE on a row with NULL meta, rather than raising
     × answers FALSE against an empty table, and true is not its default

# return rows.length > 999  (hardwired FALSE)
 ❯ tests/booking/refund-dispatch.test.ts (11 tests | 8 failed)
     × answers true for a needs_attention `refund_dispatch_failed` row naming the booking
     × answers true for a needs_attention `refund_transfer_failed` row naming the booking
     × answers true for a needs_attention `refund_manual_required` row naming the booking
     × answers true for a needs_attention `refund_over_instapay_ceiling` row naming the booking
     × … plus the flipped half of three control cases and the resolved_at case
```

The three surviving cases under a hardwired `false` are the set-size assertion and two that legitimately
assert `false` — which is the correct residue, not a gap.

The three cases in `instapay-refund.test.ts` that used to read `res.notice` now assert the durable
predicate, and case (3) — the transfer that **succeeded** — asserts `false` against a booking that
**does** have an audit row naming it (`refund_transfer_dispatched`, `outcome: 'ok'`). That is a real
discriminator, not a token opposite: a predicate matching on the booking alone would answer `true`.

`detail-completeness.test.tsx` cases (19) and (20) use the same fixture with **one input flipped**, so
neither result is reachable without the branch running. The harness now serves the `audit` table
explicitly (default `[]`); before that parameterisation its table-keyed stub answered every non-`booking`
read with the listing row, which would have flipped every cancelled render onto the by-hand copy.

## Verification

| Command | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npx eslint` (changed files) | clean |
| `npx vitest run tests/booking/refund-dispatch.test.ts` | **11 passed** |
| `npx vitest run tests/booking/detail-completeness.test.tsx` | **47 passed** |
| `npx vitest run tests/booking/cancellation.test.ts tests/paymongo/instapay-refund.test.ts` | **26 passed** |
| `npm run test:design` | **47 files passed**, **808 passed \| 3 skipped** |
| `npm test` | **157 files passed \| 1 skipped**, **1530 passed \| 4 skipped** |
| `npm run build` (lint + design suite + `next build`) | lint **0 errors** (14 pre-existing warnings), design **808 passed**, `✓ Compiled successfully in 21.2s` |
| `ls drizzle/*.sql \| tail -1` | `drizzle/0025_audit_resolved_by.sql` — unchanged |

Run one at a time throughout: `tests/global-setup.ts` TRUNCATEs every `public` table in `fitout_test` on
every run, and `npm run build` includes the design suite.

## Constraints Honoured

- **`tests/design/site-contacts.test.ts` untouched** (`git diff --name-only` → absent). `SupportPath` is
  composed unmodified, its guard stays inside its own file, and the new caller passes a sentence-case
  label — never the capitalised single word that file's `SUPPORT_LABEL` scan bans.
- **`REFUNDABLE_RAILS` untouched.** `refund-rail.ts` is not in the diff; QR Ph is still unrefundable.
- **`server-only` + GATE-05.** No money computation crossed a boundary: `ManualReturnNotice` takes a
  finished `amountLabel` string and has no `cents` prop, the RSC does the formatting, and the new module
  returns a boolean. `server-only-guards.test.ts` green, `next build` green.
- **Design gates.** No raw hex, no `rgb(`, no `oklch(`, no arbitrary `text-[NNpx]`, no accent recipe and
  **zero alarm-colour tokens** — a dispatch that did not happen is not the booker's fault.
  `phase13-surface-gates.test.ts` (which scans `src/components/booking/**`) green with the new file in it.
- **No test skipped, weakened or inverted.** Three assertions in `instapay-refund.test.ts` MOVED from a
  pushed string to the durable derivation; the property they defended — *the booker is told, and is not
  left to infer* — is unchanged and now proven on the surface that actually tells them.
- **`drizzle/` untouched**, still ending at `0025_audit_resolved_by.sql`.

## Deviations from Plan

This is gap-closure work with a stated objective; there was no PLAN.md. Two judgement calls worth naming:

**1. `CancelActionResult.notice` was removed, not merely ignored (Rule 2 — the fix is incomplete without it).**
The objective asked only that the toast go. Leaving the field would have left a dead push whose single
plausible consumer is the surface just deleted, and the STATE-08 gate this plan added would then have
nothing to catch if somebody re-added it. Removing it made the assertion in three existing tests
un-typecheckable, which is how the migration in `instapay-refund.test.ts` came to be part of this work.

**2. Four cause-specific notices collapsed to one sentence.** The three removed strings distinguished a
ceiling, a failed transfer and an unverifiable institution list. The booker's consequence is identical in
all four — nothing was sent, a person will move it — and 13-UI-SPEC specifies two sentences for this
branch and no third (D-94). The one measurable loss is the transfer-failure string's *"you may be asked
to re-enter your details"*; the support path and the reference carry the route forward instead. The
distinction was preserved where it is actually consumed: `destinationUnverifiable` now travels in the
`refund_manual_required` audit meta, for the operator working the queue.

## Known Stubs

None. `SupportPath` renders nothing today, and that is a guard (D-64), not a stub: it is code-complete
behind `SUPPORT_EMAIL === null` and starts rendering by itself the day an operator sets the constant.
The sentence it sits under never depended on the address — only the channel does.

## Notes For Later

- The end-of-run `[test-db] LEAKED WRITES` report (2 `public.audit` rows, `action=guest-email` and
  `action=notify`) is the pre-existing deferred item D1, identical before and after this change.
- An untracked `.claude/` directory at the repo root (agent `launch.json` + a stale worktree holding an
  unrelated slide deck) is logged in `deferred-items.md` and deliberately left alone — a `.gitignore`
  decision does not belong in a money-path commit.
- **STATE-08 is now COMPLETE.** The phase verifier recorded this as its only remaining residual, and the
  extended gate means the specific regression cannot return silently.

## Self-Check: PASSED

- `src/lib/booking/refund-dispatch.ts` — FOUND
- `src/components/booking/manual-return-notice.tsx` — FOUND
- `tests/booking/refund-dispatch.test.ts` — FOUND
- `.planning/phases/13-confirmation-bookings-trust/13-18-SUMMARY.md` — FOUND
- Commit `d470972` — FOUND in `git log`
- Commit `89dc0f2` — FOUND in `git log`
