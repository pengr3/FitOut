# Phase 19: Host Listing Surfaces & Gates That Actually Run - Context

**Gathered:** 2026-09-04
**Status:** Ready for planning

<domain>
## Phase Boundary

A host's own listing grid renders honestly, creating a listing lands on the edit wizard for the
listing just created, and the repository's functional Playwright specs run in CI where a regression
in either can be caught.

**Requirements:** `HSURF-01`, `HSURF-02`, `CI-01`.

**This phase shares no machinery with the ops thread.** It goes first because it is cheap,
independent, and because `CI-01` makes every later v1.2 phase's gates capable of running — the
regression guard for `HSURF-01` is itself a Playwright assertion, so shipping it before CI would ship
a guard nothing runs.

**NOT in this phase:** anything under `(ops)`, the host verification surfaces, the review/resubmit
loop, `SUPPORT_EMAIL`. Those are phases 20–23.

</domain>

<decisions>
## Implementation Decisions

### Listing creation and the orphan drafts

- **D-01:** The **four existing orphan draft listings are DELETED** — a one-off scripted delete scoped
  by host and by the 2026-09-03 10:51:56Z–10:52:39Z creation window. No host intentionally created
  them; they are the defect's residue, they carry no title, no pricing, no photos and no bookings, so
  nothing is lost. **Verify emptiness per row before deleting, not just by window** — the window is
  how they were found, not proof of what they contain. — **Reversibility:** costly — a delete of real
  rows in a real database. Take the row contents into the plan's summary before deleting so the
  record survives the rows.

- **D-02:** **Creation becomes idempotent by reusing the host's own untouched draft.** Before minting
  a row, look for an existing empty draft owned by this host and reuse it; mint only when there is
  none. Pressing *Create listing* twice, or landing on the URL twice, yields **one** row. This kills
  the orphan class at the source rather than cleaning up after it, and it is why D-01 is a genuine
  one-off rather than the first of many. **No migration** — this is a query plus a branch.
  - ⚠ **"Untouched" needs a definition the planner must pin, not assume.** A draft the host has
    genuinely started editing must never be silently reused out from under a second Create press.
    Define it from the columns that are NULL/default on a freshly-minted row and say so at the site.
  - ⚠ **`saveListingStep` stays UNGATED** (D-270). Reuse changes what `createDraftListing` returns,
    never what the wizard may write.

- **D-03:** **A failed creation lands the host back on the grid with a sentence naming what
  happened** and telling them they can try again — replacing today's silent `redirect("/host/listings")`
  at `new/page.tsx:83`. This is the project's own rule that a signal names the state, the reason and
  the way out (`src/lib/host/requests-signal.ts:56`). The silent bounce is already recorded as a known
  blind spot in `18.1-UI-SPEC § NOT COVERED`; this phase closes it.
  - The `!res.ok` branch now catches genuine infrastructure failure only, because the verification
    redirect sits in front of it — so the sentence must not imply a verification problem.

### The card grid (HSURF-01)

- **D-04:** **Fix at the call site** — `src/components/listing/listing-card.tsx` (`:352` the `Card`,
  `:368` `CardContent`, `:434` `CardFooter`) — and **never** in vendored `src/components/ui/card.tsx`.
  Editing the primitive forks a shadcn component from upstream (D-129's measured argument, where
  `npx shadcn add` re-violates it on the next install) and would change every `Card` in the app,
  including the search grid.

- **D-05:** **`h-full` is a no-op and must not be the fix.** The grid wrapper sets no `align-items`,
  so grid items already stretch. What misaligns is the footer band: `Card` is `flex flex-col` with
  `gap-0` at the call site and **no child declaring `flex-1`**, so children pack to the top and the
  stretched height lands as dead space *below* the tinted, top-bordered footer. The fix is `flex-1`
  on the growing child (or `mt-auto` on `CardFooter`) plus `flex-wrap` on the footer.

- **D-06:** **Append classes, never prepend, under `tailwind-merge`.** Phase 17's **WR-04** recorded a
  case where hoisting a named constant to the front of `cn()` deleted `pb-20` outright, leaving a
  state worse than the defect being fixed.

- **D-07:** **The Delete control becomes ICON-ONLY** (PM decision, 2026-09-04) — the label is what
  makes the four-control cluster too wide, and dropping it buys the most space for the least change.
  Three conditions, all load-bearing:
  - **The accessible name survives.** Keep "Delete" as `sr-only` text (or an equivalent `aria-label`)
    so `getByRole("button", { name: "Delete" })` still resolves. **Measured: no test or spec locates
    this control by its text today**, so nothing breaks *provided* the name is preserved — dropping
    the name is what would break it, silently and only for screen-reader users.
  - **The destructive act stays double-gated.** `Delete` already opens a `ConfirmDialog` whose confirm
    is labelled "Delete listing" with `confirmVariant="destructive"` — icon-only is safe from
    mis-taps *because* of that dialog, so the dialog is not optional and must not be simplified away.
  - ⚠ **The hit-area bar for this cluster is 24px, NOT 44px** — and this corrects a claim made during
    discussion. `e2e/overflow-320.spec.ts:3146-3150` **deliberately declares `touch: []`** for the
    `Edit`/`Availability`/`Unlist`/`Delete` cluster, with the written argument that they are
    `size="sm"`, smaller than the Button default *by design*, and that **"asserting 44 on any of them
    would be red against reviewed code"**; all of them are covered by `expectTargets`'s 24px scan.
    Importing a 44px requirement here would contradict reviewed code.
  - Only **Delete** goes icon-only. Unlist keeps its label.

- **D-08:** **Two guards, not one, because fixing either does not fix the other:**
  1. equal `offsetHeight` across a row **with the footer flush to the card bottom**; and
  2. `scrollWidth == clientWidth` on `[data-slot="card-footer"]`.
  Both at **320px, the `sm` band and the `lg` band**. The controls are **clipped, not spilled** —
  `Card` carries `overflow-hidden` (`ui/card.tsx:15`) while `Button` carries `shrink-0` and
  `whitespace-nowrap` (`button.tsx:79`) — so an assertion that only looks for overflow *outside* the
  card will pass against the broken state.

### The listing-creation 404 (HSURF-02)

- **D-09:** **This opens with a REPRODUCTION GATE, not a code change.** Order: clear `.next`, restart,
  re-probe the ten measured URLs, then repeat under `next build && next start`. **If it does not
  survive a clean production build, no application file changes** beyond D-02/D-03, which are their
  own defect and stand on their own merits.
  - ⚠ `npm start` needs `PLATFORM_WALLET_NUMBER` / `PLATFORM_WALLET_NAME` passed inline or it 500s
    before the production probe can run.

- **D-10:** **Never patch at `edit/page.tsx:49`.** That `notFound()` is a real IDOR guard; softening
  it to work around a dev-server routing artifact trades a shipped ownership check for a symptom.
  Route the diagnosis through `/gsd-debug` rather than a standard plan.

- **D-11:** **If it IS confirmed a dev-server artifact, the phase still leaves a guard behind plus the
  written finding** (PM decision) — a spec that fails if a host-facing route stops resolving, and a
  written record of the manifest evidence. **Rationale the PM gave weight to:** this class has now
  cost real time twice on this machine — phantom `tsc` errors from a half-written
  `.next/dev/types/routes.d.ts`, and this phantom 404 — and neither left anything behind, so it was
  re-diagnosed from scratch both times.
  - ⚠ **Do NOT name a cause in a docblock without evidence.** Three things are unproven and the phase
    must either close them or record them as open: (a) that `rm -rf .next` + restart makes it go away;
    (b) whether it reproduces under a production build; (c) **what removed the manifest entry** — a
    swallowed compile error, an HMR write race, a `next build` racing `next dev` on the shared
    `.next`, or a Turbopack bug.

### CI (CI-01)

- **D-12:** **A NEW fifth job (`gate-e2e`), never a widening of an existing one.** Widening
  `gate-price-parity` is an enumerated mutation that `scripts/verify-workflows.mjs:600` is designed to
  catch. The new job uses the **same pinned `mcr.microsoft.com/playwright:v1.60.0-noble` container**
  with `--ipc=host`, and **no `npx playwright install` step** — the image ships the browsers, and
  `ci.yml` records an install step as "the most common way a container job ends up comparing against
  a browser nobody pinned."

- **D-13:** **Run all 37 functional specs on every PR, measure the wall-clock, then decide about
  sharding.** Subsetting before measuring is how a gate ends up covering less than anyone believes it
  does. The number is currently unmeasured; record it in the phase summary either way.

- **D-14:** **The job FAILS CLOSED on `RESEND_API_KEY`.** It asserts the variable is unset and fails
  loudly if it ever is. **Measured reason:** `instrumentation.ts` mocks `api.paymongo.com` but
  **deliberately does not mock `api.resend.com`** — its header argues explicitly against folding
  Resend in, because `src/lib/email.ts:34-35` binds the client at module load and the key *is* the
  switch, so mocking it would suppress the `[email:dev]` console fallback too. Finding **`[17-D28]`**
  measured **14 real `POST api.resend.com/emails` per suite run** whenever the key is set. CI is safe
  today only because `ci.yml` never mentions `RESEND` — nothing enforces that, and one unrelated
  secret addition would start mailing real people on every PR.

- **D-15:** **The job becomes a REQUIRED check** — a gate that reports but cannot block is the shape
  D-24 already left this project with. **Prerequisite, not optional:** it is made required only after
  it has been **watched failing** (success criterion 4 — proven by watching one spec fail, not by
  reading the workflow file). Ship non-required, prove it can go red, then flip it.

### Claude's Discretion

- The exact copy of D-03's failure sentence — follow the shipped signal patterns
  (`requests-signal.ts`, `review-signal.ts`) rather than inventing a voice.
- The exact predicate defining an "untouched" draft in D-02, subject to D-02's warning.
- The icon chosen for D-07's Delete control, consistent with the `PencilIcon` / `CalendarClock`
  idiom already in the footer.
- Whether D-11's guard is a Playwright spec or a structural test, so long as it would go red if a
  host-facing route stopped resolving.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` § "Phase 19: Host Listing Surfaces & Gates That Actually Run" — goal, the
  four success criteria, and the three ⚠ blocks (HSURF-01's no-op warning, HSURF-02's reproduction
  gate, CI-01's never-a-widening rule)
- `.planning/REQUIREMENTS.md` § "v1.2 — Verification & Operations" — `HSURF-01`, `HSURF-02`, `CI-01`
- `.planning/PROJECT.md` § Key Decisions — D-129 (never fork vendored shadcn), D-131 (the hard
  quality gates), D-24 (why the gates do not run today)

### Research (this milestone, 2026-09-03)
- `.planning/research/PITFALLS.md` — the measured root cause of both defects, with MEASURED /
  DERIVED / UNPROVEN tags per claim. **The single most important read for HSURF-02.**
- `.planning/research/ARCHITECTURE.md` — the call-site-vs-primitive argument for HSURF-01
- `.planning/research/STACK.md` § "5. Playwright in CI (D-24) — it is half-closed already" — the
  fifth-job shape, the container pin, and why no install step
- `.planning/research/SUMMARY.md` — cross-cutting synthesis

### Code this phase touches
- `src/components/listing/listing-card.tsx` — `:352` `Card`, `:368` `CardContent`, `:434`
  `CardFooter`, `:449` the `ml-auto` cluster, `:463-477` the Delete `ConfirmDialog`
- `src/components/ui/card.tsx:15` (`overflow-hidden`) and `src/components/ui/button.tsx:79`
  (`shrink-0`, `whitespace-nowrap`) — **read, never edit**
- `src/app/(host)/host/listings/page.tsx:180` — the grid wrapper (sets no `align-items`)
- `src/app/(host)/host/listings/new/page.tsx:80-84` — the GET-with-a-write and its silent bounce
- `src/app/actions/listing.ts:111` — `createDraftListing`
- `src/app/(host)/host/listings/[id]/edit/page.tsx:30-33` (the `/login` redirect that proves no
  FitOut code runs) and `:49-51` (the IDOR guard — **never soften**)

### Gates and instruments
- `.github/workflows/ci.yml` — the four existing jobs and the header's mutation table
- `scripts/verify-workflows.mjs:600` — why widening job 3 is caught
- `instrumentation.ts` — the PayMongo seam and its explicit refusal to fold in Resend
- `e2e/overflow-320.spec.ts:3135-3150` — the `/host/listings` row: its `tell`, and the **written
  `touch: []` exemption** that makes 24px, not 44px, the bar for this control cluster
- `playwright.config.ts` — `updateSnapshots: "none"`, the exact `@playwright/test` pin

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`ConfirmDialog`** — already wraps both Unlist and Delete with titles, descriptions and typed
  confirm variants. D-07's icon-only Delete reuses it unchanged.
- **`runAction`** in `listing-card.tsx` — the existing action-result + toast idiom; D-03's failure
  sentence should reach the host through the shipped pattern, not a new one.
- **The `gate-price-parity` job** in `ci.yml` — D-12's new job copies its skeleton exactly
  (container, `--ipc=host`, DB migrate steps, no install step).
- **`loadHostVerification`** — already read by `new/page.tsx`; D-02's reuse query is an *additional*
  owner-scoped read in the same action, not a new access pattern.

### Established Patterns
- **Call-site fixes over primitive edits** (D-129) — the vendored `ui/*` components are treated as
  upstream and are not forked.
- **A signal names the state, the reason and the way out** (`requests-signal.ts:56`) — the shape D-03
  must follow.
- **Server-side authority** — `deriveBookable` is off limits; nothing in this phase touches it.
- **Gates run alone**; worktrees are OFF so plans run sequentially on `dev`.

### Integration Points
- `listing-card.tsx` is used by `/host/listings` **only** — its docblock records that `/` renders
  `SearchResultCard` → `ResultCard` instead. So D-04/D-05/D-07 cannot regress the search grid, and a
  claim that they might is false.
- `createDraftListing` has exactly one caller (`new/page.tsx:80`), so D-02's contract change has one
  integration point.
- The new CI job shares the `fitout_test` provisioning steps with `gate-db`.

</code_context>

<specifics>
## Specific Ideas

- **On the Delete control, verbatim from the PM:** *"replace delete with just an icon it will make the
  space much smaller."* The reasoning is space, and the label is what costs it — so the label is what
  goes, not the control and not its confirmation.
- **On the 404 guard,** the PM chose "guard + written finding" over closing it as a dev artifact,
  against the argument that this class has already been re-diagnosed from scratch twice.
- **On CI scope,** the PM chose measurement before optimisation: all 37 first, shard only if the
  number says so.

</specifics>

<deferred>
## Deferred Ideas

- **Mocking `api.resend.com` in `instrumentation.ts`** — raised as a stronger alternative to D-14's
  fail-closed assertion, and declined for this phase because that file's header argues at length
  against folding Resend in (the key *is* the switch, so a mock would also suppress the `[email:dev]`
  fallback). `[17-D28]` remains **OPEN** and is the largest known un-fixed exposure in the suite.
  Revisit if the suite ever needs to run with a real key set.
- **Sharding the e2e suite** — explicitly gated on D-13's measurement. Not a decision this phase can
  make before the number exists.
- **An overflow menu for destructive card actions** — considered for the footer and not chosen; the
  PM picked icon-only Delete instead. If the cluster ever grows past four controls, this is the next
  option to reconsider.

### Reviewed Todos (not folded)

The todo matcher scored all four pending todos against this phase; **none was folded**, and all four
matched on keyword overlap rather than scope:

- **Ops staff management surface and invite flow** — belongs to **Phase 20**, and is already tagged
  `resolves_phase: 20`.
- **Reveal host contact details in ops queue** — **already shipped** by 18.1-13 / 18.1-16; `OPS-06` is
  Complete.
- **Host verification submission path and listing-creation gate** — **already shipped** by 18.1;
  `HVER-06` and `LVER-05` are Complete.
- **Phase 18 PM decision follow-through** — **already shipped**; D-236 in 18.1-01, D-231 in 18.1-03,
  F11 in 18.1-02.

⚠ The last three are complete work still sitting in `.planning/todos/pending/`. Moving them to
`completed/` is a records change awaiting the PM's confirmation — flagged, not done.

</deferred>

---

*Phase: 19-host-listing-surfaces-gates-that-actually-run*
*Context gathered: 2026-09-04*
