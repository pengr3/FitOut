# Phase 23 — Redacted Production Evidence

## Redaction boundary

This ledger records only date/time, environment, host or endpoint class, and
status/disposition. It intentionally excludes DNS values, secret values, tokens,
recipient information, mail headers, message identifiers, bearer URLs,
screenshots, and provider identifiers.

## Production topology and sender checkpoint

| Timestamp (Asia/Manila) | Environment | Host or endpoint class | Status / disposition |
|---|---|---|---|
| 2026-09-13 | Production | Public apex | Assigned, valid, and serving the public application. |
| 2026-09-13 | Production | `www` canonical alias | Redirects to the public apex. |
| 2026-09-13 | Production | Operations host | Assigned, valid, and exposes the staff sign-in boundary. |
| 2026-09-13 | Production | Sender subdomain | Verified by the sending provider. |
| 2026-09-13 | Production | Mail transport configuration | A new send-only, sender-domain-scoped key was stored as a server-only Production secret in both deployed applications. |
| 2026-09-13 | Production | Runtime configuration | Canonical public, operations, sender, and server-only transport values were updated in Production only; both applications were redeployed successfully. |
| 2026-09-13 | Production | Canonical public application | The Phase 23 source revision is deployed and the guarded public Support entry point is visible. |

## Pending proof

| Timestamp (Asia/Manila) | Environment | Host or endpoint class | Status / disposition |
|---|---|---|---|
| 2026-09-13 | Production | External callback providers | Completed: authenticated inventory found no configured production destinations; no mutation or test event was required. |
| 2026-09-14 | Production | Controlled password-reset delivery and reply | Completed: one safe production reset request was accepted and reported delivered; the monitored inbox received one user-controlled reply after the user completed the reset. |
| 2026-09-14 | Production | Controlled staff-invitation CTA | Completed: the owner-authorized invitation was reported delivered, accepted, and consumed; the resulting account was observed as active Operations staff. |
| 2026-09-13 | Production | Host-session isolation | Completed: an authenticated staff session reached the operations console; the public apex rendered as signed out, and its `/ops` path returned the normal public 404. |
| 2026-09-14 | Preview | Generated deployment host | Completed: a branch-scoped Preview deployment received only generated Preview hostnames and no production alias. It rendered successfully using its own schema-only database and Preview-scoped auth configuration; credential-free payment calls fail closed before any external request. Production secrets and production database access were not copied into Preview. |
| 2026-09-13 | Production | Public discovery query | Recovered: the hosted production database was brought forward to the deployed schema; the public browse page now renders the available listing cards. |

## External callback inventory

| Timestamp (Asia/Manila) | Environment | Host or endpoint class | Status / disposition |
|---|---|---|---|
| 2026-09-13 | Production | OAuth browser origin and callback | No production entry is stored. A local-development callback remains; no mutation was made. |
| 2026-09-13 | Production | Payment receiver | Absent; no mutation was made. |
| 2026-09-13 | Production | Identity receiver | Absent; no mutation was made. |
| 2026-09-13 | Production | Background-job receiver / serve origin | Absent; no mutation was made. |

All existing signing, secret, event, retry, and ownership settings were preserved. No provider test was sent because no configured production destination exists.

## Automated validation

| Timestamp (Asia/Manila) | Environment | Host or endpoint class | Status / disposition |
|---|---|---|
| 2026-09-13 | Local validation | Email and secret-config contracts | Passed: the Task 3 focused gate completed successfully (14 tests). |
| 2026-09-13 | Local validation | Public-origin and identity-provider contracts | Passed: focused gate completed successfully. |
| 2026-09-14 | Local validation | Full source suite | Passed: 239 files passed (2 skipped); 2,967 tests passed (5 skipped). The test harness reported two contained audit rows in its dedicated test database's public schema; no development or production data was touched. |

## Future dedicated-inbox replacement procedure

1. Establish and monitor the replacement inbox.
2. Change the single `SUPPORT_EMAIL` declaration to the replacement address and deploy.
3. Repeat the controlled production delivery and reply walk with safe test data.
4. Retire the launch inbox only after a reply reaches the replacement inbox.

This procedure intentionally records no mailbox address, message content, recipient, header, token, or message identifier.
