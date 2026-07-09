# Phase 2: Listings & Host Onboarding - Context

**Gathered:** 2026-06-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Turn the host **capability** (built in Phase 1) into a real, **sellable product**. A host creates/edits a listing (title, description, space type, address, capacity, amenities, photos, hourly + day pricing, booking mode, status), anyone can view a **published** listing's public detail page, and the host completes **PayMongo hosted payout onboarding** (Platforms / Linked Accounts). The signature constraint: **bookability — not listing creation/publishing — is gated on `payouts_enabled`** (the cached gate flag, set from PayMongo `merchant.activated`), so a slot can never be sold to a host who cannot be paid.

**In scope:** listing data model (owned by the Phase-1 `user`), the multi-step listing creation/edit wizard, listing photo gallery (Cloudinary), pricing fields, booking-mode flag (instant vs request-to-book — stored, not yet wired), status lifecycle (draft/published/unlisted), the public listing detail page, PayMongo hosted payout onboarding (Linked Accounts), the `merchant.activated`-driven bookability gate, and enforcement of the Phase-1 soft email-verification gate at publish.

**Out of scope (later phases):**
- Availability rules, operating hours, real calendar, and the double-booking exclusion constraint → **Phase 3**
- Search/discovery and the actual booking transaction/CTA behavior → **Phase 4** (the book CTA in Phase 2 is a placeholder reflecting bookability state)
- Charging the booker, commission, payouts/transfers, refunds → **Phase 5+**
- Cancellation policy tiers (the per-listing policy field is **deferred to Phase 7**, where tiers are defined)
- Group bookings / RSVP → **Phase 8** (capacity field defined here is the source it will use)

</domain>

<decisions>
## Implementation Decisions

### Listing Creation Flow
- **D-01:** Listing creation/edit uses an **Airbnb-style guided multi-step wizard** (e.g. type → details → location → photos → pricing → booking mode → review) with progress indication and the listing **saved as a draft between steps**. Needs a new stepper + select/combobox (shadcn `form`/`input`/`textarea`/`card`/`dialog` already exist; no date components — those are Phase 3).
- **D-02:** **Draft → Published gate is strict:** a listing can only be published when ALL core fields are complete (title, description, space type, address, capacity, both rates) **AND** there are **≥3 photos** **AND** the host's **email is verified**. This is where the Phase-1 soft email-verification gate (01-CONTEXT D-07) is enforced. Publishing does **not** require payout onboarding (see D-12).
- **D-03:** **Both an hourly rate and a day rate are required** on every listing (flat rates only — dynamic/surge/tiered pricing is out of scope per REQUIREMENTS). Single currency (single-region launch). How hourly and day bookings coexist on a calendar/day is a **Phase 3** concern (slot granularity is an open Phase-3 decision); do not solve it here.
- **D-04:** **Photos:** minimum **3** to publish, the **first photo is the cover**, drag-to-reorder (LIST-02 "order multiple photos"). Generous max (planner's call, ~20). Upload via **signed direct-to-Cloudinary client uploads** (`cloudinary.utils.api_sign_request`) — the graduation path already noted in `src/lib/cloudinary.ts`; do NOT route large galleries through the server like the Phase-1 avatar. Suggested folder convention `fitout/listings/<listingId>`.

### Space Taxonomy & Amenities
- **D-05:** Space types come from a **fixed curated list** (seed/admin-controlled enum), NOT free-form tags — this keeps Phase-4 search filters clean. A listing has **one canonical primary space type** plus **optional secondary activity tags** (covers multi-use venues, e.g. a gym that also offers a basketball court, while preserving one category for cards/sorting).
- **D-06:** **Amenities** are a **fixed curated checklist** (multi-select), not free text — consistent amenity filters in Phase 4.
- **D-07:** **Capacity = a single "max occupancy" integer** per listing (max people allowed in the space at once). This is the **single source of truth** Phase 8 uses to hard-cap confirmed group RSVPs (GROUP-05). **Resolves the flagged open product decision "Group capacity source."**
- **D-08:** **Locked v1 starter vocabulary** (planner/researcher may refine wording/grouping; extendable later via seed/admin):
  - **Primary space types:** Pickleball court · Tennis court · Basketball court · Multi-sport court · Gym / fitness floor · Yoga studio · Dance / movement studio · Pilates / barre studio · Martial arts / boxing gym · Home / private gym · Multi-purpose / event space
  - **Activity tags (optional):** pickleball, tennis, basketball, volleyball, badminton, futsal/soccer, yoga, pilates, barre, dance, HIIT / cross-training, weightlifting, boxing / MMA, climbing, general fitness
  - **Amenities:** Showers · Lockers / changing room · Restrooms · Parking · Equipment provided · Air conditioning / heating · Wi-Fi · Drinking water · Sound system · Mirrors · Accessible (step-free) · Towels · First-aid / AED

### Location & Privacy (Listing Detail Page)
- **D-09:** Each listing has a **"show exact address" toggle, defaulting to approximate**. Approximate = neighborhood + a fuzzed map area; exact street address is revealed **only after a confirmed booking** (a future-phase reveal — Phase 2 just stores the toggle + behaves accordingly on the public page). Commercial venues opt to show exact; privacy-sensitive home/private gyms stay fuzzy.
- **D-10:** Location capture uses **address autocomplete** (Places-style) and **stores structured address + lat/lng coordinates now**, so Phase-4 radius search is not blocked. The geocoding provider and whether to enable PostGIS (CLAUDE.md prescribes `geography(Point,4326)` + GiST; a stack variant defers it) is a **planner/research** decision — but coordinates MUST be captured this phase.
- **D-11:** The v1 listing detail page **shows a map** with an approximate pin/area (fuzzed circle when approximate; exact pin when the host shows exact / after booking). This is the single-listing map, distinct from the v2 map-search feature (DISC-01). Adds a maps-embed dependency.
- **D-11b:** **No hard region geofence** on listing addresses — allow any address; rely on search to surface local results. Keeps the data model region-capable per the PROJECT constraint without baking in multi-region logic.

### PayMongo Onboarding & the Bookability Gate
- **D-12:** Host can create, edit, **and publish** listings with **no payout setup yet**; a **persistent banner/checklist** nudges them to finish payout setup. Payout onboarding is required **only to make a listing bookable** (matches SC#1 + SC#4). NOT pushed immediately on "Start hosting," NOT blocking publish.
- **D-13:** A published-but-not-yet-payable listing's **public detail page is viewable** (per SC#3 — photos, price, description, location) with the **book CTA disabled / "not bookable yet"**; the host sees a "finish payout setup to accept bookings" prompt. (Actual booking is Phase 4+, so the CTA is a state-reflecting placeholder here.)
- **D-14:** **Bookability is a live, webhook-driven state.** It is computed from the host's cached `payouts_enabled` flag, set from PayMongo `merchant.activated` / `activation_status: activated` (tracked via the `merchant.activated` webhook — PAY-04). If the host's account is later **declined/deactivated** (`merchant.declined`), the host's listings **immediately auto-revert to not-bookable** (and drop from search). **One PayMongo Linked Account per host** (`user`); all of that host's listings share it.
- **D-15:** **Bookability formula (intent):** a listing is bookable ⇔ `status == published` AND host `email_verified` AND host `payouts_enabled`. Bookability is the gate the rest of the system reads; "published" alone never implies sellable.
- **D-16 (forward intent for Phase 4):** Published-but-not-bookable listings are **excluded from search/discovery** (avoid booker dead-ends — demand-side first), while their detail page remains directly viewable by link. Captured now so Phase 4 honors it.

### Resolved Open Questions (post-research — 2026-06-04)
- **D-17:** ~~**Stripe SDK = `stripe@^22`** (22.2.x), `apiVersion` pinned to `2026-05-27.dahlia`. CLAUDE.md's `18.x` row is **stale** (18.x is now only on the alpha `beta` tag); the locked *intent* — Express accounts, Stripe-hosted onboarding, separate charges & transfers, pinned `apiVersion` — is fully preserved on 22.x. The version drift is recorded in STATE.md.~~
  - **SUPERSEDED 2026-07-09 by D-20 (PayMongo)** — Stripe SDK/Connect is no longer used. PayMongo has **no official SDK**; Plan 06 builds a thin `fetch` REST wrapper (`src/lib/paymongo.ts`, HTTP Basic auth with the secret key as username). No `apiVersion` pin applies. (Kept here for traceability — this is the canonical record of the retired decision.)
- **D-18:** **Geocoding + maps = Photon/LocationIQ autocomplete + react-leaflet (OpenStreetMap tiles)** — cost-disciplined for the single-city launch (no per-keystroke billing). The listing model stores structured address + lat/lng **provider-agnostically** (D-10), so the provider stays swappable. Research recommends **enabling PostGIS this phase** (Drizzle `geometry(..., { type:'point', mode:'xy', srid:4326 })`; local image is already `postgis/postgis:18`; custom `CREATE EXTENSION IF NOT EXISTS postgis` ordered first in the migration) — D-10 left enablement to the planner, who confirms based on this research. Mind the PostGIS `x=lng, y=lat` axis-swap pitfall.
- **D-19:** ~~**Stripe Connect Express launch country = `US`** — connected accounts created with `country: 'US'`. Read from config/env (e.g. `STRIPE_CONNECT_COUNTRY`, default `US`) rather than hardcoded, but US is the launch market.~~
  - **SUPERSEDED 2026-07-09 by D-20 (PayMongo)** — Stripe SDK/Connect is no longer used. PayMongo is **PH-native**; there is **no country/env toggle** (`STRIPE_CONNECT_COUNTRY` is dropped). (Kept here for traceability — this is the canonical record of the retired decision.)

### Claude's Discretion
- **"Unlisted" status semantics:** a previously-published listing the host takes off-market — hidden from the public, **keeps all data, re-publishable**. (status enum: `draft` / `published` / `unlisted`.)
- **Edits to a published listing go live immediately** — no moderation/review queue in v1.
- **Soft-delete / archive** listings rather than hard-delete (forward-safe for when bookings FK to listings in later phases).
- Listing detail page **URL/slug** scheme; exact max photo count; image transform/thumbnail presets via Cloudinary; precise wizard step grouping and field-level validation messages — standard approaches, planner/researcher's call.
- **PayMongo Linked-Accounts specifics** (Linked-Account creation timing, hosted onboarding link generation, `merchant.activated` / `activation_status` / wallet `status` handling, `Paymongo-Signature` webhook verification, tunnel (ngrok/cloudflared) for local webhook dev) — follow CLAUDE.md "Marketplace Payments" guidance; researcher refines.
- **Lightweight cold-start seed tooling** (a handful of demo listings) is acceptable for the planner to add — the `role` field already exists for an admin hook — but **do not over-build** (per STATE.md note). Not a user-facing feature.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prescriptive Stack (LOCKED — read first)
- `CLAUDE.md` — full prescriptive stack. For this phase specifically:
  - **§ "Marketplace Payments — Prescriptive Detail"** + the PayMongo rows (D-20): **PayMongo Platforms / Linked Accounts** (hosted-redirect KYC), **hold-until-session payout** (collect the full amount to the platform wallet → HOLD → on-demand `inhouse` `POST /v2/batch_transfers` of (booking − commission) after the session; do NOT use PayMongo "payment splitting"), `merchant.activated` / `activation_status` / wallet `status` webhook signals, **no official SDK** (thin `fetch` REST wrapper), **`Paymongo-Signature`** HMAC-SHA256 webhook verification + **`Idempotency-Key`** on POSTs, and a **tunnel (ngrok/cloudflared)** for local webhook forwarding (no Stripe-CLI equivalent).
  - **Cloudinary** for listing photo upload/delivery (UploadThing is the named alternative variant — Cloudinary chosen in Phase 1 D-11 for galleries/transforms).
  - **Drizzle ORM 0.44+ / drizzle-kit** — new `listing` (+ photo/amenity) tables are **hand-authored** in `src/lib/db/schema.ts` (Better Auth only owns the auth tables); generate migrations with drizzle-kit. **PostGIS / `geography(Point,4326)` + GiST** for geo (see D-10; enablement is a planner call).
  - **Next.js 16.2 App Router + React 19 + TS 5.7+**, **React Hook Form + Zod** (shared client/server validation — re-validate on the server, never trust the client for price/capacity), **shadcn/ui + Radix + Tailwind v4**.
  - **"What NOT to Use"** — no application-level booking checks (Phase 3); do NOT use PayMongo **"payment splitting"** (it pays the host at settlement — always collect → HOLD → on-demand `inhouse` transfer after the session; **never pay the host at booking time**); no naive timestamps (`timestamptz` everywhere).

### Product Intent
- `.planning/PROJECT.md` — vision, core value ("Find & book a space"), constraints (responsive web, single-region but region-capable model, real payments), Key Decisions (host's choice instant vs request-to-book; demand-side first).
- `.planning/REQUIREMENTS.md` — **LIST-01..LIST-06, PAY-04** (the requirements this phase satisfies); the **Out of Scope** table (no dynamic pricing, no add-ons/extras) and **Open Product Decisions** (this phase resolves "Group capacity source" → D-07).
- `.planning/ROADMAP.md` § "Phase 2: Listings & Host Onboarding" — goal + the 4 success criteria this phase is judged against.

### Prior-Phase Context (carry forward)
- `.planning/phases/01-auth-accounts/01-CONTEXT.md` — D-05 (Stripe payout/KYC deferred to Phase 2), D-07 (soft email-verification gate — enforced at publish here), D-09 (full name stored privately, reused for Stripe KYC), D-11 (Cloudinary chosen for Phase-2 galleries), D-04 (distinct host dashboard surface).
- `.planning/STATE.md` § Blockers/Concerns — **before wiring Stripe payouts to `canHost`, close Phase-1 deferred WR-06 (rate-limit + audit trail on capability-activate server actions) and WR-04 (email-send retry/observability)**; cold-start liquidity / seed-tooling note ("do not over-build").
- `.planning/phases/01-auth-accounts/01-REVIEW.md` + `01-SECURITY.md` — where WR-06 / WR-04 are tracked (deferred).

_No external ADRs or design specs beyond the above — decisions are fully captured here + these project docs._

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/lib/cloudinary.ts`** — `uploadAvatar` via server `upload_stream`. Its header comment **prescribes the Phase-2 path**: "graduate to **signed direct-to-Cloudinary client uploads** (`cloudinary.utils.api_sign_request`)" for galleries. Reuse the configured client; add a sign-request endpoint.
- **`src/app/(host)/host/page.tsx`** — host dashboard with a **disabled "Create a listing (coming in Phase 2)" CTA** — the ready seam to wire to the new wizard. The `(host)` route group's **layout is the real `canHost` gate**; listing creation/management lives under it (e.g. `(host)/host/listings/...`).
- **`src/lib/db/schema.ts`** — the Phase-1 `user` table is the **FK ownership root** for new `listing` tables. `firstName`/`lastName` stored privately → reused for payout (PayMongo) KYC. `role` (default `user`) → admin/seed hook. All timestamps are `timestamptz` (keep the convention).
- **`src/lib/validation/` (auth.ts, profile.ts)** — established **Zod schema** pattern (shared client + server). Add `listing.ts`.
- **`src/app/actions/`** — server-actions directory; the Phase-1 pattern is RHF + zodResolver client-side, same schema re-validated in the server action. Capability/privileged updates use a session-checked `db.update`.
- **shadcn/ui present:** `avatar, button, card, dialog, dropdown-menu, form, input, label, textarea`. **Will need to add:** select/combobox (space type), checkbox/toggle (amenities, booking mode, show-exact), a stepper, and an image-gallery/upload component. Date pickers are NOT needed until Phase 3.

### Established Patterns
- **Route groups:** `(auth)` logged-out, `(app)` booker shell, `(host)` host dashboard (canHost-gated layout). Public listing detail page (LIST-06 "anyone can view") should be reachable **without** auth — place outside the gated groups (e.g. a public `/listings/[id]` or `(app)` route that doesn't require a session).
- **Server-side trust:** never trust the client for price/capacity/status — re-validate in the server action (mirror Phase-1 `input:false` capability handling). The `payouts_enabled` flag is **server/webhook-set only**, never client-settable.
- **Migrations:** drizzle-kit generates from schema; hand-edit SQL only for constructs Drizzle can't express (none required this phase — the exclusion constraint is Phase 3).

### Integration Points
- New `listing` (+ `listing_photo`, amenity/activity join or array columns) tables FK to `user.id`.
- A **PayMongo Linked-Account record per host** (`paymongoAccountId` + `activation_status` / `payouts_enabled` cached flags) — a new table (`host_payout`) keyed to `user`; updated by the `merchant.activated` webhook handler (new `src/app/api/paymongo/webhook` route).
- **Cloudinary** sign-request endpoint + the existing config power the gallery.
- **Resend** (set up in Phase 1) is available if any host onboarding email is wanted (optional this phase).
- Bookability flag/derivation here is read by **Phase 3** (availability/calendar), **Phase 4** (search inclusion + book CTA), and **Phase 6** (instant vs request-to-book fork — the `booking_mode` stored here).

</code_context>

<specifics>
## Specific Ideas

- **"Mimic Airbnb"** continues from Phase 1 into the listing surface: a **guided multi-step creation wizard** (D-01), **approximate-location-until-booked** privacy default with a per-listing exact-address toggle (D-09), first-photo-as-cover gallery (D-04).
- **The bookability gate is the architectural keystone of this phase** — it is a **live, webhook-driven** property (`payouts_enabled` set via `merchant.activated`), not a one-time check, and it auto-reverts (D-14). Built here so it can never be bypassed by later phases.
- Pricing is deliberately **both-rates-required** (D-03) — the host's choice between instant/request-to-book is stored as a `booking_mode` flag now but only *wired* in Phase 6.

</specifics>

<deferred>
## Deferred Ideas

- **Per-listing cancellation policy selection** — Phase 7 success criteria reference "the listing's named cancellation policy tier," but the tiers themselves don't exist yet. Add the cancellation-policy field to the listing **in Phase 7** when tiers are defined (or revisit if Phase 5 needs it earlier). Not built in Phase 2.
- **Availability / operating hours / blocks / real calendar** — Phase 3 (the listing detail page shows a *placeholder/coming-soon* for availability in Phase 2; the real calendar is Phase 3).
- **Actual search & discovery** (filters built on the curated taxonomy/amenities/capacity) — Phase 4. The vocabulary is locked now so Phase 4 filters are ready.
- **Real booking + book-CTA behavior, instant vs request-to-book lifecycle** — Phase 4/6. Booking mode is *stored* here, *wired* later.
- **Map view of search results (DISC-01)** — v2; the v1 single-listing map (D-11) is separate.
- **Richer host/listing trust content** (reviews, host bio surface, verification badges) — v2 / future phases.

</deferred>

---

*Phase: 2-Listings & Host Onboarding*
*Context gathered: 2026-06-03*
