---
phase: 11-quality-gates-pattern-layer-app-shell
plan: 15
subsystem: app-shell
tags: [shell-02, legal, prose, placeholder, design-gate, ast-scan, static-routes, human-needed]
requires:
  - 11-08 (`PanelCard`, and `tone="muted"` as the neutral status tone at panel scale)
  - 11-14 (`SiteFooter` and its two authored Legal links, which had nowhere to land until now)
  - 11-10 (`SiteChrome` and the `min-h-dvh flex flex-col` wrapper the footer hangs off)
  - 11-19 (`src/app/not-found.tsx`'s prerender-safe header composition, copied here for the same reason)
provides:
  - "`/terms` and `/privacy` — the footer's two Legal links now resolve, both `○ Static`"
  - "`src/app/(legal)/layout.tsx` — the seventh `SiteFooter` mount site and the app's first prose measure (65ch)"
  - "`tests/design/legal-copy.test.ts` — AC#9 + AC#10, with closure stated FORWARDS and six watched reds"
affects:
  - "11-18 — the `(legal)` group now exists, so `src/app/(legal)/error.tsx` has somewhere to go"
  - "11-21 — `/terms` and `/privacy` are two more screenshot targets (11-UI-SPEC § the 320/768/1280 table)"
  - "11-22 — `legal-placeholder-notice` moves from a declared-but-absent selector id to a shipped one"
tech-stack:
  added: []
  patterns:
    - "Forward-stated closure: WALK the tree, require every site found to be declared — so an emptied inventory FAILS instead of passing"
    - "Comment-stripped AST text scan over three node kinds (JSX text, string literals, flattened `+` chains), never a grep"
    - "A placeholder that is asserted BY STRING EQUALITY and coupled to its own gate's deletion"
key-files:
  created:
    - src/app/(legal)/layout.tsx
    - src/app/(legal)/terms/page.tsx
    - src/app/(legal)/privacy/page.tsx
    - tests/design/legal-copy.test.ts
  modified:
    - .planning/phases/11-quality-gates-pattern-layer-app-shell/deferred-items.md
decisions:
  - "The `(legal)` group renders `SiteChrome` + `AnonymousAuthActions`, NOT `PublicHeader` — both configurations were BUILT, and the cost is stated rather than hidden"
  - "The page bodies assert NOTHING about the business; every bullet is what the published document will COVER. A concrete claim would falsify the notice one paragraph above it"
  - "The `data-testid` sits on a wrapper `<div>`, because `PanelCard` owns its own id and takes no pass-through props, and the selector contract only sees string literals"
  - "The PanelCard-composition assertion lives in `legal-copy.test.ts`, NOT in `card-pattern-coverage.test.ts`, whose `EXPECTED_SURFACES` is derived from the UI-SPEC's three `Replaces` lists"
  - "Metadata is title-only; the emitted OG/Twitter tags were MEASURED rather than assumed (11-20's finding)"
metrics:
  duration: ~75 min
  completed: 2026-08-17
  tasks: 3
  commits: 5
requirements: [SHELL-02]
---

# Phase 11 Plan 15: `/terms` and `/privacy` — Real Routes, Non-Binding Content Summary

The footer's two Legal links now resolve to prerendered 65ch prose pages whose placeholder notice is asserted by string equality, whose bodies assert nothing whatsoever about the business, and whose gate has been watched failing six times — including the vacuity probe that, for the fourth time in this phase, showed the headline assertion passing perfectly over a scan of nothing.

## What Was Built

### `src/app/(legal)/layout.tsx` — a measure, and a trade that was measured rather than argued

The group's only contribution is `<main className="mx-auto w-full max-w-prose px-4 py-12 sm:py-16">`. `max-w-prose` was verified in the emitted bundle rather than assumed: `.max-w-prose{max-width:65ch}` is in `.next/static/chunks/2wtl3np8y6kfp.css`, and the rendered `<main>` measures **690px at 1280** in both themes. `@tailwindcss/typography` is not installed — `package.json` is untouched across all five commits.

It is the **seventh** `SiteFooter` mount site, exactly as `site-footer.tsx:19` predicted by name.

### `src/app/(legal)/terms/page.tsx` and `privacy/page.tsx`

`<h1>` `text-display` → the notice → `<h2>` `text-heading mt-8` → a nine-row outline → a closing line in `text-label text-muted-foreground`. The notice is `PanelCard tone="muted"` carrying `InfoIcon size-5 text-muted-foreground` and the UI-SPEC's copy verbatim.

### `tests/design/legal-copy.test.ts` — the 36th design file

Twenty-one assertions in four groups. Detail in *The gate* below.

## Task-by-Task

| Task | Commit | Outcome |
|---|---|---|
| 1 — the `(legal)` group and its measure | `82b675a` | Layout created; both header configurations built and diffed |
| 2 — the two pages | `6c76dd4` | Notice above the fold in both themes; four roles measured per theme |
| 3 — the legal-copy gate | `414ba26` | 21 assertions, six watched reds recorded verbatim in its header |
| — deferred items | `96cb57e`, `3b9e985` | Three items, including the `human_needed` for the real documents |

## The content-honesty problem, and what was actually done about it

This plan authors the app's first long-form legal prose, and the risk named in its brief is real: getting a factual claim wrong on a Terms or Privacy page is a real-world harm.

**The resolution is that these pages make no factual claims at all, and that is a decision rather than an omission.** Every one of the eighteen bullets across the two pages is a noun phrase describing what the **published** document will cover. None describes what FitOut does, charges, holds, processes or is liable for.

The reasoning is forced by the notices themselves. `/privacy`'s notice says, verbatim and by acceptance criterion, *"Nothing on it describes how FitOut actually handles your data."* A body that then named PayMongo as the payment processor, or Postgres as the store, or Resend as the mail path — all three of which are true of this tree — would **falsify its own notice one paragraph below it**, and would do so with the exact class of statement people rely on when deciding whether to hand over information. The same holds on `/terms` for any statement about commission, refunds or liability.

So the true facts available in the tree were deliberately **not** written into the pages. Where a section genuinely cannot exist without an undecided fact, the bullet says so out loud rather than omitting the section:

- *"Which company stands behind FitOut, where it is registered, and which country's law and courts apply — **none of the three has been decided yet**."*
- *"A retention period for each category of record… — **no schedule has been decided yet**."*
- *"The named contact for data questions and the regulator a complaint can be taken to — **neither has been decided yet**."*

**Neither page is legal advice, and nobody who wrote them is qualified to give it.** Both files say so in their own headers, and this SUMMARY says it here: the published documents need review by a lawyer. That is an honest limitation of what a coding plan can produce, not a hedge — and it is carried as a named `human_needed` item below and in `deferred-items.md`.

**No contact address was invented.** `src/lib/site.ts`'s `SUPPORT_EMAIL` is still `null` and `tests/design/site-contacts.test.ts` still passes unchanged in its null branch; the privacy outline needs a data contact and says it does not have one, rather than reaching for the Resend sandbox sender or a plausible `support@`. **No production origin was invented** either — `NEXT_PUBLIC_APP_URL` remains unset and the emitted `og:image` on these routes is `http://localhost:3000/opengraph-image?…`, identical to every other route.

## The static-versus-correct-header trade, measured both ways

This is the plan's one genuine conflict, and it was resolved with a build rather than an argument.

`PublicHeader` — the composition `(public)`, `(auth)` and `listings/[id]/(detail)` all render — resolves its actions cluster from the request, which is a prerender bailout. The plan, the UI-SPEC and the threat register (T-11-STATICLEAK, disposition `mitigate`) all require these two routes to be `○ Static`. Both cannot be true.

**Measured on this tree, `npm run build`, route table diffed mechanically:**

| `(legal)/layout.tsx` renders | `/terms` | `/privacy` | static routes in the build |
|---|---|---|---|
| `SiteChrome` + `AnonymousAuthActions` (shipped) | `○` | `○` | **5** — the 3 pre-existing, unchanged |
| `PublicHeader` (counterfactual, built then reverted) | `ƒ` | `ƒ` | **3** — both lost |

The blast radius of the dynamic form is **local to these two routes** — unlike the root not-found, where 11-19 measured a single dynamic composition taking the *whole build's* prerendering with it. So this is a genuine either/or with a bounded cost on each side:

**The cost of what shipped, stated plainly: a signed-in person who opens `/terms` or `/privacy` from the footer sees `Log in` / `Sign up` in the header.** That is the identity drift `public-header.tsx:82-85` calls *"the problem this phase exists to end"*, on two routes reachable from every page.

It was traded for the explicit static requirement on the grounds that the reader these pages exist for is anonymous — the footer link that matters most is the one on `/signup`, where somebody is being asked to agree to something before they have an account. **There is no third option:** a client-side session fetch is banned outright by T-11-SESSION, and a request-time read *is* the bailout. Recorded in the layout's own header with both measurements, and in `deferred-items.md` so a later phase can flip it on numbers rather than discover it.

## The gate: forward closure, and the fourth vacuity result

**Why it is an AST walk over text and not a grep.** This gate bans the *vocabulary of legal drafting*, and the most natural thing for a maintainer to write in a comment is why that vocabulary is banned. Phase 11 has been tripped eleven times by a prescribed grep that a correct file's own explanation satisfies; this would have been the twelfth and worst. So comments are stripped by the shared quote-aware scanner first, then three node kinds are read: JSX text, string literals, and **the flattened value of a `+` chain of string literals**.

That third kind is not decoration. Both pages hold their notice body as a two-line `"…" + "…"` join, which is the shape long copy naturally takes under a line-length limit — and a per-literal scan would miss a banned phrase straddling it. That is an ordinary editing accident, not an adversarial one. The flattened value is scanned as a fourth chunk, without joining *unrelated* nodes together (which would invent phrases nobody wrote). A self-test proves it.

**Closure runs FORWARDS.** The obvious phrasing — "the two declared pages must satisfy the rules" — is satisfied perfectly by an emptied inventory and by a third legal page nobody declared. So the gate WALKS `src/app/(legal)/` and requires every `page.tsx` it finds to have a row. Probes (d) and (e) confirm both directions fire.

### Watched reds — six probes, and what each one proves

Recorded verbatim in the file's own header. Green is **21 passed**.

| Probe | Result |
|---|---|
| (a) the notice deleted from `/terms` (constants **and** JSX) | **2 failed / 19 passed** — both AC#9 assertions, on `/terms` only |
| (b) `<p>You agree to these terms.</p>` added to `/privacy` | **2 failed / 19 passed** — naming term, file, LINE and quoting the sentence |
| (c) `LEGAL_DIR` → `src/app/(legal-nope)` | **11 failed / 10 passed** — and see below |
| (d) an undeclared `(legal)/cookies/page.tsx` | **2 failed / 19 passed** — the forward-closure assertion |
| (e) `LEGAL_PAGES` emptied | **1 failed / 12 passed — of THIRTEEN tests** |
| (f) the notice hand-rolled as a bare `<div>` | **1 failed / 20 passed** — and see below |

**Probe (c) reproduced this phase's recurring vacuity result for the fourth time.** Over a tree the scanner never opened, the assertion `finds none across every page the walk discovered, declared or not` **PASSED** — a perfectly clean sheet over a scan of nothing, permanently, and indistinguishable from a real clean run. Per the prior wave's standing instruction, every probe was confirmed to go red on a broken tree **and** green on a correct one before being trusted. What caught (c) was the ≥2-file floor, the ≥10-chunk floor, five by-name reach assertions, and a positive control that requires **both** collection paths (JSX text *and* string literals) to find real text on the real files.

**Probe (e) is the one worth reading twice.** With the inventory emptied the file ran **13 tests, not 21** — both `it.each` groups simply vanish. A reader glancing at a green run would see nothing wrong at all. The forward-closure assertion is the only thing that fires, and it names both pages.

**Probe (f) justifies a group the plan did not ask for.** With `<PanelCard tone="muted">` replaced by `<div className="rounded-xl bg-muted p-4">` — copy intact, hook intact, position intact — **both AC#9 assertions stayed green** and only the PanelCard assertion fired. The "unmissable" half of T-11-FAKETERMS's mitigation can be removed without touching a single string the plan's own gate would check.

## Deviations from Plan

### Auto-fixed / adjusted

**1. [Rule 3 — the plan's shape was not compilable] The `data-testid` sits on a wrapper, not on `PanelCard`**
- **Found during:** Task 2, before writing a line — `panel-card.tsx:28-63` declares a closed `PanelCardProps` with no rest-spread, so `<PanelCard tone="muted" data-testid="…">` is a type error.
- **Fix:** `<div data-testid="legal-placeholder-notice">` wraps the panel. The alternative — a `testId` prop threaded into `data-testid={testId}` — was **rejected on a second, independent ground**: `selector-contract.test.ts`'s collector is an AST walk over JSX attributes whose value is a *string literal*, so a threaded id would be invisible to the contract and to 11-22's forward direction. A source-level tidy that blinds a gate is the worse trade. Asserted in the new gate (`counts a dynamic data-testid as absent, matching the selector contract next door`).
- **Commit:** `6c76dd4`

**2. [Rule 2 — missing critical coverage] A third assertion group the plan did not specify**
- **Issue:** AC#9 as written (sentinel string + hook count) is fully satisfied by a bare `<div>` carrying the right attribute. Probe (f) measured exactly that: both assertions green, the notice's surface gone.
- **Fix:** each page must import `{ PanelCard }` from the pattern module. Placed in `legal-copy.test.ts` rather than as two rows in `card-pattern-coverage.test.ts`, whose `EXPECTED_SURFACES` is explicitly derived from *"the 11-UI-SPEC's three `Replaces` lists counted"* and names neither legal page — extending it would have broken its own stated derivation to make a claim that belongs to the surface making it. **`card-pattern-coverage.test.ts` is untouched and passes unchanged.**
- **Commit:** `414ba26`

**3. [Rule 2] Closure stated forwards, and three probes beyond the plan's list**
- The plan prescribed three watched reds. Probes (d), (e) and (f) were added because the prior wave's finding says a prescribed probe list is not enough — probe (e) in particular is the one that proves the inventory cannot silently empty.
- **Commit:** `414ba26`

**4. [Deliberate, recorded] Copy held in module constants rather than inline JSX text**
- The sentinel contains an ASCII apostrophe the gate matches exactly, and `react/no-unescaped-entities` rejects that character in JSX text. A curly quote or `&rsquo;` would have made source and gate disagree about the same sentence. String literals are neither escaped nor curly-quoted, so what the gate reads is what the page renders. Both `<h1>`s remain JSX text, which is what keeps the gate's JSX-text collection path exercised against the real files.

**5. [Deliberate, recorded] The `(legal)` layout does not render `PublicHeader`** — see *The static-versus-correct-header trade* above. The plan's own acceptance criteria say `SiteChrome`, no `await`, no session read, and `○ (Static)`; only this composition satisfies all four.

### Deferred, logged not fixed

- The twice-written `SiteChrome` composition (`not-found.tsx:94` and `(legal)/layout.tsx:80`) — extraction scoped out, handed off with its one invariant named.
- The anonymous-header cost, with both route tables.
- The `human_needed` below.

## `human_needed` — the real documents, and the six facts neither can be written without

**What is needed:** a published Terms of Service and Privacy Policy.
**Blocked on:** business facts and a legal review, not on code. None of the following is answerable from this repository, and inventing any of them is D-26's fabrication arriving through the legal layer:

1. **The legal entity** behind FitOut, and its registration.
2. **The registered address.**
3. **Governing law and forum.** (The project is PH-first — PayMongo is a BSP-regulated EMI and the launch market is one PH city — but *"probably the Philippines"* is an inference, and a governing-law clause is the wrong place to infer.)
4. **A monitored contact address** — the same slot as 11-14's `human_needed` #1, needed a second time for data-subject requests.
5. **A retention schedule** per category of record.
6. **A named data contact and supervisory authority.**

Plus, and it is not a fact-gathering exercise: **review by a qualified person.**

**When they arrive:** replace both page bodies **and delete `tests/design/legal-copy.test.ts` in the same commit** (AC#4). The gate states the rule from its side and names both files; both pages state it from theirs. Deleting either half alone is the failure mode the coupling exists to prevent.

**Do not:** soften the notice, drop it while leaving the gate, or draft real-looking clause language to make the page read better. All three are banned by `11-UI-SPEC.md` § Anti-Patterns and by AC#4.

## Verification Run

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | **0 errors**, 9 pre-existing warnings — unchanged from 11-14's baseline |
| `npm run build` (via `.env.local`) | **exit 0** |
| Route table, mechanically diffed vs pre-plan baseline | **exactly two added rows, both `○`** — no route flipped |
| `/terms`, `/privacy` classified | **`○ (Static)`**, both |
| `npm run test:design` | **36 files / 648 passed + 3 skipped** (was 35 / 627) — raised by exactly one file and 21 tests |
| `npx vitest run` (full suite) | **1217 passed / 4 skipped** — unchanged |
| `ls drizzle/*.sql \| tail -1` | `0025_audit_resolved_by.sql` — GATE-06 intact |
| `git diff --stat package.json` across all 5 commits | **empty** — zero packages |
| `src/app/(legal)/loading.tsx` | does not exist |
| `grep -c "leading-" src/app/(legal)/*/page.tsx` | **0** and **0** |
| Banned terms in the RAW files (comments included) | **0** and **0** — the grep-vs-comment collision avoided entirely |
| `card-pattern-coverage.test.ts`, `site-contacts.test.ts`, `type-scale.test.ts`, `selector-contract.test.ts` | untouched, all pass |

### Rendered — production server (`next start`), real HTML

| Route | HTTP | `legal-placeholder-notice` | `panel-card` | `site-footer` | `site-header` | `<nav>` | `<title>` |
|---|---|---|---|---|---|---|---|
| `/terms` | **200** | **1** | 1 | 1 | 1 | 0 | `Terms of Service · FitOut` |
| `/privacy` | **200** | **1** | 1 | 1 | 1 | 0 | `Privacy Policy · FitOut` |

Zero `<nav>` matches `/`'s own count (11-14 measured the same) — the public composition has no primary nav, and `<footer>` is already a `contentinfo` landmark. Both titles compose through the root `%s · FitOut` template. The notice is the **first element after the `<h1>`** in DOM order on both pages, verified by parsing the served HTML.

### Measured in a browser — 320 × 568, BOTH themes

| Theme | Route | notice top → bottom | fold | fully above? |
|---|---|---|---|---|
| court | `/terms` | 160 → **472** | 568 | ✅ |
| court | `/privacy` | 160 → **448** | 568 | ✅ |
| grove | `/terms` | 169 → **543** | 568 | ✅ |
| grove | `/privacy` | 169 → **489** | 568 | ✅ |

The **entire** notice is above the fold in the worst case (grove `/terms`, 543 of 568), not merely its first line.

### The four named roles resolve per theme, measured at the element

| Role | Element | court | grove |
|---|---|---|---|
| Display | `<h1>` | 28px / 32.2 / 600 / -0.56px | 34px / 40.8 / **700** / -0.17px |
| Heading | `<h2>` | 20px / 26 / 600 / -0.2px | 24px / 31.2 / **700** / normal |
| Body | `<li>` | 16px / 24 / 400 | **17px / 27.2** / 400 |
| Label | closing `<p>` | 14px / 20.02 | **15px / 22.5** |

Every value matches `11-UI-SPEC § Typography`'s table. `<main>` measures **690px** (65ch) at 1280 in both themes. Zero arbitrary sizes and zero co-located line-height utilities — `type-scale.test.ts` passes with its `DISPLAY_INVENTORY` untouched (it pins `sm:text-display`; these pages use the bare role).

### Share cards, MEASURED rather than assumed (11-20's finding)

11-20 measured that declaring an `openGraph` key at a route level *deletes* the inherited card. These routes declare `title` only, and the emitted tags were checked against `/` as a control:

| Route | `og:image` | `twitter:card` | `og:title` |
|---|---|---|---|
| `/` (control) | present, 1200×630 | `summary_large_image` | `FitOut` |
| `/terms` | **present, 1200×630** | **`summary_large_image`** | `Terms of Service · FitOut` |

Identical but for the title — the title-only edit is genuinely additive.

### Not run here

- **CI on `origin/dev`.** This executor was instructed not to push. All three jobs' local equivalents (`tsc`, `lint`, `build`, `vitest run`, `test:design`) pass; the push and the CI check belong to the orchestrator.
- **e2e.** The plan's verification does not call for it, and this plan adds two routes no spec drives. The known flakes (`open-capacity.spec.ts:376`, `search-and-book.spec.ts:318`) are untouched.

## Known Stubs

**Two pages that are, by design, entirely stub — and that is the deliverable rather than an oversight.** `/terms` and `/privacy` contain no legal content and say so in the loudest form the design system offers: a `PanelCard tone="muted"` notice, above the fold at 320px in both themes, whose sentence is asserted by string equality and whose deletion is coupled by AC#4 to the deletion of its own gate. They are not "quietly empty" — they render an explicit, machine-checked admission, and the six facts they cannot be written without are enumerated above and in `deferred-items.md`.

`SUPPORT_EMAIL` remains `null` (11-14's `human_needed` #1) and `NEXT_PUBLIC_APP_URL` remains unset (11-14's #2). Neither was filled to make anything here look complete.

## Self-Check: PASSED

- `src/app/(legal)/layout.tsx` — FOUND
- `src/app/(legal)/terms/page.tsx` — FOUND
- `src/app/(legal)/privacy/page.tsx` — FOUND
- `tests/design/legal-copy.test.ts` — FOUND
- `82b675a` — FOUND
- `6c76dd4` — FOUND
- `414ba26` — FOUND
- `96cb57e` — FOUND
- `3b9e985` — FOUND
