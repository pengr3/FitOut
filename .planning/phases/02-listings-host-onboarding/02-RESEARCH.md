# Phase 2: Listings & Host Onboarding - Research

**Researched:** 2026-06-04
**Domain:** Marketplace supply-side — listing CRUD + photo galleries + structured geolocation + Stripe Connect Express payout onboarding + a live, webhook-driven bookability gate
**Confidence:** HIGH (stack is locked + Phase-1 patterns are established; the only MEDIUM areas are version drift on the Stripe SDK and the geocoding-provider choice, both flagged below)

## Summary

Phase 2 is mostly well-understood CRUD against an established Phase-1 foundation (Better Auth `user` root, Drizzle + Postgres 18, server-action + shared-Zod pattern, Cloudinary configured, shadcn/ui), with **three genuinely decision-bearing, unfamiliar subsystems**: (1) Stripe Connect **Express** account creation + hosted onboarding + the `account.updated` webhook, (2) Cloudinary **signed direct-to-client** gallery uploads (a deliberate graduation from the Phase-1 server `upload_stream` avatar path), and (3) structured-address capture with lat/lng + a single-listing map. Sitting on top of all of it is the architectural keystone — the **bookability gate** (`bookable ⇔ status==published AND email_verified AND payouts_enabled`), which must be a *derived* property read from a webhook-maintained cached flag so later phases (3/4/6) can never bypass it.

The single most important currency-of-correctness finding: **CLAUDE.md pins Stripe Node SDK 18.x, but the current published SDK is 22.2.0 (released 2026-05-27)** `[VERIFIED: npm registry]`. 18.x is two majors stale and would lock you to an old pinned `apiVersion`. The locked *intent* (Express accounts, hosted onboarding, separate charges/transfers, pin the `apiVersion`) is fully preserved on 22.x — only the SDK major number changed. Recommend installing `stripe@^22` and pinning to the SDK's own bundled `apiVersion` (`2026-05-27.dahlia`). This is a version-currency correction, not a stack deviation, and should be surfaced to the user (it touches a LOCKED row in CLAUDE.md).

**Primary recommendation:** Build five cohesive task clusters — (A) listing data model in Drizzle (status/space-type **pgEnums**, integer-cents pricing, join tables for amenities/activity-tags, PostGIS `geometry(point,4326)` now, soft-delete) → (B) the multi-step wizard with strict server-side draft→publish validation → (C) Cloudinary signed-upload endpoint + `next-cloudinary` `CldUploadWidget` gallery with dnd-kit reorder → (D) the public detail page (un-gated route, state-reflecting CTA) → (E) Stripe Connect Express account + Account Links + the **raw-body, signature-verified, idempotent `account.updated` webhook** that maintains the cached `payouts_enabled` flag the bookability derivation reads. Use **integer minor units (cents)** for money, **store address structured + lat/lng now**, and make `payouts_enabled`/`charges_enabled` **server/webhook-set only, never client-settable** (mirror the Phase-1 `input:false` capability guard).

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Listing Creation Flow**
- **D-01:** Airbnb-style guided multi-step wizard (type → details → location → photos → pricing → booking mode → review), progress indication, **listing saved as a draft between steps**.
- **D-02:** **Draft → Published gate is strict** — publishable only when ALL core fields complete (title, description, space type, address, capacity, both rates) AND **≥3 photos** AND host **email verified**. This is where the Phase-1 soft email-verification gate (01-CONTEXT D-07) is enforced. Publishing does NOT require Stripe (see D-12).
- **D-03:** **Both hourly rate AND day rate required** on every listing (flat rates only — no dynamic/surge/tiered). Single currency. How hourly/day coexist on a calendar is a **Phase-3** concern; do not solve it here.
- **D-04:** Photos: min **3** to publish, **first photo is cover**, drag-to-reorder. Generous max (~20, planner's call). Upload via **signed direct-to-Cloudinary client uploads** (`cloudinary.utils.api_sign_request`). Folder convention `fitout/listings/<listingId>`. Do NOT route galleries through the server like the Phase-1 avatar.

**Space Taxonomy & Amenities**
- **D-05:** Space types from a **fixed curated list** (seed/admin-controlled enum), NOT free-form. One **canonical primary space type** + **optional secondary activity tags**.
- **D-06:** **Amenities** are a **fixed curated checklist** (multi-select), not free text.
- **D-07:** **Capacity = a single "max occupancy" integer** per listing. Single source of truth Phase 8 uses to hard-cap RSVPs (GROUP-05). **Resolves "Group capacity source."**
- **D-08:** **Locked v1 starter vocabulary** (wording/grouping refinable, extendable via seed/admin):
  - **Primary space types:** Pickleball court · Tennis court · Basketball court · Multi-sport court · Gym / fitness floor · Yoga studio · Dance / movement studio · Pilates / barre studio · Martial arts / boxing gym · Home / private gym · Multi-purpose / event space
  - **Activity tags (optional):** pickleball, tennis, basketball, volleyball, badminton, futsal/soccer, yoga, pilates, barre, dance, HIIT / cross-training, weightlifting, boxing / MMA, climbing, general fitness
  - **Amenities:** Showers · Lockers / changing room · Restrooms · Parking · Equipment provided · Air conditioning / heating · Wi-Fi · Drinking water · Sound system · Mirrors · Accessible (step-free) · Towels · First-aid / AED

**Location & Privacy**
- **D-09:** Per-listing **"show exact address" toggle, defaulting to approximate**. Approximate = neighborhood + fuzzed map area; exact street address revealed only after a confirmed booking (future-phase reveal — Phase 2 just stores the toggle + behaves accordingly on the public page).
- **D-10:** Location capture via **address autocomplete** (Places-style); **store structured address + lat/lng now**. Geocoding provider + PostGIS-now-vs-defer is a planner/research decision — but coordinates MUST be captured this phase.
- **D-11:** v1 listing detail page **shows a map** with approximate pin/area (fuzzed circle when approximate; exact pin when exact/after booking). Distinct from v2 map-search (DISC-01). Adds a maps-embed dependency.
- **D-11b:** **No hard region geofence** on addresses — allow any address; rely on search to surface local results.

**Stripe Connect Onboarding & Bookability Gate**
- **D-12:** Host can create, edit, AND **publish** with no Stripe yet; a persistent banner/checklist nudges payout setup. Payout onboarding required **only to make a listing bookable**. NOT pushed on "Start hosting," NOT blocking publish.
- **D-13:** A published-but-not-payable listing's **public detail page is viewable** (photos, price, description, location) with the **book CTA disabled / "not bookable yet"**; host sees a "finish payout setup to accept bookings" prompt.
- **D-14:** **Bookability is a live, webhook-driven state** computed from `payouts_enabled` (tracked via `account.updated` — PAY-04). If payouts later become **disabled**, listings **immediately auto-revert** to not-bookable (and drop from search). **One Stripe Connect Express account per host**; all that host's listings share it.
- **D-15:** **Bookability formula:** bookable ⇔ `status == published` AND host `email_verified` AND host `payouts_enabled`. "Published" alone never implies sellable.
- **D-16 (forward intent for Phase 4):** Published-but-not-bookable listings **excluded from search/discovery**; detail page still directly viewable by link.

### Claude's Discretion
- **"Unlisted" status semantics:** previously-published listing taken off-market — hidden from public, **keeps all data, re-publishable**. (status enum: `draft` / `published` / `unlisted`.)
- **Edits to a published listing go live immediately** — no moderation/review queue in v1.
- **Soft-delete / archive** listings rather than hard-delete (forward-safe for when bookings FK to listings later).
- Listing detail page **URL/slug** scheme; exact max photo count; Cloudinary transform/thumbnail presets; precise wizard step grouping + field-level validation messages — planner's call.
- **Stripe Connect specifics** (account creation timing, link generation, `account.updated`/`charges_enabled`/`payouts_enabled` handling, signature verification, Stripe CLI) — follow CLAUDE.md "Marketplace Payments"; researcher refines (see below).
- **Lightweight cold-start seed tooling** (a handful of demo listings) acceptable — `role` field exists for an admin hook — but **do not over-build** (STATE.md note). Not a user-facing feature.

### Deferred Ideas (OUT OF SCOPE)
- **Per-listing cancellation policy selection** → Phase 7 (tiers don't exist yet).
- **Availability / operating hours / blocks / real calendar** → Phase 3 (detail page shows a *placeholder/coming-soon* for availability in Phase 2).
- **Actual search & discovery** → Phase 4 (vocabulary locked now so filters are ready).
- **Real booking + book-CTA behavior, instant vs request-to-book lifecycle** → Phase 4/6. Booking mode is *stored* here, *wired* later.
- **Map view of search results (DISC-01)** → v2 (distinct from the v1 single-listing map D-11).
- **Richer host/listing trust content** (reviews, host bio surface, verification badges) → v2.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LIST-01 | Host can create/edit a listing (title, description, space type, address, capacity, amenities) | Listing data model (§Standard Stack / §Architecture Pattern 1); pgEnum space type (D-05/D-08); amenities join table (D-06); structured address + lat/lng (D-10, §Pattern 4) |
| LIST-02 | Host can upload and **order** multiple photos | Cloudinary signed direct upload (§Pattern 2); `listing_photo` table with `position` int; dnd-kit reorder (§Don't Hand-Roll); cover = position 0 (D-04) |
| LIST-03 | Host can set hourly + day rate | Integer-cents money columns (§State of the Art / §Pitfall 5); both required (D-03); server re-validation |
| LIST-04 | Host can choose instant-book or request-to-book | `booking_mode` pgEnum stored now, wired Phase 6 (D-04 wizard step + radio-group) |
| LIST-05 | Host can set status (draft/published/unlisted) | `status` pgEnum + strict publish gate (D-02, §Pattern 5/6); soft-delete distinct from unlisted |
| LIST-06 | Anyone can view a listing detail page | Un-gated public route outside `(app)`/`(host)` groups (§Pattern 3); state-reflecting CTA (D-13) |
| PAY-04 | Host completes Stripe Connect KYC before listing becomes bookable | Express account + Account Links + `account.updated` webhook → cached `payouts_enabled` (§Pattern 7/8, §Stripe deep-dive) |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Listing CRUD + publish-gate validation | API / Server (Server Actions) | DB (constraints) | Price/capacity/status are money-adjacent — never trust the client; re-validate server-side (mirrors Phase-1 `input:false`) |
| Photo bytes upload | Browser → Cloudinary (direct) | API (sign-request only) | Large files must NOT transit the Next.js server (D-04); server only mints the signature |
| Photo metadata (order, public_id, url) persistence | API / Server | DB | The ordered photo list + public_ids are the source of truth, not Cloudinary |
| Address autocomplete | Browser (provider widget) | API (optional proxy/geocode) | Autocomplete is interactive client UX; coordinates persisted server-side |
| Listing map render | Browser | — | Pure presentation; respects approximate/exact toggle |
| Stripe account creation + Account Link mint | API / Server | — | Uses the secret key — server only |
| `payouts_enabled` truth | Stripe (webhook) → API (handler) → DB (cached flag) | — | Webhook is source of truth; flag cached on host for cheap reads (D-14) |
| Bookability derivation | API / Server (query-time derive) | DB (denormalized cache, optional) | Derived from status + email_verified + payouts_enabled; read by Phases 3/4/6 (D-15) |
| Public detail page render | Frontend Server (RSC) | API | Server Component fetches listing + derives bookable for the CTA state (D-13) |

## Standard Stack

> Versions VERIFIED against the npm registry on 2026-06-04 via `npm view <pkg> version`.

### Core (already installed — reuse)
| Library | Installed | Purpose | Why Standard |
|---------|-----------|---------|--------------|
| next | 16.2.7 | App Router, Server Components, Server Actions, Route Handlers (webhook) | Locked stack `[CITED: CLAUDE.md]` |
| drizzle-orm | 0.45.2 | Schema + type-safe queries; has built-in `geometry(point,srid)` since 0.31 | Locked; PostGIS-capable `[VERIFIED: npm + orm.drizzle.team]` |
| drizzle-kit | 0.31.10 | Migration generation (`generate`, `generate --custom` for the postgis EXTENSION) | Locked |
| postgres | 3.4.9 | postgres.js driver (Drizzle pairing) | Locked; already wired in `src/lib/db/index.ts` |
| cloudinary | 2.10.0 | Server SDK — `utils.api_sign_request`, `uploader.destroy` | Locked; already configured in `src/lib/cloudinary.ts` |
| zod | 4.4.3 | Shared client+server validation (add `listing.ts`) | Locked; Phase-1 pattern |
| react-hook-form | 7.77.0 + @hookform/resolvers 5.4.0 | Wizard forms | Locked; Phase-1 pattern |
| better-auth | 1.6.14 | `user` ownership root; `auth.api.getSession` gate in actions | Locked |

### Supporting (NEW for Phase 2)
| Library | Verified Version | Purpose | When to Use |
|---------|------------------|---------|-------------|
| **stripe** | **22.2.0** (released 2026-05-27) `[VERIFIED: npm]` | Server SDK: `accounts.create`, `accountLinks.create`, `accounts.retrieve`, `webhooks.constructEvent` | Express account + onboarding link + webhook (PAY-04). **See version note — CLAUDE.md says 18.x; 22.x is current.** |
| **next-cloudinary** | 6.17.5 `[VERIFIED: npm]` | `<CldUploadWidget signatureEndpoint=...>` (signed client upload) + `<CldImage>` (optimized delivery) | Gallery upload (D-04) + responsive thumbnails. Thin wrapper over the locked Cloudinary stack — not a new vendor. |
| **@dnd-kit/core** + **@dnd-kit/sortable** + **@dnd-kit/utilities** | 6.3.1 / 10.0.0 / 3.2.2 `[VERIFIED: npm]` | Accessible drag-to-reorder for the photo grid (D-04) + keyboard reorder (UI-SPEC a11y) | Photo reorder. Don't hand-roll DnD (see §Don't Hand-Roll). |
| **Geocoding/maps provider** | see §Open Questions (decision) | Address autocomplete (D-10) + single-listing map (D-11) | One of: `@vis.gl/react-google-maps` 1.8.3 (Google) · `@mapbox/search-js-react` 1.5.1 + map · `react-leaflet` 5.0.0 + Photon/Nominatim (free OSM). **Recommendation below.** |

**Installation (core + DnD, provider pending the §Open Questions decision):**
```bash
npm install stripe@^22 next-cloudinary @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
# shadcn blocks per the UI-SPEC (official registry, no third-party):
npx shadcn@latest add select command popover checkbox switch radio-group badge tabs sonner skeleton alert progress separator tooltip aspect-ratio
```

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `next-cloudinary` `CldUploadWidget` | Hand-rolled `fetch` POST to the Cloudinary upload endpoint with a server-minted signature | More control, ~30 LOC more, you own the progress/error UX. `CldUploadWidget` `signatureEndpoint` is the fastest correct path and matches the locked Cloudinary choice. Either is fine; widget recommended for speed. |
| Stripe **v1 Express** (`type: 'express'`) | Stripe **Accounts v2 API** (`/v2/core/accounts`, `controller`+`configurations`) | Stripe nudges new platforms toward v2 `[CITED: docs.stripe.com/connect/accounts-v2]`, but v1 Express + Account Links is mature, simpler, exactly what CLAUDE.md locks, and `accountLinks.create` is the onboarding path for BOTH. **Recommend v1 Express** to honor the lock + minimize surface area; revisit v2 only if a later phase needs v2-only features. |
| PostGIS `geometry(point,4326)` now | Two plain `numeric` lat/lng columns; defer PostGIS to Phase 4 | CLAUDE.md prescribes PostGIS; a stack variant defers it. **Recommend enabling PostGIS now** — Drizzle has first-class `geometry` support, the local Docker image is already `postgis/postgis:18`, and Phase-4 radius search is unblocked with a GiST index. Capturing only numeric lat/lng now would force a migration + backfill in Phase 4. |
| Google Places autocomplete | Mapbox Search Box / Photon (OSM) / LocationIQ | Google: best data, **no meaningful free tier in 2026** + per-keystroke session billing. Mapbox: cheaper, **per-keystroke billing — debounce mandatory**. Photon/Nominatim (OSM): free, good enough for single-city launch. See §Open Questions for the recommendation. |
| Integer cents for money | `numeric(10,2)` | Numeric is exact too, but ~50-70% slower and Stripe itself uses integer minor units — cents aligns the whole money path. **Recommend integer cents.** |

## Architecture Patterns

### System Architecture Diagram

```
                                  ┌─────────────────────────────────────────────┐
  HOST (browser)                  │            FitOut (Next.js 16)              │
  ───────────────                 │                                             │
  Wizard steps  ───POST(action)──▶│  Server Action: saveListingStep            │
  (RHF + Zod)                     │   - re-validate w/ shared Zod (server)      │──┐
                                  │   - db.update(listing) draft (D-01)         │  │
  Photo files ──┐                 │                                             │  │
                │  GET /api/cloudinary/sign  (server mints signature) ◀─────────┤  │
                │                 │   cloudinary.utils.api_sign_request         │  ▼
                └──direct POST────────────────────────▶ Cloudinary       ┌──────────────┐
                  (bytes never hit our server, D-04)    (stores bytes)   │  Postgres 18 │
                       │ returns {public_id, secure_url}                 │  + PostGIS    │
                       └──POST(action saveListingPhoto: position,id)────▶│              │
                                  │                                       │ listing      │
  "Set up payouts" ──POST(action)─│  Server Action: startStripeOnboarding │ listing_photo│
                                  │   accounts.create({type:'express'})   │ listing_amen.│
                                  │   accountLinks.create(refresh,return) │ listing_tag  │
                                  │   store stripeAccountId on user ──────│ user(+stripe │
   redirect ◀──hosted onboarding URL                                      │  acct fields)│
        │                                                                 └──────────────┘
        ▼                                                                        ▲
   Stripe-hosted KYC ──(host completes/updates)──▶ Stripe ──account.updated──▶   │
                                  │  POST /api/stripe/webhook (Route Handler,    │
                                  │   runtime=nodejs, RAW body)                  │
                                  │   constructEvent(sig) → verify → idempotent  │
                                  │   read acct.payouts_enabled/charges_enabled  │
                                  │   db.update(user) cache flags (D-14) ────────┘
                                  └─────────────────────────────────────────────┘

  ANYONE (no auth) ──GET /listings/[id]──▶ RSC fetches listing + host flags
                                            derive bookable = published
                                              && host.email_verified
                                              && host.payouts_enabled  (D-15)
                                            render gallery, price, map (fuzzed/exact),
                                            CTA state (book / "not bookable yet")  (D-13)
```

### Recommended Project Structure
```
src/
├── app/
│   ├── (host)/host/
│   │   ├── listings/
│   │   │   ├── page.tsx              # "Your listings" grid (status badges, actions)
│   │   │   ├── new/page.tsx          # wizard entry (creates draft, redirects to [id]/edit)
│   │   │   └── [id]/edit/page.tsx    # the multi-step wizard (canHost-gated by (host) layout)
│   │   └── page.tsx                  # existing dashboard — wire the "Create listing" CTA + payout banner
│   ├── listings/[id]/page.tsx        # PUBLIC detail page — NO auth gate (LIST-06, outside (app)/(host))
│   └── api/
│       ├── cloudinary/sign/route.ts  # POST — session-gated, mints upload signature (D-04)
│       └── stripe/webhook/route.ts   # POST — runtime=nodejs, raw body, account.updated (PAY-04)
├── app/actions/
│   ├── listing.ts                    # create/save-step/publish/unlist/soft-delete server actions
│   ├── listing-photo.ts              # persist/reorder/remove photo metadata
│   └── stripe-connect.ts             # startStripeOnboarding (account + link), refresh link
├── lib/
│   ├── validation/listing.ts         # shared Zod: draftSchema + publishSchema (D-02 strict)
│   ├── cloudinary.ts                 # EXTEND: add signListingUpload() + destroyListingPhoto()
│   ├── stripe.ts                     # NEW: configured Stripe client (pinned apiVersion)
│   ├── bookability.ts                # NEW: deriveBookable(listing, host) — single source of truth
│   └── listing-vocab.ts             # NEW: D-08 locked enums (space types, activity tags, amenities)
└── lib/db/schema.ts                  # EXTEND: listing + listing_photo + join tables + stripe fields on user
```

### Pattern 1: Listing data model (hand-authored Drizzle, FK to `user.id`)
**What:** New tables hand-written in `schema.ts` (Better Auth only owns auth tables). `user.id` is `text` → listing PKs/FKs must be `text` too (or use `text` UUIDs).
**When to use:** All Phase-2 persistence.
```typescript
// Source: orm.drizzle.team/docs/sql-schema-declaration + postgis-geometry-point [CITED]
import { pgTable, pgEnum, text, integer, boolean, timestamp, index, uniqueIndex, geometry } from "drizzle-orm/pg-core";
import { user } from "./schema"; // existing root

export const listingStatus = pgEnum("listing_status", ["draft", "published", "unlisted"]);
export const bookingMode  = pgEnum("booking_mode", ["instant", "request"]);
export const spaceType    = pgEnum("space_type", [
  "pickleball_court","tennis_court","basketball_court","multi_sport_court","gym_fitness_floor",
  "yoga_studio","dance_studio","pilates_barre_studio","martial_arts_boxing","home_private_gym","multi_purpose_event",
]); // D-05/D-08 — fixed curated enum

export const listing = pgTable("listing", {
  id: text("id").primaryKey(),                                   // generate uuid in app (matches user.id text PK)
  hostId: text("host_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  title: text("title"),
  description: text("description"),
  primarySpaceType: spaceType("primary_space_type"),
  // address: structured + coordinates (D-10). Coordinates REQUIRED at publish, nullable in draft.
  addressLine1: text("address_line1"), addressLine2: text("address_line2"),
  city: text("city"), region: text("region"), postalCode: text("postal_code"), country: text("country"),
  neighborhood: text("neighborhood"),                            // for approximate display (D-09)
  location: geometry("location", { type: "point", mode: "xy", srid: 4326 }), // PostGIS (D-10)
  showExactAddress: boolean("show_exact_address").default(false).notNull(),  // D-09 default approximate
  maxOccupancy: integer("max_occupancy"),                        // D-07 single capacity int
  hourlyRateCents: integer("hourly_rate_cents"),                 // D-03 integer minor units
  dayRateCents: integer("day_rate_cents"),                       // D-03
  currency: text("currency").default("usd").notNull(),           // single-region; column future-proofs
  bookingMode: bookingMode("booking_mode").default("request").notNull(), // D-04 stored, wired Phase 6
  status: listingStatus("status").default("draft").notNull(),    // D-02/LIST-05
  publishedAt: timestamp("published_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),    // soft-delete (Claude's discretion)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index("listing_host_idx").on(t.hostId),
  index("listing_status_idx").on(t.status),
  index("listing_location_gist").using("gist", t.location),      // Phase-4 radius search ready
]);

export const listingPhoto = pgTable("listing_photo", {
  id: text("id").primaryKey(),
  listingId: text("listing_id").notNull().references(() => listing.id, { onDelete: "cascade" }),
  publicId: text("public_id").notNull(),   // Cloudinary public_id — needed for destroy (orphan cleanup)
  url: text("url").notNull(),              // secure_url
  position: integer("position").notNull(), // 0 = cover (D-04)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("listing_photo_listing_idx").on(t.listingId),
  uniqueIndex("listing_photo_position_uq").on(t.listingId, t.position), // stable ordering invariant
]);

// Amenities & activity tags as JOIN tables (NOT array columns) — keeps Phase-4 filters indexable & clean (D-05/D-06).
export const listingAmenity = pgTable("listing_amenity", {
  listingId: text("listing_id").notNull().references(() => listing.id, { onDelete: "cascade" }),
  amenity: text("amenity").notNull(),  // or a pgEnum from the D-08 amenity vocab
}, (t) => [ uniqueIndex("listing_amenity_uq").on(t.listingId, t.amenity) ]);

export const listingActivityTag = pgTable("listing_activity_tag", {
  listingId: text("listing_id").notNull().references(() => listing.id, { onDelete: "cascade" }),
  tag: text("tag").notNull(),
}, (t) => [ uniqueIndex("listing_activity_tag_uq").on(t.listingId, t.tag) ]);
```
**Note on PostGIS migration:** Drizzle cannot emit `CREATE EXTENSION postgis`. Generate the normal migration with `drizzle-kit generate`, then add a **`drizzle-kit generate --custom`** migration containing `CREATE EXTENSION IF NOT EXISTS postgis;` **ordered before** the listing migration (or hand-edit the listing migration to put the extension first). The local image already ships PostGIS, but the extension still must be enabled per-database. **The test-DB harness (`tests/helpers/db.ts`) replays raw migration SQL into an isolated schema — ensure the `CREATE EXTENSION` statement is idempotent (`IF NOT EXISTS`) so parallel workers don't fail.** `[VERIFIED: orm.drizzle.team/docs/guides/postgis-geometry-point]`

### Pattern 2: Cloudinary signed direct-to-client upload (D-04)
**What:** Server mints a signature; the browser uploads bytes directly to Cloudinary; only metadata returns to your server. Graduates from the Phase-1 server `upload_stream` avatar path (which the `cloudinary.ts` header comment explicitly prescribes).
**When to use:** All listing gallery uploads.
```typescript
// src/app/api/cloudinary/sign/route.ts — session-gated; api_secret NEVER leaves the server.
// Source: cloudinary.com/documentation/signatures + support.cloudinary.com signed-upload [CITED]
import { v2 as cloudinary } from "cloudinary";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  const { listingId } = await req.json();
  // (verify the listing belongs to session.user.id before signing — prevents cross-host uploads)
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = { timestamp, folder: `fitout/listings/${listingId}` }; // D-04 folder convention
  const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET!);
  return Response.json({ signature, timestamp, apiKey: process.env.CLOUDINARY_API_KEY, cloudName: process.env.CLOUDINARY_CLOUD_NAME, folder: paramsToSign.folder });
}
```
Client uses `next-cloudinary` `<CldUploadWidget signatureEndpoint="/api/cloudinary/sign" ...>`; on success, call a server action to persist `{ public_id, secure_url, position }` into `listing_photo`. **The set of params signed on the server MUST exactly match the params the client sends** (excluding `api_key`, `resource_type`, `cloud_name`, `file`) or Cloudinary returns 401. `[CITED: cloudinary.com/documentation/upload_images]`

**Orphan handling (D-04 implies cleanup):** when a photo is removed or a draft is abandoned, call `cloudinary.uploader.destroy(publicId, { invalidate: true })` server-side to delete the asset + bust the CDN cache. Store `public_id` (done above) so deletion is possible. `[CITED: cloudinary.com/documentation/delete_assets]`

### Pattern 3: Public listing detail page — un-gated route (LIST-06)
**What:** The detail page must be reachable WITHOUT a session. Place it **outside** the `(app)` and `(host)` route groups (whose layouts call `auth.api.getSession` and gate).
**When to use:** `/listings/[id]/page.tsx`.
```typescript
// RSC: fetch listing + host flags, derive bookability, render state-reflecting CTA (D-13).
const bookable = deriveBookable(listing, host); // see Pattern 5
// status==unlisted/draft → 404 to the public; owner gets an owner-only preview (Claude's discretion).
```

### Pattern 4: Address autocomplete → structured + coordinates (D-10)
**What:** The autocomplete widget returns a place; extract structured components + lat/lng and persist both. The map (D-11) renders a fuzzed circle (approximate, default) or exact pin.
**When to use:** Wizard location step + detail-page map.
- Provider-agnostic contract: on select → `{ addressLine1, city, region, postalCode, country, neighborhood, lat, lng }`.
- Persist `location` via Drizzle `geometry` `{ x: lng, y: lat }` (xy mode; **x = longitude, y = latitude** — a classic swap pitfall, see §Pitfalls).
- **Server-side validation:** reject publish if coordinates are absent (UI-SPEC error: "We couldn't find that address. Pick a suggestion from the list").

### Pattern 5: Bookability derivation — single source of truth (D-14/D-15)
**What:** One pure function the whole system reads. Bookability is **derived**, never independently settable. `payouts_enabled` is a webhook-maintained cached flag on `user`.
**When to use:** Public detail page, host dashboard, and (forward) Phase 3/4/6.
```typescript
// src/lib/bookability.ts — the gate later phases read; cannot be bypassed because it derives from data.
export function deriveBookable(
  listing: { status: "draft"|"published"|"unlisted" },
  host: { emailVerified: boolean; payoutsEnabled: boolean },
): boolean {
  return listing.status === "published" && host.emailVerified && host.payoutsEnabled; // D-15
}
```
**Where it lives — recommendation:** Derive at **query time** from the joined `user` flags (no denormalized `is_bookable` column to drift). If Phase 4 search performance later needs it, add a denormalized cached column updated in the SAME webhook handler that flips `payouts_enabled` — but start derived. Auto-revert (D-14) is then free: when the webhook sets `payouts_enabled=false`, every derive flips to not-bookable instantly with zero per-listing writes.

### Pattern 6: Strict server-side publish gate (D-02)
**What:** Two Zod schemas. `draftSchema` (everything optional — autosave between steps). `publishSchema` (all core fields required + both rates + coordinates). The publish server action re-validates with `publishSchema` AND checks `≥3 photos` AND `host.emailVerified` server-side. **Never trust the client `status` field** — publishing is a server action that asserts the gate, mirroring the Phase-1 `input:false` capability guard.
```typescript
// src/lib/validation/listing.ts (shared client+server)
export const draftSchema = z.object({ title: z.string().max(120).optional(), /* …all optional… */ });
export const publishSchema = z.object({
  title: z.string().min(1), description: z.string().min(1),
  primarySpaceType: z.enum([...spaceTypeValues]),
  addressLine1: z.string().min(1), city: z.string().min(1), /* … */
  lat: z.number(), lng: z.number(),
  maxOccupancy: z.number().int().positive(),
  hourlyRateCents: z.number().int().positive(), dayRateCents: z.number().int().positive(),
});
// In the publish action: publishSchema.parse(row) + assert photoCount>=3 + assert host.emailVerified.
```

### Pattern 7: Stripe Connect Express — account + hosted onboarding (PAY-04)
**What:** On "Set up payouts," create (once) an Express account, store its id on the host, mint an Account Link, redirect. One account per host (D-14).
**When to use:** `src/app/actions/stripe-connect.ts`.
```typescript
// src/lib/stripe.ts — pin the apiVersion. SDK 22.x bundles 2026-05-27.dahlia.
// Source: docs.stripe.com/sdks/set-version + docs.stripe.com/connect/express-accounts [CITED]
import Stripe from "stripe";
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-05-27.dahlia" });

// action: startStripeOnboarding
async function startStripeOnboarding(userId: string, email: string, returnBase: string) {
  let acctId = /* host.stripeAccountId */;
  if (!acctId) {
    const account = await stripe.accounts.create({
      type: "express", country: "US", email,
      capabilities: { transfers: { requested: true }, card_payments: { requested: true } },
      business_type: "individual",
    });
    acctId = account.id;
    // persist acctId on the user row (server-side; NEVER client-settable) BEFORE redirecting.
  }
  const link = await stripe.accountLinks.create({
    account: acctId,
    refresh_url: `${returnBase}/host/payouts/refresh`, // re-mint a fresh link (links are single-use/expiring)
    return_url:  `${returnBase}/host/payouts/return`,
    type: "account_onboarding",
  });
  return link.url; // redirect host to Stripe-hosted KYC
}
```
**Timing (resolves the Claude's-discretion question):** Create the Express account **lazily** on first "Set up payouts" click — NOT at "Start hosting" (D-12 explicitly says onboarding is not pushed immediately, and avoids creating empty Stripe accounts for hosts who never finish). Account Links **expire and are single-use** — the `refresh_url` page must re-mint a fresh link. `[CITED: docs.stripe.com/api/account_links/create]`

### Pattern 8: The `account.updated` webhook (PAY-04, D-14) — the keystone
**What:** A Route Handler that reads the **raw body**, verifies the Stripe signature, dedupes by event id (idempotency), reads `account.payouts_enabled` / `charges_enabled`, and caches them on the host. This is the source of truth for bookability.
**When to use:** `src/app/api/stripe/webhook/route.ts`.
```typescript
// CRITICAL: runtime must be node (not edge) and the body must be the RAW bytes — never req.json() first.
// Source: docs.stripe.com/webhooks/signature + stripe-node README constructEvent [CITED]
export const runtime = "nodejs";       // signature verification needs raw body + node crypto
export async function POST(req: Request) {
  const body = await req.text();        // RAW string — do NOT parse first (whitespace/key-order changes break the sig)
  const sig = req.headers.get("stripe-signature")!;
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch { return new Response("Invalid signature", { status: 400 }); }

  // Idempotency: record event.id; if already processed, return 200 and skip (Stripe retries + may double-deliver).
  if (await alreadyProcessed(event.id)) return new Response("ok", { status: 200 });

  if (event.type === "account.updated") {
    const acct = event.data.object as Stripe.Account;
    // cache flags on the host whose stripeAccountId === acct.id (server/webhook-set ONLY)
    await updateHostPayoutFlags(acct.id, {
      payoutsEnabled: acct.payouts_enabled,
      chargesEnabled: acct.charges_enabled,
      detailsSubmitted: acct.details_submitted,
    });
    // D-14 auto-revert is automatic: deriveBookable() reads payoutsEnabled, so false → all listings not-bookable.
  }
  await markProcessed(event.id);
  return new Response("ok", { status: 200 }); // ALWAYS 200 on handled events so Stripe stops retrying
}
```
**Stripe fields on the host (add to `user` via Better Auth `additionalFields` OR a separate `host_payout` table keyed to user):** `stripeAccountId` (text, unique), `payoutsEnabled` (bool, default false, `input:false`), `chargesEnabled` (bool), `detailsSubmitted` (bool). **Recommendation:** put them on a **separate `host_payout` table** keyed 1:1 to `user.id` rather than Better Auth `additionalFields` — keeps the auth schema (CLI-regenerated) clean and avoids the `input:false` ceremony; the avatar/profile precedent shows additionalFields are for identity, not marketplace finance state. Either works; separate table is cleaner.
**Local dev:** `stripe listen --forward-to localhost:3000/api/stripe/webhook` prints the `whsec_…` signing secret; `stripe trigger account.updated` to exercise the handler. `[CITED: docs.stripe.com — Stripe CLI]`

### Anti-Patterns to Avoid
- **Routing gallery bytes through the Next.js server** — violates D-04; large files + serverless body limits. Use signed direct upload.
- **A client-settable `payouts_enabled` / `is_bookable` / `status=published` from the request body** — privilege escalation on money state. All three are server/webhook-set; mirror Phase-1 `input:false`.
- **Calling `req.json()` before `constructEvent`** — destroys the raw body; signature verification fails. Read `req.text()` first.
- **Running the webhook on the Edge runtime** — Stripe signature verification needs node crypto + raw body. Set `runtime = "nodejs"`.
- **Two plain lat/lng numeric columns "for now"** — forces a Phase-4 migration + backfill to PostGIS. Capture `geometry(point,4326)` + GiST index now.
- **A denormalized `is_bookable` column as the primary source** — drifts from `payouts_enabled`. Derive; cache only if measured to be needed.
- **Storing money as float/`money`/`numeric` without reason** — use integer cents to align with Stripe + avoid float error.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-to-reorder photos (+ keyboard a11y) | Custom HTML5 DnD + pointer math | `@dnd-kit/sortable` | Touch, keyboard, screen-reader announcements, collision detection — UI-SPEC mandates keyboard-operable reorder; dnd-kit ships it. |
| Webhook signature check | Manual HMAC of the payload | `stripe.webhooks.constructEvent` | Timestamp tolerance, replay window, multiple signing secrets — getting it wrong = forged events accepting fake payout state. |
| Connect onboarding / KYC UI | Your own identity/KYC forms | Stripe Express **hosted** onboarding (Account Links) | Compliance + bank verification + localization — explicitly forbidden to hand-roll (CLAUDE.md "What NOT to Use"). |
| Upload signature + direct upload plumbing | Custom presign + multipart | `cloudinary.utils.api_sign_request` + `CldUploadWidget` | Param-signing rules, progress, retries, CDN delivery. |
| Address autocomplete + geocoding | Your own place index | A geocoding provider (see §Open Questions) | Address normalization + coordinates are a deep domain; never reinvent. |
| Map render + fuzzed-circle | Canvas math | Provider map component (`react-leaflet` / `@vis.gl/react-google-maps` / Mapbox GL) + a circle layer | Tiles, zoom, projection, accessibility. |
| PostGIS point + radius | Haversine in app code | `geometry(point,4326)` + GiST (Drizzle built-in) | Indexed `ST_DWithin` in Phase 4 beats app-side distance math. |

**Key insight:** Every money-touching or compliance-touching surface in this phase (payout state, KYC, webhook trust) is a place where a hand-rolled solution is not just more code but a *liability*. The phase's correctness hinges on Stripe being the source of truth and the bookability gate being purely derived.

## Common Pitfalls

### Pitfall 1: Lat/lng axis swap in PostGIS / Drizzle geometry
**What goes wrong:** PostGIS POINT is `(longitude, latitude)` = `(x, y)`. Storing `(lat, lng)` silently puts every listing in the wrong hemisphere; Phase-4 radius search returns garbage.
**Why:** Humans say "lat, lng"; GIS stores "x=lng, y=lat."
**How to avoid:** In Drizzle xy mode, write `{ x: lng, y: lat }`. Add a unit test asserting a known coordinate round-trips. Document it at the column.
**Warning signs:** Pins appear off the coast of Africa (0,0-ish) or with axes transposed.

### Pitfall 2: Webhook body already parsed → signature fails
**What goes wrong:** Reading `req.json()` (or any middleware that buffers/parses) before `constructEvent` makes verification fail with "No signatures found matching."
**Why:** Re-serialized JSON differs in whitespace/ordering from the bytes Stripe signed.
**How to avoid:** `runtime="nodejs"`, `await req.text()` first, then verify. Ensure no auth/proxy middleware consumes the body for `/api/stripe/webhook`. **Phase-1 left `src/middleware.ts` in place** — confirm it does not buffer or 401 the webhook path (it's optimistic-only per STATE.md, but verify the matcher excludes `/api/stripe`).
**Warning signs:** Local `stripe listen` works but every event 400s; or middleware returns 401 before the handler.

### Pitfall 3: Cloudinary signature param mismatch → 401 on upload
**What goes wrong:** The server signs `{timestamp, folder}` but the client also sends `tags` or a `public_id`, so the signature doesn't cover the actual request → Cloudinary rejects.
**Why:** Every signed param (except api_key/resource_type/cloud_name/file) must be in the signature.
**How to avoid:** Keep the signed param set and the client param set identical and minimal. If you add eager transforms/tags, add them to `paramsToSign` too.
**Warning signs:** 401 "Invalid Signature" with a string-to-sign in the error.

### Pitfall 4: Treating "published" as "bookable"
**What goes wrong:** A later phase reads `status==published` and offers a real booking to a host who can't be paid → the core-value violation D-14/D-15 exists to prevent.
**Why:** Two different concepts conflated.
**How to avoid:** Expose ONLY `deriveBookable()` to downstream phases; never let Phase 3/4/6 read `status` directly for the sell decision. Add a test: published + `payouts_enabled=false` ⇒ `bookable=false`; flipping the flag flips bookability with no listing write.
**Warning signs:** Search includes payout-disabled hosts; book CTA enabled without payouts.

### Pitfall 5: Float / wrong type for money
**What goes wrong:** `$25.10` stored as float → `2510.0000001`; commission math (Phase 5) drifts.
**Why:** Binary floats can't represent decimal cents.
**How to avoid:** Integer cents (`hourlyRateCents`). Validate positive integers in `publishSchema`. Format at the edge for display.
**Warning signs:** Prices ending in stray decimals; totals off by a cent.

### Pitfall 6: Account Link reuse after expiry
**What goes wrong:** Caching the onboarding URL and reusing it → host hits an expired/used link.
**Why:** Account Links are single-use and short-lived by design.
**How to avoid:** Mint a fresh link on each "Set up payouts"/"Finish payout setup" click and on the `refresh_url` route. Never persist the URL.
**Warning signs:** "This link has expired" on the Stripe page.

### Pitfall 7: PostGIS extension missing in the test schema
**What goes wrong:** Integration tests replay migrations into an isolated schema (`tests/helpers/db.ts`); if `CREATE EXTENSION postgis` isn't idempotent/ordered, parallel workers fail or the `geometry` column DDL errors.
**Why:** The harness rewrites `"public".` → the test schema and runs statements directly; extensions are database-scoped, not schema-scoped.
**How to avoid:** `CREATE EXTENSION IF NOT EXISTS postgis;` as the first migration statement; the harness already runs against `postgis/postgis:18`, so the extension is available to install.
**Warning signs:** `type "geometry" does not exist` in integration tests.

## Code Examples

### Deriving bookability on the public detail page (RSC)
```typescript
// Source: composition of Pattern 3 + 5 [project pattern]
const [row] = await db.select().from(listing)
  .innerJoin(user, eq(listing.hostId, user.id)) // join host flags
  .where(eq(listing.id, params.id));
if (!row || row.listing.status !== "published") notFound(); // unlisted/draft 404 to the public (D-13)
const bookable = deriveBookable(row.listing, {
  emailVerified: row.user.emailVerified,
  payoutsEnabled: row.host_payout?.payoutsEnabled ?? false,
});
// render CTA: bookable ? <BookButton/> (coral) : <Button disabled>Not bookable yet</Button> (neutral)
```

### Reordering photos (server action, atomic position rewrite)
```typescript
// Source: project pattern — persist the new order from the dnd-kit result
"use server";
export async function reorderPhotos(listingId: string, orderedIds: string[]) {
  // session + ownership check first (like capability.ts)
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.update(listingPhoto).set({ position: i })
        .where(and(eq(listingPhoto.id, orderedIds[i]), eq(listingPhoto.listingId, listingId)));
    }
  }); // position 0 = cover (D-04)
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Stripe Node SDK **18.x** (CLAUDE.md) | **22.2.0** | 22.x line current as of 2026-05; 18.x is the `beta` alpha tag now | Install `stripe@^22`; pin `apiVersion: "2026-05-27.dahlia"`. Locked *intent* unchanged. `[VERIFIED: npm dist-tags]` |
| Connect `type: 'express'` only | Express still valid; **Accounts v2 API** recommended for brand-new platforms | Accounts v2 GA 2025-26 | v1 Express + Account Links remains fully supported and matches the lock — recommended here. `[CITED: docs.stripe.com/connect/accounts-v2]` |
| Cloudinary server `upload_stream` (Phase-1 avatar) | **Signed direct-to-client** for galleries | Phase-2 graduation (prescribed in `cloudinary.ts`) | Bytes bypass the server (D-04). |
| Custom PostGIS column hacks in Drizzle | **Built-in `geometry(point,srid)`** | drizzle-orm 0.31+ (installed 0.45.2) | No custom type needed; `mode:"xy"` + GiST index. `[VERIFIED: orm.drizzle.team]` |
| `numeric` money | **Integer minor units (cents)** | Long-standing marketplace norm; aligns with Stripe | Faster + exact + one money representation end-to-end. |

**Deprecated/outdated:**
- The `docs.stripe.com/connect/express-accounts` page is marked deprecated in favor of Accounts v2 docs, but the v1 Express *API* is not deprecated — only the doc page. `[CITED]`
- Stripe `apiVersion` names without the `.dahlia` suffix are older; SDK 22 expects the dated `.dahlia` form.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The user accepts upgrading Stripe SDK from the CLAUDE.md-locked 18.x to current 22.x (intent preserved, version corrected) | Standard Stack / State of the Art | LOW-MED — code targets a different SDK; flag because it touches a LOCKED CLAUDE.md row. Surface in discuss/plan. |
| A2 | v1 Express (`type:'express'`) is preferred over Accounts v2 for this greenfield platform | Alternatives / Pattern 7 | LOW — both use Account Links; v1 matches the lock. If user wants v2-only features later, account-creation code changes (link flow stays). |
| A3 | PostGIS enabled NOW (not deferred to Phase 4) | Alternatives / Pattern 1 | LOW — CLAUDE.md prescribes it; deferring forces a Phase-4 migration. |
| A4 | Money stored as integer cents, single currency `usd` default | Pattern 1 / Pitfall 5 | LOW — launch is single-region; `currency` column keeps it future-proof. |
| A5 | Stripe payout fields live on a separate `host_payout` table, not Better Auth `additionalFields` | Pattern 8 | LOW — either works; separate table avoids CLI-regen coupling. |
| A6 | Bookability derived at query time (no denormalized column until Phase-4 perf proves a need) | Pattern 5 | LOW — derive-first prevents drift; cache is an additive optimization. |
| A7 | Country fixed to `US` for Express accounts at launch | Pattern 7 | MED — Express `country` is set at creation and not easily changed; confirm the launch region's Stripe country. |
| A8 | The chosen geocoding/maps provider (see Open Questions) — recommendation is OSM/Photon+Leaflet for a cost-free single-city launch | Open Questions | MED — provider choice affects cost, API keys, and the autocomplete/map components built. Needs a user decision. |

## Open Questions

1. **Geocoding + maps provider (D-10/D-11) — needs a decision.**
   - What we know `[VERIFIED: provider pricing search, 2026]`: Google Places has **no meaningful free tier in 2026** + per-keystroke session billing (~$275/mo at 100k loads). Mapbox is cheaper (~50k free loads) but **Search Box bills per keystroke — debounce mandatory** or costs explode. Photon (Komoot, OSM-based) is **free** and purpose-built for autocomplete; Nominatim (OSM) is free with usage limits; LocationIQ offers a hosted OSM API (5k req/day free). `react-leaflet` 5.0.0 renders OSM tiles for free.
   - What's unclear: budget tolerance, data-quality bar for fitness venues, whether the team wants a paid-but-polished (Google/Mapbox) vs free-OSS (Photon + Leaflet) path.
   - **Recommendation:** For a single-city v1 with cost discipline (STATE.md "do not over-build"), use **Photon (or LocationIQ free tier) for autocomplete + `react-leaflet` (OSM tiles) for the map** — zero/near-zero cost, no per-keystroke billing, and the data model (structured address + lat/lng) is provider-agnostic so swapping to Google/Mapbox later is isolated to the location component. If the team prefers polish and accepts cost, `@vis.gl/react-google-maps` (Google) is the lowest-friction paid path. Decide before building the wizard location step.

2. **Express account `country` at launch (A7).**
   - What we know: Express `country` is set at account creation; the launch is single-region.
   - What's unclear: the actual launch country (CLAUDE.md/PROJECT say "single city/region" without naming it).
   - Recommendation: confirm the country in planning; default `US` in examples. Affects KYC requirements + supported currency.

3. **Listing slug/URL scheme (Claude's discretion).**
   - What we know: detail page is `/listings/[id]`; a human slug (`/listings/[id]/[slug]`) aids SEO/sharing.
   - Recommendation: ship `/listings/[id]` now (id is the canonical key); add an optional trailing slug later — no data-model impact.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL + PostGIS | Listing geo (D-10) | ✓ (Docker `postgis/postgis:18`) | PG18 + PostGIS 3.x | — (already the project image per STATE.md 01-01) |
| Node.js | Stripe SDK (engines `>=18`) | ✓ | project Node | — |
| Cloudinary account + env vars | Photo upload (D-04) | ⚠ creds-dependent | n/a | Mocked in tests (`tests/helpers/mocks.ts`); real upload is a manual UAT (per 01-HUMAN-UAT) |
| Stripe account + test keys + `whsec` | PAY-04 onboarding + webhook | ✗ (not yet set) | n/a | Stripe **test mode** + **Stripe CLI** `stripe listen`/`stripe trigger` for local dev; mock `constructEvent` in unit tests |
| Stripe CLI | Local webhook forwarding | ⚠ likely not installed | n/a | Install via `scoop install stripe` / Stripe docs; only needed for local webhook dev, not CI (mock the signed event with `generateTestHeaderString`) |
| Geocoding/maps provider key | D-10/D-11 | ✗ (pending provider decision) | n/a | OSM/Photon/Leaflet need NO key; Google/Mapbox need a key + billing |

**Missing dependencies with no fallback:** None block code authoring. Live Stripe onboarding + live photo upload + live geocoding are **credential-dependent manual UATs** (consistent with Phase-1's pattern of mocked tests + human UAT for Cloudinary/email/OAuth). Document them in an `02-HUMAN-UAT.md`.

**Missing dependencies with fallback:**
- Stripe webhook → mock `stripe.webhooks.generateTestHeaderString` + `constructEvent` in Vitest (the SDK supports this; see §Validation).
- Cloudinary → already globally mocked in `tests/setup.ts`.

## Validation Architecture

> `workflow.nyquist_validation: true` — section included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.8 (unit + integration, node env; jsdom per-file pragma) + Playwright 1.60 (E2E) `[VERIFIED: package.json]` |
| Config file | `vitest.config.ts` (include `tests/**/*.test.ts(x)`), `playwright.config.ts` |
| Quick run command | `npm test` (→ `vitest run`, single pass, no watch) |
| Full suite command | `npm test && npm run test:e2e` |
| Integration DB | Isolated per-worker Postgres schema via `tests/helpers/db.ts` (replays `./drizzle` migrations); test auth via `tests/helpers/auth.ts` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LIST-01 | Create/edit listing persists core fields under the owner | integration | `vitest run tests/listing/crud.test.ts` | ❌ Wave 0 |
| LIST-02 | Photo metadata persists + reorder rewrites positions atomically; cover = pos 0 | integration | `vitest run tests/listing/photos.test.ts` | ❌ Wave 0 |
| LIST-02 | Sign endpoint requires session + signs only allowed params | unit | `vitest run tests/listing/cloudinary-sign.test.ts` | ❌ Wave 0 |
| LIST-03 | Both rates required to publish; stored as integer cents; positive | unit | `vitest run tests/validation/listing-schema.test.ts` | ❌ Wave 0 |
| LIST-04 | `booking_mode` stored (instant/request), defaults sane | integration | (covered by crud.test.ts) | ❌ Wave 0 |
| LIST-05 | status transitions draft→published gated; unlist preserves data; soft-delete sets deletedAt | integration | `vitest run tests/listing/status-gate.test.ts` | ❌ Wave 0 |
| LIST-05/D-02 | Publish blocked when <3 photos OR email unverified OR missing core field | integration | (status-gate.test.ts) | ❌ Wave 0 |
| LIST-06 | Public detail page reachable without session; unlisted/draft 404 to public | integration/E2E | `playwright test e2e/public-listing.spec.ts` | ❌ Wave 0 |
| PAY-04 | `account.updated` with payouts_enabled=true flips host flag; =false auto-reverts bookability | integration | `vitest run tests/stripe/webhook-account-updated.test.ts` | ❌ Wave 0 |
| PAY-04 | Webhook rejects an invalid signature (400); idempotent on duplicate event id | unit | `vitest run tests/stripe/webhook-signature.test.ts` | ❌ Wave 0 |
| D-15 | `deriveBookable` truth table (published×verified×payouts) | unit | `vitest run tests/listing/bookability.test.ts` | ❌ Wave 0 |
| D-01/D-10 | Coordinates round-trip (no lat/lng axis swap) | integration | `vitest run tests/listing/geo-roundtrip.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** the single relevant test file (e.g. `vitest run tests/listing/bookability.test.ts`) — < 5s for unit, a few seconds for the schema-isolated integration file.
- **Per wave merge:** `npm test` (full Vitest suite — currently 54 tests + new ones).
- **Phase gate:** `npm test && npm run test:e2e` green before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `tests/listing/bookability.test.ts` — pure `deriveBookable` truth table (D-15)
- [ ] `tests/validation/listing-schema.test.ts` — draft vs publish Zod, integer-cents, both-rates (LIST-03/D-02)
- [ ] `tests/listing/crud.test.ts` — create/edit/ownership (LIST-01/04)
- [ ] `tests/listing/photos.test.ts` — persist + atomic reorder + cover (LIST-02)
- [ ] `tests/listing/cloudinary-sign.test.ts` — session gate + signed-param set (LIST-02)
- [ ] `tests/listing/status-gate.test.ts` — publish gate, unlist, soft-delete (LIST-05/D-02)
- [ ] `tests/listing/geo-roundtrip.test.ts` — PostGIS point round-trip, axis order (D-10)
- [ ] `tests/stripe/webhook-signature.test.ts` — `generateTestHeaderString` + invalid-sig 400 + idempotency (PAY-04)
- [ ] `tests/stripe/webhook-account-updated.test.ts` — flag flip + auto-revert (PAY-04/D-14)
- [ ] `e2e/public-listing.spec.ts` — un-gated view + draft/unlisted 404 (LIST-06)
- [ ] Shared: extend `tests/helpers/mocks.ts` with a Stripe mock (account create/retrieve + `constructEvent`/`generateTestHeaderString`); ensure `CREATE EXTENSION IF NOT EXISTS postgis` is idempotent in the migration so the test harness replays it cleanly.
- [ ] Framework install: none — Vitest + Playwright already present.

## Security Domain

> `security_enforcement: true`, `security_asvs_level: 1`, `security_block_on: high` — section included.

### Applicable ASVS Categories (L1)
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V1 Architecture | yes | Bookability + payout state derived/server-set only; webhook is the trust boundary for payout state |
| V2 Authentication | reuse | Better Auth session on every host action (`auth.api.getSession`) — Phase-1 foundation |
| V4 Access Control | yes | Every listing/photo/stripe action asserts `session.user.id === listing.hostId` (IDOR guard); public detail page intentionally anonymous but only exposes `published` |
| V5 Input Validation | yes | Shared Zod re-validated server-side (draft vs publish); never trust client `status`/`price`/`payouts_enabled`; validate uploaded image type/size before signing |
| V6 Cryptography / Stored secrets | yes | `CLOUDINARY_API_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` server-only (no `NEXT_PUBLIC_`); fail-closed on missing prod secrets (Phase-1 BETTER_AUTH_SECRET precedent) |
| V13 API / Webhooks | yes | `stripe.webhooks.constructEvent` signature verification + idempotency by event id; webhook always returns 200 on handled events |
| V12 Files/Resources | yes | Signed Cloudinary uploads scoped to `fitout/listings/<listingId>`; verify listing ownership before minting a signature; orphan cleanup via `uploader.destroy` |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Client self-grants `payouts_enabled` / `status=published` / `is_bookable` | Elevation of Privilege | Server/webhook-set only; mirror Phase-1 `input:false`; publish is a gated server action |
| Forged `account.updated` webhook → fake payout state | Spoofing / Tampering | `constructEvent` signature verification (`STRIPE_WEBHOOK_SECRET`); reject 400 on bad sig |
| Webhook replay / double-delivery | Tampering | Idempotency: persist + check `event.id` before applying |
| IDOR — edit/photo/onboard another host's listing/account | Elevation of Privilege | Ownership check (`hostId === session.user.id`) in every action + before signing uploads |
| Unauthenticated Cloudinary upload abuse | Tampering / DoS | Sign endpoint requires a session + listing ownership; rate-limit (carry forward WR-06) |
| Address PII leak before booking (exact address) | Information Disclosure | D-09 default approximate; exact only after confirmed booking (future); public projection excludes exact street until allowed |
| Secret exposure to client | Information Disclosure | Secrets server-only; webhook on `runtime=nodejs`; no secret in client bundles |

**STATE.md prerequisite (carry-forward, security_block_on=high):** Before wiring Stripe payouts to the host/`canHost` flow, close **Phase-1 deferred WR-06** (rate-limit + audit trail on capability-activate server actions) and **WR-04** (email-send retry/observability). Tracked in `01-REVIEW.md` / `01-SECURITY.md`. The planner should sequence WR-06 (rate-limit + audit on the new sign endpoint + onboarding action mirrors this) so it is satisfied as part of, or before, the Stripe onboarding task.

## Project Constraints (from CLAUDE.md)

Actionable directives the planner MUST honor (LOCKED stack):
- **Stripe Connect Express accounts + Stripe-hosted onboarding** (NOT Standard accounts). **Separate charges & transfers** intent (NOT destination charges) — though actual charging is Phase 5; here it's account setup + the `payouts_enabled` signal only.
- **Pin the Stripe SDK `apiVersion`.** (Version-currency note: install `stripe@^22`, not 18.x — see §State of the Art.)
- **Cloudinary** for listing photos (Cloudinary chosen over UploadThing in Phase-1 D-11).
- **Drizzle ORM** — listing/photo/amenity tables **hand-authored** in `src/lib/db/schema.ts`; migrations via drizzle-kit. **No exclusion constraint** this phase (that's Phase 3).
- **PostGIS `geography/geometry(Point,4326)` + GiST** for geo (enable now per D-10).
- **`timestamptz` everywhere** — never naive timestamps. (Existing convention in `schema.ts`.)
- **React Hook Form + Zod**, re-validate on the server, **never trust the client for price/capacity/status**.
- **shadcn/ui + Radix + Tailwind v4** (official registry only — no third-party blocks, per UI-SPEC Registry Safety).
- **What NOT to Use:** no application-level booking checks (Phase 3), no Connect Standard, no destination charges, no MongoDB, no rolling your own KYC/payout/escrow, no hand-rolled calendar/date-picker (none needed this phase), no naive timestamps, no float money.
- **GSD Workflow Enforcement:** file changes go through a GSD command (this is research only — no code edits).

## Runtime State Inventory

> Greenfield-additive phase (new tables, new external integrations). No rename/refactor/migration of existing strings. Most categories are N/A, but the relevant cross-system state is documented because Stripe + Cloudinary introduce out-of-DB state.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | New tables only (`listing`, `listing_photo`, `listing_amenity`, `listing_activity_tag`, host payout fields). No existing data renamed. | New migrations; nothing to migrate. |
| Live service config | **Stripe**: a Connect platform + webhook endpoint must be registered (dashboard or CLI) — config lives in Stripe, not git. **Cloudinary**: the `fitout/listings/<id>` folder + (optional) upload preset live in Cloudinary. | Register webhook endpoint + obtain `whsec`; document in `02-HUMAN-UAT.md`. No git artifact. |
| OS-registered state | None. | None. |
| Secrets/env vars | NEW env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY` (client), geocoding provider key (if Google/Mapbox chosen). Cloudinary vars already exist from Phase 1. | Add to `.env.example`; fail-closed on missing prod secrets (BETTER_AUTH_SECRET precedent). |
| Build artifacts | `src/lib/db/schema.ts` change → must run `drizzle-kit generate` + apply; `next-cloudinary`/`stripe`/`@dnd-kit/*` added to `package.json`. | Generate migration + `npm install`. |

## Sources

### Primary (HIGH confidence)
- npm registry (`npm view`) — verified versions: stripe 22.2.0 (dist-tags: latest=22.2.0, beta=18.6.0-alpha; published 2026-05-27), drizzle-orm 0.45.2, drizzle-kit 0.31.10, cloudinary 2.10.0, next-cloudinary 6.17.5, @dnd-kit/core 6.3.1, @dnd-kit/sortable 10.0.0, react-leaflet 5.0.0, @vis.gl/react-google-maps 1.8.3, @mapbox/search-js-react 1.5.1, date-fns 4.4.0.
- Context7 `/stripe/stripe-node` — AccountLink create params, `webhooks.constructEvent`/`generateTestHeaderString`, Controller (`stripe_dashboard.type:'express'`), `account.updated` event types, RequestOptions `stripeAccount`/`stripeContext`.
- orm.drizzle.team/docs/guides/postgis-geometry-point — `geometry('location',{type:'point',mode:'xy',srid:4326})`, `CREATE EXTENSION postgis` via `generate --custom`, GiST index `.using('gist', t.location)`.
- orm.drizzle.team/docs/sql-schema-declaration — pgEnum, references/onDelete, indexes, generated identity.
- docs.stripe.com/connect/express-accounts + /api/account_links/create — `accounts.create type=express`, `accountLinks.create` (refresh_url/return_url/type), retrieve `charges_enabled`/`details_submitted`, `account.updated` webhook.
- docs.stripe.com/sdks/set-version + stripe-node README — pin `apiVersion`; SDK 22 default `2026-05-27.dahlia`; `constructEvent`/`generateTestHeaderString`.
- docs.stripe.com/webhooks/signature — raw-body requirement; never parse before verifying.
- cloudinary.com/documentation/signatures + /delete_assets + support.cloudinary.com signed-upload — `api_sign_request` signed param rules, `uploader.destroy({invalidate:true})`.
- Project files: `src/lib/cloudinary.ts`, `src/lib/auth.ts`, `src/lib/db/schema.ts`, `src/app/actions/*`, `tests/helpers/db.ts`, `vitest.config.ts`, `package.json`, `.planning/config.json`.

### Secondary (MEDIUM confidence)
- docs.stripe.com/connect/accounts-v2 (via search) — Accounts v2 recommended for new platforms; Account Links remain the onboarding path for both v1 and v2.
- next.cloudinary.dev/clduploadwidget/signed-uploads (via search) — `CldUploadWidget signatureEndpoint`; protect the endpoint (auth + rate-limit).
- Geocoding/maps pricing comparisons (geopostcodes, buildmvpfast, radar, woosmap — 2026) — Google no free tier + session billing; Mapbox per-keystroke billing; Photon/Nominatim/OSM free; LocationIQ 5k/day free.
- Money-in-Postgres guides (Crunchy Data, PostgreSQL docs) — integer cents vs numeric tradeoffs; avoid `money`/float.
- Next.js App Router Stripe webhook guides (maxkarlsson, kitson-broadhurst, dev.to) — `req.text()` raw body, middleware-401 caveat.

### Tertiary (LOW confidence — flagged for validation)
- Exact current default `apiVersion` string for SDK 22.2.0 (`2026-05-27.dahlia` vs `2026-03-25.dahlia`): two sources gave slightly different values; **confirm by reading the installed SDK's `Stripe.PACKAGE_VERSION`/`apiVersion` after `npm install`** and pin to that exact string.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified against npm; only the Stripe major-version drift vs CLAUDE.md needs user acknowledgment (A1).
- Architecture (bookability gate, webhook, data model): HIGH — patterns cross-verified against Stripe docs + Drizzle docs + the established Phase-1 patterns.
- Stripe v1-vs-v2 choice: MEDIUM — both valid; v1 Express recommended to honor the lock (A2).
- Geocoding/maps provider: MEDIUM — pricing verified; the choice is a user decision (Open Question 1 / A8).
- Pitfalls: HIGH — drawn from official docs (webhook raw body, axis order, signed-param match) + the project's own test harness.

**Research date:** 2026-06-04
**Valid until:** 2026-07-04 (30 days) — except the Stripe SDK/`apiVersion` line, which moves fast (~1-2 weeks); re-confirm the pinned `apiVersion` against the installed package at implementation time.
