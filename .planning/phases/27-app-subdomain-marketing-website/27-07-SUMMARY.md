---
phase: 27-app-subdomain-marketing-website
plan: "07"
subsystem: contact
tags: [nextjs, zod, resend, react-hook-form, accessibility, security, playwright]
requires:
  - phase: 27-01
    provides: Checked marketing/app origins and isolated public route policy
  - phase: 27-05
    provides: Court marketing shell and genuine approved screenshots
  - phase: 27-06
    provides: Explicit marketing metadata contract and Contact destination handoff
provides:
  - Exact five-field accessible Contact form with recoverable delivery feedback
  - Bounded marketing-only inquiry endpoint with truthful Resend acceptance
  - Fixed support-recipient mail composition, validated sender Reply-To and escaped paragraphs
affects: [27-08, 27-09]
tech-stack:
  added: []
  patterns: [Shared strict bounded schema, exact ingress checks, Contact-only provider acceptance, process-local defense in depth]
key-files:
  created:
    - src/lib/validation/contact.ts
    - src/lib/contact.ts
    - src/app/api/contact/route.ts
    - src/components/marketing/contact-form.tsx
    - src/app/marketing/contact/page.tsx
    - tests/contact/contact-route.test.ts
    - tests/contact/contact-form.test.tsx
    - tests/contact/contact-mail.test.ts
    - e2e/marketing-contact.spec.ts
    - .planning/phases/27-app-subdomain-marketing-website/27-07-01-RED.json
    - .planning/phases/27-app-subdomain-marketing-website/27-07-02-RED.json
    - .planning/phases/27-app-subdomain-marketing-website/27-07-03-RED.json
  modified:
    - src/lib/email.ts
    - tests/design/marketing-metadata.test.ts
    - tests/helpers/email-fixtures.ts
    - tests/auth/email-injection.test.ts
key-decisions:
  - Production Contact remains disabled unless CONTACT_PRODUCTION_ENABLED is exactly true after verified external controls.
  - Only recognized Vercel deployment topology may trust the controlled original-client single-IP header; exact local marketing uses one isolated identity.
  - Contact requires a nonempty Resend acceptance ID; transactional delivery defaults and Reply-To remain unchanged.
  - Strict Contact inputs and fixed support recipient require dedicated transport tests rather than generic transactional preview substitution.
requirements-completed: []
requirements-addressed: [CONTACT-01, MKT-01, DOMAIN-01]
coverage:
  - id: CONTACT_BOUNDARY
    description: Exact marketing origin, bounded parsing/validation/abuse budgets and truthful mail acceptance
    requirement: CONTACT-01
    verification:
      - kind: unit
        ref: tests/contact/contact-route.test.ts
        status: pass
      - kind: unit
        ref: tests/contact/contact-mail.test.ts
        status: pass
    human_judgment: false
  - id: CONTACT_FORM
    description: Five approved fields, accessible validation, pending deduplication and retained failure values
    requirement: MKT-01
    verification:
      - kind: unit
        ref: tests/contact/contact-form.test.tsx
        status: pass
      - kind: e2e
        ref: e2e/marketing-contact.spec.ts
        status: pass
    human_judgment: false
  - id: CONTACT_METADATA
    description: Sixth actual marketing page exports its visible canonical and approved social screenshot
    requirement: DOMAIN-01
    verification:
      - kind: unit
        ref: tests/design/marketing-metadata.test.ts
        status: pass
    human_judgment: false
  - id: LIVE_CONTACT
    description: External abuse-control verification and real inbox receipt/Reply-To proof remain Plan 27-09 gates
    requirement: CONTACT-01
    verification: []
    human_judgment: true
    rationale: Mocked provider responses and local browser fixtures cannot prove deployment-wide controls or real inbox arrival.
actuals:
  tokens: 20300
  tasks: 3
  commits: 6
plan_head_before: 6ff4391320edee6294f1cfa128084efcbdf97cec
duration: 15m05s first-RED-artifact to final task verification; required reading additional
completed: 2026-10-09
status: complete
---

# Phase 27 Plan 07: Safe, Recoverable Contact Summary

**Marketing Contact sends bounded validated inquiries through the existing support mail transport, with accessible recovery and success only after real provider acceptance.**

## Performance

- First persisted RED record: 2026-10-08T19:11:14Z. Final task commit/artifact verification: 2026-10-08T19:26:19Z. Measured interval: 15m05s; mandatory reading preceded it and no dispatch start clock was recorded.
- Three tasks, sixteen committed source/test/evidence artifacts before this summary.
- Actual tokens use committed scoped diff characters divided by four, rounded up: 20,300. Includes RED evidence records on the estimate's chars/4 scale.
- Six RED/GREEN commits measured from the persisted per-plan ledger before the separate summary commit.

## Accomplishments

- Shared strict Zod schema validates trimmed bounded name, normalized matching emails, optional printable phone with 7–15 digits, bounded multiline message and empty honeypot. Controls are checked before trimming header-bound inputs. Unknown envelope/subject fields are rejected. Message text enters the existing renderer as raw paragraphs, with HTML escaping at its established sink and literal text/plain output.
- POST /api/contact requires the exact configured marketing Host and Origin, including scheme/port, with no CORS allowance. JSON content type, declared length and streamed bytes are bounded; oversized streams are canceled at 16KiB. Invalid bodies, mismatched emails and nonempty honeypots are truthful rejections.
- Only VERCEL=1, a recognized production/preview environment and a valid VERCEL_URL deployment authority enable trust in x-vercel-forwarded-for. It must be one valid IP; missing, malformed or chained values fail closed. Forwarded Host/XFF do not establish authority or identity. Nondeployed exact configured localhost marketing uses a fixed isolated identity; remote unknown ingress fails closed.
- Existing hard-bounded limiter receives SHA-256 IP/sender keys, with 5 attempts/15 minutes per IP, 3/hour per sender and 100/hour per process. These are explicitly process-local defense in depth, with bounded Retry-After feedback. They are never described as global protection. Production Contact defaults disabled/503 until the external controls packet is verified and enablement deliberately set.
- Contact reuses the sole Resend sender with existing From, sole SUPPORT_EMAIL recipient and fixed subject. Only the validated sender becomes Contact Reply-To. Development body logging is denied. Missing config, returned/thrown provider errors and absent provider acceptance ID cannot produce delivered success. Provider details and inquiry PII are omitted from logs/responses. Transactional Reply-To/default behavior remains intact.
- Client uses the existing RHF/Zod/Form/Input/Textarea/Button primitives in the exact Name, Email, Confirm Email, optional Mobile Number, Message order. Errors focus the first invalid field and preserve values; pending uses a synchronous in-flight guard plus disabled submit and aria-busy. Success is announced only for 200 with ok:true, followed by an explicit write-another reset action. Honeypot is hidden from keyboard and assistive technology. Contact has one H1, its /contact canonical and explicit approved search.png OG metadata.

## Task Commits

1. Task 27-07-01 RED: `3e328c0c` — `test(27-07): specify bounded marketing Contact delivery`.
2. Task 27-07-01 GREEN: `9c5d21ed` — `feat(27-07): enforce truthful bounded marketing Contact delivery`.
3. Task 27-07-02 RED: `475de70d` — `test(27-07): specify accessible recoverable Contact form`.
4. Task 27-07-02 GREEN: `d1813940` — `feat(27-07): add accessible recoverable marketing Contact form`.
5. Task 27-07-03 RED: `f68fddc5` — `test(27-07): prove Contact transport acceptance and browser recovery`.
6. Task 27-07-03 GREEN: `45f22f09` — `fix(27-07): require provider acceptance and prove Contact recovery`.

## Verification

| Check | Result |
|---|---|
| Task 01 route + existing email injection/dev fallback | 218/218 passed |
| Task 02 form interactions | 15/15 passed |
| Actual six-page canonical/OG metadata exports | 6/6 passed |
| Final combined route/form/mail and existing email regressions | 244/244, 5 files, exit 0; final Vitest 4.56s |
| Marketing Contact Chromium | 7/7, final exit 0; 2.2m reported |
| Scoped ESLint, all 13 changed source/test files | Final exit 0 |
| Installed Next canonical typegen | Exit 0 |
| Final TypeScript noEmit, alone after browser exit | Exit 0 |
| Scoped diff whitespace/deletion/stub checks | Clean; no deletions or blocking stubs |

Main Vitest preflight and leak reports used the isolated fitout_test database and reported no escaped writes. Explicit local app/marketing/ops origins were supplied. Resend was mocked in unit tests and disabled in the browser server. Browser response fixtures are **simulated test transport UI evidence only**, not inbox delivery proof. The final browser test used the actual unconfigured server: 503, retained inquiry and no success announcement. No live inbox/provider request, package install, migration, deployment or payment/payout action occurred. Windows visual baselines were not collected; Linux visual and full host/RSC/cache gates belong to 27-08.

## TDD Gate Compliance

Each task had a persisted intentional assertion RED verified as RED_EVIDENCE_OK before implementation. Task 01 expected accepted Resend status 200 and observed scaffold 503. Task 02 expected five ordered fields and observed none. Task 03 expected delivered:false for absent provider acceptance and observed delivered:true. All three RED commits preceded GREEN. No refactor commit was needed.

Vitest tap-flat omits Node TAP totals. Evidence preserves raw output and transparently appends actual non-SKIP totals only: one executed target, zero passes, one failure. Filtered-out cases were runner selection, not source-level skipped tests; complete files ran at GREEN.

## Deviations from Plan

### Rule 1 — Require actual Contact provider acceptance

The new transport test exposed that error:null/data:null was treated as accepted mail. Added a Contact-only requireProviderAcceptance option and require a nonempty message ID. Existing transactional send defaults remain unchanged. Files: src/lib/email.ts and tests/contact/contact-mail.test.ts. Commit: `45f22f09`.

### Rule 3 — Correct transactional fixture type coverage

Adding an exported Contact sender made the derived generic SenderName union require its fixed-recipient, strictly validated argument shape in the transactional preview/adversarial fixture map. That harness substitutes every string and redirects its recipient; Contact must reject invalid emails and always target SUPPORT_EMAIL. Excluded only sendContactInquiry from that transactional union, documenting its dedicated full transport/injection coverage, and made the existing probe's title accurately say transactional senders. All legacy cases/assertions remain unchanged. Files: tests/helpers/email-fixtures.ts and tests/auth/email-injection.test.ts. Commit: `45f22f09`.

### Rule 1 — Task-local API/test compatibility corrections

Web Headers normalizes outer header whitespace, so the malformed-IP fixture now tests internal whitespace. Normalized heterogeneous optional test header types before creating Request headers. Wrapped RHF submission inside the event handler to satisfy the installed React ref-analysis lint rule without weakening the pending guard. Files: tests/contact/contact-route.test.ts and src/components/marketing/contact-form.tsx. Commits: `9c5d21ed`, `d1813940`, `45f22f09`.

### Rule 3 — Windows browser teardown and generated types

After all seven Chromium tests passed, Windows webServer teardown hung. Orchestrator verified and stopped only Next descendants 21008 → 18948 → 19568 beneath this run's root PID 17000; the runner remained alive and then exited 0. An ensuing isolated type check found malformed ignored .next/dev/types/routes.d.ts and validator.ts. After successful canonical typegen, verified ignore status and workspace containment, removed only those two generated files, and obtained final TypeScript exit 0.

### Execution coordination and gate ordering correction

Git metadata is read-only in the executor sandbox. Orchestrator performed each exact ledger/staging/commit request on dev, preserving unrelated dirty work. The executor did not edit STATE.md, ROADMAP.md or REQUIREMENTS.md. A preliminary tsc process mistakenly overlapped the browser startup; this was acknowledged and its result was not used as final verification. Final typegen, tsc, unit tests and lint ran sequentially after the browser exited. No remaining verification failure was concealed.

## Known Stubs

None. Production disablement is the planned safety gate, not a fake delivery implementation. CONTACT-01 and shared phase requirements remain uncompleted pending external/live phase evidence.

## Next Phase Readiness

27-08 owns full app/marketing/ops host policy, RSC/cache, browser metadata/crawl and Linux visual integration. 27-09 owns verified external rate/WAF controls, topology/account evidence, production enablement, actual support inbox receipt and Reply-To/reply proof. Keep Contact disabled until those controls are verified. Existing eligibility, deriveBookable, legal and payment/payout HOLD remain unchanged.

Ingress source checked during implementation: [Vercel controlled original-client header](https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for). The deployed account/topology proof remains external evidence rather than a claim established by local mocks.

## Self-Check: PASSED

Verified all twelve created source/test/RED artifacts, the saved summary and all six task commits exist. Persisted ledger measures six commits from the recorded base; scoped realized diff measures 20,300 tokens on the plan's chars/4 scale. No tracked file deletions, unaddressed blocking stubs or unmodeled trust boundaries were introduced.
