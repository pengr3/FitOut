---
phase: 15-auth-profile-transactional-email
plan: 02
subsystem: testing
tags: [design-gate, email, html-email, design-tokens, theme, escaping, mutation-testing, build-gate]

# Dependency graph
requires:
  - phase: 15-auth-profile-transactional-email
    plan: 01
    provides: "src/lib/email-shell.ts — the pure exported renderEmail(content, theme) => { html, text } these gates grade, plus EmailContent and escapeHtml; src/lib/design/theme.ts — THEMES / DEFAULT_THEME importable from a server/pure graph"
  - phase: 10-design-system-foundation
    provides: "src/lib/design/tokens.generated.ts — THEME_TOKENS, the one sanctioned duplicate of a token value; vitest.design.config.ts — the DB-free, setupFiles-free config that npm run build runs; tests/design/helpers/strip-comments.ts"
provides:
  - "tests/design/email-shell.test.ts — 27 build-blocking assertions on the shell's structure, html/text parity, escaping, the five type sizes and the no-URL-before-the-CTA property"
  - "tests/design/email-tokens.test.ts — 13 build-blocking assertions pinning the rendered hex set to exactly the seven THEME_TOKENS values, per theme, read at test time"
  - "The repository's first assert-on-a-pure-exported-renderer test pattern — the precedent 15-RESEARCH cited does not exist"
  - "A measured justification for BOTH the theme-flip iteration and the shell hex source-scan: neither catches a hand-typed hex alone"
affects: [15-03, 15-04, 15-05, any phase adding a transactional send or a theme]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Grade the STRING a pure renderer returns, not a captured send — the only shape that can run under a setupFiles-free config and therefore inside `npm run build`"
    - "Guard-the-guard asserted FIRST, before any absence, with a length floor and a positive marker"
    - "A positive-control fixture fed to the SAME scanner functions the real assertions use, never written to disk"
    - "Expectations DERIVED from the fixture (the caller's tableHtml table count is subtracted) rather than hard-coded, so the gate survives a producer changing shape"
    - "Read the token at test time so a stylesheet change moves the expectation and the rendering together"
    - "Iterate the THEMES union rather than naming its members, so a third theme joins the gate for free"

key-files:
  created:
    - tests/design/email-shell.test.ts
    - tests/design/email-tokens.test.ts
  modified: []

key-decisions:
  - "Both gates assert on the pure exported renderEmail string, not on a captured send — the design config has no setupFiles, so the Resend mock does not exist there and a send-capturing gate could not run inside npm run build at all"
  - "Three DISTINCT escaping payloads, one per sink, after the mutation walk proved a single shared payload made every per-sink assertion satisfiable by any other sink still carrying it raw"
  - "The forbidden-import names are DESCRIBED rather than spelled in the header, following src/lib/design/theme.ts's own convention (15-RESEARCH § Pitfall 9) — which also satisfies the plan's literal grep criterion"
  - "The numeric-character-reference ban is asserted rather than left as a 15-01 docblock note: it is a property of the shell that the hex harvest's own correctness depends on"

patterns-established:
  - "A mutation whose RED is SMALLER than expected is a finding about the TEST, not about the code — two assertions were strengthened mid-walk and the walk re-run"
  - "Record the mutation that stayed GREEN where it mattered: M1 in email-tokens.test.ts documents that a hand-typed hex equal to the current token is invisible to output alone"

requirements-advanced: [EMAIL-01, EMAIL-02]
requirements-completed: []

# Metrics
duration: 16min
completed: 2026-08-24
---

# Phase 15 Plan 02: The Two Build-Blocking Email Gates Summary

**Every claim 15-UI-SPEC makes about the email shell — one preheader, one 600px column, one font stack, five type sizes, a plain-text twin that cannot drift, a payload that cannot escape the choke point, no absolute URL before the CTA, and exactly seven token-read colours that move when the theme does — is now a command that exits non-zero the moment it stops being true, and every one of them has been watched failing.**

## Performance

- **Duration:** 16 min
- **Started:** 2026-08-24T09:41Z (17:41 +08:00)
- **Completed:** 2026-08-24T09:57Z (17:57 +08:00)
- **Tasks:** 2
- **Files modified:** 2 (2 created, 0 modified)
- **`src/` diff at plan end:** empty. Ten mutations were applied to `src/lib/email-shell.ts` and all ten reverted.

## Accomplishments

- **The shell's structure is falsifiable inside `npm run build`.** `tests/design/email-shell.test.ts` (699 lines, 27 assertions) counts one preheader, one `width="600"`, exactly one `font-family`, and zero occurrences of each of eight banned constructs (`display:flex`, `display:grid`, `float:`, `<img`, `class=`, `<style`, `xmlns`, `DOCTYPE html PUBLIC`) across both message shapes. The `role="presentation"` expectation is **derived from the fixture** — the caller's `tableHtml` table count and role count are subtracted from both sides — so the assertion stays true when the ops digest's table changes shape.
- **The security-relevant property is pinned directly instead of being inferred from three confused auth tests.** With a CTA, the index of the first `https?://` match in the document **equals** the index of the CTA href. Measured: adding one `xmlns` attribute moves the first absolute URL from index **1843 to index 38**, i.e. `extractLink` would hand a W3C specification address to three shipped auth tests as though it were the reset link.
- **Escaping is asserted over the whole document AND over the preheader region specifically** (T-15-02), with three distinct payloads so no sink's assertion can be satisfied by another sink. The plain-text twin is asserted to be **un**escaped, per sink by name — because escaping `text/plain` is a defect, and a gate that forbade the raw payload there would have pinned that bug.
- **An email cannot be left behind by a theme swap.** `tests/design/email-tokens.test.ts` (381 lines, 13 assertions) harvests every `#` literal from a rendered email and asserts set equality against `THEME_TOKENS[theme]` over the seven declared keys, **read at test time**, iterating `THEMES` rather than naming its members. Plus a cross-theme divergence assertion, so a shell that ignored the argument *and* a token module whose themes had collapsed together could not both pass.
- **Three negative controls the set equality alone would miss:** no literal `undefined` in any render (tsconfig has `strict` but **not** `noUncheckedIndexedAccess`, so a mistyped key compiles); no numeric character reference long enough to harvest as a phantom colour; and **zero hex literals in the shell's own source** — the repo-wide leak gate scans `src/app/**` and `src/components/**` and never reaches `src/lib/**`.
- **Ten mutations walked, every RED quoted verbatim in the file that owns it.** Six in `email-shell.test.ts`, four in `email-tokens.test.ts`. Every assertion block in both files appears in at least one recorded RED.
- **Suite state:** `npm run test:design` **52 files / 877 passed, 3 skipped**. `npx tsc --noEmit` exit 0. `npm run lint` 0 errors (25 pre-existing warnings, none in the new files). `git diff --exit-code src/lib/design/tokens.generated.ts tests/design/token-drift.test.ts` clean; `token-drift.test.ts` green at 8/8.

## Task Commits

1. **Task 1: The EMAIL-01 structural and parity gate** — `51dc925` (test)
2. **Task 2: The EMAIL-02 seven-hex-set gate** — `9ad10dd` (test)

**Plan metadata:** see final commit (docs: complete plan)

## Files Created/Modified

- `tests/design/email-shell.test.ts` **(created, 699 lines)** — plain-node vitest. Imports `renderEmail`/`escapeHtml`/`EmailContent` from `@/lib/email-shell` and the pure `./helpers/strip-comments`; nothing else. Six scanner functions, two message-shape fixtures, one three-payload escaping fixture, one violating positive-control string. Header carries what it does not cover, what to do when it goes red, and six mutations with RED quoted verbatim.
- `tests/design/email-tokens.test.ts` **(created, 381 lines)** — plain-node vitest. Imports `renderEmail`, `THEME_TOKENS` from `@/lib/design/tokens.generated`, and `DEFAULT_THEME` + `THEMES` from `@/lib/design/theme`. The seven keys as a local `as const` tuple in the spec's order; every case iterates `THEMES`. Header carries four mutations with RED quoted verbatim.

**Nothing else moved.** No `src/` file, no config, no existing test.

## Decisions Made

- **Grade the string, not a send.** `vitest.design.config.ts` declares no `globalSetup` and no `setupFiles` **by contract** — those two keys are what make the main config require Docker. The Resend mock therefore does not exist in the config that `npm run build` runs, so a gate written against a captured send could not block a build. Both files import the pure exported renderer. This is the repository's **first** assert-on-a-pure-exported-renderer test: the precedent 15-RESEARCH cites was re-measured and does not exist (zero test files import `renderOpsAlertDigest`).
- **Three distinct escaping payloads, one per sink.** Forced by the mutation walk — see Deviations.
- **The forbidden-import names are described, not spelled.** The header explains what must never be imported without writing the literal identifiers, following `src/lib/design/theme.ts`'s own recorded convention (*"this header never spells any of them: naming a banned token in prose is what turns a clean module into a red gate"*, 15-RESEARCH § Pitfall 9). The exact identifiers are in the import block twelve lines below, which is authoritative anyway.
- **The `role="presentation"` expectation is derived, not counted.** Hard-coding "3" would go red the day the digest's table gained a row group, for a reason with nothing to do with the shell.
- **The numeric-character-reference ban became an assertion.** Plan 15-01 chose named entities (`&zwnj;&nbsp;`) over `&#8203;` and recorded the reason in a docblock. That choice is a precondition for *this* gate's harvest being honest, and a note is not a gate — so it is asserted on both the shell's source and its output. Measured: substituting `&#8203;` produces `#8203` as a phantom eighth colour and reddens six assertions.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The escaping block's per-sink assertions were satisfiable by any other sink**

- **Found during:** Task 1, mutation M4 (escape the plain-text twin).
- **Issue:** The fixture used **one** shared payload string for the heading, the first paragraph and the CTA label. M4 mapped `escapeHtml` over the heading and paragraphs — but the CTA line is composed *after* that map, so the raw string survived there. The result: only **one** test reddened, and the assertion that exists specifically to prove the twin is *not* escaped stayed **GREEN** over a twin whose heading and body had both been entity-encoded. `expect(nasty.text).toContain(PAYLOAD)` was true because the label happened to be the same characters as the heading.
- **Fix:** Three distinct payloads (`PAYLOADS.heading` / `.body` / `.label`), each asserted by name in both directions. The whole-document absence scan now loops all three; the preheader-region scan names the heading's, since the preheader derives from the heading.
- **Files modified:** `tests/design/email-shell.test.ts` (pre-commit — the flaw never shipped)
- **Verification:** M4 re-applied against the fixed file → **2 failed | 25 passed**, the twin-escaping assertion among them. RED recorded verbatim in the file's header, flaw and all.
- **Committed in:** `51dc925`

**2. [Rule 2 - Missing critical assertion] The numeric-character-reference precondition was unasserted**

- **Found during:** Task 2, writing the hex harvest.
- **Issue:** The harvest scans for `#` plus three-to-eight hex digits. `&#8203;` satisfies that. Plan 15-01 avoided numeric entities and wrote down why, but nothing enforced it — so this gate's own correctness rested on a docblock in another file.
- **Fix:** A case asserting no long numeric character reference in either the shell's source or its output. (`escapeHtml`'s own `&#39;` is two digits and cannot reach the three-digit floor, which is why it is not a false positive.)
- **Files modified:** `tests/design/email-tokens.test.ts`
- **Verification:** M4 of that file's walk — `&zwnj;` → `&#8203;` → **6 failed | 7 passed**, including `expected [ '&#8203' ] to deeply equal []`.
- **Committed in:** `9ad10dd`

### Acceptance criterion met after a prose rewrite

**3. `grep -c 'mockResend\|@testing-library\|tests/setup' tests/design/email-shell.test.ts` initially returned 2**

- **Where:** Task 1, acceptance criteria.
- **Cause:** Both matches were in the header's *prohibition* — the sentences telling a future reader not to import those things. Neither was an import.
- **Resolution:** The names were reworded to descriptions ("the shared mock helper", "the DOM testing-library packages", "the main config's setup module"), with an added paragraph recording *why* they are described rather than spelled and pointing at the import block for the exact answer. This follows the repo's own established convention rather than inventing one — `src/lib/design/theme.ts` carries the identical note. The grep now returns **0**, and the property the criterion protects (nothing heavy is imported) is visible in eight lines of imports.

### Acceptance criterion met in substance, not by literal grep

**4. `tests/design/email-tokens.test.ts` contains `"court"` / `"grove"` — all in the mutation-verification header**

- **Where:** Task 2, criterion *"The file iterates `THEMES` rather than naming `"court"` and `"grove"` as two separate literal cases."*
- **State:** Ten occurrences, **all** inside the header's verbatim RED transcripts (`× renderEmail(content, "grove") paints from THEME_TOKENS.grove`) plus one inline comment explaining the choice. **Zero occurrences in executable code** — verified by stripping comment lines: every case is `for (const theme of THEMES)` or `THEMES.map`. The criterion is about test structure and is met; quoting a RED verbatim is the other house standard and the two cannot both be satisfied by deleting the transcripts.

---

**Total deviations:** 2 auto-fixed (1 × Rule 1, 1 × Rule 2), 2 acceptance criteria resolved. **No scope creep** — `files_modified` is exactly the plan's two files, and `src/` is byte-unchanged.

## Issues Encountered

- **`npx tsc --noEmit 2>&1 | tail -5` reports tail's exit code.** Ran `tsc` bare, per the recorded toolchain note. Exit 0.
- **Mutation tooling:** `perl -0pi -e 's/\Q…\E/…/'` silently no-ops on patterns containing `${…}` — perl interpolates the `$` even inside `\Q`. The first M3 attempt reported a clean pass over an unmutated file, which would have been a **false green in the mutation walk itself**. Caught by grepping the file after every mutation and before every run; subsequent mutations went through a Python replace with an `assert old in s` guard. Worth writing down: a mutation walk whose mutations do not apply is exactly the vacuity the walk exists to detect.
- No blockers. Both gates passed on first run; every red below was a deliberate mutation.

## Threat Flags

None — no new surface. The four threats in this plan's register are all mitigated and were each **watched red**:

| Threat | Mitigation | Watched red by |
|---|---|---|
| T-15-02 (the derived preheader as an injection sink) | whole-document **and** preheader-region absence scans, three payloads | shell M1 — 2 failed / 25 passed |
| T-15-04 (reset token extracted from the wrong URL) | first-`https?://` index === CTA href index; zero URLs with no CTA | shell M2 — first URL moved 1843 → 38 |
| T-15-07 (a vacuous gate over an empty render) | guard-the-guard asserted first in both files; positive-control fixture; ten recorded REDs | shell M5 and tokens M2 both reddened a guard-adjacent case |
| T-15-08 (a hand-typed colour re-entering the pipeline) | seven-value set equality **plus** a source scan for hex literals | tokens M1 — and note it left the *default-theme* equality GREEN |

T-15-SC holds: **zero package installs** in this plan.

## Known Stubs

None. Both files are complete gates over a complete renderer.

**One honest boundary, restated because it is easy to misread a green suite:** `renderEmail` still has **zero callers**. These gates prove the renderer is correct; they prove nothing about any inbox. That is the plan's stated scope, not a stub — 15-03 lands eighteen senders and 15-04 the ops digest plus the nineteenth.

## User Setup Required

None — no external service configuration required. Both gates run with no Docker, no Postgres, no DOM and no network.

## Next Phase Readiness

- **For 15-03 and 15-04 (the adopters):** both gates already run on every `npm run build`, so an adopter that composes a bespoke font size, a second accent, a stray absolute link above the CTA, or a `tableHtml` without a `tableText` fails the build rather than shipping. Compose `EmailContent`; do not style.
- **⚠ One trap these gates do NOT spring, documented in `email-shell.test.ts`'s header:** a CTA href containing `&` is escaped to `&amp;` in the HTML, and `tests/helpers/mocks.ts`'s `extractLink` is a raw regex, not a parser — it recovers the entity-encoded form. `new URL(...)` still reads the **first** query parameter correctly, which is what the shipped auth tests read. **Put the token first in the query string.** An adopter that puts it second walks into a failure this gate does not catch.
- **For 15-05 (the preview harness):** `renderEmail` is importable from anything, including a script, with no transport and no DOM.
- **For any future theme:** adding a third member to `THEMES` enrols it in the EMAIL-02 gate automatically — no edit to either test file.

---
*Phase: 15-auth-profile-transactional-email*
*Completed: 2026-08-24*

## Requirements Status — EMAIL-01 / EMAIL-02 advanced, deliberately NOT ticked

This plan's frontmatter claims `requirements: [EMAIL-01, EMAIL-02]`, and neither was marked complete
in `REQUIREMENTS.md`. That is the same deliberate call 15-01 recorded, for the same reason and with
one more plan of evidence behind it.

- **EMAIL-01** reads *"**All existing sends** render through one shared branded shell."* After this
  plan, **zero** sends render through the shell. `renderEmail` still has no callers; this plan added
  only tests.
- **EMAIL-02** reads *"Email colour values are generated from the same token contract as the app."*
  Proven true of the renderer, on both themes, watched red four ways — and still true of **no email
  a person receives**.

What this plan *did* change is that both IDs are now **enforced rather than asserted in prose**: the
moment 15-03/15-04 wire the adopters, any drift in either property fails `npm run build`.

**Whoever executes 15-04 should mark EMAIL-01 and EMAIL-02 complete.** 15-03 should mark neither.
The traceability table rows for both remain `Pending`, which is accurate.

## Self-Check: PASSED

Both claimed files exist on disk (699 and 381 lines, above the plan's 150/90 floors); both claimed
commits (`51dc925`, `9ad10dd`) are present in the git history. Both `key_links` patterns resolve:
`tests/design/email-shell.test.ts` imports `from "@/lib/email-shell"`, and
`tests/design/email-tokens.test.ts` references `THEME_TOKENS` 22 times.
