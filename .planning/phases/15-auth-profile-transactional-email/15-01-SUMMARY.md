---
phase: 15-auth-profile-transactional-email
plan: 01
subsystem: ui
tags: [email, html-email, design-tokens, theme, escaping, xss, next-themes]

# Dependency graph
requires:
  - phase: 10-design-system-foundation
    provides: "THEME_TOKENS in src/lib/design/tokens.generated.ts — the one sanctioned duplicate of a design-token value, and the leak gate's src/lib/design/** exclusion that makes it legal"
  - phase: 11-shell-and-site-chrome
    provides: "src/lib/site.ts — SUPPORT_EMAIL (null, D-26) and SITE_TAGLINE, plus the guarded-slot-with-no-else-branch shape site-contacts.test.ts enforces"
provides:
  - "src/lib/design/theme.ts — the one pure, import-free owner of THEMES / ThemeName / DEFAULT_THEME / THEME_STORAGE_KEY, importable from server code"
  - "src/lib/email-shell.ts — renderEmail(content, theme) returning { html, text }, both projected from one EmailContent"
  - "EmailContent — the content type all 19 senders will compose against"
  - "escapeHtml as a single exported owner; exactly one implementation now exists in the repository"
  - "The 600px table skeleton with the seven-token palette read lazily from THEME_TOKENS"
affects: [15-02, 15-03, email adoption plans, any phase adding a transactional send]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure exported renderer over a plain value, so a setupFiles-free design config can assert on the STRING rather than on a captured send"
    - "Palette read INSIDE the renderer, never at module scope, so the theme argument is honoured rather than frozen at import time"
    - "One choke point escapes every caller-supplied sink, including the derived preheader"
    - "Guarded slot with no else-branch, spelled so the site-contacts AST walker recognises it"

key-files:
  created:
    - src/lib/design/theme.ts
    - src/lib/email-shell.ts
  modified:
    - src/components/theme/theme-provider.tsx
    - src/lib/email.ts
    - tests/design/pair-drift.test.ts

key-decisions:
  - "The email <title> carries the escaped heading, not the subject: the renderer is not handed a subject, and threading one through would add an argument to all nineteen composition sites for a string no client displays prominently"
  - "pair-drift.test.ts's THEMES pin follows the declaration to its new owner rather than being deleted; the provider's re-export line would have matched the old assertion vacuously"
  - "The THEME_STORAGE_KEY docblock keeps its verbatim mention of the theme-runtime library, so the plan's literal zero-grep for that name is not met; the property it protects (no runtime dependency) is met more strictly — the module has zero imports"
  - "The tagline is escaped too, making six escape sites rather than the plan's five; escaping a known-safe constant is free and removes a future footgun"

patterns-established:
  - "Shell metrics and type sizes are named module constants, declared once and never retyped per send"
  - "Comments in the email tier name tokens descriptively (the quiet ground, the accent fill) and never quote a colour value or a utility class"
  - "Named HTML entities only in the shell — a numeric character reference reads as a colour value to the palette gate"

requirements-completed: [EMAIL-01, EMAIL-02]

# Metrics
duration: 18min
completed: 2026-08-24
---

# Phase 15 Plan 01: Email Shell Foundations Summary

**`renderEmail` — one pure function turning an `EmailContent` into an HTML document and a plain-text twin that cannot drift from it, painting from the same seven generated tokens the app does, plus a directive-free owner for the product-theme name that eight existing importers never noticed moving.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-08-24T08:48:46Z
- **Completed:** 2026-08-24T09:07:12Z
- **Tasks:** 2
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments

- **`DEFAULT_THEME` has one pure owner.** `THEMES` / `ThemeName` / `DEFAULT_THEME` / `THEME_STORAGE_KEY` moved verbatim (docblocks included) into `src/lib/design/theme.ts`, a module with **zero imports of any kind**. `theme-provider.tsx` re-exports all four, so all eight existing importers — the root layout, two client components, one design test and five e2e files — compile with **zero edits**. The email tier is the first server-side reader these constants have ever had, and it reaches them without a React-context library entering the graph.
- **`renderEmail` exists and is provably correct on every property the plan named.** Verified against a rendered send: the `#`-literal set in the HTML equals **exactly** the seven `THEME_TOKENS[court]` values (`--muted`, `--card`, `--foreground`, `--muted-foreground`, `--border`, `--brand`, `--brand-foreground`) with no eighth; the **first absolute URL in the body is the CTA href** (the property three shipped auth tests silently depend on); the font stack appears **once**; the rendered font sizes are exactly the four type roles plus the preheader's 1px suppression value; a `grove` render moves the whole palette (the court ground is absent from it).
- **Exactly one `escapeHtml` exists in the repository.** It moved verbatim into the shell and `email.ts` imports it. `renderOpsAlertDigest` kept all 82 of its per-field calls — its output enters through the one pre-escaped slot, which the renderer deliberately does not escape.
- **The footer's support slot is wired and silent.** One `SUPPORT_EMAIL !== null` conditional whose false branch is the bare `null` keyword, spelled so `site-contacts.test.ts`'s AST walker counts the `mailto:` inside it as guarded. While the constant is null, nothing about support appears in either projection.
- **Full suite green:** 180 test files / 1892 tests passed, plus 50 design files / 837 tests. `tests/auth/email-escaping.test.ts` and `tokens.generated.ts` are byte-identical.

## Task Commits

1. **Task 1: Relocate the product-theme owner to a pure module** — `b344ce2` (refactor)
2. **Task 2: Build renderEmail — the one choke point** — `4045859` (feat)

**Plan metadata:** see final commit (docs: complete plan)

## Files Created/Modified

- `src/lib/design/theme.ts` **(created)** — the four theme-name declarations, moved verbatim with their docblocks. No directive, no environment guard, no imports at all.
- `src/lib/email-shell.ts` **(created, 244 lines)** — `EmailContent`, `escapeHtml`, `renderEmail`. The 600px table skeleton, the shell's own spacing and type constants, the seven-token palette read inside the renderer, five escape sites, the guarded support slot, and the plain-text projection built from the same value rather than by stripping tags.
- `src/components/theme/theme-provider.tsx` **(modified)** — four declarations replaced by an import plus a re-export of the same four names. The `"use client"` directive, the D-06/D-07/D-08 header, the `next-themes` import and every `<NextThemes>` prop and its comment are unchanged.
- `src/lib/email.ts` **(modified)** — local `escapeHtml` deleted, imported from the shell with a header note on why one owner and two readers. Nothing else moved: no subject, no recipient, no argument list, no trigger.
- `tests/design/pair-drift.test.ts` **(modified — deviation, see below)** — the `THEMES` declaration pin follows the declaration to its new module.

## Decisions Made

- **The `<title>` carries the escaped heading, not the subject.** Recorded as a deliberate departure from 15-UI-SPEC's "the title is the subject's text". `renderEmail` is not handed a subject, and threading one through would add an argument to all nineteen composition sites for a string no mainstream client displays prominently. The heading is the same sentence in shell terms.
- **`pair-drift.test.ts`'s pin follows the declaration rather than being deleted.** The gate reads source TEXT to prove the app declares exactly two theme names and neither is `dark` — the premise that licenses its `dark:`-utility narrowing. After the move, reading that from the provider would only ever match the re-export line, which is a weaker claim. The assertion now reads the names' own module, and a companion assertion pins that the provider really imports from that owner, so the pin cannot become an assertion about an unread file.
- **The tagline is escaped too.** Six escape sites rather than the plan's five. It is a known-safe constant today; escaping it costs nothing and removes the footgun if it ever becomes configurable.
- **Named HTML entities only** (`&zwnj;&nbsp;`) for the preheader padding. A numeric character reference such as `&#8203;` matches the plan's own zero-hex grep and would have failed the EMAIL-02 gate for a reason unrelated to colour.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `pair-drift.test.ts` pinned the `THEMES` declaration at the module it moved out of**

- **Found during:** Task 1 (Relocate the product-theme owner)
- **Issue:** `tests/design/pair-drift.test.ts:717` asserted `THEME_PROVIDER_SOURCE` contains the literal `export const THEMES = ["court", "grove"] as const;`. Task 1 moves exactly that line to `src/lib/design/theme.ts`, so `npm run test:design` went red (1 failed / 49 passed). The plan's `<read_first>` named `tests/design/theme-provider.test.tsx` — which asserts on the module's *shape* and passed unchanged — but not this gate, which asserts on its *text*.
- **Fix:** Added a `THEME_NAMES_SOURCE` read of `src/lib/design/theme.ts` and pointed the `THEMES` assertion at it, with a docblock recording why the subject moved and that the property pinned is unchanged. The two provider-prop assertions still read the provider. Added one assertion that the provider imports from the new owner, so the pin can never become an assertion about a file nothing reads.
- **Files modified:** `tests/design/pair-drift.test.ts`
- **Verification:** `npm run test:design` — 50 files / 837 tests passed.
- **Committed in:** `b344ce2` (Task 1 commit)
- **Note on scope:** this puts a fifth file in the plan's diff, against the plan's `<verification>` clause "`git diff --name-only` at plan end lists only the four files in `files_modified`". The gate could not be left red, and the alternatives were worse: keeping a second `THEMES` declaration in the provider defeats the one-owner rule the whole task exists to establish, and deleting the assertion would remove the premise licensing an unrelated narrowing elsewhere in the same file.

### Acceptance criterion not met literally (property met more strictly)

**2. `grep -c 'next-themes' src/lib/design/theme.ts` returns 1, not 0**

- **Where:** Task 1, acceptance criteria.
- **Cause:** the single occurrence is inside the `THEME_STORAGE_KEY` docblock — *"next-themes' OWN default storage key…"* — which the same task's `<action>` requires be moved **"verbatim, with their docblocks"** and **"keeping its full docblock about the Playwright seam"**. The two instructions are in direct conflict.
- **Resolution:** the `<action>`'s verbatim rule was followed, because the sentence explains *why the constant exists* and rewriting it would lose the reason for the export. The property the criterion protects — that no client library enters the module's import graph — holds more strictly than the grep could show: `grep -cE '^\s*import ' src/lib/design/theme.ts` is **0**, and `grep -c 'require('` is **0**. The module has no dependencies at all.
- **Follow-up for the verifier:** if the literal grep is wanted, the docblock can be reworded to say "the theme runtime's own default storage key" — but that trades a named fact for a vaguer one, and the header already explains (per § Pitfall 9) why this file avoids naming banned tokens anywhere it has a choice.

---

**Total deviations:** 1 auto-fixed (Rule 3 — blocking), 1 acceptance criterion resolved against a conflicting `<action>` instruction.
**Impact on plan:** No scope creep. The auto-fix repaired a gate the plan's own change broke and left it strictly stronger than it was. The plan's four `files_modified` are all present and all changed as specified.

## Issues Encountered

None beyond the deviation above. Both verification commands passed on the first attempt after the fix, and the full suite (`npm test`, run alone per this repo's global-setup truncation hazard) is green at 180 files / 1892 tests.

## Threat Flags

None. The four threats this plan was asked to mitigate are all implemented and were verified against a rendered send:

| Threat | Verified how |
|---|---|
| T-15-01 (heading / paragraphs / CTA label / CTA href) | escaped at the one choke point; `email-escaping.test.ts` green, unedited |
| T-15-02 (derived preheader) | `escapeHtml(content.preheader ?? content.heading)` before it enters the div |
| T-15-04 (token leaked via the first-URL probe) | first absolute URL in the rendered body is the CTA href — no doctype URL, no namespace attr, wordmark is text |
| T-15-06 (fabricated support address) | one guard, no else-branch; no `mailto:` and no `Support` label in the rendered output today |

T-15-03 (the `tableHtml` slot) is `accept` by design and is documented on the field itself, as the register requires. T-15-SC holds: **zero package installs** in this plan.

## Known Stubs

None. `renderEmail` is complete and fully wired to real data sources (the generated token module, the theme owner, the site constants). It has **no callers yet** — that is the plan's stated boundary, not a stub: EMAIL-01's nineteen adopters are the next plans' work, and this plan deliberately left every send trigger, subject, recipient and argument list byte-identical.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Ready:** `renderEmail` can be imported by a DB-free, `setupFiles`-free vitest config without pulling in the mail transport, the theme runtime or a React context — which is what lets the EMAIL-02 hex gate run inside `npm run build`.
- **Ready for the adopters:** `EmailContent` is the contract. The ops digest's split is pre-figured by the type — its two runbook `<p>` blocks and truncation note become `paragraphs`, its `<table>` becomes `tableHtml` with a matching `tableText`, and it renders zero CTAs.
- **Note for the adopter plan:** `send()` still takes only `html`. The spec's "the private `send()` gains a `text` parameter" is not done here — this plan's `files_modified` scoped `email.ts` to the `escapeHtml` import only. The plain-text twin is produced but not yet delivered.
- **Note for whoever writes the EMAIL-02 gate:** assert the `#`-literal set against `THEME_TOKENS[DEFAULT_THEME]` read at test time, so a theme swap moves the expectation and the rendering together. A `grove` render is a good second case — it is already known to move the whole palette.

---
*Phase: 15-auth-profile-transactional-email*
*Completed: 2026-08-24*

## Self-Check: PASSED

All 6 claimed files exist on disk; all 3 claimed commits (`b344ce2`, `4045859`, `9d46e16`) are present in the git history.
