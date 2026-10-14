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
