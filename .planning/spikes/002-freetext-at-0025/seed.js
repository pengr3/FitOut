/* Spike 002 — synthetic catalogue generator.  `node seed.js <count>`
 *
 * Fills `fitout_spike` — a SCHEMA-EXACT clone of the product database at migration 0025, restored
 * with `pg_dump --schema-only`, carrying the same five listing indexes and therefore the same
 * complete ABSENCE of any text index. Nothing here touches the dev database.
 *
 * The rows have to be realistic in the two ways that decide the answer:
 *
 *   1. THE GATE MUST BE PAYABLE. `query.ts`'s stage-1 WHERE is not a bare table scan — it joins
 *      `user` and `host_payout` and requires published + not-deleted + email_verified +
 *      payouts_enabled + an operating_hours row. Benchmarking a free-text predicate against a naked
 *      table would measure a query this product never runs. So every host is verified and payable
 *      and every listing gets a week of hours.
 *
 *   2. THE TEXT MUST HAVE REAL SELECTIVITY. A description of lorem ipsum makes every term either
 *      match everything or nothing. Titles and descriptions are assembled from a Manila-shaped
 *      vocabulary so that `yoga` is common, `sunlit` is occasional and `zzzz` is absent — which is
 *      what lets the bench distinguish a cheap query from an expensive one.
 */
"use strict";
const COUNT = Number(process.argv[2] || 500);

const DISTRICTS = [
  ["Makati", "Poblacion"], ["Makati", "Salcedo Village"], ["Makati", "Legaspi Village"],
  ["Makati", "Bel-Air"], ["Makati", "Rockwell"], ["Taguig", "Bonifacio Global City"],
  ["Taguig", "McKinley Hill"], ["Pasig", "Ortigas Center"], ["Pasig", "Kapitolyo"],
  ["Mandaluyong", "Highway Hills"], ["Mandaluyong", "Wack-Wack"], ["Quezon City", "Kamias"],
  ["Quezon City", "Cubao"], ["Quezon City", "Katipunan"], ["Quezon City", "Diliman"],
  ["Quezon City", "New Manila"], ["San Juan", "Greenhills"], ["Muntinlupa", "Alabang"],
  ["Muntinlupa", "Filinvest City"], ["Parañaque", "BF Homes"], ["Las Piñas", "Almanza"],
  ["Caloocan", "Kaunlaran"], ["Caloocan", "Grace Park"], ["Manila", "Malate"],
  ["Manila", "Ermita"], ["Manila", "Intramuros"], ["Marikina", "Concepcion"],
  ["Pasay", "Bay Area"], ["Valenzuela", "Karuhatan"], ["Navotas", "Tanza"],
];

const TYPES = [
  ["pickleball_court", "Pickleball Court", "pickleball"],
  ["tennis_court", "Tennis Court", "tennis"],
  ["basketball_court", "Basketball Court", "basketball"],
  ["multi_sport_court", "Multi-Sport Court", "multi-sport"],
  ["gym_fitness_floor", "Fitness Floor", "gym"],
  ["yoga_studio", "Yoga Studio", "yoga"],
  ["dance_studio", "Dance Studio", "dance"],
  ["pilates_barre_studio", "Pilates Studio", "pilates"],
  ["martial_arts_boxing", "Boxing Gym", "boxing"],
  ["home_private_gym", "Private Gym", "home gym"],
  ["multi_purpose_event", "Event Space", "events"],
];

const ADJ = ["Sunlit", "Iron", "Northside", "Grand", "Quiet", "Urban", "Prime", "Bright",
  "Riverside", "Summit", "Anchor", "Coastal", "Copper", "Lantern", "Meridian", "Harbour"];
const NOUN = ["Athletic Club", "Sports Hub", "Center", "Collective", "Works", "House",
  "Pavilion", "Loft", "Arena", "Studio", "Annex", "Garage"];

const S1 = ["A bright, well-ventilated space", "A quiet ground-floor room", "A recently renovated hall",
  "A rooftop court with netting", "A converted warehouse bay", "An air-conditioned studio"];
const S2 = ["with sprung timber flooring", "with cushioned rubber matting", "with acrylic hard court surface",
  "with full-wall mirrors", "with high ceilings and natural light", "with professional lighting"];
const S3 = ["Showers and lockers are available on site.", "Free parking for up to four cars.",
  "Equipment is provided at no extra charge.", "Drinking water and towels included.",
  "Step-free access from the street.", "Sound system available on request."];
const S4 = ["Five minutes from the MRT station.", "Walking distance to the main avenue.",
  "Street parking is easy outside peak hours.", "Grab and Angkas drop-off right at the gate.",
  "Located inside a gated compound with 24-hour security."];
const S5 = ["Popular with weekday morning groups and weekend leagues.",
  "Suitable for private coaching and small classes.", "Regular home of two local clubs.",
  "Best for casual play and drop-in sessions.", "Frequently booked for corporate wellness days."];

// Deterministic PRNG so a re-seed at the same count produces the same catalogue — a bench whose
// data moves between runs cannot attribute a latency change to the query.
let s = 20260831;
const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const esc = (v) => (v === null ? "\\N" : String(v).replace(/\\/g, "\\\\").replace(/\t/g, " ").replace(/\n/g, " "));

const HOSTS = Math.max(10, Math.ceil(COUNT / 8));

/** Spread listings across two years so `created_at` is a real sort key, not a constant. */
const createdAt = (i) => new Date(Date.UTC(2024, 0, 1) + (i % 730) * 86400000).toISOString().slice(0, 10);
const out = [];
out.push("BEGIN;");
out.push("TRUNCATE operating_hours, listing_activity_tag, listing_amenity, listing_photo, listing, host_payout, \"user\" CASCADE;");

// hosts — all verified and payable, so the bookable gate lets every published listing through.
// `first_name` / `can_book` / `can_host` are NOT NULL with no default on this schema; the seeder
// failing on them is the clone proving it is faithful enough to reject what the product rejects.
out.push(`COPY "user" (id, name, first_name, email, email_verified, can_book, can_host, created_at, updated_at) FROM STDIN;`);
for (let h = 0; h < HOSTS; h++) {
  out.push(["h" + h, "Host " + h, "Host", `host${h}@spike.test`, "t", "t", "t", "2026-01-01", "2026-01-01"].map(esc).join("\t"));
}
out.push("\\.");
out.push(`COPY host_payout (user_id, activation_status, payouts_enabled, onboarding_complete, created_at, updated_at) FROM STDIN;`);
for (let h = 0; h < HOSTS; h++) out.push(["h" + h, "activated", "t", "t", "2026-01-01", "2026-01-01"].map(esc).join("\t"));
out.push("\\.");

out.push(`COPY listing (id, host_id, title, description, primary_space_type, city, region, neighborhood, country, location, status, hourly_rate_cents, currency, timezone, unit_count, occupancy_mode, show_exact_address, booking_mode, created_at, updated_at, published_at) FROM STDIN;`);
const hours = [];
for (let i = 0; i < COUNT; i++) {
  const [city, hood] = pick(DISTRICTS);
  const [tv, tlabel] = pick(TYPES);
  // Two title shapes, because both exist in the real catalogue: place-anchored ("Poblacion
  // Pickleball Court") and brand-anchored ("Iron Athletic Club"). Only the second is un-findable
  // without free text — which is precisely the population this spike is sizing.
  const title = rnd() < 0.5 ? `${hood} ${tlabel}` : `${pick(ADJ)} ${pick(NOUN)}`;
  const description = [pick(S1), pick(S2) + ".", pick(S3), pick(S4), pick(S5)].join(" ");
  const lat = 14.40 + rnd() * 0.35;
  const lng = 120.95 + rnd() * 0.18;
  const published = rnd() < 0.8;
  out.push([
    "L" + i, "h" + (i % HOSTS), title, description, tv, city, "Metro Manila", hood, "PH",
    `SRID=4326;POINT(${lng.toFixed(6)} ${lat.toFixed(6)})`,
    published ? "published" : "draft",
    Math.round((300 + rnd() * 2200) / 50) * 50 * 100, "php", "Asia/Manila", 1, "exclusive", "f", "instant",
    // Distinct timestamps. The first crossover run gave a NON-MONOTONIC baseline (35.7 ms at 7,948
    // rows, 14.6 ms at 19,891) and two NEGATIVE deltas, because every row shared one created_at:
    // `ORDER BY created_at DESC LIMIT 21` then has no stable ordering and the planner flips between
    // shapes run to run. Spreading them makes the sort mean something and the plan stay put.
    createdAt(i), createdAt(i), published ? createdAt(i) : null,
  ].map(esc).join("\t"));
  for (let d = 0; d < 7; d++) hours.push(["oh" + i + "_" + d, "L" + i, d, "06:00", "22:00"].map(esc).join("\t"));
}
out.push("\\.");

out.push(`COPY operating_hours (id, listing_id, day_of_week, open_time, close_time) FROM STDIN;`);
// `out.push(...hours)` blew the call stack at 25,000 listings (175,000 spread arguments).
for (const h of hours) out.push(h);
out.push("\\.");
out.push("COMMIT;");
out.push("ANALYZE;"); // never bench an unanalysed table — the planner would be guessing

process.stdout.write(out.join("\n") + "\n");
