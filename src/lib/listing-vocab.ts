// D-08 locked v1 listing vocabulary — the SINGLE source of truth for space types, activity tags,
// and amenities. The wizard select/checkbox UIs, the shared Zod schemas, and the Phase-4 search
// filters all read from here so the values never drift. Values are stable machine keys (snake_case,
// matching the space_type pgEnum in schema.ts); labels are the human-facing display strings.
//
// Structure mirrors src/lib/profile.ts (a module of exported constants the rest of the app reads):
// each vocabulary is an `as const` array of { value, label }; from it we derive a value→label map
// and a bare-value tuple suitable for `z.enum(...)`.

/** Extract the bare-value tuple from a { value, label } vocabulary for z.enum(...). */
type VocabValues<T extends readonly { value: string }[]> = {
  [K in keyof T]: T[K] extends { value: infer V } ? V : never;
};

// ---------------------------------------------------------------------------
// Primary space types (D-05/D-08) — must match the `space_type` pgEnum in schema.ts.
// ---------------------------------------------------------------------------
export const SPACE_TYPES = [
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
] as const;

export type SpaceTypeValue = (typeof SPACE_TYPES)[number]["value"];

/** Bare-value tuple for `z.enum(spaceTypeValues)` (non-empty tuple of the literal union). */
export const spaceTypeValues = SPACE_TYPES.map((t) => t.value) as unknown as VocabValues<
  typeof SPACE_TYPES
>;

/** value → display label lookup (D-08). */
export const SPACE_TYPE_LABELS = Object.fromEntries(
  SPACE_TYPES.map((t) => [t.value, t.label]),
) as Record<SpaceTypeValue, string>;

// ---------------------------------------------------------------------------
// Optional secondary activity tags (D-05/D-08).
// ---------------------------------------------------------------------------
export const ACTIVITY_TAGS = [
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
] as const;

export type ActivityTagValue = (typeof ACTIVITY_TAGS)[number]["value"];

export const activityTagValues = ACTIVITY_TAGS.map((t) => t.value) as unknown as VocabValues<
  typeof ACTIVITY_TAGS
>;

export const ACTIVITY_TAG_LABELS = Object.fromEntries(
  ACTIVITY_TAGS.map((t) => [t.value, t.label]),
) as Record<ActivityTagValue, string>;

// ---------------------------------------------------------------------------
// Amenities checklist (D-06/D-08).
// ---------------------------------------------------------------------------
export const AMENITIES = [
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
] as const;

export type AmenityValue = (typeof AMENITIES)[number]["value"];

export const amenityValues = AMENITIES.map((t) => t.value) as unknown as VocabValues<
  typeof AMENITIES
>;

export const AMENITY_LABELS = Object.fromEntries(
  AMENITIES.map((t) => [t.value, t.label]),
) as Record<AmenityValue, string>;
