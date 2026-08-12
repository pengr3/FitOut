---
phase: quick-260812-usm
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/safe-callback-url.ts
  - tests/security/safe-callback-url.test.ts
  - .planning/phases/10-design-system-foundation-theme-runtime/10-SECURITY.md
autonomous: true
requirements: [SEC-01, T-10-29]

must_haves:
  truths:
    - "The three confirmed dot-segment vectors (/..//evil.com, /.//evil.com, /a/../..//evil.com) return \"/\" from the shipped guard"
    - "All 10 pre-existing attack strings still return \"/\" — nothing regressed"
    - "Every legitimate relative callback still returns its own value unchanged, query and fragment intact"
    - "The guard still REJECTS everything the old prefix guard rejected — no input is newly accepted"
    - "The new attack cases were OBSERVED FAILING against the unmodified guard before the fix, and that failure output is recorded verbatim in the test file's header"
    - "10-SECURITY.md no longer rests T-10-29 on the false 'class strings only' basis, and its SEC-01 section records the fix without claiming the gate is cleared"
  artifacts:
    - path: "src/lib/safe-callback-url.ts"
      provides: "Output-side rejection after the origin check"
      contains: "startsWith(\"//\")"
    - path: "tests/security/safe-callback-url.test.ts"
      provides: "The SEC-01 dot-segment attack cases plus the recorded RED observation"
      contains: "/..//evil.com"
    - path: ".planning/phases/10-design-system-foundation-theme-runtime/10-SECURITY.md"
      provides: "Re-underwritten T-10-29 and an updated SEC-01 record"
  key_links:
    - from: "src/lib/safe-callback-url.ts return value"
      to: "src/app/(auth)/login/page.tsx:99 router.push -> new URL(href, location.href)"
      via: "the caller re-parses the returned string, which is why the OUTPUT must be checked and not only the input"
      pattern: "safeCallbackPath"
---

<objective>
Close SEC-01 — the residual post-authentication open redirect (CWE-601) in
`src/lib/safe-callback-url.ts`.

The guard parses the untrusted `?callbackURL`, correctly checks that it resolves same-origin, and
then returns `target.pathname + search + hash`. **A pathname can begin with `//`.** Dot-segment
removal happens *during* the parse, so `/..//evil.com` satisfies the origin check at `:67` and the
function returns `//evil.com` — an authority — to a caller that parses it again. `router.push()` at
`login/page.tsx:99` hands it to `new URL(href, location.href)`, Next's `isExternalURL` goes true, and
the browser hard-navigates to `https://evil.com/` immediately after the victim really did sign in on
the real site.

Purpose: the module's own header already teaches the right lesson — "prefix matching cannot fix this
… the only check that answers the real question is to PARSE it". That lesson was applied to the
INPUT and never to the OUTPUT. This plan applies it to the output.

Output: a tightened guard, three new attack vectors pinned by a test that was **watched failing
first**, and a re-underwritten T-10-29.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/10-design-system-foundation-theme-runtime/10-SECURITY.md
@src/lib/safe-callback-url.ts
@tests/security/safe-callback-url.test.ts
@src/app/(auth)/login/page.tsx

<interfaces>
<!-- The whole public surface. One exported function, one importer. No exploration needed. -->

From src/lib/safe-callback-url.ts:
```typescript
export function safeCallbackPath(raw: string | null | undefined, origin: string): string;
```

Its only importer is `src/app/(auth)/login/page.tsx:21`, used at `:75` inside `safeCallbackUrl()`,
which feeds `router.push()` (`:99`) and `authClient.signIn.social({ callbackURL })` (`:105`).
**`login/page.tsx` needs NO edit** — the fix is entirely inside the module. Leave the auth route
untouched; re-editing it is precisely what put T-10-29 into dispute.
</interfaces>

<measured_facts>
<!-- Probed against this box's Node during planning. Do NOT re-derive; these are the expectations. -->

| input | `pathname+search+hash` | re-parse origin |
|---|---|---|
| `/..//evil.com` | `//evil.com` | **evil.com** |
| `/.//evil.com` | `//evil.com` | **evil.com** |
| `/a/../..//evil.com` | `//evil.com` | **evil.com** |
| `/..//evil.com?a=1#b` | `//evil.com?a=1#b` | **evil.com** |
| `/..///evil.com` | `///evil.com` | **evil.com** |
| `/./..//evil.com/steal#token` | `//evil.com/steal#token` | **evil.com** |
| `/..//` | `//` | re-parse **throws** (empty host) |
| `/bookings` | `/bookings` | fitout.example |
| `/listings/abc?resume=1#slots` | unchanged | fitout.example |
| `/%2F%2Fevil.com` | unchanged | fitout.example |

Note the last three: the fix must not touch them.
</measured_facts>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Watch the new attack cases FAIL against the unmodified guard (RED)</name>
  <files>tests/security/safe-callback-url.test.ts, vitest.sec.tmp.config.ts (throwaway, deleted in Task 2)</files>
  <action>
  DO NOT TOUCH `src/lib/safe-callback-url.ts` IN THIS TASK. This task exists because the last fix
  pass shipped a regression test that was never observed failing, and a test never seen red is not a
  regression test. The guard must still be broken when the new assertions first run.

  First, create the DB-free runner. The main vitest config declares
  `globalSetup: ["tests/global-setup.ts"]`, which preflights the `fitout_test` Postgres and hard-fails
  every run including a single-file one; `vitest.design.config.ts` only collects `tests/design/**`, so
  a positional filter cannot reach this file. Write a THROWAWAY config at the repo root named
  `vitest.sec.tmp.config.ts` — no `globalSetup`, no `setupFiles`, `environment: "node"`, an `@`
  alias to `./src` via `resolve(__dirname, "./src")`, and `include` set to the single path
  `tests/security/safe-callback-url.test.ts`. This exact shape was verified during planning: it runs
  the existing file at 9 passed in ~300ms with no database. It is scratch — it is deleted in Task 2
  and must never be staged.

  Then extend the attack list. Add ONE new `it()` block inside the existing first describe
  ("the guard rejects everything that leaves the origin"), named so it says SEC-01 and says
  dot-segment. Inside it:

  1. Assert the mechanism before asserting the guard, the way the backslash test already does — that
     `new URL("/..//evil.com", ORIGIN).origin` IS `ORIGIN` (so the origin check at `:67` is genuinely
     satisfied and is not what is missing), that its `.pathname` is `//evil.com`, and that
     `new URL("//evil.com", ORIGIN).origin` is `https://evil.com` (so the value the guard returns
     escapes when the caller parses it again). These three are statements about Node's URL parser and
     will pass both before and after the fix — that is the point, they localise the defect to the
     RETURN, not to the check.
  2. Record that this is strictly a tightening: the old prefix guard
     (`raw.startsWith("/") && !raw.startsWith("//")`) returned `/..//evil.com` VERBATIM, so the fix
     removes an acceptance rather than adding one.
  3. Loop the guard over all seven vectors from `<measured_facts>` that must now yield `"/"`:
     `/..//evil.com`, `/.//evil.com`, `/a/../..//evil.com`, `/..//evil.com?a=1#b`, `/..///evil.com`,
     `/./..//evil.com/steal#token`, `/..//` — each with the input as the assertion message, matching
     the file's existing style.

  Also add ONE line to the existing "works on a localhost origin with a port" test:
  `/..//evil.com` against `http://localhost:3000` must be `"/"` — the bypass is origin-independent
  and the localhost block is where every developer's session is pinned.

  Leave the "does not newly ACCEPT anything the old guard rejected" test and the entire
  "preserves every legitimate relative callback" describe UNCHANGED. They are the regression wall.

  Now run the file and WATCH IT FAIL:
      npx vitest run --config vitest.sec.tmp.config.ts

  Record the observed output VERBATIM in the test file's own header comment, in the convention this
  repo uses everywhere: the date, the command, the failed/passed counts, and at least one full
  assertion line showing the received `//evil.com` against the expected `/`. Two tests should fail
  (the new block and the localhost block) out of ten — but **record what you actually observe, not
  what this plan predicts**; this codebase has a long record of plans predicting the wrong counts,
  and the observation is the artifact, not the prediction.

  If the run is GREEN, STOP and report it. A green run here means the vectors do not reproduce on
  this Node, and the fix in Task 2 would be unjustified.
  </action>
  <verify>
    <automated>npx vitest run --config vitest.sec.tmp.config.ts</automated>
    <expected>NON-ZERO EXIT — the run MUST be red at this task. Failures name the SEC-01 dot-segment cases and show `//evil.com` received where `/` was expected.</expected>
  </verify>
  <done>The new cases exist, the run was red, and the verbatim red output (command, counts, one full assertion) is written into the test file's header.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Fix the guard and watch the same command go GREEN</name>
  <files>src/lib/safe-callback-url.ts</files>
  <behavior>
    - `/..//evil.com`, `/.//evil.com`, `/a/../..//evil.com` -> `"/"`
    - `/..//evil.com?a=1#b`, `/..///evil.com`, `/./..//evil.com/steal#token`, `/..//` -> `"/"`
    - `/bookings` -> `/bookings` (unchanged)
    - `/listings/abc?resume=1&start=…#slots` -> unchanged, query and fragment intact
    - `/%2F%2Fevil.com` -> unchanged (encoded, does not re-parse as an authority)
    - `"bookings"`, `"./x"`, `"../x"`, `""`, `null`, `undefined` -> `"/"` (still rejected; nothing newly accepted)
    - `safeCallbackPath("/bookings", "null")` and `(…, "")` -> `"/"` (still degrades, never throws)
  </behavior>
  <action>
  Edit ONLY `src/lib/safe-callback-url.ts`.

  Keep the `!raw || !raw.startsWith("/")` early return exactly as it is. A prior review pinned that
  it must not newly ACCEPT anything the old guard rejected, and the test asserting that is unchanged.

  Keep the existing `target.origin !== self.origin` check. It is correct and it is not the defect.

  After that check, compute the candidate return value into a local, then reject it on two grounds
  before returning it:

  1. Reject when the candidate starts with `//`. This names the finding directly: a pathname
     beginning with `//` is an authority to whoever parses it next.
  2. Reject when re-resolving the candidate against `origin` does not land back on `self.origin`,
     inside a try/catch that also returns `"/"` on a throw (`/..//` produces `//`, which throws on
     re-parse with an empty host). This is the load-bearing half and the reason to add it even though
     the `//` prefix check already covers today's vectors: one prefix is one spelling, and this
     performs the CALLER'S OWN operation — `new URL(value, origin)` is exactly what `router.push`
     does at `login/page.tsx:99` — so it answers the real question rather than the nearest proxy. It
     is the same argument the module header makes about the input, applied to the output.

  Then extend the module header. The existing header is the artifact that made this defect legible;
  keep its structure and add a SEC-01 section that states: what the hole was (the origin check passed
  and the RETURN carried the authority), that it was NOT introduced by WR-12 (the pre-fix prefix
  guard shipped `/..//evil.com` verbatim, so this is strictly tightening), the exploit chain to
  `router.push` -> `isExternalURL` -> hard navigation, and that the social leg has an independent
  vendor backstop (`better-auth` trusted-origins returns 403 `INVALID_CALLBACK_URL`) while
  `router.push` has none — which is why the `router.push` leg was the exploitable one. Write the
  header DESCRIPTIVELY where it refers to the guarded shapes; do not quote a literal that a future
  grep-based criterion would count as a call site (this phase hit that collision repeatedly).

  Delete `vitest.sec.tmp.config.ts` AFTER the green run below and BEFORE running lint/tsc — it is
  untracked scratch, it is not in `.gitignore`, and leaving it would put it in front of `eslint` and
  `tsc`. Confirm `git status --porcelain` shows no `vitest.sec.tmp.config.ts` entry.

  COMMIT: the test change from Task 1 and this fix go in ONE commit. Do not leave a commit on `dev`
  whose tree is red. The red observation is preserved as the recorded evidence in the test header,
  which is this repo's established convention. Do NOT stage `PLAN.md`, `SUMMARY.md`, `STATE.md`, or
  the throwaway config.
  </action>
  <verify>
    <automated>npx vitest run --config vitest.sec.tmp.config.ts</automated>
    <expected>EXIT 0 — 10 tests passed, including the two blocks that were red in Task 1. Then, after deleting the throwaway config: `npm run test:design` stays at 21 files / 449 passed, `npx tsc --noEmit` exits 0, `npm run lint` reports 0 errors (9 pre-existing warnings). Do NOT run `npm test`.</expected>
  </verify>
  <done>All ten tests green; the three confirmed vectors and their four relatives return "/"; every legitimate callback still returns unchanged; design gate, tsc and lint all unmoved from baseline; throwaway config deleted; one atomic commit containing only the guard and its test.</done>
</task>

<task type="auto">
  <name>Task 3: Re-underwrite T-10-29 and record the fix in 10-SECURITY.md</name>
  <files>.planning/phases/10-design-system-foundation-theme-runtime/10-SECURITY.md</files>
  <action>
  Three edits to `.planning/phases/10-design-system-foundation-theme-runtime/10-SECURITY.md`.

  1. **T-10-29 — move it from `accept` to `mitigate` and move the row from the Open table to the
     Closed table.** Its acceptance basis ("the edits are class strings only — no form field, no
     action target, no validation and no session handling is touched, so no auth path changes") is
     false at HEAD and cannot be repaired by re-wording, because WR-12 genuinely replaced
     post-sign-in redirect control flow. Accepting it would require asserting the very thing SEC-01
     disproved. The mitigation is now real and citable: the post-authentication navigation target is
     produced by one pure function with an exhaustive attack-list test, and the evidence line must
     cite `src/lib/safe-callback-url.ts` (the output-side rejection) and
     `tests/security/safe-callback-url.test.ts` (the SEC-01 dot-segment cases, watched red before the
     fix — quote the counts you actually observed in Task 1). Keep the surviving true half of the
     original note: `(auth)/signup/page.tsx` really is two class strings and a comment.

  2. **SEC-01 section** — keep the reproduction table and the exploit chain verbatim; they are the
     record. Append a "Fixed" subsection stating the date, the commit, what changed (output-side
     rejection after the origin check, plus a re-resolution of the returned value), that the three
     vectors plus four relatives are now pinned, and that the new cases were observed FAILING against
     the pre-fix guard first. Update the "Remediation (separate ticket…)" paragraph so it reads as
     discharged rather than outstanding.

  3. **Frontmatter and Sign-Off.** `threats_open: 1` -> `0`; `threats_closed: 49` -> `50`; tick the
     `threats_open: 0 confirmed` box. Append a row to the Security Audit Trail dated 2026-08-12
     naming this quick fix and the commit from Task 2.

  **DO NOT set `status: verified` and DO NOT claim the gate is cleared.** Leave `status: blocked`
  with an explicit one-line note that the two blocking items are discharged and the verdict is
  `/gsd-secure-phase 10`'s to re-issue, not this ticket's. Leave the Verdict paragraph's BLOCKED
  wording in place for the same reason, adding only a pointer to the Fixed subsection. Leave W-1,
  W-2 and W-3 alone — W-2 is the finding that this ticket vindicates, not one it closes.

  Do not touch anything else in phase 10, the `(auth)/signup` page, or UAT gap G-01.

  COMMIT this file on its own as a `docs(10):` commit. Do not stage `PLAN.md`, `SUMMARY.md` or
  `STATE.md`.
  </action>
  <verify>
    <automated>grep -c "^threats_open: 0" .planning/phases/10-design-system-foundation-theme-runtime/10-SECURITY.md</automated>
    <expected>1. Additionally, by inspection: T-10-29 appears in the Closed table with disposition `mitigate` and a file:line citation; `status:` is still `blocked`; the SEC-01 section carries a Fixed subsection naming the observed red counts.</expected>
  </verify>
  <done>T-10-29 is dispositioned `mitigate` with real evidence, SEC-01 records the fix, frontmatter counts are consistent, and no claim is made that the security gate is cleared.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| URL query string → client navigation | `?callbackURL=` reaches `safeCallbackPath()` and then `router.push()` after a successful sign-in. Fully attacker-controlled in a link the attacker sends. |
| Guard return value → caller's re-parse | The value crosses a SECOND parse (`new URL(href, location.href)`). This is the boundary SEC-01 lives on and the one the pre-fix guard did not police. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-SEC01-01 | Tampering | `safeCallbackPath()` return value | mitigate | Reject a candidate beginning `//`, AND re-resolve the candidate against `origin` (the caller's own operation) before returning it. Pinned by the seven dot-segment cases in Task 1. |
| T-SEC01-02 | Spoofing | Post-auth landing page (CWE-601 phishing amplifier) | mitigate | Same guard. The social leg keeps its independent vendor backstop (`better-auth` trusted-origins → 403 `INVALID_CALLBACK_URL`); the `router.push` leg — the one with no backstop — is now guarded at the source. |
| T-SEC01-03 | Elevation of privilege | A fix that quietly WIDENS the guard | mitigate | The `!raw.startsWith("/")` early return is retained untouched, and the "does not newly ACCEPT anything the old guard rejected" test is left unmodified and must stay green. Both changes in Task 2 are rejections; neither adds an acceptance path. |
| T-SEC01-04 | Repudiation | A regression test never observed failing | mitigate | Task 1 is ordered BEFORE Task 2 and its `<verify>` demands a NON-ZERO exit. The verbatim red output is written into the test header, so the claim is auditable from the repository rather than from a SUMMARY. |
| T-SEC01-05 | Denial of service | Guard throwing inside a click handler | mitigate | Both new rejections are inside try/catch or a pure `startsWith`; `/..//` (whose re-parse throws) is an explicit test case. The existing "falls back rather than throwing" test is unchanged. |

No package-manager installs occur in this plan, so no supply-chain (`T-…-SC`) row applies; the
executor must not add a dependency to accomplish any task here.
</threat_model>

<verification>
1. `npx vitest run --config vitest.sec.tmp.config.ts` — RED at Task 1 (non-zero exit), GREEN at
   Task 2 (10 passed).
2. Throwaway config deleted; `git status --porcelain` free of `vitest.sec.tmp.config.ts`.
3. `npm run test:design` — 21 files / 449 passed, unchanged.
4. `npx tsc --noEmit` — exit 0.
5. `npm run lint` — 0 errors, 9 pre-existing warnings.
6. `git log --oneline -2` — one code commit (guard + test) and one `docs(10):` commit; neither
   contains PLAN.md, SUMMARY.md, STATE.md or the throwaway config.

`npm test` is NOT run (it requires a provisioned Postgres). `npm run test:e2e` is NOT run: the change
is confined to one pure function with a single importer, and the login route file is not edited.
</verification>

<success_criteria>
- `/..//evil.com`, `/.//evil.com` and `/a/../..//evil.com` all return `"/"` from the shipped guard.
- The four related shapes (`?a=1#b`, `///`, `/./..//…/steal#token`, `/..//`) also return `"/"`.
- All 10 pre-existing attack strings still return `"/"`; every legitimate relative callback still
  returns unchanged, query and fragment intact.
- Nothing the old prefix guard rejected is newly accepted.
- The new cases were WATCHED RED before the fix and the output is recorded in the test file.
- T-10-29 is `mitigate` with a file:line citation; `threats_open: 0`; `status:` still `blocked`,
  with the gate verdict explicitly left to `/gsd-secure-phase 10`.
</success_criteria>

<output>
Create `.planning/quick/260812-usm-fix-sec-01-open-redirect/260812-usm-SUMMARY.md` when done.
Record: the verbatim RED output from Task 1, the final green counts, and any place where the observed
numbers differed from this plan's predictions.
</output>
