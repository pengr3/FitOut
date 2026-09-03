---
quick_id: 20260828-allowed-dev-origins
slug: allowed-dev-origins
date: 2026-08-28
status: complete
requirements: []
decisions_cited: []
key-files:
  modified:
    - next.config.ts
    - .env.example
commits:
  - fbed286  # PLAN.md
  - 12ca789  # next.config.ts — allowedDevOrigins from env, dev-gated
  - 9ef5426  # .env.example — NEXT_DEV_ALLOWED_ORIGINS documented
  - 3af197d  # comment-only: placeholder LAN IP
---

# Quick: `allowedDevOrigins` from an env var, so a phone can reach `next dev`

`next.config.ts` now reads `NEXT_DEV_ALLOWED_ORIGINS` (comma-separated, trimmed, empties dropped),
emits `allowedDevOrigins` **only** when the list is non-empty, and **only** when
`NODE_ENV !== "production"`. With the var unset — which is every existing checkout — the resolved
config is `{}`, exactly as before. No tunnel domain and no LAN IP is committed anywhere.

## What changed

**`next.config.ts`** — one derived constant plus a conditional spread:

```ts
const devAllowedOrigins =
  process.env.NODE_ENV !== "production"
    ? (process.env.NEXT_DEV_ALLOWED_ORIGINS ?? "").split(",").map((o) => o.trim()).filter((o) => o.length > 0)
    : [];

const nextConfig: NextConfig = {
  ...(devAllowedOrigins.length > 0 ? { allowedDevOrigins: devAllowedOrigins } : {}),
};
```

The spread (rather than assigning a possibly-empty array) is deliberate: unset leaves the key
**absent**, not present-and-empty. Same effective behaviour, but "nobody configured this" stays
visible to anyone inspecting the config.

**`.env.example`** — a new `# --- Dev-only: reaching next dev from a phone (tunnel or LAN IP) ---`
block at the tail, in the file's established shape (section header -> prose on the failure mode ->
the var, commented out). Placeholders only: `<your-tunnel-subdomain>.ngrok-free.dev,<your-lan-ip>`.

Both comments name the symptom on purpose, because it does not present as a security block: **the
HMR websocket dies, so the page never hydrates while every asset still returns 200** — it paints
perfectly and then ignores every click. That is the searchable string for whoever hits this next.

## The format is `host`, with NO port — measured, and it corrects the brief

The task brief specified `host[:port]`. That is wrong, and wrong in the worst way: a port does not
make the entry stricter, it makes it **unmatchable**, so you would sit there debugging the same dead
socket with the fix apparently applied. Next compares the request's `new URL(origin).hostname` —
which excludes the port — against each configured entry
(`next/dist/server/lib/router-utils/block-cross-site-dev.js` -> `isCsrfOriginAllowed`).

Probed directly against the shipped Next 16.2.7 module rather than read off a doc page:

| Configured entry | Result |
| --- | --- |
| `192.168.1.50:3000` (with port) | **false** |
| `192.168.1.50` (bare host) | **true** |
| `http://192.168.1.50` (with scheme) | **false** |
| exact ngrok host | **true** |
| `*.ngrok-free.dev` (subdomain wildcard) | **true** |
| `*` (top-level wildcard) | **false** — rejected by `matchWildcardDomain` on purpose |
| `""` (empty entry) | **false** — already inert; we filter it regardless |
| `[]` (our default) | **false** — today's behaviour, unchanged |

Two supporting facts also verified in the shipped code, since the design leans on both:
`loadConfig()` calls `loadEnvConfig()` **before** it `import()`s the config file
(`next/dist/server/config.js:1182`), so `.env.local` really is populated when `next.config.ts`
evaluates; and the `next` bin sets `NODE_ENV` per command before that, so the production gate is
decidable at config-evaluation time.

## Acceptance — every row probed, not asserted

Loaded the real `next.config.ts` under six environments and printed the resolved object:

| Environment | Resolved config |
| --- | --- |
| var absent, `NODE_ENV=development` | `{}` |
| var set-but-empty, `NODE_ENV=development` | `{}` |
| `", , ,"` (only separators), `NODE_ENV=development` | `{}` |
| `" foo.ngrok-free.dev , ,192.168.1.50 ,"`, `NODE_ENV=development` | `{"allowedDevOrigins":["foo.ngrok-free.dev","192.168.1.50"]}` |
| same value, **`NODE_ENV=production`** | `{}` |
| single host, `NODE_ENV=test` | `{"allowedDevOrigins":["<host>"]}` |

So: trimming works, empties are dropped, the production gate holds against a set variable, and the
unset default is byte-identical to today. `.env.local` does **not** currently define the key, so the
build below ran through the unset path.

## Gates

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0 — 25 pre-existing `no-unused-vars` warnings in `tests/`, none in touched files |
| `npm run build` | exit 0 |

No dev server started, no e2e run, per the brief.

**One honest note on the build.** The *first* `npm run build` exited **1** — but not on anything in
this change. Its design-suite leg reported `Test Files 60 passed (60) / Tests 1153 passed | 3
skipped`, then four `[vitest-pool]: Failed to start forks worker ... Timeout waiting for worker to
respond` unhandled errors flipped the exit code. That is the vitest worker-pool flake this box is
known for, not a regression: the immediate re-run went green through `next build` with no source
change in between. Recorded rather than smoothed over, because "build was red once" is exactly the
sort of thing a later reader should be able to check rather than re-discover.

## Deviations from plan

**1. [Rule 2 — correctness] The example value in `.env.example` and the illustrative IP in
`next.config.ts` were the operator's real hosts.** The first draft's commented example carried the
actual ngrok domain from the incident and the actual LAN IP `192.168.1.7`. The task's rule is *never
hardcode a personal ngrok domain or LAN IP in the committed file*, and a commented-out line is still
a committed line — it is also the line people copy. Replaced with `<your-tunnel-subdomain>` /
`<your-lan-ip>` placeholders and a plainly-illustrative `192.168.1.50`.
Commits: `9ef5426` (`.env.example`, before it was ever committed) and `3af197d` (`next.config.ts`,
comment-only follow-up).

**2. The brief's stated format was wrong and is corrected in both files.** `host[:port]` -> bare
host, no port. Covered above; called out here so it is not mistaken for drift.

The real ngrok domain **does** appear in this task's `PLAN.md`, quoted from the dev server's own log
as the diagnostic evidence. That is the planning record of a measured incident, matching how prior
quick tasks record real identifiers; it is not a config value and nothing reads it.

## What is NOT done

Nothing was verified on a phone — that needs a dev server and a tunnel, both excluded by the brief.
To use this: put `NEXT_DEV_ALLOWED_ORIGINS=<your host>` in `.env.local` and **restart** `next dev`
(the config is read once at boot).

## Self-Check: PASSED

- `next.config.ts` — FOUND, contains `allowedDevOrigins`
- `.env.example` — FOUND, contains `NEXT_DEV_ALLOWED_ORIGINS`
- `.planning/quick/20260828-allowed-dev-origins/PLAN.md` — FOUND
- Commits `fbed286`, `12ca789`, `9ef5426`, `3af197d` — all FOUND in `git log`
- No committed file contains a real tunnel domain or LAN IP outside `PLAN.md`'s evidence quote
- `.env.local` not staged, not committed, still gitignored (`.gitignore:43`)
