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

**Status:** OPEN (D5) — awaiting the PM's call on whether it closes inside 18.1 as a gap plan or is
carried to a follow-up phase.
