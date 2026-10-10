# Phase 27 compatibility rollout preparation

The owner requested continued execution while reviewing the existing isolated
Preview. This document prepares the remaining Plan08 compatibility prerequisite.
It records proposed production changes; no production mutation is approved here.

`APP_COMPATIBILITY_ORIGIN` allows exactly one temporary additional app origin.
Outside loopback it requires HTTPS. It participates in the existing exact Host
classification and Better Auth allowed-host/trusted-origin lists. Forwarded Host,
wildcards and suffix matches do not grant access. It does not change cookie Domain
or enable shared cookies: users may need to sign in again on the new host.

| Stage | Primary app and both auth/public app variables | Compatibility app | Marketing origin |
|---|---|---|---|
| A: prove new host while keeping current app links | `https://fitout.live` | `https://app.fitout.live` | `https://marketing-stage.fitout.live` reserved, unattached |
| B: move generated app/auth links | `https://app.fitout.live` | `https://fitout.live` | same reserved origin, unattached |
| C: activate apex marketing | `https://app.fitout.live` | unset | `https://fitout.live` |

At every stage keep `OPS_APP_URL=https://ops.fitout.live` and Contact disabled.
Stage C refuses an apex compatibility setting: overlap fails closed. Old signed
machine receivers stay direct; legacy GET/HEAD browser bridges preserve queries.
No provider credentials, payment actions or real emails are used in local proof.

Each stage requires a fresh deployment of the exact reviewed revision because
`NEXT_PUBLIC_APP_URL` is frozen at build time. Do not merely promote Stage A's
build with Stage B/C runtime variables. Attach the new app domain only after the
Stage A deployment can serve it; prove DNS/TLS/auth/search before progressing.
The reserved marketing hostname is a routing configuration, not an instruction
to attach a public domain or redirect users there.

Before Stage C, record the actual successful Stage A deployment IDs as additional
rollback targets. If the apex must revert to its original pre-phase deployment,
the new app alias can stay on the verified Stage A compatibility deployment while
outstanding new-host links drain. Do not assume the old pre-phase source accepts
new-host auth. Preserve the original customer/ops pins as the ultimate rollback
and restore recorded environment values before rebuilding any replacement.

Current authenticated DNS readback retains apex ALIAS
`5e81041e11df6426.vercel-dns-017.com` and wildcard ALIAS
`cname.vercel-dns-017.com.`, both TTL60; app configuration reports no conflict.
Normal hostname/certificate validation succeeds for all four existing hosts.
Anonymous app HEAD still returns404/DEPLOYMENT_NOT_FOUND, www path/query HEAD404
without Location, apex200 and ops root404. Proof is
`playwright/.cache/phase27-08/current-host-readback-20261010.json`.
This proposes project attachment and an exact www redirect, with no DNS writes:
`www.fitout.live` redirect=`fitout.live`, redirectStatusCode=307. Recheck GET/HEAD
with full repeated query/path after approval; the current HEAD result is not
proof of a functioning redirect.

Production quota preparation: explicit read-only query on project
`misty-bar-13534461`, primary branch `br-divine-lake-b3in9zag`, database `neondb`
finds no public.contact_quota table. The existing migration ledger has37 entries,
latest timestamp1791388800000. Proposed0034 is timestamp1791565875571 and its
SQL digest is99516450850c7ea1f400aff1197145d79179ea58e742b3c5ca1a9fc5bc93f4d6.
Confirm the deployment's private database binding to this exact branch before
any approved production write. Apply only this reviewed additive table/index and
normal migration bookkeeping; do not schema-push or replay manual history.
Re-prove distributed admission limits and alert/disable behavior on production
before any Contact enablement or inquiry. Keep the table on rollback; no DROP.

Google client callbacks already include apex and app, with the app JavaScript
origin. Optional publishing preparation would use home `https://fitout.live`,
privacy `https://app.fitout.live/privacy` and terms `https://app.fitout.live/terms`,
retaining the existing FitOut name/authorized domain/support contacts. These URL
fields are currently blank; no branding/publishing edit is approved here. Basic
identity sign-in's documented Testing exception is described in the inventory;
fresh app-host sign-in must still pass after Stage B. No new legal text is added.

Before external changes, refresh project/env/domain/provider inventory, preserve
the currently pinned production deployments, and resolve the original08 exact
packet checkpoint. All stages require both-project scope/readback. Any host or
session isolation failure stops progression and invokes the recorded rollback.
Contact production migration, enablement and inbox roundtrip remain separate
prerequisites. Checkout, payout and legal release remain HOLD.

Evidence status: compatibility-focused proxy/origin tests pass (136 total across
four auth suites, including 13 new staging cases). Full exact-revision gates and
built-server staging proof are pending; this focused result is not deployment
or production verification. Existing b835 isolated Preview remains the owner's
stable review link until a replacement is explicitly prepared.
