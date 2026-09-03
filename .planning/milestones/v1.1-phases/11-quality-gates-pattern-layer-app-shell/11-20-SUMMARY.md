---
phase: 11-quality-gates-pattern-layer-app-shell
plan: 20
subsystem: app-shell
tags: [shell-04, opengraph, share-cards, satori, generate-metadata, t-11-ogcred, t-11-referer, t-11-og5xx, ast-scan, ac12, ac13, ac14]

# Dependency graph
requires:
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "plan 11-10's `(public)` and `listings/[id]/(detail)` route groups (the first decides the invite card's URL suffix, the second decides where `generateMetadata` lives); plan 11-19's `InviteInactive` + the unreachability control this plan must not reopen one layer down; plan 10-14's `src/lib/design/tokens.generated.ts` (the only legal colour source in a renderer that reads no CSS); plan 10-17's DS-13 leak gate, which already polices `src/app/**` for raw hex"
  - phase: 08-group-bookings
    provides: "08-06's `getGroupByToken` + frozen `GROUP_INACTIVE` — the gated lookup `generateMetadata` reuses rather than forking, and the anti-oracle property the constant image card exists to protect"
  - phase: 01-foundations
    provides: "`src/app/layout.tsx`'s `metadataBase` + `%s · FitOut` title template — in place and, until this plan, entirely unused"
provides:
  - "Three `opengraph-image.tsx` where zero existed: the root card, the listing card, and a CONSTANT invite card"
  - "`src/app/og-render.ts` — renders to BYTES before committing to a response, so a satori throw is catchable at all; three fallback rungs, each watched firing"
  - "`src/lib/listing/og-facts.ts` — one narrow published-only projection + the shared description composer, so a listing's card and its `og:description` cannot name different spaces"
  - "`generateMetadata` on the listing detail page (which had NO metadata export at all) and on the invite page (converted from a static object, both privacy properties intact)"
  - "`tests/design/og-routes.test.ts` — AC#12/#13/#14 as source assertions, six watched reds"
  - "Two committed Geist binaries (72,916 + 73,048 bytes) and zero npm packages"
  - "Measured: `fetch(new URL(...))` — the DOCUMENTED font load for an OG route — does not work on the Node runtime and fails silently"
  - "Measured: declaring `openGraph` at all deletes the file-convention `og:image` and downgrades the Twitter card"
affects: [11-21, 11-22]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A response that must never be non-2xx has to be rendered to bytes BEFORE the status line is committed; `new ImageResponse(...)` returns before satori has run, so a try/catch around it catches nothing"
    - "Fallback rungs are only fallbacks if each shares LESS I/O than the one above it — rung 2 reads no file this repository owns, rung 3 runs no renderer"
    - "An ALLOW-list over import specifiers is the assertable form of 'this file reaches no database'; a denylist over two module names is walked around by a relative path without anybody intending to"
    - "A comment that quotes the string a one-command audit greps for is the thing that makes the audit useless — describe the identifier by role, assert it on the AST"
    - "Two surfaces may legitimately differ in what they reveal (a page must show the event; a NEW unauthenticated endpoint must not), and the line is whether the surface adds a bit the existing ones did not"

key-files:
  created:
    - "src/app/opengraph-image.tsx"
    - "src/app/listings/[id]/opengraph-image.tsx"
    - "src/app/(public)/invite/[token]/opengraph-image.tsx"
    - "src/app/og-render.ts"
    - "src/lib/listing/og-facts.ts"
    - "src/app/fonts/Geist-Regular.ttf"
    - "src/app/fonts/Geist-SemiBold.ttf"
    - "tests/design/og-routes.test.ts"
  modified:
    - "src/app/listings/[id]/(detail)/page.tsx"
    - "src/app/(public)/invite/[token]/page.tsx"
    - ".planning/phases/11-quality-gates-pattern-layer-app-shell/deferred-items.md"

decisions:
  - "The invite image takes NO argument at all rather than an ignored one — an unread parameter can be read again tomorrow; a signature that declares nothing cannot be handed the token without a visible edit"
  - "Never-non-2xx is implemented by awaiting `.arrayBuffer()` and returning a fresh Response, because `ImageResponse` commits its headers before satori runs"
  - "The invite page's `generateMetadata` DOES vary by token (venue or no venue) and that is not a new oracle: the page body already varies the same way. The IMAGE is a new endpoint, so it does not vary at all"
  - "`alt` on the listing card is STATIC and describes the card's shape, not the listing — the two ways to interpolate it both cost more than the tag is worth (one changes the image URL, the other deletes the file convention)"
  - "The description's closing sentence is mode-aware: a drop-in listing is not booked 'by the hour', and the unfurl is read before anyone reaches the app"
  - "A narrow new projection rather than the page's loader — the page has no loader; it inlines a three-table join and selects the full row"
  - "The import check is an allow-list, so adding any module to the invite card is a deliberate edit to the gate"

metrics:
  duration-minutes: 96
  tasks-completed: 3
  files-changed: 11
  tests-added: 12
  completed: 2026-08-17
---

# Phase 11 Plan 20: Share Cards & the Invite Metadata Conversion — Summary

Three Open Graph cards where the app had none, a listing link that now unfurls with its own title, city and rate, and an invite card that is structurally incapable of telling anyone whether a token names a real group — plus a render path that cannot answer an unfurl with a 500, watched failing three ways.

## What Was Built

**Task 1 — the root and listing cards (`22d454c`).** `src/app/og-render.ts` (the shared renderer + font loader), `src/app/opengraph-image.tsx`, `src/app/listings/[id]/opengraph-image.tsx`, `src/lib/listing/og-facts.ts`, two committed `.ttf` binaries, and `generateMetadata` on the listing detail page.

**Task 2 — the invite card (`57e4260`).** `src/app/(public)/invite/[token]/opengraph-image.tsx` as a constant card, and the invite page's static `metadata` converted to `generateMetadata` with both privacy properties carried across verbatim.

**Task 3 — the gate (`734adbb`).** `tests/design/og-routes.test.ts`, 12 assertions, DB-free, no config change. Design suite **34 files / 615 tests → 35 / 627**.

| Route | URL | Card |
|---|---|---|
| `src/app/opengraph-image.tsx` | `/opengraph-image` (`○ Static`) | wordmark · `SITE_TAGLINE` · accent rule |
| `src/app/listings/[id]/opengraph-image.tsx` | `/listings/<id>/opengraph-image` | wordmark · title (2-line clamp) · `{Space type} · {City}` · the all-in RATE · accent rule |
| `src/app/(public)/invite/[token]/opengraph-image.tsx` | `/invite/<token>/opengraph-image-ikagei` | wordmark · "You're invited" · accent rule — **constant** |

## The Three Things This Plan Measured That It Was Told Otherwise

**1. `new ImageResponse(...)` cannot fail safely, and the plan's own instruction for the fonts does not work.**

The plan (and Next's docs) prescribe `fetch(new URL("./Geist-Regular.ttf", import.meta.url)).then(r => r.arrayBuffer())`. It was written exactly that way first, and the first request produced a card. It was the **wrong** card:

```
[og][probe] font url: file:///C:/…/.next/dev/server/assets/Geist-Regular.40nwhrotoqrlc.ttf
[og] card failed, serving the fallback: fetch failed
GET /opengraph-image 200 in 1913ms
```

Turbopack emits and hashes the asset correctly; Node's `fetch` (undici) does not implement the `file:` scheme, so the load rejects with `fetch failed` — a message that names nothing. Without the fallback rung this plan happened to have already written, every card in the app would have shipped in the bundled fallback face at weight 400 only, at a 200, forever. The `new URL` is kept (it is what makes the asset be emitted) and the read is `fs.readFile(fileURLToPath(url))`. Verified in dev **and** against `next start`.

That near-miss is also why the never-500 guard is shaped the way it is. `ImageResponse` extends `Response` and runs satori inside the body's `ReadableStream.start()` — the constructor returns with the status line and headers already committed. A `try`/`catch` around `return new ImageResponse(...)` catches nothing. `renderOgCard` awaits `.arrayBuffer()` and returns a fresh `Response`, which is the only shape in which "never non-2xx" is a property rather than an intention.

**2. Declaring `openGraph` deletes the share card.** Same route, same file convention, one key added and removed between two runs:

| `generateMetadata` returns | result |
|---|---|
| `{ title, description, openGraph: { type: "website", description } }` | `og:title`, `og:description`, `og:type`. **No `og:image`**, no `og:image:width/height/type/alt`. `twitter:card` = `summary` |
| `{ title, description }` — what ships | `og:title`, `og:description`, `og:image`, `og:image:type`, `:width`, `:height`, `:alt`, `twitter:card` = `summary_large_image` + four `twitter:image` tags |

The thorough-looking edit is the destructive one, and it looks *more* complete afterwards. Recorded in the file's header and in `deferred-items.md`.

**3. The invite card's URL carries a route-group hash.** It is `/invite/<token>/opengraph-image-ikagei`; the unsuffixed path is a **404**. `getMetadataRouteSuffix` (`node_modules/next/dist/lib/metadata/get-metadata-route.js`) appends a 6-char djb2 hash of the parent path whenever any parent segment is a route group or parallel route — so plan 11-10's `(public)` is what puts it there, and `listings/[id]` (no group) has none. The plan's acceptance criterion spells the unsuffixed URL and is unsatisfiable as written.

## The Invite Card, Measured

**The image does not vary. At all.** Production build, `next start`, sha256 of the response body:

| token | class | status | bytes | sha256 (first 16) |
|---|---|---|---|---|
| `5PQK75Z6BZKB34C74F7K` | valid, live group | 200 `image/png` | 12,781 | `1603284e7087bd70` |
| `QRSTVWXYZ0123456789A` | well-formed, names nothing | 200 `image/png` | 12,781 | `1603284e7087bd70` |
| `JF8YHZ0SK0HTM5BRFMEZ` | well-formed, booking **cancelled** | 200 `image/png` | 12,781 | `1603284e7087bd70` |
| `hello` | malformed (fails `inviteTokenSchema`) | 200 `image/png` | 12,781 | `1603284e7087bd70` |
| `%20%20` | whitespace | 200 `image/png` | 12,781 | `1603284e7087bd70` |

**The head does vary, and the reasoning for why that is not a new oracle is the load-bearing part of this plan.** Production, side by side:

```
VALID
  <title>You're invited to Sunlit Yoga Studio (bookable) · FitOut</title>
  <meta name="description" content="An organizer reserved Sunlit Yoga Studio (bookable) and invited you.
                                    Open the link to say if you're coming.">
  <meta name="referrer" content="no-referrer">
  <meta name="robots" content="noindex, nofollow">

UNKNOWN  (byte-identical to CANCELLED and to MALFORMED)
  <title>You're invited · FitOut</title>
  <meta name="description" content="Open the link to say if you're coming.">
  <meta name="referrer" content="no-referrer">
  <meta name="robots" content="noindex, nofollow">
```

08-06's property is that **unknown = revoked = voided = cancelled = malformed** are one indistinguishable state, so the token space cannot be walked. All three inactive causes above emit the identical title and description — that property holds. What the page has never hidden, and cannot, is live-vs-inactive: showing the event *is* the product, and the page body already differs far more than a title does. So `generateMetadata` adds no bit that was not already readable.

The **image** is different in kind: it is a NEW unauthenticated endpoint that chat services, link scanners, corporate preview proxies and spam filters fetch automatically, without anyone looking at it. A new endpoint that varied would be a new oracle, discoverable only by something automated — which is the only actor that matters, because a script is the only thing that walks a 20-symbol space. Hence: constant card, no route-parameter argument, no database import.

**And the shipped bug the conversion fixed.** Before this plan, on the app's only fully public link-shared page:

```
<title>You're invited · FitOut · FitOut</title>
```

The literal title was hand-written before `layout.tsx:107` declared `template: "%s · FitOut"` — a fact that file's own header already suspected. The title is returned bare now and the suffix appears once.

## The Never-500 Guard, Watched Firing

Three rungs, each probe applied, measured and reverted (`git status` clean afterwards). Verbatim records live in `src/app/og-render.ts`'s header.

| probe | injection | result |
|---|---|---|
| (A) rung 2 | `readFile(path)` → `readFile(path + ".probe-missing")` — a RUNTIME failure, not a resolution failure | `[og] card failed, serving the fallback: ENOENT …`; listing **200 image/png 25,149 B 1200×630**, root **200 … 25,149 B**. Both legible. The equal byte counts are the second finding: the listing's fallback and the root card are the same card, so a reader cannot tell which route degraded |
| (B) rung 3 | (A) plus a `throw` where rung 2 renders | `[og] fallback card failed, serving a blank card`; **200 image/png 70 B**, PNG magic `89504e470d0a1a0a`, IHDR **1×1** |
| (C) the `fontFamily` claim | (A) plus the root fallback naming `"Geist"` while satori has been given no fonts | **200 … 25,149 B** — byte-identical to the no-`fontFamily` fallback. Satori resolves an unknown family to the first available font rather than throwing |

**The hole, stated rather than glossed:** a *syntax error* in the renderer or a route is a 500, because the module never loads. Found by accident — a `**/` inside a block comment closed the comment early and the route answered 500 with a Turbopack parse error. Nothing in a route can guard its own parse; `npm run build` is what catches it.

## The Gate's Six Watched Reds (green is 12 passed)

| probe | result |
|---|---|
| (a) `referrer: "no-referrer"` deleted from the invite `generateMetadata` | **1 failed / 11 passed**, naming file **and line**: `page.tsx:140 — the returned object has no \`referrer: "no-referrer"\`` |
| (b) `params` added to the invite OG route | **2 failed / 10 passed** — the identifier scan (`names the route-parameter identifier at line(s) 112, 112, 113`) and the arity check (`expected 1 to be +0`) fire independently |
| (c) `THEME_TOKENS` import removed and the three hexes hand-written | **this gate 1 failed / 11 passed** naming the file; **`leak.test.ts` 1 failed / 24 passed** naming all three hexes at `opengraph-image.tsx:39`. Each catches what the other cannot |
| (d) vacuity — `APP_DIR` → `src/app-nope` | **6 failed / 6 passed**, guard first: *"the src/app scan read 0 files"*. The other five reds are all assertions an empty scan would otherwise satisfy — the 11-16 failure mode, reproduced deliberately |
| (e1) `{HEADLINE}` → literal JSX text | **12 passed** — green ON PURPOSE (a literal is not an interpolation), recorded so it is not read as a hole |
| (e2) a second, undeclared child expression `{alt}` | **1 failed / 11 passed**: `opengraph-image.tsx:91 — renders {alt}` |

(e1) alone would have been another vacuous probe. It is paired with (e2) for that reason.

## Deviations from Plan

### Auto-fixed / structural

**1. [Rule 3 — blocking] The prescribed font load does not work.** See above. `fetch(new URL(...))` → `fs.readFile(fileURLToPath(new URL(...)))`. Without the change every card ships in the wrong face at a 200. `22d454c`.

**2. [Rule 3 — structural] A shared renderer the plan did not list: `src/app/og-render.ts`.** The plan's `files_modified` has three route files and expects each to load fonts with `fetch(new URL("./…"))`. The fonts live in `src/app/fonts/`, so that literal is a different relative path from each of the three routes — six fragile paths — and the never-500 wrapper would have been written three times. One module owns the fonts, the size/contentType constants and the three rungs; the routes own their layout and their colours, which is what keeps AC#14 a real assertion rather than a ceremonial one.

**3. [Rule 3 — structural] `src/lib/listing/og-facts.ts`, because the loader the plan said to reuse does not exist.** The plan: *"Reuse the page's existing loader rather than issuing a second query, and say which you did."* Measured: `listings/[id]/(detail)/page.tsx` has no loader — it inlines a `listing ⋈ user ⋈ host_payout` join plus a four-way `Promise.all`, all as statements inside the component, and selects the full row. So this is a **new, narrow, published-only projection** (title, space type, city, the four price columns), `cache()`d, shared by `generateMetadata` and the OG route, with the composed description beside it so the card and the sentence cannot drift. The page's own query is untouched. Deliberately not selected: street, coordinates, host identity. `22d454c`.

**4. [Rule 2 — missing critical functionality] The listing description's closing sentence is mode-aware.** The plan specifies `"… Book by the hour on FitOut."`. A drop-in (open-capacity) listing is sold as day passes and duration never scales its price (OC-02), so that sentence is a false claim about the product on the one surface a person reads *before* they ever reach the app. Open-capacity listings get `"Book a day pass on FitOut."`. `22d454c`.

**5. [Rule 3] The invite OG route's header names none of the three identifiers it is about.** The plan's own acceptance criteria are `grep -c "params"` and `grep -c "@/lib/db\|@/lib/group"`, each expected to be 0 — and a header explaining the property makes both permanently non-zero, i.e. the explanation would be the thing that stopped the property being checkable in one command. (The paragraph explaining this was itself the first offender and had to be rewritten.) The header describes all three by role; the gate reads the AST. Both greps are now 0. `57e4260`.

**6. [Rule 3] The gate's import check is an ALLOW-list, not the prescribed denylist.** "Imports nothing from `@/lib/db` or `@/lib/group`" is walked around by `../../../lib/db` without anyone intending to, and says nothing about the next module that reaches a database two hops down. Inverted: every import specifier in the invite card must appear on a declared list (currently exactly two), so adding one is a deliberate edit to the gate. Both directions are covered by synthetic fixtures, including the relative-path form. `734adbb`.

### Spec discrepancies, resolved with reasoning rather than silently

**7. The listing card's `alt` is STATIC; 11-UI-SPEC § Share & Meta asks for `"FitOut — {title}, {city}"`.** Next reads `alt` as a plain module export evaluated with no params. The two ways to interpolate it are both worse: `generateImageMetadata` makes Next append an image id to the URL, so `/listings/<id>/opengraph-image` stops resolving (and the plan's own AC curls that path); hand-writing `openGraph.images` replaces the file convention and with it the automatic width/height/type tags, leaving a route URL retyped as a string in a second file. The shipped alt describes the card's shape. Recorded in the route's header.

**8. The plan's `<interfaces>` says `src/app/` holds "three static `metadata` declarations". It holds FOUR** — plan 11-19 added `src/app/not-found.tsx`, and 11-19's own summary flagged it as a fourth site for exactly this plan. Not swept: this plan converts the two routes it owns. `dev/theme` and `not-found` keep their static objects. **That is the seventh consecutive Phase-11 plan whose surface inventory was wrong**, and it was found by an AST-style scan in thirty seconds.

**9. The `[id]`-level placement gives `/listings/<id>/book` the same card.** A metadata file applies to its segment and every descendant. That is the wanted answer (it is the same space, seen from checkout) and it is recorded rather than left to be discovered.

### Not fixed, recorded

**10. `NEXT_PUBLIC_APP_URL` is unset, so every absolute share URL this plan emits resolves to `http://localhost:3000`.** Production build, verbatim:

```
<meta property="og:image" content="http://localhost:3000/listings/seed_listing_1/opengraph-image?a5d64308d5d93634"/>
```

**End-to-end unfurl verification is BLOCKED on this, not merely untested.** No crawler — Slack, Messenger, Viber, X — can fetch that URL, and from inside the repository a working card and an unreachable one are indistinguishable. What IS verified is the shape: the tag is absolute, it equals `new URL(path, metadataBase).href`, it carries the content hash Next appends, and the route it names answers `200 image/png` at 1200 × 630. No production origin was invented to make a check go green (the same refusal D-26 applies to `SUPPORT_EMAIL`); this is 11-14's second named `human_needed` item, carried deliberately. The gate says so in its NOT COVERED footer.

**11. Not pushed.** The plan's verification asks for "all three CI jobs green on `origin/dev`". The executor brief for this run says **Do NOT push**, so the three commits are local. CI has not seen them.

## Verification Run

| Check | Result |
|---|---|
| `npm run build` (lint → test:design → next build) | **exit 0** |
| `npx tsc --noEmit` | exit 0 |
| `npx eslint` on all new/changed files | 0 problems |
| `npm run test:design` | **35 files / 627 tests** — was 34 / 615; file count +1 exactly, tests +12 |
| `npm test` | **1217 passed / 4 skipped**, 0 failed — byte-equal to the 11-19 baseline |
| `npx vitest run tests/group` | 84 passed |
| `tests/design/contrast.test.ts` | passes; **zero new rows** (the accent is `brand on background`, already declared) |
| `tests/design/leak.test.ts` | passes — no raw hex reached `src/app` |
| `ls drizzle/*.sql \| tail -1` | `0025_audit_resolved_by.sql` — unchanged (GATE-06) |
| `vitest.design.config.ts` | untouched: still no `globalSetup`, no `setupFiles` |
| `grep -c "params"` on the invite OG route | **0** |
| `grep -c "@/lib/db\|@/lib/group"` on the invite OG route | **0** |
| npm packages added | **0** (`next/og` was already present) |
| Committed font bytes | `Geist-Regular.ttf` **72,916** · `Geist-SemiBold.ttf` **73,048** (total 145,964 — for reference, `next/og`'s own bundled Geist Regular is 125,956) |

### The route table, diffed mechanically (11-19's lesson)

Baseline before Task 1, and after all three tasks. **No route changed prerender class.** Static routes before: `/_not-found`, `/dev/theme`. After: `/_not-found`, `/dev/theme`, **`/opengraph-image` (new, `○ Static`)**. Added rows: `○ /opengraph-image`, `ƒ /listings/-/opengraph-image`, `ƒ /invite/[token]/opengraph-image-ikagei`.

### Rendered, against a production build (`next start`)

| URL | status | type | bytes | PNG IHDR |
|---|---|---|---|---|
| `/opengraph-image` | 200 | `image/png` | 25,844 | 1200 × 630 |
| `/listings/seed_listing_1/opengraph-image` | 200 | `image/png` | 25,945 | 1200 × 630 |
| `/listings/does-not-exist/opengraph-image` | 200 | `image/png` | 25,844 | 1200 × 630 (byte-identical to the root card — a missing listing is not announced in an image) |
| `/invite/<any of five tokens>/opengraph-image-ikagei` | 200 | `image/png` | 12,781 | 1200 × 630 |

Zero `[og]` lines in the production server log across every request above — rung 1 loaded the committed binaries, so the `new URL` + `fs.readFile` pair survives a production build, which was the open risk after the dev-only measurements.

Each card was also read as an image and checked by eye: wordmark top-left in Geist SemiBold, the hero line at 64px with the `-0.02em` tracking, the sub-line in `--muted-foreground`, `₱472.50/hr` rendering its peso glyph correctly, and the 240 × 8 coral rule at the bottom-left. The rung-2 card is legible in `next/og`'s bundled face at weight 400 (visibly lighter, correct otherwise).

## What the Next Plan Should Know

- **11-22 must exclude all three OG routes from the theme-swap smoke**, and the reason is that there is no swap to observe: a server-rendered image has no user, no `data-theme` and no `prefers-color-scheme`, so all three paint `court` unconditionally exactly as `global-error` does. Stated in `src/app/opengraph-image.tsx`'s header and in `deferred-items.md`.
- **Any script or test touching the invite card must use `/invite/<token>/opengraph-image-ikagei`.** The unsuffixed path 404s; the suffix is a djb2 hash of the parent path, present because `(public)` is a route group.
- **Do not add an `openGraph` key to a route that has an `opengraph-image.tsx`** without also re-declaring `images` — it deletes the card and downgrades the Twitter card. Measured both ways; in `deferred-items.md`.
- **`src/app/not-found.tsx` and `src/app/dev/theme/page.tsx` still carry static `metadata` objects.** If a later plan sweeps metadata, those are the two remaining sites; `not-found.tsx` also declares `robots: { index: false, follow: false }`.
- **SHELL-04 is complete in code and blocked on one env var for proof.** See deviation 10 before writing any criterion that asserts a share card "works".

## Threat Flags

None. The plan's register was discharged as written, with two dispositions strengthened beyond it: **T-11-OGCRED** is now measured as five byte-identical responses (the plan asked for three) including a cancelled-booking token and a whitespace token; **T-11-OG5XX** is not merely "wrap the render" but a rendered-to-bytes response with three rungs, all three watched firing. **T-11-OGORACLE** gained an explicit statement of what the metadata may and may not vary by, because "the same shape minus the venue" needed a line drawn to be checkable. **T-11-SC**: two font binaries of the family the app already ships via `next/font`, byte sizes recorded, zero packages installed.

## Known Stubs

None. No hardcoded empty value, no placeholder copy, and no component left unwired: all three cards render real content from real sources, and the one fallback card is a deliberate, reasoned surface rather than a stub.

## Self-Check: PASSED

All eight created files verified present on disk; all three task commits (`22d454c`, `57e4260`, `734adbb`) verified in `git log`.
