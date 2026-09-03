---
phase: quick/260831-rpt
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - tests/notifications/confirmation-email.test.ts
  - src/lib/booking/policy-disclosure.ts
  - src/lib/db/schema.ts
  - src/lib/validation/notification.ts
  - src/lib/payments/confirm-booking-payment.ts
  - tests/booking/cancellation-policy.test.ts
  - src/lib/email.ts
  - src/inngest/functions/notify.ts
  - tests/helpers/email-fixtures.ts
autonomous: true
requirements: [TRUST-02, TRUST-03]

must_haves:
  truths:
    - "TRUST-02 — the confirmation email's SUBJECT line carries the FIT-XXXXXXXX booking reference (today it carries the space title only, src/lib/email.ts:141)."
    - "TRUST-03 — the confirmation email BODY discloses the cancellation policy with a concrete venue-local date, in BOTH the html and the text part."
    - "No percentage and no hour figure is typed anywhere in the email layer: the policy sentence is DERIVED from LADDER through composePolicyDisclosure + policySummaryLine (D-81), so a rung edit rewrites the email automatically."
    - "The policy sentence travels as a PRE-COMPOSED display string on the notify payload (D-86 / D-91 sufficiency rule) — the payload stays the sole input to both channels, with no raw Dates, no ids, no money-account data."
    - "The composition is server-side only, in the emitter's read (D-130 / GATE-05) — nothing moves client-side."
    - "GATE-06 holds: drizzle/ stays at 0025. notification.payload is jsonb, so the new key is a code-level change with no migration."
    - "D-78's boundary is respected: renderEmail and the email shell are untouched, and no send trigger is added, moved or removed (EMAIL-01/02/03 stay closed)."
    - "A pass whose day has already opened discloses PASS_NON_REFUNDABLE_MESSAGE, never a refund window that closed before purchase (WR-05 / T-09-88)."
    - "A null cancellation_policy snapshot (D-67) discloses NOTHING rather than a fabricated default — the email omits the clause entirely."
  artifacts:
    - path: "tests/notifications/confirmation-email.test.ts"
      provides: "The red-before/green-after evidence for both clauses"
      contains: "sendBookingConfirmed"
    - path: "src/lib/booking/policy-disclosure.ts"
      provides: "composePolicyEmailLine — the one owner of the emailed policy sentence"
      contains: "composePolicyEmailLine"
    - path: "src/lib/email.ts"
      provides: "sendBookingConfirmed with the reference in the subject and the policy in the body"
      contains: "policyLabel"
  key_links:
    - from: "src/lib/payments/confirm-booking-payment.ts"
      to: "src/lib/booking/policy-disclosure.ts"
      via: "composePolicyEmailLine in emitBookingConfirmed"
      pattern: "composePolicyEmailLine\\("
    - from: "src/inngest/functions/notify.ts"
      to: "src/lib/email.ts"
      via: "payload.policyLabel threaded into sendBookingConfirmed"
      pattern: "payload\\.policyLabel"
    - from: "src/lib/booking/policy-disclosure.ts"
      to: "src/components/booking/cancellation-policy-disclosure.tsx"
      via: "policySummaryLine — the SAME derivation the on-screen half renders"
      pattern: "policySummaryLine"
---

<objective>
Close TRUST-02 and TRUST-03 — the two confirmation-email clauses D-78 handed from Phase 13 to Phase 15,
and that neither phase executed (`.planning/v1.1-MILESTONE-AUDIT.md` § "The two that are genuinely open").

Purpose: the booking reference must be findable from an inbox search, and the cancellation policy must be
disclosed on the surface a booker actually keeps — with a concrete date, derived from the SAME ladder the
refund engine evaluates, so the promise in the inbox cannot drift from the money math.

Output: `sendBookingConfirmed` carries the FIT- reference in its subject and the policy sentence in both
projections of its body; the sentence is composed once, server-side, by the module that already owns the
on-screen half.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md

@src/lib/email.ts
@src/lib/booking/policy-disclosure.ts
@src/components/booking/cancellation-policy-disclosure.tsx
@src/inngest/functions/notify.ts
@src/lib/payments/confirm-booking-payment.ts
@tests/helpers/email-fixtures.ts
@tests/notifications/notify.test.ts
</context>

<interfaces>
<!-- Everything the executor needs. Extracted from the tree — do NOT go exploring for these. -->

From `src/lib/booking/policy-disclosure.ts` (PURE; `now` is an argument, never a clock read):
```ts
export type PolicyDisclosure = {
  tier: CancellationTier | null;
  boundaryLabels: string[] | undefined;   // index-aligned with LADDER[tier], venue-local
  bestRungIndex: number | undefined;      // -1 once every rung has lapsed
  windowAlreadyOpen: boolean;             // openCapacity && startsAt <= now
  openCapacity: boolean;
  todayRefundCents: number | null;
};
export type PolicyDisclosureInput = {
  tier: CancellationTier | null | undefined;
  startsAt: Date; now: Date; timezone: string; city: string | null;
  openCapacity: boolean; spacePriceCents: number; serviceFeeCents: number;
};
export function composePolicyDisclosure(input: PolicyDisclosureInput): PolicyDisclosure;
```

From `src/components/booking/cancellation-policy-disclosure.tsx` — PURE, NO JSX, both already exported:
```ts
export const PASS_NON_REFUNDABLE_MESSAGE: string;  // "The space is already open, so this pass can't be refunded if you cancel."
export function policySummaryLine(
  tier: CancellationTier,
  { openCapacity }: DeadlineAnchorInput,
  boundaryLabels?: readonly string[],
  bestRungIndex?: number,
): string;
// concrete mode + bestRungIndex >= 0 with a 100% rung -> `Free cancellation until ${boundaryLabels[i]}`
// concrete mode + bestRungIndex >= 0, lesser rung      -> `${bps/100}% refund until ${boundaryLabels[i]}`
// bestRungIndex === -1                                 -> `${TIER_LABELS[tier]} cancellation policy`  (NO date, deliberately)
```

From `src/lib/payments/cancellation.ts` (the test derives its expectation from these, never from a literal):
```ts
export const LADDER: Record<CancellationTier, { minHours: number; refundBps: number }[]>;
export function rungBoundaries(tier: CancellationTier, startsAt: Date): { boundary: Date; refundBps: number }[];
export function bestFutureRungIndex(tier: CancellationTier, startsAt: Date, now: Date): number;
```

From `src/lib/booking/when-label.ts`:
```ts
export function composeDeadlineLabel(instant: Date, timezone: string, city: string | null): string;
```

From `src/lib/booking/bookings-query.ts` — the DB clock, already exported, same `DbConn` type
(`@/lib/availability/read-model`) that `confirm-booking-payment.ts` uses:
```ts
export async function readDbNow(dbConn: DbConn): Promise<Date>;
```

From `src/lib/email-shell.ts`:
```ts
export function renderEmail(content: EmailContent): { html: string; text: string };
export function escapeHtml(s: string): string;   // the html part escapes; the text twin keeps raw strings
```

Current signature under change (`src/lib/email.ts:127`), and its ONE caller
(`src/inngest/functions/notify.ts:79`, the `booking_confirmed` case of `sendForType`):
```ts
sendBookingConfirmed(to, spaceTitle, whenLabel, reference, bookingUrl)
```

The emitter's existing SELECT (`src/lib/payments/confirm-booking-payment.ts:213-236`) ALREADY reads:
`timezone`, `city`, `startsAt`, `spacePriceCents`, `quotedTotalCents`, `currency`, `openCapacity`.
It does NOT yet read `booking.cancellationPolicy` or `booking.serviceFeeCents`.

Test harness: `tests/setup.ts` globally `vi.mock("resend", ...)` and forces a fake `RESEND_API_KEY`, so
`mockResend.last()` / `.sent()` capture `{ subject, html, text }` with NO database. `tests/auth/email-escaping.test.ts`
is the DB-free idiom to copy. `postgres()` in `src/lib/db/index.ts` is lazy, so importing
`@/inngest/functions/notify` opens no connection.
</interfaces>

<decisions>
Three calls this plan makes, stated rather than slipped in.

**D-RPT-01 — the notify payload gains an OPTIONAL `policyLabel`, and that widening is deliberate.**
`schema.ts` is explicit that the payload is the SOLE input to BOTH channels (the D-91 sufficiency rule):
"A field the email needs therefore belongs HERE, not in a second parallel structure." The email cannot
compose the disclosure itself — `composePolicyDisclosure` wants a `Date`, cents and a tz, and D-86 forbids
raw Dates and money internals on the payload. So the emitter composes a finished display string, exactly as
`payByLabel` / `respondByLabel` / `refundLabel` already do. OPTIONAL rather than required, mirroring
`feeLabel`'s CR-01 precedent: absence means "there is no policy to disclose" (a null D-67 snapshot), which is
a real state, not a missing value. Durable pre-existing rows are never re-validated, so old rows are unaffected,
and `notification-item.tsx`'s exhaustive switch is untouched by an added optional field.

**D-RPT-02 — `src/lib/booking/policy-disclosure.ts` imports `policySummaryLine` from the component module.**
That function is the ONE derivation of the summary sentence from `LADDER`, and constraint 1 of this task is
that the email must not carry a second one. The import is safe and checked: the component file has no
`"use client"`, `policySummaryLine` performs no JSX and no date math, and the component imports only
`@/lib/payments/cancellation` — so there is NO import cycle. Lint permits it (`eslint.config.mjs` has no
`no-restricted-imports` boundary), and `src/lib/booking/bookings-query.ts` already imports from `@/components`.
REJECTED alternative: re-deriving the sentence in lib — that is precisely the drift constraint 1 forbids.
DEFERRED alternative (correct long-term, out of quick scope): move `policySummaryLine`/`policyDisclosureLines`/
`PASS_NON_REFUNDABLE_MESSAGE` into lib and re-export from the component. Record it in the SUMMARY as a
follow-up; it touches a Phase-13 component and two Phase-13 test files.

**D-RPT-03 — ZERO migrations, and it was checked rather than hoped.** `notification.payload` is
`jsonb("payload").$type<NotificationPayload>()` (schema.ts:619), so a new key is a TypeScript + Zod change
with no DDL. `drizzle/` stays at `0025_audit_resolved_by.sql`. GATE-06 holds. If any step in this plan turns
out to want DDL, STOP and raise it — do not absorb it.
</decisions>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: The red — a failing test for both clauses, written against today's exports</name>
  <files>tests/notifications/confirmation-email.test.ts</files>
  <behavior>
    Every assertion below is expressible against exports that EXIST TODAY, so this file is a genuine
    assertion-level red rather than a module-resolution error. Nothing here imports anything this plan
    creates.

    - Subject (TRUST-02): `mockResend.last()!.subject` contains the FIT- reference passed to the send.
      RED today — the subject is `Your FitOut booking is confirmed — ${spaceTitle}` (email.ts:141).
    - Body, text part (TRUST-03): `mockResend.last()!.text` contains the expected policy sentence.
      RED today — `paragraphs` is one sentence with no policy clause (email.ts:136-138).
    - Body, html part (TRUST-03): `mockResend.last()!.html` contains `escapeHtml(expected)`. RED today.
    - The expected sentence is DERIVED, never typed: build `boundaryLabels` from
      `rungBoundaries(tier, startsAt).map(r => composeDeadlineLabel(r.boundary, TZ, CITY))`, the index from
      `bestFutureRungIndex(tier, startsAt, now)`, then `expected = policySummaryLine(tier, { openCapacity: false },
      boundaryLabels, bestRungIndex)`. A hand-typed expectation would make this test pass while the copy drifts.
    - Concreteness guard: assert `expected` contains `boundaryLabels[bestRungIndex]` AND that
      `bestRungIndex >= 0`, so the fixture provably exercises a DATED rung. This one is green today and is
      not evidence — it is the guard that keeps the two reds above meaningful.
    - Fan-out (TRUST-03 wiring): drive `sendForType({ type:"booking_confirmed", email, bookingId:null,
      recipientId, payload: { …, policyLabel: expected } })` and assert the sentence reaches `.text`.
      RED today — `sendForType` never reads such a field. No DB is touched.
  </behavior>
  <action>
Create `tests/notifications/confirmation-email.test.ts` following the `tests/auth/email-escaping.test.ts`
idiom (plain vitest + `mockResend` from `../helpers/mocks`; NO `setupTestDb`, NO Inngest runtime) and the
`copy()` / `confirmedPayload()` helper shapes from `tests/notifications/notify.test.ts`.

Header comment must state: this file is the TRUST-02 / TRUST-03 evidence D-78 handed from Phase 13 to
Phase 15 and neither phase executed; both reds were WATCHED before the implementation existed.

Fixtures: ABSOLUTE literal instants only — never `new Date()`. Use `startsAt = new Date("2026-09-12T10:00:00.000Z")`
and `now = new Date("2026-09-01T02:00:00.000Z")` (eleven days out, so every tier has a future rung),
`TZ = "Asia/Manila"`, `CITY = "Manila"`, `REFERENCE = "FIT-8QK2M4RA"`, tier `"standard"`.

Import ONLY from: `@/lib/email` (sendBookingConfirmed), `@/inngest/functions/notify` (sendForType),
`@/lib/payments/cancellation` (rungBoundaries, bestFutureRungIndex), `@/lib/booking/when-label`
(composeDeadlineLabel), `@/components/booking/cancellation-policy-disclosure` (policySummaryLine),
`@/lib/email-shell` (escapeHtml), `../helpers/mocks` (mockResend).

Call `sendBookingConfirmed` with the CURRENT five arguments in this task — the sixth is added in Task 3,
and calling with five keeps this file compiling under `npx tsc --noEmit` both before and after the change.
For the `sendForType` case, build the payload through a local helper that casts
`as NotificationPayload` (the notify.test.ts idiom) so the not-yet-widened union does not block the red.

Assert on `.text` for sentences and on `escapeHtml(expected)` for `.html` — the plain-text twin is the
honest place to assert copy (notify.test.ts's `copy()` header explains why an apostrophe reaches the html
part as `&#39;`).
  </action>
  <verify>
    <automated>npx vitest run tests/notifications/confirmation-email.test.ts</automated>
    <expect>NON-ZERO exit. Record the failure output in the SUMMARY. The named failures MUST be: (a) subject does not contain FIT-8QK2M4RA; (b) text does not contain the derived policy sentence; (c) html does not contain its escaped form; (d) sendForType's email does not carry the sentence. If ANY of the four passes at this point, the assertion is not measuring what it claims — fix the test, do not proceed.</expect>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <done>The file exists, runs, and fails on all four clause assertions while the concreteness guard passes and `npx tsc --noEmit` is clean. The red is recorded verbatim in the SUMMARY.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: The one owner — composePolicyEmailLine, the payload field, and the emitter's read</name>
  <files>src/lib/booking/policy-disclosure.ts, src/lib/db/schema.ts, src/lib/validation/notification.ts, src/lib/payments/confirm-booking-payment.ts, tests/booking/cancellation-policy.test.ts</files>
  <behavior>
    New cases in `tests/booking/cancellation-policy.test.ts` (the file that already drives
    `composePolicyDisclosure` against the ladder), all derived from `LADDER`, none hand-typed:
    - A future-rung booking: `composePolicyEmailLine(input)` equals `policySummaryLine(tier, { openCapacity },
      boundaryLabels, bestRungIndex)` for the same input — i.e. the email and the screen state the SAME sentence.
    - `tier: null` (D-67 null snapshot) returns `null` — the email discloses nothing rather than a default.
    - `openCapacity: true` with `startsAt <= now` returns `PASS_NON_REFUNDABLE_MESSAGE` — never a refund
      window that closed before purchase (WR-05 / T-09-88).
    - All rungs lapsed (`bestFutureRungIndex === -1`) returns the tier-name fallback and contains NO date —
      pinning that the email never promises a window the engine will not honour.
    Red-watch: add these cases and run the file BEFORE writing the function body. They fail on the missing
    `composePolicyEmailLine` export. Record that output, then implement.
  </behavior>
  <action>
**(a) `src/lib/booking/policy-disclosure.ts` — add `composePolicyEmailLine`.**
Import `policySummaryLine` and `PASS_NON_REFUNDABLE_MESSAGE` from `@/components/booking/cancellation-policy-disclosure`
(see D-RPT-02 for why this import is the correct one and why there is no cycle).

Signature: `export function composePolicyEmailLine(input: PolicyDisclosureInput): string | null`.
Body: call `composePolicyDisclosure(input)`; return `null` when `d.tier === null`; return
`PASS_NON_REFUNDABLE_MESSAGE` when `d.openCapacity && d.windowAlreadyOpen`; otherwise return
`policySummaryLine(d.tier, { openCapacity: d.openCapacity }, d.boundaryLabels, d.bestRungIndex)`.
The three branches MIRROR the booking detail page's render fork exactly — that is the point, and it is why
the function reads the composer's output rather than re-deriving anything.

Header comment must state: this is TRUST-03's INBOX half, the twin of the on-screen half above it; not one
percentage and not one hour figure is typed here or downstream of it; a rung edit in `cancellation.ts`
rewrites the confirmation email automatically. Note that `todayRefundCents` is deliberately NOT carried into
the email — it is a figure that decays the moment it is sent, and the CTA already links to the live surface.

**(b) `src/lib/db/schema.ts` — widen the `booking_confirmed` member of `NotificationPayload`.**
Add `policyLabel?: string;` with a doc comment: the TRUST-03 cancellation-policy sentence, pre-composed
venue-local by the emitter through `composePolicyEmailLine` (D-86: a display string, never a Date or a tier).
ABSENT means there is nothing to disclose (a null D-67 snapshot) — the CR-01 rule for `feeLabel` applied to
a policy: an empty clause is never rendered as a clause. Cite D-RPT-01.

**(c) `src/lib/validation/notification.ts` — mirror it at the write boundary.**
Add `policyLabel: label.optional()` to the `booking_confirmed` member of `notificationPayloadSchema`. The
`_PayloadUnionParity` assertion at the bottom of that file must still hold — if it does not, the two unions
have drifted and that is the error to fix, not to suppress.

**(d) `src/lib/payments/confirm-booking-payment.ts` — compose it in `emitBookingConfirmed`.**
Add two columns to the existing SELECT: `cancellationPolicy: booking.cancellationPolicy` and
`serviceFeeCents: booking.serviceFeeCents`. Read the clock with `readDbNow(dbConn)` imported from
`@/lib/booking/bookings-query` — NEVER `new Date()`; `cancellation.ts:78` makes the DB clock a contract.
Then, beside the existing `composeWhenLabel` call:

`const policyLabel = composePolicyEmailLine({ tier: row.cancellationPolicy, startsAt: row.startsAt, now,
timezone: row.timezone, city: row.city, openCapacity: row.openCapacity, spacePriceCents: row.spacePriceCents
?? row.quotedTotalCents ?? 0, serviceFeeCents: row.serviceFeeCents ?? 0 })`

— the `??` fallbacks mirror the booking detail page's call site verbatim (`bk.spacePriceCents ?? quoted`,
`bk.serviceFeeCents ?? 0`). Spread onto the payload conditionally so an absent policy writes no key at all:
`...(policyLabel === null ? {} : { policyLabel })`.

The whole block stays inside the EXISTING `try/catch`: a read failure must never affect the webhook's
200-ACK (T-06-15), and that guarantee is unchanged by adding one more read to it. Do NOT move, widen or
reorder the emit itself — D-78's rule that no send trigger moves still binds.
  </action>
  <verify>
    <automated>npx vitest run tests/booking/cancellation-policy.test.ts</automated>
    <automated>npx tsc --noEmit</automated>
    <automated>ls drizzle/*.sql | tail -1</automated>
    <expect>The vitest file is green; tsc is clean; the last migration is still `drizzle/0025_audit_resolved_by.sql` (GATE-06 / D-RPT-03). If a migration appeared, STOP and raise it.</expect>
  </verify>
  <done>`composePolicyEmailLine` exists with all four behaviours pinned by tests derived from LADDER; the payload type and its Zod mirror both carry the optional `policyLabel` and `_PayloadUnionParity` still compiles; the emitter composes the sentence from the DB clock and the booking's own D-67 snapshot; `drizzle/` is untouched.</done>
</task>

<task type="auto">
  <name>Task 3: The email layer — the reference in the subject, the policy in both projections</name>
  <files>src/lib/email.ts, src/inngest/functions/notify.ts, tests/helpers/email-fixtures.ts</files>
  <action>
**(a) `src/lib/email.ts` — `sendBookingConfirmed` only. Touch nothing else in this file.**

Add a SIXTH parameter `policyLabel: string | null` — required-and-nullable, NOT optional. There is exactly
one call site, so requiring it is a one-file compiler census rather than a burden; this is the same argument
`DeadlineAnchorInput.openCapacity` makes in the disclosure component ("an optional flag lets one surface
silently keep rendering the wrong thing, and still typecheck").

TRUST-02 — the subject becomes `Your FitOut booking is confirmed — ${spaceTitle} (${reference})`. The
reference goes in RAW; the shell escapes every sink, and a local escape here would double-encode.

TRUST-03 — build `paragraphs` as an array and PUSH the policy sentence as a SECOND paragraph when
`policyLabel !== null`. Never render an empty clause, and never concatenate it into the first sentence: the
booking fact and the money terms are two different statements. `renderEmail` projects `paragraphs` into both
`html` and `text` from the one `EmailContent`, which is what carries the clause into both parts for free —
do not build a second body.

The `cta`, the recipient, the send call, its one call site and the conditions under which it fires are
UNCHANGED. Add a header note recording that this closes TRUST-02/TRUST-03 (the D-78 handoff the v1.1 audit
found open), that `renderEmail` and the shell are untouched so EMAIL-01/02/03 stay closed, and that not one
percentage or hour figure is typed in this module — the sentence arrives finished from
`composePolicyEmailLine`, whose owner is `LADDER`.

**(b) `src/inngest/functions/notify.ts` — the `booking_confirmed` case of `sendForType`.**
Pass `payload.policyLabel ?? null` as the sixth argument, with a one-line comment: TRUST-03's inbox half —
the D-86 pre-composed sentence, absent when the booking's D-67 snapshot is null; the fan-out never re-derives
it (the same rule the `payByLabel` comment two cases below states for CR-02). Change NOTHING else in this file.

**(c) `tests/helpers/email-fixtures.ts` — keep the shared argument list total.**
Append a sixth element to `SENDER_FIXTURES.sendBookingConfirmed.calls[0].args`:
`"Free cancellation until Fri 11 Sep, 6:00 PM (Manila time)"`. This is a FIXTURE literal, not product copy —
it contains no percentage and no hour count, and it exists so the `tests/auth/email-injection.test.ts` probe
reaches the new string and so `npm run email:previews` renders a realistic body. Extend the `why` line to say
the sixth argument is TRUST-03's policy sentence. Do NOT change `SENDER_COUNT` — no sender was added.
  </action>
  <verify>
    <automated>npx vitest run tests/notifications/confirmation-email.test.ts</automated>
    <expect>GREEN — all four clause assertions from Task 1's recorded red now pass, with the test file otherwise unmodified except for adding the sixth argument to its `sendBookingConfirmed` call.</expect>
    <automated>npx tsc --noEmit</automated>
    <automated>npx vitest run tests/notifications/ tests/booking/cancellation-policy.test.ts tests/booking/cancellation-copy.test.tsx tests/auth/email-escaping.test.ts tests/auth/email-injection.test.ts tests/ops/alert-digest.test.ts</automated>
    <automated>npm run build</automated>
    <expect>`npm run build` runs lint + the design suite + `next build`; it is the gate that proves the new lib -> component import (D-RPT-02) survives a production build of the PayMongo webhook route.</expect>
  </verify>
  <done>The confirmation email's subject carries the FIT- reference and its body carries the policy sentence in both html and text; the previously-red file is green; tsc, the regression suites and `npm run build` all pass.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| PayMongo webhook -> emitter | Untrusted event triggers the DB read that composes the payload |
| Notify event -> notification row / email | Payload crosses a network hop as JSON and re-enters as `unknown` |
| Email body -> Resend | An external service that forwards, archives and indexes; content that enters does not come back out of anyone's control |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-RPT-01 | Information disclosure | `policyLabel` on the notify payload | mitigate | The value is a derived copy sentence built from `LADDER` + a venue-local instant. Carries no ids, no email addresses, no payment/bank details, no `meta` — the D-72 column-level rule and the D-86 display-string rule both hold unchanged. Zod bounds it at `label` (min 1 / max 200) at the write boundary. |
| T-RPT-02 | Tampering (XSS) | The new second paragraph in `sendBookingConfirmed` | mitigate | The sentence enters through `EmailContent.paragraphs`, which `renderEmail` escapes at the ONE choke point (WR-01 / EMAIL-01). No local escape is added here — that would double-encode. `tests/auth/email-injection.test.ts` reaches the new string via the updated fixture. |
| T-RPT-03 | Spoofing (false disclosure) | The emailed policy sentence | mitigate | A hand-typed percentage or hour would drift from `quoteRefund` and become a refund dispute. Every rung, its order and its boundary come from `LADDER` via `composePolicyDisclosure` + `policySummaryLine`; the Task-1/Task-2 assertions derive their expectations the same way, so drift is a red. The `bestRungIndex === -1` and `windowAlreadyOpen` branches make the email refuse to promise a closed window. |
| T-RPT-04 | Denial of service | The extra read + clock in `emitBookingConfirmed` | accept | Two extra columns on an existing SELECT plus one `SELECT now()`, inside the existing `try/catch`, off the ACK path (T-06-15). A failure logs and returns without affecting the webhook's 200. |
| T-RPT-SC | Tampering | npm/pip/cargo installs | n/a | This plan installs NO packages. Every import already exists in the tree, so the Package Legitimacy Gate does not apply. If any step reaches for an install, STOP and raise it. |
</threat_model>

<verification>
Gates, in order, all of which must be run:

1. `npx vitest run tests/notifications/confirmation-email.test.ts` — RED at Task 1 (recorded verbatim), GREEN at Task 3.
2. `npx tsc --noEmit` — clean at the end of every task.
3. `npx vitest run tests/notifications/ tests/booking/cancellation-policy.test.ts tests/booking/cancellation-copy.test.tsx tests/auth/email-escaping.test.ts tests/auth/email-injection.test.ts tests/ops/alert-digest.test.ts` — the email + policy regression set.
4. `npm run build` (= `npm run lint && npm run test:design && next build`).
5. `ls drizzle/*.sql | tail -1` still reports `drizzle/0025_audit_resolved_by.sql` (GATE-06).

DB-backed suites in step 3 (`tests/notifications/notify.test.ts`, and `tests/booking/notify-emission.test.ts`
if you widen the run) need the test database — `npm run db:up` then `npm run db:test:setup` if they error on
connection. `tests/notifications/confirmation-email.test.ts` itself needs NO database.

Copy audit (grep, run at the end):
`grep -nE '[0-9]+%|[0-9]+ hours' src/lib/email.ts src/lib/booking/policy-disclosure.ts | grep -v '^[^:]*:[0-9]*: *[/*]'`
must return nothing outside comments — no percentage and no hour figure is typed in the email layer.

D-78 non-regression: `git diff --stat src/lib/email-shell.ts` must be EMPTY, and the diff of
`src/inngest/functions/notify.ts` must show only the one added argument.
</verification>

<success_criteria>
- The confirmation email SUBJECT contains the FIT-XXXXXXXX reference (TRUST-02's email half).
- The confirmation email BODY discloses the cancellation policy with a concrete venue-local date, in BOTH
  the html and the text projection (TRUST-03's email half).
- Both were proven by a test WATCHED RED before the change and green after, with the red output recorded.
- The sentence is composed exactly once, by `composePolicyEmailLine`, from the same `LADDER` the refund
  engine evaluates — no percentage and no hour is typed in the email layer.
- A null D-67 policy snapshot omits the clause; an already-open pass states `PASS_NON_REFUNDABLE_MESSAGE`;
  a fully-lapsed ladder names the tier and no date.
- `src/lib/email-shell.ts` is byte-identical, and no send trigger was added, moved or removed (D-78 / EMAIL-01/02/03).
- `drizzle/` is still at `0025` (GATE-06).
- `npx tsc --noEmit`, the targeted vitest files, and `npm run build` all pass.
</success_criteria>

<output>
Create `.planning/quick/260831-rpt-close-trust-02-and-trust-03-the-confirma/260831-rpt-SUMMARY.md` when done.
It MUST include: the verbatim Task-1 red output; the Task-2 red output; a note on D-RPT-01/02/03; and the
deferred follow-up from D-RPT-02 (moving `policySummaryLine` into lib and re-exporting from the component).
Then tick TRUST-02 and TRUST-03 in `.planning/REQUIREMENTS.md` (lines 71-72 and the coverage table at
231-232) and note the closure against the v1.1 audit finding.
</output>
