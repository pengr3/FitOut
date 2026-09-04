// D-03 — THE SET OF REFUSALS `createDraftListing` CAN RETURN AND THE ROUTER THAT DISPATCHES THEM ARE
// KEPT IN AGREEMENT BY A MACHINE, NOT BY A COMMENT CLAIMING THEY AGREE.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE IS FOR — the class, not the instance
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `createDraftListing` (`src/app/actions/listing.ts`) can refuse in exactly three ways, and
// `(host)/host/listings/new/page.tsx` sends each one somewhere different: the verification refusal to
// the account check, the infrastructure failure to the grid with the D-03 token, and no session to
// sign-in. Those three destinations are not interchangeable — each is chosen because it is the only
// page that can tell that particular host what happened and what to do about it.
//
// A FOURTH REFUSAL ADDED TO THE ACTION WOULD FALL THROUGH THE ROUTER'S LAST BRANCH AND LAND ON
// SIGN-IN. Nothing about that is loud: the types still check, every existing test still passes, and a
// host meets a login form for a reason that has nothing to do with their session. That is the D-03
// class of defect — a host sent somewhere that does not describe what happened — arrived at from a
// different direction than the one 19-VERIFICATION gap 2 recorded.
//
// This file is the answer to "how is the fourth one caught?". It derives the refusal set FROM SOURCE
// at runtime and requires it to be exactly the three the router knows about. It runs under
// `vitest.design.config.ts`, which has no `globalSetup` and no `setupFiles` — so it touches NO
// database and is safe inside `next build`. That is what makes it build-blocking, which is the point:
// a gate that only runs when someone remembers to run it is not a gate.
//
// ── WHO OWNS WHAT, SO NO PROPERTY IS ASSERTED TWICE BY ACCIDENT ──────────────────────────────────
//   • `tests/host/verification-surface.test.ts` CLAIM 4 owns the ORDERING property — that the
//     pre-action verification redirect is placed before the `createDraftListing()` call.
//   • `tests/listing/create-routing.test.ts` owns the BEHAVIOURAL property — each refusal actually
//     reaches its destination, driven through the page.
//   • THIS FILE owns the COVERAGE property — the refusal set and the router still describe the same
//     three things. It is the only one of the three that goes red for a refusal nobody routed yet.
//
// ── THE COMMENT-STRIPPING, AND WHY IT IS LOAD-BEARING HERE SPECIFICALLY ──────────────────────────
// Every strip goes through `stripComments` from `tests/helpers/source-text.ts` — the repository's ONE
// stripper, self-tested in both directions by `tests/design/upload-policy.test.ts`. A second copy here
// would be exactly the drift that helper exists to prevent.
//
// It is not tidiness. BOTH modules scanned below discuss, in prose, the very tokens this census
// matches: the action's guarded-region comment names `LISTING_CREATE_FAILED_STATE` and the shape of a
// `{ ok: false }` return, and the page's header names both discriminants and quotes `/host/verify`'s
// own lede. An unstripped scan would read that prose as code and report coverage that no statement
// provides — the falsely-green half of the both-directions rule that helper's header records.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { stripComments } from "../helpers/source-text";

const ACTION_FILE = "src/app/actions/listing.ts";
const PAGE_FILE = "src/app/(host)/host/listings/new/page.tsx";
const COPY_FILE = "src/lib/listing/create-signal.ts";

/** The two refusals that are IMPORTED CONSTANTS, and therefore nameable by both ends. */
const VERIFICATION_REFUSAL = "HOST_VERIFICATION_LISTING_REFUSED";
const INFRASTRUCTURE_REFUSAL = "LISTING_CREATE_FAILED_STATE";

/** Read a repo-relative file as text. */
function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

/**
 * The comment-stripped body of `createDraftListing`, sliced from its own `export async function`
 * marker to the start of the next one.
 *
 * ⚠ THE SLICE HAPPENS BEFORE THE STRIP AND IT IS NOT BELT-AND-BRACES. `listing.ts` declares five other
 * server actions, several of which return `{ ok: false, error: … }` for reasons that have nothing to
 * do with listing creation. A whole-file scan would collect those too and report a refusal set the
 * router was never supposed to cover — a red nobody could fix by making the code correct.
 */
function createDraftListingBody(): string {
  const source = readSource(ACTION_FILE);
  const start = source.indexOf("export async function createDraftListing");
  expect(
    start,
    `\`export async function createDraftListing\` was not found in ${ACTION_FILE}. The census cannot ` +
      "locate the function whose refusals it exists to enumerate, so it would collect ZERO refusals " +
      "and pass vacuously over a router covering nothing. Fix the marker here rather than deleting " +
      "the assertion.",
  ).toBeGreaterThanOrEqual(0);

  const rest = source.slice(start + 1);
  const nextExport = rest.indexOf("export async function");
  return stripComments(nextExport >= 0 ? rest.slice(0, nextExport) : rest);
}

/**
 * The `error:` value EXPRESSION from every `{ ok: false, … }` return in `createDraftListing`, in
 * source order — the expression as written, so an identifier and a literal are distinguishable.
 */
function deriveRefusalExpressions(): string[] {
  return [...createDraftListingBody().matchAll(/\{\s*ok:\s*false\s*,\s*error:\s*([^}]+?)\s*\}/g)].map(
    (m) => m[1].trim(),
  );
}

/** Every `if (…)` condition in the page, comment-stripped. None of ours nests parentheses. */
function pageConditions(): string[] {
  const code = stripComments(readSource(PAGE_FILE));
  return [...code.matchAll(/if\s*\(([^)]*)\)/g)].map((m) => m[1].replace(/\s+/g, " ").trim());
}

describe("D-03 — `createDraftListing`'s refusal set is exactly what the router dispatches", () => {
  it("the action returns exactly THREE refusals, and they are the three the page routes", () => {
    const expressions = deriveRefusalExpressions();

    // The COUNT is asserted, not just the membership, and that is the whole point. A check that only
    // asked "are these two identifiers present?" would stay green the moment a FOURTH refusal was
    // added — which is precisely the change that needs a human decision.
    expect(
      expressions.length,
      `\`createDraftListing\` now has ${expressions.length} \`{ ok: false }\` return(s), not 3. ` +
        `Collected: ${expressions.join(" | ") || "(none)"}.\n` +
        "A REFUSAL WAS ADDED OR REMOVED AND THE PAGE THAT ROUTES THEM HAS NOT BEEN TOLD. " +
        "`(host)/host/listings/new/page.tsx` dispatches on the two named constants and sends " +
        "everything else to sign-in, so a new refusal falls through silently and a host meets a login " +
        "form for a reason that has nothing to do with their session. That is a host sent somewhere " +
        "that does not describe what happened — the class D-03 exists to prevent, arrived at from a " +
        "different direction.\n" +
        "YOUR JOB IS TO DECIDE WHERE THE NEW REFUSAL ROUTES, in the page's failure block, and then to " +
        "update this count. Do not delete the assertion: a zero here would mean the slice or the " +
        "pattern stopped matching and this census is passing over nothing.",
    ).toBe(3);

    const identifiers = expressions.filter((e) => /^[A-Z][A-Z0-9_]*$/.test(e));
    const literals = expressions.filter((e) => /^["'`]/.test(e));

    expect(
      identifiers.slice().sort(),
      "The two refusals that are IMPORTED CONSTANTS are no longer both present. They must be " +
        "identifiers rather than spelled sentences: the action returns the constant and the page " +
        "compares against the same constant, which is what stops the origin and the destination " +
        "drifting apart on a string nobody diffs.",
    ).toEqual([VERIFICATION_REFUSAL, INFRASTRUCTURE_REFUSAL].sort());

    expect(
      literals.length,
      "Expected exactly ONE bare string literal among the refusals — the no-session sentence, which " +
        "is a literal deliberately: it is the one refusal the product path can never surface (the " +
        "page redirects a sessionless visitor at its first statement), so it has no host-facing copy " +
        "to police and no reason to own a module. A SECOND literal means a host-facing sentence has " +
        "been written inline in a `\"use server\"` module, where it is module-private and invisible to " +
        "the banned-language corpus that polices every sentence a host reads.",
    ).toBe(1);
  });

  it("the page routes both named refusals, and its failure block tests `res.ok` alone", () => {
    const code = stripComments(readSource(PAGE_FILE));

    for (const identifier of [VERIFICATION_REFUSAL, INFRASTRUCTURE_REFUSAL]) {
      expect(
        code.includes(identifier),
        `The page no longer compares against \`${identifier}\`. Its failure block is the ONLY place ` +
          "the three refusals are told apart, so a missing discriminant does not fail loudly — it " +
          "collapses two destinations into one and a host is quietly sent to a page that does not " +
          "describe what happened.\n" +
          "⚠ `tests/host/verification-surface.test.ts` CLAIM 4 owns the ORDERING property (the " +
          "pre-action redirect precedes the action call) and this file owns the COVERAGE property. " +
          "Neither duplicates the other, so a green CLAIM 4 says nothing about this.",
      ).toBe(true);
    }

    const resConditions = pageConditions().filter((c) => /\bres\b/.test(c));

    expect(
      resConditions.some((c) => /^!\s*res\.ok$/.test(c)),
      `The failure block no longer opens on \`!res.ok\` alone. Conditions found: ` +
        `${resConditions.join(" | ") || "(none)"}.`,
    ).toBe(true);

    const idChecks = resConditions.filter((c) => /res\.id/.test(c));
    expect(
      idChecks,
      `The page tests \`res.id\` in a condition: ${idChecks.join(" | ")}. That check is DEAD — ` +
        "`createDraftListing` returns `CreateDraftListingResult`, whose success arm carries a required " +
        "`id: string`, so an `ok: true` without an id does not type-check at the origin. Re-adding the " +
        "check does not make the code safer; it re-introduces a branch that cannot be reached and " +
        "therefore cannot be tested, and it hides the fact that the guarantee now comes from the type.",
    ).toEqual([]);

    // The bounce statement three gates count and shape. Assembled from halves for the reason CLAIM 4
    // records: a test file spelling it contiguously is how a count-based gate reads a correct tree as
    // a broken one.
    const GRID_BOUNCE = `redirect("/host/${"listings"}"`;
    expect(
      code.split(GRID_BOUNCE).length - 1,
      "The bounce to the grid was removed or duplicated. It carries the D-03 signal to the one " +
        "surface that renders it, and its destination literal is counted by CLAIM 4 as well as here. " +
        "If you were appending something: append to the QUERY and leave the literal spelled exactly " +
        "as it is.",
    ).toBe(1);
  });

  it("the copy module still imports NOTHING, so no runtime value can reach a host-facing sentence", () => {
    // ⚠ THIS DUPLICATES A CASE IN `tests/listing/create-signal.test.ts` DELIBERATELY, and the reason is
    // WHERE it runs rather than WHAT it asserts. That file lives under `vitest.config.ts`, whose
    // `globalSetup` preflights the `fitout_test` Postgres and hard-fails when it is unreachable — so
    // it cannot run inside `next build` and does not block a commit on a machine with no Docker. This
    // file needs no database and IS build-blocking. The property that makes it STRUCTURALLY
    // IMPOSSIBLE for an error string, a stack or a support address to be composed into a sentence a
    // host reads (T-19-32) is now checked on the cheap always-run path too.
    const importLines = readSource(COPY_FILE)
      .split("\n")
      .filter((line) => /^\s*import\b/.test(line));

    expect(
      importLines,
      `\`${COPY_FILE}\` has gained import line(s): ${importLines.join(" | ")}. The zero-import ` +
        "property is LOAD-BEARING rather than tidy — it is what makes it impossible for a runtime " +
        "value to reach the words a host reads. The sentence is fixed constants and nothing else, and " +
        "an import is the first step toward interpolating a database message, a status code or a " +
        "component name into copy the host can act on none of (T-19-32).",
    ).toEqual([]);
  });
});
