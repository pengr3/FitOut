// D-02 — THE COMPLETENESS OF `createDraftListing`'s REUSE PREDICATE IS A PROPERTY A MACHINE CHECKS,
// NOT A COMMENT THAT CLAIMS IT.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE IS FOR — the class, not the instance
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `createDraftListing` (`src/app/actions/listing.ts`) hands a host back their own UNTOUCHED empty
// draft rather than minting a second one. "Untouched" is decided by a predicate whose load-bearing
// term is `updated_at = created_at`, plus one `NOT EXISTS` conjunct per child table whose writer
// inserts a child row WITHOUT updating the parent `listing` row — because such a writer leaves the
// timestamps equal and is therefore invisible to the timestamp term.
//
// THREE TIMES NOW a child table has been found missing from that set, and each time the fix closed
// the INSTANCE:
//   1. `listing_photo`     — `listing-photo.ts` inserts inside a transaction, no `update(listing)`.
//   2. `operating_hours`   — `operating-hours.ts` does the same.
//   3. `availability_block` — `blocks.ts`'s `addBlock` does the same (19-VERIFICATION gap 1 / CR-02).
//
// The third was missed by TWO separate prose censuses that had already been written down as
// complete. A comment asserting "these are the real gaps" cannot be re-run, cannot be watched go
// red, and goes stale the moment a table is added. THIS FILE IS THE ANSWER TO "HOW IS THE FOURTH
// CAUGHT?": every table in `src/lib/db/schema.ts` that references `listing.id` must be either
// COVERED by a conjunct or EXEMPTED here with a written reason. An eighth child table reddens this
// test BY NAME until a human decides which.
//
// It runs under `vitest.design.config.ts`, which has no `globalSetup` and no `setupFiles` — so this
// file touches NO database and is safe inside `next build`. That is what makes it build-blocking,
// which is the point: a gate that only runs when someone remembers to run it is not a gate.
//
// ── WHY EVERY FAILURE MESSAGE HERE NAMES A DIRECTION ─────────────────────────────────────────────
// The two failure directions are not symmetric, and `createDraftListing`'s own docblock says so:
//   • TOO LOOSE — reuse adopts a draft the host has put real work into. The host presses *Create
//     listing* for their second space, lands in the wizard for their first one, edits it, OVERWRITES
//     REAL WORK, and never learns a second listing was not created. Silent data loss on a host's own
//     content. UNACCEPTABLE.
//   • TOO TIGHT — one surplus empty draft appears in the grid. Visible, deletable, one row.
//     TOLERABLE.
// So a red here is never "delete the assertion". It is "decide which direction this table belongs
// on", and the tie always breaks toward tight.
//
// ── THE COMMENT-STRIPPING, AND ITS KNOWN LIMITATION ──────────────────────────────────────────────
// Every strip in this file goes through `stripComments` from `tests/helpers/source-text.ts` — the
// repository's ONE stripper, self-tested in both directions by `tests/design/upload-policy.test.ts`.
// A second copy here would be exactly the drift that helper exists to prevent.
//
// Its documented limitation, recorded rather than worked around: it is a regex pass with NO
// string-literal awareness, so a `//` inside a code string takes the rest of that line with it. That
// CANNOT produce a false pass in this file, and the reason is structural: stripping only REMOVES
// text, so a genuine raw-SQL writer whose statement survives the strip is still measured, and the
// property-3 scan narrows further to the region between the match and the following `WHERE`.
//
// ⚠ `src/lib/db/schema.ts` IS READ UNSTRIPPED, DELIBERATELY, AND THAT IS THE SAME ASYMMETRY AGAIN.
// The child-table set is the set of things that must be DECIDED, so under-counting it is the
// falsely-green direction (a real child table silently stops being required) while over-counting it
// is merely a red that forces a decision. Since `stripComments` can only remove, stripping here
// could only ever under-count. Measured today: zero comments in `schema.ts` spell the reference
// fragment, so the two readings agree — and if one ever does, this file goes red in the tolerable
// direction rather than quiet in the unacceptable one.

import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { stripComments } from "../helpers/source-text";

const SCHEMA_FILE = "src/lib/db/schema.ts";
const ACTION_FILE = "src/app/actions/listing.ts";

/**
 * The child tables NOT covered by a `NOT EXISTS` conjunct, each with the reason it does not need
 * one. Every reason below was CONFIRMED against the source named in it during 19-09, not inherited.
 *
 * A table belongs here only when a writer of it CANNOT leave the parent `listing` row reading
 * `updated_at = created_at` — either because the same statement bumps the parent, or because no such
 * row can exist on a draft at all.
 */
const EXEMPT: Readonly<Record<string, string>> = {
  listing_amenity:
    "Written ONLY by `saveListingStep` (src/app/actions/listing.ts — the sole `insert(listingAmenity)` " +
    "in src/), inside the SAME `db.transaction` as its `.update(listing).set(patch)` whose `patch` " +
    "sets `updatedAt: new Date()` explicitly. The row and the parent's timestamp commit together, so " +
    "the `updated_at = created_at` term already catches it.",
  listing_activity_tag:
    "Identical writer, identical transaction, identical reason — `saveListingStep`'s `tx.insert(listingActivityTag)` " +
    "sits in the same `db.transaction` as the `.update(listing)` that bumps `updatedAt`.",
  listing_review:
    "This is the ops REVIEW-HISTORY table (D-221), not a guest review. Its ONLY writer is " +
    "`markForReReview` (src/lib/listing/re-review.ts), which appends a row ONLY when its preceding " +
    "`conn.update(listing).set({ reviewState: 'pending' })` actually moved a row — a Drizzle update " +
    "through the listing table object, so `$onUpdate` has already pushed `updated_at` off " +
    "`created_at`. And it cannot fire on a draft at all: that UPDATE is guarded by " +
    "`inArray(listing.reviewState, ['approved','grandfathered','rejected'])` while a fresh row " +
    "defaults to `review_state = 'pending'` (schema.ts), so the statement is a 0-row no-op and no " +
    "history row is appended.",
  booking:
    "A draft is never bookable, so no draft can carry one. `deriveBookable` (src/lib/bookability.ts) " +
    "requires `listing.status === 'published'` AND `hasOperatingHours`, and a fresh draft is " +
    "`status = 'draft'` with no `operating_hours` row — the second of which the predicate already " +
    "covers with its own conjunct.",
};

/** Read a repo-relative file as text. */
function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

/**
 * Every table in `schema.ts` that declares a foreign key to `listing.id`, derived from source at
 * runtime rather than hardcoded — a hardcoded list would go stale exactly the way the prose census
 * did, which is the defect this file exists to remove.
 *
 * For each `.references(() => listing.id` occurrence, walk backwards to the nearest preceding
 * `pgTable("<name>"` and take that quoted name. Drizzle's declaration shape puts the SQL table name
 * as `pgTable`'s first argument, which is the name the `NOT EXISTS` fragments must spell.
 */
function deriveChildTables(): string[] {
  const source = readSource(SCHEMA_FILE);
  const tables = [...source.matchAll(/pgTable\(\s*"([^"]+)"/g)].map((m) => ({
    at: m.index ?? 0,
    name: m[1],
  }));
  const references = [...source.matchAll(/\.references\(\(\)\s*=>\s*listing\.id/g)].map(
    (m) => m.index ?? 0,
  );
  const names = new Set<string>();
  for (const at of references) {
    const owner = tables.filter((t) => t.at < at).pop();
    if (owner) names.add(owner.name);
  }
  return [...names].sort();
}

/**
 * The table names appearing in a `NOT EXISTS (SELECT 1 FROM <name>` fragment inside
 * `createDraftListing`'s body.
 *
 * ⚠ THE SLICE TO THE FUNCTION BODY HAPPENS BEFORE THE STRIP, AND IT IS NOT BELT-AND-BRACES. The
 * function's docblock DISCUSSES the conjuncts in prose and names every covered table; a whole-file
 * scan would read that prose as coverage and report a table as covered when no statement covers it —
 * the falsely-green half of the both-directions rule `tests/helpers/source-text.ts`'s header records.
 */
function deriveCoveredTables(): string[] {
  const source = readSource(ACTION_FILE);
  const start = source.indexOf("export async function createDraftListing");
  expect(
    start,
    `\`export async function createDraftListing\` was not found in ${ACTION_FILE}. The census cannot ` +
      "locate the predicate it exists to check, so it would report ZERO covered tables and every " +
      "child table as undecided. Fix the marker here rather than deleting the assertion — a census " +
      "that collects nothing passes vacuously, which is the exact defect this file removes.",
  ).toBeGreaterThanOrEqual(0);

  const rest = source.slice(start + 1);
  const nextExport = rest.indexOf("export async function");
  const body = nextExport >= 0 ? rest.slice(0, nextExport) : rest;

  const code = stripComments(body);
  return [
    ...new Set(
      [...code.matchAll(/NOT\s+EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+(\w+)/gi)].map((m) =>
        m[1].toLowerCase(),
      ),
    ),
  ].sort();
}

/** Every `.ts`/`.tsx` file under `src/`, recursively. */
function sourceFiles(dir = "src", out: string[] = []): string[] {
  for (const entry of readdirSync(resolve(process.cwd(), dir), { withFileTypes: true })) {
    const rel = join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(rel, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(rel);
  }
  return out;
}

/**
 * Every raw-SQL statement under `src/` that updates the `listing` row, as `{ file, setClause }`.
 *
 * `\blisting\b` is what stops `UPDATE listing_review` (`src/app/actions/ops-review.ts`) counting as a
 * hit: `listing_review` has no word boundary after `listing`, because `_` is a word character.
 *
 * `.tsx` is included alongside `.ts` even though today's writers are all `.ts`. Including it can only
 * ADD hits, never hide one, and the property being asserted is about EVERY raw-SQL writer under
 * `src/` — not about the file extensions today's writers happen to use.
 *
 * @param strip when false, read the file raw — used ONLY by the test that proves stripping is
 *   load-bearing rather than decorative.
 */
function rawListingUpdates(strip = true): { file: string; setClause: string }[] {
  const hits: { file: string; setClause: string }[] = [];
  for (const file of sourceFiles()) {
    const text = readSource(file);
    const code = strip ? stripComments(text) : text;
    for (const match of code.matchAll(/UPDATE\s+listing\b/gi)) {
      const after = code.slice((match.index ?? 0) + match[0].length);
      const where = after.search(/\bWHERE\b/i);
      hits.push({ file, setClause: where >= 0 ? after.slice(0, where) : after });
    }
  }
  return hits;
}

describe("D-02 — every child table of `listing` is DECIDED: covered by a conjunct, or exempted with a reason", () => {
  it("the child-table set is derived from schema.ts at runtime and is not empty", () => {
    const children = deriveChildTables();
    expect(
      children.length,
      `No table in ${SCHEMA_FILE} was found declaring \`.references(() => listing.id\`. That is not a ` +
        "clean bill of health — it means the derivation regex stopped matching the schema's " +
        "declaration shape, and with an EMPTY child set property 1 below passes VACUOUSLY while the " +
        "reuse predicate could be missing every conjunct it has. Fix the derivation, never the " +
        "expectation.",
    ).toBeGreaterThan(0);

    // Anti-vacuity with teeth: the table whose absence WAS the shipped defect (19-VERIFICATION gap 1)
    // must be derivable, or this census would have been green over the very bug it was written for.
    expect(
      children,
      "`availability_block` is not in the derived child set, so this census would have been GREEN " +
        "against the tree that shipped the D-02 loophole it exists to catch. The derivation is " +
        "broken, not the schema.",
    ).toContain("availability_block");
  });

  it("every child of `listing` is either covered by a NOT EXISTS conjunct or carries a written exemption", () => {
    const children = deriveChildTables();
    const covered = deriveCoveredTables();
    const decided = new Set([...covered, ...Object.keys(EXEMPT)]);
    const undecided = children.filter((t) => !decided.has(t));

    expect(
      undecided,
      `UNDECIDED CHILD TABLE(S) OF \`listing\`: ${undecided.join(", ") || "(none)"}.\n` +
        "A table references `listing.id` and `createDraftListing`'s reuse predicate neither checks " +
        "for it nor records why it does not need to. YOUR JOB IS TO DECIDE WHICH, NOT TO DELETE THIS " +
        "ASSERTION.\n" +
        "  • If a writer of this table can insert a row WITHOUT updating the parent `listing` row " +
        "(no `db.update(listing)` in the same transaction), it must get a `NOT EXISTS` conjunct. " +
        "Skipping it is the TOO LOOSE direction: reuse adopts a draft the host has put real work " +
        "into, the host overwrites it in the wizard believing it is a new listing, and NEVER LEARNS. " +
        "Silent data loss on a host's own content — UNACCEPTABLE.\n" +
        "  • If no such row can exist on an untouched draft, or its writer always bumps the parent's " +
        "`updated_at` in the same statement, add it to `EXEMPT` above WITH THE SOURCE THAT PROVES IT. " +
        "Getting this wrong costs one surplus empty draft in the grid — visible, deletable — the TOO " +
        "TIGHT direction, TOLERABLE.\n" +
        "⚠ THIS CHECK EXISTS BECAUSE TWO PROSE CENSUSES MISSED `availability_block` " +
        "(19-VERIFICATION gap 1 / 19-REVIEW CR-02). A comment claiming the set is complete cannot be " +
        "re-run and cannot be watched go red; this can.",
    ).toEqual([]);
  });

  it("no table is BOTH covered by a conjunct and listed as exempt", () => {
    const covered = new Set(deriveCoveredTables());
    const both = Object.keys(EXEMPT).filter((t) => covered.has(t));
    expect(
      both,
      `These tables are covered by a \`NOT EXISTS\` conjunct AND listed in \`EXEMPT\`: ${both.join(", ")}. ` +
        "The exemption is stale — its reason claims the predicate does not need to check this table, " +
        "while the predicate checks it. Delete the EXEMPT entry (the conjunct is the stronger " +
        "statement and stays), or delete the conjunct if the reason is genuinely correct. Leaving " +
        "both means the next reader cannot tell which one is the decision.",
    ).toEqual([]);
  });

  it("every exemption carries a non-empty written reason", () => {
    const empty = Object.entries(EXEMPT)
      .filter(([, reason]) => reason.trim().length === 0)
      .map(([table]) => table);
    expect(
      empty,
      `Exempted with no reason: ${empty.join(", ")}. An exemption without a stated reason is the ` +
        "prose census in a new costume — unverifiable and unfalsifiable. State the source that " +
        "proves the table's writer cannot leave `updated_at = created_at`.",
    ).toEqual([]);
  });

  it("every NOT EXISTS conjunct names a REAL child table of `listing`", () => {
    const children = new Set(deriveChildTables());
    const covered = deriveCoveredTables();
    const phantom = covered.filter((t) => !children.has(t));
    expect(
      phantom,
      `The reuse predicate checks table(s) that are not children of \`listing\`: ${phantom.join(", ")}. ` +
        "A mistyped table name in a `NOT EXISTS` conjunct is not a compile error — Drizzle's `sql` " +
        "template hands the string to Postgres verbatim, so the mistake surfaces at RUNTIME against a " +
        "live database, on a host pressing `Create listing`. This catches it at build time instead.",
    ).toEqual([]);
  });
});

describe("D-02 — every RAW-SQL writer of the `listing` row sets `updated_at`", () => {
  it("each raw `UPDATE listing` statement sets updated_at before its WHERE", () => {
    const hits = rawListingUpdates();

    // Anti-vacuity: a scan that found nothing would pass this property trivially. Two statements are
    // measured in the shipped tree (`src/app/actions/ops-review.ts`), so zero means the scan broke.
    expect(
      hits.length,
      "The raw-SQL scan found ZERO `UPDATE listing` statements under `src/`. That is not a clean " +
        "tree — the shipped tree contains two (in `src/app/actions/ops-review.ts`), so a zero here " +
        "means the walk or the pattern stopped working and this property is passing over nothing.",
    ).toBeGreaterThan(0);

    const missing = hits.filter((h) => !/updated_at/i.test(h.setClause));
    expect(
      missing.map((h) => h.file),
      `Raw-SQL \`UPDATE listing\` statement(s) with no \`updated_at\` in the SET clause: ` +
        `${missing.map((h) => h.file).join(", ")}.\n` +
        "Drizzle's `$onUpdate` on `listing.updatedAt` is a CLIENT HOOK, NOT A DATABASE TRIGGER. It " +
        "fires on `db.update(listing)` and on nothing else — raw SQL walks straight past it. So a raw " +
        "statement that changes this row without setting `updated_at` leaves a TOUCHED row still " +
        "reading `updated_at = created_at`, i.e. reading as UNTOUCHED, and `createDraftListing`'s " +
        "reuse predicate will then hand that row back to the host as a brand-new listing. That is the " +
        "SILENT-DATA-LOSS direction: the host edits work they already did, believing it is new, and is " +
        "never told. Set `updated_at = now()` in the SET clause — both existing statements do.",
    ).toEqual([]);
  });

  it("the scan matches on a word boundary, so `UPDATE listing_review` is not counted", () => {
    // `src/app/actions/ops-review.ts` contains a raw `UPDATE listing_review` alongside its two
    // `UPDATE listing` statements. Counting it would make this property assert something about a
    // table that has no `updated_at` column at all, and the resulting red would be unfixable.
    const opsHits = rawListingUpdates().filter((h) => h.file.includes("ops-review"));
    expect(
      opsHits.length,
      "Expected exactly the two `UPDATE listing` statements in `src/app/actions/ops-review.ts`. A " +
        "third would mean `UPDATE listing_review` in the same file is being counted — the word " +
        "boundary in the scan pattern is what excludes it, because `_` is a word character and " +
        "`listing_review` therefore has no boundary after `listing`.",
    ).toBe(2);
  });

  it("comment-stripping is LOAD-BEARING here, not decorative — the raw read would be RED", () => {
    // Direction 1 of the both-directions rule (`tests/design/upload-policy.test.ts`'s precedent): the
    // strip must actually remove something, or every property above could be passing over prose.
    const stripped = rawListingUpdates();
    const unstripped = rawListingUpdates(false);
    expect(
      unstripped.length,
      "The stripped and unstripped scans found the same number of hits, so `stripComments` removed " +
        "nothing and this file's central claim — that it reads CODE and not the docblocks discussing " +
        "the code — is currently unproven.",
    ).toBeGreaterThan(stripped.length);

    // Direction 2, and it is the sharp one: the comment-only hits would FAIL the property. Three
    // files discuss a raw `UPDATE listing` in prose — `src/app/actions/listing.ts`'s own D-02
    // docblock (which Task 3 rewrote), `src/lib/db/schema.ts` and
    // `src/lib/design/visual-baselines.ts` — and NONE of those prose statements sets `updated_at`.
    // So an unstripped scan is not merely noisier: it is RED against a correct tree. This assertion
    // is what proves the stripping is doing real work rather than being an unfalsifiable habit.
    const unstrippedMissing = unstripped.filter((h) => !/updated_at/i.test(h.setClause));
    expect(
      unstrippedMissing.length,
      "The unstripped scan produced no violations, which means the prose statements this file's " +
        "header names have been edited away. That is fine for the tree but it retires the evidence " +
        "that stripping is load-bearing — re-point this assertion at whatever prose remains, or " +
        "delete it deliberately rather than letting it quietly stop proving anything.",
    ).toBeGreaterThan(0);

    // And the stripped scan is clean over that same tree — both halves together are the proof.
    expect(
      stripped.filter((h) => !/updated_at/i.test(h.setClause)),
      "The stripped scan is not clean; see the property above for what a real violation means.",
    ).toEqual([]);
  });
});
