---
phase: 27-app-subdomain-marketing-website
plan: "05"
subsystem: ui
tags: [nextjs, react, court, marketing, accessibility, vitest]
requires:
  - phase: 27-01
    provides: Checked marketing/app origins and internal marketing rewrite
  - phase: 27-03
    provides: Existing hosting-intent entry and authentication resume
  - phase: 27-04
    provides: Seven inspected genuine app screenshots with safe provenance
provides:
  - Session-free Court marketing shell with six ordered public destinations
  - Centered shared-audience Home with equal marketing entries and real product captures
  - Four illustrated host steps and three illustrated player steps with checked same-tab app handoffs
affects: [27-06, 27-07, 27-08, 27-09]
tech-stack:
  added: []
  patterns: [server-owned checked URLs, header-only client disclosure, semantic ordered illustrated steps]
key-files:
  created:
    - src/app/marketing/layout.tsx
    - src/components/marketing/header.tsx
    - src/components/marketing/footer.tsx
    - src/components/marketing/audience-steps.tsx
    - src/app/marketing/hosts/page.tsx
    - src/app/marketing/players/page.tsx
    - tests/design/marketing-shell.test.tsx
    - tests/design/marketing-home.test.tsx
    - tests/design/marketing-audiences.test.tsx
    - .planning/phases/27-app-subdomain-marketing-website/27-05-01-RED.json
    - .planning/phases/27-app-subdomain-marketing-website/27-05-02-RED.json
    - .planning/phases/27-app-subdomain-marketing-website/27-05-03-RED.json
  modified:
    - src/app/marketing/page.tsx
key-decisions:
  - Marketing pages and footer stay server components; only the header disclosure is interactive and receives one checked app URL.
  - Home uses identical audience action recipes and balanced genuine search/verification panels with existing Court fonts and type tokens.
  - Captions distinguish local demo approval and unpaid booking review from live readiness; listing imagery names the actual draft edit wizard.
requirements-completed: []
requirements-addressed: [MKT-01, MKT-02, MKT-03]
coverage:
  - id: D1
    description: Ordered public navigation, accessible disclosure, same-tab Open App and app legal links
    requirement: MKT-01
    verification:
      - kind: unit
        ref: tests/design/marketing-shell.test.tsx
        status: pass
    human_judgment: false
  - id: D2
    description: Centered Court Home, equal player/host entries and approved screenshot provenance
    requirement: MKT-02
    verification:
      - kind: unit
        ref: tests/design/marketing-home.test.tsx
        status: pass
      - kind: unit
        ref: tests/design/marketing-assets.test.ts
        status: pass
    human_judgment: false
  - id: D3
    description: Exact four/three illustrated audience journeys with checked app entry and honest gates
    requirement: MKT-03
    verification:
      - kind: unit
        ref: tests/design/marketing-audiences.test.tsx
        status: pass
    human_judgment: false
  - id: D4
    description: Court appearance and full responsive/browser navigation acceptance
    verification: []
    human_judgment: true
    rationale: Full viewport, visual, actual keyboard and cross-host browser checks are assigned to plan 27-08; user acceptance remains pending.
actuals:
  tokens: 11336
  tasks: 3
  commits: 6
plan_head_before: 44737d4955fba5babbac44c409bf80d00f1f2f36
duration: "13min implementation, excluding initial context preparation"
completed: 2026-10-09
status: complete
---

# Phase 27 Plan 05: Court Marketing Home and Audience Journeys Summary

**Session-free Court navigation, a centered shared-audience Home with real screenshots, and honest illustrated host/player journeys with checked same-tab app entry.**

## Performance

- Three implementation tasks complete; each has a separate intentional RED and passing GREEN commit.
- First RED scaffold: 2026-10-08T18:34:17Z. Final checks: 2026-10-08T18:47:08Z (2026-10-09 Asia/Manila).
- Thirteen owned task artifacts: ten source/test files and three RED evidence records.
- Actual tokens are 45,344 realized diff characters divided by four. Six task/TDD commits are measured from the persisted plan ledger before this separate documentation commit.

## Accomplishments

The marketing layout explicitly binds Court and sets marketing metadata authority. The header exposes Home, Hosts, Players, About, FAQ and Contact in the agreed order using their visible public paths. Its mobile disclosure has a native button, expanded state, a controlled navigation region, ordinary ordered links, Escape dismissal and trigger-focus restoration. Open App is an independent same-tab anchor to a server-built app root. The footer reads SITE_TAGLINE, keeps Contact as the primary contact route and links Terms/Privacy to the app authority. The shell reads neither sessions nor database data.

Home retains “Good plans need a place.” as its one centered H1. Both audience choices use the same Court button treatment and lead to their marketing pages. Balanced panels show the actual search and outstanding host-verification captures, with meaningful alt text, recorded intrinsic dimensions, responsive sizes and appropriate eager/lazy loading. Copy describes finding courts, gyms and studios and preparing host spaces without fabricated adoption or approval claims.

Hosts has exactly four ordered illustrated steps: account, verification/payout setup, listing preparation and bookability. Copy retains recipient confirmation, email verification, host approval, listing review, publication and operating-hours checks. Players has exactly three: progressive activity/location/group search, available-session selection and booking review. Browse-first behavior is explicit; sign-in occurs when needed to book. Both CTAs use checked app URLs and the same tab. The booking capture is described as unpaid review, and the listing capture as a real draft in the existing edit wizard.

## Task Commits

| Task | RED | GREEN |
|---|---|---|
| 27-05-01 — marketing shell | `f1030e44` | `cd9b5b8e` |
| 27-05-02 — balanced genuine Home | `b40ae33f` | `ee187fe7` |
| 27-05-03 — honest audience journeys | `7010e50d` | `9980e379` |

Shared STATE.md, ROADMAP.md and REQUIREMENTS.md remain orchestrator-owned. The addressed IDs are not marked complete: supporting pages, browser engineering checks and live evidence remain dependent work.

## Verification

| Check | Result |
|---|---|
| Shell task | 6/6 passed |
| Home plus asset contract | 7/7 passed |
| Audience plus asset contract | 10/10 passed |
| Final four focused marketing test files | 20/20 passed, exit 0, 3.35s |
| Scoped ESLint on all ten owned source/test files | Exit 0, no warnings |
| Installed Next typegen | Exit 0, generated route types successfully |
| TypeScript `tsc --noEmit` | Exit 0 |
| Owned diff whitespace check | Passed |
| Product stub scan | No TODO, FIXME, placeholder or null scaffold remains |

Tests prove destination order, same-tab attributes, mobile disclosure state, Escape/focus return, focus/touch classes, metadata authority, session-free source boundary, equal audience entries, image order/dimensions/alt text, step count/order, demo provenance and honest readiness wording. jsdom prints its expected unimplemented document-navigation notice on the link-selection test; the assertion run still passes. Actual navigation is a downstream browser check, not claimed by these DOM tests.

Frontend-design and React best-practices review was scoped to the owned components. The design follows the selected B composition and existing Court palette, Geist font aliases and named display/heading/body/label recipes. Review confirms stable keys, a small header-only client boundary, a single serialized checked URL, event-driven menu state without fetching/effects, native controls, shared focus recipes, semantic headings/lists and dimensioned local images. No new palette/font/package, provider call, schema or deployment change was introduced.

## TDD Gate Compliance

All three named RED assertions failed on their intended missing behavior before implementation and passed `check tdd-red-evidence` with `RED_EVIDENCE_OK`: missing public navigation, zero Home screenshots, and missing host ordered steps. Temporary importable scaffolds were committed with RED and fully replaced with GREEN. The existing Home tracer provided the second task's genuine RED baseline.

Each evidence JSON retains the real `tap-flat` reporter output. As in prior plans, the installed reporter omits footer counts required by GSD's classifier; the documented adapter appends the actual executed non-SKIP counts (one test, zero passes, one failure). No error or result was invented. Filtered tests are not source-level skips; all final tests ran. No separate refactor commit was necessary.

## Deviations from Plan

**1. [Rule 3 — Blocking] Delegated narrow Git writes.** Executor Git metadata is read-only; the orchestrator created the ledger and exact task commits. During the second RED commit it found an empty stale index lock, confirmed no active Git writer with the executor, preserved the lock under a local backup name and retried successfully. No unrelated dirty files were staged or reverted.

**2. [Rule 1 — Bug] Corrected a task-local focus layer utility.** The initial skip link used a nonexistent `z-sticky` utility. The Home GREEN commit corrects it to the existing `z-(--z-sticky)` token recipe. The audience test's initial text query matched both explanatory copy and caption; anchoring it to the actual search-description sentence preserves the intended assertion. Final focused checks pass.

## Deferred Issues

The existing intermittent `/host/listings/new` 404 documented by 27-04 remains a required 27-08 creation-journey investigation. This plan uses the approved genuine draft-edit capture and names that actual surface; it does not claim successful listing-creation routing. No source-level skipped tests or unrun plan `<verify>` remain. Final viewport, browser, RSC/cache and visual acceptance are explicitly assigned to 27-08.

No authentication gate, new product stub or undeclared threat surface occurred. Checked CTA/canonical authority, truthful demo imagery/copy and session-free rendering address T-27-14/15/16. Payment, payout and legal HOLD remain unchanged.

## Next Phase Readiness

27-06 can consume the persistent shell to add About, FAQ and Contact presentation. 27-07 can wire real Contact delivery. 27-08 owns the complete six-page 320/375/768/1440px review, real keyboard/cross-host handoffs, browser cache/RSC matrix and known listing-creation issue. Existing Terms/Privacy content and live release status were not revised.

## Self-Check: PASSED

All thirteen task artifacts exist and all six listed task/TDD commits appear in Git history. The persisted ledger measures six commits from the recorded base. Final focused design, scoped lint, canonical type generation and TypeScript checks pass. Temporary scaffolds are gone, owned paths are clean, no tracked file was deleted and unrelated existing workspace edits remain preserved.
