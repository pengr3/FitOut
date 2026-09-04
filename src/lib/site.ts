// The app's own facts about itself: the one sentence it uses to describe what it is, and the one
// contact address it does not have yet.
//
// The idiom is `src/lib/payments/config.ts:1-3`'s, restated because it is the whole point of the
// file: *the exported NAME is imported everywhere, never a hardcoded literal*. Two spellings of one
// fact is the drift this module exists to prevent, and both constants below are facts that would
// otherwise be retyped — a tagline into a footer, an address into a link.
//
// Pure/isomorphic: no "use client"/"use server" directive and NO `server-only` guard. Both exports
// are public strings that a Server Component footer, a metadata export and (in principle) a client
// component may all read. Nothing here decides what anybody is charged, so D-34's deny-list does not
// reach it.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// D-26 — WHY `SUPPORT_EMAIL` IS `null`, WHY IT STAYS `null`, AND WHAT FLIPS WHEN IT DOES NOT
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// FitOut owns no domain and has no support inbox. `metadataBase` falls back to the dev origin
// (`src/app/layout.tsx:52`, `resolveMetadataBase()`), and the only real address anywhere in `src/` is
// the transactional sender in `src/lib/email.ts` — a Resend sandbox FROM address, not a channel any
// person can write to and expect an answer. The user's call on this was *"just placeholder for now."*
//
// A CONTACT ADDRESS IS A CLAIM THE BUSINESS HAS MADE. Publishing one that nobody reads is worse than
// publishing none: a person with a problem writes to it, gets silence, and concludes the business
// ignored them — which is a real-world failure, not a cosmetic one. Inventing an address is banned
// outright by `11-UI-SPEC.md` § Anti-Patterns (*"A fabricated contact is a real-world claim shipped
// to users"*), and D-26 holds that ban open rather than working around it.
//
// SO THE FOOTER RENDERS NO SUPPORT ENTRY AT ALL while this is `null`. Not a greyed link, not a
// `disabled` control, not a tooltip, not "coming soon", not a link to a placeholder address. Nothing
// about support appears in the DOM. `src/components/patterns/site-footer.tsx` implements that with a
// single guard and NO else-branch, and says so in its own header.
//
// THE GATE INVERTS RATHER THAN SOFTENS. `tests/design/site-contacts.test.ts` reads this constant at
// test time and selects one of two branches, neither of which is empty:
//
//   • while it is `null`  — it asserts ZERO support affordances anywhere in `src/`, against a
//     declared exclusion list carrying a reason per entry;
//   • the moment it is a string — it asserts that string contains `@`, and that the footer renders
//     EXACTLY ONE `mailto:` which interpolates THIS CONSTANT rather than a retyped address.
//
// The gate is therefore never absent. That is deliberate and it is this phase's whole thesis: *a gate
// quietly reduced to nothing is worse than no gate.*
//
// ── THE ONE-LINE EDIT THAT FLIPS EVERYTHING ───────────────────────────────────────────────────────
//
// When a real, monitored FitOut inbox exists, change the declaration below from `null` to that
// address as a string literal — `= "…@…"`, one line, nothing else in this file. Three things then
// change by themselves, with no second edit anywhere:
//
//   1. the footer's support entry starts rendering, because its guard is `SUPPORT_EMAIL !== null`;
//   2. `tests/design/site-contacts.test.ts` switches to its demanding branch automatically;
//   3. that branch fails until the footer actually renders the link, so the two cannot drift apart.
//
// Do NOT set this to `""`. The empty string is not `null`, so it takes the non-null branch and then
// fails it — which is the correct outcome, but the honest spelling of "no address yet" is `null`.
//
// ⚠ D-26 AMENDS `11-UI-SPEC.md` AC#8 AND § The unfilled slot. The approved spec said the gate FAILS
// while this is null and that *"the phase cannot complete with the placeholder in place"*. That
// clause no longer holds. In its place the unfilled slot is carried as a named `human_needed` item on
// phase completion — the same convention the roadmap already uses for the sales-gated PayMongo
// threads. This departure is recorded here, in `11-CONTEXT.md` § D-26, and in the gate's own header,
// so a future reader finds the reason rather than the discrepancy. Do not silently reconcile it in
// either direction.

/**
 * A real, monitored support address — or `null` while there is none. Read the D-26 block above
 * before changing this line; it is the only line that needs changing.
 */
export const SUPPORT_EMAIL: string | null = null;

/**
 * The one sentence the app uses to describe itself, and the ONE owner of it.
 *
 * It lives here rather than in `src/app/layout.tsx` because it now has two readers: that file's
 * `metadata.description` (the browser tab, the search result, the link preview) and the footer's
 * first column. The alternative shapes were both worse. Retyping the sentence in the footer is two
 * literals that can drift, which is exactly what `11-UI-SPEC.md` § The Footer forbids (*"one
 * sentence, one owner"*). Importing `metadata` FROM the route module would drag the root layout's
 * whole module graph — `next/font/google`, `globals.css`, the theme provider — into every component
 * that wanted one string, and `src/app/not-found.tsx` is prerendered precisely because its import
 * graph is small.
 *
 * `tests/design/scaffold-residue.test.ts` pins the resolved value of `metadata.description`, so this
 * constant is checked by name in one place and by VALUE in another.
 */
export const SITE_TAGLINE = "Book gyms, courts and studios by the hour.";
