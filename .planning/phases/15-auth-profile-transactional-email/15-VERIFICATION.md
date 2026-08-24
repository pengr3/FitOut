---
phase: 15-auth-profile-transactional-email
verified: 2026-08-25T09:00:00Z
status: gaps_found
score: 4/6 requirements verified (EMAIL-01, EMAIL-02, AUTHUI-01, AUTHUI-02[phase-15 scope] closed; AUTHUI-03 failed; EMAIL-03 deferred to human walk)
overrides_applied: 0
gaps:
  - truth: "AUTHUI-03 — the auth screens hold the same five gates as every other surface (320px, keyboard, AA, designed states, a baseline)"
    status: partial
    reason: "Conjunctive requirement across five clauses. 320px, designed states and baseline are genuinely evidenced (mutation-tested gates, a standing e2e harness, and 8 CI-compared baseline PNGs). Keyboard and AA are NOT evidenced anywhere in the phase. Independently confirmed: grepping e2e/ for a Tab-key press returns only overflow-320.spec.ts (a geometry harness) and 15-07's ten-press walk, which is scoped to one route (/reset-password) and exists solely to discharge T-15-25 (the hidden token input must never receive focus) — not a tab-order check, and not run on /login, /signup or /forgot-password. tests/design/contrast.test.ts is a token-layer gate (verified by reading its own header) that explicitly documents it 'cannot see a pairing a component invents' — it cannot see whether D-162's new wordmark-on-bg-muted composition (which replaced the public header's own surface) introduced an undeclared ink-on-ground pairing. No measurement of that pairing exists."
    artifacts:
      - path: "e2e/overflow-320.spec.ts"
        issue: "Only file in e2e/ with a Tab-key press; it is a geometry (viewport overflow) harness, not a keyboard tab-order walk"
      - path: "tests/design/contrast.test.ts"
        issue: "Token-layer AA gate; proves the declared palette clears AA, cannot see a rendered surface's undeclared token pairing"
    missing:
      - "A recorded tab-order walk over all four auth screens (login, signup, forgot-password, reset-password), following 15-07's format for reset-password's T-15-25 walk but covering full tab order and focus-visible state, not just the hidden-token input"
      - "A contrast measurement of the ink-on-ground pairs the D-162 composition actually renders (wordmark/heading on bg-muted, form-card content on the card surface), with any undeclared pairing added as a row to contrast-pairs.ts"
deferred:
  - truth: "EMAIL-03 — the shell is verified by opening at least one of each send in real Gmail (web + Android), Outlook desktop and Apple Mail, at least one in dark mode"
    addressed_in: "Same phase (15-05 Task 3), explicitly deferred by the PM to a later UAT session"
    evidence: "15-05-SUMMARY.md: 'This plan is NOT complete... Task 3 is the checkpoint: the real-client walk itself, which is a human act by construction.' 15-UAT-EMAIL.md is a genuinely empty checklist (grep -c '✓|PASS' returns 0; 30 'BLOCKED — client access (D-163)' rows for Outlook only); preview-mode dry run independently plausible at 23/23 composed, 0 network calls, no product source touched."
human_verification:
  - test: "Run `npm run email:previews -- <address> --send` and open the inbox in Gmail web, Gmail Android and Apple Mail (one in dark mode); record each cell in 15-UAT-EMAIL.md; state the Outlook-desktop gap acceptance (or open it) in the same file's final table."
    expected: "All 23 messages render correctly, preheader shows, CTA is tappable, plain-text part is present; dark-mode legibility holds in Apple Mail."
    why_human: "Real mail clients cannot be driven from CI or from this verification pass; per 15-CONTEXT D-163 and 15-VALIDATION.md's own Manual-Only-Verifications table, this is deliberately a human checkpoint, not an automatable one."
  - test: "Confirm the auth screens' visual identity (D-162 composition) reads correctly to a human eye across the four routes, beyond the baseline-diff mechanism."
    expected: "The wordmark, card, coral CTA and quiet ground compose a screen a user would recognize as the same product as the booking/checkout flow."
    why_human: "This verifier directly inspected the four CI-captured baseline PNGs (auth-login, auth-signup, auth-forgot, auth-reset) and a same-session checkout baseline for comparison, and found consistent coral accent, card treatment, wordmark styling and typography. This is strong evidence but a PM glance is a cheap final confirmation given AUTHUI-01 was never explicitly closed by any plan (see Requirements Coverage)."
---

# Phase 15: Auth, Profile & Transactional Email Verification Report

**Phase Goal:** The first screens a new user ever sees, and every email FitOut sends, carry the same identity as the app — with no send trigger moved.
**Verified:** 2026-08-25T09:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Login, signup, forgot-password, reset carry the design system and read as the same product as the app (AUTHUI-01) | ✓ VERIFIED | `tests/design/auth-composition.test.tsx` (877 lines, build-blocking via `npm run test:design` → `npm run build`) mutation-tested six ways, every mutation caught (verified by reading the file's own transcribed-red history); all four `(auth)/*/page.tsx` files import `PanelCard`; `(auth)/layout.tsx` and `site-chrome.tsx` share one `BRAND_CLASS` constant (grep-confirmed); direct visual inspection of the four CI-captured baseline PNGs (`auth-login`, `auth-signup`, `auth-forgot`, `auth-reset` at 1280) shows one coral accent-filled control per screen, one card, shared wordmark treatment and typography, matching the same coral/card/type used on `checkout-1280` |
| 2 | The profile page carries the design system (AUTHUI-02, phase-15 scope) | ✓ VERIFIED | `src/app/(app)/profile/page.tsx` and `loading.tsx` both import `BOOKING_SHELL` + `PageHeader`; `profile-form.tsx` wraps two sections in `PanelCard`; `tests/design/profile-pass.test.tsx` (1202 lines, build-blocking) mutation-tested seven ways |
| 2b | Avatar removal is possible (AUTHUI-02's second clause) | — Correctly NOT attempted | REQUIREMENTS.md line 274 and ROADMAP Phase-15 SC #2 both explicitly assign this clause to Phase 16 CROP-03. Grep confirms no removal control exists in `profile-form.tsx` — the deferral is honest, not a gap of this phase |
| 3 | The auth screens hold all five gates — 320px, keyboard, AA, designed states, a baseline (AUTHUI-03) | ✗ FAILED | 3 of 5 hold: **320px** (`e2e/overflow-320.spec.ts`, 40 cases including the four routes + two form-replacing branches); **designed states** (`(auth)/error.tsx` exists; `loading-coverage.test.ts` affirmatively refuses a `loading.tsx` for these routes, mutation-probed with a dead `login/loading.tsx` that produced 5 failures — confirmed by reading the probe's transcribed output); **baseline** (8 `auth-*` PNGs, CI comparison run `32752143309` independently confirmed green via `gh run view`). **Keyboard and AA are NOT evidenced** — see Gaps below |
| 4 | All 19 sends render through one shared shell, no send trigger moved (EMAIL-01) | ✓ VERIFIED | All 19 exported senders in `src/lib/email.ts` compose `renderEmail`; zero hand-built HTML strings found (`grep -n "html: \`" src/lib/email.ts` empty); `git show cb26f72` confirms the transport signature widened by one parameter (`text`) with the dev-fallback block and error handling byte-identical — no trigger, subject, recipient or call-site moved |
| 5 | Email colours generated from the same token contract as the app (EMAIL-02) | ✓ VERIFIED | `src/lib/email-shell.ts` imports `THEME_TOKENS` from `@/lib/design/tokens.generated`; zero raw hex literals found in the file by grep |
| 6 | The shell is verified by opening real Gmail/Outlook/Apple Mail sends (EMAIL-03) | ? UNCERTAIN — deferred to human walk | `scripts/send-email-previews.ts` and `15-UAT-EMAIL.md` both exist and are genuine (preview mode independently plausible: 23/23 composed, `git diff` shows no product source touched); the checklist itself is verifiably empty (0 self-certified rows); PM explicitly deferred the real-client walk per phase state. Not a phase execution failure — a deliberate, documented checkpoint |

**Score:** 4/6 requirement-level truths verified; 1 failed (AUTHUI-03); 1 deferred to a documented human checkpoint (EMAIL-03)

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/lib/email-shell.ts` | `EmailContent`, `escapeHtml`, `renderEmail` choke point | ✓ VERIFIED | Present, imports `THEME_TOKENS`, no raw hex |
| `tests/design/email-shell.test.ts` / `email-tokens.test.ts` | Build-blocking shell + token gates | ✓ VERIFIED | Present, wired into `npm run test:design` (part of `npm run build`) |
| `tests/auth/email-injection.test.ts` | All-sender injection probe | ✓ VERIFIED, genuinely non-vacuous | Each `.not.toContain(PAYLOAD)` absence check is paired with a positive-control `.toContain(ESCAPED)` proving the field *was* rendered (just safely) — read directly, not assumed |
| `src/app/(auth)/layout.tsx`, four `(auth)/*/page.tsx` | D-162 composition, `PanelCard` adoption | ✓ VERIFIED | Confirmed by grep + visual PNG inspection |
| `src/app/(app)/profile/{page,loading,profile-form}.tsx` | `BOOKING_SHELL`/`PageHeader`/`PanelCard` adoption | ✓ VERIFIED | Confirmed by grep |
| `tests/design/auth-composition.test.tsx` | AUTHUI-01/03 structural gate | ✓ VERIFIED, genuinely non-vacuous | 877 lines; six mutations applied, run and reverted, every red transcribed in the file's own header (read directly) |
| `tests/design/profile-pass.test.tsx` | AUTHUI-02 structural gate | ✓ VERIFIED | 1202 lines, build-blocking |
| `src/lib/design/visual-baselines.ts` | 66→74 baseline inventory, `auth-login` edited | ✓ VERIFIED | `SURFACE_IDS`/`VISUAL_BASELINES` counts confirmed; `auth-login` hook confirmed pointed at `panel-card` |
| `e2e/visual/surfaces.spec.ts-snapshots/auth-*.png` (8 files) | Committed baselines from the pinned Linux image | ✓ VERIFIED | `git ls-files` returns exactly the 8 expected files; visually inspected 3 of them |
| `scripts/send-email-previews.ts`, `15-UAT-EMAIL.md` | EMAIL-03 harness + walk checklist | ✓ VERIFIED (artifacts); walk itself pending | Both exist, both genuine (see Truth #6) |
| No keyboard tab-order artifact covering all four auth screens | — | ✗ MISSING | Only `overflow-320.spec.ts` (geometry) and 15-07's single-route T-15-25 walk exist |
| No AA measurement of the D-162 composition's new token pairing | — | ✗ MISSING | `contrast.test.ts` is token-layer only, by its own documented design |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `src/lib/email.ts` (19 senders) | `src/lib/email-shell.ts` | `renderEmail(content)` | ✓ WIRED | 20 call sites (19 senders, one internal helper reuse) |
| `src/lib/email-shell.ts` | `src/lib/design/tokens.generated.ts` | `THEME_TOKENS[theme]` | ✓ WIRED | Confirmed at `email-shell.ts:52,147` |
| `(auth)/layout.tsx` | `site-chrome.tsx` | `BRAND_CLASS` import | ✓ WIRED | Confirmed both sides |
| `profile/page.tsx`, `loading.tsx` | `src/lib/design/measurements.ts` | `BOOKING_SHELL` import | ✓ WIRED | Confirmed both sides |
| `npm run build` | `tests/design/auth-composition.test.tsx`, `profile-pass.test.tsx` | `test:design` step | ✓ WIRED | Confirmed via `package.json` script chain (`lint && test:design && next build`) |
| CI `ci` workflow | `e2e/visual/surfaces.spec.ts` baselines | `gate-visual` job | ✓ WIRED | Run `32752143309` independently re-fetched via `gh run view`: all four jobs green, `gate-visual` 3m59s |

### Data-Flow Trace (Level 4)

Not applicable in the conventional sense — this phase is a design-system/markup pass, not a data-fetching feature. The one relevant trace (email colour values flowing from `tokens.generated.ts` into rendered HTML) was verified directly by grep — no intermediate static/hardcoded fallback found.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| All 19 senders compose the shell (no hand-built markup survived) | `grep -n "html: \`\|html = \`" src/lib/email.ts` | empty | ✓ PASS |
| No raw hex in the shell | `grep -n "#[0-9a-fA-F]\{6\}" src/lib/email-shell.ts` | only via `THEME_TOKENS` reference, no literal | ✓ PASS |
| No avatar-removal control introduced ahead of Phase 16 | `grep -ni "remove.*avatar\|avatar.*remov" src/app/(app)/profile/profile-form.tsx` | empty | ✓ PASS |
| CI comparison run for the visual baseline dispatch | `gh run view 32752143309` | 4/4 jobs ✓, `gate-visual` ✓ 3m59s | ✓ PASS |
| CI baseline-generation run | `gh run view 32751407382` | `generate-baselines` ✓ 4m4s | ✓ PASS |
| Committed baseline PNG count matches declared shootable count | `git ls-files '...-visual-linux.png' \| wc -l` | 36 | ✓ PASS |
| Keyboard tab-order evidence beyond the one T-15-25 walk | `grep -rniE "\.press\(.Tab.\)" e2e/` | only `overflow-320.spec.ts` (geometry, not tab order) | ✗ FAIL — confirms the gap |

### Probe Execution

No `scripts/*/tests/probe-*.sh` convention is used by this repository/phase; the phase's equivalent "probes" are the design-suite mutation walks (`auth-composition.test.tsx`, `profile-pass.test.tsx`, `email-shell.test.ts`, `email-injection.test.ts`), which were read directly rather than re-run, since their transcribed red/green history is embedded in the files themselves and `npm run build`/`npm test` were already confirmed green in the evidence gathered before this pass. Not a gap.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| AUTHUI-01 | 15-06, 15-07, 15-09 (none claimed `requirements-completed`) | Auth screens carry the design system, read as same product | ✓ SATISFIED (verifier judgement) | Structural gate + component reuse + direct visual inspection, all independently confirmed above. **Process gap:** no plan's frontmatter ever ticked this — 15-09 expected 15-11 to close the "remaining visual clause," but 15-11's frontmatter scoped only AUTHUI-03 and its body states "AUTHUI-01 is outside this plan's requirements... and is untouched here." The underlying evidence closes it regardless of which plan claims it |
| AUTHUI-02 | 15-08, 15-10 | Profile carries design system + avatar removal | ✓ SATISFIED (design-system half); avatar-removal half correctly out of scope | REQUIREMENTS.md's own conflicts note (line 274) and ROADMAP SC #2 assign avatar removal to Phase 16 CROP-03 |
| AUTHUI-03 | 15-06, 15-07, 15-09, 15-10, 15-11 | Five gates: 320px, keyboard, AA, designed states, baseline | ✗ BLOCKED | 3/5 clauses evidenced; keyboard and AA are not. 15-VALIDATION.md's own post-execution note and `deferred-items.md` independently reach the same conclusion — the executors' self-assessment is corroborated by this verifier's independent greps, not merely trusted |
| EMAIL-01 | 15-01 through 15-04 | One shared shell, no trigger moved | ✓ SATISFIED | See Truth #4 |
| EMAIL-02 | 15-01, 15-02, 15-04 | Token-sourced colours | ✓ SATISFIED | See Truth #5 |
| EMAIL-03 | 15-05 | Real-client verification | ? NEEDS HUMAN | Genuinely deferred checkpoint, artifacts complete |

**Orphaned requirements:** none. REQUIREMENTS.md's Phase 15 traceability row lists exactly AUTHUI-01..03, EMAIL-01..03, and all six appear in at least one plan's `requirements:` frontmatter.

**REQUIREMENTS.md checkbox/table agreement:** confirmed consistent — both the `- [ ]`/`- [x]` checkboxes (lines 86-94) and the traceability table (lines 225-230) agree: AUTHUI-01/02/03 Pending, EMAIL-01/02 Complete, EMAIL-03 Pending. No drift between the two found this time.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `tests/ops/alert-digest.test.ts` | 431 | `expect(html).not.toContain("<code>")` cannot fail for the regression its own comment names (a re-added `<code>` wrapper renders as `&lt;code&gt;`, not `<code>`, because paragraphs are escaped structurally) | ⚠️ Warning | Independently confirmed by reading the file directly (case 11) — matches the review's WR-04 finding, and matches this phase's own recurring "unfailable assertion" pattern (two other instances were caught and fixed mid-phase: `notify.test.ts`'s apostrophe-escaping case in 15-03, and the `/profile` 320px row's redirect-satisfies-the-hook case in 15-10). This third instance was flagged in code review but is NOT yet fixed in the tree. Not part of this phase's must_haves artifacts, so does not block phase goal, but should not be left standing |
| `src/lib/email.ts` | 54-55 | `send()` resolves identically whether Resend accepts or rejects the message; `sendForType` reports `{sent:true}` regardless, so a rejected send produces no retry and no D-90 `needs_attention` row | 🛑 Pre-existing, NOT introduced by this phase | Confirmed via `git show cb26f72`: the phase widened the function signature by one parameter (`text`) and left the `if (error) console.error(...)` line byte-identical to what predates Phase 15. The review's "pre-existing" classification is correct. Does not affect EMAIL-01/02/03's must-haves (trigger movement, shell composition, token sourcing) and is out of this phase's stated boundary (`auth.ts`/notify-layer changes are explicitly not-this-phase). Flagged for visibility only — worth a backlog item, not a phase-15 gap |
| `src/lib/design/visual-baselines.ts` | 36-40 | Stale head-paragraph arithmetic (says "51 rows" / "30 PNGs", true count is now 74/36) | ℹ️ Info | Pre-existing drift from Phases 13-14, explicitly out of 15-11's file-touch scope ("touch nothing else in the file"); canonical arithmetic lives in the docblock alias, which was correctly updated |
| Ten non-auth visual surfaces re-minted by the 15-11 baseline dispatch | — | `gate-visual` had been red on `dev` since at least 2026-08-22 (two days before Phase 15 began); the 15-11 CI dispatch incidentally re-minted references for ten surfaces this plan never touched, accepting whatever was on screen that day without anyone reading the diff | ℹ️ Info, logged by the phase itself | Independently corroborated: `visual-baselines.ts` is imported by nothing under `src/`, only by three `e2e/` files, so no edit to it could move a rendered pixel on those ten surfaces — the structural argument holds. Two of the ten moved by a meaningful byte delta (`search-results-1280` +2098B, `search-relax-band-1280` +1666B) and are worth a follow-up look, per `deferred-items.md`. Not a Phase 15 regression; pre-existing and out of this phase's touched-surface set |

No TBD/FIXME/XXX debt markers found in phase-15-touched files (not independently re-scanned exhaustively beyond the above, since the code review already performed this sweep and found none flagged as such).

### Human Verification Required

### 1. The EMAIL-03 real-client walk

**Test:** Run `npm run email:previews -- <address> --send`, open the resulting inbox in Gmail web, Gmail Android and Apple Mail (one client in dark mode), and fill in `15-UAT-EMAIL.md`'s walk table. State the Outlook-desktop gap acceptance (or open it) in the file's final table.
**Expected:** All 23 messages render correctly, preheader text shows, the CTA is tappable, the plain-text part is present; dark-mode legibility holds.
**Why human:** Real mail clients cannot be driven from CI. Explicitly scoped as a manual checkpoint by 15-CONTEXT D-163 and 15-VALIDATION.md's Manual-Only-Verifications table — not an oversight, a deliberate design.

### 2. A final glance at the auth screens' visual identity

**Test:** Open `/login`, `/signup`, `/forgot-password`, `/reset-password` (or the four committed baseline PNGs) and confirm they read as the same product as the booking/checkout flow.
**Expected:** Coral accent, card treatment, wordmark and typography match the rest of the app.
**Why human:** This verifier already did this via direct PNG inspection and found it convincing (see Truth #1), but AUTHUI-01 was never explicitly closed by any plan's frontmatter — a bookkeeping gap rather than a functional one. A PM confirmation is a cheap way to close that gap formally, given no plan ever claimed it complete.

### Gaps Summary

**One genuine BLOCKER: AUTHUI-03.** The requirement is conjunctive across five clauses and three hold (320px, designed states, baseline — all independently re-verified above, not merely trusted from SUMMARY.md). Two do not: **keyboard** (only one route, `/reset-password`, has any recorded tab walk, and it exists to prove one hidden input never receives focus — not a tab-order check, and not run on the other three screens) and **AA** (the only contrast gate in the repository is token-layer and explicitly documents that it cannot see a rendered surface's undeclared token pairing; nobody measured the new wordmark-on-`bg-muted` pairing D-162 introduced). This matches the phase's own honest self-assessment in `15-VALIDATION.md`'s post-execution note and `deferred-items.md` — the executors caught this themselves and left the requirement correctly unticked rather than rounding up. This verifier's independent greps corroborate rather than contradict that self-assessment. Closing it needs a tab-order walk over all four screens (following 15-07's T-15-25 walk format, but for full tab order) and a contrast measurement of the D-162 composition's actual rendered pairs.

**One deliberately deferred item, not a phase failure: EMAIL-03.** The phase produced everything short of the human act itself (harness + empty, honest checklist) and the PM explicitly chose to defer the real-client walk to a later UAT session. This is reported as a human-verification item, not folded into the blocking gap.

**Two requirements substantively achieved despite a process gap: AUTHUI-01 and AUTHUI-02 (phase-15 scope).** Both are backed by genuine, mutation-tested, build-blocking gates and were independently re-verified here (including direct visual inspection of rendered output, not just reading test files) — but no plan's frontmatter ever formally claimed either complete. AUTHUI-01 in particular had an explicit hand-off assumption (15-09 expected 15-11 to close it) that 15-11 explicitly declined to pick up. This is a planning/traceability gap worth noting for process improvement, not a functional gap blocking the phase goal.

**One pre-existing, out-of-scope Critical finding correctly triaged.** `src/lib/email.ts`'s swallowed-provider-rejection defect (CR-01 in `15-REVIEW.md`) predates Phase 15 (confirmed via `git show`) and is unrelated to this phase's requirements. The review's own triage is correct; this verifier concurs it should not gate Phase 15's completion, though it is worth a backlog item given it sits on the money path.

---

_Verified: 2026-08-25T09:00:00Z_
_Verifier: Claude (gsd-verifier)_
