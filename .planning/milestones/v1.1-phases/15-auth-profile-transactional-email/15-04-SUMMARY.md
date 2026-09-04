---
phase: 15-auth-profile-transactional-email
plan: 04
subsystem: backend
tags: [email, html-email, escaping, injection, ops-digest, pii, design-gate, fixtures]

# Dependency graph
requires:
  - phase: 15-auth-profile-transactional-email
    plan: 03
    provides: "src/lib/email.ts — 18 of 19 senders on the shell; send(to, subject, html, text)"
  - phase: 15-auth-profile-transactional-email
    plan: 02
    provides: "the two build-blocking email gates, and the recorded &-in-href / extractLink trap"
  - phase: 15-auth-profile-transactional-email
    plan: 01
    provides: "src/lib/email-shell.ts — renderEmail, EmailContent, the one escapeHtml"
provides:
  - "src/lib/email.ts — NINETEEN of nineteen senders composing one shell; zero bare markup builders"
  - "tests/helpers/email-fixtures.ts — one argument list per exported sender, totality-typed; 15-05's preview harness reads the same lists"
  - "tests/auth/email-injection.test.ts — the all-sender injection probe, 141 cases, preheader included"
  - "renderOpsAlertDigest's direct-read PII assertion (its docblock's claim is true for the first time)"
  - "tests/design/site-contacts.test.ts — GUARDED_SITES, a declared inventory the structural trio audits"
affects: [15-05, 15-11, any phase adding a transactional send, any surface that grows a support slot]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A data-table body enters the shell through tableHtml with a matching tableText, both from ONE map over the rows"
    - "A totality-typed fixture module keyed on a union DERIVED from the module's own exported functions — a new sender without a fixture is a compile error"
    - "A source-scanning gate audits a DECLARED INVENTORY of sites with a reason per row, never one hardcoded file — and asserts the walker reached every row before any absence assertion runs"

key-files:
  created:
    - tests/helpers/email-fixtures.ts
    - tests/auth/email-injection.test.ts
  modified:
    - src/lib/email.ts
    - tests/ops/alert-digest.test.ts
    - tests/design/site-contacts.test.ts

key-decisions:
  - "The digest's table keeps `border=\"1\"` and types no colour value: reading the rule token in email.ts would put a second palette reader outside the shell and resolve it against a theme the function is never told"
  - "The runbook paragraphs drop their `<code>` wrappers — under the shell paragraphs are escaped at the choke point, so a `<code>` element would render as visible tag text. Command strings are byte-identical and carried as plain text"
  - "The non-null branch's exactly-one-`mailto:` assertion stays scoped to the APP footer — the shell's guarded mailto is a second SITE, not a second footer entry"

requirements-advanced: []
requirements-completed: [EMAIL-01, EMAIL-02]

# Metrics
duration: ~78 min wall clock across two executor sessions (21:08 → 22:26, 2026-08-24)
completed: 2026-08-24
---

# Phase 15 Plan 04: The Nineteenth Sender Summary

**Nineteen of nineteen transactional sends now compose one shell; one adversarial payload driven
through every string parameter of all nineteen appears nowhere raw in any rendered HTML, preheader
included; and the D-26 support-slot gate audits a declared inventory of two guarded surfaces instead
of the one file it was born scoped to.**

## Execution provenance — read this before the task list

This plan was executed by TWO agents. The first was killed by an API error partway through Task 2's
mutation walk. When execution resumed:

- Tasks 1 and 2 were already **complete and committed** (`57d0ee7`, `bd015f0`, `b9fe3bb`) and were
  NOT re-done.
- The orchestrator found an **un-reverted watched-red mutation** left uncommitted in
  `src/lib/email.ts`: `escapeHtml(r.action)` in `renderOpsAlertDigest`'s table row had been reduced
  to `r.action`. It confirmed the injection probe catches it (a live `<script>` rendered raw into the
  digest HTML, 2 failed / 139 passed), then reverted it with `git checkout -- src/lib/email.ts` and
  re-confirmed 141/141. **`src/lib/email.ts` matches its committed state and every free-text column
  is escaped.**
- The 15-04-SUMMARY.md on disk at that point was an interim durability record marked IN PROGRESS
  (commit `a26d589`). This file replaces it.
- One acceptance criterion of Task 2 was left unmet by the death: the probe's header carried
  `M1 — PENDING`. It has been discharged in this session — see Task 2 below.

## Task Commits

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | The ops digest wears the shell, and its PII guarantee becomes a direct read | `57d0ee7` (feat) | `src/lib/email.ts`, `tests/ops/alert-digest.test.ts` |
| 2 | The shared sender fixtures and the all-sender injection probe | `bd015f0` (test), `b9fe3bb` (fix) | `tests/helpers/email-fixtures.ts`, `tests/auth/email-injection.test.ts` |
| 2 | …its mutation walk finished (M1 was left PENDING by the dead executor) | `f908a21` (docs) | `tests/auth/email-injection.test.ts` |
| 3 | Declare the shell's guarded support site in the contacts inventory | `9ae38da` (test), `a916e0c` (docs) | `tests/design/site-contacts.test.ts` |

## What shipped

### Task 1 — the nineteenth sender

`renderOpsAlertDigest` returns `{ html, text }` from `renderEmail` instead of a hand-built string.
The `<table>` enters through the shell's one **pre-escaped** `tableHtml` slot with a matching
`tableText` plain-text projection, both produced by the SAME map over `rows` so they cannot drift.
Both of the digest's contracts survived:

- **`OpsDigestRow` gained no `meta` field.** The absence is the compile-time enforcement of the D-72
  column rule — re-exporting booking ids, transfer ids or masked last-4s across the email trust
  boundary is a type error at the renderer, not something a reviewer has to notice (T-15-13).
- **The per-field `escapeHtml` calls survived.** The `tableHtml` slot is the one place the renderer
  deliberately does not escape, so those calls are the only thing between ~20 `recordAudit` call
  sites and an operator's inbox (T-15-03). M2 below is the measurement that this is true.

The docblock's claim that "the PII assertion reads this body DIRECTLY rather than only through the
transport" was **false when written** — zero test files imported the renderer. `tests/ops/alert-digest.test.ts`
now imports it (cases 8-11), renders fixture rows, concatenates `html` + `text` and asserts the same
PII sentinels absent. The pre-existing transport-level assertions are untouched and still run; the
two are complementary, and the transport one is what proves the send carries what the renderer built.

**Stated formatting change (recorded, not slipped in):** the runbook paragraphs no longer wrap their
three command strings in `<code>` elements. Under the shell, paragraphs are escaped at the choke
point, so a `<code>` element inside one would render as visible tag text. The command strings are
byte-identical and the angle-bracketed placeholder is carried raw (the renderer escapes it back for
HTML; `text/plain` shows it correctly). An operator email that reads its commands as plain text is
the same house style as the `— AGING` marker.

### Task 2 — the escaping guarantee, proved rather than sampled

`tests/helpers/email-fixtures.ts` (514 lines) declares one argument list per exported sender, keyed
on a union **derived from the email module itself**, so a twentieth sender without a fixture fails
`tsc`. Every instant is an absolute literal. 15-05's `scripts/send-email-previews.ts` reads the same
lists — it is built once, and the header says so.

`tests/auth/email-injection.test.ts` (347 lines) drives ONE payload carrying all five
HTML-significant characters, a `<script>` element and an attribute-breaking quote sequence through
every string parameter of all nineteen senders: **141 cases**. Each asserts the payload nowhere raw
in the HTML, the escaped form present (so the probe cannot pass by rendering nothing), a length floor
on the document, and the plain-text twin carrying the payload raw — which is correct and is
deliberately NOT asserted against. The string set is **walked out of** each argument list rather than
declared beside it, so a fixture and its probe cannot disagree.

The preheader region is **derived, not a fixed 300-character slice**: the escaped payload first
appears at index 133 inside the `<title>`, and the preheader's own copy begins past 400. A fixed
slice would have been reading the title and calling it the preview line.

**Mutation walk (finished this session — `f908a21`):**

- **M1 — the preheader loses its escape.** `escapeHtml(content.preheader ?? content.heading)` in the
  shell reduced to the bare expression. **3 failed | 138 passed (141).** Both the derived and the
  explicit-override routes into the sink failed independently, and the guard-the-guard failed too:
  `expected 1437 to be less than 845` — with the preheader unescaped, the first escaped occurrence
  moves out of the preview line entirely and lands in the body. A probe that only asserted absence
  would have been satisfied by a region that had quietly stopped being the preheader.
- **M2 — the digest's free-text column loses its escape.** `${escapeHtml(r.action)}` → `${r.action}`.
  **2 failed | 139 passed (141)**, with a live `<script>` element visible inside the digest table in
  the failure output, and both rows failing independently. This is the same mutation that was found
  uncommitted in the tree at resume; it was re-applied deliberately, watched red, and reverted.

Both reverted; `git diff --exit-code src/` clean after each; 141 passed after each. The REDs are
quoted verbatim in the probe's header.

### Task 3 — the contacts gate audits an inventory, not a file

`tests/design/site-contacts.test.ts` declares `GUARDED_SITES`: two rows, each keyed by file with a
reason over 40 characters — the app footer (its shipped reason written out rather than implied) and
`src/lib/email-shell.ts` (the same D-26/D-64 slot on the surface a person meets FitOut on, lit by the
same one line in `src/lib/site.ts`, with 15-CONTEXT D-161's re-confirmation of the null state). The
three structural assertions — exactly one `SUPPORT_EMAIL` conditional, no else-branch, no
address-shaped literal — now iterate the inventory rather than naming `FOOTER`.

**Nothing was weakened.** The null branch's four whole-tree assertions, the non-null branch's
exactly-one-footer-`mailto:` assertion (still scoped to the APP footer — the shell's guarded
`mailto:` is a second SITE, not a second footer entry), `EXCLUDED_ADDRESSES` and its stale-row check,
the `MIN_FILES` floor, the Resend-sender row and all nine synthetic-fixture cases are unchanged in
behaviour.

A **guard-the-guard for the new row** was added, because a structural assertion over a file the
walker never opened reports a clean result forever: every declared row must appear in `scan.walked`,
read as a non-trivial source, and name the constant.

**Watched red (both recorded verbatim in the file's changelog as (e) and (f)):**

- **(e)** an else-branch added to the shell's support guard → **2 failed | 26 passed | 3 skipped**.
  The structural failure is the one this plan bought; the second failure (the whole-tree `Support`
  label assertion) only fired because the drift happened to carry the word "Support" — a greyed entry
  reading "Contact us shortly" would have been invisible to it and caught by the structural one.
- **(f)** the new row re-pointed at `src/lib/email-shell-nope.ts` → **2 failed | 26 passed |
  3 skipped**. The other two rows of the trio **passed over the unreached file**, which is exactly
  the vacuity the reach assertion exists to close.

Both greens re-measured after the change: **28 passed | 3 skipped (31)** with `SUPPORT_EMAIL === null`
and **25 passed | 6 skipped (31)** with it set and the link rendered (23|3 and 20|6 of 26 before).
The counts moving together is the visible proof the five new tests run in both states.

## Verification

| Check | Result |
| ----- | ------ |
| `npx tsc --noEmit` | exit 0 |
| `npm run test:design` | 52 files, **882 passed / 3 skipped (885)**, exit 0 |
| `npx vitest run tests/design/site-contacts.test.ts --config vitest.design.config.ts` | **28 passed / 3 skipped (31)**, exit 0 |
| `npx vitest run tests/auth/ tests/booking/ tests/notifications/ tests/ops/` | 78 files, **944 passed (944)**, exit 0 |
| `npx vitest run tests/auth/email-injection.test.ts` | **141 passed (141)**, exit 0 |
| `git diff --exit-code cb59605 HEAD -- tests/auth/email-escaping.test.ts tests/auth/email-dev-fallback.test.ts tests/booking/notify-emission.test.ts tests/helpers/mocks.ts` | exit 0 — the four files the plan forbids touching are byte-identical to the pre-plan baseline |
| `grep -c '<p><strong>' src/lib/email.ts` | **0** — no bare markup builder survives |
| `grep -c 'renderEmail(' src/lib/email.ts` | **20** (19 senders + the import) |
| `grep -c 'escapeHtml' src/lib/email.ts` | **12** — the digest's per-field calls survive |
| `grep -c 'email-shell' tests/design/site-contacts.test.ts` | **11** |
| `grep -c 'you@example.com' tests/design/site-contacts.test.ts` | **4**, identical to its pre-plan value — the three auth placeholder rows were not touched |
| `grep -c 'onboarding@resend.dev' tests/design/site-contacts.test.ts` | **3** — the sender row survives |
| Consumer modules in `git diff --name-only cb59605 HEAD` | none — only `src/lib/email.ts`, four test files and this summary |

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 — Blocking] The injection probe's mutation walk was left `M1 — PENDING`.**

- **Found during:** Task 3 close-out, reading the committed Task 2 artefacts.
- **Issue:** Task 2's acceptance criterion "the test header records the preheader-escape mutation
  with its RED output quoted verbatim" was unmet — the first executor died mid-walk, and the file
  shipped with a literal `M1 — PENDING` placeholder. A committed anti-vacuity record that says
  PENDING is a hole a reader has no way to distinguish from a walk that was done and not written up.
- **Fix:** ran the plan-prescribed preheader mutation (M1) and the digest-column mutation the dead
  executor had left in the tree (M2), recorded both REDs verbatim, reverted both, confirmed
  `git diff --exit-code src/` clean and 141/141 after each.
- **Files modified:** `tests/auth/email-injection.test.ts` (comment header only).
- **Commit:** `f908a21`.

### Stated, not incidental

- The `<code>`-wrapper removal in the digest's runbook paragraphs — see Task 1 above. Command strings
  byte-identical; the reason is that paragraphs are escaped at the shell's choke point.

### Benign grep-vs-source collision (no action taken)

Task 2's acceptance criterion `grep -c 'new Date()' tests/helpers/email-fixtures.ts` returns **1**,
not 0. The single occurrence is at line 44, inside the comment that **forbids** it:
`⚠ EVERY INSTANT BELOW IS AN ABSOLUTE LITERAL. Never new Date() — the Phase-14 rule that geometry and
fixtures never seed from the clock.` Every fixture instant is an absolute literal; the criterion's
intent is satisfied and its grep is the proxy that missed. This is the twelfth instance of the
grep-versus-source collision this repo has recorded, and the fix is not to delete the warning.

## Requirements closed

- **EMAIL-01** — all nineteen existing sends render through one shared branded shell, and no send
  trigger moved (the four trigger-witness test files are byte-identical to the pre-plan baseline).
- **EMAIL-02** — email colour values come from the generated token module, enforced by
  `tests/design/email-tokens.test.ts`; Task 1's one decision (the digest table types no colour value)
  exists precisely so a second palette reader does not appear outside the shell.

**EMAIL-03 remains open** and is 15-05's real-client inbox walk. Nothing in this plan proves an inbox
renders anything.

## Known Stubs

None.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or schema change; the surfaces this
plan touched are all inside the `<threat_model>`'s declared boundaries.

## Notes for the verifier

- **Phase completion is not claimed.** Neither the ROADMAP phase checkbox nor phase status was
  touched.
- The `human_needed` D-26 item (FitOut still owns no support inbox) is unchanged and now has a second
  declared surface waiting on the same one-line edit in `src/lib/site.ts`.
</content>

## Self-Check: PASSED

All five claimed files exist on disk; all six claimed commits resolve in `git log --all`.
