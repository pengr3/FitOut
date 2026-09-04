---
quick_id: 260828-qd5
slug: declare-tsx-as-a-devdependency-so-creden
status: complete
completed: 2026-08-28
threats_cited: [T-QD5-SC, T-QD5-01, T-QD5-02, T-QD5-03]
closes: W-3 (16.1-SECURITY.md)
still_open: yaml — undeclared transitive on the CI path (scripts/verify-workflows.mjs:115-121)
commits:
  - 54cb096 (chore — tsx@4.22.4 declared in devDependencies, lockfile promotion)
key_files:
  modified:
    - package.json
    - package-lock.json
  uncommitted_for_orchestrator:
    - .planning/phases/16.1-upload-hardening-storage-economy/16.1-SECURITY.md
---

# Quick 260828-qd5 — declare `tsx` at an exact pin · SUMMARY

## What shipped

**One manifest line, its lockfile consequence, and a W-3 resolution note.** `tsx` is now a declared
root `devDependency` at the exact pin `"tsx": "4.22.4"`, so the seven npm scripts that run under it —
and in particular `cloudinary:preset`, which executes with `CLOUDINARY_API_SECRET` in its
environment — run under an interpreter whose version this repo's own manifest fixes, rather than
whatever version `drizzle-kit` or `vite` happens to hoist.

```diff
      "tailwindcss": "^4.3.0",
+     "tsx": "4.22.4",
      "typescript": "^5",
```

This closes Warning **W-3** from the Phase 16.1 security audit. It is **not** a phase violation and
is not written up as one: Phase 16.1 installed nothing, declared no dependency, and left
`package-lock.json` untouched, so `T-16.1-SC` is closed and stays closed. 16.1-03's executor saw the
transitive and recorded it deliberately, quoting the rule from `scripts/verify-workflows.mjs:116-121`
— *the fix for this class of diagnostic is a dependency decision to raise, never the deletion of the
thing that runs the script.* This task is that dependency decision being taken. Six of the seven
consumers pre-date the phase; the phase added the seventh. What changed is the stakes, not the fault.

## Why the pin is exact and not `^4.22.4`

**Carried forward verbatim from the plan, because this is the thing a future reader will otherwise
undo.** Someone will see a bare pin in a block full of carets and "helpfully" caret it. That reopens
W-3. Four reasons, in order of weight:

1. **This is a PROMOTION, not a version move.** 4.22.4 is what was installed before the change and
   what every consumer already resolved to. The correct diff adds a root declaration of the version
   already in the tree and changes no `version` / `resolved` / `integrity` line anywhere. `^4.22.4`
   would leave the door open for a future `npm install` to pull 4.23.x and quietly turn a hygiene fix
   into an unreviewed interpreter upgrade — the exact failure mode W-3 exists to close, re-entering
   through semver instead of through hoisting.
2. **The point of W-3 is a version this repo FIXES.** "Pinned by a manifest this repo owns" is not
   satisfied by a range. A caret moves the resolution luck from npm's hoisting order to npm's semver
   selection; it does not remove it. For the interpreter of a script that loads
   `CLOUDINARY_API_SECRET`, an exact pin is the whole deliverable.
3. **Repo precedent.** The same `devDependencies` block already exact-pins two tools whose version is
   load-bearing: `"@playwright/test": "1.60.0"` and `"eslint-config-next": "16.2.7"`. This is the
   established local convention for that category, not a new one.
4. **It keeps ONE copy and makes divergence visible.** `drizzle-kit@0.31.10` and `vite@8.0.16` both
   resolve to 4.22.4 today, so declaring 4.22.4 keeps a single hoisted install. If a future
   drizzle-kit or vite ever demands a tsx outside 4.22.4, npm will nest a second copy and
   `npm ls tsx` will print it — a reviewable event, instead of a silent swap of the binary under
   seven scripts.

## The lockfile diff shape actually observed

**`npm install --package-lock-only --no-audit --no-fund` produced an acceptable diff. The hand-edit
fallback was NOT needed.** No `node_modules/` churn, and the whole diff is **4 insertions, 0
deletions**:

```diff
@@ -59,8 +59,12 @@
         "eslint-config-next": "16.2.7",
         "jsdom": "^29.1.1",
         "tailwindcss": "^4.3.0",
+        "tsx": "4.22.4",
         "typescript": "^5",
         "vitest": "^4.1.8"
+      },
+      "engines": {
+        "node": ">=24.2"
       }
     },
```

That is the entire lockfile change. Two things differ from what the plan predicted in advance, and
both are recorded here rather than rationalised away:

**1. The predicted `devOptional: true` → `dev: true` flip did NOT happen — and npm is right, the
plan's prediction was the wrong guess.** `node_modules/tsx` still reads `"devOptional": true`
(`package-lock.json:16695`). npm's semantics: `dev` means reachable *only* via dev paths,
`devOptional` means reachable via dev *and* optional paths. tsx remains reachable through an optional
path, so `devOptional` stays correct even now that a direct dev declaration exists. **This is why the
hand-edit fallback would have been actively harmful here:** following the plan's fallback text
literally would have written `"dev": true`, i.e. a flag npm's own resolver disagrees with, which the
next `npm install` would silently rewrite — a manufactured manifest/lock desync in a task whose whole
point is manifest/lock agreement. The fallback was correctly not taken.

**2. An unpredicted `engines` backfill appeared on `packages[""]`.** npm 11.8.0 now records the root
package's `engines` in the lock; the value is `{"node": ">=24.2"}`, copied verbatim from
`package.json:5-7`, where it has always lived. It is inert: it mirrors a declaration the manifest
already makes and that npm reads from `package.json` regardless, every `npm ci` job sets up
`node-version: "24"` first (`ci.yml:566,723,826,1026`, `baselines.yml:294`), and the line makes the
lock *more* in sync with the manifest, not less.

**A correction to the plan's own measurement, while counting those jobs: there are FIVE `npm ci`
invocations, not four.** The plan cited `ci.yml:568,725,828` and `baselines.yml:296`; it missed
`ci.yml:1028`. This does not change any conclusion — it raises the cost of a manifest/lock desync
rather than lowering it — but the next reader should count from `grep -n 'npm ci' .github/workflows/*.yml`
rather than from the plan's list.

**Why this did not trip the plan's stop-and-revert rule.** The plan defines "the diff exceeds that
shape" precisely and mechanically: *a version moves, a package appears or disappears, an integrity
hash changes*. None of the three occurred — and that is measured, not asserted:

| Gate | Expected | Observed |
|------|----------|----------|
| G2 — diff carries the promotion (`+.*"tsx": "4.22.4"`) | ≥ 1 | **1** |
| G3 — `version` / `resolved` / `integrity` lines moved | 0 | **0** |
| G4 — `node_modules/…` entries added or removed | 0 | **0** |

G2 was run **before** G3 and G4, in the plan's order, so the two zeros are load-bearing rather than
vacuous: an empty diff would also satisfy G3 and G4, and G2 proves the diff is non-empty. This is the
mechanical discharge of **T-QD5-SC** (the operation must be a promotion, not a fetch) and of
**T-QD5-03** (package legitimacy — no new artifact entered the tree). `node_modules/tsx` still
carries `4.22.4`, the same registry URL, and the same integrity hash
`sha512-X8EX+XV4QR5xCsrgxaED954zTDfY8KqlDtskKEL0cHhyS/P8b4IFOvGDQpsC9Q1XnLq915wEfwwY/zzskCtmhg==`
that was quoted in the plan's pre-change measurement. Byte-identical, before and after.

## Verification — every gate, with real output

**G1 — manifest declares the exact pin.** PASS.

**G2 / G3 / G4 — lockfile diff shape.** In the plan's order. Table above: `1`, `0`, `0`.

**G5 — the installed tree agrees with the manifest.** `npm ls tsx`, exit **0**:

```
fitout@0.1.0 C:\Users\Admin\Roaming\FitOut
+-- @vitejs/plugin-react@6.0.2
| `-- vite@8.0.16
|   `-- tsx@4.22.4 deduped
+-- drizzle-kit@0.31.10
| `-- tsx@4.22.4 deduped
`-- tsx@4.22.4
```

The root-level `tsx@4.22.4` entry now exists — that line is the whole deliverable. `drizzle-kit`'s
child, which was a standalone `tsx@4.22.4` before the change, now reads `deduped` against the root
declaration, which is the visible form of reason 4 above ("it keeps ONE copy"). `grep -o 'tsx@[0-9.]*'
| sort -u` returns exactly one line, `tsx@4.22.4`; the `invalid` / `missing` / `extraneous` / `UNMET`
marker count is **0**. This is also the discharge of **T-QD5-02**: manifest, lock, and tree agree, so
`npm ci` cannot `EUSAGE` on the five CI jobs.

**G6 — the declared binary resolves and reports the pinned version.**

```
$ npx tsx --version
tsx v4.22.4
node v24.13.0
```

**G7 — RUNTIME PROOF, the acceptance criterion that matters most.** A declared-but-broken executor is
strictly worse than an undeclared working one, so the executor was proven by *running* one of the
seven scripts, not by reading the manifest. `npm run cloudinary:preset` with no arguments:

```
> tsx scripts/cloudinary-preset.ts

FATAL: no mode given. This script does not default to either one.
Usage:
  npm run cloudinary:preset -- --apply     create or update the preset from the declaration
  npm run cloudinary:preset -- --verify    diff the account against the declaration
...
RAW EXIT: 1
```

**Exit 1 is the pass signal, not a failure** — it is the script's own arg-parse hard stop. Reaching
that line proves the full chain: tsx resolved, tsx compiled the `.ts`, and tsx honoured the `@/` alias
to import `@/lib/listing/upload-policy` at `cloudinary-preset.ts:110`, since module load precedes
`main`. The plan's chosen command was used, not a substitute: this path fires every hard stop
*before* `loadFromEnvLocal(CREDENTIAL_KEYS)`, so it opens no socket, reads no `.env.local`, needs no
Cloudinary credentials, and mutates nothing. Each alternative is rejected by the plan by name —
`--apply` mutates live vendor state, `--verify` needs live credentials so its exit 3 would be
ambiguous, `db:seed` / `db:test:setup` are destructive, `email:previews` sends mail, `ops:alerts`
needs a live DB.

**No vitest run, deliberately** — per the plan's `<no_test_run>`. Nothing under `src/` or `tests/`
changed, so a suite run would have tested nothing this task touched while `tests/global-setup.ts`
TRUNCATEd every `public` base table in `fitout_test`. `npm run build` is not a neutral smoke test
here either: it invokes `vitest run --config vitest.design.config.ts` via `package.json:11`.

**Scope fence held.** `git status --porcelain` listed only `package.json`, `package-lock.json`, and
`16.1-SECURITY.md`. Nothing under `src/`, nothing under `scripts/`, no `npx` prefixes, no rewrites of
the other six consumers — declaring the executor *is* the whole fix. `scripts/cloudinary-preset.ts`
was left alone as instructed; its header paragraph describing tsx as an undeclared transitive is now
historically-scoped rather than wrong, and that file is asserted over by a regex-based comment
stripper that has already produced one false RED on that exact header.

## Task 2 — W-3 recorded resolved

A `**W-3 resolved (2026-08-28, quick task `260828-qd5`).**` note now sits beneath the warnings table
in `16.1-SECURITY.md`, in the same format as the existing W-1 note directly above it, carrying the
verbatim `npx tsx --version` output as the record. The W-3 row itself, the threat register, the
phase's closed supply-chain row at `:76`, and the audit-trail counts are untouched — 10 insertions, 0
deletions, and the register-disturbance gate reads **0**.

**One wording adjustment, recorded because it changed a gate result.** The note's first draft
asserted the register was untouched by naming the closed threat by its ID. That literal made the
plan's own `git diff | grep -cE '^[+-].*T-16\.1-SC'` gate return **1** — from a `+` line of new prose,
not from any modification; the file's diff has 0 deletions throughout. Rather than log a benign
false positive and leave the gate permanently poisoned for every future re-run, the sentence was
reworded to make the same assertion by location (`the phase's own closed supply-chain row at :76,
whose closed disposition is unchanged`). The gate reads **0** again and stays a valid mechanical check
on this file.

## Still open — the sibling this task did NOT close

**`yaml` (2.9.0) remains an undeclared transitive, and it runs on the CI path.** It is recorded at
`scripts/verify-workflows.mjs:115-121` with the same shape as W-3: present transitively in
`node_modules`, declared in neither `dependencies` nor `devDependencies`, load-bearing for a step that
gates security invariants. Promoting it is a separate dependency decision on a more sensitive path
and was explicitly out of scope here — noticing it is correct, fixing it here would have been scope
creep. The W-3 resolution note names it explicitly so a future audit reader is not misled by the
symmetry into reading "both handled".

## Deviations from Plan

**No deviation rules fired.** Both differences from the plan's advance predictions are
prediction/observation gaps in the lockfile, not defects in the tree, and both are documented above:
the `devOptional` flag correctly did not flip, and an inert `engines` backfill appeared. Neither
crosses the plan's stop-and-revert threshold (version / package / integrity), so the
`--package-lock-only` output was kept and the hand-edit fallback was not taken.

One observation worth recording for the next person who reaches for this flag: **`npm install
--package-lock-only` still ran the `postinstall` hook** on npm 11.8.0, contrary to the plan's
expectation that it would run no lifecycle scripts. The consequence was nil — `patch-kysely-adapter.mjs`
is marker-guarded and idempotent by construction and reported `patched 0/3 sqlite dialect file(s)`,
i.e. it wrote nothing — but `--package-lock-only` should not be relied on as a
"no lifecycle scripts" guarantee on this npm version.

## Self-Check: PASSED

- `package.json` contains `"tsx": "4.22.4"` between `tailwindcss` and `typescript` — FOUND
- `package-lock.json` root `devDependencies` contains `"tsx": "4.22.4"` — FOUND
- `.planning/phases/16.1-upload-hardening-storage-economy/16.1-SECURITY.md` contains `W-3 resolved`
  and `260828-qd5` and `verify-workflows` — FOUND
- Commit `54cb096` — FOUND in `git log`
- No files deleted by the commit — CONFIRMED (`git diff --diff-filter=D HEAD~1 HEAD` empty)
