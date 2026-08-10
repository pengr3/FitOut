---
phase: quick-260807-fc6
plan: 01
subsystem: profile
tags: [server-actions, next-js, avatar, upload, guard, test-blind-spot, module-contract]

requires:
  - phase: "01-auth-accounts"
    provides: "uploadAvatarAction + avatarFileSchema/AVATAR_MAX_BYTES as originally shipped in src/app/actions/avatar.ts"
provides:
  - "An avatar upload action whose module Next will actually evaluate — the feature works in a browser for the first time"
  - "tests/use-server-exports.test.ts: an AST-based repo-wide guard that no \"use server\" module exports a non-async value"
  - "AVATAR_MAX_BYTES + avatarFileSchema in a directive-free module the client form can share"
  - "A worked example of the class of bug this session hit three times: green unit tests over a browser-only failure"
affects: [profile, future-server-actions, listing-photo-upload, any-new-use-server-module]

tech-stack:
  added: []
  patterns:
    - "Parse, don't grep: repo-wide source invariants use ts.createSourceFile, because 15 of the 31 files containing the string \"use server\" are comments saying they deliberately lack the directive"
    - "Guard-the-guard: a scanner test asserts it still finds its targets, so it cannot rot into a vacuous pass"
    - "Blind spots documented in the test header, so the next reader under-trusts rather than over-trusts a green run"

key-files:
  created:
    - tests/use-server-exports.test.ts
  modified:
    - src/app/actions/avatar.ts
    - src/lib/validation/profile.ts
    - tests/profile/avatar.test.ts

key-decisions:
  - "D1: the guard was written first and watched RED against unfixed src/; the verbatim failure is recorded in the file header"
  - "D2: symbols moved to src/lib/validation/profile.ts — it already owns profileSchema/ProfileInput, is directive-free, and the client form already imports from it"
  - "D3: NO compatibility re-export from avatar.ts — a re-export out of a \"use server\" module is the identical violation with a shim over it"
  - "D4: re-exports (export * from / export {x} from) are refused unresolved by the guard rather than followed; strict-by-default, documented"
  - "D5: type-only exports are exempt (AvatarResult stays in avatar.ts) because types erase before Next sees the module"
  - "D6: npm run build is the acceptance gate, not vitest — only the build compiles the server-actions loader that threw"

patterns-established:
  - "A browser-only failure class gets a static guard, not just a fix — the guard is the durable deliverable"
  - "Re-inject the defect after the fix to prove the guard is live, not merely once-red"

requirements-completed: [AUTH-05]

duration: ~20min
completed: 2026-08-07
---

# Quick 260807-fc6: Avatar upload — move non-async exports out of the "use server" module — Summary

**`src/app/actions/avatar.ts` exported a number and a Zod object alongside its action, so Next refused the whole module at evaluation and `uploadAvatarAction` had never once run in a browser since Phase 1 — the two symbols now live in `src/lib/validation/profile.ts`, and a new AST-based guard (`tests/use-server-exports.test.ts`, watched RED naming both offenders before anything moved) makes the class of defect impossible to reintroduce silently.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-08-07T03:15Z
- **Tasks:** 3 of 3 (guard-RED → move → build proof)
- **Files:** 1 created, 3 modified (2 under `src/`, 1 test import line)

## The bug, and why it survived

The orchestrator reproduced it live: clicking **Upload photo** on `/profile` threw in the browser console

```
Uncaught (in promise) Error: A "use server" file can only export async functions, found number.
Read more: https://nextjs.org/docs/messages/invalid-use-server-value
    at module evaluation (avatar.ts:88:1)
```

`at module evaluation` is the whole story. Next enforces the server-actions export contract when the module loads, not when an action is called, so `AVATAR_MAX_BYTES` (line 25, a number) and `avatarFileSchema` (line 31, a Zod object) did not merely fail to export — they took `uploadAvatarAction` down with them.

The part worth keeping: **`tests/profile/avatar.test.ts:17` imported those exact two symbols out of the dead module and asserted the size/content-type contract thoroughly, and passed.** Vitest does not implement the `"use server"` export rule at all. The bug's only symptom lived precisely in the gap between "these exports behave correctly when Vitest imports them" and "Next can load this module", and the test sat squarely inside that gap. It was not silent about the bug by accident — it was structurally incapable of seeing it, while looking like coverage of exactly the feature that was dead.

That is why the guard is the deliverable and the file move is the smaller half.

## Accomplishments

### Task 1 — the guard, written first and watched RED (`fa992f5`)

`tests/use-server-exports.test.ts` (374 lines, most of it header) walks every `.ts`/`.tsx` under `src/`, parses each with `ts.createSourceFile`, and for any module whose **directive prologue** contains `"use server"` asserts that every export is an async function (type-only exports exempt).

Run against **unfixed** `src/` (HEAD `b0ce3bc`, `git status --short -- src/` empty). **Observed RED, exit 1**, verbatim in the file header and reproduced here:

```
- []
+ [
+   "src/app/actions/avatar.ts:25 exports AVATAR_MAX_BYTES — not an async function: `5 * 1024 * 1024`",
+   "src/app/actions/avatar.ts:31 exports avatarFileSchema — not an async function: `z`",
+ ]

 Test Files  1 failed (1)
      Tests  1 failed | 3 passed (4)
```

Both offenders, at the right lines, and **nothing else** — the other 15 genuine `"use server"` modules came back clean, so this is not a scanner that fails on everything. `AvatarResult` (line 41) was correctly *not* flagged; types erase.

**Parsing rather than grepping is load-bearing here, and the repo proves it.** `grep -rl '"use server"' src/` returns **31** files. Only **16** have the directive. The other 15 are pure/isomorphic modules whose header comments say, in prose, that they deliberately have *no* `"use server"` directive — `src/lib/money.ts`, `src/lib/booking/pricing.ts`, `src/lib/payments/commission.ts`, `src/lib/availability/block-reason.ts` and friends. A grep-based guard would have spent its life flagging comments about the rule it was enforcing.

Three self-tests ship alongside the real assertion, because a scanner that quietly stops finding anything is the same failure mode as the test this file replaces:

| Self-test | Binds |
|---|---|
| finds the server-action modules it is supposed to be policing | `> 10` modules found **and** `avatar.ts` among them — kills the vacuous pass |
| does not mistake a comment or a string for the directive | comment mention → false; `const label = "use server"` → false; real prologue → true |
| flags the illegal shapes and exempts the legal ones | synthetic module: `const`, Zod call, sync fn, class, local `export {}` flagged; `async function`, `async` arrow, `type`, `interface` exempt |

### Task 2 — the move (`6d60ec5`)

`AVATAR_MAX_BYTES` and `avatarFileSchema` moved verbatim into **`src/lib/validation/profile.ts`** (D2). It already owns `profileSchema`/`ProfileInput`, an avatar is part of a profile, it is directive-free so both sides can import it, and `profile-form.tsx` already imports from that path — so the client can now reach the 5 MB cap for a pre-flight check without touching the server module.

`avatar.ts` imports `avatarFileSchema` and is down to exactly one value export, `uploadAvatarAction`, plus the `AvatarResult` type. The now-unused `zod` import was dropped. **No compatibility re-export was added** (D3) — a re-export out of a `"use server"` file is the same violation wearing a shim, and would have left the feature dead while the diff looked like a fix.

Both files carry a comment explaining *why* the symbols are split apart, naming the browser error, so the next person does not tidy them back together.

### Task 3 — the build proof

`npm run build` **exit 0**, all 30 routes compiled including `ƒ /profile`. This is the acceptance gate (D6): it compiles the server-actions loader that was throwing. Vitest going green proves nothing about this defect — that is the entire lesson of the ticket.

## Verification Results

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `npx vitest run` | **1142 passed / 4 skipped / 0 failed** — baseline 1138 + this guard's 4, exactly |
| `npm run build` | **exit 0**, `/profile` among the 30 compiled routes |
| Guard RED before the fix | observed, exit 1, naming `avatar.ts:25` and `avatar.ts:31` |
| Guard GREEN after the fix | observed |
| Guard still live after the fix | **re-injected** `export const REGRESSION_PROBE = 5 * 1024;` into the fixed `avatar.ts` → **RED**: `"src/app/actions/avatar.ts:83 exports REGRESSION_PROBE — not an async function: \`5 * 1024\`"`. Reverted with `git checkout -- src/app/actions/avatar.ts`; tree clean |
| No assertion weakened in `tests/profile/avatar.test.ts` | **confirmed** — the diff is one import line + a comment; filtering the diff for `expect`/`toBe`/`toMatch`/`describe`/`it(` returns **no added or removed line** |
| Dev server on :3000 survived the build | **yes** — `curl http://localhost:3000/login` → HTTP 200 after `npm run build` |

## Environment note

`npm run build` did **not** force-stop the orchestrator's `npm run dev` on :3000 — Next 16 keeps dev output separate from the production build output. Verified with a live request after the build returned (HTTP 200 on `/login`). Nothing was restarted.

## Deviations from Plan

None affecting behaviour. Two judgement calls worth recording:

**1. [D4 — strict-by-default] Re-exports are refused unresolved rather than followed.**
The guard flags `export * from "./x"` and `export { a } from "./x"` in a `"use server"` module without resolving the target, because it does not follow imports. That is deliberately over-strict: it is exactly the shape a compatibility shim takes, and the brief forbade one. No such export exists in `src/` today, so the strictness costs nothing now. Documented in the header as the thing to revisit — not silently delete — if a legitimate async-only re-export is ever needed.

**2. [Cosmetic, left alone] The RED message quotes the initializer, so `avatarFileSchema` rendered as `` `z` ``.**
The snippet is the first line of the offending node, and the Zod chain starts on its own line. `AVATAR_MAX_BYTES` rendered usefully (`5 * 1024 * 1024`); the schema did not. File, line and symbol name already identify the violation unambiguously, and re-running to make an already-correct failure message prettier would have meant re-recording the verbatim RED. Left as observed.

## Known Stubs

None.

## Threat Flags

None. No new endpoint, auth path, file-access pattern or trust-boundary schema change. `avatarFileSchema` is byte-identical to what shipped in Phase 1 — same 5 MB cap, same `image/*` check, same non-empty check, same messages — so the T-04-04 mitigation is unchanged in substance and is now, for the first time, actually reachable at runtime.

**Doc drift, not fixed (Phase 1 history left intact):** `.planning/phases/01-auth-accounts/01-SECURITY.md:64` cites the T-04-04 mitigation as `avatar.ts:31-39`, and `01-VERIFICATION.md` describes both symbols as living in the action. Those pointers are now stale. They are historical phase records rather than live docs, and updating them was out of scope; flagged so the next threat-register pass re-points them at `src/lib/validation/profile.ts`.

## Commits

| Commit | Type | Description |
|---|---|---|
| `fa992f5` | test | the guard, **RED as committed**, naming `avatar.ts:25` and `avatar.ts:31` |
| `6d60ec5` | fix | move the two symbols to `@/lib/validation/profile`; drop the unused zod import; update the single importer's path |

## Notes for Future Phases

- **The guard runs on every `vitest run` and covers every future server action for free.** `src/app/actions/listing-photo.ts` is the next upload surface likely to want a shared size/type constant — put it in a directive-free module from the start; the guard will catch it either way.
- **The Phase-2 seam is unchanged.** The signed direct-to-Cloudinary client upload for listing galleries is still the documented graduation path, and it is now easier: the file-validation contract already lives in a module the client can import.
- **The generalisable lesson, stated plainly for the third occurrence this session:** a unit test that imports a module and exercises its exports proves the exports behave — it does not prove the module can be *loaded by the framework*. Directive contracts (`"use server"`, `"use client"`), route-segment config, and bundler boundaries are all invisible to Vitest. When a defect is browser-only, the durable fix is a static guard over the invariant, and `npm run build` in the gate list.
- **This guard checks export *shape* only.** A `"use server"` module can still fail to evaluate from a bad import or a top-level throw. `npm run build` remains the only thing that proves evaluation.

## Self-Check: PASSED

- `tests/use-server-exports.test.ts` — FOUND (374 lines)
- `src/app/actions/avatar.ts` — FOUND (81 lines; imports `avatarFileSchema` from `@/lib/validation/profile`, no `zod` import, `uploadAvatarAction` the only value export)
- `src/lib/validation/profile.ts` — FOUND (47 lines; contains `AVATAR_MAX_BYTES` and `avatarFileSchema`)
- `tests/profile/avatar.test.ts` — FOUND (import path updated, assertions byte-identical)
- Commit `fa992f5` — FOUND in `git log`
- Commit `6d60ec5` — FOUND in `git log`
