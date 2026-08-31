---
quick_id: 260901-0zf
slug: wire-repo-for-vercel-neon-deployment
date: 2026-09-01
status: complete
type: execute
requirements: ["NEON-MIGRATE", "VERCEL-BUILD", "NEON-DOCS"]  # LOCAL scope labels, not roadmap IDs
threats_addressed: ["T-0zf-01", "T-0zf-02", "T-0zf-03"]      # T-0zf-04 and T-0zf-SC were dispositioned `accept`
decisions_cited: []                                          # none exist for this work; none invented
commits:
  - ba5ba05  # feat: drizzle-kit prefers DIRECT_DATABASE_URL, with the why in the header
  - c6e43b0  # chore: pin the Vercel build to `next build`
  - 7bf78c0  # docs: document DIRECT_DATABASE_URL and, plainly, its limits
key-files:
  created:
    - vercel.json
  modified:
    - drizzle.config.ts    # +32 / -1
    - .env.example         # +33 / -0
  unchanged-by-design:
    - src/lib/db/index.ts        # still drizzle(postgres(DATABASE_URL)) with NO options
    - src/lib/db/schema.ts       # ~836 reasons from postgres.js's default max:10
    - src/lib/payments/checkout-lease.ts  # ~30 reasons from the same default
    - scripts/seed.ts            # reads DATABASE_URL itself; documented, not papered over
    - scripts/db-test-setup.ts   # same
    - scripts/ops-alerts.ts
    - package.json               # `build` byte-unchanged; four CI jobs depend on it
    - .github/workflows/ci.yml
    - src/**                     # nothing under src/ touched
metrics:
  files_changed: 3
  commits: 3
  insertions: 69
  deletions: 1
  secrets_added: 0
  lint_errors: 0
  lint_warnings: 25             # all pre-existing, all in tests/, none in a touched file
  tsc_exit: 0
  duration: ~20m
---

# Quick 260901-0zf: wire the repo for a Vercel + Neon deploy

**Three edits, three commits, zero runtime code touched: drizzle-kit now reaches Neon's DIRECT endpoint,
a committed `vercel.json` stops every deploy re-running gates CI already owns, and `.env.example` states
the new variable's limits instead of implying blanket coverage.**

The measured deploy failure (`BETTER_AUTH_SECRET is not set. Refusing to boot in production` ->
`Failed to collect page data for /api/cloudinary/sign`) is a **dashboard** problem and was deliberately
NOT addressed here. What this task did is the repo-side wiring that has to exist before a Neon-backed
deploy can work at all.

## Performance

- **Duration:** ~20 min
- **Tasks:** 3/3
- **Files modified:** 3 (`git diff HEAD~3 --name-only` lists exactly these and nothing else)

## The probe, before and after — the one measurement the whole of Task 1 rests on

The claim is that a developer with only `DATABASE_URL` set sees **no** behavioural change. That is
proved by string equality, not by reading the diff. `grep -c DIRECT_DATABASE_URL .env.local` printed
`0` first, so the probe was meaningful.

| | Command | Observed output |
|---|---|---|
| **(a) BEFORE the edit** | `DATABASE_URL='postgresql://probe:probe@example.invalid:5432/probe' npx tsx -e "import c from './drizzle.config.ts'; console.log('RESOLVED:', c.dbCredentials.url)"` | `RESOLVED: postgresql://probe:probe@example.invalid:5432/probe` |
| **(b) AFTER the edit** | *(identical command)* | `RESOLVED: postgresql://probe:probe@example.invalid:5432/probe` |

`diff` of the two captured lines: **no output, `IDENTICAL`**. Byte-for-byte the same string.

| | Command | Observed output |
|---|---|---|
| **(c) AFTER, both set** | *(same, plus `DIRECT_DATABASE_URL='postgresql://direct:direct@example.invalid:5432/direct'`)* | `RESOLVED: postgresql://direct:direct@example.invalid:5432/direct` — grep exit `0` |

Structural guards (d):

- `git diff -U0 -- drizzle.config.ts \| grep -E '^[-+].*loadEnv' \| wc -l` -> **`0`**. Both `loadEnv`
  calls survive, in order, unedited — so the eleven lines of header prose explaining why they exist
  (drizzle-kit runs outside Next, so `.env.local` is not loaded for it) still describe the code below it.
- `grep -v '^\s*//' drizzle.config.ts \| grep -c '"postgresql://fitout:fitout@localhost:5432/fitout"'`
  -> **`1`**. The local-Docker fallback is byte-identical and appears exactly once, so the cross-file
  correspondence `drizzle.config.ts` asserts with `tests/setup.ts:20-22` and `scripts/seed.ts:16-18`
  still holds. (The fallback literal was deliberately kept out of the new prose, which would have
  defeated this gate.)

## What changed

### 1. `drizzle.config.ts` (ba5ba05) — precedence, plus the WHY at the density of its neighbours

```
const DATABASE_URL =
  process.env.DIRECT_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://fitout:fitout@localhost:5432/fitout";
```

The header comment gained a section covering all six required points: Neon's two endpoints differing by
one hostname segment (`-pooler`); why the pooled, transaction-mode PgBouncer endpoint is wrong for
schema migrations; that the app runtime keeps `DATABASE_URL` and wants the POOLED host, so the two
variables are **not** a fallback pair for one value; that locally nothing moves; that the
shell-beats-dotenv ordering still makes a one-off `DIRECT_DATABASE_URL=… npm run db:migrate` work; and
the coverage limit. **No decision ID was invented** — no `D-NN` record exists for this work, and citing
a fabricated one would corrupt a load-bearing convention.

### 2. `vercel.json` (c6e43b0) — new file, exactly two keys

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "next build"
}
```

`$schema` matches the house convention set by `components.json`. `package.json`'s `build` is
`npm run lint && npm run test:design && next build` — a composition that exists to serve CI, and CI
already runs both halves (`.github/workflows/ci.yml:356-359`, `on: push: [dev, main]` + `pull_request:`,
`gate-db-free` = lint + design gate + build). Re-running them inside every Vercel deploy buys nothing,
costs ~90s per deploy, and adds a large extra failure surface to every preview.

**Why the file carries no comment key, and why that is deliberate rather than careless.** This is the
one place in this repo where the WHY cannot live beside the code. JSON has no comments, and Vercel's
config schema **rejects unknown properties** — a `_comment` or `//` pseudo-key would fail config
validation at deploy time, which is precisely the failure class this task exists to remove. The
rationale therefore lives in c6e43b0's commit body and in this section. A later reader finding a bare
two-key file should read it as a constraint, not as an omission.

**Why there is no `regions` key.** A single-region pin risks an unsupported-config build failure
depending on plan tier. The region is being set through the Vercel dashboard instead. Adding it here
would reintroduce the exact class of failure this work removes.

No `env`, `build.env`, `builds` or `secrets` key either — secrets belong in the dashboard, never in a
committed file. `package.json` was not touched at all.

### 3. `.env.example` (7bf78c0) — the operator-facing contract, including what it does NOT cover

A 33-line block placed between the commented `TEST_DATABASE_URL=` example and the
`# --- Better Auth core ---` header, shaped like the `TEST_DATABASE_URL` block above it (UNSET is the
normal path -> mechanism -> exact commands affected -> what is NOT affected -> commented-out example).
It states: UNSET IS CORRECT for local Docker; the one-segment `-pooler` difference; `DATABASE_URL` ->
pooled (app runtime, because serverless instances multiply under load); `DIRECT_DATABASE_URL` -> direct
(`db:migrate`, `db:generate`, `db:studio`, automatically, via `drizzle.config.ts`); that `db:seed` and
`db:test:setup` read `DATABASE_URL` themselves and are **NOT** covered; that migrations never run
themselves, so a fresh Neon database is EMPTY until an operator runs one by hand, and that wiring
`db:migrate` into the Vercel build would re-run migrations against one shared database on every
preview; and that `prepare: false` is deliberately absent.

The example line is `postgresql://USER:PASSWORD@db-direct-host.example.invalid:5432/fitout?sslmode=require`
— an `.invalid` placeholder with no real host and no credential.

## `src/lib/db/index.ts` was deliberately left alone

It is `drizzle(postgres(DATABASE_URL))` with **no options**, and that is load-bearing for two other
records in the tree:

- `src/lib/db/schema.ts` (~line 836) and `src/lib/payments/checkout-lease.ts` (~line 30) both assert
  the optionless client as fact and reason from **postgres.js's default `max: 10` pool** to the
  conclusion that the checkout lease is a CAS column rather than an advisory lock. Adding client
  options would falsify both arguments while leaving both comments in place, which is worse than the
  original problem.
- `prepare: false` — the reflexive Supabase/PgBouncer fix — **does not apply to Neon**. Neon's pooler
  runs PgBouncer 1.22+, which supports protocol-level prepared statements; the familiar advice is about
  an older transaction-pooler limitation. Setting it would be a fix for a non-problem. This is now
  written down in `.env.example` precisely so a future reader does not "discover" it and reach for it.

So the correct action on that file was none, and none was taken. `DIRECT_DATABASE_URL` is read by
drizzle-kit — an operator-invoked tool — and by nothing at runtime; no new runtime path exists (T-0zf-04,
dispositioned `accept`).

## Verification — actual exit statuses

| Check | Result |
|---|---|
| Probe (b) vs (a) | **IDENTICAL** (diff produced no output) |
| Probe (c), DIRECT wins | grep matched, exit **0** |
| Guard (d1), `loadEnv` diff lines | **0** |
| Guard (d2), fallback literal in non-comment lines | **1** |
| `node` key check on `vercel.json` | `OK $schema,buildCommand`, exit **0** |
| `git diff --quiet -- package.json` | `package.json UNCHANGED` |
| secret-shaped grep on `vercel.json` | `NO SECRETS` |
| `.env.example` placement / unset / 6 topics / leak | `PLACEMENT OK`, `UNSET OK`, six `TOPIC OK`, `NO LEAK` |
| `npx tsc --noEmit -p tsconfig.json` | exit **0** |
| `npm run lint` | exit **0** — `25 problems (0 errors, 25 warnings)`, all pre-existing `no-unused-vars` warnings in `tests/`, none in a file this task touched (`npx eslint drizzle.config.ts` alone: exit 0, no output) |
| `git status --porcelain` | only the untracked planning dir for this task; no stray artifacts |
| `git diff HEAD~3 --name-only` | `.env.example`, `drizzle.config.ts`, `vercel.json` — exactly three |
| Post-commit deletion check on all three commits | no deletions |

Probe (c) and the `vercel.json` node check were **re-run after all three tasks** to confirm nothing later
in the plan regressed them: both still pass.

`npm run build` was not run. It composes lint + the full design suite + `next build` and takes several
minutes; `tsc` and `lint` cover what these three files can break, and `next build` reads neither
`drizzle.config.ts` nor `.env.example`.

## Deviations from plan

**None.** The three tasks executed as written. Nothing in the out-of-scope list was touched: no file
under `src/`, no script, no `package.json`, no `ci.yml`, no Vercel env var set, no fourth task, and no
secret value added anywhere in the repo.

## Known stubs

None. No placeholder or empty-value code path was introduced — the three artifacts are a config
expression, a two-key JSON file, and documentation.

## What the operator still has to do — this plan does NOT do any of it

1. **Provision the Neon database** (Postgres 18, PostGIS, Singapore). Nothing exists yet.
2. **Set the Vercel env vars in the dashboard**, including `BETTER_AUTH_SECRET` — this is the actual
   measured build failure and it is a dashboard action, not a repo one. `BETTER_AUTH_URL` and
   `NEXT_PUBLIC_*` matter at BUILD time, so set them before triggering the build.
3. **Point `DATABASE_URL` at Neon's POOLED host** (the one containing `-pooler`) and
   **`DIRECT_DATABASE_URL` at the DIRECT host** (the one without it). Check the hostname segment before
   pasting; the two strings differ by nothing else.
4. **Set the region in the Vercel dashboard** — deliberately not pinned in `vercel.json`.
5. **Run `npm run db:migrate` ONCE, by hand, against the fresh Neon database.** No build step does this.
   A fresh Neon database stays EMPTY until someone runs it. Do not add it to the Vercel build.
6. For seeding against Neon, pass the direct URL explicitly:
   `DATABASE_URL="$DIRECT_DATABASE_URL" npm run db:seed` — `scripts/seed.ts` reads `DATABASE_URL` itself
   and is not covered by the `drizzle.config.ts` change.

## Self-Check: PASSED

- `drizzle.config.ts` exists, contains `DIRECT_DATABASE_URL` ahead of `DATABASE_URL` — FOUND
- `vercel.json` exists, parses, `buildCommand` = `next build` — FOUND
- `.env.example` contains the `DIRECT_DATABASE_URL` block above the Better Auth header — FOUND
- Commits `ba5ba05`, `c6e43b0`, `7bf78c0` present in `git log`, one file each — FOUND
</content>
</invoke>
