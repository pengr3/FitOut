# Phase 20 Ops Host Evidence

## Partition reading

- Commit: `3018021`
- Date: `2026-09-07`
- Next.js: `16.2.7`
- Runtime: `next start`
- Public host: `localhost:3100`
- Ops host: `ops.localhost:3100`

```json
{
  "stage": "partition",
  "rows": [
    {
      "id": "marketplace-login",
      "host": "localhost:3100",
      "path": "/login",
      "actor": "signed-out",
      "status": 200,
      "headers": {
        "cache-control": "s-maxage=31536000",
        "content-type": "text/html; charset=utf-8",
        "vary": "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Accept-Encoding",
        "x-nextjs-cache": "HIT"
      },
      "bytes": 36482,
      "sha256": "6d6ec488f719ad4673640129476c4cf74d446d8cf022c92a94e91773e70ee800"
    },
    {
      "id": "marketplace-ops",
      "host": "localhost:3100",
      "path": "/ops",
      "actor": "signed-out",
      "status": 404,
      "headers": {
        "cache-control": "private, no-store",
        "content-type": "text/html; charset=utf-8",
        "vary": "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch"
      },
      "bytes": 308,
      "sha256": "0710ff5f877d3ed512b393f7f9f4da7b131310249e68a391d224c77210f2915b"
    },
    {
      "id": "ops-auth-api",
      "host": "ops.localhost:3100",
      "path": "/api/auth/get-session",
      "actor": "signed-out",
      "status": 200,
      "headers": {
        "content-type": "application/json",
        "vary": "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch"
      },
      "bytes": 4,
      "sha256": "74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b"
    },
    {
      "id": "ops-login",
      "host": "ops.localhost:3100",
      "path": "/login",
      "actor": "signed-out",
      "status": 404,
      "headers": {
        "cache-control": "private, no-cache, no-store, max-age=0, must-revalidate",
        "content-type": "text/html; charset=utf-8",
        "vary": "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Accept-Encoding",
        "x-nextjs-cache": "HIT"
      },
      "bytes": 29644,
      "sha256": "34c55bd004530495a273bed92a236ec3e24aa920e7cf60773bbaa11ba4276226"
    },
    {
      "id": "ops-nonstaff",
      "host": "ops.localhost:3100",
      "path": "/ops",
      "actor": "nonstaff",
      "status": 404,
      "headers": {
        "cache-control": "private, no-store",
        "content-type": "text/html; charset=utf-8",
        "vary": "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch"
      },
      "bytes": 308,
      "sha256": "0710ff5f877d3ed512b393f7f9f4da7b131310249e68a391d224c77210f2915b"
    },
    {
      "id": "ops-signed-out",
      "host": "ops.localhost:3100",
      "path": "/ops",
      "actor": "signed-out",
      "status": 404,
      "headers": {
        "cache-control": "private, no-store",
        "content-type": "text/html; charset=utf-8",
        "vary": "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch"
      },
      "bytes": 308,
      "sha256": "0710ff5f877d3ed512b393f7f9f4da7b131310249e68a391d224c77210f2915b"
    },
    {
      "id": "ops-staff",
      "host": "ops.localhost:3100",
      "path": "/ops",
      "actor": "staff",
      "status": 200,
      "headers": {
        "cache-control": "private, no-cache, no-store, max-age=0, must-revalidate",
        "content-type": "text/html; charset=utf-8",
        "vary": "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Accept-Encoding"
      },
      "bytes": 38487,
      "sha256": "d07bf67afcf8e083d76aba535ae99ebb80681cecf8b6563364ebee2b5a142168"
    },
    {
      "id": "ops-missing",
      "host": "ops.localhost:3100",
      "path": "/ops/definitely-missing",
      "actor": "signed-out",
      "status": 404,
      "headers": {
        "cache-control": "private, no-store",
        "content-type": "text/html; charset=utf-8",
        "vary": "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch"
      },
      "bytes": 308,
      "sha256": "0710ff5f877d3ed512b393f7f9f4da7b131310249e68a391d224c77210f2915b"
    }
  ]
}
```

## Stored-state separation

- Date: `2026-09-08`
- Environment: local PostgreSQL only; no nonlocal write was attempted.
- Producer: the focused browser scenario passed `1/1` before the read-only verifier ran.
- Ordered result: replacement invitation created -> setup accepted -> replacement `/ops` returned `200` -> legacy staff grant revoked -> separated state asserted.

Before the producer:

```json
{
  "staffCount": 2,
  "capabilityBearingStaffCount": 1,
  "legacyHost": {
    "id": "AcW4AhUfkMexEvvEUa8KjsngD7ubMoZy",
    "isStaff": true,
    "canHost": true,
    "canBook": true
  }
}
```

After the producer and the independent read-only check:

```json
{
  "staffCount": 3,
  "capabilityBearingStaffCount": 0,
  "replacementStaffId": "5465e7fb-c189-4217-83c3-dbf18061ad35",
  "legacyHost": {
    "id": "AcW4AhUfkMexEvvEUa8KjsngD7ubMoZy",
    "isStaff": false,
    "canHost": true,
    "canBook": true
  },
  "validation": {
    "ok": true,
    "errors": []
  }
}
```

Only counts, booleans, and stable ids are retained here. The verifier has no write path.

## Final cloak reading

- Commit: `48292b2`
- Date: `2026-09-08`
- Next.js: `16.2.7`
- Runtime: `next start`
- Public host: `localhost:3100`
- Ops host: `ops.localhost:3100`

```json
{
  "stage": "final",
  "rows": [
    {
      "id": "marketplace-ops-auth-forgot-password",
      "host": "localhost:3100",
      "path": "/_ops-auth/forgot-password",
      "actor": "signed-out",
      "status": 404,
      "headers": {
        "cache-control": "private, no-store",
        "content-type": "text/html; charset=utf-8",
        "vary": "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch"
      },
      "bytes": 308,
      "sha256": "0710ff5f877d3ed512b393f7f9f4da7b131310249e68a391d224c77210f2915b"
    },
    {
      "id": "marketplace-ops-auth-invite",
      "host": "localhost:3100",
      "path": "/_ops-auth/invite/00000000000000000000",
      "actor": "signed-out",
      "status": 404,
      "headers": {
        "cache-control": "private, no-store",
        "content-type": "text/html; charset=utf-8",
        "vary": "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch"
      },
      "bytes": 308,
      "sha256": "0710ff5f877d3ed512b393f7f9f4da7b131310249e68a391d224c77210f2915b"
    },
    {
      "id": "marketplace-ops-auth-login",
      "host": "localhost:3100",
      "path": "/_ops-auth/login",
      "actor": "signed-out",
      "status": 404,
      "headers": {
        "cache-control": "private, no-store",
        "content-type": "text/html; charset=utf-8",
        "vary": "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch"
      },
      "bytes": 308,
      "sha256": "0710ff5f877d3ed512b393f7f9f4da7b131310249e68a391d224c77210f2915b"
    },
    {
      "id": "marketplace-ops-auth-reset-password",
      "host": "localhost:3100",
      "path": "/_ops-auth/reset-password",
      "actor": "signed-out",
      "status": 404,
      "headers": {
        "cache-control": "private, no-store",
        "content-type": "text/html; charset=utf-8",
        "vary": "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch"
      },
      "bytes": 308,
      "sha256": "0710ff5f877d3ed512b393f7f9f4da7b131310249e68a391d224c77210f2915b"
    },
    {
      "id": "marketplace-auth-session",
      "host": "localhost:3100",
      "path": "/api/auth/get-session",
      "actor": "signed-out",
      "status": 200,
      "headers": {
        "content-type": "application/json",
        "vary": "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch"
      },
      "bytes": 4,
      "sha256": "74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b"
    },
    {
      "id": "marketplace-login",
      "host": "localhost:3100",
      "path": "/login",
      "actor": "signed-out",
      "status": 200,
      "headers": {
        "cache-control": "s-maxage=31536000",
        "content-type": "text/html; charset=utf-8",
        "vary": "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Accept-Encoding",
        "x-nextjs-cache": "HIT"
      },
      "bytes": 38115,
      "sha256": "ad916833a6132dd0b0450625025209d891c94150596bc925c7cc232b8db06971"
    },
    {
      "id": "marketplace-ops",
      "host": "localhost:3100",
      "path": "/ops",
      "actor": "signed-out",
      "status": 404,
      "headers": {
        "cache-control": "private, no-store",
        "content-type": "text/html; charset=utf-8",
        "vary": "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch"
      },
      "bytes": 308,
      "sha256": "0710ff5f877d3ed512b393f7f9f4da7b131310249e68a391d224c77210f2915b"
    },
    {
      "id": "ops-direct-auth-forgot-password",
      "host": "ops.localhost:3100",
      "path": "/_ops-auth/forgot-password",
      "actor": "signed-out",
      "status": 404,
      "headers": {
        "cache-control": "private, no-store",
        "content-type": "text/html; charset=utf-8",
        "vary": "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch"
      },
      "bytes": 308,
      "sha256": "0710ff5f877d3ed512b393f7f9f4da7b131310249e68a391d224c77210f2915b"
    },
    {
      "id": "ops-direct-auth-invite",
      "host": "ops.localhost:3100",
      "path": "/_ops-auth/invite/00000000000000000000",
      "actor": "signed-out",
      "status": 404,
      "headers": {
        "cache-control": "private, no-store",
        "content-type": "text/html; charset=utf-8",
        "vary": "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch"
      },
      "bytes": 308,
      "sha256": "0710ff5f877d3ed512b393f7f9f4da7b131310249e68a391d224c77210f2915b"
    },
    {
      "id": "ops-direct-auth-login",
      "host": "ops.localhost:3100",
      "path": "/_ops-auth/login",
      "actor": "signed-out",
      "status": 404,
      "headers": {
        "cache-control": "private, no-store",
        "content-type": "text/html; charset=utf-8",
        "vary": "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch"
      },
      "bytes": 308,
      "sha256": "0710ff5f877d3ed512b393f7f9f4da7b131310249e68a391d224c77210f2915b"
    },
    {
      "id": "ops-direct-auth-reset-password",
      "host": "ops.localhost:3100",
      "path": "/_ops-auth/reset-password",
      "actor": "signed-out",
      "status": 404,
      "headers": {
        "cache-control": "private, no-store",
        "content-type": "text/html; charset=utf-8",
        "vary": "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch"
      },
      "bytes": 308,
      "sha256": "0710ff5f877d3ed512b393f7f9f4da7b131310249e68a391d224c77210f2915b"
    },
    {
      "id": "ops-auth-session",
      "host": "ops.localhost:3100",
      "path": "/api/auth/get-session",
      "actor": "signed-out",
      "status": 200,
      "headers": {
        "content-type": "application/json",
        "vary": "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch"
      },
      "bytes": 4,
      "sha256": "74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b"
    },
    {
      "id": "ops-forgot-password",
      "host": "ops.localhost:3100",
      "path": "/forgot-password",
      "actor": "signed-out",
      "status": 200,
      "headers": {
        "cache-control": "s-maxage=31536000",
        "content-type": "text/html; charset=utf-8",
        "vary": "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Accept-Encoding",
        "x-nextjs-cache": "HIT"
      },
      "bytes": 31344,
      "sha256": "e15a48a4c64e4a84283b042b424c169f80e390927b9307a210483c5047ddb563"
    },
    {
      "id": "ops-invite",
      "host": "ops.localhost:3100",
      "path": "/invite/00000000000000000000",
      "actor": "signed-out",
      "status": 200,
      "headers": {
        "cache-control": "private, no-cache, no-store, max-age=0, must-revalidate",
        "content-type": "text/html; charset=utf-8",
        "vary": "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Accept-Encoding"
      },
      "bytes": 36456,
      "sha256": "1f85d7d95bcbd0d6b08417a81f9b30944ad9f440f02b857bf6ff7474d9160933"
    },
    {
      "id": "ops-login",
      "host": "ops.localhost:3100",
      "path": "/login",
      "actor": "signed-out",
      "status": 200,
      "headers": {
        "cache-control": "s-maxage=31536000",
        "content-type": "text/html; charset=utf-8",
        "vary": "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Accept-Encoding",
        "x-nextjs-cache": "HIT"
      },
      "bytes": 32646,
      "sha256": "9e9b38fcf253f9e3c3c99e08e6dd00add2dd43be8f97ebb2289b81e319e27dba"
    },
    {
      "id": "ops-nonstaff",
      "host": "ops.localhost:3100",
      "path": "/ops",
      "actor": "nonstaff",
      "status": 404,
      "headers": {
        "cache-control": "private, no-store",
        "content-type": "text/html; charset=utf-8",
        "vary": "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch"
      },
      "bytes": 308,
      "sha256": "0710ff5f877d3ed512b393f7f9f4da7b131310249e68a391d224c77210f2915b"
    },
    {
      "id": "ops-signed-out",
      "host": "ops.localhost:3100",
      "path": "/ops",
      "actor": "signed-out",
      "status": 404,
      "headers": {
        "cache-control": "private, no-store",
        "content-type": "text/html; charset=utf-8",
        "vary": "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch"
      },
      "bytes": 308,
      "sha256": "0710ff5f877d3ed512b393f7f9f4da7b131310249e68a391d224c77210f2915b"
    },
    {
      "id": "ops-staff",
      "host": "ops.localhost:3100",
      "path": "/ops",
      "actor": "staff",
      "status": 200,
      "headers": {
        "cache-control": "private, no-cache, no-store, max-age=0, must-revalidate",
        "content-type": "text/html; charset=utf-8",
        "vary": "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Accept-Encoding"
      },
      "bytes": 61795,
      "sha256": "e8f7f459f624e00048fd5c0c40b904b791464fb0c67c2798cd5524730a9182f7"
    },
    {
      "id": "ops-missing",
      "host": "ops.localhost:3100",
      "path": "/ops/definitely-missing",
      "actor": "signed-out",
      "status": 404,
      "headers": {
        "cache-control": "private, no-store",
        "content-type": "text/html; charset=utf-8",
        "vary": "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch"
      },
      "bytes": 308,
      "sha256": "0710ff5f877d3ed512b393f7f9f4da7b131310249e68a391d224c77210f2915b"
    },
    {
      "id": "ops-reset-password",
      "host": "ops.localhost:3100",
      "path": "/reset-password",
      "actor": "signed-out",
      "status": 200,
      "headers": {
        "cache-control": "s-maxage=31536000",
        "content-type": "text/html; charset=utf-8",
        "vary": "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Accept-Encoding",
        "x-nextjs-cache": "HIT"
      },
      "bytes": 29323,
      "sha256": "50c26528f5d6717e2d375e47cffc5f66e5e8a9362569870da72d581feab8950c"
    }
  ]
}
```

## Host/session round trips

- Date: `2026-09-08`
- Runtime: local Next.js development server with system Chrome; outbound mail transport disabled.
- Browser producer: `5/5` scenarios passed after the final route set was present.
- Invitation order: replacement issued, acceptance page opened, replacement reached `/ops` with `200`, then the legacy staff grant was revoked while host capability remained enabled.
- Sign-out: the ops session was destroyed, the browser reached the bounded signed-out notice on the ops origin, and replaying the prior session material received the canonical `404` denial.
- Cross-host isolation: both public-to-ops and ops-to-public checks observed an anonymous destination session, with each exit landing on the configured destination origin.
- Recovery/origin authority: `22/22` focused exact-host auth checks passed, including public and ops reset URL generation and two-direction host-only session behavior.
- Forged action dispatch: replay on the marketplace origin returned the neutral Server Function envelope while target state and audit count stayed byte-for-byte unchanged; replaying the same captured action on the exact ops origin changed the target once and added one audit event.
- Local database containment: both focused Vitest runs ended with the repository's clean per-file schema-isolation report. The older contained public-schema leak finding remains historical and was neither reproduced nor broadened by this plan.
