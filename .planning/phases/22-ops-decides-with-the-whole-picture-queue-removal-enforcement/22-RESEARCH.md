# Phase 22: Ops Decides With the Whole Picture — Expand-in-Place Inspection MVP - Research

**Researched:** 2026-09-10
**Domain:** Authenticated Next.js Ops queue inspection
**Confidence:** HIGH for the codebase seam; MEDIUM for disclosure accessibility guidance.

## User Constraints

### Locked Decisions

- Improve the existing staff listing queue; do not rewrite or remove it.
- Scope is OPS-13, OPS-14, and OPS-15 only: one in-place listing-evidence disclosure, terminal rows, visible existing decision controls, and visible host-verification standing.
- Preserve one `/ops` page; queue rows have zero anchors and zero `[role="link"]` elements.
- Do not add document-reference fields/placeholders, queries inside `rows.map`, runtime dependencies, or schema migrations.

### Codex's Discretion

- Use the existing client queue-row boundary and current UI primitives for the smallest accessible disclosure.
- Batch the existing decision-impact read so row shaping is a pure, synchronous map.
- Build the smallest staff-in-browser tracer from a pending listing to expanded evidence and visible decisions.

### Deferred Ideas (OUT OF SCOPE)

- ENF-04, host suspension/payout-freeze UI, and manual host-queue removal belong exclusively to Phase 22.1.
- Do not change/remove host actions or their action-census coverage.

## Project Constraints (from AGENTS.md)

- This Next.js version has breaking changes: read the relevant guide in `node_modules/next/dist/docs/` before code changes and heed deprecations.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| OPS-13 | Staff can inspect photos, description, address, capacity, pricing, amenities, and host facts in-place behind one disclosure; both row kinds stay terminal. | Extend the existing typed queue query and render through its existing client row and terminal tests. [VERIFIED: `src/lib/ops/review-queue.ts:120-152`, `src/components/ops/ops-queue-row.tsx:206-300`, `tests/ops/ops-queue-row.test.tsx:237-263`] |
| OPS-14 | Expanded evidence does not push the one decision widget off-screen; controls are visually distinct. | Keep `OpsDecisionActions` as one existing sibling section before—not inside—the evidence region. [VERIFIED: `src/components/ops/ops-decision-actions.tsx:273-335`, `src/components/patterns/row-card.tsx:213-223`] [ASSUMED] |
| OPS-15 | Host standing displays as a fact instead of a blank cell. | Preserve the fail-closed query and total status-copy map, both already tested. [VERIFIED: `src/lib/ops/review-queue.ts:273-282`, `src/components/ops/ops-queue-row.tsx:176-183`, `tests/ops/ops-queue-row.test.tsx:470-486] |
</phase_requirements>

## Summary

`/ops` is already the right vertical seam: its server page calls `requireStaff()`, reads the interleaved queue, and passes typed values into `OpsQueueRow`; the row is already a client island because it owns approval/rejection state. [VERIFIED: `src/app/(ops)/ops/page.tsx:130-170`, `src/components/ops/ops-queue-row.tsx:1-8] The queue query already selects address, capacity, pricing inputs, ordered photos, host name, and fail-closed host standing. [VERIFIED: `src/lib/ops/review-queue.ts:255-303] It omits only the requested `listing.description` and amenities, despite both being stored data. [VERIFIED: `src/lib/db/schema.ts:199-207`, `src/lib/db/schema.ts:307-318`, `src/lib/ops/review-queue.ts:129-152]

The planning correction is data shaping: the page currently awaits `loadOpsCancelImpact` inside `items.map`, one call per listing row. [VERIFIED: `src/app/(ops)/ops/page.tsx:140-169] This violates the phase's no-query-in-`rows.map` constraint. Add a set-based server-only impact loader that reuses the existing `OpsCancelImpact` contract and the single `opsRefundBasisCents` policy, then map from an already-built `Map<listingId, impact>`. [VERIFIED: `src/lib/ops/cancel-impact.ts:101-105`, `src/lib/ops/cancel-impact.ts:113-155`, `src/lib/ops/cancel-impact.ts:188-251`] [ASSUMED]

**Primary recommendation:** Extend the existing query with description and ordered amenity keys, batch decision impacts before row construction, and make listing evidence a native-button disclosure below the unchanged decision widget—no new route, action, package, or migration. [VERIFIED: `src/components/ops/ops-queue-row.tsx:218-300`, `src/app/(ops)/ops/page.tsx:130-170`] [CITED: https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Queue membership, evidence and standing projection | API / Backend | Database / Storage | The server-only query explicitly selects its DTO, joins verification fail-closed, and aggregates photos. [VERIFIED: `src/lib/ops/review-queue.ts:1-2`, `src/lib/ops/review-queue.ts:255-303] |
| Decision-impact batching | API / Backend | Database / Storage | Financial effects are server-calculated and passed as display strings. [VERIFIED: `src/lib/ops/cancel-impact.ts:30-34`, `src/lib/ops/cancel-impact.ts:183-251] |
| Disclosure state | Browser / Client | — | The existing queue row is the client boundary for interactive state. [VERIFIED: `src/components/ops/ops-queue-row.tsx:1-8] [CITED: `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md:6-10`] |
| Page assembly and labels | Frontend Server (SSR) | API / Backend | The page owns staff gate, DB clock, formatting, and row construction. [VERIFIED: `src/app/(ops)/ops/page.tsx:21-25`, `src/app/(ops)/ops/page.tsx:130-170] |
| Approval/rejection authorization | API / Backend | Browser / Client | Existing controls call security-censused server actions; only their placement changes. [VERIFIED: `src/components/ops/ops-decision-actions.tsx:153-270`, `tests/design/ops-host-invariants.test.ts:167-182] |

## Standard Stack

### Core

| Asset | Version | Purpose | Why standard |
|-------|---------|---------|--------------|
| Existing `next` App Router | `16.2.7` | Server page plus narrow interactive client boundary | Installed package is pinned; installed guidance supports nesting the one client component that needs state/event handling. [VERIFIED: `node_modules/next/package.json:2-9`] [CITED: `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md:80-86`] |
| Existing `OpsQueueRow` + `RowCard` | existing | Terminal queue-row composition | The row is already the queue client island; absent `href` gives terminal markup. [VERIFIED: `src/components/ops/ops-queue-row.tsx:206-300`, `src/components/patterns/row-card.tsx:184-195`] |
| Existing `PhotoGallery` | existing | Inspectable ordered photos | It already supports ordered photo DTOs, zero state, responsive mosaic, and lightbox. [VERIFIED: `src/components/listing/photo-gallery.tsx:176-249`] |

### Supporting

| Asset | Purpose | Use |
|-------|---------|-----|
| `AMENITY_LABELS` | Stable amenity-key to human-label conversion. [VERIFIED: `src/lib/listing-vocab.ts:78-102`] | Render selected amenity keys, with the existing public-page raw-key fallback. [VERIFIED: `src/app/listings/[id]/(detail)/page.tsx:347-350`] |
| `OpsDecisionActions` | The one approve/reject widget and refusal region. [VERIFIED: `src/components/ops/ops-decision-actions.tsx:273-335`] | Keep it once, outside disclosure content. |
| `OpsCancelImpact` / `opsRefundBasisCents` | Server-side financial impact authority. [VERIFIED: `src/lib/ops/cancel-impact.ts:101-105`, `src/lib/ops/cancel-impact.ts:113-155`] | Reuse for a batch read; do not recreate money math. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| In-place button disclosure | New listing-detail route | Rejected: this is an explicit prohibited second `/ops` listing-detail surface. [VERIFIED: `.planning/REQUIREMENTS.md:267-270`] |
| Existing client row | Fetch-on-expand endpoint/new client page | Rejected: data already arrives from the server; a second fetch widens the boundary and risks per-row work. [VERIFIED: `src/app/(ops)/ops/page.tsx:130-170`, `src/components/ops/ops-queue-row.tsx:1-8`] |
| Set-based impact loader | `Promise.all(items.map(loadOpsCancelImpact))` | Rejected by the no-query-in-`rows.map` constraint. [VERIFIED: `src/app/(ops)/ops/page.tsx:140-169`] |

**Installation:** None. Do not run `npm install`, edit `package-lock.json`, or add `drizzle/*`; the roadmap specifies zero runtime dependencies and zero schema migrations. [VERIFIED: `.planning/ROADMAP.md:115-125`]

## Architecture Patterns

### System Architecture Diagram

```text
Signed-in staff -> ops host /ops -> requireStaff()
                                  |
                                  +-> loadReviewQueue()
                                  |    listing + user + host verification + latest review
                                  |    + ordered photos + NEW ordered amenity keys
                                  |
                                  +-> one set-based decision-impact read -> Map by listing ID
                                  |
                                  +-> DB clock and labels -> synchronous rows.map
                                                            |
                                                            v
                                                   existing OpsQueueRow
                                                            |
                         +----------------------------------+---------------------------------+
                         |                                                                    |
                  unchanged one decision widget                                   native one-level disclosure
                                                                                         |
                                                                                         v
                                  photos + description + address + capacity + price + amenities + host standing
```

The final `rows.map` may format labels and look up a previously-loaded impact, but it must have no `await` or database call. [VERIFIED: `src/app/(ops)/ops/page.tsx:146-169`] [ASSUMED]

### Recommended Project Structure

```text
src/app/(ops)/ops/page.tsx           # staff gate, bulk reads, sync row shaping
src/lib/ops/review-queue.ts          # typed complete listing evidence projection
src/lib/ops/cancel-impact.ts         # existing and batch impact readers
src/components/ops/ops-queue-row.tsx # one-level listing disclosure, terminality
tests/ops/queue-query.test.ts        # SQL projection/order/batch proof
tests/ops/ops-queue-row.test.tsx     # disclosure, terminality, standing, controls
e2e/ops-queue.spec.ts                # new focused staff-inspection tracer
```

### Pattern 1: Server-loaded, client-toggled evidence

**What:** Keep evidence in the server DTO and state only in the existing client row. The installed Next guide specifies that the client boundary is for state/event handling and that props crossing it must be serializable. [CITED: `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md:6-10`] [CITED: `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md:50-50`]

**Implementation rule:** Use a native `<button>` control with state-bound `aria-expanded`; optionally connect it to the one evidence-region `id` using `aria-controls`. W3C documents this disclosure behavior and native button keyboard activation. [CITED: https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/]

### Pattern 2: Explicit, fail-closed query expansion

**What:** Add `description` and an ordered amenity-key array to the existing listing query/type. `description` is a nullable listing field; amenities are rows in `listing_amenity`, not an array column. [VERIFIED: `src/lib/db/schema.ts:199-207`, `src/lib/db/schema.ts:307-318`]

**Implementation rule:** Reuse the current lateral JSON-aggregate pattern used for photos, including deterministic ordering and null-to-empty normalization. [VERIFIED: `src/lib/ops/review-queue.ts:293-303`, `src/lib/ops/review-queue.ts:314-323`] [ASSUMED]

**Fallback rule:** Empty description/amenities must render an explicit neutral state, never a blank fact; existing queue evidence already does so for address, capacity, space type, title, and photos. [VERIFIED: `src/components/ops/ops-queue-row.tsx:158-204`, `src/components/listing/photo-gallery.tsx:185-198`] [ASSUMED]

### Pattern 3: Decision section outside the disclosure

**What:** Render current `OpsDecisionActions` once, visually separated before the disclosure; make all listing evidence disclosure content. Expansion then adds height below controls rather than moving/replacing them. [VERIFIED: `src/components/ops/ops-decision-actions.tsx:273-335`, `src/components/patterns/row-card.tsx:213-223`] [ASSUMED]

**Scope:** Listing rows only. Host rows keep existing facts/actions and must not acquire a document/image/ID number or related placeholder. [VERIFIED: `src/components/ops/ops-queue-row.tsx:65-72`, `src/lib/ops/review-queue.ts:36-42`]

### Anti-Patterns to Avoid

- **A detail link, `href`, or `role="link"`:** violates one-page and terminal-row requirements. [VERIFIED: `.planning/REQUIREMENTS.md:267-270`, `tests/ops/ops-queue-row.test.tsx:237-263`]
- **Nested disclosure, tabs, or lazy row fetch:** breaches the one-disclosure MVP and expands the data boundary. [ASSUMED]
- **Duplicate decision controls in evidence:** creates a second decision surface. [VERIFIED: `src/components/ops/ops-decision-actions.tsx:273-335`] [ASSUMED]
- **Raw known amenity keys:** use `AMENITY_LABELS`; preserve raw fallback only for unknown values. [VERIFIED: `src/lib/listing-vocab.ts:78-102`, `src/app/listings/[id]/(detail)/page.tsx:347-350`]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Photo inspection | New gallery/lightbox | `PhotoGallery` | It already handles gallery layout, lightbox, responsive states, and absent photos. [VERIFIED: `src/components/listing/photo-gallery.tsx:176-249`] |
| Amenity labels | Another label map | `AMENITY_LABELS` | It is the current listing-vocabulary authority. [VERIFIED: `src/lib/listing-vocab.ts:78-102`] |
| Decisions | New controls/actions | `OpsDecisionActions` and existing protected actions | Existing pending/refusal behavior and security coverage must remain unchanged. [VERIFIED: `src/components/ops/ops-decision-actions.tsx:146-335`, `tests/design/ops-host-invariants.test.ts:167-182`] |
| Money impact | Browser arithmetic / policy copy | `OpsCancelImpact` and `opsRefundBasisCents` | Client receives finished strings and policy remains one server expression. [VERIFIED: `src/lib/ops/cancel-impact.ts:30-34`, `src/lib/ops/cancel-impact.ts:101-105`] |
| Disclosure | Clickable `div`/role imitation | Native `<button>` | W3C's disclosure pattern is button-controlled content with `aria-expanded`. [CITED: https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/] |

## Common Pitfalls

### Pitfall 1: Per-listing impact reads survive in `rows.map`

**What goes wrong:** Current code awaits one impact query per listing while mapping row props. [VERIFIED: `src/app/(ops)/ops/page.tsx:140-169`]

**How to avoid:** Build a set-based loader keyed by already-known listing IDs and use the existing money policy/helper to materialize the current DTO for each ID. [VERIFIED: `src/lib/ops/cancel-impact.ts:101-105`, `src/lib/ops/cancel-impact.ts:188-251`] [ASSUMED]

### Pitfall 2: Terminality passes only while collapsed

**What goes wrong:** A detail link can be added only in expanded markup and evade a collapsed-only test. Existing tests already prove zero anchors and zero link roles for both row kinds. [VERIFIED: `tests/ops/ops-queue-row.test.tsx:237-263`]

**How to avoid:** Extend those rendered assertions through both disclosure states and add a browser check. [ASSUMED]

### Pitfall 3: Standing becomes blank

**What goes wrong:** Missing verification must be fail-closed, not an empty visual cell. The query explicitly uses the fallback status. [VERIFIED: `src/lib/ops/review-queue.ts:273-282`]

**How to avoid:** Preserve the source-of-truth status union, quoted verbatim: `"unverified", "pending", "approved", "rejected", "grandfathered", "suspended"`. [VERIFIED: `src/lib/db/schema.ts:369-379`] Preserve the existing total presentation map. [VERIFIED: `src/components/ops/ops-queue-row.tsx:176-183`]

### Pitfall 4: Scope creeps into enforcement

**What goes wrong:** Suspension, payout freeze, host queue removal, and removal of actions are Phase 22.1 work. [VERIFIED: `.planning/ROADMAP.md:1035-1049`]

**How to avoid:** Do not edit `src/app/actions/ops-review.ts` in this phase; keep its existing UI caller. [VERIFIED: `src/components/ops/ops-decision-actions.tsx:53-72`] [ASSUMED]

### Pitfall 5: Controls are visually mixed into evidence

**What goes wrong:** A large gallery/text block can obscure the operational action boundary. [VERIFIED: `src/components/ops/ops-decision-actions.tsx:273-335`] [ASSUMED]

**How to avoid:** Place one existing action widget before a separate evidence section; decide sticky behavior only from browser measurements. [ASSUMED]

## Code Examples

```tsx
// Existing client boundary: src/components/ops/ops-queue-row.tsx:1
// Disclosure semantics: https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
<button
  type="button"
  aria-expanded={expanded}
  aria-controls={evidenceId}
  onClick={() => setExpanded((open) => !open)}
>
  {expanded ? "Hide listing evidence" : "Show listing evidence"}
</button>
{expanded ? <section id={evidenceId}>{/* server-loaded listing evidence */}</section> : null}
```

This uses no new data literal or enum value. It is the W3C button-disclosure pattern inside the existing client component. [CITED: https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/]

## State of the Art

| Current | Phase 22 target | Impact |
|---------|-----------------|--------|
| Photos/facts render eagerly and description/amenities are absent from the queue DTO. [VERIFIED: `src/components/ops/ops-queue-row.tsx:247-298`, `src/lib/ops/review-queue.ts:129-152`] | One disclosure reveals complete listing evidence. [ASSUMED] | Reviewer stays in the ordered queue and chooses when to inspect. [ASSUMED] |
| Impact is awaited inside row mapping. [VERIFIED: `src/app/(ops)/ops/page.tsx:140-169`] | A bulk server read runs before the synchronous row map. [ASSUMED] | No per-row query during map. [ASSUMED] |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Controls before disclosure satisfy the approved off-screen contract without sticky positioning. | Pattern 3 | RESOLVED: the UI-SPEC binds the Court/Grove 320px/1280px browser containment check and prohibits sticky controls. |
| A2 | A grouped impact query can preserve the current single-listing impact results exactly. | Summary | A careless rewrite could change payout/money predicates; test equivalence. |
| A3 | No-description/no-amenities display uses the approved neutral named state. | Pattern 2 | RESOLVED: the UI-SPEC binds `Not set` for each missing field. |

## Open Questions (RESOLVED)

1. **What viewport measurement proves controls remain visible? — RESOLVED**
   - What we knew: actions are currently a `RowCard` sibling rendered after children. [VERIFIED: `src/components/patterns/row-card.tsx:213-223`]
   - Binding UI-SPEC answer: use the authenticated Court/Grove browser matrix at 320px and 1280px. After expansion, assert with bounding-box/viewport containment that the one existing non-sticky decision widget and both 44px controls remain within the viewport, that evidence follows the controls, and that the document has no horizontal overflow. Do not introduce sticky controls. [RESOLVED: `22-UI-SPEC.md` "Terminality, focus, and responsive behavior" items 4-5]

2. **What exact copy describes absent description/amenities? — RESOLVED**
   - What we knew: those values can be absent and existing queue facts avoid blank cells. [VERIFIED: `src/lib/db/schema.ts:199-207`, `src/lib/db/schema.ts:307-318`, `src/components/ops/ops-queue-row.tsx:185-204`]
   - Binding UI-SPEC answer: missing Description renders `Not set` and missing Amenities renders `Not set` in the evidence section; neither field may be blank. [RESOLVED: `22-UI-SPEC.md` "Copywriting Contract" and "Listing-row layout and disclosure" item 7]

## Environment Availability

| Dependency | Required By | Available | Version / observation | Fallback |
|------------|-------------|-----------|-----------------------|----------|
| Node.js | Next/Vitest | ✓ | `v24.13.0`; project declares `>=24.2`. [VERIFIED: `node --version` probe, `package.json:5-7`] | — |
| Project-local Next | build/docs | ✓ | `16.2.7`. [VERIFIED: `node_modules/next/package.json:2-9`] | — |
| npm CLI | package scripts | ✗ | Shell npm shim cannot find its global `npm-cli.js`. [VERIFIED: `npm --version` probe] | Use installed binaries with `node node_modules/...`, as Phase 20 did. [VERIFIED: `.planning/phases/20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa/20-14-SUMMARY.md:91-96`] |
| Docker daemon/local Postgres | SQL and browser suites | ✗ | Docker cannot reach daemon; `pg_isready` is absent. [VERIFIED: `docker compose ps`, `pg_isready` probes] | Restore local DB before DB-backed validation. |

**Missing dependencies with no fallback:** Local database service for SQL integration and the browser tracer.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest `4.1.8` and Playwright `1.60.0`. [VERIFIED: `package.json:76-94`] |
| Config | `vitest.config.ts` and `playwright.config.ts`. [VERIFIED: `vitest.config.ts:1-73`, `playwright.config.ts:1-20`] |
| Quick run | `node node_modules/vitest/vitest.mjs run tests/ops/queue-query.test.ts tests/ops/ops-queue-row.test.tsx --config vitest.config.ts` [VERIFIED: `vitest.config.ts:65-72`] |
| Full / browser | `node node_modules/vitest/vitest.mjs run --config vitest.config.ts`; then focused Chromium E2E after DB repair. [VERIFIED: `vitest.config.ts:65-72`, `playwright.config.ts:1-20`] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test type | Command | File status |
|--------|----------|-----------|---------|-------------|
| OPS-13 | Query returns description, ordered amenities, photos and host standing; host projection has no document field. | DB integration | focused Vitest | Extend `tests/ops/queue-query.test.ts` |
| OPS-13 | Collapsed/expanded listing and host rows have zero anchors and zero link roles. | jsdom | focused Vitest | Extend `tests/ops/ops-queue-row.test.tsx` |
| OPS-14 | Single decision widget remains visible after expansion at 320px/desktop. | Component + Chromium | focused Vitest + E2E | New `e2e/ops-queue.spec.ts` |
| OPS-15 | Every status has a phrase and absent verification stays fail-closed. | DB integration + jsdom | focused Vitest | Existing tests extend |

### Smallest End-to-End Tracer Slice

1. Seed staff plus one full pending listing with ordered photos, description, amenities, and a host verification row; authenticate on `ops.localhost` using the existing local-DB/browser-context pattern. [VERIFIED: `e2e/ops-auth.spec.ts:27-45`, `e2e/ops-auth.spec.ts:81-90`]
2. Visit `/ops`, activate the row's native disclosure, and assert one evidence region with all OPS-13 facts and no URL change. [CITED: https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/] [ASSUMED]
3. Before/after activation, assert zero anchors/zero link roles and the same existing approve/reject controls; measure controls visible at 320px and desktop. [VERIFIED: `tests/ops/ops-queue-row.test.tsx:237-263`, `tests/ops/ops-queue-row.test.tsx:454-486`] [ASSUMED]

### Wave 0 Gaps

- [ ] `e2e/ops-queue.spec.ts` — focused OPS-13/14/15 staff inspection tracer.
- [ ] Batch-impact equivalence test: grouped results retain current amounts, booking IDs and non-cancellable reason.
- [ ] Restore local Docker/Postgres before DB-backed test execution.

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Preserve page-level `await requireStaff()`. [VERIFIED: `src/app/(ops)/ops/page.tsx:130-133`] |
| V3 Session Management | Yes | Preserve existing ops-host session/origin architecture; no session feature is added. [VERIFIED: `tests/design/ops-host-invariants.test.ts:217-251`] |
| V4 Access Control | Yes | Keep existing protected actions; UI state is not authorization. [VERIFIED: `tests/design/ops-host-invariants.test.ts:167-182`] |
| V5 Input Validation | Limited | New interaction is local state only; no new server action/input. [CITED: https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/] [ASSUMED] |
| V6 Cryptography | No | No cryptographic operation is in scope. [ASSUMED] |

| Threat | STRIDE | Mitigation |
|--------|--------|------------|
| Nonstaff reaches evidence through a layout bypass | Elevation | Preserve page-level `requireStaff`, not layout-only gating. [VERIFIED: `src/app/(ops)/ops/page.tsx:4-12`, `src/app/(ops)/ops/page.tsx:130-133`] |
| New projection leaks extra host/identity data | Information Disclosure | Explicit selected columns only; retain exact no-document-field host DTO contract. [VERIFIED: `src/lib/ops/review-queue.ts:29-42`, `tests/ops/queue-query.test.ts:391-420`] |
| UI path bypasses action authorization | Elevation | Do not add/alter actions; retain action-census coverage. [VERIFIED: `tests/design/ops-host-invariants.test.ts:167-182`] |
| Per-row impact reads degrade queue | Denial of Service | One set-based impact loader, server-side money authority preserved. [VERIFIED: `src/app/(ops)/ops/page.tsx:140-169`, `src/lib/ops/cancel-impact.ts:30-34`] [ASSUMED] |

## Sources

### Primary (HIGH confidence)

- `src/app/(ops)/ops/page.tsx:130-223` — gate, queue assembly, current per-row impact read.
- `src/lib/ops/review-queue.ts:230-341` — queue SQL, ordering, photos and fail-closed status.
- `src/components/ops/ops-queue-row.tsx:176-300` — terminal row and standing copy map.
- `src/lib/ops/cancel-impact.ts:101-251` — current impact/money authority.
- `tests/ops/queue-query.test.ts:344-450` and `tests/ops/ops-queue-row.test.tsx:237-521` — executable test patterns.
- `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md:6-10,50,80-86` — installed official Next guidance.

### Secondary (MEDIUM confidence)

- [W3C Disclosure (Show/Hide) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) — control semantics and keyboard behavior.

### Tertiary (LOW confidence)

- No web-only technical recommendation is used as authority. `[ASSUMED]` entries are explicit plan inferences that need implementation-time verification.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — existing installed code only, no dependency change.
- Architecture: HIGH — page, query, row, money helper and tests were opened in this session.
- Pitfalls: HIGH for current N-per-listing query/terminality; MEDIUM for viewport placement until browser measured.

**Research date:** 2026-09-10
**Valid until:** 2026-10-10; recheck if Phase 22.1 changes the Ops queue first.
