---
quick_id: 20260828-allowed-dev-origins
slug: allowed-dev-origins
date: 2026-08-28
status: planned
requirements: []
decisions_cited: []
---

# Quick: let a phone reach `next dev` over a tunnel or LAN IP, without hardcoding anyone's host

## Objective

`next.config.ts` gains `allowedDevOrigins`, fed from a comma-separated `NEXT_DEV_ALLOWED_ORIGINS`
env var, **absent by default** and **dev-only**. No personal ngrok domain and no LAN IP ever enters
a committed file — machine-specific values live in `.env.local`.

## The failure this closes — already diagnosed, not re-investigated

Testing on a real iPhone 11 / iOS 18.5 through an ngrok tunnel, the login form stopped responding:
submitting fell back to a native GET (`GET /login?email=...&password=...`), i.e. **the page never
hydrated**. The dev server printed the answer itself (`.next-dev.log`):

```
⚠ Blocked cross-origin request to Next.js dev resource /_next/webpack-hmr from
"eloquent-pounce-entangled.ngrok-free.dev".
```

Measured on the wire via ngrok's inspector:

| Observation | Result |
| --- | --- |
| HTTP asset requests through the tunnel | 37× 200, 87× 304, **zero** failures — the bundle arrives intact |
| Safari WebSocket upgrades to `/_next/webpack-hmr` | 27 attempts, **all NO-RESPONSE** |
| Same URL, same tunnel, Node `WebSocket` probe | **101 Switching Protocols** |
| Production build over the same tunnel, same phone | works — the guard is dev-only |

The only material difference between the two handshakes: **Safari sends an `Origin` header; the Node
probe sends none.** `blockCrossSiteDEV` allows a missing origin and blocks an unlisted one.

**This is not a FitOut bug.** It is a Next dev security default behaving correctly on a project that
had never needed a non-localhost dev origin. A LAN IP (`http://192.168.1.7:3000`) is equally
cross-origin and is blocked identically — so the fix must cover tunnels *and* LAN IPs.

## The accepted format — measured against Next 16.2.7's own matcher, not assumed

The brief assumed `host[:port]`. **That is wrong, and a port is a silent failure.** Next compares the
request's `new URL(origin).hostname` — which *excludes* the port — against each configured entry
(`server/lib/router-utils/block-cross-site-dev.js` → `isCsrfOriginAllowed`). Probed directly against
the shipped module:

| Configured value | Origin `http://192.168.1.7:3000` / the ngrok host | Result |
| --- | --- | --- |
| `192.168.1.7:3000` | with port | **false** — never matches |
| `192.168.1.7` | bare host | **true** |
| `http://192.168.1.7` | with scheme | **false** |
| `eloquent-pounce-entangled.ngrok-free.dev` | exact host | **true** |
| `*.ngrok-free.dev` | subdomain wildcard | **true** |
| `*` | top-level wildcard | **false** — deliberately rejected by `matchWildcardDomain` |
| `""` | empty entry | **false** — already inert, we filter it anyway |
| `[]` | our default | **false** — today's behaviour, unchanged |

`localhost` and `*.localhost` are always allowed by Next regardless, which is why nobody has needed
this until now.

Also verified: `loadConfig()` calls `loadEnvConfig()` **before** it `import()`s the config file
(`next/dist/server/config.js:1182`), so `.env.local` really is populated when `next.config.ts`
evaluates. And the `next` bin sets `NODE_ENV` per command before that, so a `NODE_ENV !==
"production"` gate is decidable at config-evaluation time.

## Tasks

### Task 1 — `next.config.ts`: env-fed, dev-gated, absent by default

- Parse `NEXT_DEV_ALLOWED_ORIGINS` — split on `,`, `.trim()` each, drop empties.
- Gate on `process.env.NODE_ENV !== "production"` so a value left in a deployed environment cannot
  influence a production build.
- Spread the key in **only when the list is non-empty**, so with the var unset the config object is
  byte-for-byte the behaviour of today: no `allowedDevOrigins` key at all.
- Comment in the repo's voice: *why* the guard exists (it stops a malicious page from reaching your
  dev server's internals), that widening it is a deliberate local choice, that an empty default is
  the safe default — and name the symptom (**dead HMR websocket → no hydration, while every asset
  still 200s**) so the next person can find this by searching for it.

### Task 2 — `.env.example`: document `NEXT_DEV_ALLOWED_ORIGINS`

House style of the file's tail: a `# --- Section (context) ---` header, prose on the failure mode,
then the var. Must state: what it is for, when it is needed (phone over a tunnel or LAN IP), the
**exact** format (bare host, **no scheme, no port**, `*.sub` wildcards allowed) with the measured
reason a port silently fails, that UNSET is correct for normal localhost work, and that it is
dev-only and never reaches production.

### Task 3 — gates and paperwork

`npx tsc --noEmit`, `npm run lint`, `npm run build`. No dev server, no e2e. Then SUMMARY.md and
STATE.md's Quick Tasks Completed row.

## Acceptance

1. With `NEXT_DEV_ALLOWED_ORIGINS` unset, the resolved config has **no** `allowedDevOrigins` key —
   verified by inspection/probe, not asserted.
2. With it set, the hosts arrive trimmed, empties dropped, in `allowedDevOrigins`.
3. With `NODE_ENV=production`, the key is absent even when the var is set.
4. No ngrok domain and no LAN IP appears in any committed file.
5. `tsc --noEmit`, `npm run lint`, `npm run build` all pass.
6. Both comments name the symptom (dead HMR websocket / no hydration) and argue why an empty default
   stays the default, so the next reader does not "tidy" it into a hardcoded list.
