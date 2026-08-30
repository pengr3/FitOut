---
quick_id: 260831-9qx
slug: stop-the-e2e-suite-sending-14-real-emails
date: 2026-08-31
status: complete
type: execute
closes: "[17-D28]"
requirements: ["17-D28"]
threats_addressed: ["T-9QX-01", "T-9QX-02", "T-9QX-03", "T-9QX-04", "T-9QX-05"]
commits:
  - 57a85e1  # fix(quick-9qx): the silence + the guard
  - ef8c34a  # docs(quick-9qx): the seam's stale [17-D28] parenthetical
  - d90d528  # docs(quick-9qx): evidence + the closed ledger row
key-files:
  created:
    - tests/design/e2e-email-silence.test.ts
    - .planning/quick/260831-9qx-stop-the-e2e-suite-sending-14-real-email/260831-9qx-EVIDENCE.md
  modified:
    - playwright.config.ts
    - instrumentation.ts          # comment-only
    - .planning/phases/17-cross-cutting-audit-themes-responsive-a11y-baselines/deferred-items.md
    - .planning/STATE.md
  unchanged-by-design:
    - src/lib/email.ts            # byte-identical; the WR-02 production guard at :44-49 untouched
    - .env.local                  # never read, never edited, never deleted
metrics:
  resend_requests_before: 14      # overflow-320: 12, axe-sweep: 2
  resend_requests_after: 0
  real_emails_sent_by_this_task: 0
  deliberate_reds_driven: 4       # plus red-0, the whole file before the fix existed
  duration: ~1h20m
---

# Quick 260831-9qx: stop the e2e suite sending 14 real emails per run, and pin the zero

`[17-D28]` is closed. A full pass of the two census spec files made **14** real
`POST https://api.resend.com/emails` on a live `re_` key; it now makes **0**, and the zero is pinned by
a test in the suite `npm run build` runs, with two independent positive controls proving the counter
was live and the fix is what caused the zero.

## What changed, and the one asymmetry the whole task turns on

`src/lib/email.ts` is **byte-unchanged**, and that is the point rather than a constraint grudgingly
honoured. `instrumentation.ts:20-22` records why unsetting `PAYMONGO_SECRET_KEY` is not a substitute
for an interception: `authHeader()` falls back to `""` and still sends `Basic <base64 of ":">`, so
clearing the credential removes the credential, not the network. **Resend is the exact inverse.**
`src/lib/email.ts:34-35` binds `resend = key ? new Resend(key) : null` at module load and `send()`
returns on the `!resend` branch *before any transport object exists*. For Resend the key **is** the
switch. Two same-looking findings, opposite mechanisms, therefore different correct answers — which is
why this landed as an environment change and not as a second origin folded into the PayMongo seam.

Three edits, plus the records:

1. **`playwright.config.ts`** — `webServer.env: REAL_EMAIL ? {} : { RESEND_API_KEY: "" }`;
   `reuseExistingServer: false` unconditional; `FITOUT_E2E_REAL_EMAIL=1` as the named opt-in with one
   stderr warning naming the **flag**, never the key.
2. **`tests/design/e2e-email-silence.test.ts`** — the two-link guard, each link failable in both
   positions.
3. **`instrumentation.ts`** — comment only. Its parenthetical said silencing Resend was *"a separate
   decision on a separate finding, taken on purpose or not at all."* That decision is taken, in this
   task, so the sentence would have shipped false the moment this landed.

## Why `""` and not an unset — both halves measured, neither guessed

- `webServer.env` **merges over** `process.env` (Playwright 1.60.0), so a key merely omitted inherits
  the operator's live one.
- `@next/env` re-applies a `.env.local` value **only** for keys whose initial value is `undefined`. A
  *deleted* variable would therefore be re-supplied at server boot; `""` is a defined string and
  survives.

Proof it reached the booted server, not just the config object: both after-transcripts open with
`INSTALLED … resend_key_set=no resend_key_len=0`, read from the server process's own environment.

## Why `reuseExistingServer` was deleted rather than detected

`[17-D28]` prescribed *"an environment change plus the assertion that pins it"* and named the trap in
the same breath. That prescription is **not self-enforcing**: under `!process.env.CI`, Playwright adopts
whatever already holds :3000 along with whatever environment it was booted with, so the `env` guarantee
holds only on machines where nothing else happened to be running — and this phase family has been given
false results by that trap twice. A marker-file + pid-liveness detector can itself go vacuous, which is
the failure class this repo keeps paying for. Deleting the adoption case makes the guarantee a **static
property of the config**, readable rather than probed. On CI the trap never existed (`!process.env.CI`
is already `false` there), so this changes local behaviour only, while the exposure that mattered —
real secrets, every push — was never subject to it.

**The cost, stated in the config rather than hidden:** `npx playwright test` now fails loudly when
anything holds :3000. Loud where the old behaviour was silent.

## The measurement — 14 → 0, like for like

Both files driven **alone**, `--project=chromium --workers=1`, `.next` cleared and :3000 confirmed free
before each boot. Full transcripts in `260831-9qx-EVIDENCE.md` § 3.

| spec | § P3 (2026-08-30) | BEFORE (`13dc834`) | AFTER (`57a85e1`) | opt-in |
|---|---|---|---|---|
| `e2e/overflow-320.spec.ts` | 12 | **12** | **0** | not driven |
| `e2e/axe-sweep.spec.ts` | 2 | **2** | **0** | **2** |
| total | 14 | **14** | **0** | — |

The BEFORE column reproduces § P3 exactly, so the before/after is one measurement read twice rather than
a comparison across two. Pass/skip/fail is unchanged in every cell (`overflow-320` 100/7/0,
`axe-sweep` 58/36/0), so no spec silently depended on delivery — as the two that need an emailed token
say in their own headers (`e2e/password-reset.spec.ts:8-10`, `e2e/stale-session-selfheal.spec.ts:44-50`,
the latter naming *"the only strategy that survives `RESEND_API_KEY` being set"*).

**This task sent zero real email, including during measurement.** Both censuses **intercepted**
`api.resend.com` and returned the SDK's success shape rather than delegating. § P3 already paid for the
record that the 14 really left the machine; it was not re-purchased.

## The controls, because a zero is worthless without one

The quick task immediately before this one (`260831-99f`) found a guard that **passed over a tree where
its subject had been deleted**. "Zero emails sent" is exactly that shape, so the mechanism is pinned in
**both** positions and the counter is proved live in **every** transcript:

- **SELFTEST**, in all five transcripts: `SELFTEST GET https://api.resend.com/__census_selftest__ #1`
  → `status=200`, the synthesized census body. Tagged so it is excluded from every per-spec count by
  construction.
- **The opt-in**: `FITOUT_E2E_REAL_EMAIL=1` returned `axe-sweep` to **2** at the same commit as its
  zero, with `resend_key_len=36`. The zero is caused by the fix and by nothing else that changed.
- **The guard's own control**: empty key → **0** captured sends, fake key → **1**. Without the `1`, the
  `0` assertion would stay green on a tree where emails still fly.

### The four watched reds (verbatim failure text in EVIDENCE § 5)

| # | mutation | result |
|---|---|---|
| 0 | the whole file, before the fix existed | 2 failed / 3 passed — both LINK 1 rows; LINK 2 already green |
| (a) | delete the `env` line | 1 failed — *"webServer must declare an env block at all: expected undefined to be truthy"* |
| (b) | restore `reuseExistingServer: !process.env.CI` | 1 failed — *"expected true to be false"* |
| (c) | invert LINK 2's control, `1` → `0` | 1 failed — *"…to have a length of +0 but got 1"* |
| (d) | truthy key in LINK 2's OFF position | 1 failed — the same sentence, from the OFF row |

Red 0's split is the honest one and worth keeping: the *mechanism* was always correct; the *config* was
what had no instrument.

## Deviations from plan

**None of substance.** Three notes, none of which changed a prescribed step:

1. **LINK 1 took the dynamic-import path**, as the plan predicted; the comment-stripped-source fallback
   was not needed. It would also have been strictly worse here — `playwright.config.ts` now discusses
   `RESEND_API_KEY` at length in prose, which makes a raw substring assertion over that file falsely
   green by construction.
2. **The throwaway census produced an Edge-Runtime bundling diagnostic** on each boot (`node:fs` in the
   edge bundle — `register()` returns at guard 2 long before reaching it). It changed no result: every
   drive reports the same pass/skip/fail counts § P3 reports. Recorded in EVIDENCE § 1 rather than
   omitted; gone with the instrument.
3. **The Task 2 commit message was amended twice** — once because its closing line claimed the test
   file would land in a later commit when both files had landed together, and once for a typo in the
   red-0 counts. Both were false records about this task's own work, which is the thing this repo does
   not ship.

**Task 1 produced no commit by design** — its only artefact is a throwaway addition to
`instrumentation.ts`, reverted in Task 3; its numbers live in EVIDENCE § 3.

## Constraints honoured

- `RESEND_API_KEY` **never read, printed, echoed or committed**. Checked by prefix (`re_`) and length
  (36) only, as the census did. The config's opt-in branch emits `{}` and lets the merge inherit the
  value, so neither branch references it — T-9QX-01 satisfied structurally, not by remembering.
- `.env.local` never edited, never deleted.
- `src/lib/email.ts` byte-unchanged (`git diff -- src/` empty); the WR-02 production guard at `:44-49`
  untouched.
- `instrumentation.ts` grew **no** Resend interception — T-9QX-05 avoided by design. Its only change is
  a comment, and the diff contains no non-comment line.

## Final gates

| check | result |
|---|---|
| `npm run test:design` | **69 files, 1275 passed / 3 skipped** |
| `npm test -- tests/security/paymongo-seam.test.ts` (after `rm -rf .next`) | **13 passed** |
| `npm run lint` | **0 errors**, 25 warnings — the pre-existing count, unchanged |
| `git diff -- src/` | empty |
| working tree | clean |

## Ledger

`[17-D28]` carries a dated **RESOLVED** block in the append-only S5 idiom used by 17.1-02 and 17.1-04,
naming the quick id, the commits, the measured zeros, and one sentence on why this row's own prescribed
repair was extended. Everything above it is byte-identical. Invariants re-checked after the splice, all
unmoved: finding headings **28**, each of the four part-labels **28**, level-3 headings **0**. LF
preserved — the diff is +55 insertions / 0 deletions, and the file carries 0 CR bytes. The same CR check
was run on `.planning/STATE.md` (+1 insertion, 0 CR).

## Known stubs

None.

## Self-Check: PASSED

- `playwright.config.ts` — FOUND, contains `FITOUT_E2E_REAL_EMAIL`, `reuseExistingServer: false`,
  `RESEND_API_KEY: ""`
- `tests/design/e2e-email-silence.test.ts` — FOUND, 5 passed
- `260831-9qx-EVIDENCE.md` — FOUND
- commits `57a85e1`, `ef8c34a`, `d90d528` — FOUND in `git log`
- `[17-D28]` RESOLVED block — FOUND in `deferred-items.md`
- STATE.md `260831-9qx` row — FOUND
