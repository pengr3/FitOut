// GATE-05, source half: every module on D-34's server-only deny-list still CARRIES its guard, and the two
// deliberately-unguarded splits still do NOT.
//
// The enforcement itself is Turbopack's, not this file's. `import "server-only"` makes `next build` fail
// on any client import graph that reaches a guarded module — transitively, without an import-graph walker
// anybody has to maintain (D-34). What a build-time guard cannot do is notice its own DELETION: remove the
// one-line import and the build goes green, the leak comes back, and nothing says a word. That is the hole
// this file covers, and it is the only thing it covers.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// OBSERVED RED — TWO RUNS, AND THE SECOND ONE IS THE FINDING
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// Run at HEAD = b5d11a8, 13 August 2026, with the guards applied and nothing else changed. `git status
// --short -- src/` was NOT clean, and it cannot be: unlike `use-server-exports.test.ts`, whose OBSERVED
// RED was taken before touching src/ because the guard there WAS the test, here the guard IS a source
// change. The tree at capture time held exactly the 12 modified + 2 new files of the guard commit
// (e1f9a4b) and nothing else. Command: `npm run build`, exit code 1 both times.
//
// ── RED #1 — the guards go in ─────────────────────────────────────────────────────────────────────────
//
//   Error: Turbopack build failed with 6 errors:
//   ./src/lib/booking/all-in-rate.ts:1:1
//   You're importing a module that depends on "server-only". This API is only available in Server
//   Components in the App Router, but you are using it in the Pages Router.
//   > 1 | import "server-only";
//     |   ^^^^^^^^^^^^^^^^^^^^^
//
//   Ecmascript file had an error
//
//   Import traces:
//     Client Component Browser:
//       ./src/lib/booking/all-in-rate.ts [Client Component Browser]
//       ./src/components/listing/listing-card.tsx [Client Component Browser]
//       ./src/components/listing/listing-card.tsx [Server Component]
//       ./src/app/(host)/host/listings/page.tsx [Server Component]
//
//   ./src/lib/booking/all-in-rate.ts:1:1
//   'server-only' cannot be imported from a Client Component module
//   > 1 | import "server-only";
//     |   ^^^^^^^^^^^^^^^^^^^^^
//   It should only be used from a Server Component.
//
// (Six errors: `all-in-rate.ts`, `fees.ts` and `service-fee.ts`, each reported twice — once under the
// Pages-Router-worded diagnostic and once under the client-component one. The client traces in ALL SIX
// terminate at `listing-card.tsx`.)
//
// ── THE THING THAT DID NOT FAIL, WHICH IS WHY THE SPLITS ARE CORRECT RATHER THAN LUCKY ────────────────
//
// `src/components/availability/slot-picker.tsx` and `src/components/host/request-row.tsx` are ABSENT from
// the diagnostic, in both runs. They import lead-time constants from `payments/config.ts`, which is
// deliberately unguarded; had the guard gone on `config.ts` whole, the build would have failed naming
// those two files — which are not violations — and the fix would have been to unpick the guard rather
// than to fix any real leak (RESEARCH Pitfall 1). Likewise `date-pass-picker.tsx` appears NOWHERE, and no
// diagnostic mentions `availability/slots.ts`, `read-model.ts` or `units.ts` at all: the
// BOOKING_HORIZON_DAYS split into `availability/horizon.ts` held. Eight modules were guarded and only the
// three on the real violation path complained.
//
// ── RED #2 — AND THE BUILD IS NOT AN EXHAUSTIVE REPORTER ──────────────────────────────────────────────
//
// RED #1 does NOT name `availability-calendar.tsx`, the second live violation, even though its guard was
// already in place and its `computeServiceFee` import was untouched. Turbopack prints ONE import trace per
// (module, environment) — the first it resolves — so a second client component reaching the SAME guarded
// module is invisible until the first is fixed. Re-running `npm run build` after only `listing-card.tsx`
// was repaired gave 6 errors → 4, `all-in-rate.ts` and `listing-card.tsx` gone from every client trace,
// and the second violation finally named:
//
//   Error: Turbopack build failed with 4 errors:
//   ./src/lib/payments/service-fee.ts:1:1
//   'server-only' cannot be imported from a Client Component module
//   > 1 | import "server-only";
//     |   ^^^^^^^^^^^^^^^^^^^^^
//   It should only be used from a Server Component.
//
//   Import traces:
//     Client Component Browser:
//       ./src/lib/payments/service-fee.ts [Client Component Browser]
//       ./src/components/availability/availability-calendar.tsx [Client Component Browser]
//       ./src/components/availability/availability-calendar.tsx [Server Component]
//       ./src/app/listings/[id]/page.tsx [Server Component]
//
// CONSEQUENCE, recorded because it will mislead somebody: the first RED is a LOWER BOUND on the
// violations, never the list. Adopting `server-only` on a tree with more than one offender is a
// fix-and-rebuild LOOP, and a plan that reads run #1 as complete ships the rest. The emitted-bundle grep
// is what closes it — `.next/static/chunks/**` held `SERVICE_FEE_BPS??500` in 5 files at HEAD and 0 after
// both fixes, which is a count over the whole output rather than a first-match trace.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED, BOTH DIRECTIONS (this file, 13 August 2026)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// A guard that has never been watched failing is not a guard (tests/design/infra.test.ts:5-9: a pattern
// that silently matches nothing is a gate that is permanently green). Both runs below are real.
//
// Command for both: `npx vitest run --config vitest.design.config.ts tests/design/server-only-guards.test.ts`
//
//   (a) POSITIVE side. Deleted line 1 of `src/lib/booking/pricing.ts` → 1 failed / 5 passed:
//
//         FAIL  … > every module on the deny-list carries `import "server-only"`
//         AssertionError: expected [ Array(1) ] to deeply equal []
//         + [
//         +   "src/lib/booking/pricing.ts — MISSING `import \"server-only\"` (quoteWindow /
//         +    quoteOpenCapacity — the frozen quote the charge is made against (D-45/D-46). …)",
//         + ]
//
//       Restored → 6 passed. ONE assertion moved, it named that file and only that file, and the
//       reason string travelled into the failure output — which is the point of the reason being
//       mandatory rather than decorative.
//
//   (b) NEGATIVE side. Prepended `import "server-only";` to `src/lib/payments/config.ts` → 1 failed /
//       5 passed, and a DIFFERENT assertion moved:
//
//         FAIL  … > the two deliberately-unguarded splits do NOT carry it
//         AssertionError: expected [ Array(1) ] to deeply equal []
//         + [
//         +   "src/lib/payments/config.ts — carries `import \"server-only\"` but MUST NOT: … A lead
//         +    time is not a price, and both imports are legitimate. Guarding it fails the build
//         +    naming files that are not violations (RESEARCH Pitfall 1).",
//         + ]
//
//       Reverted → 6 passed. This is the row that stops a future tidy-up reintroducing Pitfall 1 by
//       "finishing the job" on the module the split deliberately left alone — and note the two probes
//       fail DIFFERENT assertions, so a single over-broad expectation is not standing in for both.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY AST AND NOT GREP — NOT A STYLE PREFERENCE
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// Measured at HEAD before any of this landed: `grep -rn "server-only" src/` returned 6 hits across 5
// files and EVERY ONE WAS A COMMENT — prose in module headers explaining that the module deliberately had
// no such directive. A grep-based guard would have passed on that prose, and would have kept passing
// after every real guard was deleted. The same collision has now bitten this repo twelve times (see
// plans 10-11 through 10-14); it is the default outcome, not an edge case.
//
// So the predicate is structural: an `ImportDeclaration` whose `moduleSpecifier` is exactly
// `"server-only"` AND which has NO import clause (a bare side-effect import). That rejects, by
// construction, all four shapes a text search cannot tell apart — a comment, a string literal, a named
// import, and a default import.

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

const ROOT = process.cwd();

type ModuleRow = { path: string; reason: string };

/**
 * D-34's deny-list, as it actually stands after the two splits. Every row carries a MANDATORY reason —
 * the typed-inventory shape the design gates use throughout (src/lib/design/status-tones.ts:74-108) —
 * because a path with no stated reason is a row nobody can safely remove OR keep.
 */
const GUARDED_MODULES = [
  {
    path: "src/lib/payments/fees.ts",
    reason:
      "the three money RATES (SERVICE_FEE_BPS, COMMISSION_RATE_BPS, HOST_CANCEL_FEE_CENTS). Each is a " +
      "non-NEXT_PUBLIC_ env read, so in a browser bundle it silently resolves to its literal fallback " +
      "and the browsed price stops agreeing with the charged one (T-11-FEELEAK).",
  },
  {
    path: "src/lib/payments/service-fee.ts",
    reason:
      "computeServiceFee — the booker-facing fee computation (D-74/D-76). It was reachable from " +
      "availability-calendar.tsx until this phase; that was one of the two live D-130 violations.",
  },
  {
    path: "src/lib/payments/commission.ts",
    reason:
      "computeCommission — the host-side deduction (D-50/51/52). Extends D-34's named list by one, on " +
      "the same rationale and at zero cost: a money computation with zero client importers (measured).",
  },
  {
    path: "src/lib/booking/all-in-rate.ts",
    reason:
      "allInRateParts — composes the fee into an advertised rate (D-75). It was reachable from " +
      "listing-card.tsx until this phase; that was the other live D-130 violation.",
  },
  {
    path: "src/lib/booking/pricing.ts",
    reason:
      "quoteWindow / quoteOpenCapacity — the frozen quote the charge is made against (D-45/D-46). The " +
      "client must never be able to re-derive the number it will be billed.",
  },
  {
    path: "src/lib/availability/slots.ts",
    reason:
      "slot enumeration and the horizon/lead predicates. The server is the sole authority on what is " +
      "available (T-03-TAMPER-SLOT); BOOKING_HORIZON_DAYS was split to ./horizon so this could be guarded.",
  },
  {
    path: "src/lib/availability/read-model.ts",
    reason:
      "getAvailability — the one place a day's bookable state is derived (AVAIL-03). Clients reach its " +
      "OUTPUT through the getDayAvailability server action and its TYPES through erased `import type`.",
  },
  {
    path: "src/lib/availability/units.ts",
    reason:
      "the hold writers and both concurrency arbiters (the GiST EXCLUDE and the advisory-locked " +
      "admissions counter). Nothing in this module has any reading that belongs in a browser bundle.",
  },
] as const satisfies readonly ModuleRow[];

/**
 * The other half of the contract, and the half a "tidy-up" would break. These modules were SPLIT OUT of
 * guarded ones precisely so they could stay client-importable; guarding them fails the build naming files
 * that are not violations (RESEARCH Pitfall 1). Each row names the shipped client importers that make it so.
 */
const MUST_NOT_BE_GUARDED = [
  {
    path: "src/lib/payments/config.ts",
    reason:
      "timing/window constants only. slot-picker.tsx imports MIN_LEAD_INSTANT_MINUTES and " +
      "MIN_LEAD_REQUEST_HOURS; request-row.tsx imports APPROVAL_PAYMENT_WINDOW_HOURS. A lead time is " +
      "not a price, and both imports are legitimate.",
  },
  {
    path: "src/lib/availability/horizon.ts",
    reason:
      "BOOKING_HORIZON_DAYS and ALL_IN_TABLE_MAX_HOURS. availability-calendar.tsx and " +
      "date-pass-picker.tsx both import the horizon to bound react-day-picker's endMonth; the RSC and " +
      "the client rail both read the table bound.",
  },
] as const satisfies readonly ModuleRow[];

/**
 * TRUE only for a bare side-effect import of the exact specifier `server-only`.
 *
 * Takes (path, text) rather than (path) on purpose — the synthetic self-tests below feed it fixtures that
 * are never written to disk, so the code path the fixtures prove is the same one the real assertions run
 * (the leak.test.ts:213 idiom).
 */
function hasServerOnlyGuard(path: string, text: string): boolean {
  const sf = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    // No import clause = a side-effect import (`import "x";`). `import x from "x"` and
    // `import { y } from "x"` both HAVE a clause and are correctly rejected: they are not the guard.
    if (stmt.importClause) continue;
    if (!ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    if (stmt.moduleSpecifier.text === "server-only") return true;
  }
  return false;
}

/** Read a repo-relative path, or return null if it does not exist (so a MOVE fails loudly, not vacuously). */
function readModule(rel: string): string | null {
  const abs = resolve(ROOT, rel);
  return existsSync(abs) ? readFileSync(abs, "utf8") : null;
}

describe("GATE-05 — the server-only guards are still in place", () => {
  const texts = new Map<string, string | null>();
  for (const { path } of [...GUARDED_MODULES, ...MUST_NOT_BE_GUARDED]) {
    texts.set(path, readModule(path));
  }

  // ── Guard-the-guard ─────────────────────────────────────────────────────────────────────────────────
  // Every assertion below is a scan over files this scanner had to FIND and PARSE. If a module were
  // renamed or moved, the scan would silently cover nothing and the real assertions would pass
  // vacuously — the exact failure mode use-server-exports.test.ts:312-318 exists to prevent.
  it("finds and parses every module it is supposed to be policing", () => {
    expect(GUARDED_MODULES.length).toBe(8);
    const missing = [...texts.entries()].filter(([, t]) => t === null).map(([p]) => p);
    expect(missing).toEqual([]);
    // Non-empty, and real TypeScript: a zero-byte file would parse fine and prove nothing.
    for (const [path, text] of texts) {
      expect(text!.length, `${path} is empty`).toBeGreaterThan(0);
      const sf = ts.createSourceFile(path, text!, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
      expect(sf.statements.length, `${path} parsed to no statements`).toBeGreaterThan(0);
    }
  });

  // ── Both-directions self-tests, on fixtures never written to disk ───────────────────────────────────
  it("does not mistake a comment, a string literal or a value import for the guard", () => {
    // The exact shape that made a grep guard useless: 6 hits at HEAD, all of them prose like this.
    expect(
      hasServerOnlyGuard(
        "fake-comment.ts",
        '// Pure/isomorphic: no "use client" directive and no "server-only" guard.\nexport const X = 1;\n',
      ),
    ).toBe(false);

    expect(
      hasServerOnlyGuard("fake-literal.ts", 'const label = "server-only";\nexport const N = 1;\n'),
    ).toBe(false);

    // A DEFAULT import of the specifier is not the guard — it has an import clause, and it is also not
    // what Next's alias provides.
    expect(hasServerOnlyGuard("fake-default.ts", 'import x from "server-only";\nexport const N = 1;\n')).toBe(
      false,
    );

    // Nor is a NAMED import.
    expect(
      hasServerOnlyGuard("fake-named.ts", 'import { y } from "server-only";\nexport const N = 1;\n'),
    ).toBe(false);

    // A near-miss specifier must not pass either.
    expect(hasServerOnlyGuard("fake-near.ts", 'import "server-only-ish";\nexport const N = 1;\n')).toBe(
      false,
    );
  });

  it("recognises the real guard, first statement or after a comment block", () => {
    expect(hasServerOnlyGuard("fake-real.ts", 'import "server-only";\nexport const N = 1;\n')).toBe(true);

    // Comments are not statements, so a header above the import is irrelevant to the predicate — and the
    // guard is still found when it sits below other imports, which is a legal (if unconventional) spot.
    expect(
      hasServerOnlyGuard(
        "fake-real-2.ts",
        '// header\nimport { z } from "zod";\nimport "server-only";\nexport const N = 1;\n',
      ),
    ).toBe(true);
  });

  // ── The real assertions ─────────────────────────────────────────────────────────────────────────────
  it("every module on the deny-list carries `import \"server-only\"`", () => {
    const missing = GUARDED_MODULES.filter(
      ({ path }) => !hasServerOnlyGuard(path, texts.get(path)!),
    ).map(({ path, reason }) => `${path} — MISSING \`import "server-only"\` (${reason})`);
    expect(missing).toEqual([]);
  });

  it("the two deliberately-unguarded splits do NOT carry it", () => {
    const wrongly = MUST_NOT_BE_GUARDED.filter(
      ({ path }) => hasServerOnlyGuard(path, texts.get(path)!),
    ).map(
      ({ path, reason }) =>
        `${path} — carries \`import "server-only"\` but MUST NOT: ${reason} ` +
        `Guarding it fails the build naming files that are not violations (RESEARCH Pitfall 1).`,
    );
    expect(wrongly).toEqual([]);
  });

  it("the unguarded splits still export what the client components import", () => {
    // A "fix" that satisfied the row above by EMPTYING config.ts or horizon.ts would be no fix at all.
    const config = texts.get("src/lib/payments/config.ts")!;
    for (const name of [
      "MIN_LEAD_REQUEST_HOURS",
      "MIN_LEAD_INSTANT_MINUTES",
      "APPROVAL_PAYMENT_WINDOW_HOURS",
    ]) {
      expect(config, `config.ts must still export ${name}`).toContain(`export const ${name}`);
    }
    const horizon = texts.get("src/lib/availability/horizon.ts")!;
    expect(horizon).toContain("export const BOOKING_HORIZON_DAYS");
    expect(horizon).toContain("export const ALL_IN_TABLE_MAX_HOURS");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — real blind spots, listed so the next reader under-trusts this file rather than over-trusts
// it.
//
//   • IT DOES NOT FOLLOW IMPORTS. Whether a CLIENT component reaches a guarded module is Turbopack's
//     question, answered at `npm run build` (D-34). This file only asserts that the guards exist to be
//     enforced. A green run here says nothing about whether the boundary currently holds.
//   • IT CANNOT SEE A GUARD DELETED TOGETHER WITH ITS MODULE. Deleting `src/lib/payments/fees.ts`
//     outright fails the "finds and parses" assertion — but MOVING the computation into an unguarded
//     module and deleting the old file would too, and the failure would read as a stale path. Whoever
//     updates a path in GUARDED_MODULES must check they are not updating away from the guard.
//   • IT DOES NOT KNOW WHAT A MODULE COMPUTES. The deny-list is a curated list of eight paths. A NINTH
//     money or availability module added tomorrow is unguarded and unnoticed here; only a reader adding
//     the row closes that. The list is a floor, not a derivation.
//   • IT ASSERTS PRESENCE, NOT POSITION. A guard below other imports still counts (see the self-test),
//     which matches Next's own behaviour but means this file will not enforce the first-statement
//     convention the eight modules currently follow.
//   • THE `export const` CHECKS IN THE LAST CASE ARE TEXTUAL, not AST — they are an anti-vacuity control
//     on the negative rows, not a contract on those modules' export shape, which
//     tests/use-server-exports.test.ts owns.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
