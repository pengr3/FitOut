# PR 21 CI repair — October 14, 2026

The owner authorized merging PR21 into dev. GitHub run38501646166 at14de2062 passed the build/design gate and both Vercel previews, but failed unit, price-parity, visual and functional browser jobs. Those failures are retained in the linked run and sanitized local log.

Repair source eb81418d5a649fa3ceeceb2e52576738eef43335 changes only workflow/test configuration, fixtures and tests. Browser jobs run inside a container and must reach their PostGIS service by the label postgres; the prior Playwright server forced localhost. The new selector accepts only the exact ephemeral postgres/fitout_test URL in GitHub Actions with CI=true. Local runs remain fixed to localhost/fitout_test and never inherit a deployment database. Eight tests exercise acceptance and refusal, including real-shaped host/credential/query/name drift. Migrate, seed, app and fixture connections now agree on that same test database. The baseline-generation job uses the identical target.

The downloaded visual artifact showed the already-correct search baseline versus an actual database-error page. No baselines were regenerated. All browser assertions, workflow jobs/triggers and refusal gates remain active; unrelated root CI-cost drafts are excluded. The server and signed fixture process use the same inert test-only secret/local origin.

Four auth suites now supply the origin and Google dummy inputs their contracts need instead of relying on local ambient configuration. Google inputs are supplied before the static production-auth option import. Installed Google state and controlled access_denied handling still execute; no Google network call is made. The first late-stub attempt failed one of55 assertions and is preserved rather than claimed successful.

## Local checks

- Scoped lint and TypeScript pass.
- Full design:1517 passed,one metadata import timed out at5seconds,six existing skips. Focused metadata/database rerun:14 passed. Distinct combined result1518 passed,six skips; this is not a claim of a green full-suite invocation.
- Four affected auth suites:55 passed with ambient app/marketing/Ops origins and Google configuration removed from the runner. Test database leak check was clean.
- All57 workflow invariants pass.

Verified locally at 2026-10-14T03:28:02.744Z. Fresh remote CI must pass before merge; no bypass or job skip is authorized by this repair record.

Original6bb/588/live-provider evidence, Phase27 completion counters and public Contact enablement retain their dates/source identities. Production settings/aliases, provider receivers, accounts, mail and financial jobs are unchanged. The owner's dirty root drafts remain untouched.

## Config-import follow-up at ab4cca136152b60bf73b97cb483dd0e76405138e

GitHub run38506443377 at91c75e3b independently passed the full unit,price-parity and visual jobs. Functional remained in progress at this record. The DB-free design job failed five mail-safety harness assertions because it imports Playwright configuration under that job's unreachable database sentinel, and config-mutated auth origin values survived into the next tests. These are retained failures.

The harness now stubs the exact ephemeral CI URL before importing configuration, supplies matching inert app/marketing/Ops origins, and restores all mutated environment values after each test. It starts no server or database connection. Existing zero-mail/one-captured-send controls remain unchanged; additional assertions pin the fixture database and shared signer/origin agreement. Lint,all13 focused config/database assertions under reproduced CI flags/sentinel/build origins,and TypeScript pass. The initial partial-environment typecheck failure is also retained; the selector input is typed as Partial<ProcessEnv>, with no runtime relaxation. Fresh final-head CI remains required before merge.

## Route-census follow-up at 8378a375736301385f3240c87767459d857fd161

GitHub run38506968123 at16f03c11 passes all four other gates, including full build/design/unit and visual/price checks. Functional stops at its exact disk-to-axe-table equality assertion: the six marketing pages and Start hosting have no rows. The guard is doing its job; both that failure and the preceding run's same failure are retained.

All seven routes now have real rows in the existing axe and overflow drivers. Marketing rows use their actual marketing host and route-specific h1 IDs, not the denied /marketing namespace; Start hosting uses a booker session and its unique heading. A shared six-page fixture list feeds both tables. The overflow inventory maps the syntactic disk namespace to those real row names. No exclusion, count bump, rule denial, node-floor relaxation or assertion removal is used. This adds28 actual scans:14 axe cases at320/1280px and14 overflow cases at320px across the existing two themes.

Lint and TypeScript pass. All10 exact coverage-census guards pass locally with only the server disabled in an owned throwaway config; no DOM scan is claimed by that run. The original local seeded-browser attempt stopped on an unavailable localhost test database. Docker Desktop was started in the background but its API remained unavailable. The first offline regex also selected AC29 DOM cases; it failed on the absent sandbox browser and is retained. The corrected exact census selection passes without launching a browser, server or database. Actual new scans and the entire functional suite must pass in fresh GitHub CI before merge.

## Capture fixture follow-up at 61bff2b2f60397c689326ca1837c5804d5c5c540

Run38507776712 at5cf91c5c again passes all four nonfunctional gates. Full unit is3464 passed/five existing skips. Functional executes198 passes, including the new marketing/Start-hosting axe rows, then fails the hero capture's all-document image decoding. The shared CI catalogue contains unrelated seeded listings whose photo URLs deliberately name example.com; this capture refuses external browser traffic, and those ambient placeholder images cannot decode. A party-dialog color-contrast result also fails once and passes on retry, preserved as flaky.353 later cases do not run after the persistent capture failure.

The hero capture now requires one worker and opts into isolated catalogue visibility on the already exact-guarded test database. It snapshots only the exact IDs of other published listings, hides those for the capture window, and restores only those IDs still in its temporary draft state. The five actual photographed fixtures remain the entire visible capture subject. Other gallery users keep ordinary catalogue visibility. Owned cleanup runs restoration and fixture cleanup in finally, including on a deletion error; initial seeding failure also closes the fixture. Three database-free mocked safety cases verify the default has no bulk visibility write, restoration still occurs after an owned deletion failure, and failed initial seeding closes cleanly. No production database is reachable through the unchanged safety guard.

The party-state audit explicitly waits for the real named dialog's opacity to reach1 before axe measures the settled palette. It does not disable motion, hide a control, deny a rule, lower a contrast threshold or ignore a decode failure. Image decoding still covers every document image. Lint/types/three safety assertions pass locally; actual DOM validation remains delegated to fresh GitHub CI because local Docker is unavailable. No product, asset, account, provider or Production configuration change is made.

## Local Inngest mode at 218b462b6e9f405972fe80c8a1d788a8a8a9fc1d

Run38509252903 atdb1b6bd2 passes all four nonfunctional gates:1521 design/six existing skips,3464 unit/five existing skips,build,visual and price parity. The repaired actual hero/host/player captures all pass, as do the Contact and24 marketing metadata/axe/overflow cases. Functional records240 passed/41 named skips, then fails its GET /api/inngest introspection assertion with500;312 later cases do not run. No decode or settled-party flake is reported in this run.

The installed Inngest client defaults to cloud unless INNGEST_DEV is explicit, independently of next dev's NODE_ENV. Cloud introspection without a signing key returns500. An offline actual-SDK control with zero registered functions and network calls refused reproduces500 in default cloud mode and200 with INNGEST_DEV=1, with zero network attempts. Playwright's own next-dev server now receives that fixed local-mode flag, matching the prior phase gate runner's isolated environment. The config test pins it. Production source/keys/signature guards, deployed receivers and function arrays are unchanged. This is GET introspection, not a signed delivery or financial execution proof.

Scoped lint/types and13 config/database assertions under GitHub flags pass. The actual SDK control passes. Fresh full CI remains required before merge. No jobs are manually invoked and no provider/Production state is changed.

## Signup cooldown and browser context at 4cc30f273996e7247b34852361c70bebe4465b57

Run38510818318 at8c389f65 passes all four nonfunctional gates and the previously failing real receiver boundary assertion. Functional passes250 cases, then createAccount returns a non-success response in the password/stale-cookie journey;302 later cases do not run. The original assertion retained no HTTP status. Its position after five direct signups under one minute matches the unchanged five-per-minute signup rule; this is an inference pending the new status diagnostics, not a claimed captured429.

Synthetic direct signup setup now follows the repository's bounded cooldown pattern: only a real429 with a positive numeric Retry-After of at most60seconds can wait, at most60seconds, and retry once. Invalid headers,400/500 and a second429 remain failures. Only an observed valid cooldown extends the setup test's deadline. The final success assertion remains, now including the actual HTTP status. No limiter, IP trust rule, actor header, product behavior or credential is changed. Ten fake-clock cases verify the wait, refusal cases and one-retry bound.

A proactive source audit found the later cold/warm spec always joined an undefined FITOUT_STREAMING_RUN_DIR in ordinary CI and assumed a separate port3127. Context revision d25812340edcc159a7bd1b3e12c203c31b9bc48b now derives the ordinary test's actual localhost dev baseURL and owned test output directory, while standalone dev/production still requires explicit mode/directory/port. Standalone server metadata/stdout/stderr must exist before a fixture opens; production metadata must match its mode/port. Browser exceptions are collected in both cases. Native server-log census remains mandatory and explicitly identified for the standalone run; ordinary dev observations are labelled and do not claim production proof. The existing canonical production runner/build/runtime/source guards are unchanged. Eight pure context/refusal cases pass.

Scoped lint/types and all18 focused cases pass. No assertion, test, job or source enumeration is excluded. Actual browser validation remains for fresh GitHub CI; local Docker is unavailable.

## Installed auth cooldown header at 43cc1f1018ca209697736afabc75f87da37bfd65

Run38513045076 at49e2a779 passes all four other gates and250 functional cases, but the enhanced diagnostic now confirms HTTP429 from signup. The helper took no retry because it read only standard Retry-After. Installed Better Auth1.6.14 rate-limiter/index.mjs emits X-Retry-After instead. The earlier generic-header assumption was wrong; its failure remains recorded.

An actual in-process SDK control, with no application/database import and network calls refused, sends five invalid-password signup requests: all return400. Its sixth returns429, standard Retry-After absent and X-Retry-After60; network attempts remain zero. The fixture now recognizes the installed header alongside the standard spelling, while preserving the same one-retry/at-most60seconds bound and all invalid/non429 failure behavior. Eleven fake-clock cases,lint and types pass. The initial partial APIResponse fake cast's typecheck failure is retained and corrected with an explicit unknown cast, without runtime changes. Fresh full CI remains required before merge.
