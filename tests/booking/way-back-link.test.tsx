// @vitest-environment jsdom

// 12-CONTEXT D-59 §2 / 13-CONTEXT D-101.2 — THE CHECKOUT'S WAY OUT IS A CONTROL, NOT A SENTENCE.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS FILE EXISTS, AND WHY ITS CENTRAL ASSERTION IS ABOUT PAINT
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `e2e/shell.spec.ts` already asserts everything about this link that TEXT and STRUCTURE can express:
// that `<main>` holds exactly one anchor, that it points at `/listings/…`, that the href carries no
// `resume` discriminator, that its label reads `Back to the listing`, and that the hold promise is
// visible beside it. Every one of those was GREEN while the control shipped as `variant="ghost"` —
// which contributes hover states and nothing else, so at rest it was indistinguishable from the
// paragraph underneath it. The PM found it in live UAT: the checkout's only way out was invisible.
//
// D-59 §2's clause is *"one EXPLICIT, safe way back"*, and explicit is a claim about what a booker can
// SEE. The only thing that separates a control from prose here is which classes paint it, so that is
// what case (1) reads — off the rendered element, with a `class~=` token match rather than a substring
// scan of markup, and against the CVA itself rather than against hardcoded Tailwind strings.
//
// ⚠ THE DISCRIMINATOR IS DERIVED, NOT TYPED. Case (1) computes the tokens `outline` contributes that
// `ghost` does not, straight from `buttonVariants`, and asserts the rendered anchor carries all of
// them. A hardcoded `expect(className).toContain("border-border")` would silently stop meaning
// anything the day the recipe moved; this fails loudly instead. And the derivation is GUARDED — if the
// two variants ever became class-identical the set would be empty and the assertion vacuous, which is
// itself the defect, so the emptiness is asserted first.

import * as React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";

import { WayBackLink } from "@/components/booking/way-back-link";
import { buttonVariants } from "@/components/ui/button";

afterEach(cleanup);

const HREF = "/listings/lst_1?date=2026-09-16&start=9&end=11";

/** The label and the promise, retyped from 12-UI-SPEC rather than imported — see the header. */
const LABEL = "Back to the listing";
const HOLD_PROMISE = "We'll keep your hold — the timer keeps running.";

const tokens = (cva: string) => cva.split(/\s+/).filter(Boolean);
const classesOf = (el: Element) => tokens(el.getAttribute("class") ?? "");

/**
 * The classes EVERY variant carries, derived as the intersection of two of them.
 *
 * `buttonVariants({ variant: X })` returns the base string PLUS X's row, so a naive "does the rendered
 * element carry any of the brand variant's tokens" is satisfied by `group/button` — a base utility on
 * every button in the product. That is a false positive, and it is the first thing this file's own
 * case (2) reported on its first run. Subtracting the shared base leaves the tokens that actually
 * distinguish one variant from another, which is the only level a hierarchy claim can be made at.
 */
const BASE = tokens(buttonVariants({ variant: "ghost" })).filter((token) =>
  tokens(buttonVariants({ variant: "outline" })).includes(token),
);

/** What a variant contributes on top of the shared base. */
const variantOnly = (variant: "brand" | "outline" | "ghost" | "secondary") =>
  tokens(buttonVariants({ variant })).filter((token) => !BASE.includes(token));

function wayBack(container: HTMLElement): HTMLElement {
  const el = container.querySelector<HTMLElement>('[data-testid="checkout-way-back"]');
  expect(el, "the way back did not render at all").not.toBeNull();
  return el!;
}

describe("WayBackLink — a real affordance (D-59 §2 / D-101.2)", () => {
  it("(1) paints as the neutral SECONDARY control, not as ghost prose", () => {
    const outline = tokens(buttonVariants({ variant: "outline" }));
    const ghost = tokens(buttonVariants({ variant: "ghost" }));
    // What `outline` contributes and `ghost` does not — the border colour and the surface fill, i.e.
    // exactly the classes that make the control visible when nobody is hovering it.
    const discriminator = outline.filter((token) => !ghost.includes(token));

    // GUARD THE GUARD, ASSERTED FIRST. An empty discriminator would make the loop below vacuous, and
    // it would also mean the two variants had become the same thing — which is the defect, not a
    // reason to pass.
    expect(
      discriminator.length,
      "`outline` and `ghost` contribute the same classes, so this assertion can no longer tell a " +
        "control from prose. That is the failure D-101.2 closed, arriving from the recipe instead.",
    ).toBeGreaterThan(0);

    const { container } = render(<WayBackLink href={HREF} />);
    const anchor = within(wayBack(container as unknown as HTMLElement)).getByRole("link");
    const painted = classesOf(anchor);

    for (const token of discriminator) {
      expect(
        painted,
        `the checkout's way back is missing "${token}". It shipped as \`variant="ghost"\`, which ` +
          "contributes hover states and nothing else — at rest it was plain body text, and the " +
          "checkout has no header navigation by design (SHELL-03), so the page read as a dead end. " +
          "D-59 §2's word is EXPLICIT, and explicit is a claim about what a booker can see.",
      ).toContain(token);
    }
  });

  it("(2) does NOT take the accent — one coral per viewport, and it belongs to Confirm & pay", () => {
    const { container } = render(<WayBackLink href={HREF} />);
    const anchor = within(wayBack(container as unknown as HTMLElement)).getByRole("link");
    const painted = classesOf(anchor);

    // A coral escape hatch beside a coral commit is two equal invitations at the moment of payment,
    // and the wrong one is free to press. Asserted as the accent tokens the brand variant contributes
    // ON TOP OF THE SHARED BASE rather than as a colour name, so a renamed utility still fails and
    // `group/button` — which every button in the product carries — does not produce a false positive.
    const accent = variantOnly("brand");
    expect(accent.length, "the brand variant contributes nothing of its own any more").toBeGreaterThan(
      0,
    );
    for (const token of accent) {
      expect(painted, `the way back carries the primary's "${token}"`).not.toContain(token);
    }
    // …and it never becomes an alarm either: leaving a checkout is not a destructive act.
    for (const token of ["bg-destructive", "text-destructive", "border-destructive"]) {
      expect(painted, `${token} rides the way back`).not.toContain(token);
    }
  });

  it("(3) carries a 44px touch target (DS-09), which is the case that opt-in exists for", () => {
    const { container } = render(<WayBackLink href={HREF} />);
    const anchor = within(wayBack(container as unknown as HTMLElement)).getByRole("link");

    // Nothing forces adoption of `size="touch"` (D-22 — it is explicit opt-in, never a responsive
    // default), so a booker-facing control on a mobile checkout has to ask for it. This is the
    // assertion that it keeps asking.
    for (const token of tokens(buttonVariants({ size: "touch" }))) {
      // Only the size row's own contribution is checked; the shared base is not this case's subject.
      if (tokens(buttonVariants({ size: "default" })).includes(token)) continue;
      expect(classesOf(anchor), `the touch size lost "${token}"`).toContain(token);
    }
  });

  it("(4) states the label and the hold promise, and keeps them together", () => {
    const { container } = render(<WayBackLink href={HREF} />);
    const scope = wayBack(container as unknown as HTMLElement);

    expect(within(scope).getByRole("link").textContent?.trim()).toBe(LABEL);
    // ⚠ SCOPED TO THE COMPONENT, and that is the point of the promise living in here rather than at
    // the call site: the hold is a real row with a real expiry, and a booker who does not know it
    // survives a look at the listing will sit on the checkout rather than check. Control and promise
    // cannot be separated by an edit to either one.
    expect(
      (scope.textContent ?? "").replace(/\s+/g, " "),
      "the way back does not state that the hold survives it",
    ).toContain(HOLD_PROMISE);
  });

  it("(5) is exactly ONE anchor, and its href carries no resume discriminator", () => {
    const { container } = render(<WayBackLink href={HREF} />);
    const scope = wayBack(container as unknown as HTMLElement);

    // SHELL-03: `<main>` on this route holds exactly one `<a href>`. Zero traps the booker on a page
    // whose header deliberately has nothing to click; two or more re-opens the wandering-off problem.
    // This component IS that one anchor, so it may never grow a second.
    expect(scope.querySelectorAll("a[href]")).toHaveLength(1);

    // `book-cta.tsx` re-fires a hold on arrival when it sees the resume discriminator, which would
    // turn this link into a hold-creating GET — the T-04-GETDUP shape, arriving through the one anchor
    // SHELL-03 allows (T-12-03-GETDUP). `e2e/shell.spec.ts` asserts this against the real page; this
    // asserts it in unit time so a bad caller fails before a browser is involved.
    const href = scope.querySelector("a[href]")!.getAttribute("href")!;
    expect(href.startsWith("/listings/"), `the way back points at "${href}"`).toBe(true);
    expect(href.includes("resume"), `the way back carries "${href}"`).toBe(false);
  });

  it("(6) renders its hook exactly once", () => {
    const { container } = render(<WayBackLink href={HREF} />);
    expect(container.querySelectorAll('[data-testid="checkout-way-back"]')).toHaveLength(1);
    void screen;
  });
});
