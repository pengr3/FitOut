---
phase: 18-host-verification-listing-review-fitout-ops
verified: 2026-09-01T14:30:00Z
status: passed_with_concerns
score: 17/17 requirements substantively implemented; 7/7 success criteria achieved (within
  PM-narrowed/deferred scope); 0 code-level blockers found; 1 open PM checkpoint (5 items,
  pre-flagged by the phase itself) and 1 stale-documentation finding
overrides: []
gaps: []
deferred: []
human_verification:
  - test: "18-14's blocking checkpoint — 5 items: (a) flip OPS_CANCEL_REFUNDS_SERVICE_FEE to true
      to match the host-cancel precedent, or keep it false; (b) set SUPPORT_EMAIL or keep it null;
      (c) whether a suspended host needs a MORE SPECIFIC message naming the exact due session that
      will never pay (F11), beyond the general suspension notice already shipped; (d) whether
      D-231's 'photos' material field should also cover reorder-only edits; (e) which KYC path —
      PayMongo Linked Accounts, a vendor (Didit recommended), or stay manual"
    expected: "PM reads 18-KYC-VENDOR-COMPARISON.md and the D-236 argument in
      src/lib/ops/cancel-impact.ts:56-89, then answers each as a D-number"
    why_human: "Explicitly money/product/legal decisions the phase deliberately did not resolve
      (D-236 says 'not mine to settle' in the code itself); no code path is ambiguous or broken —
      only the policy choice is open"
  - test: "Reconcile REQUIREMENTS.md's OPS-01 and OPS-03 checkboxes ([ ]) against their own
      traceability rows, which describe both as closed by plans (18-12, 18-08) that have since
      shipped"
    expected: "Either the checkboxes are flipped to [x] or a reason is recorded for why they stay
      open despite the dependent plans landing"
    why_human: "Documentation bookkeeping, not a code defect — verified against source below"
---

# Phase 18: Host Verification, Listing Review & FitOut Ops — Verification Report

**Phase Goal:** A space cannot be sold on FitOut until a person at FitOut has checked who the host is
and that the listing is real — and FitOut has the ops function, the authenticated staff identity, and
the enforcement levers to do that checking and to undo it.

**Verified:** 2026-09-01
**Status:** `passed_with_concerns`
**Re-verification:** No — initial verification

## Method

This report is built from the codebase, not from the 14 SUMMARY.md files. Every claim below cites a
file:line I read directly, a grep/test I ran myself, or a gate I executed in this session. Three
success criteria were deliberately narrowed or partially deferred by PM decision at plan time
(D-206/D-207/D-210/D-212) — verification below judges each against its **narrowed form**, per the
task's explicit scoping instruction, not the ROADMAP's original wording.

---

## Gates Run (this session, each alone, per the phase's own serialisation rule)

| Gate | Command | Expected | Actual | Status |
|---|---|---|---|---|
| Type check | `npx tsc --noEmit` | 0 errors | 0 errors (no output) | ✓ PASS |
| Full suite | `npm test` | 207 files / 2485 passed / 5 skipped | **207 passed \| 2 skipped (209 files)**, **2485 passed \| 5 skipped (2490 tests)** | ✓ PASS — exact match |
| Design suite | `npm run test:design` | 73 files / 1331 passed / 3 skipped | **73 passed (73 files)**, **1331 passed \| 3 skipped (1334 tests)** | ✓ PASS — exact match |
| e2e | not run | N/A — D-24 keeps it out of CI; 3 pre-existing reds documented in `deferred-items.md` (D1–D3), reconfirmed pre-existing by reverting the phase's own source files and re-running | not run, per instructions | — not counted |

`npm test`'s leaked-audit-row warning (2 rows, `guest-email` + `notify`) is pre-existing test
infrastructure containment reporting (module-singleton `db` bypassing per-file schema isolation), not
a phase-18 regression — the message itself states it is "CONTAINED, not fixed" and unrelated to any
phase-18 file.

---

## Success Criteria (goal-backward, against narrowed/deferred form where applicable)

### SC1 — A staff member signs in as themselves; every ops action records who did it; no ops power reachable by URL or non-staff account

**VERIFIED.**

- `role` reused from the dead `additionalField` (`src/lib/auth.ts:112`, `input: false` — unwritable
  from any client body). Confirmed: no admin-plugin routes are mounted (`src/lib/ops/staff.ts:14-31`
  documents the 15-route rejection).
- `src/lib/ops/staff.ts:80-89` (`readStaff`) — **positive** equality `u.role === "staff"` against a
  **nullable** column, never an inverted test. Comment states why: an inverted test would promote every
  NULL-role row to staff.
- `src/lib/ops/staff.ts:110-114` (`requireStaff`, layer 2/3 — the actual security boundary) is called
  independently at every ops page and every ops server action:
  `src/app/(ops)/ops/page.tsx:130`, `src/app/actions/ops-review.ts:355,450,572,671,753`,
  `src/app/actions/cancel-booking.ts:1520` (the sixth ops action, `cancelBookingAsOps`) — **6 of 6**
  ops actions gate independently.
- `src/lib/ops/staff.ts:142-144` (`assertStaff`, layer 1 — status-line only) is `await`ed, blocking,
  above any Suspense boundary, in `src/app/(ops)/ops/layout.tsx:69`.
- `requireStaff()` refuses with `notFound()`, never a 403 or a redirect (`src/lib/ops/staff.ts:112`) —
  the same body a nonexistent route serves, by design.
- **Measured, not just read**, in `18-EVIDENCE.md § P1` under a `next build && next start` production
  server (commit `8520721`): staff → **200**, non-staff → **404**, signed-out → **404**, a nonexistent
  control route `/ops/xyz` → **404**, second pass byte-identical. Readings 2 and 3 are SHA-256
  identical bodies with zero occurrences of the string `Ops`.
- Every ops action's `audit` row carries `actorId: staff.id` — the value `requireStaff()` returned for
  the authenticated session, never asserted or client-supplied. Confirmed at all 6 action call sites
  (`grep -c "actorId: staff.id"` across `ops-review.ts` and `cancel-booking.ts` returns matches at
  every `recordAudit(` call, both `outcome: "ok"` and `outcome: "denied"` branches).
- `scripts/ops-grant.ts` + `npm run ops:grant`/`ops:revoke`/`ops:staff` are the only path to staff
  standing (D-217) — confirmed present in `package.json:27-29` and `scripts/ops-grant.ts`.

**One finding, explicitly pre-existing and out of scope (per task instructions, not counted against
this phase):** `18-EVIDENCE.md § P1`'s "THE FINDING" — an unrouted path (`/ops/xyz`) is served from
Next's prerendered static 404 (`x-nextjs-prerender: 1`, fixed `Content-Length`), while a matched route
throwing `notFound()` (`/ops` itself) is served dynamically (`Transfer-Encoding: chunked`). One header
pair still distinguishes "a route exists here" from "nothing is routed here" at the transport level.
Measured on the shipped, blessed `/listings/[id]` route too — identical signature, app-wide, not
introduced by 18-12. No ops data leaks (status line, body and chrome are all correct); this is a
header-level oracle the phase's own instrumentation cannot close and correctly declined to try to.

### SC2 — Sell-gate: NARROWED per D-210 to "a host cannot sell a listing created or materially edited after this phase until ops approves both host and listing"

**VERIFIED**, against the narrowed form.

- `src/lib/bookability.ts:109-132` (`deriveBookable`) carries the fifth and sixth terms as **required**
  parameter-object fields (not optional, not defaulted) — `listing.reviewState` and
  `host.verificationStatus` — both spelled as **positive literals**:
  `reviewState === "approved" || reviewState === "grandfathered"` and the mirror for
  `verificationStatus`. `suspended`/`pending`/`rejected`/`unverified` all fail.
- **4 compile-forced call sites**, confirmed by `grep -rn "deriveBookable(" src`:
  `src/app/(host)/host/listings/page.tsx:215`, `src/app/actions/booking.ts:204` (`placeHold`),
  `src/app/actions/booking.ts:480` (`placeOpenHold`), `src/app/listings/[id]/(detail)/page.tsx:305`.
- **The inlined SQL twin**, `src/lib/search/query.ts` (~line 245): `AND l.review_state IN
  ('approved', 'grandfathered')` and `AND COALESCE(hv.status::text, 'unverified') IN ('approved',
  'grandfathered')` — same positive-literal enumeration, same fail-closed COALESCE.
- **`placeHold` and `placeOpenHold` are two independent, textually-separate re-statements** —
  confirmed by reading both blocks in full (`booking.ts:150-217` and `booking.ts:449-490`). Each
  builds its own SQL SELECT with its own `leftJoin(hostVerification, ...)`, has its own `=== true` /
  `?? "unverified"` fail-closed guards, and its own refusal anchors: `L_nohours` / `L_pending_review`
  (`tests/booking/state-machine.test.ts`) vs. `L_OPEN_NOHOURS` / `L_OPEN_PENDING_REVIEW`
  (`tests/booking/open-capacity-hold.test.ts`) — all four anchors exist and are exercised in those
  files. **No shared helper was introduced** for the gate re-derivation (D-227 held) — confirmed by
  reading both blocks side-by-side; the only shared symbol is `deriveBookable` itself, which is the
  designed single source of the *predicate*, not of the SQL re-derivation.
- Fail-closed on absence confirmed in both TS (`?? "unverified"`) and SQL
  (`COALESCE(hv.status::text, 'unverified')`) at every one of the four read sites.
- **The narrowing (D-210) is real, not just documented**: `grandfathered` passes both terms
  deliberately (`bookability.ts:90-95`), and the migration (below, LVER-04) is what makes the
  pre-existing catalogue `grandfathered` rather than `approved` — so the gate binds new/edited
  listings, exactly as D-210 specifies.

### SC3 — Ops works one queue, oldest first, everything on one screen; approve/reject carries a reason the host is told

**VERIFIED.**

- `src/lib/ops/review-queue.ts` — one interleaved array over both `host_verification` and `listing`
  domain tables (never the `audit` table, which `recordAudit` deliberately swallows insert failures
  on — confirmed the module's own header states why that table would be an unsafe source of truth).
- Oldest-first with D-249's resubmission rule: the wait clock is the **latest**
  `listing_review.submitted_at`, not the listing's original `created_at` — confirmed in
  `review-queue.ts`'s header comment and `re-review.ts`'s `markForReReview` (below), which lets
  `submittedAt` default to Postgres' own clock so a resubmission cannot jump the line.
- `src/app/(ops)/ops/page.tsx` is **one page** (D-246) — no tabs, no second console — confirmed by
  directory listing: `src/app/(ops)/ops/{page,layout,loading,error}.tsx` only.
- The reason: `src/app/actions/ops-review.ts` writes a taxonomy-constrained, `.max(280)`-bounded
  sentence the host reads on `/host/listings` (rejection reason) and `/host`/`/host/earnings`
  (suspension reason) — confirmed those three pages import `loadHostVerification` and render
  `verification.reason` (see SC5/LVER-02 below for the exact call sites).

### SC4 — Material edit returns an approved listing to review

**VERIFIED**, including the D-249 extension the ROADMAP text alone does not mention.

- `src/lib/listing/re-review.ts` — `MATERIAL_FIELDS = ["address", "space_type", "capacity", "photos",
  "price"]` (line 96-102, exactly the ROADMAP's five). `title`/`description` are **deliberately
  excluded** and the exclusion is stated at the constant itself as a recorded gap, matching D-231.
- `RE_REVIEW_SOURCE_STATES = ["approved", "grandfathered", "rejected"]` (line 120-124) — confirms
  D-232 (approved/grandfathered → pending) **and** D-249 (rejected → pending, resubmission not
  appeal). The rejection reason is never cleared by the flip — `markForReReview` writes no statement
  touching that column, confirmed by reading the full function body (line 167-209).
- **Two independent detection sites**, matching D-242's finding that `saveListingStep` structurally
  cannot see photo changes:
  - `src/app/actions/listing.ts:287` (`materialEdit = addressChanged || spaceTypeChanged ||
    capacityChanged || priceChanged`) → `markForReReview(tx, listingId, "listing_fields")` at line 352.
  - `src/app/actions/listing-photo.ts:318,513` → `markForReReview(tx, listingId, "listing_photos")` at
    both add/remove/reorder call sites.
- The guard is entirely in the UPDATE's WHERE clause (`re-review.ts:172-183`) — a listing already
  `pending` or `withdrawn` is a calm 0-row no-op, never a branch.

### SC5 — Ops can suspend/pull a listing, choose block-new-only or cancel-and-refund per case; payouts freeze; no payout leaves for a suspended host

**VERIFIED**, both halves.

- **Freeze (positive half — ENF-02).** `src/inngest/functions/payout-sweep.ts:167`:
  `AND COALESCE(hv.status::text, 'unverified') <> 'suspended'` — a PRE-CLAIM predicate in
  `queryDuePayouts`, so a suspended host's booking never gets a `held` ledger row in the first place.
  `payout-reconcile.ts:177`'s `alertStuckHeld` mirrors the same exclusion **for `held` rows only**, so
  a deliberately-frozen row does not page an operator — exactly what the requirement text says
  ("a frozen row does not read as a stuck row… and does not page an operator").
- **The negative half, checked hard per the task instructions.** `payout-reconcile.ts:76-84`
  (`queryProcessingLedger`) carries **NO suspension exclusion**, and its docblock states explicitly:
  *"THIS PREDICATE CARRIES NO SUSPENSION EXCLUSION, AND MUST NOT… a stranded transfer is a real
  operator case whether or not the host was suspended afterwards."* Confirmed by reading the query
  (line 88-95): no `host_verification` join at all. `tests/payments/payout-suspension-freeze.test.ts`
  has a dedicated describe block (`line 369`) titled *"the mirror does NOT reach `processing`: a
  stranded transfer on a suspended host STILL alerts"* with an assertion that `queryProcessingLedger`
  still returns the row and `reconcileOne` still fires the alert. This is the exact behaviour the task
  told me to check hard, and it is correctly implemented and tested.
- **Enforcement lever choice, per case.** `src/lib/ops/cancel-impact.ts` computes the impact figures
  the console shows before commit; `src/app/actions/cancel-booking.ts:1511` (`cancelBookingAsOps`)
  requires `parsed.data.lever === "block_new_and_cancel"` (line 1535) or denies with
  `OPS_NOT_ESCALATED` — an omitted lever cancels nothing, confirmed by reading the guard.

### SC6 — Booker-facing badge states what FitOut checked; MUST NOT render for grandfathered (D-212, checked hard per instructions)

**VERIFIED — the sharpest check in this task, and it holds.**

- `src/lib/listing/fitout-check.ts:56-60` (`isFitoutChecked`):
  `return hostStatus === "approved" && listingReviewState === "approved";` — **both** terms are
  positive-literal `"approved"`, and **neither** admits `"grandfathered"`. This is structurally
  stronger than "renders for approved only": a grandfathered listing owned by an approved host, and an
  approved listing owned by a grandfathered host, both correctly fail.
- **Reduced to a boolean before crossing into any client component.** Confirmed at both call sites:
  `src/app/listings/[id]/(detail)/page.tsx:328` (RSC computes `fitoutChecked` once, passes the boolean
  to `HostBlock`) and `src/lib/search/query.ts:131` (`fitoutChecked: isFitoutChecked(...)` inside the
  server-side `toRow` projection, never in the card component). A client component therefore **never
  receives** the `approved`/`grandfathered` distinction at all — D-212 is enforced structurally, not
  conditionally, exactly as claimed.
- `src/components/listing/fitout-check-badge.tsx` takes a `checked: boolean` prop and returns `null`
  when false — no "unchecked" placeholder chip exists (confirmed: no fallback render branch).
- Copy audit: `FITOUT_CHECK_LABEL = "Checked by FitOut"`,
  `FITOUT_CHECK_EXPLAINER = "...We haven't visited the space."` — the deliberate negative SC6 requires,
  confirmed verbatim in the component file, variant is `"secondary"` (neutral, non-accent).

### SC7 — Identity checking through a third-party vendor: DEFERRED per D-206; storage contract must hold

**VERIFIED against the deferred form.**

- `src/lib/verification/port.ts` — a real provider-agnostic port. `PROVIDERS` registry
  (line 129-131), `resolveVerificationProvider` (line 147-153) resolves `null`/`undefined`/`""`/an
  unregistered name all to `null` via `Object.hasOwn` (guards against `constructor`/`__proto__`
  prototype-pollution false positives — a genuine fail-closed detail, not decoration).
  `runVerification` (line 167-174) is the **one** code path that can produce a persistable result; a
  caller cannot hand-construct one.
- `VerificationResult` type (line 97-102) is exactly `{ result, vendorRef, checkedAt, provider }` —
  four fields, comment states "DO NOT ADD A FIELD HERE."
- **Enforced by the database, not by convention**: `tests/ops/verification-schema.test.ts` asserts the
  `host_verification` table's **exact column set** (`toEqual` on a sorted array — set equality, not a
  subset check) against live `information_schema.columns`. The test file's own header records a
  **mutation that was run and scored**: appending `document_url text` to the table reddened case 1
  (the only case that could see it) and left cases 2/3 green — proving the assertion is load-bearing,
  not vacuous.
- Migration `drizzle/0026_host_verification_listing_review.sql` — `host_verification` and
  `listing_review` tables carry no document/image/ID column, confirmed by reading the full `CREATE
  TABLE` statements.
- `18-KYC-VENDOR-COMPARISON.md` (295 lines, read in full) is a genuine fork, not a rubber-stamped
  report: it re-probes PayMongo Platforms live on 2026-09-01 (still `HTTP 200` with zero wallets,
  still `HTTP 404` on money-movement endpoints — the same negative result as the original
  2026-07-23 probe, quoted verbatim with raw JSON), labels every claim `[PROBED]`/`[CITED]`/
  `[ASSUMED]`, and recommends **against** PayMongo specifically because it would re-couple identity to
  `payoutsEnabled` — the exact coupling D-225 was written to remove. This satisfies HVER-04 as a
  genuine PM-facing decision document, not a checkbox exercise.
- **The PM has not yet answered.** This is recorded as `OPEN` in `18-14-SUMMARY.md`'s blocking
  checkpoint and is the correct disposition per D-206 — SC7's literal wording is deferred by decision,
  and the storage contract it exists to protect is fully met in code today.

---

## Requirements — true state (all 17)

| Req | REQUIREMENTS.md checkbox | Traceability claim | Verified against code | Disposition |
|---|---|---|---|---|
| OPS-01 | `[ ]` unchecked | "Partial — needs the console, 18-12" | `/ops` route, layout, `requireStaff`/`assertStaff` all shipped and measured (18-EVIDENCE.md). Staff signs in through the existing Better Auth account system; standing reads server-side from `role` (`input:false`). | **Functionally complete** — checkbox is stale; the dependent plan (18-12) shipped after the checkbox was last written |
| OPS-02 | `[x]` | Complete | `requireStaff()` at all 6 action sites + page; `assertStaff()` in layout; `notFound()` everywhere, never 403; measured 200/404/404/404 under production build | **VERIFIED** (see SC1's header-oracle caveat — not a defect) |
| OPS-03 | `[ ]` unchecked | "Partial — closes at 18-08" | `recordAudit({ actorId: staff.id, ... })` confirmed at every one of the 6 ops action call sites (`ops-review.ts` ×5, `cancel-booking.ts` ×1), on both `ok` and `denied` branches | **Functionally complete** — checkbox is stale; 18-08 (the sixth action) shipped |
| OPS-04 | `[x]` | Complete | `review-queue.ts` — one interleaved array, oldest-first by latest `listing_review.submitted_at`; `/ops` is one page | **VERIFIED** |
| OPS-05 | `[x]` | Satisfied for D-245 | `notification-copy.ts` + `emitNotify` calls for 6 event kinds; host-surface reads at `/host`, `/host/listings`, `/host/earnings` | **VERIFIED** |
| HVER-01 | `[x]` | Complete | `src/lib/verification/port.ts` — registry + fail-closed resolver + `runVerification` single path | **VERIFIED** |
| HVER-02 | `[x]` | Complete | 4-field `VerificationResult` type; exact-column-set allow-list test, mutation-proved | **VERIFIED** |
| HVER-03 | `[x]` | Complete | `bookability.ts:130` — host term independent of `payoutsEnabled` (line 127, unchanged, still read separately) | **VERIFIED** |
| HVER-04 | `[x]` | Complete | `18-KYC-VENDOR-COMPARISON.md` — substantive, re-probed, labelled fork | **VERIFIED as a deliverable; PM answer OPEN (expected, per D-206)** |
| HVER-05 | `[x]` | Complete | `fitout-check.ts` + `fitout-check-badge.tsx` — D-212 structural (see SC6) | **VERIFIED** |
| LVER-01 | `[x]` | Complete | 7 gate sites confirmed (see SC2) | **VERIFIED** |
| LVER-02 | `[x]` | Satisfied | `public-listing.ts` (`isPubliclyViewable`, 3 call sites incl. `og-facts.ts` which previously restated the rule by hand — now calls the shared expression); host sees own status + reason | **VERIFIED — the third leak surface (D-247) is genuinely closed, not merely claimed** |
| LVER-03 | `[x]` | Complete | `re-review.ts` — 5 fields, 2 detection sites, 3 source states incl. `rejected` (D-249) | **VERIFIED** |
| LVER-04 | `[x]` | Complete | `drizzle/0026...sql` — `grandfathered` is a distinct enum value, never written as `approved`, idempotent/re-runnable, scoped `WHERE status='published' AND review_state='pending'` | **VERIFIED** |
| ENF-01 | `[x]` | Satisfied | `cancel-impact.ts` + `cancelBookingAsOps`'s explicit-lever gate | **VERIFIED** |
| ENF-02 | `[x]` | Complete | `payout-sweep.ts:167` (pre-claim freeze) + `payout-reconcile.ts:177` (held-row mirror) + `:76-84` (processing-row NO exclusion, negative half) | **VERIFIED — both halves, negative half checked hard per instructions** |
| ENF-03 | `[x]` | Complete | `cancelBookingAsOps` — no `host_cancel_fee` insert on this path (confirmed absent by reading the full function), `cancelled_by='ops'` (line ~1628), `retained_space_cents=0` (line ~1618), `booking_cancelled_by_host` never emitted (only `booking_cancelled_by_ops`, confirmed at emission site) | **VERIFIED** |

**All 17 requirements have substantive, working implementation.** Two (OPS-01, OPS-03) carry a stale
`[ ]` in the requirements checklist that no longer matches their own traceability rows once the
dependent later plans (18-12, 18-08) are accounted for — a documentation-tracking gap, not a code gap.

---

## D-236 — confirmed UNRESOLVED BY DESIGN, not reported as a defect

`src/lib/payments/fees.ts:82`: `export const OPS_CANCEL_REFUNDS_SERVICE_FEE = false;` — a **literal**,
not `process.env`-backed (deliberately, per the constant's own docblock, so flipping it requires a
code change and review rather than a silent env-var edit). The single read site is
`src/lib/ops/cancel-impact.ts:96` (`opsRefundBasisCents`), which both `cancelBookingAsOps` (the money
that moves) and the console's impact preview call — so the dialog cannot promise one figure while a
different code path moves another. The conflicting host-cancel precedent
(`cancel-booking.ts:1134-1137`, refunding the booker's service fee too) is quoted in full at the read
site. `tests/payments/ops-cancel.test.ts:244-255` exercises both `true` and `false` to prove "one line
flips it" is a measured claim. Correctly left to the PM, as the task instructed.

## D-250 (SUPPORT_EMAIL) — confirmed still `null`, gate unweakened

`src/lib/site.ts:70`: `export const SUPPORT_EMAIL: string | null = null;`. Ran
`tests/design/site-contacts.test.ts` alone: **28 passed, 3 skipped** — the inversion described in
D-250/D-26 is intact (asserts zero support affordances anywhere in `src/` while the constant is null).

---

## Anti-Patterns Scan

No `TBD`/`FIXME`/`XXX` debt markers found in any of the phase's `key-files` that lack a formal
follow-up reference. Grepped the modules read above (`bookability.ts`, `staff.ts`, `re-review.ts`,
`fitout-check.ts`, `port.ts`, `payout-sweep.ts`, `payout-reconcile.ts`, `cancel-impact.ts`,
`cancel-booking.ts`, `og-facts.ts`, `public-listing.ts`) — every `⚠`/"NOT" annotation found is a
deliberate design-rationale comment (the codebase's own idiom for recording a decision), not an
unresolved TODO. `console.info`/`console.error` calls found (`re-review.ts:202`,
`payout-reconcile.ts:120,131`) are the project's shipped `[payout-alert]` operator-signal convention,
not debug scaffolding.

The one genuine, PM-accepted product gap: **title and description are not material fields** (D-231).
A host can rewrite an approved listing's entire prose and it stays `approved`/sellable/badged. This is
explicitly recorded as a known gap by the phase itself (in `re-review.ts:83-90`'s own comment, in
`REQUIREMENTS.md` § Deferred, and led as the first finding in `18-14-SUMMARY.md`'s PM checkpoint) — not
a silent omission this verification is surfacing for the first time.

---

## Gaps found that the summaries did NOT report

None at the code level. Every code-path claim in the 14 SUMMARY.md files that I independently checked
(sell-gate 7 sites, fail-closed reads, 3 leak surfaces, ENF-02 both halves, ENF-03's four assertions,
D-236 isolation, D-212 structural boolean reduction, HVER-02's mutation-proved allow-list) matched the
actual source. The one thing I found that isn't spelled out as plainly elsewhere is the **stale
REQUIREMENTS.md checkboxes** for OPS-01/OPS-03 (see table above) — a bookkeeping gap, not a functional
one; both requirements are functionally satisfied by code that has shipped since those rows were last
edited.

---

## Human Verification Required

See frontmatter `human_verification`. In short: 18-14's blocking PM checkpoint (5 items: D-236,
`SUPPORT_EMAIL`, the F11 "which due session" specificity question, the D-231 photo-reorder question,
and the KYC vendor choice) is genuinely open and is the PM's to close — none of the five is a code
defect, and the phase's own instrumentation (tests, the vendor-comparison doc, the constant's docblock)
already carries what a human needs to decide each one. Also flagged: reconciling the two stale
REQUIREMENTS.md checkboxes.

---

## Why `passed_with_concerns` rather than `passed`

Every truth I could verify against the codebase came back positive, all three gates I ran myself are
green with exact-match counts, and the two success criteria under the sharpest scrutiny in this task
(SC2's seven-site gate, SC6's grandfathered-exclusion badge) both hold under direct code inspection,
not summary trust. Nothing here is `gaps_found`-grade.

But `passed` alone would understate two real, live things a reader of this report needs to act on: (1)
a genuine, still-open PM decision checkpoint that the phase's own 18-14 plan correctly left OPEN rather
than resolving unilaterally, and (2) two stale checkboxes in the requirements ledger that will mislead
the next phase's planner if left uncorrected. Neither blocks the phase goal from being true in the
codebase today — both need a human's five minutes before this phase is fully closed out.

---

_Verified: 2026-09-01_
_Verifier: Claude (gsd-verifier)_
