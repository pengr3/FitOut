---
phase: 27-app-subdomain-marketing-website
plan: "06"
subsystem: marketing
tags: [nextjs, metadata, accessibility, court, vitest]
requires:
  - phase: 27-05
    provides: Court marketing shell, genuine captures and audience journeys
provides:
  - Truthful About explanation connecting activity plans and host spaces
  - Players-first stacked FAQ with twelve keyboard-operable disclosures
  - Six public marketing sitemap URLs, request-aware robots and explicit marketing social metadata
affects: [27-07, 27-08, 27-09]
tech-stack:
  added: []
  patterns: [Native details with repeat-safe Enter/Space operation, exact preview authority, private no-store robots adapter]
key-files:
  created:
    - src/app/marketing/about/page.tsx
    - src/app/marketing/faq/page.tsx
    - src/components/marketing/faq.tsx
    - src/app/marketing/robots.ts
    - src/app/marketing/robots.txt/route.ts
    - src/app/marketing/sitemap.ts
    - tests/design/marketing-about.test.tsx
    - tests/design/marketing-faq.test.tsx
    - tests/design/marketing-metadata.test.ts
    - .planning/phases/27-app-subdomain-marketing-website/27-06-01-RED.json
    - .planning/phases/27-app-subdomain-marketing-website/27-06-02-RED.json
    - .planning/phases/27-app-subdomain-marketing-website/27-06-03-RED.json
  modified:
    - src/app/marketing/layout.tsx
    - src/app/marketing/page.tsx
    - src/app/marketing/hosts/page.tsx
    - src/app/marketing/players/page.tsx
    - src/lib/host-route-policy.ts
    - tests/design/marketing-shell.test.tsx
key-decisions:
  - About connects real player plans and host needs without invented company history or adoption claims.
  - Native disclosures retain normal pointer behavior and explicit repeat-safe Enter/Space toggles.
  - Exact configured preview robots deny crawling; explicit preview deployments also emit page noindex metadata.
  - Root-only Next robots convention requires a namespace Route Handler adapter; host policy denies direct namespace access.
  - Contact explicit page canonical and OG export remain owned by Plan 27-07; no Contact scaffold was added.
requirements-completed: []
requirements-addressed: [MKT-01, DOMAIN-01]
coverage:
  - id: CONTENT
    description: Actual rendered About explanation and ordered accessible FAQ with real eligibility and payout limits
    requirement: MKT-01
    verification:
      - kind: unit
        ref: tests/design/marketing-about.test.tsx
        status: pass
      - kind: unit
        ref: tests/design/marketing-faq.test.tsx
        status: pass
    human_judgment: false
  - id: METADATA
    description: Actual five existing page exports, root app authority, six sitemap destinations and exact preview robots
    requirement: DOMAIN-01
    verification:
      - kind: unit
        ref: tests/design/marketing-metadata.test.ts
        status: pass
    human_judgment: false
actuals:
  tokens: 10083
  tasks: 3
  commits: 6
plan_head_before: ef8f95b6a1877660f7c8b2059edf6a9bf73f77c4
duration: 9m58s first-RED-artifact to final task commit verification; initial reading additional
completed: 2026-10-09
status: complete
---

# Phase 27 Plan 06: About, FAQ and Marketing Metadata Summary

**Confirmed activity-to-space About copy, twelve Players-first/Hosts-second accessible answers, and purpose-specific marketing crawl and social metadata.**

## Performance

- First persisted RED evidence: 2026-10-08T18:53:52Z. Final task commits measured at 2026-10-08T19:03:50Z, a 9m58s artifact-to-completion interval. Required reading preceded this interval; a dispatch start clock was not recorded.
- Three tasks, eighteen changed artifacts before this summary. Actual tokens are the realized committed diff characters divided by four, rounded up (10,083), using the plan estimate's scale.
- Six RED/GREEN commits measured by `git rev-list --count` from the persisted per-plan ledger before the separate summary commit.

## Accomplishments

- About explains a game with friends, solo workout or practice, then links the need for a suitable session to courts, gyms and studios. Hosts get the concrete counterpart: discoverability, listing preparation, availability and bookings, subject to real checks. Distinct /about canonical and audience/Contact links; one H1; no biography, launch date, venue count or endorsement.
- FAQ has two stacked sections, Players before Hosts, with six questions each. Native details/summary controls use visible Court focus tokens and explicit Enter/Space toggles that prevent duplicate native activation and ignore held-key repeats. Questions cover anonymous browsing, sessions, exclusive/open-capacity modes, confirmed exclusive group invitations, cancellation/payment help, host setup/review, bookability, availability and payout readiness.
- Copy preserves actual account/listing gates and production payment/payout HOLD. It distinguishes setup from readiness, settlement and available funds from dispatch, and bank/e-wallet arrival from dispatch. No universal arrival deadline or launched payout promise. Links reach existing app bookings, hosting, earnings, terms/privacy and public marketing Contact.
- Sitemap exports exactly /, /hosts, /players, /about, /faq and /contact from MARKETING_ORIGIN. Public robots uses that sitemap; exact normalized configured previews and explicit preview deployments disallow all crawling. Robots serialization has text MIME, Vary: Host and private/no-store caching. Existing public resource rewrites and all-host direct namespace denials remain enforced.
- Home, Hosts, Players, About and FAQ export explicit visible canonical/OG URLs and the approved real search.png social image. Layout owns the marketing metadata base, Twitter screenshot and explicit preview noindex metadata. Root application metadata remains app-owned. Existing React best-practices checklist applied: static server page content, a small disclosure-only client boundary, stable keys, semantic controls and no data-fetching waterfalls or new dependencies.

## Task Commits

1. Task 27-06-01 RED: `8bd86291` — `test(27-06): specify plans and places About explanation`.
2. Task 27-06-01 GREEN: `58ecf311` — `feat(27-06): connect activity plans with host spaces`.
3. Task 27-06-02 RED: `69c5096a` — `test(27-06): specify stacked accessible audience FAQ`.
4. Task 27-06-02 GREEN: `1e959b9c` — `feat(27-06): answer Players and Hosts with accessible disclosures`.
5. Task 27-06-03 RED: `7a7bdd0b` — `test(27-06): specify marketing crawl and share metadata isolation`.
6. Task 27-06-03 GREEN: `5b91ca18` — `feat(27-06): isolate marketing crawl resources and share metadata`.

## Verification

All verification commands ran sequentially; no packages, migrations, live provider calls or deployments occurred.

| Check | Result |
|---|---|
| About rendered-content/canonical target | 2/2 passed; Vitest 1.93s |
| FAQ plus existing legal-copy contract | 31/31 passed, 2 files; Vitest 2.18s |
| Metadata exports/resources/preview/policy | 6/6 passed; final rerun 1.00s |
| Final focused About/FAQ/metadata/shell/Home/audiences/legal matrix | 56/56 passed, 7 files; Vitest 5.18s, command 6.02s |
| Scoped ESLint, all 15 changed source/test files | Exit 0, 5.14s; modified metadata test rechecked after type fix |
| Installed Next typegen | Exit 0, 0.81s; canonical route types generated |
| TypeScript noEmit | Final exit 0, 9.71s |
| Scoped diff whitespace and stub scan | Clean diff; no TODO/FIXME/placeholder/coming-soon stubs; no file deletions |

The final matrix emitted jsdom's existing "navigation to another Document" diagnostic when an existing navigation interaction fired; all tests passed. Browser keyboard behavior, actual nested metadata HTTP and rendered OG/file-priority behavior are the planned integration work in 27-08, not claimed here. Contact page/form is the next plan.

## TDD Gate Compliance

Each task followed intentional assertion RED, committed test/scaffold, then passing GREEN. About failed zero H1 versus one; FAQ failed absent sections versus Players/Hosts; sitemap failed empty versus six public destinations. Each persisted record returned `RED_EVIDENCE_OK` before implementation.

The installed Vitest tap-flat reporter omits Node TAP totals. Evidence retains raw output verbatim and transparently appends only actual non-SKIP result counts (one executed target, zero pass, one fail). Filtered-out tests were not source-level skips; all target files ran fully at GREEN. No refactor commit was necessary.

## Deviations from Plan

### Rule 3 — Installed robots convention requires an adapter

Installed `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/robots.md` specifies robots at app root; the installed matcher in `next/dist/lib/metadata/is-metadata-route.js` anchors robots to root. Added the orchestrator-authorized exact `src/app/marketing/robots.txt/route.ts` adapter that serializes the planned actual robots resource. Nested sitemap is explicitly supported by the installed sitemap guide and matcher, so no sitemap adapter was added. Resource route and preview cache behavior are tested; actual HTTP proof follows in 27-08. Commit: `5b91ca18`.

### Rule 2 — Explicit share metadata in existing marketing exports

Applied the task's requested explicit OG URLs and approved screenshot to existing marketing layout/Home/Hosts/Players exports, within the orchestrator's metadata-only authorization. Added a single helper to the existing shell test mock for its newly used absoluteMarketingUrl. Existing content/auth behavior was preserved. Commit: `5b91ca18`.

### Rule 1 — Corrected task-local test URL types

Typecheck found two direct origin reads on Next's `string | URL` metadataBase union in the new metadata test. Normalize through URL before asserting origin; final typecheck and targeted test/lint pass. Commit: `5b91ca18`.

### Execution coordination

Git metadata is read-only in the executor sandbox. Orchestrator performed exact ledger/staging/commits on dev after each RED/GREEN request, preserving unrelated dirty files. Executor did not edit STATE.md, ROADMAP.md or REQUIREMENTS.md; shared requirement completion remains pending live phase gates.

## Known Stubs

None in the completed plan artifacts. Contact is not scaffolded or claimed complete; Plan 27-07 must add its explicit /contact canonical and OG URL with this same approved screenshot. Sitemap deliberately reserves that approved public destination. Full host/browser/RSC/cache proof remains 27-08; account and live cutover gates remain 27-09. Payment, payout and legal HOLD is unchanged.

## Next Phase Readiness

27-07 must supply Contact metadata/form and real delivery behavior. 27-08 must prove public /robots.txt returns actual text through the namespace rewrite, nested /sitemap.xml serves XML, direct internal resources remain denied, exact previews do not crawl, each rendered marketing OG uses search.png over the inherited app opengraph route, and native FAQ toggles by Enter/Space in the real browser. No generated imagery or fabricated product states were added.

## Self-Check: PASSED

Verified the twelve created source/test/evidence artifacts exist, all six task commits exist, and the persisted ledger measures six commits. Focused tests, scoped ESLint and final TypeScript checks passed. The committed diff has no deletions; no blocking stubs or newly introduced unmodeled trust boundaries were found.
