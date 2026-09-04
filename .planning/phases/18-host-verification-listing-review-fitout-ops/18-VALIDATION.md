---
phase: 18
slug: host-verification-listing-review-fitout-ops
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-01
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> **The authoritative Req→Test map is `18-RESEARCH.md` § Validation Architecture** (29 rows, each
> with its automated command and its file-exists status). This file is the contract; that table is
> the detail. Do not maintain two copies of it — cite it.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.8 — **two deliberately disjoint configs** |
| **Config file** | `vitest.config.ts` (integration/unit/component; `globalSetup` + `setupFiles`; requires Docker Postgres) |
| **Config file (design)** | `vitest.design.config.ts` (**no** `globalSetup`, **no** `setupFiles`; DB-free by design) |
| **Quick run command** | `npx vitest run <file>` |
| **Quick run (design)** | `npx vitest run --config vitest.design.config.ts <file>` |
| **Full suite command** | `npm test` (192 files) |
| **Full design suite** | `npm run test:design` (71 files) |
| **Build gate** | `npm run build` = `lint` + full design suite + `next build` |
| **E2E** | `npm run test:e2e` (36 specs) — **NOT a gate** (D-24); a one-time audit result |
| **Estimated runtime** | `npm test` ~3–5 min · `npm run test:design` ~1 min · `npm run build` ~4 min |

### ⚠ Serialisation is mandatory — this is a correctness rule, not a preference

`tests/global-setup.ts:83-90` TRUNCATEs the shared test database at run start. `npm test`,
`npm run test:design` and `npm run build` **destroy each other's data** when run concurrently **or
back-to-back**. The resulting failure is convincing and misleading — reds spread across money and
booking files the current work never touched.

- Run one at a time. Let each fully exit before starting the next.
- **Never trust the first red immediately after a build.** Re-run the suite **alone** before
  investigating anything.
- `tests/design/*` must carry `--config vitest.design.config.ts`. The bare form exits 1 with
  "No test files found", which is **indistinguishable from a real gate failure** — and on a watched
  red it gives you the exit code you predicted for entirely the wrong reason.

---

## Sampling Rate

- **After every task commit:** the single file(s) that task touched — `npx vitest run <file>`
  (design tasks: with `--config vitest.design.config.ts`). Never both configs in one command.
- **After every plan wave:** `npm test` **alone**, then `npm run test:design` **alone**, in that
  order, never concurrently.
- **Phase gate:** `npm run build` green → `npm test` green → `/gsd-verify-work`.
- **Max feedback latency:** ~60 s per-task, ~5 min per-wave.

### Schema-push gate (Drizzle)

Schema-relevant files are in scope (`src/lib/db/schema.ts`, `drizzle/**`), so a **[BLOCKING]** task
must run the migration after all schema edits and **before** verification.

**Command: `npm run db:migrate`** (`drizzle-kit migrate`) — **NOT `drizzle-kit push`.**
This project uses generated-then-hand-edited migration SQL (exclusion constraints, PostGIS, constraint
swaps that Drizzle cannot express). `push` bypasses the migration ledger and desyncs dev from the
files that are the actual source of truth. Build and type checks pass **without** the migration —
types come from the schema file, not the live database — so skipping it produces a false-positive
verification state.

⚠ **PG `55P04` asymmetry (research F3):** `ALTER TYPE … ADD VALUE` on an already-committed enum cannot
be *used* in the same transaction, and both migrators wrap all pending migrations in one transaction.
A 55P04 defect **passes the full suite and a fresh-DB migrate, and fails only in production.** Adding
`'ops'` to `cancelled_by` (D-244) is safe only because nothing writes it at migration time.

---

## Per-Task Verification Map

**Task IDs are assigned at plan time.** The requirement→behaviour→command mapping is fixed now and
lives in `18-RESEARCH.md` § Validation Architecture § "Phase Requirements → Test Map" (29 rows).
Each plan MUST cite the rows it discharges by requirement ID.

| Requirement | Instruments | Status |
|---|---|---|
| OPS-01 | `tests/auth/ops-role.test.ts` ❌ W0 · `tests/ops/grant-cli.test.ts` ❌ W0 | ⬜ pending |
| OPS-02 | `tests/ops/staff-guard.test.ts` ❌ W0 · `tests/design/ops-guard-coverage.test.ts` ❌ W0 · **manual status-line audit** | ⬜ pending |
| OPS-03 | `tests/ops/ops-audit.test.ts` ❌ W0 | ⬜ pending |
| OPS-04 | `tests/ops/queue-query.test.ts` ❌ W0 · `tests/design/loading-coverage.test.ts` ✅ (**will go RED until pinned counts move**) | ⬜ pending |
| OPS-05 | `tests/ops/reject-reason.test.ts` ❌ W0 | ⬜ pending |
| HVER-01 | `tests/ops/verification-port.test.ts` ❌ W0 | ⬜ pending |
| HVER-02 | `tests/ops/verification-schema.test.ts` ❌ W0 (`information_schema` allow-list) | ⬜ pending |
| HVER-03 | `tests/listing/bookability.test.ts` ✅ extend (29 assertions) | ⬜ pending |
| HVER-04 | **doc review — `checkpoint:human-verify`, not a test** | ⬜ pending |
| HVER-05 | `tests/listing/verification-badge.test.tsx` ❌ W0 · `tests/design/trust-signals.test.ts` ✅ considered edit | ⬜ pending |
| LVER-01 | `tests/search/bookable-gate.test.ts` ✅ extend (**5→14 fixtures, 3→8 hosts, 1→3 passing members**) · `tests/booking/state-machine.test.ts` ✅ own anchor · `tests/booking/open-capacity-hold.test.ts` ✅ own **separate** anchor | ⬜ pending |
| LVER-02 | `tests/listing/status-gate.test.ts` ✅ · `tests/design/soft-404-status.test.ts` ✅ · `tests/design/og-routes.test.ts` ✅ (**the third leak surface — D-247**) | ⬜ pending |
| LVER-03 | `tests/listing/material-edit.test.ts` ❌ W0 (**including the photo case — D-242**) | ⬜ pending |
| LVER-04 | `tests/ops/grandfather-backfill.test.ts` ❌ W0 (**must read the `UPDATE` from the migration file on disk**) | ⬜ pending |
| ENF-01 | `tests/listing/bookability.test.ts` + `bookable-gate` + `state-machine` ✅ (extended) | ⬜ pending |
| ENF-02 | `tests/payments/payout-suspension-freeze.test.ts` ❌ W0 — **both halves**, including the negative (a `processing` row on a suspended host still alerts) | ⬜ pending |
| ENF-03 | `tests/payments/ops-cancel.test.ts` ❌ W0 — refund basis under the constant, **no** `host_cancel_fee` row, `retained_space_cents = 0`, sweep excludes, and **no** `booking_cancelled_by_host` notification | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

No framework install needed — Vitest, both configs, and the isolated-schema harness all exist.

- [ ] `tests/ops/staff-guard.test.ts` — OPS-02
- [ ] `tests/ops/ops-audit.test.ts` — OPS-03
- [ ] `tests/ops/verification-schema.test.ts` — HVER-02 (column-set allow-list)
- [ ] `tests/ops/verification-port.test.ts` — HVER-01 (unknown provider must fail CLOSED)
- [ ] `tests/ops/grandfather-backfill.test.ts` — LVER-04
- [ ] `tests/ops/queue-query.test.ts` — OPS-04
- [ ] `tests/ops/reject-reason.test.ts` — OPS-05
- [ ] `tests/ops/grant-cli.test.ts` — OPS-01
- [ ] `tests/auth/ops-role.test.ts` — OPS-01 (escalation half)
- [ ] `tests/listing/material-edit.test.ts` — LVER-03
- [ ] `tests/listing/verification-badge.test.tsx` — HVER-05
- [ ] `tests/payments/payout-suspension-freeze.test.ts` — ENF-02
- [ ] `tests/payments/ops-cancel.test.ts` — ENF-03
- [ ] `tests/design/ops-guard-coverage.test.ts` — OPS-02 structural (AST walk)
- [ ] **Shared fixture:** `makeVerifiedHost()` in `tests/helpers/seed.ts`, so the 19-file sweep (D-248)
      converges on one expression instead of nineteen hand-edits

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|---|---|---|---|
| Ops route status line: staff→200, non-staff→404, signed-out→404, nonexistent `/ops/xyz`→404 | OPS-02 | **No automated instrument in this repo can read an HTTP status line** (`tests/design/soft-404-status.test.ts:31-39` says so in its own words). A dev-server reading does not settle it — the Suspense/`loading.tsx` boundary commits 200 before a page-level `notFound()` runs, so this must be measured under a production build. | `npm run build` → `node ./node_modules/next/dist/bin/next start -p 3100` → four `curl -o /dev/null -w '%{http_code}'` readings. Record the transcript the way `17.1-EVIDENCE.md § P1` records its four. |
| `18-KYC-VENDOR-COMPARISON.md` covers its six required dimensions and reads as a **fork**, not a matrix | HVER-04 | A document deliverable for the PM. Tonal model is `src/lib/payments/refund-rail.ts:1-33` — a verdict settled by observed behaviour with the raw responses quoted. | Doc review at phase close. `checkpoint:human-verify`. |

---

## Notes carried from research that change how validation is read

- **`recordAudit` swallows its own insert failure by design** (`src/lib/audit.ts:104-110`). OPS-03
  therefore **cannot** be verified by an action returning `ok` — the audit row must be **read back**.
  For the same reason the ops queue must read the domain tables (`listing_review`,
  `host_verification`), **never** `audit`.
- **`setupTestDb()` replays into an empty schema**, so the D-240 grandfather backfill is a no-op in
  all 192 test files. LVER-04's test must read the `UPDATE` statement from the migration file on disk.
- **`tests/search/bookable-gate.test.ts` currently has ONE passing member** in its set-equality. A
  set-equality with one member on each side is a much weaker instrument than it looks; growing it to
  three is part of the requirement, not polish.
- **`tests/design/loading-coverage.test.ts` will go RED** the moment an `/ops` page lands, until its
  pinned constants move. That red is expected and is the gate working.
- **19 test files + 14 non-Vitest seed sites** hand-build a bookable host and go dark when the sixth
  gate term lands. Per D-248 they move in the **same commit** as the gate change.
