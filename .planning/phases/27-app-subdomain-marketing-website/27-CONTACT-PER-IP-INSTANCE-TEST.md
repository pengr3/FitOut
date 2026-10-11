# Contact per-IP enforcement across instances — isolated HTTP test

Recorded 2026-10-11T06:49:04.075Z. Owner authorized testing and explicitly instructed keeping Contact disabled.

Shared per-IP enforcement passed through HTTP in three independent local Node processes with three distinct Postgres backends. Eight concurrent attempts reserved exactly five slots; the other three received 429. Each process handled at most three race requests, so its local five-attempt cap could not explain the denials. A restarted process was still denied by the stored quota. Missing trusted identity returned 403; a second IP and an expired IP window could reserve slots. No email was sent. All 233 Contact and host-routing tests, TypeScript, and scoped lint passed, with clean test database containment. Both production flags remain false, public Contact returns 503, and the production database has zero quota rows and one previously sent alert with none pending. Test commit: 3aaf4bb4; production source: b61cb4a4. Actual Vercel client-IP handling across deployed instances remains unverified. Counts remain 20/21 phase plans, 144/151 curated plans, 29/35 historical matrix observations, and all seven requirements pending. See 27-CONTACT-PER-IP-INSTANCE-TEST.md.

## What was exercised

The test imports the exact Contact POST handler and uses its real identity selection, process-local limiter, sender limiter, shared reservation and rolling-window logic. Esbuild aliases only the test database adapter, email transport and the existing server-only test stub. Three separate OS processes each own a separate in-memory limiter and a Postgres client limited to one connection. They bind only loopback. All migrations are applied to a unique schema in the dedicated local fitout_test database; the child adapter asserts the _test suffix and requires the isolated schema. No production/Preview database is used for test writes.

Eight distinct synthetic senders share one synthetic trusted IP; X-Forwarded-For and X-Real-IP rotate per request. Each process handles two or three requests, below the local IP cap. Exactly five reservations reach the deliberately disabled transport and return 503; three are 429 with a matching positive Retry-After bounded at 900 seconds. The 503 responses are not delivery successes: transport counters and persisted rows independently prove the five reservations. Global and HMAC IP rows each contain exactly five timestamps; the raw IP is absent from persisted rows.

Stopping one process and starting a new process does not reset the shared cap. The fresh process returns 429 without reaching transport. Missing x-vercel-forwarded-for is 403 even with client-controlled forwarding headers. Another synthetic IP gets its own reservation. Moving only the isolated IP timestamps beyond the 15-minute boundary admits another reservation, leaving one current IP stamp and seven global stamps. A separate production-mode process with the flag false process returns503 before quota or transport, leaving both untouched.

The child environment is whitelisted and receives no provider credentials. Email is replaced at the module boundary with a transport that records calls and returns delivered false. No app source, public bypass endpoint, environment flag, migration, dependency declaration, production traffic assignment or provider job was changed. The generated bundle is test-only and removed from its verified unique temporary directory; all processes and the isolated schema are cleaned up.

## Verification

- New process regression: 2/2. Combined with existing database quota tests: 16/16.
- Final Contact and both host-routing suites: 233/233 across 10 files; no writes escaped per-file isolation.
- TypeScript and lint for all three new test files pass.
- Initial harness run failed 2 cases because Node fetch replaced the custom Host header, causing 403 before quota. Corrected using raw Node HTTP; failures are retained in the execution transcript. No app fix was required.
- Saved local artifacts: contact-instances-test.log, contact-instances-results.json, contact-instances-proof-20261011.json, contact-instances-provider-readback.json, contact-instances-typecheck.log and contact-instances-lint.log under ignored playwright/.cache/phase27-08.
- Tests committed only in the release worktree at 3aaf4bb4c4f86214d4d8811fde5c448145e2c388. Shared dev runtime was not copied over its unrelated dirty changes or divergent migration journal.

## Production readback and remaining gate

At 2026-10-11T06:46:35.733Z, marketing root/contact, customer root and Ops login all returned 200. Public Contact POST returned 503; the unsigned alert receiver returned 401 with no redirect. Both saved production CONTACT_PRODUCTION_ENABLED flags read false. Read-only primary inspection found quota_rows=0, alert_rows=1 and pending_alerts=0. The retained alert is prior synthetic delivery evidence, not an email from this test.

This establishes the shared limiter through real HTTP requests across independent local processes and a real database. The harness supplies a synthetic trusted header under recognized test Preview topology; it does not establish Vercel's actual header normalization or distribution across deployed instances. The contact-trusted-ingress-per-ip live matrix row remains pending. With public Contact disabled, its production handler deliberately returns503 before identity/quota, so this test cannot close that live row. No temporary production enablement or old bounded-window approval was reused. Phase 27/Plan 09 remain incomplete and all existing money/legal HOLDs persist.

## Observed proof

```json
{
  "recordedAt": "2026-10-11T06:49:04.075Z",
  "productionSource": "b61cb4a43c8dd4c10e7444014fb66646aba36ec5",
  "testCommit": "3aaf4bb4c4f86214d4d8811fde5c448145e2c388",
  "testScope": "Loopback Node HTTP processes; real route and quota; real isolated local Postgres; email boundary replaced with disabled transport",
  "processProof": {
    "proof": "isolated-contact-http-instances",
    "processes": 3,
    "distinctDatabaseBackends": 3,
    "processIds": [
      108948,
      130696,
      135660
    ],
    "databaseProcessIds": [
      7397,
      7399,
      7398
    ],
    "restartedProcessId": 136632,
    "concurrentAttempts": 8,
    "admittedReservations": 5,
    "sharedDenials": 3,
    "restartDenied": true,
    "missingTrustedIdentityDenied": true,
    "independentIpAdmitted": true,
    "rollingExpiryAdmitted": true,
    "actualEmailsSent": 0
  },
  "tests": {
    "passed": 233,
    "failed": 0,
    "files": 10,
    "types": "passed",
    "scopedLint": "passed",
    "containment": "clean"
  },
  "providers": {
    "recordedAt": "2026-10-11T06:47:14.307Z",
    "flags": [
      {
        "key": "webContactFlag",
        "name": "CONTACT_PRODUCTION_ENABLED",
        "value": "false",
        "target": [
          "production"
        ]
      },
      {
        "key": "opsContactFlag",
        "name": "CONTACT_PRODUCTION_ENABLED",
        "value": "false",
        "target": [
          "production"
        ]
      }
    ],
    "primary": {
      "quota_rows": "0",
      "alert_rows": "1",
      "pending_alerts": "0"
    },
    "deployment": {
      "key": "webDeployment",
      "id": "dpl_9cVVMaYaB4j9PgK8RGX2R8q1yE68",
      "state": "READY",
      "aliases": [
        "fitout-web-pengr3s-projects.vercel.app",
        "fitout-web-git-codex-phase27-contact-al-ab95b8-pengr3s-projects.vercel.app"
      ]
    }
  },
  "runtime": {
    "observedAt": "2026-10-11T06:46:35.733Z",
    "checks": [
      {
        "url": "https://fitout.live/",
        "status": 200
      },
      {
        "url": "https://fitout.live/contact",
        "status": 200
      },
      {
        "url": "https://app.fitout.live/",
        "status": 200
      },
      {
        "url": "https://ops.fitout.live/login",
        "status": 200
      }
    ],
    "contact": {
      "status": 503,
      "requestId": "sin1::iad1::r5sl4-1791701197142-d8956ed6b67f",
      "body": "{\"ok\":false,\"error\":\"Your message could not be sent. Please try again later.\"}"
    },
    "unsignedScheduler": {
      "status": 401,
      "redirected": false
    }
  },
  "liveVercelIngressAcceptance": "pending",
  "publicContactEnabled": false
}
```
