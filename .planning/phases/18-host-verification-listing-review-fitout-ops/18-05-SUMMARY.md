---
phase: 18-host-verification-listing-review-fitout-ops
plan: 05
subsystem: ops-console-server
tags: [verification-port, fail-closed, review-queue, server-actions, audit, zod, taxonomy, rate-limit, mutation-testing, d-72]

# Dependency graph
requires:
  - phase: 18-host-verification-listing-review-fitout-ops
    plan: 01
    provides: "`requireStaff()` — the authenticated staff actor whose id every write here records, and the 404-not-403 refusal shape"
  - phase: 18-host-verification-listing-review-fitout-ops
    plan: 02
    provides: "`host_verification`, `listing_review`, `listing.review_state`, both pgEnums and the two OPS-04 partial indexes"
  - phase: 08-money-observability
    provides: "`recordAudit` and its deliberate swallow, `src/lib/ops/alerts.ts`'s injected-DbConn + explicit-column idioms, and the audited-denial shape"
  - phase: 07-cancellation-refunds
    provides: "`cancel-booking.ts`'s gate → rate-limit → audit-the-denial → guards-in-the-WHERE ordering and its post-flip discipline rule"
provides:
  - "`src/lib/verification/port.ts` — the ONE provider branch point, failing CLOSED, with `runVerification` as the single decision→result path (HVER-01)"
  - "`src/lib/verification/providers/manual.ts` — the ops-manual provider, guarded, and the REAL write path the host decisions go through"
  - "`loadReviewQueue(dbConn = db)` — one interleaved oldest-first array over both kinds, from the domain tables only (OPS-04, data half)"
  - "`src/lib/validation/ops.ts` — the two reject taxonomies as complete host-readable SENTENCES, `z.enum`-bound, with a `.max(280)` note (OPS-05, write half)"
  - "`approveHost` / `rejectHost` / `suspendHost` / `approveListing` / `rejectListing` — each self-gating, rate-limited on the authenticated id, flipping with guards in the WHERE, and writing an authenticated trail row on BOTH branches (OPS-03)"
  - "ENF-01's DEFAULT lever: `suspendHost` writes `status='suspended'`, which fails the sell-gate's host term through the same read as verification"
  - "an env-driven provider name, so registering a KYC vendor later is a registry row plus a config change — and a typo refuses to verify anybody"
affects: [18-07 payout freeze, 18-08 ops cancel-and-refund, 18-09 notifications, 18-10 ops components, 18-12 the /ops route, 18-13 host-facing review signals]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "a port whose fail-closed branch is a LIVE path rather than dead code, because the provider name is read from config instead of hardcoded — a deploy typo refuses to verify anybody"
    - "`Object.hasOwn` on a provider `Record`, because a bare lookup answers truthily for `constructor` / `__proto__` / `toString` and a registry that fails closed only for names somebody thought to try is not failing closed"
    - "a queue whose fixture clock is DESIGNED so a host row falls between two listing rows twice, making a two-array concatenation fail on ordering alone"
    - "update-the-open-cycle-else-insert for a history table whose `decided_at IS NULL` means 'still awaiting a decision', so one row is one submission-and-its-decision"
    - "a byte-identical round-trip assertion as the guard AGAINST a future sanitiser, paired with a structural zero-count of the one render-time escape hatch"

key-files:
  created:
    - src/lib/verification/port.ts
    - src/lib/verification/providers/manual.ts
    - src/lib/ops/review-queue.ts
    - src/lib/validation/ops.ts
    - src/app/actions/ops-review.ts
    - tests/ops/verification-port.test.ts
    - tests/ops/queue-query.test.ts
    - tests/ops/ops-audit.test.ts
    - tests/ops/reject-reason.test.ts
  modified: []

key-decisions:
  - "The queue EXCLUDES `draft` listings. D-240's backfill deliberately left them `review_state='pending'`; on the dev catalogue that is 32 rows against 19 real ones, each mid-wizard with a NULL title, NULL address, NULL capacity, NULL price and no photos. 18-UI-SPEC's evidence `<dl>` would render blanks. `unlisted` IS included, on D-240's own reasoning. Pinned by queue-query case 9, not left as an omission."
  - "`suspendHost` deliberately does NOT go through the verification port. The port answers 'did an identity check pass?'; a suspension is an enforcement decision about conduct, and writing `result:'fail'` plus a fresh `checked_at` for it would fabricate a check that never ran (T-18-0202 — the same blur D-244 refused on `cancelled_by`)."
  - "The provider name is read from `FITOUT_VERIFICATION_PROVIDER` at call time rather than hardcoded to `MANUAL_PROVIDER_NAME`. That is what makes D-206's 'registration plus a config change' literally true AND what keeps the port's fail-closed branch a live, tested path instead of dead code."
  - "MEASURED: `db.execute(sql\\`…\\`)` on postgres.js returns `timestamptz` as RAW STRINGS (`\"2026-08-31 22:52:04.821009+00\"`), and CANNOT bind a JS `Date` as a parameter (ERR_INVALID_ARG_TYPE at Bind). Both directions bit this plan; both are now handled explicitly and documented at the site. `payout-reconcile.ts:148`'s `Date | string` type was the surviving hint that nobody had had to resolve."
  - "The union's final ORDER is a JS sort and the module says so. Two heterogeneous sources cannot be merged in index order, and D-249's clock is a COALESCE over a joined column, not the indexed `listing.created_at` — so 'byte-matches the index' is true of each BRANCH and false of the union. Claiming otherwise would have been the easy sentence to write."
  - "A rejection decision UPDATES the open `listing_review` row rather than appending a second one. `decided_at IS NULL` is documented at the column as 'still awaiting a decision', so appending would double-count every cycle and — because the queue reads the LATEST `submitted_at` — silently reset the D-249 wait clock of anything that later came back to pending."
  - "No sanitiser on the rejection reason, deliberately, and the byte-identical round-trip is asserted as the guard AGAINST adding one: store-time escaping would corrupt 'classes for under <10 people' while buying nothing, because React escapes text nodes by construction and the one escape hatch occurs zero times in `src/`."

patterns-established:
  - "Read the acceptance grep's own collision surface first: THREE separate criteria in this plan were falsely RED against correct files because the prose explaining a prohibition spelled the forbidden string. Same class as 18-04's deviation 4 and drizzle/0021's rule."
  - "Mutation-prove the property, then record WHICH cases stayed GREEN — the happy-path cases are consistently blind to the defect the file exists for."

requirements-completed: [HVER-01]
requirements-advanced: [OPS-03, OPS-04, OPS-05, ENF-01]

# Metrics
duration: 41min
completed: 2026-09-01
---

# Phase 18 Plan 05: The Ops Console's Server Side Summary

**`audit.resolved_by`'s "asserted, not authenticated" ends for the console: five ops actions each call the staff gate as their own first statement, rate-limit on the authenticated identity, flip with every guard in the WHERE, and write a trail row that a test SELECTs back out of the table — beside a provider-agnostic verification port that fails closed on anything unregistered and one interleaved oldest-first queue that never touches the trail table it would otherwise silently lose rows to.**

## Performance

- **Duration:** 41 min
- **Started:** 2026-09-01T06:44Z
- **Completed:** 2026-09-01T07:25Z
- **Tasks:** 3
- **Files created/modified:** 9 (9 created, 0 modified)

## Accomplishments

- **`src/lib/verification/port.ts`** — the ONE branch point. `VerificationResult` is exactly `{ result, vendorRef, checkedAt, provider }` and the test asserts that as a **key-set equality**, so a fifth field reddens before it can reach a column. `runVerification` is the single path from a decision to a persistable result and returns `null` for anything unregistered — *there is no object for a caller to write*, which is strictly stronger than returning a failing one.
- **The fail-closed set includes the names a bare `Record` lookup answers truthily.** `constructor`, `__proto__` and `toString` are inherited `Object.prototype` members; `Object.hasOwn` is what makes the lookup fail closed for names nobody thought to try, and all three are cases in the test.
- **`src/lib/verification/providers/manual.ts`** — a real provider, guarded, and the actual write path: `approveHost` and `rejectHost` write their four columns **from the port's result**, never from a literal composed in the action. That is what makes the vendor swap a registration rather than a rewrite.
- **`loadReviewQueue`** — ONE array, both kinds, strictly oldest-first across them, with everything 18-UI-SPEC's evidence `<dl>` and gallery need selected once so the page runs no second query per row. D-249's clock is the **latest** `listing_review.submitted_at`; the test's fixture puts a five-week-old resubmitted listing **last**.
- **Five actions, one order, no exceptions.** Staff gate → parse → rate-limit → flip-with-guards-in-the-WHERE → history row → trail row. `grep -c "requireStaff()"` is **5** against **5** exported actions; `grep -c "throw "` is **0**.
- **Every OPS-03 claim in this plan is a `SELECT`.** 25 cases across two integration files, on both the allow and the deny branch of all five actions, because `recordAudit` swallows its own insert failure by design and a return value has never been evidence in this codebase.
- **Three mutation REDs watched and reverted**, each recorded below with its observed message *and* with which cases stayed green.

## Task Commits

1. **Task 1: The verification port and the ops-manual provider** — `a1533f5` (feat)
2. **Task 2: The one queue — an injectable, oldest-first, interleaved read** — `2f6d331` (feat)
3. **Task 3: The five decision actions — gate, rate-limit, flip, audit** — `43c2349` (feat)

## Files Created

- `src/lib/verification/port.ts` — **created.** Directive-free contract module. `VerificationResult`, `VerificationOutcome`, `VerificationProvider`, `resolveVerificationProvider`, `runVerification`, `isVerified`. Header carries `refund-rail.ts`'s two rules restated for this domain and the reason the guard sits on the implementation instead.
- `src/lib/verification/providers/manual.ts` — **created.** `import "server-only"`. `MANUAL_PROVIDER_NAME` is both the registry key and the persisted `provider` value, so the two cannot drift. `vendorRef` is always `null` and the header says why a synthetic id would be a lie in a compliance column.
- `src/lib/ops/review-queue.ts` — **created.** `loadReviewQueue(dbConn: DbConn = db)`. Two explicit-column statements, a JS interleave with an id tie-break, and a `toDate` normaliser carrying the measurement below.
- `src/lib/validation/ops.ts` — **created.** `LISTING_REJECT_REASONS` (6) and `HOST_REJECT_REASONS` (4) transcribed verbatim from 18-UI-SPEC, `OTHER_REASON`, `REJECT_NOTE_MAX = 280`, five schemas, `composeReason`.
- `src/app/actions/ops-review.ts` — **created.** The five actions plus two non-exported helpers.
- `tests/ops/verification-port.test.ts` — **created.** 15 cases (unit, no database).
- `tests/ops/queue-query.test.ts` — **created.** 9 cases (integration, isolated schema).
- `tests/ops/ops-audit.test.ts` — **created.** 14 cases (integration, real Better Auth session).
- `tests/ops/reject-reason.test.ts` — **created.** 11 cases (integration).

## Decisions Made

### The port's contract, exactly as shipped

```ts
export type VerificationResult = {
  result: VerificationOutcome | null;   // "pass" | "fail" | null
  vendorRef: string | null;
  checkedAt: Date | null;
  provider: string;
};
export function resolveVerificationProvider(name: string | null | undefined): VerificationProvider | null;
export function runVerification(providerName: string | null | undefined, decision: VerificationDecision): VerificationResult | null;
export function isVerified(result: VerificationResult | null | undefined): boolean;
```

Four fields, asserted as a **key-set equality** rather than a membership check — the `verification-schema.test.ts` allow-list reasoning applied one layer up, and for its stated reason: a deny-list naming `document`/`idNumber`/`image` passes cheerfully the day somebody picks a fourth word.

`VerificationOutcome` is deliberately **not** the `host_verification.status` enum. `status` is FitOut's lifecycle; this is the check's own verdict. Collapsing them would make a vendor's `fail` indistinguishable from an operator's suspension — the blur D-244 refused when it declined to reuse `'system'` for an ops cancellation.

### The two taxonomies, as shipped

**Listing (6):**
1. The photos don't show the space being listed.
2. The address or location doesn't match the space.
3. The space type, capacity or price is wrong or misleading.
4. We couldn't confirm this space is real.
5. This listing breaks FitOut's terms.
6. Something else (explain below).

**Host (4)** — also the suspension taxonomy (D-243):
1. We couldn't confirm who this account belongs to.
2. The account details don't match the space being listed.
3. This account breaks FitOut's terms.
4. Something else (explain below).

Complete host-readable sentences, `z.enum`-bound, stored as the **sentence** and never an id to join at read time. `Something else` makes the `.max(280)` note **required** — empty and whitespace-only are both calm denials, because the one member that says nothing on its own must not ship a rejection whose entire explanation is a space character.

`reject-reason.test.ts` case 3 asserts over the **whole** taxonomy that no sentence contains "appeal", "contact us" or an `@` — appeals are backlog 999.6 and OUT (D-243), and `SUPPORT_EMAIL` is null (D-250), so the copy must stand without either.

### The rate-limit budget, and why it is not 5/60s

`OPS_ACTION_RATE_LIMIT = { window: 60, max: 30 }`, keyed `ops-<verb>:${staff.id}`.

The capability budget is 5/60s because activating hosting is something one account does once. Clearing a review queue is the opposite: approval is **one press** by design (18-UI-SPEC § The decision controls), and an operator working a morning's backlog can legitimately fire a dozen in a minute. A 5/60s budget refuses a reviewer doing their job, and **a rate limit that fires on correct use is one an operator learns to work around** — which costs more than it buys. 30/60s is a decision every two seconds sustained: far above human review speed for a listing whose photos and address must actually be read, far below what a scripted flood needs. **Per verb**, so a morning of approvals never eats the budget for the suspension that matters.

### The ordering proof — the staff gate before the rate limit, in all five

Verified by reading the file; the line numbers are contiguous and there is nothing between them but the parse:

| Action | gate | rate-limit |
|---|---|---|
| `approveHost` | 231 | 244 |
| `rejectHost` | 309 | 322 |
| `suspendHost` | 412 | 425 |
| `approveListing` | 492 | 505 |
| `rejectListing` | 557 | 570 |

`ops-audit.test.ts` case 11 measures the consequence rather than the ordering: after five refused calls by a signed-in non-staff account, `rateLimitCalls` has **length 0** — the refusal consumed nobody's budget, which is only true if the gate ran first.

### D-72 — what `audit.meta` carries, and what it never carries

`{ userId | listingId, reasonSentence, hasNote }`. The taxonomy sentence is an enum value over a closed set and may be recorded; the operator's **free text may not**, because it can contain anything they typed about a person and `meta` is a durable jsonb column under an explicit no-secrets/no-PII rule. Case 8 seeds a note shaped like the PII the rule exists for (`"Spoke to Maria Santos on 0917 555 0110; the address is her home."`), serialises the **whole row**, and asserts absence — then asserts the note IS still readable in `host_verification.reason`, so the case cannot pass against an implementation that simply threw the explanation away.

### Why `suspendHost` does not touch the port

The port answers *"did an identity check pass?"*. A suspension is an **enforcement** decision about conduct. Writing `result: 'fail'` and a fresh `checked_at` for it would fabricate a check that never ran — T-18-0202's principle, and the same distinction D-244 drew when it refused to reuse `'system'` for an ops cancellation. `provider`, `result` and `checked_at` are left exactly as the last real check left them; only `status`, `reason` and `decided_by_staff_id` move.

## The three mutation REDs

### 1. The port fails OPEN on an unregistered name

`resolveVerificationProvider` returning the manual adapter for anything unknown:

```
× resolves NO provider for an unknown vendor nobody registered
× resolves NO provider for a near-miss misspelling of the real one
× resolves NO provider for the empty string
× resolves NO provider for undefined
× resolves NO provider for null
× resolves NO provider for the prototype key `constructor`
× resolves NO provider for the prototype key `__proto__`
× resolves NO provider for the prototype key `toString`
× case 11 — THE FAIL-CLOSED PROOF: no unregistered name yields a verified outcome, by any path
AssertionError: expected { name: 'manual', …(1) } to be null
      Tests  9 failed | 6 passed (15)
```

**The six that stayed green are cases 7-10 and 12-13** — every case about the manual provider's own behaviour and the storage contract. The happy path is structurally blind to a fail-open registry, which is why the fail-closed cases are written first. Reverted; 15/15.

### 2. The D-249 wait clock reads the listing's original `created_at`

The plausible simplification — drop the lateral join and read `l.created_at`:

```
× case 3 — THE INTERLEAVE: strictly oldest-first ACROSS kinds, not grouped by kind
  AssertionError: expected [ 'q_listing_r', 'q_listing_a', …(4) ] to deeply equal [ 'q_listing_a', 'q_host_1', …(4) ]
× case 4 — D-249: a RESUBMISSION sorts by its LATEST submission, never its first
  AssertionError: expected 1782907200000 to be 1786017600000
      Tests  2 failed | 7 passed (9)
```

The resubmitted listing jumps from **last** to **first** — the exact line-jumping D-249 forbids, and it is visible only because the fixture gave it an old `created_at` and a new submission. Reverted; 9/9.

### 3. The staff gate removed from one action

`approveHost` taking `(await readStaff()) ?? { id: "anonymous" }` instead of the gate — the shape a "let's not 404 the operator" refactor would produce:

```
× case 11 — the civilian is refused, nothing moves, and no trail row appears
  AssertionError: promise resolved "{ ok: true }" instead of rejecting
      Tests  1 failed | 13 passed (14)
```

**Thirteen cases stayed green, including `approveHost`'s own allow branch, its deny branch, its rate-limit branch and its fail-closed-provider branch.** A signed-in non-staff account could approve a host and every per-action assertion in the file would still pass. Reverted; 14/14.

### 4 (bonus). The free-text note leaked into `audit.meta`

Adding `note: parsed.data.note` to `rejectHost`'s ok-branch meta:

```
× case 8 — meta carries the taxonomy sentence and a flag, and NEVER the note
  AssertionError: expected '{"id":"bbd55558-fd92-4e28-abb5-2ec81c…' not to contain 'Maria Santos'
      Tests  1 failed | 10 passed (11)
```

Reverted; 11/11.

## Deviations from Plan

### 1. [Rule 2 — Missing critical functionality] The queue excludes `draft` listings

- **Found during:** Task 2, writing the fixture.
- **Issue:** The plan scopes the listing branch to `review_state = 'pending'` and says nothing about `listing.status`. But D-240's backfill deliberately left **every draft** at `pending` — 32 rows in the dev catalogue against 19 real ones — and a draft is not *submitted*: `title`, `addressLine1`, `city`, `primarySpaceType`, `maxOccupancy` and the price fields are all nullable and routinely NULL mid-wizard, with no photos. 18-UI-SPEC's evidence `<dl>` would render a column of blanks under an empty gallery, and an operator would be asked to decide whether a space is real from nothing at all.
- **Fix:** `LISTING_QUEUE_PREDICATE` is `review_state = 'pending' AND deleted_at IS NULL AND status <> 'draft'`, declared once and reused **byte-identically** by the listing branch and by the host branch's `listingsWaiting` count, so the two can never disagree about what "waiting" means. `unlisted` is INCLUDED, on D-240's own reasoning (*"if a host brings it back, FitOut checks it"* — reviewing it while it is down means the check is already done when they relist).
- **Files modified:** `src/lib/ops/review-queue.ts`, `tests/ops/queue-query.test.ts`
- **Verification:** queue-query case 9 asserts `unlisted` IS in the queue, `draft` is NOT, and that `listingsWaiting` counts exactly the members.
- **Committed in:** `2f6d331`

### 2. [Rule 1 — Bug] A JS `Date` cannot be bound through a raw `db.execute`

- **Found during:** Task 3, first run of `ops-audit.test.ts` — 7 of 14 cases red with one cause.
- **Issue:** `checked_at = ${check.checkedAt}` answered `TypeError: The "string" argument must be of type string or an instance of Buffer or ArrayBuffer. Received an instance of Date` at postgres.js's Bind step, *even though the driver had resolved the placeholder's type as 1184 (timestamptz)*. Drizzle's query BUILDER maps Dates because the column type tells it to; a raw statement has no column type to consult.
- **Fix:** bound as `${check.checkedAt?.toISOString() ?? null}::timestamptz`, with the measurement written at the site.
- **Files modified:** `src/app/actions/ops-review.ts`
- **Committed in:** `43c2349`

### 3. [Rule 1 — Bug] `db.execute` returns `timestamptz` as raw strings

- **Found during:** Task 2, first run of `queue-query.test.ts` — `a.submittedAt.getTime is not a function`.
- **Issue:** the same boundary in the other direction. Probed directly: `SELECT now()` through `db.execute` answers `"2026-08-31 22:52:04.821009+00"` with `typeof === "string"`. `src/inngest/functions/payout-reconcile.ts:148` types its own `createdAt` as `Date | string` — it only ever logs the value, so it never had to resolve the ambiguity. This module **sorts** on the value.
- **Fix:** a `toDate` normaliser. The Postgres wire form is not strict ISO 8601 (a space instead of `T`, a two-digit offset with no minutes) and V8 parses it only through its **lenient non-standard path** — exactly the dependency that breaks on a runtime upgrade with nothing to catch it. So the value is normalised to strict ISO first, with the lenient parse kept only as a fallback, and a `Date` input passes straight through so the day the driver starts parsing them nothing changes.
- **Files modified:** `src/lib/ops/review-queue.ts`
- **Committed in:** `2f6d331`

### 4. [Rule 3 — Blocking] THREE acceptance greps were falsely RED against the correct files

- **Found during:** Tasks 1, 2 and 3.
- **Issue:** the plan's own criteria are `grep -c 'import "server-only"' src/lib/verification/port.ts == 0`, `grep -c "audit" src/lib/ops/review-queue.ts == 0`, and `grep -c "dangerouslySetInnerHTML" src/ -r` unchanged from 0. All three were **1** — every one because the prose *explaining the prohibition* spelled the forbidden string. This is the same class as 18-04's deviation 4 and is the collision `tests/design/server-only-guards.test.ts:140-150` records as this repo's **default outcome rather than an edge case** (twelve occurrences).
- **Fix:** each paragraph reworded to describe the thing without naming it — `src/lib/validation/cancellation.ts:16-19`'s shipped rule (*"a grep is only a real guard if the very comment forbidding a string cannot trip it"*) — with a note at each site saying **why** the literal is absent, so a later reader does not "restore clarity" and silently re-break the gate. The structural versions are stronger than the greps and were written first: `verification-port.test.ts` case 13 reads **comment-stripped** source for the directive, and `reject-reason.test.ts` case 10 sweeps all 360 files under `src/` comment-stripped for the escape hatch.
- **Files modified:** `src/lib/verification/port.ts`, `src/lib/ops/review-queue.ts`, `src/lib/validation/ops.ts`
- **Committed in:** `a1533f5`, `2f6d331`, `43c2349`

### 5. [Rule 2 — Missing critical functionality] `Object.hasOwn` on the provider registry

- **Found during:** Task 1.
- **Issue:** the plan specifies the mapping "through a `Record`". A bare `PROVIDERS[name]` on an object literal answers **truthily** for `constructor`, `toString`, `valueOf` and `__proto__` — inherited `Object.prototype` members — so a caller-influenced provider name could resolve to a function that is not a provider at all. That is a fail-OPEN in the one function whose entire job is to fail closed.
- **Fix:** an own-property check before the lookup, plus three prototype-key cases in the fail-closed sweep. The `Record` shape the plan asked for is unchanged.
- **Files modified:** `src/lib/verification/port.ts`, `tests/ops/verification-port.test.ts`
- **Committed in:** `a1533f5`

### 6. [Rule 2] `FITOUT_VERIFICATION_PROVIDER` instead of a hardcoded provider name

- **Found during:** Task 3.
- **Issue:** hardcoding `MANUAL_PROVIDER_NAME` at the call site would have made the port's fail-closed branch **dead code** — unreachable in production, so untested in any meaningful sense, and D-206's "plus a config change" would have been a claim with no mechanism behind it.
- **Fix:** read at call time from the environment, defaulting to `manual`. The realistic failure it now defends is a deploy environment carrying a vendor name nobody registered: `ops-audit.test.ts` case 13 sets it to `acme-kyc`, watches the host stay `pending`, reads the `provider_unregistered` denial back out of the table, and then clears it as a control so the case cannot pass against an `approveHost` that never approves anybody.
- **Files modified:** `src/app/actions/ops-review.ts`
- **Committed in:** `43c2349`

### 7. [Rule 1 — Plan refinement] The listing decision UPDATES the open review row rather than appending

- **Found during:** Task 3.
- **Issue:** the plan says "write the domain history row … a `listing_review` row for a listing decision". Taken as *append*, that double-counts every cycle — and because the queue's D-249 clock reads the **latest** `submitted_at`, a decision row minted at `now()` would silently reset the wait clock of any listing that later came back to `pending`.
- **Fix:** `closeReviewCycle` updates the newest row with `decided_at IS NULL` — which `schema.ts` documents at the column as *"NULL = still awaiting a decision"*, i.e. one row IS one submission-and-its-decision. If there is no open row (a grandfathered listing pulled into review before any history existed) it inserts one with `submitted_at = listing.created_at`, **byte-identical to the queue's own COALESCE fallback**, so the record agrees with what the queue said it was waiting from. Every literal in both statements is explicitly cast, per drizzle/0026's 42804 measurement.
- **Files modified:** `src/app/actions/ops-review.ts`
- **Verification:** `ops-audit.test.ts` case 4 asserts ONE history row after an approval, decided in place, with the original `submitted_at` preserved; case 5 asserts the insert fallback.
- **Committed in:** `43c2349`

---

**Total deviations:** 7 auto-fixed (2 × Rule 1 bug, 3 × Rule 2, 1 × Rule 3, 1 × Rule 1 refinement). None required a decision.
**Impact on plan:** No scope creep. Nothing was added beyond the plan's file list. Deviations 2, 3 and 7 are the plan's instructions corrected against what Postgres and the driver actually do; 1, 5 and 6 close fail-open gaps the plan's own threat register asked for (T-18-0506); 4 is the plan's acceptance criteria corrected against its own prose.

## Issues Encountered

- **A backtick inside a SQL comment terminates the `sql` template literal.** `-- The row's \`meta\` line` produced `[PARSE_ERROR] Expected \`,\` or \`)\` but found \`meta\`` pointing at a line ten rows below the opening backtick. Worth knowing before writing prose inside a tagged template: no backticks in SQL comments, ever.
- **`json_agg` over an empty set is `NULL`, not `'[]'`.** A listing with no photos yet is a real state a reviewer should see as such, so the mapper coalesces to `[]` rather than letting a null reach the row component.

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `npx vitest run` on the four new files | **49 passed (4 files)** |
| `npm test` (run ALONE) | **199 files / 2340 passed / 5 skipped** — baseline 195 / 2291 / 5, i.e. **+4 files and +49 tests, exactly this plan's own, zero regressions** |
| `npm run test:design` (run ALONE) | **72 files / 1304 passed / 3 skipped** — byte-identical to baseline; this plan moves no design gate, which is correct because it ships no UI |
| `npm run build` | **exit 0** (`lint` 0 errors / 25 pre-existing warnings · design suite 72/72 · `Compiled successfully in 20.8s`) |
| `npx eslint` on all 9 new files | **exit 0, no warnings** |
| `git status --porcelain 'src/app/(ops)' src/components/ops` | **empty** — neither directory exists. The route is 18-12's, the components 18-10's |
| `grep -c "requireStaff()" src/app/actions/ops-review.ts` | **5**, against 5 exported actions |
| `grep -c "actorId: staff.id" src/app/actions/ops-review.ts` | **24** |
| `grep -c "throw " src/app/actions/ops-review.ts` | **0** |
| `grep -c "audit" src/lib/ops/review-queue.ts` | **0** |
| `grep -c "\.select()" src/lib/ops/review-queue.ts` | **0** |
| `grep -rn "provider ===" src/ --include=*.ts` (excluding the port) | **0** — the mapping is inlined nowhere |
| `grep -rn "dangerouslySetInnerHTML" src/` | **0**, unchanged |
| `grep -c 'import "server-only"' …/providers/manual.ts` / `…/port.ts` | **1** / **0** |
| `server-only` in `package.json` dependencies | **absent** — nothing was installed |
| `[test-db] LEAKED WRITES` | `notify` ×1, `guest-email` ×1 — **pre-existing**, unchanged |

The three pre-existing red e2e specs (`cancel.spec.ts:232`, `calendar-hit-area.spec.ts` ×4, `price-parity.spec.ts:287`) were **not** run and are **not** this plan's; they are diagnosed in `deferred-items.md`. No surface this plan touches has an e2e spec — it ships no route and no component.

## Requirements

| ID | Status | Why |
|---|---|---|
| **HVER-01** | **Complete** | The port exists, is the only branch point, fails closed (mutation-proved), and the ops-manual provider is the real write path through it. Registering a vendor is a registry row + `FITOUT_VERIFICATION_PROVIDER`. |
| OPS-03 | Advanced | All five console actions record an authenticated `actorId`, read back from the table. **18-08 adds a sixth ops action** (cancel-and-refund); "every ops action" closes there. |
| OPS-04 | Advanced | The DATA half — one interleaved oldest-first queue carrying everything a reviewer needs. "On the same screen" is 18-12's page and 18-10's row. |
| OPS-05 | Advanced | The WRITE half — a taxonomy-constrained, length-bounded reason stored as the sentence the host reads. **Told** needs the notification (D-245, 18-09) and the host surface (D-230, 18-13). |
| ENF-01 | Advanced | The DEFAULT lever ships: `suspendHost` writes `status='suspended'`, which fails the sell-gate's host term through the same read as verification. The payout freeze is 18-07; the cancel-and-refund escalation is 18-08. |

## What the next plan should know

- **`scripts/ops-alerts.ts`'s `resolved_by` is STILL asserted, and that is deliberate.** 18-CONTEXT § Deferred puts retiring the CLI's handle out of scope. What this plan changed is the **console** — the surface that will carry the volume. Anyone reading `audit.resolved_by`'s schema note should now read it as *"asserted for the CLI, authenticated for the console"*, and 18-14's status-line audit is the right place to record that split.
- **18-06 owns creating the `pending` rows this queue reads.** Nothing in this plan opens a submission: `approveHost` / `rejectHost` guard on `status IN ('pending','unverified')` and a host with **no** `host_verification` row cannot be decided here at all. The material-edit flip must also **append a `listing_review` row with `submitted_at = now()`** — the queue reads the latest one, and D-249's whole guarantee rests on that row existing.
- **18-12 must add `revalidatePath('/ops')`** after each action, or a decision will not clear the row from a cached queue. It is deliberately absent here because the route does not exist yet.
- **The queue's row types are the page's contract.** `OpsQueueItem` is a discriminated union on `kind`; 18-10's row component should branch on the discriminant with a total `Record`, so a third kind fails to compile rather than raising in front of an operator.
- **`FITOUT_VERIFICATION_PROVIDER` is unset everywhere and should stay that way** until a vendor is registered in the port. It is not in `.env` and needs no entry — an unset value resolves to `manual`, which is the shipping provider.
- **`e2e/` still does not run in CI (D-24).** This plan added no e2e-visible surface, but 18-10/18-12 will, and the axe/overflow rows the UI spec's gate ledger names need a **staff-session helper** that does not exist yet.

## Self-Check: PASSED

All nine created files exist on disk; all three task commits (`a1533f5`, `2f6d331`, `43c2349`) exist in
`git log --all`. `src/app/(ops)` and `src/components/ops` do not exist, as required.
