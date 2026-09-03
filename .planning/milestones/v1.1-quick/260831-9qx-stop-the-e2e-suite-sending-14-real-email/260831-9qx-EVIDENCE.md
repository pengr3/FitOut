# `260831-9qx` — EVIDENCE

`[17-D28]`: the e2e suite POSTs to `api.resend.com` on a live key, 14 times across two spec files.
This file is the before/after reading that closes it, plus the positive controls that make the zero
mean something.

**Every number below was measured on this box. Nothing here is inferred from the § P3 record** — § P3's
counts are quoted only as the third column, to be read against.

---

## 0 — Build provenance

| | |
|---|---|
| BEFORE drives (Task 1) | commit **`13dc834`** (`docs(quick-99f): complete guard-the-checkout-sticky-bar-clearance`), branch `dev` |
| AFTER drives (Task 3A) | commit **`57a85e1`** (`fix(quick-9qx): stop every Playwright run sending real email, and pin the zero`), branch `dev` |
| seam comment amendment | commit **`ef8c34a`** |
| Node | **v24.13.0** |
| Next | **16.2.7** (Turbopack) |
| Playwright | **1.60.0** |
| Vitest | **4.1.8** |
| `.next/` | **cleared (`rm -rf .next`) before each of: the BEFORE overflow drive, the AFTER overflow drive, and the `paymongo-seam` re-run.** `instrumentation.ts:107-111` records why: a change to that file wedges the next boot with `MODULE_UNPARSABLE`, and Playwright reports that only as *"webServer was not able to start"*. |
| ports | `:3000` and `:3100` confirmed free before every drive (`netstat -ano`). Nothing was ever adopted. |
| DB | `docker compose ps` → `db` **running** throughout |
| drive flags | per file, **alone**, `--project=chromium --workers=1 --reporter=list` — identical to § P3 |
| `.env.local` `RESEND_API_KEY` | present, prefix **`re_`**, length **36**. ⚠ **Checked by prefix and length only. The value was never read, printed, logged or committed by any step of this task, and `.env.local` was never edited or deleted.** |

### Zero real emails were sent by this task, including during measurement

Both the BEFORE and AFTER drives ran under an instrument that **intercepts** `https://api.resend.com/*`
and does not delegate. § P3 already paid for the record that the 14 really left the machine; that record
stands and was not re-purchased. The opt-in control (§ 3) is therefore also a strict improvement on
§ P3's own control, which cost 2 real sends.

---

## 1 — The instrument, and the honest statement of what it is

A **throwaway, uncommitted** addition to the shipped root `instrumentation.ts`, in the same idiom
§ P3 and § P3-AFTER used and disposed of. It was appended strictly **after** `setGlobalDispatcher`, so
everything the seam does was byte-identical to the committed file throughout. It is gone: the only
change this task leaves in that file is the comment amendment at `ef8c34a`, whose diff contains **no
non-comment line**.

`src/instrumentation.ts` was deliberately **not** created. 17.1 recorded only that both locations are
loaded, not what happens when both exist, and this was not the plan to find out.

Each clause, and why:

- **Wraps `globalThis.fetch`, preferring Next's `_nextOriginalFetch` capture as the delegate and seeding
  that slot back to itself.** The census therefore sits BELOW Next's caching patch — a cached response
  cannot hide an outbound attempt — and a later `patchFetch()` wraps the census rather than discarding
  it.
- **Installs once per process** behind `__resendCensusInstalled`. A wrapper wrapping itself doubles
  every count, which is the exact way a census lies.
- **Logs method, full URL and a per-URL counter** to stdout AND to a file (a dev console scrolls; the
  transcript is the deliverable). **Method and URL only — no header, no body, no environment value.**
  The one env fact it prints is a *shape*, not a value: `resend_key_set=yes|no` and
  `resend_key_len=<n>`, which is what makes the AFTER drives' `resend_key_set=no` a direct proof that
  `webServer.env` reached the booted server process.
- **For `https://api.resend.com/*` it does NOT delegate.** It counts and returns a canned `200`,
  `content-type: application/json`, body `{"id":"census","from":"","to":[""],"created_at":""}` — the
  success shape the Resend SDK already handles, so `send()` takes the branch it takes on a real success
  and the app's behaviour is unchanged.
- **Everything else is delegated untouched and logged** as `PASSTHRU`. That is why `api.paymongo.com`
  appears below as `PASSTHRU`: the census handed it to the layer beneath, where the shipped MockAgent
  seam intercepted it. Those requests did not leave the machine either.

### ⚠ One observed side effect of the throwaway, recorded rather than hidden

The instrument's `await import("node:fs")` produced an Edge-Runtime bundling complaint on every boot
(*"A Node.js module is loaded ('node:fs' at line 177) which is not supported in the Edge Runtime"* →
*"Ecmascript file had an error"*). It is a bundling diagnostic for the middleware/edge bundle, which
`register()` returns from at guard 2 before reaching any of this. It changed no result: **every drive
below reports exactly the pass/skip/fail counts § P3 reports for the same file.** The instrument is
gone, so the diagnostic is gone with it.

---

## 2 — THE POSITIVE CONTROL, in every transcript

*A census that reports `0` because it never installed is the vacuity failure this repo has met before* —
and quick `260831-99f`, the task immediately before this one, found a guard that **PASSED over a tree
where its subject had been deleted**. An "zero emails sent" assertion is exactly that shape. So the
instrument ends by calling `fetch("https://api.resend.com/__census_selftest__")` on itself, under a
`SELFTEST` tag excluded from every per-spec count **by construction** rather than by remembering to
subtract one.

Verbatim, and present in **all five** transcripts:

```
SELFTEST GET https://api.resend.com/__census_selftest__ #1
SELFTEST-RESULT status=200 body={"id":"census","from":"","to":[""],"created_at":""}
```

That pair proves three things at once: the wrapper is on the global in a real Next 16.2.7 dev boot from
the repo root; the Resend branch fires and does not delegate; and the body is the synthesized census
shape, not anything Resend could have produced.

---

## 3 — THE READING — transcripts, verbatim

The `#n` suffix is a per-URL counter across the **server process** lifetime. `reuseExistingServer` is
`false` after `57a85e1`, and Playwright shuts down the server it started, so each drive below is its own
process and its own counter. The transcript file was truncated between drives regardless.

### 3.1 BEFORE — `e2e/overflow-320.spec.ts` at `13dc834` · `100 passed · 7 skipped` in 3.4m, **0 failed**

```
INSTALLED pid=16604 node=v24.13.0 at=2026-08-30T23:14:27.862Z resend_key_set=yes resend_key_len=36
SELFTEST GET https://api.resend.com/__census_selftest__ #1
SELFTEST-RESULT status=200 body={"id":"census","from":"","to":[""],"created_at":""}
PASSTHRU POST https://telemetry.nextjs.org/api/v1/record #1
PASSTHRU POST https://telemetry.nextjs.org/api/v1/record #2
PASSTHRU POST https://telemetry.nextjs.org/api/v1/record #3
PASSTHRU POST https://telemetry.nextjs.org/api/v1/record #4
PASSTHRU GET https://registry.npmjs.org/-/package/next/dist-tags #1
RESEND POST https://api.resend.com/emails #1
RESEND POST https://api.resend.com/emails #2
RESEND POST https://api.resend.com/emails #3
RESEND POST https://api.resend.com/emails #4
RESEND POST https://api.resend.com/emails #5
RESEND POST https://api.resend.com/emails #6
RESEND POST https://api.resend.com/emails #7
RESEND POST https://api.resend.com/emails #8
RESEND POST https://api.resend.com/emails #9
PASSTHRU GET https://api.paymongo.com/v1/checkout_sessions/cs_e2e_dadf84e5-8c7d-43bf-8e5f-cad3b56022d0 #1
PASSTHRU GET https://api.paymongo.com/v1/checkout_sessions/cs_e2e_dadf84e5-8c7d-43bf-8e5f-cad3b56022d0 #2
PASSTHRU GET https://api.paymongo.com/v1/checkout_sessions/cs_e2e_dadf84e5-8c7d-43bf-8e5f-cad3b56022d0 #3
PASSTHRU GET https://api.paymongo.com/v1/checkout_sessions/cs_e2e_dadf84e5-8c7d-43bf-8e5f-cad3b56022d0 #4
PASSTHRU GET https://api.paymongo.com/v1/checkout_sessions/cs_e2e_39765804-b633-47ad-9902-11e01b6e353f #1
PASSTHRU GET https://api.paymongo.com/v1/checkout_sessions/cs_e2e_39765804-b633-47ad-9902-11e01b6e353f #2
RESEND POST https://api.resend.com/emails #10
PASSTHRU POST https://api.paymongo.com/v1/linked_accounts/onboarding_links #1
PASSTHRU POST https://api.paymongo.com/v1/linked_accounts/onboarding_links #2
RESEND POST https://api.resend.com/emails #11
RESEND POST https://api.resend.com/emails #12
```

`grep -c '^RESEND '` = **12**.

### 3.2 BEFORE — `e2e/axe-sweep.spec.ts` at `13dc834` · `58 passed · 36 skipped` in 2.1m, **0 failed**

```
INSTALLED pid=19188 node=v24.13.0 at=2026-08-30T23:18:17.027Z resend_key_set=yes resend_key_len=36
SELFTEST GET https://api.resend.com/__census_selftest__ #1
SELFTEST-RESULT status=200 body={"id":"census","from":"","to":[""],"created_at":""}
PASSTHRU POST https://telemetry.nextjs.org/api/v1/record #1
PASSTHRU POST https://telemetry.nextjs.org/api/v1/record #2
PASSTHRU POST https://telemetry.nextjs.org/api/v1/record #3
PASSTHRU POST https://telemetry.nextjs.org/api/v1/record #4
PASSTHRU GET https://registry.npmjs.org/-/package/next/dist-tags #1
RESEND POST https://api.resend.com/emails #1
RESEND POST https://api.resend.com/emails #2
PASSTHRU POST https://api.paymongo.com/v1/linked_accounts #1
PASSTHRU POST https://api.paymongo.com/v1/linked_accounts #2
```

`grep -c '^RESEND '` = **2**.

### 3.3 AFTER — `e2e/overflow-320.spec.ts` at `57a85e1` · `100 passed · 7 skipped` in 3.4m, **0 failed**

```
INSTALLED pid=12048 node=v24.13.0 at=2026-08-30T23:27:48.845Z resend_key_set=no resend_key_len=0
SELFTEST GET https://api.resend.com/__census_selftest__ #1
SELFTEST-RESULT status=200 body={"id":"census","from":"","to":[""],"created_at":""}
PASSTHRU POST https://telemetry.nextjs.org/api/v1/record #1
PASSTHRU POST https://telemetry.nextjs.org/api/v1/record #2
PASSTHRU POST https://telemetry.nextjs.org/api/v1/record #3
PASSTHRU POST https://telemetry.nextjs.org/api/v1/record #4
PASSTHRU GET https://registry.npmjs.org/-/package/next/dist-tags #1
PASSTHRU GET https://api.paymongo.com/v1/checkout_sessions/cs_e2e_a84fc540-00d3-4fa1-b9cf-dfd3cfceed72 #1
PASSTHRU GET https://api.paymongo.com/v1/checkout_sessions/cs_e2e_a84fc540-00d3-4fa1-b9cf-dfd3cfceed72 #2
PASSTHRU GET https://api.paymongo.com/v1/checkout_sessions/cs_e2e_a84fc540-00d3-4fa1-b9cf-dfd3cfceed72 #3
PASSTHRU GET https://api.paymongo.com/v1/checkout_sessions/cs_e2e_a84fc540-00d3-4fa1-b9cf-dfd3cfceed72 #4
PASSTHRU GET https://api.paymongo.com/v1/checkout_sessions/cs_e2e_bb958448-043c-41ed-af9c-ba036330e5cf #1
PASSTHRU GET https://api.paymongo.com/v1/checkout_sessions/cs_e2e_bb958448-043c-41ed-af9c-ba036330e5cf #2
PASSTHRU POST https://api.paymongo.com/v1/linked_accounts/onboarding_links #1
PASSTHRU POST https://api.paymongo.com/v1/linked_accounts/onboarding_links #2
```

`grep -c '^RESEND '` = **0**. The `INSTALLED` line reads `resend_key_set=no resend_key_len=0` — the
booted server's own process env, proving `webServer.env` applied.

### 3.4 AFTER — `e2e/axe-sweep.spec.ts` at `57a85e1` · `58 passed · 36 skipped` in 2.2m, **0 failed**

```
INSTALLED pid=18760 node=v24.13.0 at=2026-08-30T23:31:27.153Z resend_key_set=no resend_key_len=0
SELFTEST GET https://api.resend.com/__census_selftest__ #1
SELFTEST-RESULT status=200 body={"id":"census","from":"","to":[""],"created_at":""}
PASSTHRU POST https://telemetry.nextjs.org/api/v1/record #1
PASSTHRU POST https://telemetry.nextjs.org/api/v1/record #2
PASSTHRU POST https://telemetry.nextjs.org/api/v1/record #3
PASSTHRU POST https://telemetry.nextjs.org/api/v1/record #4
PASSTHRU GET https://registry.npmjs.org/-/package/next/dist-tags #1
PASSTHRU POST https://api.paymongo.com/v1/linked_accounts #1
PASSTHRU POST https://api.paymongo.com/v1/linked_accounts #2
```

`grep -c '^RESEND '` = **0**.

### 3.5 THE OPT-IN CONTROL — `e2e/axe-sweep.spec.ts` at `57a85e1`, `FITOUT_E2E_REAL_EMAIL=1` · `58 passed · 36 skipped` in 2.1m, **0 failed**

```
INSTALLED pid=15892 node=v24.13.0 at=2026-08-30T23:33:50.304Z resend_key_set=yes resend_key_len=36
SELFTEST GET https://api.resend.com/__census_selftest__ #1
SELFTEST-RESULT status=200 body={"id":"census","from":"","to":[""],"created_at":""}
PASSTHRU POST https://telemetry.nextjs.org/api/v1/record #1
PASSTHRU POST https://telemetry.nextjs.org/api/v1/record #2
PASSTHRU POST https://telemetry.nextjs.org/api/v1/record #3
PASSTHRU POST https://telemetry.nextjs.org/api/v1/record #4
PASSTHRU GET https://registry.npmjs.org/-/package/next/dist-tags #1
RESEND POST https://api.resend.com/emails #1
RESEND POST https://api.resend.com/emails #2
PASSTHRU POST https://api.paymongo.com/v1/linked_accounts #1
PASSTHRU POST https://api.paymongo.com/v1/linked_accounts #2
```

`grep -c '^RESEND '` = **2** — back to the Task 1 value, on the same commit as the zeros. **The zero is
caused by the fix and by nothing else that changed.** `resend_key_len=36` is the second half of the same
proof: the `{}` branch emits no `RESEND_API_KEY`, the merge inherits `process.env`, `@next/env` supplies
`.env.local`'s value because the key is `undefined` in the initial env, and the operator's real key
reaches the server — without this config ever reading it.

The flag's stderr warning was confirmed to fire, and to fire **only** with the flag (`--list`, no server
booted):

```
[playwright] FITOUT_E2E_REAL_EMAIL=1: RESEND_API_KEY is INHERITED from your environment and this run WILL send real email to the synthetic addresses the fixtures mint (17-D28).
```

---

## 4 — THE TABLE, read line by line against § P3

| spec | method + full URL | § P3 (2026-08-30, `9683ad9`) | BEFORE (`13dc834`) | AFTER (`57a85e1`) | opt-in (`FITOUT_E2E_REAL_EMAIL=1`) |
|---|---|---|---|---|---|
| `e2e/overflow-320.spec.ts` | `POST https://api.resend.com/emails` | **12** | **12** | **0** | not driven |
| `e2e/axe-sweep.spec.ts` | `POST https://api.resend.com/emails` | **2** | **2** | **0** | **2** |
| **total** | | **14** | **14** | **0** | — |
| — | `SELFTEST` (excluded from every count above) | 1 | 1 per drive | 1 per drive | 1 |

**§ P3 reproduced exactly**, so the before/after is a like-for-like reading and not a comparison across
two different measurements. **14 → 0.**

**Pass/skip/fail is unchanged in every cell**: `overflow-320` 100/7/0 before and after; `axe-sweep`
58/36/0 before, after, and under the opt-in. No spec depended on delivery — verified by re-reading both
headers that need an emailed token before shipping: `e2e/password-reset.spec.ts:8-10` and
`e2e/stale-session-selfheal.spec.ts:44-50` both read the token from the Postgres `verification` table,
and the latter says so in as many words — *"Reading the DB … is also the only strategy that survives
`RESEND_API_KEY` being set."*

---

## 5 — THE FOUR WATCHED REDS on `tests/design/e2e-email-silence.test.ts`

Each mutation applied **alone**, observed, reverted; the file green again after each. Failure text
verbatim.

**Red 0 — the whole file before the fix existed** (`tests/design/e2e-email-silence.test.ts` written
first, `playwright.config.ts` still untouched): **2 failed | 3 passed**.

```
AssertionError: webServer must declare an env block at all: expected undefined to be truthy
AssertionError: expected true to be false // Object.is equality
```

Both failures are LINK 1's; LINK 2 was already green. That split is the honest one and worth stating:
the *mechanism* was always correct, and it was the *config* that had no instrument.

| # | mutation | result | verbatim failure |
|---|---|---|---|
| (a) | delete `env: REAL_EMAIL ? {} : { RESEND_API_KEY: "" },` from `playwright.config.ts` | **1 failed / 4 passed** | `AssertionError: webServer must declare an env block at all: expected undefined to be truthy` |
| (b) | restore `reuseExistingServer: !process.env.CI` | **1 failed / 4 passed** | `AssertionError: expected true to be false // Object.is equality` |
| (c) | invert LINK 2's control expectation, `1` → `0` | **1 failed / 4 passed** | `AssertionError: expected [ { to: 'nobody@example.com', …(1) } ] to have a length of +0 but got 1` |
| (d) | give LINK 2's OFF position a truthy key | **1 failed / 4 passed** | the same sentence as (c), fired from the **OFF** row |

(c) and (d) are the pair that carries the weight. `0` is also what a capture that never installed
reports; without the control the OFF assertion would stay green on a tree where emails still fly. (d)
proves the *same* capture is what does the measuring in both positions — the failure text is identical
because the mechanism is identical, only the env differs.

### Which LINK 1 path was taken, and why

The **dynamic-import** path: `await import("../../playwright.config")` under `vi.resetModules()` +
`vi.stubEnv`, once per position. The plan's fallback — asserting over comment-stripped source via
`tests/helpers/source-text.ts` — was **not** needed and would have been strictly worse here, because
`playwright.config.ts` now discusses `RESEND_API_KEY` at length in prose, which makes a substring
assertion over that file falsely green by construction. The import resolves cleanly under
`vitest.design.config.ts` with no Docker and no `setupFiles`.

---

## 6 — Final state

| check | result |
|---|---|
| `npm run test:design` | **69 files, 1275 passed / 3 skipped** |
| `npm run test:design -- tests/design/e2e-email-silence.test.ts` | **5 passed** |
| `npm test -- tests/security/paymongo-seam.test.ts` (after `rm -rf .next`) | **13 passed** |
| `npm run lint` | **0 errors**, 25 warnings — the pre-existing count, unchanged |
| `git diff -- src/` | **empty**. `src/lib/email.ts` byte-unchanged; the WR-02 production guard at `:44-49` untouched |
| `git status --porcelain instrumentation.ts` after Task 3C | the comment amendment only; **no non-comment line in the diff** |
| `.env.local` | never read, never edited, never deleted |
