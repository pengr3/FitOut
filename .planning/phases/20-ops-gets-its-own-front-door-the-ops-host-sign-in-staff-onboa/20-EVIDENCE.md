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
