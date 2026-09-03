---
quick_id: 260724-lmy
slug: close-phase-7-build-guard-and-lint-hygie
type: quick
gap_closure: true
source: Phase-7 debt — deferred-items.md (`npm run build` env-placeholder issue, observed 4+ times) + pre-existing lint findings (07-17).
---

<objective>
Close two closable Phase-7 debt items:

1. **`npm run build` env-guard.** Two module-scope fail-closed guards throw during `next build`
   (which runs with `NODE_ENV=production`) on any machine whose env lacks the production secrets,
   forcing a `PLATFORM_WALLET_NUMBER=x PLATFORM_WALLET_NAME=x INNGEST_SIGNING_KEY=x npm run build`
   workaround (observed 4+ times: 07-06/07/14/16). Next sets `process.env.NEXT_PHASE ===
   "phase-production-build"` ONLY during the build's data-collection pass, never at runtime serving —
   so exempting that phase lets the build pass WHILE the guard still fires at a real production boot.

2. **Lint hygiene.** Bare `npm run lint` is unusable because a stale git worktree's generated
   Turbopack output (`.claude/worktrees/**/.next/**`) is scanned by eslint (1000s of generated-JS
   errors). And there is one real `react-hooks` error in a Phase-4 file.

Verification note: `.env.local` has none of the three secrets, so PLAIN `npm run build` currently
trips the guards — that is the definitive acceptance test for Task 1. A dev server may be running on
:3000; if `npm run build` conflicts on `.next`, stop it first (it is not needed for this task).
</objective>

<tasks>

<task id="1" type="fix">
**Exempt the production BUILD phase from the two fail-closed money/security guards.**

- files:
  - src/lib/paymongo.ts (~line 39)
  - src/app/api/inngest/route.ts (~line 26)
- action: Add `process.env.NEXT_PHASE !== "phase-production-build"` to BOTH guard conditions, so each
  reads `NODE_ENV === "production" && NEXT_PHASE !== "phase-production-build" && (<missing secret>)`.
  This matches paymongo.ts's OWN comment ("Dev/test/build tolerate placeholders so … `next build` still
  pass") which the condition did not actually implement. Keep the throw messages unchanged. The guards
  MUST still fire at real production runtime boot (where NEXT_PHASE is unset or "phase-production-server",
  never "phase-production-build").
- verify:
  - PLAIN `npm run build` (NO env prefixes, with the current `.env.local` that lacks the three secrets)
    completes exit 0 and lists the routes — previously it threw at the PayMongo wallet guard then the
    Inngest guard.
  - `grep -n 'NEXT_PHASE' src/lib/paymongo.ts src/app/api/inngest/route.ts` shows the exemption in both.
- done: `next build` passes with no env workaround; the runtime fail-closed behavior is preserved.
</task>

<task id="2" type="fix">
**Make bare `npm run lint` usable by ignoring worktree + nested build output.**

- files: eslint.config.mjs
- action: Add `".claude/worktrees/**"` and `"**/.next/**"` to the existing `globalIgnores([...])` list.
  (The current `.next/**` only matches the ROOT `.next`, not a nested `.claude/worktrees/<name>/.next`.)
- verify: `npx eslint .` (or `npm run lint`) no longer reports the thousands of generated-JS errors from
  `.claude/worktrees/**`; the run completes scanning only project source + tests + e2e.
- done: bare lint is usable and scoped to real source.
</task>

<task id="3" type="fix">
**Fix the one real `react-hooks` error in the Phase-4 address autocomplete.**

- files: src/components/listing/address-autocomplete.tsx (~line 110)
- action: FIRST run `npx eslint src/components/listing/address-autocomplete.tsx` to read the EXACT rule
  id + message (it is the debounce `useEffect` at ~line 107 that calls `setResults([])` / `setLoading(false)`
  synchronously when `query.trim().length < 3`). Apply the idiomatic fix for that specific rule while
  PRESERVING behavior (the 250ms debounce, the AbortController abort-on-change, and clearing results +
  stopping the loading state when the query becomes shorter than 3 chars). Prefer a real fix (restructure
  so the short-query path does not set state synchronously in the effect, e.g. derive the empty/loading
  state, or guard the update) over a blanket `eslint-disable`; only use a narrowly-scoped, commented
  disable if the synchronous clear is genuinely the correct behavior and the rule cannot be satisfied
  otherwise.
- verify:
  - `npx eslint src/components/listing/address-autocomplete.tsx` → 0 errors (warnings on underscored
    unused args are acceptable, matching the rest of the repo).
  - The debounce/abort logic is unchanged in behavior (short query clears results and stops loading;
    a ≥3-char query still debounces one Photon request and aborts the prior one).
- done: the single real `src/` lint error is gone.
</task>

</tasks>

<verification>
- PLAIN `npm run build` (no env prefixes) → exit 0, routes listed.
- `npm run lint` → completes on project source only; 0 ERRORS (warnings on `_`-prefixed unused args ok).
- `npx vitest run` → full suite stays green (no behavioral regression from the autocomplete fix).
- No unrelated files changed. paymongo.ts / inngest/route.ts change is ONLY the added NEXT_PHASE clause.
</verification>
