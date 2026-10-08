# Phase 27 engineering evidence

Engineering preparation and live account facts remain separate. Full unit/design and the first full browser gate failed. A successful build/typecheck/lint is insufficient to claim the engineering contract complete. No checkout, payout, legal, provider, deployment or live mail release occurred.

```json
{
  "schemaVersion": 1,
  "recordedAt": "2026-10-08T21:09:30.1930675Z",
  "phaseExecutionBase": "edec99b89bffa62df9ba47b4cf85c12f96acfa3f",
  "planBase": "1afc5fc3b48d27bd292bbe96ecc11abe2944862a",
  "liveInboxProven": false,
  "engineeringAcceptance": "failed gates retained",
  "finalSourceVerification": "Full unit/design precede final UI-only HostingIntent readiness repair. Subsequent focused activation unit10/10, real activation2/2, full types/lint/build and all51 owned browser cases pass. No claim that full unit/design passed.",
  "gates": [
    {
      "command": "node node_modules/vitest/vitest.mjs run",
      "startedAt": "2026-10-08T20:39:20.1956208Z",
      "finishedAt": "2026-10-08T20:44:38.9462328Z",
      "durationSeconds": 318.751,
      "exitCode": 1,
      "status": "fail",
      "result": "254 passed / 4 failed / 2 skipped files; 3304 passed / 8 failed / 5 skipped tests. Exit 1.",
      "evidenceKind": "raw-log",
      "rawLogAvailable": true,
      "rawLogPath": "playwright/.cache/phase27-08/final-unit.log",
      "logSha256": "d5488568cca638e393a7715b3ef09347c42771f2822c239d2bb98e07b9feabd8",
      "disposition": "Eight existing validation/date/availability/sweep fixture failures retained with execution-base and dirty-source attribution below; no policy changes. This full run predates last HostingIntent readiness safeguard; final focused activation unit 10/10 passes."
    },
    {
      "command": "node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts",
      "startedAt": "2026-10-08T20:48:47.8452428Z",
      "finishedAt": "2026-10-08T20:50:01.1399561Z",
      "durationSeconds": 73.2947133,
      "exitCode": 1,
      "status": "fail",
      "result": "83 passed / 7 failed files; 1497 passed / 9 failed / 6 skipped tests. Exit 1.",
      "evidenceKind": "raw-log",
      "rawLogAvailable": true,
      "rawLogPath": "playwright/.cache/phase27-08/final-design.log",
      "logSha256": "b8d77dc1ac80f107bc188e5d62099359dc22def8937212887f92773acb4cefdc",
      "disposition": "Nine remaining execution-base/source-fixture and preexisting host-map closure failures retained, exact attribution below. Repaired marketing census/origin/loading contracts pass. Full run predates final UI-only HostingIntent safeguard."
    },
    {
      "command": "node node_modules/typescript/bin/tsc --noEmit",
      "startedAt": "2026-10-08T21:03:50.8534281Z",
      "finishedAt": "2026-10-08T21:04:00.0177262Z",
      "durationSeconds": 9.1642981,
      "exitCode": 0,
      "status": "pass",
      "result": "No source TypeScript diagnostics on final UI source. Exit 0.",
      "evidenceKind": "raw-log",
      "rawLogAvailable": true,
      "rawLogPath": "playwright/.cache/phase27-08/release-types.log",
      "logSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    },
    {
      "command": "node node_modules/eslint/bin/eslint.js .",
      "startedAt": "2026-10-08T21:04:30.7941689Z",
      "finishedAt": "2026-10-08T21:05:05.5873085Z",
      "durationSeconds": 34.7931396,
      "exitCode": 0,
      "status": "pass",
      "result": "0 errors / 34 warnings on final UI source. Exit 0.",
      "evidenceKind": "raw-log",
      "rawLogAvailable": true,
      "rawLogPath": "playwright/.cache/phase27-08/release-lint.log",
      "logSha256": "31404de6c292ac5f6d8d27e85ab6c1839ca57ddb1bdd31ca6bc181c821736d8e"
    },
    {
      "command": "node node_modules/next/dist/bin/next build",
      "startedAt": "2026-10-08T21:05:37.5864662Z",
      "finishedAt": "2026-10-08T21:06:49.9592448Z",
      "durationSeconds": 72.3727786,
      "exitCode": 0,
      "status": "pass",
      "result": "Production route generation completed on final UI source with isolated test DB, mail off and inert noncredential build markers. Exit 0.",
      "evidenceKind": "raw-log",
      "rawLogAvailable": true,
      "rawLogPath": "playwright/.cache/phase27-08/release-build.log",
      "logSha256": "173824f56f60b17c34eb2c00a4a8f8026b25d62ebb6b7fe87e0f4826bcbadd38"
    },
    {
      "command": "node node_modules/@playwright/test/cli.js test e2e/marketing-tracer.spec.ts e2e/marketing-host-matrix.spec.ts e2e/marketing-journeys.spec.ts e2e/marketing-contact.spec.ts --project=chromium",
      "additionalArguments": "--workers=1",
      "startedAt": "2026-10-08T21:07:23.1325471Z",
      "finishedAt": "2026-10-08T21:09:30.1930675Z",
      "durationSeconds": 127.0605204,
      "exitCode": 0,
      "status": "pass",
      "result": "51 passed; no skipped/unrun owned case; normal runner/server teardown. All final UI source and actual local integration assertions pass.",
      "evidenceKind": "raw-log",
      "rawLogAvailable": true,
      "rawLogPath": "playwright/.cache/phase27-08/release-browser.log",
      "logSha256": "6c317126d534d95a5e444935738edd021dd7dc47d4c1b9c545b2ea420008886b"
    }
  ],
  "initialFullGates": [
    {
      "evidenceKind": "terminal-transcript",
      "rawLogAvailable": false,
      "rawLogLoss": "Original logs were mistakenly placed inside Playwright outputDir and deleted at browser startup; only actual terminal outputs preserved in the task transcript remain. Digest below authenticates this saved bounded result, not the lost raw log.",
      "command": "node node_modules/vitest/vitest.mjs run",
      "startedAt": "2026-10-08T19:35:38Z",
      "finishedAt": "2026-10-08T19:41:13Z",
      "durationSeconds": 335.1655125,
      "exitCode": 1,
      "status": "fail",
      "result": "7 failed files, 251 passed, 2 skipped; 17 failed tests, 3294 passed, 5 skipped. Exit 1.",
      "logSha256": "6e630b877eed930eff03a10763db946dc017339b03e7d2694acb3646e5b52ab7",
      "disposition": "Auth host/preview fixtures phase drift; checkout date and validation/availability/payout failures unresolved. Focused auth repair subsequently passes 18 tests. Full unit remains failed until a complete rerun."
    },
    {
      "evidenceKind": "terminal-transcript",
      "rawLogAvailable": false,
      "rawLogLoss": "Original logs were mistakenly placed inside Playwright outputDir and deleted at browser startup; only actual terminal outputs preserved in the task transcript remain. Digest below authenticates this saved bounded result, not the lost raw log.",
      "command": "node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts",
      "startedAt": "2026-10-08T19:41:38.7350878Z",
      "finishedAt": "2026-10-08T19:42:58.2402744Z",
      "durationSeconds": 79.4992751,
      "exitCode": 1,
      "status": "fail",
      "result": "12 failed files, 78 passed; 18 failed tests, 1487 passed, 6 skipped. Exit 1.",
      "logSha256": "a1ea888b70c7fd3d2789aa7249e9df48e1eb363bbf9ac3d2321ab19d5c574377",
      "disposition": "Source/census drift includes missing async start-hosting loading boundary (repaired); preexisting dirty public fallback still fails exact box contract. Other failures require phase-base vs dirty-source classification. Full design remains failed."
    },
    {
      "evidenceKind": "terminal-transcript",
      "rawLogAvailable": false,
      "rawLogLoss": "Original logs were mistakenly placed inside Playwright outputDir and deleted at browser startup; only actual terminal outputs preserved in the task transcript remain. Digest below authenticates this saved bounded result, not the lost raw log.",
      "command": "node node_modules/typescript/bin/tsc --noEmit",
      "startedAt": "2026-10-08T19:44:33.4891488Z",
      "finishedAt": "2026-10-08T19:44:42.4028535Z",
      "durationSeconds": 8.9068804,
      "exitCode": 0,
      "status": "pass",
      "result": "No TypeScript diagnostics. Exit 0.",
      "logSha256": "f6c99df9b12df76094aef7a560770b0cab3cd03e11eb16c6597842c19021c38f"
    },
    {
      "evidenceKind": "terminal-transcript",
      "rawLogAvailable": false,
      "rawLogLoss": "Original logs were mistakenly placed inside Playwright outputDir and deleted at browser startup; only actual terminal outputs preserved in the task transcript remain. Digest below authenticates this saved bounded result, not the lost raw log.",
      "command": "node node_modules/eslint/bin/eslint.js .",
      "startedAt": "2026-10-08T19:44:54.5645307Z",
      "finishedAt": "2026-10-08T19:45:30.5722669Z",
      "durationSeconds": 36.0011907,
      "exitCode": 0,
      "status": "pass",
      "result": "0 errors, 33 warnings. Exit 0.",
      "logSha256": "d0ba5c9f5762929a2a1863ce09148dd636a128caca702c1424196b8de30b8cc6"
    },
    {
      "evidenceKind": "terminal-transcript",
      "rawLogAvailable": false,
      "rawLogLoss": "Original logs were mistakenly placed inside Playwright outputDir and deleted at browser startup; only actual terminal outputs preserved in the task transcript remain. Digest below authenticates this saved bounded result, not the lost raw log.",
      "command": "node node_modules/next/dist/bin/next build",
      "startedAt": "2026-10-08T19:49:30.5625598Z",
      "finishedAt": "2026-10-08T19:50:41.6140356Z",
      "durationSeconds": 71.095594,
      "exitCode": 0,
      "status": "pass",
      "result": "Next production build completed route generation. Exit 0.",
      "logSha256": "6d48079d1405522ba04c6b02a059c9e2b7d52ef0c188ec4f9d943e722d970ae2"
    },
    {
      "command": "node node_modules/@playwright/test/cli.js test e2e/marketing-tracer.spec.ts e2e/marketing-host-matrix.spec.ts e2e/marketing-journeys.spec.ts e2e/marketing-contact.spec.ts --project=chromium",
      "additionalArguments": "--workers=1",
      "startedAt": "2026-10-08T19:58:20.2471558Z",
      "finishedAt": "2026-10-08T20:01:01.1472636Z",
      "durationSeconds": 160.9179361,
      "exitCode": 1,
      "status": "fail",
      "result": "38 passed, 8 failed, 46 total. Root metadata serialization fixture (4), local listener redirect fixture (1), actual unhydrated signup/password native GET (2), intermittent approved /new 404 (1). No teardown intervention.",
      "evidenceKind": "raw-log",
      "rawLogAvailable": true,
      "rawLogPath": "playwright/.cache/phase27-08/browser.log",
      "logSha256": "52e8b5a534523a854105321148a9734ad70ca443c84dd8389e9de70f0f6ca9e6",
      "disposition": "Meaningful parsed URL comparison corrected; real image decode RED added. Narrow screenshot/listener/auth repairs and real draft assertion prepared; latest complete browser verification pending. Native GET failures are not called application success."
    }
  ]
}
```

## Isolation and provenance

All six full gate categories ran alone in the required order. Final types/lint/build/browser then verified the last UI-only readiness repair; earlier full unit/design remain dated and failed. The unit start/end above are transcript-reconstructed to seconds; its actual measured duration is retained. Other timestamps came from terminal wrappers. Full commands use installed CLIs, never package installation. DATABASE_URL and TEST_DATABASE_URL point explicitly to guarded localhost PostgreSQL fitout_test. No production DB, migration or provider transaction was used. NEXT_PUBLIC_APP_URL was explicitly blank for unit tests which vary BETTER_AUTH_URL, avoiding an inherited conflicting app origin. Browser webServer fixes exact app localhost:3000, marketing marketing.localhost:3000 and ops ops.localhost:3000, does not adopt an existing server, and disables Resend transport. PAYMONGO_SECRET_KEY, webhook keys, Didit keys and Inngest event/signing keys were empty; Contact false. Unit audit found public guest-email/notify writes in the isolated test database, not dev/production.

The original full unit/design/type/lint/build logs were unfortunately saved below test-results, and Playwright deleted that output directory. This is an evidence retention error. Counts and terminal exits above are actual transcript observations; their digests hash the saved result strings, never reconstructed raw logs. Browser logs now live under ignored playwright/.cache/phase27-08 and have actual file digests. They are not copied into tracked artifacts because dev mail fallback contains synthetic verification links. No secret values appear here.

## Initial full failures and dispositions (historical)

| Gate | Exact failure class | Disposition |
|---|---|---|
| Unit | login-reachable-after-reset:5 missing Host; ops-response-gateway:2 fixture wrong port; secret-config:2 explicit deployed preview origin/diagnostic drift | Phase-origin fixture contract repairs, focused 18 tests subsequently passed. No full rerun yet. |
| Unit | slot-picker-end-boundary:2 missing selected classes; checkout-create:3 fixture return expired; listing-schema:2 rate validation disagreement; ops-cancel:1 missing sweep fixture | Do not change money/bookability policy. Compare phase-base committed changes with preexisting dirty files; unresolved full results retained. |
| Design | brand-recipe count; elevation-z2 inventories; email-preview origin spelling; ops-host origin spelling; scaffold preview config | Phase-surface census/source contract drift requires meaningful explicit adopter/authority updates, never blanket count weakening. |
| Design | loading-coverage:3 (start-hosting missing loading, seven new page census, public fallback raw measurements) | Missing loading and explicit page classifications repaired; focused check now16 pass/1fail. Public fallback dirty raw h-3/w-28/w-40 measurements remain red. |
| Design | email-shell, listing-reuse-predicate-census, live-regions, one-tree, selector-contract, suspense-fallback-overlay | Remaining source/fixture disagreements require committed phase-base vs dirty source attribution; not asserted inherited merely because unchanged from Plan08 base. |
| Browser | Four Home canonical expectations incorrectly distinguished empty root and slash | WHATWG URL comparison retains exact origin/path/query; same semantic URLs accepted. No host/canonical authority weakening. |
| Browser | Relative legacy Location resolved to marketing; direct receiver expectations used401 where existing routes return400 | Keep real semantic app authority and browser-follow assertion. Local listener name omission was corrected, with failed127 trial retained. Receiver assertion now exact400/Invalid signature/no Location. |
| Browser | Native signup/password GET included synthetic form fields in query; Next dev transformAlgorithm stream error | Real security defect, not failed auth policy. Both forms now method POST and disabled until hydration; JS-disabled keyboard regression and real hydrated journeys required. Runtime stream error remains separately recorded. |
| Browser | Actual /host/listings/new returned404 once | Retry reached200 and actual wizard; no source listing policy repair. Added exact owner-scoped draft SQL readback. Initial intermittent dev404 retained until full clean result. |
| Browser | Screenshots optimizer returned invalid-image/null; initial page/axe checks did not catch decoded image | Added actual naturalWidth/complete RED. Installed Next optimizer does not forward headers; hostless internal fetch cannot satisfy exact Host policy. Existing committed images use per-call unoptimized to serve directly from marketing authority. No asset allowlist widening. |

## Retries and instrumentation

- Typecheck initial exit2 (8.827s): own missing axe diagnostic arguments; corrected, final exit0 recorded above.
- Build sandbox initial exit1 (29.078s): existing official Google Fonts fetch blocked. Exact escalated retry authorized.
- Build escalated retry exit1 (64.747s): existing PayMongo production import guard requires key even in build. Final build used an inert invented noncredential marker only; no valid provider credential or transport enabled. Existing signing secret was never printed. Test DB, mail off, payout mode HOLD.
- First browser runner16656: no descendants/server or tests; root verified then stopped owned runner after bounded wait. Actual exit-1/212.389s, inconclusive discovery instrumentation.
- Second runner2004: outputDir cleanup lock; root stopped only verified owned runner. Actual exit-1/150.137s, no tests. Discovery --list succeeded46 tests. Lost raw files explicitly disclosed.
- Diagnostic20:07:13–20:08:05Z:4 failed in51.665s. Real image decode false and resolved legacy marketing authority reproduced; password native GET persisted; new listing reached200 but my initial first-step heading was incorrect.
- Authorized127 listener trial20:09:51–20:12:09Z:5failed in138.711s. Installed Next normalizes loopback127 to localhost; adapter/runtime rewrite now mismatched listener, causing marketing404. Failed trial retained, reverted to documented explicit0.0.0.0 listener. Source edits during this trial made it noncanonical; clean next run required.
- Clean focused20:14:32–20:15:15Z:7passed/1failed in43.476s. Home OG/image decode/axe, full-query redirect and actual app browser-follow, receivers, two JS-disabled regressions, real signup resume and actual new owned draft passed. Remaining signed-cookie login ERR_ADDRESS_INVALID traced internal listener request.url. Product/session redirect fix now uses configured app origin; real password/stale-cookie verification pending.
- Auth repair focused unit:18passed/3files, exit0 in4.94s; schema audit clean.
- Loading focused design:16passed/1failed, exit1 in1.672s; only remaining public fallback raw measurement violation. Initial full gate failures stay recorded.

## Coverage boundaries

All six pages at320/375/768/1440, Court/axe/overflow/image decode, mobile menu/skip/FAQ keyboard, Home audience CTA journeys, real Link Flight/history/refresh, explicit RSC and prefetch headers, alternating HTML/RSC responses, namespace/private-marker/authority/method/full-query boundaries, robots text/sitemap, host-only app/ops sessions and stale cookies are actual local browser checks. Manual prefetch in next dev is a protocol probe: production automatic prefetch/cache behavior remains a deployed acceptance requirement.

Contact UI simulated responses and local default no-key503 are not inbox receipt. Production-disabled behavior is enforced by source/unit contracts; actual deployed false flag and disabled recovery still need readback. Current robots text and six sitemap URLs passed. All five non-Home rendered canonical/OG screenshots passed initially; Home metadata passed after semantic serialization correction.

## Pending

All51 final owned browser cases and final types/lint/build passed. Eight unit and nine design baseline assertions remain failed with concrete source/fixture dispositions below. No engineering acceptance, seven requirement completion, external approval or live inbox proof is claimed. The exact compatibility-first packet awaits human/account prerequisites, central review and a final approved SHA.

## Final suite baseline attribution

The comparison is against phase execution base `edec99b89bffa62df9ba47b4cf85c12f96acfa3f`, with phase 01–07 committed differences and existing dirty changes considered separately. These failures remain failures; the attribution does not waive the full gate.

| Final failure | Exact cause and provenance |
|---|---|
| Unit listing-schema (2) | Fixture expects both rates; existing dirty `src/lib/validation/listing.ts` accepts one. Phase 01–07 changed neither rate policy nor these assertions. Preserved unrelated validation work. |
| Unit checkout-create (3) | `reason: expired` prevents provider redirect and checkout-error assertions. The execution-base fixture already uses `2026-10-01` starts/ends, before the October 8 run. Existing unrelated checkout edits are preserved; no date, provider or money-policy assertion was changed. |
| Unit slot-picker-end-boundary (2) | Preexisting untracked fixture expects `bg-brand/15`; actual selected checkout boundary has `bg-muted`, `ring-brand` and `disabled:opacity-100`. Phase 01–07 did not change the slot-picker policy/source. |
| Unit ops-cancel (1) | Existing sweep fixture excludes `oc_b_sweep` before the cancellation, making its expected before/after witness fail. Execution-base-to-plan-base comparison has no changes in the test, cancellation action or payout implementation. No payout predicate was changed. |
| Design email-shell (1) | Pure renderer fixtures assert no `mailto:` without setting SUPPORT_EMAIL null. Execution-base `src/lib/site.ts` already has the same nonnull support value; `src/lib/email-shell.ts` and assertion are unchanged. The new Contact sender is not invoked by these pure fixtures. Current mailbox ownership still requires account proof. |
| Design listing-reuse census (1) | `controlled_checkout_grant` lacks an explicit child-table disposition. The table and listing relationship already exist in execution-base schema; no phase schema or census changes introduced them. |
| Design live-regions (1) | Derived five-host-surface closure is 21 at execution base and 22 in the working tree. The additional file is preexisting untracked `src/components/listing/host-location-map.tsx`, reached through the dirty host edit wizard import. Marketing Contact is outside all four owned trees and cannot contribute to this closure. No phase 01–07 wizard/host-map change exists. |
| Design public loading (1) | Raw `h-3`, `w-28`, `w-40` box measurements in `src/app/(public)/loading.tsx` exist at execution base. This is a committed baseline defect, correcting the earlier dirty-file attribution above. The new start-hosting loading boundary passes. |
| Design one-tree (2), selector-contract (2) | Execution-base `progressive-search-overlay.tsx` already contains the two viewport branches, second matchMedia call, and undeclared mobile-sheet/desktop-overlay IDs. The source and corresponding assertions have no phase 01–07 or current changes. No gate widening applied. |
| Design suspense-fallback-overlay (1) | Mutation expects `ProfileLink, SiteChrome` import, while execution-base host layout already imports only `SiteChrome`. The assertion fails its explicit APPLIED=false guard before measuring the mutated defect. Layout and test unchanged in this phase. |

Final full unit: exit 1, 254 passed / 4 failed / 2 skipped files, 3304 passed / 8 failed / 5 skipped tests, 318.751 seconds. Final full design: exit 1, 83 passed / 7 failed files, 1497 passed / 9 failed / 6 skipped tests, 73.295 seconds. All authorized auth, origin, metadata and marketing census repairs pass their final full suites. Acceptance remains failed.

## Hydration readiness and final source boundary

Actual native GET submissions initially put synthetic login/signup credentials and Contact inquiry values into URLs. Their forms now explicitly use POST and disable input/submit controls until the stable client hydration snapshot, preserving validation and retry semantics. Marketing Menu uses the same readiness guard. Tests wait for observable enabled controls or header readiness before invoking client-only events. Native anchor navigation before hydration is valid fallback and is not classified as broken hydration. Final real Contact pending/deduplication/error/recovery/default-no-key, Menu and Flight tests pass.

The 50-case browser run at 20:55:49.396–20:58:12.181Z exited 1 after 142.785 seconds: 49 passed, one explicit booker activation failed. Its log contained only GETs and no POST for that case; the client-only hosting button could accept a click before attaching its handler. The same narrow readiness safeguard was added to HostingIntent, without changing the capability action. Focused unit tests subsequently pass 10/10 and focused real activation proves POST 200, both capabilities and exactly one audit. Earlier full unit/design results above precede this last UI-only repair; they are not claimed to have run on that final source. Final types/lint/build/browser results will identify the final source checks.

The earlier wrappers set an unused CONTACT_INQUIRY_ENABLED variable. This is not the production disable switch. The actual switch is CONTACT_PRODUCTION_ENABLED, absent in the local env file and therefore default-disabled for production, and explicitly false in the final activation checks. Production-disabled behavior passes the real route unit contract; deployed false read-back remains pending.

## Final verification outcome

Final Chromium: **51 passed**, exit0,127.061s, normal teardown. Final UI source types/lint/build pass; focused activation unit10/10 and real activation2/2 pass. The standalone offline evidence script also passes focused ESLint after its raw-log digest/containment safeguard. Final raw gate logs are retained under the ignored path above and their actual file hashes are verified by the prepared validator. Previous50-case failed raw log remains separately at `final-browser.log`; the earlier49-case interim log was overwritten by that later50-case run, so its40pass/9fail result is transcript-derived only. Original initial lost logs remain explicitly marked in initialFullGates.

JavaScript-disabled hosting remains at the accessible loading boundary. Its regression inspects only the hidden resolved streamed SSR action markup for disabled state and verifies unchanged URL, no capability grant and no activation audit. It does not claim a usable or accessible no-JavaScript hosting journey. Hydrated real activation retains exact POST200, both capabilities and one audit.

All final provider transports/mail remain disabled; final checks use the actual CONTACT_PRODUCTION_ENABLED=false flag. Earlier mistaken unused flag is disclosed above. Contact default no-key503 and production-disabled503 unit cases pass, but actual deployed flag, global budget/control and inbox delivery remain unproved. Payment, payout and legal HOLD remain immutable.
