---
phase: quick-260811-elm
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/search/search-result-card.tsx
  - tests/search/search-card-open.test.tsx
  - .planning/v1.0-MILESTONE-AUDIT.md
autonomous: true
requirements: [AUDIT-06-COPY]

must_haves:
  truths:
    - "A booker who has never met the word 'Drop-in' learns from the SEARCH CARD ALONE that the space is shared and that what they buy is a pass for a day, not a reserved time window — one muted line, on the drop-in card only (D-ELM-01)."
    - "The card's copy is a COMPRESSION of the shipped listing-page framing line, not a second vocabulary: its tail `any time they're open` is the verbatim tail of `date-pass-picker.tsx:230` and the sibling of `when-label.ts:112` (D-ELM-02)."
    - "The sharing fact is attached to the SPACE, never to the pass — `shared space`, never `shared pass` / `shared day pass`, because this product also ships GROUP BOOKINGS and a pass-shared-with-friends reading is a real misread, not a hypothetical one (D-ELM-02)."
    - "The copy obeys the § Copywriting vocabulary rule quoted in `drop-in-badge.tsx:11-12` — the strings `open capacity` and `occupancy mode` appear nowhere in the rendered output of EITHER card, and that assertion is proven non-vacuous by a mutation (D-ELM-06)."
    - "The new line cannot reintroduce O2's lie: the existing `CLOCK_TIME` (/\\d:/) and `not.toContain(\"Available \")` assertions run over the WHOLE card text, so they now police the new copy too — proven by a mutation that puts an hour into it (D-ELM-02)."
    - "The exclusive (non-drop-in) card's rendered output is byte-identical to today: the new node lives inside an `isDropIn` guard, and the whole exclusive card's `textContent` is pinned by EXACT equality against a string composed from the SAME server helper the card renders from — never a hardcoded money figure (D-ELM-05)."
    - "Nothing new is imported, no new UI primitive, no tooltip/popover: the line is one `<p className=\"text-sm text-muted-foreground\">`, the token this card already uses on four other lines, so it renders correctly in both themes and wraps rather than truncates at 320px (D-ELM-04)."
    - "The badge itself — `src/components/listing/drop-in-badge.tsx` — and the listing page and reserve page are BYTE-UNTOUCHED: the badge renders on three surfaces and the other two already carry a fuller explanation (D-ELM-03)."
    - "`SpotsLeftChip`, `lowStockThreshold`, `OPEN_LOW_STOCK_MAX` and every OC-11 file are byte-untouched — the second clause of audit item #6 is an accepted design decision and stays open (D-ELM-07)."
    - "Audit item #6 is amended as HALF closed, never as closed: the copy clause closes with commits, the small-cap scarcity chip clause remains accepted-as-designed, and the item as a whole is stated to be still open (D-ELM-07)."
    - "No schema change, no migration, no new dependency: `drizzle/` still ends at `0024_audit_table.sql` and `package.json` is untouched (D-ELM-04)."
  artifacts:
    - path: "src/components/search/search-result-card.tsx"
      provides: "The drop-in explainer line, inside an isDropIn guard, between the type+badge line and the price block"
      contains: "any time they're open"
    - path: "tests/search/search-card-open.test.tsx"
      provides: "Cases 7/8/9 plus the verbatim RED and three-mutation record, appended to the existing 6-case harness"
      contains: "Day pass"
    - path: ".planning/v1.0-MILESTONE-AUDIT.md"
      provides: "Item 6 amended — copy clause CLOSED, scarcity-chip clause still accepted-as-designed, item as a whole still open"
      contains: "260811-elm"
  key_links:
    - from: "src/components/search/search-result-card.tsx"
      to: "the isDropIn fork"
      via: "the explainer <p> is guarded by `isDropIn &&`, so an exclusive card can never render it"
      pattern: "isDropIn && \\("
    - from: "src/components/search/search-result-card.tsx"
      to: "src/components/availability/date-pass-picker.tsx:230"
      via: "shared tail `any time they're open` — the card compresses the listing page's framing line"
      pattern: "any time they're open"
    - from: "tests/search/search-card-open.test.tsx"
      to: "src/lib/booking/all-in-rate.ts"
      via: "the exclusive byte-identity expectation is composed from `allInRateParts`, never a literal peso figure"
      pattern: "allInRateParts"
---

<objective>
Close the FIRST CLAUSE ONLY of **v1.0 milestone-audit tech-debt item #6** — *"Phase 9 product copy —
'Drop-in' is unexplained on the search card (conversion risk)"*.

A drop-in search card today reads `Gym · [Drop-in]` / `₱367.50/person` / `Service fee included`. Every one
of those is true and none of them answers *what is this?*. A booker who has not met the term does not learn
that the space is **shared with other people**, or that they are buying a **pass for a day** rather than
reserving the space for a window. `/person` hints; it does not state. That is the conversion risk: the card
asks for a click without answering the question the click is meant to resolve.

Purpose: make the card carry enough to earn the click, in the vocabulary the downstream surfaces already
use — not to re-explain the whole model on a results tile.
Output: ONE muted line on drop-in cards only, three new pinned cases in the existing harness, three
mutations recorded verbatim, and audit item #6 amended as HALF closed.

**The second clause of item #6 is OUT OF SCOPE and stays open** — *"the small-cap scarcity chip behaviour
is an explicitly accepted design decision, not a defect"* (OC-11, decided by the operator in the Phase-9
human walkthrough, verified 6/6 by the UI checker). Do not touch the chip, `lowStockThreshold`,
`OPEN_LOW_STOCK_MAX`, or anything on the OC-11 path, and do not let the doc edit imply item #6 is fully
closed.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@src/components/search/search-result-card.tsx
@src/components/listing/drop-in-badge.tsx
@tests/search/search-card-open.test.tsx
@.planning/phases/09-open-capacity-bookings/09-UI-SPEC.md

<interfaces>
<!-- Contracts already in the codebase. Use these directly — no exploration needed. -->

The card's drop-in fork, as shipped (`src/components/search/search-result-card.tsx:183-222`), in render
order:

```
CardContent (space-y-1)
  h3            {title}
  p             isDropIn ? `{typeLabel} [DropInBadge]` : typeLabel && `{typeLabel}`   <- the ternary
  p             {priceParts.join(" · ")}            // "₱367.50/person" for a drop-in row
  p             "Service fee included"              // when priceParts.length > 0
  p             {distanceKm} km away                // only when the search had an origin
  p             {availabilityLine}                  // EXCLUSIVE only
  p             {dropInDateLine}                    // DROP-IN only, "Fri, Aug 8 · Makati time"
  SpotsLeftChip                                     // drop-in AND a date in play
```

`const isDropIn = listing.occupancyMode === "open_capacity";` (line 120) is the only fork key.

The DOWNSTREAM copy that already exists — the card must be CONSISTENT with it, not invent a second
vocabulary. (This is the answer to "what does the listing page already say": it already explains more than
the card does, in two places.)

```
src/components/availability/date-pass-picker.tsx:230   {"Pick a day — your pass is good any time they're open."}
src/components/availability/date-pass-picker.tsx:336   {"Your pass covers the whole day — come any time while they're open."}
src/lib/booking/when-label.ts:109/112                  `{date} · Drop-in pass` / `{date} · Drop-in pass, any time {open} – {close} ({City} time)`
src/app/listings/[id]/page.tsx:325-327                 <h2>Availability [DropInBadge]</h2>   // heading only; the framing line lives in the picker
src/app/(host)/host/listings/[id]/edit/wizard.tsx:215  "Lots of people share the space on the same day…"  // HOST-facing — the only place the SHARING fact is currently stated anywhere
```

Note both `date-pass-picker` lines are **braced string literals**, not raw JSX text. That is deliberate:
`react/no-unescaped-entities` flags a bare `'` in JSX children, and both contain `they're`. Follow the same
form.

The vocabulary rule, quoted from `09-UI-SPEC.md:444` (§ Copywriting) and restated in
`src/components/listing/drop-in-badge.tsx:11-12`:

> **Booker-facing copy never says** "occupancy mode", "capacity", "remaining", "slot", "unit", "claim",
> "counter". Say **pass**, **spot**, **day**, **spots left**.

The existing test harness (`tests/search/search-card-open.test.tsx`) — REUSE it, do not start a new file:

```typescript
// @vitest-environment jsdom            // line 1, pragma-driven; keep it
vi.mock("next/link", …)                 // next/link stubbed to a plain <a>
const FRIDAY = "2025-08-08";            // a REAL Friday
const PER_HEAD_CENTS = 35000;
const CLOCK_TIME = /\d:/;               // any wall-clock time anywhere in the card
function makeOpenRow(overrides?: Partial<SearchResultRow>): SearchResultRow;       // occupancyMode "open_capacity"
function makeExclusiveRow(overrides?: Partial<SearchResultRow>): SearchResultRow;  // "exclusive", hourly 30750, day null
// cases (1)…(6) already exist. Case (1) asserts `not.toContain("left")` over the whole card text.
```
</interfaces>

<design_decisions>
These are DECIDED. Implement them; do not re-litigate them mid-task. Cite the ID in the code comments.

**D-ELM-01 — ONE muted line, on drop-in cards only, directly beneath the `Gym · [Drop-in]` type line and
ABOVE the price block. Not a tooltip, not the price line, not a badge change.**

*Placement:* it explains the word that just raised the question, and it keeps `₱367.50/person` +
`Service fee included` contiguous — those two are one unit and nothing may be inserted between them.

*Density, weighed honestly:* this card already competes on photo, title, type+badge, price, fee qualifier,
distance, date line and (with a date in play) the scarcity chip. A permanent extra line on every drop-in
card is a real cost. It is paid because the alternatives are worse (below) and because 46 characters at
`text-sm` muted is the smallest instrument that answers the question at all.

*Rejected — extend the price line to `₱367.50/person · day pass`.* Zero added lines, and tempting. But the
price string is composed SERVER-side by `allInRateParts` (`src/lib/booking/all-in-rate.ts:58`), which is
shared with the HOST's `Your listings` card, and 09-UI-SPEC § 4's closing paragraph fixes that surface at
`₱350/person` with no badge and no mode decoration — so a booker-facing comprehension fix would silently
edit a management surface. And `search-result-card.tsx:130-138` holds a hard "zero arithmetic, zero price
composition in this file" rule for a real reason (the browser bundle cannot see a non-public
`SERVICE_FEE_BPS` override); appending to the price string here would be the first crack in it.

*Rejected — a tooltip or popover on the badge.* Two independent killers. (1) **Touch:** roughly half this
product's traffic is mobile, where a hover tooltip is not an explanation but a hidden one — a poor primary
explanation by construction. (2) **Structural:** the WHOLE card is a single `<Link>`
(`search-result-card.tsx:167`), and a Radix tooltip/popover trigger is a `<button>`, so this nests an
interactive control inside an anchor — invalid nesting, and on touch the tap either navigates or is
swallowed depending on which handler wins. `tooltip.tsx` and `popover.tsx` both exist; availability was
never the constraint.

*Rejected — change the badge word to something self-explanatory (e.g. `Day pass`).* The badge is a
cross-surface contract (09-UI-SPEC § 4 + § Component Inventory) rendered on three surfaces, and `Drop-in`
is the term the product teaches everywhere including `composeWhenLabel`. Renaming it to dodge the
explanation would break the vocabulary in ten downstream places to save one line here.

**D-ELM-02 — the copy is EXACTLY:**

```
Day pass · shared space, any time they're open
```

Both facts the audit names, in 46 characters, in vocabulary already shipped:

- *"a pass for a day"* -> `Day pass` — the permitted nouns (**pass**, **day**), and the same phrase the host
  wizard uses for the same concept (`wizard.tsx:215`, "Each person buys a day pass").
- *"sharing the space with other people"* -> `shared space`. **Grammatically attached to the SPACE, and this
  is load-bearing.** `Shared day pass` / `shared pass` reads as *a pass you share with a friend* — and this
  product SHIPS GROUP BOOKINGS, where an organizer books and invites people. That is not a hypothetical
  misread; it is the adjacent feature. The space is what is shared; say so. (Note this is also the first
  time the sharing fact is stated in BOOKER-facing copy anywhere — today it exists only in the host wizard.)
- *"not a reserved window"* -> `any time they're open`, the **verbatim tail** of the listing page's framing
  line (`date-pass-picker.tsx:230`) and the sibling of `composeWhenLabel`'s `any time {open} – {close}`
  (`when-label.ts:112`). The card is a compression of the surface it links to, not a new voice.

Separator `·` matches the card's own grammar (`Fri, Aug 8 · Makati time`, the price join). It is a fragment,
so **no terminal period** — every other line on this card is a fragment without one. Sentence case.

Vocabulary check against 09-UI-SPEC:444: contains no "occupancy mode", "capacity", "remaining", "slot",
"unit", "claim", "counter". Harness check: contains **no digit** (so `CLOCK_TIME` stays satisfied), no
`"Available "`, and — deliberately checked — **no substring `left`**, which case (1) asserts is absent from
a no-date card.

Write it as a **braced string literal**, `{"Day pass · shared space, any time they're open"}`, mirroring
`date-pass-picker.tsx:230`, because of the apostrophe in `they're` and `react/no-unescaped-entities`.

**D-ELM-03 — inline at the card. `drop-in-badge.tsx` is BYTE-UNTOUCHED and gains no export.**
The badge renders on three surfaces and the other two already explain more than the card does — the listing
page pairs it with `Pick a day — your pass is good any time they're open.` and the day panel's `Your pass
covers the whole day…`; the reserve page pairs it with `composeWhenLabel`'s full drop-in line. Hanging a
shared blurb constant off the badge would read as applying to all three. This copy belongs to ONE surface,
so it lives on that surface — the shipped pattern (`date-pass-picker` inlines its own framing lines;
`PASSES_FIXED_MESSAGE` is module-local to `booking.ts`). Point at `date-pass-picker.tsx:230` and
`drop-in-badge.tsx:11-12` from the comment instead.

**D-ELM-04 — `<p className="text-sm text-muted-foreground">` and nothing else.**
The same token four other lines on this card already use, so both themes are covered by construction, with
no new token, no accent, and no new primitive. Explicitly NOT accent: 09-UI-SPEC § Color lists the five
permitted accent uses this phase and names the `Drop-in` badge among the things accent is **not** for; a
muted explainer is further still from that list. No `truncate`, no `line-clamp`, no `whitespace-nowrap` —
at 320px (the grid is `grid-cols-1` until `sm:`, `search-results.tsx:63`) the line wraps to two, which is
correct behaviour and the reason the copy was held to 46 characters. The card's `space-y-1` handles rhythm;
add no margin utilities.

**D-ELM-05 — the exclusive card is pinned by EXACT full-text equality, composed from the server helper.**
"The exclusive card stays byte-identical" must be an assertion, not a claim. New case (9) renders
`makeExclusiveRow()` with the same searched window as case (6) and asserts `container.textContent`
**equals** a string joined from the card's own inputs — `"No photos yet"`, the title,
`SPACE_TYPE_LABELS[...]`, the parts from `allInRateParts(rates)`, `"Service fee included"`, and the shipped
availability line. **Never hardcode the peso figure**: composing it from `allInRateParts` is the pattern
case (1) already uses (line 71) and it means a service-fee change cannot produce a false failure here. If a
whitespace artifact appears, collapse runs with `.replace(/\s+/g, " ")` on **both** sides and say so in a
comment — do NOT loosen to `toContain`, which is exactly what would remove the case's teeth.

**D-ELM-06 — the forbidden-string assertion is VACUOUS until a mutation proves otherwise, so one is
mandatory.** `open capacity` / `occupancy mode` appear nowhere in the rendered card today; an assertion
that they are absent passes on unchanged source and measures nothing. M2 below is what gives it teeth, and
its RED is part of the deliverable, not an optional extra.

**D-ELM-07 — audit item #6 is amended as HALF closed, in those words.**
The scarcity-chip clause is an **explicitly accepted design decision** — `lowStockThreshold(cap) =
clamp(floor(cap / 2), 1, OPEN_LOW_STOCK_MAX)` (09-UI-SPEC:137), argued at 09-UI-SPEC:149, decided by the
operator in the Phase-9 human walkthrough and verified 6/6 by the UI checker. It is not work and it is not
debt. **Touch no OC-11 file:** `spots-left-chip.tsx`, the threshold in `src/lib/availability/open-capacity.ts`,
`OPEN_LOW_STOCK_MAX`, and the read model stay byte-unchanged, and `tests/availability/spots-left-chip.test.tsx`
is not edited. The amendment must state plainly that the item AS A WHOLE is **not** closed.
</design_decisions>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Three anchors for the drop-in explainer — two RED, one regression pin — recorded verbatim</name>
  <files>tests/search/search-card-open.test.tsx</files>
  <behavior>
    Written FIRST, against UNCHANGED `src/` — the house confirm-then-fix discipline. Append cases (7), (8)
    and (9) to the existing `describe` block; keep the `// @vitest-environment jsdom` pragma on line 1 and
    reuse `makeOpenRow` / `makeExclusiveRow` / `FRIDAY` / `CLOCK_TIME` as they stand.

    Declare two module-level constants next to `CLOCK_TIME`:
      `const BLURB = "Day pass · shared space, any time they're open";`
      `const FORBIDDEN = /open capacity|occupancy mode/i;`
    The literal is pinned on purpose — the house pattern (case (2) pins `Fri, Aug 8 · Makati time`): a copy
    change must fail here and force a deliberate re-read, which importing a shared constant would not do.

    - **(7) drop-in, NO date — the explainer renders, and in the right place.** `getByText(BLURB)` resolves.
      Then, over `container.textContent`, assert ORDER by index: `indexOf("Drop-in") < indexOf(BLURB) <
      indexOf("₱367.50/person")` — the line sits between the badge that raised the question and the price,
      and nothing was inserted between the price and `Service fee included`. Also assert `FORBIDDEN` does
      not match. RED now.
    - **(8) drop-in, date AND a searched start/end — the explainer coexists with O2.** `getByText(BLURB)`
      resolves, `Fri, Aug 8 · Makati time` still renders, and over the whole card text:
      `not.toMatch(CLOCK_TIME)`, `not.toContain("Available ")`, `not.toMatch(FORBIDDEN)`. RED now.
    - **(9) REGRESSION, exclusive card — byte-identical output.** Per D-ELM-05: EXACT equality of
      `container.textContent` against a string composed from `SPACE_TYPE_LABELS`, `allInRateParts(rates)`
      and the shipped literals. Plus `queryByText(BLURB)` is null and `FORBIDDEN` does not match. **GREEN
      now, and it MUST be** — it pins today's behaviour so a later mutation can prove it bites.

    Add a short header note above the new cases stating that (9) is the byte-identity gate and that the
    `FORBIDDEN` assertion is proven non-vacuous by mutation M2, not by passing.
  </behavior>
  <action>
    Write only the test file. Do not touch `src/`. Run the file, capture the observed failure output
    **verbatim** (both failure messages, not a paraphrase), and paste it into the test-file header in a
    fenced block labelled `Observed RED (pre-fix, 2026-08-11)`, with a one-line note that case (9) and cases
    (1)-(6) were GREEN in the same run — that contrast is the evidence (9) is a pin and not a restatement of
    the new assertions.

    Commit `test(quick-260811-elm): RED anchors for the drop-in search-card explainer`.
  </action>
  <verify>
    <automated>npx vitest run tests/search/search-card-open.test.tsx 2>&1 | tail -40   # MUST be RED on (7) and (8), GREEN on (1)-(6) and (9); capture verbatim</automated>
    <automated>git diff --exit-code src/   # nothing outside tests/ may have changed</automated>
  </verify>
  <done>Three cases exist; the observed RED is pasted verbatim into the file header with the GREEN contrast noted; `src/` is byte-unchanged; committed.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: The explainer line, three mutations, and audit item #6 amended as HALF closed</name>
  <files>src/components/search/search-result-card.tsx, tests/search/search-card-open.test.tsx, .planning/v1.0-MILESTONE-AUDIT.md</files>
  <behavior>
    After step A, `npx vitest run tests/search/search-card-open.test.tsx` is 9/9. After each mutation the
    named case is RED and the named contrast case is GREEN; after each revert `git diff --exit-code src/`
    is clean.
  </behavior>
  <action>
    **A. The line.** In `src/components/search/search-result-card.tsx`, immediately AFTER the closing `)}`
    of the `isDropIn ? … : …` type-line ternary (currently line 196) and BEFORE the price `<p>` (line 197),
    add a SEPARATE guarded node — not a second child of the ternary, and do not wrap the ternary in a
    fragment:

    `{isDropIn && (<p className="text-sm text-muted-foreground">{"Day pass · shared space, any time they're open"}</p>)}`

    A separate `isDropIn &&` guard rather than a branch of the ternary, deliberately: it leaves the shipped
    ternary byte-unchanged, and it makes the guard a single removable token so mutation M1 can measure it.
    The string is a braced literal per D-ELM-02 (`they're` + `react/no-unescaped-entities`).

    Above it, a comment in this file's house style covering: what the line is for (a booker who has not met
    "Drop-in" learns from THIS card that the space is shared and the unit is a day — audit item #6's copy
    clause); why it is a compression of `date-pass-picker.tsx:230` rather than new copy; why `shared space`
    and never `shared pass` (D-ELM-02, the group-booking misread); why muted and never accent (09-UI-SPEC
    § Color's five permitted accent uses); and why not a tooltip (D-ELM-01 — touch, and a `<button>` nested
    inside this card's whole-card `<Link>`). Cite the D-ELM ids.

    Change nothing else in the file. `allInRateParts`, `drop-in-badge.tsx`, `SpotsLeftChip` and every OC-11
    file are byte-untouched (D-ELM-03 / D-ELM-07).

    **B. Three mutations, each applied to `src/` alone, each reverted, each RED pasted VERBATIM into the
    test-file header under `Mutations (each reverted)`.**

    - **M1 — delete the `isDropIn &&` guard** so the line renders unconditionally.
      EXPECT: case **(9) RED** (the exclusive card grew a node). Record whether case **(6)** stayed GREEN —
      it should, and that contrast is the point: (6) checks named strings and would have missed this
      entirely, so (9) is the assertion actually carrying the byte-identity claim.
    - **M2 — replace `Day pass` with `Open capacity`** in the literal, leaving the rest.
      EXPECT: cases **(7) and (8) RED** on `FORBIDDEN`. This is the mutation that makes the vocabulary
      assertion mean anything (D-ELM-06); without it, it passes on unchanged source and measures nothing.
    - **M3 — replace `any time they're open` with `any time 6:00 AM – 10:00 PM`** in the literal.
      EXPECT: case **(8) RED** on `CLOCK_TIME`. This proves the new copy sits INSIDE O2's guard rather than
      beside it — a drop-in card still cannot advertise hours the pass does not reserve, whichever line
      tries.

    If any mutation does not produce the predicted RED, **report the observed result as observed** and do
    not adjust the assertion to fit the prediction.

    **C. Gates.** Full suite run bare with **no `DATABASE_URL` exported** (the suite forces itself onto
    `fitout_test`; `npm run db:test:setup` provisions it if needed), plus `tsc`, lint, and the
    no-migration / no-dependency checks in `<verify>`.

    **D. `.planning/v1.0-MILESTONE-AUDIT.md`, item 6 (lines 420-421).** Amend in the house revision style
    used by items 4 and 5 — qualify the clause that closed, keep the open one intact, append a dated
    parenthetical. It must say, unambiguously:
      - the COPY clause is **CLOSED 2026-08-11** by quick task `260811-elm`, with both commit shas, the
        exact shipped string, and the fact that the exclusive card is pinned byte-identical by case (9);
      - the scarcity-chip clause **remains an explicitly accepted design decision, not debt** — OC-11's
        `clamp(floor(cap / 2), 1, OPEN_LOW_STOCK_MAX)`, argued at 09-UI-SPEC:149, decided by the operator in
        the Phase-9 human walkthrough and verified 6/6 — and that **no OC-11 code was touched**;
      - **the item as a whole is therefore NOT closed.** Do not tick it, do not strike the whole item, and
        write nothing a later reader could quote as "item 6 closed".

    Commit `feat(quick-260811-elm): explain Drop-in on the search card; audit item 6 copy clause closed`.
  </action>
  <verify>
    <automated>npx vitest run tests/search/search-card-open.test.tsx 2>&1 | tail -15   # 9/9 GREEN</automated>
    <automated>npx vitest run 2>&1 | tail -5   # expect 1187 passed / 4 skipped / 0 failed (1184 baseline + exactly 3)</automated>
    <automated>npx tsc --noEmit && npm run lint</automated>
    <automated>git diff --exit-code src/ | head -1   # clean after every mutation is reverted</automated>
    <automated>grep -c "any time they're open" src/components/search/search-result-card.tsx   # MUST be 1 — the copy exists exactly once</automated>
    <automated>grep -v "^\s*//" src/components/search/search-result-card.tsx | grep -c "isDropIn && ("   # MUST be 1 — the explainer is guarded and M1 is reverted</automated>
    <automated>git status --porcelain src/components/listing/drop-in-badge.tsx src/components/availability/spots-left-chip.tsx src/lib/availability/open-capacity.ts src/lib/booking/all-in-rate.ts package.json package-lock.json   # MUST be empty — badge, OC-11 path and dependencies untouched</automated>
    <automated>ls drizzle/*.sql | tail -1   # MUST be drizzle/0024_audit_table.sql — no migration was added</automated>
    <automated>grep -c "not closed\|NOT closed" .planning/v1.0-MILESTONE-AUDIT.md   # MUST be >= 1 near item 6 — the item is never recorded as fully closed</automated>
    <manual>Load the search grid at 320px and at desktop width, in BOTH themes, with a drop-in listing and an exclusive listing in the same result set: the new line is muted, wraps rather than truncates, sits between the type+badge line and the price, and the exclusive card looks exactly as it did.</manual>
  </verify>
  <done>The explainer ships on drop-in cards only; `tests/search/search-card-open.test.tsx` is 9/9; all three mutation REDs are pasted verbatim into the test header with M1's case-(6) contrast recorded; full suite 1187/4/0; tsc 0; lint 0 errors with baseline warnings unchanged; `src/` clean after reverts; `drizzle/` still ends at `0024`; audit item 6 reads copy-clause-CLOSED / chip-clause-accepted / item-as-a-whole-open; committed.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| host-controlled listing data -> the search card | Already crossed by title/type/photo; **this change adds no new host-controlled data to the card.** The new line is a static literal with no interpolation |
| server read model -> client card | Unchanged: `occupancyMode` already rides on `SearchResultRow` and already drives four forks |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-ELM-01 | Information disclosure | the explainer line | n/a | A static string literal — no props, no listing data, no interpolation. Nothing about the host, the booker, or the day can reach it. |
| T-ELM-02 | Tampering | copy drifting out of the § Copywriting contract in a later edit | mitigate | `FORBIDDEN = /open capacity|occupancy mode/i` asserted over the WHOLE rendered text of both cards, and proven non-vacuous by mutation M2 (D-ELM-06). |
| T-ELM-03 | Repudiation (product truth) | the new line reintroducing O2's lie — advertising hours a pass does not reserve | mitigate | The shipped `CLOCK_TIME` and `not.toContain("Available ")` assertions run over the whole card text, so they now police this line too; mutation M3 puts an hour into it and must go RED. |
| T-ELM-04 | Tampering | the line leaking onto the exclusive card | mitigate | The node lives inside an `isDropIn &&` guard; case (9) pins the exclusive card's whole `textContent` by exact equality, and mutation M1 (guard removed) must turn it RED (D-ELM-05). |
| T-ELM-05 | Tampering | scope creep into the OC-11 scarcity path, which is accepted-as-designed | mitigate | `git status --porcelain` gate over `spots-left-chip.tsx`, `open-capacity.ts`, `drop-in-badge.tsx` and `all-in-rate.ts` must be empty (D-ELM-07). |
| T-ELM-SC | Tampering | npm/pip/cargo installs | n/a | **No package-manager installs in this task** — no new dependency, no new UI primitive, `package.json` byte-unchanged and gated. No legitimacy check applies. |
</threat_model>

<verification>
- `npx vitest run tests/search/search-card-open.test.tsx` = 9/9. Full `npx vitest run` = **1187 passed / 4
  skipped / 0 failed** (1184 baseline from `260811-dj4` + exactly the 3 new cases). Run bare, with **no
  `DATABASE_URL` exported** — the suite forces itself onto `fitout_test` since `260810-km4`.
- The pre-fix RED for cases (7) and (8) recorded verbatim, with the same-run GREEN of (1)-(6) and (9) noted.
- All three mutations applied, RED recorded verbatim (M1 with its case-(6) GREEN contrast), each reverted,
  `git diff --exit-code src/` clean.
- `npx tsc --noEmit` exit 0; `npm run lint` 0 errors, baseline warnings unchanged (the braced string literal
  is what keeps `react/no-unescaped-entities` quiet).
- Grep gates: the copy appears exactly once in the card; `isDropIn && (` appears exactly once with comments
  stripped.
- `git status --porcelain` empty for `drop-in-badge.tsx`, `spots-left-chip.tsx`, `open-capacity.ts`,
  `all-in-rate.ts`, `package.json`, `package-lock.json`; `drizzle/` still ends at `0024_audit_table.sql`.
- Manual: both themes, 320px and desktop, drop-in and exclusive cards side by side.
- Audit item 6 amended: copy clause CLOSED with shas, chip clause still accepted-as-designed, item as a
  whole still open.
</verification>

<success_criteria>
1. A drop-in search card reads `Gym · [Drop-in]` / `Day pass · shared space, any time they're open` /
   `₱367.50/person` / `Service fee included` — the booker learns from the card that the space is shared and
   the unit is a day.
2. The exclusive card's rendered text is pinned byte-identical by exact equality, and mutation M1 proves
   that pin bites.
3. The rendered output of both cards contains neither `open capacity` nor `occupancy mode`, and mutation M2
   proves that assertion is not vacuous.
4. The new line cannot advertise an hour: mutation M3 turns O2's existing clock-time assertion RED.
5. `drop-in-badge.tsx`, `all-in-rate.ts`, `SpotsLeftChip` and the whole OC-11 path are byte-unchanged; no
   schema change, no migration, no new dependency, no new UI primitive.
6. Audit item #6 records the copy clause CLOSED and the scarcity-chip clause STILL ACCEPTED AS DESIGNED,
   and states that the item as a whole remains open.
</success_criteria>

<output>
Create `.planning/quick/260811-elm-explain-drop-in-on-the-search-card-so-a-/260811-elm-SUMMARY.md` when done.
</output>
