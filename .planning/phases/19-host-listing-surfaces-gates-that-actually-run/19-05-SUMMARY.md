---
phase: 19-host-listing-surfaces-gates-that-actually-run
plan: 05
subsystem: infra
tags: [nextjs, routing, reproduction-gate, evidence, turbopack, boot-guards, d-09, d-10, d-11]

requires:
  - phase: 19-04
    provides: The verified `.next/dev` evidence archive — the reversal path that downgraded this plan's `rm -rf .next` from a one-way door to merely costly
  - phase: 19-02
    provides: The incidental fresh-process reproduction of the 404, which this plan's clean probes contradict and which § 2 of the finding preserves rather than smooths away
provides:
  - An eleven-URL anonymous status matrix against a clean `next dev` server, on disk
  - The same eleven-URL matrix under a real `next build` + `next start`, on disk
  - VERDICT A — not reproduced in dev, not reproduced in prod — and therefore zero application file changes for HSURF-02
  - `19-FINDING-404.md`: the written record, with one disposition line per unproven item, one item CLOSED and two recorded OPEN, and no cause named anywhere
  - A re-established `grep -c` of 1 for the edit route in a freshly-built production manifest, restoring the one measurement 19-04 could not independently verify
affects: [19-06, 19-07, 20-ops-host-partition, v1.2-ship]

actuals:
  tokens: 11500
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Reproduction gate before code change: a defect whose evidence points at the runtime, not the tree, opens with a probe protocol and a branch rule, and 'not reproducible' is a recorded verdict rather than a failed task"
    - "Boot guards are supplied AROUND, never softened: fail-closed module-scope guards get visibly fake self-describing values inline for one command, never written to .env.local and never committed"
    - "A finding that names a cause is worse than no finding: unproven premises are labelled inference every time, and contradicting measurements are carried with their conditions instead of being discarded"

key-files:
  created:
    - .planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/probe-dev.txt
    - .planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/probe-prod.txt
    - .planning/phases/19-host-listing-surfaces-gates-that-actually-run/19-FINDING-404.md
  modified:
    - .planning/phases/19-host-listing-surfaces-gates-that-actually-run/deferred-items.md
    - .planning/WINDOWS.md

key-decisions:
  - "VERDICT A landed: the 404 reproduced neither under a clean dev server nor under a real production build, so per D-09 no file under src/app/(host)/host/listings/[id]/ was edited at any step"
  - "Item (a) is recorded PERMANENTLY OPEN and NOT CLOSEABLE rather than rounded up — the dev server that exhibited the 404 was already gone when the phase opened, and a clean restart serving 307 is not evidence about the old process"
  - "Item (c) is recorded OPEN — REFRAMED with five candidates and none attributed; the reframing itself is labelled inference because assumptions A4 and A5 are both UNPROVEN"
  - "19-02's contradicting reproduction is preserved in § 2 of the finding with both sets of conditions, and the state of the .next directory is named as the DISCRIMINATOR to start from — explicitly NOT as a cause"
  - "The /ops body-size difference measured under the production build was deferred, not fixed: the halt trigger this plan defines is a STATUS change, and the status held at 404 in both matrices"

patterns-established:
  - "Regression control inside a probe set: /ops rides along with a hard stop on any status other than 404, so a phase cannot disturb D-219's cloak without halting"
  - "The costly-not-one-way downgrade: a destructive command is permitted only because a prior plan archived its inputs, and the task's precondition asserts that archive is complete before the command runs"

requirements-completed: []

coverage:
  - id: D1
    description: "The eleven-URL anonymous probe ran against a freshly-cleared, freshly-started dev server and its full status matrix — status code plus redirect target per URL — is on disk"
    requirement: "HSURF-02"
    verification:
      - kind: other
        ref: "test -s evidence/probe-dev.txt && wc -l → non-empty, 175 lines, 11 matrix rows"
        status: pass
      - kind: other
        ref: "grep '/ops ' evidence/probe-dev.txt → 404 (regression control held)"
        status: pass
      - kind: other
        ref: "git status --porcelain 'src/app/(host)/host/listings/[id]/' → no output"
        status: pass
    human_judgment: false
  - id: D2
    description: "The same eleven URLs were probed under a real production build (npm run build exit 0, then npm start with only the platform-wallet pair supplied inline), closing unproven item (b)"
    requirement: "HSURF-02"
    verification:
      - kind: other
        ref: "test -s evidence/probe-prod.txt && wc -l → non-empty, 175 lines, 11 matrix rows"
        status: pass
      - kind: other
        ref: "grep -c 'listings/\\[id\\]/edit' .next/app-path-routes-manifest.json → 1"
        status: pass
      - kind: other
        ref: "git status --porcelain 'src/app/(host)/host/listings/[id]/' and on .env.local → no output on either"
        status: pass
    human_judgment: false
  - id: D3
    description: "19-FINDING-404.md records VERDICT A, both eleven-row matrices, and one explicit Disposition line per unproven item — (a) OPEN — NOT CLOSEABLE, (b) CLOSED, (c) OPEN — REFRAMED — naming no cause anywhere"
    requirement: "HSURF-02"
    verification:
      - kind: other
        ref: "grep -c '^\\*\\*Disposition:\\*\\*' 19-FINDING-404.md → 3"
        status: pass
      - kind: manual_procedural
        ref: "Task 3 checkpoint:human-verify — eight-question <human-check>, all eight answered in the affirmative, user replied 'approved'"
        status: pass
    human_judgment: true
    rationale: "Questions 4 and 5 are the whole reason this is a human gate rather than a grep: a regular expression over prose cannot distinguish an attribution from a deliberate refusal to attribute. The orchestrator worked all eight questions against the finding and the user approved."

duration: 14 min
completed: 2026-09-04
status: complete
---

# Phase 19 Plan 05: HSURF-02's Reproduction Gate Summary

**VERDICT A — the listing-creation 404 reproduced neither under a clean `next dev` nor under a real `next build` + `next start`, so HSURF-02 closes with zero application file changes and a written finding that closes one unproven item, records two open, and names no cause.**

## Performance

- **Duration:** 14 min of execution (10:38 → 10:52 local), plus the Task 3 human gate
- **Started:** 2026-09-04T02:38:00Z
- **Completed:** 2026-09-04T02:52:29Z
- **Tasks:** 3 of 3 (Task 3 was a `checkpoint:human-verify`, approved)
- **Files created/modified:** 5

## Accomplishments

- **Ran the reproduction gate before touching any code, and it came back negative.** Both probes served `307 → /login` on all four subject rows. Per D-09 that means **no application file changes for HSURF-02** — and none were made.
- **Closed the one unproven item this phase could close.** Item (b) — whether the defect reproduces under a production build — is `CLOSED`: it does not, on this machine, on this tree, on this date.
- **Refused to close the two it could not.** Item (a) is `OPEN — NOT CLOSEABLE`; item (c) is `OPEN — REFRAMED` with five candidates and none attributed.
- **Preserved a measurement that contradicts the verdict** instead of smoothing it away (§ 2 of the finding, below).
- **Left the record on disk.** This defect class has now cost real time twice on this machine and left nothing behind either time. `19-FINDING-404.md` is the record; plan 19-06 ships the instrument.

## Task Commits

1. **Task 1: clean-dev eleven-URL probe** — `ddd0247` (docs)
2. **Task 2: production-build probe — VERDICT A, item (b) CLOSED** — `bb9a4a4` (docs)
3. **Task 3: the written finding** — `c7c287a` (docs) — then the `checkpoint:human-verify` gate, **approved**

## The two matrices

Every request in both is **ANONYMOUS** — no cookie, no session. That is what makes the set decisive: `EditListingPage` redirects to `/login` at `src/app/(host)/host/listings/[id]/edit/page.tsx:30-33`, **before** the `db.select()` at `:43` and long before the `notFound()` at `:49-51`. An anonymous caller that reaches that module **can only produce a 307**. A `404` therefore proves the module never ran.

| # | URL | 2026-09-03 (broken) | DEV (clean `next dev`) | PROD (`build` + `start`) |
|---|---|---|---|---|
| 1 | `/host/listings` | `307 → /login` | `307 → http://localhost:3000/login` | `307 → /login` |
| 2 | `/host/listings/new` | `307 → /login` | `307 → http://localhost:3000/login` | `307 → /login` |
| 3 | `/host/listings/e6ca32d0-…-79402b962c51/edit` | **`404`** ← subject | **`307 → /login`** | **`307 → /login`** |
| 4 | `/host/listings/e6ca32d0-…-79402b962c51/availability` | **`404`** ← subject | **`307 → /login`** | **`307 → /login`** |
| 5 | `/host/listings/zzz/edit` | **`404`** | **`307 → /login`** | **`307 → /login`** |
| 6 | `/host/listings/uat_listing_bookable/edit` | **`404`** | **`307 → /login`** | **`307 → /login`** |
| 7 | `/host` | `307 → /login` | `307 → /login` | `307 → /login` |
| 8 | `/bookings/abc` | `307 → /login` | `307 → /login` | `307 → /login` |
| 9 | `/listings/uat_listing_bookable` | `200` | `200` | `200` |
| 10 | `/invite/abc` | `200` | `200` | `200` |
| 11 | `/ops` | `404` | `404` (control held) | `404` (control held) |

**The rows that determine the verdict are 3, 4, 5 and 6** — all `307` in both matrices. **Row 5 is the sharpest discriminator in the set**: `zzz` is not a uuid, but the module still runs, so an anonymous caller gets `/login`. A `404` on row 5 alongside `307`s on rows 1/2/7 is the signature of a routing-layer failure scoped to the `[id]` segment. It did not occur.

`{draft-uuid}` is the literal `e6ca32d0-41c1-4fbf-9cee-79402b962c51` in every pass, kept unchanged so the rows stay comparable to the 2026-09-03 matrix. **That row was deleted from the database by plan 19-04** and the measurement is unaffected: `listing.id` is `text`, the segment matcher accepts any string, and the request is anonymous so the module redirects before it reads the database.

### Manifest observations

| Observation | Clean dev server | Production build |
|---|---|---|
| `grep -c 'listings/\[id\]/edit'` in the running manifest | **1** | **1** |
| `grep -c 'listings/\[id\]/availability'` | **1** | **1** |
| manifest entry count | 10 | 46 |
| compiled `edit/page.js` | present, 6496 B, written **during** the probe | n/a (production bundle) |
| compiled `availability/page.js` | present, 6420 B, written **during** the probe | n/a (production bundle) |

The production `grep -c` of **1** re-establishes the one archived production-manifest measurement that 19-04 recorded as no longer independently verifiable — 19-04 could not re-verify the file's **mtime** (`Sep 3 15:57`), but its **count** is re-established here.

### Environment variables supplied inline to boot production

**Only the platform-wallet pair** — visibly fake, self-describing, carrying no secret, supplied inline for one command:

```
PLATFORM_WALLET_NUMBER=dev-wallet-not-a-real-account
PLATFORM_WALLET_NAME="FitOut Dev Platform"
```

None of the other four module-scope boot guards `ci.yml:626-641` enumerates (`BETTER_AUTH_SECRET`, `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET`, `INNGEST_SIGNING_KEY`) had to be supplied and none fired. **No boot guard was weakened, edited or bypassed, and nothing was written to `.env.local`.**

## ⚠ The probe set is ELEVEN URLs, not ten

`PITFALLS.md § B5` calls this "the ten measured URLs" and then lists eleven. **The prose count is wrong; the list is right.** `ROADMAP.md` and `19-CONTEXT.md` both inherit the miscount. Both matrices use all eleven. **There is no twelfth URL — stop looking for one.** The correction is written into `19-FINDING-404.md § 6` because the miscount has already propagated through three documents.

## ⚠ A contradicting measurement, carried rather than smoothed

19-RESEARCH § 1.0 concluded the failing process was gone and the class no longer observable. **Plan 19-02 then reproduced it incidentally**, on a *fresh* `next dev` booted against the *surviving* 2026-09-03 `.next`, while doing unrelated work — 404 on `/host/listings`, `/host/earnings`, `/host/payouts` and `/host/listings/new`, while `/host` itself served 307 correctly, and with the manifest entry **present**.

Both results are recorded in **§ 2 of the finding** with the conditions that produced each. **The distinguishing variable is the state of the `.next` directory the server booted against — old versus freshly built. That is named as the DISCRIMINATOR for the next reader and explicitly NOT as a cause.** Section 5.2 also records the way 19-02's observation *weakens* the manifest-centred framing of item (c), rather than collecting only the evidence that supports it.

## ⚠ Two items stay open, and no cause is named anywhere

| Item | Question | Disposition |
|---|---|---|
| (a) | Does `rm -rf .next` + restart make it go away? | **`OPEN — NOT CLOSEABLE`** — permanently. The dev server that exhibited the 404 was already gone when the phase opened (`curl` → `000`, connection refused). A clean restart serving 307 shows the current tree routes correctly; it is **not** evidence about the old process. Closing it requires the failure to be **live**, and the first term of that sequence no longer exists. |
| (b) | Does it reproduce under a production build? | **`CLOSED`** — it does not. Scope stated precisely in the finding: this machine, this tree, this date. It says nothing about any deployed environment. |
| (c) | What removed the manifest entry? | **`OPEN — REFRAMED`**, never answered. Three mtimes (artifact `15:18`, session markers `18:09`, manifest `19:33`) and five candidates — a swallowed compile error, an HMR write race, a build racing a dev server, a bundler bug, and the new fifth possibility that **nothing removed it at all**. **None attributed, none ranked.** The reframing rests on assumptions A4 and A5, both UNPROVEN, both labelled inference in the document. |

The finding states nowhere as fact that clearing `.next` fixed anything, that the dev manifest is an incremental per-session ledger, or that the compiled artifact is a leftover from an earlier session.

## Decisions Made

- **VERDICT A, and therefore no code.** The branch rule was followed literally: `307` on rows 3/4/5/6 in dev ⇒ continue to the production probe; `307` again under production ⇒ verdict A ⇒ no application file changes. `git status --porcelain "src/app/(host)/host/listings/[id]/"` produced no output at both probe tasks.
- **Boot guards supplied around, not softened.** Only the platform-wallet pair was needed. Nothing was written to `.env.local` and no guard was touched.
- **The dev server was killed before `next build`.** `next build` and `next dev` share `.next`, and a build racing a dev server is candidate 3 for item (c) — running them concurrently would have manufactured the exact confound this phase exists to avoid.
- **The `/ops` body difference was deferred, not fixed.** The halt trigger is a **status** change, and the status held.

## Deviations from Plan

None — plan executed exactly as written. Verdict A is the outcome the plan named as most likely, and every acceptance criterion in all three tasks passed on the first attempt.

## Out-of-scope discovery — deferred, not fixed

**`/ops` 404 body is not byte-identical to the root not-found under a production build.** The status control held (404 in both matrices), but the bodies differ: **25970 bytes for `/ops` against 29644 for a plain non-route**. What differs is *shared site chrome*, which `/ops` renders **less** of; both carry the identical `<title>Page not found · FitOut</title>` and **no ops-identifying string leaks** (`ops-console`, `Console`, `staff`, `wordmark`, `Dashboard` all zero in both). **`/ops` is smaller, not larger — nothing extra is disclosed.**

Proven **pre-existing**: no phase-19 commit touches `/ops` or not-found rendering (those files last changed in 18-12 and 11-14). The scope boundary forbids fixing it here. Logged to `deferred-items.md` **D2** and to the broken-windows ledger as **entry 6**, for whoever owns D-219.

⚠ The same body comparison is **invalid in `next dev`** and must not be attempted there: `/ops` fetched twice differs *from itself*, because dev-mode HTML is not stable request-to-request.

## Issues Encountered

None. The plan's `<reversibility rating="costly">` on `rm -rf .next` held as designed — 19-04's archive was verified complete before the command ran, and it remains the reversal path.

## Requirements

`requirements-completed` is deliberately **empty**. This plan declares `HSURF-02`, but so do siblings **19-06** and **19-07**, neither of which has a SUMMARY yet. The shared-ID gate (#2388) therefore holds `HSURF-02` as not-ready, and it will flip `Complete` when the last declaring plan in this phase finishes. **That is the gate working correctly and it was not forced.**

## User Setup Required

None — no external service configuration required. The two platform-wallet values used to boot the production probe were inline, fake, and deliberately not persisted.

## Next Phase Readiness

**Ready for 19-06** — the routing guard `e2e/host-route-reachability.spec.ts`, which is the *instrument* this record points at. § 8 of the finding states the case for it precisely: `e2e/axe-sweep.spec.ts:311-315` already goes red if `/host/listings/new` stops landing on the wizard and **nobody knew it did**, because its failure message names a *fixture* problem rather than a *route* problem. **The value of 19-06's guard is entirely in the failure sentence, not in the coverage.**

**Carried forward, open:**
- The **local-vs-production scope question** raised by 19-04 remains **OPEN and unanswered by the PM** (broken-windows entry 5). Verdict A's closure of item (b) is explicitly scoped to this machine and does not touch it.
- Items (a) and (c) stay open. **Only verdict B — a live, reproducing dev server — can close them.** If the 404 returns, § 8 of the finding gives the capture order: `next dev`'s stdout, the manifest **before and after** the request, the artifact mtime **before and after**, then hand it to `/gsd-debug`. Capture before fixing.
- **Do not "fix" a future 404 by softening the `notFound()` at `edit/page.tsx:49-51`.** It is a shipped ownership check (IDOR guard) and D-10 forbids patching it absolutely.

## Self-Check: PASSED

- `evidence/probe-dev.txt` — FOUND (10817 B)
- `evidence/probe-prod.txt` — FOUND (10500 B)
- `19-FINDING-404.md` — FOUND (20211 B), unmodified by this close-out
- `ddd0247`, `bb9a4a4`, `c7c287a` — all three FOUND in `git log`

---
*Phase: 19-host-listing-surfaces-gates-that-actually-run*
*Completed: 2026-09-04*
