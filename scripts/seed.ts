// D-38 dev seed — a repeatable, idempotent seed of bookable demo listings across the launch city
// (Metro Manila) at KNOWN coordinates, for local search/filter/radius exploration + the Phase-4 E2E
// and manual UAT. Run with:  npx tsx scripts/seed.ts   (or: npm run db:seed).
//
// Standalone by design: raw postgres.js + SQL only (NO `@/` imports), so it runs under tsx without any
// path/alias resolution — it mirrors the inline seed helpers in e2e/availability.spec.ts:66-131. The
// coordinates + ids intentionally MIRROR tests/helpers/seed.ts (the canonical test source); keep the two
// in sync. Ids are namespaced `seed_*` and the seed is idempotent (it deletes `seed_*` rows first, in
// FK-safe order), so re-running never duplicate-key crashes.
//
// The host is fully bookable — email-verified + an activated host_payout (payouts_enabled=true,
// activation_status='activated') — so deriveBookable is true and every listing is search-eligible (D-16).

import postgres from "postgres";

// The tsx process doesn't load .env; fall back to the deterministic dev URL (as tests/helpers/db.ts).
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout";

const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });

const HOST_ID = "seed_host_1";

// Launch-city center (Makati CBD). AXIS ORDER: x = longitude, y = latitude — see ST_MakePoint below.
// (Mirrors SEARCH_ORIGIN in tests/helpers/seed.ts.)
const SEARCH_ORIGIN = { lat: 14.5547, lng: 121.0244 };

type SeedListing = {
  id: string;
  title: string;
  primarySpaceType: string;
  lat: number;
  lng: number;
  city: string;
  neighborhood: string;
  hourlyRateCents: number;
  dayRateCents: number;
  unitCount: number;
  tags: string[];
};

// Five bookable Metro Manila listings (mirror tests/helpers/seed.ts):
//   - seed_listing_4: a gym (gym_fitness_floor) tagged `basketball` — its primary type is DISJOINT from
//     an activity tag it carries, so the D-35 type-OR-tag category match has real supply to exercise.
//   - seed_listing_5: ≈15.3 km south of the origin — BEYOND the default 10 km radius, so the radius
//     filter + a zero-result path can exclude real supply.
const LISTINGS: SeedListing[] = [
  { id: "seed_listing_1", title: "Poblacion Pickleball Court", primarySpaceType: "pickleball_court", lat: 14.558, lng: 121.028, city: "Makati", neighborhood: "Poblacion", hourlyRateCents: 45000, dayRateCents: 280000, unitCount: 2, tags: ["pickleball"] },
  { id: "seed_listing_2", title: "Sunlit Yoga Studio", primarySpaceType: "yoga_studio", lat: 14.576, lng: 121.0437, city: "Mandaluyong", neighborhood: "Highway Hills", hourlyRateCents: 60000, dayRateCents: 350000, unitCount: 1, tags: ["yoga", "pilates"] },
  { id: "seed_listing_3", title: "Ortigas Basketball Court", primarySpaceType: "basketball_court", lat: 14.5866, lng: 121.0614, city: "Pasig", neighborhood: "Ortigas Center", hourlyRateCents: 80000, dayRateCents: 500000, unitCount: 1, tags: ["basketball", "volleyball"] },
  { id: "seed_listing_4", title: "QC Strength & Conditioning Gym", primarySpaceType: "gym_fitness_floor", lat: 14.628, lng: 121.03, city: "Quezon City", neighborhood: "Kamias", hourlyRateCents: 35000, dayRateCents: 200000, unitCount: 1, tags: ["basketball", "weightlifting", "general_fitness"] },
  { id: "seed_listing_5", title: "Alabang Multi-Sport Court", primarySpaceType: "multi_sport_court", lat: 14.418, lng: 121.04, city: "Muntinlupa", neighborhood: "Alabang", hourlyRateCents: 70000, dayRateCents: 420000, unitCount: 3, tags: ["futsal_soccer", "badminton"] },
];

/** Idempotent cleanup: delete prior seed rows in FK-safe order (booker_id is ON DELETE RESTRICT; the
 *  listing children — photos/hours/tags/blocks — cascade from the listing delete). */
async function reset(): Promise<void> {
  await sql`DELETE FROM booking WHERE listing_id LIKE 'seed_%' OR booker_id LIKE 'seed_%'`;
  await sql`DELETE FROM listing WHERE id LIKE 'seed_%'`;
  await sql`DELETE FROM host_payout WHERE user_id LIKE 'seed_%'`;
  await sql`DELETE FROM "user" WHERE id LIKE 'seed_%'`;
}

async function seedHost(): Promise<void> {
  await sql`
    INSERT INTO "user" (id, name, email, email_verified, first_name, can_host, can_book, created_at, updated_at)
    VALUES (${HOST_ID}, ${"Seed Host"}, ${`${HOST_ID}@fitout.seed`}, ${true}, ${"Seed"}, ${true}, ${false}, now(), now())
  `;
  // Activated payout wallet → deriveBookable true (the merchant.activated webhook is Phase 2 / mocked here).
  await sql`
    INSERT INTO "host_payout" (user_id, paymongo_account_id, activation_status, payouts_enabled, onboarding_complete, created_at, updated_at)
    VALUES (${HOST_ID}, ${"acct_seed_1"}, ${"activated"}, ${true}, ${true}, now(), now())
  `;
}

async function seedListing(l: SeedListing): Promise<void> {
  await sql`
    INSERT INTO "listing" (
      id, host_id, title, description, primary_space_type,
      address_line1, city, region, postal_code, country, neighborhood,
      location, show_exact_address, max_occupancy, unit_count, timezone,
      hourly_rate_cents, day_rate_cents, currency, booking_mode, status, published_at, created_at, updated_at
    ) VALUES (
      ${l.id}, ${HOST_ID}, ${l.title},
      ${`${l.title} — a bookable space in ${l.city}.`}, ${l.primarySpaceType}::space_type,
      ${"1 Seed Street"}, ${l.city}, ${"Metro Manila"}, ${"1200"}, ${"Philippines"}, ${l.neighborhood},
      ST_SetSRID(ST_MakePoint(${l.lng}, ${l.lat}), 4326), ${false}, ${12}, ${l.unitCount}, ${"Asia/Manila"},
      ${l.hourlyRateCents}, ${l.dayRateCents}, ${"php"}, ${"request"}::booking_mode, ${"published"}::listing_status,
      now(), now(), now()
    )
  `;
  // Three cover-first photos so the listing/search cards render.
  await sql`
    INSERT INTO "listing_photo" (id, listing_id, public_id, url, position) VALUES
      (${`${l.id}_p0`}, ${l.id}, ${`fitout/seed/${l.id}/0`}, ${"https://example.com/seed-0.jpg"}, ${0}),
      (${`${l.id}_p1`}, ${l.id}, ${`fitout/seed/${l.id}/1`}, ${"https://example.com/seed-1.jpg"}, ${1}),
      (${`${l.id}_p2`}, ${l.id}, ${`fitout/seed/${l.id}/2`}, ${"https://example.com/seed-2.jpg"}, ${2})
  `;
  // Weekly hours 06:00–21:00 every day so any selected day shows availability.
  for (let dow = 0; dow < 7; dow++) {
    await sql`
      INSERT INTO "operating_hours" (id, listing_id, day_of_week, open_time, close_time, created_at)
      VALUES (${`${l.id}_oh_${dow}`}, ${l.id}, ${dow}, ${"06:00"}, ${"21:00"}, now())
    `;
  }
  // Activity tags (D-35 type-OR-tag match supply).
  for (const tag of l.tags) {
    await sql`INSERT INTO "listing_activity_tag" (listing_id, tag) VALUES (${l.id}, ${tag})`;
  }
}

async function main(): Promise<void> {
  await reset();
  await seedHost();
  for (const l of LISTINGS) await seedListing(l);

  const rows = await sql<{ n: number }[]>`
    SELECT count(*)::int AS n FROM listing WHERE id LIKE 'seed_%' AND status = 'published'
  `;
  const n = rows[0].n;
  console.log(
    `Seeded ${n} published bookable listings (host ${HOST_ID}, origin ${SEARCH_ORIGIN.lat},${SEARCH_ORIGIN.lng}). ` +
      `seed_listing_5 sits beyond the 10 km radius; seed_listing_4 is a gym tagged 'basketball' (disjoint type/tag).`,
  );
  await sql.end();
}

main().catch(async (err) => {
  console.error(err);
  await sql.end({ timeout: 5 });
  process.exit(1);
});
