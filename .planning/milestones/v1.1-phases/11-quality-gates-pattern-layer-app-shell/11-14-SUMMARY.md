---
phase: 11-quality-gates-pattern-layer-app-shell
plan: 14
subsystem: app-shell
tags: [shell-02, footer, d-26, support-email, design-gate, ast-scan, human-needed]
requires:
  - 11-10 (the `min-h-dvh flex flex-col` layout wrappers the footer hangs off, and `site-chrome.tsx`)
  - 11-12 ((app) / (host) converted onto `SiteChrome`, the two `<main className="flex flex-1 flex-col">` wrappers)
  - 11-19 (`src/app/not-found.tsx` — the sixth footer site, and the deferred item that named it)
provides:
  - "`SiteFooter` — the app's one footer pattern, mounted on six shell-composition sites"
  - "`SUPPORT_EMAIL: string | null` — the D-26 constant that decides whether a support entry exists at all"
  - "`SITE_TAGLINE` — one sentence, one owner, read by both `metadata.description` and the footer"
  - "`tests/design/site-contacts.test.ts` — the inverted gate, real in both of its states"
affects:
  - "11-15 — `(legal)/layout.tsx` becomes the SEVENTH mount site; `/terms` and `/privacy` make the footer's two authored links resolve"
  - "11-18 — `global-error.tsx` renders its own document and takes NO footer; nothing to do beyond not assuming otherwise"
  - "11-20 — blocked on `NEXT_PUBLIC_APP_URL` (human_needed #2); see the forward-warning below"
  - "11-22 — `site-footer` moves from a declared-but-absent selector id to a shipped one"
tech-stack:
  added: []
  patterns:
    - "AST-verified GUARD membership rather than substring bans — a literal is legal iff it is lexically inside a conditional whose test names the constant"
    - "`describe.runIf` two-state gates, with the unreachable state exercised against synthetic fixtures through the same functions"
    - "`EXCLUDED_*` rows keyed `file — literal`, so an exemption travels with its site and cannot be reused elsewhere"
key-files:
  created:
    - src/lib/site.ts
    - src/components/patterns/site-footer.tsx
    - tests/design/site-contacts.test.ts
  modified:
    - src/app/layout.tsx
    - src/app/(public)/layout.tsx
    - src/app/(auth)/layout.tsx
    - src/app/(app)/layout.tsx
    - src/app/(host)/host/layout.tsx
    - src/app/listings/[id]/(detail)/layout.tsx
    - src/app/listings/[id]/book/layout.tsx
    - src/app/not-found.tsx
    - .planning/phases/11-quality-gates-pattern-layer-app-shell/deferred-items.md
decisions:
  - "D-26 upheld and its UI-SPEC amendment recorded in three places: SUPPORT_EMAIL stays null, the footer renders no support entry at all, the gate INVERTS rather than softens"
  - "carry-both selected at the Task 4 checkpoint — two named human_needed items, nothing fabricated"
  - "SITE_TAGLINE hoisted into src/lib/site.ts rather than importing `metadata` from the route module, to keep not-found.tsx's import graph small"
  - "NO `<nav>` element in the footer — AC#4's one-navigation-landmark criterion is app-wide and binds harder than selector-contract.ts's prose about a footer nav"
  - "The gate's scan scope widened from `src/app/** + src/components/**` to all of `src/**`, so the Resend-sender exclusion is load-bearing rather than decorative"
metrics:
  duration: ~60 min
  completed: 2026-08-14
  tasks: 4
  commits: 4
requirements: [SHELL-02]
---

# Phase 11 Plan 14: The Footer and the Unfilled Support Slot Summary

SHELL-02's footer ships on six shell-composition sites with two provable carve-outs, and its one unfilled slot is held visibly unfilled by an AST-verified gate that is real — and has been watched failing — in **both** the `null` and the `set` state.

## What Was Built

### `src/lib/site.ts` — two constants, one of them deliberately empty

`SUPPORT_EMAIL: string | null = null`, with D-26 stated in full in the header: FitOut owns no domain and has no support inbox, a fabricated contact address is a real-world claim shipped to users, and the footer therefore renders **no support entry at all** while this is null. The header names the one line that flips everything (`src/lib/site.ts:70`) and the three things that change by themselves when it does.

`SITE_TAGLINE` is the second export and it settles the plan's explicit either/or. **The tagline has exactly one owner: `SITE_TAGLINE`, read by both `src/app/layout.tsx`'s `metadata.description` and the footer's first column.** The rejected alternative was `import { metadata } from "@/app/layout"`, which would drag the root layout's whole module graph — `next/font/google`, `globals.css`, the theme provider — into every component that wanted one string. `src/app/not-found.tsx` is prerendered precisely because its import graph is small, and it is one of the footer's mount sites. `tests/design/scaffold-residue.test.ts` still pins the resolved **value** of `metadata.description`, so the move is checked by name in one place and by value in another.

### `src/components/patterns/site-footer.tsx` — the three-column footer

Geometry verbatim from `11-UI-SPEC.md` § The Footer: `<footer data-testid="site-footer" class="mt-auto border-t bg-muted">`, container `mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12`, `grid gap-8 sm:grid-cols-3`, headings `text-sm font-medium text-foreground`, links `text-sm text-muted-foreground underline-offset-4 hover:underline hover:text-foreground`. Server Component, no domain imports, no product copy beyond the copy contract's fixed strings. **Zero elevation and zero new contrast rows** — `foreground on muted` (18.16 / 16.89) and `muted-foreground on muted` (4.82 / 5.28) were both already declared.

The support entry is `SUPPORT_EMAIL !== null ? (…) : null` with **no else-branch**, and the file says so in its own header so the next person does not "improve" it into a disabled affordance.

### `tests/design/site-contacts.test.ts` — the inverted gate

Two `describe.runIf` branches selected by reading the constant at test time, plus a structural block that runs in **both** states. Detail in *The gate* below.

## Task-by-Task

| Task | Commit | Outcome |
|---|---|---|
| 1 — `site.ts` + the footer | `54fa002` | Both files created; `layout.tsx` reads `SITE_TAGLINE` |
| 2 — mount on every route but the carve-outs | `a74341c` | Six sites wired (not five); the checkout layout carries the deliberate-omission comment |
| 3 — the inverted support gate | `20e3e1b` | 33rd design file; four watched reds recorded verbatim in its header |
| 4 — the `human_needed` checkpoint | *(this commit)* | `carry-both` selected; two items recorded below |

## The footer-site inventory is SEVEN, not five

The plan's `files_modified` names five layouts. **That list is wrong, and every plan in this phase that trusted its own inventory found the same.** An AST scan for `SiteChrome` / `PublicHeader` JSX call sites under `src/app/**` returns **seven** shell-composition sites:

| # | Site | Footer? | Why |
|---|---|---|---|
| 1 | `src/app/(public)/layout.tsx` | ✅ | the public composition |
| 2 | `src/app/(auth)/layout.tsx` | ✅ | the public composition, unmodified (11-10) |
| 3 | `src/app/(app)/layout.tsx` | ✅ | booker shell |
| 4 | `src/app/(host)/host/layout.tsx` | ✅ | host shell — the footer is one of the few things D-04 does *not* make distinct |
| 5 | `src/app/listings/[id]/(detail)/layout.tsx` | ✅ | listing detail |
| 6 | **`src/app/not-found.tsx`** | ✅ | **the one the plan could not see** |
| 7 | `src/app/listings/[id]/book/layout.tsx` | ❌ **never** | SHELL-03 — a footer is a grid of links, and any link loses a live hold |

**Site 6 is the finding.** The root not-found sits directly inside `src/app/layout.tsx`, which 11-10 deliberately left chrome-free, so it is ABOVE all five route groups and composes its own shell. A plan that enumerates *group layouts* structurally cannot see it. 11-19 shipped the file, hit exactly this, and left the handoff in `deferred-items.md`; this plan took it. The general lesson: **enumerate footer sites by scanning for shell composition, not by listing layouts.** `(legal)` becomes the seventh mount site when 11-15 creates it.

`src/app/listings/[id]/book/layout.tsx` gained a paragraph recording the omission as deliberate — but naming the component **descriptively** rather than by its binding, because the plan's own acceptance criterion is `grep -c "SiteFooter" … → 0` and a comment that spells the binding satisfies "carries the comment" while failing "returns 0" **on a correct tree**. That is the eleventh instance of this collision in Phase 11; `booking-row.tsx:112` set the precedent and this follows it. Same reasoning applied inside `site-footer.tsx` for the client-boundary directive — where the first draft tripped the zero-count grep **twice**, once by quoting the directive and once by quoting the grep command that looks for it.

## The gate: why it is an AST walk and not a substring ban

`site-footer.tsx` legitimately **contains** the strings `mailto:` and `Support` today, inside the branch that never renders. A gate that banned those substrings would be red against the exact implementation D-26 prescribes — this phase's named failure mode arriving from the opposite direction.

So the null branch does not assert *zero occurrences*. It asserts **zero UNGUARDED occurrences**, where "guarded" is decided over the AST: the literal must sit lexically inside the true-branch of a conditional whose test names `SUPPORT_EMAIL`, and that conditional's else-branch must be the `null` keyword. Beside it sits the assertion that makes the guarded branch harmless in the first place — **the footer contains no address-shaped literal at all, guarded or not**. A fabricated address cannot hide in the dead branch, and the live branch can only ever emit the constant.

Structural, running in **both** states: exactly one `SUPPORT_EMAIL` conditional, no else-branch, no address literal. Null branch: `SUPPORT_EMAIL` is exactly `null` (not `""`, not `undefined`); every `mailto:` and every `Support` label in `src/` is guarded; every address-shaped literal is a declared `EXCLUDED_ADDRESSES` row with a reason, and every declared row must still fire. Non-null branch: a string containing `@`, **exactly one** `mailto:` in the footer, and it must **interpolate** the constant rather than retype an address.

**Scope widened, deliberately:** the scan covers all of `src/**`, not the plan's `src/app/** + src/components/**`. Under the narrower scope `src/lib/email.ts` — holding `onboarding@resend.dev`, the one real address in this repository — falls outside the scan entirely and its exclusion row never fires. **A declared exception the scanner cannot see IS a gate that has quietly become decoration**, which is the precise thing D-26 exists to prevent. There are five declared exclusions: the Resend sandbox sender, and four `you@example.com` email-input placeholders.

### Watched reds — four probes, and the two greens

Recorded verbatim in the file's own header. A two-state gate has **two** greens, and recording only one would hide exactly the branch that has never run:

| Run | Result |
|---|---|
| GREEN, `SUPPORT_EMAIL === null` (today) | **23 passed / 3 skipped** |
| GREEN, constant set + link rendered | **20 passed / 6 skipped** |
| (a) fabricated `mailto:support@fitout.ph` outside the guard | **4 failed** — naming file, line and literal on three separate assertions |
| (b) constant set, guarded entry deleted | **2 failed** — including the structural one that runs in *both* states |
| (c) rendered twice | **1 failed** — `expected 2 to be 1` |
| (d) `SRC_DIR` → `src-nope` | **4 failed** — and see below |

The skip counts moving 3 → 6 in opposite directions is the visible proof both blocks exist. Probe (b)'s second failure is the one worth reading: deleting the entry does not merely fail the state that demands it, it fails the structural assertion that runs in both — there is no configuration of this tree in which the guard can quietly disappear.

**Probe (d) reproduced this phase's recurring vacuity result for the third time.** Over a tree the scanner never opened, **all three null-branch zero-assertions PASSED** — a perfectly clean result over a scan of nothing, permanently, and indistinguishable from a real clean run. That is the entire argument for the ≥100-file floor, the three by-name reach assertions (`site-footer.tsx`, `site.ts`, `email.ts`), the positive control that flags a synthetic affordance, and the negative control that proves prose is invisible. Per the prior-wave warning, every prescribed probe was confirmed to go **red on a broken tree AND green on a correct one** before being trusted.

## Deviations from Plan

### Auto-fixed / adjusted

**1. [Rule 2 — missing critical coverage] The sixth footer site**
- **Found during:** Task 2, by AST scan before trusting the plan's list
- **Issue:** the plan wires five layouts; `src/app/not-found.tsx` is a sixth site and would have shipped footerless on every 404 in the app
- **Fix:** `<SiteFooter />` added there, kept DB-free; the file's own header rewritten from "the footer is not here yet" to an account of why this site is the one every inventory misses
- **Commit:** `a74341c`

**2. [Rule 3 — criterion unsatisfiable as written] Descriptive naming in two files**
- **Issue:** `grep -c "SiteFooter" book/layout.tsx → 0` and `no "use client" in site-footer.tsx` both collide with the comments the same plan requires
- **Fix:** both named descriptively, with the collision recorded in-file so the next reader finds the reason rather than the discrepancy
- **Commits:** `54fa002`, `a74341c`

**3. [Plan-sanctioned option] `SITE_TAGLINE` in `site.ts`, read by `layout.tsx`**
- The plan offered either shape and required the SUMMARY to name which. `src/app/layout.tsx` is in the diff for this reason and this reason only.

**4. [Deliberate, recorded] No `<nav>` in the footer**
- `selector-contract.ts:287-291` reasons about "the footer's nav" when explaining why `site-nav` needs a test id. `11-UI-SPEC.md` **AC#4** is a falsifiable app-wide criterion: `getByRole("navigation")` resolves to exactly **1** at 320px and 1280px. A second landmark would break AC#4 on every route to buy a landmark WAI-ARIA does not ask for — `<footer>` is already `contentinfo`. AC#4 binds; the row's conclusion is still correct, so it was **not** edited. Recorded in the footer's header instead. Verified: `/` renders a footer and **zero** `<nav>`.

**5. [Scope widened] The gate scans all of `src/**`** — see *The gate* above.

### Out of scope, logged not fixed

`e2e/search-and-book.spec.ts:318` — see below. Logged to `deferred-items.md`.

## The near-misattribution, and why the measurement is worth keeping

**This looked exactly like a regression this plan had just caused, and it was not.**

The plan's prescribed verification is `npx playwright test e2e/public-listing.spec.ts e2e/search-and-book.spec.ts`. On the first run after `<SiteFooter />` was wired into `(app)/layout.tsx`, `search-and-book.spec.ts:318` failed with a strict-mode violation: `getByText(<reference>, { exact: true })` resolved to **2** identical `<p class="text-2xl … tabular-nums …">` elements after `page.reload()`. One control run with the footer removed **passed**. Footer in → red; footer out → green. Causation looked settled.

It was not, and the prior wave's warning — *never treat a single e2e result as proof* — is what stopped it being written up as one. The spec was instrumented with a temporary DOM dump between the reload and the failing assertion (added, measured, **reverted**; the spec is byte-identical to its committed form), and both configurations were run repeatedly:

| Configuration | Runs | Duplicate observed | Shape at failure |
|---|---|---|---|
| `<SiteFooter />` present | 3 | **1 of 3** | `refP:2 main:3 footer:1 hidden:3` |
| footer removed | 4 | **2 of 4** | `refP:2 main:3 footer:0 hidden:3` |

It fails **more often without the footer.** The captured DOM shows the duplicate is `<div hidden="" id="S:1">` holding a second copy of the page's `<main>` — React's streaming buffer for the segment's Suspense boundary, caught before the inline swap script removed it. It is **not** a hydration mismatch (`data-testid="site-footer"` and `site-header` are 1 each in the captured DOM), it is never visible to a user, and `hidden` is irrelevant to Playwright's `getByText` — which is what makes the assertion strict-mode-fragile rather than the page wrong.

Not fixed here (SCOPE BOUNDARY): the defect is a spec's locator on a page this plan does not touch, and `e2e/**` is outside this plan's `files_modified`. The fix is a locator that tolerates the streaming buffer, not a change to `bookings/[id]/page.tsx`. Same duplicate-node class as `[11-03]`'s and `[11-13]`'s entries, now with a captured DOM and a named mechanism.

**Three consecutive runs of the prescribed command afterwards: 6 passed, 6 passed, 1 failed** — the same flake, at the pre-existing rate.

## Checkpoint Decision (Task 4) — `carry-both`

**Selection recorded verbatim as given:**

> Decision: **`carry-both`**.
>
> Rationale to record verbatim: neither a real monitored support inbox nor a deployed origin exists yet, and the only alternatives required fabricating one or both. Nothing false ships; the gate stays real in both states; both unfilled slots stay visible at phase completion instead of being quietly filled.

`SUPPORT_EMAIL` remains `null`. Nothing in the tree changed as a result of this decision — the implementation already *was* `carry-both`.

### ⚠ D-26 amends `11-UI-SPEC.md` AC#8 — stated explicitly

AC#8 read: *"`SUPPORT_EMAIL` is a non-null string containing `@`; the footer renders exactly one `mailto:`; `site-contacts.test.ts` passes. **The phase cannot complete with the placeholder in place.**"* and § The unfilled slot added *"A phase-completion check that accepts a null here has accepted a rubber stamp."*

**That clause no longer holds.** A named `human_needed` item replaces it — the same convention the roadmap already uses for the sales-gated PayMongo threads. AC#8's own terms are what justify it: what would be a rubber stamp is a gate that went *quiet*, and this gate does not. It asserts strictly more in the null state than the original would have (zero unguarded affordances anywhere in `src/`, a declared exclusion list, a guard with no else-branch, no address literal even in dead code) and flips itself to the demanding form automatically.

**Recorded in four places**, so a future reader finds the reason rather than the discrepancy: `11-CONTEXT.md` § D-26 (the origin), `src/lib/site.ts`'s header block, `tests/design/site-contacts.test.ts`'s header (verbatim, including the amendment clause), and here.

### `human_needed` #1 — a real, monitored FitOut support address

**What is needed:** a real support inbox that a human reads, for `src/lib/site.ts`'s `SUPPORT_EMAIL`.
**Blocked on:** a business fact, not on code. FitOut owns no domain. The only address in `src/` is Resend's sandbox sender, and replies to it go nowhere.
**When it arrives:** a **one-line edit at `src/lib/site.ts:70`** — `= null` becomes `= "…@…"`. Nothing else changes anywhere. The footer's support entry appears by itself (its guard is `SUPPORT_EMAIL !== null`), and `tests/design/site-contacts.test.ts` switches branches automatically — a branch already run **red twice and green once against the real file**, not merely against a fixture. If the constant is set without the link being rendered, that branch fails until both agree.
**Do not:** fabricate an address, or soften the gate to make the slot look filled. Both are banned by `11-UI-SPEC.md` § Anti-Patterns and by D-26.

### `human_needed` #2 — `NEXT_PUBLIC_APP_URL` set to the deployed origin

**What is needed:** the deployed origin, so `resolveMetadataBase()` (`src/app/layout.tsx:52`, `:95-102`) stops falling back to `http://localhost:3000`.
**Blocked on:** a domain FitOut does not own yet.
**Consequence today:** `metadataBase` is `http://localhost:3000` on every machine, so every relative `openGraph.images` entry resolves localhost-absolute. (T-11-OGBASE, disposition `accept`.)

**⚠ FORWARD-WARNING TO PLAN `11-20`.** 11-20 owns SHELL-04 — *make a pasted FitOut link unfurl correctly* — and its criteria include "the image responds 200 at 1200×630". **A green local check is not proof its unfurls work.** With the origin unset, every `og:image` URL it ships is `http://localhost:3000/...`: 200 on the author's machine, unreachable to Slack, Messenger, Viber, X and every other crawler that will ever fetch it. The two are indistinguishable from inside the repo. 11-20 should (a) assert the **shape** is correct **given the configured origin** — that the emitted URL is absolute and equals `new URL(path, metadataBase).href` — rather than asserting a literal host; (b) record in its SUMMARY that end-to-end unfurl verification is **blocked on this item**, not merely untested; and (c) resist hardcoding a plausible production origin to make a check go green — that is D-26's fabrication arriving through the metadata layer instead of the footer. `resolveMetadataBase()` already degrades safely for a *malformed* value (WR-05 / WR-12); the gap is a **missing** value, not a broken guard.

Both items are also in `deferred-items.md`, so they survive independently of this SUMMARY.

## Hand-offs

- **11-15** — `/terms` and `/privacy` **do not exist yet**. The footer's two Legal links are authored here and resolve one plan later; **a reviewer testing the footer in between gets two 404s, and that is expected, not a defect.** `(legal)/layout.tsx` becomes the seventh mount site and must render `<SiteFooter />` like the other six.
- **11-18** — `global-error.tsx` renders its own document and receives no stylesheet. Its contract already says "Footer / header: none"; nothing to do beyond not assuming otherwise.
- **11-22** — `site-footer` is no longer a declared-but-absent selector id. The `site-brand` row's stated reason ("the footer ships a second link home with the same name") is now true: the footer's wordmark links to `/`.
- **Whoever fixes the e2e flake** — `deferred-items.md` carries the captured DOM, the mechanism and the measurement.

## Verification Run

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | 0 errors (9 pre-existing warnings, unchanged) |
| `npm run build` with unreachable `DATABASE_URL` | **exit 0** |
| Route table, mechanically diffed vs pre-plan baseline | **identical** — `/_not-found` and `/dev/theme` still the only `○ Static` routes |
| `npm run test:design` | **33 files / 584 passed + 3 skipped** (was 32 / 561) — raised by exactly one file |
| `npx vitest run` (full suite) | **1217 passed / 4 skipped** — unchanged |
| `grep -c "shadow-" site-footer.tsx` | **0** |
| `grep -c "use client" site-footer.tsx` | **0** |
| `grep -c 'data-testid="site-footer"' site-footer.tsx` | **1** |
| `grep -c "SiteFooter" book/layout.tsx` | **0** |
| `grep -c "onboarding@resend.dev" site-contacts.test.ts` | **3** (≥ 1) |
| AST count of `<SiteFooter />` sites under `src/app/**` | **6**, one each |
| `ls drizzle/*.sql \| tail -1` | `0025_audit_resolved_by.sql` — GATE-06 intact |
| `e2e/public-listing.spec.ts` + `e2e/search-and-book.spec.ts` ×3 | 6 passed, 6 passed, 1 failed (the pre-existing flake above) |

### Rendered footer counts — production server, real session cookies

| Route | HTTP | `site-footer` | `site-header` | `mailto:` | `Support` |
|---|---|---|---|---|---|
| `/` | 200 | **1** | 1 | 0 | 0 |
| `/listings/{id}` | 200 | **1** | 1 | 0 | 0 |
| `/invite/{token}` | 200 | **1** | 1 | 0 | 0 |
| `/login` · `/signup` | 200 | **1** | 1 | 0 | 0 |
| `/bookings` (auth) | 200 | **1** | 1 | 0 | 0 |
| `/host` · `/host/requests` (auth) | 200 | **1** | 1 | 0 | 0 |
| `/profile` (auth) | 200 | **1** | 1 | 0 | 0 |
| unmatched URL → root not-found | 404 | **1** | 1 | 0 | 0 |
| `/listings/{id}/book` | — | **0** | — | 0 | 0 |

No route renders two footers. Zero `mailto:` and zero `Support` anywhere in the rendered app — the null state, observed rather than asserted.

**On the checkout carve-out:** `/listings/[id]/book` requires a live `?hold=` and returns 404 without one, so its zero-footer state is proved structurally rather than only by that render: its layout chain is `src/app/layout.tsx` → `listings/[id]/book/layout.tsx` (no `listings/layout.tsx` and no `[id]/layout.tsx` exist), and **neither file references the footer** — AST count 0, grep count 0. There is no component in that route's tree that could supply one. `e2e/search-and-book.spec.ts` separately drives the checkout page to its live 200 state and passes.

## Known Stubs

**One, and it is the plan's subject rather than an oversight:** `SUPPORT_EMAIL = null` in `src/lib/site.ts`. It is not a stub in the "quietly empty" sense — it renders **nothing** rather than a placeholder, it is guarded by a test that fails if anything false appears, and it is carried as `human_needed` #1 above. This is D-26's intended terminal state for the phase.

`/terms` and `/privacy` are authored links to routes plan 11-15 creates. Not a stub in this plan — a declared one-plan ordering, recorded above and in the footer's source.

## Self-Check: PASSED

- `src/lib/site.ts` — FOUND
- `src/components/patterns/site-footer.tsx` — FOUND
- `tests/design/site-contacts.test.ts` — FOUND
- `54fa002` — FOUND
- `a74341c` — FOUND
- `20e3e1b` — FOUND
