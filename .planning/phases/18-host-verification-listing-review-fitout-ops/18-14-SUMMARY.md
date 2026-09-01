---
phase: 18-host-verification-listing-review-fitout-ops
plan: 14
subsystem: phase-close
tags: [evidence, probe-transcript, decision-document, status-line, migration, foreign-key, pm-checkpoint]

# Dependency graph
requires:
  - phase: 18-host-verification-listing-review-fitout-ops
    plan: 01
    provides: "`npm run ops:grant` — the only path to staff standing, and the account reading 1 was taken under"
  - phase: 18-host-verification-listing-review-fitout-ops
    plan: 05
    provides: "`src/lib/verification/port.ts` — the contract the comparison doc's switching cost is measured against"
  - phase: 18-host-verification-listing-review-fitout-ops
    plan: 06
    provides: "`flipToPendingOnMaterialEdit` — the write that leaves the `listing_review` row D-254's FK was blocking the deletion of"
  - phase: 18-host-verification-listing-review-fitout-ops
    plan: 08
    provides: "`OPS_CANCEL_REFUNDS_SERVICE_FEE` at `src/lib/payments/fees.ts:82` — the one line D-236 flips"
  - phase: 18-host-verification-listing-review-fitout-ops
    plan: 12
    provides: "`/ops` behind `assertStaff()` in the layout and `requireStaff()` in the page — the mechanism the four readings measure"
  - phase: 18-host-verification-listing-review-fitout-ops
    plan: 13
    provides: "the two e2e teardown failures that raised D-254, with both transcripts"
provides:
  - "`18-EVIDENCE.md § P1` — OPS-02's four production-build status-line readings, plus the body check and ONE finding"
  - "`18-KYC-VENDOR-COMPARISON.md` — HVER-04's fork for the PM, verdict-first, A1 re-probed"
  - "`drizzle/0029_listing_review_cascade.sql` — D-254: `listing_review.listing_id` becomes `ON DELETE cascade`"
  - "A1 closed: PayMongo Platforms re-probed 2026-09-01, 40 days on, identical negative result"
affects: [phase-18-close, ops-route, verification-port, e2e-fixture-contract]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "a one-time production-build `curl` transcript as the ONLY instrument for a claim about an HTTP status line, paired with a per-commit structural test that pins what the guard IS while the transcript records what it RETURNED"
    - "a nonexistent-route CONTROL as the load-bearing reading — the equality of three 404s, not any one of them, is the indistinguishability claim"
    - "a decision document that labels every claim probed / cited / assumed with its retrieval date, and states its own blind spots in a named section"
    - "re-probing a research ASSUMPTION rather than carrying it into the deliverable — A1 cost two GETs and moved from [ASSUMED] to [PROBED]"

key-files:
  created:
    - .planning/phases/18-host-verification-listing-review-fitout-ops/18-EVIDENCE.md
    - .planning/phases/18-host-verification-listing-review-fitout-ops/18-KYC-VENDOR-COMPARISON.md
    - drizzle/0029_listing_review_cascade.sql
  modified:
    - src/lib/db/schema.ts
    - drizzle/meta/_journal.json

key-decisions:
  - "The header-level 404 oracle was RECORDED as a finding, not explained away and not fixed — it is app-wide, pre-existing, and identical on `/listings/[id]`."
  - "A1 was re-probed rather than cited. Two GETs, 40 days after the original, identical result — which is what let the doc lead with observed behaviour on the side of the fork it recommends against."
  - "D-254 shipped as a NEW migration file, never folded into 0026, and the digest gate stayed green by design (D-251 froze 0000–0025 only)."
  - "The five PM items are recorded as EXPLICIT DATED DEFERRALS, not guessed at. No plan in this phase resolved D-236."

metrics:
  duration: ~110 min
  tasks: 3 (2 auto + 1 ruled scope addition) + 1 checkpoint OPEN
  commits: 3
  completed: 2026-09-01
requirements: [OPS-02, HVER-04]
---

# Phase 18 Plan 14: The Status-Line Audit, the Vendor Fork & D-254 Summary

The two things Phase 18 owed that no test can produce — a real HTTP status line and a decision document
— plus one FK that only ever blocked its own test fixtures.

---

## ⚠ READ THIS FIRST — D-236, the ops-cancel refund

**FitOut currently refunds a defrauded booker LESS than it refunds one whose host merely flaked.**

`OPS_CANCEL_REFUNDS_SERVICE_FEE = false` ships your PM-4 answer exactly as you gave it: the booker gets
the booking amount back, FitOut retains the service fee. But the HOST-cancellation path already refunds
100% **including** that fee, and it states the principle in its own words at
`src/app/actions/cancel-booking.ts:1134-1137`:

> ```
> // The refund is the FULL charge — space price AND the D-74 service fee. This is the ONE case where the
> // non-refundable fee IS returned: the booker did nothing wrong, so the platform, not the booker, absorbs
> // the gateway cost of the reversal. Read off the frozen row, never recomputed.
> const refundCents = row.quotedTotalCents ?? 0;
> ```

An ops-forced cancellation on a listing **FitOut has confirmed is fake** is a strictly stronger instance
of "the booker did nothing wrong" than a host flaking. **The question was put to you without this
precedent in view. That omission was the SWE's, not yours.**

**Flipping it is one line** — `src/lib/payments/fees.ts:82`, `false` → `true`. And the cost of the flip
is **measured, not promised**: `tests/payments/ops-cancel.test.ts` exercises **both** values, so the
opposite branch is already covered and no new test is needed. That is precisely why 18-08 was told to
isolate it behind a named constant instead of inlining the behaviour.

**No plan in this phase resolved it. It is yours.**

---

## What Shipped

### 1. OPS-02 — the four status-line readings (`18-EVIDENCE.md § P1`)

Taken under a **production build** of `8520721`, Next.js **16.2.7**, `next start -p 3100` — never
`next dev`, because a `loading.tsx` Suspense boundary commits 200 before a page-level `notFound()` can
run and dev and prod differ on exactly that.

```
/ops              (STAFF session)              -> 200
/ops              (NON-STAFF session)          -> 404
/ops              (NO session)                 -> 404
/ops/xyz          (route does not exist)       -> 404
```

**Second pass, same server, identical.** Readings 2, 3 and 4 are the same number and reading 1 differs
— **that equality IS OPS-02's last clause**, and the nonexistent-route control is what makes it mean
anything.

The body check passed too, and one part of it is better than the requirement asked for:

- `Ops` occurs **twice** in the staff body and **zero** times in all three 404 bodies. No ops chrome on
  a page claiming not to exist.
- Readings 2 and 3 are **byte-identical** (same SHA-256). A prober cannot tell *"signed in but not
  staff"* from *"not signed in"* — an indistinguishability OPS-02 does not ask for.

**⚠ AND ONE FINDING, recorded rather than tuned away.** The four numbers are right; a fifth is not. A
path with **no matching route** is served from the prerendered static 404 (`x-nextjs-prerender: 1`,
`x-nextjs-cache: HIT`, `Content-Length: 29644`). A **matched route that throws `notFound()`** is served
dynamically (`Transfer-Encoding: chunked`, no `x-nextjs-*` headers, 25970 bytes). One request pair still
tells a prober something is routed at `/ops` — read off the headers rather than the status line, stable
across three repetitions.

**It is app-wide, pre-existing, and 18-12 did not introduce it.** `/listings/[id]` — the shipped route
17.1 § P1 blessed — has the identical signature. It was never caught because 17.1 § P1 deliberately
captured **no bodies** (`curl -o /dev/null`, T-17.1-01's mitigation). New information, not a new defect.
Not fixed here: it is out of this plan's scope boundary and no ops-side change can close it. **Filed for
the roadmap.**

The transcript closes by saying, in its own words, that it is a **one-time audit and not a gate**, and
names `tests/design/ops-guard-coverage.test.ts` as the ongoing per-commit pin (Pitfall 9).

**Server torn down:** PID `20872` killed, `:3100` refuses connections, no dev server was running before
this drive and none was started by it.

### 2. HVER-04 — `18-KYC-VENDOR-COMPARISON.md`, the fork

Written for you, verdict first, 295 lines. **Recommendation: stay manual now; Didit when your time
becomes the constraint; not PayMongo.**

**It leads with the structure, not the price** — as instructed, and because the price argument actually
*favours* PayMongo (≈₱0 marginal). PayMongo's account activation **is** its payouts gate, so choosing it
collapses the fifth and sixth sell-gate terms back into the third — the exact coupling D-225 exists to
break, and back to a gate that in production never turns true on its own merits, i.e. back to *"the host
clicked a link in an email."* The first price appears only after that argument closes.

**A1 was re-probed rather than assumed.** Research listed "PayMongo Platforms is *still* sales-gated" as
`[ASSUMED]` and recommended the plan re-probe it. Two read-only GETs, test mode, same key, **40 days
after the original**:

```
[PROBED — 2026-09-01]
GET /v2/wallets?status=activated                                -> HTTP 200  {"data":[]}
GET /v2/transfers/receiving_institutions?provider=instapay      -> HTTP 404  {"errors":[{"code":"not_found",…}]}

https://docs.paymongo.com/docs/paymongo-platforms               -> HTTP 404
https://developers.paymongo.com/docs/paymongo-platforms         -> HTTP 404 (redirects to the same)
```

Identical to 2026-07-23. **A1 moves from `[ASSUMED]` to `[PROBED]`** — which is what lets the document
lead with observed behaviour on the side of the fork it argues against, matching `refund-rail.ts`'s
standard rather than merely citing it.

Every figure carries a retrieval date and a **probed / cited / assumed** label. The gaps section says
out loud that **no sandbox was walked on either side**, that PH-specific pricing is unpublished by every
vendor found, that Success Criterion 7's literal "third-party vendor" is **deferred** while the storage
contract it protects is satisfied in full, and that the vendor figures expire **2026-09-15**.
"Stay manual" is presented as a **live third option**, not the status quo the fork is trying to leave.

### 3. D-254 — `listing_review.listing_id` now cascades (RULED SCOPE ADDITION)

Not in the plan; ruled into the CONTEXT after 18-13 raised it, and fixed here.

`drizzle/0029_listing_review_cascade.sql` — hand-authored, a **new** file. The reasoning is restated at
`src/lib/db/schema.ts:456` and in the migration header: the durable record of a review decision is the
**D-218 `audit` row**, whose `actor_id` deliberately carries no FK (D4) exactly so the trail outlives
what it describes. `restrict` was the only one of the seven listing-child FKs; the two families that
legitimately take it here are **financial** and **immutable history**, and this is neither. In production
`softDeleteListing` means a listing is never hard-deleted, so **the constraint's entire observable effect
was breaking fixture teardown.**

Verified on the dev database after `npm run db:migrate`:

```
                 conname                 | confdeltype
-----------------------------------------+-------------
 listing_review_listing_id_listing_id_fk | c
```

**Both specs re-run BY HAND, teardown green in both:**

```
e2e/host-headings.spec.ts        14 passed (54.2s)
e2e/keyboard-composites.spec.ts   7 passed (50.8s)   ← including :1502, the previously-failing case
```

⚠ `keyboard-composites` was **red on its first run** with two failures, both at
`seedWizardHost`'s `getByRole("radio", { name: "Host a space" })` timing out on a cold dev-server
compile — **not** the FK, which is a different error entirely. Re-run alone: **7 passed**. This is the
project's own "never trust the first red" rule, and it is recorded rather than quietly re-run.
Leaked `listing_review` rows for `e2e_%` listings afterwards: **0**.

Not folded into 0026 (D-251's immutability rule), and **55P04 does not apply** — no enum value is added.
The shipped-migration digest gate is untouched: D-251 froze `0000–0025` only, and both gates assert
`>= SHIPPED_MIGRATIONS.length`, so a new file is green by design. ⚠ Do **not** "fix" a future teardown
of this kind by making the fixture soft-delete instead — that hides the constraint and the next hard
delete meets the same wall. Written into the schema site.

---

## ⚠ CARRIED ITEMS — for the PM. Surfaced, not solved.

### The five checkpoint decisions — all OPEN, deferred 2026-09-01

The plan's Task 3 is a **blocking `checkpoint:human-verify`** and `workflow.auto_advance` is `false`.
No item below was answered by this executor. Each is recorded as an **explicit dated deferral**.

| # | Item | Status | The one line that closes it |
|---|---|---|---|
| **a** | **D-236** — ops-cancel refund (see the top of this file) | **OPEN — deferred 2026-09-01** | `src/lib/payments/fees.ts:82`, `false` → `true`. Both branches already tested. |
| **b** | **D-250** — `SUPPORT_EMAIL` is `null` | **OPEN — deferred 2026-09-01** | `src/lib/site.ts:70`. See below. |
| **c** | **F11 gap** — is a suspended host told their payouts are frozen? | **OPEN — deferred 2026-09-01** | Product decision. D-252 already tells them on `/host/earnings`; what is missing is naming the *due session that will never pay*. |
| **d** | **A4 / D-231 "photos"** — read as the photo SET; reorder excluded | **OPEN — deferred 2026-09-01** | Confirm or overturn. Cheap either way. |
| **e** | **The KYC vendor** — PayMongo / a vendor / stay manual | **OPEN — deferred 2026-09-01** | Answer to be recorded as a D-number so the next phase inherits it. |

### D-250 / `SUPPORT_EMAIL` — one line, three things

`export const SUPPORT_EMAIL: string | null = null;` (`src/lib/site.ts:70`). **Does a monitored FitOut
inbox exist, and what is it?** Every rejection and suspension surface this phase shipped was written to
stand **without** one, deliberately — so nothing is broken. But answering it also closes the
carried-forward **`STATE-05`** and **`TRUST-01`**, which have been open across phases.

⚠ If you supply one, `tests/design/site-contacts.test.ts` **INVERTS** and begins *demanding* support
affordances on the surfaces that currently must not have them. That is a **follow-on task, not a
same-commit edit.**

### Title and description are still NOT material fields (D-231)

A host can rewrite an approved listing's **entire words** — its title and its description — and it stays
`approved`, sellable, and badged. Only the five D-231 fields trip re-review. This is the phase as
designed, and it is the largest hole left in Success Criterion 4: the check FitOut advertises is about
*what the space is*, and the words are what a booker actually reads.

### D-207's cost — the grandfathered catalogue is never checked

The pre-existing catalogue is **permanently grandfathered** by PM-2 and never retroactively reviewed.
On this machine's dev database that is:

```
listing.review_state       grandfathered = 14   (pending 35, approved 5)
host_verification.status   grandfathered = 12   (approved 1)
```

Production's number is whatever is `published` at cutover; these are the local figures and are stated as
such. Those rows carry a **distinguishable** state — `grandfathered`, not `approved` — precisely so a
future PM can burn the backlog down on purpose. **The backfill is one statement (D-211).** The natural
burn-down is already running: the first material edit to a grandfathered listing pulls it into review
like any other.

### D-253 — the payout freeze has no compiler census

Two SQL restatements of the suspension freeze exist and nothing structural holds them equal — **one test
does** (`tests/payments/payout-suspension-freeze.test.ts`). If a third reader of
`host_verification.status` appears on a money path, `tsc` will say nothing. Recorded, not fixed.

### The three pre-existing e2e reds

Unchanged and not this plan's, all diagnosed in `deferred-items.md`: `cancel.spec.ts:232` (D1),
`calendar-hit-area.spec.ts` × 4 (D2 — a calendar-month time bomb: September 2026 is a 5-week month and
the spec hard-codes 6 rows), `price-parity.spec.ts:287` (D3 — a Suspense-fallback strict-mode flake,
green when re-run alone). **D6 is now CLOSED by D-254.**

---

## Deviations from Plan

### [RULED SCOPE ADDITION] D-254 — the `listing_review` FK

Not a deviation the executor took; a scope addition **ruled into `18-CONTEXT.md` § D-254 before this
plan ran**, after 18-13 raised it. Shipped as commit `8520721`. It is the only source change in this
plan, which is why `18-EVIDENCE.md`'s build provenance names it and why `git diff --exit-code src/` is
clean *after* the readings rather than throughout.

### [Rule 2 — missing critical evidence] A1 was re-probed

The plan's Task 2 said to quote the 2026-07-23 transcript. It did not require re-probing. Research's
Assumptions Log did recommend it ("cheap to re-probe … Recommend the plan does"), and the deliverable's
whole standard is a verdict settled by **observed** behaviour. Two read-only GETs and one doc-page fetch
were run; **no POST was issued** and nothing was created on the PayMongo account. Result identical to
2026-07-23. The doc quotes **both** transcripts.

### Nothing else

No other deviation. No package was installed. No test was weakened or skipped.

---

## Verification

| Gate | Result |
|---|---|
| `npm run build` | **exit 0** (clean tree at `8520721`, `.next/` cleared first) |
| `npx tsc --noEmit` | **0**, run twice — after D-254 and again at close |
| `npm test`, run ALONE | **207 files / 2485 passed / 5 skipped** — byte-for-byte the 18-13 baseline |
| `npm run test:design`, run ALONE | **73 files / 1331 passed / 3 skipped** — the 18-13 baseline |
| `git diff --exit-code src/` after the readings | **exit 0** — the audit changed no source |
| e2e, by hand (D-24) | `host-headings` **14 passed**, `keyboard-composites` **7 passed** — both teardowns green |
| `grep -c http_code 18-EVIDENCE.md` | **4** |
| `grep -c 2026-07-23 18-KYC-VENDOR-COMPARISON.md` | **3** |

Every suite was run **alone**, each fully exiting before the next started. The `[test-db] LEAKED WRITES`
block naming `notify` and `guest-email` (2 rows) appeared as expected and is pre-existing.

**Requirement counts are unchanged from 18-13 in both suites** — correct, and worth saying: this plan
adds no test, because neither of its two deliverables is a thing a test can assert. That is the whole
premise of `18-VALIDATION.md § Manual-Only Verifications`, and the ongoing instruments
(`tests/design/ops-guard-coverage.test.ts` for the guard structure) already shipped in 18-12.

---

## Requirements

- **OPS-02** — the last clause is **measured**: 200 / 404 / 404 / 404 under a production build, with the
  nonexistent-route control and the body check. **Complete at the status line and in the rendered
  document.** ⚠ The header-level oracle above is recorded as a finding against its most literal reading;
  it is app-wide and not ops-specific.
- **HVER-04** — **delivered.** A fork the PM can decide from, verdict first, structural argument before
  any price, every figure dated and labelled, its own blind spots stated in it.

Success Criterion 7's literal *"runs through a third-party vendor"* remains **DEFERRED** per PM-1 /
D-206, and the storage contract it exists to protect — **no government ID at FitOut** — is satisfied in
full by this phase and enforced by the database's own column set.

---

## Commits

| Hash | Message |
|---|---|
| `8520721` | `fix(18-14): listing_review.listing_id cascades — D-254` |
| `3b22a56` | `docs(18-14): OPS-02's four status-line readings, under a production build` |
| `a601a56` | `docs(18-14): HVER-04 — the KYC vendor fork, for the PM to decide` |

---

## For the Verifier

The phase checkbox on `ROADMAP.md` is **deliberately NOT ticked** — phase completion is the verifier's
call and the verifier has not run. `18-14`'s own row is ticked; the phase row is not.

**The blocking checkpoint is OPEN.** All five PM items are recorded above as explicit dated deferrals,
not as answers. `.planning/STATE.md` carries them too.

---

## Self-Check: PASSED

Files claimed created, verified on disk:

```
FOUND: .planning/phases/18-host-verification-listing-review-fitout-ops/18-EVIDENCE.md
FOUND: .planning/phases/18-host-verification-listing-review-fitout-ops/18-KYC-VENDOR-COMPARISON.md
FOUND: .planning/phases/18-host-verification-listing-review-fitout-ops/18-14-SUMMARY.md
FOUND: drizzle/0029_listing_review_cascade.sql
```

Commits claimed, verified in `git log`:

```
FOUND: 8520721   FOUND: 3b22a56   FOUND: a601a56   FOUND: 589dc2b
```

No stubs. Nothing in this plan renders, so there is no placeholder surface to scan; the two deliverables
are documents and both are complete, with their own gaps named inside them rather than left implicit.

**No threat flags.** This plan opened no network endpoint, no auth path and no schema surface at a trust
boundary. D-254 changes a foreign key's delete rule on an existing table and adds no column, no reader
and no writer; the threat register's T-18-1401 through T-18-1405 are all accounted for in
`18-EVIDENCE.md` and `18-KYC-VENDOR-COMPARISON.md`. T-18-SC holds: **no package was installed.**
