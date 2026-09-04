---
phase: 17-cross-cutting-audit-themes-responsive-a11y-baselines
plan: 02
subsystem: testing
tags: [vitest, design-gates, sha256, visual-baselines, a11y, focus, drizzle]

requires:
  - phase: 13-payments-hardening
    provides: "drizzle/ at 0025_audit_resolved_by.sql — the 26-file state GATE-06 pins"
  - phase: 15-auth-surface-polish
    provides: "e2e/helpers/focus.ts — expectRing/readFocus extracted as the one focus criterion (plan 15-12)"
  - phase: 16-image-crop-framing
    provides: "D-138 court-only baselines; the 36 *-court-visual-linux.png set"
provides:
  - "GATE-06 as a CONTENT pin: sha256 over name + NUL + LF-normalised bytes for all 26 drizzle/*.sql, blocking inside npm run build"
  - "AC#26's theme half: zero *-grove-*.png on disk, gated behind a >=30 court-baseline positive control"
  - "AC#20 as a mechanical gate: the set of focus-verdict sites in e2e/ equals a declared, reasoned inventory"
  - "A measured correction to AC#20's premise: e2e/ has THREE focus-verdict sites, not one, and all three are correct"
affects: [17-07, 17-08, 17-10, 17-11, milestone-close]

tech-stack:
  added: []
  patterns:
    - "Content digest over a directory: name + NUL + bytes per file, line-ending normalised to the committed blob"
    - "Closed reasoned inventory instead of a bare allowlist, with both-directions closure asserted"
    - "String/template-substitution stripping layered on stripComments for source-text scans"

key-files:
  created:
    - tests/design/focus-definition.test.ts
  modified:
    - tests/design/money-path-invariants.test.ts
    - tests/design/gitignore-baselines.test.ts

key-decisions:
  - "GATE-06's digest hashes LF-normalised bytes, not raw readFileSync bytes: `* text=auto` with no eol=lf pin on drizzle/*.sql means the working tree is CRLF on Windows and LF in ci.yml's ubuntu container, so a raw-byte constant pinned here would be red there on every run. Cross-checked byte-identical against `git show :drizzle/<name>`."
  - "AC#26's grove half scans the FILESYSTEM where the platform half asks git, because playwright.config.ts pins updateSnapshots to an unconditional \"none\" (D-28) — no benign local process writes a baseline, so there is no untracked-but-harmless case to protect."
  - "AC#20 is enforced as a closed reasoned inventory rather than a count of one: measurement found three focus-verdict sites in e2e/ and all three ask questions expectRing cannot. A literal one-site gate would have been red against correct code."

patterns-established:
  - "Digest-of-a-directory gate: the filename is inside the hash input so a pure rename is caught, and the failure message forbids updating the constant"
  - "Positive control as an assertion that runs BEFORE the empty-list claim, proved by repointing the scan at a missing directory and watching the CONTROL fire"
  - "Message-vs-verdict discrimination: a property name inside a ${…} substitution is a failure-message read, not a definition"

requirements-completed: []

duration: 14 min
completed: 2026-08-29
---

# Phase 17 Plan 02: DB-Free Audit Gates Summary

**Three blocking Vitest gates that turn Phase 17's non-e2e claims from prose into failures: a sha256 content pin over `drizzle/`, a zero-grove baseline scan behind a court positive control, and a comment-blind scan proving nothing in `e2e/` re-derives the DS-05 focus criterion.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-08-29T07:00:41Z
- **Completed:** 2026-08-29T07:14:56Z
- **Tasks:** 3
- **Files modified:** 3 (1 created, 2 extended)

## Accomplishments

- **GATE-06 now pins CONTENT, not a filename.** The shipped gate asserted `drizzle/` still *ends at* `0025_audit_resolved_by.sql`. SC#4's wording is strictly stronger — "`drizzle/` is UNCHANGED from its v1.0 state" — and an edit to an already-shipped `.sql` renames nothing. Red-watched: one character changed in `0025_audit_resolved_by.sql` and every pre-existing GATE-06 assertion stayed **green** while the schema had moved. That is the hole, measured.
- **AC#26's theme half is on disk.** `gitignore-baselines.test.ts` covered `*-win32.png` / `*-darwin.png` and mentioned `grove` nowhere, so D-138's court-only rule was unenforced. It is now a filesystem scan behind a positive control that must first find ≥30 `*-court-visual-linux.png` (36 measured).
- **AC#20 is mechanical.** `tests/design/focus-definition.test.ts` scans `e2e/` comment-blind and message-blind, classifies definition vs consumer, and asserts the definition set equals a declared inventory where every row carries the reason it is not drift.
- **A wrong premise was caught by measurement rather than inherited.** The plan asserts one focus-verdict site in `e2e/`; there are three. See Deviations.

## Task Commits

1. **Task 1: Pin drizzle/ byte-for-byte with a content digest (GATE-06)** — `dcfc62b` (test)
2. **Task 2: Zero grove baselines on disk, court set as positive control** — `ed68dea` (test)
3. **Task 3: `focus-definition.test.ts` — expectRing is the only focus definition in e2e/** — `b8cbe7d` (test)

**Plan metadata:** see the `docs(17-02)` commit following this file.

## Files Created/Modified

- `tests/design/focus-definition.test.ts` — **created.** AC#20's gate: `stripComments` + a character scanner that blanks string bodies and tracks `${…}` substitution context; three guard-the-guard clauses; the closed `DECLARED_DEFINITIONS` inventory; a both-directions self-test that drives the failure message on synthetic sources.
- `tests/design/money-path-invariants.test.ts` — **extended.** `MIGRATION_COUNT = 26`, `MIGRATION_DIGEST`, `committedBytes()` and `digestOfMigrations()`, plus one `it()` inside the shipped GATE-06 `describe`. The existing `> 20` guard-the-guard is untouched.
- `tests/design/gitignore-baselines.test.ts` — **extended.** A second `describe` for the D-138 theme half, its positive control, and a classifier self-test; the stale `GREEN IS 4 PASSED` header count amended in place.

## Decisions Made

**1. The GATE-06 digest hashes LF-normalised bytes.** `.gitattributes` opens with `* text=auto` and gives `drizzle/*.sql` no `eol=lf` pin, so `0025_audit_resolved_by.sql` is 2752 bytes with 33 CR on this Windows checkout and 2719 bytes with 0 CR in `ci.yml`'s `gate-db-free` container — which is where `npm run build`, and therefore this gate, actually runs. A raw-`readFileSync` digest pinned here would be red there on every run for a reason unrelated to the schema. The digest over normalised bytes was cross-checked against one over `git show :drizzle/<name>` (the index blobs ubuntu checks out) and both produced `652178ae…d1afbe`, byte-identically. The rejected alternative — adding `drizzle/*.sql text eol=lf` and renormalising 26 files — is out of this plan's declared surface; if a later phase adds that pin, `committedBytes()` becomes a no-op rather than wrong and the constant does not move.

**2. The grove half scans the filesystem where the platform half asks git.** The platform half argues hard for `git ls-files` because an untracked `*-win32.png` is what a local `--update-snapshots` legitimately produces. That reasoning does not carry: `playwright.config.ts` pins `updateSnapshots` to an unconditional `"none"` (D-28) with `--update-snapshots` confined to one dispatch workflow, so no local process writes a grove baseline. Anything on disk arrived deliberately, and disk is earlier and stricter than the index.

**3. AC#20 is a closed reasoned inventory, not a count.** See Deviations #1.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] AC#20's stated premise is false against the tree; the gate was built to the measurement**

- **Found during:** Task 3
- **Issue:** The plan states the subject as *"how many places in `e2e/` compute a focus verdict … The answer must be exactly one, and it must be `e2e/helpers/focus.ts`"*. Measured 2026-08-29, there are **three**, and none is drift:
  - `e2e/helpers/focus.ts` — `readFocus` + `expectRing`, THE criterion.
  - `e2e/auth-keyboard.spec.ts:547` — `expectIndicatorPaints`, whose own docblock introduces it as *"a strictly stronger claim than `expectRing`, and it is here because `expectRing` alone has a hole this walk would otherwise report green through"*: a `ring-*` compiles to a five-layer shadow with three transparent placeholder layers, so a ring whose colour went transparent still hands `expectRing` a non-`none` string. Same file `:656` — the wordmark keeps the browser-default outline by `(auth)/layout.tsx`'s deliberate choice and is the one element the DS-05 recipe does not describe.
  - `e2e/avatar-crop.spec.ts:1438` — the crop stage draws a permanent `box-shadow: 0 0 0 9999em` (IC-04's scrim), so `expectRing` is satisfied there by furniture.

  A gate written to the plan's literal wording is **red against correct code**, which is precisely the failure class the same task warns about two paragraphs earlier when it mandates `stripComments` ("that failure class already has ten recorded instances in this tree" — this is the eleventh). Deleting either extra site to satisfy a count would delete real assertions.
- **Fix:** The enforceable form is a **closed inventory** (`DECLARED_DEFINITIONS`), the `SELECTOR_CONTRACT` / `EXCLUDED_PAIRS` shape where a row without a reason is not a row. Two properties keep it from degrading into the allowlist the plan rightly forbids, and both are asserted, not hoped: every declared site must also import `./helpers/focus` (it *layers* on the one definition rather than replacing it), and the inventory is closed in **both** directions — a declared row whose file stopped defining anything fails as a stale exemption. The failure message argues the reader out of adding a row and names `import { expectRing } from "./helpers/focus"` as the fix.
- **Files modified:** `tests/design/focus-definition.test.ts`
- **Verification:** Red-watched against a rogue `e2e/rogue-focus-probe.spec.ts` computing the criterion inline — 2 failed / 4 passed, both claim clauses fired, all three guards stayed green; probe deleted, `git status --porcelain e2e/` empty, re-run 6 passed.
- **Committed in:** `b8cbe7d`

**2. [Rule 3 - Blocking] A raw-byte migration digest would be red in CI by construction**

- **Found during:** Task 1
- **Issue:** The plan prescribes hashing "the file's bytes read with `readFileSync`". Under `* text=auto` with no `eol=lf` pin, those bytes are CRLF here and LF in the `gate-db-free` container, so the constant pinned on this machine cannot be green there.
- **Fix:** `committedBytes()` collapses CRLF to LF (only the CR of a CRLF pair, byte-explicitly) before hashing, and the rationale plus the two measurements are recorded on the function. Nothing that could be a schema change survives it — SQL text changes the digest, a rename changes it via the filename — and the only thing forgiven is a newline flavour git will not admit into a commit.
- **Files modified:** `tests/design/money-path-invariants.test.ts`
- **Verification:** Normalised-disk digest and git-index-blob digest both `652178ae…d1afbe`.
- **Committed in:** `dcfc62b`

**3. [Rule 2 - Missing Critical] A third false-positive class the plan does not name: failure-message interpolation**

- **Found during:** Task 3
- **Issue:** The plan mandates `stripComments` against prose false positives. Measurement found a second class it does not cover: `e2e/avatar-crop.spec.ts:2605-2609` takes its verdict from `sameIndicator(indicatorOf(…), …)` — both imported — and interpolates all three property names into the failure string so the message prints real numbers. A template literal is not a comment, so a `stripComments`-only scan flags the most textbook consumer in the tree.
- **Fix:** `partitionContexts()` blanks string/template text and marks `${…}` regions; a read inside a substitution is a MESSAGE read, not a verdict. Guard clause (c) asserts message reads exist in the real tree, so the discriminator can never be silently stuck.
- **Files modified:** `tests/design/focus-definition.test.ts`
- **Verification:** `e2e/overflow-320.spec.ts` and `e2e/avatar-crop.spec.ts` both classify correctly, asserted by name; the synthetic consumer fixture in the self-test carries both a quoting docblock and a message interpolation and yields zero verdict reads.
- **Committed in:** `b8cbe7d`

**4. [Rule 2 - Missing Critical] The stale `GREEN IS 4 PASSED` header count in `gitignore-baselines.test.ts`**

- **Found during:** Task 2
- **Issue:** That file's watched-red header declared the file's green as 4 passed. Adding three cases makes it 7, and a probe record whose numbers no longer describe the file is the comment-drift class Phase 15 exists to repair.
- **Fix:** Amended in place with the repo's history-preserving idiom (`e2e/helpers/theme.ts:17-28`) — the old count is named as history and the recorded `1 failed / 3 passed` readings are kept rather than silently re-baselined. The file header's opening paragraph likewise now points at the new third clause.
- **Files modified:** `tests/design/gitignore-baselines.test.ts`
- **Verification:** `npm run test:design` green; the amended text names both counts.
- **Committed in:** `ed68dea`

---

**Total deviations:** 4 auto-fixed (1 bug, 1 blocking, 2 missing-critical)
**Impact on plan:** All four were required for the gates to be correct rather than merely green. #1 and #2 would each have produced a gate that fails against correct code — #2 in CI on every run, #1 immediately. No scope creep: the diff is exactly the three declared files.

## Issues Encountered

None. Every acceptance criterion passed on its first verification loop; the two red-watch mutations were applied and restored deliberately.

## Verification Results

| Plan check | Result |
|---|---|
| `npm run test:design` | **65 files, 1226 passed / 3 skipped** (was 64 / 1216 / 3 — exactly +1 file and +10 tests: 1+3+6) |
| `npx tsc --noEmit` | exit 0 |
| `git status --porcelain drizzle/` | prints nothing — the GATE-06 mutation was restored byte-for-byte |
| `git diff --name-only` (3 task commits) | exactly the three declared files; zero deletions |
| `npm run lint` | 0 errors, 25 pre-existing warnings, none in the three files |

Per-task: `money-path-invariants` 6 passed · `gitignore-baselines` 7 passed · `focus-definition` 6 passed.

## Success Criteria

- **AC#30 / AC#31 hold** — 26 `.sql` ending at `0025_audit_resolved_by.sql`, plus a byte digest observed red against a one-character edit and restored. ✔
- **AC#26's grove half holds** — zero `*-grove-*.png`, with the control proved non-vacuous by repointing the scan at a missing directory and watching the CONTROL (not the grove clause) fire. ✔
- **AC#20 holds mechanically** — comment-blind and message-blind, `expectVisibleFocus` correctly classified as a consumer, asserted by name in both directions. ✔ *(Enforced as a closed reasoned inventory of three sites rather than a count of one — see Deviations #1.)*
- **AC#32 — zero schema migrations proposed or absorbed.** ✔ Nothing under `src/` or `drizzle/` was touched.

## Requirements

`requirements-completed` is deliberately **empty**. This plan is **requirements-advanced**, not requirements-closing:

- **GATE-06** — this plan makes the *zero-migrations* claim mechanical and blocking from here forward, but the requirement's own wording ("the milestone ships zero schema migrations") closes at milestone exit, and its Phase-17 verification is the verifier's call. `.planning/REQUIREMENTS.md` left at `Pending`.
- **GATE-02** — this plan closes only AC#20's one-definition half. Keyboard operability across calendar, slot picker, wizard, dialogs and sheets ships in 17-08/17-10. `Pending`.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Ready for 17-03.** Wave 1 plans declare no overlapping `files_modified`; this plan touched only `tests/design/`.
- **For 17-07/17-08 (the e2e a11y work):** `tests/design/focus-definition.test.ts` now blocks a *new* file in `e2e/` that re-derives the focus criterion. `e2e/keyboard-composites.spec.ts` (17-08) must `import { expectRing } from "./helpers/focus"` rather than reading `outlineStyle` / `boxShadow` itself, or `npm run build` will fail with a message saying exactly that. If it genuinely needs a question `expectRing` cannot ask, `DECLARED_DEFINITIONS` gains a row **with its reason**, in that plan's own commit.
- **For the milestone close:** `MIGRATION_DIGEST` is the machine-checkable form of SC#4. It must not be updated to make a build pass.

### Bookkeeping observations (not fixed — out of scope)

- `.planning/ROADMAP.md:707` still shows `- [ ] 17-01-PLAN.md` unticked, though 17-01 completed earlier in this wave and the progress row counted it (`1/14`). Left for 17-01's owner or the verifier; per the project's hand-edit rule this executor ticked only line 708 and moved the row to `2/14`.
- STATE.md was hand-edited (`current_plan` 2→3, `stopped_at`, `last_activity`, `last_updated`). No `gsd-sdk` state/roadmap verb was invoked — the project memory records those corrupting these files repeatedly at v1.42.3. `progress:` counters were left alone.

## Self-Check: PASSED

- `tests/design/focus-definition.test.ts` — FOUND
- `tests/design/money-path-invariants.test.ts` — FOUND
- `tests/design/gitignore-baselines.test.ts` — FOUND
- commit `dcfc62b` — FOUND
- commit `ed68dea` — FOUND
- commit `b8cbe7d` — FOUND

No stubs, placeholders or TODOs were introduced. No new threat surface: this plan writes only under `tests/design/`, adds no runtime code, no route and no input surface (T-17-08, disposition `accept`, unchanged).

---
*Phase: 17-cross-cutting-audit-themes-responsive-a11y-baselines*
*Completed: 2026-08-29*
