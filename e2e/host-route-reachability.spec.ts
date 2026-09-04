import { expect, test } from "@playwright/test";

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// D-11 — A HOST-FACING ROUTE THAT STOPS RESOLVING MUST SAY SO IN ONE SENTENCE.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// This file costs ~2s and it is the instrument that did not exist when a phantom 404 on
// `/host/listings/[id]/edit` was re-diagnosed from scratch. The class has cost real time TWICE on
// this project and left nothing behind both times; this is the something it leaves behind.
//
// ⚠ THIS SPEC ASSERTS **ROUTING**, NEVER AUTHORIZATION. Every request below is ANONYMOUS — no
// cookie, no session, no browser context. `src/app/(host)/host/listings/[id]/edit/page.tsx:30-33`
// redirects to `/login` BEFORE the `db.select()` at `:43` and long before the `notFound()` at
// `:49-51`. So an anonymous caller that REACHES the page module can only produce a 307, and a 404
// proves the module never ran — no FitOut code executed at all. That is the whole discriminator,
// and it is why the expectation is `307` rather than anything richer.
//
// ⚠ DO NOT "FIX" A RED HERE BY SOFTENING THE `notFound()` AT
// `src/app/(host)/host/listings/[id]/edit/page.tsx:49-51`. It is a SHIPPED OWNERSHIP CHECK (an IDOR
// guard) and D-10 forbids patching it absolutely. The 404 it renders is BYTE-IDENTICAL to the root
// not-found, and that collision is the exact reason this looked like an application bug the first
// time. Nothing under `src/app/(host)/host/listings/[id]/` may be edited in response to this file
// going red.
//
// ⚠ THIS DOCBLOCK NAMES NO CAUSE FOR THE PHANTOM 404, DELIBERATELY (D-11). It records the
// DISCRIMINATOR, not a diagnosis. `19-RESEARCH.md § 1` and
// `.planning/phases/19-host-listing-surfaces-gates-that-actually-run/19-FINDING-404.md` are the
// record — the finding lands on VERDICT A (not reproduced in a clean dev server, not reproduced
// under a production build), closes one unproven item, and leaves two open with FIVE candidates
// and none attributed. Do not let a comment here quietly supply the answer that document refused
// to invent. Assert nothing beyond what those two record.
//
// WHY THIS EXISTS WHEN COVERAGE ALREADY DID. `e2e/axe-sweep.spec.ts:311-315` ALREADY goes red if
// `/host/listings/new` stops landing on the wizard — and nobody knew it did, because its message
// reads as a FIXTURE problem ("seed the local database") rather than a ROUTE problem, and costs
// ~60 seconds to arrive at the wrong diagnosis. THE VALUE OF THIS FILE IS ENTIRELY IN THE FAILURE
// SENTENCE, NOT IN THE COVERAGE. If the red below stops immediately saying "this host route
// stopped resolving", it has failed its only job.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * The four host-facing routes, each with the status an ANONYMOUS caller must get.
 *
 * The `[id]` segment is the LITERAL string `route-reachability`, not a seeded row, and that is
 * load-bearing rather than lazy: `listing.id` is `text` (`src/lib/db/schema.ts:202`), so the segment
 * matcher accepts any string; and because the request carries no cookie the module redirects before
 * it ever reads the database. So THIS SPEC NEEDS NO FIXTURE, NO SEED AND NO DATABASE — which is
 * exactly what makes it cost ~2s and therefore what makes it worth running on every push.
 */
const ROUTES = [
  { path: "/host/listings", expect: 307 },
  { path: "/host/listings/new", expect: 307 },
  { path: "/host/listings/route-reachability/edit", expect: 307 },
  { path: "/host/listings/route-reachability/availability", expect: 307 },
] as const;

/**
 * The leading sentence, chosen by the status actually observed.
 *
 * There are exactly two ways this file goes red and they need OPPOSITE first sentences — which is
 * the entire lesson of `axe-sweep.spec.ts`'s fixture-shaped message, re-learned rather than quoted.
 * A 404 is the subject of D-11. A 200 is this file having been disarmed. A single unconditional
 * sentence would name the first while the second was true, i.e. it would do precisely the
 * costs-60-seconds-and-lands-on-the-wrong-diagnosis thing this file exists to stop.
 */
function leadingSentence(status: number): string {
  if (status === 200) {
    return (
      "THIS GUARD HAS GONE VACUOUS — it is not telling you anything about the route. A 200 means " +
      "the redirect was FOLLOWED and this is the login page answering, which happens when " +
      "`maxRedirects: 0` is missing from the request below. Restore it; the assertion asserts " +
      "nothing without it. (This is also exactly what the deliberate non-vacuity check looks like.)"
    );
  }
  return (
    "THIS HOST ROUTE STOPPED RESOLVING. A 404 here does NOT mean the listing is missing and does " +
    "NOT mean the ownership check refused: this request carries no cookie, so the page redirects " +
    "to the login route BEFORE it reads the database. A 404 therefore means the ROUTER never " +
    "reached the module — no application code ran."
  );
}

for (const r of ROUTES) {
  // `request`, NOT `page` (the fourth load-bearing property): the API request context carries no
  // browser context and therefore no cookies, so no ambient session can turn a 307 into a 200 and
  // quietly make this whole file assert nothing.
  test(`${r.path} resolves to its module (anonymous ⇒ ${r.expect})`, async ({ request }) => {
    // `maxRedirects: 0` IS LOAD-BEARING. Playwright's request context follows redirects by default;
    // a FOLLOWED 307 reports `200` from the login page and every assertion in this file becomes
    // vacuous. Its non-vacuity was proven by deleting this option and watching the assertion report
    // 200 where 307 was expected (19-PATTERNS § F — watch the guard go red before trusting it).
    const res = await request.get(r.path, { maxRedirects: 0 });

    expect(
      res.status(),
      `${r.path} answered ${res.status()}. Expected ${r.expect}.\n` +
        `${leadingSentence(res.status())}\n` +
        `Check the RUNNING server's manifest before reading this as an application bug:\n` +
        `  grep -c 'listings/\\[id\\]/edit' .next/dev/server/app-paths-manifest.json   # 0 = absent (dev)\n` +
        `  grep -c 'listings/\\[id\\]/edit' .next/app-path-routes-manifest.json        # prod\n` +
        `Absent from the running server's manifest ⇒ a dev-server routing artifact, NOT an ` +
        `application defect.\n` +
        `⚠ DO NOT soften the notFound() at src/app/(host)/host/listings/[id]/edit/page.tsx:49-51 ` +
        `— it is a shipped ownership check (D-10) and this red is not about it.\n` +
        `See 19-RESEARCH § 1 and 19-FINDING-404.md § 8 for the read order. If it IS reproducing ` +
        `live you have the scarcest thing in this investigation: CAPTURE BEFORE YOU FIX.`,
    ).toBe(r.expect);
  });
}
