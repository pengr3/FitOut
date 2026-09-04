// The SIGNED-OUT actions cluster — `Log in` + `Sign up` — as one component with two call sites.
//
// ── WHY IT IS ITS OWN MODULE (plan 11-19) ────────────────────────────────────────────────────────
// It was inline in `public-header.tsx`'s `PublicAuthSlot`, which is an ASYNC component that reads the
// session, which reaches `@/lib/auth` → `@/lib/db`. `src/app/not-found.tsx` needs this exact cluster
// and must not reach any of that (see that file's header: `/_not-found` is the one prerendered `○`
// route left in the build, and a database import on a prerendered path is what makes a build dial
// out). Copying the two buttons into the not-found page would have solved the import problem and
// created a second one — a fourth independently-drifting auth cluster, on the app's most-hit
// anonymous surface, in the phase whose whole thesis is that boxes written twice drift.
//
// So the cluster lives in a leaf module with NO session read, NO database import and nothing async in
// it. Both the public header's signed-out branch and the root not-found render THIS.
//
// ── WHAT IT DELIBERATELY DOES NOT DO ─────────────────────────────────────────────────────────────
// It never collapses behind a hamburger. The pair measures 138px against 226px available at 320px in
// grove, so it fits; and hiding the acquisition CTA of a two-sided marketplace behind a menu is not a
// responsive strategy.

import Link from "next/link";

import { Button } from "@/components/ui/button";

export function AnonymousAuthActions() {
  return (
    <>
      <Button variant="ghost" asChild>
        <Link href="/login">Log in</Link>
      </Button>
      {/* `variant="default"` is written out even though it IS the default, which is against the
          repo's usual idiom (D-21: an un-variantted `<Button>` stays neutral, and the codebase leans
          on that). This is the one button in the app most likely to attract a future edit to
          `variant="brand"`, so the neutral is stated as a CHOICE — an absence cannot be read as a
          decision. Making the acquisition CTA coral is a defensible product call; it is just not this
          phase's to make. D-21 reserves the accent for the places someone explicitly asked for it,
          the reserved-for list is closed at 8 entries, and Phase 15 owns the auth surfaces this
          button leads to. */}
      <Button variant="default" asChild>
        <Link href="/signup">Sign up</Link>
      </Button>
    </>
  );
}
