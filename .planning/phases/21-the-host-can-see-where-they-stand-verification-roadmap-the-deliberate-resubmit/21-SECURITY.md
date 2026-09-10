---
phase: "21"
slug: "the-host-can-see-where-they-stand-verification-roadmap-the-deliberate-resubmit"
status: verified
threats_open: 0
asvs_level: 1
created: "2026-09-09"
---

# Phase 21 — Security

> ASVS Level 1 verification of the STRIDE registers authored in Plans 21-01 through 21-08.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Session/database → server-rendered host surfaces | Authenticated host identity constrains roadmap, listing, verification, payout, and review-history reads. | Host-owned status, timestamps, bounded reasons, listing lifecycle |
| Route and Server Action → database | Route ids and mutation input are independently authenticated, owner-scoped, and guarded against deleted rows. | Listing fields/photos and guarded review transitions |
| Database/operator text → client DOM | Stored reasons are minimized before serialization and rendered only as React text. | Host-readable bounded reason text |
| Server mutation result → client receipt | Only the committed guarded `flipped` result may authorize the one-way receipt latch. | Boolean transition result and bounded error text |
| Repository dependency/schema boundary | The phase may not add packages, schema changes, migrations, or a second review authority. | Manifests, lockfile, database schema, frozen transition helper |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation / Evidence | Status |
|-----------|----------|-----------|----------|-------------|-----------------------|--------|
| T-21-01 | Spoofing | readiness receipt | high | mitigate | `deriveBookable` remains the sole per-listing authority; exhaustive XOR/mixed-portfolio tests pass. | closed |
| T-21-02 | Tampering | stale/retry eligibility | high | mitigate | Shared grace/cooldown declarations and database-clock boundaries are covered in roadmap-state tests. | closed |
| T-21-03 | Information Disclosure | verification RSC payload | medium | mitigate | The roadmap projection carries only bounded host-readable status, reason, and timestamps. | closed |
| T-21-04 | Denial of Service | dashboard composition | medium | mitigate | The listing projection was replaced rather than supplemented; query-count/design contracts pass. | closed |
| T-21-05 | Elevation of Privilege | roadmap mutations | high | mitigate | Roadmap actions reuse independently authenticated/authorized shipped Server Actions. | closed |
| T-21-01-SC | Tampering | package installs | high | mitigate | Package manifests, lockfile, registry blocks, and shared primitives remain unchanged. | closed |
| T-21-06 | Information Disclosure | history IDOR/deleted rows | high | mitigate | `loadReviewHistoryByListing` binds host ownership and non-deleted parent scope inside SQL; A/B/deleted-row tests pass. | closed |
| T-21-07 | Information Disclosure | history DTO/RSC payload | high | mitigate | Explicit projections omit staff, review, host, and internal listing ids before client serialization. | closed |
| T-21-08 | Tampering | operator reason rendering | medium | mitigate | Markup-like fixtures are rendered as exact plain React text. | closed |
| T-21-09 | Denial of Service | per-listing history | medium | mitigate | One ranked grouped query is capped at six rows per parent, yielding five visible cycles plus a sentinel. | closed |
| T-21-02-SC | Tampering | package installs | high | mitigate | Existing PostgreSQL, Drizzle, and dialog primitives were reused; dependency files are unchanged. | closed |
| T-21-10 | Spoofing | rejected notice/query parameters | high | mitigate | Rejection context comes only from owner/deleted-bound SQL; forged, direct, and refreshed URL cases pass. | closed |
| T-21-11 | Elevation of Privilege | edit-page listing id | high | mitigate | Edit-page lookup binds session user id and `deletedAt IS NULL`, returning `notFound()` otherwise. | closed |
| T-21-12 | Tampering | material-field explanation | medium | mitigate | A total `Record<MaterialField, string>` is checked against the canonical tuple. | closed |
| T-21-13 | Information Disclosure | stored reason/client props | medium | mitigate | Only current host-readable state/reason crosses to the wizard; staff/internal fields are absent. | closed |
| T-21-03-SC | Tampering | package installs | high | mitigate | Existing Dialog/Card primitives were composed with no package or registry change. | closed |
| T-21-14 | Spoofing | re-review receipt | high | mitigate | Receipt requires server-derived rejected context and exact `flipped === true`; forged/generic/false/error cases pass. | closed |
| T-21-15 | Elevation of Privilege | field/photo Server Actions | high | mitigate | Session, ownership, and non-deleted predicates remain in every action; cross-host/deleted rows stay inert. | closed |
| T-21-16 | Tampering | mutation and review transition | high | mitigate | Guarded result is captured inside each existing transaction; the frozen transition helper hash is unchanged. | closed |
| T-21-17 | Repudiation | duplicate acknowledgement/cycles | medium | mitigate | Zero-row repeats return false; the client uses one latch/focus guard and database history assertions cover repeats. | closed |
| T-21-18 | Denial of Service | repeated host submissions | medium | mitigate | No standalone retry loop was introduced; initiating actions disable locally and the guarded update prevents duplicate cycles. | closed |
| T-21-19 | Information Disclosure | action errors/client results | medium | mitigate | Client results expose only a bounded actionable error and boolean; no SQL or internal identifiers cross. | closed |
| T-21-04-SC | Tampering | package/schema scope | high | mitigate | Final guards confirm unchanged package, lockfile, schema, migration, and frozen-authority scope. | closed |
| T-21-20 | Spoofing | responsive roadmap states | high | mitigate | The Plan 21-01 authority model is reused unchanged; browser snapshots assert state/action/XOR semantics. | closed |
| T-21-21 | Tampering | visual action ownership | medium | mitigate | Exactly one advancing control and explicit numbered order are asserted at both acceptance widths. | closed |
| T-21-22 | Information Disclosure | stored cause/error surface | medium | mitigate | Reasons remain React text with hostile/long fixtures; errors retain the bounded opaque contract. | closed |
| T-21-23 | Denial of Service | overflow/duplicate trees | low | mitigate | One CSS-reflowed tree with intrinsic wrapping passes 320px/1280px overflow checks in both themes. | closed |
| T-21-05-SC | Tampering | package installs | high | mitigate | Checked-in PanelCard, shadcn, Lucide, Vitest, and Playwright assets were reused; dependency files are unchanged. | closed |
| T-21-06-01 | Tampering | current-cycle history selection | high | mitigate | The first rejected row is tracked independently from its nullable reason; null/blank real-database regressions pass. | closed |
| T-21-06-02 | Elevation of Privilege | review-history SQL scope | high | mitigate | The owner and non-deleted predicates remain inside the review-history SQL, with cross-owner/deleted coverage. | closed |
| T-21-06-03 | Information Disclosure | history DTO and dialog text | medium | mitigate | The projection omits staff/internal fields and renders optional reasons as React text only. | closed |
| T-21-06-04 | Denial of Service | per-listing history read | medium | mitigate | The single ranked query retains its six-row bound and five-visible-plus-sentinel contract. | closed |
| T-21-06-SC | Tampering | package installs | high | mitigate | No manifest, lockfile, schema-config, or migration drift occurred. | closed |
| T-21-07-01 | Elevation of Privilege | payout onboarding authorization | high | mitigate | `startPayoutOnboarding` re-reads `canHost`, audits and denies before any payout-account or onboarding-link operation; a booker-only regression proves no row or provider call occurs. | closed |
| T-21-07-02 | Spoofing | success-only redirect branch | high | mitigate | Client navigation occurs only for the explicit successful result; thrown and refusal paths remain inline errors. | closed |
| T-21-07-03 | Denial of Service | rejected payout-onboarding promise | medium | mitigate | The transition catches failures, shows bounded fallback copy, and preserves one retry control. | closed |
| T-21-07-04 | Tampering | stale client failure state | medium | mitigate | Each attempt clears the preceding error and replaces it only with the current authoritative result. | closed |
| T-21-07-SC | Tampering | package installs | high | mitigate | No manifest, lockfile, schema-config, or migration drift occurred. | closed |
| T-21-08-01 | Tampering | host-readable roadmap copy layout | medium | mitigate | React text and long-token wrapping remain intact; Chromium measures every body/action rectangle in both themes and widths. | closed |
| T-21-08-02 | Denial of Service | advancing roadmap CTA | medium | mitigate | The redundant inner height claim is removed and geometry checks reject clipped CTA/card content. | closed |
| T-21-08-03 | Spoofing | browser acceptance signal | medium | mitigate | State/action assertions and contextual numeric bounds prevent visibility or equal-height alone from passing. | closed |
| T-21-08-SC | Tampering | package installs | high | mitigate | No manifest, lockfile, schema-config, or migration drift occurred. | closed |

*All threats were dispositioned at plan time. At ASVS Level 1, the implemented controls and passing focused/browser evidence close every registered threat.*

---

## Accepted Risks Log

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-09 | 28 | 28 | 0 | Codex / GSD ASVS L1 closure hook |
| 2026-09-10 | 42 | 42 | 0 | Codex / GSD remediation re-audit |

---

## Sign-Off

- [x] All threats have a disposition
- [x] No accepted risk requires documentation
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-09
