# Deferred Items — Phase 11

Out-of-scope discoveries logged during execution. Not fixed by the plan that found them.

- **[11-02] `.planning/STATE.md` has 2 unbalanced `<details>` tags.** At HEAD (`7aed77e`) the file holds 16 `<details>` openers and 14 `</details>` closers; plan 11-02 preserved the delta (17/15) rather than closing it. Pre-existing, unrelated to this plan, and cosmetic — GitHub renders the trailing blocks as nested rather than sibling. Fix during the next STATE prune.
- **[11-02] The phase-wide GATE-06 check command is wrong.** `ls drizzle/ | tail -1` returns `meta` (the `meta/` directory sorts last), not `0025_audit_resolved_by.sql`, so read literally the criterion is red on a healthy tree. Use `ls drizzle/*.sql | tail -1`. Appears in the `<verification>` block of multiple Phase 11 plans.
- **[11-03] A SECOND e2e failure joined D-6 item 1, and it is a NEW one: `e2e/search-and-book.spec.ts:318` now hits a strict-mode violation on the booking-reference paragraph.** Full-suite signal on 13 Aug 2026 is **19 passed / 2 failed / 6 did not run**, not the **17 / 1 / 5** that plans 10-13 and 10-14 recorded. Failure 1 is D-6 item 1 verbatim (`e2e/open-capacity.spec.ts:376`, the `Saturday, Aug 15` panel heading). Failure 2 is new:

  ```
  Error: strict mode violation: getByText('FIT-ANYE1QSH', { exact: true }) resolved to 2 elements:
      1) <p class="text-2xl font-semibold tracking-tight tabular-nums sm:text-display">FIT-ANYE1QSH</p>
      2) <p class="text-2xl font-semibold tracking-tight tabular-nums sm:text-display">FIT-ANYE1QSH</p>
  ```

  **Proven NOT caused by plan 11-03.** `playwright.config.ts` was reverted to its HEAD content with `git checkout -- playwright.config.ts` and `npx playwright test e2e/search-and-book.spec.ts` re-run: **identical signal — 1 failed / 1 did not run / 1 passed, same test, same assertion, same duplicate-element error.** The new config was restored afterwards and re-verified. It is also structurally impossible for this plan to cause it: the only runtime-affecting edits are a snapshot mode and two `testMatch` globs, and this assertion takes no screenshot.

  **Not caused by Phase 11 source changes either, as far as the tree can say.** The rendering site is `src/app/(app)/bookings/[id]/page.tsx:584` — the ONLY place in `src/` with that class string besides `components/host/payout-summary.tsx` — and its last commit is `69b3a70` (plan 10-11). No Phase 11 plan has touched it.

  **Leading hypothesis, untested:** two identical paragraphs in one document is the shape of Next's dev-mode streaming leaving both the streamed and the reconciled copy in the DOM across the `page.reload()` at `:317`, which would make this timing-dependent rather than a product defect. Testing that needs a production build (`npm run build && npm start`) and a re-run — cheap, but outside a config-only plan. Whoever picks this up: rule the streaming hypothesis in or out FIRST, because if it holds, the fix is in the spec's locator, not on the confirmation page.

- **[11-08] Every shipped row card renders 112px while its skeleton shimmers 80px — a 32px-per-row layout shift on three live routes.** `ROW_CARD_HEIGHT` (`h-20`) derives 80px as "a `Card` is `p-4` (16 top + 16 bottom) around a 48px thumbnail". The derivation is right about the box and wrong about which element owns the padding in THIS tree: the vendored `ui/card.tsx:15` carries `py-4` on **`Card` itself** and only `px-4` on `CardContent`, so a row that also asks `CardContent` for `p-4` — which `booking-row.tsx:60` and `host-booking-row.tsx` both do — pays the block padding **twice**.

  **Measured, not reasoned** (Chromium 1223, the compiled stylesheet, 640px wide, class strings produced by the repo's own `cn()` so the fixture cannot disagree with the component about which utility survives a merge):

  ```
  <Card className="relative">        + CardContent p-4  ->  112px   ← booking-row.tsx, host-booking-row.tsx
  <Card className="relative py-0">   + CardContent p-4  ->   80px   ← patterns/row-card.tsx (11-08)
  ```

  So `(app)/bookings/loading.tsx` and `RowListSkeleton` (both 80px rows) under-draw every shipped row by 32px, which is exactly the shift STATE-01 exists to remove — caused, ironically, by the skeleton.

  **Not fixed here, deliberately.** Plan 11-08 ships the pattern layer and adopts nothing; editing `booking-row.tsx` / `host-booking-row.tsx` / `request-row.tsx` / `payout-row.tsx` / `notification-item.tsx` is the adoption plans' scope, and changing a shipped row's height is a visible change that belongs in the commit that swaps the route. `patterns/row-card.tsx` carries `py-0` so the PATTERN measures the constant it claims, and the discrepancy dies as each route adopts it. Whoever picks up the adoption: the height is a **pure win at adoption** (rows shrink to the number the skeleton already draws), so no skeleton change is needed — but re-measure, because `RowCard`'s `actions` slot adds a `space-y-3` row when present and the 80px figure is the resting height only.
