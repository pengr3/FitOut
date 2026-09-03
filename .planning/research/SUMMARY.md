# Project Research Summary

**Project:** FitOut - milestone v1.2 "Verification and Operations"
**Domain:** Ops-subdomain isolation, staff auth/invite, and host-verification/moderation UX bolted onto an already-shipped Next.js 16 marketplace
**Researched:** 2026-09-03
**Confidence:** HIGH

## Executive Summary

v1.2 is not a build-new-things milestone; it is a configuration, rendering, and integration milestone against a codebase that already carries almost every piece it needs. The stack researcher headline finding is that all four new capabilities - the ops. subdomain, host-scoped ops cookies, staff invite, and Playwright-in-CI - require zero new runtime dependencies; any plan proposing npm install is a scope alarm. Feature and architecture research independently confirm the same shape for the trust-and-safety work: the verification roadmap, the expanded queue-row detail, the resubmit loop, and the host-facing review history are almost entirely reads over tables that already exist (host_verification, listing_review, listing, listing_amenity). The one genuine new-data gap is two columns (listing.description, listing_amenity) joining the ops queue read model. No item in the milestone requires a schema migration.

The recommended approach follows directly from dependency structure, not from the order items are listed in the brief. The Host-header partition (rename src/middleware.ts to src/proxy.ts per Next 16 deprecation, widen the matcher, add a dynamic Better Auth baseURL/trustedOrigins) is the one hard prerequisite everything ops-side sits on. It must land, and its byte-identical-404 cloak must be re-measured, before ops sign-in/invite is built on top of it. Separately and in parallel, the host-facing verification roadmap and resubmit/history work (D-278) should ship before the manual host-approval queue is removed (D-276) - removing the human path before the self-service replacement exists leaves a dead window. Two live UI defects (card-footer misalignment/overflow on /host/listings; a 404 after listing creation) are independent, cheap, and should not be fixed by touching vendored shadcn primitives or by weakening the edit page IDOR guard - the 404 is very likely a stale Turbopack dev-manifest artifact, not application code, and needs a reproduction gate (clean .next, restart, re-probe, then a production build) before any source file is touched.

The key risks are all about accidentally undoing the isolation and safety properties the milestone is buying, and pitfalls research names each precisely: enabling crossSubDomainCookies or session.cookieCache would silently defeat, respectively, the cookie separation and revocation guarantees that are the entire point of D-275, with no test going red unless a design test is written to catch it. Treating the Host-header proxy as authorization instead of routing would create a Server-Action-shaped hole, since Server Functions are not reliably matcher-covered. And D-276 keep enforcement plus contact in ops promise is currently unbuildable as a no-op: suspendHost has zero UI callers today, so the milestone must build a host-enforcement surface, not merely preserve one.

## Key Findings

### Recommended Stack

Every mechanism v1.2 needs is already installed and paid for. next@16.2.7 provides the Host-header rewrite primitive (via a proxy/middleware file - middleware is deprecated as of Next 16.0.0 in favor of proxy, so src/middleware.ts should become src/proxy.ts as part of this milestone, using the official @next/codemod middleware-to-proxy, with 5 test files that reference the old path fixed by hand). better-auth@1.6.14 already emits host-only session cookies by default (no Domain attribute unless crossSubDomainCookies is explicitly enabled) - cookie scoping needs no change; the real work is origin trust: baseURL must become a dynamic allowedHosts/protocol/fallback object and trustedOrigins must add the ops origin, or the ops sign-in POST is rejected with a CSRF/origin error. @playwright/test@1.60.0 is pinned to a specific container image tag (mcr.microsoft.com/playwright:v1.60.0-noble) that scripts/verify-workflows.mjs asserts across every containerized job - D-24 (Playwright-in-CI) is half-closed already: two of four CI jobs run Playwright; the remaining scope is a fifth gate-e2e job for the ~39 functional specs, never a widening of the existing gate-price-parity job (an enumerated, invariant-checker-caught mutation).

**Core technologies (all already installed, do not upgrade during this milestone):**
- Next.js 16.2.7 - Host-header rewrite for ops.; do not bump to 16.3.4 (baselines/CI image pinned to 16.2.7)
- Better Auth 1.6.14 - one instance, one user table, dynamic baseURL; do not bump to 1.7.2 (nothing to gain, auth.ts is a heavily-commented invariant surface)
- PostgreSQL 18 / Drizzle 0.45.2 - one new staff_invite-shaped concept, but even that can be a plain account plus role write plus existing audit row rather than a new table
- @playwright/test 1.60.0, pinned exact - the version string is a segment of the CI container image tag

**No new supporting library recommended.** Explicitly rejected: Better Auth admin plugin (mounts 15 endpoints including set-role and impersonate-user via the catch-all auth route - a money-platform impersonation hole for the one field FitOut actually needs), the organization/two-factor plugins, and trustedProxyHeaders: true (makes a spoofable header authoritative).

### Expected Features

**Must have (table stakes) for v1.2**, per the feature research area tags (A = host verification, B = ops console, C = seller-facing resubmit/history):

- **A1/A2** - the unverified-host state renders as a real bordered state with a real button, not a muted paragraph with an inline link
- **A3/A4/A7** - a 5-step verification roadmap (account, identity check, payout onboarding, list a space, FitOut checks the space), derived from the gates that actually block, with per-step state (done/current/blocked-on-us/blocked-on-you/not-yet) - never a percentage bar
- **A5** - named failure cause plus explicit retry-after instant, read from the single shipped verification-status.ts read (never a second query)
- **A6** - a stale-pending affordance: after D-276 removes the manual ops rescue, this restores an equivalent rescue on the host side, reusing the shipped resend/cooldown modules
- **B1** - listing.description and listing_amenity join the ops queue read model (the only genuine new-data gap in the whole milestone)
- **B2/B3** - the queue row expands in place behind a disclosure (button/summary, never an anchor); the decision widget stays visually separate
- **B7** - the ops. subdomain, ops sign-in, and staff invite/onboard
- **B9** - host verification standing renders as a fact on the listing row (already selected in the query; currently unrendered)
- **C3** - an explicit fix-and-resubmit control that routes into the edit wizard and names the required change (not a no-op resubmit button - that would collapse into the explicitly out-of-scope "appeal")
- **C4** - host-facing review history (submitted, waiting, decided, with reason), a pure read over the already-existing listing_review table
- **C6/C7** - resubmission acknowledgement; naming the material fields that trigger re-review, before the host edits

**Explicitly anti-features / out of scope:** an appeals channel (AF1, backlog 999.6), a separate ops listing-detail page (AF2 - breaks the terminal-row assertion), a no-op resubmit button (AF3), canned rejection codes replacing the operator sentence (AF4), a percentage progress bar (AF5), a live countdown/ETA (AF6), host-visible queue position (AF7), naming the deciding staff member to the host (AF8), bulk approve/reject (AF9), verification expiry/re-KYC (AF10), re-adding manual host approval beside the automated verdict (AF11).

**Defer past v1.2:** reviewer hotkeys/item-passing (B8), a published review-SLA window (C9 - needs real latency data first), an internal rejection-reason taxonomy (B10, additive-only if ever built).

### Architecture Approach

v1.2 introduces a two-host partition (apex plus ops.) served by one Next.js process, one user table, and one Better Auth instance - never two instances (Better Auth resolves cookiePrefix once from static options, so there is no half-measure). A Host-header proxy routes requests; it is explicitly never the authorization boundary - the shipped three-layer guard (layout assertStaff(), page requireStaff(), per-action requireStaff()) stays exactly as-is and is Host-agnostic. The byte-identical notFound() 404 cloak (D-275, non-negotiable) survives the rewrite structurally, because src/app/not-found.tsx is prerendered static and therefore cannot vary by Host - but it must be re-measured with every new route in the probe set, twice (once after the Host partition lands, again after ops sign-in/invite adds routes).

**Major components:**
1. **Proxy/Host partition** - rewrites ops. traffic to /ops, 404s /ops on the apex, never authorizes
2. **(ops-auth) sibling route group** - the ops sign-in surface, deliberately outside (ops) because assertStaff() in the (ops) layout 404s a signed-out caller before any page renders
3. **src/lib/ops/staff.ts plus grant.ts** - the one staff predicate and the one sanctioned user.role writer; the invite flow gets a second caller of writeRole, never a second copy
4. **src/lib/ops/review-queue.ts plus ops-queue-row.tsx** - loses its host branch (D-276) and widens its listing branch (D-277) in that order, because both changes land in the same two files
5. **Host verification/resubmit surfaces** (verification-status.ts, re-review.ts, listing_review) - presentation-layer work over data and guarded mutations that already exist and are explicitly to remain byte-unchanged

### Critical Pitfalls

1. **suspendHost has no UI caller today.** D-276 promise to keep enforcement in ops is currently a promise to preserve something unreachable. The milestone must build a host lookup/enforcement panel (wired to the already-shipped suspendHost and revealHostContact actions), not merely avoid deleting code - avoid this via an action-to-UI-caller inventory before the host queue branch is deleted.
2. **The proxy matcher becomes an accidental security boundary.** Server Functions POST to the page own URL and are not reliably covered by matcher-based logic, so a Host rewrite that also gates instead of also routes silently uncovers actions. Keep requireStaff() in every action independently; add a design test asserting call-site count is at least the exported-action count.
3. **crossSubDomainCookies or session.cookieCache get enabled as an innocuous-looking fix.** Either one silently undoes a load-bearing property (session isolation / instant revocation) with no test going red - both need dedicated build-blocking design tests, not just prose comments.
4. **Ops sign-in cannot live under (ops).** assertStaff() in the (ops) layout 404s a signed-out caller before the page renders, and a sign-in page there also collides with four pinned test constants (EXPECTED_OPS_PAGES=1, EXPECTED_OPS_ACTIONS=7, zero (ops)-scoped not-found.tsx, FORBIDDEN_REFUSALS banning redirect). Use a sibling route group instead.
5. **Invite/revoke pitfalls (new UI surface, old fears):** the invite accept endpoint must derive its grantee only from the invite row (never the request body) to avoid recreating D-217 arbitrary-target role-grant hole; the token must be single-use via a conditional DB update; and writeRole currently has no self-revoke or last-staff guard - harmless while granting was CLI-only, dangerous the instant a UI revoke ships (a revoke that empties the staff table is a silent, byte-identical-404 lockout with no recorded way back in except the CLI, which must therefore be explicitly preserved as break-glass).

## Implications for Roadmap

Suggested phase structure, following the architecture researcher dependency-derived build order (not brief-listed order):

### Phase 0: Quick independents
**Rationale:** No shared machinery; can start immediately and de-risk verification tooling before everything else needs it.
**Delivers:** The /host/listings card-footer fix (three className additions at the call site - never touch the vendored ui/card.tsx) and the D-24 Playwright-in-CI fifth job (gate-e2e, ~39 specs, same pinned container as the existing jobs).
**Addresses:** Item 6 defect; carried-forward D-24 close-out.
**Avoids:** Editing vendored shadcn primitives; widening gate-price-parity instead of adding a fifth job (an invariant-checker-caught mutation).

### Phase 1: Diagnose the listing-creation 404
**Rationale:** A live defect on the host primary path; independent of everything else, and un-scoped until reproduced.
**Delivers:** A reproduction-gated diagnosis (clear .next, restart, re-probe the ten measured URLs, then repeat under a production build). Evidence strongly suggests a stale Turbopack dev-manifest artifact, not application code - both edit/page.tsx and createDraftListing measured correct.
**Avoids:** Weakening the edit page IDOR guard as a symptom patch.

### Phase 2: Host-header partition (the ops subdomain, app-side)
**Rationale:** The one hard prerequisite everything ops-side depends on.
**Delivers:** src/middleware.ts to src/proxy.ts rename (Next 16 deprecation), Host-based rewrite (ops. to /ops, apex /ops to 404), dynamic Better Auth baseURL/trustedOrigins, and fixes to root-relative cross-host links ((ops)/ops/error.tsx Back to FitOut loop, SiteFooter composition).
**Implements:** The proxy/Host-partition component; leaves the three-layer guard untouched.
**Uses:** next@16.2.7 Host-agnostic getSessionCookie; Better Auth isDynamicBaseURLConfig/allowedHosts.

### Phase 3: Re-measure the 404 cloak
**Rationale:** D-275 calls this non-negotiable; do it as soon as the new routes exist, and again after Phase 4.
**Delivers:** A re-run of the 18-14 curl sha256-body-equality probe with every new route in the set.
**Avoids:** A distinguishable refusal becoming an existence oracle.

### Phase 4: Ops sign-in plus staff invite/onboard
**Rationale:** Needs the ops host to sign in to (depends on Phase 2); reuses shipped invite-token and role-grant idioms.
**Delivers:** (ops-auth) sibling route group, staff roster/invite panel (about 3 new server actions), invite acceptance that derives its grantee only from the invite row and single-use-consumes it, EXPECTED_OPS_ACTIONS pin update, and (per pitfalls research) self-revoke/last-staff-revoke refusal plus preservation of the CLI break-glass path.
**Addresses:** B7.
**Avoids:** Cookie/origin trust pitfalls; invite-token target, reuse, unverified-invitee privilege, revoke lockout, PII-in-audit pitfalls.

### Phase 5: Host verification roadmap, explicit resubmit, host-facing review history
**Rationale:** Deliberately before Phase 6 - D-278 host-facing legibility work is what replaces the human D-276 removes from the loop; shipping the removal first leaves a dead window. Independent of the ops-host thread, so it can run in parallel with Phases 2-4.
**Delivers:** A1-A7 (roadmap, real control, named cause, stale-pending affordance), C3/C4/C6/C7 (explicit resubmit, review history, resubmission ack, material-fields disclosure) - nearly all reads over existing tables/mutations, presentation-layer only.
**Addresses:** A1-A7, C3, C4, C6, C7.
**Avoids:** No-op resubmit (AF3), progress bar (AF5), countdown (AF6).

### Phase 6: Remove the manual host-approval queue plus build the enforcement/contact surface
**Rationale:** Depends on Phase 4 (staff-surface patterns) and Phase 5 (host-side legibility landed first). The removal and its replacement ship together or ENF-01/ENF-02/OPS-06 have no reachable home.
**Delivers:** Deletion of review-queue.ts host branch (5 test cases removed deliberately, not left red) plus a new host lookup/enforcement panel on the one /ops page, wired to the already-shipped suspendHost and revealHostContact.
**Addresses:** B7 continuation, ENF-01, ENF-02, OPS-06.
**Avoids:** A second /ops page; the zero-UI-caller enforcement gap.

### Phase 7: Expand-in-place listing detail on the queue row
**Rationale:** Depends on Phase 6 - it widens the same two files (review-queue.ts, ops-queue-row.tsx) Phase 6 has just cut the host halves out of; doing it first would mean editing both files twice against each other.
**Delivers:** listing.description plus two new LEFT JOIN LATERAL json_agg blocks (amenities, activity tags) added to the listing branch projection, plus u.created_at/u.email_verified migrated from the departing host branch; a disclosure control (never an anchor) in the row children slot.
**Addresses:** B1, B2, B3, B9.
**Avoids:** A view full listing link; adding any field that could carry a document reference (the standing HVER-02/D-206/D-220 prohibition).

### Phase 8: SUPPORT_EMAIL close-out
**Rationale:** Blocked purely on a business fact (a monitored address), not on code; one line whenever available.
**Delivers:** src/lib/site.ts:70 filled in; D-64 forbids a placeholder until then.

### Phase Ordering Rationale

- Phase 2 before Phase 4 is the one hard prerequisite (architecture research).
- Phase 6 before Phase 7 avoids two sequential edits fighting each other in the same two files.
- Phase 5 before Phase 6 avoids a dead window where neither the manual queue nor its self-service replacement exists for the host.
- Phases 0, 1, and 5 are independent of the ops-host thread (2 through 4, 6, 7) and can run in parallel with it.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Host partition):** the exact production-build mechanism for a hard 404 on the apex /ops path needs curl-level verification, not assumption; deploy target is unstated in the tree (no vercel.json/Dockerfile/render.yaml/fly.toml), which the DNS half of this phase depends on.
- **Phase 6 (queue removal plus enforcement surface):** this is a genuine scope item the brief undercounts - plan-phase should treat build the host enforcement panel as first-class work, not cleanup.
- **Phase 1 (404 diagnosis):** by definition unresolved - route to /gsd-debug rather than a standard plan.

Phases with standard patterns (skip research-phase):
- **Phase 0, Phase 5, Phase 7:** rendering/presentation work over already-existing, already-measured data and mutations; the architecture and feature research already specify file:line integration points in full.
- **Phase 8:** trivial, blocked on a business decision only.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Every claim verified by reading installed node_modules source directly (Better Auth cookie/URL internals, Next own deprecation warning), cross-checked against official docs |
| Features | MEDIUM overall / HIGH for in-tree claims | Every claim about what FitOut already ships is HIGH (read from the tree with file:line); competitor/ecosystem claims (Peerspace, App Store Connect, Pinterest Pinqueue, Etsy, Airbnb, Turo) are MEDIUM-to-LOW, resting on vendor docs or community reporting rather than primary specs |
| Architecture | HIGH | Every claim carries a file:line read at HEAD; two corrections to the milestone brief itself were caught this way (migrations end at 0029 not 0026; suspendHost has zero UI callers) |
| Pitfalls | HIGH for measured items / MEDIUM for framework-behavior items | The two live defects and most of the ops-subdomain pitfalls are MEASURED against the tree, DB, and running dev server; the Next 16 Server-Functions/matcher-coverage warning is relayed from the stack researcher reading, not independently re-fetched |

**Overall confidence:** HIGH

### Gaps to Address

- **D-275 vs PM-B conflict (open PM decision, not silently resolved):** D-275 (2026-09-03) states that a staff account may not simultaneously be a booker or a host, but this exact clause was explicitly declined as PM-B on 2026-09-01 in the same planning thread, and shipped code ((ops)/ops/layout.tsx:88-99, error.tsx:53-58) currently argues from the declined premise that ops is a role, not a third context, and that / is a real destination for staff. This must be surfaced to the PM before roadmap/requirements lock it in either direction - confirming it as intended costs an enforcement mechanism (nothing today stops a staff account from also having canBook/canHost), invalidates two shipped comment blocks, and changes what the ops:grant CLI may do.
- **Deploy target is unstated** - no vercel.json, Dockerfile, render.yaml, or fly.toml at HEAD. The app-side half of the Host partition (proxy plus allowedHosts plus cookies) is target-independent and can proceed now, but the DNS half cannot be specified until this is settled.
- **Whether /ops stays reachable on the apex host after the rewrite** - the architecture research strong recommendation is a byte-identical 404, never a redirect (a redirect is itself an existence oracle), but this should be confirmed as a deliberate decision in planning, not left implicit.
- **Full e2e suite wall-clock in CI is unmeasured** - needed before choosing whether to shard the new gate-e2e job; measure before designing sharding.
- **Safari plus ops.localhost dev resolution is MEDIUM confidence** - Chrome/Edge/Firefox auto-resolve wildcard.localhost per RFC 6761 with zero config; Safari has historically not. One probe settles it; put it in the phase first task rather than a UAT script.
- **The listing-creation 404 root cause is UNPROVEN**, not merely undiagnosed - the leading hypothesis (stale Turbopack dev-route-cache, matching a previously-recorded 2026-07-24 hazard) is strongly supported but not demonstrated; Phase 1 must close this with an actual reproduction before any source file is touched.

## Sources

### Primary (HIGH confidence)
- node_modules/better-auth@1.6.14 and node_modules/next@16.2.7 - read directly (cookie scoping, dynamic baseURL, origin-check, deprecation warning)
- FitOut working tree at HEAD, 2026-09-03 (extensive file:line citations across src/lib/ops/*, src/lib/auth.ts, src/lib/db/schema.ts, src/lib/listing/re-review.ts, src/lib/host/verification-status.ts, tests/design/ops-guard-coverage.test.ts, tests/ops/*, .github/workflows/ci.yml, scripts/verify-workflows.mjs)
- Live local Postgres (docker exec fitout-db-1 psql) and running next dev server probes (the ten-URL curl matrix; .next/dev/server/app-paths-manifest.json inspection)
- .planning/PROJECT.md - D-275, D-276, D-277, D-278
- nextjs.org/docs - Proxy file convention, middleware-to-proxy deprecation, Server Functions/matcher-coverage warning
- better-auth.com/docs - dynamic base URL guide, cookies concepts

### Secondary (MEDIUM confidence)
- support.peerspace.com, developer.apple.com/help/app-store-connect, docs.stripe.com/connect, help.etsy.com, airbnb.com/help - competitor verification/review-status vocabulary
- medium.com/pinterest-engineering - Pinqueue3.0 moderation-console structure (403 on direct fetch; reached via search summary)
- digital-strategy.ec.europa.eu - DSA Art. 17 statement-of-reasons obligation
- vercel.com/docs - wildcard vs named subdomain requirements

### Tertiary (LOW confidence)
- turo.com policies plus third-party host guides - refusal-reason opacity, not vendor-confirmed
- getstream.io/streamoid.com - resubmission-spam/velocity-signal claims, no vendor-published thresholds
- uxpatterns.dev, patternfly.org, uxmatters.com - stepper/progressive-disclosure step-count conventions

---
*Research completed: 2026-09-03*
*Ready for roadmap: yes*
