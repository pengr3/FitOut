// SupportPath (D-64 · TRUST-01 · STATE-05) — THE GUARD, THE MAIL LINK AND THE LABEL, ALL IN ONE FILE.
//
// `src/lib/site.ts` exports `SUPPORT_EMAIL: string | null = null` and `tests/design/site-contacts.test.ts`
// is an INVERTED gate: while that constant is null it asserts that ZERO support affordances render
// anywhere under `src/`. This component is code-complete behind that guard — it renders NOTHING today,
// and starts rendering by itself on the day the constant becomes an address. Read the D-26 block at the
// top of `src/lib/site.ts` first; the constant's declaration is the only line that ever changes, and it
// is an operator action, not an executor's.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE THREE PROPERTIES THAT MAKE THE SHAPE BELOW THE ONLY CORRECT ONE. DO NOT "SIMPLIFY" IT.
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// The source shape is `src/components/patterns/site-footer.tsx:185-196` — the only working guard in the
// tree. The gate is `tests/design/site-contacts.test.ts:304-382` (`analyseSource`). It parses each module
// on its own and matches every authored literal's character offset against the character ranges of the
// guards found IN THE SAME FILE. Three consequences, each verified against that source rather than
// assumed:
//
//   1. THE GUARD MUST LIVE IN THE SAME FILE AS THE LINK LITERAL. Taking the address as a PROP from a
//      guarded parent leaves the literal in a file with no guard in it, and `unguardedMailto(scan)` goes
//      red. 13-RESEARCH Pitfall 4 records this as the single most likely way to trip the gate.
//   2. IT MUST BE A CONDITIONAL EXPRESSION (or an `&&`), NEVER AN EARLY RETURN. The collector matches
//      `ts.isConditionalExpression` and `ts.isBinaryExpression` with `&&`. An early-return `if` over the
//      constant is an `IfStatement` and registers NO GUARD AT ALL — the literal below it is then
//      unguarded and the gate reports it. This was WATCHED failing in plan 13-02 rather than argued.
//   3. THE FALSE BRANCH MUST BE THE BARE `null` KEYWORD. `hasElseBranch` is
//      `node.whenFalse.kind !== ts.SyntaxKind.NullKeyword`, and D-26 forbids every version of a
//      rendered-but-inert affordance: no greyed link, no disabled control, no "coming soon", no tooltip.
//
// AND ONE CONSEQUENCE OF (1) THAT DECIDES THIS FILE'S INTERNAL SHAPE. The link href is built INSIDE the
// true-branch and handed to `SupportControl` as a finished string, rather than computed in a `const`
// above the return. A `const` above the return sits outside the conditional's character range, so the
// scheme literal in it would be unguarded — a correct-looking refactor that turns the gate red. It is
// also why there is exactly ONE such literal in this file: the two presentations share it.
//
// ⚠ NEVER weaken, skip, invert or add an exclusion row to `tests/design/site-contacts.test.ts` to make a
//   surface pass. D-64 forbids it in three separate sentences.
// ⚠ NEVER introduce an address-shaped literal anywhere under `src/` — an example address in placeholder
//   copy turns that file's `ADDRESS` scan red until somebody writes an `EXCLUDED_ADDRESSES` row for it.
//   The address this file emits is INTERPOLATED from the constant and is never retyped.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE HOOK IS LOWER-CASE, AND WHY THAT IS VERIFIED RATHER THAN LUCKY
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// The same gate bans an unguarded label matching `SUPPORT_LABEL`, which is `/\bSupport\b/` —
// CAPITALISED and word-bounded (`site-contacts.test.ts:238`). `data-testid="support-path"` is lower-case
// and hyphenated, so the word boundary never matches it. The hook is therefore invisible to that scan by
// construction, not by coincidence, and 13-UI-SPEC § selector-contract records the same reasoning.
//
// THE SAME RULE REACHES THE `label` AND `term` PROPS, AND IT REACHES THE CALLER, NOT THIS FILE. Both
// arrive as props, so this module authors no visible copy at all. A caller that passes the capitalised
// single word as a literal puts that literal in ITS file, where there is no guard, and the gate reports
// it there. Sentence-case copy — "Get in touch", "Something not right?" — is ordinary English and is
// invisible to the scan, which is what every specified call site in 13-UI-SPEC uses.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT TRAVELS IN THE SUBJECT LINE (T-13-02-MAILTOINJ)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// The subject is `Booking {FIT-XXXXXXXX}` and NOTHING else: no email address, no amount, no venue, no
// booking id. It is `encodeURIComponent`-ed (ASVS V5) so no character in it can terminate the query
// string and append a header. The reference is a one-way SHA-256 LABEL derived from the booking id
// (`src/lib/booking/reference.ts`); the opaque UUID is the access token. The two must not be confused,
// and a support mail carrying the token would put a bearer credential in an inbox and a mail log.
//
// A SERVER COMPONENT: no client-boundary directive prologue, no state, no effect, no event handler.
// It reads one constant and renders a link.

import { Button } from "@/components/ui/button";
import { SUPPORT_EMAIL } from "@/lib/site";

/**
 * The two presentations 13-UI-SPEC § The Support Path specifies, as one discriminated union so a caller
 * cannot ask for a `<dl>` row without giving it a term.
 *
 * `panel` — the full-width `variant="outline" size="touch"` control that sits INSIDE the money panel on
 * the reversed and pending states, where it is the one thing to do about a payment that went wrong.
 * `trust-row` — the quieter `variant="link"`-weight row that ends the trust block on every status.
 *
 * Callers render `<SupportPath/>` UNCONDITIONALLY and never test the constant themselves; the component
 * decides. That is the whole point of property (1) above — a caller that did its own guarding would be
 * the parent whose child holds the unguarded literal.
 */
export type SupportPathProps = {
  /**
   * The `FIT-XXXXXXXX` reference, server-computed and passed in. It is the entire payload of the
   * subject line, and it is a display label rather than a credential — see the header.
   */
  reference: string;
  /**
   * The visible text of the control. A PROP, never a literal in this file: see the lower-case-hook
   * section above for the one word a caller must not pass as a literal, and why the constraint lands
   * on the caller's file rather than on this one.
   */
  label: string;
} & (
  | { variant: "panel" }
  | {
      variant: "trust-row";
      /**
       * The `<dt>` term of the trust-block row. Present only on this arm because only this arm renders a
       * definition list row: a `<dt>` with no term is not a row, and a row whose term repeats its own
       * description is two copies of one string.
       */
      term: string;
    }
);

/**
 * The rendered control, in either presentation.
 *
 * It receives the finished `href` and NEVER reads `SUPPORT_EMAIL` itself. That is deliberate and it is
 * the property that keeps this split legal: this function body lies OUTSIDE the guard's character
 * range, so any literal written here would be scanned as unguarded. It therefore authors none — no
 * scheme literal, no address, no label. Everything visible arrives as a prop from inside the guard.
 */
function SupportControl(props: SupportPathProps & { href: string }) {
  const href = props.href;
  if (props.variant === "trust-row") {
    return (
      // A `<div>`-wrapped `<dt>`/`<dd>` group, the shape `refund-breakdown.tsx` already uses inside a
      // `<dl>`: legal HTML5, and it keeps the row's two halves associated for a screen reader that
      // linearises the list. The caller supplies the surrounding `<dl>` (the trust block).
      <div data-testid="support-path" className="flex items-baseline justify-between gap-4">
        <dt className="text-label text-muted-foreground">{props.term}</dt>
        <dd className="text-label">
          {/* `variant="link"` weight, per 13-UI-SPEC. Composed through the vendored primitive rather
              than hand-rolled, so the link recipe is not forked into a fourth spelling. */}
          <Button asChild variant="link" className="h-auto p-0">
            <a href={href}>{props.label}</a>
          </Button>
        </dd>
      </div>
    );
  }

  return (
    // Full-width inside the money panel. `size="touch"` is DS-09's 44px control height, opted into
    // explicitly (D-22) — this is a booker-facing control on the surface where something has gone
    // wrong, which is the exact call site the size exists for.
    <Button
      asChild
      data-testid="support-path"
      variant="outline"
      size="touch"
      className="w-full"
    >
      <a href={href}>{props.label}</a>
    </Button>
  );
}

/**
 * The support affordance, guarded. Renders nothing at all while `SUPPORT_EMAIL` is null.
 *
 * @see the three-property block at the top of this file before changing the conditional below.
 */
export function SupportPath(props: SupportPathProps) {
  return SUPPORT_EMAIL !== null ? (
    <SupportControl
      {...props}
      href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Booking ${props.reference}`)}`}
    />
  ) : null;
}
