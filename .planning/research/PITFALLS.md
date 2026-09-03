# Pitfalls Research

**Domain:** Subdomain-scoped internal ops console + staff invite/onboard, bolted onto a shipped, money-handling Next.js 16 App Router marketplace
**Researched:** 2026-09-03
**Confidence:** HIGH on everything measured against the tree, the local database and the running dev server; MEDIUM on the framework-behaviour pitfalls argued from Next 16 / Better Auth semantics rather than executed here. Every claim below is tagged.

## How to read this file

Three tags are used and they mean exactly what they say:

- **MEASURED** — read out of this repo's tree, its database, or its running dev server during this research, with the file:line or the command that produced it.
- **DERIVED** — follows from something MEASURED plus documented framework behaviour. Sound, but not executed here.
- **UNPROVEN** — plausible, not established. This project's standing rule is that a confident wrong docblock is worse than an admitted unknown, so these are named rather than rounded up.

---

# Part 1 — The two live hosting-surface defects, measured

## Defect A — `/host/listings` card alignment and footer-control overflow

### What the brief guessed, and what is actually true

The brief's candidate cause was *"`<Card className="gap-0 pt-0">` inside `grid sm:grid-cols-2 lg:grid-cols-3` with no `h-full`/`flex-1`"*. **Half of that is wrong, and the wrong half matters** — it points a fix at the outer box when the defect is inside it.

**MEASURED — the class strings involved:**

| What | Where | Class string |
|---|---|---|
| Grid wrapper | `src/app/(host)/host/listings/page.tsx:180` | `cn(RESULT_GRID_GAP, "grid sm:grid-cols-2 lg:grid-cols-3")` |
| `RESULT_GRID_GAP` | `src/lib/design/measurements.ts:283` | `"gap-4 sm:gap-6"` |
| Card call site | `src/components/listing/listing-card.tsx:352` | `<Card className="gap-0 pt-0">` |
| `Card` base | `src/components/ui/card.tsx:15` | `group/card flex flex-col gap-4 overflow-hidden rounded-xl bg-card py-4 … has-data-[slot=card-footer]:pb-0 …` |
| `CardFooter` base | `src/components/ui/card.tsx:87` | `flex items-center rounded-b-xl border-t bg-muted/50 p-4 …` |
| Footer call site | `src/components/listing/listing-card.tsx:434` | `<CardFooter className="gap-2">` |
| `Button` base | `src/components/ui/button.tsx:79` | `group/button inline-flex shrink-0 items-center justify-center … whitespace-nowrap …` |

**MEASURED — the grid wrapper sets no `align-items`.** `page.tsx:180` emits `grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3` and nothing else. There is no `items-start`.

**DERIVED — therefore `h-full` is NOT the missing piece.** A grid container's `align-items` defaults to `normal`, which behaves as `stretch` for a grid item with `height: auto`. Every `<Card>` is a direct grid item with auto height, so **the card boxes already stretch to the tallest card in the row.** Adding `h-full` would be a no-op dressed as a fix.

**DERIVED — what actually misaligns is the footer band, not the card box.** `Card` is `flex flex-col` (`card.tsx:15`) with the call site's `gap-0` (`listing-card.tsx:352`). No child declares `flex-1` and the footer declares no `mt-auto`, so `justify-content` stays at its `flex-start` default: the three children — `AspectRatio` (`:353`), `CardContent` (`:368`), `CardFooter` (`:434`) — pack to the top and **the stretched height lands as dead space *below* the footer**. Because `CardFooter` carries `border-t bg-muted/50 rounded-b-xl` (`card.tsx:87`), the visible result is a tinted, top-bordered, bottom-rounded bar floating mid-card with blank card beneath it — sitting at a *different* height in each card of a row, because each `CardContent` is a different height. **That is the "cards misalign" the PM is seeing.**

The variable-height input is real and MEASURED: `CardContent` conditionally renders a space-type line (`:381`), an hours notice (`:396`) and a review notice (`:418`), so two cards in one row routinely differ by one to three text lines.

Corroborating MEASURED detail: `Card`'s base carries `has-data-[slot=card-footer]:pb-0`, so in the *natural-height* case the footer is deliberately flush with the card's bottom edge. The defect is precisely that stretching breaks the assumption that class encodes.

**The correct fix is `flex-1` on the growing child (or `mt-auto` on `CardFooter`), not `h-full` on `Card`.**

### The footer overflow

**MEASURED — `CardFooter` has no `flex-wrap`**, at either the base (`card.tsx:87`) or the call site (`listing-card.tsx:434`, which adds only `gap-2`).

**MEASURED — three flex children carrying four controls:** Edit (`listing-card.tsx:436`), Availability (`:443`), and a `div.ml-auto.flex.gap-2` (`:449`) holding Unlist (`:451`) and Delete (`:465`).

**MEASURED — the buttons can neither shrink nor wrap.** `buttonVariants`' base string at `src/components/ui/button.tsx:79` contains both `shrink-0` and `whitespace-nowrap`.

**DERIVED — so the row overflows rather than compressing.** `flex-shrink: 0` on every child plus `flex-wrap: nowrap` on the container means the footer's content box is exceeded outright once the four controls plus three 8px gaps exceed the available width.

**DERIVED — the arithmetic at `lg:grid-cols-3`.** Container is `max-w-5xl px-4` (`page.tsx:127`) → 1024 − 32 = **992px**; three columns with two `sm:gap-6` gutters → (992 − 48) / 3 ≈ **314.7px** per card; minus `CardFooter`'s `p-4` → ≈ **282.7px**; minus three 8px `gap-2` gaps → ≈ **258.7px** of button width for `Edit` (+icon), `Availability` (+icon), `Unlist`, `Delete`. That is tight-to-impossible at the shipped `size="sm"` padding.

**DERIVED, and this corrects the brief's wording — it is CLIPPED, not spilled.** `Card`'s base carries `overflow-hidden` (`card.tsx:15`), so the overrun is cut off at the card's rounded edge rather than painted outside it. The user-visible symptom is a truncated Delete/Unlist control, not a control drawn over its neighbour.

**UNPROVEN:** the exact viewport band at which the clip begins, and whether it also bites at `sm:grid-cols-2`. I did the arithmetic; I did not open a browser or take a screenshot. A Playwright assertion of `scrollWidth > clientWidth` on `[data-slot="card-footer"]` would settle it in one line and should be the regression test.

**`ml-auto` is a red herring.** `margin-left: auto` resolves to 0 once free space is negative, so it neither causes nor worsens the overflow — it simply stops helping.

**Phase to address:** the hosting-surfaces-corrected phase. Two guards, not one: a stretch assertion (all cards in a row report equal `offsetHeight` *and* the footer's `offsetTop + offsetHeight` equals the card's bottom) and the `scrollWidth > clientWidth` overflow assertion at 320px, at the `sm` two-column band and at the `lg` three-column band.

---

## Defect B — the 404 after creating a listing

**Verdict: this is NOT an application-logic bug. It is a routing-layer failure in the running `next dev` (Turbopack) server. Every application-level candidate in the brief is REFUTED by measurement.** The architecture researcher read both files and found them correct on inspection — that reading is right, and the dev-server probe below is what goes further.

### B1 — the insert lands, in the right database, un-deleted. MEASURED.

`docker exec fitout-db-1 psql -U fitout -d fitout` against the live local DB returns four draft rows created inside 46 seconds on 2026-09-03 (10:51:56Z, 10:52:13Z, 10:52:27Z, 10:52:39Z), all owned by `AcW4AhUfkMexEvvEUa8KjsngD7ubMoZy`, all `status = draft`, all `deleted_at IS NULL`. Four inserts in 46 seconds is the signature of a human pressing *Create listing*, getting a 404, going back, and pressing again.

⇒ **REFUTED: "the insert never landed."**  ⇒ **REFUTED: "soft-delete."**

### B2 — the app is pointed at that same database. MEASURED.

`.env.local` holds `DATABASE_URL=postgresql://fitout:***@localhost:5432/…` — a localhost URL, not a Neon cloud host. `src/lib/db/index.ts:5` binds one module-level `postgres()` singleton to that value.

⇒ **REFUTED: "the DB is pointing somewhere unexpected."** The repo's known Neon-CLI-rewrites-`.env.local` hazard is **not active right now**.

### B3 — the test suite is not eating the row. MEASURED.

`vitest.config.ts`'s header records two isolation layers, and `setupFiles: tests/setup.ts` **forces `DATABASE_URL` onto a separate `fitout_test` database** (`tests/helpers/test-db-url.ts`). `tests/global-setup.ts` TRUNCATEs *that* database, not `fitout`.

⇒ **REFUTED: "a test run truncated the row."**

### B4 — the owner matches. MEASURED.

`createDraftListing` writes `hostId: userId` where `userId = requireUserId()` = `session.user.id` (`src/app/actions/listing.ts:86-89`, `:112`, `:156-161`). The DB rows carry exactly that id. The `"user"` row `AcW4Ah…` is `host@fitout.test`, `can_host = t`, `email_verified = t`, `host_verification.status = approved` — so it also passes the D-255 gate at `listing.ts:139-146`, which is why the insert happened at all.

⇒ **REFUTED as the sole cause: "a session/user-id mismatch."** B5 proves the check never even runs.

### B5 — THE DECISIVE PROBE. MEASURED.

Against the dev server already running on `:3000`, with **no cookie at all**:

```
/host/listings                                   307 -> http://localhost:3000/login
/host/listings/new                               307 -> http://localhost:3000/login
/host/listings/<draft-uuid>/edit                 404
/host/listings/<draft-uuid>/availability         404
/host/listings/zzz/edit                          404
/host/listings/uat_listing_bookable/edit         404
/host                                            307 -> http://localhost:3000/login
/bookings/abc                                    307 -> http://localhost:3000/login
/listings/uat_listing_bookable                   200
/invite/abc                                      200
/ops                                             404
```

`EditListingPage` redirects to `/login` at `src/app/(host)/host/listings/[id]/edit/page.tsx:30-33` — **before** the `db.select()` at `:43` and long before the `notFound()` at `:50`. An anonymous caller that reaches that module can only produce a 307. It produced a 404.

⇒ **PROVEN: the page module is never invoked. The `notFound()` at `edit/page.tsx:50` — the IDOR guard the brief suspected — is not what the host is seeing.**

Note the shape: the failure is scoped to the `[id]` segment under `/host/listings` (both `edit` **and** `availability`, for any id including a non-UUID), while the static siblings route correctly and every other dynamic segment in the app (`/bookings/[id]`, `/listings/[id]`, `/invite/[token]`) routes correctly.

### B6 — THE SMOKING GUN. MEASURED.

The route is compiled but is absent from the manifest the dev router matches against.

- Compiled artifact **exists**: `.next/dev/server/app/(host)/host/listings/[id]/edit/page.js`, 6496 bytes, mtime `Sep 3 15:18`.
- `.next/dev/server/app-paths-manifest.json` (16 entries) **does not contain it**: `grep -c "listings/\[id\]/edit"` → **0**; same for `availability` → **0**. It *does* contain `/(host)/host/listings/page`, `/(host)/host/listings/new/page`, `/(ops)/ops/page`, `/listings/[id]/(detail)/page` and `/_not-found/page`.
- The **production** build's manifest is complete: `.next/app-path-routes-manifest.json` lists both `/host/listings/[id]/edit` and `/host/listings/[id]/availability`. **The source tree and the production build are correct.**
- The running server is confirmed `next dev`, not `next start`: the served HTML loads `static/chunks/node_modules_next_dist_compiled_next-devtools_index_*.js`, and `.next/dev/` (lock mtime `Sep 3 18:09`) is the live dist dir.

### The cause, stated at the level it is actually proven

**PROVEN:** the 404 is emitted by Next's router because `/(host)/host/listings/[id]/…` is missing from the running dev server's `app-paths-manifest.json`, despite the segment existing in source and having been compiled to disk. No FitOut code runs. `src/app/not-found.tsx:106` ("We couldn't find that page") is the **root** not-found rendering for an unmatched URL — which is byte-identical to what the edit page's own `notFound()` would render, and that collision is exactly why this looked like an application bug.

**STRONGLY SUPPORTED (not proven):** this is the stale-Turbopack-dev-route-cache hazard already recorded for this repo on 2026-07-24 — *"a long-running `next dev` can serve a STALE Turbopack route cache that returns 404 for valid routes… Fix: kill the dev server, `rm -rf .next`, restart."* The signature matches on every point except duration: this server is ~1.5h old (lock mtime 18:09 local, drafts at 18:52 local), not days old. That difference is worth noticing rather than smoothing over.

### UNPROVEN — the phase must close these before it claims a fix

1. **That `rm -rf .next` + restart makes it go away.** I did not restart the PM's dev server. Until someone does, "stale dev manifest" is the best-supported hypothesis, not a demonstrated cause.
2. **Whether it reproduces under `next build && next start`.** The production manifest is complete, which is *evidence* it would not — but a complete manifest is not a served 200. **If it does not reproduce in a production build, this is a local-tooling problem and must NOT be "fixed" by editing `edit/page.tsx`.** Note the memory-recorded gotcha for that check: `npm start` needs `PLATFORM_WALLET_NUMBER` / `PLATFORM_WALLET_NAME` passed inline or it 500s at `src/lib/paymongo.ts:42`.
3. **What made the entry go missing.** Candidates not discriminated: a compile error swallowed mid-session, an HMR write race, the `next build` at 15:57 racing the `next dev` on the shared `.next` parent (a hazard this repo has already recorded — *"`next build` and `next dev` share `.next`, so a build can force-stop the dev server"*), or a Turbopack bug. **Do not name one of these in a docblock without evidence.**
4. **Whether the four orphan drafts should be cleaned up.** They are real rows a real host created and cannot reach. That is a PM call, not a code call.

### The second-order defect this exposes, which IS in FitOut's code

**MEASURED:** `src/app/(host)/host/listings/new/page.tsx` is a **GET page with a database write as a side effect** — it calls `createDraftListing()` at `:80` and redirects at `:86`. Four rows in 46 seconds is what that costs when the destination fails: every retry mints another orphan draft. The `!res.ok` branch at `:81-84` is already documented at `:32-35` as a known silent bounce. A GET that writes has no idempotency and no recovery, which is why a routing glitch downstream produced four rows of garbage instead of one error message.

**Phase to address:** the hosting-surfaces-corrected phase — but its first task is a **reproduction gate**, not a code change: clear `.next`, restart, re-probe the ten URLs above, then repeat under a production build. Only if the 404 survives a clean production build does any source file get touched. Separately (and regardless of the outcome), make draft creation idempotent-or-recoverable so a failed redirect cannot mint orphans.

---

# Part 2 — Critical Pitfalls: putting ops on a subdomain

### Pitfall 1: The file you are told to edit is deprecated in the version you are running

**What goes wrong:** D-275 says *"the Host header is rewritten in `src/middleware.ts`"*. **MEASURED:** this repo runs Next **16.2.7** (`package.json` `^16.2.7`; `node_modules/next/package.json` 16.2.7), and Next's own build code at `node_modules/next/dist/build/index.js:651` emits `The "middleware" file convention is deprecated. Please use "proxy" instead.` (→ `nextjs.org/docs/messages/middleware-to-proxy`). The rename landed in 16.0.0. A phase that adds hostname logic to `src/middleware.ts` writes new code into a convention Next is actively warning about, and the migration then has to be redone later with a security-critical rewrite sitting inside it.

**Why it happens:** the decision text was written from the shipped file's name, not from the framework's current surface. `src/middleware.ts` exists and works, so nothing forces the question.

**How to avoid:** decide `middleware.ts` vs `proxy.ts` **once, in the phase's first plan, before the Host logic is written** — and if the answer is "rename", do the rename as its own commit with the existing `/login`/`/signup` deferral behaviour byte-unchanged, so the rewrite lands on a stable base. `src/middleware.ts`'s existing header (the `_sc` loop-guard reasoning, QK-IR9) must travel with it verbatim; it documents a measured 30-day lockout and is the most expensive comment in the file.

**Warning signs:** a deprecation line in `npm run dev` output that nobody reads; a plan that says "add to middleware" without naming a Next version.

**Phase to address:** the ops-subdomain phase, plan 1. A prerequisite, not a cleanup.

---

### Pitfall 2: The matcher becomes a security boundary by accident — and Server Functions are the hole

**What goes wrong:** **MEASURED:** `src/middleware.ts`'s `config.matcher` is `["/login", "/signup"]`. To do a Host rewrite for `ops.` the matcher must widen — and the moment someone widens it to "all paths except assets" and puts the ops host check inside it, the matcher's *coverage* becomes load-bearing. Next's proxy docs carry an explicit warning (relayed from the stack research) that **Server Functions / Server Actions are not reliably covered by matcher-based logic**. A POST to a server action carries the action id, not the page path, and can arrive on a hostname the rewrite never inspected.

**Why it happens:** a Host rewrite *looks* like routing, so it gets written as routing. Once it runs on every request it starts to feel like a gate, and the next person adds "and if the host is not `ops.`, block `/ops`" to it.

**How to avoid — this is the one that must not be gotten wrong:**

- **The rewrite is routing. It is never authorization.** `src/middleware.ts:1-7` already says this about itself in this repo's own words ("OPTIMISTIC ONLY — NOT the security boundary"). Keep that header and extend it to cover the Host logic.
- **`requireStaff()` stays called independently in every ops server action.** **MEASURED:** it already is — `src/app/actions/ops-review.ts:326, 421, 543, 642, 724`, `src/app/actions/ops-contact.ts:193`, and `src/app/(ops)/ops/page.tsx:130`. `src/lib/ops/staff.ts:92-108` records why: Next's own guidance that Server Actions must be treated "with the same security considerations as public-facing API endpoints". **Adding a hostname check must not license removing a single one of those calls.**
- Add a design test that counts `requireStaff()` call sites against the number of exported ops actions, so a new action cannot ship un-guarded.

**Warning signs:** any diff that removes a `requireStaff()` and adds a host condition; a matcher that grows a negative lookahead nobody can read; a plan that describes the middleware as "gating" anything.

**Phase to address:** ops-subdomain phase. Verification: POST an ops server action to the **apex** host with a non-staff cookie and assert the same `notFound()` refusal; then to the apex with a **staff** cookie and assert the action behaves by a rule the phase chose deliberately rather than discovered.

---

### Pitfall 3: The cookie domain — leak the session across subdomains, or lock staff out

**What goes wrong:** two opposite failures from one setting.

- Set the session cookie to `.fitout.example` (leading dot / `crossSubDomainCookies`) and **every** host under the domain sees it. The ops session is then present on the booker site, on any future `blog.`/`status.` host, and on anything a third party ever hosts on a subdomain. That is the exact opposite of the isolation D-275 buys.
- Scope it to `ops.fitout.example` only and sign-in works — but any flow that bounces through the apex (an OAuth callback, a password-reset link, an email-verification link, the `/auth/session-check` hop) lands on a host that cannot see the cookie. Staff appear signed out immediately after signing in, or loop.

**Why it happens:** **MEASURED:** `src/lib/auth.ts:62-63` configures exactly one origin — `baseURL: BETTER_AUTH_URL` and `trustedOrigins: [BETTER_AUTH_URL]`. There is no per-host cookie configuration anywhere in the tree. The single-origin assumption is baked into OAuth redirects, CSRF origin validation and every email link. Adding a second host is not a config toggle; it is a second origin the auth layer has never had.

**How to avoid:**

- **Do not enable cross-subdomain cookies.** The isolation is the point. Scope the ops session cookie to the ops host.
- **Enumerate every apex bounce before writing the cookie config.** **MEASURED**, the ones that exist today: `src/middleware.ts` redirects to `SESSION_CHECK_PATH` (`/auth/session-check`); `src/lib/auth.ts:78+` builds verification-email links from `BETTER_AUTH_URL`; `sendResetPassword` (`auth.ts:73`) does the same. Each is a host-crossing hazard and each needs an ops-aware answer.
- **`trustedOrigins` must gain the ops origin**, or Better Auth's CSRF origin validation rejects the ops sign-in POST outright. This is the most likely first-day failure: it returns an origin error and reads like a credentials bug. This repo has already met that shape once — the seed recipe records that Better Auth 403s `MISSING_OR_NULL_ORIGIN` without an explicit `Origin` header.
- Consider a distinct **cookie name/prefix** for ops, so a stray apex cookie can never be mistaken for an ops one.

**Warning signs:** sign-in succeeds (a row appears in `session`) but the next request is anonymous; an origin-mismatch error on the ops login POST; a `Set-Cookie` carrying a leading-dot `Domain`.

**Phase to address:** ops-subdomain phase. Verification: assert the ops `Set-Cookie` carries **no** `Domain` attribute (or exactly the ops host), and assert that presenting an ops session token to the apex host yields anonymous — not staff.

---

### Pitfall 4: The Host rewrite meets the `(ops)` route group and the byte-identical 404

**What goes wrong:** the rewrite maps `ops.host/` → `/ops`. Three things can break the D-219 cloak that 18-14 measured at 200/404/404/404 with sha256 body equality:

1. **A rewrite that leaks the mapping.** If `ops.host/anything` rewrites to `/ops/anything` and an unmatched sub-path returns a *different* 404 body than the apex's `/ops/anything`, the two hosts disagree — and the disagreement is an existence oracle.
2. **The apex must keep answering `/ops` exactly as it does today.** **MEASURED:** `/ops` on the apex currently returns **404** to an anonymous caller (probed this session). If the phase "cleans up" by making the apex `/ops` redirect to `ops.host`, that redirect *is* the oracle — it announces, unauthenticated, that the console exists and where it lives.
3. **A new `(ops)`-scoped `not-found.tsx`.** D-275 restates the ban and `src/lib/ops/staff.ts:101-105` gives the reason: a distinct 404 body under `/ops` is the same oracle wearing a different hat. **MEASURED:** the tree has exactly three not-found files — `src/app/not-found.tsx`, `src/app/(app)/bookings/[id]/not-found.tsx`, `src/app/(public)/invite/[token]/not-found.tsx` — and none under `(ops)`. Keep it that way.

**And the streaming trap, which the new ops routes will walk straight into.** **MEASURED:** `src/lib/ops/staff.ts:121-137` documents it in this repo's own measured words — every `(ops)` page is async, so the build-blocking `tests/design/loading-coverage.test.ts` **requires** a `loading.tsx` beside it; `loading.tsx` is a `<Suspense>` boundary; and once streaming starts the response has **already been sent as 200** and the status cannot change. That is why `assertStaff()` is awaited in the **layout** (`src/app/(ops)/ops/layout.tsx:69`) *in addition to* `requireStaff()` in the page (`page.tsx:130`). **Every new ops route — the sign-in surface, the invite surface, the expanded queue row — inherits this.** A new ops page with a `loading.tsx` and only a page-level guard answers 200 to a stranger while rendering a 404 body, and `curl -o /dev/null -w '%{http_code}'` is the whole attack.

**How to avoid:** treat the layout-level `assertStaff()` as a **required** companion to any new `(ops)` route, and re-run the 18-14 cloak measurement with the new routes in the probe set — which D-275 already names as a non-negotiable condition. The sign-in route is the awkward one: it must be reachable by a *non*-staff caller, so it cannot sit under the same blanket guard. Decide deliberately where the sign-in surface lives relative to the cloak, then **measure** the answer rather than reasoning about it.

**Warning signs:** a probe set that was not updated when a route was added; any `loading.tsx` added under `(ops)` without a matching layout guard; a 200 status with a 404 body.

**Phase to address:** ops-subdomain phase. This is the phase's headline verification, not a checklist item.

---

### Pitfall 5: `session.cookieCache` gets enabled as a "performance improvement" and no test goes red

**What goes wrong:** `requireStaff()` is correct only because it reaches the database on every call. **MEASURED:** `src/lib/ops/staff.ts:80-89` — `readStaff` is `cache()`-wrapped (request-scoped only) around `auth.api.getSession()`; `src/app/actions/ops-contact.ts:56` states the invariant outright. Enabling `session.cookieCache` would keep a **revoked** staff grant working for the cache TTL, and the brief already flags that **no test would go red**.

**Why it happens:** the ops console gets slower as the invite flow adds reads. `cookieCache` is the obvious lever and it is a one-line change in `src/lib/auth.ts`.

**How to avoid:** a build-blocking design test asserting `session.cookieCache` is absent from the Better Auth config — the same shape as this repo's existing `focus-recipe.test.ts` / `loading-coverage.test.ts` gates. **This is a net-new guard the phase must write**, because the property is currently protected only by prose. Pair it with a revocation test: grant staff, load an ops page, revoke via the CLI, assert the very next request refuses.

**Warning signs:** any diff touching `src/lib/auth.ts:54-64`; a plan that mentions ops latency.

**Phase to address:** ops sign-in / invite phase.

---

### Pitfall 6: Vercel preview hostnames (and every non-canonical host) break the Host match

**What goes wrong:** a Host match written as `host === "ops.fitout.example"` fails on every deployment URL that is not that literal — preview deployments (`fitout-git-branch-team.vercel.app`), a `*.vercel.app` production alias, `localhost:3000`, a LAN IP, an ngrok tunnel. The symptom depends on which way the condition falls: either ops is unreachable on previews (annoying), or **the fall-through serves the ops console on the apex** (a real exposure, mitigated only by `requireStaff()` — which is precisely why Pitfall 2 insists that guard survives).

**Why it happens:** the canonical host is the only one anyone tests.

**UNPROVEN:** whether Vercel previews apply at all. This repo's stack notes argue *against* Vercel-only deployment for the webhook/worker half, and I found **no deployment configuration in the tree** to confirm the target platform. The generic form of the pitfall (non-canonical hosts) applies regardless; the Vercel-specific form may not.

**How to avoid:**

- Drive the host match from **configuration, not a literal**: an `OPS_HOST` env var with an explicit dev default. This repo already has the idiom — `next.config.ts:42-53` reads `NEXT_DEV_ALLOWED_ORIGINS` from env precisely so a machine-specific hostname is never committed, and its comment ("DO NOT 'tidy' this into a hardcoded array") is the same lesson.
- **Fail closed on an unrecognised host:** unknown host ⇒ serve the public site, never the ops surface.
- Give local dev a real answer up front (`ops.localhost:3000` resolves on most systems; `NEXT_DEV_ALLOWED_ORIGINS` already exists to admit it). **MEASURED hazard:** `next.config.ts:15-23` records that a non-`localhost` dev origin silently kills hydration — the page paints and ignores every click, with 200s on every asset. An ops console tested from a LAN IP or tunnel will hit this and it does not look like a security block.

**Warning signs:** a string-literal hostname in `middleware.ts`/`proxy.ts`; ops working on the deploy but not on a preview; an ops page that renders but does not respond to clicks in dev.

**Phase to address:** ops-subdomain phase.

---

### Pitfall 7: Removing the host queue removes the only home for the enforcement levers — except there is no home already

**What goes wrong:** D-276 removes the manual host-approval queue but explicitly keeps hosts in ops for **enforcement** (ENF-01/ENF-02) and **contact** (OPS-06). **MEASURED:** `suspendHost` is exported at `src/app/actions/ops-review.ts:542` and has **no UI caller** — `grep -rn "suspendHost" src/` returns only its own definition and import, its Zod schema (`src/lib/validation/ops.ts:136, 198`), and a *comment* at `src/app/actions/cancel-booking.ts:1397`. No `.tsx` file imports it.

So the enforcement lever D-276 promises to preserve is **already unreachable from the UI today**. Deleting the host queue branch does not remove a working surface — it removes the last plausible *place* to put one, and leaves a shipped, tested, audited server action with no door at all.

**Why it happens:** D-276 reasons about requirements (ENF-01/ENF-02 are marked shipped) rather than about call graphs. A requirement can be satisfied by an action that exists and is tested while still being unreachable by a human.

**How to avoid:** before the queue branch is deleted, **inventory the ops server actions against their UI callers**, and treat any zero-caller action as an open question for the PM — not as dead code to delete, and not as a working feature to preserve. Either give `suspendHost` a control in the surviving ops surface, or record explicitly that ENF-01 is server-only pending one.

**Warning signs:** "we kept X" in a decision, with no component importing X.

**Phase to address:** the queue-removal phase, as its first task.

---

### Pitfall 8: The staff/host exclusivity rule is already violated by the dev seed

**What goes wrong:** D-275 states *"a staff account may not simultaneously be a booker or a host."* **MEASURED:** the seeded UAT account `host@fitout.test` (id `AcW4AhUfkMexEvvEUa8KjsngD7ubMoZy`) currently holds `role = 'staff'` **and** `can_host = t` **and** an `approved` host verification. It is the same account that created the four orphan drafts in Defect B. If the new rule lands as a hard server-side invariant, the primary local UAT account stops working on the host surface mid-phase, with no obvious cause.

**Why it happens:** the CLI grant (`src/lib/ops/grant.ts`) writes `role` through Drizzle and has no capability check, because under D-217 there was no exclusivity rule to enforce.

**How to avoid:** decide the migration story *with* the rule — what happens to accounts that already hold both. Refuse-at-grant (new grants only), refuse-at-use (existing accounts break), or a one-off remediation. Whichever is chosen, **re-seed or split the local UAT account in the same plan** and update the local-env memory; otherwise the next UAT walk reports a phantom regression.

**Warning signs:** an exclusivity check landing without a backfill or a seed update; UAT suddenly failing on host surfaces.

**Phase to address:** ops sign-in / invite phase.


---

# Part 3 — Critical Pitfalls: bolting an invite/onboard flow onto an existing email-verification flow

### Pitfall 9: The invite token becomes a second, weaker way to become staff

**What goes wrong:** D-217's whole fear was an arbitrary-target role-grant HTTP path. D-275 supersedes the *consequence* but not the *fear*. An invite flow reintroduces exactly that path unless the token is the target: if the accept endpoint takes `{ token, email }` and grants staff to `email`, the token has become a bearer credential for granting **anyone** staff.

**Why it happens:** the invite record and the accepting account feel like separate things, so the endpoint is written to accept both.

**How to avoid:** **the invite row is the sole source of the target.** The accept endpoint takes the token and nothing else that influences who is granted; the email is read from the invite row, never from the request body. This is the server-side analogue of `role: { input: false }` at `src/lib/auth.ts:112`, and it should be argued in the code from that precedent so the next reader sees them as one rule.

**MEASURED precedent to reuse rather than invent:** this repo already ships a bearer-credential invite with the right properties — the group invite token at `src/lib/db/schema.ts:1317`, "minted from crypto randomBytes (Plan 08-02), NEVER a sequential id", ~100-bit Crockford, with regeneration for a leaked link. Copy that shape (entropy, storage, regeneration) rather than reaching for a new one.

**Warning signs:** an accept handler whose Zod schema has more than one field; any code path that resolves the grantee from the session or the body instead of the invite row.

**Phase to address:** ops sign-in / invite phase.

---

### Pitfall 10: Invite token reuse — one link, many staff

**What goes wrong:** the token is checked for existence and expiry but never **consumed**, so the same link grants staff every time it is opened. Forwarded email, a browser prefetch, a corporate link-scanner that GETs every URL in an inbound message — each one mints another staff account or re-grants a revoked one.

**Why it happens:** consumption is a write, and the accept path already does a write (the role flip), so it feels done. Expiry alone reads as sufficient.

**How to avoid:**

- **Single-use, enforced at the database, not in application logic.** A conditional update — `UPDATE staff_invite SET accepted_at = now(), accepted_by = $1 WHERE token_hash = $2 AND accepted_at IS NULL RETURNING *` — and grant only if a row comes back. Zero rows means already used. This is the same class of guarantee as the `host_payout_ledger` at-most-once claim and the group-booking `SELECT … FOR UPDATE` seat claim; the repo already has the idiom twice.
- **Store a hash of the token, not the token**, so a database read does not hand an attacker a working invite.
- **Do not accept on GET.** The link lands on a page; a deliberate POST accepts. Otherwise a link scanner burns the invite before the human sees it, and the human then reports the invite as broken.
- Short TTL, and an explicit revoke path for an invite sent to the wrong address.

**Warning signs:** an accept path with no `UPDATE … WHERE accepted_at IS NULL`; an invite that still works after being used; "the invite link didn't work for me" from someone whose mail provider scans links.

**Phase to address:** ops sign-in / invite phase. Verification: accept the same token twice concurrently from two connections and assert exactly one grant and one audit row.

---

### Pitfall 11: An unverified invitee holds staff privilege

**What goes wrong:** **MEASURED:** `src/lib/auth.ts:67` sets `requireEmailVerification: false` — a deliberate SOFT gate (D-07) — and `autoSignIn: true` at `:71`. So an account can sign in *and hold a role* without its email ever being verified. If the invite flow creates the account and grants staff before verification, **control of the mailbox was never proven**, and the invite email is the only thing that ever pointed at that mailbox.

**Why it happens:** the soft gate is correct for bookers and hosts and has been correct for the whole project's life. Nobody re-asks the question for a privileged account, because the setting is global.

**How to avoid:** **the invite acceptance IS the proof of mailbox control** — but only if the token was delivered to that mailbox and is consumed there. Make that explicit rather than incidental:

- Grant staff **only** in the same transaction that consumes the invite, and derive the account's email from the invite row (Pitfall 9).
- Set `emailVerified` at acceptance, from the invite, rather than leaving the account soft-gated. The invite link *is* a verification link; treat it as one.
- Do **not** flip the global `requireEmailVerification` to `true` to solve this. That changes booker and host sign-in across the whole product — a scope change nobody decided, and D-07 is a shipped decision.

**Warning signs:** a staff account with `email_verified = f`; a plan that proposes changing `emailAndPassword.requireEmailVerification`.

**Phase to address:** ops sign-in / invite phase.

---

### Pitfall 12: Self-revoke, or last-staff-revoke, locks every human out of the console

**What goes wrong:** an operator revokes their own grant, or revokes the only other staff member, and now **nobody can reach `/ops`** — including to grant anyone back. Because the refusal is a byte-identical 404 (`src/lib/ops/staff.ts:110-114`), the console does not say "you have no staff"; it says nothing at all, exactly as it would if the route did not exist. The failure is silent by design.

**MEASURED:** the shared write body `writeRole` (`src/lib/ops/grant.ts:183-216`) has **no self-revoke guard and no last-staff guard**. It resolves a target, flips `user.role`, writes an audit row, and returns. `listStaff` (`grant.ts:233`) exists and would make a count trivial, but nothing calls it on the revoke path.

**Why it happens:** under D-217 the CLI was the only door, and anyone holding `DATABASE_URL` could always undo a mistake. **The moment revoke exists in the UI, that assumption is gone** — the recovery path is precisely the thing that was just destroyed.

**How to avoid:**

- **Keep the CLI as break-glass — D-275 already says so, and this pitfall is the reason it matters.** The `ops:grant` / `ops:revoke` / `ops:staff` scripts must not be deleted as "superseded", and someone must retain the ability to run them. Write that down where the UI revoke lives, not only in the decision log.
- **Refuse the last revoke** (count staff in the same transaction; refuse if it would reach zero) and **refuse self-revoke from the UI** — a second operator can always do it, and requiring one is a cheap two-person rule on the only irreversible ops action.
- Make the refusal a *named* refusal in the ops UI, not a 404. The cloak protects the surface from strangers; it should not hide a business rule from an authenticated operator standing in front of it.

**Warning signs:** a revoke control with no confirmation naming who is left; `listStaff` still having no caller after the phase; nobody able to say who can run the CLI in production.

**Phase to address:** ops sign-in / invite phase. Verification: with exactly one staff account, attempt revoke and assert it is refused with a legible reason **and** that the account still reaches `/ops` afterwards.

---

### Pitfall 13: The audit trail loses its actor, or gains PII, on the way through the new flow

**What goes wrong:** the invite flow adds new privileged events — invited, accepted, revoked — and the obvious thing to record is *who was invited*, which is an email address. **D-72 forbids PII in `audit.meta`, in any log line, and in any column.**

**MEASURED:** the CLI already gets this exactly right and its reasoning is quotable — `src/lib/ops/grant.ts:191-199` writes `meta: { reason: "target_not_found" }` and **deliberately omits the operator-typed target**, because for a row that does not exist the only handle held is an email address; and the success path writes `meta: { targetUserId, previousRole, role }` — ids and enum-shaped values only (`grant.ts:210-213`).

**How to avoid:** copy that discipline into the invite path, including the awkward case: an invite to an address with **no user row yet** has no id to record. Record the invite row's own id, never the address. Every ops action already carries an authenticated `actorId` from `requireStaff()`'s return value (`src/lib/ops/staff.ts:107-113`) — the invite actions must do the same rather than asserting an actor.

**Warning signs:** `meta: { email: … }`; a console.log in the accept handler; an invite audit row with a null actor.

**Phase to address:** ops sign-in / invite phase.

---

## Technical Debt Patterns

| Shortcut | Immediate benefit | Long-term cost | When acceptable |
|---|---|---|---|
| Put the Host check in `middleware.ts` and skip the `proxy.ts` rename | One less moving part in the phase | A security-critical rewrite has to be re-homed later, on a deprecated convention, with the QK-IR9 loop-guard reasoning riding along | Only if the rename is scheduled in the same milestone and written into the roadmap, not "later" |
| Let the middleware host check double as the ops gate and thin out `requireStaff()` | Fewer DB reads, simpler code | Server Actions are not reliably matcher-covered; the gate stops being a gate for the exact requests that are public-facing endpoints | **Never** |
| Enable `session.cookieCache` for ops latency | Faster ops pages | A revoked staff grant keeps working for the TTL, and no existing test goes red | **Never** — and add the gate that makes it fail loudly |
| Cross-subdomain cookie so one session covers apex + ops | Sign-in "just works" everywhere | The isolation D-275 exists to buy is gone; the ops session is visible to every present and future subdomain | **Never** |
| Redirect apex `/ops` → `ops.host` for convenience | Old bookmarks keep working | The redirect is an unauthenticated existence oracle; it defeats the cloak 18-14 measured | **Never** |
| Fix `/host/listings` alignment with `h-full` on `Card` | Looks like a fix, one word | A no-op (grid items already stretch) that closes the ticket without fixing the footer band; the defect returns with a different explanation | Never — the fix is `flex-1`/`mt-auto` |
| Patch the listing-creation 404 by loosening the edit page's ownership check | Symptom disappears in dev | Weakens a shipped IDOR guard to work around a dev-server routing failure that does not exist in the production build | **Never** — reproduce under a clean build first |
| Delete `suspendHost` as dead code when the host queue goes | Smaller diff | Silently un-ships ENF-01 three days after it was validated | Never — escalate to the PM |
| Keep the CLI grant but let nobody in production be able to run it | No ops burden | The break-glass path exists on paper only; last-staff revoke becomes unrecoverable | Never |

## Integration Gotchas

| Integration | Common mistake | Correct approach |
|---|---|---|
| Better Auth ↔ second origin | Adding the ops host and leaving `trustedOrigins` at `[BETTER_AUTH_URL]` (`src/lib/auth.ts:63`) | Add the ops origin explicitly; expect an origin-validation 403 on the ops sign-in POST until you do, and recognise it as config, not credentials |
| Better Auth ↔ cookie scope | Reaching for `crossSubDomainCookies` because sign-in "doesn't stick" | Scope to the ops host and fix the *bounce* (`/auth/session-check`, reset/verify links built from `BETTER_AUTH_URL`) instead |
| Better Auth ↔ `role` | Granting via `auth.api.updateUser` | Impossible and forbidden — `role` is `input: false` (`auth.ts:112`); write through Drizzle in the sanctioned module (`src/lib/ops/grant.ts`), as `src/app/actions/capability.ts:75` does for `canHost` |
| Next 16 ↔ `(ops)` route group | Assuming the group name appears in the URL | Route groups are erased from the path; the rewrite target is `/ops`, and the group only affects which layout applies |
| Next 16 ↔ `notFound()` under Suspense | Guarding a new ops page only at page level | The `loading.tsx` boundary means the 200 has already been sent (`src/lib/ops/staff.ts:121-137`); guard in the layout **as well** |
| Next 16 ↔ dev server | Trusting a `next dev` 404 as evidence about the app | **MEASURED this session:** a compiled route can be missing from `.next/dev/server/app-paths-manifest.json` and 404 with no code running. Re-check against a production build before believing any 404 |
| Resend ↔ invite email | Testing the invite by sending to a seeded `@fitout.test` address | Resend rejects every recipient but the account owner until a domain is verified; the send is composed, dispatched and 403'd with no `[email:dev]` marker. Read the composed payload out of Postgres instead |

## Performance Traps

| Trap | Symptoms | Prevention | When it breaks |
|---|---|---|---|
| Full listing detail expanded in place on every queue row | Ops queue slows as the catalogue grows; N photo/amenity/tag reads per page | Load detail **on disclosure**, or one grouped read for the page — the `coverByListing` / `rejectionReasonByListing` idiom at `page.tsx:66, 115`, never a query inside `rows.map` (T-IU7-04) | As soon as the queue holds more than a screenful |
| `requireStaff()` per action reads the session every time | Ops pages feel slower than the rest of the app | Accept it. `readStaff` is already `cache()`-wrapped per request (`staff.ts:80`), which is the only optimisation that is safe here | Never worth trading for `cookieCache` |
| Host verification roadmap recomputed per surface | Three surfaces disagree, or three reads per page | `loadHostVerification` already exists and is already shared by `/host`, `/host/listings` and `/host/earnings` (`page.tsx:86` and its comment) — extend it, do not add a second read | At any scale; this is correctness, not speed |

## Security Mistakes

| Mistake | Risk | Prevention |
|---|---|---|
| Treating the Host rewrite as authorization | Ops surface reachable on the apex, or on any unmatched host, for anyone | Keep `requireStaff()` in every page and every action; middleware stays optimistic |
| Distinguishable refusal on any new ops route | Existence oracle — a prober learns the console is real and worth attacking | Byte-identical `notFound()`; no `(ops)`-scoped `not-found.tsx`; re-measure the cloak with the new routes in the probe set |
| 200 status with a 404 body on a new ops route | Same oracle via `curl -w '%{http_code}'`, with no data leaked | Layout-level `assertStaff()` beside every `loading.tsx` |
| Invite accept that takes the grantee from the request | An arbitrary-target role-grant endpoint — exactly what D-217 refused | Target comes from the invite row only |
| Invite token replay | Repeated grants; a revoked account silently re-granted | Single-use enforced by a conditional `UPDATE … WHERE accepted_at IS NULL`; store a hash |
| Staff granted before mailbox control is proven | Privilege on an address nobody verified | Grant only on invite consumption; set `emailVerified` from the invite; do not touch the global soft gate |
| Email address in `audit.meta` or a log line | D-72 violation on the most privileged event in the system | Ids and enum-shaped values only — copy `grant.ts:191-213` |
| Enabling `session.cookieCache` | Revocation stops being revocation for the TTL | Build-blocking config assertion |

## UX Pitfalls

| Pitfall | User impact | Better approach |
|---|---|---|
| A staff member who mistypes the ops URL gets a bare 404 | Indistinguishable from "I am not staff" and from "the site is broken" | Accept it for strangers — that is the point — but make the *authenticated* ops surface state clearly who you are signed in as |
| The rejection resubmit path stays implicit | The host trips a material edit by accident and cannot tell they re-entered review (D-278's whole complaint) | An explicit control, and a status/history the host can read without guessing |
| Verification roadmap that shows steps without showing *where the host stands* | A roadmap is not a state; the host still cannot answer "what do I do now" | One current step, one action, and the prior rejection reason kept visible while they fix it (D-249) |
| Four unreachable orphan drafts left in the host's grid | The host sees listings they created and cannot open | Decide their fate explicitly once the 404 is closed |
| Silent bounce on `createDraftListing` failure | Host presses *Create listing*, lands back on the grid, told nothing — already recorded as a known blind spot at `new/page.tsx:32-35` | Give the `!res.ok` branch a sentence; it is now the only branch that can fire |

## "Looks Done But Isn't" Checklist

- [ ] **Ops subdomain:** the apex still answers `/ops` with a byte-identical 404 — verify the sha256 body equality probe re-run with **every** new route, not just the ones that existed at 18-14.
- [ ] **Every new `(ops)` route:** has a `loading.tsx` (build gate requires it) **and** inherits a layout-level `assertStaff()` — verify the HTTP *status*, not the body.
- [ ] **Ops sign-in:** works from the ops host in a browser with no apex cookie at all — verify `trustedOrigins` and that the `Set-Cookie` has no wildcard `Domain`.
- [ ] **Session isolation:** an ops session token presented to the apex is anonymous — verify, do not assume.
- [ ] **Revocation:** still takes effect on the very next request — verify `session.cookieCache` is absent from the config, by a test.
- [ ] **Invite:** the same token cannot be accepted twice — verify under genuine concurrency, not sequentially.
- [ ] **Last staff:** the console cannot be emptied — verify the refusal, and verify the CLI break-glass path still runs.
- [ ] **Queue row:** still zero anchors and zero `[role="link"]`, on both row kinds, before *and after* the new detail disclosure — D-274 was re-tightened for a reason.
- [ ] **Enforcement:** `suspendHost` has a caller, or the PM has explicitly accepted that it does not.
- [ ] **`/host/listings`:** footers align at the card bottom **and** do not overflow — two separate assertions; fixing one does not fix the other.
- [ ] **Listing-creation 404:** reproduced (or not) under a clean production build before any source file is edited.

## Recovery Strategies

| Pitfall | Recovery cost | Recovery steps |
|---|---|---|
| Cookie scoped wrong (leaked across subdomains) | LOW | Change the scope, rotate `BETTER_AUTH_SECRET`, force re-auth. Cheap only if caught before a real staff session existed on a shared host |
| Cookie scoped wrong (staff locked out) | LOW | Config change plus redeploy; the CLI still works, so nothing is unrecoverable |
| Cloak broken by a new route | LOW if caught by the probe set, HIGH if found by a prober | Re-measure, restore the identical refusal, and add the route to the standing probe set |
| `cookieCache` enabled and a revocation missed | MEDIUM | Disable, invalidate sessions, audit what the revoked actor did during the TTL — the audit rows exist and carry an authenticated actor |
| Invite token reused to mint an extra staff account | MEDIUM | `npm run ops:staff` to enumerate, `ops:revoke` the extras, read the audit rows for what they touched |
| Every staff revoked | MEDIUM — and **only** if the CLI survived | `npm run ops:grant` from a shell with `DATABASE_URL`. If the CLI was deleted as superseded, this becomes a manual production DB write |
| Listing-creation 404 "fixed" by loosening the IDOR guard | HIGH | Revert; re-derive from the routing evidence. A weakened ownership check on a host surface is a real exposure traded for a dev-server artifact |
| `suspendHost` deleted with the host queue | MEDIUM | Revert the deletion; the action, its schema and its tests are shipped and were validated on 2026-09-01 |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention phase | Verification |
|---|---|---|
| 1 · deprecated `middleware` convention | Ops subdomain, plan 1 | No deprecation warning in `npm run dev`; the `/login` + `/signup` deferral behaviour unchanged across the rename |
| 2 · matcher as accidental gate; Server Functions uncovered | Ops subdomain | `requireStaff()` call-site count ≥ exported ops action count, asserted by a design test; apex-host action POST refused identically |
| 3 · cookie domain scoping | Ops subdomain | `Set-Cookie` has no wildcard `Domain`; ops token is anonymous on the apex; ops sign-in POST succeeds (i.e. `trustedOrigins` updated) |
| 4 · rewrite vs route group vs `notFound()` + the streaming 200 | Ops subdomain | 18-14 cloak re-measured with **all** new routes; status codes checked separately from bodies; still no `(ops)` not-found file |
| 5 · `session.cookieCache` | Ops sign-in / invite | Build-blocking config assertion + a grant→revoke→next-request test |
| 6 · non-canonical / preview hostnames | Ops subdomain | Host read from config; unknown host serves the public site; ops reachable at the dev host without hydration loss |
| 7 · `suspendHost` has no UI caller | Queue removal, first task | Action-to-caller inventory reviewed by the PM before the branch is deleted |
| 8 · staff/host exclusivity vs the dev seed | Ops sign-in / invite | The rule ships with a migration decision **and** a re-seeded UAT account |
| 9 · invite target from the request | Ops sign-in / invite | Accept schema has exactly one field; grantee derived from the invite row |
| 10 · invite token reuse | Ops sign-in / invite | Concurrent double-accept yields one grant, one audit row |
| 11 · unverified invitee holds privilege | Ops sign-in / invite | No staff account with `email_verified = f`; global soft gate untouched |
| 12 · self / last-staff revoke lockout | Ops sign-in / invite | Last revoke refused legibly; CLI break-glass proven to still run |
| 13 · PII in the new audit rows | Ops sign-in / invite | Invite audit meta carries ids only, including on the no-such-user branch |
| A · `/host/listings` alignment + overflow | Hosting surfaces corrected | Equal `offsetHeight` **and** footer flush to the card bottom; `scrollWidth == clientWidth` on the footer at 320 / sm / lg |
| B · listing-creation 404 | Hosting surfaces corrected, as a **reproduction gate** before any edit | Clean `.next` + restart, re-probe the ten URLs; then repeat under `next build && next start`. Source is touched only if the 404 survives that |

## Sources

- **This repository's tree, database and running dev server, 2026-09-03** — the great majority of the claims above. Files and line numbers cited inline; the live probes are the ten-URL curl matrix, the `psql` read of `listing` / `user` / `host_verification` in `fitout-db-1`, and the `.next/dev/server/app-paths-manifest.json` inspection. **HIGH**
- `node_modules/next/dist/build/index.js:651` (Next 16.2.7, installed) — the `middleware` → `proxy` deprecation warning, read locally rather than from docs. **HIGH**
- Next.js proxy documentation — the Server Functions / matcher-coverage warning. Relayed from the stack researcher this milestone, **not** re-fetched here. **MEDIUM**
- `.planning/PROJECT.md` — D-275, D-276, D-277, D-278; the v1.2 milestone brief; the carried-forward constraints. **HIGH**
- `src/lib/ops/staff.ts` — the three-layer guard, the streaming-200 argument, and the no-`(ops)`-not-found rule, in the project's own measured words. **HIGH**
- `src/lib/ops/grant.ts` — the D-217 grant policy, the D-72 audit discipline, and the absence of a self/last-staff revoke guard. **HIGH**
- Project memory: `local-env-and-uat-seed` (the stale Turbopack route-cache 404 recorded 2026-07-24; the Resend recipient rejection; the prod-mode env requirements) and `neon-cli-overwrites-env-local`. **MEDIUM** — recorded prior measurements, re-checked here where possible.

---
*Pitfalls research for: subdomain-scoped ops console + staff onboarding on an existing Next.js 16 marketplace*
*Researched: 2026-09-03*
