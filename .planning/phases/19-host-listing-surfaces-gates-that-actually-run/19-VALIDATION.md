---
phase: "19"
slug: "host-listing-surfaces-gates-that-actually-run"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-04"
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `19-RESEARCH.md` § Validation Architecture (line 2136). Read that section for the
> full signal spec and its MEASURED / DERIVED / UNPROVEN tags — this file is the sampling contract,
> not a replacement for it.

---

## ⚠ Read this before writing any HSURF-01 assertion

**The three most obvious validation signals are ALREADY GREEN against the defect** (MEASURED):

| Obvious signal | Why it passes on the broken tree |
|---|---|
| A document-level overflow scan (`expectNoOverflow`) | `Card` carries `overflow-hidden` (`ui/card.tsx:15`) — the overrun is **clipped**, never painted outside |
| `document.scrollWidth === document.clientWidth` at 320px | same reason — nothing escapes the card, so the document never scrolls |
| "every card in a row reports the same `offsetHeight`" | the grid sets **no `align-items`** (`page.tsx:180`), so items already stretch — the boxes are already equal |

`e2e/overflow-320.spec.ts` passes on `/host/listings` **today, with the defect shipped**. A
validation plan built on any of those three measures nothing and reports success.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x (unit/design) + Playwright 1.60.0 (e2e, exact pin) |
| **Config file** | `vitest.config.ts`, `vitest.design.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npx vitest run <targeted test file>` |
| **Full suite command** | `npx vitest run` then `npx playwright test --project=chromium` |
| **Estimated runtime** | vitest full ~immediate-to-minutes; **e2e full-suite wall-clock is UNMEASURED — measuring it is CI-01's own deliverable (D-13)** |

⚠ **Gates run alone** (standing project rule). Worktrees are OFF, so plans run sequentially on `dev`.

---

## Sampling Rate

- **After every task commit:** the task's own `<automated>` command
- **After every plan wave:** `npx tsc --noEmit` + the design suite for touched surfaces
- **Before `/gsd-verify-work`:** full vitest suite green, and both HSURF-01 guards watched red then green
- **Max feedback latency:** targeted vitest < 60s; the e2e guards are the slow path and are sampled per wave, not per task

---

## Per-Task Verification Map

*Seeded as draft — the planner fills task IDs when plans are written.*

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| TBD | 01 | 1 | CI-01 | ci | watched-red on a deliberately failing spec | ⬜ pending |
| TBD | 01 | 1 | CI-01 | ci | `RESEND_API_KEY` fail-closed assertion, own watched red | ⬜ pending |
| TBD | 02 | 2 | HSURF-01 | e2e | guard A (card-bottom − footer-bottom ≤ 1px) at 3 bands | ⬜ pending |
| TBD | 02 | 2 | HSURF-01 | e2e | guard B (`scrollWidth ≤ clientWidth` on `[data-slot="card-footer"]`) | ⬜ pending |
| TBD | 02 | 2 | HSURF-01 | e2e | `e2e/overflow-320.spec.ts` still green (regression, not proof) | ⬜ pending |
| TBD | 03 | 3 | HSURF-02 | manual+e2e | production-build probe (H2b), then the D-11 guard | ⬜ pending |

---

## Per-Requirement Signals

### HSURF-01 — the grid renders honestly

- **Signal A** — `card.getBoundingClientRect().bottom − footer.getBoundingClientRect().bottom ≤ 1px`.
  The designed gap is exactly `0` (`Card` carries `has-data-[slot=card-footer]:pb-0`); the 1px is
  sub-pixel tolerance, **not chosen slack — do not widen it**.
- **Signal A′** — all cards sharing a row report one distinct `bottom`. Already true; kept as a
  **vacuity companion**, not as proof.
- **Signal B** — `scrollWidth ≤ clientWidth` on `[data-slot="card-footer"]` **itself**. The one
  signal `overflow-hidden` cannot mask.
- **Bands:** `320×800` (1 col, A′ skipped), `700×900` (2 col), `1280×900` (3 col). Widths are
  deliberately **off** the `sm`/`lg` breakpoints so a 1px rounding difference cannot change the
  column count and make a failure unreadable. Resize + `document.fonts.ready`, do not re-navigate.
- **Fixture is part of the validation:** ≥2 cards in the measured row must have **different content
  heights**, or signal A is green on the broken tree and measures nothing.
- **⚠ Vacuity check is MANDATORY:** both guards watched failing against the pre-fix tree, failure
  messages recorded verbatim. If A is green before the fix lands, that is a **fixture defect**, not a
  satisfied requirement.

### HSURF-02 — creating a listing lands on the wizard

Split three ways, because the failing process no longer exists:

- **H2a — NOT CLOSEABLE.** That `rm -rf .next` + restart resolves it cannot be validated: the wedged
  dev server is gone. Record as unclosed; do **not** manufacture a reproduction.
- **H2b — CLOSEABLE, and must be closed.** The production-build probe (`next build && next start`,
  with `PLATFORM_WALLET_NUMBER` / `PLATFORM_WALLET_NAME` inline or it 500s) over the eleven-URL probe
  set.
- **H2c — RECORDED REFRAMING, never a cause.** The mtime evidence (compiled artifact `Sep 3 15:18`,
  session markers `18:09`, manifest `19:33`) reframes the manifest as a per-session incremental
  ledger. **No cause is named in any docblock.** Archive `.next/dev` evidence *before* any
  `rm -rf .next`.
- **The D-11 guard** must go red if a host-facing route stops resolving, **for the right reason and
  quickly**. `e2e/axe-sweep.spec.ts:311-315` does not count as validation of this requirement: it
  goes red after 60 seconds with a message about *fixtures* — coverage without diagnosis, which is
  the exact cost D-11 exists to stop paying.

### CI-01 — the gates run

- **Primary signal: watched red.** Proven by watching one spec fail in a real run — **never** by
  reading the workflow file. This is success criterion 4.
- **Measured dependency:** `npm run db:seed`, which `gate-price-parity` does not have. Five specs
  fail against an empty catalogue and say so in their own failure messages.
- **The `RESEND_API_KEY` fail-closed assertion is its own signal with its own watched red** — assert
  it fires when the key is set, not merely that the line exists.
- **Wall-clock is MEASURED AND RECORDED, not asserted against a threshold.** No sharding decision is
  validated in this phase.

---

## Wave 0 Requirements

- [ ] A `/host/listings` e2e fixture guaranteeing ≥2 cards per row with **different content heights**
      (a titleless draft, a published listing with no weekly hours, and a title that wraps at 320px)

*Everything else is covered by existing infrastructure: Vitest, the pinned Playwright, the design
suite, and the four existing CI jobs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| The production-build probe (H2b) | HSURF-02 | Needs a real `next build && next start` with wallet env inline; no CI job builds and probes routes | Run the eleven-URL probe set from `19-RESEARCH.md` § 1.1 under a production build; record all eleven status codes |
| The `.next/dev` evidence archive | HSURF-02 | One-shot capture of a state `rm -rf .next` destroys | Run the four archive commands from § 1.0 **before** any clean |
| Watched-red for the CI job and the mail-key assertion | CI-01 | A gate that has never been seen failing is a rubber stamp | Push a deliberately failing spec, observe the run go red, revert |

---

## Negative Space — what this phase deliberately does NOT validate

- **The 404's root cause.** Reframed and recorded; no cause named without evidence.
- **Anything under `(ops)`** — phases 20 and 22.
- **The e2e full-suite wall-clock against a threshold** — measured and recorded only; sharding is a
  later decision that needs the number first.
- **That deleting the four orphan drafts is safe in any *production* database.** D-01's window and
  host id are **local** facts. Open PM question, raised not assumed.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 fixture produces genuine height variation (vacuity check passed)
- [ ] Both HSURF-01 guards watched RED before the fix, GREEN after — messages recorded verbatim
- [ ] CI job and mail-key assertion each watched red
- [ ] No watch-mode flags
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
