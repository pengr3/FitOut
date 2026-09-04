// @vitest-environment jsdom

// D-144 + D-146 as RENDERED FACTS about the host request-inbox row (plan 14-03).
//
// WHY A RENDER TEST. Both facts are wiring facts that a later plan breaks SILENTLY:
//
//   - D-144 — THE ROW IS TERMINAL. `RowCard`'s `href` is optional, so giving this row a destination is a
//     one-word edit that no type, no lint rule and no design gate objects to. The decision that a triage
//     queue does not browse then dies quietly, and the second place carrying approve/decline arrives with
//     it. "The row passes no href" and "nothing inside the rendered row is a link" are only the same
//     statement if the container actually honours the absence — which is what this asserts, against the
//     output, with `next/link` stubbed to a plain anchor so a re-added destination shows up as one.
//
//   - D-146 — THE DEADLINE LEADS. The countdown, the money and the guest name are three text nodes that
//     any styling pass can re-rank by accident. Two halves of "loudest" are checkable here: the type ROLE
//     the digits carry (and that nothing else in the row carries it), and the ORDER — the deadline shares
//     the row's first line with the space title, and both precede the money figure.
//
// ⚠ WHAT THIS FILE DOES NOT COVER, AND WHERE IT LIVES. D-146's other half is a COMPUTED comparison —
// `getComputedStyle(...).fontSize` of the digits strictly greater than every other text node's in the row,
// at 320 / 768 / 1280. jsdom computes no stylesheet, so that measurement belongs to the Playwright spec
// `e2e/host-inbox-hierarchy.spec.ts`, which the inbox plan owns. A class name is not a font size, and this
// file never claims otherwise. What it does claim — the role is present, it is unique in the row, and the
// order is right — is exactly what a browser measurement would take for granted and never re-check.
//
// The stub set is `tests/booking/host-booking-row.test.tsx`'s, for the same reasons it gives: `next/link`
// needs an App-Router context jsdom has not got, and `RequestActions`' only server coupling is the
// approve/decline actions module (`"use server"` → pulls in the DB + `next/headers`).

import * as React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/app/actions/host-requests", () => ({
  approveRequest: vi.fn(),
  declineRequest: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { RequestRow, type RequestRowData } from "@/components/host/request-row";

afterEach(cleanup);

const SPACE_TITLE = "Sunset Court";
const GUEST = "Alex";
const MONEY = "₱1,050.00";
const WHEN = "Sat, Aug 1, 10:00 AM – 11:00 AM (Makati time)";

/** The four declared type roles (`src/lib/utils.ts`'s `TYPE_ROLES`), as the utilities that carry them. */
const ROLE_CLASSES = ["text-display", "text-heading", "text-body", "text-label"] as const;

/**
 * Every shape a browser treats as operable, plus the two ARIA roles that claim to be one.
 *
 * `[tabindex]:not([tabindex="-1"])` is in the list on purpose: a programmatically focusable `<div>` with
 * a click handler is the exact form a "make the row clickable" change takes when somebody already knows
 * an anchor would fail the assertion above it.
 */
const INTERACTIVE =
  'a, button, input, select, textarea, summary, [role="link"], [role="button"], [tabindex]:not([tabindex="-1"])';

/**
 * The deadline is deliberately HOURS away, not minutes.
 *
 * The shared countdown carries a final-hour emphasis on this surface (D-146 retains it), and a fixture
 * inside that window would put a conditional treatment into every assertion below without testing any of
 * them. `tests/booking/request-countdown.test.tsx` owns the threshold; this file owns the row.
 */
function makeRow(overrides: Partial<RequestRowData> = {}): RequestRowData {
  return {
    requestId: "bk_123",
    spaceTitle: SPACE_TITLE,
    whenLabel: WHEN,
    bookerLabel: GUEST,
    totalLabel: MONEY,
    expiresAt: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

function renderRow(overrides: Partial<RequestRowData> = {}): HTMLElement {
  const { container } = render(
    <RequestRow
      row={makeRow(overrides)}
      countdownReason={<p className="text-sm text-muted-foreground">Session starts in 7h — respond soon.</p>}
    />,
  );
  const card = container.querySelector('[data-testid="row-card"]');
  expect(card, "the row did not render through the RowCard pattern").not.toBeNull();
  return card as HTMLElement;
}

/** The digits node — the countdown's lead form, which is the only heading-role text on this row. */
function digitsOf(row: HTMLElement): HTMLElement {
  const found = row.querySelectorAll("span.text-heading.tabular-nums");
  expect(found.length, "expected exactly one countdown digits node in the row").toBe(1);
  return found[0] as HTMLElement;
}

/** The `<dd>` whose `<dt>` reads `term`. Reads the pair, so a re-ordered `<dl>` cannot pass by position. */
function valueFor(row: HTMLElement, term: string): HTMLElement {
  const dt = within(row).getByText(term);
  const value = dt.nextElementSibling;
  expect(value?.tagName, `the "${term}" term is not followed by a <dd>`).toBe("DD");
  return value as HTMLElement;
}

/** Which of the four declared roles an element carries, or `null`. Asserts it carries at most one. */
function typeRoleOf(element: Element): string | null {
  const carried = ROLE_CLASSES.filter((role) => element.classList.contains(role));
  expect(carried.length, `${element.className} carries two type roles at once`).toBeLessThan(2);
  return carried[0] ?? null;
}

/** True when `a` comes before `b` in document order. */
function precedes(a: Element, b: Element): boolean {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}

/**
 * The nearest element containing BOTH nodes — read structurally rather than by a container class, so the
 * assertion survives a restyle of `RowCard` and fails only when the arrangement itself moves.
 */
function nearestCommonAncestor(a: Element, b: Element): Element {
  let node: Element | null = a;
  while (node && !node.contains(b)) node = node.parentElement;
  expect(node, "the two nodes share no ancestor — they are not in the same row").not.toBeNull();
  return node as Element;
}

describe("D-144 — the request row is terminal, and the inbox browses nowhere", () => {
  it("renders zero anchors and zero link-role elements inside the row", () => {
    const row = renderRow();

    expect(
      row.querySelectorAll("a"),
      "an anchor is inside the request row. D-144 keeps `RowCard`'s optional `href` UNUSED here: a " +
        "triage queue that browses is no longer a triage queue, and a second place carrying " +
        "approve/decline is a second place that has to be kept in agreement with this one.",
    ).toHaveLength(0);

    expect(row.querySelectorAll('[role="link"]')).toHaveLength(0);
  });

  it("has exactly TWO interactive descendants, and they are Approve and Decline", () => {
    const row = renderRow();
    const operable = Array.from(row.querySelectorAll(INTERACTIVE));

    expect(
      operable.map((el) => `${el.tagName.toLowerCase()}:${el.getAttribute("aria-label") ?? el.textContent}`),
      "the row grew an interactive descendant beyond its two actions",
    ).toHaveLength(2);

    expect(within(row).getByRole("button", { name: `Approve request from ${GUEST}` })).toBeTruthy();
    expect(within(row).getByRole("button", { name: `Decline request from ${GUEST}` })).toBeTruthy();
  });
});

describe("D-146 — the deadline leads, and nothing is promoted to compete with it", () => {
  it("puts the countdown digits at the heading role, and NOTHING else in the row at it", () => {
    const row = renderRow();
    const digits = digitsOf(row);

    const promoted = Array.from(row.querySelectorAll("*")).filter((el) => {
      const role = typeRoleOf(el);
      return el !== digits && (role === "text-heading" || role === "text-display");
    });

    expect(
      promoted.map((el) => el.textContent),
      "something other than the deadline carries a heading-or-larger type role. D-146 makes the SLA " +
        "countdown the loudest element on the row; a second element at the same scale is a tie, and a " +
        "tie is not a hierarchy.",
    ).toEqual([]);
  });

  it("shares the row's first line with the space title, and both precede the money figure", () => {
    const row = renderRow();
    const digits = digitsOf(row);
    const title = within(row).getByText(SPACE_TITLE);
    const money = valueFor(row, "Guest pays");

    // The deadline and the title are on ONE line — `RowCard`'s `status` slot is the top-right region of
    // the same header row the title sits in, which is what makes the countdown's box-top less than or
    // equal to the title's in a browser. That `<=` (not `<`) is the UI-SPEC's own falsifiable, and it is
    // why DOM order alone cannot decide this pair. What CAN be decided is that they share a line.
    const firstLine = nearestCommonAncestor(digits, title);
    expect(
      firstLine.contains(money),
      "the money figure is on the row's first line with the deadline. D-146 moves it into the " +
        "description list precisely so it cannot read as the row's headline figure.",
    ).toBe(false);

    expect(precedes(digits, money), "the deadline does not precede the money figure").toBe(true);
    expect(precedes(title, money), "the space title does not precede the money figure").toBe(true);
  });

  it("gives the money figure and the guest name the SAME type role", () => {
    const row = renderRow();
    const money = valueFor(row, "Guest pays");
    const guest = valueFor(row, "Guest");

    expect(typeRoleOf(guest), "the guest name carries no declared type role").not.toBeNull();
    expect(
      typeRoleOf(money),
      "the money figure and the guest name render at different type roles — one of them has been " +
        "promoted to compete with the deadline (D-146's third falsifiable)",
    ).toBe(typeRoleOf(guest));
  });

  it("carries the guest and guest-pays terms in a description list", () => {
    const row = renderRow();
    const list = row.querySelector("dl");
    expect(list, "the row's body is not a description list").not.toBeNull();

    expect(within(list as HTMLElement).getByText("Guest")).toBeTruthy();
    expect(within(list as HTMLElement).getByText("Guest pays")).toBeTruthy();
    expect(valueFor(row, "Guest").textContent).toBe(GUEST);
    expect(valueFor(row, "Guest pays").textContent).toBe(MONEY);
  });
});

describe("guard-the-guard — the queries above find real nodes, not empty sets", () => {
  it("rendered a row with a title, a deadline and a reason line in it", () => {
    const row = renderRow();

    expect(screen.getByText(SPACE_TITLE)).toBeTruthy();
    expect(within(row).getByText(WHEN)).toBeTruthy();
    expect(within(row).getByText("Expires in")).toBeTruthy();
    expect(digitsOf(row).textContent, "the countdown rendered no {N}h {M}m").toMatch(/\d+h \d+m/);
    expect(within(row).getByText(/Session starts in 7h/)).toBeTruthy();
  });

  it("the interactive selector is capable of finding an anchor, so the zero above means something", () => {
    const { container } = render(
      <div data-testid="probe">
        <a href="/somewhere">A link</a>
      </div>,
    );
    const probe = container.querySelector('[data-testid="probe"]') as HTMLElement;
    expect(probe.querySelectorAll("a")).toHaveLength(1);
    expect(probe.querySelectorAll(INTERACTIVE)).toHaveLength(1);
  });
});
