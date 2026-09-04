# Phase 18: Host Verification, Listing Review & FitOut Ops — Research

**Researched:** 2026-09-01
**Domain:** Staff identity & authorization (Better Auth 1.6.14 + Next 16 App Router) · Postgres 18 enum/backfill migration mechanics · extending a 7-site sell-gate · payout-freeze predicates · PH KYC vendor market
**Confidence:** HIGH on everything about this codebase and on the four framework/DB questions (all probed or read from installed source). MEDIUM on the PH KYC vendor market (vendor-published figures, no sandbox walked). LOW on nothing — gaps are named rather than filled.

> **Read `18-PATTERNS.md` first.** It already carries the *shape* of every file this phase touches, with real excerpts and analogs. This document does **not** repeat it. What is here is the set of facts the pattern map could not supply: verified framework/DB behaviour, four hazards nobody has counted yet, the blast radius of the gate change, and the HVER-04 vendor evidence.

---

<user_constraints>
## User Constraints (from `18-CONTEXT.md`)

Every decision below is **LOCKED**. Research answers HOW, never WHETHER.

### Locked Decisions

- **D-206** — KYC: adapter now, vendor later. Provider-agnostic verification port. FitOut persists only `{ result, vendorRef, checkedAt, provider }` — **never a government ID, never a document, never an image**. Ships with an **ops-manual provider**. PayMongo Linked Accounts is **NOT** wired here. SC#7's literal "third-party vendor" is deferred; the storage contract is satisfied in full.
- **D-207** — Cutover: grandfather **PERMANENTLY**. Listings already `published` at migration time, and their hosts, are marked `grandfathered` by the migration and are never retroactively re-reviewed.
- **D-208** — Pending listings are **HIDDEN**: absent from search, public page 404s. The host sees its own listing and its own review status.
- **D-209** — Ops cancel-and-refund: booker refunded the **full booking amount**, FitOut **RETAINS** the service/platform fee; the host is paid nothing.
- **D-210** — SC#2 is **NARROWED** to listings *created or materially edited after this phase*. Verification asserts the narrowed criterion.
- **D-211** — `grandfathered` is a **first-class, distinct state**, never written as if a human approved it. Do not collapse it into `approved` in the data.
- **D-212** — A grandfathered listing **MUST NOT** show the verification badge. Badge renders for `approved` only.
- **D-213** — Material edit is the burn-down path out of `grandfathered`.
- **D-214** — Reuse the existing dead `role` slot on `user` (`src/lib/auth.ts:112`), `input: false` stays. Values: `user` | `staff`.
- **D-215** — ONE staff role, no tiering. The audit trail is the control.
- **D-216** — The guard is **per-page and per-action, never middleware**. `requireStaff()` in `src/lib/ops/staff.ts`. **A layout guard is not sufficient and must not be relied on.**
- **D-217** — Staff granted by CLI (`scripts/ops-grant.ts`), never self-serve, never from a client body.
- **D-218** — Every ops action writes an `audit` row with `actorId` = the **authenticated** staff user id.
- **D-219** — Ops surfaces under a `(ops)` route group at `/ops`. A non-staff caller gets the **same 404 a nonexistent route gets**, not a 403.
- **D-220** — `host_verification`, 1:1 to `user`. `host_verification_status` pgEnum: `unverified | pending | approved | rejected | grandfathered | suspended`. **No column for a document, an ID number, or an image** — enforced by a column-set test.
- **D-221** — `listing.review_state` (denormalised) + `listing_review` (history). `listing_review_state` pgEnum: `pending | approved | rejected | grandfathered | withdrawn`.
- **D-222** — Suspension rides the host status enum (`suspended`). One gate, one read.
- **D-223** — `pgEnum` declared before the table it backs (const TDZ).
- **D-240** — The grandfather backfill grandfathers `published` ONLY, using the `drizzle/0014` shape (`DEFAULT 'pending'` + scoped idempotent `UPDATE … WHERE status = 'published' AND deleted_at IS NULL`). `draft` and `unlisted` rows become `pending`. A host is grandfathered iff they own at least one row the `UPDATE` touched. The `UPDATE` must be idempotent and must never move a row already `approved`/`rejected`.
- **D-224** — Add a **FIFTH and SIXTH** term to `deriveBookable`: `listing.reviewState` and `host.verificationStatus`, both **new required fields** on the existing parameter objects. Listing term: `'approved' || 'grandfathered'`. Host term: `'approved' || 'grandfathered'`.
- **D-225** — The new terms are **INDEPENDENT** of `payoutsEnabled`. Never express them in terms of it; never remove it.
- **D-226** — Move the inlined SQL twin (`src/lib/search/query.ts` Stage-1) in lockstep; extend `tests/search/bookable-gate.test.ts` fixtures to cover every new enum value.
- **D-227** — `placeHold` / `placeOpenHold` stay **RE-STATEMENTS**, each with its own refusal anchor. **No shared helper.**
- **D-228** — Search needs no separate work; assert it, do not re-implement it.
- **D-229** — `/listings/[id]` 404s for a non-approved listing, reusing the shipped soft-404 shape.
- **D-230** — The host sees its own listing, its review status, and a rejection reason.
- **D-231** — Material field set is exactly five: address, space type, capacity, photos, price. Detected in `saveListingStep`. Title/description deliberately excluded and recorded as deferred.
- **D-232** — A material edit flips `approved` OR `grandfathered` → `pending`.
- **D-233** — Two levers, ops chooses per case.
- **D-234** — Payout freeze enforced in `payout-sweep.ts`, mirrored in `payout-reconcile.ts`'s stuck-`held` predicate.
- **D-235** — Ops cancel-and-refund reuses the host-cancel machinery with the ops actor recorded, **but with the host-cancel FEE DEBIT suppressed**.
- **D-236** — Implement D-209 exactly as stated, isolated behind ONE named constant `OPS_CANCEL_REFUNDS_SERVICE_FEE = false` at a single call site, with the conflict documented there. **Do not resolve this conflict inside a plan.**
- **D-237** — The badge states WHAT FITOUT CHECKED and nothing more. Copy written against the *manual* provider. `approved` only.
- **D-238** — `18-KYC-VENDOR-COMPARISON.md` is a phase deliverable.
- **D-239** — `.planning/REQUIREMENTS.md` scoped to Phase 18.

### Claude's Discretion

Table/column naming, plan count and wave shape, component decomposition, server/client boundaries, test strategy, migration mechanics, console layout and information architecture, error handling, rate-limit budgets.

### Deferred Ideas (OUT OF SCOPE)

- Title/description as material fields (D-231) — flagged as a real gap.
- Tiered ops permissions (D-215).
- Backfilling the grandfathered catalogue (D-207/D-211).
- Wiring a real KYC vendor (D-206).
- Retiring `scripts/ops-alerts.ts`'s asserted `resolved_by`.
- Booker-side reporting (999.4), reviews and ratings (999.5), host appeals (999.6).
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **OPS-01** | Staff signs in as themselves; staff standing read server-side from a field no client can write | **F1** (Better Auth: `role` is returned on `session.user` by default, `getSession()` hits the DB every call — no cookie cache configured; `input:false` blocks `/api/auth/update-user`). **F1b** (the admin plugin is a net loss — 4 new columns + 15 new mounted routes). |
| **OPS-02** | No ops power reachable by non-staff or by URL; per-page + per-action; not middleware; indistinguishable from a nonexistent route | **F2** (Next 16 docs confirm D-216 verbatim; **F2b** is the finding that the 404 *status line* needs a third, non-security layer, and why) |
| **OPS-03** | Every ops action records an authenticated `actorId` | **F5b** (`recordAudit` swallows its insert — the ops console must not treat a written audit row as guaranteed) |
| **OPS-04** | One queue, oldest first, everything on the same screen | **F9** (design-gate blast radius: every new `/ops` page costs a `loading.tsx` + three pinned-count edits) |
| **OPS-05** | Approve/reject carries a reason the host is told | **F8** (notification enum: no ops-authored kind exists; adding one is an `ALTER TYPE ADD VALUE` and a discriminated-union compile error) |
| **HVER-01** | Provider-agnostic verification port | **F4** (the closest shipped analog is `refund-rail.ts` + `paymongo.ts`'s fail-closed boot, not a DI container) |
| **HVER-02** | Only `{ result, vendorRef, checkedAt, provider }`; no column could hold a document | **F4b** (the shipped `information_schema.columns` + `pg_constraint` assertion idiom at `tests/ops/alerts.test.ts:563-592`) |
| **HVER-03** | Host verification is a term of the sell-gate, independent of `payoutsEnabled` | **F5** (the seven sites, the census mechanism, and exactly how the parity fixtures must grow) |
| **HVER-04** | Written PayMongo-vs-standalone-PH-KYC comparison | **§ HVER-04 Vendor Evidence** |
| **HVER-05** | Badge states what FitOut checked; `approved` only | **F10** (two surfaces; `role` is a PRIVATE profile field, the badge value is not; search Stage-1 must SELECT a column it does not select today) |
| **LVER-01** | Approval is a term of `deriveBookable` itself, held equal across all seven sites | **F5** |
| **LVER-02** | Pending listing hidden: absent from search, soft-404 on the public page | **F6** (`isPubliclyViewable` takes a third required argument; there is a **third** leak surface — the OG image route — that neither D-228 nor D-229 names) |
| **LVER-03** | Material edit returns a listing to review | **F7** (the photos gap: `saveListingStep` cannot see photo changes at all) |
| **LVER-04** | Grandfathered is first-class, distinct, one-statement backfillable | **F3** (probed enum-transaction semantics; the backfill is provably safe in one migration — and provably untestable by the existing harness) |
| **ENF-01** | Ops suspends and chooses per case | **F5** (suspension rides the same gate read — no new gate) |
| **ENF-02** | Payouts freeze; a frozen row does not read as stuck | **F11** (a pre-claim freeze makes ENF-02's second sentence true *by construction*; the mirror in `alertStuckHeld` covers a different, narrower row) |
| **ENF-03** | Full booking amount refunded, service fee retained, host paid nothing, no host-cancel fee, one named constant | **F12** (five concrete forks in `cancelBookingAsHost` that an ops actor cannot ride unchanged, incl. two that will silently do the wrong thing) |
</phase_requirements>

---

## Project Constraints (from `CLAUDE.md`)

The stack is **prescriptive and fixed**. Nothing in this phase changes it. The directives that bind Phase 18 specifically:

| Directive | Where it binds Phase 18 |
|-----------|--------------------------|
| **Application-level double-booking checks are forbidden** — DB constraints arbitrate | Untouched. The sell-gate is not the overlap arbiter. Do not add app-level "is it approved?" checks *outside* `deriveBookable` — that is the same disease in a new place. |
| **Money is integer centavos, never float** | ENF-03. `refundCents` is read off the frozen row (`cancel-booking.ts:1137`), never recomputed. |
| **Store `timestamptz` (UTC), convert at the edges** | Every new timestamp column on `host_verification` / `listing_review` must be `timestamp(..., { withTimezone: true })` — the schema header states this is a manual post-generation tweak kept on regen (`src/lib/db/schema.ts:11-13`). |
| **Never pay the host at booking time; the webhook is the source of truth** | ENF-02. The freeze belongs *before* the claim, not after the transfer. |
| **Drizzle Kit generates; hand-edit the migration SQL for what Drizzle cannot express** | F3. New tables + enums are generator-expressible; the D-240 backfill `UPDATE` is not, and must be hand-appended. |
| **Better Auth 1.x + Drizzle adapter; sessions in the same Postgres** | F1. Do NOT regenerate the auth schema shape by hand (`src/lib/db/schema.ts:1-4`: regenerate with `npx @better-auth/cli generate`). `host_verification` is deliberately a **separate table keyed 1:1 to `user`**, exactly as `host_payout` is, "to keep the auth schema CLI-clean" (`schema.ts:279-281`). |
| **Do NOT use PayMongo payment splitting; collect → hold → transfer after delivery** | Untouched, but ENF-02's freeze sits inside that hold window — which is precisely why it works at all. |

---

## Summary

Phase 18 is three genuinely different engineering problems wearing one phase number, and their risk is not evenly distributed.

**The sell-gate change (LVER-01/HVER-03) is the largest and best-understood.** `deriveBookable` is deliberately built so that adding a required field breaks every call site (`src/lib/bookability.ts:26-33`). That census mechanism works exactly as advertised — but `tsc` only sees the four TypeScript call sites. The other three sites (the inlined SQL twin, and the two deliberate re-statements) are held by **tests**, not by the compiler, and one of those tests currently has only **one passing fixture** in its set-equality assertion. Adding two terms with 5 and 6 enum values respectively is what turns that from a real drift guard into a weak one unless its fixtures grow in a specific way (**F5**). Separately, the change has a **fixture blast radius nobody has counted**: 19 test files hand-build a bookable host, and every one of them goes dark the moment a sixth required term defaults to failing (**F9**).

**The ops console (OPS-01..05) is small in logic and surprisingly expensive in gates.** Better Auth needs *nothing added* — `role` is already returned on `session.user`, `getSession()` already hits the database on every call because no cookie cache is configured, and `input:false` already blocks the one endpoint that could write it. The admin plugin would be a net loss: four new columns on Better-Auth-owned tables and **fifteen new HTTP routes** mounted instantly by the existing catch-all handler, including `set-role`, `impersonate-user` and `set-user-password` (**F1b**, read from `node_modules`). The real cost is elsewhere: `npm run build` runs a design suite with **pinned page counts** (33/21/12), a mandatory `loading.tsx` per async page, an enumerated raw-`<Card>` allow-list, and an ESLint rule banning raw design values under `src/app/**` — so each `/ops` page carries roughly four non-obvious edits before it renders anything (**F9**). And D-219's "same response as a nonexistent route" is **not** achievable with a page-level guard alone, for a reason the codebase already discovered once and wrote down (**F2b**).

**The enforcement levers (ENF-01..03) hide the sharpest edges.** The payout freeze is easier than D-234 implies — a pre-claim filter in `queryDuePayouts` makes ENF-02's "does not page an operator" clause true *by construction*, because no ledger row is ever created to go stale (**F11**). But `cancelBookingAsHost` cannot be ridden by an ops actor unchanged: its owner gate, its in-`WHERE` `EXISTS (… l.host_id = ${userId})` defence, its `starts_at > now()` guard, its `cancelled_by = 'host'` write (the enum has **no `ops` value** — `schema.ts:698`), and its `booking_cancelled_by_host` notification each need a decision, and **two of them will silently do the wrong thing** rather than fail loudly (**F12**).

**Primary recommendation:** sequence the phase so the *census* work lands before the *surface* work. Plan 1 is staff identity (`requireStaff` + the CLI grant + the `(ops)` group skeleton with its three guard layers). Plan 2 is the schema + the D-240 migration, whose backfill is provably safe in one transaction (**probed on PG 18.4**) but is **invisible to the existing test harness** and therefore needs its own seeded test. Plan 3 is the seven-site gate change *together with* its fixture blast radius — attempting it in a later wave, after console surfaces exist, means a red suite of unknown provenance. Everything else can follow.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Staff standing (`role === 'staff'`) | API / Backend (server action + RSC) | — | `role` is `input:false` and is a PRIVATE profile field (`src/lib/profile.ts:44`). It must never reach a client bundle or a client-readable payload. |
| Ops route reachability | Frontend Server (RSC layout, for the **status line only**) + API/Backend (per-page + per-action, for the **decision**) | — | Two different jobs, deliberately not merged — see **F2b**. Middleware is explicitly excluded (D-216). |
| Ops mutations (approve/reject/suspend/cancel) | API / Backend (server actions) | Database (audit row) | Next 16 docs: "Treat Server Actions with the same security considerations as public-facing API endpoints." Every action re-gates independently. |
| The sell-gate predicate | Pure function (no tier) | — | `deriveBookable` is pure by design so the truth table can drive it directly. It must stay pure — no DB, no I/O (`bookability.ts:26-30`). |
| Sell-gate enforcement in search | Database (SQL, Stage-1) | — | The gate is inlined in SQL so a pending listing never leaves Postgres. |
| Sell-gate enforcement at the money path | API / Backend (two re-statements) | — | `placeHold` / `placeOpenHold` re-derive server-side because "the reserve route group is NOT the gate" (`booking.ts:154`). |
| Hidden-until-approved (public page) | Frontend Server (layout, status line) + API/Backend (page body) | — | `assertPublicListing` in the layout wins the 404 status; `isPubliclyViewable` in the page keeps the body honest. One rule, two call sites (`public-listing.ts:72-76`). |
| Verification badge | Frontend Server (RSC composes; client card renders a finished prop) | — | Mirrors D-130/GATE-05: the RSC composes, the card never re-derives (`listing-card.tsx:11`). |
| Payout freeze | Database (SQL predicate inside the cron) | Job (Inngest cron) | The freeze is a `WHERE` clause, not application branching — same philosophy as the at-most-once `ON CONFLICT` lock. |
| Verification provider port | API / Backend (`server-only` service) | — | The port must never be importable from a client component; `refund-rail.ts` is isomorphic on purpose, but a *provider* that will one day hold an API key is not. |
| Identity document custody | **None — deliberately outside every tier** | — | D-206/HVER-02. The absence of a storage tier is the requirement. |

---

## System Architecture Diagram

```
                                     ┌──────────────────────────────────────┐
   BOOKER (anonymous or signed-in)   │            HOST (canHost)            │
        │                            └──────────────────────────────────────┘
        │                                    │                    │
        │ GET /                              │ saveListingStep    │ publishListing
        │ GET /listings/[id]                 ▼                    ▼
        │                            ┌─────────────────────────────────────┐
        │                            │  material-edit detector (D-231)      │
        │                            │  incoming vs persisted, 5 fields     │
        │                            │  ⚠ photos NOT visible here — F7      │
        │                            └───────────────┬─────────────────────┘
        │                                            │ approved|grandfathered → pending
        ▼                                            ▼
┌───────────────────────┐                  ┌──────────────────────────────────┐
│ search Stage-1 SQL    │◄─────gate────────┤   listing.review_state            │
│ (inlined twin)        │                  │   host_verification.status        │
└───────────┬───────────┘                  └──────────────┬───────────────────┘
            │                                             │  (same two columns
            │                              ┌──────────────┴───────────────┐    feed every
            ▼                              │                              │    consumer below)
┌───────────────────────┐        ┌─────────▼──────────┐        ┌──────────▼──────────┐
│ /listings/[id]        │        │  deriveBookable    │        │ placeHold  /        │
│  layout: assertPublic │───────►│  (pure, 6 terms)   │◄───────│ placeOpenHold       │
│  page : isPublicly…   │        └─────────┬──────────┘        │ (2 RE-STATEMENTS,   │
│  ⚠ og-image: 3rd site │                  │                   │  own anchors each)  │
└───────────────────────┘                  │                   └──────────┬──────────┘
                                           │ bookable=false               │ refuse
                                           ▼                              ▼
                                    ┌─────────────┐              "not-bookable"
                                    │ badge       │  approved ONLY (D-212)
                                    │ (HVER-05)   │
                                    └─────────────┘

  ═══════════════════ STAFF SIDE ═══════════════════

  scripts/ops-grant.ts ──► UPDATE "user" SET role='staff'  (Drizzle write; NEVER auth.api.updateUser)
                                     │
                                     ▼
  GET /ops/* ──► (ops)/ops/layout.tsx  assertStaff()   ── status-line layer (NOT the boundary)
                          │
                          ▼
                 (ops)/ops/**/page.tsx  requireStaff()  ── the decision, per page
                          │
                          ▼
            ops server action  requireStaff()           ── the decision, per action
                          │
            ┌─────────────┼──────────────┬───────────────────────┐
            ▼             ▼              ▼                       ▼
      listing_review  host_verification  audit(actorId=staff)  emitNotify(host)
      + review_state   + status                                (OPS-05 reason)
                          │
                          ▼ status='suspended'
            ┌─────────────┴──────────────────────────────┐
            ▼                                            ▼
   payout-sweep.queryDuePayouts              ops cancel-and-refund
   (freeze BEFORE the claim → no             (rides cancelBookingAsHost with
    ledger row ever created)                  5 forks — F12; fee debit SUPPRESSED)
            │                                            │
            ▼                                            ▼
   payout-reconcile.alertStuckHeld           PayMongo createRefund
   (mirror: crash-window rows only)          (space price only, D-236 constant)
```

---

## Standard Stack

**No new runtime dependency is required by this phase.** Every capability it needs is already installed and already used somewhere in this codebase.

### Core (already installed — versions read from `node_modules`)

| Library | Version installed | Purpose in Phase 18 | Why it is the answer |
|---------|-------------------|---------------------|----------------------|
| `better-auth` | **1.6.14** | Staff identity: `auth.api.getSession()` + `session.user.role` | `role` already exists as an `additionalField` with `input:false` (`src/lib/auth.ts:112`). Nothing needs adding. [VERIFIED: `node_modules/better-auth/package.json`] |
| `drizzle-orm` | **0.45.2** | `pgEnum` + tables + the gate joins | The `pgEnum`-before-table idiom is the shipped one (D-223). [VERIFIED: `node_modules/drizzle-orm/package.json`] |
| `drizzle-kit` | **0.31.10** | `generate` for the new tables; hand-append the D-240 backfill | [VERIFIED: `node_modules/drizzle-kit/package.json`] |
| `next` | **16.2.7** | `(ops)` route group, RSC guards, `notFound()` | [VERIFIED: `node_modules/next/package.json`] |
| `zod` | **4.4.3** | Ops-action argument re-validation | Server-action argument types are not enforced at runtime — the shipped idiom re-parses (`cancel-booking.ts:1104-1108`). |
| `inngest` | **4.13.0** | The freeze lands inside two existing crons | 2-arg `createFunction(options, handler)` form — the 3-arg form in older skeletons is wrong here (`payout-reconcile.ts:158-160`). |
| `vitest` | **4.1.8** | Both suites | |

### Explicitly NOT to be added

| Candidate | Verdict | Evidence |
|-----------|---------|----------|
| `better-auth/plugins/admin` | **Do not add.** | See **F1b** — 4 new columns on Better-Auth-owned tables + 15 new mounted HTTP routes, for a `role` field that already exists with identical attributes. |
| Any KYC vendor SDK | **Out of scope this phase (D-206).** | The port ships with the manual provider only. |
| A dependency-injection container for the port | **Do not add.** | The shipped port analog is a module with a `Record` and a fail-closed default (`refund-rail.ts`), not a container. |
| `server-only` (as an npm install) | **Never.** | Next aliases the specifier; installing it is a recorded-decision reversal (`src/lib/payments/fees.ts:27-30`). Both Vitest configs alias it to a stub. |

**Installation:** none. If a plan believes it needs a package, that is a signal to re-read `18-PATTERNS.md` § No Analog Found first.

---

## Package Legitimacy Audit

**This phase installs no external packages.** The Package Legitimacy Gate is therefore satisfied vacuously — there is nothing to slopcheck.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| *(none)* | — | — | — | — | — | — |

**Packages removed due to slopcheck `[SLOP]` verdict:** none.
**Packages flagged as suspicious `[SUS]`:** none.

> **Binding instruction for the planner:** if any plan in this phase proposes `npm install <anything>`, that plan has diverged from this research. Re-check it against `18-PATTERNS.md` § No Analog Found and CLAUDE.md's prescriptive stack before approving it. Should a package genuinely become necessary, run the gate (`pip install slopcheck --break-system-packages` → `slopcheck install <pkg> --json` → `npm view <pkg> version` → `npm view <pkg> scripts.postinstall`) and gate the install behind a `checkpoint:human-verify` task.

---

# Verified Findings

## F1 — Better Auth 1.6.14: server-side role authorization needs **nothing added**

Four properties, each verified, together mean D-214's "reuse the dead slot" is not a compromise — it is strictly the better design.

**(a) `additionalFields` are returned on the session user by default.**
The docs state the `returned` option's default explicitly: *"Whether Better Auth includes the stored field in response bodies (default: `true`)."* [CITED: better-auth.com/docs/concepts/database]. `role` declares no `returned: false` (`src/lib/auth.ts:112`), so `session.user.role` is already populated on every `getSession()`.

**(b) `getSession()` reads the database on every call — because no cookie cache is configured.**
Better Auth's own docs: *"Calling your database every time `useSession` or `getSession` is invoked isn't ideal…"* and cookie caching *"is not enabled by default — to turn on cookie caching, just set `session.cookieCache` in your auth config."* [CITED: better-auth.com/docs/concepts/session-management]. A repo-wide grep for `cookieCache` returns **exactly one hit, in a comment** (`src/lib/session-check.ts:20`) — it is not configured. [VERIFIED: `grep -rn "cookieCache" src/`]

*Why this matters and must be written down:* a `staff` grant, and more importantly a **revocation**, takes effect on the next request with no session invalidation step. If anyone later enables `session.cookieCache` as a performance change, `requireStaff()` silently starts reading a stale role for the cache TTL. **`requireStaff()`'s module header must state that it depends on cookie caching staying off**, exactly as `src/lib/auth.ts:73` states that `revokeSessionsOnPasswordReset` defaults to `false` and must be set explicitly.

**(c) `input: false` already blocks the one endpoint that could write it.**
The docs: with `input: false`, *"API input and provider profile mapping cannot supply the field. A configured `defaultValue` can initialize it; otherwise use an application-owned database write."* [CITED: better-auth.com/docs/concepts/database]. This codebase has already paid the cost of that and written it up: `avatarUrl`/`avatarPublicId` carry the same flag, and the header records that `auth.api.updateUser` *cannot* write them either, so both avatar actions **write through Drizzle, exactly as `capability.ts:75` does for `canHost`** (`src/lib/auth.ts:120-135`). `scripts/ops-grant.ts` (D-217) inherits that verbatim: a Drizzle `UPDATE "user" SET role = 'staff'`, never `auth.api.updateUser`.

**(d) `role` is already classified PRIVATE.**
`PRIVATE_PROFILE_FIELDS` names `"role"` (`src/lib/profile.ts:44`), and `publicProfile()` is an explicit allow-list whose header says *"adding a new private column to the user table does not silently leak it."* No work needed — but see **F10**: the *badge* value is a different field and must not be smuggled through `role`.

### F1b — The admin plugin is a net loss. Read from the installed package, not from docs.

`node_modules/better-auth/dist/plugins/admin/schema.mjs` declares:

```js
user:    { role, banned, banReason, banExpires }   // role: { type:"string", required:false, input:false }
session: { impersonatedBy }
```

Two facts follow:

1. **Its `role` declaration is byte-identical in attributes to the one already in `src/lib/auth.ts:112`** (`type:"string"`, `required:false`, `input:false`). The plugin adds nothing to the field this phase actually uses.
2. **It adds three columns to `user` and one to `session`** — both Better-Auth-owned tables that `src/lib/db/schema.ts:1-4` says must be regenerated by `npx @better-auth/cli generate` and **not hand-edited**. That is a migration against the auth schema for zero benefit.

And the decisive one — `node_modules/better-auth/dist/plugins/admin/routes.mjs` mounts **fifteen** endpoints:

```
/admin/ban-user           /admin/create-user        /admin/get-user
/admin/has-permission     /admin/impersonate-user   /admin/list-user-sessions
/admin/list-users         /admin/remove-user        /admin/revoke-user-session
/admin/revoke-user-sessions  /admin/set-role        /admin/set-user-password
/admin/stop-impersonating /admin/unban-user         /admin/update-user
```

`src/app/api/auth/[...all]/route.ts` is `toNextJsHandler(auth)` — a catch-all. **Adding the plugin publishes all fifteen instantly**, including `set-role` (a role-grant HTTP endpoint, when D-217 says grants are CLI-only), `impersonate-user` (session impersonation on a marketplace that moves real money), `set-user-password` and `remove-user`. Each would then need its own rate-limit rule in `auth.ts`'s `customRules` and its own test.

[VERIFIED: `node_modules/better-auth/dist/plugins/admin/{schema,routes}.mjs`, installed 1.6.14]

**Verdict: `requireStaff()` reading `session.user.role` is correct, and adding the admin plugin would be a security regression.** Say so in the plan; do not leave it as an unexamined omission.

---

## F2 — Next 16: the official docs confirm D-216 verbatim

The Next.js authentication guide (version 16.3.3, lastUpdated 2026-08-25) says three things that make D-216 not a preference but the documented rule:

> *"Due to **Partial Rendering**, be cautious when doing checks in Layouts as these don't re-render on navigation, meaning the user session won't be checked on every route change."*

> *"A layout also **does not control whether the rest of the route renders**. Route segments and parallel route slots are rendered by the router, so a layout that hides or swaps them does not stop them from running or from appearing in the RSC Payload."*

> *"A common pattern in SPAs is to `return null` in a layout or a top-level component if a user is not authorized. This pattern is **not recommended** since Next.js applications have multiple entry points, which will not prevent nested route segments and Server Actions from being accessed."*

> *"Treat **Server Actions** with the same security considerations as public-facing API endpoints, and verify if the user is allowed to perform a mutation."*

[CITED: nextjs.org/docs/app/guides/authentication]

This is D-216, D-219 and OPS-02 restated by the framework's own authors. **Quote it in the plan** — it converts "the project prefers per-page guards" into "the framework says a layout guard does not stop the segment from rendering."

The shipped codebase already encodes both halves: `(host)/host/layout.tsx:42-55` gates, **and `(host)/host/listings/page.tsx:38-48` re-gates the same two conditions**, with the page's own header calling it *"canHost re-check (defense in depth)"*.

### F2b — **THE FINDING**: D-219's "same response as a nonexistent route" needs a *third* layer that is explicitly NOT the security boundary

This is the one place where following D-216 literally and alone produces a response that **fails D-219**, and the codebase has already discovered the mechanism once, in a different route tree.

**The chain of already-verified facts:**

1. `tests/design/loading-coverage.test.ts` is **build-blocking** (`npm run build` = `lint && test:design && next build`) and its rule is that **every page with an `async` default export must have a `loading.tsx`** beside it — *and dead ones fail too*. An ops queue that reads the database is an async page. So `/ops/**` pages **must** have `loading.tsx`.
2. `loading.tsx` is a `<Suspense>` boundary around the page. Next's own `notFound()` reference states the consequence: *"Because the check runs inside the `<Suspense>` boundary, the response has already begun streaming as a `200`, and the status can't change once streaming has started."* [CITED: nextjs.org/docs/app/api-reference/functions/not-found]
3. A **truly nonexistent** route returns a hard **404**. Measured on a production build by plan 17.1-01: `/listings/{nonexistent}` → `404` (quoted verbatim in `tests/design/soft-404-status.test.ts:8-14`).
4. Therefore a `notFound()` thrown from an `/ops/**` **page** returns HTTP **200** with not-found content, while a nonexistent route returns **404**. **A prober can tell them apart with `curl -o /dev/null -w '%{http_code}'`.** D-219 is violated by exactly one number.
5. There is a second, worse tell. Next: *"the exception propagates to the nearest `not-found` boundary, which renders in place of the streamed-in content, even though the page shell has already been sent."* If `(ops)/ops/layout.tsx` renders any ops chrome, a page-level `notFound()` streams **the ops shell wrapped around a 404 body**. A prober sees an "Ops" header on a page that claims not to exist.

**The shipped fix already exists and is documented in full**, for the identical defect on `/listings/[id]`: `src/lib/listing/public-listing.ts` + `src/app/listings/[id]/(detail)/layout.tsx`. Its header records the measurements including the two plausible fixes that **do not work** (`generateMetadata` is too late → 200; deleting `loading.tsx` works but trips the build-blocking gate). The working shape is: **assert in the LAYOUT, above the Suspense boundary, before returning any JSX.**

**Recommendation — three layers, three different jobs, each stated at its own site:**

| Layer | Site | Job | Is it the security boundary? |
|-------|------|-----|------------------------------|
| 1 | `(ops)/ops/layout.tsx` → `assertStaff()` | **Wins the 404 status line** and prevents ops chrome rendering around a not-found body | **NO.** Its header must say so, in the words `src/middleware.ts:1` already uses. |
| 2 | every `(ops)/**/page.tsx` → `requireStaff()` | **The decision** (D-216) | **YES** |
| 3 | every ops server action → `requireStaff()` | **The decision** (D-216, and Next's own Server Actions rule) | **YES** |

`assertStaff` and `requireStaff` must both resolve staffness through **one expression**, exactly as `isPubliclyViewable` is called by both the layout and the page so *"the rule cannot drift between the layout that sets the STATUS and the page that renders the BODY"* (`public-listing.ts:70-76`). Use `cache()` on the session read so layer 1 and layer 2 cost one query per request, as `assertPublicListing` does.

**Two corollaries the planner must hold:**

- **Do NOT add an `(ops)`-scoped `not-found.tsx`.** A distinct 404 body under `/ops` is itself the oracle D-219 forbids. The root `src/app/not-found.tsx` must be what renders — byte-identical to any bad URL.
- **The status line cannot be asserted by Vitest.** `tests/design/soft-404-status.test.ts:31-39` states this plainly: *"The e2e spec is the ONLY instrument in this repo that can see an HTTP status line."* And D-24 keeps e2e out of CI. So OPS-02's status-line half is a **one-time production-build `curl` audit** (the 17.1-01 § P1 shape: `npm run build && next start -p 3100`, then `curl -o /dev/null -w '%{http_code}'` for staff / non-staff / signed-out / nonexistent) plus a **structural** design test that pins the guard's presence. Both, not either. See § Validation Architecture.

---

## F3 — Postgres 18 enum + backfill mechanics: three probes, run on the project's own database

All three probed on **PostgreSQL 18.4** (`postgis/postgis:18-3.6`, the running `fitout-db-1` container — the exact image production is specified against). [VERIFIED: local probe, 2026-09-01]

| Probe | Statement sequence | Result |
|-------|--------------------|--------|
| **A** | `BEGIN; CREATE TYPE probe_state AS ENUM(…); CREATE TABLE t(…); INSERT … 'pending'; UPDATE t SET s='grandfathered'; ` | ✅ **OK** — labels of a type created in the same transaction are immediately usable |
| **B** | type pre-exists and is committed → `BEGIN; ALTER TYPE pre_state ADD VALUE 'c'; UPDATE t SET s='c';` | ❌ **`ERROR: unsafe use of new value "c" of enum type pre_state`** / `HINT: New enum values must be committed before they can be used.` |
| **C** | `BEGIN; CREATE TYPE same_tx AS ENUM('a','b'); ALTER TYPE same_tx ADD VALUE 'c'; INSERT … 'c';` | ✅ **OK** — the restriction does not apply when the type itself was created in that transaction |

The PG 18 docs state only the blanket rule — *"If `ALTER TYPE ... ADD VALUE` … is executed inside a transaction block, the new value cannot be used until after the transaction has been committed."* [CITED: postgresql.org/docs/18/sql-altertype.html] — and say nothing about the same-transaction-creation exception. Probes A and C are what make the safe path provable rather than assumed.

**And the migrations really do run in one transaction.** Verified in installed source, both paths:
- `node_modules/drizzle-orm/pg-core/dialect.cjs:62` — `await session.transaction(async (tx) => { for await (const migration of migrations) { … } })`. One transaction, all pending migrations.
- `node_modules/drizzle-kit/bin.cjs:78922-78940` — `transactionProxy` issues `BEGIN`, loops every query, then `COMMIT`. `npm run db:migrate` behaves the same way.

### What this means for Phase 18

**(1) The D-240 grandfather backfill is SAFE in the same migration as the `CREATE TYPE`.** Both enums (`host_verification_status`, `listing_review_state`) are new. Probe A proves `CREATE TYPE` + `ADD COLUMN … DEFAULT 'pending'` + the scoped `UPDATE … SET review_state = 'grandfathered'` compose in one file, in one transaction, with no 55P04. **No standalone ALTER-TYPE split is needed for this phase's own enums** — the `drizzle/0018` / `drizzle/0020` idiom does not apply here and copying it would be cargo-culting.

**(2) The split idiom becomes mandatory the moment the phase touches an EXISTING enum.** Probe B is the failure. Two candidates in scope:
- `cancelled_by` gaining `'ops'` (**F12**)
- `notification_type` gaining an ops-authored kind (**F8**)

Either one must be its own migration file that does **nothing else**, and its first use must be a runtime write, never a migration — exactly as `drizzle/0018` and `drizzle/0020` state in their own headers. Note that `drizzle/0021`'s header describes a **grep tripwire** for that discipline: *"a search for the single-quoted literal over every migration after 0020 must print 0."* If this phase adds an enum value, add the equivalent tripwire.

**(3) ⚠ The asymmetry that will bite: this failure is invisible everywhere it is tested.**
- Probe C means that on a **fresh** database (all migrations in one run) the type is created in the same transaction, so `ALTER TYPE ADD VALUE` + use **succeeds**.
- `tests/helpers/db.ts:118-131` replays each statement in its **own** `bootstrap.unsafe(...)` call, so nothing shares a transaction at all — it can never reproduce 55P04 in either direction.
- On the **live** database, where the enum is already committed, Probe B applies and the migration **fails**.

**A migration with this defect passes the full test suite and a fresh-DB migrate, and fails only in production.** State this in the plan; do not rely on green tests.

**(4) The D-240 backfill is a NO-OP in every test.** `setupTestDb()` replays migrations into an **empty schema**, so `UPDATE listing SET review_state='grandfathered' WHERE status='published'` touches zero rows in every one of the 192 integration test files. The backfill's correctness — that it grandfathers exactly `published AND deleted_at IS NULL`, that it is re-runnable, that it never moves an `approved`/`rejected` row — **cannot be asserted by the standard harness**. It needs a dedicated test that: (a) `setupTestDb()`, (b) seeds published + draft + unlisted + soft-deleted listings, (c) resets `review_state` to the column default, (d) executes the exact `UPDATE` statement **read from the migration file on disk** (`readFileSync` of `drizzle/00NN_*.sql`, the shipped idiom at `tests/design/cloudinary-preset-script.test.ts:404`), (e) asserts the row-by-row outcome, (f) runs it a second time and asserts the same result. Reading the statement from the file rather than retyping it is what makes the test measure the migration instead of a copy of it.

**(5) Host grandfathering (D-240) is a derived predicate, not a second column of truth.** *"a host is grandfathered iff they own at least one row that this `UPDATE` touched."* In SQL that is one statement in the same migration:

```sql
INSERT INTO host_verification (user_id, status, provider, checked_at, created_at, updated_at)
SELECT DISTINCT l.host_id, 'grandfathered', 'migration', NULL, now(), now()
FROM listing l
WHERE l.status = 'published' AND l.deleted_at IS NULL
ON CONFLICT (user_id) DO NOTHING;
```

`ON CONFLICT DO NOTHING` is what makes it re-runnable and is the same at-most-once idiom the sweep uses (`payout-sweep.ts:10-14`). Note `checked_at` is **NULL**, and `provider` says `'migration'` — D-211 requires a grandfathered row to be distinguishable from a human approval, and a `checked_at` timestamp on a check that never happened would be a fabricated audit record, the exact thing `drizzle/0025`'s header refuses for `resolved_by`.

---

## F4 — The provider port: the closest shipped analog is a **branch point**, not a container

`18-PATTERNS.md` § 3 already assigns the analog. What research adds is *which properties of that analog are load-bearing*, because the port is the artifact HVER-01 is judged on ("registering a different provider is a registration + configuration change, not a re-architecture").

**`src/lib/payments/refund-rail.ts` is the shape.** Its whole surface is a `ReadonlySet` and one predicate, and its two load-bearing properties are:

1. **It fails CLOSED.** *"an absent/unknown rail is treated as non-refundable, so an unrecognised payment method routes to the operator-alert path rather than to a call that would 4xx"* (`refund-rail.ts:50-52`). The verification port must do the same: an unregistered `provider` string resolves to *no provider*, which resolves to *not verified*, never to a permissive default.
2. **It is the ONLY branch point.** *"Do NOT inline this predicate anywhere."* The port must be the only place that maps `provider → adapter`.

**`src/lib/paymongo.ts:1-32` supplies the second half:** a thin `fetch` wrapper that is *"the ONLY place that talks to PayMongo over HTTP"*, with a **fail-closed boot guard** that throws at module load in production when its credential is missing (`:26-32`), while tolerating a placeholder in dev/test/build. When a real vendor is registered later, that is the guard shape it inherits.

**Three constraints research adds:**

- **`import "server-only"` on the provider modules, not necessarily on the port's types.** `src/lib/payments/fees.ts:1-30` records exactly why the split matters: guarding a module that client components legitimately import fails the build naming files that are not violations. If any client component needs the *status value* to render the badge, keep the status **type/enum** in a directive-free module and put `server-only` on the provider implementation. Both Vitest configs alias `server-only` to a stub, so this costs tests nothing.
- **The manual provider is a real provider, not a stub.** D-206 says the gate, the queue, the badge and the audit trail are all real in this phase. The manual provider's `verify()` returns `{ result, vendorRef: null, checkedAt: now, provider: 'manual' }` derived from the staff decision — it is the ops console's write path, expressed through the port, so that swapping in a vendor swaps the *caller of the same contract*.
- **`vendorRef` must be nullable and `result` must be nullable** (D-220 says so) — the manual provider has no vendor reference, and a row in `pending` has no result yet. Do not model `result` as a non-null boolean.

### F4b — HVER-02's column-set test: the shipped idiom, and why it must be a DB assertion

HVER-02 says *"there is no column that could hold one — enforced by a test asserting the table's column set, not by convention."*

The exact idiom exists at `tests/ops/alerts.test.ts:563-592` (case 14), and its header states the reason a `tsc` check would be worthless:

> *"MEASURED AGAINST THE DATABASE, NEVER AGAINST `tsc` (T-08-40). The row type comes from schema.ts, so a column declared there but never migrated leaves the type checker and `next build` perfectly green while every integration test in the suite runs against a table that does not have it."*

The inverse is what HVER-02 needs: a column that exists **in the migrated table** but not in `schema.ts` would be invisible to `tsc` and perfectly capable of holding a passport scan. So the assertion is:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = $testSchema AND table_name = 'host_verification'
```

…compared against an **exact expected set** (not a subset check, not a deny-list) — an allow-list, for the same reason `publicProfile` is an allow-list (`src/lib/profile.ts:50-52`): *"adding a new private column … does not silently leak it."* A deny-list of `('document','id_number','image',…)` fails the day someone names a column `attachment_url`.

---

## F5 — The seven-site gate: what the census catches, what it doesn't, and exactly how the parity fixtures must grow

**The four `tsc`-forced sites** (confirmed by grep; each builds a fresh object literal, which is what makes the census work):

| # | Site | How it supplies the new terms |
|---|------|-------------------------------|
| 1 | `src/app/listings/[id]/(detail)/page.tsx:286` | The row already `.leftJoin(hostPayout)`; add `leftJoin(hostVerification)` to the same query at `:250-254` and read `listing.reviewState` off `row.listing` — **zero added round trips**, no `Promise.all` element needed. |
| 2 | `src/app/(host)/host/listings/page.tsx:155` | `reviewState` comes free (`.select()` on `listing`). The host term needs one extra read alongside the existing `emailVerified`/`payoutsEnabled` pair — one row, once, for the whole grid, never per card. |
| 3 | `src/app/actions/booking.ts:192` (`placeHold`) | Fold into the existing `.leftJoin(hostPayout)` select. |
| 4 | `src/app/actions/booking.ts:448` (`placeOpenHold`) | Same, **restated** (D-227). |

**The three sites `tsc` does NOT see:**

| # | Site | Held by |
|---|------|---------|
| 5 | `src/lib/search/query.ts:211-217` (inlined SQL) | `tests/search/bookable-gate.test.ts`'s set-equality — **and nothing else** |
| 6 | `booking.ts` `placeHold` refusal | anchor `L_nohours` in `tests/booking/state-machine.test.ts` |
| 7 | `booking.ts` `placeOpenHold` refusal | anchor `L_OPEN_NOHOURS` in `tests/booking/open-capacity-hold.test.ts` |

### F5a — `COALESCE` is required on the host term, and it must fail closed

`host_verification` is 1:1 to `user` but **not every user has a row** (D-240 only inserts for grandfathered hosts; new hosts get one when they enter the queue). So the join is a `LEFT JOIN` and the SQL term must be:

```sql
AND COALESCE(hv.status::text, 'unverified') IN ('approved', 'grandfathered')
```

…mirroring `COALESCE(hp.payouts_enabled, false) = true` on the line above it (`query.ts:214`). And in TypeScript the call sites must pass `lr.verificationStatus ?? "unverified"`, mirroring `lr.payoutsEnabled ?? false` (`booking.ts:196`). **A missing row means unverified, never verified.** The `=== true` discipline at `booking.ts:193-195` (*"keeps a driver-shape surprise … from reading as truthy"*) has a direct analogue here: compare against the two literal strings, never `!== 'suspended'` — a negative test would pass `unverified` through.

### F5b — What `tests/search/bookable-gate.test.ts` fixtures must grow to (the precise answer)

**Today the parity set has exactly ONE passing member.** `FIXTURES` (`:150-156`) holds 5 rows, of which only `gate_pub` derives `true`. A set-equality assertion with a single-element expected set is weak: it proves the SQL accepts that one row and rejects four, and nothing about the *shape* of acceptance.

**After this change it must have at least three passing members and cover every enum value**, or D-226's *"the equality proves less than it did before"* comes true.

The file's own stated discipline governs the design: *"Every fixture below must fail (or pass) for its OWN single reason — that is what makes an exclusion diagnostic rather than merely true"* (`:104-107`).

Required growth:

1. **`makeHost(id, opts)` gains `verificationStatus`** and inserts a `host_verification` row (or deliberately none, for the `unverified`-by-absence case).
2. **`makeListing(id, hostId, status, hours)` gains `reviewState`.**
3. **`FIXTURES` rows gain both fields.**
4. **Four new listing-review fixtures**, all sharing the fully-passing `gate_host_ok`, differing in `review_state` and nothing else:

| fixture | `review_state` | expected |
|---------|----------------|----------|
| `gate_pub` (existing, now explicit) | `approved` | **pass** |
| `gate_lr_grandfathered` | `grandfathered` | **pass** ← the second passing member, and the one D-212 makes non-obvious |
| `gate_lr_pending` | `pending` | fail |
| `gate_lr_rejected` | `rejected` | fail |
| `gate_lr_withdrawn` | `withdrawn` | fail |

5. **Five new host fixtures**, each with its **own** host (so each fails for its own single reason), all on `approved` listings with hours:

| fixture | host `status` | expected |
|---------|---------------|----------|
| (`gate_host_ok`) | `approved` | pass (already covered by `gate_pub`) |
| `gate_hv_grandfathered` | `grandfathered` | **pass** ← third passing member |
| `gate_hv_unverified` | *no `host_verification` row at all* | fail — this is the one that proves the `COALESCE` |
| `gate_hv_pending` | `pending` | fail |
| `gate_hv_rejected` | `rejected` | fail |
| `gate_hv_suspended` | `suspended` | fail — **this is the ENF-02 / D-222 anchor in the search half** |

Net: **5 fixtures → 14**, **3 hosts → 8**, **1 passing member → 3**. Every one of the 5 listing-review values and all 6 host-verification values appears exactly once. `gate_deleted` stays outside the parity set for the reason the file already gives (`:145-149`: soft-delete is a SQL-only term the predicate does not model) — the same exclusion note now needs one added sentence saying *why* review-state and verification-status ARE inside it.

**The mutation discipline the file already documents (`:44-72`) applies:** the plan must record two mutations — SQL-side permissive, TS-side permissive — and their observed reds, or the parity assertion is untested.

### F5c — `tests/listing/bookability.test.ts`: do NOT expand to 480 rows

The current truth table is 16 rows over four dimensions. Six dimensions with 5 and 6 enum values is 2 × 2 × 2 × 2 × 5 × 6 = **480** — unreadable and unmaintainable.

The idiomatic growth, given the file's own "every row is diagnostic" argument (`:87-92`):

- **Keep the 16 rows unchanged in meaning** by pinning both new terms at a passing value. Say so in a comment: these 16 rows measure the original four terms and nothing else.
- **Add a 5-row listing-review table** (every `listing_review_state` value × everything-else-passing) → exactly 2 true.
- **Add a 6-row host-verification table** (every `host_verification_status` value × everything-else-passing) → exactly 2 true.
- **Add two auto-revert cases**, mirroring the shipped D-14 and hours cases at `:150-168`: `verificationStatus: 'approved' → 'suspended'` flips true→false with nothing else changed (**the ENF-01 pure-predicate anchor**), and `reviewState: 'approved' → 'pending'` does the same (**the LVER-03 material-edit anchor**).
- **Restate the "exactly one true row" invariant per table** — the existing one (`:130-140`) is the file's own anti-vacuity device.

**16 + 5 + 6 + 2 = 29 assertions**, each of which names a single input. That is the shape.

---

## F6 — LVER-02: `isPubliclyViewable` takes a third argument — and there is a **third leak surface** nobody has named

**The two known sites** both go through one expression, deliberately (`src/lib/listing/public-listing.ts:70-76`):

```ts
export function isPubliclyViewable(status, deletedAt): boolean
```

It is positional, so **adding a required third parameter is itself a compile-forced census** — the same mechanism as `deriveBookable`. Two call sites: `assertPublicListing` (the layout, which wins the status line) and `(detail)/page.tsx:265` (the body). This is the correct shape for D-229 and needs no new error surface.

### ⚠ The third surface: `src/app/listings/[id]/opengraph-image.tsx`

`listingCardFacts` (`src/lib/listing/og-facts.ts:70-86`) runs its **own** published check:

```ts
if (!row || row.status !== "published") return null;
```

It does **not** call `isPubliclyViewable`, so adding a term there does not reach it. Left alone, a `pending` listing's `/listings/[id]/opengraph-image` route would **render a real card with the listing's title, space type, city and rate** for anyone who requests it — while the page itself 404s. That is a public read of an unreviewed listing's contents, on a route explicitly designed to be fetched by scrapers.

`og-facts.ts`'s own comment even notes the sets are meant to agree: *"the same set the page 404s on"* (`opengraph-image.tsx:123-124`). After this phase they no longer would.

**Recommendation:** route `listingCardFacts`'s guard through `isPubliclyViewable` as part of the same change, so there is one expression and three call sites instead of two-plus-a-copy. `tests/design/og-routes.test.ts` exists and is the place to pin it.

**And note what LVER-02 does NOT need:** D-228 is right — search needs no separate work. But *asserting* it (D-228's "assert it, do not re-implement it") is exactly the `gate_lr_pending` fixture in **F5b**. That fixture is the whole of D-228's verification.

### The D-230 fork the planner must decide

`assertPublicListing` is **session-free** — it takes no `headers()`, reads no session, and is `cache()`d. That is load-bearing: `src/app/not-found.tsx:29-45` records that making a not-found-adjacent path session-aware cost **every static route in the build** its prerender.

So **do not make the public listing page owner-aware.** D-230 ("the host sees its own listing and its own review status") is satisfied on the **host surfaces** — `(host)/host/listings/page.tsx` (which already reads `listing.reviewState` for free) and `(host)/host/listings/[id]/edit/` — not by adding a session read to a layout that currently has none. Record this as the reading of D-230; it is the cheaper and the safer one.

---

## F7 — LVER-03 material-edit detection: **photos cannot be detected in `saveListingStep`**

D-231 names five material fields: address, space type, capacity, **photos**, price. Four of the five are straightforward — `draftSchema` (`src/lib/validation/listing.ts:108-149`) carries them and `saveListingStep` already has both the incoming `d` and the persisted `owned` in scope, which is exactly the "effective value (incoming ?? persisted ?? default)" idiom the file uses twice already (`listing.ts:134-192`).

| Material field (D-231) | Column(s) | Present in `draftSchema` / `saveListingStep`? |
|---|---|---|
| address | `addressLine1/2, city, region, postalCode, country, neighborhood`, `location` (lat/lng) | ✅ yes |
| space type | `primarySpaceType` | ✅ yes |
| capacity | `maxOccupancy` (and `unitCount`, which has **no form field** — persisted value is the only source, `listing.ts:294`) | ✅ partly — `unitCount` is not in `draftSchema` |
| price | `hourlyRateCents, dayRateCents, perHeadPriceCents`, arguably `extraHeadFee`/`included` | ✅ yes |
| **photos** | `listing_photo` rows | ❌ **NO** |

**`draftSchema` has no `photos` field, and `saveListingStep` never touches `listing_photo`.** Photos are mutated by three separate server actions in a different file: `persistPhoto` (`listing-photo.ts:127`), `reorderPhotos` (`:349`), `removePhoto` (`:429`).

**This is a real gap in D-231 as written, not a detail.** A host can swap every photo on an approved listing — the single highest-signal fake-listing edit there is — and `saveListingStep` will never run. Three options for the planner, in order of preference:

1. **Trip re-review from `listing-photo.ts` too**, via one shared helper (e.g. `markForReReview(listingId)`) called from `saveListingStep` **and** from `persistPhoto` / `removePhoto`. Note the asymmetry: **`reorderPhotos` is arguably not material** — reordering does not change what the space is — and excluding it is a defensible, statable choice rather than an omission.
2. Detect photo-set changes by comparing a photo-count/id-set snapshot at review time. More machinery, same outcome, worse locality.
3. Declare photos out of D-231's five and record it as deferred. **This contradicts D-231's explicit list and should not be chosen silently.**

Whichever is chosen, the plan must say so out loud, because D-231's own text says detection happens "in `saveListingStep`" and that sentence is not achievable for one of its own five fields.

**Two more notes on D-232:**

- The flip is `approved` OR `grandfathered` → `pending`. It must **not** touch `rejected` (already out) or `withdrawn`, and must not touch `draft` listings' `pending` state (already pending). A guarded `UPDATE … WHERE review_state IN ('approved','grandfathered')` makes that a 0-row no-op in every other case — the same "the guard is in the WHERE" discipline as `cancel-booking.ts:1157-1179`.
- The flip must be inside `saveListingStep`'s **existing transaction** (`listing.ts:257-283`), not after it. A listing whose address changed but whose `review_state` did not is a sellable fake.

---

## F8 — OPS-05: telling the host requires a notification kind that does not exist

`notificationType` (`src/lib/db/schema.ts:476-497`) has 13 values. **None of them is an ops decision.** And `NotificationPayload` is a discriminated union keyed on the same discriminant, with the schema's own header stating the property:

> *"the NotificationPayload union below is keyed on this same discriminant, so adding a value here without handling it in the dropdown renderer is a COMPILE error, not a blank row."* (`schema.ts:471-474`)

So adding e.g. `listing_review_rejected` / `host_verification_rejected` is:
- an **`ALTER TYPE notification_type ADD VALUE`** on an existing, committed enum → **Probe B applies** → its own standalone migration file, first use at runtime only (**F3**), exactly as `drizzle/0018` did for the three group kinds;
- **plus** a payload variant, **plus** a renderer branch (compile-forced), **plus** an email template.

**The cheaper path worth costing:** OPS-05 says *"a reason the host is actually told"* and D-230 says the host reads it on their own surface. If the rejection reason is surfaced on `/host/listings` and the edit page (which the host already visits), the notification is a **nice-to-have**, not the requirement. `src/lib/host/requests-signal.ts` is the shipped precedent for a host-surface signal that *"names the state, the reason AND the way out"* (`:56`) with no notification at all.

**Recommendation:** satisfy OPS-05 on the host surface first (zero enum change, zero migration risk), and treat the notification as an additive follow-on inside the phase if wave budget allows. If it is added, it must be its own ALTER-TYPE-only migration.

---

## F9 — Blast radius: the two costs nobody has counted

### F9a — The fixture census: **19 files hand-build a bookable host**

The sixth gate term fails closed for a host with no `host_verification` row (**F5a**). Every test that today produces a bookable listing by inserting `user` + `hostPayout` will produce a **non-bookable** one the moment the term lands.

Measured by grep:

- **72 files** insert `listing` rows (`tests/`, `e2e/`, `scripts/`).
- **19 files** insert `host_payout` — the current proxy for "this fixture is meant to be sellable":

```
tests/helpers/seed.ts                          tests/availability/open-capacity-blocks.test.ts
tests/availability/open-capacity-hours-rekey.test.ts   tests/booking/notify-emission.test.ts
tests/booking/open-capacity-cancel.test.ts     tests/booking/open-capacity-hold.test.ts
tests/booking/open-capacity-replay.test.ts     tests/booking/request-lifecycle.test.ts
tests/booking/service-fee-hold.test.ts         tests/booking/state-machine.test.ts
tests/listing/open-capacity-edit-gate.test.ts  tests/payments/host-cancel.test.ts
tests/payments/ledger-freeze.test.ts           tests/payments/payout-sweep.test.ts
tests/paymongo/webhook-merchant-activated.test.ts      tests/search/availability-filter.test.ts
tests/search/bookable-gate.test.ts             tests/search/open-capacity-search.test.ts
src/app/actions/paymongo-connect.ts            (production, not a fixture)
```

Plus the non-Vitest seeds: `scripts/seed.ts`, `scripts/seed-baseline-fixtures.ts`, `e2e/helpers/booker-seed.ts`, and **12 e2e specs** with inline seeds.

`tests/helpers/seed.ts` is imported by only **4** test files, so it does not absorb the work — **this is a ~19-file mechanical sweep in the Vitest suite plus ~14 seed sites outside it.** It is the same shape as the 260810-sti hours change, which is precisely why several of the files above already carry comments like *"deriveBookable needs a VERIFIED host with ACTIVATED payouts, or every case below would refuse"* (`open-capacity-hold.test.ts:311`). Those comments are the map: **wherever that sentence appears, a `host_verification` row must now appear too.**

**Two things the plan should do about it:**
- Budget it as its own task in the gate plan, executed in the same commit as the gate change. A red suite spanning 19 files, discovered a wave later, is indistinguishable from a real regression.
- Consider a `makeVerifiedHost()` helper in `tests/helpers/seed.ts` so the 19 sites converge on one expression — but **do not** put it in the `src/` gate path (D-227's no-shared-helper rule is about the *security* code, not test fixtures).

### F9b — The design-gate tax: ~4 non-obvious edits per new `/ops` page

`npm run build` = `npm run lint && npm run test:design && next build`. Every `/ops` surface pays:

| Gate | Constraint | What a new `/ops` page costs |
|------|------------|------------------------------|
| `tests/design/loading-coverage.test.ts:256-258` | `EXPECTED_PAGES = 33`, `EXPECTED_QUALIFYING = 21`, `EXPECTED_NON_QUALIFYING = 12`; every async page needs a `loading.tsx` composing one of three approved skeleton patterns; **dead ones fail too** | A `loading.tsx` **per page** + all three constants moved, **in the same commit as the route** (the file's own D-88.3 note at `:81`) |
| `tests/design/card-pattern-coverage.test.ts:572` | `EXPECTED_SURFACES = 21`; every file outside `patterns/` that renders a raw `<Card>` must be in `ALLOWED_RAW_CARD` **with a >40-character reason** | Either adopt `ResultCard`/`RowCard`/`PanelCard`, or write the sentence. The ops queue is a triage inbox — `RowCard` is the shipped analog (`host/request-row.tsx`) |
| `eslint.config.mjs:161-164` + `tests/design/leak.test.ts` | No raw design values under `src/app/**` / `src/components/**`; the scope is **imported**, not retyped, so ESLint and Vitest cannot disagree | Ops UI uses tokens only — no `#hex`, no arbitrary px |
| `tests/design/one-tree.test.ts:180` | No viewport-conditional JSX under `src/app/**` / `src/components/**` | One tree, responsive by CSS |
| `tests/design/error-boundaries.test.ts` | Pinned boundary inventory | Only if the phase adds an `error.tsx` |
| `tests/design/empty-state-adoption.test.ts:336-345` | `EXPECTED_DECLARED_FILES = 5`, `EXPECTED_DECLARED_SITES = 10`, `EXPECTED_DASHED_TOTAL = 11` | An empty queue state must use `EmptyState`, and the constants move |

**Implication for OPS-04:** "one queue, one screen" is not only the right product call — it is also **by far the cheapest**. Every additional `/ops` route multiplies the table above. A one-page console with in-place expansion costs one `loading.tsx` and one pass over the pinned constants.

---

## F10 — HVER-05: the badge, its two surfaces, and the column search does not select

**Surface 1 — the listing detail page.** `publicProfile()` has exactly **one** call site (`(detail)/page.tsx:306`), and `HostBlockProps` is a `Pick` of `PublicProfile` (`host-block.tsx:4`). Two options:

- **(a) Add `verificationStatus` to `PublicProfile`.** It is a genuinely public fact and the allow-list is the shipped mechanism for public fields. Cost: one call site, one `Pick`, one type. But it also means the *value* travels wherever `publicProfile` goes.
- **(b) Pass a separate `verified: boolean` prop** already reduced to `status === 'approved'` in the RSC.

**Recommend (b)**, for the reason `listing-card.tsx:11` gives about `bookable`: *"derived upstream … and passed in — the card never re-derives it."* Reducing to a boolean in the RSC means **D-212 is enforced at one place** and a client component literally cannot render the badge for a `grandfathered` host, because it never receives the distinction. That is D-212 made structural rather than conditional.

**Surface 2 — the search result card.** This one has a real cost that is easy to miss: `src/lib/search/query.ts`'s Stage-1 `SELECT` list (`:195-202`) and its `RawRow` type (`:73-85`) **do not carry any host column at all**. Adding the badge to the search grid requires:
- `hv.status AS host_verification_status` in the `SELECT` (the `LEFT JOIN` for the gate is already there),
- a field on `RawRow`,
- a reduced boolean in `toRow` (`:87-113`) — **reduced in `toRow`, not in the card**, matching the `allInRateParts` precedent at `:104-108` where the composition happens server-side "so the browse rate and the checkout breakdown are guaranteed to use the same" source,
- a prop on `SearchResultCard`.

⚠ **Note the subtlety that makes this non-obvious:** after the gate lands, *every* search result is `approved` **or** `grandfathered`. So the column is selected **purely to tell those two apart for D-212** — it can never change whether a row appears. Write that at the site, or a later reader will delete it as redundant.

**Copy (D-237).** The badge must describe the **manual** check that actually ships. It must not say "verified by a third party", must not imply the space was inspected, and must not be phrased as a quality signal. `tests/design/trust-signals.test.ts` is the shipped precedent for a **closed set of booker-facing trust signals enforced by gate** — its header records that D-68 closed the set at four and that *"a fifth signal of that shape could therefore only be INVENTED — a sentence with no row behind it, on the one surface where a booker is deciding whether their money is safe."* HVER-05 adds a **fifth** signal, and unlike the forbidden one it **does** have a row behind it (`host_verification.status`). The plan must extend that gate deliberately — with the same "maps to a column that exists" justification the existing four carry — rather than trip it accidentally.

---

## F11 — ENF-02: where the freeze goes, and why a pre-claim freeze makes the second sentence true by construction

**ENF-02 has two clauses.** *"A suspended host's pending payouts freeze, and no payout leaves for a host under suspension"* — and — *"A frozen row does not read as a stuck row to the reconciler and does not page an operator."*

### The freeze belongs in `queryDuePayouts`, **before** the claim

`payout-sweep.ts:99-135` selects due bookings; `payOne` then **claims** by `INSERT … ON CONFLICT (booking_id, kind)` — *"the INSERT is the lock"* (`:10-14`). The freeze goes in the query:

```sql
JOIN listing l ON l.id = b.listing_id
LEFT JOIN host_verification hv ON hv.user_id = l.host_id
...
AND COALESCE(hv.status::text, 'unverified') <> 'suspended'
```

**The consequence is what makes ENF-02's second clause structural:** a suspended host's due booking is never selected → `payOne` never runs → **no ledger row is ever created** → `alertStuckHeld` (`payout-reconcile.ts:131-149`) reads `host_payout_ledger` and finds nothing to alert on. A row that does not exist cannot read as stuck.

⚠ **The trap this avoids:** the naive alternative — claim the row, then refuse to transfer, leaving it `held` — **manufactures exactly the false stuck-`held` alerts ENF-02 forbids**, one per suspended booking, forever. `alertStuckHeld`'s own comment names this failure mode for the analogous `host_cancel_fee` case: *"it would fire a FALSE `[payout-alert]` on every host cancellation, and operators who learn to ignore the channel will miss a real transfer failure."* Do not build the thing that comment warns about.

### The mirror in `alertStuckHeld` is still required — for a *narrower* row

With a pre-claim freeze, the only `held` rows a suspended host can own are ones that were **already** `held` when the suspension landed — i.e. the CR-01 crash window between claim and release, which `payout-reconcile.ts:127-131` describes as *"a hard crash between claim and release."* Such a row will age past `PAYOUT_RECONCILE_STUCK_HOURS` (48h default) and page an operator about a payout that is deliberately frozen.

So D-234's mirror is defence for a real but narrow case. `18-PATTERNS.md` § No Analog Found is right that this needs genuinely new SQL: `alertStuckHeld` reads `host_payout_ledger` **with no host join at all** (`:132-142`), unlike `queryDuePayouts` which already joins `listing` → `host_payout`. The mirror adds `LEFT JOIN host_verification hv ON hv.user_id = host_payout_ledger.host_id` (the ledger carries `host_id` directly — `schema.ts:437-439` — so no `listing` hop is needed) and the same `<> 'suspended'` exclusion.

### Three boundaries the plan must state rather than discover

1. **`state = 'processing'` is NOT frozen and must not be.** `reconcileOne` polls transfers that have **already fired**; the money left the platform wallet. A stuck `processing` row on a suspended host is still a real stranded transfer and must still page. Put the freeze on the `held` predicate only.
2. **`kind = 'host_cancel_fee'` is untouched.** Every query in both files already carries `AND kind = 'payout'` (`payout-sweep.ts:22-29`, `payout-reconcile.ts:21-24`). The new predicate must be added *inside* that scoping, never in place of it.
3. **Un-suspension must un-freeze automatically, with zero writes.** Because the freeze is a `WHERE` clause over live state and no row was ever created, flipping `hv.status` off `suspended` makes the next hourly sweep pick the booking up — **exactly** the D-14 auto-revert property `bookability.ts:6-9` describes for `payoutsEnabled`. This is a feature; assert it (a test that suspends, sweeps → 0 due, un-suspends, sweeps → 1 due).

### One honest gap to record

A suspended host's `/host/earnings` page (`(host)/host/earnings/page.tsx:65-99`) reads `host_payout_ledger` scoped to `kind='payout'`. With a pre-claim freeze there is **no row at all**, so the host sees a due session that simply never produces a payout row, with **no explanation anywhere**. That is silent, and `src/lib/host/requests-signal.ts:56` states the project's own rule: *"a signal names the state, the reason AND the way out."* Whether a suspended host is told is a **product decision** — flag it for the PM alongside D-236 rather than deciding it in a plan.

---

## F12 — ENF-03: five forks in `cancelBookingAsHost` that an ops actor cannot ride unchanged

D-235 says ops cancel-and-refund "reuses the host-cancel machinery." That machinery is `cancelBookingAsHost` (`cancel-booking.ts:1097-1389`). **Five of its parts are host-specific**, and two of them will silently do the wrong thing rather than fail.

| # | Site | What it does for a host | What it must do for ops | Fails loudly? |
|---|------|-------------------------|-------------------------|---------------|
| 1 | `loadHostOwnedBooking(bookingId, userId)` (`:289-293`, called `:1112`) | returns null unless `row.hostId === userId` **and** `row.hostCanHost` | An ops actor is **not** the host — this returns `null` and the action returns `DENIED` | ✅ yes — refuses immediately |
| 2 | `AND EXISTS (SELECT 1 FROM listing l WHERE l.id = booking.listing_id AND l.host_id = ${userId})` in the flip's `WHERE` (`:1174-1176`) | in-`WHERE` defence in depth | With an ops `userId` this matches **zero rows** → 0-row flip → the calm `explainNoRows` path | ✅ yes — but as a **misleading** "not active" explanation |
| 3 | `AND starts_at > now()` (`:1178`) | a host may not cancel a session already begun | An ops cancel of a **confirmed-fake** listing may well need to reach a session in progress | ❌ **NO — silently refuses**, reported as `past_start` |
| 4 | `SET cancelled_by = 'host'` (`:1163`) | records the actor class | `cancelled_by` is a `pgEnum` with **`booker \| host \| system`** — **there is no `'ops'`** (`schema.ts:698`) | ❌ **NO — writing `'host'` silently blames the host** |
| 5 | `emitNotify({ type: "booking_cancelled_by_host", … })` ×2 (`:1345`, `:1364`) | tells the booker "your host cancelled" and the host "you cancelled, here is your fee" | Both sentences are **false** for an ops-forced cancellation; the host copy also states a fee that D-235 suppresses | ❌ **NO — sends wrong copy to both parties** |

**On #4 specifically:** the display layer will not catch it. `deriveDisplayStatus` / `deriveBookingStatusView` take `cancelledBy?: string \| null` — a **`string`**, not the narrow union (`booking-status.ts:72`, `booking-status-badge.tsx:83`) — and only special-case `'booker'`. Adding `'ops'` would therefore compile everywhere and render as a plain "Cancelled", which is *acceptable* — but it also means the enum widening is **not** compiler-protected, so nothing forces a reviewer to look. Two options:

- **(a) Write `cancelled_by = 'system'`** (an existing value) and carry the ops actor in the `audit` row (D-218 requires that row anyway). **No migration, no 55P04 risk, no enum widening.** Cost: an ops cancellation is indistinguishable from a lapse in `cancelled_by`. But `(app)/bookings/[id]/page.tsx:995` uses `cancelledBy === null && paymentId === null` as its "system retired" shape, and an ops cancel has a `payment_id`, so it will **not** be mistaken for a lapsed hold.
- **(b) Add `'ops'`** — an `ALTER TYPE cancelled_by ADD VALUE 'ops'` in its **own migration file that does nothing else**, first use at runtime only (**F3**, Probe B), plus a manual audit of the four `cancelledBy` display forks since `tsc` will not flag them.

**Recommend (a)** unless the console needs to filter on it. It is strictly less migration risk for the same audit fidelity, and D-218 already puts the authenticated actor somewhere better.

### The D-236 constant

`refundCents` today is `row.quotedTotalCents ?? 0` (`:1137`) — the **all-in** charge (space + the D-74 service fee), per the frozen split at `:233-236` where `spacePriceCents` is documented as *"the ONLY refundable basis; the service fee never is."*

So the constant reduces to a one-line fork at one site:

```ts
const refundCents = OPS_CANCEL_REFUNDS_SERVICE_FEE
  ? (row.quotedTotalCents ?? 0)          // the host-cancel precedent (cancel-booking.ts:1137)
  : (row.spacePriceCents ?? row.quotedTotalCents ?? 0);   // D-209 as the PM answered it
```

**Where the constant lives:** `src/lib/payments/fees.ts`. It is the shipped home for money-policy constants, it carries `import "server-only"` (so it can never reach a client bundle), and its header states the contract this constant needs: *"MECHANISM DEFAULTS the exported NAME is imported for, never a hardcoded literal at a call site."* Note the deliberate difference from its three neighbours: **do NOT make it `process.env`-tunable.** D-236 requires that flipping it be a **one-line code change** with the conflict documented at the call site — an env var would let it flip silently in a deployment, which is the opposite of what a documented, PM-owned fork needs.

**The conflict comment goes at the call site in `cancel-booking.ts`**, quoting `:1134-1136`'s own sentence verbatim, per D-236.

### The other three consequences (D-235)

| Host-cancel consequence | Ops behaviour |
|---|---|
| 1. 100% refund incl. fee | **Forked** by the constant above |
| 2. `audit` row against the host | **Kept, re-actored** — `actorId` = the authenticated staff id (D-218), `action` = a distinct ops verb, and the meta should carry the host id so the row is still findable by host |
| 3. auto-block the freed window (`:1250-1259`) | **Question for the plan.** The block exists to stop a host cancelling and reselling. On a listing FitOut is pulling, the listing is unsellable anyway (the gate), so the block is redundant — but harmless and it preserves the shape. The Phase-9 `openCapacity` fork at `:1250` applies unchanged either way. Recommend **keeping** it: it costs nothing and removing a consequence is a decision, not a simplification. |
| 4. the `host_cancel_fee` signed debit (`:1274-1300`) | **SUPPRESSED** (D-235). Delete the block, do not pass a zero fee — `feeCents = 0` would still cause `feeLabel` logic and a `₱0` claim, which `:1362` explicitly calls *"CR-01's disease in a new place."* |
| — retained amount | `retained_space_cents = 0` stays, and it is what makes the sweep predicate (`payout-sweep.ts:118-120`, `status='cancelled' AND COALESCE(retained_space_cents,0) > 0`) **exclude** the booking. This is how "the host is paid nothing" is enforced — by an existing predicate, with no new code. Assert it. |

---

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---------|-------------|-------------|-----|
| Staff role storage & session read | An `ops_staff` table, a custom cookie, or the Better Auth admin plugin | The existing `user.role` (`input:false`) + `auth.api.getSession()` | **F1** — everything needed is already there; the plugin adds 4 columns and 15 routes (**F1b**) |
| Granting staff | A signup flag, an env allow-list of emails, an admin UI | A Drizzle `UPDATE` in `scripts/ops-grant.ts` | D-217. `input:false` means `auth.api.updateUser` **cannot** write it anyway (`src/lib/auth.ts:126-131`) |
| "Is this listing sellable?" anywhere new | A second `isApproved()` check at a call site | A new **required term** on `deriveBookable` | The whole point of `bookability.ts` (`:1-6`) — "so 'published' can never be mistaken for 'sellable'" |
| Hiding a pending listing from search | A post-query filter, a client-side filter | The inlined SQL twin | D-228. The gate never lets the row leave Postgres |
| The public-page 404 | A new error surface, a redirect, `forbidden()` | `isPubliclyViewable` + `assertPublicListing` | D-229 + **F6**. Two call sites of one expression, already proven under a production build |
| The 404 status line for `/ops` | `middleware`, `generateMetadata`, deleting `loading.tsx` | A layout-level assert (**F2b**) | `public-listing.ts:9-24` measured all three alternatives and recorded that each fails |
| At-most-once anything (verification row, review row, audit) | A read-then-write "does it exist?" check | `INSERT … ON CONFLICT DO NOTHING/UPDATE … WHERE` | *"the INSERT is the lock"* (`payout-sweep.ts:10-14`). A read-then-write is *"precisely the race the composite UNIQUE exists to kill"* (`cancel-booking.ts:1279-1282`) |
| The payout freeze | An `if (suspended) return` inside `payOne`, or a new `frozen` ledger state | A `WHERE` clause in `queryDuePayouts` | **F11** — a post-claim refusal manufactures the false alerts ENF-02 forbids; a new ledger state is an `ALTER TYPE` on a committed enum plus every existing predicate |
| Idempotent grandfathering | A "have we run this?" flag table | `UPDATE … WHERE status='published'` + `INSERT … ON CONFLICT DO NOTHING` | D-240 requires re-runnability; both statements are naturally idempotent |
| Rate-limiting ops actions | A new limiter | `rateLimit(\`ops-<verb>:${staffId}\`, { window: 60, max: N })` | `src/lib/rate-limit.ts`; keyed on the **authenticated identity**, never IP (`:14-15`) |
| Ops action result shape | Throwing, or a new error union | The shipped `{ ok: false, reason, error }` calm-denial shape | `booking.ts` / `cancel-booking.ts` — a thrown error on a money path becomes a 500 for an action that may have succeeded |

**Key insight:** almost every mechanism this phase needs already exists in this repo *and carries a written argument for why it is shaped the way it is*. The failure mode here is not inventing a bad mechanism — it is **not noticing** that the mechanism exists and building a parallel one beside it. `18-PATTERNS.md` is the index; use it.

---

## Common Pitfalls

### Pitfall 1 — Treating the `tsc` census as complete
**What goes wrong:** four call sites turn red, the developer fixes four call sites, and sites 5/6/7 (the SQL twin and the two re-statements) ship stale. Search keeps returning pending listings; `placeHold` keeps minting holds on unapproved ones.
**Why:** the compiler genuinely cannot see them — that is *why* they carry test anchors.
**Avoid:** treat "seven sites" as the checklist. Site 5 is proved by the extended parity fixtures (**F5b**); sites 6 and 7 each need a **new refusal anchor** in the spirit of `L_nohours` / `L_OPEN_NOHOURS` (D-227).
**Warning signs:** the gate change touches `src/` but not `tests/search/bookable-gate.test.ts`, or adds only one new anchor rather than two.

### Pitfall 2 — A parity assertion that passes vacuously
**What goes wrong:** the fixtures gain the two fields but every fixture gets a passing value, so the SQL and the predicate agree on a question neither is being asked.
**Why:** this file has already been caught doing exactly that, and says so: *"Against byte-unchanged `src/` it passes VACUOUSLY — both sides ignored the hours field, so both sides agreed on the wrong answer"* (`bookable-gate.test.ts:24-27`).
**Avoid:** every one of the 5 + 6 enum values appears in exactly one fixture, and the expected set has **three** members, not one (**F5b**).
**Warning signs:** the expected set is still a singleton; no `grandfathered` fixture passes.

### Pitfall 3 — 55P04 in a migration that every test passes
**What goes wrong:** an `ALTER TYPE … ADD VALUE` plus a use of that value ships, passes the whole suite and a fresh-DB migrate, then fails on production's committed enum.
**Why:** **F3**, Probes B and C — the test harness runs each statement in its own transaction and a fresh DB creates the type in the same transaction.
**Avoid:** if this phase touches `cancelled_by` or `notification_type`, that `ALTER TYPE` gets its **own file that does nothing else**, plus the `drizzle/0021`-style grep tripwire.
**Warning signs:** a single-quoted new enum literal appears in any migration file at or after the one that adds it.

### Pitfall 4 — The layout guard doing the security job (or the page guard doing the status job)
**What goes wrong:** either (a) only the layout guards → Next's own docs say the segment still renders and Server Actions are still reachable; or (b) only the page guards → non-staff gets HTTP 200 wrapped in ops chrome, and D-219 fails on the status line.
**Why:** they are two different jobs (**F2b**).
**Avoid:** all three layers, each with its job stated at its own site, and the layout's header carrying `src/middleware.ts:1`'s exact "NOT the security boundary" language.
**Warning signs:** an `(ops)` `not-found.tsx` exists; `requireStaff` appears in the layout only; any page lacks its own call.

### Pitfall 5 — Sending the host-cancel notification for an ops cancellation
**What goes wrong:** the booker is told "your host cancelled" when FitOut pulled a fraudulent listing, and the host is told they owe a fee that D-235 suppressed.
**Why:** `emitNotify` is called unconditionally at `cancel-booking.ts:1345` and `:1364`, and no type system catches wrong prose (**F12**).
**Avoid:** decide the ops copy explicitly. If a new notification kind is added, it is an ALTER-TYPE-only migration plus a compile-forced payload variant (**F8**).
**Warning signs:** the ops-cancel path reaches `emitNotify` with `type: "booking_cancelled_by_host"`.

### Pitfall 6 — A "frozen" ledger row that pages an operator
**What goes wrong:** the freeze is implemented after the claim; every suspended booking leaves a `held` row that ages past 48h and fires `[payout-alert] payout stuck held`. Operators learn to ignore the channel.
**Why:** `alertStuckHeld` cannot distinguish deliberate from crashed (**F11**).
**Avoid:** freeze **before** the claim, in `queryDuePayouts`. Add the `alertStuckHeld` mirror for the crash-window row.
**Warning signs:** a `frozen` ledger state is proposed; the sweep claims and then refuses.

### Pitfall 7 — Forgetting that seeds are not tests
**What goes wrong:** the Vitest suite is repaired but `scripts/seed.ts`, `scripts/seed-baseline-fixtures.ts` and the e2e seeds are not — local UAT and every Playwright spec see an empty catalogue with no error.
**Why:** the seeds are outside the suite; `tests/setup.ts:44-46` notes explicitly that `tsx scripts/*` and every Playwright spec still hit **dev**, not the test DB.
**Avoid:** treat the 14 non-Vitest seed sites in **F9a** as part of the same task.
**Warning signs:** `npm run db:seed` runs clean but `/` shows no listings.

### Pitfall 8 — Running suites concurrently and misreading the result
**What goes wrong:** a red suite is attributed to the gate change when it was database truncation.
**Why:** `tests/global-setup.ts:83-90` TRUNCATEs the shared test database at the start of each run; `npm test`, `npm run test:design` and `npm run build` will truncate each other's data.
**Avoid:** one suite at a time; re-run a red suite **alone** before believing it. `tests/design/*` needs `--config vitest.design.config.ts` — the bare form's "no test files" exit 1 is indistinguishable from a real failure.

### Pitfall 9 — Believing a Playwright assertion is a gate
**What goes wrong:** OPS-02's status-line proof is written as an e2e spec and treated as enforced.
**Why:** D-24 — only `price-parity.spec.ts` and `--project=visual` run in CI. The other 34 specs run when a human remembers.
**Avoid:** pair every e2e assertion with a **structural** design test, exactly as `tests/design/soft-404-status.test.ts` pairs with `e2e/public-listing.spec.ts:385`. Record the status-line reading as a **one-time production-build audit transcript**, the 17.1-01 § P1 shape.

### Pitfall 10 — Fabricating a check that never happened
**What goes wrong:** grandfathered rows are written with `checked_at = now()`, `provider = 'manual'`, or `decided_by_staff_id = <someone>`, making them indistinguishable from real approvals.
**Why:** it is convenient and it silently violates D-211 **and** D-212 (the badge then renders for rows nobody checked).
**Avoid:** `checked_at` NULL, `provider = 'migration'`, `decided_by_staff_id` NULL. `drizzle/0025`'s header states the principle for `resolved_by`: *"inventing a discharger for a past act would be fabricating an audit record."*
**Warning signs:** the badge appears on a listing that existed before the migration.

---

## Code Examples

All patterns below are extracted from **this repository**; paths are given so the plan can quote rather than paraphrase.

### The guard pair (F2b) — one expression, two jobs

```ts
// src/lib/ops/staff.ts  — SHAPE, modelled on src/lib/listing/public-listing.ts:70-104
import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/** The ONE expression. Both the layout that sets the STATUS and every page/action that makes the
 *  DECISION go through here, so the rule cannot drift between them.
 *  ⚠ DEPENDS ON `session.cookieCache` STAYING OFF (src/lib/auth.ts has none). Enabling it would make
 *  a revoked staff grant keep working for the cache TTL. */
export const readStaff = cache(async (): Promise<{ id: string } | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  const u = session?.user as (typeof session extends null ? never : { id: string; role?: string | null }) | undefined;
  return u && u.role === "staff" ? { id: u.id } : null;   // string equality; never `!== "user"`
});

/** LAYER 2/3 — THE SECURITY BOUNDARY (D-216). Called by EVERY (ops) page and EVERY ops action. */
export async function requireStaff(): Promise<{ id: string }> {
  const staff = await readStaff();
  if (!staff) notFound();     // 404, never 403 — D-219: do not confirm the route to a prober
  return staff;
}

/** LAYER 1 — NOT THE SECURITY BOUNDARY. It exists ONLY to win the 404 STATUS LINE, because every
 *  (ops) page carries a loading.tsx (build-blocking gate) whose Suspense boundary would otherwise
 *  commit a 200 before the page's own guard runs. Same mechanism, same fix, as
 *  src/lib/listing/public-listing.ts. Never rely on this alone — Next's own docs: a layout
 *  "does not control whether the rest of the route renders." */
export const assertStaff = cache(async (): Promise<void> => {
  if (!(await readStaff())) notFound();
});
```

### The privileged grant — Drizzle, never `auth.api.updateUser`

```ts
// The shipped precedent, verbatim: src/app/actions/capability.ts:74-78
// Privileged flip (input:false guard means this can never come from the client). canBook untouched.
await db.update(user).set({ canHost: true }).where(eq(user.id, userId));
await recordAudit({ actorId: userId, action: "activateHosting", outcome: "ok" });
```

`scripts/ops-grant.ts` clones the **standalone-connection** half from `scripts/ops-alerts.ts:8-17`: its own `postgres(url, { max: 1 })` with an explicit `end()`, and it must **not** import `@/lib/db` (the app singleton opens a connection nothing in a short-lived script closes, and the process hangs after printing).

### The D-240 migration (one file, one transaction — proven safe by Probe A)

```sql
-- drizzle/00NN_host_verification_listing_review.sql
-- Purely additive tables + two NEW enums, so the labels are usable in this same transaction
-- (PROBED on PostgreSQL 18.4: CREATE TYPE + immediate use in one transaction is OK; the 55P04
-- restriction applies only to ALTER TYPE ... ADD VALUE on an ALREADY-COMMITTED type).
-- Backfill shape follows drizzle/0014 (DEFAULT + scoped idempotent UPDATE), NOT drizzle/0017
-- (DEFAULT-only), because D-240 grandfathers what is already SELLING and nothing else.
CREATE TYPE "listing_review_state" AS ENUM ('pending','approved','rejected','grandfathered','withdrawn');
--> statement-breakpoint
CREATE TYPE "host_verification_status" AS ENUM ('unverified','pending','approved','rejected','grandfathered','suspended');
--> statement-breakpoint
ALTER TABLE "listing" ADD COLUMN "review_state" "listing_review_state" DEFAULT 'pending' NOT NULL;
--> statement-breakpoint
-- … CREATE TABLE host_verification / listing_review …
--> statement-breakpoint
-- D-207/D-240 GRANDFATHER. Idempotent and re-runnable: the WHERE excludes every row that is not
-- currently a live listing, and re-running can never move an 'approved' or 'rejected' row because
-- such a row is only reachable AFTER a human decision, which this predicate does not select for.
UPDATE "listing" SET "review_state" = 'grandfathered'
WHERE "status" = 'published' AND "deleted_at" IS NULL AND "review_state" = 'pending';
--> statement-breakpoint
-- A host is grandfathered iff they own at least one row the UPDATE above touched (D-240).
-- checked_at stays NULL and provider says 'migration': nothing was checked, and writing a
-- timestamp would fabricate an audit record (cf. drizzle/0025's resolved_by note).
INSERT INTO "host_verification" ("user_id","status","provider","checked_at","created_at","updated_at")
SELECT DISTINCT l."host_id", 'grandfathered', 'migration', NULL, now(), now()
FROM "listing" l
WHERE l."status" = 'published' AND l."deleted_at" IS NULL
ON CONFLICT ("user_id") DO NOTHING;
```

> Unqualified table names throughout, so `tests/helpers/db.ts` replays it into every isolated schema — the rule `drizzle/0021:6-8` states.

### The SQL twin (site 5) — both terms, `COALESCE` on the nullable side

```sql
-- src/lib/search/query.ts Stage-1. Inlined deriveBookable — KEEP IN SYNC (Pitfall 5). All SIX terms.
LEFT JOIN host_payout hp        ON hp.user_id = u.id
LEFT JOIN host_verification hv  ON hv.user_id = u.id
WHERE l.status = 'published'
  AND l.deleted_at IS NULL
  AND u.email_verified = true
  AND COALESCE(hp.payouts_enabled, false) = true
  AND EXISTS (SELECT 1 FROM operating_hours oh_any WHERE oh_any.listing_id = l.id)
  -- FIFTH TERM (LVER-01). Two accepting values, listed POSITIVELY: a negative test would let
  -- 'withdrawn' or a future value through.
  AND l.review_state IN ('approved','grandfathered')
  -- SIXTH TERM (HVER-03/D-222). A host with NO host_verification row is UNVERIFIED, never verified —
  -- the same fail-closed shape as COALESCE(hp.payouts_enabled, false) two lines above. 'suspended'
  -- fails here, which is why suspension needs no second check anywhere.
  AND COALESCE(hv.status::text, 'unverified') IN ('approved','grandfathered')
```

### The predicate (`src/lib/bookability.ts`) — required fields, positive tests

```ts
export function deriveBookable(
  listing: {
    status: "draft" | "published" | "unlisted";
    hasOperatingHours: boolean;
    /** LVER-01. REQUIRED, never optional and never defaulted — a required field is what makes
     *  every call site a compile error, which is this module's whole census mechanism. */
    reviewState: ListingReviewState;
  },
  host: {
    emailVerified: boolean;
    payoutsEnabled: boolean;
    /** HVER-03 + D-222. INDEPENDENT of payoutsEnabled (D-225): that flag is webhook-maintained and,
     *  because PayMongo Platforms is sales-gated, never turns true on its own merits in production.
     *  'suspended' fails here, which is the whole of ENF-01's block-new lever. */
    verificationStatus: HostVerificationStatus;
  },
): boolean {
  return (
    listing.status === "published" &&
    listing.hasOperatingHours &&
    (listing.reviewState === "approved" || listing.reviewState === "grandfathered") &&
    host.emailVerified &&
    host.payoutsEnabled &&
    (host.verificationStatus === "approved" || host.verificationStatus === "grandfathered")
  );
}
```

### The freeze (ENF-02) — a `WHERE` clause, before the claim

```sql
-- src/inngest/functions/payout-sweep.ts queryDuePayouts
FROM booking b
JOIN listing l ON l.id = b.listing_id
JOIN host_payout hp ON hp.user_id = l.host_id
-- ENF-02. The freeze is a PREDICATE, not a branch inside payOne — and the placement is the whole
-- design. Filtering HERE means the claim INSERT never runs, so no ledger row is ever created, so
-- there is no row for payout-reconcile's stuck-`held` alert to page an operator about. Freezing
-- AFTER the claim would leave a `held` row per suspended booking and fire a FALSE [payout-alert]
-- on every one of them — the exact failure alertStuckHeld's own comment warns about for
-- host_cancel_fee debits. Un-suspension needs no write: the next sweep simply selects the row again
-- (the D-14 auto-revert property).
LEFT JOIN host_verification hv ON hv.user_id = l.host_id
LEFT JOIN host_payout_ledger p ON p.booking_id = b.id AND p.kind = 'payout'
WHERE ...
  AND COALESCE(hv.status::text, 'unverified') <> 'suspended'
```

### The D-236 constant

```ts
// src/lib/payments/fees.ts — money-policy constants, `import "server-only"` guarded.
/** D-209/D-236. `false` = the PM's answer: the booker gets the full booking amount and FitOut
 *  retains the D-74 service fee. DELIBERATELY NOT process.env-tunable — D-236 requires that
 *  flipping this be a one-line CODE change with the conflict documented at the call site, not a
 *  deployment setting that could change silently. The conflict is written out in full at the single
 *  read site in src/app/actions/cancel-booking.ts. */
export const OPS_CANCEL_REFUNDS_SERVICE_FEE = false;
```

---

## Runtime State Inventory

This phase changes stored data (the D-240 backfill) and introduces a new privileged identity, so the inventory is required. Each category answered explicitly.

| Category | Items found | Action required |
|----------|-------------|-----------------|
| **Stored data** | **(1)** `listing.review_state` — the new column plus the D-240 `UPDATE` over every `published, deleted_at IS NULL` row. **(2)** `host_verification` — one `grandfathered` row per host owning such a listing. **(3)** No existing column is repurposed and no existing value is rewritten. `booking`, `host_payout`, `host_payout_ledger` and `audit` are read-only to this phase except the ops-cancel writes, which use existing columns. | **Data migration** (the backfill, in the migration) **and** a **code edit** (the column default `'pending'` governs every future row). Both are required and they are different tasks — the default alone would leave the live catalogue unsellable; the `UPDATE` alone would leave new listings ungated. |
| **Live service config** | **None found.** No external service holds review or verification state — the KYC vendor is deliberately not wired (D-206), so there is no vendor-side config, no vendor dashboard, no vendor webhook. PayMongo holds `activation_status`, which this phase must **not** touch (D-225). Inngest holds only the two cron definitions, which are code and are in git. *Verified by: grep for external-service writes across `src/lib/paymongo.ts`, `src/inngest/**`, `src/lib/cloudinary.ts`.* |
| **OS-registered state** | **None found.** No Task Scheduler entry, no pm2 process, no systemd unit is added or renamed. The two crons are Inngest-registered from code. *Verified by: `scripts/` contains no registration script; `package.json` adds no daemon.* |
| **Secrets / env vars** | **None required.** The manual provider needs no credential. `OPS_ALERT_EMAIL` / `OPS_ALERT_AGING_HOURS` already exist (`.env.example:178,181`) and are untouched. **If** the plan makes any new constant env-tunable it must be added to `.env.example` (the shipped convention — every config constant is documented there). ⚠ `OPS_CANCEL_REFUNDS_SERVICE_FEE` is deliberately **NOT** an env var (**F12**). |
| **Build artifacts / installed packages** | **None.** No package added or removed, so no lockfile churn and no stale install. The one artifact that *is* stale after a schema change is `drizzle/meta/*_snapshot.json` + `_journal.json` — which `drizzle-kit generate` maintains, and which `drizzle/0024`'s header notes is a reason to go through the generator rather than hand-author when the DDL is expressible. |

**The canonical question — after every file in the repo is updated, what runtime systems still hold old state?**
Exactly one: **the production `listing` table**, whose rows carry no `review_state` until the migration runs. That is what the D-240 backfill is for, and it is why the backfill must be in the same migration as the column (a deploy window where the column exists at `'pending'` but the backfill has not run is a window in which **the entire live catalogue is unsellable**).

---

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL + PostGIS (local, Docker) | Every integration test; the migration probes | ✅ | **18.4** (`postgis/postgis:18-3.6`, container `fitout-db-1` up) | — |
| `fitout_test` database | The Vitest suite (`tests/helpers/test-db-url.ts`) | ✅ (provisioned) | — | `npm run db:test:setup` |
| Node | Everything | ✅ | `>=24.2` per `package.json` engines | — |
| `better-auth` 1.6.14 | OPS-01 | ✅ installed | 1.6.14 | — |
| `drizzle-kit` 0.31.10 | The migration | ✅ installed | 0.31.10 | — |
| Playwright + browsers | The OPS-02 status-line audit | ⚠ installed but **not in CI** (D-24) | `@playwright/test` 1.60.0 | `curl` against `next start` — which is what 17.1-01 actually used |
| **A KYC vendor sandbox** | HVER-04 *evidence* | ❌ **not walked** | — | **D-206 makes this a non-blocker.** The comparison doc is written from published sources; the fact that no sandbox was walked must be stated in it. |
| **PayMongo Platforms / Linked Accounts** | HVER-04 comparison | ❌ **sales-gated; never walked** | — | Documented failure is the evidence: `GET /v2/wallets?status=activated` → HTTP 200, zero wallets; `GET /v2/transfers/receiving_institutions` → HTTP 404 (`src/lib/payments/refund-rail.ts:22-30`, probed 2026-07-23) |
| Resend (real delivery) | OPS-05 email, if a notification is added | ⚠ key set, but 403 for any recipient but the account owner until a domain is verified | — | In-app notification + host-surface signal, which is the **F8** recommendation anyway |

**Missing dependencies with no fallback:** none. Nothing in Phase 18 is blocked on a third party — which is precisely what D-206 bought.

**Missing dependencies with fallback:** the KYC vendor sandbox (fallback: published-source comparison, D-206), PayMongo Platforms (fallback: the recorded probe transcript), Playwright-in-CI (fallback: structural design test + a one-time `curl` audit).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | **Vitest 4.1.8** — two configs, deliberately disjoint |
| Config (integration/unit/component) | `vitest.config.ts` — `globalSetup` + `setupFiles`, requires Docker Postgres |
| Config (design gates) | `vitest.design.config.ts` — **no** `globalSetup`, **no** `setupFiles`, DB-free by design |
| Quick run command | `npx vitest run <path-to-file>` |
| Quick run (design) | `npx vitest run --config vitest.design.config.ts <path>` |
| Full suite | `npm test` (= `vitest run`, 192 files) |
| Full design suite | `npm run test:design` (71 files) |
| Build gate | `npm run build` = `npm run lint && npm run test:design && next build` |
| E2E | `npm run test:e2e` (36 specs) — **not a gate**, D-24 |

> ⚠ **Serialisation is mandatory.** `tests/global-setup.ts:83-90` TRUNCATEs the shared test database at run start. `npm test`, `npm run test:design` and `npm run build` **truncate each other's data** if run concurrently or back-to-back. Re-run a red suite **alone** before believing it. And `tests/design/*` must be run with `--config vitest.design.config.ts` — the bare form exits 1 with "no test files", which is indistinguishable from a real failure.

### Phase Requirements → Test Map

| Req | Behaviour | Type | Automated command | File exists? |
|-----|-----------|------|-------------------|-------------|
| OPS-01 | `role='staff'` is read server-side; `input:false` blocks `/api/auth/update-user` from writing it | integration | `npx vitest run tests/auth/ops-role.test.ts` | ❌ Wave 0 — clone `tests/auth/capability-escalation.test.ts` |
| OPS-01 | `scripts/ops-grant.ts` grants via Drizzle and nothing else | integration | `npx vitest run tests/ops/grant-cli.test.ts` | ❌ Wave 0 |
| OPS-02 | `requireStaff()` refuses a non-staff, a signed-out caller, and a `role=null` user with `notFound()` | integration | `npx vitest run tests/ops/staff-guard.test.ts` | ❌ Wave 0 |
| OPS-02 | **Structural:** every `(ops)/**/page.tsx` and every ops action calls `requireStaff()`; the `(ops)` layout calls `assertStaff()`; **no `(ops)` `not-found.tsx` exists** | design (AST) | `npx vitest run --config vitest.design.config.ts tests/design/ops-guard-coverage.test.ts` | ❌ Wave 0 — clone `tests/design/blocking-session-gate.test.ts` (AST walk) + `soft-404-status.test.ts` (guard resolution) |
| OPS-02 | **Status line:** staff→200, non-staff→404, signed-out→404, nonexistent `/ops/xyz`→404, all under a production build | **manual audit** | `npm run build && node ./node_modules/next/dist/bin/next start -p 3100` then `curl -o /dev/null -w '%{http_code}'` ×4 | ❌ — the 17.1-01 § P1 shape; **no automated instrument in this repo can read a status line** (`soft-404-status.test.ts:31-39`) |
| OPS-03 | Every ops action writes an `audit` row with `actorId` = the authenticated staff id | integration | `npx vitest run tests/ops/ops-audit.test.ts` | ❌ Wave 0 — harness from `tests/security/audit-table.test.ts` |
| OPS-04 | Queue returns hosts + listings awaiting review, oldest first, in one result | integration | `npx vitest run tests/ops/queue-query.test.ts` | ❌ Wave 0 |
| OPS-04 | Every new `/ops` page has a `loading.tsx`; pinned counts moved | design | `npx vitest run --config vitest.design.config.ts tests/design/loading-coverage.test.ts` | ✅ **exists — will go RED until the constants move** |
| OPS-05 | Reject writes a reason; the host can read it on their own surface | integration | `npx vitest run tests/ops/reject-reason.test.ts` | ❌ Wave 0 |
| HVER-01 | Unknown provider fails CLOSED (never verified); manual provider writes `{result, vendorRef:null, checkedAt, provider:'manual'}` | unit | `npx vitest run tests/ops/verification-port.test.ts` | ❌ Wave 0 |
| HVER-02 | `host_verification`'s **exact** column set in the migrated schema; **no** document/id/image column | integration | `npx vitest run tests/ops/verification-schema.test.ts` | ❌ Wave 0 — `information_schema.columns` idiom, `tests/ops/alerts.test.ts:563-592` |
| HVER-03 | Verification status is a term of the pure predicate; `suspended` flips true→false with nothing else changed; term is independent of `payoutsEnabled` | unit | `npx vitest run tests/listing/bookability.test.ts` | ✅ **exists — extend per F5c (29 assertions)** |
| HVER-04 | The comparison doc exists and covers the six required dimensions | doc review | — | ❌ — a `checkpoint:human-verify` artifact, not a test |
| HVER-05 | Badge renders for `approved`; **does not** render for `grandfathered`; not for any other value | component | `npx vitest run tests/listing/verification-badge.test.tsx` | ❌ Wave 0 — clone `tests/listing/listing-card.test.tsx` |
| HVER-05 | The trust-signal gate accepts the fifth signal deliberately | design | `npx vitest run --config vitest.design.config.ts tests/design/trust-signals.test.ts` | ✅ **exists — will need a considered edit** |
| LVER-01 | SQL twin ≡ predicate over shared fixtures, **every** enum value covered, ≥3 passing members | integration | `npx vitest run tests/search/bookable-gate.test.ts` | ✅ **exists — extend per F5b (5→14 fixtures)** |
| LVER-01 | `placeHold` refuses a `pending`/`suspended` listing — **own anchor** | integration | `npx vitest run tests/booking/state-machine.test.ts` | ✅ exists — add the anchor |
| LVER-01 | `placeOpenHold` refuses — **own, separate anchor** | integration | `npx vitest run tests/booking/open-capacity-hold.test.ts` | ✅ exists — add the anchor |
| LVER-02 | `pending` listing absent from a no-date browse search | integration | `npx vitest run tests/search/bookable-gate.test.ts` | ✅ exists (the `gate_lr_pending` fixture **is** this assertion — D-228) |
| LVER-02 | `isPubliclyViewable` false for non-approved; `notFound()` reachable on that branch; **OG facts null too** | integration + design | `npx vitest run tests/listing/status-gate.test.ts` · `npx vitest run --config vitest.design.config.ts tests/design/soft-404-status.test.ts tests/design/og-routes.test.ts` | ✅ both exist — extend |
| LVER-03 | Each of the five material fields flips `approved`→`pending` and `grandfathered`→`pending`; a non-material edit does **not**; the flip is inside the same transaction | integration | `npx vitest run tests/listing/material-edit.test.ts` | ❌ Wave 0 |
| LVER-03 | A **photo** change trips re-review (**F7**) | integration | `npx vitest run tests/listing/material-edit.test.ts` | ❌ Wave 0 — this is the assertion that fails if F7 is not addressed |
| LVER-04 | The backfill grandfathers `published` only; leaves `draft`/`unlisted`/soft-deleted at `pending`; is re-runnable; never moves `approved`/`rejected` | integration | `npx vitest run tests/ops/grandfather-backfill.test.ts` | ❌ Wave 0 — **must read the `UPDATE` from the migration file on disk** (F3.4) |
| ENF-01 | A suspended host's listing is not bookable at all seven sites | unit + integration | `npx vitest run tests/listing/bookability.test.ts tests/search/bookable-gate.test.ts tests/booking/state-machine.test.ts` | ✅ (extended) |
| ENF-02 | Suspended host → 0 due payouts; un-suspend → 1 due (**no write in between**); no `held` row is created; `alertStuckHeld` returns 0 | integration | `npx vitest run tests/payments/payout-suspension-freeze.test.ts` | ❌ Wave 0 — clone `tests/payments/payout-sweep.test.ts` |
| ENF-02 | A `processing` row on a suspended host **still** alerts when stuck | integration | same file | ❌ Wave 0 — the negative half, and it matters |
| ENF-03 | Ops cancel refunds `spacePriceCents` (constant `false`); flipping the constant refunds `quotedTotalCents`; **no** `host_cancel_fee` row is written; `retained_space_cents = 0`; sweep excludes the booking | integration | `npx vitest run tests/payments/ops-cancel.test.ts` | ❌ Wave 0 — clone `tests/payments/host-cancel.test.ts` |
| ENF-03 | The ops-cancel path does **not** emit `booking_cancelled_by_host` | integration | same file | ❌ Wave 0 (Pitfall 5) |

### Sampling Rate

- **Per task commit:** the single file(s) that task touched — `npx vitest run <file>`. Design-gate tasks: `npx vitest run --config vitest.design.config.ts <file>`. **Never both in the same command run.**
- **Per wave merge:** `npm test` **alone**, then `npm run test:design` **alone**, in that order, never concurrently.
- **Phase gate:** `npm run build` green (which runs lint + the full design suite + `next build`), then `npm test` green, then `/gsd:verify-work`.
- **Once, before the phase closes:** the OPS-02 production-build `curl` transcript (four readings), recorded as evidence the way `17.1-EVIDENCE.md § P1` records its four.

### Wave 0 Gaps

- [ ] `tests/ops/staff-guard.test.ts` — OPS-02
- [ ] `tests/ops/ops-audit.test.ts` — OPS-03
- [ ] `tests/ops/verification-schema.test.ts` — HVER-02 (the column-set allow-list)
- [ ] `tests/ops/verification-port.test.ts` — HVER-01
- [ ] `tests/ops/grandfather-backfill.test.ts` — LVER-04 (reads the migration file from disk)
- [ ] `tests/ops/queue-query.test.ts` — OPS-04
- [ ] `tests/ops/reject-reason.test.ts` — OPS-05
- [ ] `tests/ops/grant-cli.test.ts` — OPS-01
- [ ] `tests/auth/ops-role.test.ts` — OPS-01 (escalation half)
- [ ] `tests/listing/material-edit.test.ts` — LVER-03 (**including the photo case**)
- [ ] `tests/listing/verification-badge.test.tsx` — HVER-05
- [ ] `tests/payments/payout-suspension-freeze.test.ts` — ENF-02 (**both halves**)
- [ ] `tests/payments/ops-cancel.test.ts` — ENF-03
- [ ] `tests/design/ops-guard-coverage.test.ts` — OPS-02 structural
- [ ] **No framework install needed.** Vitest, both configs, and the isolated-schema harness all exist.
- [ ] **Shared fixture:** a `makeVerifiedHost()` in `tests/helpers/seed.ts` would let the 19-file sweep (F9a) converge on one expression.

---

## Security Domain

`security_enforcement: true`, `security_asvs_level: 1`, `security_block_on: "high"` (`.planning/config.json`).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard control in this phase |
|---------------|---------|-------------------------------|
| **V2 Authentication** | **yes** | Better Auth 1.6.14, unchanged. `getSession()` is DB-backed on every call (no cookie cache) — instant revocation. No new credential, no new auth endpoint. **Do not add the admin plugin** (F1b): it publishes `set-user-password` and `impersonate-user`. |
| **V3 Session Management** | **yes** | Unchanged: 30-day sliding session in Postgres, `revokeSessionsOnPasswordReset: true`. **New invariant:** `requireStaff()`'s correctness depends on `session.cookieCache` staying unconfigured. Write it at the site. |
| **V4 Access Control** | **yes — the phase's centre of gravity** | Per-page + per-action `requireStaff()` (D-216), backed by Next's own documented rule that a layout does not stop a segment rendering. Server actions re-gate independently. `notFound()` not `forbidden()` (D-219) so the response is not an existence oracle. `role` is `input:false`, granted only by a server-side Drizzle write from a CLI (D-217). |
| **V5 Input Validation** | **yes** | Every ops server action re-parses its arguments with Zod before use — server-action argument types are **not** enforced at runtime, and the shipped precedent says why: *"a crafted reason string would otherwise land verbatim in an audit row and a durable column"* (`cancel-booking.ts:1101-1103`). The ops rejection **reason** is the highest-risk field: it is host-visible free text that lands in a durable column and possibly an email — it must be length-bounded, enum-constrained where possible, and rendered as text (never `dangerouslySetInnerHTML`). `tests/auth/email-escaping.test.ts` and `email-injection.test.ts` are the shipped anchors for the email half. |
| **V6 Cryptography** | **no** | This phase performs no cryptographic operation. Webhook HMAC verification (`Paymongo-Signature`) is untouched. **Never hand-roll** — but there is nothing here to hand-roll. |
| **V7 Error Handling & Logging** | **yes** | Every ops action writes an `audit` row (D-218). ⚠ `recordAudit` **swallows its own insert failure by design** (`src/lib/audit.ts:104-110`) — deliberate on money paths, but it means **an ops console must never present "the audit row was written" as guaranteed**, and a plan must not build an ops feature that depends on the row existing. The console's queue should read the domain tables (`listing_review`, `host_verification`), not `audit`. |
| **V8 Data Protection / Privacy** | **yes — HVER-02 is a privacy control expressed as a schema constraint** | FitOut never becomes a custodian of government IDs (D-206). Enforced by an exact-column-set assertion against `information_schema`, not by convention. `audit.meta` is jsonb and D-72 forbids secrets/PII in it — an ops audit row must carry ids and enum values, **never** the rejection reason's free text if that text could contain PII a host typed. |
| **V12 Files & Resources** | **partially** | No new upload path. But **F7**'s photo re-review touches `listing-photo.ts`, which carries the D-165 Cloudinary provenance guard — do not weaken it while adding the re-review hook. |
| **V13 API / Web Service** | **yes** | No new HTTP route handler is added (that is a feature). The `(ops)` surfaces are RSC + server actions, which inherit Next's CSRF/origin handling and `auth.ts`'s `trustedOrigins`. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard mitigation, as it applies here |
|---------|--------|------------------------------------------|
| Privilege escalation via a client-writable role | **E**levation | `input: false` on `role` (already shipped) + CLI-only grant + `tests/auth/capability-escalation.test.ts` as the clone target |
| Route-existence oracle (403 vs 404) | **I**nformation disclosure | `notFound()` everywhere, no `(ops)` `not-found.tsx`, layout assert for the status line (**F2b**) |
| Forced browsing / IDOR into an ops surface | **E**levation | Per-page + per-action guard; no ops power behind a URL alone (OPS-02) |
| Server Action invoked directly, bypassing UI | **E**levation | Every ops action calls `requireStaff()` itself. Next's docs treat actions as public endpoints |
| Fail-open on missing state | **S**poofing / **E**levation | `COALESCE(hv.status,'unverified')` — a missing verification row is **unverified**, never verified (**F5a**) |
| Privileged-action flooding | **D**enial of service | `rateLimit(\`ops-<verb>:${staffId}\`, …)`, keyed on the authenticated identity (`src/lib/rate-limit.ts:14-15`); audit the denial, as `capability.ts:64-72` does |
| Repudiation of a money-moving ops act | **R**epudiation | `audit` row with an **authenticated** `actorId` (D-218) — the phase's whole answer to `resolved_by` being *"asserted, not authenticated"* |
| Stored XSS via a host-visible rejection reason | **T**ampering | Zod-bounded input; React text rendering; the shipped email-escaping tests |
| Unreviewed listing leaked through a side channel | **I**nformation disclosure | Three surfaces, not two: search, the page, **and the OG image route** (**F6**) |
| Refund/payout misdirection during enforcement | **T**ampering | The freeze is a DB predicate before the claim (**F11**); the wallet correlation (`wallet.id === b.paymongoAccountId`) is untouched |

**No `high`-severity finding is expected from this phase's own code** provided F2b, F5a and F11 are implemented as described. The one place a plan could *introduce* a high finding is adding the Better Auth admin plugin (F1b) — fifteen new privileged endpoints, none of them required.

---

## HVER-04 — Vendor Evidence (input to `18-KYC-VENDOR-COMPARISON.md`)

> **This is research input, not the deliverable.** D-238 says the doc is written for the PM as a **fork**. `18-PATTERNS.md` § No Analog Found is right that the tonal model is `src/lib/payments/refund-rail.ts:1-33` — a **verdict settled by observed behaviour, with the raw responses quoted** — not a feature matrix. Everything below must be labelled in the doc with how it was obtained.

### The two sides of the fork

**Side A — PayMongo Platforms / Linked Accounts.**

| Dimension | Finding | Confidence |
|---|---|---|
| Reachability | **Sales-gated; never walked by this project.** Probed 2026-07-23 in test mode: `GET /v2/wallets?status=activated` → HTTP 200 with **zero wallets**; `GET /v2/transfers/receiving_institutions?provider=instapay` → **HTTP 404** (`refund-rail.ts:22-30`). PayMongo's marketing page for onboarding-and-verify links a self-serve `dashboard.paymongo.com/signup`, but the developer doc page for Platforms itself now **404s** ("this specific page was retired or moved"). | **HIGH** on the probe (this project's own transcript). **LOW** on current self-serve status — the doc moved and was not re-probed. `[ASSUMED]` that it remains gated. |
| What FitOut would store | Onboarding is **hosted-redirect** — the child account's representative supplies a government ID and selfie to PayMongo, not to FitOut. FitOut receives an account id + `activation_status` + the `merchant.activated` webhook. This is the storage contract D-206 wants. | **MEDIUM** [CITED: paymongo.help/en/articles/10123821-what-is-hosted-onboarding; paymongo.com/products/fintech-infrastructure/onboard-and-verify] |
| KYC depth | "identity verification is required for a fully functional account, where the authorized representative must provide legitimate government-issued ID and selfie — accounts are subject to review by PayMongo's risk engine". BSP-regulated EMI. | **MEDIUM** [CITED: PayMongo help centre] |
| Cost | Not separately priced — it is part of the platform relationship FitOut already has. **Marginal cost ≈ ₱0.** | **MEDIUM** |
| Data residency | PH-domiciled BSP-supervised entity. | **MEDIUM** |
| ⚠ The structural objection the doc must lead with | **It re-couples identity to `payoutsEnabled`, which D-225 exists to decouple.** PayMongo's activation *is* the payouts gate. Choosing it collapses the fifth/sixth terms back into the third, and FitOut is back to a gate that "in production never turns true on its own merits." **This is the argument, not the pricing.** | **HIGH** — it follows from D-225 and the probe |

**Side B — a standalone PH KYC vendor.** Four representative candidates spanning the reachability spectrum:

| Vendor | Self-serve sandbox? | Published price | PH depth | Confidence |
|---|---|---|---|---|
| **Didit** | **Yes** — free tier, no credit card, no minimum, no contract | **500 full KYC/month free**; **$0.33** per full check PAYG; modules $0.03–$2.00 (ID $0.15, passive liveness $0.10, face match $0.05, AML $0.20) | "220+ countries"; **PH not named**; data residency is an Enterprise-only option | **MEDIUM** — read from the vendor's own pricing page [CITED: didit.me/pricing]; vendor-published and could change |
| **Sumsub** | **Yes** — 14-day trial, 50 free checks, "Sign up for free", no sales call | **$1.35**/verification + **$149/mo** minimum (Basic); **$1.85** + **$299/mo** (Compliance) | Pricing page names **no** APAC/PH specifics | **MEDIUM** [CITED: sumsub.com/pricing] |
| **Innov8tif / EMAS eKYC** | **No published self-serve** — enterprise/ASEAN sales motion | Not published | **Strongest PH document depth found:** PhilSys National ID (front **and** back), UMID, SSS, driver's licences, professional ID, voter's ID, passport, with per-document API references published | **MEDIUM** [CITED: innov8tif.com/solutions/landing-pages/ekyc-philippines; api2-ekycapis.innov8tif.com/okaydoc/…/ph-national-id-philsys] |
| **Verihubs** | Not found | "pay-as-you-go, no upfront setup, no minimum monthly commitment"; **PH rates differ from published global rates — contact required**; on-premise available for BSP data-residency needs | PhilSys-aware | **LOW** — vendor blog copy, no pricing page found |
| **Persona** | Pricing page returned **HTTP 403** to automated fetch | Third-party comparisons quote **~$1.50**/verification | Not verified | **LOW** — `[ASSUMED]`, third-party (competitor-authored) figures only |

### Regulatory and residency facts the doc needs

- **PhilSys is the anchor.** BSP Circular 1170 (2023) governs eKYC for BSP-supervised institutions and treats PhilSys as sufficient proof of identity; the **ePhilID is recognised as equivalent to the physical PhilID** for CDD, and its QR can be parsed for remote verification. ~80% of the population is registered as of Dec 2025. [CITED: verihubs.com/blog/ekyc-ph; shuftipro.com/blog/identity-verification-philippines] — **MEDIUM** (both are vendor-authored explainers; **cite BSP Circular 1170 directly in the deliverable**).
- **⚠ FitOut is not a BSP-supervised institution.** Circular 1170 binds banks and EMIs — PayMongo, not FitOut. FitOut's obligation is the **Data Privacy Act of 2012 (RA 10173)**, not BSP CDD. The doc must not import a bank's compliance burden onto a marketplace. `[ASSUMED]` — worth one line of counsel review, and it materially changes which vendor tier is appropriate.
- **There is no data-residency mandate.** The DPA "does not set any restriction on the cross-border transfer of personal data" given consent and contractual safeguards; the NPC published model contractual clauses in **NPC Advisory No. 2024-01 (30 May 2024)**. [CITED: privacy.gov.ph — NPC Advisory No. 2024-01; dlapiperdataprotection.com/?t=transfer&c=PH] — **MEDIUM-HIGH**. A US/EU-hosted vendor is therefore **not disqualified**, which is the single most decision-relevant fact in this section and inverts the intuition that a PH-native vendor is required.

### What the doc must say about the switching cost (the D-206 port's whole justification)

Given HVER-01's port, adopting any Side-B vendor is: **one new provider module** implementing the port + **one env credential** + **one webhook route** (if the vendor is asynchronous) + **`provider` starts carrying a new value in existing rows**. **No schema change** — `{ result, vendorRef, checkedAt, provider }` already anticipates a vendor reference. **No gate change** — the sell-gate reads `status`, which the port sets. The comparison should quantify this as "roughly one plan", and that number is the port's return on investment.

### Honest gaps to state in the doc

1. **No sandbox was walked.** Every figure is published, not measured. This directly contradicts the tonal model (`refund-rail.ts` settled its verdict by *observed* behaviour) and must be said out loud.
2. **PayMongo's Platforms doc page 404s.** Its current self-serve status is unknown; the last first-hand evidence is 2026-07-23 and is negative.
3. **PH-specific pricing is unpublished by every vendor found.** Global list prices are the only figures available.
4. **A fifth option was not costed: staying manual.** D-206 ships an ops-manual provider that satisfies the storage contract in full. At launch supply volumes, "no vendor" may dominate both sides of the fork on cost and on time-to-value. The doc should present it as a real third option, not as the status quo it is trying to leave.

---

## State of the Art

| Old approach | Current approach | When changed | Impact on this phase |
|---|---|---|---|
| Auth.js / NextAuth v5 for new projects | **Better Auth** | Sept 2025 (Auth.js → security-patch-only) | Already adopted. Nothing to do. |
| Middleware as the auth boundary | **Per-page / per-action checks + a Data Access Layer**; middleware ("Proxy" in Next 16 naming) for *optimistic* checks only | Next.js has said this since 13; the Next 16 guide now also states the Partial Rendering and RSC-payload reasons explicitly | Confirms D-216 with a citation. `src/middleware.ts` already complies. |
| `middleware.ts` | Next 16 documents the file as **`proxy.ts`** in its authentication guide examples | Next 16 | ⚠ **Do not rename anything.** `src/middleware.ts` works and is matched to `/login`,`/signup` only. This is naming drift in the docs, not a required migration — and this phase must not touch that file at all (D-216). |
| Enum changes via `ALTER TYPE` freely | Same restriction since PG 12, with the same-transaction-creation exception | unchanged through PG 18.4 | **F3**, probed. |
| Marketplace identity implied by payment-processor activation | Identity as an **independent** gate term | This phase (D-225) | The core architectural move of Phase 18. |

**Deprecated / outdated in this codebase's own history — do not reintroduce:**
- The `git diff --exit-code` byte-unchanged gate that used to pin `bookability.ts` + `query.ts`. **Retired** and replaced by the set-equality parity test (`bookability.ts:34-38`). Do not resurrect it — but do keep the parity test strong (**F5b**).
- `g_face` Cloudinary gravity, `notFound()` in `generateMetadata`, deleting `loading.tsx` — each recorded as a measured non-fix at its own site.

---

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|-------|---------|---------------|
| A1 | PayMongo Platforms / Linked Accounts is **still** sales-gated | HVER-04 | The comparison doc's central premise weakens. **Cheap to re-probe:** re-run the two calls at `refund-rail.ts:22-30`. Recommend the plan does. |
| A2 | Didit / Sumsub / Persona published prices are current and apply to PH | HVER-04 | The PM decides on stale numbers. Every vendor page found says PH pricing is quote-only. Label figures with their retrieval date. |
| A3 | FitOut is **not** a BSP-supervised institution and BSP Circular 1170 does not bind it directly | HVER-04 | If wrong, the KYC bar is materially higher and a PH-licensed vendor becomes mandatory. **One line of counsel review; flag to the PM.** |
| A4 | The PM's D-231 "photos" means the photo **set**, and reordering is not material | F7 | Either over- or under-triggers re-review. Cheap to resolve: state the reading in the plan and let the PM correct it. |
| A5 | `cancelled_by = 'system'` (option a) is acceptable for an ops cancellation | F12 | If the console must filter by ops-vs-system, option (b) and its ALTER TYPE are needed. |
| A6 | A suspended host does **not** need to be told their payouts are frozen this phase | F11 | A support-load surprise. Flag to the PM beside D-236. |
| A7 | The trust-signal gate (`tests/design/trust-signals.test.ts`) will accept a fifth booker-facing signal with a documented column behind it | F10 | The badge trips a build-blocking gate. Read that file's scope block before writing badge copy. |
| A8 | `notFound()` thrown from an `(ops)` **layout** yields a hard 404 identical to a nonexistent route | F2b | D-219 unmet. **Strongly analogous evidence exists** (17.1-01's production reading on `/listings/[id]`), but it was measured on a different route tree — hence the mandatory `curl` audit in § Validation Architecture. |
| A9 | 19 files is the true fixture blast radius | F9a | An under-budgeted task. The number is a grep for `host_payout` inserts, which is a **proxy** for "meant to be sellable" — the real number is knowable only once the terms land and `npm test` runs. Treat 19 as a floor. |

**Nothing in this table is a blocker.** A1, A3, A4, A5 and A6 are all cheap to resolve and three of them are PM questions rather than research gaps.

---

## Open Questions

1. **Does an ops-forced cancellation need to reach a session already in progress?** (F12 #3)
   - *Known:* `cancelBookingAsHost`'s flip carries `AND starts_at > now()` (`:1178`), and it silently refuses past that boundary with a `past_start` explanation.
   - *Unclear:* whether ops pulling a confirmed-fake listing must be able to cancel a session that has already begun.
   - *Recommendation:* implement the ops path **with the guard retained** (the conservative, precedent-matching choice), and surface the refusal in the console with honest copy. Flag the widening as a PM question. Do **not** silently drop the guard — a booking already underway involves a real person in a real space.

2. **Photos and material edit** (F7) — three options are laid out; the plan must pick one **explicitly** because D-231's own text is not achievable as written for one of its five fields.

3. **Is a suspended host told?** (F11 gap) — product decision. Recommend bundling with D-236 in the PM summary.

4. **`cancelled_by`: `'system'` or a new `'ops'` value?** (F12) — recommend `'system'` + the audit row; escalate only if the console needs to filter on it.

5. **Does OPS-05 require a notification, or does a host-surface signal satisfy it?** (F8) — recommend the host-surface signal first (zero enum change, zero 55P04 exposure), notification additive.

6. **How many `/ops` pages?** (F9b) — each one costs a `loading.tsx` plus edits to three pinned design-gate constants. The strong recommendation is **one page**, which is also what OPS-04 asks for ("everything needed to decide on the same screen"). If the plan proposes more, it must budget the gate tax per page.

---

## Sources

### Primary (HIGH confidence)

- **This repository**, read directly. Chief among them: `src/lib/bookability.ts` · `src/lib/search/query.ts:194-233` · `src/app/actions/booking.ts:107-230, 360-470` · `src/app/actions/cancel-booking.ts:196-310, 995-1389` · `src/lib/auth.ts:1-191` · `src/middleware.ts` · `src/lib/db/schema.ts` · `src/lib/audit.ts` · `src/lib/profile.ts` · `src/lib/listing/public-listing.ts` · `src/lib/listing/og-facts.ts` · `src/app/listings/[id]/(detail)/{layout,page}.tsx` · `src/app/(host)/host/{layout,listings/page}.tsx` · `src/app/actions/{listing,listing-photo,capability}.ts` · `src/inngest/functions/{payout-sweep,payout-reconcile}.ts` · `src/lib/payments/{fees,service-fee,refund-rail,config}.ts` · `src/lib/rate-limit.ts` · `tests/helpers/db.ts` · `tests/setup.ts` · `tests/global-setup.ts` · `tests/{listing/bookability,search/bookable-gate,ops/alerts,security/audit-table}.test.ts` · `tests/design/{loading-coverage,card-pattern-coverage,soft-404-status,trust-signals,empty-state-adoption,one-tree,leak}.test.ts` · `drizzle/{0014,0017,0018,0020,0021,0024,0025}*.sql` · `eslint.config.mjs` · `vitest.config.ts` · `vitest.design.config.ts` · `package.json` · `.env.example`
- **Installed package source** (not docs): `node_modules/better-auth/dist/plugins/admin/{schema,routes}.mjs` (1.6.14) · `node_modules/drizzle-orm/pg-core/dialect.cjs:46-74` (0.45.2) · `node_modules/drizzle-kit/bin.cjs:78922-78940` (0.31.10)
- **Local database probes**, PostgreSQL 18.4 (`postgis/postgis:18-3.6`), 2026-09-01 — Probes A, B, C in **F3**, transcripts quoted
- nextjs.org/docs/app/guides/authentication (v16.3.3, lastUpdated 2026-08-25) — layouts vs pages, DAL/DTO, Server Actions, "Proxy" optimistic checks
- nextjs.org/docs/app/api-reference/functions/not-found (v16.3.3, lastUpdated 2026-07-24) — `NEXT_HTTP_ERROR_FALLBACK;404`, the noindex tag, the streaming/status-line tradeoff
- postgresql.org/docs/18/sql-altertype.html · postgresql.org/docs/18/sql-createtype.html
- better-auth.com/docs/concepts/session-management — `getSession()` DB reads; `cookieCache` off by default
- better-auth.com/docs/concepts/database — `additionalFields`, `input`, `returned` (default `true`)
- `.planning/phases/18-host-verification-listing-review-fitout-ops/18-PATTERNS.md` — the shipped-shape map this document deliberately does not duplicate

### Secondary (MEDIUM confidence)

- didit.me/pricing — free tier 500/mo, $0.33 PAYG, module prices (vendor-published)
- sumsub.com/pricing — $1.35/$1.85 + $149/$299 minimums, 14-day/50-check trial (vendor-published)
- paymongo.com/products/fintech-infrastructure/onboard-and-verify · paymongo.help/en/articles/10123821-what-is-hosted-onboarding
- innov8tif.com/solutions/landing-pages/ekyc-philippines + its per-document API reference pages (PhilSys front/back, UMID, SSS)
- privacy.gov.ph — **NPC Advisory No. 2024-01**, Contractual Clauses for Cross-Border Transfers (30 May 2024)
- dlapiperdataprotection.com/?t=transfer&c=PH — DPA cross-border position

### Tertiary (LOW confidence — flagged for validation)

- verihubs.com/blog/ekyc-ph · shuftipro.com/blog/identity-verification-philippines — BSP Circular 1170 / PhilSys / ePhilID summaries. **Vendor-authored.** Cite BSP Circular 1170 directly in the deliverable.
- Third-party per-verification price comparisons (Persona ~$1.50, Veriff $0.80/$1.39). Competitor-authored; `[ASSUMED]`.
- docs.paymongo.com/docs/paymongo-platforms — **returns 404** ("this specific page was retired or moved"). Recorded as a negative finding, not a source.

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|------|-------|--------|
| Standard stack | **HIGH** | No new package; every version read from `node_modules`, not from `package.json` ranges |
| Better Auth behaviour (F1, F1b) | **HIGH** | Official docs for the two behavioural claims; **installed plugin source** for the cost claim |
| Next 16 guard semantics (F2, F2b) | **HIGH** | Official docs quoted verbatim, plus this repo's own production-build measurement of the identical mechanism on `/listings/[id]` |
| PG18 / Drizzle migration mechanics (F3) | **HIGH** | Three probes on the project's own PG 18.4 container + migrator source read in both `drizzle-orm` and `drizzle-kit` |
| Sell-gate census & fixture design (F5) | **HIGH** | All seven sites read; fixture arithmetic derived from the test file's own stated discipline |
| Payout freeze (F11) | **HIGH** | Both cron files read end to end; the failure mode is named by an existing comment in the file |
| ENF-03 forks (F12) | **HIGH** | Every one of the five read at its line; the enum absence verified by grep |
| Blast radius (F9) | **MEDIUM-HIGH** | Grep-measured. 19 is a **floor**, not a certainty (A9). Design-gate constants read from source. |
| PH KYC vendor market (HVER-04) | **MEDIUM** | Vendor-published pricing pages fetched directly where reachable; **no sandbox walked**; two sources vendor-authored; PayMongo's own doc page 404s |
| Architecture patterns | **deferred to `18-PATTERNS.md`** | Not re-derived here |

**Research date:** 2026-09-01
**Valid until:** **2026-10-01** for everything about this codebase and the framework/DB facts (all pinned to installed versions and probed behaviour). **2026-09-15** for the HVER-04 vendor pricing — vendor pages change without notice and every figure should carry its retrieval date in the deliverable.
