// ============================================================================================
// seed-baseline-fixtures — THE COMMITTED FIXTURE THE VISUAL-BASELINE JOB RUNS (D-58, GATE-01).
//
// WHY THIS EXISTS. Phase 11 baselined DB-free surfaces ONLY, on the stated rule that a baseline
// needing seeded data is flaky and a flaky gate gets retried until green. It named Phase 12 as the
// phase that would have to bring fixtures, because Phase 12's surfaces are product surfaces: search
// results, a listing page, a checkout, a relaxation band, a collision notice. This is that fixture.
//
// ── THE THREE PROPERTIES THAT MAKE IT USABLE AS A BASELINE SOURCE ───────────────────────────────
//
//   1. DETERMINISTIC — every id, coordinate, rate, photo url and window below is a FIXED literal.
//      Deliberately NOT `randomUUID()`, which is the right choice for a per-run e2e fixture
//      (`e2e/helpers/booker-seed.ts` uses it so concurrent runs cannot collide) and the WRONG
//      choice here: a baseline is a reference every future run is compared against, so anything
//      that varies between dispatches shows up as a pixel diff and trains people to re-mint.
//
//   2. IDEMPOTENT — `reset()` deletes every `vrt_%` row first, in FK-safe order, so a re-dispatch
//      is a normal thing to do. Re-dispatching is how you confirm a baseline set is STABLE, and a
//      fixture that duplicate-keys on the second run makes that impossible.
//
//   3. SECRET-FREE — one input, `DATABASE_URL`, which in CI is a service container's own fixed
//      credentials. See `.github/workflows/baselines.yml`'s header: if a baselined surface ever
//      needs a REAL credential, that is the signal it has left GATE-01's scope, and the fix is the
//      inventory — never a secret in the one job that can write to the repository.
//
// ── THE FROZEN CLOCK IS PART OF THE FIXTURE CONTRACT ────────────────────────────────────────────
// Phase 12 is the first phase to baseline a surface that renders a CLOCK (the checkout hold
// countdown), and Phase 11 recorded in advance that the first such surface must freeze time. That
// creates a coupling this file cannot enforce but must state: the collision window below is
// positioned relative to `VRT_CLOCK_ISO`, so the spec MUST install that same instant. If the spec's
// clock and this constant drift apart, the seeded window stops being "tomorrow morning" and the
// listing page renders a past day — a fixture failure that reads as a product defect.
//
// `e2e/visual/surfaces.spec.ts` imports these constants rather than re-declaring them, which is why
// `main()` runs behind a direct-execution guard at the bottom: importing this module must not seed.
//
// Standalone by design: raw postgres.js + SQL, NO `@/` imports, so it runs under `tsx` with no path
// alias resolution — the same constraint `scripts/seed.ts` documents, and this file mirrors its
// shape (fixed ids, `reset()` first, FK-safe order, `ST_SetSRID(ST_MakePoint(lng, lat), 4326)`).
// ============================================================================================

import postgres from "postgres";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout";

/**
 * THE FROZEN INSTANT. `2026-09-15T04:00:00Z` is 12:00 noon Asia/Manila (UTC+8) — mid-day, so the
 * hour grid renders both elapsed and future hours rather than sitting at an edge. The spec installs
 * this exact value with `page.clock`, BEFORE navigating (the API's own caveat; `e2e/hold-countdown
 * .spec.ts` is the repo's only prior clock user and records the same ordering).
 */
export const VRT_CLOCK_ISO = "2026-09-15T04:00:00Z";

/**
 * THE COLLISION WINDOW — 09:00–11:00 Asia/Manila on 2026-09-16, i.e. the morning AFTER the frozen
 * instant. Inside the 06:00–21:00 operating hours below, and in the future relative to the frozen
 * clock, so the day is selectable and the hours would be bookable were they not already taken.
 */
export const VRT_COLLISION = {
  /** The local day the spec selects, as the calendar addresses it. */
  dayIso: "2026-09-16",
  startUtc: "2026-09-16T01:00:00Z", // 09:00 Asia/Manila
  endUtc: "2026-09-16T03:00:00Z", // 11:00 Asia/Manila
  startLabel: "9:00 AM",
  endLabel: "10:00 AM",
} as const;

/** Launch-city center (Makati CBD). AXIS ORDER: x = longitude, y = latitude. */
export const VRT_ORIGIN = { lat: 14.5547, lng: 121.0244 } as const;

export const VRT_HOST_ID = "vrt_host_1";
export const VRT_RIVAL_ID = "vrt_rival_1";

/**
 * THE FIXED IDS THE BASELINE ROWS ADDRESS. `visual-baselines.ts` names these directly, so renaming
 * one orphans a declared surface — which `tsc` will not catch, because a baseline row's URL is a
 * string. Treat these as part of the inventory's contract.
 */
export const VRT_IDS = {
  /** The listing/checkout/lightbox/sheet/collision surface. 8 photos, unit_count 2, exclusive. */
  exclusive: "vrt_listing_exclusive",
  /** The open-capacity date/pass picker surface. */
  open: "vrt_listing_open",
  /** The far tennis court — the ONLY tennis supply, and it sits ~20 km out. See below. */
  farTennis: "vrt_listing_far_tennis",
} as const;

/**
 * THE EXCLUSIVE LISTING'S TITLE. The D-58 OG assertion reads the route's `alt` export and requires
 * this substring — that is what distinguishes a real capture from the `GenericCard` fallback the
 * DB-free route serves (byte-identical to the root card at 25,844 B, measured in plan 11-20).
 */
export const VRT_EXCLUSIVE_TITLE = "Poblacion Boxing Room";

type VrtListing = {
  id: string;
  title: string;
  primarySpaceType: string;
  lat: number;
  lng: number;
  city: string;
  neighborhood: string;
  hourlyRateCents: number;
  dayRateCents: number;
  perHeadPriceCents: number | null;
  occupancyMode: "exclusive" | "open_capacity";
  unitCount: number;
  photos: number;
  tags: string[];
};

/**
 * ⚠ THE FAR TENNIS COURT IS THE WHOLE POINT OF THE RELAXATION-BAND SURFACE, so its properties are
 * load-bearing rather than decorative. It is the ONLY `tennis_court` / `tennis` supply in the set,
 * and it sits ~20.0 km from the origin (0.181° of latitude × 110.57 km/°). Therefore a tennis query
 * at the default 10 km radius returns ZERO rows, and the same query at 25 km returns exactly one —
 * which is what makes the band render with real alternatives beneath it rather than an empty state.
 *
 * If a future edit adds tennis supply nearer than 10 km, the band surface silently stops being a
 * zero-result page and its baseline captures a normal result list instead. That failure is invisible
 * to a pixel comparison against a baseline minted from the same broken fixture, which is why this
 * paragraph names the property rather than trusting the distance to speak for itself.
 */
const LISTINGS: VrtListing[] = [
  // The hero surface: near, photogenic (8 photos ⇒ the mosaic shows its "show all" control, which
  // appears iff N > 5 above `sm:`), and multi-unit so key facts read `1 of 2` rather than a bare count.
  { id: VRT_IDS.exclusive, title: VRT_EXCLUSIVE_TITLE, primarySpaceType: "martial_arts_boxing", lat: 14.5580, lng: 121.0280, city: "Makati", neighborhood: "Poblacion", hourlyRateCents: 45000, dayRateCents: 280000, perHeadPriceCents: null, occupancyMode: "exclusive", unitCount: 2, photos: 8, tags: ["boxing_mma", "showers", "lockers_changing"] },
  // The open-capacity surface — the date/pass picker is a pre-hold surface on the listing page.
  { id: VRT_IDS.open, title: "Mandaluyong Open Mat Sessions", primarySpaceType: "gym_fitness_floor", lat: 14.5760, lng: 121.0437, city: "Mandaluyong", neighborhood: "Highway Hills", hourlyRateCents: 60000, dayRateCents: 350000, perHeadPriceCents: 35000, occupancyMode: "open_capacity", unitCount: 1, photos: 4, tags: ["general_fitness", "hiit_cross_training"] },
  // Two more near listings so `/` with results is a populated grid rather than a one-card page.
  { id: "vrt_listing_yoga", title: "Sunlit Yoga Studio", primarySpaceType: "yoga_studio", lat: 14.5700, lng: 121.0300, city: "Makati", neighborhood: "Rockwell", hourlyRateCents: 55000, dayRateCents: 320000, perHeadPriceCents: null, occupancyMode: "exclusive", unitCount: 1, photos: 3, tags: ["yoga", "pilates", "mirrors"] },
  { id: "vrt_listing_hoops", title: "Ortigas Basketball Court", primarySpaceType: "basketball_court", lat: 14.5866, lng: 121.0614, city: "Pasig", neighborhood: "Ortigas Center", hourlyRateCents: 80000, dayRateCents: 500000, perHeadPriceCents: null, occupancyMode: "exclusive", unitCount: 1, photos: 3, tags: ["basketball", "volleyball"] },
  // ~20 km out, and the only tennis supply — see the paragraph above.
  { id: VRT_IDS.farTennis, title: "Alabang Tennis Court", primarySpaceType: "tennis_court", lat: 14.3737, lng: 121.0244, city: "Muntinlupa", neighborhood: "Alabang", hourlyRateCents: 70000, dayRateCents: 420000, perHeadPriceCents: null, occupancyMode: "exclusive", unitCount: 1, photos: 3, tags: ["tennis"] },
];

const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });

/**
 * Idempotent cleanup. ORDER IS LOAD-BEARING: `booking.booker_id` is ON DELETE RESTRICT (bookings are
 * financial records and must never cascade from a user), and `notification` references `booking`, so
 * notifications go before bookings and bookings before users. The listing's children — photos, hours,
 * activity tags — cascade from the listing delete. Copied from `scripts/seed.ts:57-62`, extended with
 * the notification sweep `e2e/helpers/booker-seed.ts:308` documents.
 */
async function reset(): Promise<void> {
  await sql`DELETE FROM notification WHERE booking_id IN (SELECT id FROM booking WHERE listing_id LIKE 'vrt_%')`;
  await sql`DELETE FROM booking WHERE listing_id LIKE 'vrt_%' OR booker_id LIKE 'vrt_%'`;
  await sql`DELETE FROM listing WHERE id LIKE 'vrt_%'`;
  await sql`DELETE FROM host_payout WHERE user_id LIKE 'vrt_%'`;
  await sql`DELETE FROM "user" WHERE id LIKE 'vrt_%'`;
}

async function seedUsers(): Promise<void> {
  await sql`
    INSERT INTO "user" (id, name, email, email_verified, first_name, can_host, can_book, created_at, updated_at)
    VALUES (${VRT_HOST_ID}, ${"Baseline Host"}, ${`${VRT_HOST_ID}@fitout.invalid`}, ${true}, ${"Vera"}, ${true}, ${false}, now(), now())
  `;
  // AN ACTIVATED PAYOUT WALLET IS WHAT MAKES THE LISTING BOOKABLE (`deriveBookable` / the
  // `payouts_enabled` gate). Without it `/listings/[id]/book` answers a redirect, and the checkout
  // baseline would capture that redirect as its reference — green forever, of the wrong page.
  await sql`
    INSERT INTO "host_payout" (user_id, paymongo_account_id, activation_status, payouts_enabled, onboarding_complete, created_at, updated_at)
    VALUES (${VRT_HOST_ID}, ${"acct_vrt_1"}, ${"activated"}, ${true}, ${true}, now(), now())
  `;
  // The rival who already holds the collision window. `can_book` so the row is a legitimate booker.
  await sql`
    INSERT INTO "user" (id, name, email, email_verified, first_name, can_host, can_book, created_at, updated_at)
    VALUES (${VRT_RIVAL_ID}, ${"Baseline Rival"}, ${`${VRT_RIVAL_ID}@fitout.invalid`}, ${true}, ${"Rhea"}, ${false}, ${true}, now(), now())
  `;
}

async function seedListing(l: VrtListing): Promise<void> {
  await sql`
    INSERT INTO "listing" (
      id, host_id, title, description, primary_space_type,
      address_line1, city, region, postal_code, country, neighborhood,
      location, show_exact_address, max_occupancy, unit_count, timezone,
      hourly_rate_cents, day_rate_cents, per_head_price_cents, occupancy_mode,
      currency, booking_mode, status, published_at, created_at, updated_at
    ) VALUES (
      ${l.id}, ${VRT_HOST_ID}, ${l.title},
      ${`${l.title} — a bookable space in ${l.city}. Seeded for visual-regression baselines.`},
      ${l.primarySpaceType}::space_type,
      ${"1 Baseline Street"}, ${l.city}, ${"Metro Manila"}, ${"1210"}, ${"Philippines"}, ${l.neighborhood},
      ST_SetSRID(ST_MakePoint(${l.lng}, ${l.lat}), 4326), ${false}, ${12}, ${l.unitCount}, ${"Asia/Manila"},
      ${l.hourlyRateCents}, ${l.dayRateCents}, ${l.perHeadPriceCents}, ${l.occupancyMode}::occupancy_mode,
      ${"php"}, ${"instant"}::booking_mode, ${"published"}::listing_status,
      now(), now(), now()
    )
  `;
  // FIXED photo ids and urls — a per-run id here would change the DOM between dispatches.
  for (let i = 0; i < l.photos; i++) {
    await sql`
      INSERT INTO "listing_photo" (id, listing_id, public_id, url, position)
      VALUES (${`${l.id}_p${i}`}, ${l.id}, ${`fitout/vrt/${l.id}/${i}`}, ${`https://example.invalid/vrt-${i}.jpg`}, ${i})
    `;
  }
  // 06:00–21:00 every weekday, so whichever day the frozen clock lands on is bookable.
  for (let dow = 0; dow < 7; dow++) {
    await sql`
      INSERT INTO "operating_hours" (id, listing_id, day_of_week, open_time, close_time, created_at)
      VALUES (${`${l.id}_oh_${dow}`}, ${l.id}, ${dow}, ${"06:00"}, ${"21:00"}, now())
    `;
  }
  for (const tag of l.tags) {
    await sql`INSERT INTO "listing_activity_tag" (listing_id, tag) VALUES (${l.id}, ${tag})`;
  }
}

/**
 * THE SEEDED CONFLICT, AND WHY IT IS ONE ROW PER UNIT.
 *
 * The exclusive listing has `unit_count: 2` — deliberately, so BFLOW-02's key-facts strip reads
 * `1 of 2` instead of a bare count. But the GiST `EXCLUDE` arbitrates per (listing, unit), so a
 * single confirmed booking on unit 1 leaves unit 2 free and the window stays BOOKABLE. A collision
 * surface seeded that way renders a normal availability grid, and its baseline would then be a
 * picture of the feature not firing.
 *
 * So: one `confirmed` row per unit over the same window. Both units taken ⇒ the window is genuinely
 * full ⇒ the booker's hold is refused ⇒ the notice renders. Ids are fixed, like everything else here.
 */
async function seedCollisionConflict(): Promise<void> {
  const exclusive = LISTINGS.find((l) => l.id === VRT_IDS.exclusive);
  if (!exclusive) throw new Error("the exclusive listing vanished from LISTINGS");

  for (let unit = 1; unit <= exclusive.unitCount; unit++) {
    await sql`
      INSERT INTO "booking" (id, listing_id, unit, booker_id, starts_at, ends_at, status, created_at)
      VALUES (
        ${`vrt_booking_conflict_u${unit}`}, ${VRT_IDS.exclusive}, ${unit}, ${VRT_RIVAL_ID},
        ${VRT_COLLISION.startUtc}::timestamptz, ${VRT_COLLISION.endUtc}::timestamptz,
        ${"confirmed"}::booking_status, now()
      )
    `;
  }
}

async function main(): Promise<void> {
  await reset();
  await seedUsers();
  for (const l of LISTINGS) await seedListing(l);
  await seedCollisionConflict();

  // Print the counts the acceptance criterion diffs across two runs. Idempotency is a property of
  // these numbers being IDENTICAL on the second invocation, not of the script not crashing.
  const [{ listings }] = await sql<{ listings: number }[]>`
    SELECT count(*)::int AS listings FROM listing WHERE id LIKE 'vrt_%' AND status = 'published'
  `;
  const [{ photos }] = await sql<{ photos: number }[]>`
    SELECT count(*)::int AS photos FROM listing_photo WHERE listing_id LIKE 'vrt_%'
  `;
  const [{ bookings }] = await sql<{ bookings: number }[]>`
    SELECT count(*)::int AS bookings FROM booking WHERE listing_id LIKE 'vrt_%'
  `;
  const [{ hours }] = await sql<{ hours: number }[]>`
    SELECT count(*)::int AS hours FROM operating_hours WHERE listing_id LIKE 'vrt_%'
  `;
  const [{ tags }] = await sql<{ tags: number }[]>`
    SELECT count(*)::int AS tags FROM listing_activity_tag WHERE listing_id LIKE 'vrt_%'
  `;

  console.log(
    `[vrt-fixture] published listings=${listings} photos=${photos} bookings=${bookings} ` +
      `operating_hours=${hours} activity_tags=${tags}\n` +
      `[vrt-fixture] clock=${VRT_CLOCK_ISO} collision=${VRT_COLLISION.startUtc}..${VRT_COLLISION.endUtc} ` +
      `(both units of ${VRT_IDS.exclusive})\n` +
      `[vrt-fixture] ${VRT_IDS.farTennis} is the only tennis supply and sits ~20 km out — a tennis ` +
      `query is zero-result at 10 km and returns 1 at 25 km (the relaxation-band surface).`,
  );
  await sql.end();
}

// DIRECT-EXECUTION GUARD. `e2e/visual/surfaces.spec.ts` imports the constants above; importing this
// module must not seed a database as a side effect.
const invokedDirectly =
  process.argv[1] !== undefined && /seed-baseline-fixtures\.(ts|mjs|js)$/.test(process.argv[1]);

if (invokedDirectly) {
  main().catch(async (err) => {
    console.error(err);
    await sql.end({ timeout: 5 });
    process.exit(1);
  });
}
