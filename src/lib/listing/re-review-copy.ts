import { MATERIAL_FIELDS, type MaterialField } from "@/lib/listing/re-review";

/** Host-readable labels for the byte-frozen material-field authority, in its declared key order. */
export const MATERIAL_FIELD_LABELS = {
  address: "Address and map location",
  space_type: "Space type",
  capacity: "Capacity",
  photos: "Photos",
  price: "Pricing",
  title: "Title",
  description: "Description",
} as const satisfies Record<MaterialField, string>;

/**
 * Explain the guarded re-review transition without maintaining a second material-field list.
 * The lower-case sentence form is derived from the same labels the dialog renders.
 */
export function composeMaterialChangeRule(): string {
  const labels = MATERIAL_FIELDS.map((field) => MATERIAL_FIELD_LABELS[field].toLowerCase());
  const last = labels.at(-1);
  const preceding = labels.slice(0, -1).join(", ");

  return `Saving changes to the ${preceding}, or ${last} sends the listing back to FitOut for review.`;
}

/** The only rejected-state data allowed to cross from the edit page into the client wizard. */
export type RejectedListingContext = {
  reason: string | null;
};
