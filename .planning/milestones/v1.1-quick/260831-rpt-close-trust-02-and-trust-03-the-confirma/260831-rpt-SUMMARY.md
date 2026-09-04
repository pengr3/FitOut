---
quick_id: 260831-rpt
slug: close-trust-02-and-trust-03-the-confirmation-email
date: 2026-08-31
status: complete
type: execute
requirements: [TRUST-02, TRUST-03]
decisions: [D-RPT-01, D-RPT-02, D-RPT-03]
threats_addressed: ["T-RPT-01", "T-RPT-02", "T-RPT-03", "T-RPT-04", "T-RPT-SC"]
commits:
  - 265ca87  # test: watch the red for TRUST-02 and TRUST-03
  - 356f133  # feat: composePolicyEmailLine, the payload field and the emitter's read
  - ecdfe9b  # feat: the FIT- reference in the subject, the policy in both projections
key-files:
  created:
    - tests/notifications/confirmation-email.test.ts
  modified:
    - src/lib/booking/policy-disclosure.ts        # + composePolicyEmailLine (the ONE owner)
    - src/lib/db/schema.ts                        # + optional policyLabel on booking_confirmed
    - src/lib/validation/notification.ts          # + the Zod mirror; _PayloadUnionParity still holds
    - src/lib/payments/confirm-booking-payment.ts # + 2 SELECT columns, readDbNow, the compose
    - src/lib/email.ts                            # sendBookingConfirmed ONLY
    - src/inngest/functions/notify.ts             # the one added argument
    - tests/booking/cancellation-policy.test.ts   # + 4 LADDER-derived cases
    - tests/helpers/email-fixtures.ts             # sixth arg, so the argument list stays total
    - .planning/REQUIREMENTS.md
    - .planning/v1.1-MILESTONE-AUDIT.md
    - .planning/STATE.md
  unchanged-by-design:
    - src/lib/email-shell.ts                      # byte-identical — D-78 / EMAIL-01/02/03
    - drizzle/                                    # still ends at 0025_audit_resolved_by.sql
    - package.json                                # zero installs
    - package-lock.json
    - src/components/booking/cancellation-policy-disclosure.tsx  # the derivation was imported, not moved
metrics:
  tasks: 3
  new_tests: 9                                    # 5 in confirmation-email + 4 in cancellation-policy
  deliberate_reds_driven: 8                       # 4 assertion-level + 4 missing-export
  duration: ~25m
---

# Quick 260831-rpt: close TRUST-02 and TRUST-03 — the confirmation email

The confirmation email now carries the **FIT- booking reference in its subject line** and the
**cancellation policy in its body**, with a concrete venue-local date, in both the html and the
plain-text projection. These are the two clauses D-78 handed from Phase 13 to Phase 15 and that
neither phase executed — the one finding in `v1.1-MILESTONE-AUDIT.md` that would have made a
"milestone complete" claim inaccurate.

The policy sentence is composed **exactly once**, server-side, by `composePolicyEmailLine()` in the
module that already owns the on-screen half, and it is derived from `LADDER` — the same constant
`quoteRefund` evaluates. Not one percentage and not one hour figure is typed anywhere on the email
path. A rung edit in `cancellation.ts` rewrites the confirmation email automatically, which is the
whole point: a hand-typed promise in an inbox is a refund dispute waiting for the first rung to move,
and an email — unlike a page — cannot be re-rendered after it is read.

---

## What changed, in the order it changed

| # | Task | Commit | The load-bearing bit |
|---|---|---|---|
| 1 | The red | `265ca87` | `tests/notifications/confirmation-email.test.ts` — 4 assertion-level reds, DB-free |
| 2 | The one owner | `356f133` | `composePolicyEmailLine`, `policyLabel` on the payload + its Zod mirror, the emitter's read |
| 3 | The email layer | `ecdfe9b` | The reference in the subject, the policy as a second paragraph in both projections |

### Task 1 — the red, written against exports that already existed

Every assertion was expressible against today's tree, so the first run failed on **assertions**, not
on a module that had not been written yet. That distinction is the entire value of the file: a red
that is really a `Cannot find module` proves something about import resolution and nothing about copy.

The expectation is **derived, never typed**:

```
rungBoundaries("standard", startsAt) → composeDeadlineLabel per rung → bestFutureRungIndex → policySummaryLine
```

Fixture: `startsAt = 2026-09-12T10:00:00.000Z`, `now = 2026-09-01T02:00:00.000Z` (eleven days out, so
every tier still has a future rung), `Asia/Manila` / `Manila`, `FIT-8QK2M4RA`, tier `standard`. Every
instant is an absolute literal; nothing seeds from the clock.

A fifth case — the **concreteness guard** — was green from the start and is deliberately not evidence.
It asserts `bestRungIndex >= 0` and that the derived sentence contains `boundaryLabels[bestRungIndex]`,
which is what keeps the two clause reds meaningful: without it, a fixture that had drifted past its own
ladder would be asserting the DATELESS tier-name fallback and passing while proving nothing.

#### Task-1 RED — verbatim

```
 RUN  v4.1.8 C:/Users/Admin/Roaming/FitOut

 ❯ tests/notifications/confirmation-email.test.ts (5 tests | 4 failed) 20ms
     × puts the reference in the subject line, where an inbox search can reach it 7ms
     × states the policy sentence in the plain-text part, verbatim as the screen states it 4ms
     × states the same sentence in the html part, escaped by the one shell escaper 4ms
     × threads payload.policyLabel into the confirmation email rather than dropping it 2ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 4 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/notifications/confirmation-email.test.ts > TRUST-02 — the confirmation email's SUBJECT carries the FIT- reference > puts the reference in the subject line, where an inbox search can reach it
AssertionError: expected 'Your FitOut booking is confirmed — Su…' to contain 'FIT-8QK2M4RA'

Expected: "FIT-8QK2M4RA"
Received: "Your FitOut booking is confirmed — Sunrise Court — Bay 2"

 ❯ tests/notifications/confirmation-email.test.ts:125:28
    123|     // The body has always carried it. The SUBJECT is the searchable s…
    124|     // "FIT-8QK2M4RA" in their mail client scans subjects first, and t…
    125|     expect(email!.subject).toContain(REFERENCE);
       |                            ^
    126|   });
    127| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/4]⎯

 FAIL  tests/notifications/confirmation-email.test.ts > TRUST-03 — the confirmation email BODY discloses the cancellation policy, with a date > states the policy sentence in the plain-text part, verbatim as the screen states it
AssertionError: expected 'Booking confirmed\n\nYou\'re booked a…' to contain 'Free cancellation until Fri, Sep 11, …'

- Expected
+ Received

- Free cancellation until Fri, Sep 11, 6:00 PM (Manila time)
+ Booking confirmed
+
+ You're booked at Sunrise Court — Bay 2 on Sat 12 Sep, 6:00–7:00 PM (Manila time). Booking reference FIT-8QK2M4RA.
+
+ View your booking: https://fitout.test/bookings/bk_trust_1
+
+ FitOut
+ Book gyms, courts and studios by the hour.

 ❯ tests/notifications/confirmation-email.test.ts:138:25
    136|     const email = mockResend.last();
    137|     expect(email).toBeDefined();
    138|     expect(copy(email)).toContain(EXPECTED_POLICY);
       |                         ^
    139|   });
    140|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/4]⎯

 FAIL  tests/notifications/confirmation-email.test.ts > TRUST-03 — the confirmation email BODY discloses the cancellation policy, with a date > states the same sentence in the html part, escaped by the one shell escaper
AssertionError: expected '<!DOCTYPE html><html lang="en"><head>…' to contain 'Free cancellation until Fri, Sep 11, …'

Expected: "Free cancellation until Fri, Sep 11, 6:00 PM (Manila time)"
Received: "<!DOCTYPE html>… <p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#0a0a0a">You&#39;re booked at Sunrise Court — Bay 2 on Sat 12 Sep, 6:00–7:00 PM (Manila time). Booking reference FIT-8QK2M4RA.</p> …"

 ❯ tests/notifications/confirmation-email.test.ts:148:31
    146|     // `escapeHtml` rather than a raw compare: the shell escapes every…
    147|     // projection (WR-01 / EMAIL-01), so the escaped form is what a co…
    148|     expect(email!.html ?? "").toContain(escapeHtml(EXPECTED_POLICY));
       |                               ^
    149|   });
    150| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/4]⎯

 FAIL  tests/notifications/confirmation-email.test.ts > TRUST-03 fan-out — the pre-composed sentence reaches the inbox through sendForType > threads payload.policyLabel into the confirmation email rather than dropping it
AssertionError: expected 'Booking confirmed\n\nYou\'re booked a…' to contain 'Free cancellation until Fri, Sep 11, …'

- Expected
+ Received

- Free cancellation until Fri, Sep 11, 6:00 PM (Manila time)
+ Booking confirmed
+
+ You're booked at Sunrise Court — Bay 2 on Sat 12 Sep, 6:00–7:00 PM (Manila time). Booking reference FIT-8QK2M4RA.
+
+ View your booking: https://fitout.test/bookings/bk_trust_1
+
+ FitOut
+ Book gyms, courts and studios by the hour.

 ❯ tests/notifications/confirmation-email.test.ts:170:25
    168|     const [email] = mockResend.sent().filter((e) => e.to === "fanout@f…
    169|     expect(email).toBeDefined();
    170|     expect(copy(email)).toContain(EXPECTED_POLICY);
       |                         ^
    171|     // And the reference still rides the subject on this path too — on…
    172|     expect(email.subject).toContain(REFERENCE);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/4]⎯


 Test Files  1 failed (1)
      Tests  4 failed | 1 passed (5)
   Start at  20:08:02
   Duration  2.68s (transform 215ms, setup 72ms, import 1.98s, tests 22ms, environment 0ms)
```

> The one truncation above is the html body in failure [3/4]. Vitest printed the full rendered document
> inline; the elision is marked with `…` and the surrounding text is verbatim. The four named failures
> are exactly the four the plan required, and the concreteness guard passed.

The `4 failed | 1 passed` shape is itself the evidence: the two clause assertions failed, the wiring
assertion failed, and the guard that makes them meaningful did not.

---

### Task 2 — the one owner

`composePolicyEmailLine(input: PolicyDisclosureInput): string | null` reads
`composePolicyDisclosure`'s output and forks three ways, mirroring the booking detail page's render
fork exactly:

| Condition | Returns | Why |
|---|---|---|
| `d.tier === null` | `null` | A null D-67 snapshot discloses **nothing** — never `tierOrDefault`'s Flexible, which would put a promise in a host's mouth they never made |
| `d.openCapacity && d.windowAlreadyOpen` | `PASS_NON_REFUNDABLE_MESSAGE` | WR-05 / T-09-88 — never a refund window that closed before the pass was bought |
| otherwise | `policySummaryLine(d.tier, { openCapacity }, d.boundaryLabels, d.bestRungIndex)` | The best still-open rung with its concrete venue-local instant; `-1` names the tier and **no date** |

`todayRefundCents` is **deliberately not carried into the email**. It is a figure that starts decaying
the moment the message is sent — accurate at compose time, stale at read time, and stale in the
direction that over-promises. The dated sentence stays true until its boundary, and the CTA already
links to the live surface where the figure is recomputed against the DB clock.

The emitter (`emitBookingConfirmed`) gained two columns on its **existing** SELECT
(`cancellationPolicy`, `serviceFeeCents`) and reads the clock with `readDbNow(dbConn)` — never
`new Date()`; `cancellation.ts:78` makes the DB clock a contract. The whole block stays inside the
existing `try/catch`, so a read failure still cannot affect the webhook's 200-ACK (T-06-15). The emit
itself was not moved, widened or reordered.

#### Task-2 RED — verbatim

Four new cases were added to `tests/booking/cancellation-policy.test.ts` and run **before** the
function body existed:

```
 RUN  v4.1.8 C:/Users/Admin/Roaming/FitOut

 ❯ tests/booking/cancellation-policy.test.ts (23 tests | 4 failed) 1258ms
     × (rpt a) states EXACTLY the sentence the screen states, at every rung, for every tier 4ms
     × (rpt b) a NULL D-67 snapshot returns null, so the email omits the clause entirely 0ms
     × (rpt c) a pass whose day has ALREADY opened discloses the non-refundable message (WR-05) 1ms
     × (rpt d) once every rung has lapsed it names the tier and promises NO date 0ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 4 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/booking/cancellation-policy.test.ts > composePolicyEmailLine - TRUST-03's inbox half states the screen's sentence (260831-rpt) > (rpt a) states EXACTLY the sentence the screen states, at every rung, for every tier
TypeError: composePolicyEmailLine is not a function
 ❯ emailLine tests/booking/cancellation-policy.test.ts:586:5
    584|
    585|   const emailLine = (tier: CancellationTier | null, now: Date, openCap…
    586|     composePolicyEmailLine({ tier, startsAt, now, ...VENUE, openCapaci…
       |     ^
    587|
    588|   const screenLine = (tier: CancellationTier, now: Date, openCapacity …
 ❯ tests/booking/cancellation-policy.test.ts:602:16

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/4]⎯

 FAIL  tests/booking/cancellation-policy.test.ts > … > (rpt b) a NULL D-67 snapshot returns null, so the email omits the clause entirely
TypeError: composePolicyEmailLine is not a function
 ❯ emailLine tests/booking/cancellation-policy.test.ts:586:5
 ❯ tests/booking/cancellation-policy.test.ts:623:12

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/4]⎯

 FAIL  tests/booking/cancellation-policy.test.ts > … > (rpt c) a pass whose day has ALREADY opened discloses the non-refundable message (WR-05)
TypeError: composePolicyEmailLine is not a function
 ❯ emailLine tests/booking/cancellation-policy.test.ts:586:5
 ❯ tests/booking/cancellation-policy.test.ts:628:12

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/4]⎯

 FAIL  tests/booking/cancellation-policy.test.ts > … > (rpt d) once every rung has lapsed it names the tier and promises NO date
TypeError: composePolicyEmailLine is not a function
 ❯ emailLine tests/booking/cancellation-policy.test.ts:586:5
 ❯ tests/booking/cancellation-policy.test.ts:639:20

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/4]⎯


 Test Files  1 failed (1)
      Tests  4 failed | 19 passed (23)
```

> The three repeated stack frames in failures [2/4]–[4/4] are elided to their first and last lines
> (each is byte-identical to [1/4]'s frame except for the call-site line number, which is preserved).
> The 19 passing cases are the file's pre-existing Phase-13 set, untouched.

Case (rpt a) is an **equality against the screen's own line**, not against a string literal. A literal
would have pinned the email to a sentence the screen had stopped saying — and two surfaces quoting
different refund terms at the same booker is precisely the dispute this apparatus exists to prevent.

---

### Task 3 — the email layer

`sendBookingConfirmed` gained a **sixth required-and-nullable** parameter, `policyLabel: string | null`.
Required rather than optional deliberately: there is exactly one call site, so requiring it costs one
line and buys a compiler census — the same argument `DeadlineAnchorInput` makes for `openCapacity`
("an optional flag lets one surface silently keep rendering the wrong thing, and still typecheck").

- **Subject:** `Your FitOut booking is confirmed — ${spaceTitle} (${reference})`. The reference goes in
  RAW; the shell escapes every sink and a local escape would double-encode.
- **Body:** `paragraphs` is now an array, and the policy sentence is **pushed as a second paragraph**
  when `policyLabel !== null`. Never an empty clause, and never concatenated into the first sentence —
  the booking fact and the money terms are two different statements. `renderEmail` projects the one
  `EmailContent` into both html and text, which carries the clause into both parts for free; there is
  no second body.

`notify.ts` passes `payload.policyLabel ?? null` and changes nothing else. `email-fixtures.ts` gained
a sixth argument so the shared list stays total — a fixture literal carrying no percentage and no hour
count, which is what lets `email-injection.test.ts` reach the new string and `npm run email:previews`
render a realistic body. `SENDER_COUNT` is unchanged; no sender was added.

---

## Decisions

### D-RPT-01 — the notify payload gains an optional `policyLabel`

`schema.ts` is explicit that the payload is the **sole input to both channels** (the D-91 sufficiency
rule): "A field the email needs therefore belongs HERE, not in a second parallel structure." The email
cannot compose the disclosure itself — `composePolicyDisclosure` wants a `Date`, cents and a timezone,
and D-86 forbids raw Dates and money internals on the payload. So the emitter composes a **finished
display string**, exactly as `payByLabel` / `respondByLabel` / `refundLabel` already do.

**Optional rather than required**, mirroring `feeLabel`'s CR-01 precedent: absence means *there is no
policy to disclose* (a null D-67 snapshot), which is a real state and not a missing value. Durable
pre-existing rows are never re-validated, so old rows are unaffected, and `notification-item.tsx`'s
exhaustive switch is untouched by an added optional field. The emitter spreads it conditionally
(`...(policyLabel === null ? {} : { policyLabel })`), so an absent policy writes **no key at all**.

Mirrored at the write boundary as `policyLabel: label.optional()`, so the durable row is bounded at
200 chars like every other display string. `_PayloadUnionParity` still compiles — the two unions did
not drift.

### D-RPT-02 — `policy-disclosure.ts` imports `policySummaryLine` from the component module

That function is the **one** derivation of the summary sentence from `LADDER`, and the first constraint
of this task is that the email must not carry a second one. The import was checked, not assumed: the
component file has no client directive, `policySummaryLine` performs no JSX and no date math, and the
component imports only `@/lib/payments/cancellation` — so there is **no cycle**. Lint permits it
(`eslint.config.mjs` has no `no-restricted-imports` boundary), and `bookings-query.ts` already imports
from `@/components`. Proven end-to-end by `npm run build`, which type-checks and bundles the PayMongo
webhook route that now transitively pulls this import through `confirm-booking-payment.ts`.

**Rejected:** re-deriving the sentence in lib — that is exactly the drift the constraint forbids.

### D-RPT-03 — zero migrations, checked rather than hoped

`notification.payload` is `jsonb("payload").$type<NotificationPayload>()` (schema.ts:619), so a new key
is a TypeScript + Zod change with no DDL. `ls drizzle/*.sql | tail -1` reports
`drizzle/0025_audit_resolved_by.sql` before and after, and `git status --short drizzle/` is empty.
**GATE-06 holds.**

---

## Deferred follow-up (from D-RPT-02)

**Move `policySummaryLine`, `policyDisclosureLines` and `PASS_NON_REFUNDABLE_MESSAGE` out of
`src/components/booking/cancellation-policy-disclosure.tsx` and into `src/lib/`, re-exporting them from
the component for its existing consumers.**

This is the correct long-term arrangement and it was deliberately left out of scope. Today a **lib**
module imports from a **components** module, which inverts the usual direction — it is safe, checked
and proven by a production build, but it is the wrong way round on principle, and the shape that makes
it safe (no client directive, no JSX in those three exports) is a property a future edit to that
component could silently remove.

Why not now: it touches a Phase-13 component and two Phase-13 test files
(`tests/booking/cancellation-policy.test.ts`, `tests/booking/cancellation-copy.test.tsx`), which is a
larger blast radius than this task's two clauses justify. It is a pure move with no behaviour change,
so it is cheap whenever it is picked up.

A second, pre-existing item this task did **not** widen: `listings/[id]/book/page.tsx` still composes
its own disclosure inline rather than through `composePolicyDisclosure` (recorded in that module's own
header since 13-10). Until it adopts, "one owner" is a claim about the detail page and the email.

---

## Gates

| # | Gate | Result |
|---|---|---|
| 1 | `npx vitest run tests/notifications/confirmation-email.test.ts` | RED at Task 1 (**4 failed / 1 passed of 5**, recorded verbatim above) → GREEN at Task 3 (**5 passed of 5**) |
| 2 | `npx tsc --noEmit` | Clean (exit 0) at the end of every task |
| 3 | `npx vitest run tests/notifications/ tests/booking/cancellation-policy.test.ts tests/booking/cancellation-copy.test.tsx tests/auth/email-escaping.test.ts tests/auth/email-injection.test.ts tests/ops/alert-digest.test.ts` | **10 files passed, 259 tests passed** |
| 4 | `npm run build` (lint + design suite + `next build`) | **Exit 0.** 25 lint warnings, all pre-existing in `src`/`e2e` |
| 5 | `ls drizzle/*.sql \| tail -1` | `drizzle/0025_audit_resolved_by.sql` — GATE-06 holds |
| 6 | Copy audit: `grep -nE '[0-9]+%\|[0-9]+ hours' src/lib/email.ts src/lib/booking/policy-disclosure.ts \| grep -v '^[^:]*:[0-9]*: *[/*]'` | **No output** (grep exit 1) — no percentage and no hour figure typed in the email layer |
| 7 | D-78: `git diff --stat src/lib/email-shell.ts` | **Empty** — byte-identical |
| 8 | D-78: the `notify.ts` diff | **The one added argument** (+ its three comment lines) and nothing else |
| 9 | `src/lib/email.ts` diff scope | **Two hunks, both inside `sendBookingConfirmed`.** No send trigger added, moved or removed |

The Task-2 verification (`npx vitest run tests/booking/cancellation-policy.test.ts`) went from
**4 failed / 19 passed** to **23 passed** on the same file with no other change.

**Observed and not caused by this task:** gate 3 prints the harness's `LEAKED WRITES` banner — 2 rows in
`public.audit` (`action=guest-email`, `action=notify`) from `recordAudit` writing through the app's
module-level db singleton. That is the documented, contained pre-existing condition described in
`tests/setup.ts`; both writes come from suites this task did not touch.

---

## Threat register outcomes

| Threat ID | Disposition | Outcome |
|---|---|---|
| T-RPT-01 | mitigate | `policyLabel` is a derived copy sentence built from `LADDER` + a venue-local instant. No ids, no email addresses, no payment or bank details, no `meta`. Zod bounds it at `label` (min 1 / max 200) at the write boundary. D-72 and D-86 hold unchanged. |
| T-RPT-02 | mitigate | The sentence enters through `EmailContent.paragraphs`, which `renderEmail` escapes at the ONE choke point (WR-01 / EMAIL-01). No local escape was added. `tests/auth/email-injection.test.ts` reaches the new string via the updated fixture and passes. |
| T-RPT-03 | mitigate | No percentage or hour is typed on the email path (gate 6). Every rung, its order and its boundary come from `LADDER`; the Task-1/Task-2 expectations derive the same way, so drift is a red. The `bestRungIndex === -1` and `windowAlreadyOpen` branches make the email refuse to promise a closed window, both pinned by (rpt c) and (rpt d). |
| T-RPT-04 | accept | Two extra columns on an existing SELECT plus one `SELECT now()`, inside the existing `try/catch`, off the ACK path (T-06-15). Unchanged failure semantics: log and return. |
| T-RPT-SC | n/a | **Zero packages installed.** `package.json` and `package-lock.json` are untouched. |

---

## Deviations from plan

**None material.** The plan matched the codebase on every signature, helper location and line
reference it named. Two notes, neither a course change:

1. **Task 1's test imports one module the plan's "import ONLY from" list did not name:**
   `import type { NotificationPayload } from "@/lib/db/schema"` — required by the plan's own
   instruction to build the `sendForType` payload "through a local helper that casts
   `as NotificationPayload`". It is a **type-only** import, erased at compile time, so it adds no
   runtime dependency and the file still opens no database connection.
2. **The Task-1 file was edited once after its red**, exactly as the plan's Task-3 verification
   anticipated: the sixth argument was appended to its three `sendBookingConfirmed` calls. Nothing else
   in the file changed between the recorded red and the green.

---

## Requirements

- **TRUST-02** — ticked `[x]`. The on-screen half was Phase 13's; the email subject half closed here.
- **TRUST-03** — ticked `[x]`. The on-screen half was Phase 13's; the confirmation-email half closed here.

Both checkbox lines and both traceability-table rows in `.planning/REQUIREMENTS.md` were updated
(`Phase 13 + 15 | Partial` → ``Phase 13 + quick `260831-rpt` | Complete``), with an owner-correction
note in the Coverage block recording that the scope mapping did not change — only which unit of work
executed the second half. `.planning/v1.1-MILESTONE-AUDIT.md` § *The two that are genuinely open*
carries a `RESOLVED 2026-08-31` block naming the three commits.

## Self-Check: PASSED

- `tests/notifications/confirmation-email.test.ts` — FOUND
- `src/lib/booking/policy-disclosure.ts` contains `composePolicyEmailLine` — FOUND
- `src/lib/email.ts` contains `policyLabel` — FOUND
- Commits `265ca87`, `356f133`, `ecdfe9b` — all FOUND in `git log`
