---
status: secured
phase: 12
phase_name: booker-path-search-listing-checkout
asvs_level: 1
block_on: high
threats_total: 102
threats_mitigated: 102
threats_open: 0
threats_unverified: 0
threats_accepted: 5
unregistered_flags: 0
warnings: 3
audited_at: 2026-08-20
audited_head: 4c689c0
phase_base: 320723d
---

# Phase 12 — Security Verification

**Verdict: SECURED.** Every one of the 102 threat IDs declared across the fifteen
`12-NN-PLAN.md` `<threat_model>` blocks resolves to CLOSED. Zero threats are open.
Zero threats went unreached — see [Depth of verification](#depth-of-verification) for
exactly how hard each one was pushed, which is a different claim from "all verified
equally".

Three WARNINGs are recorded. None blocks the phase; all three are verification-hygiene
defects rather than missing controls, and each names the artefact that would have to
change to clear it.

- **Register:** 102 unique IDs — 97 `mitigate`, 5 `accept`, 0 `transfer`.
- **Config:** `security_asvs_level: 1`, `security_block_on: high`.
- **Range audited:** `320723d` (pre-12-01 plan commit) → `4c689c0` (HEAD).

---

## Depth of verification

The register was deliberately not swept uniformly. Three tiers, declared up front:

| Tier | What it covers | Count | How it was verified |
|------|----------------|-------|---------------------|
| **1 — deep** | money, authz, injection | 18 | Read the implementing code end-to-end and the enforcing test. Diffed the money path across the whole phase. Did not accept the code review's prior. |
| **2 — deep** | CI write path, supply chain | 35 | Read both workflow files, read `verify-workflows.mjs`'s 38 invariant names, **ran** the verifier at HEAD, diffed `package.json`/`package-lock.json` across the phase. |
| **3 — spot** | a11y, copy drift, layout, motion | 49 | Located the constant/component AND the committed assertion that pins it. Assertion **bodies** read for the starred rows; for the rest the assertion's existence, name and target file were confirmed but its interior was not re-derived. |

**The honest limit of tier 3:** for the spot-checked rows I confirmed a real, named,
committed assertion exists over the right file. I did not independently re-derive that
each assertion is non-vacuous. That risk is materially reduced — but not eliminated —
by this phase's own guard-the-guard discipline (`T-12-01-VACUOUS`, `T-12-06-VACUOUS`,
and the `describe("guard-the-guard", …)` blocks in `price-surface.test.ts`,
`live-regions.test.tsx`, `infra.test.ts`, `sheet-absent.test.ts`), which is itself in
the register and was verified.

---

## Tier 1 — money, authorisation, injection

Verified against the code, not against SUMMARY claims. The prior from `12-REVIEW.md`
(1 Critical + 3 Warnings, all fixed; no reintroduced double-booking race, no
client-trusted price or time, no injection vector on the money path) was **re-derived,
not inherited**.

### The single most load-bearing fact

`git diff --stat 320723d..HEAD -- src/app/actions/booking.ts src/lib/availability/units.ts src/lib/availability/open-capacity.ts src/app/actions/availability.ts src/lib/payments/ src/app/api/paymongo/`
returns **empty**. The entire hold/confirm/charge/arbitration path is byte-unchanged
across all fifteen plans. Phase 12 moved rendering, not authority. That single diff
discharges the "unchanged by this plan" half of six separate threats, and it was run
rather than assumed.

| Threat ID | Category | Disp. | Verdict | Evidence |
|-----------|----------|-------|---------|----------|
| `T-12-11-DOUBLECHARGE` | Tampering | accept | CLOSED | Compare-and-swap checkout lease `src/app/actions/booking.ts:851` (`claimCheckoutLease`, autocommit, committed before the first PayMongo fetch); expire-before-create `booking.ts:909`; both byte-unchanged this phase. The `disabled`/`aria-disabled` pair is stated as a courtesy at the call site, `src/components/booking/reserve-actions.tsx:34,92`, which also records that PayMongo does not honour `Idempotency-Key` on `/v1/checkout_sessions`. Accepted-risk entry AR-1 below. |
| `T-12-10-DOUBLEHOLD` | Tampering | mitigate | CLOSED | `src/components/booking/booking-sticky-bar.tsx:77` imports `BookCta`; `:210` mounts it. The bar has **no** action import of its own — one submission path, so the checkout lease and the GiST `EXCLUDE` remain the only authorities. |
| `T-12-12-SQLI` | Tampering | mitigate | CLOSED | Every rung in `src/lib/search/relaxation.ts:96-140` returns a `SearchParams` **object**; the runner is injected (`page.tsx:136` binds `searchListings`). No rung builds a predicate string. `src/lib/search/query.ts:196-230` binds `lng`/`lat`/`radiusMeters`/`category`/`priceMax`/`picked.iso`/`fetchLimit`/`offset` through Drizzle `sql` templates; `orderBy` is a fixed fragment chosen by ternary, never interpolated. `picked.iso` is `parsePickedDate`'s canonical literal, never the raw param, before the `::date` cast. |
| `T-12-03-HOLDIDOR` | Info. disclosure | mitigate | CLOSED | Three `notFound()` calls survive in `src/app/listings/[id]/book/page.tsx` — session gate `:72`, owner gate `:111` (`bk.bookerId !== userId`), path-id cross-check `:115` (`bk.listingId !== id`). `book/layout.tsx` fetches **nothing** (composes `HoldProvider` + `SiteChrome` only). `hold-provider.tsx:59-61` carries exactly `expiresAt: string \| null` and `expired: boolean`. |
| `T-12-03-CLIENTAUTH` | Elev. of privilege | accept | CLOSED — see W-2 | Server guards confirmed: status gate `booking.ts:757`, D-94 session cutoff `:795-806` using **Postgres** `now()` not the JS clock, rate limit `:810`, lease `:851`. A lapsed hold is flipped to `cancelled`/`declined` by the in-transaction sweep `src/lib/availability/units.ts:487-491`, which the status gate then catches. |
| `T-12-04-PRICECLIENT` | Tampering, Repud. | mitigate | CLOSED | `fee = allInCents - spacePriceCents` is computed inside the guarded `src/lib/booking/all-in-table.ts` (`parts()`), from one `computeServiceFee` call; the client receives three finished integers. Enforced by `tests/design/price-surface.test.ts` §3 (AST zero-arithmetic walk over `price-breakdown.tsx` **and** `availability-calendar.tsx`) and by `tests/design/server-only-guards.test.ts`, which requires `all-in-table.ts` to import `@/lib/payments/service-fee` and that module to carry `import "server-only"`. |
| `T-12-05-STALEPRICE` | Repudiation | mitigate | CLOSED | `src/components/booking/rail-rate-headline.tsx` + `availability-calendar.tsx:948` — the all-in headline is removed the moment a selection exists, so the panel never shows two correct rates at once. |
| `T-12-13-STALEPRICE` | Repudiation | mitigate | CLOSED | `availability-calendar.tsx:979-993`: with `selection === null` and `collision !== null` the summary renders `No time selected` and the breakdown is **absent**, not zeroed. |
| `T-12-12-CLIENTFILTER` | Tampering | mitigate | CLOSED | The ladder runs in the RSC — `src/app/(public)/page.tsx:131-137`. `src/components/search/search-results.tsx` contains **zero** `filter(` / `sort(` / `slice(` calls (grepped). |
| `T-12-02-PARAMTAMPER` | Tampering | mitigate | CLOSED | `searchedWindowSchema` `src/lib/validation/booking.ts:164-180` — every field optional, every value through `parsePickedDate`/`parseWindowHour`, partial windows discarded whole. `tests/validation/search-window.test.ts` case (5): garbage yields no window rather than a throw. |
| `T-12-12-PARAMTAMPER` | Tampering | mitigate | CLOSED | `relax: z.coerce.number().int().min(0).max(1).default(1)` — `src/lib/validation/booking.ts:115`. `page.tsx:76-77` `safeParse` → `searchParamsSchema.parse({})` fallback; a crafted `relax=99` or `relax=abc` yields the default view, never a clamp downstream and never a throw. |
| `T-12-11-HIDDENTOTAL` | Repudiation | mitigate | CLOSED | `src/components/booking/price-breakdown.tsx:330` — `PriceDisclosure` wraps `{items}` **only**; the `Separator`, `Total` (`:339`) and trailing line are outside the ternary entirely. Byte-equality with the sticky bar asserted in `e2e/mobile-booker-path.spec.ts:352-378`. |
| `T-12-13-PRECHECK` | Tampering | mitigate | CLOSED | The three files are byte-unchanged (diff above). `drizzle/0022_booking_exclusion_v3.sql` still carries the GiST `EXCLUDE` over `tstzrange(starts_at, ends_at, '[)')` per `(listing_id, unit)`, `WHERE status NOT IN ('cancelled','declined','completed') AND open_capacity = false`. No availability pre-check was added to the collision path — `slot-picker.tsx:83` and `availability-calendar.tsx:527` both restate that the recovery runs strictly **after** the constraint has ruled. |
| `T-12-13-CONSTRAINTLEAK` | Info. disclosure | mitigate | CLOSED | `mapBookingError` `src/lib/availability/units.ts:661-666` maps `NoUnitAvailableError \| 23P01 \| 40P01` to one fixed sentence and **re-throws** anything else. `collision-notice.tsx:121,153` renders that `ruling` verbatim. `grep -rn "23P01" src/components/` → no matches. `e2e/collision-in-place.spec.ts` asserts the code's absence from the whole DOM. |
| `T-12-08-PII` | Info. disclosure | mitigate | CLOSED | **Type-enforced**, which is stronger than the plan promised: `HostBlockProps = Pick<PublicProfile, "avatarUrl" \| "firstName" \| "bio" \| "createdAt">` — `src/components/listing/host-block.tsx:55-58`. `publicProfile()` `src/lib/profile.ts:54-62` is the allow-list. Call site `listings/[id]/(detail)/page.tsx:649-653` passes exactly those four plus the listing's own `bookingMode`. A widened field is a compile error. |
| `T-12-07-KEYLEAK` | Tampering | mitigate | CLOSED | `onKeyDown` is defined at `src/components/listing/photo-lightbox.tsx:312` and attached at `:339` to the dialog **content**. No `window.addEventListener` / `document.addEventListener` anywhere in the file. Negative case: `e2e/photo-lightbox.spec.ts:221` — "(b2) with the lightbox CLOSED, an arrow key on the page is not intercepted". |
| `T-12-05-RATELEAK` | Info. disclosure | mitigate | CLOSED — see W-1 | `POPOVER_BODY` `src/components/booking/service-fee-popover.tsx:76-78` contains no `%`, no rate, no figure. `e2e/price-one-fact.spec.ts:502-514` asserts it against the live DOM, **with a guard-the-guard first** ("contains no % is satisfied perfectly by an empty bubble"). |
| `T-12-04-FEELEAK` | Info. disclosure | mitigate | CLOSED — see W-1 | No **value** import of `SERVICE_FEE_BPS` or `computeServiceFee` exists anywhere under `src/components/` (grepped all `from "@/lib/payments…"` imports — the five hits are `config`/`cancellation` constants, not the fee). The rate is fenced by `import "server-only"` in `src/lib/payments/fees.ts` and `service-fee.ts`, pinned by `tests/design/server-only-guards.test.ts:168,175`, and enforced at build time by Turbopack in `npm run build` (which CI runs in `gate-db-free`). |

### Domain invariants re-checked directly

Both failure modes `PROJECT.md` names as unacceptable were checked against the code
rather than inferred from the register:

- **Double-booking.** The GiST `EXCLUDE` is intact and is still the sole arbiter for
  exclusive bookings. No check-then-insert was introduced: the phase's only new write
  surface is a second *mount* of the existing `BookCta`, not a second action. Open-capacity
  rows remain arbitrated by the advisory-lock admissions counter, with each mutation
  admitting exactly one occupancy mode (`booking.ts:203-207` and its mirror in
  `placeOpenHold`).
- **Timezone.** Every new time surface derives from the venue tz carried on the listing
  row — `book-cta.tsx:80-85` (`namedSelection`, `TZDate` + listing `timezone`),
  `availability-calendar.tsx` (`tz(timezone)`), `book/page.tsx` back-link
  (`format(…, { in: inTz })`). `window-params.ts` is isomorphic by construction and is the
  single implementation of "on the hour" shared by the search page and the listing page.

---

## Tier 2 — CI write path and supply chain

`scripts/verify-workflows.mjs` was **executed at HEAD**, not merely observed to exist:
`All 38 invariants hold across 3 section(s) (baselines=11, ci=20, cross=7)`.

The instruction to confirm the assertions genuinely cover the threats rather than
assuming the script discharges them was followed: all 38 invariant names were read and
mapped to threats individually, and both workflow files were read directly. Where a
threat's wording did not exactly match an invariant's wording, the workflow file itself
was the arbiter.

| Threat ID | Disp. | Verdict | Evidence |
|-----------|-------|---------|----------|
| `T-12-14-BASEMINT` | mitigate | CLOSED | Invariants "the ONLY trigger is workflow_dispatch (no push, no pull_request, no schedule)" (`:261`) and "exactly ONE run command contains `--update-snapshots`" (`:326`), both over the **parsed** tree. |
| `T-12-15-BASEMINT` | mitigate | CLOSED | "ZERO run commands in ci.yml carry `--update-snapshots`" (`:434`) counted across all four jobs including the new one, plus the cross-file "exactly ONE run command carries `--update-snapshots`, and it is in baselines.yml" (`:755`). |
| `T-12-14-CIWRITE` | mitigate | CLOSED | "workflow-level permissions.contents is 'read'" (`:268`), "job `generate-baselines` permissions.contents is 'write'" (`:275`), "exactly ONE job in this workflow holds contents: write" (`:284`), "a run command stages exactly the `*-visual-linux.png` glob" (`:357`). The staging step's `UNEXPECTED` check and `exit 1` were read in the parser's own dump. |
| `T-12-15-CIWRITE` | mitigate | CLOSED | "NO job in ci.yml holds contents: write" (`:397`) + "`gate-visual` holds no permissions: block" (`:593`). |
| `T-12-15-UNGUARDED` | mitigate | CLOSED | **The step exists.** `.github/workflows/ci.yml` → `gate-db-free` → `- name: Verify the workflow invariants (parse, not grep)` / `run: node scripts/verify-workflows.mjs`, in a job triggered by `push: [dev, main]` and `pull_request:`. The guard is no longer opt-in. |
| `T-12-14-CISECRET` | mitigate | CLOSED | "zero `secrets.` references in any env / run / with VALUE" (`:334`). Read directly: the only credentials in either file are fixed runner-local `fitout:fitout` and the three `ci-build-only-placeholder-*` build strings. |
| `T-12-15-DBREACH` | mitigate | CLOSED | `gate-visual` declares `postgis/postgis:18-3.6` with **no `ports:`** (label-addressed, `postgres://fitout:fitout@postgres:5432/fitout`), no `permissions:` block, and is destroyed with the job. Invariants `:446`, `:485`, `:525`, `:588`, `:593`. |
| `T-12-15-DBFREE` | mitigate | CLOSED | "the job that runs `npm run build` exists and declares NO services: (T-11-DBFREE)" (`:557`) — spelled by **role**, so it survives a rename. `gate-db-free` still carries `DATABASE_URL: postgres://unreachable:unreachable@127.0.0.1:59999/nope` and has no `services:` block. |
| `T-12-15-ADDR` | mitigate | CLOSED | Three-branch total function (`:516`/`:525`/`:533`) plus "the addressing rule covered at least one job — it is a total function, not an empty loop" (`:541`). The empty-loop guard is what makes this non-vacuous. |
| `T-12-15-SEEDDRIFT` | mitigate | CLOSED | Byte-identical `DATABASE_URL` (`:696`), migrate (`:712`), seed naming `scripts/seed-baseline-fixtures.ts` (`:721`), and "neither visual job runs `npm run build` before its playwright step" (`:736`). All four printed their compared values in the run output. |
| `T-12-15-VERDRIFT` | mitigate | CLOSED | "every container image in BOTH files is the same string and equals the installed @playwright/test" (`:673`) → resolved to the single value `mcr.microsoft.com/playwright:v1.60.0-noble` across four tags; service images (`:686`) → `postgis/postgis:18-3.6`. |
| `T-12-15-GREPGREEN` | mitigate | CLOSED | The guard parses (`yaml` AST, comments stripped before inspection). Both workflow headers record the six real `ci.yml` mutations watched failing **by invariant name** alongside the falsely-green substring control. |
| `T-12-15-CANCEL` | mitigate | CLOSED | "github.event_name is in the concurrency group" asserted in **both** files (`:296` and `:408`). Confirmed in source: `group: "${{ github.workflow }}-${{ github.ref }}-${{ github.event_name }}"`. |
| `T-12-14-PLATBASE` | mitigate | CLOSED | `playwright.config.ts:78` — `updateSnapshots: "none"`, unconditional, with the CLI-override path documented as the only sanctioned write. `tests/design/gitignore-baselines.test.ts` keeps `*-win32.png`/`*-darwin.png` uncommittable in both halves (rule-line presence **and** `git ls-files`). |
| `T-12-14-WRONGCARD` | mitigate | CLOSED | `e2e/visual/surfaces.spec.ts:466` — `.not.toBe(25_844)`, plus the durable second half at `:472` (`listingBytes !== rootBytes`), both asserted before any pixel comparison. |
| `T-12-14-CLOCKFLAKE` | mitigate | CLOSED | `surfaces.spec.ts:311` and `theme-swap.spec.ts:184` — `if (drive.needsClock) await page.clock.install()` **before** the first navigation, per Playwright's own caveat; `freeze.css` is the second layer. |
| `T-12-14-UNVERIFIED` | mitigate | CLOSED | Discharged 2026-08-19. Comparison run **32271124959** green across all four jobs; recorded at `12-14-SUMMARY.md:397,403,418`. Documentary evidence of the human checkpoint — the run itself was watched by the operator, not by this audit. |
| `T-12-14-SC` | mitigate | CLOSED | "every `uses:` is a first-party actions/* action" (`:347`/`:419`) — only `actions/checkout@v4` and `actions/setup-node@v4`. Image tag equals installed `@playwright/test` (`:304`/`:457`). `package.json` diff empty. |
| `T-12-15-SC` | mitigate | CLOSED | No third-party action added; `yaml` and `tsx` are reached as existing resolutions via `npx tsx`, the spelling `baselines.yml` already shipped. `git diff --stat 320723d..HEAD -- package.json package-lock.json` → **empty**. |
| `T-12-15-RENAME` | accept | CLOSED | Verified by diff: `320723d` had `gate-db-free`, `gate-db`, `gate-price-parity`; HEAD has those three **unchanged** plus `gate-visual`. An addition, never a rename — no required status check silently stopped being required. Accepted-risk entry AR-5 below. |
| `T-12-NN-SC` × 15 (incl. `-14-SC`/`-15-SC` above — not additional to them) | mitigate | CLOSED | One global proof for all fifteen: `git diff --stat 320723d..HEAD -- package.json package-lock.json` is **empty** across the entire phase. Per-plan riders also confirmed: `components.json` declares `"registries": {}` (12-11); `radix-ui@^1.4.3` was already a dependency, so `collapsible.tsx` added no package; `tests/design/sheet-absent.test.ts:377` asserts no `vaul`/gesture library (12-07, 12-10); `dom-accessibility-api` appears in no `import` statement and in no manifest, reached only through `@testing-library`'s `{ name }` option (12-06). |

---

## Tier 3 — accessibility, copy, layout, motion

Spot-checked. For each row the mitigating constant or component **and** a committed
assertion over it were located. ★ marks rows whose assertion body (not just its name) was
read.

| Threat ID | Disp. | Verdict | Evidence |
|-----------|-------|---------|----------|
| `T-12-01-PAIRBLIND` | mitigate | CLOSED ★ | `src/lib/design/contrast-pairs.ts:473-477` — the `brand-30 on card` row, its `slot-picker.tsx:268` origin, its compensating requirement and the corrected 1.60 figure, all declared inside the culori gate. |
| `T-12-01-GEODRIFT` | mitigate | CLOSED ★ | `RESULT_GRID_GAP` imported by both grids (`search-results.tsx:45,114`; `card-grid-skeleton.tsx:20`) and by two further adopters. `e2e/skeleton-geometry.spec.ts:491-560` measures the gutter with `boundingBox()` on **`/`** (`page.goto(BASE_URL + "/")`) at 320/768/1280 in two themes, with two vacuity guards (truncation actually cut; the pending state really is pending). |
| `T-12-01-MIGRATION` | mitigate | CLOSED ★ | `tests/design/infra.test.ts:319,322` pins `0025_audit_resolved_by.sql` and `MIGRATION_COUNT = 26`. Confirmed on disk: 26 `.sql` files, last is `0025`. Watched red with a probe migration (recorded `:292`). |
| `T-12-01-VACUOUS` | mitigate | CLOSED ★ | `infra.test.ts:353` — `it("read a non-empty migration directory")` guards the count assertion against a directory that could not be read. |
| `T-12-02-FORMATMIX` | mitigate | CLOSED ★ | `tests/validation/search-window.test.ts` cases (5a) and (5b) — mutual rejection asserted from **both** directions; `slotSelectionSchema` unchanged; `resume=1` remains the discriminator. |
| `T-12-02-SEEDTRUST` | mitigate | CLOSED ★ | `listings/[id]/(detail)/page.tsx:167-182` — `seedSelectionFromWindow` returns `null` the moment any hour in the searched window is not free, seeding the day only (`:444-452`). `placeHold` re-derives price and availability inside its transaction and is byte-unchanged. |
| `T-12-02-ENUM` | accept | CLOSED | `src/app/actions/availability.ts:77-86` — `dayLocalSchema.safeParse`, then the published + non-deleted re-gate returning `EMPTY_AVAILABILITY`. Payload not widened; no caller-supplied status. Accepted-risk entry AR-3 below. |
| `T-12-02-RACE` | mitigate | CLOSED ★ | `availability-calendar.tsx:273-285` — monotonic `tokenRef`; both the success and the error arm return early when `token !== tokenRef.current`, so a stale resolution can neither overwrite a newer day nor hide the newer call's skeleton. |
| `T-12-03-GETDUP` | mitigate | CLOSED ★ | `book/page.tsx` back-link builds `backParams` from `date`/`start`/`end` only, via `URLSearchParams`; `resume` is absent from the constructed href. `e2e/shell.spec.ts` asserts it on the **rendered** href. |
| `T-12-03-A11YDOUBLE` | mitigate | CLOSED | `e2e/hold-countdown.spec.ts:389` — `test.describe("GATE-03 — the countdown announces exactly once")`; the restored-expiry-arm red is recorded at `:59`. |
| `T-12-03-HOOKGHOST` | mitigate | CLOSED | `src/lib/design/selector-contract.ts:145` (`hold-countdown` id) + `:345` (its row). Bidirectional gate; TS2741 compile red recorded. |
| `T-12-04-PARITYBLIND` | mitigate | CLOSED | Three declared ids in `selector-contract.ts` — `price-total` (`:121`/`:198`), `rail-price-total` (`:147`/`:361`), `sheet-price-total` (`:157`/`:440`) — each documenting why it may not reuse the others. |
| `T-12-04-COPYDRIFT` | mitigate | CLOSED ★ | `tests/design/price-surface.test.ts` §(1) C1/D-73 (`:733`, scans comments included) and §(2) C7 (`:769` three forbidden phrases, `:784` "declares all three phrases, so the ban cannot quietly shrink"). Phrases stored in two pieces and joined at runtime so the scanner does not trip on itself; self-probe at `:135`. |
| `T-12-04-ROUNDDRIFT` | mitigate | CLOSED | `all-in-table.ts:37-39` states `space + fee === total` is exact by construction (one rounding, then an add); asserted per key in `tests/booking/all-in-table.test.ts` over a rate landing on the .5 tie, with the "multiply does not agree" half preserved. |
| `T-12-05-RAILCOMPUTE` | mitigate | CLOSED ★ | `price-surface.test.ts:826` — `it("nor does the RAIL compute one, now that it renders the same breakdown (12-05)")` plus `:631` guard-the-guard ("the arithmetic scanner actually parsed the RAIL too") and `:839` ("and the rail has not simply stopped rendering money"). Both halves matter; both ship. |
| `T-12-05-FOCUSFORK` | mitigate | CLOSED | `service-fee-popover.tsx:44-53` composes the vendored `ui/popover`; nothing re-implemented. Click-outside, Escape and focus return asserted in `e2e/price-one-fact.spec.ts:435`. |
| `T-12-05-TOOLTIP` | mitigate | CLOSED ★ | `price-one-fact.spec.ts:474` asserts no `title` attribute and `:484-489` asserts hover does **not** open it — the explicit negative the plan promised. |
| `T-12-06-A11YSILENT` | mitigate | CLOSED | `tests/design/live-regions.test.tsx:614` SCAN 3 — "every `loading` region is named by its author" + `:632` "no OTHER kind mixes the two naming mechanisms". |
| `T-12-06-A11YINTERRUPT` | mitigate | CLOSED ★ | SCAN 1 at `:456` — two assertions: not in any declared file (`:457`) **and** not on any collected region "including inside a computed value" (`:467`). The second is what a source grep would miss. |
| `T-12-06-SETDRIFT` | mitigate | CLOSED | `live-regions.ts:333` — `as const satisfies readonly LiveRegionExclusion[]`; `:436` `Record<LiveRegionId, LiveRegionRow>`. A removed path fails `tsc --noEmit` rather than shrinking the gate. |
| `T-12-06-REGIONGHOST` | mitigate | CLOSED | SCAN 2 at `:486` — "reports declared-but-absent and present-but-undeclared together", plus `:566` "reads markup and not prose, in both directions". |
| `T-12-06-VACUOUS` | mitigate | CLOSED ★ | `live-regions.test.tsx:374-437` — five guard-the-guard assertions including `:396` "found at least one live region in EVERY declared file — no file is padding" and `:406` "pointed at a path that does not exist, reports it rather than passing over it". |
| `T-12-07-PHOTOSRC` | accept | CLOSED | `photo-lightbox.tsx:325,354` — `src={active.url}` from the same `photos[]` the mosaic already renders. No new upload, signing, transform or origin. Accepted-risk entry AR-4 below. |
| `T-12-07-FOCUSTRAP` | mitigate | CLOSED | `e2e/photo-lightbox.spec.ts:269` — "(c) Escape closes it and focus returns to the trigger, by name". |
| `T-12-07-NONAME` | mitigate | CLOSED | `photo-lightbox.spec.ts:320` — "(d) the dialog has a computed name, and it is not the RESP-01 sheet"; `:348` — "(e) the close control is `Close photos`, not the vendored `Close`". |
| `T-12-07-HOOKGHOST` | mitigate | CLOSED | `selector-contract.ts:149` id + `:377` row. |
| `T-12-07-BOUNDARY` | mitigate | CLOSED ★ | `grep -n "use client\|useState\|useEffect\|React.use" src/components/listing/photo-gallery.tsx` → **zero matches**. The island is a sibling. |
| `T-12-08-FALSECLAIM` | mitigate | CLOSED ★ | `tests/listing/key-facts.test.tsx:165` — "(7) GUARD THE GUARD: the pattern really does catch a bare claim" — followed by `:183` "(8) no rendered variant states a bare `{N} {noun}` anywhere in its text". Positive regex and negative whole-text assertion, both present. |
| `T-12-08-SLAFICTION` | mitigate | CLOSED ★ | `grep -rn "APPROVAL_SLA_HOURS" src/app/listings/ src/components/listing/` → **zero matches**. |
| `T-12-08-HYDRATION` | mitigate | CLOSED | `e2e/public-listing.spec.ts:325` `page.on("pageerror", …)` → `:354` filters `"Hydration failed"` over a full load. |
| `T-12-08-TOOLTIP` | mitigate | CLOSED ★ | The only surviving `@/components/ui/tooltip` import in the tree is `src/components/listing/photo-uploader.tsx:58` — a **host** surface, not on the booker path. |
| `T-12-09-HITAREA` | mitigate | CLOSED | `e2e/calendar-hit-area.spec.ts` — rendered `boundingBox()` at four widths in two themes; the file header tabulates measured `25.08 × 44` → `44 × 44`. The three overrides and the escape hatch are declared in the header. |
| `T-12-09-OVERFLOW` | mitigate | CLOSED | `e2e/overflow-320.spec.ts` — twelve named routes plus a thirteenth row, `/listings/[id]` with the booking sheet open (`:11`). Diagnostic false-positive history recorded `:37-39`. |
| `T-12-09-A11YFILL` | mitigate | CLOSED ★ | `tests/design/skeleton-a11y.test.tsx:10-27` records the **measured** fact that `role="status"` takes no name from content, which is why both an `aria-label` and an `sr-only` child ship; every bar `aria-hidden`. Mirrored by `live-regions.test.tsx:721-765`. |
| `T-12-09-BOXDRIFT` | mitigate | CLOSED ★ | `src/lib/design/measurements.ts:259` — `SLOT_CHIP_BOX = "h-11 w-20"`, read by the skeleton (`availability-calendar.tsx:796`) **and** by the real chip's floor (`slot-picker.tsx:187,196`). Genuinely one source, so the ±2px claim is about one box. |
| `T-12-09-MOTIONSHIFT` | mitigate | CLOSED | `e2e/reduced-motion.spec.ts:145-197` — zero non-zero durations inside the month grid, with the click-actually-changed-the-month guard at `:178` and the measured red at `:197`. |
| `T-12-09-VENDORFORK` | mitigate | CLOSED ★ | `git diff --stat 320723d..HEAD -- src/components/ui/calendar.tsx` → **empty**. Never edited. |
| `T-12-10-DUPCONTROL` | mitigate | CLOSED ★ | `booking-panel.tsx:13-19` — `hidden`, not `sr-only`, chosen precisely because `getByRole` excludes hidden nodes. `e2e/mobile-booker-path.spec.ts:209` scopes `BOOK_CTA = /^Book(?: this space\| · )/` and counts by **role** at 375 and 1280; the `Book full day` collision is corrected and recorded (`:44-54`) rather than silently narrowed. |
| `T-12-10-BARPRICE` | mitigate | CLOSED ★ | Both figures come from one `selectedAllInParts` lookup + one `formatMoney` call; `mobile-booker-path.spec.ts:122-133` records the watched red for a locally computed figure at the rounding edge. |
| `T-12-10-DOUBLEFETCH` | mitigate | CLOSED | `BookingPanel` owns zero state; the request counter is `e2e/public-listing.spec.ts` case (6), route interception at `:507`, cross-referenced from `mobile-booker-path.spec.ts:80`. The counter's URL-matching rationale is recorded at `:47-49`. |
| `T-12-10-CLOSEAMBIG` | mitigate | CLOSED ★ | `booking-sticky-bar.tsx:95` — `SHEET_CLOSE_LABEL = "Close booking"`; `photo-lightbox.tsx:394` — `Close photos`. Both distinct, both asserted, both documented as a screen-reader element-list concern. |
| `T-12-10-CLEARANCE` | mitigate | CLOSED ★ | `STICKY_BAR_CLEARANCE` applied on `<main>` at `listings/[id]/(detail)/page.tsx:472` **and** `book/page.tsx:517`. |
| `T-12-11-ORMBUNDLE` | mitigate | CLOSED ★ | `reserve-actions.tsx:110` renders `result.error`; the file states at `:44` that it does not import `CHECKOUT_IN_FLIGHT_MESSAGE`, and grep confirms only that comment mentions it. |
| `T-12-11-REDIRECTNAME` | mitigate | CLOSED | `reserve-actions.tsx:12-22` — the client *names* PayMongo in the pressed label and the at-rest line and never constructs the URL; `confirmBooking` mints the hosted checkout it names. The redirect **tail** is routed to human UAT and is not machine-asserted, exactly as declared. |
| `T-12-11-STICKYHEADER` | mitigate | CLOSED ★ | `tests/design/elevation-z.test.ts:641` — `it("pins shadow-sticky to the design surface and the TWO bottom bars — a CLOSED set, none on a header")`. Both product call sites confirmed `fixed inset-x-0 bottom-0` (`booking-sticky-bar.tsx:167`, `checkout-sticky-bar.tsx:80`). |
| `T-12-12-LADDERCOST` | mitigate | CLOSED ★ | Sequential with stop-at-first-hit (`relaxation.ts:214-236`), `page: 0` forced per rung (`:227`), `RELAX_FETCH_LIMIT = 7` (`:157`) which `searchListings` can only ever **shrink** with (`query.ts` `Math.min`), hard cap asserted by invocation count (`relaxation-ladder.test.ts:265-268`), `RELAXATION_BUDGET_MS = 2000` measured at `:405-410` with the two-rung fallback exercised at `:299`. |
| `T-12-12-FALSEBAND` | mitigate | CLOSED | `e2e/zero-result-relax.spec.ts:202` — case (a)(b)(d), the control's rendered value compared against the band's substring, both read from the DOM; `:327` case (f) covers rung 4. |
| `T-12-12-UNDOLOOP` | mitigate | CLOSED ★ | `relaxation.ts:207` — `if (params.relax === 0) return null` **before** any query. `relaxation-ladder.test.ts:316` asserts it; `page.tsx:64` keeps `relax=0` in the URL across a sort change or Load-more. |
| `T-12-13-COPYDRIFT` | mitigate | CLOSED ★ | `book-cta.tsx:80-85` — `namedSelection` composes the booker's **own** selection through `TZDate` + the listing's `timezone` (header at `:75`: "THE VENUE TIMEZONE, NEVER THE BROWSER'S"); `collision-notice.tsx:116-118` falls back to the server ruling when `named === null`. |
| `T-12-13-A11YDOUBLE` | mitigate | CLOSED ★ | `e2e/collision-in-place.spec.ts:370-374` — `statuses + alerts - captions === 1`, scoped to `main`, with the vendored DayPicker caption (`:178`) and the Next dev overlay's shadow-DOM `role="alert"` (`:68-69`) both explicitly subtracted. That subtraction is what makes the count real. |
| `T-12-13-PAYLOADWIDEN` | mitigate | CLOSED ★ | `git diff` on `src/app/actions/availability.ts` across the phase → **empty**. Free/blocked state only, no PII, no booker identity. |

---

## Accepted risks log

Five threats carry a non-`mitigate` disposition. Per the `accept` verification rule these
require a documented entry; this section **is** that log, created by this audit (no prior
`SECURITY.md` existed for phase 12).

### AR-1 · `T-12-11-DOUBLECHARGE` — confirm CTA double-submit
**Accepted.** The `disabled`/`aria-disabled` pair on the confirm CTA is a courtesy and is
documented as one at the call site. The real guards are server-side and were verified
present and unchanged: the compare-and-swap checkout lease (`booking.ts:851`) and
expire-before-create (`booking.ts:909`).
**Residual:** PayMongo does not honour `Idempotency-Key` on `POST /v1/checkout_sessions`
(T-08-79, probed live at the cost of a real double charge). Crash recovery is the lease
TTL. A genuine expire failure fails **closed** — it refuses the new checkout rather than
leaking a second payable session — and lands in the `needs_attention` audit for an
operator. **Owner:** payments. **Revisit:** if PayMongo ships idempotent session creation.

### AR-2 · `T-12-03-CLIENTAUTH` — countdown expiry is a display cue
**Accepted.** The client countdown never decides that a hold is alive. Verified server
authorities: status gate, D-94 session cutoff on the **Postgres** clock, rate limit,
checkout lease. See W-2 for a correction to the rationale's wording.

### AR-3 · `T-12-02-ENUM` — `getDayAvailability` is unauthenticated
**Accepted** (carried from T-03-ENUM, v1.0). Deliberately public for a published listing.
Phase 12 did not widen the payload and added no caller-supplied status; the published +
non-deleted gate is re-enforced inside the action (`availability.ts:81-86`) and the action
file is byte-unchanged this phase.

### AR-4 · `T-12-07-PHOTOSRC` — lightbox renders stored Cloudinary `secure_url`s
**Accepted** (ASVS V12 partly-applies row, unchanged). The lightbox renders the same
stored URLs the mosaic already renders — no new upload, signing or transform surface and
no new origin.

### AR-5 · `T-12-15-RENAME` — GitHub check names
**Accepted by design.** Verified by diff: no job was renamed; `gate-visual` was added
alongside the three pre-existing jobs. A future rename of `gate-db-free` is a
branch-protection decision, not a cosmetic one. **Note:** `gate-visual` is new and should
be added to branch protection deliberately — it is not automatically required.

---

## Unregistered flags

**None.** Every SUMMARY that carries a `## Threat Flags` section declares "None", and the
one genuinely new trust boundary — `gate-visual` ↔ an ephemeral database — is registered
as `T-12-15-DBREACH`.

Independently corroborated rather than taken on the executors' word:

- **No new network endpoint.** `git diff --stat 320723d..HEAD -- src/` lists no file under
  `src/app/api/**`; no new `"use server"` module.
- **No new auth path.** No change under `src/lib/auth*`.
- **No schema change.** `drizzle/` byte-identical at `0025_audit_resolved_by.sql`, 26 files.
- **No new dependency.** `package.json` + `package-lock.json` diff empty.
- **New client component reaching a server-only graph:** `relax-band.tsx` imports
  `RelaxationRungId` from `relaxation.ts`. Type-only and erased; `relaxation.ts` carries a
  header rule keeping it free of `server-only` value imports, and the boundary is enforced
  at build time by Turbopack plus `tests/design/server-only-guards.test.ts`. Informational,
  correctly covered by the existing register.

---

## Warnings

Non-blocking. Each names the artefact that must change to clear it.

### W-1 · Declared verification command is permanently false — `T-12-04-FEELEAK`, `T-12-05-RATELEAK`
Both plans state the check as **`grep -rn "SERVICE_FEE_BPS" src/components/` must return
nothing**. At HEAD it returns **8 matches** — every one inside a comment, in
`availability-calendar.tsx`, `price-breakdown.tsx`, `service-fee-popover.tsx`,
`listing-card.tsx` and `search-result-card.tsx`, each explaining *why* the constant must
not be there.

The **security property is intact** — no value import exists, the constant is fenced by
`import "server-only"`, and the build fails if a client graph reaches it. Both threats are
CLOSED on that basis. But the declared check can now never pass, so a future auditor
running it literally gets a false red, and the reflex fix (deleting the explanatory
comments) would remove the reasoning that keeps the boundary intact.

**Action:** restate the check as comment-stripped, or as an import-graph assertion. The
repository already owns `tests/design/helpers/strip-comments.ts` and
`tests/design/strip-comments.test.ts`, so this is a one-line change to the check, not new
machinery.

### W-2 · Accepted-risk rationale overstates a server check — `T-12-03-CLIENTAUTH`
The plan and `hold-provider.tsx:41` both state that `confirmBooking` "re-checks
`expires_at > now()` server-side". It does not do so directly. It checks status
(`booking.ts:757`), the D-94 session cutoff (`:797`), the rate limit and the lease — and
then **extends** `expires_at` via `GREATEST(expires_at, now() + …)`. Expiry is enforced
indirectly, by the in-transaction sweep (`units.ts:487-491`) flipping a lapsed hold to
`cancelled`/`declined`, which the status gate then catches.

The accepted risk holds in substance and the disposition is correct. The wording is not,
and it is the kind of wording a future reader would rely on without re-deriving.

**Action:** correct the sentence in `hold-provider.tsx` and in the next plan that touches
this threat. No code change.

### W-3 · Two summaries ship no `## Threat Flags` section
`12-13-SUMMARY.md` and `12-14-SUMMARY.md` carry no `## Threat Flags` heading at all
(confirmed by heading scan). The other thirteen do. This is not a finding about either
plan's security posture — 12-13 declared its threats normally and 12-14's are the most
thoroughly machine-asserted in the phase — but a missing section is silently
indistinguishable from a section reading "None", which weakens the mechanism for every
future phase.

**Action:** process. Require the section even when empty.

---

## Standing items — deliberately NOT reported as findings

Confirmed still present; each is known, documented and out of this phase's scope:

- `notFound()` on `/listings/[id]` answering HTTP 200 — a status-code defect, not a content
  leak (the body *is* the not-found boundary); awaiting a product decision.
- `recordAudit` writing through the app's module-level db singleton, leaking 2 rows into
  the test DB's `public` schema — contained and documented.
- A `TZDate` hydration mismatch under the fake clock on the checkout drive — deliberately
  deferred to its own change.
- `12-REVIEW.md` IN-01 and IN-02 — Info severity, out of the fix scope by contract (`--all`
  not passed). IN-02 (`date-pass-picker.tsx`'s month-availability fetch fails open with no
  user-visible signal) matches the documented deliberate fail-open design.

---

## Gate status at HEAD

| Gate | Result |
|------|--------|
| `tsc --noEmit` | 0 errors |
| `vitest` | 141 files / 1307 tests |
| `next build` | 0 errors, 12 known warnings |
| `node scripts/verify-workflows.mjs` | **38/38** (baselines=11, ci=20, cross=7) — re-run by this audit |
| `git diff package.json package-lock.json` (phase) | empty |
| `git diff` money path (phase) | empty |

**Recommendation: proceed.** `threats_open: 0`, and the three warnings are verification
hygiene — each cheap to close, none of them a missing control.
