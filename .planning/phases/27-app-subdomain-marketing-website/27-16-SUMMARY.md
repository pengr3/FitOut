---
phase: 27-app-subdomain-marketing-website
plan: "16"
status: complete
subsystem: runtime-streaming
requirements-completed: []
completed: 2026-10-09
---

# Plan 16 engineering repair complete

D-22 accepts the canonical production build under the already-installed fixed
runtime. Native cancellation attribution/preflight and the original hosting
journey are proved. Signup/password flows still exercise real endpoints with
unchanged limits. Listing-only sessions are explicitly synthetic and checked
by the real browser/session reader. Both native production cookie semantics
and guarded cleanup are verified. Cold development remains G18; it has not
passed or been relabeled. The new-listing route and packages were not patched.

Tested revision: 596b47460282d756a1a5882c4c2d86f18b7ff851. Manifest: df0862eacdc3b9e1a57419bc03b8fee0ac3d3e539600418b81b772a5fa2137f4.

Full proof: playwright/.cache/phase27-08/full-596b4746-adf004b6-ad43-48dd-ae1b-9030fbcf8fac/gates/report.json. Fresh cold-server proof: playwright/.cache/phase27-08/full-596b4746-adf004b6-ad43-48dd-ae1b-9030fbcf8fac/final-cold-463ba2cc-dbf0-4efb-a79b-bd1148719097/report.json.

| Gate | Actual outcome | Exit |
|---|---|---|
| vitest | Test Files  259 passed \| 2 skipped (261); Tests  3343 passed \| 5 skipped (3348) | 0 |
| vitest | Test Files  91 passed (91); Tests  1510 passed \| 6 skipped (1516) | 0 |
| typescript | No TypeScript diagnostics. | 0 |
| eslint | 33 problems (0 errors, 33 warnings) | 0 |
| next-build | ✓ Compiled successfully in 39.7s; ✓ Generating static pages using 7 workers (46/46) in 4.3s; Finalizing page optimization ... | 0 |
| playwright | 59 passed (1.5m) | 0 |

All source guards pass. Unit/design retain only the existing 5/6 skips; browser
has zero skips. The fresh server case has 1 pass and zero skips, requiring both
cold and warm real owned draft creation, the five-second URL deadline and no observed
target native streaming exception. Node v24.19.0
passes its functional preflight; this does not identify the deployed patch version.

The engineering schema represents canonical command and additionalArguments
separately. executedCommand and each immutable raw record/report preserve the
complete actual argv/order, including unit 4/design 2 worker limits and all six
owned browser specs using the built-server config. Only the exact fixed runner
commands were adapted; no focused test or result was substituted.


Original 08/09 and all seven requirements remain pending. Contact is off and
checkout/payout/legal HOLD remains. No production mutation or inbox proof is inferred.

The tested release candidate remains 596b47460282d756a1a5882c4c2d86f18b7ff851. Subsequent bookkeeping and the offline synthetic-evidence fixture update do not constitute full-gate verification of a later commit.
