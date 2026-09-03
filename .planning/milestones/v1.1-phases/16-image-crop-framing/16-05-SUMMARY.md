---
phase: 16-image-crop-framing
plan: 05
subsystem: security
tags: [provenance, cloudinary, url-parsing, fail-closed, idor, path-traversal, pure-function, D-165]

# Dependency graph
requires:
  - phase: 04-listing-creation
    provides: "`src/app/actions/listing-photo.ts` — `persistPhoto`, its security-contract header (SESSION / OWNERSHIP / ORPHAN CLEANUP), the `PersistPhotoResult` shape and the shipped rejection literal the new branch reuses"
  - phase: 10-design-system
    provides: "`src/lib/safe-callback-url.ts` + `tests/security/safe-callback-url.test.ts` — the parse-and-compare-rather-than-prefix-match lesson, the pure `(untrusted, trusted-context)` signature, and the two-describe spec shape this validator and its spec copy"
provides:
  - "`src/lib/listing/cloudinary-provenance.ts` — `isOwnCloudinaryAsset({ url, publicId, listingId, cloudName })`, a directive-free pure boolean guard that reads no ambient configuration"
  - "`tests/listing/cloudinary-provenance.test.ts` — 20 cases: the attacker set, the legitimate set, the absent-cloud-name case, and two SOURCE assertions that the ambient read and substring matching cannot grow back"
  - "`persistPhoto` provenance enforcement — a host can no longer attach an arbitrary third-party URL to a PUBLIC listing page by calling the action directly"
  - "MEASURED: the live Cloudinary account (`da8uglpk6`, created 2026-06-03) is in `folder_mode: \"dynamic\"` — §C9's prefix premise is now OBSERVED, not documented-only"
  - "`tests/listing/photos.test.ts` — all twelve fixtures rebuilt from the test's own `listingId`, plus three guard cases that assert the photo COUNT is unchanged"
affects: [16-06 the cover-frame preview on photo-uploader.tsx, 16.1 upload hardening — the sign allow-list and format/size gates it must not widen]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "pure-guard-with-injected-trusted-context: the security-relevant configuration (`cloudName`) is a PARAMETER, the caller resolves it once, and the guard fails closed when it is absent — so the check is alive in CI where the credential does not exist"
    - "source-assertion-as-a-design-lock: the spec reads the module's own text and asserts `process.env` and `includes(` appear nowhere in it, so the CI-fail-open shape and the substring-match shape cannot return through a later refactor"
    - "order the character-level rejections BEFORE the prefix test, so each is reachable on its own rather than shadowed by a broader check that would make it vacuous"
    - "a rejection test must assert the WRITE did not happen (photo COUNT unchanged), not only that the result was falsy — the weaker assertion is satisfied by a guard that returns `{ ok: false }` and inserts anyway"

key-files:
  created:
    - src/lib/listing/cloudinary-provenance.ts
    - tests/listing/cloudinary-provenance.test.ts
  modified:
    - src/app/actions/listing-photo.ts
    - tests/listing/photos.test.ts

key-decisions:
  - "`folder_mode` was MEASURED, not assumed. `GET /v1_1/da8uglpk6/config?settings=true` returned HTTP 200 and `{\"settings\":{\"folder_mode\":\"dynamic\"}}`. Under dynamic mode the legacy `folder` parameter sets both `asset_folder` and `public_id_prefix`, so `publicId.startsWith(\"fitout/listings/<listingId>/\")` holds — §C9's MEDIUM-HIGH conclusion is now HIGH and observed."
  - "The validator uses anchored regex (`/\\.\\./`, `/^\\//`, `/\\\\/`, `/:/`) for the public-id rejections rather than substring searches, so the file contains ZERO occurrences of `includes(`. That was not cosmetic compliance with the plan's grep — it makes the spec able to assert, over the source, that the shape which admits both the suffix host and the query-string host appears nowhere in the module."
  - "The query-string vector (`https://evil.tld/?x=https://res.cloudinary.com/...`) is caught by the PATHNAME check, not the hostname check — measured, and recorded below rather than glossed. A third vector was added to close the gap the plan's acceptance criterion implied: a foreign host wearing our exact path plus a decoy query, which ONLY the hostname comparison can reject."
  - "The `image/upload/` path prefix does more work than the plan's prose credits it with: it also rejects `/raw/upload/` (where an SVG or an html file would live) and `/image/fetch/<remote-url>`, which proxies an arbitrary remote address through OUR cloud name and would otherwise satisfy every other check. Both are named cases in the spec."
  - "`listingId` empty/blank is a fail-closed case too, added beyond the plan's list. Without it the folder prefix degenerates to `fitout/listings//`, which every `fitout/listings/...` id satisfies — a guard-shaped thing that is not a guard."
  - "The validator does NOT require the url's path to contain the `publicId`, and the header says so. Both are independently scoped to us; the residual (one of our own listing assets referenced from another of our own listings) is a mix-up inside our own Cloudinary account, not a foreign-content vector. Recorded as an accepted residual rather than silently closed — scope creep is how a security fix becomes unshippable."
  - "The absent-cloud-name integration case asserts BOTH halves: the write is refused while the variable is deleted, AND the identical call succeeds once it is restored. Without the second half the test could be passing because the fixture was wrong."

patterns-established:
  - "When a plan's acceptance criterion predicts which cases a mutation will turn red, run the mutation and transcribe what ACTUALLY went red. Here one of the two predicted cases stayed green for a legitimate structural reason, and the honest finding produced a third, sharper attack case that the prediction was reaching for."
  - "Two mutations beat one. Removing the hostname check alone leaves vectors that a second check happens to catch; removing both shows which check owns which vector, which is the information a reviewer actually needs."
  - "A fixture that could not have been produced by the real pipeline was never testing the real pipeline. All twelve here were of that kind, and the rewrite is the valuable half of the change, not the tax on it."

requirements-completed: []
requirements-advanced: [CROP-02]

# Metrics
duration: 20min
completed: 2026-08-25
---

# Phase 16 Plan 05: `persistPhoto` provenance validation — Summary

**A host can no longer attach an arbitrary third-party URL to their PUBLIC listing page: `persistPhoto` now parses the url and compares its host with `===` against our own Cloudinary delivery origin, scopes the `publicId` to `fitout/listings/<listingId>/` with explicit traversal / leading-slash / backslash / scheme rejections, and FAILS CLOSED when the cloud name is unconfigured — which is the state every CI run is in, and the reason the guard takes `cloudName` as an argument instead of reading it.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-25T16:05+08:00
- **Completed:** 2026-08-25T16:25+08:00
- **Tasks:** 3/3
- **Commits:** 2 (+ this one; Task 1 is a measurement and writes no file by design)

## What was built

| Commit | Task | What landed |
|---|---|---|
| — | 1 | Live Cloudinary Admin API measurement — no file, result recorded below |
| `9335b11` | 2 | `src/lib/listing/cloudinary-provenance.ts` (142 lines) + `tests/listing/cloudinary-provenance.test.ts` (20 cases) |
| `86520dc` | 3 | `persistPhoto` wiring + fail-closed branch + header rule; twelve fixtures rebuilt; three guard cases added |

---

## Task 1 — the folder-mode measurement (the prefix assertion's premise)

**The call:** `GET https://api.cloudinary.com/v1_1/<cloud_name>/config?settings=true`, basic auth from `.env.local`.
**Result:** **HTTP 200.** The credentials in `.env.local` are REAL, despite that file's own line-5 comment calling them *"Public-safe dummy Cloudinary values"* — the comment is stale and is worth correcting the next time that file is touched (it was written in Phase 3; the account was created 2026-06-03).

Response, verbatim apart from ordering (no secret is present in it, and none was written anywhere):

```json
{
  "cloud_name": "da8uglpk6",
  "created_at": "2026-06-03T07:27:27Z",
  "id": "e1caca17ee9738f96427cd89eeed1f",
  "settings": { "folder_mode": "dynamic" }
}
```

**`folder_mode` value returned, verbatim: `dynamic`.**

That is the second of §C9's two documented branches, and it is the expected one — Cloudinary made dynamic mode the default for every account created after 4 June 2024, and this account was created 2026-06-03. In dynamic mode the legacy `folder` upload parameter is the equivalent of setting both `asset_folder` and `public_id_prefix` to the same value, so an upload with `folder: "fitout/listings/<listingId>"` produces a `public_id` beginning `fitout/listings/<listingId>/`.

**Confirmation, in one sentence as the plan asked:** `publicId.startsWith("fitout/listings/<listingId>/")` **holds under the observed `dynamic` folder mode**, so the prefix assertion is pinned on an observation rather than on documentation, and §C9's confidence moves from MEDIUM-HIGH to HIGH.

Task-1 acceptance, checked: `git diff --exit-code src/app/api/cloudinary/sign/route.ts .env.example` → exit 0; `ls drizzle/*.sql | tail -1` → `drizzle/0025_audit_resolved_by.sql`; `git status --porcelain` showed no new or modified file from this task; nothing was written to the repo; no secret appears in this SUMMARY, in any commit message, or in any file. The response body was fetched to the session scratchpad and deleted.

---

## Task 2 — the validator, and the watched red

### The two watched reds (transcribed, not summarised)

**Mutation 1 — the `hostname === "res.cloudinary.com"` line commented out.** The plan predicted the suffix-host and query-string cases would fail. **Two cases went red, and one of them was not the predicted one:**

```
 × rejects a SUFFIX host — `res.cloudinary.com.evil.tld` 9ms
 × rejects a foreign host wearing our exact PATH plus a decoy query 1ms

 FAIL  tests/listing/cloudinary-provenance.test.ts > D-165 — the guard rejects everything the real
 pipeline could not have produced > rejects a SUFFIX host — `res.cloudinary.com.evil.tld`
 AssertionError: expected true to be false // Object.is equality

 - Expected
 + Received

 - false
 + true

  ❯ tests/listing/cloudinary-provenance.test.ts:56:36

 Test Files  1 failed (1)
      Tests  2 failed | 18 passed (20)
```

**The honest finding.** The plan's named query-string vector — `https://evil.tld/?x=https://res.cloudinary.com/testcloud/image/upload/` — **stayed green under mutation 1**, because its pathname is `/` and the `/<cloudName>/image/upload/` prefix check rejects it independently of the host. So that case, as specified, does not exercise the hostname comparison. Rather than leave the prediction unmet or contort the fixture, a **third vector** was added that the prediction was reaching for: `https://evil.tld/testcloud/image/upload/v1734/fitout/listings/L1/one.jpg?x=https://res.cloudinary.com/` — right protocol, right path prefix, decoy query, foreign host — for which the hostname comparison is the only guard standing. That is the second red above.

**Mutation 2 — hostname AND pathname checks both removed,** run to show which check owns which vector:

```
 × rejects a SUFFIX host — `res.cloudinary.com.evil.tld` 8ms
 × rejects a foreign host carrying our host in the QUERY STRING 1ms
 × rejects a foreign host wearing our exact PATH plus a decoy query 1ms
 × rejects a URL under a DIFFERENT cloud name — another tenant on the same host 1ms
 × rejects a URL on our host that is not an image DELIVERY url 1ms

 Test Files  1 failed (1)
      Tests  5 failed | 15 passed (20)
```

Both lines were restored and the spec returned to **20 passed (20)**.

### Task-2 acceptance, checked

| Criterion | Result |
|---|---|
| Every `<behavior>` row has a named case and passes | 20 cases, all green |
| `grep -c "process.env" src/lib/listing/cloudinary-provenance.ts` | **0** — and the spec asserts the same over the file's source |
| `grep -c "includes(" src/lib/listing/cloudinary-provenance.ts` | **0** — host is `===`, public-id rejections are anchored regex |
| Watched red first | Two mutations, transcribed above |
| `npx tsc --noEmit` | exit 0 |
| `npx eslint` on both files | clean |

The spec's own RED was watched before the module existed: `Error: Cannot find package '@/lib/listing/cloudinary-provenance'` — 1 failed suite, no tests collected.

---

## Task 3 — wiring, fail-closed, and the twelve fixtures

### The watched red (after (a), before (b)) — all five tests, covering all twelve call sites

```
 × persisting a photo stores { public_id, url, position } against the owning listing 314ms
 × the first photo is the cover (position 0); subsequent photos append in order 202ms
 × reorder rewrites positions atomically in one transaction (no unique-index collision mid-swap) 207ms
 × reorder is ownership-scoped — a non-owner cannot reorder another host's photos (IDOR) 510ms
 × removing a photo deletes its row, re-packs positions, and destroys the Cloudinary asset (orphan cleanup) 274ms

 Test Files  1 failed (1)
      Tests  5 failed (5)
```

The plan asked for "twelve call sites' worth". That is what this is: the twelve `persistPhoto` calls are distributed across exactly these five tests (1 + 3 + 3 + 2 + 3), and **every one of the five went red**, including the `:88-90` case that looks legitimate:

```
 FAIL  tests/listing/photos.test.ts > … > persisting a photo stores { public_id, url, position }
 AssertionError: expected false to be true // Object.is equality

  ❯ tests/listing/photos.test.ts:92:20
      90|       url: "https://res.cloudinary.com/mock/one.jpg",
      91|     });
      92|     expect(res.ok).toBe(true);
```

Its `publicId` had the right shape but named listing `abc` rather than the real `randomUUID()`, and its url is `res.cloudinary.com/mock/one.jpg` — no `/image/upload/`, and `mock` is not the cloud name. Both halves wrong, exactly as `16-PATTERNS.md` § M12 predicted.

### What replaced them

A local `upload(listingId, name)` helper returns the pair the real pipeline produces —
`publicId: fitout/listings/<listingId>/<name>` (no extension) and
`url: https://res.cloudinary.com/<cloud>/image/upload/v1755102030/fitout/listings/<listingId>/<name>.jpg` —
built from the test's own `randomUUID()` listing id. The suite sets `CLOUDINARY_CLOUD_NAME` to a fixed
`fitout-test-cloud` in `beforeAll` and restores the prior value in `afterAll`, so it no longer depends on
`.env.local` existing (it does here; it does not in CI).

### The fail-closed branch

`persistPhoto` resolves `process.env.CLOUDINARY_CLOUD_NAME` **once**, `console.warn`s the missing configuration by name when it is absent, and passes it to the validator — which returns `false`, so the action rejects. There is no skip path and no early `return { ok: true }`, and the comment beside it says so and says why.

### Task-3 acceptance, checked

| Criterion | Result |
|---|---|
| `npx vitest run tests/listing/photos.test.ts` after (b)+(c) | exit 0 |
| `grep -c '"p0"\|"u0"\|"abc"' tests/listing/photos.test.ts` | **0** |
| `grep -c "That photo didn't upload. Please try again." src/app/actions/listing-photo.ts` | **2** (non-empty branch + provenance branch) |
| Same literal in `cloudinary-provenance.ts` | **0** |
| `grep -c "delete process.env.CLOUDINARY_CLOUD_NAME" tests/listing/photos.test.ts` | **2** (the R1 case + the `afterAll` restore) |
| Three rejection cases assert photo COUNT unchanged | Yes — each seeds one legitimate photo first, so "no row written" is a change the count can show |
| `git diff --exit-code src/app/api/cloudinary/sign/route.ts src/components/listing/photo-uploader.tsx` | exit 0 |
| `ls drizzle/*.sql \| tail -1` | `drizzle/0025_audit_resolved_by.sql` |

---

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx vitest run tests/listing/ tests/use-server-exports.test.ts` | **22 files, 229 passed** |
| `npx vitest run tests/listing/cloudinary-provenance.test.ts` | 20 passed |
| `npm run test:design` (run ALONE) | **58 files, 1126 passed, 3 skipped** — byte-identical to the post-16-04 baseline; no design gate moved |
| `npx eslint` on all four changed files | clean |
| `git diff --exit-code src/app/api/cloudinary/sign/route.ts src/components/listing/photo-uploader.tsx` | exit 0 |
| `ls drizzle/*.sql \| tail -1` | `drizzle/0025_audit_resolved_by.sql` (GATE-06 holds) |
| `grep -c "process.env" src/lib/listing/cloudinary-provenance.ts` | 0 |
| `package.json` diff | empty — no dependency added |

## Threat register disposition

| Threat ID | Disposition | Where it landed |
|---|---|---|
| T-16-14 | **mitigated** | `new URL()` parse + `protocol === "https:"` + `hostname === "res.cloudinary.com"` (exact) + `pathname.startsWith("/<cloudName>/image/upload/")`. No substring search exists in the module. |
| T-16-15 | **mitigated** | `startsWith("fitout/listings/<listingId>/")` **plus** `..` rejection, leading-`/` rejection, backslash rejection, `:` rejection and a strictly-longer-than-prefix rejection, ordered so each is independently reachable. |
| T-16-16 | **mitigated** | `cloudName` is an argument; blank/absent returns `false`; the action never early-returns success; the absent-env case is tested through the REAL action against the REAL database and asserts the row count is unchanged. |
| T-16-17 | **accepted, verified untouched** | `git diff --exit-code src/app/api/cloudinary/sign/route.ts` exits 0. `ALLOWED_SIGN_KEYS` unchanged. |
| T-16-18 | **accepted, out of scope** | Phase 16.1 (D-164 / D-166). `maxFileSize`, `clientAllowedFormats` and `sources: ["url"]` are all untouched — `photo-uploader.tsx` has an empty diff. |

## Deviations from Plan

### Auto-fixed / auto-added

**1. [Rule 2 — missing critical functionality] A blank `listingId` is a fail-closed case**
- **Found during:** Task 2
- **Issue:** The plan's `<behavior>` list names `cloudName` empty/undefined as a rejection but not `listingId`. With an empty `listingId` the folder prefix becomes `fitout/listings//`, which every `fitout/listings/...` public id satisfies — the scope check silently stops being a scope check.
- **Fix:** Added `if (typeof listingId !== "string" || listingId.trim() === "") return false;` beside the cloud-name guard, plus a named spec case.
- **Files:** `src/lib/listing/cloudinary-provenance.ts`, `tests/listing/cloudinary-provenance.test.ts`
- **Commit:** `9335b11`

**2. [Rule 2 — missing critical functionality] A third attacker vector the plan's list did not contain**
- **Found during:** Task 2's watched red
- **Issue:** The plan's query-string vector does not exercise the hostname comparison (the pathname check rejects it first), so as specified the mutation would have turned only ONE case red and the criterion "the suffix-host and query-string cases fail by name" would have been unmeetable honestly.
- **Fix:** Added `rejects a foreign host wearing our exact PATH plus a decoy query` — a vector for which the hostname comparison is the only guard. The plan's original query-string vector is retained unchanged.
- **Files:** `tests/listing/cloudinary-provenance.test.ts`
- **Commit:** `9335b11`

**3. [Rule 2 — missing critical functionality] Delivery-type coverage for `/raw/upload/` and `/image/fetch/`**
- **Found during:** Task 2
- **Issue:** The plan frames the path check as a cloud-name (tenant) check. It also decides two things the plan does not name: `/raw/upload/` is where a scriptable SVG or an html file would be served from, and `/image/fetch/<remote-url>` proxies an ARBITRARY remote address through our own cloud name — the one shape that satisfies host, protocol and tenant while serving someone else's bytes.
- **Fix:** No code change was needed (the existing prefix already rejects both); a named spec case was added so the coverage is asserted rather than incidental, and the module comment says what the line actually closes.
- **Files:** `tests/listing/cloudinary-provenance.test.ts`, `src/lib/listing/cloudinary-provenance.ts`
- **Commit:** `9335b11`

**4. [Rule 2] The absent-cloud-name integration case asserts the restore too**
- **Found during:** Task 3(c)
- **Issue:** A test that only asserts `ok === false` while the variable is deleted cannot distinguish "the guard fired" from "the fixture was wrong for some other reason" — the vacuous-assertion shape this plan's own security note warns about.
- **Fix:** The case now also asserts the identical call SUCCEEDS once `CLOUDINARY_CLOUD_NAME` is restored, and that the photo count goes 1 → 2.
- **Files:** `tests/listing/photos.test.ts`
- **Commit:** `86520dc`

### Recorded, not fixed

- **`.env.local:5` describes its Cloudinary values as *"Public-safe dummy"* and they are REAL** — the Admin API call authenticated with them and returned HTTP 200 for account `da8uglpk6`. Not fixed here because the file is gitignored and outside this plan's file list; flagged for whoever next touches it. No secret was written to the repo, to a commit message, or to this SUMMARY.
- **The validator does not cross-check that the url's path contains the `publicId`.** Deliberate and documented in the module header as an accepted residual (see key-decisions).

## Known Stubs

None. Every branch added is reachable and exercised: the fail-closed branch has an integration test that deletes the variable, and both mutation runs above confirm the url checks are load-bearing rather than decorative.

## Requirements

`16-05-PLAN.md` frontmatter tags **CROP-02**, but this plan delivers **D-165** (provenance validation) and none of CROP-02's clauses — the non-destructive 16:9 / 4:3 cover-frame preview is plans 16-06 / 16-15 / 16-16. **CROP-02 is NOT ticked here** and `REQUIREMENTS.md` is untouched; recorded as `requirements-advanced` per the orchestrator's shared-requirement rule. `REQUIREMENTS.md:99` and the traceability row at `:232` both remain `Pending`, which is correct.

## Self-Check: PASSED

| Claim | Verified |
|---|---|
| `src/lib/listing/cloudinary-provenance.ts` exists | FOUND |
| `tests/listing/cloudinary-provenance.test.ts` exists | FOUND |
| `src/app/actions/listing-photo.ts` modified | FOUND |
| `tests/listing/photos.test.ts` modified | FOUND |
| Commit `9335b11` | FOUND |
| Commit `86520dc` | FOUND |
| `.planning/STATE.md` / `.planning/ROADMAP.md` unmodified by this plan | CONFIRMED — orchestrator owns both |
