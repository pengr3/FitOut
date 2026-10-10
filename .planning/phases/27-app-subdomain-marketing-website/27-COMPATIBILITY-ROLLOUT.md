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
