// AC#15 / STATE-01 — every data-backed route has a designed loading state, and no static route has a
// dead one.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE DISCRIMINATOR IS `isAsyncDefaultExport`, NOT AN `await` GREP — AND NOT THE BUILD MANIFEST
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The UI-SPEC states the rule as *"a route needs a `loading.tsx` if its `page.tsx` awaits anything"*.
// Implemented literally, as a grep for `await`, that flags all four `(auth)` pages — whose awaits are
// inside CLIENT-SIDE EVENT HANDLERS (`await authClient.signIn.email(…)` in an onSubmit), not inside a
// server render. All four are `"use client"` with a SYNC default export, so their page component can
// never suspend and a `loading.tsx` beside them could never render. Four dead files is an AC#15 that
// is green for the wrong reason, which is why assertion 2 below exists.
//
// The plan proposed a second justification for the async rule: that it *"correlates 1:1 with the
// build manifest's ƒ (Dynamic) marker across all 25 pages"*. MEASURED AGAINST THE TREE ON
// 17 AUGUST 2026, THAT CORRELATION IS FALSE IN ONE DIRECTION, and the correction matters more than
// the claim did. `npm run build`, verbatim rows:
//
//   ƒ /login      ƒ /signup      ƒ /forgot-password      ƒ /reset-password
//   ○ /dev/theme  ○ /privacy     ○ /terms
//
// All four `(auth)` routes build as ƒ Dynamic despite being sync client pages. The cause is
// `(auth)/layout.tsx`, which renders `PublicHeader` — a component that reads the session — so the
// SEGMENT is dynamic because of its ancestor, not because of its page. (Plan 11-15 measured the same
// mechanism in the other direction: composing `PublicHeader` cost five static routes.) So:
//
//   async default export  ⇒  ƒ Dynamic   (20/20, still true)
//   ƒ Dynamic             ⇏  async default export   (4 counter-examples today)
//
// ── 24 AUGUST 2026, PLAN 15-06 — THOSE FOUR COUNTER-EXAMPLES ARE GONE, AND NOTHING HERE MOVES ─────
//
// The paragraph above names its own cause, and D-162 removed it. `(auth)/layout.tsx` is now a
// dedicated auth composition: `PublicHeader` is deleted from it, the wordmark it used to supply
// moves into the layout above the card, and no ancestor of the four auth pages reads the session any
// more. RE-MEASURED RATHER THAN PREDICTED — `npm run build` on this tree, verbatim rows:
//
//   ○ /forgot-password    ○ /login    ○ /reset-password    ○ /signup
//
// All four flipped ƒ → ○, and the three ○ rows quoted above are unmoved. So the one-directional
// falsity recorded for 17 August has no counter-examples in today's tree — and it would be very easy
// to read that as the manifest finally becoming a usable oracle for this gate. IT IS NOT, AND
// NOTHING BELOW CHANGES. The counter-examples vanished because a LAYOUT stopped reading the session,
// which is a fact about ancestors, and an ancestor's await is exactly what a `loading.tsx` boundary
// does not cover. The next layout that reads a cookie brings all four back without one page
// changing, and a gate keyed to the manifest would then demand four dead files again. The
// correlation was never the reason the async rule is right; the Suspense argument in the next
// paragraph is, and it is untouched by this measurement in either direction.
//
// NO ROUTE WAS ADDED OR REMOVED BY PLAN 15-06. The gate is still 29 / 21 / 8, the qualifying and
// non-qualifying sets are the same members they were, and every assertion in this file is
// byte-identical across this correction. A ƒ → ○ flip is not a route change; it is the same
// twenty-nine pages rendered differently.
//
// The async rule survives the correction with a BETTER reason than the one that was offered for it.
// `loading.tsx` is a `<Suspense>` boundary around the PAGE. It renders only if the page component
// itself suspends, which only an async default export can do — an ancestor layout's await happens
// ABOVE this boundary and is not covered by it. The build manifest's marker answers a different
// question (is anything in this segment's chain dynamic) and is therefore the weaker signal, not the
// oracle. Do not "simplify" this gate to read the manifest.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE COUNTS ARE 29 / 21 / 8. THEY WERE 28 / 20 / 8, AND BEFORE THAT THE PLAN'S 25 / 20 / 5
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The QUALIFYING set was exactly the twenty the original plan enumerated — that half was right. The
// totals were not: `(legal)/terms/page.tsx` and `(legal)/privacy/page.tsx` landed in plan 11-15, after
// that plan was written, and both are sync server pages. They join `/dev/theme` and the four `(auth)`
// pages as routes that must NOT have a `loading.tsx`. That was the ninth consecutive plan in its phase
// whose own surface inventory was wrong about a count; the numbers below are measured, and a change to
// any of them means a ROUTE WAS ADDED and somebody has to decide which side it is on — it does not mean
// the number should be bumped.
//
// ── 21 AUGUST 2026, PLAN 13-12 — `/bookings/[id]/receipt`, THE PHASE'S ONE NET-NEW ROUTE (D-74). ───
//
// It is an async RSC (an owner-gated booking read, a D-84 PayMongo probe, a listing read and a DB clock
// read), so it QUALIFIES and it ships with its own `loading.tsx`. TWENTY-NINE pages, TWENTY-ONE
// qualifying, and the non-qualifying set is UNCHANGED at eight — the receipt adds nothing to the side
// that must have no fallback.
//
// ⚠ THE THREE PINS MOVED IN THE SAME COMMIT AS THE ROUTE (D-88.3), which is the only ordering under
// which they are a decision rather than a chore: a pin bumped in a later commit is a pin that was red on
// `main` for the length of a review, and the fix for a red pin then looks like arithmetic instead of
// like "somebody decided which side this route is on".
//
// AND THEY WERE MEASURED ONE AT A TIME, not written down from the plan. The plan predicted 29/21/8; the
// run was made to say so. Verbatim, in order, each against the previous constant:
//
//   AssertionError: the number of page.tsx files under src/app changed. … expected 29 to be 28
//   AssertionError: the routes that qualify changed. … expected 21 to be 20
//   Tests  15 passed (15)
//
// The third line is the measurement of `EXPECTED_NON_QUALIFYING`: the suite went green with that
// constant untouched, which is the only way to establish that a count did NOT move.
//
// THE EIGHTH NON-QUALIFYING ROUTE, AND THE DECISION THAT PUT IT THERE (plan 11-18, 17 August 2026).
// `src/app/dev/throw/page.tsx` is the deliberate-throw affordance that makes the SENTINEL_LEAK_PROBE
// assertion possible — a boundary can only be proved not to leak by being handed a real error. Its
// default export is SYNC and its body throws immediately, so the page component can never suspend and
// a `loading.tsx` beside it could never render: it is non-qualifying, and that is the decision this
// bump records rather than hides. (It was reached the long way. `?throw=1` on `/dev/theme` was built
// and measured first; it made THAT page's default export async and this gate reported
// `expected [ 'src/app/dev/theme' ] to deeply equal []` and `expected 21 to be 20` — i.e. it demanded
// a fallback for one of the routes it itself names as needing none. Reverted; the full account is in
// `src/app/dev/throw/page.tsx`'s header.)
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED — FOUR PROBES, ALL RUN, ALL REVERTED. 17 AUGUST 2026. GREEN IS 15 PASSED.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Command for all four: `npx vitest run --config vitest.design.config.ts
// tests/design/loading-coverage.test.ts`
//
//   (a) MISSING. `src/app/(app)/profile/loading.tsx` deleted. **2 failed / 13 passed**, and the
//       second failure is the point of pinning the counts as well as the lists — the same edit is
//       reported twice, from two directions:
//
//         AssertionError: these routes await on the server and have no loading.tsx, so the visitor
//         gets the previous screen frozen with nothing announced while the page renders (AC#15 /
//         STATE-01).: expected [ 'src/app/(app)/profile' ] to deeply equal []
//         + [
//         +   "src/app/(app)/profile",
//         + ]
//
//         AssertionError: the number of loading.tsx files on disk changed. …: expected 19 to be 20
//
//       Restored → 15 passed.
//
//   (b) DEAD FILE. `src/app/(auth)/login/loading.tsx` created, as the smallest thing that compiles
//       (`export default function LoginLoading() { return null; }`). **5 failed / 10 passed** — one
//       file, five independent alarms, which is what "both directions plus closure" buys:
//
//         AssertionError: these routes have a loading.tsx that can never render: their page's default
//         export is sync, so the page component cannot suspend and React never shows the fallback. A
//         dead loading.tsx inflates AC#15 coverage without covering anything (this is exactly what an
//         `await` grep produces for the four (auth) pages).: expected [ 'src/app/(auth)/login' ] to
//         deeply equal []
//
//         AssertionError: these loading.tsx files have no qualifying page.tsx beside them, so nothing
//         on the route tree can ever render them.: expected [ 'src/app/(auth)/login/loading.tsx' ] to
//         deeply equal []
//
//         AssertionError: the number of loading.tsx files on disk changed. …: expected 21 to be 20
//
//         AssertionError: a loading state must announce itself exactly once …: expected [ Array(1) ]
//         to deeply equal []
//         + [
//         +   "src/app/(auth)/login/loading.tsx (patterns: 0, own role=status: 0, named: false)",
//         + ]
//
//         AssertionError: expected [ …(3) ] to deeply equal [ …(2) ]
//         + "src/app/(auth)/login/loading.tsx",
//
//       Deleted → 15 passed.
//
//   (c) VACUITY. `APP_DIR` pointed at `src/app-nope`. **4 failed / 11 passed**, and every one of the
//       four is a GUARD or a pin — not one of the five real list assertions:
//
//         AssertionError: scanned: (nothing): expected 0 to be greater than or equal to 20
//         AssertionError: the classifier found only one class over the real tree, which means it is
//         not discriminating and one of the two list assertions below is passing over an empty set:
//         expected 0 to be greater than 0
//         AssertionError: the number of page.tsx files under src/app changed. …: expected +0 to be 27
//         AssertionError: expected [] to deeply equal [ …(2) ]   (the two hand-written routes)
//
//       ALL FIVE REAL ASSERTIONS PASSED, silently and perfectly, over zero files: missing → `[]`,
//       dead → `[]`, orphans → `[]`, box literals → `[]`, status regions → `[]`. That is the failure
//       mode plan 11-15's probe (c) recorded and plan 11-02's probe (d) measured before it, and it is
//       exactly why the guards are asserted FIRST and why every count here is an equality rather than
//       a floor. Note also what did NOT report: the `toContain` on `(auth)/login/page.tsx` never ran,
//       because the length assertion in the same `it` fails first — which is why the pinned page
//       count is a separate test and not a second line in that one. Reverted → 15 passed.
//
//   (d) THE CLASSIFIER ITSELF, which is the probe the other three cannot substitute for.
//       `isAsyncDefaultExport` was made to `return true` unconditionally — the shape a "simplify
//       this" edit takes, and the one that turns AC#15 into a rubber stamp. **6 failed / 9 passed**:
//
//         AssertionError: expected 0 to be greater than 0   (the positive control: zero non-qualifying)
//         AssertionError: these routes await on the server and have no loading.tsx …: expected
//         [ …(7) ] to deeply equal []
//         AssertionError: the routes that qualify changed. …: expected 27 to be 20
//         AssertionError: expected true to be false // Object.is equality   ← the (auth) self-test
//         AssertionError: expected true to be false // Object.is equality   ← the comment self-test
//         AssertionError: expected true to be false // Object.is equality   ← the non-default self-test
//
//       RECORDED HONESTLY, BECAUSE IT IS THE INTERESTING PART: assertion 2 ("gives NO sync-default
//       page a loading.tsx") did NOT fire. With the classifier stuck at `true` there are no
//       non-qualifying routes left for it to check, so it passes over an empty set — a list assertion
//       cannot notice that its input was emptied. The positive control, the pinned counts and the
//       synthetic self-tests are what caught it, and that is precisely why all three exist alongside
//       the two list clauses rather than instead of them. Reverted → 15 passed.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — real blind spots, stated so the next reader under-trusts this file
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//   • THIS PROVES A FILE EXISTS, NOT THAT ITS SKELETON MATCHES. Shape fidelity — does the fallback
//     occupy the same box as the content it stands in for — is `skeleton-measurements.test.ts` at the
//     source level and plan `11-21`'s ±2px `boundingBox()` comparison at the rendered level. jsdom
//     cannot see that class of bug at all (D-131), so neither can anything here.
//   • The classifier is SYNTACTIC. `export default withAuth(async () => {})` — a default export whose
//     asyncness is inside a wrapper call — is reported as sync, because no type inference is done.
//     There is no such page in this tree today; if one is added, this is the rule to revisit rather
//     than the file to delete.
//   • Assertion 2's contrapositive is not free. A `loading.tsx` beside a sync page is caught, but a
//     `loading.tsx` in a directory with no `page.tsx` at all would sit outside both lists — which is
//     what assertion 3 (closure) is for, and it is the only reason that assertion exists.
//   • The box-literal clause below is a NARROWER RESTATEMENT of `skeleton-measurements.test.ts`'s
//     classifier, deliberately duplicated rather than shared. Extracting the original into a helper
//     would edit a shipped gate whose header records watched-red output against its own line numbers,
//     for a fifteen-line saving. The duplication is a real cost and is recorded here so that a future
//     change to the box family is made in BOTH places; the self-tests in each file are what would
//     notice the drift.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync, type Dirent } from "node:fs";
import { resolve, join, dirname, relative } from "node:path";
import ts from "typescript";

/** The scanned tree, as ONE constant — probe (c) above is a one-line edit here. */
const APP_DIR = resolve(process.cwd(), "src/app");

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE PINNED COUNTS. Measured 17 August 2026; re-measured 21 August 2026 when plan 13-12 added
// `/bookings/[id]/receipt` (see the header for the three verbatim assertions, taken one constant at a
// time). A change here means a ROUTE WAS ADDED and needs a decision — is its default export async, and
// therefore does it need a loading state — not that the number should be bumped to make the run green.
//
// ── RE-MEASURED 30 AUGUST 2026 (plan 17-12): 29 → 33 PAGES, 8 → 12 NON-QUALIFYING, 21 UNCHANGED ────
//
// FOUR ROUTES WERE ADDED, AND HERE IS THE DECISION THE SENTENCE ABOVE ASKS FOR. They are one deliberate
// throw affordance per route group, so that each of the four error boundaries that previously had NO
// way into them can be driven and measured:
//
//   src/app/(app)/dev-throw-app/page.tsx        → src/app/(app)/error.tsx
//   src/app/(host)/host/dev-throw/page.tsx      → src/app/(host)/host/error.tsx
//   src/app/(auth)/dev-throw-auth/page.tsx      → src/app/(auth)/error.tsx
//   src/app/(legal)/dev-throw-legal/page.tsx    → src/app/(legal)/error.tsx
//
// The four paths are named so the next reader can CHECK the claim below rather than take it, which is
// the whole difference between a recorded decision and a bumped number.
//
// THE DECISION, AND IT IS THE SAME ONE `src/app/dev/throw/page.tsx` RECORDED WHEN IT MOVED 27→28 AND
// 7→8: each of the four has a **sync** default export that throws immediately. A sync component can
// never suspend, so a `loading.tsx` beside any of them could never render — it would be a fallback
// this classifier would then correctly report as dead. All four therefore join the NON-QUALIFYING
// side, `EXPECTED_NON_QUALIFYING` moves by exactly four, and **`EXPECTED_QUALIFYING` does not move at
// all**. That last clause is the content of the decision rather than a side effect of it: if a later
// edit makes one of those four exports `async`, this file goes red on the qualifying count and the
// remedy is a `loading.tsx` for it, not a fifth number.
//
// ⚠ THE WARNING ABOVE STILL BINDS AND IS NOT WEAKENED BY THIS PARAGRAPH. What makes this bump
// legitimate is not that a plan asked for it — it is that the routes are enumerated, the classifier's
// verdict on each is stated, and the count that WOULD have signalled a missing loading state was
// asserted to be unchanged. A bump without those three is the thing the sentence forbids.
//
// ── RE-MEASURED 1 SEPTEMBER 2026 (plan 18-12): 33 → 34 PAGES, 21 → 22 QUALIFYING, 12 UNCHANGED ────
//
// ONE ROUTE WAS ADDED, and here is the decision the sentence above asks for:
//
//   src/app/(ops)/ops/page.tsx    → the FitOut Ops review queue (OPS-02 / OPS-04 / D-246)
//
// THE VERDICT: its default export is **async** — it awaits `loadReviewQueue`, the database clock and
// one `loadOpsCancelImpact` per listing row — so it QUALIFIES, and `src/app/(ops)/ops/loading.tsx`
// ships in the SAME COMMIT as the route (the D-88.3 note at the top of this file). It is the first
// STAFF-ONLY route in this inventory, and it is inside the audited set rather than beside it: there
// is no "it's only for staff" exemption anywhere under `tests/design/**`.
//
// **`EXPECTED_NON_QUALIFYING` DOES NOT MOVE, AND THAT IS THE CONTENT OF THE DECISION RATHER THAN A
// SIDE EFFECT OF IT.** D-246 holds `/ops` at exactly one page — every additional ops page would cost
// another `loading.tsx` and move all three of these numbers again — so the only page this phase adds
// is one that needs a fallback. If a later edit makes that export sync, this file goes red on the
// qualifying count and the remedy is to restore the await, not a fourth number.
//
// AND THE THREE WERE MEASURED ONE AT A TIME, not written down from the plan. Verbatim, in order,
// each against the previous constant:
//
//   AssertionError: the number of page.tsx files under src/app changed. … expected 34 to be 33
//   AssertionError: the routes that qualify changed. … expected 22 to be 21
//   Tests  15 passed (15)
//
// The third line is the measurement of `EXPECTED_NON_QUALIFYING` at 12: the suite went green with
// that constant untouched, which is the only way to establish that a count did NOT move.
//
// ── RE-MEASURED 2 SEPTEMBER 2026 (plan 18.1-11): 34 → 35 PAGES, 22 → 23 QUALIFYING, 12 UNCHANGED ──
//
// ONE ROUTE WAS ADDED, and here is the decision the sentence above asks for:
//
//   src/app/(host)/host/verify/page.tsx    → the host's own account-check surface (HVER-06 / HVER-08)
//
// THE VERDICT: its default export is **async** — it awaits the session, the owner-scoped
// `loadHostVerification` read and the database clock the retry boundary is measured against — so it
// QUALIFIES, and `src/app/(host)/host/verify/loading.tsx` ships in the SAME COMMIT as the route (the
// D-88.3 note at the top of this file). The plate composes exactly one `PanelSkeleton`, imports the
// same shell constant the page imports, and writes no box measurement of its own, which is the other
// half this gate checks.
//
// **`EXPECTED_NON_QUALIFYING` DOES NOT MOVE, AND THAT IS THE CONTENT OF THE DECISION RATHER THAN A
// SIDE EFFECT OF IT.** The route this phase adds is the only one, and it is on the side that needs a
// fallback. If a later edit makes that export sync — folding the verification read into a client
// component, say — this file goes red on the qualifying count and the remedy is to restore the await,
// not a fourth number.
//
// THE THREE WERE MEASURED ONE AT A TIME, each against the previous constant. Verbatim, in order:
//
//   AssertionError: the number of page.tsx files under src/app changed. … expected 35 to be 34
//   AssertionError: the routes that qualify changed. … expected 23 to be 22
//   Tests  15 passed (15)
//
// The third line is the measurement of `EXPECTED_NON_QUALIFYING` at 12: the suite went green with that
// constant untouched, which is the only way to establish that a count did NOT move.
//
// ⚠ THE SECOND JOB `(ops)/ops/loading.tsx` DOES, recorded here because this gate is what REQUIRES the
// file and a reader who deletes it will come here first. Its `<Suspense>` boundary is what puts
// `(ops)/ops/layout.tsx`'s `assertStaff()` above the boundary, and above the boundary is the only
// place a refusal can still set the HTTP status line (D-247). Removing this fallback would not merely
// fail this gate — it would re-open the route-existence oracle D-219 exists to close.
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// Phase 20 added four synchronous routing/auth pages (the shared cloak plus login, recovery, and
// reset) and this async invitation lookup with its sibling loading state. The split is therefore
// measured at 40 = 24 async + 16 synchronous, with one loading file per async page.
const EXPECTED_PAGES = 40;
const EXPECTED_QUALIFYING = 24;
const EXPECTED_NON_QUALIFYING = 16;

/**
 * Phase 20's exact ops-auth page census.
 *
 * The `%5Fops-auth` spelling is the routable Next.js 16 source segment for the internal
 * `/_ops-auth` URL. A literal `_ops-auth` folder is private and must never be accepted here as an
 * equivalent path. Three client pages are synchronous and therefore MUST NOT grow dead route
 * fallbacks; the invitation page awaits server state and therefore MUST keep exactly one.
 */
const PHASE_20_OPS_AUTH_PAGES = [
  { page: "src/app/(ops-auth)/%5Fops-auth/login/page.tsx", qualifies: false, hasLoading: false },
  {
    page: "src/app/(ops-auth)/%5Fops-auth/forgot-password/page.tsx",
    qualifies: false,
    hasLoading: false,
  },
  {
    page: "src/app/(ops-auth)/%5Fops-auth/reset-password/page.tsx",
    qualifies: false,
    hasLoading: false,
  },
  {
    page: "src/app/(ops-auth)/%5Fops-auth/invite/[token]/page.tsx",
    qualifies: true,
    hasLoading: true,
  },
] as const;

/** The three declared skeleton shapes, by module and by export name. */
const SKELETON_PATTERNS: Readonly<Record<string, string>> = {
  "@/components/patterns/card-grid-skeleton": "CardGridSkeleton",
  "@/components/patterns/row-list-skeleton": "RowListSkeleton",
  "@/components/patterns/panel-skeleton": "PanelSkeleton",
};

function parse(fileName: string, text: string): ts.SourceFile {
  return ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  if (!ts.canHaveModifiers(node)) return false;
  return (ts.getModifiers(node) ?? []).some((m) => m.kind === kind);
}

/** A function-ish node that carries the `async` modifier. */
function isAsyncFunctionLike(node: ts.Node | undefined): boolean {
  if (node === undefined) return false;
  if (
    !ts.isFunctionDeclaration(node) &&
    !ts.isFunctionExpression(node) &&
    !ts.isArrowFunction(node)
  ) {
    return false;
  }
  return hasModifier(node, ts.SyntaxKind.AsyncKeyword);
}

/**
 * THE DISCRIMINATOR. True when the module's DEFAULT export is an async function, in any of the three
 * spellings Next accepts for a page:
 *
 *   export default async function Page() {}          — the 20 qualifying pages, all of them
 *   export default async () => {}                    — a direct arrow
 *   const Page = async () => {}; export default Page — via a module-scope binding
 *
 * An `async` function anywhere ELSE in the module — an event handler, a helper, a nested callback —
 * is invisible to it, which is the entire point: that is the `(auth)` case, and the self-test named
 * for it below is the one that would catch a "simplification" back to an `await` scan.
 */
function isAsyncDefaultExport(sf: ts.SourceFile): boolean {
  const moduleScope = new Map<string, ts.Node>();
  for (const stmt of sf.statements) {
    if (ts.isFunctionDeclaration(stmt) && stmt.name) moduleScope.set(stmt.name.text, stmt);
    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.initializer) {
          moduleScope.set(decl.name.text, decl.initializer);
        }
      }
    }
  }

  for (const stmt of sf.statements) {
    // `export default function …` / `export default async function …`
    if (
      ts.isFunctionDeclaration(stmt) &&
      hasModifier(stmt, ts.SyntaxKind.DefaultKeyword) &&
      hasModifier(stmt, ts.SyntaxKind.ExportKeyword)
    ) {
      return isAsyncFunctionLike(stmt);
    }
    // `export default <expression>` — an inline function, or an identifier to resolve.
    if (ts.isExportAssignment(stmt) && stmt.isExportEquals !== true) {
      const expr = stmt.expression;
      if (ts.isIdentifier(expr)) return isAsyncFunctionLike(moduleScope.get(expr.text));
      return isAsyncFunctionLike(expr);
    }
  }
  return false;
}

/** Every file with a given basename under a directory, recursively. `[]` on a missing tree. */
function collect(dir: string, basename: string, out: string[] = []): string[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    // 11-02's rule: a broken scan surfaces as one named guard-the-guard failure, never a stack trace
    // that buries which gate went quiet.
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collect(full, basename, out);
    else if (entry.name === basename) out.push(full);
  }
  return out;
}

const rel = (p: string) => relative(process.cwd(), p).replace(/\\/g, "/");

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE BOX-LITERAL CLAUSE — the Task-2 acceptance criterion, made mechanical.
//
// The plan states it as `grep -rEc "\bh-[0-9]|\bw-[0-9]|aspect-\[" src/app/**/loading.tsx` returning
// zero. That grep reports SIX hits against a correct tree, every one of them a container width:
// `\bw-[0-9]` matches the `w-4` inside `max-w-4xl`, because `-` is a word boundary. It is the tenth
// prescribed-grep false positive in this phase and the same shape `skeleton-measurements.test.ts`
// documents for its own. A max-width is not a measurement of anything — it is a column, and its value
// (`4xl`) is not a number — so the AST classifier below passes it and bans the thing that was meant.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/** Ordered longest-first where one prefix prefixes another (`min-h` before `h`); first match wins. */
const BOX_PREFIXES = ["min-h", "max-h", "min-w", "max-w", "aspect", "size", "h", "w"] as const;

/** Relative to a parent or a viewport — a statement about context, not a measurement. */
const RELATIVE_VALUES = new Set([
  "full", "auto", "screen", "min", "max", "fit", "dvh", "dvw", "svh", "svw", "lvh", "lvw",
]);

/** A bare number (`4`), a fraction (`1/2`), an arbitrary value (`[4/3]`), or `px`. */
function isMeasurementValue(value: string): boolean {
  if (value.startsWith("[")) return true;
  if (value === "px") return true;
  if (/^\d+(\.\d+)?$/.test(value)) return true;
  if (/^\d+\/\d+$/.test(value)) return true;
  return false;
}

/** Strip the variant chain at bracket depth zero — `sm:h-16` is still a literal `h-16`. */
function utilityOf(token: string): string {
  const text = token.replace(/^!+/, "");
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "[" || ch === "(") depth++;
    else if (ch === "]" || ch === ")") depth--;
    else if (ch === ":" && depth === 0) start = i + 1;
  }
  return text.slice(start).replace(/^-/, "");
}

/**
 * Is this class token a literal box measurement?
 *
 * NO EXEMPTIONS HERE, unlike the sibling gate. `skeleton-measurements.test.ts` exempts `w-1/2`,
 * `w-2/3` and `w-3/4` because those are PROPORTIONS of a placeholder bar and the patterns are where
 * bars are drawn. A `loading.tsx` draws no bars — it composes a pattern that does — so it has no
 * legitimate reason to write a fraction either.
 */
function boxViolationIn(rawToken: string): string | null {
  const utility = utilityOf(rawToken);
  for (const prefix of BOX_PREFIXES) {
    if (!utility.startsWith(`${prefix}-`)) continue;
    const value = utility.slice(prefix.length + 1);
    if (prefix === "aspect") return utility;
    if (RELATIVE_VALUES.has(value)) return null;
    return isMeasurementValue(value) ? utility : null;
  }
  return null;
}

type ClassScan = { readonly tokens: string[]; readonly violations: string[] };

/** String literals and template chunks only — a class named in a comment is invisible by construction. */
function scanClasses(label: string, sf: ts.SourceFile): ClassScan {
  const tokens: string[] = [];
  const violations: string[] = [];
  const visit = (node: ts.Node): void => {
    let chunk: string | null = null;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) chunk = node.text;
    else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      chunk = node.text;
    }
    if (chunk !== null) {
      for (const raw of chunk.split(/\s+/).filter(Boolean)) {
        tokens.push(raw);
        const violation = boxViolationIn(raw);
        if (violation !== null) violations.push(`${label}: ${violation}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { tokens, violations };
}

/**
 * How many of the three declared skeleton shapes this module RENDERS, and how many `role="status"`
 * attributes it writes for itself. The binding is resolved through the import, the same way
 * `card-pattern-coverage.test.ts` does it: a module that merely names `PanelSkeleton` in prose does
 * not count, and `import { PanelSkeleton as Box }` does.
 */
function statusShapeOf(sf: ts.SourceFile): { patterns: number; ownStatus: number; labelled: boolean } {
  const bindings = new Set<string>();
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    if (!ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    const wanted = SKELETON_PATTERNS[stmt.moduleSpecifier.text];
    if (wanted === undefined) continue;
    const named = stmt.importClause?.namedBindings;
    if (named !== undefined && ts.isNamedImports(named)) {
      for (const el of named.elements) {
        if ((el.propertyName?.text ?? el.name.text) === wanted) bindings.add(el.name.text);
      }
    }
  }

  let patterns = 0;
  let ownStatus = 0;
  let labelled = false;
  const visit = (node: ts.Node): void => {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tag = node.tagName.getText(sf);
      if (bindings.has(tag)) patterns++;
      for (const attr of node.attributes.properties) {
        if (!ts.isJsxAttribute(attr) || !ts.isIdentifier(attr.name)) continue;
        const init = attr.initializer;
        if (
          attr.name.text === "role" &&
          init !== undefined &&
          ts.isStringLiteral(init) &&
          init.text === "status"
        ) {
          ownStatus++;
          labelled = node.attributes.properties.some(
            (a) => ts.isJsxAttribute(a) && ts.isIdentifier(a.name) && a.name.text === "aria-label",
          );
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { patterns, ownStatus, labelled };
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE SCAN, run once at module load.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

type PageRow = {
  readonly page: string;
  readonly dir: string;
  readonly qualifies: boolean;
  readonly hasLoading: boolean;
  readonly statements: number;
};

const PAGES: PageRow[] = collect(APP_DIR, "page.tsx")
  .sort()
  .map((abs) => {
    const sf = parse(abs, readFileSync(abs, "utf8"));
    return {
      page: rel(abs),
      dir: rel(dirname(abs)),
      qualifies: isAsyncDefaultExport(sf),
      hasLoading: existsSync(join(dirname(abs), "loading.tsx")),
      statements: sf.statements.length,
    };
  });

const LOADING_FILES = collect(APP_DIR, "loading.tsx")
  .sort()
  .map((abs) => {
    const label = rel(abs);
    const sf = parse(abs, readFileSync(abs, "utf8"));
    return { label, dir: rel(dirname(abs)), sf, ...scanClasses(label, sf), ...statusShapeOf(sf) };
  });

describe("AC#15 — every async-default page has a loading state, and nothing else does", () => {
  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // GUARD THE GUARD, ASSERTED FIRST. Three of the four real assertions below are "a list was empty",
  // and a walk that matched zero files satisfies every one of them perfectly. Probe (c) in the
  // header measured exactly that: four real assertions green over an empty tree.
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("scans the route tree it is supposed to be policing", () => {
    expect(
      PAGES.length,
      `scanned: ${PAGES.map((p) => p.page).join(", ") || "(nothing)"}`,
    ).toBeGreaterThanOrEqual(20);
    // Named, not just counted: one page from each side of the classification, so a walk that finds
    // only server pages (or only client ones) cannot look healthy.
    expect(PAGES.map((p) => p.page)).toContain("src/app/(auth)/login/page.tsx");
    expect(PAGES.map((p) => p.page)).toContain("src/app/(public)/page.tsx");
  });

  it("really parsed every page it counted", () => {
    // The half that is easy to forget: a glob can match 27 files while the parse silently yields an
    // empty statement list (a changed ScriptKind, a parser flag) and the classifier then reports
    // every page as sync — which would make assertion 1 green and assertion 2 red for no real reason.
    for (const page of PAGES) {
      expect(page.statements, `${page.page} parsed to zero statements`).toBeGreaterThan(0);
    }
  });

  it("finds BOTH classes over the real tree, so the classifier is discriminating", () => {
    // THE POSITIVE CONTROL. A classifier stuck at `true` or at `false` makes one of the two list
    // assertions vacuous; probe (d) in the header is that edit, watched.
    const qualifying = PAGES.filter((p) => p.qualifies).length;
    expect(
      qualifying,
      "the classifier found only one class over the real tree, which means it is not discriminating " +
        "and one of the two list assertions below is passing over an empty set",
    ).toBeGreaterThan(0);
    expect(PAGES.length - qualifying).toBeGreaterThan(0);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // The four real clauses.
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("gives every async-default page a sibling loading.tsx", () => {
    const missing = PAGES.filter((p) => p.qualifies && !p.hasLoading).map((p) => p.dir);
    expect(
      missing,
      "these routes await on the server and have no loading.tsx, so the visitor gets the previous " +
        "screen frozen with nothing announced while the page renders (AC#15 / STATE-01).",
    ).toEqual([]);
  });

  it("gives NO sync-default page a loading.tsx", () => {
    const dead = PAGES.filter((p) => !p.qualifies && p.hasLoading).map((p) => p.dir);
    expect(
      dead,
      "these routes have a loading.tsx that can never render: their page's default export is sync, " +
        "so the page component cannot suspend and React never shows the fallback. A dead loading.tsx " +
        "inflates AC#15 coverage without covering anything (this is exactly what an `await` grep " +
        "produces for the four (auth) pages).",
    ).toEqual([]);
  });

  it("closes forwards — every loading.tsx on disk belongs to a page that qualifies", () => {
    // The two clauses above are both driven by the PAGE list, so a loading.tsx in a directory with
    // no page.tsx at all sits outside both of them. This is the direction that catches it, and it is
    // what makes the file counts below an equality rather than a coincidence.
    const pageDirs = new Map(PAGES.map((p) => [p.dir, p.qualifies]));
    const orphans = LOADING_FILES.filter((f) => pageDirs.get(f.dir) !== true).map((f) => f.label);
    expect(
      orphans,
      "these loading.tsx files have no qualifying page.tsx beside them, so nothing on the route " +
        "tree can ever render them.",
    ).toEqual([]);
  });

  // ⚠ THE TITLE IS DERIVED FROM THE CONSTANTS RATHER THAN RETYPED (plan 17-12). It used to read
  // "28 pages, 20 qualifying, 8 not, 20 loading files" against constants that said 29 / 21 / 8 — a
  // stale claim in a gate's own NAME, which is the one place a reader trusts without checking and the
  // exact defect class this phase exists to repair. Two literals in two places are two things that
  // drift; there is now one.
  it(
    `pins the counts: ${EXPECTED_PAGES} pages, ${EXPECTED_QUALIFYING} qualifying, ` +
      `${EXPECTED_NON_QUALIFYING} not, ${EXPECTED_QUALIFYING} loading files`,
    () => {
      const qualifying = PAGES.filter((p) => p.qualifies);
      const note =
        "A CHANGE HERE MEANS A ROUTE WAS ADDED OR REMOVED and somebody has to decide which side it " +
        "is on — is its default export async, and does it therefore need a loading state. It does " +
        "not mean this number should be bumped.";
      expect(PAGES.length, `the number of page.tsx files under src/app changed. ${note}`).toBe(
        EXPECTED_PAGES,
      );
      expect(qualifying.length, `the routes that qualify changed. ${note}`).toBe(
        EXPECTED_QUALIFYING,
      );
      expect(
        PAGES.length - qualifying.length,
        `the routes that do not qualify changed. ${note}`,
      ).toBe(EXPECTED_NON_QUALIFYING);
      expect(LOADING_FILES.length, `the number of loading.tsx files on disk changed. ${note}`).toBe(
        EXPECTED_QUALIFYING,
      );
    },
  );

  it("enrolls the exact Phase 20 ops-auth pages and their one real route fallback", () => {
    const byPage = new Map(PAGES.map((page) => [page.page, page]));
    expect(
      PHASE_20_OPS_AUTH_PAGES.map(({ page }) => ({
        page,
        qualifies: byPage.get(page)?.qualifies,
        hasLoading: byPage.get(page)?.hasLoading,
      })),
      "The Phase 20 route census drifted. Keep the routable `%5Fops-auth` paths exact; only the " +
        "async invitation lookup owns a sibling loading.tsx.",
    ).toEqual(PHASE_20_OPS_AUTH_PAGES);

    const inviteFallback = LOADING_FILES.find(
      (file) =>
        file.label === "src/app/(ops-auth)/%5Fops-auth/invite/[token]/loading.tsx",
    );
    expect(inviteFallback, "the invitation lookup fallback was not scanned").toMatchObject({
      patterns: 1,
      ownStatus: 0,
    });

    const inviteSource = readFileSync(
      resolve(APP_DIR, "(ops-auth)/%5Fops-auth/invite/[token]/loading.tsx"),
      "utf8",
    );
    expect(inviteSource).toContain("<PanelCard>");
    expect(inviteSource).toContain('<PanelSkeleton label="Loading your staff invitation"');

    const opsFallback = LOADING_FILES.find(
      (file) => file.label === "src/app/(ops)/ops/loading.tsx",
    );
    expect(opsFallback, "the protected ops route fallback was not scanned").toMatchObject({
      patterns: 1,
      ownStatus: 0,
    });
    const opsSource = readFileSync(resolve(APP_DIR, "(ops)/ops/loading.tsx"), "utf8");
    expect(opsSource).toContain("<RowListSkeleton");
    expect(opsSource).not.toContain("<PanelSkeleton");
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // The two Task-2 acceptance criteria that would otherwise be review instructions.
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("lets no loading.tsx write a box measurement of its own", () => {
    const violations = LOADING_FILES.flatMap((f) => f.violations);
    expect(
      violations,
      "these loading states hardcode a height, width, size or aspect ratio. Every box a fallback " +
        "claims must come from `@/lib/design/measurements` — through one of the three skeleton " +
        "patterns, or imported directly — or the placeholder and the real content are free to drift " +
        "apart, which is the layout shift the loading state exists to prevent (STATE-01 / AC#16).",
    ).toEqual([]);
  });

  it("gives every loading.tsx exactly one named status region", () => {
    // AC#18. Either the file composes exactly ONE of the three patterns (which supply
    // `role=status` + `aria-busy` + `aria-label` — measured in 11-07: `role="status"` is
    // nameFrom:author, so a status region with only an sr-only child computes to an empty accessible
    // name), or it writes exactly one of its own AND names it. Two skeletons in one fallback announce
    // the same wait twice; zero announce nothing at all.
    const wrong = LOADING_FILES.filter((f) => {
      if (f.patterns === 1 && f.ownStatus === 0) return false;
      if (f.patterns === 0 && f.ownStatus === 1 && f.labelled) return false;
      return true;
    }).map((f) => `${f.label} (patterns: ${f.patterns}, own role=status: ${f.ownStatus}, named: ${f.labelled})`);
    expect(
      wrong,
      "a loading state must announce itself exactly once: either by composing ONE of the three " +
        "skeleton patterns, or — where the route has no resolved geometry to stand in for — by " +
        "writing one `role=\"status\"` with an `aria-label`, because `role=\"status\"` is " +
        "nameFrom:author and an sr-only child alone leaves the live region unnamed.",
    ).toEqual([]);
  });

  it("records the two routes that deliberately get no skeleton", () => {
    // Carried as DATA with a reason, the `EXCLUDED_PAIRS` idiom: an exclusion that is merely absent
    // from a list is indistinguishable from one nobody argued for. Both of these routes render zero
    // markup on the path they exist for — every exit is a `redirect()` — so there is no resolved box
    // for a skeleton to match, and the UI-SPEC's "skeletons NOT to build" rule decides the case.
    const handWritten = LOADING_FILES.filter((f) => f.patterns === 0).map((f) => f.label).sort();
    expect(handWritten).toEqual([
      "src/app/(host)/host/listings/new/loading.tsx",
      "src/app/(host)/host/payouts/refresh/loading.tsx",
    ]);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // BOTH-DIRECTIONS SELF-TESTS, on fixtures never written to disk — so the code path the real
  // assertions run is the same one the fixtures prove.
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("classifies every spelling of an async default export as qualifying", () => {
    const asyncDecl = "export default async function Page() { const x = await load(); return x; }";
    const asyncArrow = "export default async () => { await load(); };";
    const viaBinding = "const Page = async () => { await load(); };\nexport default Page;";
    for (const src of [asyncDecl, asyncArrow, viaBinding]) {
      expect(isAsyncDefaultExport(parse("fake.tsx", src)), src).toBe(true);
    }
  });

  it("does NOT qualify a sync page whose await is inside an event handler — THE (auth) CASE", () => {
    // This is the whole reason the gate has this shape. All four `(auth)` pages are exactly this:
    // `"use client"`, a sync default export, and an `await authClient.signIn.email(…)` inside an
    // onSubmit. An `await` grep — the UI-SPEC's stated rule, taken literally — reports all four as
    // needing a loading.tsx, and the four files it would produce could never render.
    const authShape = [
      '"use client";',
      "export default function LoginPage() {",
      "  async function onSubmit(values) { await authClient.signIn.email(values); }",
      "  return <form onSubmit={onSubmit} />;",
      "}",
    ].join("\n");
    expect(isAsyncDefaultExport(parse("fake-login.tsx", authShape))).toBe(false);
  });

  it("does not mistake a commented-out default export for a real one", () => {
    const commented = [
      "// export default async function Page() { await load(); }",
      "/* export default async () => {}; */",
      "export default function Page() { return null; }",
    ].join("\n");
    expect(isAsyncDefaultExport(parse("fake-comment.tsx", commented))).toBe(false);
  });

  it("is not fooled by an async export that is not the default", () => {
    const namedAsync = [
      "export async function generateMetadata() { return {}; }",
      "export default function Page() { return null; }",
    ].join("\n");
    expect(isAsyncDefaultExport(parse("fake-metadata.tsx", namedAsync))).toBe(false);
    // …and the same module with an async default IS caught, so the fixture proves a difference.
    const bothAsync = [
      "export async function generateMetadata() { return {}; }",
      "export default async function Page() { return null; }",
    ].join("\n");
    expect(isAsyncDefaultExport(parse("fake-both.tsx", bothAsync))).toBe(true);
  });

  it("catches a literal box in a loading file and lets a container width through", () => {
    const bad = parse("fake-bad.tsx", 'export const A = <div className="h-11 w-52" />;');
    expect(scanClasses("fake-bad.tsx", bad).violations).toEqual([
      "fake-bad.tsx: h-11",
      "fake-bad.tsx: w-52",
    ]);
    // The six tokens the plan's prescribed grep reports against a correct tree.
    const good = parse(
      "fake-good.tsx",
      'export const A = <div className="mx-auto w-full max-w-4xl px-4 py-10 space-y-8" />;',
    );
    const scan = scanClasses("fake-good.tsx", good);
    expect(scan.violations).toEqual([]);
    expect(scan.tokens).toContain("max-w-4xl"); // …and the walk really visited the fixture.
  });
});
