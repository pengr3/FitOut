# Phase 19: Host Listing Surfaces & Gates That Actually Run — Research

**Researched:** 2026-09-04
**Domain:** Tailwind/flex call-site layout on a vendored shadcn `Card`; Next 16 Turbopack dev-router
diagnosis; GitHub Actions containerized Playwright job composition
**Confidence:** HIGH on everything read out of this tree, this `.next/` directory and this machine
today; MEDIUM on the CSS outcomes, which are derived from the class strings rather than from a
browser I opened; LOW/UNPROVEN on the 404's cause, and that is stated rather than smoothed over.

**How to read the tags.** Same three this milestone's `PITFALLS.md` uses, because the planner will
read both:

- **MEASURED** — read out of this repo's tree or this machine during this research, with the
  file:line or the command that produced it.
- **DERIVED** — follows from something MEASURED plus documented behaviour. Sound, not executed here.
- **UNPROVEN** — plausible, not established. Named rather than rounded up.

⚠ **The single most consequential finding in this document:** the wedged dev server that produced
the 404 **no longer exists on this machine** (MEASURED — nothing answers on `:3000`). Its `.next/dev`
evidence survives and I read it. What that costs the phase is set out in § 1.0 and it changes what
the reproduction gate can honestly close.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

Copied verbatim from `19-CONTEXT.md § Implementation Decisions`. **These are settled. This research
answers HOW, never WHETHER.**

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

### Deferred Ideas (OUT OF SCOPE)

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
- **Moving the three completed todos** out of `.planning/todos/pending/` — flagged in CONTEXT, not
  done, awaiting the PM's confirmation. Not a code change and not this phase's work.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description (from REQUIREMENTS.md) | Research Support |
|----|-------------------------------------|------------------|
| **HSURF-01** | On `/host/listings`, cards in a row **align**, and every action control stays **inside its card** at every width from 320px up. | § 2 gives the exact call-site class edits, verified against `listing-card.tsx` / `ui/card.tsx` / `ui/button.tsx` / `host/listings/page.tsx` at HEAD, plus the tailwind-merge safety argument. § 3 gives the two assertion shapes that can actually go red against the broken state. |
| **HSURF-02** | Creating a listing **lands the host on the edit wizard**, not on a "We couldn't find that page". Opens with a reproduction gate, not a code change. | § 1 is an ordered reproduction protocol with the eleven URLs, the exact commands, per-step pass/fail, the dev-artifact-vs-application-bug discriminator, the production-build env set, and an honest account of which of the three UNPROVEN items can still be closed on this machine. § 5 gives the D-02 reuse predicate; § 6 gives D-03's delivery seam. |
| **CI-01** | The repository's **functional Playwright specs run in CI**, as a **new job** rather than by widening an existing one. | § 4 derives `gate-e2e` from `gate-price-parity`'s parsed skeleton, names the two steps that job does **not** have and this one needs (`db:seed`), proves `scripts/verify-workflows.mjs` needs no change to accept a fifth job, and gives two complementary shapes for D-14's fail-closed `RESEND_API_KEY` assertion. |

</phase_requirements>

## Summary

Three independent pieces of work with almost no shared machinery, which is why the phase is cheap.
Two of the three are already fully characterised by prior measurement and need execution, not
investigation. The third — the 404 — is the one that has genuinely moved since the milestone research
was written, and it moved in a way that shrinks what the phase can claim.

**HSURF-01 is a four-class edit at one call site.** MEASURED at HEAD: `Card` is `flex flex-col`
(`ui/card.tsx:15`) with `gap-0 pt-0` at the call site (`listing-card.tsx:352`); no child declares
`flex-1`; `CardFooter` (`listing-card.tsx:434`) adds only `gap-2` over a base of
`flex items-center rounded-b-xl border-t bg-muted/50 p-4` (`ui/card.tsx:87`); the grid wrapper
(`host/listings/page.tsx:180`) emits `grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3` and no
`align-items`. So `h-full` really is a no-op (D-05 confirmed) and the fix is `mt-auto` on
`CardFooter` **plus** `flex-wrap` on `CardFooter` **plus** the icon-only Delete. All three are
appended class strings on the `className` prop, which `cn()` places LAST — so D-06's hoisting hazard
is structurally absent from these three edits, and I say why in § 2.4 rather than asserting it.

**CI-01 is a copy of `gate-price-parity` with three deltas.** MEASURED: `verify-workflows.mjs`'s `ci`
section is written as a set of *total functions over every job* — there is no job-count assertion and
no job allow-list, so a correctly-shaped fifth job needs **zero changes to the checker**. The three
deltas from job 3 are: the run command becomes `npx playwright test --project=chromium` (37 specs,
counted); a `npm run db:seed` step must be added because **five specs fail against an empty
catalogue** (MEASURED — they say so in their own failure messages); and a `timeout-minutes` is needed
because the wall-clock is unmeasured by construction (D-13).

**HSURF-02 has lost its subject.** MEASURED today: nothing answers on `:3000` — the wedged dev server
is gone. Its `.next/dev` evidence survives and I read it, and reading it **reframes UNPROVEN item
(c)**: the stale manifest is not a manifest something *removed an entry from*; it looks like the
incremental compile ledger of a dev session that started at 18:09 and never compiled that route,
while the compiled `edit/page.js` on disk is a **leftover from an earlier session** (mtime 15:18,
i.e. 2h51m *before* that session started). The detail matters because "what removed the entry" may
be the wrong question. § 1 states exactly what each probe can and cannot now close.

**Primary recommendation:** run the phase in the order `CI-01 → HSURF-01 → HSURF-02`, ship the two
HSURF-01 call-site classes plus the icon-only Delete and their two guards, treat the 404 as a
diagnosis whose most likely honest outcome is **"not reproducible; guard + written finding, cause
recorded OPEN"**, and do not let that outcome be dressed up as a fix.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Card row alignment + footer control fit | Browser / Client (CSS) | — | Pure layout. No server input; the classes are static strings emitted by an RSC-rendered client component. Nothing about it is a data question. |
| Accessible name for the icon-only Delete | Browser / Client (DOM) | — | The name is DOM text (`sr-only`), read by the a11y tree. No server involvement. |
| The two HSURF-01 guards | Test tier (Playwright, `chromium` project) | — | Geometry is only observable in a real engine; jsdom has no layout. This is why they are e2e specs and not `tests/design/`. |
| Draft-reuse idempotency (D-02) | API / Backend (server action) | Database | `createDraftListing` is a `"use server"` action; the predicate is a `SELECT` on the owner's own rows. Putting any part of it in the page would make it bypassable — `new/page.tsx`'s own header already argues this about the verification gate. |
| The failure sentence (D-03) | Frontend Server (RSC) | Browser / Client | The bounce is a server `redirect()`. The sentence therefore has to survive a redirect, which makes it a `searchParams` read on the destination RSC — not client state, which the redirect destroys. |
| Route reachability guard (D-11) | Test tier | — | The subject is the running server's router, so only something that issues a real request can see it. |
| `gate-e2e` | CI / Infrastructure | Database (service container) | A workflow job. Nothing in `src/` changes. |
| `RESEND_API_KEY` fail-closed (D-14) | CI / Infrastructure | Test tier (design gate) | Best held in two places: a runtime step in the job, and a parse-based invariant in `verify-workflows.mjs` that runs on job 1 and catches it two minutes earlier. |

## Project Constraints (from CLAUDE.md)

Extracted from `C:/Users/Admin/Roaming/FitOut/CLAUDE.md` and `C:/Users/Admin/CLAUDE.md`. These bind
the planner with the same authority as CONTEXT.md's locked decisions.

| Constraint | Source | Consequence for this phase |
|---|---|---|
| Work goes through a GSD command; no direct repo edits outside a GSD workflow | user CLAUDE.md § GSD Workflow Enforcement | D-10's "route the diagnosis through `/gsd-debug`" is the project rule, not a preference. |
| **PostgreSQL 18 + Drizzle; no ORM swap** | project CLAUDE.md § Core Technologies | D-02's predicate is a Drizzle `select` with `and(...)`, in `src/app/actions/listing.ts`, beside the existing `assertOwnership`. |
| **Store all times as `timestamptz` (UTC)**; timezone bugs are a top pitfall | project CLAUDE.md § Supporting Libraries | D-01's delete window (`10:51:56Z–10:52:39Z`) is UTC and must be spelled UTC in the SQL. The rows' `created_at` is `timestamp with time zone` (`schema.ts:263`). Do not translate the window to local time. |
| **Never trust the client for price/time; re-validate on the server** | project CLAUDE.md § Supporting Libraries | D-02's reuse read is owner-scoped from the session, never from a parameter — the same rule `createDraftListing`'s own docblock already states. |
| **`deriveBookable` / the sell gate is server authority** | project CLAUDE.md § Double-Booking Prevention; CONTEXT § Established Patterns | Off limits this phase. Nothing in §§ 1–6 touches it. |
| **Application-level "check then insert" is forbidden as a booking pattern** | project CLAUDE.md § What NOT to Use | ⚠ Read § 5.4: D-02's reuse predicate *is* a check-then-act, and the reason it is acceptable here — and the reason it must not be described as a race-free guarantee — is set out there. |
| **Zero hand-rolled calendar/date-picker; use shipped primitives** | project CLAUDE.md § What NOT to Use | Not engaged. |
| Vendored `ui/*` is upstream and is not forked (D-129) | project CLAUDE.md § Conventions is empty, but D-04/D-129 carry it | § 2 puts every class on the call site. `ui/card.tsx` and `ui/button.tsx` are **read, never edited**. |

**Two invariants the milestone adds on top, restated because a proposal of either is a scope alarm:**

- **Zero new runtime dependencies.** Verified: every ingredient § 2–§ 6 needs already exists in the
  tree — `lucide-react` (already imported at `listing-card.tsx:38`), `sr-only` (a Tailwind utility in
  use at 20+ call sites), `postgres`/`drizzle-orm`, `@playwright/test`, and `npm run db:seed`.
- **Zero schema migrations.** Verified: D-02 reads columns that already exist on `listing`
  (`schema.ts:199-287`); D-03 adds a `searchParams` read, not a column; D-01 is a `DELETE`, not a DDL.

---

# § 1 — HSURF-02: the reproduction protocol

This is the phase's opening gate (D-09) and the plan hangs on it. Everything below is ordered.
**Nothing in `src/app/(host)/host/listings/[id]/` is edited at any step.** D-10 is absolute.

## 1.0 — What changed since `PITFALLS.md` was written, and what it costs

**MEASURED, 2026-09-04, on this machine:**

| Probe | Command | Result |
|---|---|---|
| Is the failing dev server still up? | `curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:3000/` | `000` — **connection refused. Nothing is listening on :3000.** |
| Does the stale dev manifest survive? | `cat .next/dev/server/app-paths-manifest.json` | **Yes.** 16 entries, mtime `Sep 3 19:33`. `grep -c "listings/\[id\]/edit"` → **0**; `…/availability` → **0**. |
| Does the compiled edit artifact survive? | `ls -la ".next/dev/server/app/(host)/host/listings/[id]/edit/page.js"` | **Yes** — 6496 bytes, mtime `Sep 3 15:18`. |
| Does the compiled availability artifact survive? | same for `…/availability/page.js` | **No such file or directory.** |
| Is the production manifest still complete? | `grep -c 'listings/\[id\]/edit' .next/app-path-routes-manifest.json` | **1**, mtime `Sep 3 15:57`. |
| Dev-session marker mtimes | `ls -la .next/dev/` | `package.json`, `prerender-manifest.json`, `routes-manifest.json`, `types/` all `Sep 3 18:09`; `server/`, `build-manifest.json`, `trace` all `Sep 3 19:33`. |
| Is the database up and are the four rows still there? | `docker ps` + `psql` | `fitout-db-1` (`postgis/postgis:18-3.6`) up 16h; **all four orphan drafts present, `deleted_at IS NULL`.** |

**Three consequences the plan must absorb:**

1. **UNPROVEN (a) — "that `rm -rf .next` + restart makes it go away" — can no longer be closed as
   stated.** The process that exhibited the 404 is gone. A clean restart that serves 200 proves that
   *the current tree serves the route*; it does **not** prove that clearing `.next` is what fixed the
   old server, because the old server was also removed. **The honest disposition is: record (a) as
   permanently OPEN with the reason, and do not write a docblock that says clearing `.next` fixed
   it.** This is exactly D-11's "record them as open" branch and the project's own
   confident-wrong-claim rule.

2. **UNPROVEN (c) — "what removed the manifest entry" — is reframed by the mtimes, and the reframing
   is a new finding.** The compiled `edit/page.js` is dated **15:18**. Every `.next/dev` session
   marker (`package.json`, `routes-manifest.json`, `types/`) is dated **18:09**. The manifest itself
   was last written at **19:33**. So the artifact on disk is **2h51m older than the dev session that
   was running when the 404 was measured**, and the manifest that omits it is **4h15m younger than
   the artifact**. DERIVED: `.next/dev/server/app-paths-manifest.json` behaves as an **incremental,
   on-demand compile ledger of the current session** — every one of its 16 entries is a route a
   normal browsing session would have visited — and `edit/page.js` is a **leftover from a
   pre-18:09 session**, not a route this session compiled and then lost. **"What removed the entry"
   may therefore be the wrong question; nothing necessarily removed it — this session may simply
   never have added it.** That does not explain the 404 (an uncompiled route in `next dev` is
   normally compiled on demand at request time), which is precisely why it must be recorded as a
   reframing of the open question and **not** as an answer. ⚠ **UNPROVEN:** that Next 16's dev
   manifest is incremental-per-session. It is inferred from the mtimes and the entry set on this one
   machine. Do not put it in a docblock as fact.

3. **The evidence is the only subject left, so preserve it before D-09's first command destroys it.**
   `rm -rf .next` deletes every row of the table above. **Archive first** — this is not a change to
   D-09's order, it is a read that happens before it:

   ```bash
   mkdir -p .planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence
   cp .next/dev/server/app-paths-manifest.json \
      .planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/app-paths-manifest.19-33.json
   cp .next/app-path-routes-manifest.json \
      .planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/app-path-routes-manifest.prod.json
   ls -la --time-style=full-iso -R .next/dev/server/app/'(host)'/host/listings \
      > .planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/dev-artifact-mtimes.txt
   ls -la --time-style=full-iso .next/dev \
      >> .planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/dev-artifact-mtimes.txt
   ```

   ⚠ **A pre-clear probe pass is the last chance to observe the failure live, and it is now
   worthless anyway** — the failing *process* is gone, and a fresh `next dev` against the surviving
   `.next` is a different process. So there is nothing to trade off: archive, then follow D-09's
   order exactly.

## 1.1 — The probe set: eleven URLs, not ten

⚠ `PITFALLS.md § B5` calls this "the ten measured URLs" and then lists **eleven**. The count in the
prose is wrong; the list is right. Both `ROADMAP.md` and `19-CONTEXT.md` inherit the "ten". **Use all
eleven and say so in the summary**, so the next reader is not hunting for a twelfth.

**Every probe is ANONYMOUS — no cookie.** That is what makes the set decisive: `EditListingPage`
`redirect()`s to `/login` at `src/app/(host)/host/listings/[id]/edit/page.tsx:30-33`, **before** the
`db.select()` at `:43` and long before the `notFound()` at `:49-51`. An anonymous caller that reaches
that module **can only produce a 307**. A 404 therefore proves the module never ran. Verified at HEAD
this session: lines 30-33 are `const session = await auth.api.getSession(...)` / `if (!session?.user)
{ redirect("/login") }`, and the `notFound()` at `:49-51` sits behind the `db.select()` at `:43-46`.

```bash
# Run from the repo root, with a dev server (or prod server) already listening on :3000.
D=e6ca32d0-41c1-4fbf-9cee-79402b962c51   # a real orphan draft uuid, MEASURED present today
for U in \
  /host/listings \
  /host/listings/new \
  "/host/listings/$D/edit" \
  "/host/listings/$D/availability" \
  /host/listings/zzz/edit \
  /host/listings/uat_listing_bookable/edit \
  /host \
  /bookings/abc \
  /listings/uat_listing_bookable \
  /invite/abc \
  /ops ; do
  printf '%-52s %s -> %s\n' "$U" \
    "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:3000$U")" \
    "$(curl -s -o /dev/null -w '%{redirect_url}' "http://localhost:3000$U")"
done
```

**MEASURED prerequisites for the probe set, checked today:** `uat_listing_bookable` exists
(`published` / `approved`) and `seed_listing_1..5` exist, so probes 6 and 9 have real subjects; the
four orphan draft uuids are `e6ca32d0-41c1-4fbf-9cee-79402b962c51`,
`485e4843-8b5c-4059-aec0-43b30971e40c`, `3b22e548-762b-484e-a828-5d0b52b4904f`,
`3e224ec0-f015-4d18-a58b-ad08ce165d18`.

### The expected matrix — what a PASS and a FAIL look like, per URL

| # | URL | Recorded 2026-09-03 (broken) | **PASS = healthy** | **FAIL = the defect reproduced** |
|---|---|---|---|---|
| 1 | `/host/listings` | `307 → /login` | `307 → /login` | anything else |
| 2 | `/host/listings/new` | `307 → /login` | `307 → /login` | anything else |
| 3 | `/host/listings/{draft-uuid}/edit` | **404** | **`307 → /login`** | **`404`** ← the subject |
| 4 | `/host/listings/{draft-uuid}/availability` | **404** | **`307 → /login`** | **`404`** ← the subject |
| 5 | `/host/listings/zzz/edit` | **404** | **`307 → /login`** | `404` (see note) |
| 6 | `/host/listings/uat_listing_bookable/edit` | **404** | **`307 → /login`** | `404` |
| 7 | `/host` | `307 → /login` | `307 → /login` | anything else |
| 8 | `/bookings/abc` | `307 → /login` | `307 → /login` | anything else — this is the control that a *different* dynamic segment routes fine |
| 9 | `/listings/uat_listing_bookable` | `200` | `200` | anything else — control: a public dynamic segment |
| 10 | `/invite/abc` | `200` | `200` | anything else — control: a second public dynamic segment |
| 11 | `/ops` | `404` | **`404`** | **a 200, a 307, or any body that differs from the root not-found** — see the ⚠ below |

⚠ **Row 5 is the sharpest discriminator in the set and it is easy to misread.** `zzz` is not a uuid,
but `listing.id` is `text` (`schema.ts:202`), so the segment matcher accepts it and the module runs:
anonymous ⇒ `/login` at `:30-33`. A `404` on row 5 alongside a `307` on rows 1/2/7 is the signature
of a **routing-layer** failure scoped to the `[id]` segment. A `404` on row 5 **with `307`s on rows
3, 4 and 6** would be something else entirely and would need re-diagnosis.

⚠ **Row 11 must stay 404 and must stay byte-identical.** D-219's cloak was measured at 18-14 with
sha256 body equality. This phase must not disturb it; it is in the probe set as a regression control,
not as a subject. If it moves, stop and escalate — that is a Phase-20 concern arriving early.

### Telling a dev-server artifact from an application bug — the decision rule

The whole point of the anonymous probe is that **one bit** separates the two:

- **`307 → /login`** on rows 3/4/5/6 ⇒ the page module ran. Any subsequent 404 the *host* sees is
  then an application question — and it would be the IDOR guard at `:49-51`, which D-10 forbids
  patching, so the correct next step would be `/gsd-debug`, not an edit.
- **`404`** on rows 3/4/5/6 ⇒ **no FitOut code ran.** The body is `src/app/not-found.tsx`'s root
  not-found, which is byte-identical to what `notFound()` renders — that collision is the whole
  reason this looked like an application bug. This is a routing-layer failure.

**The confirming second observation, which the 2026-09-03 pass already has and every future pass
must repeat:** for each URL that 404s, check whether the route is in the running server's manifest
and whether its artifact exists.

```bash
# Dev server:
grep -c 'listings/\[id\]/edit'          .next/dev/server/app-paths-manifest.json   # 0 = absent
grep -c 'listings/\[id\]/availability'  .next/dev/server/app-paths-manifest.json
ls -la --time-style=full-iso ".next/dev/server/app/(host)/host/listings/[id]/edit/page.js"
# Production server:
grep -c 'listings/\[id\]/edit'          .next/app-path-routes-manifest.json        # 1 = present
```

**A 404 with the route ABSENT from the running server's manifest ⇒ dev-server / routing artifact.**
**A 404 with the route PRESENT in the manifest ⇒ the request reached the app, and the diagnosis moves
to `/gsd-debug` under D-10 — it is still not a licence to touch `:49`.**

## 1.2 — The ordered protocol

**Step 0 — archive the evidence.** § 1.0 item 3. Non-negotiable; `rm -rf .next` destroys it.

**Step 1 — record the DB state, before D-01 deletes anything.** The four rows' full contents go into
the plan summary (D-01 requires it). The MEASURED per-row emptiness check is in § 5.1 and it is
already done once here — re-run it at execution time, because it is a per-row verification, not a
window query (D-01's own warning).

**Step 2 — confirm nothing holds :3000.** `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/`
must return `000`. ⚠ If a server IS running, kill it before touching `.next`: `playwright.config.ts`
sets `reuseExistingServer: false` unconditionally (verified at HEAD), so a stray server is a
guaranteed later failure too.

**Step 3 — D-09's clear.** `rm -rf .next` (the whole thing, not just `.next/dev`, because the
production manifest lives at `.next/app-path-routes-manifest.json` and the *production* half of this
protocol is going to rebuild it anyway).

**Step 4 — `npm run dev`, wait for ready, then run the eleven-URL probe.** Record the full matrix.
Then re-run the manifest/artifact check for rows 3 and 4.
- **All-`307` on 3/4/5/6 ⇒ NOT REPRODUCED under a clean dev server.**
- **Any `404` on 3/4/5/6 ⇒ REPRODUCED. Stop, capture, and hand to `/gsd-debug`** (D-10). Do not
  proceed to the production probe first; a live reproduction is the scarcest thing in this phase.

**Step 5 — the production probe.** ⚠ Kill the dev server **first**: `next build` and `next dev` share
`.next`, and a build racing a dev server is one of the four named candidates for (c). Then:

```bash
npm run build
PLATFORM_WALLET_NUMBER=dev-wallet-not-a-real-account \
PLATFORM_WALLET_NAME="FitOut Dev Platform" \
npm start
```

**The env argument, MEASURED at `src/lib/paymongo.ts:25-47`:** `next start` sets
`NODE_ENV=production`, which arms every module-scope fail-closed boot guard. The `PLATFORM_WALLET_*`
guard at `:39-47` is exempted only for `NEXT_PHASE === "phase-production-build"` — true during
`next build`, **false at `next start`** — so it fires at runtime and 500s the first route that
imports `src/lib/paymongo.ts`. That is the memory-recorded gotcha and D-09's ⚠, and it is confirmed
by reading the file.

⚠ **Three further guards can fire at `next start` and the plan should be ready for them, not
surprised by them.** `ci.yml`'s build step enumerates five module-scope boot guards
(`.github/workflows/ci.yml:626-636`, MEASURED): `BETTER_AUTH_SECRET` (`src/lib/auth.ts:43`, **not**
`NEXT_PHASE`-exempt), `PAYMONGO_SECRET_KEY` (`src/lib/paymongo.ts:27`, **not** exempt),
`PAYMONGO_WEBHOOK_SECRET` (`src/app/api/paymongo/webhook/route.ts:36`, **not** exempt),
`INNGEST_SIGNING_KEY` (exempt), `PLATFORM_WALLET_*` (exempt at build, fires at start). On this
machine `.env.local` supplies 16 keys and Next loads `.env.local` in production too, which is why the
recorded symptom was only about the wallet pair. **If `npm start` 500s on a different name, add that
name inline with a visibly-fake self-describing value and record which ones were needed** — that list
is itself a useful finding and belongs in the summary. Do not weaken a guard to make the probe run
(the `ci.yml` comment makes the same argument at length: making a red check green by softening a
security control is the worst trade available).

**Step 6 — re-run the eleven-URL probe against `:3000` in production mode**, plus:

```bash
grep -c 'listings/\[id\]/edit' .next/app-path-routes-manifest.json    # expect 1
```

**Step 7 — the verdict, and it is one of exactly three.**

| Outcome | What it means | What the phase does |
|---|---|---|
| **A. Not reproduced in dev, not reproduced in prod** | The most likely outcome, and the one the surviving evidence points at. | **NO application file changes** for HSURF-02 beyond D-02/D-03, which stand on their own merits (D-09). Ship D-11's guard + the written finding. Record (a) as permanently open per § 1.0, (b) as **CLOSED: does not reproduce under a clean production build**, (c) as **OPEN, reframed** per § 1.0 item 2. |
| **B. Reproduced in dev, not in prod** | A live dev-server artifact, now reproducible. | Hand to `/gsd-debug`. This is the branch that could still close (a) and (c) properly — capture `next dev`'s stdout, the manifest before and after the request, and whether the artifact mtime changes on request. **Still no edit to `edit/page.tsx`.** |
| **C. Reproduced under `next build && next start`** | An application/routing bug that ships. | Escalate to the PM. This is out of the shape D-09 planned for, and it is the only branch where a source change under `(host)/host/listings/[id]/` is even on the table — and even then, not at `:49` (D-10). |

## 1.3 — What evidence closes each UNPROVEN item, and what gets written if it cannot

| # | Item | Evidence that CLOSES it | If it cannot be closed |
|---|---|---|---|
| (a) | `rm -rf .next` + restart makes it go away | **Only outcome B**: the 404 observed on a running server, then the same server killed, `.next` cleared, restarted, and the same URL returning 307. Requires the failure to be live. | **This is the expected case.** Write: *"Not closeable. The dev server that exhibited the 404 was already gone when the phase opened (measured 2026-09-04: nothing on :3000). A clean restart serving 307 shows the current tree routes correctly; it is not evidence about the old process."* Then stop. |
| (b) | Whether it reproduces under `next build && next start` | Step 6's matrix, either way. **This item is closeable today** and the phase should close it. | n/a — nothing prevents running it. If `npm start` cannot be made to boot, record which guard blocked it and treat the item as blocked-on-environment, not as answered. |
| (c) | What removed the manifest entry | Discriminating between the four candidates needs a live failure plus `next dev`'s own stdout for a swallowed compile error, plus the artifact mtime before/after the request. **Only outcome B.** | Write the reframing from § 1.0 item 2 with its mtimes, and record: *"Candidates not discriminated: swallowed compile error, HMR write race, `next build` racing `next dev` on the shared `.next`, Turbopack bug. A fifth possibility is now on the list and was not before: nothing removed the entry — the 18:09 session may never have added it, and the compiled artifact on disk predates that session by 2h51m."* ⚠ **Do not name one.** |

## 1.4 — D-11's guard: what already exists, and what is still missing

**MEASURED — the repository already has a spec that goes red if `/host/listings/new` stops landing on
the wizard, and nobody knows it does.** `e2e/axe-sweep.spec.ts:311-315`:

```ts
async function mintDraftListing(page: Page): Promise<string | null> {
  await page.goto(`${BASE}/host/listings/new`);
  await page.waitForURL(/\/host\/listings\/[^/]+\/edit/, { timeout: 60_000 });
  return new URL(page.url()).pathname.split("/")[3] ?? null;
}
```

It is called in `beforeAll` (`:1102`), and nine host rows resolve their path from its result. If the
redirect stops landing, either `waitForURL` throws in `beforeAll` (whole file red) or
`draftListingId` is `null` and each of the nine rows fails at `expect(path).toBeTruthy()` (`:1163`).

**So the coverage exists but the DIAGNOSIS does not.** That failure message reads *"this row resolves
its path from the running app, and the app produced none… seed the local database"* — it names a
fixture problem, not a route problem, and it costs 60 seconds to arrive. **That is exactly the
"re-diagnosed from scratch twice" cost D-11 is about.** So D-11's guard is worth writing, and its
whole value is in the failure sentence, not the coverage.

**Recommended shape (Claude's discretion under CONTEXT):** a small Playwright spec, because the
subject is the running server's router and only a real request can see it.

```ts
// e2e/host-route-reachability.spec.ts  (name is the planner's)
// D-11 — A HOST-FACING ROUTE THAT STOPS RESOLVING MUST SAY SO IN ONE SENTENCE.
// This costs ~2s and it is the instrument that did not exist when a phantom 404 on
// /host/listings/[id]/edit was re-diagnosed from scratch. It asserts ROUTING, not authorization:
// every request below is ANONYMOUS, and an anonymous caller that reaches EditListingPage can only
// produce a 307 (src/app/(host)/host/listings/[id]/edit/page.tsx:30-33 redirects to /login BEFORE
// the db.select() at :43 and long before the notFound() at :49). A 404 here therefore means the
// page module never ran — no FitOut code executed — which is a routing-layer failure and never an
// IDOR refusal. ⚠ DO NOT "fix" a red here by softening that notFound(): it is a shipped ownership
// check (D-10), and the 404 it renders is BYTE-IDENTICAL to the root not-found, which is the exact
// collision that made this look like an application bug the first time.
const ROUTES = [
  { path: "/host/listings",                         expect: 307 },
  { path: "/host/listings/new",                     expect: 307 },
  { path: "/host/listings/route-reachability/edit", expect: 307 },
  { path: "/host/listings/route-reachability/availability", expect: 307 },
];
for (const r of ROUTES) {
  test(`${r.path} resolves to its module (anonymous ⇒ ${r.expect})`, async ({ request }) => {
    const res = await request.get(r.path, { maxRedirects: 0 });
    expect(
      res.status(),
      `${r.path} answered ${res.status()}. Expected ${r.expect}.\n` +
        `A 404 here does NOT mean the listing is missing and does NOT mean the ownership check ` +
        `refused: this request carries no cookie, so the page redirects to /login before it reads ` +
        `the database. A 404 means the ROUTER never reached the module. Check the running server's ` +
        `manifest before reading this as an application bug:\n` +
        `  grep -c 'listings/\\[id\\]/edit' .next/dev/server/app-paths-manifest.json   # 0 = absent\n` +
        `  grep -c 'listings/\\[id\\]/edit' .next/app-path-routes-manifest.json        # prod\n` +
        `Absent from the running server's manifest ⇒ dev-server routing artifact, ` +
        `not an application defect. See 19-RESEARCH § 1.`,
    ).toBe(r.expect);
  });
}
```

Four notes the planner needs:

1. **`maxRedirects: 0` is load-bearing.** Playwright's `request` follows redirects by default; a
   followed 307 reports `200` from `/login` and the assertion becomes vacuous. **Watch it go red** by
   deleting the option — it should report `200`, not `307`.
2. **The id segment is a literal, not a seeded row.** `listing.id` is `text` (`schema.ts:202`), so an
   arbitrary string routes; and because the request is anonymous the module never reaches the
   database. **This spec needs no fixture, no seed and no database.** That is what makes it ~2s.
3. **It joins the `chromium` project automatically** (`playwright.config.ts` `testMatch:
   "e2e/*.spec.ts"`), so it rides `gate-e2e` for free — and it moves D-13's count from 37 to 38. Say
   so in the summary rather than letting the number drift.
4. **It uses `request`, not `page`** — no browser context, no cookies, and no risk of an ambient
   session making the 307 into a 200.

---

# § 2 — HSURF-01: the exact CSS shape, verified at HEAD

## 2.1 — The tree as it actually is, MEASURED this session

Every string below was read out of the file named. Nothing here is remembered.

| What | Where | Exact class string |
|---|---|---|
| Grid wrapper | `src/app/(host)/host/listings/page.tsx:180` | `cn(RESULT_GRID_GAP, "grid sm:grid-cols-2 lg:grid-cols-3")` |
| `RESULT_GRID_GAP` | `src/lib/design/measurements.ts:283` | `"gap-4 sm:gap-6"` |
| Page container | `src/app/(host)/host/listings/page.tsx:127` | `"mx-auto w-full max-w-5xl px-4 py-10"` |
| **Card call site** | `src/components/listing/listing-card.tsx:352` | `<Card className="gap-0 pt-0">` |
| `Card` base | `src/components/ui/card.tsx:15` | `group/card flex flex-col gap-4 overflow-hidden rounded-xl bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10 has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 …` |
| Card children | `listing-card.tsx:353`, `:368`, `:434` | `<AspectRatio ratio={4/3} className="bg-muted">`, `<CardContent className="space-y-1 py-4">`, `<CardFooter className="gap-2">` (the footer is behind `{hasActions && …}` at `:433`) |
| `CardContent` base | `src/components/ui/card.tsx:76` | `px-4 group-data-[size=sm]/card:px-3` |
| `CardFooter` base | `src/components/ui/card.tsx:87` | `flex items-center rounded-b-xl border-t bg-muted/50 p-4 group-data-[size=sm]/card:p-3` |
| Footer children | `listing-card.tsx:436`, `:443`, `:449` | Edit `<Button asChild variant="outline" size="sm">`, Availability same, then `<div className="ml-auto flex gap-2">` holding Unlist (`:451`) and Delete (`:465`) |
| `Button` base | `src/components/ui/button.tsx:74` | `group/button inline-flex shrink-0 items-center justify-center rounded-lg … text-sm font-medium whitespace-nowrap … [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4` |
| `size="sm"` | `src/components/ui/button.tsx:104` | `h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] … [&_svg:not([class*='size-'])]:size-3.5` |
| `size="icon-sm"` | `src/components/ui/button.tsx:118-119` | `size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg` |
| `cn` | `src/lib/utils.ts:41-47` | `extendTailwindMerge({ extend: { theme: { text: [...TYPE_ROLES] } } })` over `clsx` |

**Confirmed: `h-full` is a no-op here (D-05).** `page.tsx:180` emits exactly
`gap-4 sm:gap-6 grid sm:grid-cols-2 lg:grid-cols-3`. There is **no `items-*` and no `align-items`**.
A grid container's `align-items` defaults to `normal`, which behaves as `stretch` for a grid item
whose `height` is `auto`. Every `<Card>` is a direct grid item with auto height. **The card boxes
already stretch.** DERIVED (not opened in a browser this session), and it is the same derivation
`PITFALLS.md` made from the same strings.

**Confirmed: no child of `Card` declares `flex-1` and `CardFooter` declares no `mt-auto`.** Read at
`:353` / `:368` / `:434`. `Card` is `flex flex-col` with call-site `gap-0`, `justify-content` stays at
`flex-start`, so the three children pack to the top and the stretched height lands as blank card
below the footer. The footer carries `border-t bg-muted/50 rounded-b-xl`, which is why the artefact
is a *tinted, top-bordered bar floating mid-card* rather than merely a gap.

**Confirmed: `Card`'s base carries `has-data-[slot=card-footer]:pb-0`.** In the natural-height case
the footer is *deliberately* flush with the card's bottom edge. The defect is exactly that stretching
falsifies the assumption that class encodes.

**Confirmed: the controls are CLIPPED, not spilled.** `overflow-hidden` on `Card`
(`ui/card.tsx:15`), `shrink-0` **and** `whitespace-nowrap` on `Button` (`ui/button.tsx:74`), and no
`flex-wrap` anywhere on `CardFooter` (neither base nor call site). So the row exceeds its content box
and is cut at the card's rounded edge. **An assertion looking for overflow *outside* the card passes
against the broken state.** This is § 3's whole premise.

**The `lg` arithmetic, re-derived from the strings above.** Container `max-w-5xl px-4` → 1024 − 32 =
**992px**; three columns with two `sm:gap-6` (24px) gutters → (992 − 48)/3 ≈ **314.7px** per card;
minus `CardFooter`'s `p-4` (32px) → ≈ **282.7px**; minus three `gap-2` (8px) gaps → ≈ **258.7px** for
four `size="sm"` buttons, two of which carry a `size-3.5` icon plus `gap-1`. DERIVED, tight to
impossible. **UNPROVEN:** the exact width at which the clip begins, and whether it also bites at
`sm:grid-cols-2`. § 3's guard settles both by measuring rather than arguing.

## 2.2 — The fix: three class strings, all at the call site

```diff
--- a/src/components/listing/listing-card.tsx
@@ :434
-        <CardFooter className="gap-2">
+        {/*
+          HSURF-01 / D-05 — `mt-auto` IS THE ALIGNMENT FIX AND `h-full` IS NOT.
+          The grid wrapper (`(host)/host/listings/page.tsx:180`) sets no `align-items`, so these
+          cards ALREADY stretch to the tallest in the row — `h-full` would be a no-op dressed as a
+          fix. What misaligned was the FOOTER BAND: `Card` is `flex flex-col` (`ui/card.tsx:15`)
+          with `gap-0` above and no child declaring `flex-1`, so the children packed to the top and
+          the stretched height landed as blank card BELOW a tinted, top-bordered bar. `mt-auto`
+          absorbs that free space above the footer instead, which restores what
+          `has-data-[slot=card-footer]:pb-0` on `Card`'s base already assumes: the footer is flush
+          with the card's bottom edge.
+
+          HSURF-01 / D-08 second half — `flex-wrap` is a SEPARATE fix for a SEPARATE defect, and
+          fixing either does not fix the other. `Button` carries both `shrink-0` and
+          `whitespace-nowrap` (`ui/button.tsx:74`), so the four controls can neither shrink nor
+          wrap; `Card` carries `overflow-hidden`, so the overrun was CLIPPED at the rounded edge
+          rather than painted outside the card. That is why it read as a truncated control and not
+          as a spill, and why a guard that only looks outside the card passes against the defect.
+
+          ⚠ APPENDED, NEVER PREPENDED (D-06 / WR-04). `cn(base, className)` puts this string LAST,
+          which is the position tailwind-merge keeps. Phase 17 measured a hoisted constant DELETING
+          `pb-20` outright. Do not reorder these tokens to the front of anything.
+        */}
+        <CardFooter className="gap-2 mt-auto flex-wrap">
```

```diff
@@ :465  (the Delete ConfirmDialog trigger)
-                  <Button variant="ghost" size="sm" className="text-destructive">
-                    Delete
-                  </Button>
+                  {/*
+                    D-07 — ICON-ONLY, AND THE ACCESSIBLE NAME SURVIVES AS `sr-only` TEXT.
+                    The label is what made the four-control cluster too wide; dropping it buys the
+                    most space for the least change. `size="icon-sm"` is `size-7`
+                    (`ui/button.tsx:117`) — the SAME 28px height as the `size="sm"` siblings
+                    (`h-7`), so the row's baseline does not move, and 28px clears
+                    `expectTargets`'s 24px bar. ⚠ THE BAR HERE IS 24px, NOT 44px:
+                    `e2e/overflow-320.spec.ts:3146-3150` declares `touch: []` for this cluster in
+                    as many words, arguing that these are `size="sm"` by design and that
+                    "asserting 44 on any of them would be red against reviewed code".
+
+                    ⚠ THE `sr-only` SPAN IS THE NAME. Delete it and
+                    `getByRole("button", { name: "Delete" })` stops resolving — silently, and only
+                    for screen-reader users, because no test locates this control by its text
+                    today (measured: zero matches across `tests/` and `e2e/`). The same shape
+                    `photo-lightbox.tsx:370-373` already ships.
+
+                    ⚠ THE CONFIRM DIALOG IS NOT OPTIONAL. Icon-only is safe from mis-taps BECAUSE
+                    the destructive act stays double-gated behind ConfirmDialog's
+                    `confirmLabel="Delete listing"` / `confirmVariant="destructive"` below.
+                  */}
+                  <Button
+                    variant="ghost"
+                    size="icon-sm"
+                    className="text-destructive"
+                    aria-label="Delete"
+                  >
+                    <Trash2Icon aria-hidden="true" />
+                    <span className="sr-only">Delete</span>
+                  </Button>
```

and the import at `listing-card.tsx:38`:

```diff
-import { PencilIcon, CalendarClock, CheckCircle2, type LucideIcon } from "lucide-react";
+import { PencilIcon, CalendarClock, CheckCircle2, Trash2 as Trash2Icon, type LucideIcon } from "lucide-react";
```

### Which element gets what, stated plainly

| Element | Line | Add | Why this element |
|---|---|---|---|
| `Card` | `:352` | **nothing** | It already stretches. `h-full` is the no-op D-05 forbids. |
| `CardContent` | `:368` | **nothing** (see § 2.3 for the alternative) | Not needed once the footer absorbs the free space, and the lower-risk of the two options is the footer one. |
| **`CardFooter`** | **`:434`** | **`mt-auto`** and **`flex-wrap`**, appended to the existing `gap-2` | `mt-auto` is the only class that moves the free space *above* the footer without changing any child's box sizing. `flex-wrap` goes here because `CardFooter` **is** the flex container that cannot wrap. |
| Delete `Button` | `:465` | `size="icon-sm"`, `aria-label`, `<span className="sr-only">`, icon child; drop the text | D-07. |
| Unlist `Button` | `:451` | **nothing** | D-07: "Only Delete goes icon-only. Unlist keeps its label." |
| `div.ml-auto` | `:449` | **nothing** | `ml-auto` is a red herring: `margin-left: auto` resolves to 0 once free space is negative, so it neither causes nor worsens the overflow. Leave it — it is what right-aligns the destructive pair when there IS free space, and with `flex-wrap` it right-aligns them on their own line when there is not. |

### Both `aria-label` and `sr-only` — deliberate, not belt-and-braces confusion

`aria-label` wins the accessible-name computation, so the `sr-only` span is technically redundant
*for the name*. It is kept because the two shipped precedents differ and the safest thing is to match
both: `photo-lightbox.tsx:370-373` uses the `sr-only` span alone;
`availability-calendar.tsx:780-794` uses `aria-label` **plus** an `sr-only` child and its own docblock
explains why. **If the planner prefers one, drop the `aria-label` and keep the `sr-only` span** —
that is the `photo-lightbox` idiom, it is inside `ConfirmDialog`'s `trigger` (which Radix clones and
may add attributes to), and it survives a future `asChild` change. Either is correct; **shipping
neither is the failure D-07 names.**

## 2.3 — The `flex-1` alternative, and why `mt-auto` is recommended

D-05 permits either. They render identically here, and `mt-auto` is lower-risk:

| | `mt-auto` on `CardFooter` | `flex-1` on `CardContent` |
|---|---|---|
| Mechanism | `margin-top: auto` absorbs the column's free space | `flex: 1 1 0%` makes the content box grow into it |
| Boxes changed | none — only the footer's position | `CardContent`'s **used height** and its `flex-basis` |
| Interaction with `AspectRatio` (`:353`) | none | `AspectRatio` is a sibling flex item with default `flex-shrink: 1`; changing another sibling's basis changes the distribution it participates in |
| Behaviour when `hasActions` is false (no footer) | class is not rendered at all — no effect | the content grows into the space; a *different* rendering from today for that branch |
| Visual result | image → content → whitespace → flush tinted footer | identical |
| Failure mode if wrong | footer stays where it is (visible, obvious) | content box could absorb space in an unexpected distribution (subtle) |

**Recommendation: `mt-auto`.** It touches one property on one element, is inert on the no-footer
branch, and cannot participate in flex-basis distribution. **UNPROVEN:** both are derived from the
class strings, not from a browser. § 3's guard is what turns either into a measurement — and the
guard is written so it fails against the *current* tree, which is how the planner proves the class
did the work.

## 2.4 — Why D-06's hoisting hazard is structurally absent from these edits

This matters, because D-06 is a live constraint and a planner could reasonably over-apply it.

**MEASURED — the mechanism, from `tests/design/clearance-merge-order.test.ts:1-30` and
`src/lib/utils.ts:41-47`:** `cn` is `clsx` + `extendTailwindMerge`, and tailwind-merge resolves a
conflict by **deleting the earlier class**. WR-04's measured case was
`cn(K, P, T)` where `K = "pb-20"` and `P` contained `py-8` — the constant hoisted to the FRONT was
destroyed by the literal after it.

**Why that cannot happen to these three edits:**

1. `Card`, `CardContent` and `CardFooter` all call `cn(<base>, className)` — the call-site string is
   **always the last argument** (`ui/card.tsx:14-18`, `:76`, `:86-91`). A class added to
   `className` is in the winning position by construction.
2. Within the call-site string itself, appending is what D-06 prescribes and what the diff above
   does: `"gap-2"` → `"gap-2 mt-auto flex-wrap"`.
3. **No group conflicts exist.** MEASURED against the base strings: `CardFooter`'s base has no
   `m*`/`mt-*` and no `flex-wrap`/`flex-nowrap`; `Card`'s base has `flex` (display group) and
   `flex-col` (flex-direction group), neither of which is tailwind-merge's `flex-wrap` group.
   `src/lib/utils.ts`'s `extendTailwindMerge` extends **only** `theme.text` (the four DS-02 type
   roles) — it touches no layout group — so tailwind-merge's stock grouping applies unmodified.

**Cheap standing check the planner can put in the plan's verification, no new dependency:** in a
node/vitest scratch, `cn("flex items-center rounded-b-xl border-t bg-muted/50 p-4", "gap-2 mt-auto
flex-wrap")` must contain **all of** `p-4`, `gap-2`, `mt-auto`, `flex-wrap`. If any is missing, stop.

## 2.5 — What cannot regress, and the evidence

- **The search grid is untouched.** `listing-card.tsx:270-279` records that `/` renders
  `SearchResultCard` → `ResultCard` (`search-result-card.tsx:41,248`) and that
  `grep -rn "<ListingCard" src/` returns **one** call site. Verified: the only importer is
  `(host)/host/listings/page.tsx`. A claim that D-04/D-05/D-07 could regress the search grid is
  false.
- **No test locates the Delete control by its text.** MEASURED:
  `grep -rn 'Delete' tests/ e2e/` (excluding `deleted`/`softDelete`/`delete(`) returns **zero**
  matches that are a selector; the only `/host/listings`-related hit is a *comment* at
  `e2e/overflow-320.spec.ts:3148`. `tests/listing/listing-card.test.tsx` contains no
  `Delete`/`Unlist`/`getByRole`. So D-07 breaks nothing **provided** the accessible name survives.
- **`tests/design/card-pattern-coverage.test.ts` will not redden.** Its two `listing-card.tsx`
  entries (`:214`, `:738`) are an allow-list "measured refusal" pair — a *status*, not a class pin.
  Read this session.
- **`tests/design/status-vocab.test.ts:184`** lists `listing-card.tsx` in a scanned file set; adding
  `sr-only` "Delete" text adds no status vocabulary. **UNPROVEN in detail** — I read the file list,
  not every assertion in that file. The planner should run `npm run test:design` after the edit; it
  is a build-blocking suite (`"build": "npm run lint && npm run test:design && next build"`), so it
  cannot be skipped anyway.
- **`e2e/overflow-320.spec.ts`'s `/host/listings` row keeps working.** Its `tell` is
  `a[href^="/host/listings/"][href$="/availability"]` (`:3135-3140`) — the Availability *anchor*,
  which D-07 does not touch. Its `touch: []` declaration and its 24px `expectTargets` scan both stay
  true: `icon-sm` is `size-7` = 28px ≥ 24px.

---

# § 3 — The two HSURF-01 guards, written so they can actually fail

## 3.0 — The trap, restated because it is the whole reason this section is long

`Card` carries **`overflow-hidden`** (`ui/card.tsx:15`) and `Button` carries **`shrink-0`** and
**`whitespace-nowrap`** (`ui/button.tsx:74`). Against the **broken** tree:

- nothing paints outside the card, so **`expectNoOverflow`-style document scans pass**;
- `document.scrollWidth === document.clientWidth` at every width, so **`e2e/overflow-320.spec.ts`
  passes** — and indeed it does today, with a `/host/listings` row in its table;
- the *card boxes* are all the same height (the grid stretches them), so a naive
  "all cards equal `offsetHeight`" assertion **also passes against the broken tree**.

**All three of the obvious assertions are already green on the defect.** That is what D-08 means by
"two guards, not one" and it is why each assertion below names the element it measures.

## 3.1 — Guard A: equal card height **with the footer flush to the card bottom**

The first clause is already true and is kept as a *vacuity check* on the measurement; the second
clause is the one that goes red today.

```ts
type CardGeom = {
  cardTop: number; cardBottom: number; cardHeight: number;
  footerTop: number; footerBottom: number; footerHeight: number;
};

const geom: CardGeom[] = await page.$$eval('[data-slot="card"]', (cards) =>
  cards.map((card) => {
    const footer = card.querySelector('[data-slot="card-footer"]');
    if (!footer) throw new Error("a listing card rendered no [data-slot=card-footer]");
    const c = card.getBoundingClientRect();
    const f = footer.getBoundingClientRect();
    return {
      cardTop: c.top, cardBottom: c.bottom, cardHeight: c.height,
      footerTop: f.top, footerBottom: f.bottom, footerHeight: f.height,
    };
  }),
);

// VACUITY FIRST. An empty grid satisfies every assertion below.
expect(geom.length, `${where}: no listing cards rendered — seed a host with ≥2 listings`)
  .toBeGreaterThanOrEqual(2);

// CLAUSE 1 — the cards in a row end at the same bottom edge.
// (Already true today because the grid stretches them; kept because it is half of the
//  success criterion's sentence and because it goes red if anyone ever adds `items-start`.)
const row = geom.filter((g) => Math.abs(g.cardTop - geom[0].cardTop) <= 1); // same visual row
expect(row.length, `${where}: expected ≥2 cards on the first row`).toBeGreaterThanOrEqual(2);
const bottoms = row.map((g) => Math.round(g.cardBottom));
expect(new Set(bottoms).size, `${where}: cards in one row end at different bottoms: ${bottoms}`)
  .toBe(1);

// CLAUSE 2 — THE ONE THAT IS RED TODAY. The footer must be FLUSH with the card's bottom edge.
// `Card`'s base carries `has-data-[slot=card-footer]:pb-0` (ui/card.tsx:15) — zero is the
// designed gap, so this is not a tolerance somebody chose, it is the class asserted.
for (const [i, g] of row.entries()) {
  const gapBelowFooter = g.cardBottom - g.footerBottom;
  expect(
    gapBelowFooter,
    `${where}: card ${i} leaves ${gapBelowFooter.toFixed(1)}px of dead card BELOW its footer. ` +
      "The footer band is floating mid-card. Card is 'flex flex-col' with 'gap-0' at the call " +
      "site and needs 'mt-auto' on CardFooter (or 'flex-1' on the growing child) — NOT 'h-full' " +
      "on Card, which is a no-op because the grid already stretches these items. See D-05.",
  ).toBeLessThanOrEqual(1);
}
```

**Why `getBoundingClientRect` and not `offsetHeight`.** D-08 says `offsetHeight`, and `offsetHeight`
is fine for clause 1 — but clause 2 needs *positions*, and `offsetTop` is relative to the offset
parent, which for a `position: static` card inside a grid is **not the card**. `getBoundingClientRect`
gives viewport coordinates for both boxes and the subtraction is unambiguous. `Math.round`/`≤1px`
absorbs sub-pixel layout; do not widen it further — the designed gap is exactly zero.

**Why `cardTop` grouping.** At `lg:grid-cols-3` a host with 4+ listings has two rows; comparing
bottoms across rows would be red on a correct tree. Grouping by `cardTop` within 1px is the cheap
correct filter. At 320px there is one column, so `row.length` is 1 — **which is why clause 1 must be
skipped at 320px, or the fixture must guarantee ≥2 cards per row at the band being measured.** See
§ 3.3.

## 3.2 — Guard B: `scrollWidth == clientWidth` on `[data-slot="card-footer"]`

```ts
const footers = await page.$$eval('[data-slot="card-footer"]', (els) =>
  els.map((el, i) => ({
    i,
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
    // The named offender, so a red says WHICH control is clipped rather than that a number moved.
    offenders: Array.from(el.children)
      .filter((c) => c.getBoundingClientRect().right > el.getBoundingClientRect().right + 0.5)
      .map((c) => `${c.tagName.toLowerCase()}.${(c.className || "").toString().slice(0, 40)}`),
  })),
);

expect(footers.length, `${where}: no [data-slot="card-footer"] rendered — the host has no listings, ` +
  `or hasActions was false for every card`).toBeGreaterThanOrEqual(1);

for (const f of footers) {
  expect(
    f.scrollWidth,
    `${where}: card ${f.i}'s footer overflows its own content box — scrollWidth ${f.scrollWidth} ` +
      "against clientWidth " + f.clientWidth + ". THE CONTROLS ARE CLIPPED, NOT SPILLED: Card " +
      "carries 'overflow-hidden' (ui/card.tsx:15) and Button carries 'shrink-0' + " +
      "'whitespace-nowrap' (ui/button.tsx:74), so the overrun is cut at the card's rounded edge " +
      "and a document-level overflow scan reports GREEN. Offenders: " +
      JSON.stringify(f.offenders) +
      ". The fix is 'flex-wrap' on CardFooter at the call site (D-05/D-08), never a width on Button.",
  ).toBeLessThanOrEqual(f.clientWidth);
}
```

**Three properties that make this the right assertion:**

1. **It measures the footer's own content box**, so `overflow-hidden` on the ancestor is irrelevant —
   `scrollWidth` on the *overflowing element itself* still reports the overrun. This is the single
   thing that distinguishes it from every scan already in the suite.
2. **`==` not `>`.** D-08 spells it as `scrollWidth == clientWidth`; `toBeLessThanOrEqual` is the same
   claim written so the failure message can print both numbers. Do not add a tolerance: with
   `p-4` padding and integer button widths there is no sub-pixel case here.
3. **The `offenders` list.** `PITFALLS.md` and `overflow-320.spec.ts` both record that a diagnostic
   naming *which* element overflowed is what stops a red being retried instead of read.

⚠ **`el.children` is the right granularity.** `CardFooter`'s flex children are three: Edit,
Availability, and `div.ml-auto`. The clipped control will be inside the third. Listing the three
top-level children is enough to identify it and avoids a deep walk.

## 3.3 — The three bands, and how to reach them

D-08 requires 320px, the `sm` band and the `lg` band. **MEASURED — the breakpoints come from
`page.tsx:180`'s own classes**, `sm:grid-cols-2 lg:grid-cols-3`, i.e. Tailwind v4 defaults
`sm = 640px`, `lg = 1024px`.

| Band | Viewport to set | Columns | Guard A clause 1 | Guard B |
|---|---|---|---|---|
| 320 (floor) | `320 × 800` | 1 | **skip** (one card per row — nothing to compare) or assert `row.length === 1` deliberately | **run** — this is the tightest width and the most likely clip |
| `sm` | `700 × 900` | 2 | **run** — needs ≥2 listings | **run** |
| `lg` | `1280 × 900` | 3 | **run** — needs ≥3 listings for a full row; ≥2 is enough for the assertion | **run** — the `lg` arithmetic in § 2.1 says this is the second-tightest |

⚠ **Pick viewport widths that are unambiguously inside a band, not on its edge.** `640` and `1024`
are the exact breakpoints; a 1px rounding difference at the edge changes the column count and makes
the failure unreadable. `700` and `1280` are safely inside. `1280` also matches what
`host-headings.spec.ts` uses for its wide band.

**Resize, do not re-navigate.** The grid is server-rendered and its content does not depend on the
viewport, so one navigation and three `setViewportSize` reads is correct and ~3× cheaper — the shape
`host-headings.spec.ts` documents in its own header ("28 states cost 28 navigations rather than 84").
⚠ After each resize, `await page.evaluate(() => document.fonts.ready)` before measuring — text
reflow after a font swap changes `CardContent`'s height and therefore clause 2's numbers.

## 3.4 — The fixture: getting a host with ≥3 listings of *different* content heights

**This is the part most likely to be got wrong, and it decides whether the guard can fail at all.**
The misalignment is proportional to how much the cards' `CardContent` heights differ, and
`CardContent` conditionally renders a space-type line (`:377-381`), an hours notice (`:396-405`) and
a review notice (`:418-429`). **Three cards with identical content produce identical heights and the
guard is green on the broken tree.**

**Reusable, already in the tree, no new helper:**

- `e2e/axe-sweep.spec.ts:295-315` — `signUp(page, "host", tag)` → `seedApprovedHostVerification(email)`
  → `mintDraftListing(page)`. Three calls, no `postgres()` client held. Repeat `mintDraftListing`
  N times for N drafts. ⚠ **After D-02 lands, repeating it returns the SAME id** — that is the whole
  point of D-02, and it is a real trap for this fixture. Use `saveListingStep` (or drive the wizard)
  to *touch* each draft before minting the next, or seed directly.
- `e2e/helpers/booker-seed.ts:240` — `seedBookableListing(options)` writes a full listing through a
  short-lived `withClient` connection; `:611` `seedApprovedHostVerification(email)`. Six e2e specs
  already hold a `postgres()` client and `deferred-items.md` warns against a seventh — prefer
  extending `booker-seed.ts` over opening a new client in the new spec.

**Height variation the fixture must produce, cheapest first:** (1) a **draft with no title** renders
"Untitled listing" and no `primarySpaceType` line; (2) a **published listing with no weekly hours**
renders the two-line hours notice (`loadPublishedListingsMissingHours` drives it,
`page.tsx:118-121`); (3) a **long title** wraps to two lines at 320px. Any two of these in one row is
enough.

⚠ **Prove the guard is not vacuous before trusting it.** The project's standing rule (`selector-
contract.test.ts`, `axe.ts`'s `MIN_SCANNED_NODES`, `overflow.ts`'s `MIN_EXAMINED_ELEMENTS`) is that
an absence assertion must be driven red once. **Watch both guards fail against the tree BEFORE the
§ 2 edit lands**, and record the two failure messages verbatim in the plan summary. If Guard A
clause 2 is green before the fix, the fixture is not producing height variation and the guard is
measuring nothing.

## 3.5 — Where the guards live

**A new `e2e/host-listing-grid.spec.ts`** (name is the planner's), not an addition to
`overflow-320.spec.ts`. Three reasons, all from the tree:

1. `overflow-320.spec.ts` is a **single-width** instrument by its own header ("ONE VIEWPORT AND ONE
   HEIGHT. 320 × 800. It does not sweep the ladder"). D-08 needs three bands.
2. Its rows assert *document*-level overflow. Guard B asserts *element*-level overflow. Folding one
   into the other would mean one row whose assertion differs in kind from every other row.
3. Its `/host/listings` row's `touch: []` argument (`:3146-3150`) is reviewed code that must stay
   exactly as it is; a new file cannot disturb it.

**Cost check for the new file:** it joins the `chromium` project automatically (`playwright.config.ts`
`testMatch: "e2e/*.spec.ts"`), takes the spec count from 37 → 38 (39 with § 1.4's reachability spec),
and rides `gate-e2e`. `tests/design/selector-contract.test.ts` gates a **floor** on `getByRole(`/
`getByLabel(` counts in `e2e/` — a new file can only raise them, and `.locator(` is explicitly
**recorded, not gated** (`:20`, `:50-51`), so `$$eval('[data-slot="card-footer"]')` is admissible.
`data-slot` is a vendored-primitive attribute, **not** a `data-testid`, so the undeclared-`data-testid`
ban is not engaged and no new id needs declaring.

---

# § 4 — CI-01: the `gate-e2e` job

## 4.1 — The skeleton, derived from `gate-price-parity` (`ci.yml:766-841`)

MEASURED — job 3 in full: `runs-on: ubuntu-latest`; `container: { image:
mcr.microsoft.com/playwright:v1.60.0-noble, options: --ipc=host }`; `services.postgres` =
`postgis/postgis:18-3.6` with the four `POSTGRES_*` env values and a `pg_isready` health block and
**no `ports:`**; job `env.DATABASE_URL: postgres://fitout:fitout@postgres:5432/fitout`; steps
`actions/checkout@v4` → `actions/setup-node@v4 (node-version: "24", cache: npm)` → `npm ci` →
`npm run db:migrate` → `npx playwright test e2e/price-parity.spec.ts --project=chromium`. **No
`permissions:` block** (inherits the workflow default `contents: read`). **No `npx playwright
install`.** **No `secrets.`**.

```yaml
  # ------------------------------------------------------------------------------------------
  # JOB 5 — THE FUNCTIONAL PLAYWRIGHT SUITE (CI-01 / D-24's remaining half).
  #
  # WHY A FIFTH JOB AND NOT A WIDER JOB 3. This file's own header enumerates the mutation:
  # "job 3's one spec -> the whole suite" is a change the invariant checker is built to notice,
  # and job 3's identity in the D-24 taxonomy is that it is ONE self-contained spec. Widening it
  # destroys that identity and silently re-opens the surface job 3 was scoped to close. A fifth
  # job is the shape the taxonomy already had room for: a database AND a browser, like jobs 3
  # and 4, differing only in WHICH specs it runs.
  #
  # NO `npx playwright install --with-deps`. Playwright's own ci-intro guide recommends it and it
  # is WRONG FOR THIS REPO: the pinned image ships the browsers AND their OS dependencies, and an
  # install step here is documented above as the most common way a container job ends up
  # comparing against a browser nobody pinned. Follow the repo, not the quickstart.
  #
  # WHAT THIS JOB HOLDS: NOTHING. One environment input, DATABASE_URL, pointing at an ephemeral
  # service container. Playwright boots the app with `npm run dev`, and `next dev` does not set
  # NODE_ENV=production, so none of the five module-scope boot guards job 1 documents arms here —
  # which is why job 1's three build placeholders are not repeated. Same argument jobs 3 and 4
  # make. An e2e job is the largest exfiltration surface in this workflow and the reason this one
  # is safe is that it holds nothing.
  # ------------------------------------------------------------------------------------------
  gate-e2e:
    name: gate-e2e (functional Playwright suite)
    runs-on: ubuntu-latest
    # THE FULL SUITE'S CI WALL-CLOCK IS UNMEASURED BY CONSTRUCTION (D-13) — this job is what
    # measures it. The cap is a stop, not an estimate: without one, a suite that wedges holds a
    # runner for six hours. Revise it from the first green run's number, and record that number.
    timeout-minutes: 45

    container:
      image: mcr.microsoft.com/playwright:v1.60.0-noble
      options: --ipc=host

    services:
      postgres:
        image: postgis/postgis:18-3.6
        env:
          POSTGRES_USER: fitout
          POSTGRES_PASSWORD: fitout
          POSTGRES_DB: fitout
        # NO `ports:` — this job runs IN a container, so the service is reached by LABEL.
        options: >-
          --health-cmd "pg_isready -U fitout -d fitout"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 10

    env:
      # THE SERVICE LABEL, NOT localhost. Job runs IN a container -> reach the service by its
      # label with no port mapping. Getting it backwards produces a connection-refused that reads
      # exactly like a flaky service, so it gets retried rather than diagnosed.
      DATABASE_URL: postgres://fitout:fitout@postgres:5432/fitout

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "24"
          cache: npm
      - run: npm ci

      # ⚠ THE FAIL-CLOSED EMAIL ASSERTION, AND IT IS FIRST ON PURPOSE (finding [17-D28]).
      # `instrumentation.ts` takes PayMongo off the wire and DELIBERATELY does not do the same for
      # Resend — its header argues the point: `src/lib/email.ts` binds the client at module load,
      # so for Resend THE KEY IS THE SWITCH, and mocking the origin would also suppress the
      # `[email:dev]` console fallback. A full suite run with a key set was measured at FOURTEEN
      # real POSTs to the mail provider. Nothing in this workflow supplies that key today; this
      # step is what makes that a property instead of a coincidence, and it runs before anything
      # boots so a violation costs seconds rather than a whole suite of real email.
      - name: Refuse to run the suite with a live mail credential in the environment
        run: |
          if [ -n "${MAIL_KEY_UNDER_TEST:-}" ]; then
            echo "::error::A live mail credential is present in this job's environment."
            echo "A full e2e run with it set was measured at 14 real outbound sends per run."
            echo "Remove it from the workflow/repository environment; do NOT weaken this check."
            exit 1
          fi
        env:
          MAIL_KEY_UNDER_TEST: ${{ env.RESEND_API_KEY }}

      # The specs seed and tear down their own rows, but the TABLES have to exist first. Only the
      # dev database `fitout` is needed — this job runs no vitest, so `gate-db`'s `fitout_test`
      # provisioning is deliberately absent.
      - name: Migrate the database
        run: npm run db:migrate

      # ⚠ NOT OPTIONAL, AND JOB 3 DOES NOT NEED IT. FIVE specs in this set fail against an empty
      # catalogue and say so in their own failure messages (axe-sweep, overflow-320,
      # reduced-motion, shell, skeleton-geometry). `scripts/seed.ts` is standalone raw SQL, reads
      # DATABASE_URL, holds no credential and is idempotent (it deletes its `seed_*` rows first).
      - name: Seed the demo catalogue
        run: npm run db:seed

      # THE `chromium` PROJECT BY NAME, NOT `npm run test:e2e`. `test:e2e` is a bare
      # `playwright test`, which on Linux also collects the `visual` project — a wholly different
      # gate that job 4 owns and whose baselines this job must never touch.
      - name: Playwright — the functional suite
        run: npx playwright test --project=chromium
```

## 4.2 — The three deltas from job 3, and why each exists

| Delta | Why | Evidence |
|---|---|---|
| **`npm run db:seed` step added** | Five specs fail against an empty catalogue. | MEASURED — `grep -rn 'db:seed' e2e/`: `axe-sweep.spec.ts:1166`, `overflow-320.spec.ts:941`, `reduced-motion.spec.ts:259`, `shell.spec.ts:1131`, `skeleton-geometry.spec.ts:504` — each a failure message telling the reader to seed. `scripts/seed.ts:1-25` confirms it is standalone, idempotent, `DATABASE_URL`-driven and credential-free. |
| **`timeout-minutes: 45`** | D-13's number does not exist yet; the cap is the stop. | `playwright.config.ts`: `retries: process.env.CI ? 2 : 0`, `fullyParallel: true`, `webServer.timeout: 120_000`, `reuseExistingServer: false`. 37 specs × up to 3 attempts against a Turbopack dev server is unbounded without a cap. **The first green run's wall-clock is the D-13 number to record.** |
| **`--project=chromium`, no spec path** | The whole functional set. | `playwright.config.ts` `projects[0]`: `name: "chromium"`, `testMatch: "e2e/*.spec.ts"`. MEASURED: `ls e2e/*.spec.ts \| wc -l` → **37**. |

**Two things that must NOT be added, with the reason:**

- **No `npx playwright install`** (D-12). `ci.yml:770-774` states the argument and Playwright's own
  docs state the failure ("Playwright will be unable to locate browser executables" on a tag
  mismatch).
- **No `npm run build` / `next build` / `next start`.** `playwright.config.ts`'s `webServer` is
  `npm run dev` and that is load-bearing for **both** network seams: `instrumentation.ts`'s undici
  `MockAgent` is gated on `NODE_ENV !== "production"` as a **build-time constant** (so a production
  build *prunes* it), and `webServer.env`'s `RESEND_API_KEY: ""` only applies to the server
  Playwright itself boots. A job that boots the app any other way silently re-opens both.

## 4.3 — `scripts/verify-workflows.mjs` needs **no** change. Proven by reading it.

**MEASURED — the `ci` section is a set of total functions over `Object.entries(doc.jobs)`.** There is
**no job-count assertion and no job allow-list**: `jobs.length` appears twice
(`:386` in a banner string, `:436` in a failure message) and never in a `check(...)` condition. The
only job *named* is `CI_VISUAL_JOB = "gate-visual"` (`:81`), whose hard-stop is about the visual
comparison job specifically.

**The fifth job must satisfy these existing invariants — all of which the § 4.1 skeleton does:**

| Invariant | Line | `gate-e2e` |
|---|---|---|
| every `uses:` across every job is first-party `actions/*` | `:414-422` | ✓ `actions/checkout@v4`, `actions/setup-node@v4` |
| ZERO run commands carry `--update-snapshots` | `:428-437` | ✓ — and ⚠ **the flag must not be spelled in `ci.yml`, not even in a comment**; the checker names it, the workflow never does |
| zero `secrets.` in any env / run / with **value**, across every job | `:441-451` | ✓ — the D-14 step's `${{ env.RESEND_API_KEY }}` is a **context expression, not a `secrets.` reference**. Verify with `node scripts/verify-workflows.mjs --section=ci` before pushing |
| every containerized job pins the exact installed-Playwright image | `:454-461` | ✓ `mcr.microsoft.com/playwright:v1.60.0-noble` |
| every containerized job carries `--ipc=host` | `:463-468` | ✓ |
| every service image is `postgis/postgis:` with a tag beyond the bare major | `:471-487` | ✓ `postgis/postgis:18-3.6` |
| **addressing rule** — containerized ⇒ host is a service LABEL and that service declares NO `ports:` | `:489-537` | ✓ `postgres://fitout:fitout@postgres:5432/fitout`, no `ports:` |
| the job running `npm run build` declares no `services:` (T-11-DBFREE) | `:552-561` | ✓ — `gate-e2e` runs no `npm run build`, so it is not in that set. **⚠ This is the one that would break if anyone "helpfully" added a build step to this job.** |

**The `cross` section** (`:640-…`) compares `baselines.yml`'s capture job against `ci.yml`'s
`gate-visual` and additionally asserts *"every container image in BOTH files is the same string"* over
**all** containerized jobs in both files (`:664-680`). `gate-e2e` joins that set — which is correct
and desirable, and is satisfied by pinning the same tag.

**Verification command for the plan:** `node scripts/verify-workflows.mjs` (all three sections) must
exit 0, and its `parsed values (ci)` block must print `jobs ["gate-db-free","gate-db",
"gate-price-parity","gate-visual","gate-e2e"]` and `containerized [… ,"gate-e2e"]`. **That printout
is the evidence the fifth job was seen**, and it is why the checker prints what it checked.

## 4.4 — D-14: the fail-closed `RESEND_API_KEY` assertion, in two places

**Why the runtime step alone is not the strongest shape.** MEASURED: `ci.yml` today contains **zero**
occurrences of `RESEND` (`grep -rn 'RESEND' .github/workflows/` → no matches). The exposure is that
someone adds a repository-level or environment-level secret and wires it into a workflow `env:`. A
runtime step inside `gate-e2e` catches that — but only after `npm ci` and only in that one job.

**Shape 1 — the runtime step (D-14's literal requirement).** As written in § 4.1. Two notes:

- `${{ env.RESEND_API_KEY }}` resolves the *workflow/job* `env` context. It does **not** see a
  repository secret that nobody wired in — which is correct: an unwired secret cannot reach the
  process either. If the planner wants the belt-and-braces form that also catches a
  runner-environment leak, add `|| [ -n "${RESEND_API_KEY:-}" ]` reading the real process env.
- ⚠ **Spelling `RESEND_API_KEY` inside `ci.yml` is safe for the parser** (which scans env/run/with
  *values* for `secrets.`, not keys) but it **breaks any future whole-file `grep -c RESEND` audit**.
  `ci.yml`'s header records this exact trap for `--update-snapshots`: *"prose about a forbidden token
  is still the token"*. Say so in the step's comment.

**Shape 2 — the parse-based invariant, recommended in addition.** Add to `verify-workflows.mjs`'s
`ci` section, spelling the token **in the checker** (the same discipline `SNAPSHOT_UPDATE_FLAG` at
`:85-89` already establishes):

```js
// The mail credential, spelled ONCE, here — never in ci.yml, for the same reason the snapshot
// flag is never spelled there: the cheapest audit of "this workflow cannot mail real people" is a
// grep returning 0, and prose about a forbidden token is still the token.
const MAIL_KEY = "RESEND_API_KEY";
// A full e2e run with this set was measured at 14 real outbound sends ([17-D28]). `instrumentation.ts`
// deliberately does NOT mock that origin — for Resend the key IS the switch (src/lib/email.ts binds
// the client at module load), so a mock would also suppress the [email:dev] fallback. Nothing but
// this assertion stands between an unrelated secret addition and mail to real addresses on every PR.
const mailEnvHits = [];
for (const [name, job] of jobs) {
  for (const [k] of Object.entries(job?.env ?? {})) if (k.startsWith("RESEND")) mailEnvHits.push(`${name}.env.${k}`);
  for (const s of stepsOf(job)) for (const [k] of Object.entries(s?.env ?? {})) if (k.startsWith("RESEND")) mailEnvHits.push(`${name}.step.env.${k}`);
}
for (const [k] of Object.entries(doc?.env ?? {})) if (k.startsWith("RESEND")) mailEnvHits.push(`workflow.env.${k}`);
check(
  `no job, step or workflow env declares ${MAIL_KEY} — the e2e suite must send zero real email`,
  mailEnvHits.length === 0,
  `hits=[${mailEnvHits.join(", ") || "(none)"}]  scanned ${jobs.length} job(s)`,
);
```

⚠ **The step in § 4.1 sets `MAIL_KEY_UNDER_TEST`, whose key does not start with `RESEND`** — so the
step and this invariant do not fight each other. That is deliberate; if the planner renames the
step's env key to `RESEND_API_KEY`, this check goes red against a correct file. **Keep them
different, and say why at both sites.**

**Where it runs:** `verify-workflows.mjs` is already executed by `gate-db-free`
(`ci.yml:598-599`, `- name: Verify the workflow invariants (parse, not grep)`), the cheap job that
always runs. So shape 2 catches the violation in about a minute, before any browser starts.

**Watch it go red (the project's standing rule):** add `env: { RESEND_API_KEY: "x" }` to any job,
run `node scripts/verify-workflows.mjs --section=ci`, confirm the named failure, revert. Record the
message in the summary.

## 4.5 — D-15: required only after it has been watched failing

The order is a prerequisite, not a preference:

1. Merge the job **non-required**. Confirm a green run and **record the wall-clock** (D-13).
2. **Make one spec fail on a PR** and watch the run go red. Cheapest honest mutation: a
   one-character change to an assertion in the new `host-listing-grid.spec.ts` — it is the newest
   file, it is the phase's own, and reverting it is a one-line diff. ⚠ Do **not** mutate a shipped
   product file to prove the gate: that is a red for the wrong reason and it teaches nothing about
   the gate.
3. Only then flip `gate-e2e` to a required check in branch protection. **This is a repository setting,
   not a file** — it cannot be committed, so the plan must record who did it and when, or the
   success criterion has no evidence.

⚠ **A `timeout-minutes` expiry is a red.** Once the job is required, a suite that grows past 45
minutes blocks every PR. That is the correct behaviour and the correct response is D-13's sharding
decision, not raising the cap silently.

---

# § 5 — D-02: the idempotent-draft-reuse predicate

## 5.1 — What a freshly-minted row actually looks like, MEASURED against the live database

`createDraftListing` writes exactly four values (`src/app/actions/listing.ts:154-160`):

```ts
const id = randomUUID();
await db.insert(listing).values({ id, hostId: userId, status: "draft", bookingMode: "instant" });
return { ok: true, id };
```

Everything else on the row is a column default or NULL. Verified against `fitout` today
(`docker exec fitout-db-1 psql -U fitout -d fitout`) — the four D-01 orphans and **eleven other
untouched drafts owned by other accounts** all report the identical shape:

| Column | Fresh-row value | Source |
|---|---|---|
| `title`, `description`, `city`, `primary_space_type`, `hourly_rate_cents`, `day_rate_cents`, `per_head_price_cents`, `cancellation_policy`, `published_at`, `location`, `max_occupancy`, … | **NULL** | no default in `schema.ts:206-262` |
| `status` | `draft` | `schema.ts:250` default |
| `booking_mode` | `instant` | written explicitly; `schema.ts:227` default is also `instant` |
| `review_state` | `pending` | `schema.ts:260` default |
| `occupancy_mode` | `exclusive` | `schema.ts:239` default |
| `unit_count` | `1`, `currency` `php`, `timezone` `Asia/Manila`, `show_exact_address` `false` | `schema.ts:220-226` defaults |
| `created_at` | `now()` | `schema.ts:263` `.defaultNow().notNull()` |
| **`updated_at`** | **`now()` — bit-identical to `created_at`** | `schema.ts:264-267` `.defaultNow().$onUpdate(() => new Date()).notNull()` |
| `deleted_at` | NULL | `schema.ts:262` |

**The D-01 rows, for the plan summary (D-01 requires the record to survive the rows):** all four
owned by `AcW4AhUfkMexEvvEUa8KjsngD7ubMoZy`, `status=draft`, `review_state=pending`,
`deleted_at IS NULL`, every one of `title / description / city / hourly_rate_cents /
day_rate_cents / per_head_price_cents / cancellation_policy` **NULL**, and `updated_at = created_at`:

| id | created_at (UTC) |
|---|---|
| `3e224ec0-f015-4d18-a58b-ad08ce165d18` | `2026-09-03 10:51:56.033772+00` |
| `3b22e548-762b-484e-a828-5d0b52b4904f` | `2026-09-03 10:52:13.556143+00` |
| `485e4843-8b5c-4059-aec0-43b30971e40c` | `2026-09-03 10:52:27.302846+00` |
| `e6ca32d0-41c1-4fbf-9cee-79402b962c51` | `2026-09-03 10:52:39.933788+00` |

⚠ **The delete must still verify emptiness per row, not trust this table** (D-01's own warning). The
above is a read taken during research; the plan re-reads at execution time.

⚠ **This is a `DELETE`, not a soft-delete.** `listing` has `deleted_at` and the app soft-deletes
(`softDeleteListing`), but D-01 says the rows are DELETED and calls the reversibility costly. A hard
`DELETE` cascades to `listing_photo` / `listing_amenity` / `listing_activity_tag` / `operating_hours`
/ `availability_block` (all `onDelete: "cascade"`, `schema.ts:295/314/325/478/1035`) — which is
harmless here **because the per-row check proves those are empty**, and that is a second reason the
per-row check is not optional.

## 5.2 — The recommended predicate

```sql
-- The reuse read, owner-scoped BY ARGUMENT from the session (never from a parameter), exactly as
-- createDraftListing's existing verification read is.
SELECT id FROM listing
 WHERE host_id   = $me
   AND deleted_at IS NULL
   AND status    = 'draft'
   AND updated_at = created_at          -- ← the load-bearing term
   AND title IS NULL                    -- ← belt-and-braces (see 5.3)
   AND NOT EXISTS (SELECT 1 FROM listing_photo WHERE listing_id = listing.id)  -- ← the real gap
 ORDER BY created_at DESC
 LIMIT 1;
```

In Drizzle, beside the existing `assertOwnership` (`listing.ts:95`), using imports already present
at `:36` (`and`, `eq`, `isNull`, `sql`):

```ts
const [reusable] = await db
  .select({ id: listing.id })
  .from(listing)
  .where(
    and(
      eq(listing.hostId, userId),
      isNull(listing.deletedAt),
      eq(listing.status, "draft"),
      sql`${listing.updatedAt} = ${listing.createdAt}`,
      isNull(listing.title),
      sql`NOT EXISTS (SELECT 1 FROM listing_photo WHERE listing_id = ${listing.id})`,
    ),
  )
  .orderBy(desc(listing.createdAt))
  .limit(1);
if (reusable) return { ok: true, id: reusable.id };
```

⚠ `desc` is **not** currently imported in `listing.ts:36` — add it, or use
`sql`ORDER BY created_at DESC``. Trivial, but it is the kind of thing a plan should name.

### Why `updated_at = created_at` is the term that carries the meaning

**MEASURED:** `schema.ts:264-267` declares
`updatedAt: timestamp(...).defaultNow().$onUpdate(() => new Date()).notNull()`. Drizzle's
`$onUpdate` fires on **every `db.update()` through this table object** — which is how *every* write
path in the app touches a listing: `saveListingStep`, publish, unlist, soft-delete, the re-review
flip. So "the host has done literally anything to this row" collapses to one comparison, and it does
not need to enumerate twenty columns that will drift as the schema grows.

**Its one real limit, stated rather than hidden:** `$onUpdate` is a **Drizzle-client hook, not a
database trigger**. A raw-SQL `UPDATE listing SET …` that bypasses Drizzle would not bump it.
`grep -n 'update(listing)' src/` should be run by the plan to confirm every write path goes through
Drizzle; `scripts/seed.ts` writes raw SQL but only to its own `seed_*` rows, which no host owns.

## 5.3 — The risk if the predicate is too loose, and the two failure directions

D-02's ⚠ is the whole point: *"a draft the host has genuinely started editing must never be silently
reused out from under a second Create press."* The two directions are **not** symmetric:

| Direction | What happens | Cost |
|---|---|---|
| **Too loose** — reuses a draft the host has touched | The host presses *Create listing* to start their SECOND space, and lands in the wizard for their FIRST one, already half filled in. They then edit it — overwriting real work — and never learn a second listing was not created. | **Unacceptable. Silent data loss on a host's own content**, with no error and no way to notice. This is the failure D-02 names. |
| **Too tight** — mints a new row when one could have been reused | An extra empty draft appears in the grid. | Tolerable: it is the *status quo* — exactly today's behaviour — visible, deletable by the host, and it costs one row. |

**So every ambiguity resolves toward tightness.** That is why `title IS NULL` and the photo
`NOT EXISTS` are in the predicate even though `updated_at = created_at` should already imply the
first: each extra conjunct can only make reuse rarer.

### The specific loophole `updated_at` alone does not close: photos

**MEASURED:** `src/app/actions/listing-photo.ts:294` inserts into `listing_photo` inside a
transaction and **does not update the `listing` row** (`grep -n 'update(listing)'` on that file
returns nothing — only `update(listingPhoto)` at `:424/:433/:493`). So a host who minted a draft,
uploaded a cover photo, and abandoned it has `updated_at = created_at` **and a photo**. Without the
`NOT EXISTS`, a second *Create listing* would silently adopt their photo into what they believe is a
new listing.

⚠ **`operating_hours` and `availability_block` are the same class of gap** (`schema.ts:472`, `:1047`,
both cascade from `listing.id`). They are reachable only from `/host/listings/[id]/availability`,
which a brand-new untouched draft has no realistic path to — but if the planner wants the predicate
airtight rather than merely safe, add the same `NOT EXISTS` for `operating_hours`. **UNPROVEN:**
whether the availability editor writes to `listing` as well; I did not read
`src/app/actions/availability*.ts` this session. Cheap to check; cheaper still to just add the
conjunct.

### What "untouched" must NOT be defined as

- ❌ `status = 'draft'` alone — every in-progress wizard listing is a draft.
- ❌ `title IS NULL` alone — the wizard's first step is not necessarily the title, and a host who
  filled in space type, address and price but no title would have their work adopted.
- ❌ "created within the last N minutes" — a time window is how these four rows were *found*
  (D-01's own warning), not what they *are*. It would also reuse a draft the host started 30 seconds
  ago and is actively typing into.

## 5.4 — ⚠ This is a check-then-act, and it must not be described as race-free

`CLAUDE.md § What NOT to Use` bans "query for conflicts, then insert" **for bookings**, with the
measured reason that two concurrent requests both pass the check. **The same race exists here**: two
tabs hitting `/host/listings/new` simultaneously can both find zero reusable drafts and both insert.

**Why that is acceptable here and why it must be written down:**

- The failure mode is **one extra empty draft**, not a double-booked room and not a double charge.
  The domain rule the booking ban protects (money, exclusivity) is absent.
- The observed defect is **sequential**, not concurrent: four inserts across **46 seconds**
  (10:51:56 → 10:52:39) is a human pressing a button, going back, and pressing again. A sequential
  retry is exactly what a check-then-act *does* fix.
- The correct-by-construction alternative — a partial unique index on
  `(host_id) WHERE status='draft' AND updated_at = created_at` — is **a schema migration**, and
  **zero schema migrations is a v1.2 invariant**. D-02 says so in as many words: *"No migration —
  this is a query plus a branch."*

**So the docblock at the call site must say: this makes creation idempotent against a HUMAN RETRY,
not against concurrency; the residual race yields one surplus empty draft and no data loss.** A
docblock claiming idempotency without that qualifier is the confident-wrong-claim the house rules
forbid.

## 5.5 — Where it goes, and the one thing it must not change

- **In `createDraftListing`, AFTER the D-255 verification gate and BEFORE the insert** — i.e.
  between `listing.ts:152` and `:154`. Placing it before the gate would let an unverified host
  discover whether they own a reusable draft; placing it in `new/page.tsx` would make it bypassable,
  which is the exact argument that file's own header already makes about the verification gate.
- **`createDraftListing` has exactly one caller** (`new/page.tsx:80`), MEASURED — so the contract
  change has one integration point.
- ⚠ **`saveListingStep` stays UNGATED (D-02 / D-270).** The reuse read is *additional* to
  `createDraftListing`; nothing about what the wizard may write changes. `listing.ts:172-190`'s
  docblock states the D-270 argument and `tests/listing/crud.test.ts` pins it.
- **`loadHostVerification` is already read in this action** (`:139`) and in the page (`:70`), so the
  reuse read is one more owner-scoped `select` in a function that already makes one — not a new
  access pattern.

## 5.6 — Test shape

`tests/listing/crud.test.ts` already exists and already pins `createDraftListing`'s gate behaviour by
name (the "grandfathered SUCCEEDS (FINDING F-7)" and "saveListingStep on an EXISTING draft still
succeeds for an UNVERIFIED host (D-270)" cases). Three cases belong beside them:

1. **Two consecutive `createDraftListing()` calls for one host return the SAME id, and the table
   grows by exactly one row.** This is D-02's headline.
2. **A draft that has been `saveListingStep`-ed is NOT reused** — call once, save a step, call again,
   assert a **different** id and two rows. This is the loose-predicate guard and it is the one that
   protects the host's work.
3. **A draft with a `listing_photo` row is NOT reused**, even with `updated_at = created_at`. This is
   the § 5.3 loophole, and it is the case that goes green by accident if someone later "simplifies"
   the predicate down to the timestamp comparison.

⚠ Case 2 is the one to watch go red: temporarily drop the `updated_at = created_at` conjunct and
confirm it fails, then restore.

---

# § 6 — D-03: the failure sentence, and how it survives a redirect

## 6.1 — The constraint nobody can design around

`new/page.tsx` **renders nothing**. Every branch ends in a `redirect()` (`:63`, `:67`, `:77`, `:83`,
`:86`), and `axe-sweep.spec.ts:683` records that structural fact in as many words. So the sentence
cannot be rendered here, and it cannot be client state (a server redirect discards it). **It has to
travel in the URL and be rendered by the destination.**

`HostListingsPage` (`src/app/(host)/host/listings/page.tsx:38`) **currently takes no props** —
MEASURED, `grep -rn 'searchParams' "src/app/(host)"` returns hits only in `host/bookings/page.tsx`
(`:197`, `:199`, `:211`), which is the shipped precedent for the shape:

```ts
export default async function HostBookingsPage({ searchParams }: {
  searchParams: Promise<{ tab?: string; cursor?: string; listing?: string }>;
}) { const { tab: rawTab, … } = await searchParams; … }
```

## 6.2 — The recommended shape

```diff
--- a/src/app/(host)/host/listings/new/page.tsx  @@ :80-84
   const res = await createDraftListing();
   if (!res.ok || !res.id) {
-    // Creation failed — send them back to the grid rather than a broken wizard.
-    redirect("/host/listings");
+    // D-03 — THE SILENT BOUNCE GETS A SENTENCE. Until now this branch returned the host to the
+    // grid carrying no message at all, recorded as a known blind spot in 18.1-UI-SPEC § NOT
+    // COVERED. It is now the ONLY branch that can fire here — the four refusing verification
+    // states are routed to /host/verify above — so what it catches is genuine infrastructure
+    // failure: an insert that did not land. ⚠ THE SENTENCE MUST NOT IMPLY A VERIFICATION
+    // PROBLEM; a host who reads "we couldn't check your account" here goes to /host/verify and
+    // finds nothing wrong, which is the copy-about-a-check-that-never-ran defect D-265 exists to
+    // prevent, one route over.
+    //
+    // ⚠ THE REDIRECT'S DESTINATION LITERAL IS UNCHANGED AND ITS OCCURRENCE COUNT IN THIS FILE IS
+    // UNCHANGED — 18.1-12's acceptance criteria count it. Only a query string is appended.
+    redirect(`/host/listings?${LISTING_CREATE_FAILED_PARAM}`);
   }
```

and on the destination, following the shipped signal module idiom rather than inventing a voice:

```ts
// src/lib/listing/create-signal.ts  (new — a copy module, zero dependencies)
// D-03 / rule O7 — A SIGNAL NAMES THE STATE, THE REASON AND THE WAY OUT
// (`src/lib/host/requests-signal.ts:56` states the rule; this module is the third file to obey it,
// after `hours-signal.ts` and `review-signal.ts`).
//
// Calm, sentence case, no exclamation mark and no alarm variant: something went wrong on FitOut's
// side, the host did nothing wrong, and the way out is one press. ⚠ IT MUST NOT MENTION
// VERIFICATION — see the call site.
export const LISTING_CREATE_FAILED_STATE  = "We couldn't start your new listing.";
export const LISTING_CREATE_FAILED_REASON = "Something went wrong on our side, and nothing was saved.";
export const LISTING_CREATE_FAILED_CTA    = "Try again";
export function composeListingCreateFailedSentence(): string {
  // Composed in JS, not interleaved as JSX text: SWC's whitespace transform drops the leading space
  // of text following an expression container — the defect `(host)/host/page.tsx:75` records by name
  // and `requests-signal.ts:66-77` composes around for the same reason.
  return `${LISTING_CREATE_FAILED_STATE} ${LISTING_CREATE_FAILED_REASON}`;
}
```

**The rendering.** The grid already imports `HostingPausedNotice` (`page.tsx:22`) and already mounts
`<Toaster />` (`:126`), so both a panel notice and a toast are available. **Recommend the muted
inline notice above the grid, not a toast** — three reasons from the tree: (1) `listing-card.tsx`'s
hours notice and review notice are both *"calm muted information, never an alert variant and never
red"* rendered inline (`:392-405`, `:406-429`), which is this surface's established treatment;
(2) a toast is dismissed and gone, and this sentence carries a way out the host may want a second
later; (3) the `<Toaster />` on this page is fed by `runAction` in the **client** card, and reaching
it from an RSC would need a new client bridge — more machinery for a worse result.

**Sanitising the parameter.** Treat `searchParams` as untrusted: match the value against a single
known constant and render the module's own string. **Never interpolate the query value into the
page.** One `===` comparison; anything else renders nothing.

## 6.3 — What the copy must not say, with the evidence

| Do not say | Why | Source |
|---|---|---|
| anything about verification, account checks, or approval | The four refusing verification states redirect to `/host/verify` **before** this branch, so a verification sentence here is copy about a check that did not fail. | `new/page.tsx:69-77`; D-265's argument at `:14-25` |
| "your listing was deleted" / "we removed it" | Nothing was created, so nothing was removed. | `listing.ts:154-160` — the insert is the last thing the action does |
| an alarm, red, or `variant="destructive"` panel | This surface's own rule for host information. | `listing-card.tsx:387-391` and `:406-412` in the project's own words |
| a bare "Something went wrong." | Fails rule O7 — that is a state with no reason and no way out, which is the defect being closed, differently spelled. | `requests-signal.ts:53-61` |

---

# Standard Stack

**Nothing is added. This phase's entire ingredient list already ships.** Zero new runtime
dependencies and zero schema migrations are v1.2 invariants; a proposal of either is a scope alarm.

### Core (already installed — versions read from `package.json` / `node_modules`)

| Library | Version | Purpose here | Why standard |
|---|---|---|---|
| Next.js (App Router) | 16.2.7 | The routes under diagnosis; the `searchParams` seam for D-03 | Already the app |
| React | 19.x | `listing-card.tsx` is a `"use client"` component | Ships with Next 16 |
| Tailwind CSS | v4 | `mt-auto`, `flex-wrap`, `sr-only` — three stock utilities | Already the styling layer |
| `tailwind-merge` (via `cn`) | as installed | Class-conflict resolution; the D-06 hazard's mechanism | `src/lib/utils.ts:41-47` |
| Drizzle ORM | 0.44+ | D-02's reuse `select` | Already the data layer |
| `@playwright/test` | **1.60.0** | Both HSURF-01 guards, D-11's reachability spec, `gate-e2e` | Pinned; the CI image tag must match exactly |
| `lucide-react` | as installed | D-07's Delete icon | Already imported at `listing-card.tsx:38` |

### Supporting (already installed)

| Library | Purpose | When |
|---|---|---|
| `postgres` (postgres.js) | `scripts/seed.ts` and the e2e seed helpers | The CI seed step and any spec fixture |
| Vitest | `tests/listing/crud.test.ts` cases in § 5.6; `tests/design/*` gate | The D-02 unit cases |
| `yaml` (transitive, **not** a declared devDependency) | `scripts/verify-workflows.mjs` parses the workflow | § 4.4 shape 2. ⚠ Do **not** promote it to a devDependency to "tidy" this — `ci.yml`'s header records that promoting it is a dependency decision and therefore a checkpoint, not a side effect |

### Alternatives considered

| Instead of | Could use | Tradeoff |
|---|---|---|
| `mt-auto` on `CardFooter` | `flex-1` on `CardContent` | Both permitted by D-05, both render identically. `flex-1` changes flex-basis distribution among siblings including `AspectRatio`; `mt-auto` does not. See § 2.3. |
| `sr-only` span for the accessible name | `aria-label` alone | Both are shipped idioms here (`photo-lightbox.tsx:370-373` vs `availability-calendar.tsx:780-794`). Either is correct; § 2.2 recommends carrying both and names the fallback. |
| A Playwright reachability spec (D-11) | A `tests/design/` structural test | CONTEXT leaves this to discretion. A structural test can assert the *files* exist but **cannot see the running server's router**, which is the entire subject. § 1.4 recommends the spec. |
| Runtime step for D-14 | Parse invariant in `verify-workflows.mjs` | § 4.4 recommends **both**: the step is D-14's literal requirement, the parser catches it a minute earlier and across all five jobs. |
| A partial unique index for D-02 | — | **Rejected: it is a schema migration**, which D-02 and the milestone both forbid. § 5.4. |

**Installation:** none. `npm ci` is unchanged.

**Version verification (ecosystem-appropriate, run before planning):**

```bash
node -p "require('./package.json').devDependencies['@playwright/test']"   # must equal the ci.yml image tag
node -p "require('./node_modules/next/package.json').version"             # 16.2.7 measured
```

# Package Legitimacy Audit

**Not applicable — this phase installs zero external packages.** MEASURED: §§ 1–6 name no `npm
install`, no `package.json` edit, and no new import that is not already in the tree
(`lucide-react` at `listing-card.tsx:38`; `@playwright/test` in every existing spec; `drizzle-orm` at
`listing.ts:36`).

| Package | Registry | Verdict | Disposition |
|---|---|---|---|
| *(none)* | — | — | — |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none.

⚠ **If any plan in this phase proposes a package, that is a scope alarm** — stop and re-read the v1.2
invariant before running the legitimacy gate.

# Architecture Patterns

### Recommended structure (files this phase touches or creates)

```
src/
├── app/
│   ├── actions/listing.ts                       # + the D-02 reuse read, :152→:154
│   └── (host)/host/listings/
│       ├── page.tsx                             # + searchParams + the D-03 notice
│       └── new/page.tsx                         # :83 gains a query string only
├── components/listing/listing-card.tsx          # :434 +mt-auto +flex-wrap; :465 icon-only Delete
├── lib/listing/create-signal.ts                 # NEW — D-03's copy module
e2e/
├── host-listing-grid.spec.ts                    # NEW — HSURF-01's two guards, 3 bands
└── host-route-reachability.spec.ts              # NEW — D-11's guard
tests/listing/crud.test.ts                       # + the three D-02 cases
scripts/verify-workflows.mjs                     # + the mail-key invariant (§ 4.4 shape 2)
.github/workflows/ci.yml                         # + gate-e2e (job 5)
```

**Untouched, deliberately:** `src/components/ui/card.tsx`, `src/components/ui/button.tsx` (D-04 /
D-129 — read, never edit), `src/app/(host)/host/listings/[id]/edit/page.tsx` (D-10),
`src/lib/bookability.ts` (`deriveBookable` is off limits), `instrumentation.ts` (deferred),
`playwright.config.ts`.

### Pattern 1 — Fix at the call site, never in the vendored primitive

**What:** every layout change lands on a `className` prop, which `cn(base, className)` places last.
**When:** any shadcn `ui/*` component. **Why it is a pattern and not a preference:** `npx shadcn add`
re-violates a forked primitive on the next install (D-129's measured argument), and editing
`ui/card.tsx` changes every `Card` in the app including the search grid.

### Pattern 2 — A signal names the state, the reason and the way out

**What:** copy lives in a module (`hours-signal.ts`, `review-signal.ts`, `requests-signal.ts`) that
exports the three parts and a compose function; the surface renders the composed string.
**When:** D-03. **Why:** the composition happens in JS rather than as interleaved JSX text because
SWC's whitespace transform drops the leading space after an expression container — a defect this repo
has shipped once (`(host)/host/page.tsx:75`).

### Pattern 3 — A gate that names what went wrong, not that a number moved

**What:** every assertion carries a failure message naming the mechanism, the file:line, and the
next command to run. **When:** all three new specs and the CI invariant. **Why:** every instrument in
this repo does it (`overflow-320.spec.ts`'s offender lists, `verify-workflows.mjs`'s
"it prints what it checked", `axe-sweep`'s named skips), and § 1.4 shows the concrete cost of not
doing it — a 60-second timeout whose message points at fixtures when the problem is routing.

### Pattern 4 — Watch the guard go red before trusting it

**What:** apply the mutation, observe the named failure, revert, record the message.
**When:** both HSURF-01 guards (before the § 2 edit lands), the D-14 invariant, and D-15's required
flip. **Why:** `e2e-email-silence.test.ts:34-53` records four watched reds and states the reason —
an absence assertion cannot notice its own subject is gone.

### Anti-patterns to avoid

- **`h-full` on `Card`.** A no-op dressed as a fix; the ticket closes and the defect returns with a
  different explanation. (D-05, and the Technical Debt table in `PITFALLS.md`.)
- **Editing `edit/page.tsx:49`.** Trades a shipped IDOR guard for a dev-server symptom. (D-10.)
- **Widening `gate-price-parity`.** An enumerated mutation the invariant checker exists to catch.
- **`npm run test:e2e` in CI.** It is a bare `playwright test`, which on Linux also collects the
  `visual` project — job 4's gate, with committed baselines.
- **Prepending a class into a `cn()` call.** WR-04's measured deletion. (D-06.)
- **A time-window predicate for "untouched".** The window is how the rows were found, not what they
  are. (D-01/D-02.)

# Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---|---|---|---|
| Making the footer sit at the card bottom | a measured `min-height`, a JS height sync, or a `h-full`+`h-[calc()]` pair | `mt-auto` on `CardFooter` (one class) | The container is already `flex flex-col` and already stretched. Anything else re-implements what flexbox does for free — and would need re-tuning at every band. |
| Fitting four controls in a narrow footer | per-breakpoint `w-*`/`text-*` overrides on `Button`, or a `min-w-0` + `truncate` pair | `flex-wrap` on the footer + D-07's icon-only Delete | `Button` carries `shrink-0` and `whitespace-nowrap` at the base (`ui/button.tsx:74`); fighting those at a call site forks the primitive's behaviour without forking its file. |
| An accessible name for an icon-only control | a `title` attribute, or a tooltip | `sr-only` text (and/or `aria-label`) | `title` is not reliably announced and is not a name source in every AT; the repo already ships the `sr-only` idiom at 20+ sites. |
| Detecting that a route stopped resolving | a `fetch` in a `beforeAll` with a bespoke retry loop | a Playwright spec using `request.get(..., { maxRedirects: 0 })` | The suite, the pin, the CI job and the reporter already exist. § 1.4. |
| Asserting a workflow property | `grep` over `ci.yml` | `scripts/verify-workflows.mjs` | MEASURED SIX-OF-SIX vacuity: a whole-file substring check was GREEN for six real mutations, and falsely RED for prohibitions, because the file documents itself. The parser strips comments. |
| Idempotent creation | a client-side "already clicked" flag, a `useTransition` lock, or a nonce table | an owner-scoped `select` + branch in the server action | The client cannot be trusted and the redirect destroys client state; the row is the only durable evidence. And a nonce table is a migration. |
| Silencing Resend in CI | mocking `api.resend.com` in `instrumentation.ts` | the empty-key seam that already works + the fail-closed assertion | **Explicitly deferred** — the key IS the switch, so a mock would also suppress the `[email:dev]` fallback. |

**Key insight:** every problem in this phase already has a shipped answer somewhere in the tree. The
research effort was almost entirely *finding* the existing answer rather than choosing a new one —
which is why the correct posture for the planner is archaeology, not design.

# Runtime State Inventory

> Included because D-01 is a **delete of real rows in a real database** and D-15 flips a **repository
> setting**. Both are runtime state that no file in the repo records.

| Category | Items found | Action required |
|---|---|---|
| **Stored data** | **4 orphan `listing` rows** in the local `fitout` database (uuids and timestamps in § 5.1), owned by `AcW4AhUfkMexEvvEUa8KjsngD7ubMoZy` (`host@fitout.test`). MEASURED today; still present, `deleted_at IS NULL`. **Plus 11 further untouched empty drafts owned by other (e2e-minted) accounts** — outside D-01's scope, which is host- and window-scoped. | **Data migration** (a scoped `DELETE`, per D-01, with per-row emptiness verified first). ⚠ This is a **local dev** database. If a production database exists, D-01's scope must be re-derived there; the window and the host id are local facts. |
| **Live service config** | `.next/` build artifacts on this machine (the stale dev manifest, the compiled `edit/page.js`, the complete production manifest). Not in git; destroyed by `rm -rf .next`. | **Archive before Step 3** (§ 1.0 item 3), then it is disposable. |
| | **GitHub branch protection** — D-15's required-check flip. Not a file, not committable. | **Manual, recorded**: who flipped it, when, and after which watched red. Without that record, success criterion 4 has no evidence. |
| **OS-registered state** | **None.** Verified: no dev server process on `:3000` (`curl` → `000`); one docker container (`fitout-db-1`, `postgis/postgis:18-3.6`, up 16h) which this phase reads and writes but does not re-register. | None. |
| **Secrets / env vars** | **None changed.** D-14 asserts the **absence** of `RESEND_API_KEY`; it never sets, reads or logs it. The production probe (§ 1.2 Step 5) passes `PLATFORM_WALLET_NUMBER` / `PLATFORM_WALLET_NAME` **inline for one command** — nothing is written to `.env.local` and nothing is committed. | None. ⚠ Do not add the wallet pair to `.env.local` "to make it easier": `.env.local` is not in git and a machine-specific fix would not travel. |
| **Build artifacts / installed packages** | `.next/` (above). `node_modules` unchanged — zero dependency changes. Playwright browsers are in the CI image, not installed by a step. | Clear `.next` per D-09; nothing else. |

---

# Common Pitfalls

### Pitfall 1 — The guard is green against the broken tree

**What goes wrong:** the HSURF-01 guard is written as a document-level overflow scan or a bare
"all cards equal height", both of which are **already true on the defect**.
**Why it happens:** `overflow-hidden` on `Card` and the grid's automatic stretch make the defect
invisible to the two most obvious instruments — and `e2e/overflow-320.spec.ts` already passes on this
exact route today.
**How to avoid:** § 3's two shapes — footer-flush-to-card-bottom, and `scrollWidth` on
`[data-slot="card-footer"]` itself.
**Warning signs:** the guard is green the first time you run it, before the fix.

### Pitfall 2 — `rm -rf .next` before the evidence is copied

**What goes wrong:** D-09's first command destroys the stale manifest, the artifact mtimes and the
complete production manifest — the only surviving subject of the diagnosis (§ 1.0).
**Why it happens:** the decision literally starts "clear `.next`".
**How to avoid:** § 1.0 item 3's four-command archive. It is a read; it does not change D-09's order.
**Warning signs:** a plan whose first task is `rm -rf .next`.

### Pitfall 3 — A green post-clear probe is written up as "clearing `.next` fixed it"

**What goes wrong:** the phase claims a cause it cannot have observed, and the next reader trusts it.
**Why it happens:** the outcome *looks* like confirmation of the recorded stale-cache hazard.
**How to avoid:** § 1.3. The process that failed is gone; a healthy new server says nothing about it.
**Warning signs:** any docblock naming one of the four candidate causes for UNPROVEN (c).

### Pitfall 4 — `npm start` 500s and the probe never runs

**What goes wrong:** the production half of D-09 is silently skipped and UNPROVEN (b) — the one item
that *is* closeable — stays open.
**Why it happens:** `next start` sets `NODE_ENV=production`, arming five module-scope boot guards;
`PLATFORM_WALLET_*`'s exemption is `NEXT_PHASE`-scoped and false at start
(`src/lib/paymongo.ts:39-47`).
**How to avoid:** § 1.2 Step 5's inline env, and be ready for `BETTER_AUTH_SECRET` /
`PAYMONGO_SECRET_KEY` / `PAYMONGO_WEBHOOK_SECRET` if `.env.local` does not supply them.
**Warning signs:** a 500 on the first probe URL with a boot-guard sentence in the server log.

### Pitfall 5 — `next build` run while `next dev` is still up

**What goes wrong:** they share `.next`; a build can force-stop the dev server, and this is **one of
the four un-discriminated candidates for UNPROVEN (c)**. Reproducing the hazard during the
investigation of the hazard is the worst possible confound.
**How to avoid:** § 1.2 Step 5 kills the dev server first, explicitly.
**Warning signs:** a plan whose production probe does not begin with "stop the dev server".

### Pitfall 6 — The reuse predicate adopts a host's real work

**What goes wrong:** a draft the host started is silently reused; their content is overwritten and
nothing tells them. § 5.3's unacceptable direction.
**How to avoid:** `updated_at = created_at` **plus** the photo `NOT EXISTS`. Every ambiguity resolves
toward tightness.
**Warning signs:** a predicate that is only `status = 'draft'`, or only `title IS NULL`, or contains
a time window.

### Pitfall 7 — The fixture makes all cards the same height

**What goes wrong:** Guard A clause 2 measures a zero gap on every card and passes on the defect.
**How to avoid:** § 3.4 — at least one card with an hours notice or a wrapping title.
**Warning signs:** clause 2 green before the § 2 edit.

### Pitfall 8 — D-02 breaks the e2e host fixture

**What goes wrong:** `axe-sweep.spec.ts`'s `mintDraftListing` (and any new fixture that calls
`/host/listings/new` twice) starts returning the **same** listing id — correctly, by D-02's design —
and a spec expecting N distinct drafts silently gets one.
**Why it happens:** D-02 changes a contract that `beforeAll` fixtures rely on implicitly.
**How to avoid:** `grep -rn '/host/listings/new' e2e/` before shipping D-02 and check every caller.
**MEASURED:** today the only e2e caller is `axe-sweep.spec.ts:312`, and it mints **once**, so it is
safe — but § 3.4's new fixture would not be.

### Pitfall 9 — `gate-e2e` runs the `visual` project

**What goes wrong:** `npm run test:e2e` is a bare `playwright test`; on Linux that collects
`e2e/visual/**` too, i.e. job 4's gate with its 52 committed baselines.
**How to avoid:** `npx playwright test --project=chromium`, by name.
**Warning signs:** the job's output mentions snapshots; the run time is far above expectation.

### Pitfall 10 — The mail-key assertion fights its own invariant

**What goes wrong:** the § 4.1 step is written with `env: RESEND_API_KEY: …`, and § 4.4's parser
check — which forbids exactly that key — goes red against a correct file.
**How to avoid:** the step's env key is `MAIL_KEY_UNDER_TEST`. Deliberate; say so at both sites.

### Pitfall 11 — The e2e job runs against an empty catalogue

**What goes wrong:** five specs fail for a fixture reason and the first CI run reads as five product
regressions.
**How to avoid:** the `npm run db:seed` step. `gate-price-parity` does not need it, which is exactly
why copying job 3 verbatim would produce this.
**Warning signs:** failure messages containing "seed it (`npm run db:seed`)".

### Pitfall 12 — D-15's flip happens before the watched red

**What goes wrong:** a required check that has never been proven capable of blocking is the shape
D-24 already left this project with, one layer up.
**How to avoid:** § 4.5's three steps in order, with the red recorded.

# Code Examples

The load-bearing snippets live inline where their argument is: **§ 2.2** (the three call-site class
edits and the icon-only Delete, with their docblocks), **§ 3.1 / § 3.2** (the two guards), **§ 1.4**
(the reachability spec), **§ 4.1** (the `gate-e2e` YAML), **§ 4.4** (the mail-key invariant),
**§ 5.2** (the Drizzle reuse read), **§ 6.2** (the failure sentence and its module).

Two more, both short:

### The eleven-URL probe, as a one-liner file the plan can commit to `evidence/`

```bash
# scripts-free; no dependency. Writes a matrix the summary can paste.
D=e6ca32d0-41c1-4fbf-9cee-79402b962c51
for U in /host/listings /host/listings/new "/host/listings/$D/edit" "/host/listings/$D/availability" \
         /host/listings/zzz/edit /host/listings/uat_listing_bookable/edit /host /bookings/abc \
         /listings/uat_listing_bookable /invite/abc /ops ; do
  printf '%-52s %s %s\n' "$U" \
    "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:3000$U")" \
    "$(curl -s -o /dev/null -w '%{redirect_url}' "http://localhost:3000$U")"
done | tee .planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/probe-$(date +%s).txt
```

### The per-row emptiness verification D-01 requires

```sql
-- Source: this session, run against fitout-db-1. Re-run at execution time; do not trust the copy
-- in § 5.1. The window is how these rows were FOUND; this query is what proves what they CONTAIN.
SELECT id, host_id, status, review_state, created_at,
       (updated_at = created_at)                                   AS untouched,
       (title IS NULL AND description IS NULL AND city IS NULL
        AND hourly_rate_cents IS NULL AND day_rate_cents IS NULL
        AND per_head_price_cents IS NULL AND cancellation_policy IS NULL
        AND published_at IS NULL)                                  AS empty_columns,
       (SELECT count(*) FROM listing_photo    p WHERE p.listing_id = l.id) AS photos,
       (SELECT count(*) FROM listing_amenity  a WHERE a.listing_id = l.id) AS amenities,
       (SELECT count(*) FROM booking          b WHERE b.listing_id = l.id) AS bookings
  FROM listing l
 WHERE l.host_id = 'AcW4AhUfkMexEvvEUa8KjsngD7ubMoZy'
   AND l.deleted_at IS NULL
   AND l.created_at BETWEEN '2026-09-03 10:51:56Z' AND '2026-09-03 10:52:40Z';
-- DELETE only if untouched AND empty_columns AND photos=0 AND amenities=0 AND bookings=0, per row.
```

⚠ The window literals are **UTC** (`created_at` is `timestamptz`, `schema.ts:263`). Do not translate.

# State of the Art

| Old approach | Current approach | When changed | Impact here |
|---|---|---|---|
| `reuseExistingServer: !process.env.CI` | **`reuseExistingServer: false`, unconditional** | Phase 17.1 (`[17-D24]`/`[17-D28]`) | Any stray local server on `:3000` now **fails** the run instead of being adopted. § 1.2 Step 2 checks for one. `tests/design/e2e-email-silence.test.ts` turns a restored ternary red. |
| `updateSnapshots` varying by environment (D-135) | **`updateSnapshots: "none"`, unconditional** (D-28) | Phase 11 | `gate-e2e` cannot mint a baseline even if a snapshot assertion appeared in a functional spec. |
| "no Playwright in CI" (the D-24 framing) | **two of four jobs already run it** | plans 11-06 and 12-15 | CI-01's real scope is the functional set as a **fifth** job, not Playwright from zero. |
| `src/middleware.ts` | `src/proxy.ts` | Next 16.0 | **Not this phase** — it is Phase 20's hard prerequisite. Named only so nobody imports it here. |
| Draft creation always mints | **reuse-then-mint** | this phase (D-02) | Changes an implicit contract e2e fixtures rely on. Pitfall 8. |

# Environment Availability

MEASURED on this machine, 2026-09-04.

| Dependency | Required by | Available | Version | Fallback |
|---|---|---|---|---|
| Node.js | everything | ✓ | **24.13.0** (matches CI's `node-version: "24"`) | — |
| npm | `npm ci`, all scripts | ✓ | 11.8.0 | — |
| Docker | the local Postgres for § 1.2 / § 5.1 | ✓ | 29.6.1; `fitout-db-1` (`postgis/postgis:18-3.6`) **up 16h** | — |
| PostGIS 18 database | D-01, D-02 verification, e2e fixtures | ✓ | reachable via `docker exec fitout-db-1 psql -U fitout -d fitout` | — |
| `@playwright/test` | all three specs, `gate-e2e`'s pin | ✓ | **1.60.0** — matches `mcr.microsoft.com/playwright:v1.60.0-noble` | — |
| Playwright Chromium binary (local) | watching the guards go red locally | ✓ | `chromium-1223` + `chromium_headless_shell-1223` installed | — |
| `git` | commits | ✓ | 2.52.0.windows.1 | — |
| **`gh` CLI** | watching the CI run go red; **flipping D-15's required check** | ✓ | 2.86.0 | Branch protection can also be set in the GitHub web UI. ⚠ **Either way it is not a file** — record who did it. |
| Dev server on `:3000` | the reproduction gate | ✗ | — | **Expected and correct.** § 1.0: nothing is listening, which is why UNPROVEN (a) is not closeable. |
| `curl` | the probe matrix | ✓ | present (Git Bash) | `Invoke-WebRequest` in PowerShell, but the `%{http_code}` format is `curl`-specific — prefer `curl`. |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none. The one absence (the wedged dev server) is the subject
of the investigation, not a blocker for it.

---

# Validation Architecture

> `workflow.nyquist_validation` is **`true`** in `.planning/config.json` — this section is required
> and `VALIDATION.md` is generated from it.

### Test Frameworks (three, and the phase uses all three)

| Property | Unit / integration | Design gate | E2E |
|---|---|---|---|
| Framework | **Vitest** | **Vitest** (second config) | **@playwright/test 1.60.0** |
| Config file | `vitest.config.ts` | `vitest.design.config.ts` | `playwright.config.ts` |
| Quick run | `npx vitest run tests/listing/crud.test.ts` | `npx vitest run --config vitest.design.config.ts tests/design/e2e-email-silence.test.ts` | `npx playwright test e2e/host-listing-grid.spec.ts --project=chromium` |
| Full suite | `npm test` | `npm run test:design` | `npx playwright test --project=chromium` |
| Needs a database | **yes** — `tests/setup.ts` forces `DATABASE_URL` onto `fitout_test`; `npm run db:test:setup` provisions it | **no** — no `setupFiles`, no `globalSetup` | **yes** — the dev `fitout` DB, plus `npm run db:seed` for five specs |
| ⚠ Note | truncates `fitout_test`, never `fitout` | build-blocking: `"build": "npm run lint && npm run test:design && next build"` | `reuseExistingServer: false` — free `:3000` first |

### Phase Requirements → Test Map

| Req | Behavior | Test type | Automated command | File exists? |
|---|---|---|---|---|
| HSURF-01 | Cards in a row end at the same bottom edge **and** the footer is flush to that edge, at 320 / sm / lg | e2e (geometry) | `npx playwright test e2e/host-listing-grid.spec.ts --project=chromium -g "flush"` | ❌ **Wave 0** |
| HSURF-01 | `scrollWidth == clientWidth` on `[data-slot="card-footer"]`, at 320 / sm / lg | e2e (geometry) | `npx playwright test e2e/host-listing-grid.spec.ts --project=chromium -g "footer fits"` | ❌ **Wave 0** |
| HSURF-01 | The Delete control keeps an accessible name after going icon-only | unit (RTL) | `npx vitest run tests/listing/listing-card.test.tsx -t "Delete"` | ⚠ file exists, **case does not** — Wave 0 |
| HSURF-01 | The 24px hit-area bar still holds for the four-control cluster | e2e (existing) | `npx playwright test e2e/overflow-320.spec.ts --project=chromium -g "/host/listings"` | ✅ exists — **must stay green, not be edited** |
| HSURF-01 | `npm run build`'s design gate still green after the call-site edit | design (build-blocking) | `npm run test:design` | ✅ exists |
| HSURF-02 | Creating a listing lands on `/host/listings/{id}/edit` | e2e (existing, implicit) | `npx playwright test e2e/axe-sweep.spec.ts --project=chromium` | ✅ exists (`mintDraftListing`, `:311-315`) — **coverage yes, diagnosis no** |
| HSURF-02 | A host-facing route that stops resolving says so in one sentence (D-11) | e2e (routing) | `npx playwright test e2e/host-route-reachability.spec.ts --project=chromium` | ❌ **Wave 0** |
| HSURF-02 | Two consecutive `createDraftListing()` calls return one id and add one row (D-02) | unit + DB | `npx vitest run tests/listing/crud.test.ts -t "idempotent"` | ⚠ file exists, **cases do not** — Wave 0 |
| HSURF-02 | A touched draft is **not** reused (D-02's unacceptable direction) | unit + DB | `npx vitest run tests/listing/crud.test.ts -t "not reused"` | ❌ **Wave 0** |
| HSURF-02 | A draft with a photo is **not** reused | unit + DB | `npx vitest run tests/listing/crud.test.ts -t "photo"` | ❌ **Wave 0** |
| HSURF-02 | The failed-creation branch reaches the grid with a sentence (D-03) | manual + unit | the sentence module has a unit test; the redirect+render is **manual UAT** — see below | ❌ **Wave 0** (module test) |
| HSURF-02 | The reproduction gate itself | **manual, evidence-producing** | § 1.2's seven steps; output archived under `evidence/` | n/a — a protocol, not a test |
| CI-01 | The workflow parses and every invariant holds with a fifth job | design/script | `node scripts/verify-workflows.mjs` | ✅ exists — must print `gate-e2e` in `jobs` and `containerized` |
| CI-01 | No job/step/workflow env declares a mail key (D-14) | design/script | `node scripts/verify-workflows.mjs --section=ci` | ❌ **Wave 0** (the new invariant) |
| CI-01 | The functional suite runs on a PR and a failing spec turns it red (D-15) | **manual, watched** | open a PR with one broken assertion; observe the red | n/a — the evidence is a run URL |

**Manual-only, with the justification:** (a) **D-03's rendered sentence** — the mechanism is a
`redirect()` from a page that renders nothing into an RSC that reads `searchParams`, and forcing
`createDraftListing` to fail in an e2e run means breaking the database mid-suite; the *copy module*
is unit-tested and the *rendering* is one UAT step. (b) **The reproduction gate** — its subject is a
running server's router; it produces evidence, not a pass/fail. (c) **D-15's required flip** — a
repository setting.

### Sampling Rate

- **Per task commit:** `npm run test:design` (build-blocking, no DB, seconds) **plus** the one quick
  command from the row being worked on.
- **Per wave merge:** `npm test` (full vitest against `fitout_test`) **plus**
  `npx playwright test --project=chromium -g "host-listing|reachability"`.
- **Phase gate:** `npm run build` green, `npm test` green, `npx playwright test --project=chromium`
  green locally, `node scripts/verify-workflows.mjs` exit 0, and **one green `gate-e2e` run on a PR
  plus one watched red** before `/gsd-verify-work`.

⚠ **Gates run alone** (CONTEXT § Established Patterns) and **worktrees are OFF**, so plans run
sequentially on `dev`. Do not schedule the Playwright commands concurrently with anything else —
`reuseExistingServer: false` means two runs fight over `:3000` and the second fails for the wrong
reason.

### Wave 0 Gaps

- [ ] `e2e/host-listing-grid.spec.ts` — HSURF-01's two guards at three bands, **plus the fixture that
      produces height variation** (§ 3.4). This is the largest Wave-0 item and the fixture is most of
      it.
- [ ] `e2e/host-route-reachability.spec.ts` — D-11's guard (§ 1.4). No fixture, no DB, ~2s.
- [ ] `tests/listing/crud.test.ts` — three D-02 cases appended (§ 5.6).
- [ ] `tests/listing/listing-card.test.tsx` — one case asserting
      `getByRole("button", { name: "Delete" })` resolves after D-07.
- [ ] `scripts/verify-workflows.mjs` — the mail-key invariant (§ 4.4 shape 2).
- [ ] A unit test for `src/lib/listing/create-signal.ts` beside the existing signal-module tests
      (`tests/listing/review-signal.ts` is the shape).
- [ ] **No framework install needed.** All three runners, both configs, the Chromium binary and the
      database are present (Environment Availability).

# Security Domain

> `workflow.security_enforcement` is **`true`**, `security_asvs_level` **1**, `security_block_on`
> **high**.

### Applicable ASVS categories

| ASVS category | Applies | Standard control in this phase |
|---|---|---|
| **V1 Architecture** | **yes** | The three-layer host guard is untouched. § 1 and § 5 both keep authorization in the server action / page, never in a route or a class name. |
| V2 Authentication | no | No auth code changes. Better Auth config untouched. |
| V3 Session Management | no | No session code changes. |
| **V4 Access Control** | **yes — the phase's sharpest surface** | **The IDOR guard at `edit/page.tsx:49-51` must not be weakened (D-10).** D-02's reuse read is **owner-scoped by argument from the session**, with no id parameter — the same property `createDraftListing`'s existing verification read has, and the reason one host can never be measured against another's rows. |
| **V5 Input Validation** | **yes** | D-03's `searchParams` value is **untrusted input**. Compare it against one known constant and render the module's own string; **never interpolate the query value into the page** (§ 6.2). |
| V6 Cryptography | no | Nothing signs, encrypts or hashes. |
| **V7 Error handling & logging** | **yes** | D-03's sentence must not leak infrastructure detail (an error string, a stack, a database message). It names the state, the reason and the way out — nothing else. |
| **V14 Configuration** | **yes** | The `gate-e2e` job holds **zero** `secrets.` (asserted by `verify-workflows.mjs:441-451`); D-14's fail-closed mail assertion; the boot guards in § 1.2 Step 5 are **supplied around, never softened**. |

### Known threat patterns for this stack

| Pattern | STRIDE | Standard mitigation | Status here |
|---|---|---|---|
| IDOR on a host-owned resource | Elevation of Privilege | Owner-scoped `SELECT` + `notFound()` that does not reveal existence | **Shipped, and D-10 forbids touching it.** The 404 it renders is byte-identical to the root not-found — that collision is a feature, and it is also what made this look like an application bug. |
| Reflected value from `searchParams` rendered into the page | Tampering / XSS | Compare against an allow-list constant; render server-owned copy | § 6.2's rule. React escapes by default and there is no `dangerouslySetInnerHTML` on this path (`listing-card.tsx:406-417` states that rule for the adjacent review notice) — but the allow-list is what makes it structural. |
| A CI job that holds a credential | Information Disclosure | Zero `secrets.`, asserted by a parser | `gate-e2e` holds one `DATABASE_URL` pointing at an ephemeral service container. **An e2e job is the largest exfiltration surface in the workflow, and the reason this one is safe is that it holds nothing** (`ci.yml`'s own words about job 3). |
| Real outbound email from CI | Information Disclosure | Fail closed on the key | D-14, both shapes. `[17-D28]` measured **14** real sends per suite run with the key set. |
| Softening a fail-closed boot guard to make a probe run | Tampering | Supply the value inline for one command; never edit the guard | § 1.2 Step 5, and `ci.yml:636-641`'s identical argument. |
| Reuse predicate resolving the target from a request parameter | Elevation of Privilege | The target comes from the **session**, not the request | § 5.5. `createDraftListing` takes **no arguments at all** — keep it that way. |

**Nothing in this phase touches money, payouts, bookings, availability or `deriveBookable`.** The
security surface is entirely (a) not weakening a shipped ownership check, (b) not introducing a
reflected-parameter render, and (c) not letting a new CI job hold a credential.

---

# Assumptions Log

> Everything below is `[ASSUMED]` / **UNPROVEN** — not verified against the tree or a running system
> this session. The planner and any discuss-phase pass should treat these as needing confirmation
> before they become locked, and none of them should reach a docblock as fact.

| # | Claim | Section | Risk if wrong |
|---|---|---|---|
| A1 | `mt-auto` on `CardFooter` produces the intended flush-bottom rendering | § 2.2 / § 2.3 | **Derived from class strings, not from a browser.** If wrong, the guard in § 3.1 clause 2 stays red and the alternative (`flex-1` on `CardContent`) is tried. Low risk — the guard is what settles it, which is why the guard is watched red first. |
| A2 | `flex-wrap` on `CardFooter` is sufficient to make the four controls fit at 320px | § 2.2 | Same class: derived. If insufficient even with icon-only Delete, the next lever is D-07's deferred overflow menu — **which is out of scope**, so this would be an escalation, not a widening. |
| A3 | `size="icon-sm"` (28px) clears `expectTargets`'s 24px scan | § 2.2 | Read from `button.tsx:118-119` (`size-7`) and from `overflow-320.spec.ts:3146-3150`'s written 24px argument. I did not run `expectTargets`. If wrong, `overflow-320.spec.ts` goes red on a route it currently passes. |
| A4 | Next 16's `.next/dev/server/app-paths-manifest.json` is an incremental per-session compile ledger | § 1.0 item 2 | **The reframing of UNPROVEN (c) rests on this.** Inferred from mtimes and the entry set on one machine. If wrong, the original "something removed the entry" framing stands. **Must not be stated as fact in any docblock.** |
| A5 | The compiled `edit/page.js` (mtime 15:18) is a leftover from a pre-18:09 dev session | § 1.0 item 2 | Same. Rests on `.next/dev`'s session-marker mtimes being what I take them to be. |
| A6 | `.env.local` on this machine supplies `BETTER_AUTH_SECRET` / `PAYMONGO_SECRET_KEY` / `PAYMONGO_WEBHOOK_SECRET`, so only the wallet pair needs passing inline | § 1.2 Step 5 | I did not read `.env.local` (it is not in git and reading a credential file is not warranted). If wrong, `npm start` 500s on a different guard — § 1.2 already tells the executor what to do. |
| A7 | Adding `searchParams` to `HostListingsPage` has no side effects | § 6.2 | The page is already dynamic (`auth.api.getSession` + `headers()`), so no static-render property can be lost. Derived from Next's dynamic-API rules, not measured. If wrong, `next build` says so immediately. |
| A8 | `tests/design/status-vocab.test.ts` will not redden from an `sr-only` "Delete" | § 2.5 | I read its file list (`:184`), not its assertions. `npm run test:design` is build-blocking and settles it in seconds. |
| A9 | The availability editor writes to the `listing` row (so `updated_at` covers it) | § 5.3 | Not read this session. If wrong, hours set on an untouched draft would not bump `updated_at` — the fix is one more `NOT EXISTS`, and § 5.3 already recommends adding it defensively. |
| A10 | `${{ env.RESEND_API_KEY }}` in a step's `env:` is not a `secrets.` reference and passes the parser | § 4.4 | Read from `secretHitsIn`'s described scope (`verify-workflows.mjs:441-451`), not executed. `node scripts/verify-workflows.mjs --section=ci` settles it before the push. |
| A11 | 45 minutes is a sane `timeout-minutes` for 37 specs with `retries: 2` | § 4.1 | **D-13 exists precisely because this number is unknown.** It is a stop, not an estimate. The first green run replaces it with a measurement. |
| A12 | Playwright's `request.get` follows redirects by default, so `maxRedirects: 0` is required | § 1.4 | From Playwright's documented `APIRequestContext` behaviour, not executed here. The prescribed "watch it go red by deleting the option" check settles it in one run. |
| A13 | Tailwind v4's `sm`/`lg` are 640px/1024px in this project | § 3.3 | Stock defaults; I did not read a theme override. If the project moved them, § 3.3's 700/1280 choices could land in the wrong band. Cheap to confirm from `globals.css`'s `@theme`. |

# Open Questions

1. **Does the 404 reproduce at all, on any server?**
   - *What we know:* the artifact evidence survives and is consistent with the recorded
     stale-dev-route-cache hazard; the production manifest is complete.
   - *What's unclear:* everything downstream of that, because the failing process is gone.
   - *Recommendation:* run § 1.2 and accept outcome A as the most likely honest result. **Do not
     manufacture a reproduction**, and do not treat "not reproduced" as a failure of the phase — it
     is a finding, and D-11 already decided what to ship in that case.

2. **Is there a production database with orphan drafts of the same shape?**
   - *What we know:* the four rows are in the **local** `fitout` database; the host id and the window
     are local facts.
   - *What's unclear:* whether a deployed environment exists at all — I found no deployment
     configuration in the tree, and `PITFALLS.md § Pitfall 6` records the same absence.
   - *Recommendation:* **a PM question, not a code question.** D-01's scope as written is local. If a
     production database exists, the scoped delete must be re-derived there, not copied.

3. **What is the fixture cost of § 3.4's height variation, and does it want a new
   `booker-seed.ts` helper?**
   - *What we know:* six e2e specs already hold a `postgres()` client and `deferred-items.md` warns
     against a seventh; `booker-seed.ts` already has `withClient` (open-write-close).
   - *What's unclear:* whether extending `booker-seed.ts` or driving the shipped UI is cheaper here.
   - *Recommendation:* extend `booker-seed.ts`. It keeps the "steady state is zero held clients"
     property the tree already argues for.

4. **After D-13's measurement, does the suite need sharding?**
   - *Recommendation:* explicitly deferred by CONTEXT. Record the number; do not decide.

5. **Should `verify-workflows.mjs` gain a positive assertion that `gate-e2e` exists** (the shape it
   already has for `gate-visual` at `:563-582`)?
   - *What we know:* today nothing would notice if someone deleted the job — every `ci` invariant is
     universally quantified, and a deleted job satisfies all of them vacuously.
   - *Recommendation:* **yes, and it is cheap** — one `hardStop` mirroring `CI_VISUAL_JOB`'s. But it
     is beyond D-12's literal text, so raise it rather than assume it.

# Sources

### Primary (HIGH confidence — read in this repository, this session)

- `src/components/listing/listing-card.tsx` — `:38` imports, `:314` `hasActions`, `:352` `Card`,
  `:353` `AspectRatio`, `:368` `CardContent`, `:433-479` the footer, `:449` `ml-auto`, `:465` Delete,
  `:270-279` the one-call-site docblock
- `src/components/ui/card.tsx` — `:14-18` `Card`, `:76` `CardContent`, `:86-91` `CardFooter`
- `src/components/ui/button.tsx` — `:73-74` the base, `:104` `sm`, `:115-119` the icon sizes
- `src/app/(host)/host/listings/page.tsx` — `:38` the signature (no props), `:127` the container,
  `:180` the grid wrapper, `:118-121` the missing-hours read
- `src/app/(host)/host/listings/new/page.tsx` — `:14-42` the header, `:63/:67/:77/:80-86` every branch
- `src/app/(host)/host/listings/[id]/edit/page.tsx` — `:30-33` the `/login` redirect, `:43-46` the
  select, `:49-51` the IDOR guard
- `src/app/actions/listing.ts` — `:35-77` imports, `:95` `assertOwnership`, `:111-161`
  `createDraftListing`, `:172-190` the D-270 argument
- `src/app/actions/listing-photo.ts` — `:294` the photo insert, and the **absence** of any
  `update(listing)`
- `src/lib/db/schema.ts` — `:199-287` the `listing` table, `:263-267` the timestamp columns,
  `:289-325` the child tables
- `src/lib/utils.ts:41-47` — `cn` = `clsx` + `extendTailwindMerge({ extend: { theme: { text } } })`
- `src/lib/paymongo.ts:25-47` — the two boot guards and the `NEXT_PHASE` exemption
- `src/lib/email.ts:34-55` — `resend = key ? new Resend(key) : null` at module load
- `src/lib/host/requests-signal.ts:30-77` and `src/lib/listing/review-signal.ts:1-50` — rule O7
- `playwright.config.ts` — `updateSnapshots: "none"`, `retries`, `projects`, `webServer`
  (`reuseExistingServer: false`, `env: { RESEND_API_KEY: "" }`)
- `.github/workflows/ci.yml` — the header's taxonomy and mutation table, `:601-660` job 1's build
  env, `:672-741` job 2, `:766-841` job 3, `:905-1061` job 4
- `scripts/verify-workflows.mjs` — `:1-90` the vacuity argument and `SNAPSHOT_UPDATE_FLAG`, `:202`
  `EXPECTED_IMAGE`, `:386-561` the `ci` section, `:563-640` the visual hard-stop, `:640-690` `cross`
- `scripts/seed.ts:1-60` — standalone, idempotent, `DATABASE_URL`-driven
- `e2e/axe-sweep.spec.ts` — `:252-315` the host fixture and `mintDraftListing`, `:1090-1130`
  `beforeAll`, `:1137-1195` the row runner and `expect(path).toBeTruthy()`
- `e2e/overflow-320.spec.ts:3135-3150` — the `/host/listings` row, its `tell`, and the written
  `touch: []` 24px argument
- `tests/design/clearance-merge-order.test.ts:1-45` — WR-04's measured merge table
- `tests/design/e2e-email-silence.test.ts:1-53` — the `[17-D28]` chain and its four watched reds
- `tests/design/selector-contract.test.ts:1-60, 250-300` — the D-32 floors; `.locator(` recorded not
  gated
- `tests/design/card-pattern-coverage.test.ts:205-225, 725-745` — the two `listing-card.tsx` entries
- `package.json` — the script table; `@playwright/test` `1.60.0`
- **Live probes, 2026-09-04:** `curl` against `:3000` (`000`); `docker ps`;
  `docker exec fitout-db-1 psql` reads of `listing`; `ls -la` of `.next/dev/**` and
  `.next/app-path-routes-manifest.json`; `node --version` / `npm --version` / `git --version` /
  `gh --version`; `ls ~/AppData/Local/ms-playwright`

### Secondary (HIGH — this milestone's own research, re-checked where possible)

- `.planning/research/PITFALLS.md` — Defects A and B in full, with the ten/eleven-URL probe matrix
  and the three UNPROVEN items. **The single most important prior read**, and § 1.0 is the one place
  this document departs from it (by adding a measurement it could not have had).
- `.planning/research/STACK.md § 5` — the fifth-job shape, the container pin, no install step, and
  the two network seams
- `.planning/ROADMAP.md § Phase 19` — the goal, four success criteria, three ⚠ blocks
- `.planning/REQUIREMENTS.md § v1.2` — HSURF-01, HSURF-02, CI-01
- `.planning/phases/19-.../19-CONTEXT.md` — D-01…D-15

### Tertiary (MEDIUM/LOW — training knowledge, not re-fetched this session)

- Tailwind v4 default breakpoints (`sm` 640, `lg` 1024) — **A13**
- tailwind-merge's group taxonomy (`display` vs `flex` vs `flex-wrap` vs `flex-direction`) — the
  no-conflict argument in § 2.4. Mitigated by the one-line `cn()` check prescribed there.
- Playwright `APIRequestContext` follows redirects by default — **A12**
- CSS `align-items: normal` behaving as `stretch` for auto-height grid items — the D-05 no-op
  derivation. Corroborates `PITFALLS.md`'s independent derivation from the same strings.

# Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|---|---|---|
| The tree as it stands (class strings, line numbers, call sites, test coverage) | **HIGH** | Every string read out of the named file this session. |
| The `gate-e2e` job shape and the invariant-checker analysis | **HIGH** | Job 3 read in full; the `ci` section read in full; the seed requirement measured from five specs' own failure messages. |
| The D-02 predicate and the D-01 row contents | **HIGH** | Read from the live database today, per column, per row. |
| The CSS outcome (does `mt-auto` fix it) | **MEDIUM** | Derived from class strings. No browser was opened. § 3's guards are what convert it to a measurement, which is why they are watched red first. |
| The 404's cause | **LOW / UNPROVEN, and that is the finding** | The failing process no longer exists. § 1.0 states exactly what can and cannot be closed, and § 1.3 states what gets written when it cannot. |
| The reframing of UNPROVEN (c) | **LOW** | Rests on A4/A5. Named as a reframing, never as an answer. |

**Research date:** 2026-09-04
**Valid until:** ~2026-10-04 for the tree-derived findings (30 days; nothing here is fast-moving).
⚠ **§ 1.0's live-system findings are valid for HOURS, not days** — the `.next/` evidence is
destroyed by any `next build`, any `next dev` boot, or D-09's own `rm -rf .next`. **Archive it
first.**

---

*Phase research for: 19 — Host Listing Surfaces & Gates That Actually Run*
*Researched: 2026-09-04*

---

## Validation Architecture

> **Appended 2026-09-04**, after the body above was committed. `VALIDATION.md` is generated from this
> section. It is the **requirement-by-requirement signal spec**: for each of HSURF-01, HSURF-02 and
> CI-01, what signal proves the requirement is *genuinely* satisfied, and how it is sampled.
>
> Its companion is the `# Validation Architecture` block earlier in this document, which carries the
> **frameworks, config files, run commands, the requirements→test map and the Wave-0 gap list**.
> That block is not repeated here and is not superseded by it; read them together.
>
> Same tag discipline as the rest of the file: **MEASURED** (read out of this tree/machine this
> session), **DERIVED** (follows from something measured), **UNPROVEN** (plausible, not established).
> ⚠ **A validation approach resting on an unproven premise says so, at the approach.**

### The one thing this section most needs to carry forward

**For HSURF-01, the three most obvious validation signals are ALREADY GREEN against the defect.**
MEASURED from the class strings at HEAD:

| Obvious signal | Why it is green on the broken tree |
|---|---|
| A document-level overflow scan (`expectNoOverflow`, the `e2e/overflow-320.spec.ts` idiom) | `Card` carries `overflow-hidden` (`ui/card.tsx:15`), so the overrun is **clipped at the card's rounded edge**, never painted outside it |
| `document.scrollWidth === document.clientWidth` at 320px | same reason — nothing escapes the card, so the document never scrolls |
| "every card in a row reports the same `offsetHeight`" | the grid wrapper sets **no `align-items`** (`page.tsx:180`), so grid items with `height: auto` **already stretch**; the card boxes are already equal |

`e2e/overflow-320.spec.ts` **passes on `/host/listings` today**, with the defect shipped. **A
validation plan built on any of those three measures nothing and reports success.** That is the
single most important sentence in this section: the guards in § 3.1 / § 3.2 are not "a better
version" of the obvious assertions — they are the only ones that can distinguish the two states at
all.

---

### HSURF-01 — the grid renders honestly

**Requirement:** on `/host/listings`, cards in a row **align**, and every action control stays
**inside its card** at every width from 320px up.

#### Signals that actually prove it

| # | Signal | Element measured | Threshold | Confidence |
|---|---|---|---|---|
| **A** | `card.getBoundingClientRect().bottom − footer.getBoundingClientRect().bottom` | the **card** and its `[data-slot="card-footer"]`, paired | **≤ 1px** | DERIVED — the designed gap is exactly `0`, because `Card`'s base carries `has-data-[slot=card-footer]:pb-0` (`ui/card.tsx:15`). The 1px is sub-pixel tolerance, not chosen slack. **Do not widen it.** |
| **A′** | all cards sharing a `cardTop` (±1px) report one distinct `bottom` | the **card** boxes | exactly 1 distinct value | MEASURED-as-already-true. Kept as a **vacuity companion**, not as the proof — it goes red only if someone later adds `items-start` to the grid wrapper. |
| **B** | `el.scrollWidth ≤ el.clientWidth` | **`[data-slot="card-footer"]` itself** | equality | DERIVED. The one signal `overflow-hidden` cannot mask: `scrollWidth` on the *overflowing element* still reports the overrun even when an ancestor clips it. |

**Why two signals and not one (D-08): fixing either does not fix the other.** Disjoint causes — A is
`justify-content: flex-start` on a stretched `flex flex-col` with no growing child; B is
`flex-shrink: 0` + `white-space: nowrap` on every child of a `flex-wrap: nowrap` container
(`ui/button.tsx:74`). `mt-auto` alone leaves the controls clipped; `flex-wrap` alone leaves the
footer band floating mid-card.

#### Sampling: three bands, one navigation

| Band | Viewport | Columns | Signal A / A′ | Signal B |
|---|---|---|---|---|
| floor | `320 × 800` | 1 | A **runs**; A′ **skipped**, or asserted as `row.length === 1` — one card per row means nothing to compare | **runs** — tightest width |
| `sm` | `700 × 900` | 2 | both run | runs |
| `lg` | `1280 × 900` | 3 | both run | runs — second-tightest per the § 2.1 arithmetic (≈258.7px of button room) |

⚠ **The viewport widths are deliberately off the breakpoints.** `640` and `1024` are the exact `sm`
and `lg` values; a 1px rounding difference at the edge changes the column count and makes a failure
unreadable. **UNPROVEN (A13):** that this project uses Tailwind v4's stock `sm`/`lg`. Cheap to
confirm from `globals.css`'s `@theme`; if overridden, both chosen widths move with it.

**Resize, do not re-navigate** — the grid is server-rendered and viewport-independent, so one
navigation plus three `setViewportSize` reads is correct (the shape `host-headings.spec.ts`
documents). ⚠ `await page.evaluate(() => document.fonts.ready)` **after each resize**: a font swap
reflows `CardContent` and moves signal A's numbers.

#### The fixture is part of the validation, not a precondition to it

**The misalignment is proportional to how much the cards' `CardContent` heights differ.** MEASURED:
`CardContent` conditionally renders a space-type line (`listing-card.tsx:377-381`), an hours notice
(`:396-405`) and a review notice (`:418-429`). **Three cards with identical content produce identical
heights and signal A is green on the broken tree.**

**Validation requirement:** the fixture must guarantee **≥2 cards in the measured row with different
content heights** — cheapest sources, in order: a draft with no title (renders "Untitled listing",
no space-type line); a published listing with no weekly hours (two-line notice, driven by
`loadPublishedListingsMissingHours`, `page.tsx:118-121`); a title long enough to wrap at 320px.

**⚠ Vacuity check, mandatory rather than advisory.** Both guards **must be watched failing against
the pre-fix tree**, and both failure messages recorded verbatim in the plan summary. **If signal A is
green before the § 2 edit lands, the fixture is not producing height variation and the guard is
measuring nothing** — a fixture defect, not a passing requirement. This is the repo's own standing
rule (`e2e-email-silence.test.ts:34-53` records four watched reds and states the reason: an absence
assertion cannot notice its own subject is gone).

#### Second-order signals that must stay green (regression, not proof)

- `npx playwright test e2e/overflow-320.spec.ts --project=chromium -g "/host/listings"` — its `tell`
  is the Availability **anchor**, untouched by D-07; its `touch: []` + 24px `expectTargets` scan must
  still hold. **MEASURED:** `size="icon-sm"` is `size-7` = 28px ≥ 24px (`ui/button.tsx:118-119`).
- `getByRole("button", { name: "Delete" })` still resolves after D-07. **MEASURED:** no test or spec
  locates this control by its text today, so nothing catches its loss — **which is exactly why this
  becomes a new case** in `tests/listing/listing-card.test.tsx`. Losing the name is silent and
  screen-reader-only.
- `npm run test:design` (build-blocking) and `npm run build`.

---

### HSURF-02 — creating a listing lands where it should

**Requirement:** a host who presses *Create listing* lands on the edit wizard for the listing they
just created, not on "We couldn't find that page."

#### ⚠ What "validated" can even mean now

**MEASURED 2026-09-04: nothing is listening on `:3000`. The process that produced the 404 no longer
exists.** Its `.next/dev` artefacts survive and were read (§ 1.0). This changes the shape of the
requirement's validation, and pretending otherwise would be the confident-wrong-claim the house rules
forbid.

**HSURF-02 therefore validates as three separable things, and only two of them are assertable:**

| Half | What it is | Validation |
|---|---|---|
| **H2a — the routing question** | does `/host/listings/{id}/edit` resolve? | **Evidence-producing protocol** (§ 1.2), not a pass/fail test. Its output is an archived probe matrix. |
| **H2b — the second-order defect that IS in FitOut's code** | a GET page with a write side-effect, no idempotency, no recovery (D-02 / D-03) | **Fully assertable** — three vitest cases + one copy-module test + one UAT step. Stands on its own merits regardless of H2a's outcome (D-09 says so). |
| **H2c — the standing guard** | a host-facing route that stops resolving must say so in one sentence (D-11) | **Fully assertable** — a new Playwright spec, ~2s, no fixture, no DB. |

#### The three UNPROVEN items: closeable, not closeable, and reframed

| # | Item | Disposition | The signal, or the sentence written instead |
|---|---|---|---|
| **(a)** | `rm -rf .next` + restart makes it go away | **NOT CLOSEABLE.** MEASURED: the failing process is gone. | ⚠ **A green post-clear probe is NOT evidence about (a).** It shows the current tree routes correctly; it says nothing about the old process. **Required written outcome:** *"Not closeable. The dev server that exhibited the 404 was already gone when the phase opened (measured 2026-09-04: nothing on :3000). A clean restart serving 307 shows the current tree routes correctly; it is not evidence about the old process."* **Validation of (a) is the presence of that sentence, not a green probe.** |
| **(b)** | Does it reproduce under `next build && next start`? | **CLOSEABLE, and the phase must close it.** | § 1.2 Steps 5–6: the eleven-URL matrix against a production server, plus `grep -c 'listings/\[id\]/edit' .next/app-path-routes-manifest.json` → `1`. ⚠ Blocked-on-environment ≠ answered: if `npm start` cannot boot, record **which boot guard blocked it** and mark (b) blocked, never closed. |
| **(c)** | What removed the manifest entry | **RECORDED REFRAMING, NEVER A CAUSE.** | The mtime evidence (artifact `15:18`, session markers `18:09`, manifest `19:33`) plus: *"Candidates not discriminated: swallowed compile error, HMR write race, `next build` racing `next dev`, Turbopack bug. A fifth is now on the list: nothing removed the entry — the 18:09 session may never have added it."* ⚠ **UNPROVEN (A4 / A5)** — the reframing rests on the dev manifest being an incremental per-session ledger, inferred from mtimes on one machine. **It must be tagged UNPROVEN wherever it is written, and no candidate may be named as the cause** (D-11's explicit ⚠). |

**Validation gate for the whole of H2a:** the archived `evidence/` directory contains (1) the
pre-clear manifest and artifact mtimes, (2) the dev-mode probe matrix, (3) the production-mode probe
matrix, and (4) the three written dispositions above. **Absence of any of the four is the failure.**
A "green" verdict with no archived matrix is not validation of anything.

#### The discriminator, restated as a validation rule

The probe is **anonymous**, and that is what makes one bit decisive. MEASURED at HEAD:
`edit/page.tsx:30-33` `redirect("/login")` sits **before** the `db.select()` at `:43-46` and long
before the `notFound()` at `:49-51`.

- **`307 → /login`** ⇒ the module ran. Any 404 the host then sees is an application question — and it
  would be the IDOR guard, which **D-10 forbids patching**. Next step is `/gsd-debug`, not an edit.
- **`404`** ⇒ **no FitOut code ran**; the body is the root not-found, byte-identical to what
  `notFound()` renders. Routing-layer failure.
- **Confirming second observation, required in both cases:** whether the route is in the *running
  server's* manifest. Absent ⇒ routing artifact. Present ⇒ the request reached the app.

#### D-11's guard: what it must assert, and why existing coverage does not count

**⚠ `e2e/axe-sweep.spec.ts:311-315` already goes red if `/host/listings/new` stops landing on the
wizard — and it does NOT count as validation of HSURF-02.** MEASURED: `mintDraftListing` does
`page.goto('/host/listings/new')` then `waitForURL(/\/host\/listings\/[^/]+\/edit/, { timeout:
60_000 })`; it is called in `beforeAll` (`:1102`) and nine host rows resolve their path from its
result, failing at `expect(path).toBeTruthy()` (`:1163`).

Three reasons it is coverage without validation:

1. **It goes red for the wrong reason.** Its failure message reads *"this row resolves its path from
   the running app, and the app produced none… seed the local database (`npm run db:seed`)"* — it
   names a **fixture** problem. A reader follows it to the seed script and away from the router.
2. **It costs 60 seconds to say so**, via a `waitForURL` timeout — long enough to read as flake and
   be retried rather than diagnosed.
3. **It is an accessibility sweep.** Its subject is axe violations; the route-resolution dependency
   is incidental, so a future refactor of that fixture could remove the signal with nobody noticing.

**That gap is the measured cost D-11 exists to close — this class has been re-diagnosed from scratch
twice on this machine.** So the D-11 guard's value is entirely in **what it asserts and what it says
when it fails**, not in adding coverage.

**The guard must assert:** an **anonymous** `request.get(path, { maxRedirects: 0 })` against
`/host/listings`, `/host/listings/new`, `/host/listings/{literal}/edit` and
`/host/listings/{literal}/availability` returns **307**, in ~2s, with **no fixture, no seed and no
database** (`listing.id` is `text` at `schema.ts:202`, so an arbitrary segment routes; the anonymous
request never reaches the DB).

**Its failure message must state:** that the request carries no cookie, so a 404 is neither a missing
listing nor an ownership refusal; that a 404 means the router never reached the module; and the two
`grep` commands against the dev and production manifests that discriminate artifact from defect.

⚠ **`maxRedirects: 0` is load-bearing and must itself be validated.** **UNPROVEN (A12):**
Playwright's `request.get` follows redirects by default. **Required check:** delete the option and
watch the assertion report `200` (from `/login`) instead of `307`. Without that, the guard can be
silently vacuous — asserting `200` against a redirect chain that would also produce `200` from a
broken route.

#### H2b — the assertable half

| Signal | Command | Proves |
|---|---|---|
| Two consecutive `createDraftListing()` calls return **one** id and the table grows by **one** row | `npx vitest run tests/listing/crud.test.ts -t "idempotent"` | D-02's headline: a human retry cannot mint an orphan |
| A `saveListingStep`-ed draft is **NOT** reused (different id, two rows) | `… -t "not reused"` | **The unacceptable failure direction** — silently adopting a host's in-progress work. ⚠ **Watch this one red**: drop the `updated_at = created_at` conjunct, confirm it fails, restore. |
| A draft carrying a `listing_photo` row is **NOT** reused | `… -t "photo"` | The § 5.3 loophole — MEASURED, `listing-photo.ts:294` inserts without touching the `listing` row, so `updated_at` alone does not see it |
| The failure-copy module names state + reason + way out, and **never mentions verification** | a unit test beside `tests/listing/review-signal.ts` | Rule O7, and D-265's copy-about-a-check-that-never-ran defect |
| The rendered sentence reaches the grid after a failed creation | **manual UAT, one step** | Justified as manual: the mechanism is a `redirect()` from a page that renders nothing into an RSC reading `searchParams`; forcing `createDraftListing` to fail inside an e2e run means breaking the database mid-suite |

⚠ **D-02's contract change is itself a validation hazard.** After it lands, calling
`/host/listings/new` twice returns the **same** id — correct by design, and a trap for any fixture
that mints N drafts. **MEASURED:** the only e2e caller today is `axe-sweep.spec.ts:312`, which mints
**once**, so it is safe. **§ 3.4's new HSURF-01 fixture would not be** —
`grep -rn '/host/listings/new' e2e/` must be re-run and every caller checked before D-02 ships.

---

### CI-01 — the gates actually run

**Requirement:** the repository's functional Playwright specs run in CI, as a **new job**, and a
failing spec turns the run red.

#### The primary signal is a watched red, not a file

**⚠ Reading `ci.yml` is not validation of CI-01.** Success criterion 4 says so in as many words:
*"proven by watching one spec fail, not by reading the workflow file."* The evidence is **two run
URLs**: one green, one red.

| # | Signal | How | Evidence |
|---|---|---|---|
| **1** | The workflow parses and every invariant holds with a fifth job | `node scripts/verify-workflows.mjs` exits 0 | Its `parsed values (ci)` block prints `jobs [… ,"gate-e2e"]` and `containerized [… ,"gate-e2e"]`. **That printout is the evidence the fifth job was seen** — the checker prints what it checked precisely so a green is not asked to be trusted. |
| **2** | The job runs the whole functional set, green | one PR run | The run URL, **plus the wall-clock** (below) |
| **3** | **A failing spec turns the run RED** | one PR with a one-character mutation to an assertion in the **new** `host-listing-grid.spec.ts` | The red run URL. ⚠ **Do NOT mutate a shipped product file** to prove the gate — that is a red for the wrong reason and teaches nothing about the gate. |
| **4** | The job is a **required** check | branch protection flipped **after** signal 3 | ⚠ **Not a file and not committable.** Validation is a recorded note: who flipped it, when, and against which red run. Without it, the criterion has no evidence at all. |

**Order is a prerequisite, not a preference (D-15):** merge non-required → green + measure → watched
red → flip. A required check that has never been proven capable of blocking is the shape D-24 already
left this project with, one layer up.

#### The `npm run db:seed` dependency — measured, and a validation signal in its own right

**MEASURED:** `grep -rn 'db:seed' e2e/` returns five specs whose own failure messages tell the reader
to seed — `axe-sweep.spec.ts:1166`, `overflow-320.spec.ts:941`, `reduced-motion.spec.ts:259`,
`shell.spec.ts:1131`, `skeleton-geometry.spec.ts:504`. **`gate-price-parity` does not need this
step**, which is exactly why copying job 3 verbatim produces a first run that reads as five product
regressions.

**Validation:** the first `gate-e2e` run must be green **with no failure message containing
"seed it (`npm run db:seed`)"**. That string appearing in CI output is the signal the step is missing
or misordered — it must run **after** `npm run db:migrate` and **before** `playwright test`.
`scripts/seed.ts:1-25` confirms it is standalone raw SQL, idempotent (it deletes its own `seed_*`
rows first), `DATABASE_URL`-driven and credential-free — so it is safe on every PR.

#### The fail-closed `RESEND_API_KEY` assertion as its own checkable signal

**Not** folded into "the job is green" — a separate signal with its own watched red, because it
protects against a change nobody in this phase will make.

| Signal | How | Confidence |
|---|---|---|
| No job, step or workflow `env:` declares a mail key | `node scripts/verify-workflows.mjs --section=ci` exits 0 with the named invariant listed | MEASURED baseline: `grep -rn 'RESEND' .github/workflows/` returns **nothing** today. CI is safe **only by coincidence**; this assertion is what makes it a property. |
| The job refuses to run with a live mail credential present | the runtime step in `gate-e2e`, before `npm ci` | DERIVED. It runs first so a violation costs seconds rather than a whole suite of real email. |
| **Watched red** | add `env: { RESEND_API_KEY: "x" }` to any job → confirm the named failure → revert; record the message | **Mandatory.** The measured stake: `[17-D28]` counted **14** real `POST api.resend.com/emails` per suite run with the key set, and `instrumentation.ts` **deliberately does not** mock that origin (for Resend the key *is* the switch — `src/lib/email.ts:34-35` binds the client at module load — so a mock would also suppress the `[email:dev]` fallback). |

⚠ **The two shapes must not collide.** The runtime step's env key is `MAIL_KEY_UNDER_TEST`, **not**
`RESEND_API_KEY`, precisely so the parser invariant does not go red against a correct file. Renaming
it re-introduces the collision. Say so at both sites. ⚠ **UNPROVEN (A10):** that
`${{ env.RESEND_API_KEY }}` is not counted as a `secrets.` reference by `secretHitsIn`. Settled by
running `--section=ci` before the push — do that rather than assume it.

⚠ **Spelling `RESEND_API_KEY` inside `ci.yml`** is safe for the parser (it scans env / run / `with`
*values*, not keys) but **breaks any future whole-file `grep -c RESEND` audit**. `ci.yml`'s header
records this exact trap for the snapshot flag: *"prose about a forbidden token is still the token."*
The parser names what it counts; the workflow does not.

---

### Negative space — what this phase deliberately does NOT validate

Stated explicitly, because an un-named exclusion and a forgotten one look identical.

| Not validated | Why | What is done instead |
|---|---|---|
| **The 404's root cause** | The failing process is gone (MEASURED). Naming a cause would be the confident-wrong-docblock the project's own rule forbids, and D-11's ⚠ bans it outright. | The reframing is **recorded as UNPROVEN**, (a) is written up as not-closeable, (b) is closed either way. A guard is left behind so the next occurrence is diagnosed in ~2 seconds instead of from scratch. |
| **The full-suite wall-clock against a threshold** | **D-13: the number does not exist yet, and subsetting or tuning before measuring is how a gate ends up covering less than anyone believes.** | The number is **measured and recorded in the phase summary**, never asserted. `timeout-minutes: 45` is a **stop, not an estimate** (⚠ UNPROVEN A11) — a timeout expiry is a legitimate red whose correct response is D-13's sharding decision, not a silent cap raise. |
| **Sharding** | Explicitly deferred by CONTEXT; gated on the measurement above. | Nothing. Do not decide. |
| **Anything under `(ops)`** — the subdomain, sign-in, invites, the staff surface, the 404 cloak | Phases 20–23. This phase shares no machinery with the ops thread. | `/ops` appears in the probe set as a **regression control only**: it must stay `404` and byte-identical. If it moves, **stop and escalate** — a Phase-20 concern arriving early, not something to fix here. |
| **`deriveBookable` / the sell gate / payments / bookings / availability** | Off limits (CONTEXT § Established Patterns; CLAUDE.md). Nothing in §§ 1–6 touches them. | Existing suites stay green as regression, not as proof of anything this phase claims. |
| **The IDOR guard's behaviour** at `edit/page.tsx:49-51` | D-10. A **shipped control that must not be weakened**, not a subject under test. | The anonymous probe is designed so the guard is never reached — which is what makes the probe decisive. |
| **`instrumentation.ts`'s Resend seam** | **Deferred** by CONTEXT; `[17-D28]` stays OPEN and remains the largest known un-fixed exposure in the suite. | D-14's fail-closed assertion, which is a different (weaker, cheaper) control and is described as such. |
| **Whether a production database holds orphan drafts of the same shape** | The host id and the 2026-09-03 window are **local facts**; no deployment configuration was found in the tree. | Raised as an Open Question for the PM. D-01's scope as written is local and must not be copied to another environment unexamined. |
| **Cross-browser / cross-platform rendering** of the card fix | The suite is `--project=chromium` only; the `visual` project is job 4's and is Linux-pinned. | The two guards run in Chromium at three widths. Any claim about other engines would be UNPROVEN. |

### Phase-gate summary

`/gsd-verify-work` should be reachable only when **all** of the following hold:

- [ ] `npm run build` green (lint + design gate + `next build`)
- [ ] `npm test` green against `fitout_test`, including the three new D-02 cases
- [ ] `npx playwright test --project=chromium` green locally, including both new specs
- [ ] `node scripts/verify-workflows.mjs` exits 0 and its printout names `gate-e2e`
- [ ] **Both HSURF-01 guards watched RED against the pre-fix tree**, messages recorded
- [ ] **`gate-e2e` watched RED** on a PR from a mutated new-spec assertion, run URL recorded
- [ ] **The mail-key invariant watched RED**, message recorded
- [ ] `evidence/` holds the pre-clear manifest + mtimes, both probe matrices, and the three written
      UNPROVEN dispositions
- [ ] The full-suite CI wall-clock is **recorded** (D-13) and the spec count restated (37 → 39 with
      the two new files)
- [ ] D-15's required-check flip recorded with who / when / against-which-red

⚠ **Gates run alone**, and worktrees are OFF — plans run sequentially on `dev`. Do not schedule the
Playwright commands concurrently: `reuseExistingServer: false` is unconditional, so two runs fight
over `:3000` and the second fails for the wrong reason.











