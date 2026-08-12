---
phase: 10
slug: design-system-foundation-theme-runtime
status: blocked
threats_open: 1
threats_total: 50
threats_closed: 49
asvs_level: 2
block_on: high
created: 2026-08-12
verified_at: e40ad40
register_authored_at_plan_time: true
---

# Phase 10 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

**Verdict: BLOCKED.** 49 of 50 registered threats verified CLOSED at `e40ad40`. One is open
(T-10-29), and a live post-authentication open redirect (CWE-601) was confirmed on the login
page — **pre-existing phase-4 code, modified during this phase's fix passes, and not covered
by any plan-time threat.**

Gate evidence at audit time: `npm run test:design` 21 files / 449 passed · `npx tsc --noEmit`
exit 0 · `npm run lint` 0 errors / 9 pre-existing warnings.

---

## Headline finding — residual open redirect (SEC-01)

**`src/lib/safe-callback-url.ts:69`** returns the parsed **pathname**, and a pathname may begin
with `//`. Dot-segment removal happens during parse, so the origin check at `:67` passes while
the returned string re-exposes an authority to whoever parses it next.

Reproduced twice, independently — once by the auditor against the shipped module, once by the
orchestrator against both Node's WHATWG `URL` and the real module via `npx tsx`:

| input | guard returns | re-parses to |
|---|---|---|
| `/bookings` | `/bookings` | fitout.example — ok |
| `/\evil.com` | `/` | fitout.example — ok (the UAT-tested vector) |
| `//evil.com` | `/` | fitout.example — ok |
| `https://evil.com` | `/` | fitout.example — ok |
| `/%2F%2Fevil.com` | `/%2F%2Fevil.com` | fitout.example — ok |
| **`/..//evil.com`** | **`//evil.com`** | **evil.com — BYPASS** |
| **`/.//evil.com`** | **`//evil.com`** | **evil.com — BYPASS** |
| **`/a/../..//evil.com`** | **`//evil.com`** | **evil.com — BYPASS** |

Full chain, each link verified against installed source:

1. `/login?callbackURL=/..//evil.com` — survives path normalisation (also as `%2F..%2F%2F`).
2. `src/app/(auth)/login/page.tsx:74` — `URLSearchParams.get()` yields `/..//evil.com`.
3. `safeCallbackPath()` returns `//evil.com`.
4. `src/app/(auth)/login/page.tsx:99` — `router.push("//evil.com")`.
5. `next/dist/client/components/app-router-instance.js:219` → `isExternalURL` true →
   `completeHardNavigation` → browser navigates to `https://evil.com/`.

**Severity: High for an auth path** (Medium by raw impact — no cookie or token rides along, and
the victim must complete sign-in). Classic phishing amplifier: the redirect is trusted because
the user really did just authenticate on the real site.

**Not a phase-10 regression.** The pre-fix guard had the same hole:
`"/..//evil.com".startsWith("/") && !startsWith("//")` is also true. WR-12 narrowed the hole and
closed every vector it documented; it did not close this one. What phase 10 owns is that the
change landed under a commit message claiming closure.

**What WR-12 did get right** (assessed because the audit was asked whether it introduced new
acceptance — it did not):

- All 10 attack strings in `tests/security/safe-callback-url.test.ts` reject correctly.
- It does not widen the guard; the `!raw.startsWith("/")` early return is retained and pinned by
  a test asserting nothing newly *accepted*.
- The social sign-in leg is protected in depth by the vendor:
  `better-auth/dist/auth/trusted-origins.mjs:15` applies `/^\/(?!\/|\\|%2f|%5c)…/` and returns
  403 `INVALID_CALLBACK_URL`. The module header recorded this as unverified; it is now verified
  and it holds. **`router.push()` has no such backstop — that leg is the exploitable one.**

**Remediation (separate ticket — do NOT fold into phase 10):** after the origin check, reject when
`target.pathname.startsWith("//")`, or return a value the caller cannot re-resolve cross-origin.
Add `/..//evil.com`, `/.//evil.com`, `/a/../..//evil.com` to the test's attack list — the current
list passes a guard with this hole.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| URL query string → DOM attribute | `?theme=` reaches `documentElement`'s `data-theme` | Attacker-controllable string |
| URL query string → client navigation | `?callbackURL=` reaches `router.push()` after sign-in | Attacker-controllable string (**SEC-01**) |
| localStorage → pre-paint script | `localStorage["theme"]` read by next-themes before hydration | Presentation preference, no identity |
| next-themes → document | Vendor injects inline `dangerouslySetInnerHTML` script | Static vendor code |
| Build script → repo files | `generate-design-tokens.mjs` writes generated artifacts | Repo-relative literal paths only |
| Dev-only route → production | `/dev/theme` renders fixture data | Guarded by `NODE_ENV` + `robots: noindex` |

---

## Threat Register

50 threats, T-10-01..T-10-50, authored at plan time across all 17 PLAN files.
Dispositions: mitigate 29, accept 21. Categories: Tampering 16, Repudiation 14,
Information disclosure 9, Denial of service 7, Elevation of privilege 3, Spoofing 1.

Every row was decided by locating the assertion or the code, **not** by reading a SUMMARY claim.

### Open

| Threat ID | Category | Component | Disposition | Status | Evidence |
|---|---|---|---|---|---|
| T-10-29 | Information disclosure | auth-route edits | accept | **open** | The acceptance basis is invalidated at HEAD. The register accepts auth-route edits because "the edits are class strings only — no form field, no action target, no validation and no session handling is touched, so no auth path changes." True for plan 10-14; false at `e40ad40`. `git diff e38e3b3..HEAD -- "src/app/(auth)/login/page.tsx"` shows WR-12 replaced the post-sign-in redirect guard — control flow, not a class string. Post-authentication navigation target *is* auth-path behaviour, and SEC-01 is exactly the risk this acceptance asserted could not exist. `(auth)/signup/page.tsx` still qualifies (two class strings + a comment). |

### Closed (49)

| ID | Cat | Disp | Evidence |
|---|---|---|---|
| T-10-01 | Info | mitigate | `dev/theme/page.tsx:383` `NODE_ENV==="production" → notFound()`; `:87-90` `robots:{index:false}`. Build-time constant. |
| T-10-02 | Tamper | mitigate | `theme-query-param.tsx:38` prod early-return; `:43` `THEMES.includes()`; no cast, no interpolation. |
| T-10-03 | Tamper | mitigate | `generate-design-tokens.mjs` — zero `argv`; paths are `resolve(cwd,"<literal>")` at :52,:59-60. |
| T-10-04 | Tamper | mitigate | `favicon-swap.tsx:77` `.includes()`, `:79` used as a **key** into a 2-row literal table. |
| T-10-05 | Tamper | accept | Holds: no CSP in `src/`, `next.config.*`, `middleware.ts`. **But see W-3.** |
| T-10-06 | Repud | mitigate | No `--passWithNoTests` repo-wide; `harness.test.ts` is the positive control, asserts 21:1. |
| T-10-07 | DoS | accept | Holds: `.github/workflows` does not exist — no CI to congest. |
| T-10-08 | Tamper | mitigate | `design-tokens-source.mjs:36` cwd-relative literal; asserted `infra.test.ts:199`. |
| T-10-09 | Info | accept | Re-checked at HEAD: no credential/secret/`process.env` read in `config/*.mjs`. |
| T-10-10 | Repud | mitigate | `contrast.test.ts:91` `composite()`; applied per row `:172-177`; `:246` ≥29 rows (actual 40, 9 with alpha). |
| T-10-11 | Tamper | mitigate | `theme-nesting.test.ts:143` `@theme inline` required **and** `:145` bare `@theme {` forbidden — stronger than registered. |
| T-10-12 | Info | accept | Re-checked: zero secret/env matches in `contrast-pairs.ts`. |
| T-10-13 | Repud | mitigate | `globals.css:490-499` universal `!important` incl. `animation-iteration-count`; `motion-budget.test.ts:44-49,129-141`. Human half: UAT test 4 + `e2e/reduced-motion.spec.ts` 2/2 real Chromium. |
| T-10-14 | DoS | mitigate | `motion-budget.test.ts:39` cap 320ms; `:88` parses value **and** asserts unit, so `0.5s` cannot slip. |
| T-10-15 | Tamper | accept | Phase 18 rule recorded in code at `globals.css:398-399`. |
| T-10-16 | Spoof | accept | `theme-provider.tsx:27-28` — not session state, no identity, no capability. |
| T-10-17 | EoP | accept | Provider takes only `{children}`; no session prop, no server data. |
| T-10-18 | Repud | mitigate | `button-variants.test.ts:58` `not.toContain("bg-brand/90")` **plus** `:60` `not.toMatch(/bg-brand\/\d+/)`. |
| T-10-19 | Tamper | accept | Fork recorded at `button.tsx:7-8`, naming all five collisions. |
| T-10-20 | Repud | mitigate | **CR-02 restoration confirmed.** `focus-recipe.test.ts:389` routes `.css` through `cssDeclarations`; positive controls `:446` (button.tsx), `:453` (globals.css), `:535` `cssChunksInspected>100`, `:681-712` plant a `.css` violation and require it reported. Independent grep: 0 `ring-ring/50` under `src/`. |
| T-10-21 | Repud | mitigate | `status-tones.ts:98` `Record<StatusTone,…>` over closed union; `status-vocab.test.ts:528,581,551,557` drive every status and payout state. |
| T-10-22 | Info | accept | Verified by diff: class strings + one styling prop. No new field, query or data shape. |
| T-10-23 | Tamper | mitigate | `status-vocab.test.ts:620` retired pairing pinned to one site; `:506-514` no tone may reach `success-foreground`. |
| T-10-24 | Repud | mitigate | **Post-WR-07/08/09 verified.** `brand-recipe.test.ts:614` `toEqual([])`; guard-the-guard `:585` >200 files, `:590`, `:594`. |
| T-10-25 | Repud | mitigate | `:777` `[]` over **every** file under `src/`; `:787` widened past the single spelling and the fill role; `:933` 4 `color-mix` pinned so delete-instead-of-replace goes red. Independent grep: 0 `bg-brand/90`. |
| T-10-26 | DoS | mitigate | `:757` per-file map (6 files). Drift 9→8 (WR-15 merged two byte-identical branches); rationale at `:766-771` + `wizard.tsx:620-629`. Strengthened — occurrences, not lines. |
| T-10-27 | Repud | mitigate | Windows normalisation present; `:222` >100 files, `:234-237` named file **and** negative each side, `:241` exhaustive partition. Drift 14→13 (CR-01 emptied `toggle.tsx`). |
| T-10-28 | Tamper | mitigate | `:293` `toBe(44)` with the 56→54→44 history **inside the `it()` name** — the conscious-decision property the register asked for. |
| T-10-30 | Repud | mitigate | **WR-11 confirmed.** Byte equality, no normalisation; guard rejects empty render; out-of-gamut throw asserted red on the recorded value **and** green in-gamut, applied to every shipped token. |
| T-10-31 | Info | accept | `public/` holds only the two theme icons; starter SVGs and `favicon.ico` gone. |
| T-10-32 | Info | mitigate | `grep -rn "@/lib/db\|fetch(" src/app/dev/` = 0 at HEAD. **Caveat: not pinned by any test** — a future data-backed fixture would land silently. Gate it in Phase 11. |
| T-10-33 | Repud | mitigate | `theme-nesting.test.ts:129-135` compiles the stylesheet, asserts `var(--color-` `toBe(0)`; executor's red observation recorded `:35-37`. |
| T-10-34 | Tamper | mitigate | build = `lint && test:design && next build`, asserted by exact string comparison. |
| T-10-35 | DoS | accept | Holds, re-priced (~29s not 85s). Lint is the only place the DS-13 rule runs on Next 16. |
| T-10-36 | EoP | accept | Plugin inline `eslint.config.mjs:146`; WR-14 derivation + IN-07 arity guard `:34-44` throws on arity ≠ 2. **See W-1.** |
| T-10-37 | EoP | accept | Phase 17 catch recorded in code at `button.tsx:110`. |
| T-10-38 | Info | accept | Recorded at `button.tsx:15-19` — deliberate, the one app-wide recipe. |
| T-10-39 | Tamper | mitigate | `:606` `toEqual(EXPECTED_CONVERSIONS)` (11 files) plus `:601` total 15 — the map, not the total. |
| T-10-40 | DoS | accept | At HEAD `booking-row.tsx:114` carries **both** `variant="brand"` and `z-(--z-sticky)`. No collision loss. |
| T-10-41 | Tamper | accept | `wizard.tsx:620-631` keeps the line on the token and records the count as load-bearing. |
| T-10-42 | Repud | mitigate | `type-scale.test.ts:600` >200 floor; `:696` vendored rem total `toBe(4)` — positive control intact. |
| T-10-43 | Tamper | mitigate | `:519` slash-modifier regex; `:672` `toEqual([])` across all four roles. |
| T-10-44 | DoS | accept | Same evidence as T-10-40 — both neighbouring edits survive. |
| T-10-45 | Repud | mitigate | `:498` >200 floor; `:573`/`:577` per-file inventories; `:599-600` the 5 `shadow-none` must be **found**; `:507` named positive control. Drift 9→12 (10-16 added a 3-card ladder), rationale at the assertion. |
| T-10-46 | Tamper | accept | Per-file pinning: the four vendored overlays appear by name in the inventories, so `npx shadcn add` goes red. **Weaker than T-10-19** — no in-file fork note. |
| T-10-47 | Info | accept | Recorded at `globals.css:120` as the intended outcome. |
| T-10-48 | DoS | mitigate | `:898` dialog layer `toBe(9)`; `:914` per-file inventory; `:921` two-on-one-line counted as two. **Caveat: the browser half (`test:e2e`) was run at 10-13 and NOT re-run at HEAD** — three fix passes have since touched `scroll-area.tsx`/`input-group.tsx`. Durable gate green; browser claim stale. |
| T-10-49 | Repud | mitigate | `:891-899` 11 sticky + 9 dialog = 20; three per-file inventories; `:927` the 2 `z-0` control; `:848` >200 floor. Drift 21→20 — the plan's 21st was a comment, not a call site. A tightening. |
| T-10-50 | Tamper | accept | Same record as T-10-15. Lowering 50→30 does not change the relation to a vendor already above both. |

---

## Unregistered flags (WARNING — not blockers)

All 17 SUMMARY files declare `## Threat Flags: None`; four (10-01, 10-02, 10-06, 10-10) carry no
such section at all. Treating that list as complete would have missed:

- **W-1 — two new build-time dependencies, unmapped.** `culori@^4.0.2` and `@types/culori@^4.0.1`
  entered `devDependencies` this phase, and `npm run build` now executes them via `test:design`.
  T-10-36's "no new npm dependency" acceptance is scoped to the ESLint rule and remains true for
  it. Not reachable from `src/` (only `tests/design/*` and the generator import it), so the
  exposure is build-machine only. No threat maps to it.
- **W-2 — `src/lib/safe-callback-url.ts` and `tests/security/safe-callback-url.test.ts` are new
  files created during phase 10** on a security-critical auth path, with no register entry and no
  Threat Flag (they were added by a fix pass, after the SUMMARYs were written). This is where
  SEC-01 lives — the register could not have caught it, and the SUMMARY convention did not either.
- **W-3 — an unsubstantiated documentation claim.** `10-05-SUMMARY.md:202` states T-10-05's
  carry-forward is "recorded in the provider header": if a CSP is added, the provider needs the
  `nonce` prop. It is not. `grep -c "nonce\|CSP" src/components/theme/theme-provider.tsx` = **0**,
  and `deferred-items.md` has no such entry. A Phase 11 engineer adding a CSP gets no warning, and
  the theme silently stops applying pre-paint. Belongs in Phase 11's inputs.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| — | T-10-05, 07, 09, 12, 15, 16, 17, 19, 22, 31, 35, 36, 37, 38, 40, 41, 44, 46, 47, 50 | 20 plan-time acceptances, each re-verified as still holding at `e40ad40` (evidence in the Closed table). Recorded as closed-by-acceptance, not re-litigated. | plan-time register, re-underwritten by audit 2026-08-12 | 2026-08-12 |
| — | T-10-29 | **NOT accepted.** Its stated basis is false at HEAD — see Open table. | — | — |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-08-12 | 50 | 49 | 1 | gsd-security-auditor (opus), verified at `e40ad40` |

Five registered counts moved across the three fix passes (T-10-26 9→8, T-10-27 14→13,
T-10-28 56→54→44, T-10-45 9→12, T-10-49 21→20). Each was checked individually: every move is
documented at the assertion site with a stated cause, and in each case the surviving gate is a
per-file map rather than the bare total the register described — **strictly stronger, not looser.**

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [ ] `threats_open: 0` confirmed — **1 open (T-10-29)**
- [ ] `status: verified` set in frontmatter — **blocked**

**Approval:** pending — blocked on T-10-29 and SEC-01.

### To clear this gate

1. **Open a separate security ticket for SEC-01.** Phase-4 code; do not fold the fix into phase 10.
   Reject `pathname.startsWith("//")` after the origin check, and extend the attack list.
2. **Re-underwrite T-10-29** to name the guard change — or move it to `mitigate` and pin it.
3. Re-run `/gsd-secure-phase 10`.
