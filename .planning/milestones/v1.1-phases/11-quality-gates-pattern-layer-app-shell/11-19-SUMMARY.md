---
phase: 11-quality-gates-pattern-layer-app-shell
plan: 19
subsystem: app-shell
tags: [state-02, not-found, invite-oracle, t-11-oracle, prerender, db-free-build, ast-scan, ac22]

# Dependency graph
requires:
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "plan 11-09's `patterns/empty-state.tsx` (the panel both new 404 surfaces render, with its no-product-copy prop rule that this plan copies for `InviteInactive`); plan 11-10's route groups — `(public)`, `listings/[id]/(detail)` — plus `patterns/site-chrome.tsx` and `site/public-header.tsx`; plan 11-13's `PanelCard` adoption of the invite shell and its `card-pattern-coverage.test.ts` inventory; plan 11-02's `selector-contract.ts` (no new ids were needed)"
  - phase: 08-group-bookings
    provides: "08-06's `GROUP_INACTIVE` — the frozen single value this plan's constant hoist is the copy-level analog of — and the T-08-17 / T-08-23 reasoning the whole plan exists to preserve"
provides:
  - "Three `not-found.tsx` where zero existed: the root, the listing detail segment, and the invite segment"
  - "`INACTIVE_TITLE` / `INACTIVE_BODY` exported from `src/lib/group/rsvp.ts` — the ONE declaration of either sentence in `src/`, down from three copies"
  - "`src/components/group/invite-card.tsx` — `InviteCard` + `InviteInactive`, so both entrances to the inactive state are ONE component rather than two files that must keep looking alike"
  - "`src/components/site/anonymous-auth-actions.tsx` — the signed-out header cluster as a DB-free leaf, shared by the public header and the root not-found"
  - "`tests/design/invite-notfound-parity.test.ts` — AC#22 asserted by import plus a reachability half the plan did not have"
  - "Measured: composing `PublicHeader` in the root not-found takes EVERY route in the build off prerender, not just `/_not-found`"
  - "Measured: a `notFound()` boundary is client-rendered in this app (dev AND production); an unmatched URL is server-rendered"
affects: [11-14, 11-20, 11-22]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A security property that depends on two files continuing to look alike is a property maintained by POLICY; the same property expressed as one component with two call sites is maintained by CONSTRUCTION"
    - "Indistinguishable markup is not an indistinguishable response — status codes are part of the oracle surface, so the real control is that the differing branch is unreachable, and the gate asserts the unreachability"
    - "A gate that asserts on imports is deliberately green when the shared VALUE changes; pin the words exactly once, in a test, so the reword is still something a human has to acknowledge"
    - "Copy is a PROP on a shared surface component (the `EmptyState` rule), which is what leaves the gate something per-file to assert — a component with the sentence baked in has one consumer and proves nothing about its callers"
    - "A prerendered route's import graph is a build-time constraint, not a runtime one: the root not-found is part of every route's tree, so what it imports decides whether the whole app prerenders"

key-files:
  created:
    - "src/app/not-found.tsx"
    - "src/app/listings/[id]/(detail)/not-found.tsx"
    - "src/app/(public)/invite/[token]/not-found.tsx"
    - "src/components/group/invite-card.tsx"
    - "src/components/site/anonymous-auth-actions.tsx"
    - "tests/design/invite-notfound-parity.test.ts"
  modified:
    - "src/lib/group/rsvp.ts"
    - "src/app/(public)/invite/[token]/page.tsx"
    - "src/app/actions/group.ts"
    - "src/components/site/public-header.tsx"
    - "tests/group/rsvp-rate-limit.test.ts"
    - "tests/design/card-pattern-coverage.test.ts"
    - ".planning/phases/11-quality-gates-pattern-layer-app-shell/deferred-items.md"

decisions:
  - "The invite 404 and the invite inactive branch render ONE component (`InviteInactive`), not two markup copies kept in step — and the gate asserts both files import it"
  - "The copy is passed to that component as props, so both call sites still import the constants and the gate can see, per file, that each entrance reaches the single source"
  - "`submitRsvp`'s `INVITE_INACTIVE` was the third copy and is now composed as `${INACTIVE_TITLE}. ${INACTIVE_BODY}` — byte-identical output, one declaration"
  - "`tests/group/rsvp-rate-limit.test.ts` KEEPS its literal, plus one new assertion that the literal still names what the action composes — otherwise the hoist would have deleted the only pin on the shipped words"
  - "The root not-found composes `SiteChrome` + `AnonymousAuthActions`, never `PublicHeader`: measured, `PublicHeader` there takes the whole build off prerender"
  - "The gate asserts that nothing under the invite segment calls `notFound()`, because a 404 and a 200 are distinguishable however identical the bodies are"
  - "No footer on the root not-found — `SiteFooter` is plan 11-14's artifact and 11-14 has not run; forking it here would fork its D-26 gate too"

metrics:
  duration-minutes: 68
  tasks-completed: 3
  files-changed: 13
  tests-added: 9
  completed: 2026-08-14
---

# Phase 11 Plan 19: Not-Found Routes & the Invite Probe Oracle — Summary

Three not-found surfaces where zero existed, and the invite-token probe oracle closed at the source-of-truth level: one declaration of the inactive copy, one component rendering it, and a machine-checked proof that the 404 branch which could tell the two entrances apart is unreachable.

## What Was Built

**Task 1 — the hoist (`3848c8e`).** `INACTIVE_TITLE` / `INACTIVE_BODY` moved from module-private consts inside `(public)/invite/[token]/page.tsx` to exported constants beside `GROUP_INACTIVE` in `src/lib/group/rsvp.ts`, values byte-unchanged. The plan predicted two copies; the tree held **three** — `src/app/actions/group.ts:111`'s `INVITE_INACTIVE` was the joined sentence `submitRsvp` returns for both a malformed and an unknown token, and it is now composed as `` `${INACTIVE_TITLE}. ${INACTIVE_BODY}` `` (byte-identical, `as const` survives). `grep -rn` over `src/` returns exactly one site per sentence.

**Task 2 — three routes (`4cb0c8e`).**

| File | Copy | Shell |
|------|------|-------|
| `src/app/not-found.tsx` | "We couldn't find that page" / "The link may be old, or the page may have moved." → `Back to search` | composes `SiteChrome` + `AnonymousAuthActions` itself |
| `src/app/listings/[id]/(detail)/not-found.tsx` | "This space isn't available" / "It may have been unlisted, or the link may be out of date." → `Find another space` | header from `(detail)/layout.tsx` |
| `src/app/(public)/invite/[token]/not-found.tsx` | `INACTIVE_TITLE` / `INACTIVE_BODY`, imported | renders `InviteInactive` — the same component the page renders |

Two extractions came with them, both forced by the tree rather than chosen: `InviteCard` + `InviteInactive` into `src/components/group/invite-card.tsx`, and the signed-out `Log in` / `Sign up` pair into `src/components/site/anonymous-auth-actions.tsx`.

**Task 3 — the gate (`dd2bb40`).** `tests/design/invite-notfound-parity.test.ts`, 8 assertions, DB-free, no config change.

## The Oracle, Measured Rather Than Asserted

The plan asked for parity by import. The prior-wave brief asked for something harder: *prove both branches produce byte-identical output, not that they intend to*. Both were done, and the second one changed the design.

**Measured** — production build, `next start`, Next 16.2.7, each body normalised by substituting the token out before comparison:

| URL | status | bytes | body after normalisation |
|-----|--------|-------|--------------------------|
| `/invite/does-not-exist` (malformed — fails `inviteTokenSchema`) | 200 | 31060 | — |
| `/invite/234567890ABCDEFGHJKM` (well-formed, names nothing) | 200 | 31072 | **byte-identical to the row below** |
| `/invite/QRSTVWXYZ0123456789A` (well-formed, names nothing) | 200 | 31072 | **byte-identical to the row above** |

`unknown-A` vs `unknown-B`: identical. `unknown-A` vs `malformed`: identical. The only variation across the three raw bodies is the token itself, which appears twice in each — a string the caller already holds. That is 08-06's property, end to end.

**And the finding that markup parity cannot fix.** Next serves a `not-found.tsx` boundary with **404** and the page's inactive branch with **200**, and no `not-found.tsx` can set a status. A human cannot tell those two apart. A script reading status codes tells them apart instantly — and a script is the only thing that walks a 20-symbol token space. So a pixel-perfect invite 404 is *not* sufficient, and the plan's framing (two surfaces, same words) would have shipped a control that reads as closed and is open to the only attacker who matters.

The control that actually closes it is **unreachability**: nothing under `src/app/(public)/invite/**` (nor the shared component it renders) calls `notFound()`, so the 404 branch cannot be entered. The route matches any token string, so a 404 there could only ever come from an explicit call. That is asserted by the gate (assertion 6), not left to a comment, and `not-found.tsx` is the belt behind it — if a future edit adds a call, what a person sees is still the calm inactive state.

## Deviations from Plan

### Auto-fixed / structural

**1. [Rule 2 — missing critical functionality] A third copy of the inactive sentence, in the action.**
- **Found during:** Task 1. The plan's `<interfaces>` described two copies (page + page).
- **Issue:** `src/app/actions/group.ts:111` held `"This invite is no longer active. Ask the organizer for the latest link."` as its own literal — the sentence `submitRsvp` returns for BOTH a malformed and an unknown token, i.e. the exact same anti-oracle path.
- **Fix:** composed from the hoisted constants. Three copies → one.
- **Commit:** `3848c8e`

**2. [Rule 2] The hoist would have deleted the only pin on the shipped words.**
- **Issue:** `tests/group/rsvp-rate-limit.test.ts:44` pinned the sentence as a literal — "so a re-word cannot silently turn one branch into an oracle". Pointing it at the constant (as the plan's `read_first` suggested) would have made every assertion in the file green for any wording, and the new design gate is green for any wording *by design*. Nothing anywhere would have noticed a reword.
- **Fix:** the literal STAYS, plus one new assertion that it still equals `` `${INACTIVE_TITLE}. ${INACTIVE_BODY}` ``. `tests/group` went 83 → **84**; the plan's "phase-baseline counts" criterion is met in the sense that matters (zero regressions), and the +1 is this.
- **Commit:** `3848c8e`

**3. [Rule 3 — structural] Two components extracted; one pinned inventory row moved with one of them.**
- **`InviteCard` / `InviteInactive` → `src/components/group/invite-card.tsx`.** The plan's model — two files each rendering the imported constants in their own markup — makes visual indistinguishability a property maintained by policy, which fails silently the first time somebody restyles one file. One component with two call sites cannot drift. The copy stayed a PROP (11-09's `EmptyState` rule) precisely so each entrance still imports the constants and the gate has something per-file to assert.
- **Consequence, handled in the same commit:** `page.tsx` no longer imports `PanelCard`, so `tests/design/card-pattern-coverage.test.ts`'s row for that surface moved from the page to the component — which is what that gate's own failure message asks for (*"Either the file moved (update this inventory in the commit that moved it) or the walk is broken"*). Row count still 12; `scanned` still contains the page path, so the named-route-group-path guard at :566 needed no edit.
- **`AnonymousAuthActions` → `src/components/site/anonymous-auth-actions.tsx`.** The root not-found needs the signed-out cluster and must not import `public-header.tsx` (its session read reaches the database module). Copying two buttons would have created a fourth independently-drifting auth cluster on the app's most-hit anonymous surface.
- **Commit:** `4cb0c8e`

**4. [Rule 3] The gate gained a sixth assertion the plan did not specify.** Reachability (`notFound()` absent from the invite segment) — see the section above. Without it the gate certifies a control that a status-code read walks straight through.

### Blocked by a plan that has not run

**5. The root not-found renders ZERO footers, and the plan's criterion says one.**
`src/components/patterns/site-footer.tsx` does not exist: it is plan **11-14**'s artifact, 11-14 is wave 7, `autonomous: false`, and has not executed — while this plan is wave 9 and did. Inventing a footer here would have forked the component 11-14 owns along with its `SUPPORT_EMAIL` / D-26 inverted gate. The file says so in its header and `deferred-items.md` carries the handoff: **`src/app/not-found.tsx` is a SIXTH footer site**, and 11-14's `files_modified` only knows about the five group layouts, because the root not-found sits above all five.

### Not fixed, recorded

**6. A `notFound()` boundary is client-rendered in this app.** `curl` against `next start`: `/listings/does-not-exist` answers 404 with `<html id="__next_error__">` — no header, no panel — and the boundary's markup arrives in the flight payload, rendering after the client boots. `/nope` and `/listings/does-not-exist/extra` (unmatched URLs) are fully server-rendered. Same shape in dev. **Not caused by this plan** — there was no boundary in the tree at all before it, so that URL already served this shell. Likely mechanism: the page raises the signal during a render whose layout has already begun streaming the `<Suspense>` shell for 11-10's auth slot. Consequence: a no-JS visitor gets a blank page with a correct status on `/listings/<gone>`. The only in-app remedy is returning the panel from the page instead of calling `notFound()`, which serves a 2xx for a listing that is gone — worse (D-13). In `deferred-items.md`.

**7. `next start` 500s locally without `PLATFORM_WALLET_NUMBER` / `PLATFORM_WALLET_NAME`.** Pre-existing module-scope guard in `src/lib/paymongo.ts:42`, hit while measuring: `.env.local` has 16 keys and not these two, and `next start` runs in production mode. Any route whose graph reaches `app/actions/booking.ts` 500s. Worked around for the measurement by exporting dummy values for that process only; not a code change and not in scope.

## Verification Run

| Check | Result |
|-------|--------|
| `find src/app -name not-found.tsx \| wc -l` | **3** |
| `grep -rn "This invite is no longer active" src/` | 1 site — `src/lib/group/rsvp.ts:135` |
| `grep -rn "Ask the organizer for the latest link" src/` | 1 site — `src/lib/group/rsvp.ts:136` |
| `grep -ci "404\|error" listings/[id]/(detail)/not-found.tsx` | **0** (comments included, deliberately) |
| `grep -c "@/lib/db" src/app/not-found.tsx` | **0** (the specifier is spelled nowhere in that file, comments included) |
| `npm run build` | exit 0 · `/_not-found` `○ Static` |
| `DATABASE_URL=postgres://unreachable:unreachable@127.0.0.1:59999/nope npm run build` | **exit 0** · `/_not-found` still `○ Static` |
| Counterfactual: `<PublicHeader />` in the root not-found | `/_not-found` → `ƒ`, **and `/dev/theme` → `ƒ`** — the route table came back with ZERO static routes. Reverted. |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | 0 errors / 9 warnings (all pre-existing) |
| `npm run test:design` | **32 files / 561 tests** — was 31 / 553; file count +1 exactly, tests +8 |
| `npx vitest run tests/group` | **84 passed** — was 83; +1 is the new copy pin |
| `npm test` | **1217 passed / 4 skipped**, 0 failed — was 1216 / 4 |
| `ls drizzle/*.sql \| tail -1` | `0025_audit_resolved_by.sql` — unchanged (GATE-06) |
| `vitest.design.config.ts` | no `globalSetup`, no `setupFiles` — untouched |

### The three surfaces, rendered (production build, `next start`)

| URL | status | what rendered |
|-----|--------|---------------|
| `/nope` | 404 | `<title>Page not found · FitOut</title>`, 1 × `site-header`, 1 × `empty-state`, "We couldn't find that page" / "The link may be old, or the page may have moved." / `Back to search`. 0 × `site-footer` (item 5). No literal "404" outside scripts. |
| `/listings/does-not-exist` | 404 | `(detail)/not-found.tsx` — "This space isn't available" / "It may have been unlisted, or the link may be out of date." / `Find another space`, plus the layout's header. **In the flight payload, not the initial HTML** (item 6). |
| `/invite/does-not-exist` | 200 | the invite page's inactive branch — `PanelCard` shell, wordmark, `This invite is no longer active` / `Ask the organizer for the latest link.` The not-found boundary beside it renders the identical component and is unreachable by construction. |

### Watched reds (all four, verbatim in the gate's header; green is 8 passed)

| Probe | Result |
|-------|--------|
| (a) `INACTIVE_TITLE`'s sentence retyped as a literal in `not-found.tsx` | **2 failed / 6 passed** — "appears as renderable text in 2 places: …not-found.tsx:44, …rsvp.ts:135" and the retype list, both naming file **and line**. Reverted. |
| (b) the constant's VALUE changed in `rsvp.ts` only | **8 passed** — correctly green: one source, one value. And the words are not unguarded: the same edit turns `tests/group/rsvp-rate-limit.test.ts` **6 failed** (five unknown/malformed-token assertions plus the pin itself). Predicted 1; the pin has six witnesses. Reverted. |
| (c) vacuity — `SRC_DIR` → `src-nope` | **4 failed / 4 passed**, guard first: "the source scan read 0 files…: expected +0 to be greater than or equal to 100". Reverted. |
| (d) positive control — the `INACTIVE_TITLE` import deleted from `not-found.tsx` | **1 failed / 7 passed** — without it, "exactly once" and "no retyped sentence" are both satisfied by a file that shows no copy at all. Reverted. |

## What the Next Plan Should Know

- **11-14 owes `src/app/not-found.tsx` a `<SiteFooter />`** — inside the existing `flex min-h-dvh flex-col` wrapper, after `<main>`, and it must stay DB-free. That file is the build's last prerendered route and the reason is written at the top of it.
- **11-20 owns the invite page's `metadata` → `generateMetadata` conversion.** Untouched here: `robots: { index: false, follow: false }` and `referrer: "no-referrer"` are byte-unchanged (T-11-REFERER). The new `src/app/not-found.tsx` also declares `robots: { index: false, follow: false }`; if 11-20 sweeps metadata, that file is a fourth site.
- **11-22's forward direction** (every declared selector id actually ships) is unaffected: this plan added zero `data-testid`s and needed none.
- **STATE-02 is deliberately still `Pending` in REQUIREMENTS.md, and `requirements mark-complete` was NOT run.** The requirement reads *"every route group has an error boundary offering both a retry and a route out, plus a global error page **and** not-found pages…"* and is carried by three plans: 11-09 (the `ErrorState` panel), **11-18** (the boundaries and the global error page, not yet executed) and this one (the not-found half). Marking it complete here would have closed a requirement two thirds of which is not built.
- The **`(detail)` boundary is client-rendered** (item 6). Any e2e spec asserting on `/listings/<gone>` must wait for hydration, not for the initial HTML.

## Threat Flags

None. The plan's threat register was discharged as written, with T-11-ORACLE strengthened: `mitigate` for T-11-ORACLE now means one component + one declaration + an asserted-unreachable 404 branch, rather than two surfaces agreeing on a string. T-11-NFDB was measured in both directions. T-11-FALSEALARM is a zero-count that includes comments. T-11-SC: zero packages added.

## Known Stubs

None.

## Self-Check: PASSED

All six created files verified present on disk; all three task commits (`3848c8e`, `4cb0c8e`, `dd2bb40`) verified in `git log`.
