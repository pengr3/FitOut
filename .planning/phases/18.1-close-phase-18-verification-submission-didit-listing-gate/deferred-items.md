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
