# Architecture Research

**Domain:** Integrating verification & operations capabilities into a shipped Next.js 16 App Router marketplace (FitOut v1.2)
**Researched:** 2026-09-03
**Confidence:** HIGH for everything read from the tree and from the installed `better-auth@1.6.14` package; MEDIUM where a runtime behaviour needs measuring (marked inline)

> **Method.** Every claim below carries a `file:line` that was READ during this research, not recalled.
> Where a claim could not be settled by reading, it is marked **NOT DIAGNOSED** or **NEEDS MEASUREMENT**
> rather than asserted.

---

## Two corrections to the milestone brief, before anything else

### Correction 1 — `drizzle/` ends at `0029`, not `0026`

The brief states "migrations end at `0026_host_verification_listing_review.sql`". Measured against disk:

```
drizzle/0026_host_verification_listing_review.sql
drizzle/0027_cancelled_by_ops.sql
drizzle/0028_ops_notification_types.sql
drizzle/0029_listing_review_cascade.sql
```

`src/lib/db/schema.ts:452` confirms it in prose at the `listingReview` table: *"`cascade`, and it CHANGED —
D-254 (`drizzle/0029`) supersedes the `restrict` D-221 shipped here."* Any plan that asserts a
"migrations end at 0026" invariant will be false on arrival, and any `drizzle-kit generate` will number
from `0030`.

### Correction 2 — ⚠ `suspendHost` HAS NO UI CALLER. D-276 COSTS MORE THAN IT SAYS.

This is the single most consequential finding in this document, and it changes what D-276 is buying.

D-276's text says hosts *"remain reachable in ops for **enforcement** (suspend / payout freeze — ENF-01,
ENF-02) and **contact** (OPS-06)"*, and its rationale says removing those "would undo requirements
shipped three days earlier". **Both of those affordances live on the host queue row, and only there.**

Measured:

- `suspendHost` is defined at `src/app/actions/ops-review.ts:542`. A repo-wide grep for `suspendHost`
  across `src/`, `tests/` and `e2e/` returns its definition, its Zod schema
  (`src/lib/validation/ops.ts:136`), a doc reference in `src/app/actions/cancel-booking.ts:1397`, and
  test callers only. **Zero component imports it.**
- The only component that imports ops actions is `src/components/ops/ops-decision-actions.tsx:59-64`,
  which imports `approveHost`, `approveListing`, `rejectHost`, `rejectListing` and
  `cancelBookingAsOps`. `suspendHost` is not among them.
- The contact reveal is mounted twice and both mounts are inside the queue row:
  `src/components/ops/ops-queue-row.tsx:279` (listing branch) and `:295` (host branch).

**Therefore:**

| Requirement | Where it is reachable TODAY | After the host branch is removed |
|---|---|---|
| ENF-01 / ENF-02 (suspend + payout freeze) | Nowhere in the UI. `POST` to the server action only. | Still nowhere. Unchanged, but now permanently so — the row that *would* have carried the button is gone. |
| OPS-06 (host contact reveal) | `ops-queue-row.tsx:295` on the host row; `:279` on the listing row | Survives on the **listing** row only. A host with no pending listing becomes unreachable from ops. |

So D-276 as written cannot be satisfied by deletion alone. Removing the host-pending branch **requires**
building the enforcement surface that ENF-01/ENF-02 never got, or the milestone ships with two
"Validated" requirements that have no operator-reachable surface at all. This is a scope item, not a
detail, and it should be named in the roadmap rather than discovered during execution.

## Standard Architecture

### System Overview — the two-host partition v1.2 introduces

```
                    DNS
        ┌────────────────────────────┐
        │                            │
  fitout.example              ops.fitout.example
        │                            │
        └──────────┬─────────────────┘
                   │  ONE Next.js process, ONE `user` table, ONE Better Auth instance
        ┌──────────▼─────────────────────────────────────────────────┐
        │  src/middleware.ts   ← NEW JOB: Host-header partition       │
        │  (today: matcher ["/login","/signup"] only, :71)            │
        ├─────────────────────────────────────────────────────────────┤
        │  apex host                    │  ops host                   │
        │  ─ (app) booker surfaces      │  ─ /ops  (rewritten from /) │
        │  ─ (host) host surfaces       │  ─ ops sign-in  (NEW group) │
        │  ─ /login /signup             │  ─ /api/auth/*              │
        │  ─ /ops  → MUST 404           │  ─ everything else → 404    │
        ├─────────────────────────────────────────────────────────────┤
        │  THREE-LAYER GUARD (Host-agnostic, unchanged by the rewrite)│
        │   L1 assertStaff()  (ops)/ops/layout.tsx:69  → status line  │
        │   L2 requireStaff() (ops)/ops/page.tsx:130   → the gate     │
        │   L3 requireStaff() first stmt of all 7 ops actions         │
        │   refusal = notFound() everywhere (src/lib/ops/staff.ts:112)│
        ├─────────────────────────────────────────────────────────────┤
        │  PostgreSQL 18 — NO NEW TABLES, NO NEW COLUMNS IN v1.2      │
        │  user · host_verification · listing · listing_review · audit│
        └─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities (as they stand today, before v1.2)

| Component | Responsibility | Implementation, measured |
|---|---|---|
| `src/middleware.ts` | Optimistic stale-cookie deferral on `/login` + `/signup` ONLY | `:43` the function, `:47` the `LOGGED_OUT_ONLY.some(startsWith)` early-out, `:71` `matcher: ["/login","/signup"]`. Touches no DB, imports nothing from auth or db — declared at `:1-7`. |
| `(ops)/ops/layout.tsx` | LAYER 1 — wins the 404 **status line**, explicitly NOT the security boundary | `:69` `await assertStaff()`. Header `:5-23` states it is not a boundary. `:79` `brandHref="/ops"`. `:82-86` `nav` omitted = D-246 rendered. |
| `(ops)/ops/page.tsx` | LAYER 2 — the gate, plus all label composition server-side | `:130` `await requireStaff()`. `:132` loads queue + DB clock. `:140-164` composes every finished label. |
| `src/lib/ops/staff.ts` | The one staff predicate + both callers | `:80-89` `readStaff` (positive `role === "staff"`, nullable-column argument at `:47-53`). `:110-114` `requireStaff` → `notFound()`. `:142-144` `assertStaff`. |
| `src/lib/ops/review-queue.ts` | ONE interleaved oldest-first queue over two branches | `:232-253` host branch (`WHERE hv.status = 'pending'` at `:251`). `:256-303` listing branch. `:178-182` `LISTING_QUEUE_PREDICATE`. `:335-341` the JS interleave. |
| `src/components/ops/ops-queue-row.tsx` | TERMINAL row, one tree at every width | `:219` `RowCard` with no `href` and no `media`. `:249` `PhotoGallery` reused verbatim. `:279` / `:295` the two `OpsContactReveal` mounts. |
| `src/lib/ops/grant.ts` | The ONLY sanctioned writer of `user.role` | `:207` `dbConn.update(user).set({ role })`. `:77` `STAFF_ROLE = "staff"`. `:233` `listStaff`. Header `:16-21` records why it cannot go through Better Auth. |
| `src/lib/auth.ts` | One Better Auth instance | `:62` `baseURL`, `:63` `trustedOrigins: [BETTER_AUTH_URL]`, `:112` `role: {... input: false }`. **No `advanced` block anywhere in the file** (grepped). |

## Integration Points, per v1.2 item

Each item below states: what exists today (with `file:line`), what is NEW vs MODIFIED, whether a
**schema migration is required**, and which asserted property it touches.

---

### Item 1 — Serve ops from an `ops.` subdomain via a Host-header rewrite

#### ⚠ First: `middleware.ts` is not the permanent home in Next 16

The stack researcher established that **Next.js 16.0.0 deprecated `middleware` in favour of `proxy`**,
and this repo runs **16.2.7** (`(ops)/ops/error.tsx:19` pins the version in its own TODO:
*"`next@16.2.7`'s `ErrorInfo` is `{ error, reset, unstable_retry }`"*). So the Host rewrite should be
framed as **"the proxy layer"**, not as "more code in `middleware.ts`".

What exists today, measured:

- `src/middleware.ts:43` — `export function middleware(request: NextRequest)`.
- `src/middleware.ts:71` — `matcher: ["/login", "/signup"]`. That is the entire surface it runs on.
- `src/middleware.ts:47` — every path is early-outed unless it `startsWith` a `LOGGED_OUT_ONLY` member
  (`src/lib/session-check.ts:65` = `["/login", "/signup"]`).
- `src/middleware.ts:1-7` — the file's own contract: *"OPTIMISTIC ONLY — NOT the security boundary … This
  file still touches no database, still imports nothing from the auth or db layer, and still makes no
  authoritative decision."*

**What changes.** A Host partition cannot run on a two-path matcher; it must run on effectively every
request. That is the single largest behavioural change in this item, and it has three consequences:

1. The `LOGGED_OUT_ONLY` early-out at `:47` **preserves the shipped `/login` + `/signup` behaviour
   byte-for-byte** even under a global matcher — the deferral logic is already guarded by that
   predicate. Nothing about QK-IR9's stale-cookie fix needs to move.
2. The "touches no database, imports nothing from auth or db" property becomes **more** load-bearing, not
   less, because the code now runs on the money paths too. It must be preserved explicitly, and the file
   header at `:1-7` should be extended rather than replaced.
3. Whether this lands in `middleware.ts` or a new `proxy.ts` is a plan-time call, but the roadmap should
   name it as a **migration**, so the deprecation is paid once rather than twice.

#### The rewrite shape, and the two directions it must cover

| Direction | Requirement | Why |
|---|---|---|
| `ops.` host | `/` → rewrite to `/ops` | Route groups do not affect URLs; `(ops)/ops/**` is served at `/ops`. |
| `ops.` host | allow `/ops`, `/api/auth/*`, `/_next/*` and the ops sign-in route; **everything else → 404** | Otherwise the whole booker + host app is served a second time under the ops hostname. |
| apex host | `/ops` and the ops sign-in route → **404** | ⚠ **Non-negotiable.** If the apex keeps serving `/ops`, the subdomain is cosmetic and D-275's entire justification ("the subdomain is what makes the separation *real* … because it is what lets the cookie scope differ") evaporates. |

**NEEDS MEASUREMENT:** the exact mechanism by which the proxy layer produces a *hard* 404 (rewriting to a
path with no route is the conventional trick, but the status line must be `curl`-verified under a
production build, not assumed). This belongs in the same probe run as the cloak re-measurement.

#### Why the 404 cloak survives the rewrite — and it survives for a structural reason

The refusal body is `src/app/not-found.tsx`, and that file is **prerendered static**. Its own header
records the measurement at `:16-19`: *"`/_not-found` is one of exactly two `○ Static` routes in the
build … Next PRERENDERS it, which means it is rendered by `next build` — on a machine, and in a CI job,
with no database."* Its counterfactual is measured too (`:33-40`): swapping in an async `PublicHeader`
turned every route dynamic.

**A prerendered body cannot vary by Host header.** So `ops.fitout.example/nonexistent`,
`fitout.example/nonexistent` and `fitout.example/ops` all emit the *same bytes*. The byte-identical cloak
D-275 calls non-negotiable is therefore preserved **by construction**, not by discipline — provided
nothing makes the root not-found dynamic. That is the property to protect, and it is worth stating in the
plan so nobody "improves" the 404 page into a dynamic one and silently spends the cloak.

The three-layer guard is entirely **Host-agnostic** — `readStaff` (`src/lib/ops/staff.ts:81`) reads
`auth.api.getSession({ headers })` and compares `role`; nothing in `staff.ts` reads a hostname. **The
rewrite does not weaken any of the three layers.** What it changes is only *which URL* reaches them.

#### ⚠ Root-relative links break under the ops host

Every link inside the ops shell is root-relative and resolves against whatever host is in the address
bar. Under `ops.fitout.example` they mean something different:

| Site | Today | Under the ops host |
|---|---|---|
| `(ops)/ops/layout.tsx:79` | `brandHref="/ops"` | Fine **only** if the rewrite maps `/` → `/ops` and leaves `/ops` addressable. Under a blanket `ops.host/<path>` → `/ops<path>` rewrite it becomes `/ops/ops` → 404. |
| `(ops)/ops/error.tsx:60` | `<Link href="/">Back to FitOut</Link>` | Resolves to `ops.host/` → rewritten back to `/ops`. **The one persistent way out of a replaced screen becomes a loop.** Its own comment at `:53-58` argues `/` is "a real destination rather than a consolation prize" — that argument is host-dependent and stops holding. |
| `SiteFooter` (`site-footer.tsx:120-126`) | `/` · `/host` · `/terms` · `/privacy` | Either 404 (if the ops host is locked down, correct) or **serve the booker/host app under the ops hostname** (if it is not). Composed into the ops shell at `(ops)/ops/layout.tsx:107`. |

**Resolution options, both plan-time calls:** absolute `https://<apex>` URLs for the cross-host links, or
a footer/`routeOut` fork for the ops composition. Either is small; the failure of doing neither is a
console whose only escape hatch loops.

- **NEW:** the Host-partition logic (proxy/middleware), the apex `/ops` refusal, the ops-host allow-list.
- **MODIFIED:** `src/middleware.ts` (matcher widened to global; header extended), `(ops)/ops/error.tsx:60`,
  `(ops)/ops/layout.tsx:79` and/or `SiteFooter` composition for cross-host links.
- **MIGRATION REQUIRED: NO.** Nothing in this item reads or writes a column.

---

### Item 2 — Ops sign-in surface + staff invite/onboard flow

#### ⚠ The ops sign-in page CANNOT live under `(ops)`

This is a hard structural constraint, not a preference.

`(ops)/ops/layout.tsx:69` awaits `assertStaff()`. `src/lib/ops/staff.ts:142-144` defines it as
`if (!(await readStaff())) notFound()`, and `readStaff` (`:82`) returns `null` for any caller with no
session. **A signed-out caller is `notFound()`-ed before any page under `(ops)` renders a byte.** A
sign-in page placed there is unreachable by the exact people it exists for.

It also collides with four pinned constants in `tests/design/ops-guard-coverage.test.ts`:

| Constant / clause | Value | What a naive ops sign-in page does to it |
|---|---|---|
| `EXPECTED_OPS_PAGES` (`:138`) | `1` | A second `(ops)/**/page.tsx` fails the D-246 one-page clause at `:544-553`, whose failure text reads *"the ops console is not one page … A second page is not only a product change — it costs another `loading.tsx` and moves all three of loading-coverage's pinned counts."* |
| `EXPECTED_OPS_ACTIONS` (`:135`) | `7` | Every new staff-writing server action moves this pin (`:570-578`). Actions in `src/app/actions/ops-*.ts` are found by the glob; one placed anywhere else must be declared by name in `EXTRA_OPS_ACTIONS` (`:132-134`). |
| zero `(ops)/**/not-found.tsx` (`:584-593`) | must stay `[]` | Its failure text: *"This is the one file whose mere presence — whatever it contains — is the defect."* D-275 restates it as non-negotiable. |
| `FORBIDDEN_REFUSALS` (`:148`) | `["forbidden", "redirect"]` | Asserted at `:595-604`. **A sign-in bounce is literally a `redirect` call**, and any `redirect` at an `(ops)` call site fails: *"a bounce to /login tells them the same thing more politely."* |

**Recommended shape.** A **sibling route group** — e.g. `src/app/(ops-auth)/…` — served only on the ops
host by the proxy, outside `(ops)` and therefore outside both `assertStaff()` and the four clauses
above. That keeps D-246's one-`/ops`-page rule intact (the *console* stays one page) while giving the
sign-in surface a home that a signed-out staffer can actually reach.

The seven shipped ops actions behind `EXPECTED_OPS_ACTIONS = 7` are: `approveHost`, `rejectHost`,
`suspendHost`, `approveListing`, `rejectListing` (`src/app/actions/ops-review.ts:325,420,542,641,723`),
`revealHostContact` (`src/app/actions/ops-contact.ts:190`) and `cancelBookingAsOps` (declared in
`EXTRA_OPS_ACTIONS`, `ops-guard-coverage.test.ts:132-134`). **Item 3 removes two and Item 2 adds ~three;
the pin and its paragraph must move together in one commit**, which is exactly what the constant exists
to force.

#### Cookie scoping is FREE. Origin trust is NOT.

Both facts read out of the installed `better-auth@1.6.14`, not from docs.

**Cookie scoping — already correct, zero config change.**
`node_modules/better-auth/dist/cookies/index.mjs:21-22`:

```js
const crossSubdomainEnabled = !!options.advanced?.crossSubDomainCookies?.enabled;
const domain = crossSubdomainEnabled ? (...) : void 0;
```

and `:35` spreads `...crossSubdomainEnabled ? { domain } : {}`. **No `Domain` attribute is emitted unless
`crossSubDomainCookies.enabled` is true.** A grep of `src/lib/auth.ts` for `advanced` returns
**nothing** — there is no `advanced` block in the file at all. FitOut's session cookies are therefore
already **host-only**, and D-275's "the ops session cookie is scoped to that host" needs **no auth change
whatsoever**. It needs only that the ops sign-in POST is made *to the ops host*. ⚠ The inverse is the risk
to write down: **enabling `crossSubDomainCookies` at any point would silently merge the two cookie scopes
and delete the property D-275 is buying.**

**Origin trust — this one DOES need a change.**
`node_modules/better-auth/dist/api/middlewares/origin-check.mjs` runs `validateOrigin` on every non-GET
and throws `APIError.from("FORBIDDEN", BASE_ERROR_CODES.INVALID_ORIGIN)` when the request Origin is not
trusted. `src/lib/auth.ts:63` is `trustedOrigins: [BETTER_AUTH_URL]` — a single apex origin. **An ops
sign-in POST from the ops origin is rejected 403 today.** `trustedOrigins` must gain the ops origin.

**And `baseURL` needs the dynamic form.** `src/lib/auth.ts:62` is a single static string, so every
verification link, reset link and OAuth callback is minted against the apex — meaning a **staff invite
email would land the invitee on the apex host, where the ops cookie is not scoped.** Better Auth 1.6.14
supports a dynamic base URL: `node_modules/better-auth/dist/utils/url.mjs:206-215`
(`resolveDynamicBaseURL`) resolves per-request against `config.allowedHosts` with a `fallback`, and
`:113-115` (`isDynamicBaseURLConfig`) is the discriminator (`"allowedHosts" in config &&
Array.isArray(config.allowedHosts)`). So the shape is:

```ts
baseURL: { allowedHosts: [APEX_HOST, OPS_HOST], fallback: BETTER_AUTH_URL },
trustedOrigins: [APEX_ORIGIN, OPS_ORIGIN],
```

Note `:212` builds the URL from the request Host, so `allowedHosts` must be an explicit allow-list rather
than a wildcard — it is the bound on what a forged Host header can make Better Auth mint.

⚠ **One cloak probe to add:** `ops.host/api/auth/*` returning `403 INVALID_ORIGIN` while the apex returns
`200` is itself a small oracle that "the ops host is served by this app". It is weaker than DNS (which
already publishes the hostname), but it belongs in the probe set so the reading is deliberate rather than
discovered.

#### The invite flow itself

`.planning/todos/pending/2026-09-01-ops-staff-management-surface-and-invite-flow.md` already carries this
design and it survives D-275 intact:

- Roster read: **reuse `listStaff()`** (`src/lib/ops/grant.ts:233`) — positive equality on
  `role = STAFF_ROLE` (`:77`), so the roster cannot disagree with the gate.
- The write goes through **Drizzle, never Better Auth's `updateUser`** — `role` is `input: false`
  (`src/lib/auth.ts:112`), and `grant.ts:16-21` records why. **Give `grant.ts` a second caller, not a
  second copy**: `writeRole` (`:184-217`) already audits (`:210-215`) and returns
  `{ outcome, userId, previousRole, role }`.
- Invite mail rides the shipped verification mechanics: `src/lib/auth.ts:78-83`
  (`emailVerification.sendVerificationEmail`, `sendOnSignUp: true`) over `src/lib/email.ts`.
- The CLI stays as bootstrap + break-glass: `package.json:29-31` (`ops:grant` / `ops:revoke` /
  `ops:staff`) over `scripts/ops-grant.ts`. D-275 requires this explicitly.

**Minimal shape of a staff invite record: NONE — no new table.** The invite *is* an ordinary account plus
a role write. `user` already carries `emailVerified`, `createdAt` and `role`; Better Auth already owns the
verification-token lifecycle. The durable record of who granted whom is the **`audit` row** `writeRole`
already writes (`grant.ts:210-215`), and its `actorId` is upgraded from the CLI's *asserted* `--by`
(D-218) to an **authenticated** id from `requireStaff()`. That upgrade is the genuine security win of this
item, and it needs no column.

⚠ **The revocation invariant that must not be broken.** `src/lib/ops/staff.ts:33-45` records that
`session.cookieCache` is deliberately unconfigured, which is what makes a revocation land on the very
next request. A staff surface that grants and revokes makes that invariant *more* load-bearing. If
anyone later "optimises" by enabling cookie caching, a revoked staff grant keeps opening the console for
the cache TTL and nothing goes red.

- **NEW:** `(ops-auth)` route group + ops sign-in page; the staff surface (page or panel) and ~3 staff
  server actions; the proxy allow-list entry for the sign-in route.
- **MODIFIED:** `src/lib/auth.ts:62-63` (dynamic `baseURL`, second trusted origin);
  `tests/design/ops-guard-coverage.test.ts:135` (`EXPECTED_OPS_ACTIONS`) and, if the staff surface is a
  second `(ops)` page, `:138` (`EXPECTED_OPS_PAGES`) plus `tests/design/loading-coverage.test.ts:318-320`
  (`EXPECTED_PAGES = 35`, `EXPECTED_QUALIFYING = 23`, `EXPECTED_NON_QUALIFYING = 12`).
- **UNCHANGED, deliberately:** `src/lib/ops/grant.ts` gains a caller, not a fork.
- **MIGRATION REQUIRED: NO.** `user.role` exists (`src/lib/db/schema.ts:45`,
  `text("role").default("user")`), `audit` exists (`drizzle/0024`, `drizzle/0025`), and Better Auth owns
  the verification tokens in its own tables.

---

### Item 3 — Remove the manual host-approval queue (D-276), keep enforcement + contact

#### What `review-queue.ts` looks like after the host branch goes

The host branch is `src/lib/ops/review-queue.ts:232-253`, predicated at `:251` on
`WHERE hv.status = 'pending'` and ordered `hv.created_at ASC` to byte-match
`host_verification_queue_idx` (`src/lib/db/schema.ts:441-443`). Removing it deletes, in one move:

- the `OpsQueueHostItem` type (`:107-118`) and, with it, the discriminated union `OpsQueueItem`
  (`:160`) — which collapses to a single member;
- the `HostRow` row type (`:184-191`);
- the `LEFT JOIN LATERAL` waiting-count at `:245-249` that feeds `listingsWaiting`;
- the JS interleave's reason for existing (`:335-341`) — a single-source array is already ordered by
  the listing branch's own `ORDER BY` at `:302`, so the sort collapses to a stable tie-break at most.

⚠ **Do NOT delete the `LISTING_QUEUE_PREDICATE` sharing argument along with the lateral.** `:242-244`
records that the lateral count is a lateral *specifically* so the predicate stays byte-identical to the
listing branch's, "so the two can never drift into disagreeing about what *waiting* means". Once the host
branch is gone there is only one consumer, so the constant at `:178-182` becomes a plain predicate — but
it should stay a named constant, because it is also what `tests/ops/queue-query.test.ts` case 2 reads.

**The explicit-column projection rule is unaffected and must survive.** `:31-34`: *"Every column is named
EXPLICITLY. There is no `select()` over a whole table anywhere in this file."* Item 4 adds columns to
this same file; both changes land in one file and the rule governs both.

**The discriminated union should NOT be collapsed to a bare type.** `:156-159` argues the union exists so
"a third kind fails to COMPILE rather than throwing in front of an operator", and the row component keys
every per-kind lookup as a total `Record` over the discriminant
(`ops-queue-row.tsx:153,159,176`). Keeping `kind: "listing"` as a one-member union costs nothing and
leaves the exhaustiveness machinery in place for the day a second kind returns.

#### ⚠ But hosts must stay reachable — and today there is nowhere for them to be reachable FROM

Correction 2 above is the load-bearing finding for this item. Restated in operational terms:

| After removing the host branch | Consequence |
|---|---|
| `suspendHost` (`src/app/actions/ops-review.ts:542`) still has zero UI callers | ENF-01/ENF-02 remain `POST`-only. The requirement stays "Validated" with no operator-reachable surface. |
| `OpsContactReveal` on the host row (`ops-queue-row.tsx:295`) is deleted with the branch | OPS-06 survives **only** via the listing-row mount (`:279`). A host with no pending listing becomes uncontactable from ops. |
| `approveHost` / `rejectHost` (`ops-review.ts:325,420`) lose their only callers (`ops-decision-actions.tsx:160,177`) | Two of the seven pinned actions must be removed, or they become dead `"use server"` exports still reachable by POST. **Remove them.** A live approve-host endpoint with no UI is precisely the "two authorities on one question" D-276 exists to end. |

**So D-276 is not a deletion; it is a deletion plus a replacement surface.** The minimum honest shape is a
host lookup on `/ops` — search or select a host, see their verification state and facts, and act:
*suspend* (`suspendHost`) and *reveal contact* (`revealHostContact`). It reuses two shipped actions and
adds no schema. It is a real amount of work and belongs in the roadmap as such.

**Note the D-246 tension.** A host-lookup panel is the second thing `/ops` does. It should be a **panel on
the one page**, not a second page — same argument D-277 makes for the listing detail, and it keeps
`EXPECTED_OPS_PAGES = 1` (`ops-guard-coverage.test.ts:138`) intact.

#### The assertions that go red, by name

`tests/ops/queue-query.test.ts` — five cases depend on the host branch and will fail by name:

| Case | Line | Title | Why it reddens |
|---|---|---|---|
| 1 | `:276` | *"returns ONE array containing BOTH kinds"* | There is no longer a second kind. |
| 3 | `:297` | *"THE INTERLEAVE: strictly oldest-first ACROSS kinds, not grouped by kind"* | There are no kinds to interleave across. |
| 8 | `:391` | *"the host row carries the four `<dl>` facts, the waiting count, and NO document field"* | The host row is gone. ⚠ This case is also the standing witness for HVER-02 / D-206 / D-220 (no document column) — **do not let that proof vanish with the case.** `tests/ops/verification-schema.test.ts`'s exact-column allow-list is the other half and must be confirmed to still carry it. |
| 9 | `:423` | *"`listingsWaiting` counts exactly the listings that are themselves in the queue"* | The lateral count is deleted. |
| 10 | `:453` | *"driving `requestHostVerification()` puts a host item BETWEEN two listing items"* | This is SC1's end-to-end proof that the host queue fills from ordinary product use. It is the case whose **deletion is the product decision** — it should be removed deliberately, in the same commit as the branch, not left failing. |

`tests/ops/ops-queue-row.test.tsx` also loses its host-row cases: `:309` (three interactive descendants),
`:331` (revealed host row), `:490` (host row carries its four facts). Same rule — delete deliberately,
in the branch's commit.

`tests/design/ops-guard-coverage.test.ts:135` `EXPECTED_OPS_ACTIONS` moves from `7` down by two
(`approveHost`, `rejectHost`) and then up by whatever Item 2 adds. **One commit, pin and paragraph
together.**

- **NEW:** the host lookup / enforcement panel on `/ops`; its wiring to `suspendHost` and
  `revealHostContact`.
- **MODIFIED:** `src/lib/ops/review-queue.ts` (host branch, types, interleave);
  `src/components/ops/ops-queue-row.tsx` (host branch of the JSX, `:284-297`);
  `src/components/ops/ops-decision-actions.tsx` (host subject arm, `:97-104`, `:175-187`, `:289-305`);
  `src/app/actions/ops-review.ts` (remove `approveHost`, `rejectHost`);
  `src/app/(ops)/ops/page.tsx:140-164` (host label composition); the five/eight named test cases.
- **MIGRATION REQUIRED: NO.** `host_verification` keeps every column
  (`src/lib/db/schema.ts:401-444`) — the Didit webhook still writes `pending → approved`, the sell-gate
  still reads `status`, and `suspended` is still the ENF-01 lever. Nothing is dropped; only the queue's
  `WHERE hv.status = 'pending'` read of it goes away.

---

### Item 4 — Full listing detail, EXPANDED IN PLACE on the queue row (D-277)

#### Why the disclosure is safe against the terminal assertions

The row's terminal property is asserted in `tests/ops/ops-queue-row.test.tsx`:

- `:238` — *"renders zero anchors and zero link-role elements, on BOTH kinds"*, running over
  `[hostRow(), listingRow()]` (`:239`). It asserts `card.querySelectorAll("a")` has length 0 (`:244`)
  and `card.querySelectorAll('[role="link"]')` has length 0 (`:262`).
- `:266` and `:273` — the two guard-the-guard cases proving the anchor query can find a destination
  anchor and a compose anchor, so the zeros above mean something.
- `:441`, `:445`, `:593`, `:619` — further `querySelectorAll("a")` zero checks after a reveal and in
  other states.

**A disclosure control is a `<button>` or a `<summary>`. It is neither an `<a>` nor `role="link"`, so it
passes every one of those assertions untouched.** That is exactly D-277's argument, and it holds
mechanically rather than by intent.

**The interactive census is the only clause with a fixed count, and it covers the HOST row only.**
`INTERACTIVE` is defined once at `:137-138` as
`'a, button, input, select, textarea, summary, [role="link"], [role="button"], [tabindex]:not([tabindex="-1"])'`
and is used at exactly three sites (`:311`, `:342`, `:349`) — all inside the host-row cases `:309` and
`:331`. **There is no pinned interactive count on the listing row.** So the listing-row disclosure adds
no census to move. (Note `summary` *is* in the selector — if a disclosure were ever added to a host row it
would move that count, but Item 3 removes the host row entirely.)

**The listing fact assertions are presence-based, not exhaustive.** `:454` checks `Address`,
`Space type`, `Capacity`, `Price`, `Submitted` and `Host` by `valueFor(card, term)`; `:479` iterates the
six verification phrases; `:503` checks the unfinished-listing fallbacks. **None asserts the `<dt>` set is
closed**, so adding facts is safe.

#### The minimal shape of the expanded detail

The queue row already carries the whole evidence `<dl>` (`ops-queue-row.tsx:255-298`) and reuses
`PhotoGallery` verbatim (`:249`, argued at `:33-42`). The expansion adds what D-277 names —
description, amenities, and the host facts that are currently only on the (departing) host row.

**Against the "every column named explicitly" rule** (`review-queue.ts:31-34`), the projection grows by:

- `l.description` — a plain column on `listing` (`src/lib/db/schema.ts:207`), one more line in the
  `SELECT` at `review-queue.ts:256-282`, one more field on `OpsQueueListingItem` (`:129-153`);
- **two more `LEFT JOIN LATERAL … json_agg` blocks**, on exactly the shape of the photos lateral at
  `:293-300`: one over `listing_amenity` (`schema.ts:309-317`, column `amenity`) and one over
  `listing_activity_tag` (`schema.ts:320-...`, column `tag`). Both need the same
  `?? []` null-collapse the photos array already gets at `:322`, for the same reason stated at
  `:319-321` — *"`json_agg` over an empty set is NULL, not `[]`"*;
- host facts already on `user` and reachable through the existing `JOIN "user" u ON u.id = l.host_id`
  at `:284`: `u.created_at` and `u.email_verified` — the same two columns the host branch selects at
  `:236-237`. **These migrate from the departing host branch into the listing branch rather than being
  invented**, which is the neatest possible reconciliation of Items 3 and 4.

⚠ **The one thing that must NOT be added.** `:36-42` — *"THE HOST BRANCH SELECTS NOTHING THAT COULD CARRY
A DOCUMENT REFERENCE — because no such column exists (HVER-02 / D-206 / D-220)."* The listing branch
inherits that prohibition when it inherits the host facts. `OpsQueueListingItem` must gain no field that
could hold a document, an image or an ID number, and the expanded panel must render no placeholder
implying one is coming (`ops-queue-row.tsx:64-72`).

**Rendering shape.** The `<dl>` at `ops-queue-row.tsx:255` is where the facts live, and the pattern's own
docblock (quoted at `:251-254`) records that `children` is the slot that keeps label-to-value association
alive under linearisation, that a `<dl>` inside `meta` hydrates mismatched, and that `actions` is lifted
above the overlay link. **The expansion belongs in `children`, beside or below the existing `<dl>`, not in
`meta` and not in `actions`.** A wrapper around a `<dt>`/`<dd>` pair is invalid inside a `<dl>` — the same
constraint `:392` already asserts for the contact reveal — so the disclosure must wrap the *whole* extra
block, not individual pairs.

- **NEW:** the disclosure control and the expanded detail block inside `ops-queue-row.tsx`'s `children`;
  new test cases for the collapsed/expanded states.
- **MODIFIED:** `src/lib/ops/review-queue.ts` (`OpsQueueListingItem` `:129-153`; the `SELECT` `:256-282`;
  two new laterals beside `:293-300`; the mapper `:314-324`); `src/components/ops/ops-queue-row.tsx`
  (`:255-283` listing branch).
- **MIGRATION REQUIRED: NO.** Every value is an existing column: `listing.description`
  (`schema.ts:207`), `listing_amenity.amenity` (`:315`), `listing_activity_tag.tag`, `user.created_at`,
  `user.email_verified`. The addressing, capacity, pricing and occupancy columns are **already selected**
  at `review-queue.ts:259-272`.

---

### Item 5 — Host verification roadmap, explicit resubmit, and host-facing review history (D-278)

#### 5a — The verification roadmap / progress UI

What exists today:

- The way in is the advisory row at `src/components/host/host-signals.tsx:226-234` — a `PanelCard` with a
  `<p>` carrying `data-verification-owed={verificationStatus}` and an inline underlined `<Link
  href="/host/verify">`. The milestone brief's *"a plain `<p>` and an inline link"* is exactly right.
- The destination is `src/app/(host)/host/verify/page.tsx`, which reads
  `loadHostVerification(db, session.user.id)` at `:96` and forks in
  `src/components/host/verification-panel.tsx`.
- The copy already exists as a **total map over all six states**:
  `src/lib/host/verification-signal.ts:137` `VERIFICATION_SIGNAL`, each member carrying
  `{ state, reason, wayOut }` (`:113-117`). `VERIFICATION_PAGE_TITLE` (`:120`) and `VERIFICATION_LEDE`
  (`:123`) are already shared between the page and its `loading.tsx`.
- The cooldown machinery is shipped: `COOLDOWN_HOURS` (`src/lib/host/verification-cooldown.ts`),
  `retryAllowedAt` (`verification-signal.ts:382`), `composeRetryAfterSentence` (`:402`), and the page
  composes the sentence at `:106-111` against the **DB clock** (`readDbNow`, `:105`) with the
  conservative-direction argument written at `:39-42`.

**So the roadmap is a presentation change over data that already exists.** `HostVerificationState`
(`src/lib/host/verification-status.ts:61-75`) returns `{ status, reason, suspended, updatedAt }`, and the
steps a roadmap would show are all derivable from what is already loaded on those surfaces:
confirmed email (`session.user.emailVerified`, already passed into the panel), phone
(`VERIFICATION_PHONE_LABEL` `:358`), the check itself (`status`), and the outcome. **No new read, no new
column.**

⚠ **The one rule the roadmap must not break.** `verification-signal.ts:137-139`: *"ALL SIX STATES, TOTAL
OVER THE ENUM … a change here changes what a host is told, so it is a copy decision and belongs in the
spec first."* A roadmap that introduces per-step copy must extend that map (or a sibling with the same
totality property), not invent strings at the component.

#### 5b — Explicit "fix and resubmit"

The mechanism is **already built and already guarded**; what is missing is only that the host reaches it
deliberately. `src/lib/listing/re-review.ts`:

- `MATERIAL_FIELDS` (`:116-124`) — the seven fields: `address`, `space_type`, `capacity`, `photos`,
  `price`, `title`, `description`.
- `RE_REVIEW_SOURCE_STATES` (`:142-146`) — `approved`, `grandfathered`, `rejected`. `rejected` is there
  precisely for resubmission (`:135-140`), and the file states the appeal distinction is load-bearing:
  *"the only way into this branch is an actual edit to a material field."*
- `markForReReview` (`:191-...`) — the guarded flip, every source state in the `UPDATE`'s `WHERE`
  (`:198-206`), a 0-row result being the calm no-op, followed by the `listing_review` insert
  (`:215-222`) whose `submittedAt` is deliberately omitted so Postgres supplies the clock (D-249's
  no-line-jumping guard).
- **It never clears the prior rejection reason** (`:181-186`) — *"There is no statement in this module
  that assigns to that column at all, which is the strongest form of *it survives*."*

⚠ **D-278 must not soften the accepted cost.** `re-review.ts:93-98`: *"A TYPO FIX IN A DESCRIPTION TAKES
THE LISTING OFF THE MARKET until ops re-approves it. The PM ruled that acceptable on 2026-09-01 … Do not
soften it here, and do not soften it at either detection site."* An explicit *Resubmit* control makes that
consequence visible; it must not introduce a "material but still sellable" state, which the sell-gate
does not have.

**Shape.** The control belongs where the host already sees the rejection: `ListingCard`'s review notice
at `src/components/listing/listing-card.tsx:404-427`, which already renders
`composeReviewSentence(reviewSignal, rejectionReason)` and a conditional `wayOut` link to `editHref`. The
change is turning that from *"a link into the wizard, where an edit incidentally re-triggers review"*
into a named act. The reason string arrives from `(host)/host/listings/page.tsx:105-115`, which reads
`listingReview.reason` owner-scoped and collapses it into a `Map` — no query per card.

#### 5c — Host-facing review status / history

**`listing_review` is sufficient. No migration.** `src/lib/db/schema.ts:452-491` declares, in full:

| Column | Line | Host-facing? |
|---|---|---|
| `id` | `:455` | internal |
| `listingId` | `:476-478` | internal |
| `state` | `:479` | **yes** — submitted / pending / decided |
| `reason` | `:480` | **yes** — *"host-readable rejection reason (D-243); NULL on an approval"* |
| `decidedByStaffId` | `:482` | **no** — never show a staff id to a host |
| `submittedAt` | `:487` | **yes** — the "submitted" timestamp |
| `decidedAt` | `:488` | **yes** — NULL = still awaiting a decision |
| `createdAt` | `:489` | internal |

That is exactly the *submitted → waiting → decided, with the operator's reason* triple D-278 asks for.
**There is no internal-note column to leak**, because `reason` was designed host-readable from the
start — so a host-facing history is a projection over columns that are already safe to show.

`index("listing_review_listing_idx").on(t.listingId)` (`:491`) already serves the per-listing read.
`markForReReview` appends rather than overwrites (`:215-222`), so the history is genuinely a history.

⚠ **The FK is `cascade`, not `restrict`** (`:476-478`, D-254 / `drizzle/0029`) — so hard-deleting a
listing takes its review history with it. In production `softDeleteListing` means listings are never hard
deleted (`:466-471` records that the constraint's only measured effect was breaking test teardown), so
this is fine — but a host-facing history must filter `deletedAt IS NULL` on the parent listing anyway,
the way `assertOwnership` (`src/app/actions/listing.ts:95-103`) and the edit page (`:43-46`) already do.

- **NEW:** the verification roadmap component; an explicit resubmit control; a host-facing review-history
  read + surface.
- **MODIFIED:** `src/components/host/host-signals.tsx:226-234` (advisory row becomes a state);
  `src/components/host/verification-panel.tsx`; `src/lib/host/verification-signal.ts:137` if step copy is
  added; `src/components/listing/listing-card.tsx:404-427` (the way out becomes a named act).
- **UNCHANGED, deliberately:** `src/lib/listing/re-review.ts`. The mechanism is correct; D-278 changes how
  a host *reaches* it, not what it does.
- **MIGRATION REQUIRED: NO** — for all three sub-items. Evidence above: `listing_review` already carries
  `state`, `reason`, `decidedByStaffId`, `submittedAt`, `decidedAt`; `host_verification` already carries
  `status`, `reason`, `updatedAt` and `loadHostVerification` already returns them
  (`verification-status.ts:85-110`).

---

### Item 6 — `/host/listings` card alignment + footer wrap

#### The measurement

- `src/components/ui/card.tsx:15` — `Card`'s root class list is `flex flex-col gap-4 overflow-hidden …`.
  **No `h-full`.**
- `src/components/ui/card.tsx:87` — `CardFooter` is `flex items-center rounded-b-xl border-t bg-muted/50
  p-4 …`. **No `flex-wrap`.**
- `src/components/listing/listing-card.tsx:352` — `<Card className="gap-0 pt-0">` is rendered directly as
  the grid item (grid declared at `(host)/host/listings/page.tsx:180`,
  `cn(RESULT_GRID_GAP, "grid sm:grid-cols-2 lg:grid-cols-3")`).
- `src/components/listing/listing-card.tsx:368` — `<CardContent className="space-y-1 py-4">`. **No
  `flex-1`**, which is why the footer sits immediately under variable-length content instead of being
  pushed to the bottom. Cards in a row stretch (CSS grid `align-items: stretch`) but their *footers* land
  at different heights — which is the misalignment the milestone describes.
- `src/components/listing/listing-card.tsx:433-479` — the footer's contents: up to two link buttons plus
  an `ml-auto` cluster of `Unlist` / `Delete`. On a narrow card that is four controls on one
  non-wrapping line.

#### ⚠ Fix at the call site, NOT in `ui/card.tsx`

`src/components/ui/card.tsx` is a **vendored shadcn primitive**. D-129 (as amended) is explicit that the
56 `dark:` occurrences across 14 vendored `src/components/ui/*` files are left in place precisely because
*"stripping the vendored 56 would permanently fork 14 shadcn components from upstream, and every future
`npx shadcn add` would re-violate the rule"*. The same logic governs any edit to those files: adding
`h-full` to `Card` or `flex-wrap` to `CardFooter` **forks the primitive from upstream and changes every
other `Card` and `CardFooter` in the app**, including the search grid and every panel.

**The fix is three `className` additions in `listing-card.tsx`:**

| Site | Change | Effect |
|---|---|---|
| `:352` `<Card className="gap-0 pt-0">` | add `h-full` | the card fills its stretched grid track explicitly |
| `:368` `<CardContent className="space-y-1 py-4">` | add `flex-1` | content absorbs the slack, pushing the footer to the bottom → footers align across the row |
| `:434` `<CardFooter className="gap-2">` | add `flex-wrap` | controls wrap inside the card instead of overflowing; `Card`'s `overflow-hidden` (`ui/card.tsx:15`) currently *clips* the spill rather than showing it |

All three are `cn()`-merged call-site classes, which is the pattern the file already uses. ⚠ **Order
matters under `tailwind-merge`** — the phase-17 code review's WR-04 recorded a case where hoisting a
named constant to the front of `cn()` deleted a padding class outright. Append, do not prepend.

**Verification note:** `e2e/overflow-320.spec.ts` and the visual-regression baselines under `e2e/visual/`
are the instruments that would catch a regression here; per D-24 only `e2e/price-parity.spec.ts` runs in
CI today, which is itself a v1.2 item.

- **NEW:** nothing.
- **MODIFIED:** `src/components/listing/listing-card.tsx:352`, `:368`, `:434`.
- **MUST NOT BE MODIFIED:** `src/components/ui/card.tsx` (vendored; D-129).
- **MIGRATION REQUIRED: NO.** Pure CSS class change.

---

### Item 7 — The 404 after creating a listing: **NOT DIAGNOSED**

Recorded honestly, because the milestone asks for this to be *"diagnosed rather than patched at the
symptom"* and this research did not produce a diagnosis.

**The path, read end to end:**

1. `src/app/(host)/host/listings/new/page.tsx:80` calls `createDraftListing()`, then `:86`
   `redirect(\`/host/listings/${res.id}/edit\`)`.
2. `src/app/actions/listing.ts:111-162` — `createDraftListing` resolves the session id (`:112`), applies
   the D-255 verification gate (`:138-152`), mints `randomUUID()` (`:154`), and awaits
   `db.insert(listing).values({ id, hostId: userId, status: "draft", bookingMode: "instant" })`
   (`:155-160`) before returning `{ ok: true, id }`.
3. `src/app/(host)/host/listings/[id]/edit/page.tsx:43-51` — selects the listing `WHERE id = :id AND
   deleted_at IS NULL` (`:46`), then `notFound()` if `!row || row.hostId !== session.user.id` (`:49-50`).

**Both files read correct on inspection.** The insert is awaited before the redirect; `hostId` is written
from the same session id the edit page compares against; `deletedAt` is null on a fresh row. There is no
visible defect in either file.

**Therefore the cause is somewhere a code reading cannot see**, and the candidate classes are all
runtime-shaped:

- a connection/visibility issue between the insert and the subsequent read;
- `next/link` prefetch executing `/host/listings/new` as a server component (it has side effects — it
  INSERTs), producing rows and redirects outside a user press;
- an environment mismatch (see the recorded memory that `neon link` / `neon deploy` repoint local dev at
  a cloud DB — a read against a different database than the write would produce exactly this symptom);
- a stale `.next` build artefact.

**This needs a reproduction, not a code reading.** The right instrument is a `/gsd-debug` session with a
captured failing request — the `id` that was minted, whether the row exists in the DB the edit page is
reading, and whether the 404 reproduces under a production build. **Do not let a plan "fix" this by
adding a retry or a fallback at `edit/page.tsx:49`**; that is the symptom patch the milestone explicitly
rules out, and it would disable a real IDOR guard.

- **NEW / MODIFIED:** unknown until reproduced.
- **MIGRATION REQUIRED: NO** (nothing about the schema is implicated by any candidate cause).

---

## Migration summary — the whole milestone needs ZERO schema migrations

| Item | Migration? | Evidence |
|---|---|---|
| 1 — Host rewrite / proxy | **NO** | Reads and writes no column. |
| 2 — Ops sign-in + staff invite | **NO** | `user.role` exists (`schema.ts:45`); `audit` exists (`drizzle/0024`, `0025`); Better Auth owns verification tokens. The invite record IS an account + a role write + the `audit` row `grant.ts:210-215` already writes. |
| 3 — Remove host branch, add enforcement/contact surface | **NO** | `host_verification` keeps every column (`schema.ts:401-444`); `suspendHost` and `revealHostContact` are shipped actions. |
| 4 — Expand-in-place listing detail | **NO** | Needs only `l.description` (`schema.ts:207`) plus two more `LEFT JOIN LATERAL … json_agg` blocks over `listing_amenity` (`:309-317`) and `listing_activity_tag` (`:320-…`), on the shape of the photos lateral at `review-queue.ts:293-300`. Host facts come from the existing `JOIN "user" u` at `:284`. |
| 5 — Verification roadmap / resubmit / review history | **NO** | `listing_review` already carries `state` (`:479`), `reason` (`:480`, host-readable by design), `decidedByStaffId` (`:482`), `submittedAt` (`:487`), `decidedAt` (`:488`). `host_verification` already carries `status`, `reason`, `updatedAt`, and `loadHostVerification` already returns them (`verification-status.ts:85-110`). |
| 6 — `/host/listings` card fix | **NO** | Three `className` additions. |
| 7 — 404 after create | **NO** | Not schema-shaped under any candidate cause. |

⚠ **The next generated migration will be `0030`, not `0027`.** See Correction 1.

---

## Asserted properties this milestone touches, and what happens to each

| Property | Asserted by | Verdict |
|---|---|---|
| Three-layer guard exists and is positioned | `tests/design/ops-guard-coverage.test.ts:429-556` | **Survives.** The guard is Host-agnostic; the rewrite changes only which URL reaches it. |
| Byte-identical 404 cloak | 18-14's production `curl` audit (`200/404/404/404` + sha256), structurally backed by `ops-guard-coverage.test.ts:584-604` | **Survives structurally** — `src/app/not-found.tsx` is prerendered static (`:16-19`), so its body cannot vary by Host. ⚠ **Must be RE-MEASURED** with every new route in the probe set (D-275, non-negotiable): `/ops` on both hosts, the ops sign-in route on both hosts, and `ops.host/api/auth/*`. |
| No `(ops)`-scoped `not-found.tsx` | `ops-guard-coverage.test.ts:584-593` | **Must stay `[]`.** Its own text: *"the one file whose mere presence — whatever it contains — is the defect."* |
| `(ops)` refuses only with `notFound()` | `FORBIDDEN_REFUSALS` (`:148`), asserted `:595-604` | **Constrains Item 2.** A sign-in `redirect` inside `(ops)` fails this. Hence the sibling route group. |
| D-246 one `/ops` page | `EXPECTED_OPS_PAGES = 1` (`:138`), asserted `:544-553` | **Holds if** the staff panel and the host-lookup panel are panels on the one page. A second page also moves `loading-coverage.test.ts:318-320`. |
| Ops action census | `EXPECTED_OPS_ACTIONS = 7` (`:135`), asserted `:570-578` | **Moves twice** — down 2 (Item 3 removes `approveHost`, `rejectHost`), up ~3 (Item 2). Pin and paragraph in one commit. |
| Row is TERMINAL (zero anchors, zero `role="link"`, both kinds, before and after reveal) | `tests/ops/ops-queue-row.test.tsx:238-262`, `:445`, `:593`, `:619`; re-tightened by D-274 | **Survives Item 4.** A `<button>`/`<summary>` is neither an anchor nor `role="link"`. |
| Host-row interactive census (3 / 2) | `ops-queue-row.test.tsx:309`, `:331` (via `INTERACTIVE`, `:137-138`) | **Deleted with the host row** in Item 3 — deliberately, in that commit. No listing-row equivalent exists, so Item 4 moves no count. |
| Queue is one interleaved array over both kinds | `tests/ops/queue-query.test.ts` cases 1 (`:276`), 3 (`:297`), 8 (`:391`), 9 (`:423`), 10 (`:453`) | **All five go red** under Item 3 and must be removed deliberately. ⚠ Case 8 is also a HVER-02/D-206/D-220 witness — confirm `tests/ops/verification-schema.test.ts` still carries that proof. |
| Explicit-column projection ("NOTHING ELSE") | `review-queue.ts:31-34` | **Survives and governs Item 4.** Every added column named explicitly; no `select()` over a table. |
| No document column / no document affordance | `review-queue.ts:36-42`, `ops-queue-row.tsx:64-72`, `tests/ops/verification-schema.test.ts` | **Must survive Item 4**, which migrates host facts onto the listing row. Add no field that could hold one. |
| No `session.cookieCache` (revocation lands next request) | `src/lib/ops/staff.ts:33-45` | **Becomes more load-bearing** under Item 2's grant/revoke surface. |
| Vendored shadcn components unforked | D-129 (amended) | **Constrains Item 6** — fix at the call site. |

---

## Data-flow changes

**1. Request routing (NEW layer).**

```
Request ──► proxy/middleware ──► Host partition
                                  ├─ apex: /ops → 404
                                  └─ ops:  / → /ops ; non-allowlisted → 404
                                        ▼
                                 (ops)/ops/layout.tsx  assertStaff()   [L1 status line]
                                        ▼
                                 (ops)/ops/page.tsx    requireStaff()  [L2 gate]
                                        ▼
                                 server action         requireStaff()  [L3 gate]
```

**2. Queue read (SHRINKS, then WIDENS).**

```
BEFORE: loadReviewQueue ─┬─ host branch  (hv.status='pending')  ──┐
                         └─ listing branch                       ─┴─► JS interleave ─► OpsQueueItem[]

AFTER:  loadReviewQueue ─── listing branch ONLY, widened with
                            description + amenities + tags + host facts ─► OpsQueueListingItem[]

        host reachability moves to a SEPARATE lookup/enforcement read on the same page
```

**3. Verification verdict (UNCHANGED, and that is the point of D-276).**

```
Didit ─► signed webhook ─► host_verification.status pending→approved (decided_by_staff_id NULL)
                              │
                              └─ (dropped verdict) ─► Inngest reconciliation sweep = the ONLY rescue
```

The queue's `WHERE hv.status = 'pending'` (`review-queue.ts:251`) already meant a passed host left the
queue before an operator saw the row. Removing the branch changes nothing about the verdict path.

**4. Host-facing review history (NEW read, existing columns).**

```
listing_review (append-only via markForReReview:215-222)
   ─► owner-scoped read, filtered on listing.deletedAt IS NULL
   ─► submitted → waiting → decided (+ reason)
```

---

## Suggested build order

Derived from real dependencies, not from importance. Each step names what it unblocks.

| # | Work | Depends on | Why here |
|---|---|---|---|
| **0** | **Independent, start anytime:** Item 6 (`/host/listings` card fix, 3 classes) and the D-24 CI work (get the Playwright gates running) | nothing | Item 6 touches one file and no shared machinery. **D-24 first if possible** — every step below is verified by gates that currently only run by hand, and a milestone that re-measures the 404 cloak wants CI that can re-run it. |
| **1** | **Diagnose the 404-after-create** (`/gsd-debug`, with a reproduction) | nothing | It is a live defect on the host's primary path and it is un-scoped until reproduced. Doing it early means the fix is not competing with the ops work for the same host surfaces. |
| **2** | **The Host partition** — proxy/middleware, apex `/ops` 404, ops-host allow-list, cross-host link fixes, `baseURL` + `trustedOrigins` | nothing in this milestone | **Everything ops-side sits on it.** The sign-in surface has no meaning until the ops host exists, and the cookie-scoping property D-275 is buying is only real once the partition is. Includes the `(ops)/ops/error.tsx:60` and `SiteFooter` link repairs, because a console whose escape hatch loops is not shippable. |
| **3** | **Re-measure the 404 cloak** with the new probe set | 2 | D-275 calls this non-negotiable. Do it as soon as the routes exist and **again** after step 4 adds more. Two readings, both recorded. |
| **4** | **Ops sign-in + staff invite/onboard** — `(ops-auth)` group, staff panel, ~3 actions, `EXPECTED_OPS_ACTIONS` move | 2, 3 | Needs the ops host to sign in *to*. Reuses `grant.ts:184-217` and the shipped verification mail. Re-run step 3's probe with the new routes in it. |
| **5** | **Item 5 — host verification roadmap, explicit resubmit, host-facing review history** | nothing ops-side | ⚠ **Deliberately BEFORE step 6.** D-276 removes the operator from the host verification loop; the host-facing legibility work is what replaces the human they used to be able to reach. Shipping the removal first leaves a window where neither exists. Also independent of the whole ops-host thread, so it can run in parallel with 2–4. |
| **6** | **Item 3 — remove the host branch AND build the enforcement/contact panel** | 4 (staff surface patterns), 5 (host-side legibility landed) | The removal and its replacement surface ship together, or ENF-01/ENF-02/OPS-06 have no home (Correction 2). Moves `EXPECTED_OPS_ACTIONS` down 2 and deletes eight named test cases. |
| **7** | **Item 4 — expand-in-place listing detail (D-277)** | 6 | It widens the *listing* branch of `review-queue.ts` and the listing branch of `ops-queue-row.tsx` — the two files step 6 has just cut the host halves out of. Doing 4 first means both files are edited twice and the second edit fights the first. Migrating `u.created_at` / `u.email_verified` from the departing host branch onto the listing row is cleanest as one continuous move. |
| **8** | `SUPPORT_EMAIL` (`src/lib/site.ts:70`) | a business fact, not code | Blocked on a monitored address; D-64 forbids a placeholder. One line whenever the address exists. |

**The two orderings that matter most:** *6 before 7* (same two files, sequential edits) and *5 before 6*
(don't remove the human before the self-service replacement lands). **The one hard prerequisite:** *2
before 4*.

---

## Anti-Patterns — specific to this milestone

### Anti-Pattern 1: treating the layout assert as the gate once the Host rewrite exists

**What people do:** conclude that because the proxy now decides which host may see `/ops`, the per-page
and per-action `requireStaff()` calls are belt-and-braces that can be thinned.
**Why it's wrong:** `src/middleware.ts:1-7` says it about itself and `(ops)/ops/layout.tsx:5-23` says it
about the layout — Next's own guidance is that a layout *"does not control whether the rest of the route
renders"* and that Server Actions must be treated as public-facing endpoints. **A proxy is one more
optimistic layer, not a boundary.** A `"use server"` export is reachable by POST whatever the proxy does
with a GET.
**Do this instead:** leave all three layers; extend `ops-guard-coverage.test.ts` to cover the new actions.

### Anti-Pattern 2: giving `/ops` a second page for the staff screen or the host lookup

**What people do:** `/ops/staff` and `/ops/hosts`, because that is how admin consoles usually look.
**Why it's wrong:** it fails `EXPECTED_OPS_PAGES = 1` (`ops-guard-coverage.test.ts:138`) and moves all
three `loading-coverage.test.ts:318-320` counts, and D-277's own rationale reaffirms the one-page rule
three days before this milestone started.
**Do this instead:** panels on the one page. The sign-in surface is the one thing that genuinely cannot
be a panel — and it belongs *outside* `(ops)` for a different reason (`assertStaff()`), not inside it as
a second page.

### Anti-Pattern 3: making the listing detail a link "just for the operator"

**What people do:** a small `View full listing` anchor on the queue row.
**Why it's wrong:** it fails `ops-queue-row.test.tsx:238` on both kinds, and 18.1-16 already reverted two
widenings of that exact clause under D-274 — three days before D-277 was taken.
**Do this instead:** the disclosure. It is a button; it passes every terminal assertion untouched.

### Anti-Pattern 4: editing `src/components/ui/card.tsx` to fix the host grid

**What people do:** add `h-full` to `Card` and `flex-wrap` to `CardFooter` at the primitive.
**Why it's wrong:** it forks a vendored shadcn component from upstream (D-129's measured argument) and
changes every `Card` in the app, including the search grid.
**Do this instead:** three appended `className`s at `listing-card.tsx:352`, `:368`, `:434`.

### Anti-Pattern 5: enabling `crossSubDomainCookies` "so the two hosts share a session"

**What people do:** set `advanced.crossSubDomainCookies.enabled` when a signed-in staffer has to sign in
again on the ops host.
**Why it's wrong:** `better-auth/dist/cookies/index.mjs:21-22,35` shows this is the *only* thing that
emits a `Domain` attribute. Turning it on merges the two cookie scopes and deletes the exact property
D-275 says makes the separation real rather than cosmetic.
**Do this instead:** two sign-ins is the feature. Keep `advanced` absent.

### Anti-Pattern 6: patching the 404-after-create at `edit/page.tsx:49`

**What people do:** a retry, a short sleep, or a fallback that renders the wizard when `!row`.
**Why it's wrong:** `:49-50` is a real IDOR guard — *"not found OR not the caller's → 404 (don't reveal
another host's listing exists)"*. Softening it to fix a symptom weakens an ownership check on a host
surface. The milestone explicitly asks for a diagnosis instead.
**Do this instead:** reproduce it first.

---

## For the PM — one live conflict, and it must be recorded as a reversal

**D-275 contains a clause that PM-B explicitly declined ten weeks-equivalent earlier in the same
thread.**

- **D-275 (2026-09-03), `PROJECT.md:223`:** *"a staff account may not simultaneously be a booker or a
  host"*. `PROJECT.md:81-84` restates it in the milestone brief.
- **PM-B (2026-09-01),
  `.planning/todos/pending/2026-09-01-ops-staff-management-surface-and-invite-flow.md`:** under
  *"Explicitly declined, and recorded as accepted risk rather than deferred work"*, the list reads —
  2FA/TOTP for staff, step-up re-auth, shorter staff session TTL, and **"An ops-only identity policy
  (staff may not book or host) — declined."** The same file adds: *"The SWE raised each of these before
  the ruling; the PM decided. This section exists so the decision is legible later, not to relitigate
  it."*

**D-275 is later and supersedes.** That is not in question. What matters is that the todo file currently
reads as a standing decision in the opposite direction, and the shipped code reflects the declined
version: `(ops)/ops/layout.tsx:88-99` argues at length that *"Ops is a ROLE, not a third context"* and
omits `ModeSwitch` on exactly that premise, and `error.tsx:53-58` routes an operator to `/` because *"an
ops staffer is also a user, so `/` is a real destination for them"*.

**What the reversal costs, so it is priced rather than discovered:**

1. It needs an **enforcement mechanism** — today nothing prevents a `staff` account from having
   `canBook`/`canHost` true. `src/app/actions/capability.ts:75` writes `canHost` through Drizzle, and
   `grant.ts:207` writes `role`; neither consults the other. A mutual exclusion has to be written
   somewhere and tested.
2. It **invalidates two shipped comment blocks** that argue from "an ops staffer is also a user"
   (`layout.tsx:88-99`, `error.tsx:53-58`). Both would need rewriting, and `error.tsx`'s `routeOut`
   becomes a genuinely open question — if staff may not book or host, `/` is no longer a real
   destination for them, and D-246 means there is no second ops destination to point at.
3. It changes **what the CLI may do**: `ops:grant` currently promotes any existing account. Under D-275
   it must refuse (or downgrade) an account that already books or hosts.

**Ask:** confirm D-275's clause is intended as written, and if so mark PM-B's "declined" line in the todo
file as **superseded by D-275** with the date, so the next reader does not follow the older ruling. If
the clause was aspirational rather than binding, say so now — it is materially cheaper to drop it than
to build it.

**Two smaller PM-facing notes:**

- **D-276's real cost is larger than stated** (Correction 2). It is not "delete the host queue"; it is
  "delete the host queue *and build the enforcement surface ENF-01/ENF-02 never got*". Priced at step 6
  above.
- **`(ops)/ops/layout.tsx:88-99`'s `ModeSwitch` argument may need revisiting anyway** once ops lives on
  its own host, independently of the identity question — the switch's premise was two contexts on one
  origin.

---

## Integration Points

### External services

| Service | Integration pattern | Notes for v1.2 |
|---|---|---|
| Better Auth 1.6.14 (in-process) | `src/lib/auth.ts`; sessions in the same Postgres | Needs dynamic `baseURL` (`utils/url.mjs:206-215`) + a second `trustedOrigins` entry (`:63`). **Do not** add the admin plugin — `src/lib/ops/staff.ts:14-31` records the measured rejection (15 privileged endpoints published in one line by the `[...all]` catch-all, `set-role` among them). |
| Didit (identity) | signed webhook → `host_verification` | Untouched by v1.2. D-276 makes its verdict the sole authority; the Inngest sweep is the only rescue for a dropped verdict. |
| Resend (email) | `src/lib/email.ts` | Carries the staff invite via the shipped verification mail (`auth.ts:78-83`). ⚠ Still unproven at a real recipient — Resend rejects every recipient but the account owner until a domain is verified (`PROJECT.md:192`). A staff invite that cannot be delivered is a bootstrap failure, so this is on the critical path for Item 2's UAT. |
| DNS / hosting | new `ops.` record + TLS | Local dev is free: Next always allows `*.localhost`, so `ops.localhost:3000` works without `NEXT_DEV_ALLOWED_ORIGINS` (`next.config.ts:11-13`). |

### Internal boundaries

| Boundary | Communication | Consideration |
|---|---|---|
| proxy ↔ `(ops)` | URL rewrite only | The proxy must never become an authorization decision; three layers stay. |
| `(ops-auth)` ↔ `(ops)` | shared `user` table, shared Better Auth, shared host-only cookie | One account table (D-275). The sign-in group is outside `assertStaff()` by necessity. |
| ops staff actions ↔ `src/lib/ops/grant.ts` | direct import | **Second caller, not second copy.** `writeRole` (`:184-217`) already audits and is injectable. |
| `review-queue.ts` ↔ `ops-queue-row.tsx` | `OpsQueueItem` discriminated union | Items 3 and 4 both edit both files; sequence them (6 then 7). |
| `re-review.ts` ↔ the two detection sites | shared WRITE helper (`:22-31`) | D-278 changes how a host *reaches* it; the helper itself stays byte-unchanged. |
| host surfaces ↔ `loadHostVerification` | one owner-scoped read, five callers | The roadmap becomes the sixth. Do not add a second query (`verify/page.tsx:24-32`). |

---

## Sources

All primary, all read during this research on 2026-09-03. Confidence HIGH unless noted.

- `.planning/PROJECT.md` — Current Milestone (`:66-107`), D-275 (`:223`), D-276 (`:224`), D-277 (`:225`), D-278 (`:226`)
- `.planning/todos/pending/2026-09-01-ops-staff-management-surface-and-invite-flow.md` — PM-A / PM-B, the declined list
- `src/middleware.ts` (`:1-7`, `:43`, `:47`, `:71`) · `src/lib/session-check.ts:50-65`
- `src/app/(ops)/ops/layout.tsx` (`:5-23`, `:69`, `:79`, `:82-99`, `:107`) · `error.tsx` (`:3-13`, `:19`, `:53-60`) · `loading.tsx` (`:8-13`) · `page.tsx` (`:4-12`, `:130-164`)
- `src/lib/ops/staff.ts` (`:14-31`, `:33-45`, `:47-53`, `:80-89`, `:110-114`, `:142-144`) · `src/lib/ops/grant.ts` (`:16-21`, `:77`, `:184-217`, `:233`) · `scripts/ops-grant.ts` via `package.json:29-31`
- `src/lib/ops/review-queue.ts` (`:31-42`, `:107-153`, `:178-182`, `:232-253`, `:256-303`, `:314-341`)
- `src/components/ops/ops-queue-row.tsx` (`:23-31`, `:33-42`, `:64-72`, `:219-298`) · `ops-decision-actions.tsx` (`:59-64`, `:97-104`, `:145-330`) · `ops-reject-dialog.tsx`
- `src/app/actions/ops-review.ts` (`:3`, `:54`, `:325`, `:420`, `:522-610`, `:641`, `:723`) · `ops-contact.ts:190` · `src/lib/validation/ops.ts:136`
- `src/lib/auth.ts` (`:52`, `:62-63`, `:65-83`, `:112`, `:122-135`) — and a grep confirming **no `advanced` block**
- `src/lib/db/schema.ts` (`:45`, `:199-288`, `:401-444`, `:452-491`) · `drizzle/` listing (ends `0029_listing_review_cascade.sql`)
- `src/lib/listing/re-review.ts` (`:22-31`, `:33-46`, `:93-110`, `:116-124`, `:128-146`, `:157-222`)
- `src/lib/host/verification-status.ts` (`:55-110`) · `verification-signal.ts` (`:113-180`, `:276-402`) · `src/app/(host)/host/verify/page.tsx` (`:4-61`, `:82-121`) · `src/components/host/host-signals.tsx:214-234`
- `src/app/(host)/host/listings/page.tsx` (`:25-37`, `:100-233`) · `listings/new/page.tsx` (`:1-87`) · `listings/[id]/edit/page.tsx` (`:1-51`) · `src/app/actions/listing.ts` (`:23-33`, `:95-103`, `:111-162`)
- `src/components/listing/listing-card.tsx` (`:196`, `:352`, `:368`, `:404-479`) · `src/components/ui/card.tsx` (`:15`, `:82-93`)
- `src/app/not-found.tsx` (`:1-60`, notably `:16-19` and `:33-40`) · `src/components/patterns/site-footer.tsx:120-197`
- `tests/design/ops-guard-coverage.test.ts` (`:1-95`, `:96-160`, `:425-660`) · `tests/design/loading-coverage.test.ts:318-320` · `tests/design/soft-404-status.test.ts:1-120`
- `tests/ops/ops-queue-row.test.tsx` (`:8-31`, `:137-138`, `:234-400`, `:436-540`) · `tests/ops/queue-query.test.ts` (`:275-478`)
- `node_modules/better-auth@1.6.14`: `dist/cookies/index.mjs:17-42` (notably `:21-22`, `:35`) · `dist/api/middlewares/origin-check.mjs:37-60` · `dist/auth/trusted-origins.mjs` · `dist/utils/url.mjs:113-115`, `:206-236`
- `next.config.ts:6-55` (dev-origin behaviour) · `(ops)/ops/error.tsx:19` (pins `next@16.2.7`)
- Next 16 `middleware` → `proxy` deprecation: **carried from the stack researcher's finding**, not independently verified here — confidence **MEDIUM**, and worth one confirmation at plan time.

---
*Architecture research for: FitOut v1.2 Verification & Operations — integration into a shipped codebase*
*Researched: 2026-09-03*








