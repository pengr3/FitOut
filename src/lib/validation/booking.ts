// Shared booking / slot-selection validation (Zod 4). Clones the listing.ts contract: the SAME schema
// validates the booker's client-side selection (the SlotPicker → rail summary) and is re-validated
// server-side when the real booking is inserted — the client is NEVER trusted for times/units
// (CLAUDE.md "never trust the client"; mirrors src/lib/validation/listing.ts).
//
// Phase 3 uses this only for the client selection CONTRACT + the rail summary shape (real booking,
// pricing, and the pending hold are Phase 4). The stronger invariants that must hold at booking time —
// on-the-hour (:00) starts, the window sitting inside the listing's operating hours, and the free-unit
// count — are RE-DERIVED server-side from the read model in Phase 4 (the client can never assert them).

import { z } from "zod";

/**
 * A booker's selected time window: a contiguous run of hours OR a full operating day (fullDay). Times
 * are UTC ISO instants (the venue-tz display happens at the edge). `endUtc` must be strictly after
 * `startUtc`; everything else is re-derived server-side in Phase 4.
 */
export const slotSelectionSchema = z
  .object({
    startUtc: z.string().datetime(),
    endUtc: z.string().datetime(),
    fullDay: z.boolean().default(false),
  })
  .refine((v) => v.endUtc > v.startUtc, {
    message: "End must be after start.",
    path: ["endUtc"],
  });

export type SlotSelection = z.infer<typeof slotSelectionSchema>;
