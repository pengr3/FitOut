# Phase 17 — deferred items

Out-of-scope discoveries made while executing this phase's plans, logged rather than fixed. **D-199:
findings are BATCHED — one list at phase end, no mid-phase interruptions.** Each section below names
the plan that found it, the measurement (a number, in a named theme, at a named width, on a named
route — never a paraphrase), the file that owns it, the reason the repair did not land in the plan
that found it, and what the smallest correct repair would be.

**D-200 sets the bar this list is written against.** For escalate-class items *the finding is the
deliverable*, and this phase may close green around every one of them. Mechanical-class items — the
"may fix in place" table in `17-UI-SPEC.md` § Remediation rules — are **not** closeable-around; their
closure record is the second half of this file (`# Fixed in place`), listed per row with the plan
that took it, so the closure is checkable rather than asserted.

Assembled by plan **17-13** from the twelve `17-*-SUMMARY.md` files, `e2e-baseline-reds.md` and the
row-level records in the specs themselves. Phase base commit: **`e439bf9`**.

**APPENDED, PROMOTED AND THEN CLOSED BY PLAN 17-14: `[17-D26]`.** 17-13 assembled and machine-checked
**25** findings. The phase's final plan — the baseline round-trip — found a **26th** by reading its
dispatch diff against the prediction written before it, and it was the one finding here that was about
GATE-01 itself. The PM **promoted it to in-scope at the D-199 review**; its first prescribed repair was
**refuted by measurement** before any code was written, its second was **watched working** before it
was trusted, and it is now **fixed and green**. It therefore lives in the `# Fixed in place` closure
record rather than in the list below, which is back to **25**.

⚠ **This paragraph deliberately does NOT spell the four part-labels, and that is not fussiness.**
They are what the format gate COUNTS, so prose naming them inflates the very numbers it claims to
report — the `[17-D20]` defect class, and 17-13 already inflicted it on itself once while recording
D-198. The first draft of this note listed all four by name and took one of them from 26 to 27. Count
them with the greps, not from a sentence: each of the four labels must equal the finding-heading
count, and level-3 headings must stay at zero so the unanchored heading grep is unambiguous.

**Nothing was relocated here.** Phases 13, 14, 15 and 16 keep their own `deferred-items.md` rows;
plans 17-06 and 17-10 annotated the ones this phase closed **in place** (`[13-15]`, `[15-12]`,
`[16-D9]`, `[14-WR-03]`). Those ids are referenced below, never moved.

---

## [17-D1] — The soft-404: `loading.tsx` flushes the shell before `notFound()` runs, on ~10 routes

- **Found by:** plan 17-01, `e2e-baseline-reds.md` (the declared-red triage), 2026-08-29 — inherited
  from `[16-D6]` item 1, triaged 2026-08-26 at commit `d24b212`
- **Owner file:** `src/app/listings/[id]/(detail)/loading.tsx`, and the ~10 sibling `loading.tsx`
  files that sit above a `page.tsx` calling `notFound()` (21 `loading.tsx` on disk)
- **Severity:** product/SEO behaviour — a route that answers `200` for content that does not exist
  stays in a search index. Not an authorisation hole: the body IS the not-found document and the
  draft listing's title is absent from the served bytes.

**Measured, not inferred.** `e2e/public-listing.spec.ts:385` — *"a draft listing 404s to the
public"* — asserts a **404** on `/listings/{draft-id}` and `[16-D6]` measured **200**. The mechanism:
`loading.tsx` creates an implicit Suspense boundary, Next flushes the shell, and the status line is
committed before the page body raises `notFound()`. Re-measured by 17-01 on **2026-08-29** at
`--workers=1`, twice, alone: **8 passed** — it did **not** reproduce, and that changes nothing about
the disposition, because neither the route directory nor the framework moved
(`git log d24b212..HEAD -- 'src/app/listings/[id]/(detail)/'` is empty; `next` is 16.2.7 at both
commits). A green on one machine on one day is an environment result, not a fix.

⚠ **Assumption `[A6]` is UNMEASURED on this route.** `17-RESEARCH.md` A6 — *that the soft-404
behaves the same in a production build as it does in `next dev`* — has never been driven against
`next build && next start` for `/listings/{id}`. Every reading of this route is a `next dev` reading.
`[17-D2]` below measured the identical mechanism in a **production** build on a different segment and
found the soft `200` there, which raises the prior on `[A6]` sharply — it does not settle it.

**Why it was not fixed here.** 17-UI-SPEC § Remediation rules: *any product copy or behaviour change*
and *reversing a recorded decision* are must-escalate. The listing route's `(detail)/layout.tsx:25-32`
records in as many words that the assert lives in the **layout** precisely because *"only a real 404
removes an unpublished listing from a search index"* — so the repair is a route-file argument across
~10 segments, not a fix. `17-RESEARCH.md` Open Question 3 classes it escalate-class, and Phase 17
does not fix it.

**Cheapest correct fix:** first, **measure `[A6]`** — one `npx next build && npx next start` probe
with `curl -o /dev/null -w '%{http_code}'` against a draft listing id, which costs one build and
settles whether there is anything to repair at all. If production reproduces the `200`, the repair is
per-segment and there are only two shapes: hoist the guard above the Suspense boundary (a `layout.tsx`
assert, which is what the listing route already did — and which produced `[17-D3]`), or drop the
`loading.tsx` on the routes whose guard must own the status line. Both move
`tests/design/loading-coverage.test.ts`'s pins.

**Suggested owner:** the PM, as a next-milestone SEO decision. Not a phase-17 or phase-18 mechanical.

---

## [17-D2] — `/host/dev-throw` answers a SOFT 404 in a PRODUCTION build; the other three groups answer a hard one

- **Found by:** plan 17-12, `e2e/overflow-320.spec.ts` AC#29 rows + a `next build && next start -p 3100`
  probe driven twice (Chromium, and `curl` with the session cookie), 2026-08-30
- **Owner file:** `src/app/(host)/host/loading.tsx`
- **Severity:** status-line correctness in production. **The security control is unaffected** — the
  build-time guard fires, the throw never happens, `SENTINEL_LEAK_PROBE` appears **0** times in the
  served bytes, and no boundary renders.

**Measured, not inferred.** Against `npx next start` on port 3100, route **`/host/dev-throw`**:
status **200**, final URL unchanged, document = the ROOT not-found. The same probe against
`/dev-throw-app`, `/dev-throw-auth` and `/dev-throw-legal` read **404** on all three. The single
difference is that `(host)` is the only one of the four route groups carrying a group-level
`loading.tsx`; `(app)`, `(auth)` and `(legal)` have none. That is the whole of the delta, and it is
the same mechanism as `[17-D1]` arriving on a different segment — this time **in a production build**,
which is the reading `[A6]` asks for and never got on the listing route.

**Why it was not fixed here.** The only repair is to delete or relocate a shipped STATE-01 loading
fallback that has nothing to do with plan 17-12's subject — a product change made from inside an
audit, which is the exact move D-199/D-200 exist to prevent.

**Cheapest correct fix:** nothing, unless a caller depends on the status line of a route that 404s in
production anyway. `/host/dev-throw` is `NODE_ENV`-gated out of production by construction, so the
finding's value is entirely as **evidence for `[17-D1]`** — it is the production measurement of the
mechanism, taken on the one segment where taking it was free. Read the two rows together.

**Suggested owner:** folded into `[17-D1]`'s decision.

---

## [17-D3] — `src/app/listings/[id]/(detail)/not-found.tsx` is UNREACHABLE in every state, and its own header claims the opposite

- **Found by:** plan 17-11, `e2e/overflow-320.spec.ts` (the AC#29 boundary row, driven at `expectReachable`), 2026-08-30
- **Owner file:** `src/app/listings/[id]/(detail)/not-found.tsx` — and the missing
  `src/app/listings/[id]/not-found.tsx` that would give it a segment
- **Severity:** dead code that reads like coverage. A boundary nothing can render, with a header
  asserting that it can.

**Measured, not inferred.** Route **`/listings/a-listing-that-must-never-exist-17-11`** at **320px**,
in **both** themes: status **404**, and the document rendered is the **ROOT** not-found — *"We
couldn't find that page"*, **1** `empty-state`, the public header and the site footer. This
boundary's own copy — *"This space isn't available"* — appears **0** times. Cause:
`(detail)/layout.tsx` awaits `assertPublicListing(id)`, which calls `notFound()` at
`src/lib/public-listing.ts:104`; a `notFound()` raised in a **layout** is handled by the **parent**
segment's boundary, and `src/app/listings/[id]/` has none, so it falls through to the root. The
layout and the page share ONE predicate (`isPubliclyViewable` — *"one rule, one expression, two call
sites"*), so `(detail)/page.tsx:261`'s own `notFound()` can never fire on a listing the layout
admitted. Plan 17-12 re-confirmed it: this is the **one** remaining unreachable row in the AC#29
table (suite 100 passed / 9 skipped; 2 of the 9 are this row).

⚠ The file's own header still says the opposite. Plan 11-19 measured it with `curl` against
`next start` **before** the layout gained the assert, and the sentence is now false. It is left
**byte-identical** rather than edited, because editing a source comment that describes shipped
behaviour is a product statement under 17-UI-SPEC § Remediation; the contradiction is recorded at the
skipped row in `e2e/overflow-320.spec.ts` and here.

**Why it was not fixed here.** Every repair is a route-file change, which is escalate-class: either a
new `not-found.tsx` at `src/app/listings/[id]/` — which adds a route state and moves
`tests/design/loading-coverage.test.ts`'s pins — or moving the assert back below the Suspense
boundary, which **re-opens `[17-D1]` on the highest-value public route in the product**. Neither is
asked for by any acceptance criterion in Phase 17.

**Cheapest correct fix:** decide whether the file should exist at all. If the root not-found is the
right document for a missing listing, **delete `(detail)/not-found.tsx`** and correct nothing else —
one deletion, and the header's false sentence goes with it. If the bespoke copy is wanted, add
`src/app/listings/[id]/not-found.tsx` and move `loading-coverage.test.ts`'s pins in the same commit.
The first is one line of work; the second is a product decision about copy.

**Suggested owner:** the PM chooses; whichever plan next opens that route segment executes.

---

## [17-D4] — `e2e/availability.spec.ts` carries THREE undeclared standing reds beyond the one that was declared

- **Found by:** plan 17-01, the per-file `--workers=1` sweep of all 33 chromium specs, 2026-08-29
- **Owner file:** `e2e/availability.spec.ts` (and its fixture setup)
- **Severity:** a red set that is not stable run to run is a denominator nobody can use; `[260824-dbc]`
  itself records that instability as *"its own signal"*.

**Measured, not inferred.** Route **`/listings/[id]`**, the availability calendar. `[260824-dbc]`
declared **1** standing red (`:261`). 17-01 measured **4** cases at that line-set — `:160`, `:203`,
`:236` and `:261` — and all **4 passed, twice, alone at `--workers=1`**, so **0 of 4** reproduced on
2026-08-29. `:261` had itself passed in the very run that first surfaced the other three. Four green
runs on one day do not retire the instability; what they establish is that
**`availability.spec.ts` is not in Phase 17's 10-row denominator**, which is why it sits in
`e2e-baseline-reds.md`'s clearly-separated did-not-reproduce table rather than inside it.

**Why it was not fixed here.** `:261` — *published-but-not-payable listing: calendar renders
read-only, slots not selectable* — is explicitly **not this phase's to close**; it is a payability-gate
assertion, and the other three are range-fill behaviour on the same fixture. Pre-excusing a passing
line is the more dangerous of the two errors available to an audit, so 17-01 declared them **outside**
the denominator with the contract stated in both directions.

**Cheapest correct fix:** run the file alone, `--repeat-each=5`, at `--workers=1`, and classify each
of the four as *contention* (the `[16-D2]` shared-fixture class) or *standing*. That is one command
and produces the missing datum: whether `[260824-dbc]` is one red or four. Until it is run, treat a
red on any of the four as **this row**, not as a Phase-17 regression.

**Suggested owner:** whichever plan next owns availability behaviour; not an audit task.

---

## [17-D5] — `[16-D10]` / `wizard-cover-preview`: deliberately NOT unblocked, because unblocking mints a PNG

- **Found by:** plan 16-15 (recorded as `[16-D10]`); re-affirmed and left blocked by plan **17-13**, 2026-08-30
- **Owner file:** `src/lib/design/visual-baselines.ts` — the `wizard-cover-preview` row — and
  `e2e/visual/surfaces.spec.ts`'s `EXPECTED_BLOCKED` list
- **Severity:** scope, not conformance. Unblocking is a two-file edit with a **third-party
  consequence**: the next dispatch mints a new committed reference image.

**Measured, not inferred.** Route **`/host/listings/[id]/edit`** (the wizard's cover step).
`VISUAL_BASELINES` declares **78** rows of which **42** are `blocked`; `EXPECTED_BLOCKED` in
`e2e/visual/surfaces.spec.ts` names **24** entries and `EXPECTED_BASELINE_COUNT` is **78**. Unblocking
this one row moves `EXPECTED_BLOCKED` from 24 named entries to 23 **and** adds **1** court PNG to the
36 committed references at the next generation dispatch.

**Why it was not fixed here.** 16-15 recorded that this is *"the PM's to schedule, not a side effect."*
17-UI-SPEC § GATE-01 says *"where this phase unblocks a row it unblocks it and shoots it"* — and this
is the one row where that rule must not be reflexive, because the shot is a **commit of new binary
reference data**, which is a milestone artefact rather than an audit output. The row's reason in
`visual-baselines.ts` was updated by 17-13 to say exactly this.

**Cheapest correct fix:** none is owed. When the PM schedules it: flip `blocked` to `null` on the row,
remove the name from `EXPECTED_BLOCKED` in the same commit, and run a **generation** dispatch in the
pinned Linux image (D-27/D-29) — then read the minted PNG before committing it, per `15-11`.

**Suggested owner:** the PM. Explicitly not the phase verifier and not 17-14.

---

## [17-D6] — D-196's `p-1.5` widens `ProfileLink` by 12px and owes a visual-baseline COMPARISON no machine here can run

- **Found by:** plan 17-06, `e2e/overflow-320.spec.ts` (the AC#22 / D-196 block), 2026-08-29
- **Owner file:** `src/components/patterns/site-chrome.tsx` (`ProfileLink`), with the exposure landing
  on `src/lib/design/visual-baselines.ts`'s signed-in-shell rows
- **Severity:** GATE-01 evidence. `13-16` records that *"a phase can COMPLETE with GATE-01 red, and
  nothing notices"*, and `15-11` records ten references re-minted without anyone reading the diff.

**Measured, not inferred.** Route **`/profile`** (and every signed-in composition) at **320px**, theme
**court**: `a[Profile]` measured **16×16** before the change and **28×28** after — a **+12px** delta,
carried at **every** width because `p-1.5` has no breakpoint. The signed-in header cluster measured
**190.4px** (court) / **191.6px** (grove) after, against a measured **224px** available and the
spec's stated **226px** budget. `ProfileLink` renders in all three signed-in compositions — `(app)`,
`(host)` and `public-header`. At least one **shootable** baseline row renders that header:
`visual-baselines.ts` says of `booking-not-found` that *"it renders no booking, no money, no date and
no identity — an `EmptyState` inside the signed-in shell — so it is shot."* Twenty of the signed-in
rows are `blocked` on a fixture re-point, so the exposed set is small; it is not empty.

**Why it was not fixed here.** The `visual` Playwright project **is not constructed off Linux**
(D-27/D-29) — `playwright.config.ts` prints that refusal on every local run — so on this win32 box the
delta cannot be measured, regenerated, or even enumerated. Regenerating is also the wrong instinct:
GATE-01's evidence is a green **comparison** run on the phase's head commit, and a green read off a
**generation** run is `13-16` repeating itself.

**Cheapest correct fix:** a **comparison** dispatch (explicitly not a generation one) on this phase's
head commit in the pinned Linux image, and a read of the diff for every signed-in-shell surface. A
12px-wider Profile control is the **expected** delta; anything else on any other row is a finding.
Plan **17-14** is the checkpoint plan that owns the dispatch — this row is handed to it, and 17-13
asserts nothing about the outcome.

**Suggested owner:** plan 17-14, then the phase verifier.

---

## [17-D7] — `e2e/helpers/axe.ts`'s docblock states the SC 2.5.8 target rule cannot run; at axe-core 4.13.0 it does

- **Found by:** plan 17-07, a throwaway probe reading `results.passes` under the shipped configuration
  (written, run, deleted — not in git history), 2026-08-29
- **Owner file:** `e2e/helpers/axe.ts` — the `AXE_TAGS` docblock, claim 2
- **Severity:** a false statement in a gate's own docblock. That is the defect class this phase exists
  to repair (AC#24 is the same defect in a different file), and the error is in the **benign**
  direction — the scan covers slightly more than its header claims, not less.

**Measured, not inferred.** The header says the rule is *"DISABLED BY DEFAULT in axe-core … and a tag
filter does not enable a disabled rule. `wcag22aa` in this list therefore buys nothing on its own, and
nothing here may be read as covering the 24px target floor."* The probe read `results.passes` on three
routes: **`/terms`** (**22** passing rules), **`/`** (**26**) and the root not-found (**13**) — the
target rule id is present in `passes` on **all 3 of 3**. A disabled rule does not appear in `passes`
at all, so it ran and it passed on every surface probed.

**Why it was not fixed here.** **The correction cannot be written in the file that needs it.** Plan
17-01's committed acceptance criterion for that file is
`grep -c 'withTags\|withRules\|disableRules\|target-size' e2e/helpers/axe.ts` returning **0**, so
writing the rule id into that docblock breaks a committed gate. The file already spells three
forbidden identifiers descriptively for exactly this reason. `helpers/axe.ts` was also outside
17-07's declared `files_modified`. **No policy changes and none should:** `expectTargets`
(`e2e/overflow-320.spec.ts`, `TARGET_FLOOR_PX = 24`) stays the single authority on the floor, because
axe's rule honours SC 2.5.8's spacing and inline exceptions and reported **0** named offenders — and
two definitions of one floor is the drift the one-import-site rule exists to stop.

**Cheapest correct fix:** whichever plan next opens `e2e/helpers/axe.ts` rewrites claim 2 to say the
rule **does** run at 4.13.0 while `expectTargets` remains the authority — spelling the rule id
descriptively, as that file already does — **and amends 17-01's grep in the same change**, because a
grep that forbids the true sentence is now part of the defect. The two edits are inseparable and
neither is safe alone. Plan 17-13 did **not** take this: it opens neither file, and amending another
plan's committed acceptance criterion from inside the phase's synthesis step would leave the amendment
unreviewed by the gate it relaxes.

**Suggested owner:** the phase verifier, or Phase 18's first plan that touches the axe helper.

---

## [17-D8] — A dev-only hydration mismatch on the mobile nav drawer trigger, on every signed-in route

- **Found by:** plan 17-07, the browser console of every host and booker row of the first GATE-02
  sweep (`next dev`), 2026-08-29
- **Owner file:** `src/components/patterns/site-chrome.tsx` — the `NavDrawer` composition
- **Severity:** a warning, not a failure. All **48** measured rows scanned clean around it and **axe
  reported 0 violations** — the regenerated tree carries a valid `aria-controls` by the time a scan
  reads it.

**Measured, not inferred.** On **every** route that renders the signed-in shell — `/host`,
`/host/listings`, `/bookings`, `/profile` and the rest — at both **320px** and **1280px**, theme
**court**: *"Hydration failed because the server rendered HTML didn't match the client"*, with React's
diff pointing at `site-nav` → `NavDrawer` → `ResponsiveDialog` → `DialogTrigger`, and the
client-only attribute in the `+` block being `aria-controls="radix-_R_ad5ritulb_"`. Radix mints the
controlled element's id on the client; the server render carries **no** `aria-controls` at all, so the
two trees disagree on exactly **1** attribute and React regenerates the subtree.

**Why it was not fixed here.** Pre-existing, in **no** file plan 17-07 touched, and it reproduces on
rows that plan did not change. It is also **not an accessibility finding by measurement** — the
sweep's whole purpose is to say what the rendered tree looks like, and the tree looks correct. The
repair is a shell change with a blast radius across every signed-in route, which is the class D-199
says to batch.

**Cheapest correct fix:** give the drawer's `Dialog` a stable `id` so Radix derives the same
`aria-controls` on both sides, or render the trigger's `aria-controls` server-side. One line, plus a
re-run of the axe sweep to confirm nothing moved. The real cost being paid today is not conformance:
it is that a subtree regenerating on hydration throws away its first paint, and a console full of
hydration noise is how a genuine mismatch later goes unread.

**Suggested owner:** whichever plan next opens `site-chrome.tsx`.

---

## [17-D9] — At 320px the listing page's last interactive control is a footer link ENTIRELY under the sticky booking bar

- **Found by:** plan 17-04, `e2e/mobile-booker-path.spec.ts` (the RESP-03 clause-B occlusion block), 2026-08-29
- **Owner file:** `src/app/listings/[id]/(detail)/page.tsx` (where `STICKY_BAR_CLEARANCE` is applied)
  and `src/components/patterns/site-chrome.tsx` (`SiteFooter`, which renders outside `<main>`)
- **Severity:** WCAG-adjacent and real — an untappable, unscrollable-to link on the product's
  highest-intent public route. RESP-03 AC#7's literal subject on this route fails on shipped markup.

**Measured, not inferred.** Route **`/listings/[id]`** at **320×568**, scrolled to the document
bottom, **identically in both themes**:

| | box |
|---|---|
| last focusable candidate `a("Privacy")` | `{y: 515, height: 18, bottom: 533}` |
| `[data-testid="booking-sticky-bar"]` | `{y: 504, height: 64, bottom: 568}` |

The link sits **entirely inside** the bar's 64px band. `a("Terms")` clears it by **3px**. Cause:
`STICKY_BAR_CLEARANCE` is applied to `<main>` and `SiteFooter` renders **after** `<main>`, so the
bottom 64px of the **document** is footer, which no clearance covers.

**Why it was not fixed here.** The repair moves a clearance onto a component shared by **every**
route — a layout change made from inside an audit, which 17-UI-SPEC § Remediation classes
must-escalate. Suppressing the finding by narrowing the clause's subject silently was rejected
explicitly; leaving the suite red was rejected too, because `e2e-baseline-reds.md` forbids adding a
row to make a run read green. What shipped instead is **two** assertions: AC#7's literal shape against
the last laid-out control **outside** the footer, plus a strictly stronger clause that no control
anywhere may lie under the bar **except a footer one** — with the exclusion measured, argued in place,
and pointing at this row.

**Cheapest correct fix:** apply the clearance at the layout level so it covers the footer as well as
`<main>` — one class move on the shell, plus a re-read of every 320px row. The day it lands, the named
footer exception in `mobile-booker-path.spec.ts` is deleted and **nothing else in the clause needs
relaxing**; that is why it was written as an exception rather than a narrower subject.

**Suggested owner:** the PM (it is a layout decision), then whichever plan owns the shell.

---

## [17-D10] — `STICKY_BAR_CLEARANCE` is INERT on `/listings/[id]` today; it is load-bearing only on `/listings/[id]/book`

- **Found by:** plan 17-04, watched-red drives 2 and 3 (the knob deleted, then restored), 2026-08-29
- **Owner file:** `src/app/listings/[id]/(detail)/page.tsx:480` (the inert site) and
  `src/app/listings/[id]/book/page.tsx:521` (the load-bearing one)
- **Severity:** a protection that reads as considered and is, on one of its two routes, doing nothing.

**Measured, not inferred.** Route **`/listings/[id]`** at **320px**, theme **court**: deleting
`STICKY_BAR_CLEARANCE` from `page.tsx:480` changed **nothing measurable** — both occlusion cases
stayed **green**. What protects that route is the footer's own height, not the clearance: the last
control **inside** `<main>` is `a("OpenStreetMap")` (the map attribution) at `{y: 243}` with the
document at its bottom, roughly **1,700px** above the fold. On route **`/listings/[id]/book`** — which
renders no footer — the same deletion went **RED**, verbatim: `a("Back to the listing")` at
`{x: 16, y: 472, width: 156, height: 44, bottom: 516}` against a bar at
`{x: 0, y: 504, width: 320, height: 64, bottom: 568}`. Restored; 10 passed.

**Why it was not fixed here.** There is nothing to fix in the code — the knob is correct where it
fires. What is wrong is the **belief** the knob encodes on the listing route: `pb-20 = 80px = 64 + 16`
is declared to protect that route's last control and protects a control that was never at risk, while
the control that IS at risk (`[17-D9]`'s footer link) is outside its reach. Correcting that means
either moving the clearance (which is `[17-D9]`) or deleting it from the listing route, and deleting a
shipped protection because it is currently inert is exactly the move that breaks the day the layout
changes.

**Cheapest correct fix:** none, standalone. Fold into `[17-D9]` — the clearance's placement is one
decision, and the two rows are the two halves of its evidence.

**Suggested owner:** folded into `[17-D9]`.

---

## [17-D11] — One member of the declared no-wrap set has no instrument, and cannot get one without a source change

- **Found by:** plan 17-04, `e2e/helpers/nowrap.ts` + the RESP-03 clause-C table, 2026-08-29
- **Owner file:** `e2e/helpers/nowrap.ts` (`expectNoWrap`), and whichever component would need the
  wrapper element
- **Severity:** a declared set of six with **five** measurements and **one** named skip. Coverage
  honesty, not conformance.

**Measured, not inferred.** Routes **`/listings/[id]`** and **`/listings/[id]/book`** at **320px**,
both themes: **5 of 6** members of the declared no-wrap set are measured. The sixth — *"every named
44px action's label"* — cannot be. A `size="touch"` button renders its label as a **direct text
child**, so the only element carrying the text **is** the 44px control, and `expectNoWrap` would
compare a declared 44px reservation against a line box and be **red on a correct tree**. Measuring it
honestly needs a wrapper element around the label.

**Why it was not fixed here.** Adding a wrapper span inside every `size="touch"` button is a
product-source change across the button recipe, which this audit may not make. `whitespace-nowrap` on
both bars' columns is the shipped mitigation and it is asserted at the columns.

**Cheapest correct fix:** none is owed while the mitigation holds. If the sixth member is ever wanted
as a measurement, the wrapper goes in the CVA recipe once (not per call site), and the row replaces
its skip string with a measurement in the same commit.

**Suggested owner:** whichever plan next opens `button-variants` / the `touch` recipe.

---

## [17-D12] — `e2e/avatar-crop.spec.ts`'s `pick()` helper is an unguarded strict-mode locator, and it flakes

- **Found by:** plan 17-05, a full-file run at `chromium --workers=1`, 2026-08-29
- **Owner file:** `e2e/avatar-crop.spec.ts`, the `pick()` helper at `:159`
- **Severity:** a nondeterministic red on a green tree — the worst kind, because the next person
  spends the investigation on their own change.

**Measured, not inferred.** Route **`/profile`** (the avatar crop dialog). `pick()` at `:159` is a
bare `page.locator('input[type="file"]').setInputFiles(...)` with **no count assertion**. In **1 of 3**
full-file runs, `corrupt.jpg is refused before the dialog` (`:742`) failed with
*"strict mode violation: `locator('input[type="file"]')` resolved to **2** elements"* — one inside
`main`, one outside it. The same test passes **in isolation** (`-g "corrupt.jpg is refused"`, green),
and the same full file was **33/33 green** on the run immediately before the D-197 edit and on the run
immediately after. It is **not** caused by D-197: a slider attribute cannot mint a second file input,
and the failing test never opens the crop dialog. This is the `[16-D2]` shared-fixture/contention class
that Pitfall 9 names, met at the one helper in this file with no count guard.

**Why it was not fixed here.** `avatar-crop.spec.ts` was in plan 17-05's `<files>` only for the two
zoom-state assertions, and the helper is used by roughly **30** cases across the file — restructuring
it is not the change 17-05 was scoped to make.

**Cheapest correct fix:** **one line.** Assert
`await expect(page.locator('input[type="file"]')).toHaveCount(1)` inside `pick()` before
`setInputFiles`. That converts a nondeterministic strict-mode error into a named failure that says
*which* surface rendered a second input. Plan 17-13 did **not** take it despite being nominated:
`e2e/avatar-crop.spec.ts` is not in 17-13's `files_modified`, and the fix's own value is that the next
red **names** the second input — which needs a run of the full file to observe, i.e. the run that
takes 33 cases and cannot be done as a drive-by inside a synthesis plan. Recorded so a later red at
`:742` is read as this row and not as a Phase-17 regression.

**Suggested owner:** whichever plan next opens `avatar-crop.spec.ts`.

---

## [17-D13] — `AvailabilityCalendar`'s `open_capacity` fork carries no container id, so RESP-04 AC#12 cannot be ASKED of a drop-in listing

- **Found by:** plan 17-09, `e2e/one-tree.spec.ts` (the AC#12 one-instance count), 2026-08-29
- **Owner file:** `src/components/availability/availability-calendar.tsx:551-582` (OPEN-02's Phase-9 fork)
- **Severity:** a measurement that cannot be taken, on one of two occupancy modes. A **0** is
  indistinguishable from a calendar that failed to render, which is why the row is a named skip rather
  than a second measurement.

**Measured, not inferred.** Route **`/listings/[id]`** at **320**, **768** and **1280**, theme
**court**: `[data-testid="availability-calendar"]` counts **1** on an `exclusive` listing at all three
widths, and **0** on a drop-in (`open_capacity`) one at all three. The `open_capacity` early return
renders a **fragment** wrapping `CollisionNotice` + `DatePassPicker`; the id sits only on the
exclusive surface's root at `:619`. Found the expensive way — the row originally drove *whichever
listing is first in the catalogue* and went red **1 run in 3**, on the run that landed on a drop-in
listing.

**Why it was not fixed here.** The repair is not one attribute. The fragment is **deliberate** — its
own comment records choosing it over a wrapper div *"so the drop-in tree keeps its box exactly"* — so
hanging the id there means introducing a wrapper element into a shipped surface: a `src/` change
outside 17-09's declared `files_modified` that also **reverses a recorded decision**, which is
must-escalate. It would additionally want a `SELECTOR_CONTRACT` review, since one id would then name
two structurally different subtrees.

**Cheapest correct fix:** whichever plan next opens the drop-in surface adds the wrapper **and
re-measures the box the fragment was chosen to protect** (that re-measurement is the whole cost —
the attribute is free), then deletes the skipped row in `e2e/one-tree.spec.ts` and replaces it with a
measurement. Until then RESP-04 AC#12 is closed for **five of six** families, and the calendar family
is closed for the **exclusive** surface only.

**Suggested owner:** whichever plan next opens `availability-calendar.tsx`.

---

## [17-D14] — The only navigation landmark on `/listings/[id]` is react-day-picker's, named "Navigation bar"

- **Found by:** plan 17-09, `e2e/one-tree.spec.ts` (the AC#13 landmark count), 2026-08-29
- **Owner file:** `src/components/ui/calendar.tsx` — the `components`/`classNames` override seam over
  react-day-picker's `rdp-nav`
- **Severity:** naming/semantics, not duplication. The tree is valid; what it announces is wrong.

**Measured, not inferred.** Route **`/listings/[id]`** at **320**, **768** and **1280**:
`getByRole("navigation")` resolves to exactly **1**, and the element is
`<nav class="rdp-nav" aria-label="Navigation bar">` — the month grid's prev/next control inside the
availability calendar. The app's own contribution is **0**, because the public composition passes no
`nav` prop to `SiteChrome` (`site-chrome.tsx:205-209` renders the landmark only when there is
navigation). So on the product's highest-intent public page, the one thing announced to a
screen-reader user as *navigation* is a vendor's month stepper with a generic name.

**Why it was not fixed here.** It is not AC#13's failure — the count is 1 and nothing is duplicated —
so no acceptance criterion asked for it, and the repair reaches into a third-party component's markup.

**Cheapest correct fix:** give the month nav a specific `aria-label` (e.g. *"Calendar months"*) through
the existing override seam in `ui/calendar.tsx`, so the label names what it moves through — one prop.
The larger question, worth asking once: should a month stepper be a landmark at all?
`e2e/one-tree.spec.ts` **PINS** the current state (`landmarks: 1`, `siteNavs: 0`, with the vendor named
in the row's reason), so the day this changes the gate says so by name rather than silently.

**Suggested owner:** whichever plan next opens `ui/calendar.tsx`.

---

## [17-D15] — `restoreFocusToAction`'s replaced-trigger case is not exercised by any keyboard spec

- **Found by:** plan 17-08, `e2e/keyboard-composites.spec.ts` under the
  `onCloseAutoFocus={undefined}` mutation, 2026-08-29
- **Owner file:** `src/components/booking/booking-sticky-bar.tsx` (the replaced-trigger case), with
  the helper in `src/components/patterns/responsive-dialog.tsx`
- **Severity:** an untested branch of the focus-restore contract on the product's core booking path.

**Measured, not inferred.** Route **`/listings/[id]`** at **320px** (the sheet's only placement a
phone user meets), theme **court**: with `onCloseAutoFocus` mutated to `undefined`, the booking-sheet
case stayed **GREEN** — **0** of the file's 7 cases went red — because a **day-only** selection leaves
its `DialogTrigger` in the document and **Radix's own restore** covers the close. `restoreFocusToAction`
is therefore never the thing being measured. The case that needs it is the one where the trigger is
**replaced**: a selected window turns the bar's trigger into `Book · {total}`, a different element, and
Radix has nothing to restore to.

**Why it was not fixed here.** Reaching the replaced trigger needs a window selected, which makes the
subject `booking-sticky-bar.tsx`'s own — a different surface from the five composite families plan
17-08 was scoped to, and one whose fixture is a resolved hold rather than a calendar interaction.

**Cheapest correct fix:** one case in `e2e/keyboard-composites.spec.ts`: select a window, open the
sheet from the replaced `Book · {total}` trigger, press Escape, and assert the landing descriptor
against the trigger's `StopProbe` taken before the overlay existed — the helper
`expectEscapableAndReturned` already exists and already does exactly this at three other call sites.
Then re-run the mutation to confirm the new case goes red where the others did not.

**Suggested owner:** whichever plan next owns the booking sticky bar.

---

## [17-D16] — `/host/earnings` ships ZERO interactive controls of its own, and the target-size vacuity guard asserted that was impossible

- **Found by:** plan 17-11, `e2e/overflow-320.spec.ts` (`expectTargets`' vacuity guard), 2026-08-30
- **Owner file:** `src/app/(host)/host/earnings/page.tsx` and `src/components/host/payout-row.tsx` —
  though the interesting question is a **product** one, not a file's
- **Severity:** a product dead end, surfaced by an instrument. The guard's sentence — *"Every Phase-13
  and Phase-14 surface ships at least one action of its own"* — was false.

**Measured, not inferred.** Route **`/host/earnings`** at **320px**, both themes: the scan polled for
the full **15s** and found **0** non-shell controls on a **correct** tree. Three deliberate product
decisions produce it: the fixture's `payouts_enabled` state suppresses `PayoutBanner` (whose
`Set up payouts` button is the only control the route can render), `payout-row.tsx` takes **no**
`href` and states in as many words that a payout row is terminal and that giving it a destination
*"would be a product change smuggled in by a container swap"*, and the zero-ledger branch passes
`actions={null}` with its own written argument (the next step is a guest booking the space, which the
host cannot do). Watched red by declaring `/host/listings` control-less: **5** named controls came
back with their measured boxes.

**Why it was not fixed here.** No product change is owed **unless the surface is meant to have an
action**, and that is a PM call an audit may not make. What 17-11 did instead is **declare rather than
exempt**: a `Phase14Row.noOwnControls` reason that INVERTS the guard to *"exactly zero, and here is
why"* — strictly stronger on this surface, because it now also fails when the declaration goes stale
— while the 24px floor still runs over every control the scan found, shell included.

**Cheapest correct fix:** none to the code. The decision owed is one sentence from the PM: **a host
looking at held payouts has no route forward from this screen — is that correct?** If yes, nothing
changes and the declaration stands. If no, the cheapest repair is a route out in the `EmptyState`'s
`actions` slot, which is one prop and touches no payout logic.

**Suggested owner:** the PM.

---

## [17-D17] — `expectVisibleFocus` can land in the SITE FOOTER on a control-less surface, and still report green

- **Found by:** plan 17-11, `e2e/helpers/focus.ts` read against the `/host/earnings` measurement, 2026-08-30
- **Owner file:** `e2e/helpers/focus.ts` — `readFocus`, `:60`
- **Severity:** an assertion that is **true** and is **not about the route it names**. Vacuity in the
  one direction a green cannot show you.

**Measured, not inferred.** Route **`/host/earnings`** at **320px**: `expectVisibleFocus` walks Tab
until `readFocus`'s `inHeader` is false, and `inHeader` is `el.closest('[data-testid="site-header"]')`
**alone**. On the one surface with **0** controls of its own (`[17-D16]`), the "first in-surface
control" it measures is therefore a **footer link**. The ring assertion is still made and is still
true; what it is not is a statement about that route. Blast radius if the walk is changed: **26**
Phase-13 cases + **22** Phase-14 cases = **48** rows change what they measure.

**Why it was not fixed here.** Teaching the walk what "the surface" is changes what every row in two
blocks measures — an instrument change with a blast radius far beyond a plan whose subject was
coverage. It is also the class of change that must be made once and read carefully, not folded into a
coverage plan's last task.

**Cheapest correct fix:** `collectControls` already has the notion — `Control.inShell`, added by
17-06. Give `readFocus` the same field, have the walk skip shell chrome at **both** ends rather than
only the header, then re-run both blocks and **read the diff**. The diff is the deliverable: any row
that changes what it focuses is a row whose previous green was about the shell.

**Suggested owner:** whichever plan next opens `e2e/helpers/focus.ts`. Plan 17-13 declined it for the
stated reason — a 48-row instrument change inside the phase's synthesis step would land unreviewed.

---

## [17-D18] — `/host/payouts/refresh` issues a REAL PayMongo request on every case

- **Found by:** plan 17-11, reading the route's server component against its own threat model T-17-59, 2026-08-30
- **Owner file:** `src/app/(host)/host/payouts/refresh/page.tsx` → `refreshOnboardingLink()` →
  `startPayoutOnboarding()` → `createOnboardingLink()` in `src/lib/paymongo.ts`
- **Severity:** the **only** assertion in this suite that leaves the machine. T-17-59 asserts the
  payouts rows *"read the shipped pages only and issue no PayMongo call"* — that sentence is false.

**Measured, not inferred.** Route **`/host/payouts/refresh`** at **320px**, driven once per theme:
**2** outbound `POST https://api.paymongo.com/v1/linked_accounts/onboarding_links` per full run,
carrying whatever `PAYMONGO_SECRET_KEY` the local `.env` holds; **2** `audit` rows written with
`outcome: "error"`; **2** of `startPayoutOnboarding`'s **5-per-60s** per-identity budget consumed.
Platforms / Linked Accounts is beta / sales-gated (`src/lib/paymongo.ts`'s own BETA NOTE), so the call
fails and the retry sentence renders — which is the **only** document this route can produce locally.
On success the page would `redirect()` to PayMongo and there would be no document to measure at all.
**0** PayMongo resources are created (the gated endpoint refuses before one exists), and `afterAll`
deletes the audit rows — verified **0** rows left after **2** full runs (the `audit` table carries no
foreign key by design, so no cascade reaches them).

**Why it was not fixed here.** Because the alternative is worse: **an audit that refuses to visit a
route BECAUSE the route makes a call is an audit that does not measure the route.** The row is written
so that dropping it would be visible as a D-201 absence rather than a silent gap.

**Cheapest correct fix:** none today. If it ever becomes unacceptable — a live key in a CI job, which
is D-35's boundary — the correct repair is to **intercept the route's fetch** (`page.route` on the
PayMongo origin, returning the gated-error shape), **not** to drop the row. That keeps the document
under measurement and takes the network out of it.

**Suggested owner:** the PM decides whether it is acceptable; whoever wires CI implements the
interception if it is not.

---

## [17-D19] — The AC#29 block calls `expectTargets` and `expectVisibleFocus` on NO row

- **Found by:** plan 17-12, reading `e2e/overflow-320.spec.ts`'s AC#29 loop against its own plan text, 2026-08-30
- **Owner file:** `e2e/overflow-320.spec.ts` — the AC#29 block
- **Severity:** a guarantee that is narrower than the table's own plan text assumed. Stated plainly so
  nobody reads these rows as a target-size claim.

**Measured, not inferred.** The AC#29 loop runs `seedTheme` → viewport → `goto` →
`document.fonts.ready` → optional `open` → `expectReachable` → `expectNoOverflow` → optional
`expectNoOverflowWithin`, and calls `expectTargets` on **0 of its rows** — that helper is called only
from the AC#30 and AC#36 blocks. Plan 17-12's own Task 3 text instructed measuring the new rows
*"through the block's existing chain unchanged: … `expectTargets` at `TARGET_FLOOR_PX`"*, which the
block does not do. **The consequence:** the **4** boundary surfaces are proved not to scroll sideways
at **320px** in both themes, and are **NOT** proved to clear the **24px** target floor or to paint a
visible focus ring. Each renders **2** controls (the retry button and the route out), both `min-h-11`,
and `e2e/error-leak.spec.ts` asserts both are keyboard-reachable on the root boundary.

**Why it was not fixed here.** The instruction was followed **literally** (*"unchanged"*) rather than
by adding a call the other **21** rows in the same table do not make, which would have made the
table's guarantee inconsistent across its own rows. Adding it to the whole loop is an instrument change
across **42** cases — 17-13's size of change, not 17-12's.

**Cheapest correct fix:** add `expectTargets` (and `expectVisibleFocus`) to the AC#29 loop for the
**whole** table and **read the diff** — the point of the change is which rows go red, not that they
all stay green. Plan 17-13 did not take it: `e2e/overflow-320.spec.ts` is not in 17-13's
`files_modified`, and 42 newly-asserting cases landing in the phase's synthesis commit is precisely
the shape D-199 batches rather than absorbs.

**Suggested owner:** the phase verifier, or Phase 18's first responsive plan.

---

## [17-D20] — 17-10's `querySelectorAll` acceptance criterion is unsatisfiable without deleting prose the same plan calls load-bearing

- **Found by:** plan 17-10, running its own acceptance grep before and after its work, 2026-08-29
- **Owner file:** none — the defect is in the **criterion**, not in `e2e/host-headings.spec.ts`
- **Severity:** the phase verifier reading `1` where a criterion says `0` will look for a failure that
  is not there. Recorded so the number is read as this row.

**Measured, not inferred.** The instrument walks **28** host states at **320/768/1280** — route
`/host`, route `/host/listings`, route `/host/listings/[id]/availability` and route
`/host/listings/[id]/edit` among them — for **84** outlines in total, and the criterion is a grep over
the file that does the walking.
`grep -c 'querySelectorAll' e2e/host-headings.spec.ts` returns **1**, before the plan's work
and after — it always did. The single occurrence is inside `recordHeading`'s docstring:
*"A `document.querySelectorAll("h1")` count would report two on a responsive surface that only ever
shows one, and 'fixing' that would mean deleting a tree the sighted layout needs"* — the exact
sentence the plan's own `<interfaces>` block cites (`:363-368`) as why the role query is load-bearing.
**Comment-stripped the file contains 0:**
`grep -n 'querySelectorAll' e2e/host-headings.spec.ts | grep -vE ':\s*(\*|//|/\*)'` returns nothing.
So the criterion's **intent** — no markup sweep in the level-reading code — holds exactly, and the
walk reads every level through `getByRole("heading", { level })`.

**Why it was not fixed here.** The prose was kept and the criterion is what is wrong. This is
17-PATTERNS § Shared Patterns 9 stated as a grep instead of a test: *"This tree's comments quote the
very patterns the scans forbid — an un-stripped scan is red on correct code."* Rewording the docstring
to make a grep return 0 would delete the concrete counter-example that stops the next reader reaching
for a selector sweep — the *"bend shipped code to satisfy a grep"* move this phase has refused three
times now.

**Cheapest correct fix:** nothing is owed to the code. Whoever restates this criterion spells it
**comment-stripped**, as `tests/design/focus-definition.test.ts` and `tests/design/one-tree.test.ts`
already do for their own source scans.

**Suggested owner:** the phase verifier, when reading 17-10's criteria.

---

## [17-D21] — `open-capacity.spec.ts:407` is a date-dependent 90s timeout, new at this commit and not in `[16-D6]`'s ten

- **Found by:** plan 17-01, the per-file sweep at `--workers=1`, 2026-08-29
- **Owner file:** `e2e/open-capacity.spec.ts` — `pickDay` at `:364-371`, and the fixture-date pin at `:126-132`
- **Severity:** a red that appears and disappears with the calendar date. This repo has already shipped
  two date-dependent pixel time bombs; this is a third, in a spec rather than in a gate.

**Measured, not inferred.** Route **`/listings/[id]`** (an open-capacity listing). Failed **twice**,
alone, at `--workers=1`, with a **90s** timeout inside `pickDay` waiting for an enabled, in-month
`September 1, 2026` cell. The branch that differs between the triage date and today is the calendar's
month hop: the file computes `let offset = 3; while (dayAt(offset).month !== dayAt(offset + 2).month) offset++;`
and `showMonthOf` navigates the grid **only** when `crossesMonth` is true. On **2026-08-26** —
`[16-D6]`'s full-suite date, on which this file did **not** appear among the ten failures —
`dayAt(3)` was 2026-08-29 and `crossesMonth` was **false**. On **2026-08-29** `dayAt(3)` is 2026-09-01
and `crossesMonth` is **true**. That is the only input that moved.

**Why it was not fixed here.** It is **not Phase 17's by authorship** — `open-capacity.spec.ts` was
last touched in Phase 9, and Phase 17 changed no product code at the time the reading was taken. It is
in `e2e-baseline-reds.md`'s **declared denominator** (row 3), so it is already excluded from being read
as a Phase-17 regression.

**Cheapest correct fix:** confirm the causation by **pinning the clock** rather than by agreeing with
the paragraph above — `page.clock.setFixedTime` (or the fixture's own date seam) at a date where
`crossesMonth` is false and again where it is true. Then make `pickDay` wait for the month hop it
already knows it needs. Stated plainly so nobody over-reads it: the **correlation** is measured, the
**causation** is inferred from the source.

**Suggested owner:** whichever plan next owns open-capacity behaviour.

---

## [17-D22] — `e2e/one-tree.spec.ts` counts the booking sheet SHUT, never open

- **Found by:** plan 17-09, `e2e/one-tree.spec.ts` (the AC#12 one-instance count), 2026-08-29
- **Owner file:** none — `src/app/listings/[id]/(detail)/page.tsx`'s two `BookingPanel` placements are
  RESP-02's sanctioned arrangement
- **Severity:** none. Recorded so a later reader does not file a duplication defect.

**Measured, not inferred.** Route **`/listings/[id]`** at **320**, **768** and **1280**:
`[data-testid="booking-panel"]` counts **1** on the resting document at all three widths, and **2**
with the sheet open. The page mounts `BookingPanel` twice — the rail placement, in the document at
every width, and the sheet placement, inside a portal that is not in the document until the sticky bar
is tapped.

**Why it was not fixed here.** By design. One component, two placements, one provider, one fetch — the
arrangement `e2e/mobile-booker-path.spec.ts` asserts. AC#12's claim is about the **resting** document
and is made there.

**Cheapest correct fix:** none owed unless RESP-02's arrangement changes.

**Suggested owner:** nobody. This row exists to be found by a search, not acted on.

---

## [17-D23] — The wizard step rail has ZERO tab stops on a fresh mount

- **Found by:** plan 17-08, `e2e/keyboard-composites.spec.ts` (the wizard's declared 14-stop walk), 2026-08-29
- **Owner file:** none — `src/app/(host)/host/listings/[id]/edit/wizard.tsx:454` and `:953` are D-148's
  literal reading, correctly implemented
- **Severity:** none as conformance. It changes what the sentence *"the rail is a composite whose steps
  must each be reachable"* is a statement **about**.

**Measured, not inferred.** Route **`/host/listings/[id]/edit`** at **320px**, theme **court**: the
declared walk is **14** stops on a fresh mount and **0** of them are rail markers. `wizard.tsx:454`
seeds `visitedKeys` with step **1** only, and `:953` requires `done` **AND** visited — so on a fresh
mount every marker is inert. One step later the count is non-zero, which is how plan 17-08 found it:
`getByRole("button", { name: "Back" })` went strict-mode ambiguous on the advanced document, because
**the advance is exactly what turns the first rail marker into a control**.

**Why it was not fixed here.** Nothing is broken. D-148 says forward markers stay inert even once
visited, and they do.

**Cheapest correct fix:** none to the code. What was corrected is a **claim**: the file header briefly
said the measurement *"corrects the plan's own description of this surface"*, and the header now says
the plan's sentence is true **one step later** rather than false. The assertion that ships (c) walks
the **advanced** document, presses Enter on the rail marker and proves the return by the advance
action's label.

**Suggested owner:** nobody. Recorded so the next reader of the 14-stop declaration knows why the rail
is absent from it.

---

## [17-D24] — `.next` staleness can present as an HTTP 500, and `reuseExistingServer` adopts a wedged dev server silently

- **Found by:** plan 17-08, the first run of `e2e/keyboard-composites.spec.ts`, 2026-08-29
- **Owner file:** `playwright.config.ts` — the `webServer.reuseExistingServer` setting
- **Severity:** an environment failure that arrives disguised as a product or fixture defect, several
  assertions downstream of its cause.

**Measured, not inferred.** Route **`/listings/[id]`**: the already-running `next dev` on **:3000**
answered **HTTP 500** with *"Error: Jest worker encountered 2 child process exceptions, exceeding
retry limit"*. Playwright's `reuseExistingServer` adopted it without comment, so the first run reported
the calendar row failing on `6:00 AM` never resolving — a message that reads exactly like a fixture
defect. A throwaway probe dumping `response.status()` and the body is what named it. After
`rm -rf .next` and a fresh `npm run dev`: the page renders, Sept 1 2026 offers **6:00 AM–8:00 PM**, and
**4 of 5** cases went green immediately; **3** subsequent full runs were green.

**Why it was not fixed here.** It is an environment hazard, not a defect in any file this phase owns,
and the known mitigation (kill the server, `rm -rf .next`, restart) is already in the project's
operating notes — as a **404** symptom. The new datum is the **500**.

**Cheapest correct fix:** a one-line reachability probe at the top of the seeded specs — fetch the
base URL and fail with the status code and the first line of the body if it is not 2xx. That turns
"a fixture assertion timed out" into "the dev server is answering 500", which is the whole distance
between a ten-minute fix and an hour of investigation.

**Suggested owner:** whichever plan next opens `playwright.config.ts` or the shared e2e bootstrap.

---

## [17-D25] — One intermittent in the SHIPPED no-wrap case (f): the sheet measured mid-open-animation

- **Found by:** plan 17-04, one of eight full-file runs of `e2e/mobile-booker-path.spec.ts`, 2026-08-29
- **Owner file:** `e2e/mobile-booker-path.spec.ts:839` (the sheet's pinned-action bound)
- **Severity:** a **1-in-8** false red on an assertion this plan did not author and did not touch.

**Measured, not inferred.** Route **`/listings/[id]`** at **320px**, theme **court**: the case
`court · 320px · no wrap …` failed at `:839` with the sheet's pinned action measured at **595.5**
against a **`<= 569`** bound — the sheet read **mid-open-animation**, on a freshly recompiled route.
Re-run alone: **green**, and **6/6** green under `--repeat-each=3`.

**Why it was not fixed here.** It is not one of plan 17-04's assertions and the file was open only for
the clause-B and clause-C blocks. Adding a wait to somebody else's row on the strength of one
observation is the change most likely to hide the next real one.

**Cheapest correct fix:** the same shape `armWizard` uses after 17-08's stop-identity race — wait for
the sheet's transition to settle (a stable box across two frames, or the transition-end) **before**
the first box is read, rather than raising the bound. Raising the bound would make the assertion
tolerate the animation permanently.

**Suggested owner:** whichever plan next opens `mobile-booker-path.spec.ts`.

---


# Fixed in place — the mechanical-class closure record (D-200)

**D-200 is explicit that mechanical items are NOT closeable-around.** So each row of 17-UI-SPEC
§ Remediation rules § *May fix in place* is listed here with the plan that took it, or with the
measurement that says it did not arise. An unfixed mechanical item would be an incomplete phase; there
are none.

| May-fix-in-place row | Disposition in Phase 17 | Taken by | Evidence |
|---|---|---|---|
| Adding a missing accessible name to an icon-only control | **FIXED** — the wizard's `role="progressbar"` had no accessible name at all (`aria-progressbar-name`, serious, at 320 **and** 1280 on `/host/listings/[id]/edit`). `aria-labelledby` points at the `Step N of M` paragraph already above it, so **0** new product copy was authored. | **17-07** | `9989531`; `src/app/(host)/host/listings/[id]/edit/wizard.tsx` |
| Adding `role="status"` + `aria-busy` + an `sr-only` label to a skeleton | **DID NOT ARISE.** `tests/design/skeleton-a11y.test.tsx` predates this phase and is green on the current tree; the axe sweep's **48** measured rows reported **0** violations of this class. No skeleton was found without the mechanism. | — | `npm run test:design` |
| Converting a hand-rolled `h-11` `<Button>` to `size="touch"` | **FIXED at 5 sites in 4 files**, tree-wide count **5 → 0**. The declared ceiling was **6** and the tree measured **5** — the gate would have absorbed a sixth site silently, so it was flipped from `toBeLessThanOrEqual(6)` to `toBe(0)` in the same plan. The four `<SelectTrigger>` sites were deliberately left (they expose no `touch` size); `grep -c 'SelectTrigger'` is **9** before and after. | **17-05** | `baffe77`, `68b10b0`; `search-bar.tsx`, `group-refresh.tsx`, `regenerate-link-button.tsx`, `remove-attendee-button.tsx`, `tests/design/brand-recipe.test.ts` |
| Adding `whitespace-nowrap` / `min-w-0` to satisfy the no-wrap clause | **DID NOT ARISE.** **5 of 6** members of the declared no-wrap set measured clean at 320px on both bars with the shipped `whitespace-nowrap`; the sixth has no instrument (`[17-D11]`). `expectChipNotClipped` was written to assert the **cause** — measured: deleting `whitespace-nowrap` changes nothing visible while the chip has room, so a symptom-side gate would have reported green on the very commit that removed the protection. **0** classes added to `src/`. | — | `git diff e439bf9..HEAD -- src/` adds no such class |
| Adding padding to reach the 24px conformance floor | **FIXED.** D-196 — `p-1.5` on `ProfileLink` takes it **16×16 → 28×28**. `NAV_LINK_CLASS` byte-unchanged, `size-4` untouched, both accessibility mechanisms left unmerged. The site header's `collectControls` exclusion — written around this exact control — was **deleted** in the same plan, so the header is now inside the 24px scan on every Phase-13/14 case and all of them clear it. Visual exposure recorded as `[17-D6]`. | **17-06** | `d09e98d`, `0d3ae71`; `src/components/patterns/site-chrome.tsx` |
| Adding a `data-testid` to a structural container the sweep must scope to | **FIXED — 2 ids**, each with a compile-enforced `SELECTOR_CONTRACT` row (`why` lengths 1511 and 1263 characters). `search-results-region` on the `<section>` present in all **6** states `SearchResults` renders; `availability-calendar` on the resolved calendar root, deliberately **not** on `skeleton-calendar`. Measured after: `e2e/` carries **304** `getByRole` and **83** `getByLabel` lines against D-32 floors of 92 and 30 — **0** accessible-name selectors traded away. | **17-03** | `b0c2245`; `selector-contract.ts`, `search-results.tsx`, `availability-calendar.tsx` |
| Adding a measured row to `contrast-pairs.ts` for a rendered pairing axe found | **DID NOT ARISE, and this is the honest state:** `color-contrast` fired **0** times across the sweep's **48** measured rows — it is in `results.passes` on every surface that exercises it. So § Color's arbitration procedure was **never exercised** and remains untested against a real disagreement. `CONTRAST_PAIRS` stays **40** declared + **3** exclusions; the file's diff is comment-only (the D-138 narrowing, AC#24). | — | `git diff e439bf9..HEAD -- src/lib/design/contrast-pairs.ts` |
| Fixing a heading level to close a skipped step | **FIXED.** `heading-order` (moderate) on `/host/listings` at 320 **and** 1280 — the page is its `h1` and then the grid, so `ListingCard`'s `h3` skipped a rung. Shipped as a `titleAs` **prop** (default `h3`) with the host grid passing `h2`. Tailwind's preflight resets heading size and weight to `inherit`, so **the outline moved and not one pixel did.** Independently, 17-10 walked **84** host outlines across **28** states at 3 widths and found **0** skipped levels. ⚠ **THE JUSTIFICATION THIS ROW ORIGINALLY GAVE WAS FALSE, and is corrected here rather than deleted (code review, WR-05).** It said the prop was needed *"because the same card is **correct** on `/` where the results `h2` sits between."* **`/` does not render `ListingCard` at all** — it renders `SearchResultCard` → `ResultCard`, whose title is hard-coded at `patterns/result-card.tsx:153`. `grep -rn "<ListingCard" src/` returns **one** call site for this component (`(host)/host/listings/page.tsx:160`) and it passes `h2`; the other hit is a different, locally-declared `ListingCard` in `opengraph-image.tsx:72`. The FIX above is unaffected — the skipped rung was real and is closed — but the prop's default is argued in `listing-card.tsx`'s docblock on measured grounds now, not on a page that cannot mount it. | **17-07**, corroborated by **17-10**; corrected by **17-review** | `9989531`, `e2011f3`, `WR-05`; `listing-card.tsx`, `(host)/host/listings/page.tsx` |
| Correcting a stale comment that promises coverage this phase did not build | **FIXED in at least 6 plans.** 17-02: `gitignore-baselines.test.ts`'s stale `GREEN IS 4 PASSED` header count. 17-05: two `"h-11 clears the 44px touch target"` comments and `brand-recipe.test.ts`'s ceiling block. 17-06: three stale sentences rewritten in the **same commits as the fixes that invalidated them**, each quoting its previous text as history — including the `200px / 226px` pair that was `11-UI-SPEC` arithmetic rather than a measurement. 17-07 (AC#24): **6** stale two-theme sentences amended to court-only with the cost named, and `global-error`'s exclusion reason **corrected rather than copied** (the UI-SPEC justified it by a `best-practice`-tagged rule that the declared tag filter can never run). 17-11: `expectTargets`' vacuity sentence inverted on `/host/earnings`. 17-12: a pinned-counts test whose **own name** read `28 pages, 20 qualifying, 8 not` against constants saying 29 / 21 / 8. | **17-02, 17-05, 17-06, 17-07, 17-11, 17-12** | `ed68dea`, `68b10b0`, `d09e98d`/`0d3ae71`, `84e4270`, `e275527`, `6251c40` |

**⚠ PROMOTED AND FIXED — `[17-D26]`, and it is recorded HERE RATHER THAN AS A ROW ABOVE on purpose.**

The table above is the closure record for 17-UI-SPEC § *May fix in place* — a fixed, declared list.
`[17-D26]` is not one of those rows: it is an **escalate-class** finding that the PM **promoted to
in-scope at the D-199 review**. Filing it as a table row would quietly widen what that table claims to
be, so it is closed here instead, in full.

**The finding.** Four GATE-01 baselines encoded the WALL CLOCK. `/listings/[id]` computes venue-local
today in the RSC and derives the calendar's opening month, its today-ring and its disabled set from it,
so `listing-detail` ×3, `listing-sheet-375` and `collision-notice-1280` expired at every day-rollover.
Measured: the references minted 2026-08-26 went red on 2026-08-27, and nothing noticed for four days.

**The first prescribed repair was WRONG, and this row's own draft is what prescribed it.** It named
`page.clock` on the three drives. Probed before any code was written: with the browser clock moved to
2026-11-05 the in-page `new Date()` moved and the rendered calendar did **not** — `data-today` stayed
30, the caption stayed August 2026, the disabled count stayed 29. `page.clock` emulates the BROWSER;
the value is computed in the Node process before the HTML is sent. Reported back rather than
implemented, which is how the PM came to choose a different option.

**What shipped (PM's option 1) — a dev-only server seam, following D-08's `?theme=` idiom:**

| Piece | Detail |
|---|---|
| `src/lib/dev/today-override.ts` | **new.** `?today=YYYY-MM-DD` honoured OUTSIDE production only. Guard 1 is `process.env.NODE_ENV`, a **build-time constant** the bundler prunes — not an operator-settable env var, which could be flipped on a live deploy. Guard 2 parses with the shared `parsePickedDate`, never a cast. |
| `src/app/listings/[id]/(detail)/page.tsx` | applied at the **single origin**, so `todayStart`, `horizonEnd` and the `initialDate` fallback move together — an override that moved the ring without the disabled set would be a worse lie than the wall clock. |
| `e2e/helpers/visual-drive.ts` | `listingUrl()` pins `&today=${VRT_COLLISION.dayIso}`, so the calendar's today, the selected day and the fixture's booked day are **one literal that cannot drift**. |
| `tests/security/dev-today-override.test.ts` | **new, 17 assertions** — production inertness **with a positive control**, the guard's exact spelling and its position as the first statement, a single-env-read pin, the parse/reject table, and blast radius. |

**Proven before it was trusted, and proven inert where it ships — both measured end-to-end on the real
route, not asserted:**

| Server | no override | `&today=2026-09-16` | honoured? |
|---|---|---|---|
| **dev** `:3000` | August 2026 · 29 disabled | **September 2026 · 15 disabled** | **YES** |
| **prod build** `:3101` | August 2026 · 29 disabled | August 2026 · 29 disabled | **NO — identical in every field** |

Malformed values (`2026-02-31`, `not-a-date`) fall back to the wall clock rather than throwing or 404ing.

**Closed by the round-trip, and the round-trip held its prediction.** Five files predicted to change,
five changed, **zero minted**; every row predicted unchanged passed, including `listing-lightbox` and both
`checkout` rows whose URLs also gained the parameter. Pre-dispatch `ci` **`33295272924`** (5 failed / 38
passed / 42 skipped, the five being the five predicted); generation **`33295540219`** → commit `bac4b62`,
`staged 5 baseline file(s)`, all `M`; **green COMPARISON `33295755823` on `085eb07`, all four jobs,**
**`gate-visual` 43 passed / 42 skipped / 0 failed.**

**Fixed by:** `c7f1a1a` (the seam + the test), `bac4b62` (the CI-written baselines).

**One coverage note left open, deliberately:** the pinned day IS the selected day, so the coral selected
style covers the neutral today-ring and the ring is not separately visible in the new references. Pinning
`today` a day or two earlier would show both. Not changed here — the instruction named the fixture's own
day, and changing it now would need a third round-trip.

**One stale comment was deliberately NOT corrected**, and it is the exception that proves the rule:
`src/app/listings/[id]/(detail)/not-found.tsx`'s header (`[17-D3]`). It is left byte-identical because
it is a **source** comment describing shipped product behaviour on a route whose disposition is
undecided — editing it would state a product position from inside an audit. Every other stale comment
this phase found was in an **instrument**, where the comment is the deliverable.

**⚠ FOUND BY THE PHASE VERIFIER AND FIXED — the axe table's four missing rows. Recorded HERE, and the
fact that it was not recorded ANYWHERE until the verifier ran is itself the finding.**

Like `[17-D26]` above, this is not one of 17-UI-SPEC § *May fix in place*'s declared rows, so it is
closed beneath the table rather than inside it. It is written up in full because the verification
report's own `missing` list asks for it by name: *"this gap exists in none of the phase's 25 logged
findings, so it was never surfaced to the PM at all."*

**The finding.** `e2e/axe-sweep.spec.ts` — the one artifact this phase built to prove GATE-02's
"automated axe pass green in court" clause — **failed its own AC#2 completeness assertion when run**,
on `1751fb0`, deterministically, twice, at `--workers=1`. Its `declaredRouteFiles()` walk found **46**
route files on disk; its `ROWS` table declared **42**. The four missing were plan 17-12's group-local
throw routes. Plan 17-07 built the table in **wave 2**; 17-12 landed the routes in **wave 3** and
reconciled every OTHER route-inventory instrument — `tests/design/loading-coverage.test.ts` (29→33 and
8→12) and `e2e/overflow-320.spec.ts`'s D-201 table (four `coveredBy` entries) — and not this one.

**Mechanical, and therefore NOT closeable-around.** D-200 is explicit; this is the rule the whole
section above exists to enforce, applied to an item the section did not know about.

**Why nothing caught it, which is the part worth escalating.** **None of this phase's Playwright specs
run in CI (D-24, pre-existing).** 17-12 did not re-run the sibling instrument it had just invalidated;
17-13's "closed inventory re-proof" re-proved five inventories, none of them this one; the code review
ran two vitest invocations and no Playwright; and 17-14's closing evidence is a CI comparison run,
which by D-24 cannot execute this file. **The assertion worked perfectly and nobody ran it.** That is a
process gap rather than a code one, and it is the standing risk in every one of the seven specs this
phase added: each is a one-time audit result, not an ongoing regression gate.

**What was fixed, and it was larger than four rows.** Commit `64da86f`, `e2e/axe-sweep.spec.ts` only:

* **Four rows added**, one per `dev-throw-*` route, each a named skip — their whole body is a
  server-side throw, so the only document each can produce is its group's `error.tsx`. They are **not**
  D-201 exclusions (that clause names `src/app/dev`, and these sit *inside* the route groups on
  purpose): the same *covered, not excluded* disposition `overflow-320.spec.ts` already records.
* **Four skips became measurements.** The (app)/(auth)/(host)/(legal) boundary rows still carried
  *"no dev throw affordance exists inside the (app) route group"* — a sentence **17-12 made false**,
  which would otherwise have stood directly beside four new rows citing those affordances by name. All
  four now scan clean at 320 and 1280: **eight scans that did not exist before.**
* **Every boundary `tell` now names its own route out** (root `Back to search`, (app) `Your bookings`,
  (host) `Host dashboard`, (auth) `Back to log in`, (legal) `Back to FitOut`) instead of the shared
  `error-state` hook, because all five render the same panel and the bare hook proves *"a boundary
  rendered"*, not *"THIS boundary rendered"*.
* **The docblock count corrected 42 → 46, re-measured** (33 `page.tsx` + 4 `not-found.tsx` + 5
  `error.tsx` + 1 `global-error.tsx` + 3 `opengraph-image.tsx`) rather than copied from the failure
  message — this phase found seven acceptance criteria whose stated counts were false of the tree.

**Proven:** `npx playwright test e2e/axe-sweep.spec.ts --project=chromium --workers=1` → **60 passed /
36 skipped**, whole file. `npm run build` exit 0; `npm test` (alone) exit 0, 2169 passed / 5 skipped.
Sibling instruments **verified rather than assumed**: `overflow-320.spec.ts -g "D-201 / AC#2"` → 8
passed, and `loading-coverage.test.ts`'s 33/21/12 pins re-measured against disk. **Zero baseline PNGs
moved**, no `baselines.yml` dispatch, no threshold widened; green comparison run **`33300479520`** on
`64da86f` recorded in `baseline-evidence.md` § 8.

**⚠ AND TWO NUMBERS IN THE TABLE ABOVE ARE NOW HISTORY RATHER THAN CURRENT READINGS.** Two rows cite
*"the axe sweep's **48** measured rows"* (the skeleton-mechanism row and the `color-contrast` row).
That was 17-07's reading of its own first run and it is left byte-identical as the record of what was
measured then; **the sweep now measures 58** (29 reachable rows × 2 widths). Both claims survive the
change — the ten new scans reported **0** violations of either class — but the denominator moved, and
saying so is the point of saying it.

**Suggested owner:** the PM, for the *process* half only. The code half is closed. The open question is
whether any of this phase's seven Playwright specs should join CI (D-24 currently says no), because
without one nothing will notice the next wave-ordering gap either.

---

# D-199 / D-200 — the statement for the PM

**This list is input to next-milestone decisions, reviewed once, at phase close. It is not a blocker
on Phase 17's completion.** For every finding section above, the finding **is** the deliverable: each
carries a measurement a reader can re-take, the file that owns the repair, and what the smallest
correct repair would cost. Phase 17 may close green around all **25** that remain here. The list held **26** at its high-water
mark: 17-13 assembled 25, plan 17-14 appended a twenty-sixth from its dispatch diff, and the PM
**PROMOTED that one to in-scope at this review** rather than accepting it as input. It was then FIXED
and PROVEN GREEN, so it has moved to this file's `# Fixed in place` closure record and is no longer a deferred item.
Its first prescribed repair was refuted by measurement before any code was written; the second was
watched working before it was trusted. **The 25 that remain are input to next-milestone decisions and
block nothing.**

**Immediate escalations that occurred — exception (a), a GATE-06 scope alarm: ZERO.** No fix in any of
the twelve plans appeared to need a schema migration. Re-proved by command at phase close:
`drizzle/` holds **26** `.sql` files ending `0025_audit_resolved_by.sql`, `git status --porcelain drizzle/`
prints nothing, and `tests/design/money-path-invariants.test.ts`'s `MIGRATION_DIGEST` — which pins
**content**, not the filename, and was red-watched by changing one character in an already-shipped
`.sql` — is green.

**Immediate escalations that occurred — exception (b), a finding that makes an acceptance criterion
unreachable: THREE, and none interrupted a wave.** They are named here rather than being left to look
like ordinary rows, because D-199 says (b) warrants an interruption and in practice each was found by
a wave-parallel executor that could still close its own criterion by **measuring the truth instead**:

1. **`[17-D3]`** made 17-11's `expectReachable` row unreachable on
   `src/app/listings/[id]/(detail)/not-found.tsx`. Handled by declaring the row a **skip with the
   measurement in it**; 17-12 re-confirmed it is the **one** remaining unreachable row in the AC#29
   table. Escalate-class, so the phase closes around it — but the PM should read `[17-D3]` first, it
   is the only row here proposing a **deletion**.
2. **`[17-D20]`** made 17-10's `querySelectorAll` criterion unsatisfiable without deleting prose the
   same plan calls load-bearing. Handled by keeping the prose and recording that the **criterion** is
   what is wrong.
3. **`[17-D13]`** made RESP-04 AC#12 unaskable of the drop-in calendar. Handled by a named skip row
   carrying the `1` / `0` measurement, so RESP-04 AC#12 is closed for five of six families and for the
   exclusive calendar surface only — declared, not silently narrowed.

**Where the PM's decision is actually needed** — the rest can be routed to engineering without you:

- `[17-D1]` + `[17-D2]` — is a `200` on a missing listing acceptable for SEO? One build settles `[A6]`.
- `[17-D3]` — should `(detail)/not-found.tsx` exist at all, or is the root not-found the right document?
- `[17-D5]` — when should `wizard-cover-preview` be unblocked and its PNG minted?
- `[17-D9]` — the sticky bar occludes a footer link at 320px. Moving the clearance is a shell change.
- `[17-D16]` — a host looking at held payouts has no route forward from `/host/earnings`. Correct?
- `[17-D18]` — is a real PayMongo POST per e2e run acceptable, or should the fetch be intercepted?
