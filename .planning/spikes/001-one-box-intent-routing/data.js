/* Spike 001 — data layer.
 *
 * TWO vocabularies, and the whole point of this spike is that they are DIFFERENT KINDS of thing:
 *
 *   VOCAB    — transcribed verbatim from `src/lib/listing-vocab.ts` (D-08). 11 space types +
 *              20 activity tags + 13 amenities = 44 terms. This is a CLOSED set the product owns.
 *              It never changes without a code change, so matching against it is exact and free.
 *
 *   CATALOG  — the DISTINCT (city, neighborhood) of PUBLISHED listings, with a centroid, produced by
 *              one GROUP BY against the live DB at migration 0025. Dumped 2026-08-31 from
 *              `fitout-db-1`. This is an OPEN set derived from data, and it is the spike's central
 *              claim: the catalog knows the places a Manila booker actually types, and the OSM
 *              geocoder does not.
 *
 * Neither needs a migration. That is the GATE-06 argument in two constants.
 *
 * Loaded as a CLASSIC script (no ESM) so the same file works in the browser over file:// and in
 * Node via require(). Do not add `import`/`export` here.
 */
(function (root) {
  "use strict";

  // ── The closed product vocabulary (src/lib/listing-vocab.ts) ──────────────────────────────────
  const SPACE_TYPES = [
    { value: "pickleball_court", label: "Pickleball court" },
    { value: "tennis_court", label: "Tennis court" },
    { value: "basketball_court", label: "Basketball court" },
    { value: "multi_sport_court", label: "Multi-sport court" },
    { value: "gym_fitness_floor", label: "Gym / fitness floor" },
    { value: "yoga_studio", label: "Yoga studio" },
    { value: "dance_studio", label: "Dance / movement studio" },
    { value: "pilates_barre_studio", label: "Pilates / barre studio" },
    { value: "martial_arts_boxing", label: "Martial arts / boxing gym" },
    { value: "home_private_gym", label: "Home / private gym" },
    { value: "multi_purpose_event", label: "Multi-purpose / event space" },
  ];

  const ACTIVITY_TAGS = [
    { value: "pickleball", label: "Pickleball" },
    { value: "tennis", label: "Tennis" },
    { value: "basketball", label: "Basketball" },
    { value: "volleyball", label: "Volleyball" },
    { value: "badminton", label: "Badminton" },
    { value: "futsal_soccer", label: "Futsal / soccer" },
    { value: "yoga", label: "Yoga" },
    { value: "pilates", label: "Pilates" },
    { value: "barre", label: "Barre" },
    { value: "dance", label: "Dance" },
    { value: "hiit_cross_training", label: "HIIT / cross-training" },
    { value: "weightlifting", label: "Weightlifting" },
    { value: "boxing_mma", label: "Boxing / MMA" },
    { value: "climbing", label: "Climbing" },
    { value: "general_fitness", label: "General fitness" },
  ];

  const AMENITIES = [
    { value: "showers", label: "Showers" },
    { value: "lockers_changing", label: "Lockers / changing room" },
    { value: "restrooms", label: "Restrooms" },
    { value: "parking", label: "Parking" },
    { value: "equipment_provided", label: "Equipment provided" },
    { value: "climate_control", label: "Air conditioning / heating" },
    { value: "wifi", label: "Wi-Fi" },
    { value: "drinking_water", label: "Drinking water" },
    { value: "sound_system", label: "Sound system" },
    { value: "mirrors", label: "Mirrors" },
    { value: "accessible_step_free", label: "Accessible (step-free)" },
    { value: "towels", label: "Towels" },
    { value: "first_aid_aed", label: "First-aid / AED" },
  ];

  /* Colloquial forms a booker types that are NOT in the vocabulary's labels.
   *
   * Deliberately SMALL and deliberately hand-written. A synonym list is a maintenance liability and
   * this spike is measuring how far a short one gets, not proposing an unbounded one. Every entry
   * here is a word a Manila booker plausibly types that no label contains. `search-bar.tsx` today
   * offers NONE of this — the Select forces the booker to recognise the label instead of recalling
   * their own word, which is the whole ergonomic difference the one box is testing. */
  const SYNONYMS = {
    gym: "gym_fitness_floor",
    weights: "weightlifting",
    lifting: "weightlifting",
    hoops: "basketball",
    bball: "basketball",
    football: "futsal_soccer",
    soccer: "futsal_soccer",
    futsal: "futsal_soccer",
    muaythai: "boxing_mma",
    "muay thai": "boxing_mma",
    mma: "boxing_mma",
    boxing: "boxing_mma",
    jiujitsu: "boxing_mma",
    "jiu jitsu": "boxing_mma",
    bjj: "boxing_mma",
    karate: "martial_arts_boxing",
    taekwondo: "martial_arts_boxing",
    crossfit: "hiit_cross_training",
    hiit: "hiit_cross_training",
    zumba: "dance",
    ballet: "dance",
    bouldering: "climbing",
    "rock climbing": "climbing",
    aircon: "climate_control",
    "air con": "climate_control",
    ac: "climate_control",
    shower: "showers",
    park: "parking",
  };

  /* ── The catalog gazetteer ──────────────────────────────────────────────────────────────────────
   * Dumped 2026-08-31 with, verbatim:
   *
   *   SELECT city, neighborhood, region, count(*) AS n,
   *          ST_X(ST_Centroid(ST_Collect(location))) AS lng,
   *          ST_Y(ST_Centroid(ST_Collect(location))) AS lat
   *   FROM listing
   *   WHERE status='published' AND deleted_at IS NULL AND city IS NOT NULL
   *   GROUP BY city, neighborhood, region;
   *
   * Runs against migration 0025 with no new column and no new index. `n` is the honest promise
   * attached to a suggestion: offering "Ortigas Center · 1 space" is a claim we can keep, and it is
   * the property a geocoder can never have — Photon will happily send a booker to a district where
   * FitOut has nothing. */
  const CATALOG = [
    { city: "Caloocan", neighborhood: "Kaunlaran", region: "Metro Manila", n: 1, lat: 14.64743, lng: 120.97108 },
    { city: "Makati", neighborhood: "Poblacion", region: "Metro Manila", n: 12, lat: 14.55718, lng: 121.02638 },
    { city: "Mandaluyong", neighborhood: "Highway Hills", region: "Metro Manila", n: 1, lat: 14.576, lng: 121.0437 },
    { city: "Mandaluyong", neighborhood: "Pinatubo Street", region: "Metro Manila", n: 1, lat: 14.5708, lng: 121.04534 },
    { city: "Muntinlupa", neighborhood: "Alabang", region: "Metro Manila", n: 1, lat: 14.418, lng: 121.04 },
    { city: "Pasig", neighborhood: "Ortigas Center", region: "Metro Manila", n: 1, lat: 14.5866, lng: 121.0614 },
    { city: "Quezon City", neighborhood: "Kamias", region: "Metro Manila", n: 1, lat: 14.628, lng: 121.03 },
  ];

  /* Words that join two intents rather than being one. Consumed silently. */
  const CONNECTIVES = new Set(["in", "at", "near", "around", "by", "on", "the", "a", "an", "with", "for", "to"]);

  /* "near me" / "nearby" / "here". The one box absorbs the `Use my location` BUTTON that
   * search-bar.tsx renders as a separate control — the booker says it instead of finding it. */
  const GEO_SELF = new Set(["me", "my location", "nearby", "near me", "here", "close to me"]);

  /* Temporal words the one box can absorb so the booker never opens the date popover for the
   * common cases. Resolved against an injected `now` — never `new Date()` inside the router, so the
   * harness is deterministic. */
  const TEMPORAL = {
    today: 0,
    tonight: 0,
    tomorrow: 1,
    "this weekend": "weekend",
    weekend: "weekend",
    monday: "dow:1", tuesday: "dow:2", wednesday: "dow:3", thursday: "dow:4",
    friday: "dow:5", saturday: "dow:6", sunday: "dow:0",
  };

  /* "tonight" also implies an hour window; "today" does not. The distinction is the point —
   * inventing a window the booker did not ask for is exactly the D-137 "never surprise them"
   * failure, so only the word that genuinely means an hour range sets one. */
  const TEMPORAL_WINDOW = { tonight: { start: "18:00", end: "22:00" } };

  root.SpikeData = { SPACE_TYPES, ACTIVITY_TAGS, AMENITIES, SYNONYMS, CATALOG, CONNECTIVES, GEO_SELF, TEMPORAL, TEMPORAL_WINDOW };
  if (typeof module !== "undefined" && module.exports) module.exports = root.SpikeData;
})(typeof globalThis !== "undefined" ? globalThis : this);
