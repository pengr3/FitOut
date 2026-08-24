// @vitest-environment jsdom

// F-2 (QUICK 260824-dbc) — THE PRIMARY ACTION ON `/host/bookings` IS NOT CLIPPED AT REST.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE DEFECT, MEASURED IN A REAL BROWSER BEFORE ANYTHING WAS WRITTEN HERE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Phase 14's UAT pass reported the Approve control running past the table's clip edge at 1280px, and
// filed its own caveat: the fixture's space titles were longer than the seeded catalogue's, so it might
// be a width-and-content artefact rather than a defect. That caveat was tested and it is WRONG — the
// seeded catalogue is the WORSE case, because `QC Strength & Conditioning Gym` is longer than anything
// the fixture used. Driven at 1280px against the catalogue's own five titles and cities:
//
//   BEFORE   container clientWidth 864 · scrollWidth 1043 · overflow 179px
//            Approve box x=1060→1150 against a clip edge at x=1072 — 78 of its 90px past the edge.
//            Column widths: Guest 69 · Space 234 · When 366 · Status 112 · Payout 63 · Actions 199.
//   AFTER    container clientWidth 864 · scrollWidth 864 · overflow 0
//            Approve box x=881→971, 101px clear of the same edge.
//            Column widths: Guest 69 · Space 174 · When 248 · Status 112 · Payout 63 · Actions 199.
//
// THE MECHANISM. The shared table cell forbids wrapping on EVERY cell it renders. Two of this route's
// cells hold a SENTENCE rather than a token — the space title, and the venue-local window label — so
// each contributes its full unbroken length to the table's minimum width. Two unbreakable sentences
// were 600 of the 1043 pixels. The fix lets exactly those two wrap, at their own call sites; the
// shared cell's default is untouched, so no other table in the tree moved.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE CAN AND CANNOT SEE — READ THIS BEFORE TRUSTING IT
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// ⚠ THE NUMBERS ABOVE ARE NOT RE-MEASURED HERE, AND CANNOT BE. jsdom computes no layout: it has no
// `scrollWidth` worth reading and no table layout algorithm at all, so "the Approve button is inside
// the clip edge" is not assertable in this suite and is not attempted. What IS assertable is the
// mechanism that produced those numbers, and it is asserted in the two halves that can each break on
// their own:
//
//   • Case (2) renders the SHARED cell and reads the class list it actually resolves to. An override
//     that is written but silently discarded by the class merger is a no-op that looks exactly like a
//     fix, and it is the failure a source grep alone would sail straight past.
//   • Case (3) asks the ROUTE whether its two sentence cells are the ones carrying that override, and
//     it identifies them BY THEIR CONTENT — the cell that renders the space title, and the cell that
//     renders the window label — rather than by any styling they happen to have. A later edit that
//     reorders or restyles the columns keeps passing; one that deletes the override does not.
//
// Case (1) is a POSITIVE CONTROL and it is not decoration. If the shared cell ever stops forbidding
// wrapping, these two overrides become dead weight — and a suite that only asserted their presence
// would keep them alive forever without ever saying why. This case is what makes the pair go red
// together and forces the next reader to re-decide.
//
// D-154 STANDS AND IS NOT LOOSENED BY ANY OF THIS. The tab partition, the `?listing=` filter, the page
// size, the cursor and the owner-scoped WHERE are untouched, and nothing here adds a host-side filter,
// sort, column or date range. D-154 permits widening or reordering columns; letting two columns wrap
// is the smallest member of that family. `tests/design/elevation-z.test.ts` still pins this route at
// exactly one raised element and that number did not move.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED — RUN AND REVERTED (24 August 2026). GREEN IS 3 PASSED.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// A gate that has never been watched failing is not a gate (`tests/design/infra.test.ts:5-9`). Command:
// `npx vitest run --config vitest.design.config.ts tests/design/host-bookings-wrap.test.tsx`
//
//   (a) THE FIX REVERTED — both overrides removed from `bookings/page.tsx`, i.e. the tree exactly as
//       the UAT pass found it. **1 failed / 2 passed**, on case (3), naming the first cell it reached:
//
//         the /host/bookings cell that renders the space title still forbids wrapping …
//         expected false to be true
//
//   (b) THE OVERRIDE REPLACED BY A NON-CONFLICTING ONE — case (2)'s render given `wrap-anywhere`,
//       which breaks long words but does NOT displace the shared no-wrap default, so the cell still
//       refuses to break between words and the table's minimum width does not move. **1 failed / 2
//       passed**, on case (2) alone:
//
//         expected [ 'p-2', 'align-middle', …(3) ] to include 'whitespace-normal'
//
//       ⚠ STATED PRECISELY, because the two clauses in that case are not equally reachable. This
//       probe fires the FIRST clause — the permission is absent. The SECOND clause (the permission is
//       present AND the default survived beside it) cannot be provoked from this repository at all:
//       it fires only if the class merger itself stops resolving the conflict, which is a change in
//       a dependency rather than in this tree. It is written down anyway because that is exactly the
//       upgrade this route would not otherwise notice — the source would still read as fixed.
//
// Both reverted → 3 passed.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import * as React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

afterEach(cleanup);

const ROUTE = "src/app/(host)/host/bookings/page.tsx";
const source = readFileSync(resolve(__dirname, "../..", ROUTE), "utf8");

/** The utility that forbids a cell's content from breaking across lines. */
const NO_WRAP = "whitespace-nowrap";
/** The utility that gives it permission to. */
const MAY_WRAP = "whitespace-normal";

/** Render one cell through the real shared components and read the class list it resolves to. */
function resolvedCellClasses(className?: string): string[] {
  const { container } = render(
    <Table>
      <TableBody>
        <TableRow>
          <TableCell className={className}>content</TableCell>
        </TableRow>
      </TableBody>
    </Table>,
  );
  const cell = container.querySelector<HTMLElement>('[data-slot="table-cell"]');
  if (!cell) throw new Error("the shared table rendered no cell");
  return Array.from(cell.classList);
}

/**
 * Every `<TableCell>` on the route, paired with the source of what it renders.
 *
 * Cells do not nest, so the non-greedy body match cannot run past its own closing tag. Self-closing
 * cells would be missed — there are none, and case (3)'s count clause is what would notice.
 */
function routeCells(): { attrs: string; body: string }[] {
  return [...source.matchAll(/<TableCell([^>]*)>([\s\S]*?)<\/TableCell>/g)].map((m) => ({
    attrs: m[1],
    body: m[2],
  }));
}

describe("F-2 — the two sentence cells on /host/bookings are allowed to wrap", () => {
  it("(1) POSITIVE CONTROL: the shared table cell forbids wrapping by default", () => {
    expect(
      resolvedCellClasses(),
      "the shared table cell no longer forbids wrapping. That is not a failure of this route — it " +
        "means the two overrides case (3) requires have become dead weight, and somebody has to " +
        "decide whether to delete them rather than let this suite keep them alive unexamined.",
    ).toContain(NO_WRAP);
  });

  it("(2) the override RESOLVES: a cell given wrap permission does not keep the no-wrap default", () => {
    const classes = resolvedCellClasses(MAY_WRAP);

    // BOTH CLAUSES, because the interesting failure is not "the class is missing" — it is "the class
    // is present AND so is the default it was supposed to displace", which renders exactly as if
    // nothing had been written and reads in the source exactly as if it had.
    expect(classes).toContain(MAY_WRAP);
    expect(
      classes,
      `a cell given \`${MAY_WRAP}\` still carries \`${NO_WRAP}\`. The override is a no-op: the two ` +
        "utilities are in conflict and the class merger is no longer resolving it, so the fix reads " +
        "correctly in the source and changes nothing on screen.",
    ).not.toContain(NO_WRAP);
  });

  it("(3) the route grants that permission to its space-title and window-label cells, by content", () => {
    const cells = routeCells();

    // NOT VACUOUS: the desktop table has six columns, and a regex that matched nothing would satisfy
    // every `find`-based clause below by never reaching one.
    expect(cells.length, `${ROUTE} rendered no <TableCell>s — the match found nothing`).toBeGreaterThanOrEqual(6);

    // Identified by WHAT THEY RENDER. These two are the route's only free-text sentences, which is the
    // property that makes them unbreakable width; every other cell holds a name, a badge, a figure or
    // a control cluster.
    //
    // ⚠ RENDERED AS A CHILD, NOT PASSED AS A PROP. The negative lookbehind is load-bearing and was put
    // there by a failure: the actions cell forwards the SAME window label into `RequestActions` as
    // `whenLabel={row.whenLabel}`, so a plain substring match found the label in two cells and this
    // case went red counting them. The cell under test is the one that DISPLAYS the sentence; the one
    // that hands it to a control is not a width problem and must not be given wrap permission.
    for (const { what, marker } of [
      { what: "the space title", marker: /(?<!=)\{row\.spaceTitle\}/ },
      { what: "the venue-local window label", marker: /(?<!=)\{row\.whenLabel\}/ },
    ]) {
      const matched = cells.filter((c) => marker.test(c.body));
      expect(
        matched.length,
        `expected exactly one <TableCell> in ${ROUTE} rendering ${what} (${marker})`,
      ).toBe(1);
      expect(
        matched[0].attrs.includes(MAY_WRAP),
        `the ${ROUTE} cell that renders ${what} still forbids wrapping. It holds a sentence, so its ` +
          "full unbroken length becomes part of the table's minimum width — measured at 1043px " +
          "against an 864px container, which pushed 78 of the Approve button's 90 pixels past the " +
          "clip edge. See this file's header for the before/after measurement.",
      ).toBe(true);
    }
  });
});
