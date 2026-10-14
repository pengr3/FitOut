// Shared vocabulary used by review writes and browser-facing review explanations.
export const MATERIAL_FIELDS = [
  "address",
  "space_type",
  "capacity",
  "photos",
  "price",
  "title",
  "description",
] as const;
export type MaterialField = (typeof MATERIAL_FIELDS)[number];
