# Deferred Items — Phase 11

Out-of-scope discoveries logged during execution. Not fixed by the plan that found them.

- **[11-02] `.planning/STATE.md` has 2 unbalanced `<details>` tags.** At HEAD (`7aed77e`) the file holds 16 `<details>` openers and 14 `</details>` closers; plan 11-02 preserved the delta (17/15) rather than closing it. Pre-existing, unrelated to this plan, and cosmetic — GitHub renders the trailing blocks as nested rather than sibling. Fix during the next STATE prune.
- **[11-02] The phase-wide GATE-06 check command is wrong.** `ls drizzle/ | tail -1` returns `meta` (the `meta/` directory sorts last), not `0025_audit_resolved_by.sql`, so read literally the criterion is red on a healthy tree. Use `ls drizzle/*.sql | tail -1`. Appears in the `<verification>` block of multiple Phase 11 plans.
- **[11-03] A SECOND e2e failure joined D-6 item 1, and it is a NEW one: `e2e/search-and-book.spec.ts:318` now hits a strict-mode violation on the booking-reference paragraph.** Full-suite signal on 13 Aug 2026 is **19 passed / 2 failed / 6 did not run**, not the **17 / 1 / 5** that plans 10-13 and 10-14 recorded. Failure 1 is D-6 item 1 verbatim (`e2e/open-capacity.spec.ts:376`, the `Saturday, Aug 15` panel heading). Failure 2 is new:

  ```
  Error: strict mode violation: getByText('FIT-ANYE1QSH', { exact: true }) resolved to 2 elements:
      1) <p class="text-2xl font-semibold tracking-tight tabular-nums sm:text-display">FIT-ANYE1QSH</p>
      2) <p class="text-2xl font-semibold tracking-tight tabular-nums sm:text-display">FIT-ANYE1QSH</p>
  ```

  **Proven NOT caused by plan 11-03.** `playwright.config.ts` was reverted to its HEAD content with `git checkout -- playwright.config.ts` and `npx playwright test e2e/search-and-book.spec.ts` re-run: **identical signal — 1 failed / 1 did not run / 1 passed, same test, same assertion, same duplicate-element error.** The new config was restored afterwards and re-verified. It is also structurally impossible for this plan to cause it: the only runtime-affecting edits are a snapshot mode and two `testMatch` globs, and this assertion takes no screenshot.

  **Not caused by Phase 11 source changes either, as far as the tree can say.** The rendering site is `src/app/(app)/bookings/[id]/page.tsx:584` — the ONLY place in `src/` with that class string besides `components/host/payout-summary.tsx` — and its last commit is `69b3a70` (plan 10-11). No Phase 11 plan has touched it.

  **Leading hypothesis, untested:** two identical paragraphs in one document is the shape of Next's dev-mode streaming leaving both the streamed and the reconciled copy in the DOM across the `page.reload()` at `:317`, which would make this timing-dependent rather than a product defect. Testing that needs a production build (`npm run build && npm start`) and a re-run — cheap, but outside a config-only plan. Whoever picks this up: rule the streaming hypothesis in or out FIRST, because if it holds, the fix is in the spec's locator, not on the confirmation page.

- **[11-08] Every shipped row card renders 112px while its skeleton shimmers 80px — a 32px-per-row layout shift on three live routes.** `ROW_CARD_HEIGHT` (`h-20`) derives 80px as "a `Card` is `p-4` (16 top + 16 bottom) around a 48px thumbnail". The derivation is right about the box and wrong about which element owns the padding in THIS tree: the vendored `ui/card.tsx:15` carries `py-4` on **`Card` itself** and only `px-4` on `CardContent`, so a row that also asks `CardContent` for `p-4` — which `booking-row.tsx:60` and `host-booking-row.tsx` both do — pays the block padding **twice**.

  **Measured, not reasoned** (Chromium 1223, the compiled stylesheet, 640px wide, class strings produced by the repo's own `cn()` so the fixture cannot disagree with the component about which utility survives a merge):

  ```
  <Card className="relative">        + CardContent p-4  ->  112px   ← booking-row.tsx, host-booking-row.tsx
  <Card className="relative py-0">   + CardContent p-4  ->   80px   ← patterns/row-card.tsx (11-08)
  ```

  So `(app)/bookings/loading.tsx` and `RowListSkeleton` (both 80px rows) under-draw every shipped row by 32px, which is exactly the shift STATE-01 exists to remove — caused, ironically, by the skeleton.

  **Not fixed here, deliberately.** Plan 11-08 ships the pattern layer and adopts nothing; editing `booking-row.tsx` / `host-booking-row.tsx` / `request-row.tsx` / `payout-row.tsx` / `notification-item.tsx` is the adoption plans' scope, and changing a shipped row's height is a visible change that belongs in the commit that swaps the route. `patterns/row-card.tsx` carries `py-0` so the PATTERN measures the constant it claims, and the discrepancy dies as each route adopts it. Whoever picks up the adoption: the height is a **pure win at adoption** (rows shrink to the number the skeleton already draws), so no skeleton change is needed — but re-measure, because `RowCard`'s `actions` slot adds a `space-y-3` row when present and the 80px figure is the resting height only.

- **[11-09] `.planning/STATE.md`'s `<details>` tags have been unbalanced by two since before this plan — an out-of-scope pre-existing defect, recorded rather than fixed.** Measured at `HEAD` (`bde4d23`, plan 11-08's close) **before** any edit from this plan: **18 `<details` opens, 16 `</details>` closes.** After 11-09's status paragraph (one open + one close, added together) the file is at 19/17 — the same delta of two, so this plan neither caused it nor made it worse.

  **Why it matters at all:** every "Previous status" block in `## Current Position` is a collapsed `<details>`, and two unclosed opens mean two of those blocks are nested inside an earlier one rather than being siblings. On a GitHub render that hides a stale status paragraph behind *two* clicks instead of one, and — the sharper consequence — a reader who expands the newest block gets an older one expanded with it, which reads as if both are current. Nothing mechanical checks this: `STATE.md` is prose and no gate parses it.

  **Not fixed here, deliberately.** The SCOPE BOUNDARY rule: the imbalance is not caused by this plan's changes, and locating the two unclosed opens means reading ~600 lines of nine phases' status narrative and deciding which block each orphan belongs to — a judgement call about someone else's prose, in a plan that ships three components and a design gate. Whoever picks it up: `node -e "const s=require('fs').readFileSync('.planning/STATE.md','utf8');console.log((s.match(/<details/g)||[]).length,(s.match(/<\/details>/g)||[]).length)"` is the whole measurement, and the likely culprits are the phase-transition edits that inserted a status block without its closer — bisecting `git log -p -- .planning/STATE.md` on that one-line probe finds the introducing commit in a few steps.

- **[11-04] OPEN DECISION — three fail-closed boot guards lack the `NEXT_PHASE` build exemption that two sibling guards already have, so `npm run build` cannot run on a fresh clone.** Found by the first CI run this repository has ever had (`31697376606`), where `gate-db-free` died at page-data collection with `BETTER_AUTH_SECRET is not set … Failed to collect page data for /api/cloudinary/sign`. Latent for 167 commits; **no local run could have surfaced it**, because `next build` sets `NODE_ENV=production` (arming every production boot guard) and a developer laptop only passes by having dotenv inject 16 keys from `.env.local`.

  **The class, from an AST scan of all 230 files in `src/` (module-scope statements only — a throw inside a function body is not a boot guard):**

  ```
  src/app/api/inngest/route.ts:30          INNGEST_SIGNING_KEY       exempt  — NEXT_PHASE clause present
  src/lib/paymongo.ts:39                   PLATFORM_WALLET_*         exempt  — NEXT_PHASE clause present
  src/lib/auth.ts:43                       BETTER_AUTH_SECRET        FIRES during next build
  src/lib/paymongo.ts:27                   PAYMONGO_SECRET_KEY       FIRES during next build
  src/app/api/paymongo/webhook/route.ts:36 PAYMONGO_WEBHOOK_SECRET   FIRES during next build
  ```

  **Why this is an implementation gap and not a design choice — two of the three already claim the contract in prose while their code enforces the opposite.** `src/app/api/paymongo/webhook/route.ts:34-35`: *"dev/test/build tolerate its absence (the mocked webhook suite sets it per-test and `next build` must not require prod secrets)"*. `src/lib/paymongo.ts:10-12`: *"In dev/test/build the placeholder in .env is tolerated so local setup, the fully-mocked test suite, and `next build` all pass"*. Neither sentence is true today. The two exempt guards show exactly what the fix looks like.

  **CONTAINED, NOT FIXED.** Plan 11-04 supplied three obviously-fake build-only placeholders on the `gate-db-free` job (`ci-build-only-placeholder-not-a-real-*`, none using a real credential prefix, none a GitHub secret). CI is green; **a fresh clone still cannot build**. The guards were deliberately NOT touched: each is a fail-closed security control (WR-03), and softening one to turn a red check green is the worst trade available — so this was raised as a Rule 4 decision rather than absorbed into a plan whose declared surface was `.github/workflows/ci.yml` alone.

  **Whoever picks this up:** the fix is to add `process.env.NEXT_PHASE !== "phase-production-build"` to the three FIRES rows, matching `src/lib/paymongo.ts:39` verbatim. It is a security control's production branch, so it wants a deliberate decision and a watched red, not a drive-by edit. Verify by reproducing the runner condition — move `.env.local` aside, run `npm run build` with **only** `DATABASE_URL` set, and watch it exit 0 **without** the CI placeholders. Beware the trap that cost a round-trip here: the build aborts at the FIRST guard across 7 parallel workers, and the order differs per machine (CI named `BETTER_AUTH_SECRET`, the same tree locally named `PAYMONGO_SECRET_KEY`, and neither named `PAYMONGO_WEBHOOK_SECRET`) — **the error message is a lower bound, not a list.** Enumerate with the AST scan, not by re-reading the log.

- **[11-11] `src/components/listing/listing-card.tsx` CANNOT render through `ResultCard`, and the reason is structural rather than stylistic — measured with the real HTML parser, not argued.** The UI-SPEC lists it under ResultCard's *Replaces* ("presentational core"), and plan 11-11's Task 1 required the swap. It was not done, on purpose.

  `ResultCard` is `<Link href>` **wrapping** the `Card` — the whole tile is one anchor — and `ResultCardProps` declares `href · media · mediaFallback · title · meta · price · badges` and nothing else: **no `children`, no `footer`, no `actions` slot.** `ListingCard` is a MANAGEMENT tile: it carries a `CardFooter` with an Edit link, an Availability link and two `ConfirmDialog` triggers (`<button>`), plus an inline `<Link>` inside the hours-missing notice. Every one of those would have to travel through a prop that renders *inside* the anchor.

  **What the parser does with that shape** (`jsdom`, the same parser a browser uses, fed the exact markup React would emit):

  ```
  anchors parsed: 6            ← ONE <a> was written
  button inside an <a>?  false
  outer anchor child count: A 0   ← the whole-card link ends up EMPTY
  ```

  The adoption-agency algorithm **shatters the single outer anchor into six**, hoists the nested anchor and the button out of it, and leaves the whole-card link with **zero children** — i.e. the tile stops being a link at all and the footer controls escape their container. The positive control (identical markup with the footer *outside* the anchor) parses to 2 anchors with the button intact, so this is the nesting, not the fixture. This is precisely threat **T-11-NESTEDACTION**, which plan 11-11's own register disposes as *mitigate*.

  **There is no in-plan repair.** Giving `ResultCard` a `footer` prop does not help: the footer must sit inside the `Card` and outside the `Link`, which requires `Card` to be the OUTER element — and moving `Card` outside kills `group-hover:bg-muted/40 group-hover:shadow-overlay`, because `group-hover:` needs the `group` (the Link) to be an ANCESTOR of the Card. Converting the tile to `RowCard`'s overlay-pseudo-element form instead would change the shipped DS-05 focus recipe that 11-11 is required to preserve byte-for-byte (it is one of the two new `CONTRAST_PAIRS` measurements).

  **Whoever picks this up — it is a UI-SPEC correction, not a coding task.** Either (a) drop `listing-card.tsx` from ResultCard's *Replaces* list and record that a tile with in-card controls is a different shape from a tile that is one link, or (b) decide at product level that the host tile becomes navigable (whole card → `/host/listings/[id]/edit`) and its controls move OFF the card — which is a Phase 14 host-surface decision, not a container swap. Do **not** resolve it by adding a fourth container: DS-11 says three.

- **[11-11] `notifications/notification-item.tsx` CANNOT render through `RowCard` either, for four independent reasons.** Also listed in the UI-SPEC's *Replaces* line, also not done.

  1. **`href` is nullable BY SECURITY DESIGN.** `safeHref()` refuses `javascript:`, `data:` and protocol-relative URLs, and a refused payload deliberately degrades to non-navigable static content (`notification-item.tsx:283-287`). `RowCard` requires an `href`. Satisfying the type would mean fabricating a destination the writer never wrote — the exact failure the render-side guard exists to prevent.
  2. **It is not a card.** It renders inside `<ul className="divide-y">` in a `PopoverContent` with `p-0` (`notification-bell.tsx:163-169`). `RowCard` renders a `Card` — `bg-card`, `ring-1 ring-foreground/10`, `rounded-xl` — so adoption would stack up to 20 ringed, rounded cards inside a dropdown, separated by divider lines.
  3. **The row root carries state.** Unread is a `bg-muted` tint ON THE ROW plus a 6px brand dot; `RowCard` exposes no root `className` and its `media` slot is a 48px `bg-muted rounded-md` box, which is not what a 2px dot rail and a 16px icon are.
  4. **The link takes an `onClick`.** `onSelect` fires the mark-read write in parallel with navigation; `RowCard`'s internal `Link` accepts no handler.

  Forcing it would require optional `href`, `onClick` passthrough, root `className` passthrough and a way to suppress the Card chrome — at which point `RowCard` is no longer a card and the app has a fourth container wearing the third one's name. **Raised as the scope alarm plan 11-11 asks for**, rather than absorbed. The honest fix is a UI-SPEC correction: a notification row is a list item in an overlay panel, not a list CARD.

- **[11-11] The `[11-03]` duplicate-node defect reproduces on a SECOND page, and a stale dev server is a distinct e2e failure class that has been mistaken for flakiness.** Two corrections to how Phase 11 has been reading red e2e runs, both measured while verifying this plan.

  **(a) The duplicate node is not confined to the confirmation page.** `e2e/cancel.spec.ts:241` fails with the identical shape `[11-03]` recorded at `search-and-book.spec.ts:318`:

  ```
  strict mode violation: getByText(/refund on its way/i) resolved to 2 elements:
      1) <p class="text-sm tabular-nums text-muted-foreground">₱500.00 refund on its way</p>
      2) <p class="text-sm tabular-nums text-muted-foreground">₱500.00 refund on its way</p>
  ```

  `src/app/(app)/bookings/[id]/page.tsx:487` renders that line ONCE, from one expression, with no branch that could emit it twice. **Non-determinism confirmed by repetition rather than assumed:** the same spec was run three times on the identical tree and went **pass · fail · pass**; the pre-plan tree passed one run, which is why a single green run is not evidence of anything. This strengthens `[11-03]`'s streaming hypothesis — the same fingerprint on two unrelated pages is a framework behaviour, not two coincidental product bugs. Whoever tests it: a production build (`npm run build && npm start`) is still the cheap discriminator, and it now has two reproductions to try instead of one.

  **(b) A STALE `next dev` process 500s every route, and Playwright silently reuses it.** `playwright.config.ts:113` sets `reuseExistingServer: !process.env.CI`, so a dev server left running from an earlier session serves the whole suite. One had been up long enough for its render workers to die:

  ```
  ⨯ Failed to generate static paths for /listings/[id]:
  Error: Jest worker encountered 2 child process exceptions, exceeding retry limit
  ```

  Every request to `/listings/[id]` returned **HTTP 500** — reproducible by `curl`, and it made `public-listing.spec.ts` fail on a DIFFERENT test on each run (`:116`, then `:97`), which reads exactly like flakiness. `taskkill /PID <pid> /F` followed by a fresh Playwright-started server turned 2 failed / 3 did not run into **6 passed**. Whoever debugs a red e2e run: **check for a pre-existing dev server before attributing anything to the tree** — `.next/dev/logs/next-development.log` holds the worker-crash line, and a 500 on a route whose page source cannot throw is the tell. Some share of the "e2e is flaky on this box" history is likely this.

- **[11-12] `e2e/open-capacity.spec.ts:376` (D-6 item 1 / `[11-03]` failure 1) is STILL red on 14 Aug 2026, its date has rolled to `Monday, Aug 17`, and it is NOT the stale-dev-server class `[11-11](b)` describes.** Three new pieces of evidence, all measured while verifying plan 11-12:

  **(a) The failure is date-relative, and the assertion moved with the clock.** `[11-03]` recorded it as *"the `Saturday, Aug 15` panel heading"* on 13 Aug; today the identical assertion reads:

  ```
  Locator: getByRole('heading', { name: 'Monday, Aug 17' })
  Expected: visible          Error: element(s) not found
  at e2e/open-capacity.spec.ts:404:80
  ```

  `spotsDate = dayAt(offset)` with `offset = 3`, so the target is always "three days from now" and the weekday changes daily. Worth noting alongside 11-10's report that `open-capacity` passed **8 passed** in isolation on 13 Aug: if that run is trustworthy, the spec passes on some weekdays and fails on others, which is a much sharper lead than "flaky".

  **(b) `pickDay()` silently does not select.** Playwright's `error-context.md` snapshot shows the calendar still on the DEFAULT selection after the click — `gridcell "Today, Friday, August 14th, 2026, selected" [selected]` — while `button "Monday, August 17th, 2026"` is present, in-month and ENABLED in the same grid. So the locator resolved and the click did not throw; the selection just never moved. That is a click-lands-before-hydration / re-render-resets-state shape, not a missing element, and it is the thing to instrument next (`pickDay` at `e2e/open-capacity.spec.ts:364`).

  **(c) NOT the stale-server class, and NOT plan 11-12.** Two controls, both run today:
  - **Fresh server:** the long-running `next dev` on :3000 was killed (`taskkill /PID 18380 /F`, port confirmed dead) and Playwright started its own. Identical result — `1 failed / 5 did not run`, same test, same assertion. `[11-11](b)`'s dev-server hypothesis is excluded for this one.
  - **Pre-plan tree:** all five files plan 11-12 touches were reverted with `git checkout 7c8ef6b -- …` and the spec re-run. **Identical result.** Restored and re-verified afterwards. Three consecutive runs on the current tree produced the same failure, so this is reproducible rather than flaky — which makes it the most tractable of Phase 11's red e2e specs and the one worth taking first.

- **[11-13] `/listings/[id]` throws a REAL, NAMED React hydration error on every dev-mode load, and it is the first direct evidence for `[11-03]`/`[11-11](a)`'s duplicate-node hypothesis.** Found in the Playwright `[WebServer]` log while verifying this plan's rail conversion; **pre-existing**, and proven so with a control (see below).

  ```
  Uncaught Error: Hydration failed because the server rendered HTML didn't match the client.
  As a result this tree will be regenerated on the client.
        <Primitive.button.SlotClone aria-describedby={undefined} data-state="closed" ...>
  +       <span tabIndex={0} className="inline-block w-full" …>      ← what the CLIENT rendered
  -       <p className="text-center text-xs text-muted-foreground">  ← what the SERVER sent
      at PublicListingPage (src/app/listings/[id]/(detail)/page.tsx:464:21)
      at TooltipTrigger (src/components/ui/tooltip.tsx:30:10)
  ```

  The two trees disagree about **how many children the booking rail has before the tooltip trigger** — the client puts the `Not bookable yet` trigger where the server put the rail's closing reassurance line, i.e. the child list is offset by one. React's stated remedy is the interesting part: *"this tree will be regenerated on the client"*, which is exactly the mechanism that would leave a streamed node and a reconciled node in the same document. `[11-03]` and `[11-11](a)` both recorded `strict mode violation: … resolved to 2 elements` with two byte-identical `<p>`s from a source site that renders once, and both hypothesised Next's dev-mode streaming without being able to name a mismatch. Here the mismatch is named, on a third page.

  **NOT caused by plan 11-13, and that was measured rather than assumed.** `src/app/listings/[id]/(detail)/page.tsx` alone was reverted with `git checkout -- …` and `e2e/public-listing.spec.ts` re-run against the otherwise-unchanged tree: **`grep -c "Hydration failed"` = 1, identical to the run with the `PanelCard` conversion in place.** The plan's version was restored and re-verified afterwards. The spec passes in both directions (4 passed), because a regenerated tree still ends up correct — which is precisely why this has survived unnoticed.

  **Not fixed here, deliberately** (SCOPE BOUNDARY): the rail's contents are untouched by this plan, the defect predates it, and diagnosing a server/client child-count divergence across `RailSelectionSummary` / `RailPassSummary` / `CancellationPolicyDisclosure` / the `TooltipProvider` branch is a debugging plan, not a container swap. **Whoever picks it up:** this is the cheapest reproduction Phase 11 has of the duplicate-node class — one `npx playwright test e2e/public-listing.spec.ts --project=chromium` and one grep, no date arithmetic and no flake — so rule the streaming hypothesis in or out HERE rather than on the confirmation page. `npm run build && npm start` remains the discriminator: if the mismatch disappears in a production build, `[11-03]`'s two duplicate-node e2e failures are dev-mode artefacts and the fix is in the specs' locators, not in the pages.

- **[11-19] `src/app/not-found.tsx` is a SIXTH footer site, and plan 11-14 only knows about five.** 11-14's `files_modified` wires `SiteFooter` into the five group layouts (`(public)`, `(auth)`, `(app)`, `(host)`, `listings/[id]/(detail)`). The root not-found renders ABOVE all five of them — it sits directly inside `src/app/layout.tsx`, which plan 11-10 deliberately left free of chrome — so it composes its own `SiteChrome` and, today, no footer at all. `src/components/patterns/site-footer.tsx` does not exist yet: 11-14 is wave 7, `autonomous: false`, and has not run, while this plan is wave 9 and did. Inventing a footer here would have forked the component 11-14 owns along with its `SUPPORT_EMAIL` / D-26 inverted gate, so the file carries the header only and says so in its header.

  **Whoever runs 11-14:** add `<SiteFooter />` to `src/app/not-found.tsx` (inside the existing `flex min-h-dvh flex-col` wrapper, after `<main>`, exactly like the five layouts) and keep it DB-free — that file is the last `○ Static` route in the build and the reason is written at the top of it. This plan's acceptance criteria included "the root not-found renders exactly one `site-footer`"; it renders **zero**, measured, and this is why.

- **[11-19] A `notFound()` boundary is CLIENT-rendered in this app; an unmatched URL is server-rendered.** Measured with `curl` against `next start` (Next 16.2.7, production build, plan 11-19):

  | URL | status | initial HTML |
  |-----|--------|--------------|
  | `/nope` | 404 | the root not-found, fully server-rendered (header + panel + copy) |
  | `/listings/does-not-exist/extra` | 404 | same — unmatched URLs are server-rendered |
  | `/listings/does-not-exist` | 404 | `<html id="__next_error__">`, **no header and no panel**; `(detail)/not-found.tsx`'s markup is in the flight payload and renders after the client boots |

  Same shape in `next dev`, and it is **not** caused by the new file — there was no not-found boundary in the tree at all before this plan, so the same shell was already what that URL served. The likely mechanism: the page raises the signal during a render whose layout has already begun streaming the `<Suspense>` shell for the header's auth slot (plan 11-10), leaving no un-sent HTML to replace.

  **Consequence:** a visitor with scripting disabled gets a blank page with a correct status on `/listings/<gone>`. **Not fixed here, deliberately** — the only in-app remedy is to return the panel from the page instead of calling `notFound()`, which serves a 2xx for a listing that is gone and tells crawlers to keep the URL (D-13 says the opposite). Whoever picks this up: check whether it survives a layout without a streamed auth slot, and whether Next 16.3+ server-renders these boundaries.

- **[11-14] `e2e/search-and-book.spec.ts:318` is a PRE-EXISTING flake, and the near-misattribution is the finding.** The `directly-seeded confirmed booking → the durable confirmation` test fails intermittently with a strict-mode violation: `getByText(<reference>, { exact: true })` resolves to **2** `<p class="text-2xl … tabular-nums …">` elements after `page.reload()`. It failed on the first run of this plan's prescribed e2e command, immediately after `<SiteFooter />` was wired into `src/app/(app)/layout.tsx`, and one control run with the footer removed passed — which looked exactly like a regression this plan had just introduced.

  **It is not.** The spec was instrumented with a temporary DOM dump between the reload and the failing assertion (added, measured, reverted — the spec is byte-identical to its committed form) and the tree was run in both configurations:

  | configuration | runs | duplicate observed | shape at failure |
  |---|---|---|---|
  | `<SiteFooter />` in `(app)/layout.tsx` | 3 | 1 of 3 | `refP:2 main:3 footer:1 hidden:3` |
  | footer removed | 4 | **2 of 4** | `refP:2 main:3 footer:0 hidden:3` |

  The duplicate is **`<div hidden="" id="S:1">`** holding a second copy of the page's `<main>` — React's streaming buffer for the segment's Suspense boundary, captured before the inline swap script removed it. It is not a hydration mismatch (`data-testid="site-footer"` and `site-header"` are 1 each in the captured DOM), it is never visible to a user, and `hidden` is irrelevant to Playwright's `getByText`, which is what makes the assertion strict-mode-fragile rather than the page wrong.

  **Not fixed here, deliberately** (SCOPE BOUNDARY): the defect is in a spec's locator on a page this plan does not touch, it predates the footer by the measurement above, and `e2e/**` is outside this plan's `files_modified`. **Whoever picks it up:** the fix is a locator that tolerates the streaming buffer (`.locator("main:not([hidden] *)")` scoping, or `.first()` with an explicit count assertion), not a change to `bookings/[id]/page.tsx`. This is the same duplicate-node class as `[11-03]` and `[11-13]`'s entries above, now with a captured DOM and a named mechanism — and it is the third phase-11 instance of *a single e2e result being read as proof*.

- **[11-14] `NEXT_PUBLIC_APP_URL` is unset, so every share URL this milestone ships resolves to `localhost` — and plan `11-20` is the one that will not notice.** `src/app/layout.tsx:52` declares `DEFAULT_APP_URL = "http://localhost:3000"` and `resolveMetadataBase()` (`:95-102`) falls back to it whenever the env var is absent, blank, unparseable, or not `http(s)`. It is absent. `metadataBase` is therefore `http://localhost:3000` on every machine, and every RELATIVE `openGraph.images` entry resolves against it.

  **Carried as a named `human_needed` item on phase completion** rather than papered over with an invented origin — FitOut owns no domain, so there is no honest value to put here (T-11-OGBASE, disposition `accept`; the same reasoning D-26 applies to `SUPPORT_EMAIL`, whose slot is item 1 of the same pair).

  **⚠ FORWARD-WARNING, ADDRESSED TO WHOEVER RUNS `11-20`.** That plan owns SHELL-04 — *make a pasted FitOut link unfurl correctly* — and its acceptance criteria include "the image responds 200 at 1200×630". **A green local check is not proof that the unfurls work.** Against `localhost:3000` every `og:image` URL it emits will be `http://localhost:3000/...`, which is 200 on the author's machine and unreachable to Slack, Messenger, Viber, X and every other crawler that will ever fetch it. The two are indistinguishable from inside the repo.

  So 11-20 should: (a) assert the **shape** is correct **given the configured origin** — that the emitted URL is absolute and equals `new URL(path, metadataBase).href` — rather than asserting a literal host; (b) record in its own SUMMARY that end-to-end unfurl verification is **blocked on this item**, not merely untested; and (c) resist the reflex to hardcode a plausible production origin to make a check go green. That is the same fabrication D-26 refused for the support address, arriving through the metadata layer instead of the footer. `resolveMetadataBase()` already degrades safely for a malformed value (WR-05/WR-12) — the gap is a missing value, not a broken guard.

- **[11-16] `src/components/search/search-results.tsx`'s first dashed block is an ERROR, not an empty state, and plan `11-18` owns the decision that unblocks it.** Plan 11-16 listed `search-results.tsx:170` as one of its eight `EmptyState` conversion sites. It is the shipped inline fetch failure — `role="alert"`, *"Something went wrong loading spaces"*, one `Try again` that calls `router.refresh()` — and `src/components/patterns/error-state.tsx:57` names those exact lines as the markup `ErrorState` was extracted FROM. **Not converted, deliberately.** Rendering a failure through `EmptyState` would announce *"there is nothing here"* about a search that never ran, which is the precise inversion of the `T-11-FALSEALARM` rule the same plan enforces on `/host/requests` — a design gate cannot buy its own adoption count by making a failure look like an absence.

  **It is not converted to `ErrorState` either, and that is the deferred half.** `ErrorStateProps.routeOut` is **required** (`error-state.tsx:88-94`) with the deliberate intent that an error surface always offers two actions: retry, and a way out of the failure. *Where a failed search sends you* is a product decision — back to the city landing, to a cleared-filter search, to the host side — and it belongs to the five error boundaries plan **11-18** owns, not to a container swap. Guessing it here would fork the answer 11-18 has to give five times.

  **Whoever runs 11-18:** this block is a sixth call site for the same decision, and converting it is a two-line change once `routeOut` has an answer. It is carried in the meantime as a declared, reasoned row in `NON_EMPTY_STATE_DASHED` (`tests/design/empty-state-adoption.test.ts`) with an asserted site count, so it is an exclusion with an argument rather than a hole — and the count assertion means the block cannot quietly grow a sibling while the decision is pending.

- **[11-16] The 11-UI-SPEC's empty-state inventory is wrong in five places, and every one of them was found by an AST scan rather than by reading.** Recorded as one item because the *shape* is the finding, not any single miscount. The spec describes TWO drifted shells over eight sites; the tree had **20** `border-dashed` call sites, **nine** of them convertible empty blocks:

  | the spec / the plan said | measured |
  |---|---|
  | 19 dashed sites total | **20** — `patterns/error-state.tsx` landed in 11-09, after 11-16 was written |
  | 8 convertible empty blocks | **9** |
  | `/host/earnings` has "no empty state today" and needs one AUTHORED | it has shipped one since Phase 5 — a **conversion**, and its existing copy already explains the hold-until-session payout model (D-72) better than a rewrite would |
  | `(host)/host/page.tsx` is an out-of-scope dashed site to EXCLUDE | it is a real empty block, in a **THIRD** shell variant the two-shell table never named: `rounded-lg` like shell B but `p-8` like shell A, and a body with no `mx-auto max-w-prose`, so its text ran the full panel width where the other seven wrapped at a prose measure |
  | "the 11 extras" to declare as exclusions | the plan's own list enumerated **10** items |

  Two further inventories were wrong on the first RUN of the new gate: there are **13** `<EmptyState>` call sites in the tree, not the 11 this plan creates (plan **11-19** landed two not-found routes on the shell after 11-16 was written), and a tree-wide `bg-success` ban goes red on `src/lib/design/contrast-pairs.ts:250` — the `note:` string that *declares the rule the assertion enforces*. Both are now declared data in `tests/design/empty-state-adoption.test.ts` (`ADOPTERS`, `BG_SUCCESS_SCOPE`).

  **Nothing here is deferred work** — all nine blocks were converted and all five corrections are carried in the gate. It is logged because it is the **sixteenth** consecutive Phase-11 instance of a plan's own surface inventory being wrong, and because two of the corrections (`/host/page`, the 11-19 not-found routes) are files that plans **11-17** and **11-18** also inventory. Whoever runs them: enumerate with an AST scan first and expect the plan's number to be wrong.

- **[11-20] Two Next 16 metadata landmines, both of which make the THOROUGH-looking edit the broken one.** Neither is deferred work — both are fixed in this plan — but both are shaped to be reintroduced by the next person who touches metadata, and neither is detectable by reading.

  **(1) Declaring `openGraph` at all DELETES the file-convention share card.** Measured on Next 16.2.7, `/listings/seed_listing_1`, with `opengraph-image.tsx` in place and nothing else changed between the two runs: `openGraph: { type: "website", description }` emits `og:title`, `og:description`, `og:type` and **no `og:image`, no `og:image:width/height/type/alt`**, and downgrades `twitter:card` from `summary_large_image` to `summary`. With the key ABSENT, Next derives `og:title`/`og:description` from the two top-level fields and supplies all eight image tags for free. Declaring the key replaces the resolved object, and the file convention merges into it only while it is undefined — so the edit that adds tags is the edit that removes the card, and it looks strictly more complete. Anyone adding `og:type`, `og:locale` or `og:site_name` to a route that has a card must also re-declare `images`, or lose it.

  **(2) The officially documented font load for an OG route does not work on the Node runtime.** Next's own docs (and this plan's own instructions) say `fetch(new URL("./X.ttf", import.meta.url)).then(r => r.arrayBuffer())`. `new URL(...)` resolves to a `file://` URL, Node's `fetch` (undici) does not implement the `file:` scheme, and the call rejects with `fetch failed` — which is not an error anybody would connect to a font. Every card then renders in `next/og`'s bundled fallback face, at weight 400 only, silently. The fix is to keep the `new URL` (it is what makes Turbopack emit and hash the asset) and read it with `fs.readFile(fileURLToPath(url))`. Verified in dev AND against `next start`.

- **[11-20] The three OG routes are excluded from plan `11-22`'s theme-swap smoke, and the reason is that there is no swap to observe.** A server-rendered image has no user, no `data-theme` and no `prefers-color-scheme` — the scraper fetching it is not a browser session — so all three cards paint `court` unconditionally, exactly as `global-error` does. This is a documented impossibility rather than a missed surface, and it is stated in `src/app/opengraph-image.tsx`'s header so 11-22 finds the reason at the file rather than the absence in a checklist. **11-22 should also know** the invite card's URL carries a route-group hash: `/invite/<token>/opengraph-image-ikagei`, not `/opengraph-image`. Next's `getMetadataRouteSuffix` (`node_modules/next/dist/lib/metadata/get-metadata-route.js`) appends a 6-character djb2 hash of the parent path whenever ANY parent segment is a route group or a parallel route — so plan 11-10's `(public)` group is what puts the suffix there, `listings/[id]` has none, and any test or script that hardcodes the unsuffixed path gets a 404.

- **[11-15] `/terms` and `/privacy` render the ANONYMOUS header, so a signed-in reader sees `Log in` / `Sign up` on two routes reachable from every page's footer.** Not a bug and not an oversight — a measured either/or with no third option, recorded here so a later phase can flip it deliberately rather than discover it.

  `src/components/site/public-header.tsx` resolves its actions cluster from the request, which is a prerender bailout. **Measured both ways on this tree** (`npm run build`, unreachable `DATABASE_URL`, route table diffed mechanically):

  | `(legal)/layout.tsx` renders | `/terms` | `/privacy` | static routes in the build |
  |---|---|---|---|
  | `SiteChrome` + `AnonymousAuthActions` (shipped) | `○` | `○` | **5** (3 pre-existing, unchanged) |
  | `PublicHeader` | `ƒ` | `ƒ` | **3** — both lost |

  The blast radius of the dynamic form is confined to these two routes, UNLIKE the root not-found where 11-19 measured a single dynamic composition taking the whole build's prerendering with it. So the cost is genuinely local, and it is the identity drift `public-header.tsx:82-85` calls *"the problem this phase exists to end"*, on two routes. It was traded for the UI-SPEC's explicit "fully static" requirement and T-11-STATICLEAK's mitigation, on the grounds that the reader these pages exist for is anonymous — the footer link that matters most is the one on `/signup`. **There is no third option:** a client-side session fetch is banned outright by T-11-SESSION, and a request-time read IS the bailout.

  **Whoever revisits it:** the flip is a two-line edit in `src/app/(legal)/layout.tsx` plus re-measuring the route table. The honest alternative is not "make it dynamic" but *decide which of the two costs this product prefers*, with the numbers above in front of you.

- **[11-15] `SiteChrome brand="FitOut" brandHref="/" actions={<AnonymousAuthActions />}` is now written TWICE, and the second copy is this plan's.** `src/app/not-found.tsx:106` and `src/app/(legal)/layout.tsx:80` render the byte-identical three props for the byte-identical reason (both must stay prerendered, so neither can reach the request). That is a fourth independently-drifting header composition waiting to happen — the exact failure `anonymous-auth-actions.tsx:1-13` was extracted to prevent one layer down.

  **Not extracted here, deliberately** (SCOPE BOUNDARY): `src/app/not-found.tsx` is outside this plan's `files_modified`, and a new `patterns/` module is not something a two-page plan should add on its way past. **Whoever picks it up:** the extraction is ~15 lines — a `StaticPublicHeader` beside `anonymous-auth-actions.tsx`, with both call sites swapped in one commit — and the one thing it must preserve is that the module reaches nothing async and nothing that touches the data store, which is the whole reason both sites hand-compose today. `tests/design/empty-state-adoption.test.ts:411` pins `not-found.tsx` by path, so a move of that FILE would need a row update; an edit inside it would not.

- **[11-15] `human_needed` — the real Terms of Service and Privacy Policy, and the six business facts neither can be written without.** The two pages this plan ships are placeholders that say so, in the loudest form the design system has, and the two assertions in `tests/design/legal-copy.test.ts` are tied to that admission by AC#4. **What is missing is not code.**

  Undecided, and unfabricatable — every one of these is a factual claim about a real business that this repository cannot answer, and inventing any of them is D-26's fabrication arriving through the legal layer:

  1. **The legal entity.** Which company stands behind FitOut, and its registration.
  2. **The registered address.**
  3. **Governing law and forum.** Which country's law applies and where a dispute is heard. (The project is PH-first — PayMongo is a BSP-regulated EMI and the launch market is a single PH city — but "probably the Philippines" is an inference, not a decision, and a governing-law clause is exactly the wrong place to infer.)
  4. **A monitored contact address.** The same slot as 11-14's `human_needed` #1 (`src/lib/site.ts`'s `SUPPORT_EMAIL`, still `null`), needed a second time here for data-subject requests.
  5. **A retention schedule.** How long each category of record is kept, including what a payment history is held to by law.
  6. **A named data contact / supervisory authority.** Who answers privacy questions, and which regulator a complaint goes to.

  **Also required, and it is not a fact-gathering exercise: review by a qualified person.** Nobody who wrote these pages is qualified to give legal advice, and both files say so in their own headers. The published documents need a lawyer — this plan's contribution is that the placeholders cannot be mistaken for them, not that they are nearly right.

  **When the real documents arrive:** replace both page bodies AND delete `tests/design/legal-copy.test.ts` **in the same commit** (AC#4). The gate names both files and states the rule from its own side; the pages state it from theirs. Do not delete either half alone.
