# Phase 18.1 — Deferred Items

Out-of-scope discoveries logged during execution. Per the executor's SCOPE BOUNDARY rule these are
**not** fixed by the plan that found them: each was proved pre-existing / unrelated before being
deferred.

---

## D1 — `tests/design/e2e-email-silence.test.ts` LINK 1 is INTERMITTENTLY RED

**Found during:** 18.1-01, gate 4 (`npm run test:design`).

**Symptom:** one run of `npm run test:design` reported `1 failed | 1330 passed`, in:

```
LINK 1 — playwright.config.ts silences Resend for every served page
  > by DEFAULT the booted server gets RESEND_API_KEY=""
  (tests/design/e2e-email-silence.test.ts:111, inside `const webServer = await loadWebServer("")`)
```

Two immediately-subsequent runs of the identical command were **fully green** (`73 passed`,
`1331 passed | 3 skipped`), and the fifth gate `npm run build` — which runs `test:design` as its
second step — also passed end to end.

**Why it is deferred, not fixed:**

- **Unrelated surface.** 18.1-01 touched four files: `.planning/REQUIREMENTS.md`,
  `src/lib/payments/fees.ts`, `src/lib/ops/cancel-impact.ts` and
  `tests/payments/ops-cancel.test.ts`. None is in this test's import graph, none is
  `playwright.config.ts`, and none concerns Resend or `RESEND_API_KEY`.
- **Non-deterministic, not newly broken.** The assertion reads a config file through a loader; it
  passed on 2 of 3 consecutive runs against a byte-identical tree.

**Recommended owner:** whichever later 18.1 plan next touches `playwright.config.ts` or the e2e env
contract. If it reddens deterministically at that point, treat it as a real finding rather than a
flake and pin the loader rather than the assertion.

---

## Second sighting — the same `e2e-email-silence.test.ts` flake (18.1-02, 2026-09-02)

Recorded because a flake seen twice in two consecutive plans, on two unrelated trees, is starting to
be a fact about the loader rather than about either plan.

Identical symptom to the 18.1-01 entry above: the first `npm run test:design` of the run failed with

```
FAIL tests/design/e2e-email-silence.test.ts
  > LINK 1 — playwright.config.ts silences Resend for every server it boots
  > by DEFAULT the booted server gets RESEND_API_KEY=""
  Error: Test timed out in 5000ms.  (tests/design/e2e-email-silence.test.ts:111)
```

Re-run of that file ALONE: `5 passed` in 1.19 s. Re-run of the whole suite: `73 passed`,
`1331 passed | 3 skipped`. `npm run build` (which runs `test:design` as its second step) then passed
end to end.

18.1-02 touched `src/lib/host/frozen-payouts.ts`, `src/lib/listing/review-signal.ts`,
`src/components/host/hosting-paused-notice.tsx`, `src/app/(host)/host/earnings/page.tsx` and two test
files. None is in this test's import graph and none concerns Resend, `playwright.config.ts` or the
e2e env contract — so the deferral reasoning in the entry above carries over unchanged.

**What the second sighting adds:** it is a TIMEOUT under full-suite parallel load, at 5000 ms, in a
case whose solo runtime is ~0.7 s. That points at contention in `loadWebServer`'s config read rather
than at any assertion being wrong. The fix, when someone owns it, is most likely a per-test timeout
or a hoisted config load — **not** a weakened assertion.

---

## D2 — `scripts/didit-setup.ts`'s `DECLARED_WORKFLOW` STAYS WHERE IT IS (the move it asks for is not executable as written)

**Found during:** 18.1-05, Task 1.

**What was asked.** `scripts/didit-setup.ts:16-22` says its `DECLARED_WORKFLOW` constant lives in the
script only because *"the module that should own it, `src/lib/verification/providers/didit.ts`, is
plan 18.1-05's file and does not exist yet"*, and instructs: *"⚠ WHEN 18.1-05 LANDS THAT ADAPTER,
MOVE THIS CONSTANT INTO IT AND IMPORT IT HERE."* `18.1-04-SUMMARY.md § Next Phase Readiness` repeats
it. The adapter now exists.

**Why it was NOT done, and this is a finding rather than a skip:**

1. **The plan does not contemplate it.** `18.1-05-PLAN.md`'s `files_modified` is four files and the
   script is not one of them; Task 1 additionally says in as many words not to pre-build what a later
   plan owns. The plan is the authority.

2. **⚠ THE MOVE AS WRITTEN CANNOT WORK, AND THIS WAS MEASURED, NOT REASONED.** The script runs under
   `npx tsx` (`npm run didit:verify` / `didit:apply`). The adapter's first line is the client-bundle
   guard, and that specifier is NOT an installed package — Next aliases it in its own bundler and
   both Vitest configs alias it to `tests/helpers/server-only.stub.ts`, so from plain Node it does
   not resolve at all (D-34 / GATE-05; installing it is a recorded-decision reversal, not a fix).
   Probed on the shipped adapter:

   ```
   npx tsx -e "import('./src/lib/verification/providers/didit.ts')…"
   FAILED: MODULE_NOT_FOUND Cannot find module 'server-only'
   ```

   So importing the adapter from the script would break `npm run didit:verify` outright. The guard is
   correct and must stay — the adapter holds the API key — which means the instruction, not the
   guard, is the thing that has to change.

3. **The adapter has no use for the constant.** `beginDiditVerification` sends a workflow *ID* read
   from the environment; it never spells the composition. Moving a declaration into a module that
   does not read it would leave the value just as unread as it is now, one file further from the
   script that checks it.

**Recommended shape when someone owns it** — the repo already ships this exact split twice, and both
halves are recorded in `tests/design/server-only-guards.test.ts`'s `MUST_NOT_BE_GUARDED`:
`payments/config.ts` beside guarded `payments/fees.ts`, and `availability/horizon.ts` beside guarded
`availability/slots.ts`. A small UNGUARDED declaration module (e.g.
`src/lib/verification/didit-workflow.ts`) holding `DECLARED_WORKFLOW` / `DECLARED_RETRY` /
`DECLARED_DESKTOP_ALLOWED`, imported by the script and by whichever later plan needs to state the
composition, retypes no value and stays importable from `tsx`. ⚠ Whoever does it must add the row to
`MUST_NOT_BE_GUARDED` with its reason, and must re-run `npm run didit:verify` against the live
account afterwards.

**Recommended owner:** 18.1-07 or 18.1-11 — the plans that next have a reason to state the vendor
composition or the retry policy in product code (D-272's `COOLDOWN_HOURS` same-commit rule points at
the same module).


---

## D3 — `hostApprovedPayload()` TELLS AN AUTO-APPROVED HOST THAT A PERSON CHECKED THEM

**✅ RESOLVED in 18.1-10** (2026-09-02) — option (a), one clause, as recommended below.

`src/lib/notifications.ts`'s lead now reads **"FitOut has checked your account. Your listings can go
live once each one is approved."** No actor, no inspection claim, true of both writers.

Three things made 18.1-10 the right owner rather than 18.1-11, and they are worth recording because
the entry below offered a choice:

1. **18.1-10 landed the sentence this one has to agree with.** `VERIFICATION_SIGNAL.approved.reason`
   in `src/lib/host/verification-signal.ts` opens with those exact words, so leaving the payload
   alone would have shipped the panel and the inbox saying different things about one host's
   standing in the same phase — which is the D-245 property the entry below invokes, breached by the
   plan that was supposed to be honouring it.
2. **It is not a new register.** `hostRejectedPayload`, four lines down, has always said "FitOut
   checked your account and didn't approve it". The approval was the only one of the pair asserting a
   PERSON; the fix makes them agree rather than inventing a voice.
3. **The blast radius was measured, not assumed.** `tests/notifications/ops-decision-notify.test.ts`
   pins these payloads STRUCTURALLY — case 3 scans for overclaim words, case 4 asserts the two
   channels render byte-identical strings — and not by quoting the lead. 12 passed unchanged, and
   case 3's "names no document and no inspection" claim is now more true than it was. The old
   sentence occurred exactly ONCE in `src/` and nowhere in `tests/` or `e2e/` (grepped both).

⚠ **NOT added to 18.1-10's banned-language corpus.** `tests/listing/review-signal.test.ts`'s own
header declares the notification half out of scope and names `tests/notifications/*` as its owner;
double-pinning one string in two files is two places to edit and one that gets forgotten. The two
owners were written from the same spec table and must move together — which is exactly what happened
here.

**Found during:** 18.1-08, Task 1 (wiring the D-245 fan-out into the Didit verdict path).

**The finding.** `src/lib/notifications.ts:237-245` composes the host-approval notice, and its lead
reads, verbatim:

> "Someone at FitOut checked your account. Your listings can go live once each one is approved."

That sentence was written in Phase 18, when the ONLY way to reach `approved` was an operator pressing
a button in `/ops` — at which point it was exactly true. **D-261 makes a Didit PASS auto-approve the
host with no operator involved at all**, so from plan 18.1-08 onward the same words go to hosts about
whom the literal claim is false: nobody at FitOut looked at anything. The docblock above the function
even pins the claim as deliberate — *"NAMES NO DOCUMENT AND NO INSPECTION. 'Someone at FitOut checked
your account' is the whole claim HVER-02 supports"* — which is what makes this a real drift rather
than loose phrasing.

`hostRejectedPayload` is milder and probably fine ("FitOut checked your account and didn't approve
it" is true of FitOut-through-its-vendor); the approval is the sharp one, because it asserts a PERSON.

**Why it was NOT fixed here, and this is a finding rather than a skip:**

1. **The plan forbids it in as many words.** 18.1-08 Task 1: *"send the notification through the
   SHIPPED payloads … **Do not write new copy** — D-245 gives one payload, one `notification` row and
   one email."* Editing the string in a write module is precisely what that instruction rules out.
2. **It is not this file's decision to take.** The six host-standing sentences live in one place
   deliberately (D-91 sufficiency, D-86 durability): what a host is told about their own standing must
   be the same words in the panel and in their inbox, and a durable `notification` row already read by
   a host must not silently re-render. Changing one of the six is UI-SPEC work.
3. **The blast radius is asserted.** `tests/notifications/ops-decision-notify.test.ts` pins these
   payloads, and 18.1-10's banned-language corpus is about to read the same strings. A copy edit made
   inside an unrelated plan would land in the middle of that.

**Recommended shape when someone owns it.** Either (a) re-word the lead so it is true of BOTH writers
without naming a mechanism ("Your FitOut host account is verified." — no actor, no inspection claim),
or (b) accept a second approval payload keyed on provider, which is worse: it would make the port's
provider name a thing the COPY layer branches on, and the whole point of the port is that nothing
outside `port.ts` learns a provider name.

⚠ Option (a) is strongly preferred and is a one-line change. Whoever takes it must also check
`tests/notifications/ops-decision-notify.test.ts` and 18.1-10's corpus in the same commit.

**Recommended owner:** **18.1-10** (the words) or **18.1-11** (the surface) — the two plans that own
host-facing verification copy, and the two that will be reading these exact strings anyway.
**→ Taken by 18.1-10. Nothing is left for 18.1-11 here.**

---

## D4 — TWO UNIT FILES TIME OUT UNDER SUITE-WIDE CONTENTION (18.1-13, 2026-09-02)

**Found during:** 18.1-13, gate 2 (`npm test`).

**Symptom.** The plan's FIRST full `npm test` took **5405s** (`import 26271.93s`, `tests 11133.68s`)
and reported `2 failed | 214 passed | 2 skipped (218)`. One of the two was
`tests/search/relaxation-ladder.test.ts > (b) stop at first hit … > runs exactly ONE query when the
radius rung gives` — `Error: Test timed out in 20000ms`. The other's identity was lost: the default
reporter's final frame had already overwritten it, and the background runner captured only that frame.

A second full run (**258s**) reported ONE different failure —
`tests/host/verification-panel.test.tsx > … > one press announces one thing: a second refusal REPLACES
the first rather than joining it`, with
`TestingLibraryElementError: Unable to find an accessible element with the role "button" and name
"Start the check"` — i.e. the control was caught mid-flight, still reading its in-flight label.

A third full run (**286s**) was fully green: `216 passed | 2 skipped (218)` · `2668 passed | 5 skipped`.

**Why it is deferred, not fixed:**

- **Unrelated surfaces.** 18.1-13 touched `src/app/actions/ops-contact.ts`,
  `src/components/ops/**`, `src/lib/validation/ops.ts`, `src/lib/design/live-regions.ts`,
  `src/lib/design/measurements.ts` and five test files. Neither failing file imports any of them.
  `relaxation-ladder` is search-ladder logic; `verification-panel` is 18.1-11's render test.
- **Both pass alone, fast.** `relaxation-ladder` 15 passed in **3.80s** against a 20s timeout — a
  ~5x margin, so this is contention and not a slow test. `verification-panel` 12 passed in 3.01s.
- **The 21x duration spread is the actual finding.** 5405s vs 258s on a byte-identical tree is the
  machine, not the suite; the two failures are what that spread does to a 20s timeout and to a test
  that presses a control twice in a row.

**Two things worth doing when someone owns this, neither of which is a timeout bump:**

1. **`verification-panel.test.tsx`'s second-press case has a real race**, independent of load: it
   presses, then presses again, and the second `getByRole` runs while the first press may still be
   in flight. The honest fix is to await the in-flight label leaving (or the region arriving) between
   the two presses rather than to widen a timeout. That is 18.1-11's file and its author's call.
2. **The reporter loses failure identity in a piped run.** `npm test > log` captured only the final
   frame, so a two-failure run named one file. Whoever next needs a durable transcript should pass a
   non-overwriting reporter rather than rediscovering this.

⚠ **Do NOT raise `testTimeout` on the strength of this entry.** A 5x margin when run alone is the
evidence that the tests are correctly sized; a raised timeout would hide a real regression later.

**Recommended owner:** whichever later plan touches `tests/host/verification-panel.test.tsx` (for
item 1) or the CI/test configuration (for item 2). If either failure ever reproduces **alone**, it is
a real finding rather than this entry.

---

## D5 — AN ABANDONED DIDIT FLOW LOCKS A HOST OUT OF THEIR OWN VERIFICATION FOR UP TO 7 DAYS

**✅ RESOLVED in 18.1-15** (2026-09-03) — the recommended shape below, implemented exactly, and
nothing beyond it.

`src/app/actions/host-verification.ts`'s guarded upsert now admits `pending` as a **third positive
equality**, bounded by the burst guard it already had. The write is a **RESUME**, not a submission:
`created_at = CASE WHEN host_verification.status = 'pending' THEN host_verification.created_at ELSE
now() END`, so a returning host keeps their ops-queue position — **FINDING F-1 in reverse**, and the
same line-jumping D-249 forbids, arrived at from the other side. The hosted URL is **still never
persisted** and is re-fetched on demand through the partner's own idempotency (ADDENDUM A3).
`/host/verify`'s `pending` panel draws the shipped form labelled **"Finish the check"**, sourced from
`src/lib/host/verification-signal.ts` like every other sentence; `HOST_VERIFICATION_REFUSALS` is still
six, because no new refusal sentence was authored.

**One thing this entry did NOT say, and it is the sharpest part of the fix.** A widening on its own
would have recreated D5 through its own remedy: a host pressing while a verdict was in flight — the
webhook dropped, the sweep's grace window not yet elapsed — would have minted a NEW billable session
and overwritten `vendor_ref`, orphaning a real answer for as long as the row lived. So a **new guard
5** asks the partner whether the session is still open BEFORE asking for one: `sessionOpen` joined the
ruling table in `src/lib/verification/didit-verdict.ts` (total over the ten, `false` on the unknown
branch) and `isDiditSessionOpen` on the adapter reads it through the shared mapper. A **FINISHED**
session is refused with the shipped 0-row sentence and a `session_closed` trail row. ⚠ The pre-check
is **not the gate** — the guarded `WHERE` still is, and the TOCTOU case is driven (case 17).

A `pending` row with a NULL or WHITESPACE handle **skips the ask and resumes**: there is nothing to
ask about, it would address a different endpoint, and such a row is invisible to the reconciliation
sweep's candidate query — so this press is its only escape.

Four mutations were run and scored, each reddening the case named for it: dropping the `pending`
equality reddened case 14; a plain `created_at = now()` reddened case 14's queue-stamp equality;
deleting the pre-check reddened case 15; dropping the blank-handle skip reddened case 16.

**And the reason this entry's own § "Why no gate could have caught this" now has one.** It was right
that no instrument in this phase could see a human timeline. What CI can see is the ROW that timeline
leaves behind, which is what cases 14-17 seed and drive. The hand-walk is still what FOUND it — that
is 18.1-14's earned place, and the finding's body below is left intact as the record of how.

**Found during:** 18.1-14 Task 1, the operator's sandbox walk (2026-09-02). Found by the PM, not by
a gate — no automated instrument in this phase can see it, and the reason why is itself the finding.

**⚠ NOTHING IS BROKEN. Every component behaves exactly as designed.** This is a gap *between* three
correct parts, which is why it survived plan review, execution, four green gates and a mutation pass.

### The symptom, reproduced and measured

The operator pressed *Start the check*, reached Didit's hosted flow, and walked away without
submitting a document. The panel then reads **"check is in progress"** and offers nothing further.

Measured state at 128 minutes after the press:

```
host_verification: status=pending  provider=didit  vendor_ref=8bb15a5c-a71e-4393-984b-033ef1f69278
GET /v3/session/{vendor_ref}/decision/  ->  200
   status      "Not Started"
   created_at  2026-09-02T13:38:24Z
   expires_at  2026-09-09T13:38:24Z     <-- SEVEN DAYS
   environment "sandbox"
```

### Why the host is stuck — three correct behaviours, composing badly

1. **They cannot re-press.** `src/app/actions/host-verification.ts`'s upsert `WHERE` admits only
   `status = 'unverified'` or a cooled-down `'rejected'`. **`pending` is deliberately absent**, so a
   second press is a calm 0-row no-op. That omission is right on its own terms — it is what stops a
   host minting a second session and paying twice.
2. **They cannot resume.** The hosted-flow URL is not stored. `vendor_ref` holds the `session_id`;
   the `url` carries a 12-character `session_token` which is a bearer secret, and D-263's
   "store a reason, not evidence" posture argues against persisting it. So the panel has no link to
   offer.
3. **The reconciliation sweep cannot help, and is right not to.** 18.1-09's sweep reads the decision
   endpoint and gets `"Not Started"` — a *live* session the host could still finish. F-3 releases the
   row on `Expired` / `Abandoned`, and neither is true yet. The sweep correctly does nothing.

So the row sits `pending` until `expires_at` — **up to seven days** — at which point Didit flips it to
`Expired`, the sweep sees it, and F-3 releases the host to `unverified`. The recovery path exists and
is correct. It is just seven days long.

⚠ **And D-262/D-263's "no route to a human" makes it sharper.** The panel deliberately offers no
support contact. A host in this state has no way forward and nobody to ask. Under D-255 they also
cannot create a listing. For a host who simply got distracted mid-signup — which is the common case,
not the edge case — that is a total onboarding stop.

### The fix, and it is cheap — ADDENDUM A3, now confirmed FIRST-HAND

`POST /v3/session/` is idempotent over unfinished sessions on the same `vendor_data`. Proven against
the live sandbox account on 2026-09-02, with the operator's own stuck session:

```
POST /v3/session/ { workflow_id, vendor_data: <the same host user id> }  ->  201
   session_id  8bb15a5c-a71e-4393-984b-033ef1f69278   <-- THE SAME SESSION
   status      "Not Started"
   url         https://verify.didit.me/session/On7Pi2cFzYOO   <-- a fresh, usable link
```

**Re-pressing while `pending` therefore returns the host their OWN session with a working URL.** No
duplicate session, no second charge, no new vendor state, and the `vendor_ref` already stored stays
correct. The vendor's own idempotency is what makes the guard in (1) unnecessary for this case — the
guard was written to prevent a duplicate the vendor already refuses to create.

**Recommended shape** (not implemented; this is a record, not a plan):
- Admit `pending` to the submission path's `WHERE`, bounded by the existing rate limiter, and treat
  the returned session as a *resume* rather than a new submission — `created_at` must NOT be
  re-stamped on this path, or the host jumps the ops queue (FINDING F-1 in reverse).
- The panel's `pending` state gains a way back in, sourced from `verification-signal.ts` like every
  other sentence.
- ⚠ Do not simply store the `url`. The `session_token` in it is a bearer secret for that host's
  verification flow; re-fetching it on demand is both safer and already proven to work.

### Why no gate could have caught this

The `pending` panel's copy is honest, its state machine is correct, and every unit and design test
passes. The defect only exists across a **human timeline** — press, leave, come back — which no
jsdom test, no vitest suite and no Playwright spec in this repo models. It needed a person to get
distracted. That is precisely what 18.1-14's hand-walk is for, and it earned its place here.

**Status:** **✅ RESOLVED — closed inside phase 18.1 by gap plan `18.1-15` (wave 8), 2026-09-03.**
The PM ruled on 2026-09-02 that it closes here rather than being carried to a follow-up phase, on the ground that
*the phase's stated goal is the verification path FitOut is legally required to have, and a path a
distracted host cannot complete is arguably not that path.*

`18.1-15-PLAN.md` implemented the recommended shape above and nothing beyond it: `pending` joins the
submission path's `WHERE` as a third POSITIVE equality bounded by the existing burst guard; the write
is a RESUME, so `created_at` is preserved by a `CASE` and the host keeps their ops-queue position
(**FINDING F-1 in reverse**); the hosted URL is still never persisted but is re-fetched on demand
through the partner's own idempotency (ADDENDUM A3); and a session the partner has already FINISHED
is refused rather than replaced, so a dropped verdict is never orphaned by a fresh `vendor_ref`. The
`pending` panel's way back in is one new `wayOut` label in `src/lib/host/verification-signal.ts`, and
no new refusal sentence is authored. **Marked RESOLVED by the executor of `18.1-15`**, on D3's
convention above — see the RESOLVED paragraph at the head of this entry.

---

## D6 — THE PHONE FITOUT RECORDS FOR A HOST IS SHAPE-CHECKED, NEVER VERIFIED

**Found during:** 18.1-14 Task 1, the operator's sandbox walk (2026-09-03). Surfaced from the dev
server log while watching the submission path, not by any gate.

**PM decision (2026-09-03): NOTED FOR LATER, not fixed in 18.1.** Recorded so it is a decision with a
reason rather than an oversight.

### What was measured

`src/app/actions/host-verification.ts`:

```
const PHONE_MIN   = 7;
const PHONE_MAX   = 20;
const PHONE_SHAPE = /^(?=.*[0-9])[0-9+\s-]+$/;
phone: z.string().trim().min(PHONE_MIN).max(PHONE_MAX).regex(PHONE_SHAPE),
```

Three real submissions during the walk, with their server timings — the timing is the tell, because a
refusal returns before any vendor call and an acceptance does not:

| Submitted | Outcome | Time | Reading |
|---|---|---|---|
| `"558"` | refused | 32ms / 18ms | below `PHONE_MIN`; **no vendor call** |
| `"666"` | refused | 23ms | below `PHONE_MIN`; **no vendor call** |
| `"09555339701"` | accepted | 1086ms | a real PH mobile; vendor call made |
| `"999999999999"` | **accepted** | 1017ms | twelve nines. Passes: ≥7, ≤20, digits only |

**The guard is real and worth keeping** — a malformed value is refused in ~20ms and cannot burn a
verification or a free-tier unit. That half works.

### The gap

The check is a **shape** check, not a validator, and the workflow has **no `PHONE_VERIFICATION`
module** — deliberately omitted, on cost. So nothing anywhere confirms the number belongs to the
host, or exists at all. A host can type twelve nines and FitOut will store it as their contact
number.

### Why it was not fixed now, and what makes it a real question later

§ 21(b)(1)/(3)'s requirement is that the platform **collect** contact details, and FitOut does — so
the legal box is arguably ticked and this is not a compliance blocker. **But OPS-06 exists so ops
can REACH a host** (18.1-13 shipped the audited contact reveal for exactly that), and an
unverifiable number does not deliver reaching. The two requirements point in different directions,
and only one of them is satisfied by a shape check.

⚠ **This is a business question dressed as a technical one, and it is the PM's, not the SWE's**:
whether "we recorded a number" or "we can actually call this host" is the standard FitOut is holding
itself to. Note that the ops contact reveal makes the weaker answer visible — an operator who
reveals a fake number learns it is fake only by dialling it.

### The option, priced

Didit sells **Phone Verification at $0.04** (`POST /v3/phone/send/` + `POST /v3/phone/check/`), or it
can be added to the workflow as a `PHONE_VERIFICATION` feature. Either way it is a per-check cost on
top of the current composition, and ⚠ **ADDENDUM A1 applies**: the free tier is per feature, so
adding a module changes the effective per-host cost — re-read A1 before pricing it, and re-run
`npm run didit:verify`, whose `DECLARED_WORKFLOW` would need to change in the same commit.

A cheaper middle path, if the goal is only to stop obvious nonsense: tighten `PHONE_SHAPE` toward
E.164 / PH mobile shape. That refuses twelve nines without buying a vendor module — but it still
cannot tell a well-formed wrong number from a right one, so it narrows the gap rather than closing it.

**Status:** OPEN — noted for a later milestone by PM decision, 2026-09-03. Not blocking 18.1.

---

## D7 — THREE CASES IN TWO FILES READ THE AMBIENT ENVIRONMENT INSTEAD OF STUBBING IT

**Found during:** 18.1-15, gate 6 (`npm test`). ⚠ **NOT a regression from 18.1-15** — that plan
touched neither file, neither is in its `files_modified`, and neither imports anything it changed.
What made them visible is that the operator's `.env.local` is currently pointed at the phone-walk
UAT stack (`BETTER_AUTH_URL` at the ngrok tunnel, `DIDIT_ENVIRONMENT` at the sandbox value), which
18.1-15's own environment brief said to leave alone and not depend on.

### What was measured

The first `npm test` reported `3 failed | 213 passed` — five cases across three files:

```
tests/auth/login-reachable-after-reset.test.ts  case 6   AssertionError: expected false to be true
tests/auth/login-reachable-after-reset.test.ts  case 6b  AssertionError: expected false to be true
tests/auth/stale-session-selfheal.test.ts       case 3   AssertionError: expected undefined not to be undefined
tests/verification/didit-webhook.test.ts        case 24  expected 'approved' to be 'pending'
tests/host/verification-panel.test.tsx          (a form case, contention only — D4)
```

**Each was then isolated, and the cause is the ambient value in every case:**

| Run | Result |
|---|---|
| `npx vitest run tests/verification/didit-webhook.test.ts` | `1 failed \| 27 passed` — reproduces ALONE |
| `DIDIT_ENVIRONMENT=live npx vitest run tests/verification/didit-webhook.test.ts` | **`28 passed`** |
| `npx vitest run tests/auth/login-reachable-after-reset.test.ts` | `2 failed \| 5 passed` — reproduces ALONE |
| `BETTER_AUTH_URL=http://localhost:3000 npx vitest run` (both auth files) | **`11 passed`** |
| `npx vitest run tests/host/verification-panel.test.tsx` | **`12 passed`** — D4's contention, not this entry |
| `BETTER_AUTH_URL=... DIDIT_ENVIRONMENT=live npm test` | **`216 passed \| 2 skipped`, `2678 passed`** |

The webhook one is mechanical and worth spelling out, because it is the sharpest of the three.
`src/app/api/didit/webhook/route.ts`'s `environmentAccepted` ends
`return environment === (process.env.DIDIT_ENVIRONMENT ?? "live")`, and case 24 stubs `NODE_ENV`
to production and asserts that a `sandbox` envelope is REFUSED — but it never stubs
`DIDIT_ENVIRONMENT`. With the deployment declaring sandbox, accepting a sandbox envelope is the
CORRECT behaviour of the shipped code, so the case is asserting a deployment posture rather than a
guarantee.

### Why this is a real finding rather than "the operator's env is odd today"

**Every other file in this phase's verification family states the opposite rule in its own header**,
in as many words: *"NO CASE MAY DEPEND ON A REAL CREDENTIAL BEING PRESENT **OR** ABSENT … a case that
passed only where the real key exists would be a case nobody else can run"*
(`tests/ops/host-verification-submit.test.ts`, and `tests/verification/didit-session.test.ts` says it
again). Those files stub with `vi.stubEnv` and obvious fakes. These three cases are the same defect
the rule was written about, and they have been latent since they were written — green on a machine
whose `.env.local` happened to agree with them, which is precisely the property the rule forbids.

The cost of leaving it is not a red gate. It is that **case 24 stops measuring the thing it exists
for**: a mocked sandbox verdict approving a real host (ADDENDUM A4, the inbound half of a guarantee
whose outbound half `sandbox_scenario`-refused-on-live only partly covers). A case that agrees with
whatever the environment says cannot notice that check being removed.

### Recommended shape when someone owns it

`vi.stubEnv("DIDIT_ENVIRONMENT", "live")` in `tests/verification/didit-webhook.test.ts`'s
`beforeEach`, and the sandbox-deploy direction driven as its OWN case (stub it to the sandbox value
and assert a `live` envelope is refused) — which is the case that is actually missing today, and it
would turn one ambient-dependent assertion into two independent ones. The two auth files want the
same treatment for `BETTER_AUTH_URL`; `tests/verification/didit-session.test.ts:168` already ships
the idiom (`vi.stubEnv("BETTER_AUTH_URL", APP_ORIGIN)`).

⚠ **Do NOT "fix" this by editing `.env.local`.** That file is the operator's UAT stack while the
phone walk is live, and a test that needs it to hold a particular value is the defect rather than
the remedy.

**Recommended owner:** whichever later plan next touches the Didit webhook route or the auth
middleware. If any of the three ever reproduces with the env vars STUBBED, it is a real finding
rather than this entry.

**Status:** OPEN — recorded by 18.1-15, not fixed by it (out of scope: three files it does not own,
and a green gate under a stubbed env is the proof it is not this plan's).


---

## D8 — `tests/host/verification-panel.test.tsx` IS FLAKY UNDER SUITE CONTENTION, AND THE FAILING CASE MOVES

**Found during:** the 18.1-15 close-out gate run (orchestrator, 2026-09-03). Same root cause as
**D4**; different symptom, and a third file, so recorded separately rather than folded in.

### What was measured

Two consecutive full-suite runs, same commit, no source change between them:

| Run | Failing case in this file |
|---|---|
| 1 | *"hands the typed phone to the action and locks the control while the press is out"* |
| 2 | *"one press announces one thing: a second refusal REPLACES the first rather than joining it"* |

**Solo, the file passes 12/12 — three times in a row:**

```
solo run 1:  Tests  12 passed (12)
solo run 2:  Tests  12 passed (12)
solo run 3:  Tests  12 passed (12)
```

⚠ **The failing case MOVES between runs**, which is the signature that matters. A stable failure is a
defect; a wandering one is contention. Both cases that failed are the file's async-timing cases — a
press that must lock a control while it is in flight, and a second announcement that must replace
rather than append. Both depend on how promptly a microtask settles, which is exactly what a loaded
machine perturbs.

### Why it is deferred rather than fixed

- **It is not this phase's defect.** D4 already records two other unit files timing out under
  suite-wide contention on the same box, on the same day, from before 18.1-15 existed. The mechanism
  is the runner and the machine, not the panel.
- **The panel's behaviour is not in doubt.** The same twelve cases pass solo, repeatedly, and
  18.1-15's own mutation pass reddened the cases it targeted. The assertions work; their *timing
  budget* is what fails.
- Fixing it properly means either widening the async waits (which weakens the very timing property
  the two cases exist to pin) or isolating the file's pool — both are real design choices about the
  test suite, not a one-line patch, and neither belongs in a phase close-out.

### ⚠ Why it must not be left indefinitely

**A flaky gate is a gate that gets ignored**, and this repo has already paid for that: D-24 records
that the seven Playwright specs do not run in CI, and `axe-sweep`'s own completeness self-check sat
RED through four review passes partly because nobody trusted what they were seeing. A unit file that
reddens a different case on each full run trains a reader to re-run rather than read — and the next
real regression in this file will be dismissed as "that flaky one".

**How to tell them apart in the meantime:** a real failure in this file reproduces SOLO. Run
`npx vitest run tests/host/verification-panel.test.tsx` before believing a suite-run red. If solo is
green, it is this. If solo is red, it is not.

**Status:** OPEN — carried with D4 as one suite-contention problem to fix together, outside 18.1.

### D6 addendum (PM, 2026-09-03) — two more facts, found during the 18.1-14 hand-measure

**1. The stored phone is NOT normalised, and the same number lands three ways.** Measured on the
operator's own submissions during the pending reading — all three reached the action, and the stored
value is simply whichever was last:

```
typed:   +639555339701   09555339701   9555339701
stored:  9555339701      (length 10, no country code, no leading zero)
```

`src/app/actions/host-verification.ts:605` is `set({ phone: parsed.data.phone })` — the trimmed input
verbatim, with no canonicalisation anywhere between the field and the column. ⚠ **This lands directly
on OPS-06**: 18.1-13 shipped the audited contact reveal so ops can REACH a host, and an operator
handed `9555339701` cannot tell whether it is missing a `0` or a `+63`. The shape check accepts all
three, so the ambiguity is by construction, not by accident.

**2. The panel does not pre-fill the field from the stored value.** The PM expected a host returning
to a `pending` panel to see the number they already gave. It is saved — `user.phone` holds it — but
`/host/verify`'s page passes no phone to `verification-panel.tsx`, and the input carries no
`defaultValue`, so the field renders empty on every load. What looked like "the number does not save"
was the field not echoing it back.

**Deliberately NOT fixed as a one-off.** The pre-fill alone is ~20 minutes, but it would redisplay an
un-normalised string as though it were canonical — so the honest version of this change needs the
storage FORMAT decided first, which is the same decision D6 already parks. Doing them together means
touching `host-verification.ts` and the panel once instead of twice, and it keeps the displayed value
and the dialable value the same thing.

**Sequence when D6 is picked up:** decide the format (E.164 is the obvious candidate, and Didit's own
`contact_details.phone` requires it) → normalise on write → backfill the one existing row → then
pre-fill the field from the normalised column. ⚠ Only ONE user in the whole dev database has a phone
at all, so the backfill is trivial today and will not be later.

---

## D9 — D-274: OPS CONTACTS ARE COPYABLE TEXT, NOT LINKS (PM decision, 2026-09-03)

**Found during:** 18.1-14 Task 2, the operator's `/ops` hand-measure. The readings otherwise passed.

**PM decision, verbatim in substance:** the revealed email and phone must not be clickable and must
not open a mail app. They are to be **plain, easily copy-pasteable text**.

### Why this is a tightening rather than a change of direction

18.1-13 shipped the reveal with a `mailto:` anchor, and to do that it had to **widen the queue row's
TERMINAL assertion** — the Phase-18 property that the row renders **zero anchors and zero
link-role elements**. Its summary records the amendment: *"zero destination anchors + at most one
`mailto:`, with `[role="link"]` untouched at zero"*.

**Removing the anchor returns the row to strictly terminal**, which is the property Phase 18
originally asserted and the one the row's own test file says it "knows an anchor would fail". So this
decision does not fight the design; it restores it.

### What it touches

- `src/components/ops/ops-contact-reveal.tsx` — the anchor becomes text.
- `tests/ops/ops-queue-row.test.tsx` — assertion 1's `mailto:` allowance is REMOVED and the count
  returns to zero destination anchors. ⚠ The shipped guard-the-guard must stay byte-unchanged, and
  18.1-13's SECOND guard-the-guard (which proves the filter still reports a real page destination)
  must keep doing so.
- ⚠ **`tests/ops/host-contact-reveal.test.ts`** asserts **focus lands on the email anchor** after a
  successful reveal. With no anchor there is nothing to focus. **That behaviour must be redesigned,
  not deleted** — a reveal still has to announce itself to a screen reader, and the live region is
  already there. The honest replacement is to move focus to the revealed block (or announce it) and
  to say so at the site; silently dropping the assertion would remove an accessibility guarantee
  under cover of a styling change.
  - ⚠⚠ **BOTH HALVES OF THAT BULLET WERE WRONG AND ARE CORRECTED BY 18.1-16 — see the closing note
    at the end of this section.** `host-contact-reveal.test.ts` has **no** DOM, no `focus`, no
    `activeElement` and no `mailto` (it is the server-action audit/authz file) and it is
    **byte-unchanged** by the fix; the real assertion was in `tests/ops/ops-queue-row.test.tsx`.
    And the live region was **not** "already there" for this purpose — it exists for the REFUSAL
    path only, and `src/lib/design/live-regions.ts` **forbids** a success one. The bullet's
    *instruction* was nevertheless right, and 18.1-16 honoured it: the behaviour was redesigned.
- `18.1-UI-SPEC.md` § Surface 4 § The interaction states the focus-to-anchor behaviour and must be
  amended in the same commit.

### What must NOT change

- OPS-06's audit: every reveal stays on the record, written in the same call as the read.
- The `Not Provided` rendering for a host with no phone (confirmed by hand in this same reading).
- `review-queue.ts` stays byte-unchanged — F-6's resolution keeps contacts out of the RSC payload;
  the reveal remains an on-demand, audited fetch.
- No support address appears anywhere (confirmed in this reading).

**Status:** ✅ **RESOLVED in 18.1-16** (2026-09-03). Shipped, gated and re-read in a real browser.

**What shipped.** The revealed email is now `<span ref={emailRef} tabIndex={-1}>{contact.email}</span>`
inside the same `<dd>` the anchor occupied. The phone is unchanged — it was already plain text, and
the island's own header already argued it should never become a link, so **D-274 made the email match
the phone** rather than changing direction on either. Measured in Chromium at 320 and 1280, in court
and grove, on a host row and a listing row (8 readings, all pass): zero anchors before or after a
reveal, `cursor: auto`, `text-decoration-line: none`, the same ink as its `<dd>`, `Enter` on the value
leaves the URL unchanged and opens no window, and the value selects and copies to exactly its own
text. The full transcript is in `18.1-16-SUMMARY.md`.

**Which announcement replacement was chosen, and why not the other.** Chosen: **the revealed VALUE
becomes the focus target** — every property the anchor's focus move had is carried by the target's
POSITION (same `<dd>`, so the `<dt>` context is spoken; its text IS the address), so what was removed
is the word "link" and not the announcement. `booking-reference.tsx:143-153` is the shipped precedent
for a `tabIndex={-1}` value the user copies. Rejected: **announcing through a live region** — one
line, because it is the reason that decides it: `src/lib/design/live-regions.ts` does not merely omit
a success region for this file, it states *"⚠ SO NO SUCCESS REGION MAY BE ADDED HERE"*, and a polite
region beside a focus move is two announcements for one outcome (GATE-03 rule 6). It would also have
moved `LIVE_REGION_IDS`, `AUTHOR_NAMED_REGIONS` and `ops-queue-row.test.tsx`'s
one-`[role="status"]`-per-row assertion; the shipped shape moves **no count**.

⚠ **What `18.1-16` corrects in "What it touches" above.** `tests/ops/host-contact-reveal.test.ts`
does **not** assert focus — it is the server-action audit/authz file (11 cases, no DOM) and it is
**byte-unchanged**, gated by `git diff --exit-code`. The focus assertion was in
`tests/ops/ops-queue-row.test.tsx:363-370`. Two files moved with the fix that D9 did not name:
`tests/design/site-contacts.test.ts` (`EXCLUDED_MAILTO` lives **there**, not in the row test, and it
is now **deleted** — D-26's ban is back to zero declared exemptions across all of `src/`) and
`src/lib/design/live-regions.ts` (prose only; `LIVE_REGION_FILES` still 31).

⚠ **Phase 18's roadmap checkbox is now DISCHARGEABLE and 18.1-16 deliberately did NOT tick it.** The
reason the box was held is gone, but ticking it is the verifier's / orchestrator's call, not a plan's.
`REQUIREMENTS.md`'s `:180` ledger line says the same thing.

---

## D10 — `NavDrawer` LOGS A HYDRATION MISMATCH IN THE DEV SERVER (almost certainly the `[12-08]` dev-mode class)

**Found during:** 18.1-16, the four rendered readings. Logged, **not fixed** — pre-existing and
outside this plan's surface.

**Symptom.** Every one of the four Playwright runs printed the same `[WebServer]` warning, on any
route under `(host)`:

```
Hydration failed because the server rendered HTML didn't match the client
  at Button (src/components/ui/button.tsx:143:5)
  at DialogTrigger (src/components/ui/dialog.tsx:19:10)
  at ResponsiveDialog (src/components/patterns/responsive-dialog.tsx:250:18)
  at NavDrawer (src/components/patterns/site-chrome.tsx:308:5)
  at SiteNav (src/components/patterns/site-chrome.tsx:342:9)
  at AmbientHostNav (src/components/patterns/ambient-notifications.tsx:176:10)
  at HostLayout (src/app/(host)/host/layout.tsx:96:13)
```

The diff is Radix's `aria-controls="radix-_R_ad5ritulb_"` / `data-state` / `aria-expanded` on the
drawer trigger — i.e. an id and state the client generates.

**Why it is deferred, not fixed:**

- **Unrelated surface.** 18.1-16 touched `ops-contact-reveal.tsx`, `live-regions.ts` (prose) and two
  test files. None is in `site-chrome.tsx`'s import graph and none renders a `ResponsiveDialog`.
- **`npm run build` (gate 4) is clean**, and **all four readings passed** — 17 + 2 + 2 spec results
  plus this plan's own 6-case reading, zero failures.
- ⚠ **This repository has already measured this exact class and named it.** STATE `[12-08]`:
  *"was a DEV-MODE ARTEFACT, measured on a 2×2 matrix rather than a before/after… present → dev
  `Hydration failed × 1` / prod **0**"*. Same shape (a Radix provider/trigger), same dev-only
  visibility. Treating it as a defect without running that discriminator would repeat the mistake
  `[12-08]` corrected.

**Recommended owner + first step:** whichever later plan touches `site-chrome.tsx` or
`responsive-dialog.tsx`. **Run the `[12-08]` discriminator FIRST** — the same seeded route under
`npm run build && npm start` versus `npm run dev` — before believing it is real. A prod-clean reading
closes it as the same artefact; a prod-red reading makes it a genuine finding about the drawer.

---

## D11 — FIVE STALE `e2e_bk_host_*` FIXTURE HOSTS IN THE DEV DATABASE (2026-08-29/30)

**Found during:** 18.1-16, while confirming this plan's own Playwright teardowns were clean.

**What is there.** `select … from "user" where id like 'e2e_bk_host_%'` returns five rows created
**2026-08-29 11:35** through **2026-08-30 16:52** — days before this plan ran. 18.1-16's own fixtures
tore down completely (its `afterAll` ran `staffTeardown()` then `seed.teardown()`, and no row from
2026-09-03 remains), so these are residue from earlier e2e runs that ended before their `afterAll`,
not from this one.

**Why it is deferred, not fixed:** it is dev-database hygiene rather than a product defect, and
deleting rows from the operator's dev DB is not a plan executor's call — `seedBookableListing`'s
teardown is ORDERED against foreign keys (`listing_review.listing_id` is `ON DELETE RESTRICT`), so
ad-hoc deletion is exactly the trap that helper's header warns about. ⚠ It is also worth knowing that
**the Playwright specs run against the DEV database** (`playwright.config.ts`'s `webServer.env` merges
over `process.env` without overriding `DATABASE_URL`), so this residue is visible to a hand-walk of
`/ops` as extra queue rows.

**Recommended owner:** whoever next does a dev-DB reset, or a plan that adds a `npm run e2e:sweep`
teardown for orphaned `e2e_bk_host_%` / `e2e.staff.%` rows. ⚠ **Do not delete `host@fitout.test`** —
that is the operator's UAT host and 18.1-16 confirmed it untouched by this plan (`pending`, live
`vendor_ref`, `updated_at 2026-09-03 06:02:56+00`, which predates every run here).
