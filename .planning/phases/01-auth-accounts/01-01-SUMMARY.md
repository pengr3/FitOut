---
phase: 01-auth-accounts
plan: 01
subsystem: infra
tags: [nextjs, typescript, drizzle, postgres, postgis, docker, better-auth, tailwind, shadcn, vitest, playwright, scaffold]

# Dependency graph
requires:
  - phase: none (greenfield)
    provides: only CLAUDE.md + .planning/ existed before this plan
provides:
  - Buildable Next.js 16 App Router + TypeScript project (pinned deps)
  - Dockerized PostgreSQL 18 (postgis/postgis:18-3.6) on localhost:5432 with PostGIS + btree_gist available
  - Drizzle ORM db instance over postgres.js + drizzle.config.ts pointing at src/lib/db/schema.ts (placeholder)
  - Tailwind v4 + shadcn/ui (radix base) with base form/dialog/avatar primitives
  - Vitest + Playwright test harness with an isolated-schema real-Postgres integration strategy and shared Resend/Cloudinary/Google mocks
affects: [01-02-better-auth, 01-03-auth-ui, 01-04-profile-capabilities, all-phases-2-8]

# Tech tracking
tech-stack:
  added:
    - next@16.2.7, react/react-dom@19.2.7, typescript@5
    - drizzle-orm@0.45.2, drizzle-kit@0.31.10, postgres@3.4.9
    - better-auth@1.6.14 (installed; configured in Plan 02), resend@6.12.4, cloudinary@2.10.0
    - react-hook-form@7.77.0, zod@4.4.3, @hookform/resolvers@5.4.0
    - tailwindcss@4.3.0, shadcn/ui (radix-ui@1.4.3, lucide-react, cva, clsx, tailwind-merge, tw-animate-css)
    - vitest@4.1.8, @playwright/test@1.60.0, @testing-library/react@16.3.2, @vitejs/plugin-react, jsdom, dotenv
  patterns:
    - "Drizzle over postgres.js: db = drizzle(postgres(DATABASE_URL), { schema })"
    - "Better Auth CLI owns the auth-table shape in schema.ts (placeholder until Plan 02) — do NOT hand-write auth tables"
    - "Integration tests isolate to a dedicated 'test' Postgres schema and run ./drizzle migrations before assertions"
    - "Shared test mocks (Resend captures reset/verify link; Cloudinary returns fake secure_url; Google profile arrives emailVerified:true) live in tests/helpers/mocks.ts"
    - "Secrets in .env.local (gitignored); .env.example committed with empty values"

key-files:
  created:
    - docker-compose.yml
    - drizzle.config.ts
    - src/lib/db/index.ts
    - src/lib/db/schema.ts
    - .env.local (gitignored)
    - .env.example
    - components.json
    - src/lib/utils.ts
    - src/components/ui/{button,input,label,card,form,dialog,dropdown-menu,avatar,textarea}.tsx
    - vitest.config.ts
    - playwright.config.ts
    - tests/setup.ts
    - tests/helpers/db.ts
    - tests/helpers/mocks.ts
    - tests/smoke.test.ts
    - e2e/.gitkeep
  modified:
    - package.json (pinned deps + db:* and test scripts)
    - .gitignore (env handling + keep drizzle migrations tracked)

key-decisions:
  - "Postgres image: postgis/postgis:18-3.6 (the bare :18 tag does not exist on Docker Hub)"
  - "PG18 volume mounted at /var/lib/postgresql (not .../data) per the PG18+ image requirement"
  - "Test DB isolation via a dedicated 'test' schema on the same local Postgres (not a separate database) — single URL, single SET search_path, full isolation from dev's public schema"
  - "Vitest default environment is node (jsdom opt-in per-file via pragma) since environmentMatchGlobs was removed in Vitest 4"
  - "jose NOT installed as a direct dependency (Apple OAuth deferred from Phase 1)"

patterns-established:
  - "Pattern: src/lib/db/{index.ts,schema.ts} as the data-layer entrypoint; schema.ts is Better-Auth-owned"
  - "Pattern: tests/helpers/{db.ts,mocks.ts} as the shared integration fixtures every later auth/profile test imports"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05]

# Metrics
duration: 14min
completed: 2026-06-03
---

# Phase 1 Plan 01: Project Scaffold Summary

**Greenfield scaffold: Next.js 16 App Router + TypeScript, Dockerized Postgres 18 (PostGIS + btree_gist), Drizzle over postgres.js, Tailwind v4 + shadcn/ui, and a Vitest + Playwright harness with an isolated-schema real-Postgres integration strategy.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-06-03T08:36:43Z
- **Completed:** 2026-06-03T08:51:04Z
- **Tasks:** 3 auto tasks complete (Task 4 is a human-verify checkpoint — pending)
- **Files modified:** 41 (across the three task commits)

## Accomplishments
- Scaffolded a buildable Next.js 16 App Router + TypeScript app with the full pinned dependency set, without clobbering the pre-existing CLAUDE.md or .planning/ (scaffolded into a temp dir, copied in selectively).
- Stood up a local PostgreSQL 18 container (`postgis/postgis:18-3.6`) that accepts connections on 5432 and has both `postgis` and `btree_gist` extensions available (the latter is required for the Phase 3 double-booking exclusion constraint).
- Wired Drizzle over postgres.js (`src/lib/db/index.ts`) with `drizzle.config.ts` pointing at a placeholder `schema.ts` that Plan 02's Better Auth CLI will populate.
- Initialized shadcn/ui (radix base) and added the base primitives the auth/profile forms need: button, input, label, card, form, dialog, dropdown-menu, avatar, textarea.
- Configured Vitest + Playwright, established an isolated-schema integration-test strategy that migrates a dedicated `test` schema before assertions, and exported the shared Resend/Cloudinary/Google mocks downstream plans depend on. Smoke test is green.

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js 16 + pinned deps (no clobber)** - `5485d0f` (feat)
2. **Task 2: Dockerized Postgres 18 + Drizzle + env + shadcn/ui** - `f84dd12` (feat)
3. **Task 3: Vitest + Playwright + real-Postgres integration strategy + mocks** - `578d95e` (test)

**Plan metadata:** committed separately (docs: complete plan).

## Files Created/Modified
- `docker-compose.yml` - postgis/postgis:18-3.6 local Postgres (volume at /var/lib/postgresql for PG18)
- `drizzle.config.ts` - drizzle-kit config (schema path + DATABASE_URL)
- `src/lib/db/index.ts` - Drizzle db instance over postgres.js
- `src/lib/db/schema.ts` - placeholder (Better Auth CLI populates this in Plan 02)
- `.env.local` (gitignored) / `.env.example` (committed) - DATABASE_URL, BETTER_AUTH_*, Google/Resend/Cloudinary keys
- `components.json` + `src/lib/utils.ts` + `src/components/ui/*.tsx` - shadcn/ui init + primitives
- `vitest.config.ts` / `playwright.config.ts` - test configs (no watch mode)
- `tests/setup.ts` - loads .env.local, registers mocks, resets between tests
- `tests/helpers/db.ts` - isolated 'test' schema + migrate-before-tests
- `tests/helpers/mocks.ts` - mockResend / mockCloudinary / mockGoogleProvider
- `tests/smoke.test.ts` - green baseline
- `package.json` - pinned deps + db:up/generate/migrate/studio + test/test:e2e scripts
- `.gitignore` - keeps .env.local out, .env.example in, drizzle migrations tracked

## Decisions Made
- **Postgres image tag `18-3.6`** instead of the plan's `18`: a bare `postgis/postgis:18` tag does not exist on Docker Hub; `18-3.6` is the current stable PG18 + PostGIS 3.6 build. The compose file still contains the substring `postgis/postgis:18` so all `contains` checks pass.
- **PG18 volume mount at `/var/lib/postgresql`** (not `/var/lib/postgresql/data`): PG18+ images store data in a major-version subdir for `pg_upgrade --link` compatibility; the old `.../data` mount fails init with an explicit error.
- **Test isolation via a dedicated `test` schema** on the same local Postgres rather than a separate database: a single connection URL plus `SET search_path` gives full isolation from dev's `public` schema with zero extra provisioning. This directly mitigates threat T-01-04 (tests corrupting dev data).
- **Vitest default env = node** with jsdom opt-in per-file: `environmentMatchGlobs` was removed in Vitest 4, so the per-file `// @vitest-environment jsdom` pragma is the supported pattern for the few component tests.
- **`jose` not installed as a direct dependency**: Apple OAuth is deferred from Phase 1 (it appears only transitively, which is fine).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Postgres image tag `postgis/postgis:18` does not exist**
- **Found during:** Task 2 (docker compose up -d db)
- **Issue:** `docker compose up` failed with `docker.io/postgis/postgis:18: not found`. The plan/interfaces pinned a bare `:18` tag that Docker Hub does not publish.
- **Fix:** Queried Docker Hub tags and switched to the stable `postgis/postgis:18-3.6` (PG18 + PostGIS 3.6). Substring `postgis/postgis:18` is preserved so artifact `contains` checks still pass.
- **Files modified:** docker-compose.yml
- **Verification:** Image pulled; container started; `pg_isready` → accepting connections; `postgis` + `btree_gist` confirmed available.
- **Committed in:** f84dd12 (Task 2 commit)

**2. [Rule 3 - Blocking] PG18 image rejects the `/var/lib/postgresql/data` volume mount**
- **Found during:** Task 2 (container exited code 1 on first start)
- **Issue:** PG18+ images require the data volume at `/var/lib/postgresql` (data lands in a major-version subdir); the plan's `.../data` mount caused an init error and the container exited.
- **Fix:** Changed the volume mount to `pgdata:/var/lib/postgresql`; recreated the volume.
- **Files modified:** docker-compose.yml
- **Verification:** Container stays up; `pg_isready` → accepting connections; Postgres 18.4 reported by `SELECT version()`.
- **Committed in:** f84dd12 (Task 2 commit)

**3. [Rule 3 - Blocking] shadcn `form` registry item failed to add via the CLI**
- **Found during:** Task 2 (npx shadcn add form)
- **Issue:** This shadcn CLI version (4.x) silently exited (code 2) after "Checking registry" for the `form` item, leaving `src/components/ui/form.tsx` absent. The plan explicitly requires the `form` primitive (the RHF bridge auth forms use).
- **Fix:** Hand-authored the canonical shadcn `form.tsx` (FormField/FormItem/FormLabel/FormControl/FormDescription/FormMessage + useFormField) adapted to this project's unified `radix-ui` import style (`Slot.Root`). Verified it compiles in the production build and `tsc --noEmit`.
- **Files modified:** src/components/ui/form.tsx
- **Verification:** `npx next build` passes TypeScript; `radix-ui` Slot.Root export confirmed present.
- **Committed in:** f84dd12 (Task 2 commit)

**4. [Rule 3 - Blocking] Vitest 4 removed `environmentMatchGlobs`**
- **Found during:** Task 3 (writing vitest.config.ts)
- **Issue:** The plan suggested `test.environmentMatchGlobs` for jsdom/node selection, but that option was removed in Vitest 4.
- **Fix:** Used `environment: "node"` as the default with the per-file `// @vitest-environment jsdom` pragma for component tests — the supported Vitest 4 pattern.
- **Files modified:** vitest.config.ts
- **Verification:** `npx vitest run` exits 0; smoke test green.
- **Committed in:** 578d95e (Task 3 commit)

---

**Total deviations:** 4 auto-fixed (all Rule 3 - blocking environment/tooling issues)
**Impact on plan:** All four were unavoidable environment/version realities (Docker Hub tags, PG18 image conventions, shadcn CLI behavior, Vitest 4 API). None changed the plan's intent or scope; every artifact and acceptance criterion is satisfied.

## Issues Encountered
- A leftover `nba_dashboard_postgres` container (also bound to 5432, but exited) coexists harmlessly — the FitOut container claimed the port without conflict.
- CRLF normalization warnings on `git add` (Windows). Expected and harmless given `.gitattributes` `* text=auto`.

## User Setup Required
None blocks the scaffold. Free-tier accounts (Google OAuth, Resend, Cloudinary) are created in later plans; their env keys are present-but-empty in `.env.local` / `.env.example`. Docker Desktop must be running for `npm run db:up` and integration tests.

## Next Phase Readiness
- **Ready for Plan 02 (Better Auth):** `schema.ts` placeholder + `drizzle.config.ts` + db instance are in place; Plan 02 runs `npx @better-auth/cli generate` → `drizzle-kit generate` → `drizzle-kit migrate`, and the integration-test helper (`tests/helpers/db.ts`) will automatically apply that migration to the isolated test schema.
- **Shared mocks** for Resend/Cloudinary/Google are exported and ready for the Plan 02/03/04 integration tests.
- **Open follow-up:** Apple OAuth deferred (socialProviders.apple slot to be left commented; jose un-installed). Better Auth `rateLimit` defaults to be confirmed at build time in Plan 02.

## Self-Check: PASSED

All 16 created files verified present on disk; all 3 task commits (`5485d0f`, `f84dd12`, `578d95e`) verified in git log.

---
*Phase: 01-auth-accounts*
*Completed: 2026-06-03*
