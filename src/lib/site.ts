// The app's own facts about itself: the one sentence it uses to describe what it is, and its monitored
// launch support address.
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
// D-26 — THE SUPPORT ADDRESS OWNER AND THE FUTURE INBOX SWAP
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// Phase 23 records the business decision that `pengr.clmc.3@gmail.com` is FitOut's monitored launch
// inbox. It is a real support channel, not a placeholder, so the existing guarded footer, booking /
// payment support path, trust surfaces, and shared email shell can become reachable together.
//
// A CONTACT ADDRESS IS A CLAIM THE BUSINESS HAS MADE. Publishing one that nobody reads is worse than
// publishing none: a person with a problem writes to it, gets silence, and concludes the business
// ignored them — which is a real-world failure, not a cosmetic one. Inventing an address is banned
// outright by `11-UI-SPEC.md` § Anti-Patterns (*"A fabricated contact is a real-world claim shipped
// to users"*), and D-26 holds that ban open rather than working around it.
//
// The guarded surfaces still render nothing when the value is null; once this one declaration is a
// string, they all light up from the same source. `tests/design/site-contacts.test.ts` keeps the guard
// shape, the no-address-copy rule, and the complete guarded-site inventory structural.
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
// When a dedicated support account exists, replace this declaration once, deploy, and repeat the live
// delivery/reply proof before retiring the launch inbox. Do not add another environment variable or
// template-specific address.
//

/**
 * The real, monitored launch support address. Read the D-26 block above before changing this line;
 * it is the only address declaration application support surfaces may use.
 */
export const SUPPORT_EMAIL: string | null = "pengr.clmc.3@gmail.com";

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
