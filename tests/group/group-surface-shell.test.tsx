// @vitest-environment jsdom

// 13-UI-SPEC § The Group Surfaces (plan 13-08) — `/bookings/[id]/group` is built from the declared
// pattern layer, it renders the booking reference, and the STATE-08 alert slot survives ASSEMBLY.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE THIRD CLAUSE IS THE REASON THIS FILE EXISTS AT ALL
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// Plan 13-05 built the two STATE-08 alerts and asserted them AT THE COMPONENT — `AttendeeRoster` and
// `ShareLinkBox`, each rendered alone. Its own summary records what that leaves open and hands it
// here: *"13-08 — the group page's design pass, which verifies the STATE-08 alert slot in situ on
// the rendered page (this plan asserts it at the component)."* A component-level green says the slot
// works when the component is the whole tree. It cannot say the page still hands the component the
// prop that drives it, that nothing above it swallows the region, or that the page does not open a
// SECOND region of its own on a fresh navigation — and the last of those is a page-scale fact that
// no per-component suite can even express, because rule 6's defect is a COUNT across the surface.
//
// So the alert assertions below run over the ASSEMBLED body, with every sibling the page renders
// present at once, and they count regions across the whole tree rather than inside one subtree.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE CONTAINER CLAUSE IS A RENDER AND NOT A SOURCE SCAN — 13-07's FINDING, APPLIED
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// Plan 13-07's most transferable catch was that A SOURCE SCAN CANNOT SEE A TOKEN THAT ARRIVES VIA AN
// IMPORT: the file it scanned contained the offending class ZERO times and painted it anyway, and
// only an assertion over the rendered tree caught it. The same asymmetry applies exactly here. An
// AST scan of `page.tsx` proves the PAGE opens no `<Card>`; it is completely blind to a raw `<Card>`
// inside `HeadcountMeter`, `ShareLinkBox`, `AttendeeRoster` or `TopUpNudge` — which is to say blind
// to four of the five boxes on the surface, including every one this plan actually converted.
//
// The rendered clause is therefore expressed against `data-slot="card"`, the attribute the VENDORED
// primitive stamps on every `<Card>` it renders (`src/components/ui/card.tsx:12`), and it says: every
// card box in the assembled tree also carries a `data-testid` from the declared pattern set. A raw
// `<Card>` anywhere in the subtree has the slot and no hook, and fails. This is the container half of
// `card-pattern-coverage.test.ts` turned from an import question into a DOM question — the blind spot
// that file names first in its own NOT COVERED footer (*"THIS GATE PROVES THE CONTAINER, NOT THE
// RENDERING"*).
//
// Both halves are kept, and the chain runs: page composes the components (AST) → components render
// only pattern containers (DOM) → those containers' ids are the ones `selector-contract.ts` declares
// (union). A gate asserting only the first link stays green if `PanelCard` loses its hook tomorrow.
//
// ⚠ AND THIS IS NOT AN ARGUMENT — IT IS A MEASUREMENT. A raw `<Card>` was put back into
// `attendee-roster.tsx` and the whole of `card-pattern-coverage.test.ts` stayed green, 11/11. TWO
// independent reasons, both worth knowing: that file's forward half only asks about DECLARED surfaces
// and the roster is not one, and its inverse half skips any file on `ALLOWED_RAW_CARD` — where both
// `attendee-roster.tsx` and `(app)/bookings/[id]/group/page.tsx` are listed, each with a reason that
// says Phase 13 owns the surface. Those rows are deliberately LEFT IN PLACE (plan 13-06 made the same
// call for the cancel page and wrote up why: removing one moves no count, but ADDING the surfaces to
// `CARD_SURFACES` would make that inventory's stated derivation — "ResultCard 2 + RowCard 5 +
// PanelCard 5" — arithmetically false). The consequence is that THIS FILE is the only thing standing
// between the group surface and a fourth boxed shape. Delete it and both files are unguarded in both
// directions.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THE FIXTURE IS, AND THE ONE THING IT CANNOT PROVE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `GroupSurface` below MIRRORS the page's returned tree. It is not the page: `page.tsx` is an async
// RSC that reads the session, the database and the DB clock, and rendering it here would mean
// stubbing four modules to assert a layout. The mirror is held honest from the other side — case (2)
// reads the page's AST and asserts it composes exactly the component set the fixture renders, and
// that it opens no container of its own. If the page stops rendering `TopUpNudge`, or starts
// rendering a fifth panel, case (2) goes red and this fixture is what has to be updated.
//
// NOT COVERED — stated so the next reader under-trusts this file:
//   • A hand-rolled `<div className="bg-card ring-1 rounded-xl">` carries no `data-slot`, so it is
//     invisible here exactly as it is to `card-pattern-coverage.test.ts`. `leak.test.ts` and
//     `elevation-z.test.ts` police the token half.
//   • Nothing here measures pixels, spacing or contrast. `e2e/` owns that.
//   • The AST half sees `page.tsx` only. A component that a component imports is out of its scope —
//     which is precisely why the DOM half exists.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import Link from "next/link";
import ts from "typescript";

// The repo's toast-spy idiom (`tests/group/state08-alerts.test.tsx:66-76`, verbatim in shape). The spies
// are not the subject here, but `sonner` must be a module this environment can load, and the removal
// path's failure branch calls it.
const toastSuccess = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());
const toastWarning = vi.hoisted(() => vi.fn());
const removeAttendeeMock = vi.hoisted(() => vi.fn());
const regenerateLinkMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({
  toast: { success: toastSuccess, error: toastError, warning: toastWarning },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock, push: vi.fn() }) }));
vi.mock("@/app/actions/group", () => ({
  removeAttendee: removeAttendeeMock,
  regenerateLink: regenerateLinkMock,
}));

import type { RosterEntry } from "@/lib/group/rsvp";
import { SELECTOR_IDS } from "@/lib/design/selector-contract";
import { BOOKING_SHELL } from "@/lib/design/measurements";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/patterns/page-header";
import { PanelCard } from "@/components/patterns/panel-card";
import { BookingReference } from "@/components/booking/booking-reference";
import { AttendeeRoster } from "@/components/group/attendee-roster";
import { HeadcountMeter } from "@/components/group/headcount-meter";
import { RefreshGroupButton } from "@/components/group/group-refresh";
import { RegenerateLinkButton } from "@/components/group/regenerate-link-button";
import { ShareLinkBox } from "@/components/group/share-link-box";
import { TopUpNudge } from "@/components/group/top-up-nudge";

// jsdom implements no ResizeObserver and the Radix dialog's layers measure themselves with one
// (`tests/group/state08-alerts.test.tsx:83-90`, same stub, same reason).
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver =
  globalThis.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver);

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// The declared container hooks. A THIRD id here would be a fourth card pattern, which DS-11 calls a
// scope alarm — so the set is small on purpose and is checked against the closed contract in case (6).
// ─────────────────────────────────────────────────────────────────────────────────────────────────

const CONTAINER_TESTIDS = ["panel-card", "row-card"] as const;

/** The vendored primitive's own marker, stamped on every `<Card>` it renders. */
const CARD_SLOT = '[data-slot="card"]';

const REFERENCE = "FIT-7Q2M4XKD";
const URL_BEFORE = "https://fitout.test/invite/aaaaaaaaaaaaaaaa";
const URL_AFTER = "https://fitout.test/invite/bbbbbbbbbbbbbbbb";

/** The locked STATE-08 copy, 13-UI-SPEC § Copywriting Contract (plan 13-05 shipped both sentences). */
const ROTATION_SENTENCE =
  "The old invite link no longer works. Copy the new one below and share it again.";
const ROTATION_REGION_NAME = "Invite link updated";
const REMOVAL_REGION_NAME = "Attendee removed";

/** Two `yes` rows. The organizer holds a seat without holding an `rsvp` row (D-113), so they are not here. */
const ROSTER: RosterEntry[] = [
  {
    rsvpId: "rsvp-ana",
    name: "Ana",
    status: "yes",
    isAccount: true,
    hasEmail: true,
    createdAt: new Date("2026-08-01T00:00:00Z"),
    updatedAt: new Date("2026-08-01T00:00:00Z"),
  },
  {
    rsvpId: "rsvp-ben",
    name: "Ben",
    status: "yes",
    isAccount: false,
    hasEmail: false,
    createdAt: new Date("2026-08-02T00:00:00Z"),
    updatedAt: new Date("2026-08-02T00:00:00Z"),
  },
];

/**
 * THE ASSEMBLED SURFACE — the page's returned tree, mirrored. See the header for what this can and
 * cannot prove, and case (2) for the assertion that keeps the mirror honest.
 *
 * `GroupPoller` is omitted deliberately and ONLY because it renders `null`: it contributes no node to
 * the tree these assertions read, and it opens a timer that would outlive the test.
 */
function GroupSurface({ inviteUrl = URL_BEFORE }: { inviteUrl?: string }) {
  return (
    <div className={BOOKING_SHELL}>
      <div className="space-y-8">
        <div className="space-y-2">
          <PageHeader
            title="Your group"
            lede="Invite people, and see who's coming to The Court on Sat 5 Sep, 9:00–11:00 AM."
          />
          <p className="text-xs text-muted-foreground">Times shown in Manila time (Asia/Manila).</p>
        </div>

        <HeadcountMeter confirmed={3} capacity={9} full={false} />

        <ShareLinkBox inviteUrl={inviteUrl} />

        <AttendeeRoster entries={ROSTER} />

        {/* Both guards open, so the nudge RENDERS — a fixture that silently rendered nothing here
            would be asserting the container rule over one box fewer than the page has. */}
        <TopUpNudge attendingTotal={4} declaredPax={2} extraHeadFee={25_000} />

        <Separator />

        <div className="space-y-2">
          <RegenerateLinkButton groupId="group-1" />
          <p className="text-sm text-muted-foreground">
            Shared the link too widely? Get a new one — the old link stops working, and everyone
            who&apos;s already RSVP&apos;d stays on your list.
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Booking reference</p>
          <BookingReference reference={REFERENCE} />
        </div>

        <Button asChild variant="ghost" size="touch" className="w-full">
          {/* `next/link`, not a bare `<a>` — the page uses it and the repo's lint rule requires it. */}
          <Link href="/bookings/booking-1">Back to your booking</Link>
        </Button>
      </div>
    </div>
  );
}

/** The load-failure branch, mirrored — the page's OTHER return, and its box is a pattern too. */
function GroupLoadFailure() {
  return (
    <div className={BOOKING_SHELL}>
      <PanelCard>
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center gap-4 py-4 text-center"
        >
          <div className="space-y-1">
            <h1 className="text-xl leading-tight font-semibold">Your group</h1>
            <p className="mx-auto max-w-prose text-sm text-muted-foreground">
              We couldn&apos;t load your group. Try again.
            </p>
          </div>
          <RefreshGroupButton />
        </div>
      </PanelCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// The page's own source, parsed once. `(path, text)` so the self-test in case (7) runs the same code
// path the real assertion runs (`leak.test.ts:208-212`'s rule).
// ─────────────────────────────────────────────────────────────────────────────────────────────────

const PAGE_PATH = join(process.cwd(), "src", "app", "(app)", "bookings", "[id]", "group", "page.tsx");

type ParsedPage = {
  /** `moduleSpecifier` → the set of EXPORTED names imported from it. */
  readonly imports: ReadonlyMap<string, ReadonlySet<string>>;
  /** Every JSX opening/self-closing tag name in the module. */
  readonly tags: ReadonlySet<string>;
};

export function parsePage(path: string, text: string): ParsedPage {
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const imports = new Map<string, Set<string>>();
  const tags = new Set<string>();

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text;
      const bindings = node.importClause?.namedBindings;
      const set = imports.get(specifier) ?? new Set<string>();
      if (bindings && ts.isNamedImports(bindings)) {
        // `propertyName` is the EXPORTED name when aliased; `name` is the local one.
        for (const el of bindings.elements) set.add((el.propertyName ?? el.name).text);
      }
      if (node.importClause?.name) set.add("default");
      imports.set(specifier, set);
    }
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      if (ts.isIdentifier(node.tagName)) tags.add(node.tagName.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  return { imports, tags };
}

const pageSource = readFileSync(PAGE_PATH, "utf8");
const page = parsePage(PAGE_PATH, pageSource);

/** Every card box in a rendered tree, with the hook it carries (or the empty string for none). */
function cardBoxes(root: HTMLElement): { testid: string; className: string }[] {
  return [...root.querySelectorAll(CARD_SLOT)].map((el) => ({
    testid: el.getAttribute("data-testid") ?? "",
    className: el.getAttribute("class") ?? "",
  }));
}

beforeEach(() => {
  toastSuccess.mockReset();
  toastError.mockReset();
  toastWarning.mockReset();
  refreshMock.mockReset();
  removeAttendeeMock.mockReset();
  regenerateLinkMock.mockReset();
});

afterEach(cleanup);

describe("13-08 — the group surface is built from the declared pattern layer", () => {
  // ---------------------------------------------------------------------------------------------
  // GUARD THE GUARD, FIRST. Two of the three real clauses below are "a list was empty", which a scan
  // that read nothing and a render that produced nothing both satisfy perfectly.
  // ---------------------------------------------------------------------------------------------

  it("(1) parsed a real page and rendered a real tree", () => {
    expect(
      pageSource.length,
      "the page source read as empty — every AST assertion below would then pass on nothing",
    ).toBeGreaterThan(2000);
    expect(page.tags.size, "the parser resolved 0 JSX tags on a page that renders dozens").toBeGreaterThan(
      15,
    );

    const { container } = render(<GroupSurface />);
    const boxes = cardBoxes(container);
    expect(
      boxes.length,
      "the render produced 0 card boxes. `every box carries a hook` is satisfied perfectly by a tree " +
        "with no boxes in it, which is the vacuity this assertion exists to make impossible.",
    ).toBeGreaterThanOrEqual(7);
    // The breakdown, so a count of 7 cannot come from seven of the same thing: four panels (meter,
    // share box, roster, nudge) and three rows (the organizer fixture + two attendees).
    expect(boxes.filter((b) => b.testid === "panel-card").length).toBeGreaterThanOrEqual(4);
    expect(boxes.filter((b) => b.testid === "row-card").length).toBe(3);
  });

  // ---------------------------------------------------------------------------------------------
  // The AST half — the page's own composition.
  // ---------------------------------------------------------------------------------------------

  it("(2) the page opens no container of its own and composes the components this fixture mirrors", () => {
    expect(
      page.imports.has("@/components/ui/card"),
      "the group page imports the vendored card primitive again. Its containers come from " +
        "`@/components/patterns/**`; a raw `<Card>` here is DS-11's fourth boxed shape.",
    ).toBe(false);

    // The pattern layer it DOES reach for, by module and by binding — a file that merely mentions
    // `PanelCard` in a comment does not satisfy this (`card-pattern-coverage.test.ts`'s rule).
    expect([...(page.imports.get("@/components/patterns/panel-card") ?? [])]).toContain("PanelCard");
    expect([...(page.imports.get("@/components/patterns/page-header") ?? [])]).toContain("PageHeader");
    expect([...(page.imports.get("@/components/booking/booking-reference") ?? [])]).toContain(
      "BookingReference",
    );

    // The mirror's honesty check: the fixture renders these, so the page must too.
    for (const tag of [
      "PageHeader",
      "PanelCard",
      "BookingReference",
      "HeadcountMeter",
      "ShareLinkBox",
      "AttendeeRoster",
      "TopUpNudge",
      "RegenerateLinkButton",
    ]) {
      expect(
        page.tags.has(tag),
        `the page no longer renders <${tag}>. The fixture in this file mirrors the page's tree, so ` +
          "it has to move in the same commit — otherwise every assertion below is about a surface " +
          "that does not exist.",
      ).toBe(true);
    }
  });

  // ---------------------------------------------------------------------------------------------
  // The DOM half — what those components actually render.
  // ---------------------------------------------------------------------------------------------

  it("(3) every card box on the assembled page carries a declared pattern hook", () => {
    const { container } = render(<GroupSurface />);
    const unhooked = cardBoxes(container)
      .filter((b) => !(CONTAINER_TESTIDS as readonly string[]).includes(b.testid))
      .map((b) => `<Card class="${b.className}"> with data-testid="${b.testid}"`);

    expect(
      unhooked,
      "a card box on `/bookings/[id]/group` is not one of the declared patterns. Unlike the AST gate, " +
        "this sees INSIDE the components the page renders — which is where every container on this " +
        "surface actually lives. Compose `PanelCard` or `RowCard`; a fourth boxed shape is a scope " +
        "alarm, not a style preference (DS-11).",
    ).toEqual([]);
  });

  it("(4) the load-failure branch is a pattern box too", () => {
    const { container } = render(<GroupLoadFailure />);
    const boxes = cardBoxes(container);
    expect(boxes).toHaveLength(1);
    expect(boxes[0].testid).toBe("panel-card");
    // Calm, not an error surface: the branch keeps its own heading and its retry control.
    expect(screen.getByRole("heading", { level: 1, name: "Your group" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  it("(5) the booking reference renders on the assembled page, verbatim (TRUST-02 / D-78)", () => {
    render(<GroupSurface />);
    const node = screen.getByTestId("booking-reference");
    // VERBATIM — never lower-cased, never stripped of its prefix, never re-derived on the client.
    expect(node.textContent).toBe(REFERENCE);
    // Fixed-advance-width glyphs, so the string an organizer reads to support cannot be mis-transcribed.
    expect(node.className).toContain("font-mono");
    expect(node.className).toContain("tabular-nums");
    // The copy control is reachable by ROLE and carries the whole action in its accessible name.
    expect(screen.getByRole("button", { name: "Copy booking reference" })).toBeTruthy();
  });

  it("(6) the two container ids are the ones the selector contract declares", () => {
    // The last link of the chain: a hook this file invented would satisfy case (3) forever.
    for (const id of CONTAINER_TESTIDS) {
      expect(SELECTOR_IDS, `\`${id}\` is not a declared selector id`).toContain(id);
    }
    expect(CONTAINER_TESTIDS).toHaveLength(2);
  });

  it("(7) the parser reads a rendered tag and not a tag named in a comment or a string", () => {
    // The self-test, over a fixture never written to disk. The page's own header now discusses
    // `PanelCard`, `RowCard` and `<BookingReference/>` at length, so a text scan would read the
    // explanation as the composition — this phase's ninth-and-counting grep-versus-prose collision.
    const prose = parsePage(
      "fake-prose.tsx",
      [
        "// This page must NOT open a <Card>; it composes <PanelCard> instead.",
        'export const NOTE = "<RowCard> is what the roster rows use";',
        "export const A = () => <div>x</div>;",
      ].join("\n"),
    );
    expect(prose.tags.has("Card")).toBe(false);
    expect(prose.tags.has("PanelCard")).toBe(false);
    expect(prose.tags.has("div")).toBe(true);

    const real = parsePage(
      "fake-real.tsx",
      [
        'import { PanelCard } from "@/components/patterns/panel-card";',
        "export const A = () => <PanelCard>x</PanelCard>;",
      ].join("\n"),
    );
    expect(real.tags.has("PanelCard")).toBe(true);
    expect([...(real.imports.get("@/components/patterns/panel-card") ?? [])]).toContain("PanelCard");
  });
});

describe("13-08 — the STATE-08 alert slot, verified ON THE ASSEMBLED PAGE (13-05's deferral)", () => {
  it("(8) a freshly navigated page opens NO region anywhere on the surface", () => {
    // The page-scale fact no per-component suite can express. 13-05 proved each component silent on
    // mount; this proves the ASSEMBLY is silent — including the top-up nudge, which rendered
    // `role="alert"` over static content until this plan moved it onto `PanelCard tone="muted"`.
    const { container } = render(<GroupSurface />);
    expect(screen.queryAllByRole("status")).toHaveLength(0);
    expect(screen.queryAllByRole("alert")).toHaveLength(0);
    // …and the nudge really is on screen, so the zero above is not a zero over an absent block.
    expect(container.textContent).toContain("More people are coming than you booked for");
  });

  it("(9) a rotation announces ONCE, in a named region, inside a muted panel, above the field", () => {
    const view = render(<GroupSurface inviteUrl={URL_BEFORE} />);
    expect(screen.queryAllByRole("status")).toHaveLength(0);

    // A rotation reaches this surface as a CHANGED PROP — the URL is re-read server-side under the
    // owner scope on every refresh (`share-link-box.tsx`). Nothing is "told"; the box notices.
    view.rerender(<GroupSurface inviteUrl={URL_AFTER} />);

    const regions = screen.queryAllByRole("status");
    expect(
      regions,
      "the assembled page announced a rotation zero times or more than once. Exactly one region per " +
        "outcome is GATE-03 rule 6 — the count is the assertion.",
    ).toHaveLength(1);
    expect(screen.queryAllByRole("status", { name: ROTATION_REGION_NAME })).toHaveLength(1);
    expect(regions[0].textContent).toContain(ROTATION_SENTENCE);

    // The advisory surface is DS-11's, not a shape invented for this alert.
    const panel = regions[0].querySelector(CARD_SLOT);
    expect(panel?.getAttribute("data-testid")).toBe("panel-card");
    expect(panel?.getAttribute("class") ?? "").toContain("bg-muted");

    // It is read BEFORE the field it is about: DOCUMENT_POSITION_FOLLOWING means the input comes after.
    const field = screen.getByLabelText("Your invite link");
    expect(
      regions[0].compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING,
      "the rotation alert renders below the field it describes",
    ).toBeTruthy();

    // The field shows the NEW link — an announcement of a rotation that did not land would be worse
    // than none, and this is the fact that makes the sentence true.
    expect((field as HTMLInputElement).value).toBe(URL_AFTER);
  });

  it("(10) a removal announces ONCE, in a named region, above the roster it describes", async () => {
    removeAttendeeMock.mockResolvedValue({ ok: true, attending: 5, spotsFree: 3 });
    render(<GroupSurface />);

    fireEvent.click(screen.getByRole("button", { name: "Remove Ana from this group" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove attendee" }));

    await waitFor(() => expect(screen.queryAllByRole("status")).toHaveLength(1));
    const region = screen.queryAllByRole("status")[0];
    expect(screen.queryAllByRole("status", { name: REMOVAL_REGION_NAME })).toHaveLength(1);
    // The server's own two figures, restated by nobody: `attending` already includes the organizer.
    expect((region.textContent ?? "").replace(/\s+/g, " ").trim()).toBe(
      "Ana removed — 5 coming, 3 spots free.",
    );

    const panel = region.querySelector(CARD_SLOT);
    expect(panel?.getAttribute("data-testid")).toBe("panel-card");
    expect(panel?.getAttribute("class") ?? "").toContain("bg-muted");

    // ABOVE the list it describes (13-UI-SPEC § STATE-08). The roster's own panel is the box holding
    // the "Who's coming" heading, and it must come AFTER the region in document order.
    const heading = screen.getByRole("heading", { name: "Who's coming" });
    expect(
      region.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING,
      "the removal alert renders below the roster it describes",
    ).toBeTruthy();

    // Rule 6's other half: the outcome LEFT the toast and did not merely gain a second home.
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});
