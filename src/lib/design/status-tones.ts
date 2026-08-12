// DS-10 — the status tone vocabulary. A CLOSED union of exactly four tones, and the total recipe map
// that goes with it.
//
// THE VOCABULARY IS A TYPE, NOT A CONVENTION. That distinction is the entire requirement. Before this
// module the repo carried TWO tone vocabularies and neither was DS-10's: the booking view declared a
// three-value union, the payout view a four-value one, and the value they shared was the filled green
// badge. A fifth tone added without a recipe is now a compile error rather than a review comment,
// because STATUS_TONE_RECIPES is a `Record` over the union rather than a lookup with a fallback.
//
// D-14 — GREEN RETREATS TO THE ICON. Status TEXT is always `--foreground` ink on a neutral tint
// (18.16 court / 16.89 grove) and the hue lives only in the icon, which has the 3:1 non-text bar to
// clear rather than 4.5. That is why `positive` and `attention` share a surface and a text colour and
// differ only in the `icon` field — the structure, not a habit, is what keeps the hue out of the text.
// The filled green badge this replaces measured 3.24:1 and was both the failing pair and the
// colour-carries-meaning pattern DS-10 pushes back on. It is retired.
//
// `--success-foreground` SURVIVES WITH EXACTLY ONE LEGAL PAIRING: a NON-TEXT GLYPH on a filled
// `--success` surface (3.83 court / 3.84 grove, against a 3.05 bar — see contrast-pairs.ts). That
// pairing ships in exactly one place, the listing wizard's completed-step progress marker, which is a
// progress indicator and not a status badge. `--success-foreground` is ILLEGAL AS TEXT, and no tone
// below names it. If you are reaching for it on a status chip, you want `positive`.
//
// THE BINDING COPY RULE (sketch manifest, restated in 10-UI-SPEC § Status Vocabulary): occupancy and
// unavailability are NORMAL states — never errors, never red. A slot that is taken, a listing that is
// unlisted, a payout that is still held: each of those is `neutral`, not a warning. Red is reserved
// for a genuine failure that needs a human, which in this product is a failed payout. `attention`
// exists for that case and only that case.
//
// WHAT THIS MODULE REPLACES, so the reconciliation is auditable rather than archaeological:
//
//   shipped tone   | shipped in                      | becomes      | why
//   ---------------+---------------------------------+--------------+-------------------------------
//   muted          | booking + payout views          | neutral      | in-flight or closed lifecycle:
//   outline        | booking + payout views          | neutral      |   pending, requested, approved,
//                  |                                 |              |   completed, declined,
//                  |                                 |              |   cancelled, held, processing,
//                  |                                 |              |   refunded
//   success        | booking + payout views          | positive     | the ONE confirmed/paid signal
//   attention      | payout view only                | attention    | unchanged in name and meaning
//
// `outline` collapsing into `neutral` is a deliberate narrowing, not an oversight: `approved` is
// in-flight (the booker still owes payment) and `processing` is in-flight (the transfer is in motion).
// Neither is a distinct semantic tone — they were a distinct BORDER treatment wearing a tone's name.
//
// WHAT THAT COLLAPSE DID AND DID NOT DO — stated precisely, because the sentence above was read as
// claiming more than shipped (WR-08). It removed `outline` from the TONE union: no status view
// returns it, and `StatusTone` cannot express it. It did NOT restyle the badges. `approved` and
// `processing` still render `<Badge variant="outline">`, so the border treatment is still on screen
// — it is now a per-STATUS presentation choice inside each badge's own recipe map, which is the
// same mechanism that lets `completed`/`declined`/`cancelled` share one tone and still show
// different icons and de-emphasised ink.
//
// The consequence, recorded rather than smoothed over: of the four recipes below, only `positive`
// and `soft-accent` are rendered BY VALUE at a call site today. `neutral`'s surface and ink are
// what `variant="secondary"` already resolves to (`--secondary` and `--muted` are the same value in
// both themes), but no call site consumes the recipe object, and `attention`'s surface is not
// rendered at all — its one adopter is the destructive Alert, which sits on `--card`. So this map
// is a declared vocabulary that two tones honour and two tones merely agree with by coincidence.
// Making the other two load-bearing means deciding whether `approved`/`processing` keep their
// border and whether the closed lifecycle statuses keep their muted ink; both are design decisions,
// not refactors, and neither is taken here. `status-vocab.test.ts` pins all four recipes BY VALUE
// so the vocabulary cannot drift while that decision is outstanding.
//
// Lives under `src/lib/design/` alongside contrast-pairs.ts, outside the trees the DS-08 accent gate
// pins by file, so declaring the soft-accent surface here cannot move that gate's per-file counts.

/**
 * The four tones. Closed, ordered, and the source of the `StatusTone` union below.
 *
 * `soft-accent` is the brand-relevant informational chip — the spots-left chip is its adopter, and it
 * is the one tone whose surface is not the neutral tint. It is NOT a status in the lifecycle sense and
 * must never be used to mean "good".
 */
export const STATUS_TONES = ["neutral", "positive", "attention", "soft-accent"] as const;

/** The closed union every status view's `tone` field is typed against. */
export type StatusTone = (typeof STATUS_TONES)[number];

/** The three class slots one tone occupies: the chip surface, the label ink, and the icon hue. */
export type StatusToneRecipe = {
  /** The chip background. */
  surface: string;
  /** The LABEL colour. Always full-contrast ink — never the hue (D-14). */
  text: string;
  /** The ICON colour. The ONLY slot that carries hue, and the only one held to the 3:1 bar. */
  icon: string;
};

/**
 * Every tone's recipe. A total `Record` over the closed union on purpose — this is the compile gate.
 *
 * Every class named here is drawn from the declared pair inventory in `./contrast-pairs.ts`:
 * foreground-on-muted 18.16 / 16.89, success-on-muted 3.67 / 3.54, destructive-on-muted 5.28 / 5.10,
 * muted-foreground-on-muted 4.82 / 5.28, foreground-on-brand@10% 17.04 / 16.24, brand-on-brand@10%
 * 4.10 / 4.06. Adding a tone whose colours are not in that inventory is a DS-06 violation even if it
 * compiles.
 */
export const STATUS_TONE_RECIPES: Record<StatusTone, StatusToneRecipe> = {
  // In-flight or closed lifecycle. The default, and the tone most statuses land on.
  neutral: { surface: "bg-muted", text: "text-foreground", icon: "text-muted-foreground" },
  // The one confirmed/paid signal. Same surface and ink as neutral — the check icon carries it.
  positive: { surface: "bg-muted", text: "text-foreground", icon: "text-success" },
  // Genuine failure needing a human (payout failed). Same surface and ink again: red is in the icon,
  // never in the label, and never on a state that is merely unavailable.
  attention: { surface: "bg-muted", text: "text-foreground", icon: "text-destructive" },
  // The brand-relevant informational chip (spots-left). The only non-neutral surface.
  "soft-accent": { surface: "bg-brand/10", text: "text-foreground", icon: "text-brand" },
};
