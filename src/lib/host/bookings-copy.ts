// The `/host/bookings` header — its title and its lede, as ONE exported pair.
//
// WHY THIS MODULE EXISTS. Both strings were written twice: once in the page's hand-rolled `<h1>`/`<p>`
// and once in `bookings/loading.tsx`'s `PageHeader`. They agreed only because somebody had typed the
// same sentence in two files, and no single file contained both halves of that agreement — so nothing
// stopped them drifting, and a drifted plate is EXACTLY the failure a loading plate exists to prevent.
// A plate whose heading says something the page does not is a visible flash of the wrong words on a
// surface a host reads while their own bookings load.
//
// This is the copy-side twin of what `HOST_LIST_SHELL` (`@/lib/design/measurements`) does for the box:
// one owner, imported by the route AND by its own `loading.tsx`, so the two cannot disagree. The shell
// constant closes the container half; this closes the sentence half.
//
// ONE CONSTANT, NOT TWO. The pair is a single frozen object rather than two sibling exports because
// both call sites SPREAD it (`<PageHeader {...HOST_BOOKINGS_HEADER} />`). Two exports would still let a
// future edit pass one and hand-type the other; a spread cannot be half-adopted, and the assertion
// "the page and the plate render an identical title and lede" becomes a property of the syntax rather
// than of a reviewer noticing.
//
// WHY THE WORDS LIVE HERE AND NOT IN `@/lib/design/measurements`. That module owns MEASUREMENTS — boxes
// and their derivations. A sentence a host reads is product copy, and filing it under design would put
// the words where nobody looks for them and would give a layout module a reason to change when the
// product's wording does. `src/lib/listing/hours-signal.ts` is the shape being followed: a small module
// beside its surface that owns the state's words, so the surfaces and the tests cannot drift apart.
//
// NOT A DESIGN-SYSTEM DECISION, AND NOT A COPY CHANGE. Both strings below are byte-identical to what
// `/host/bookings` and its plate already shipped. Hoisting them moves zero pixels and zero words; a plan
// that wants to REWORD this header is a different plan and moves these two literals in its own commit.
//
// NON-CLIENT MODULE — no "use client", no "use server", no client-only import. Both consumers are Server
// Components, and `src/lib/listing/hours-signal.ts`'s header records what happens when a copy module
// picked up a "use client" directive: its exports become client references that a Server Component
// cannot invoke, which crashed `/host` in UAT.

/**
 * The bookings page's title block, in the host's words.
 *
 * `title` names the surface; `lede` states its scope in one sentence — every space, both tabs — which is
 * what tells a host that the Past tab is part of this page rather than somewhere else. Sentence case,
 * calm, no count and no number: a lede that named a figure would be a second, unsourced claim about the
 * host's data sitting above the list that actually carries it.
 *
 * Spread into `PageHeader` at both call sites:
 *
 *     <PageHeader {...HOST_BOOKINGS_HEADER} />
 *
 * `as const` so both fields are readonly string literal types — a consumer cannot reassign one half of
 * the pair, and the literal types are what make a drifted copy a compile error rather than a diff nobody
 * reads.
 */
export const HOST_BOOKINGS_HEADER = {
  title: "Bookings",
  lede: "Every booking across your spaces, upcoming and past.",
} as const;
