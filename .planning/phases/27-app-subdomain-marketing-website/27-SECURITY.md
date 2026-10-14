---
phase: "27"
slug: app-subdomain-marketing-website
status: verified
threats_open: 0
asvs_level: 1
created: "2026-10-14"
register_authored_at_plan_time: true
source_revision: 1937320dd0d50b99b46a9a13268ae02a9eac3bbb
---

# Phase 27 security verification for Git integration

This is the ASVS L1 mitigation-presence audit required by the enabled shipping gate. It reads the authored threat models in plans 01–21 and the completed summaries, then reviews the integrated marketing UI source. It does not certify a new production cutover or turn the earlier PayMongo/Didit diagnostic limits into successful financial delivery proofs. The original 6bb closure and October 14 public Contact release remain dated evidence.

## Trust boundaries

| Boundary | Controls inspected |
|---|---|
| Request authority to marketing/app/Ops | Exact full authority parsing, distinct configured origins, unknown-host refusal, sanitized internal headers, existing Ops gateway and receiver method allowlists. |
| Untrusted browser to authentication/capability | Host-only sessions, exact trusted origins, safe relative callback paths, authenticated server actions, persisted staff-role exclusion. |
| Public Contact to mail/database | Exact Host/Origin, bounded strict body schema, trusted Vercel original IP, shared atomic quota, server-owned envelope, escaped body, private recipient, truthful provider acceptance and separate monitor. |
| Signed provider to application | Raw-body signature checks precede event handling; diagnostic source remains outside product routes. |
| Capture/seed to public assets | Synthetic-only reviewed screenshot manifest, licensed photo manifest, test database guard, exact nonproduction seed target, inert verification environment. |
| Local drafts/evidence to Git release | Clean continuity checkout, three reviewed UI cherry-picks, full exported-source correspondence, credential-pattern review, dated release evidence and explicit source distinction. |

## Authored threat register

All numbered threats below retain the severity and mitigation disposition from the original plans. “Closed” means the authored mitigation is present at L1 depth; historical live limitations remain in the release records.

| Threat | Severity | Component and inspected mitigation | Status |
|---|---|---|---|
| T-27-01 | high | `app-origins.ts` validates complete authorities; `proxy.ts` classifies Host without forwarded-host authority. | closed |
| T-27-02 | high | Proxy strips internal gateway markers; existing Ops gateway and staff guards enforce authorization. | closed |
| T-27-03 | high | `host-route-policy.ts` permits legacy reads with configured redirects, refuses mutations and directly preserves signed receiver methods. | closed |
| T-27-04 | high | `auth.ts` and origin policy keep explicit trusted origins, host-only cookies and legacy OAuth restart. | closed |
| T-27-05 | high | `legacy-auth-links.ts` and `safe-callback-url.ts` constrain endpoint bridging and callbacks. | closed |
| T-27-06 | high | Purpose-specific origin helpers and existing lifecycle callers keep app links separate; preview isolation and redacted evidence are retained. | closed |
| T-27-07 | high | PayMongo and Didit handlers verify raw signed payloads before acting; browser payment returns are not authority. | closed |
| T-27-08 | high | `actions/capability.ts` authenticates and rechecks persisted customer role in a transaction; marketing GETs do not grant capabilities. | closed |
| T-27-09 | high | Hosting intent uses the existing server action and safe callback path; capability fields remain input:false. | closed |
| T-27-10 | medium | Existing capability activation rate limits and pending UI remain unchanged. | closed |
| T-27-11 | high | Refreshed screenshot pixels have reviewed synthetic provenance, crops, hashes and no bearer-link parameters in the manifest. | closed |
| T-27-12 | medium | Screenshot manifest records real app state, fixture paths, capture dates, dimensions and approval. | closed |
| T-27-13 | high | Capture helpers enforce local test database safety; Preview seed refuses every target except its saved exact isolated branch/host. | closed |
| T-27-14 | medium | Audience copy preserves verification/payment conditions; reference venue photos make no inventory or partner claims. | closed |
| T-27-15 | high | CTAs/canonicals use server-built checked app/marketing origins and ordinary same-tab links. | closed |
| T-27-16 | medium | Marketing server components do not resolve a session; header receives only its checked app URL. | closed |
| T-27-17 | medium | About/FAQ contain bounded product descriptions and link to app/legal surfaces without invented company/payment claims. | closed |
| T-27-18 | medium | Metadata uses visible paths and Preview noindex; implementation namespace remains denied except exact public assets. | closed |
| T-27-19 | high | `contact.ts` requires exact Host/Origin and one valid platform-original IP on recognized Vercel topology; forwarded client hints are not authoritative. | closed |
| T-27-20 | high | Strict schema rejects control characters/unknown fields and mismatched emails; mail has fixed recipient/subject and escaped paragraphs. | closed |
| T-27-21 | high | 16KiB streaming bound, honeypot, process defense, atomic shared 5/15-minute IP and 100/hour global budgets, fail-closed errors. | closed |
| T-27-22 | high | No Contact body/dev log; transport failures return generic errors; private recipient removed from rendered Contact and shared footer. | closed |
| T-27-23 | medium | Success requires Resend acceptance; original inbox/Reply-To/reply attestation and later public delivery/monitor observations remain separately dated. | closed |
| T-27-24 | high | Existing host-only session and HTML/RSC/cache boundary checks remain; UI styling is scoped with marketing-prefixed selectors. | closed |
| T-27-25 | high | Release inventory, exact source/alias records and rollback packets retain observed values and honest gaps. | closed |
| T-27-26 | high | Compatibility-first release, disabled recovery and bounded Contact controls remain documented; no cutover occurs in this push. | closed |
| T-27-27 | high | Before/after account-setting readback and exact deployment/alias ownership are recorded in the accepted release results. | closed |
| T-27-28 | high | Staff/customer session proofs and redacted receipt evidence are retained; test accounts are preserved per owner direction. | closed |
| T-27-29 | high | Shared quota exhaustion, scheduled alert/deduplication, guarded inquiry, and public sending/healthy monitor proofs remain individually source-bound. | closed |
| T-27-30 | medium | Closure distinguishes original live evidence from configuration-only public release and this later UI integration. | closed |

Plans 10–21 also author repeated release threats in prose. They are covered by the following explicit register additions rather than ignored because they lacked numbered table rows.

| Threat | Severity | Inspected mitigation | Status |
|---|---|---|---|
| T-27-S1: weakened tests or fabricated source proof | high | Prior gates and fingerprint remain; new UI source has its own export/check records and closure addendum. Earlier 588 and 6bb observations keep their original source identities. | closed |
| T-27-S2: quota bypass/privacy leakage | high | Transaction advisory lock, database wall clock, HMAC-only IP keys, expiry cleanup, validation of retained quota state, and separate scheduled alert controls. | closed |
| T-27-S3: test-to-production crossing | high | Verification wrapper uses only fitout_test on loopback and empty/inert providers; seed target is pinned; push targets a feature branch and PR targets dev. | closed |
| T-27-S4: removing money code or colliding migrations | high | UI overlay preserves all latest release source, including financial code, journal and 0037/0038 migrations; only material-field constants move into a pure client-safe module and remain re-exported. | closed |
| T-27-S5: staff/internal endpoint exposure | high | Latest source guards and receiver allowlists remain; five photo paths allow GET/HEAD only on app/marketing, with Ops/unknown hosts and photo manifests denied. | closed |

## Accepted risks and limits

No new risk acceptance or waiver is introduced. Independent checkout/payout/binding-terms holds, the unproved successful LIVE PayMongo delivery/public-key attribution, and the historic Didit packet overrun remain in their original gap records. The owner's later explicit public Contact authorization supersedes historical keep-disabled instructions for Contact only. This Git operation does not change provider configuration, accounts, production aliases or the live Contact flag.

## Audit trail and sign-off

| Date | Depth | Register | Closed | Open | Auditor |
|---|---|---|---|---|---|
| 2026-10-14 | ASVS L1 mitigation-presence | 30 authored table threats + 5 prose threats | 35 | 0 | Codex primary agent, inline review |

- [x] All authored threats have a mitigation disposition and inspected control.
- [x] No newly accepted risks.
- [x] `threats_open: 0` and `status: verified` represent this L1 audit.
- [x] React review: server-only data/origins stay off client components; header hydration, ARIA disclosure, Escape focus return, explicit image dimensions/sizes and reduced-motion behavior remain.

Branch regression results are recorded separately in the shipping note. L1 closure does not imply a fresh successful provider financial event or a new deployment.
