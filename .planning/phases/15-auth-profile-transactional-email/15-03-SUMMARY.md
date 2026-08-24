---
phase: 15-auth-profile-transactional-email
plan: 03
subsystem: backend
tags: [email, html-email, transactional, escaping, resend, plain-text, refactor]

# Dependency graph
requires:
  - phase: 15-auth-profile-transactional-email
    plan: 01
    provides: "src/lib/email-shell.ts — renderEmail(content) => { html, text }, EmailContent, and the repository's one escapeHtml"
  - phase: 15-auth-profile-transactional-email
    plan: 02
    provides: "tests/design/email-shell.test.ts + email-tokens.test.ts — the two build-blocking gates that judge every adopter, and the recorded &-in-href / extractLink trap"
provides:
  - "src/lib/email.ts — 18 of 19 senders composing one shell behind an unchanged send() contract"
  - "send(to, subject, html, text) — the transport carries a plain-text part to Resend"
  - "renderEmail's first eighteen callers; the shell is no longer dead code"
  - "The plain-text twin as the honest place to assert email COPY (the copy() helper in notify.test.ts)"
affects: [15-04, 15-05, any phase adding a transactional send]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A sender states an EmailContent with RAW interpolations; the shell escapes every sink at one choke point"
    - "Copy assertions read the plain-text twin, which is projected from the same value with raw strings — the HTML part entity-encodes apostrophes"
    - "An absence assertion over escaped markup is unfailable; move it to the twin AND make the reader throw when the twin is missing"
    - "Measure a constant against the five escaped characters before routing it through an escaper on a money path"

key-files:
  created: []
  modified:
    - src/lib/email.ts
    - tests/notifications/notify.test.ts

key-decisions:
  - "sendOpsAlertDigest (row 19, plan 15-04's) passes its SUBJECT as an interim plain-text part: the transport change forces a fourth argument at all nineteen call sites, and deriving one from an existing string invents no operator copy"
  - "Copy assertions moved to email.text rather than to the entity-encoded HTML form: the twin carries the sentence verbatim, and one WR-04 absence guard had become literally unfailable in the HTML"
  - "The verification and reset bodies are paragraphs: [] — the AUTHFB-01 boundary written in code, recorded on the sender itself so the next reader does not have to re-derive it"

patterns-established:
  - "Docblocks that named WHERE escaping happens were amended, not deleted: the contract sentence stays and gains 'at the shell's one choke point since 15-03'"
  - "A conversion that changes a money-path disclosure's rendering must MEASURE the constant, quote the value, and record the result"

requirements-advanced: [EMAIL-01, EMAIL-02]
requirements-completed: []

# Metrics
duration: 24min
completed: 2026-08-24
---

# Phase 15 Plan 03: Eighteen Senders Adopt the Shell Summary

**Eighteen of nineteen transactional sends now state their message as an `EmailContent` and let one renderer decide markup, palette, plain-text twin and escaping — with every subject, recipient, argument list and trigger byte-identical, proved by a trigger-graph test that was never touched.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-08-24T12:11Z (20:11 +08:00)
- **Completed:** 2026-08-24T12:35Z (20:35 +08:00)
- **Tasks:** 3 (+2 auto-fix commits)
- **Files modified:** 2 (`src/lib/email.ts`, `tests/notifications/notify.test.ts`)

## Accomplishments

- **The transport carries both parts.** `send` is now `(to, subject, html, text)` and the options object
  handed to Resend is `{ from, to, subject, html, text }`. Type-valid on the first try — the
  `RequireAtLeastOne` member that requires `html` leaves `text` optional-and-present.
- **The WR-02 guard is provably untouched.** The comment block, the production `console.error`
  sentence, the early `return`, and the `[email:dev] to=… \n html` line are byte-identical.
  `email-dev-fallback.test.ts` passes with **zero** edits, and so does `email-escaping.test.ts`.
- **Escaping moved to the choke point without moving the guarantee.** All nineteen senders' per-field
  `escapeHtml` locals are gone except `renderOpsAlertDigest`'s 82 (its output enters through the one
  pre-escaped slot). The repository still declares **exactly one** `escapeHtml`
  (`src/lib/email-shell.ts:102`), and the WR-01 escaping regression passes unedited.
- **`<p><strong>` went 18 → 1.** The single survivor is `renderOpsAlertDigest`'s, which plan 15-04
  owns. `grep -c 'renderEmail('` is **19** (17 senders + `sendGuestRsvpEmail`'s two branches).
- **The money-path disclosure was measured, not assumed** — see the section below.
- **Nothing a caller can see moved.** Zero consumer modules in the diff
  (`src/lib/auth.ts`, `src/inngest/functions/notify.ts`, `guest-email.ts`, `ops-alert-digest.ts` all
  clean), every subject template literal still interpolates the same **raw** value it always did, every
  parameter name is unchanged, and `sendGuestRsvpEmail` keeps its `Promise<{ sent: true }>` and both
  `await`s. `tests/booking/notify-emission.test.ts` passes byte-unchanged.
- **Suite state:** `npx tsc --noEmit` exit **0**. `npm test` **180 files / 1892 passed, 2 files +
  5 tests skipped** — identical to the Wave-2 baseline. `npm run test:design` **52 files / 877 passed,
  3 skipped**. `npm run lint` **0 errors, 25 warnings** (all pre-existing; none in either changed file).

## The `ALL_RAILS_REFUND_WINDOW` measurement (T-15-11)

The plan required this to be measured before `sendRefundIssued` was converted, because under the shell
that sentence becomes a `paragraphs` entry and the renderer escapes it — and a silently entity-encoded
character inside a refund-window disclosure is a change to a money-path contract, not a copy nit.

**The value, quoted in full:**

> `Refunds to GCash and Maya are usually back within 24 hours; a card can take up to 30 days, depending on your bank.`

**Result: it contains NONE of the five HTML-significant characters** (`&`, `<`, `>`, `"`, `'`) — measured
by set-differencing the string against those five, which returned an empty set — and
`escapeHtml(value) === value` is **true**. The rendered sentence is therefore **byte-identical** to the
one that shipped, and the conversion was safe. The finding is recorded on `sendRefundIssued`'s own
docblock, together with the instruction to measure again if that constant ever gains such a character.

The `import { ALL_RAILS_REFUND_WINDOW }` line and its D-92 comment are unmoved
(`grep -c` returns 3, exactly the baseline: the comment, the import and the interpolation).

## Task Commits

1. **Task 1: the transport gains a plain-text part; the two auth sends adopt the shell** — `cb26f72` (feat)
2. *(interim summary, durability checkpoint)* — `40e7811` (docs)
3. **Task 2: the eight booking and request sends adopt the shell (rows 3-10)** — `85ceeda` (feat)
4. **Deviation 1: assert email copy on the plain-text twin** — `4e25bea` (fix)
5. **Task 3: the refund, reminder, group and guest sends adopt the shell (rows 11-18)** — `008ced0` (feat)
6. **Deviation 1 (second site): the group-RSVP `can't make it` assertion** — `74e539c` (fix)

**Plan metadata:** see final commit (docs: complete plan)

## Files Created/Modified

- `src/lib/email.ts` **(modified, 681 lines)** — `send` gains `text`; eighteen senders compose
  `renderEmail`; `renderOpsAlertDigest` and its `<table>`/`<tr>` builders are byte-identical. Three
  block headers amended where they stated that per-field escaping happens *in this file* (the contract
  sentence stays, the location is corrected). Docblocks carrying contracts this conversion does not
  touch — CR-02's no-deadline rule, D-96/D-99's pre-composed labels, CR-01's null-fee omission, the
  D-J3Z-02 `meta`-absence block, D-83's "no fire-and-forget" rule — all survive.
- `tests/notifications/notify.test.ts` **(modified — deviation, see below)** — a `copy()` reader plus
  five assertions repointed at the plain-text twin.

## Decisions Made

- **`paragraphs: []` for the two auth sends, and the reason written on the sender.** The shipped body
  was `Verify: <a href="…">…</a>` — a raw URL as its own visible label, which a shell button cannot
  carry. Replacing it with a labelled CTA is this phase's ONE email copy change. An expiry line, an
  explanation sentence or an "if you didn't request this" line would be **AUTHFB-01**, which stays in
  the backlog by standing choice. **No roadmap amendment is proposed**: the shell does make that copy
  near-free to add, but "cheap to build" was never the reason AUTHFB-01 was deferred, and the CTA label
  change already removes the specific ugliness (a bare token URL as link text) that made the old body
  read as unfinished.
- **`sendRequestDeclined` branches the heading and the sentence, never the document.** Both wordings and
  both branches survive byte-identical; `APP_URL` and its root-relative fallback are unmoved.
- **`sendGuestRsvpEmail` builds two `EmailContent` values, not one parameterised value.** The cancelled
  variant is not a variant of the confirmed one at the string level — different heading, different
  sentence, different subject — and flattening them would quietly merge copy the spec pins separately.
- **Copy assertions read the twin, not the entity-encoded HTML.** Alternatives considered: assert
  `You&#39;re getting…` in the HTML (unreadable, and pins a rendering detail as though it were copy), or
  decode the HTML in the test (a second, test-only escaper — exactly the drift WR-01's one-owner rule
  exists to prevent). The twin is projected from the same `EmailContent` with the **raw** strings, so it
  is the same claim stated where it is legible.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking / Rule 1 - Bug] Five copy assertions in `notify.test.ts` — two red, one of them a guard that had become unfailable**

- **Found during:** Task 2 (three sites) and Task 3 (a fourth, in the group-RSVP block).
- **Issue:** the shell escapes each `paragraphs` entry at the choke point, so an apostrophe in **shipped
  copy** ("You're", "haven't", "can't") reaches `email.html` as `&#39;`. Two assertions went red for that
  rendering detail alone — `(D) request_received … keeps the not-charged reassurance` and the WR-04
  `(booker side, positive control)`; a third, `(B) group_rsvp_received (no)`, went red in Task 3.
  **The more serious half was silent:** `expect(email.html).not.toContain("You're getting")` — the guard
  that the *canceller* never receives the *booker's* sentence about their own refund — could no longer
  fail under any circumstances, because that literal can never again appear in an HTML part. WR-04's
  whole complaint was a recipient being told something false about their own money; its guard had
  quietly become decoration.
- **Fix:** a `copy(email)` reader returning the plain-text twin, which **throws** when the twin is absent
  (a fail-closed `""` would have re-created the same vacuity one level down). Five assertions repointed:
  the not-charged reassurance, the booker positive control, the group-RSVP verdict, and **both** WR-04
  host-side absence guards. Every assertion about money amounts, markers and headings stays on
  `email.html` untouched, so the HTML part is still under test.
- **Files modified:** `tests/notifications/notify.test.ts`
- **Verification:** the two Task-2 sites were watched red first (`2 failed | 63 passed`, with the full
  rendered document quoted in the failure — the copy visibly present, correct and entity-encoded), then
  green; the Task-3 site likewise (`1 failed | 136 passed` → green).
- **Committed in:** `4e25bea` and `74e539c`
- **Note on scope:** this puts a second file in the plan's diff, against `<verification>`'s
  "`git diff --name-only` at plan end lists only `src/lib/email.ts`". `notify.test.ts` is **not** one of
  the three files the plan pins byte-unchanged, and all three of those (`email-escaping.test.ts`,
  `email-dev-fallback.test.ts`, `notify-emission.test.ts`) **are** byte-unchanged, verified by
  `git diff --exit-code` across the whole plan range.

**2. [Rule 3 - Blocking] `sendOpsAlertDigest` had to pass a fourth argument**

- **Found during:** Task 1, resolved in Task 3.
- **Issue:** making `text` a **required** fourth parameter (which the plan pins, and which its own grep
  criterion checks for literally) is a contract change at **all nineteen** call sites — including row 19,
  whose shell adoption belongs to plan 15-04. Left alone, `npx tsc --noEmit` could never reach 0.
- **Fix:** the digest's `send` call passes its **subject** as the text part — a string that already
  exists, so no operator copy was invented and 15-04's two open questions (the `meta`-absent type and the
  pre-escaped table slot) are untouched. `renderOpsAlertDigest` and its `<table>`/`<tr>` builders are
  **byte-identical**; the sender's docblock now names 15-04 as the owner and says the local goes away
  when `tableHtml`/`tableText` arrive.
- **Files modified:** `src/lib/email.ts`
- **Verification:** `npx tsc --noEmit` exit 0; `tests/ops/alert-digest.test.ts` green unedited.
- **Committed in:** `008ced0`

**3. [Rule 2 - Documentation correctness] Three block headers claimed escaping happens in this file**

- **Found during:** Tasks 2-3.
- **Issue:** the lifecycle contract header, the group-RSVP header and `sendGuestRsvpEmail`'s docblock all
  asserted "EVERY interpolated field … is escapeHtml'd" in a file that no longer escapes any of them.
  A comment that is false about a **security** property is worse than no comment.
- **Fix:** each contract sentence **kept**, with the location corrected — "escaped … at the shell's one
  choke point since 15-03 rather than in a local here" — plus an explicit "do NOT escape here as well;
  it would double-encode". `sendRefundIssued`'s "NOT run through escapeHtml, deliberately" paragraph was
  rewritten into the measurement above, since it stated the opposite of what now happens.
- **Committed in:** `85ceeda` / `008ced0`

### Acceptance criteria met in substance, not by literal count

**4. `grep -c 'sent: true'` returns 2, not the criterion's 1; `grep -c 'email:dev'` returns 4, not 1**

- Both were **already** 2 and 4 in the shipped file (`Promise<{ sent: true }>` plus `return { sent: true }`;
  the header comment, the log line, and two docblock mentions). The criteria misdescribed the baseline
  rather than the target. The property each protects — *unchanged* — holds exactly: measured against
  `git show`, every one of `sent: true`, `email:dev`, `onboarding@resend.dev`, `ALL_RAILS_REFUND_WINDOW`
  and `resend.emails.send` has **the same count as before this plan**.

**5. Task 1's `npx tsc --noEmit` exits 0 could not hold at Task 1**

- With `text` required, the file only typechecks once **all nineteen** call sites pass four arguments —
  which happens at Task 3. Task 1's runtime verification was run instead and was green
  (`npx vitest run tests/auth/` — 14 files / 39 tests; vitest transpiles without typechecking), and the
  commit message records that the file typechecks again at Task 3. It does: exit 0.

---

**Total deviations:** 3 auto-fixed (2 × Rule 3, 1 × Rule 2 — with a Rule 1 unfailable-guard finding inside
deviation 1), 2 acceptance criteria resolved against a mis-stated baseline. **No scope creep** — no
consumer module edited, no trigger, subject, recipient or argument list moved.

## Issues Encountered

- **`npx tsx -e` with a `@/` path alias hung past 120s** on this box. The `ALL_RAILS_REFUND_WINDOW`
  measurement was taken instead by reading the declaration out of the source and evaluating the literal
  expression in plain `node` — which also has the virtue of measuring the **declared** value rather than
  whatever a module graph happened to resolve.
- **All suites run one at a time** per this repo's `tests/global-setup.ts` truncation hazard. No
  concurrent vitest processes at any point.
- `tests/notifications/notify.test.ts` produces 2 pre-existing leaked audit writes (the documented
  `recordAudit` singleton path); unchanged by this plan.

## Threat Flags

None — no new surface. The register's six `mitigate` rows are all implemented:

| Threat | Verified how |
|---|---|
| T-15-01 (19 escape sites → 1) | per-field locals deleted only where the choke point covers them; exactly one `escapeHtml` declaration repo-wide; `email-escaping.test.ts` green with **zero** edits |
| T-15-04 (token from the wrong URL) | `login-reachable-after-reset`, `reset-revokes-sessions`, `stale-session-selfheal` all green — they recover the token from the first absolute URL, which is the CTA href |
| T-15-09 (WR-02 credential leak) | `if (!resend)` block byte-identical; `email-dev-fallback.test.ts` green unedited |
| T-15-10 (a trigger moving under cover of a refactor) | zero consumer modules in the diff; `notify-emission.test.ts` byte-unchanged and green |
| T-15-11 (a money-path disclosure changing silently) | `ALL_RAILS_REFUND_WINDOW` measured against the five characters, value quoted, result recorded — see above |
| T-15-12 (sender identity beyond an env change) | `grep -rn 'onboarding@resend.dev' src/` returns exactly 1, still the `EMAIL_FROM` fallback |

T-15-SC holds: **zero package installs** in this plan.

## Known Stubs

None in this plan's work. **One honest boundary:** `sendOpsAlertDigest`'s plain-text part is the subject
line restated — an interim, not a stub, and deliberately derived rather than written. It exists because
the transport contract now requires a text argument at every call site; plan **15-04** replaces it with
the real `tableText` twin when it composes the digest through the shell. The digest's HTML is unchanged
and remains the operator's full content.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **For 15-04:** `send(to, subject, html, text)` is the contract; `renderEmail` is imported at the top of
  `email.ts` already. The digest's two open questions are untouched: `OpsDigestRow` still has no `meta`,
  and `renderOpsAlertDigest` still returns the pre-escaped table that belongs in `tableHtml`. Its
  `paragraphs` are the two runbook `<p>` blocks plus the truncation note; it renders **zero** CTAs. When
  it lands, **mark EMAIL-01 and EMAIL-02 complete** — 18/19 is not "all existing sends".
- **For 15-05 (the preview harness):** eighteen real `EmailContent` values now exist in one file and can
  be previewed without a transport.
- **⚠ For anyone writing a new send:** hand `renderEmail` **raw** strings. Escaping here as well
  double-encodes, and the failure is invisible until someone reads the email. And if you assert on the
  message in a test, assert a **sentence** against `email.text` and a **structure** against `email.html` —
  the HTML part entity-encodes every apostrophe in the copy, which makes a raw-string absence assertion
  over it unfailable.
- **⚠ Recorded but not exercised:** 15-02's `&`-in-href trap. Every CTA href this plan wires carries its
  token in the **path** (Better Auth's reset/verify links) or has no query at all, so nothing depends on
  parameter order today. A future sender that puts a token **second** in a query string walks into a
  failure no gate catches.

---
*Phase: 15-auth-profile-transactional-email*
*Completed: 2026-08-24*

## Requirements Status — EMAIL-01 / EMAIL-02 advanced, deliberately NOT ticked

Third plan in a row to record this, and for the first time there is real inbox evidence behind it.

- **EMAIL-01** reads *"**All existing sends** render through one shared branded shell … without any send
  trigger moving."* After this plan **eighteen of nineteen** do, and the second half of the sentence is
  proved: `notify-emission.test.ts` is byte-unchanged and green, and no consumer module is in the diff.
  The nineteenth is `sendOpsAlertDigest`, and it is plan **15-04**'s.
- **EMAIL-02** reads *"Email colour values are generated from the same token contract as the app."* True
  now of eighteen real messages a person can receive — and still not of the ops digest.

Ticking either here would state "all existing sends" over a tree where one still builds its own markup.
**Whoever executes 15-04 should mark EMAIL-01 and EMAIL-02 complete.** The traceability table rows for
both remain `Pending`, which is accurate.
