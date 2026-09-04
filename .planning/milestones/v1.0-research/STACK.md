# Stack Research

**Domain:** Two-sided booking marketplace (fitness/recreational spaces) with real-time availability, slot booking, and marketplace payments + host payouts
**Researched:** 2026-06-03
**Confidence:** HIGH (core stack), MEDIUM (auth choice, hosting), HIGH (payments & double-booking strategy)

## TL;DR — The Prescriptive Stack

Build a **single TypeScript codebase** on **Next.js 16 (App Router)** with **server-side data access**, backed by **PostgreSQL 18** accessed via **Drizzle ORM**. Use **Stripe Connect (Express accounts) with separate charges and transfers** for marketplace payments so funds can be held until the session is delivered. Prevent double-booking with a **Postgres GiST exclusion constraint** (database-enforced, not application-enforced). Use **Better Auth** for authentication, **UploadThing or Cloudinary** for listing photos, **PostGIS** for "spaces near me" search, and deploy on **Railway or Render** (container-based — not Vercel-only) so background jobs and Stripe webhook processing run reliably.

The single most important architectural decision in this domain is **where booking correctness lives**: it must live in the **database** (exclusion constraint + transaction), never in application code. Everything else is conventional.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Next.js (App Router)** | 16.2.x | Full-stack web framework (frontend + API/server actions) | One codebase for responsive web app + API. Server Components keep availability/pricing logic server-side (correctness + no client trust). Mature, hireable, huge ecosystem. v16 is current stable (16.2 released Mar 2026). |
| **React** | 19.x | UI library (bundled with Next 16) | Industry default; ships with Next 16. |
| **TypeScript** | 5.7+ | Language | Type safety end-to-end (DB → API → UI) is decisive for a money-handling marketplace where shape mismatches cause real financial bugs. |
| **PostgreSQL** | 18 | Primary database | The correct-by-construction choice for this domain. Native **exclusion constraints** (GiST) prevent double-booking at the DB level — no other mainstream DB does this as cleanly. Transactional, relational data (users, listings, bookings, payments) fits a marketplace exactly. PostGIS adds geo search on the same DB. |
| **Drizzle ORM** | 0.44+ / drizzle-kit 0.31+ | Type-safe DB access + migrations | SQL-first ORM. Critical here: booking correctness needs **raw Postgres constructs** (exclusion constraints, `tstzrange`, `SELECT … FOR UPDATE`, partial indexes). Drizzle's `sql` template keeps these type-aware and lets you drop to SQL without fighting the ORM. Tiny bundle, fast cold starts. See "Why not Prisma" below — this is a deliberate, load-bearing choice. |
| **Stripe Connect** | API `2025-xx` (Express accounts) | Marketplace payments: charge booker, pay out host, take commission | The de-facto standard for marketplace payouts. Handles KYC/onboarding, compliance, and bank payouts. **Express accounts** + Stripe-hosted onboarding gives fast host onboarding without you building compliance UI. See Payments section for charge-type rationale. |
| **Tailwind CSS** | v4 | Styling | Default for Next.js apps; fast to build a responsive UI; pairs with component libraries below. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **Better Auth** | 1.x | Authentication (email/password, OAuth, sessions in your Postgres) | Primary auth recommendation. Sessions live in your DB (instant revocation), no per-MAU vendor cost, TypeScript-native, supports the single-account-with-booker+host-capabilities model cleanly via roles. Auth.js/NextAuth is now in security-patch-only mode and its own team points new projects to Better Auth. |
| **PostGIS** | 3.x (Postgres extension) | Geospatial "spaces near me" radius/bbox search | Enable when you need real distance search on listings. Use `geography(Point,4326)` + GiST index for radius queries. More precise and faster at scale than `cube`/`earthdistance`. |
| **shadcn/ui + Radix** | latest | Accessible component primitives (dialogs, date pickers, comboboxes) | Booking flows need calendars, date/time pickers, modals. shadcn/ui gives copy-in, accessible components you own. |
| **React Hook Form + Zod** | RHF 7.x / Zod 3.x | Forms + shared validation schema | Listing creation, booking forms, host onboarding. Zod schemas shared between client validation and server actions (validate again on the server — never trust the client for price/time). |
| **TanStack Query** | 5.x | Client data fetching/caching for interactive availability views | Use for the live availability calendar where the client polls/refetches slots. Optional if you lean fully on Server Components + revalidation. |
| **UploadThing** *or* **Cloudinary** | latest | Listing photo upload + delivery | UploadThing = fastest Next.js integration (presigned URLs, ~30 LOC). Cloudinary = automatic image transforms/thumbnails/CDN (better for marketplace photo grids + zoom). Pick one; see Variants. |
| **date-fns** + **@date-fns/tz** | 4.x | Date/time math and timezone handling | Slot math, durations, day/hour boundaries. **Store all times as `timestamptz` (UTC)** and convert at the edges. Timezone bugs are a top pitfall in booking apps. |
| **Stripe Node SDK** | 18.x | Server-side Stripe calls | PaymentIntents, Connect accounts, transfers, webhooks. |
| **Resend** | latest | Transactional email (booking confirmations, request approvals, group invites) | Simple, cheap, good Next.js/React Email DX. Needed for request-to-book and group-invite flows. |
| **BullMQ + Redis** *or* **Inngest** | latest | Background jobs (delayed payout/transfer, reminders, webhook retries, RSVP deadlines) | Marketplace flows are async: capture-then-transfer-after-session, send reminders, expire unconfirmed group RSVPs. Inngest if you want managed/serverless-friendly; BullMQ+Redis if self-hosting on Railway/Render. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **Drizzle Kit** | Migrations + Drizzle Studio (DB browser) | Generate migrations from schema; **hand-edit the migration SQL** to add the exclusion constraint and PostGIS bits (Drizzle can't yet express EXCLUDE constraints in schema — see Pitfalls). |
| **Stripe CLI** | Local webhook forwarding + event triggering | Essential for developing Connect onboarding and payout webhooks locally (`stripe listen`, `stripe trigger`). |
| **Vitest + Playwright** | Unit/integration + E2E tests | Test the booking transaction (concurrent double-book attempts must fail) and the pay→payout flow against Stripe test mode. |
| **Biome** *or* ESLint + Prettier | Lint/format | Biome is faster/single-tool; either is fine. |
| **Docker (local Postgres + PostGIS)** | Reproducible local DB matching prod | Use the `postgis/postgis:18` image so local matches production extensions. |

## Installation

```bash
# Scaffold
npx create-next-app@latest fitout --typescript --app --tailwind

# Core data layer
npm install drizzle-orm postgres
npm install -D drizzle-kit

# Auth
npm install better-auth

# Payments
npm install stripe @stripe/stripe-js

# Forms + validation
npm install react-hook-form zod @hookform/resolvers

# Dates / timezones
npm install date-fns @date-fns/tz

# Data fetching (optional, for live availability views)
npm install @tanstack/react-query

# Uploads (pick one)
npm install uploadthing @uploadthing/react   # option A
npm install cloudinary next-cloudinary        # option B

# Email + background jobs
npm install resend
npm install bullmq ioredis      # OR: npm install inngest

# UI primitives
npx shadcn@latest init

# Dev/testing
npm install -D vitest @playwright/test @biomejs/biome
```

## Marketplace Payments — Prescriptive Detail

This is the highest-risk, highest-value subsystem. Be deliberate.

**Account type: Stripe Connect Express.**
Hosts get fast, Stripe-hosted onboarding (KYC, identity, bank details) without you building compliance UI, but the host experience still lives inside FitOut's branding. Standard accounts push hosts into the full Stripe dashboard (heavier, off-brand); Custom is enterprise-only complexity you don't need at v1. **Confidence: HIGH.**

**Charge type: Separate charges and transfers (not destination charges).**
Rationale specific to FitOut: you charge the booker at booking time, but the service (the session) is delivered later, and request-to-book listings may be approved/declined. **Separate charges and transfers lets you collect funds first and transfer to the host only after the session is delivered (or after a cancellation window).** Destination charges transfer immediately at payment, which is wrong for a held-until-delivered booking flow and complicates refunds/cancellations. Take your platform commission by transferring `amount − commission` to the host. **Confidence: HIGH.**

**Onboarding flow:**
1. Host clicks "become a host" → create a Connect Express account (`accounts.create`).
2. Generate an **Account Link** (`account_onboarding`) → redirect host to Stripe-hosted onboarding.
3. On return, **do not trust the redirect** — listen for the **`account.updated`** webhook and check **`charges_enabled` / `payouts_enabled`**; only mark the host "able to receive payouts" once those flip true. Cache that state in your DB.

**Booking → payout sequence:**
1. Booker pays → create a **PaymentIntent** on the platform account (funds land on platform).
2. Hold (do not transfer yet). For request-to-book, capture only on host approval (or auth+capture).
3. After session delivery / past cancellation cutoff → create a **Transfer** to the host's connected account for `amount − platform_commission`. Run this via a **scheduled background job**, not inline.
4. Refunds/cancellations reverse the PaymentIntent (and reverse the transfer if already sent).

**Webhooks are mandatory and must be idempotent.** Use the Stripe CLI locally. Process webhooks in a queue with retries; store processed event IDs to dedupe. This is why the app needs a real server/worker, not just edge functions.

## Double-Booking Prevention — Prescriptive Detail

**This is the core-value correctness requirement. Enforce it in the database, never in app code.**

Use a **Postgres GiST exclusion constraint** on the bookings table so two confirmed bookings for the same space cannot overlap in time — the database rejects the second insert atomically, even under concurrent requests:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings
  ADD CONSTRAINT no_double_booking
  EXCLUDE USING gist (
    space_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  )
  WHERE (status IN ('confirmed', 'pending'));   -- ignore cancelled/declined
```

Notes:
- `tstzrange(..., '[)')` makes back-to-back bookings (e.g. 10:00–11:00 then 11:00–12:00) NOT overlap — correct for hourly slots.
- The partial `WHERE` lets cancelled/declined rows coexist without blocking new bookings.
- Wrap the booking insert in a transaction; on constraint violation, return "slot just taken" to the user.
- For request-to-book, a `pending` request holds the slot; on decline/expiry it flips to `cancelled` and frees the slot.

**ORM caveat (load-bearing — see Pitfalls):** Neither Drizzle nor Prisma can express EXCLUDE constraints in their schema DSL today. You must add this via **hand-written SQL in a migration**. Drizzle's migrations are plain SQL files you edit directly, which makes this clean. With Prisma, exclusion constraints are *falsely introspected as GiST indexes* and you must maintain them out-of-band — a real friction. **Confidence: HIGH.**

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| **Drizzle ORM** | Prisma 7 | If the team strongly prefers Prisma's fluent client and is comfortable maintaining the exclusion constraint + PostGIS via raw SQL migrations out-of-band. Prisma 7 is now Rust-free, smaller, and production-ready — a valid choice — but adds friction exactly where this domain needs raw Postgres. |
| **Better Auth** | Clerk | If you want fastest possible setup and polished prebuilt UI and are fine paying per-MAU and storing user data on Clerk (US-only residency, painful to migrate off later). Good for racing to a demo. |
| **Better Auth** | Supabase Auth | If you adopt the whole Supabase platform (DB + auth + storage + realtime) as one bundle. Reasonable all-in-one, but couples you to Supabase. |
| **Next.js full-stack** | Separate React SPA + NestJS/Express API | If you anticipate a separate native mobile app soon and want a standalone API. For a v1 responsive web app, the monolith Next.js app is faster and simpler. |
| **Separate charges & transfers** | Destination charges | If you ever move to *instant* settlement where the host is paid the moment the booker pays and there's no hold/approval window (not FitOut's model). |
| **PostGIS** | `cube` + `earthdistance` | If geo needs stay trivial (single-city, small dataset) and you want zero extra extension complexity. Simpler, slightly less precise; fine early, but PostGIS scales better and you'll likely want it. |
| **UploadThing** | Cloudinary | When you need automatic image transforms/responsive thumbnails/zoom for listing galleries (Cloudinary) vs. cheapest fastest plumbing (UploadThing). |
| **Railway/Render** | Vercel (frontend) + Railway/Render (worker) | Hybrid is common: Vercel for the Next.js frontend, separate service for webhooks/jobs. Adds moving parts; only split if you specifically want Vercel's frontend edge features. |
| **BullMQ + Redis** | Inngest | Inngest if you prefer managed, serverless-friendly durable jobs without running Redis. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Application-level double-booking checks** ("query for conflicts, then insert") | Classic race condition: two concurrent requests both pass the check, both insert, space is double-booked, money is taken twice. The core value (a *real* booking) is violated. | **Postgres GiST exclusion constraint** + transaction (DB-enforced atomicity). |
| **NextAuth / Auth.js (v5) for a new project** | As of Sept 2025 it's in security-patch-only mode; its own maintainers (now the Better Auth team) steer new projects elsewhere. No built-in 2FA/RBAC; fragmented v5 migration. | **Better Auth** (or Clerk/Supabase Auth). |
| **Stripe Connect Standard accounts** for v1 | Pushes hosts to the full external Stripe dashboard (off-brand, heavier onboarding) and gives the platform less control over the experience. | **Express accounts** + Stripe-hosted onboarding. |
| **Destination charges** for the booking flow | Transfers funds to the host immediately at payment — wrong when you must hold funds until the session is delivered and support request-to-book approval/decline + cancellations. | **Separate charges and transfers**, transfer post-delivery. |
| **Storing local/naive timestamps** for slots | Timezone/DST bugs cause wrong slots, missed bookings, and disputes — a top booking-app failure mode. | `timestamptz` (UTC) in DB; convert at the edges with `@date-fns/tz`. |
| **MongoDB / document DB as primary store** | Marketplace data is highly relational and money-critical (bookings ↔ payments ↔ users ↔ payouts), and you lose exclusion constraints + transactional guarantees that make double-booking prevention trivial. | **PostgreSQL**. |
| **Building your own payout/KYC/escrow** | Massive compliance and money-transmission risk; unnecessary. | **Stripe Connect**. |
| **Vercel-only deployment for the whole backend** | Serverless/edge function limits make long-lived webhook processing, retries, and always-on background jobs (delayed transfers, RSVP expiry) awkward. | Container host (**Railway/Render/Fly.io**), or hybrid with a dedicated worker. |
| **Rolling your own calendar/date-picker from scratch** | Time sink + accessibility/timezone bugs. | **shadcn/ui** date components + **date-fns**. |
| **Elasticsearch/Algolia for search at v1** | Over-engineered for a single-city catalog; another system to run and pay for. | Postgres full-text + PostGIS; add a dedicated search engine only if catalog/filters outgrow Postgres. |

## Stack Patterns by Variant

**If you want the absolute fastest path to a working demo (and don't mind vendor lock-in / per-MAU cost):**
- Swap Better Auth → **Clerk**, and UploadThing/Cloudinary stays.
- Because prebuilt auth UI + hosted user management removes days of setup; revisit before scale if MAU cost or data residency matters.

**If listing photos are central to the experience (galleries, zoom, fast thumbnails):**
- Use **Cloudinary** over UploadThing.
- Because automatic transforms/responsive delivery/CDN are built-in; you avoid writing image pipelines.

**If you stay strictly single-city and small for a while:**
- Defer **PostGIS**; use `cube`/`earthdistance` for radius, or even just city/neighborhood filtering.
- Because the geo precision/perf gains of PostGIS aren't needed yet; less extension overhead.

**If you don't want to run Redis:**
- Use **Inngest** instead of BullMQ+Redis for delayed transfers, reminders, and RSVP expiry.
- Because Inngest is managed and serverless-friendly; fewer moving parts early.

**If a native mobile app is on the near horizon:**
- Split into a standalone API (NestJS/Express or Next.js route handlers as an API) consumed by both web and mobile.
- Because a shared API avoids duplicating booking/payment logic per client. (Not needed for the v1 responsive-web-only scope.)

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Next.js 16.2 | React 19 | React 19 ships with Next 16; don't pin older React. |
| Drizzle ORM 0.44+ | PostgreSQL 18 / `postgres` (postgres.js) driver | Use `postgres` (postgres.js) or `node-postgres`; postgres.js is the common Drizzle pairing. Confirm driver version against drizzle-orm release notes. |
| PostgreSQL 18 | `btree_gist` + PostGIS 3.x | `btree_gist` required for the `space_id WITH =` part of the exclusion constraint; PostGIS for geo. Use the `postgis/postgis:18` Docker image locally. |
| Better Auth 1.x | Drizzle adapter + Postgres | Better Auth has a first-class Drizzle adapter; store sessions in the same Postgres. |
| Stripe Node SDK 18.x | Pinned Stripe API version | Pin `apiVersion` in the SDK; test Connect flows in Stripe test mode + Stripe CLI. |
| Tailwind v4 | Next.js 16 / shadcn/ui | shadcn/ui supports Tailwind v4; verify component template versions on init. |

## Sources

- /drizzle-team/drizzle-orm-docs (Context7) — Drizzle ORM docs lookup (resolved; current drizzle-kit 0.31.x) — HIGH
- nextjs.org/blog/next-16-2 — Next.js 16.2 stable (Mar 2026 release) — HIGH
- docs.stripe.com/connect/separate-charges-and-transfers & /connect/charges & /connect/destination-charges — charge-type semantics, hold-until-delivery guidance — HIGH
- docs.stripe.com/connect/hosted-onboarding & /connect/webhooks & /connect/account-capabilities — Express onboarding, `account.updated`, `charges_enabled`/`payouts_enabled` — HIGH
- github.com/drizzle-team/drizzle-orm issues #2813 / #3388 — exclusion constraints not yet expressible in Drizzle schema (use raw SQL migration) — HIGH
- github.com/prisma/prisma issue #17514 + prisma.io/docs unsupported-database-features — Prisma can't express exclusion constraints, falsely introspected as GiST indexes — HIGH
- prisma.io/blog/announcing-prisma-orm-7-0-0 + infoq.com/news/2026/01/prisma-7-performance — Prisma 7 Rust-free, production-ready (alternative) — HIGH
- supastarter.dev/blog/better-auth-vs-nextauth-vs-clerk + blog.logrocket.com/best-auth-library-nextjs-2026 + makerkit.dev (better-auth-vs-clerk) — Auth.js security-patch-only since Sept 2025; Better Auth recommended for new projects — MEDIUM
- wiki.postgresql.org/wiki/How_to_avoid_overlapping_intervals_with_PostgreSQL + betterstack.com/community/guides/databases/postgres-temporal-constraints — GiST exclusion constraint / `tstzrange` pattern; PG18 temporal constraints — HIGH
- elephanttamer.net + hashrocket.com (PostGIS vs earthdistance) — PostGIS more precise/faster, earthdistance simpler — MEDIUM
- starterpick.com/guides/uploadthing-vs-s3-vs-cloudflare-r2 + cloudinary.com/guides — image storage tradeoffs — MEDIUM
- birjob.com/blog/paas-comparison-railway-render-fly-vercel-2026 + designrevision.com/blog/saas-hosting-compared — hosting/cost & webhook/background-job suitability — MEDIUM

---
*Stack research for: two-sided fitness-space booking marketplace with real-time availability + marketplace payouts*
*Researched: 2026-06-03*
