// DS-05 / DS-08 / DS-09 — the Button CVA contract, asserted over the classes that actually PAINT.
//
// WHY THIS FILE EXISTS. `src/components/ui/button.tsx` is the interface three later plans write
// against: 10-07 copies its focus recipe into 10 more vendored files, and 10-08/10-09 convert 20
// call sites onto `variant="brand"`. A defect in the recipe here does not stay here — it propagates
// to ~30 files before anything renders. Two of the assertions below are therefore NEGATIVE, because
// the failure this phase exists to remove is not "the class is missing", it is "the class is there
// and its arithmetic is wrong":
//
//   • `hover:bg-brand/90` — an alpha tint over a light surface LIGHTENS, so `--brand-foreground` on
//     it measures 4.04:1 (court) / 3.87:1 (grove) against a 4.5 bar. `10-RESEARCH.md` § Code
//     Examples still contains a CVA block with that exact string; it is superseded, and someone
//     copying it verbatim is the single most likely way this contract regresses. The prescribed
//     `color-mix` form darkens instead — 5.41 / 5.36.
//   • a 50%-alpha ring — compiles to `color-mix(in oklab, var(--ring) 50%, transparent)` and
//     composited over white measures 2.32:1. NO value of `--ring` fixes it, which is why a
//     token-only test would pass at 7.46:1 while every control still rendered at 2.32:1.
//
// WHY IT ASSERTS ON `buttonVariants(...)` AND NOT ON RENDERED MARKUP. The 09-11 lesson, recorded at
// tests/booking/partial-grant-notice.test.tsx:17-20: the base string carries `aria-invalid:`-prefixed
// alarm utilities that can never apply to a valid control, so counting raw class names on a rendered
// node proves nothing about the colour a booker sees. Calling the CVA with an explicit variant
// returns exactly the classes that variant contributes, which is the level the contract is written
// at. What paints is then a function of the tokens — covered by the contrast gate — plus the one
// compile assertion at the bottom, which proves the focus recipe reaches real tokens rather than
// Tailwind's hardcoded white offset.
//
// NOT COVERED — real blind spots, listed so the next reader under-trusts this file:
//   • Adoption. Nothing here (and nothing anywhere, by D-22) forces a call site to ask for
//     `size="touch"` or `variant="brand"`. Phase 17's a11y audit is the declared catch for the
//     first; 10-08/10-09 own the second.
//   • Precedence. `cn()` merges base and variant strings at the call site; this reads the CVA output
//     before that merge. A tailwind-merge collision would be invisible here.
//   • Pixels. A green run says nothing about whether the focus ring is visible on a real screen —
//     that is `/dev/theme` and Phase 11's screenshot gate.

import { describe, it, expect } from "vitest";

import { buttonVariants } from "@/components/ui/button";
import { compileGlobalsCssWith, declarationsFor } from "./helpers/compile-css";

/** The prescribed hover mechanism: darken toward `--foreground`, never tint with alpha. */
const BRAND_HOVER_MIX = "color-mix(in_oklch,var(--brand)";

describe("DS-08 — the brand variant", () => {
  it("fills with the brand token and its own foreground", () => {
    const classes = buttonVariants({ variant: "brand" });

    expect(classes).toContain("bg-brand");
    expect(classes).toContain("text-brand-foreground");
  });

  it("hovers by DARKENING with a color-mix, never by alpha-tinting", () => {
    const classes = buttonVariants({ variant: "brand" });

    expect(classes).toContain(BRAND_HOVER_MIX);
    // The exact string in 10-RESEARCH.md § Code Examples. 4.04:1 / 3.87:1 — superseded.
    expect(classes).not.toContain("bg-brand/90");
    // Wider than the literal: no alpha modifier on the brand fill is acceptable, at any percentage.
    expect(classes).not.toMatch(/bg-brand\/\d+/);
  });
});

describe("D-21 — an un-varianted Button is neutral, never coral", () => {
  it("defaults to the primary near-black fill", () => {
    const classes = buttonVariants();

    expect(classes).toContain("bg-primary");
  });

  it("never reaches the accent without being asked", () => {
    // The 10% accent budget is protected structurally: coral is opt-in, so a `<Button>` written
    // without a variant cannot spend it. This is the assertion that fails if someone "helpfully"
    // moves `brand` into defaultVariants.
    expect(buttonVariants()).not.toContain("bg-brand");
    expect(buttonVariants({ size: "touch" })).not.toContain("bg-brand");
  });
});

describe("DS-09 — the touch size", () => {
  it("is a named 44px step on the 4px grid", () => {
    // h-11 = 4 x 11 = 44px. An arbitrary value here would be a leak; the grid already has the step.
    expect(buttonVariants({ size: "touch" })).toContain("h-11");
  });

  it("is opt-in — the default size is unchanged", () => {
    expect(buttonVariants()).toContain("h-8");
    expect(buttonVariants()).not.toContain("h-11");
  });
});

describe("DS-05 — the one focus recipe", () => {
  it("uses a SOLID ring with an explicit offset band", () => {
    const classes = buttonVariants();

    expect(classes).toContain("focus-visible:ring-ring");
    expect(classes).toContain("focus-visible:ring-offset-2");
    expect(classes).toContain("focus-visible:ring-offset-background");
  });

  it("carries no alpha on the ring colour", () => {
    // 2.32:1 composited. Arithmetic, not preference — no `--ring` value rescues a half-alpha ring.
    expect(buttonVariants()).not.toContain("focus-visible:ring-ring/50");
    expect(buttonVariants()).not.toMatch(/ring-ring\/\d+/);
  });

  it("survives on every size, because it lives in the base string", () => {
    for (const size of ["default", "touch", "sm", "icon"] as const) {
      expect(buttonVariants({ size })).toContain("focus-visible:ring-ring");
    }
  });
});

describe("destructive — solid fill on hover, not a deeper tint", () => {
  it("flips to the destructive foreground rather than deepening its own tint", () => {
    const classes = buttonVariants({ variant: "destructive" });

    expect(classes).toContain("hover:bg-destructive");
    expect(classes).toContain("hover:text-destructive-foreground");
    // Deepening the tint moves the surface TOWARD the text colour: 4.01:1. The solid fill is 5.52:1.
    expect(classes).not.toContain("hover:bg-destructive/20");
  });

  it("keeps its tinted rest state", () => {
    expect(buttonVariants({ variant: "destructive" })).toContain(
      "bg-destructive/10",
    );
  });
});

describe("the focus recipe reaches real tokens, not Tailwind's defaults", () => {
  // The reason `ring-offset-background` is declared EXPLICITLY rather than left implicit: Tailwind's
  // default `--tw-ring-offset-color` is a literal white, which is a leak in all but name and is
  // visibly wrong on grove's tinted background. Source-level assertions cannot see that; only the
  // compiler's output can. Safelisted because the utilities are new to the tree this plan.
  it("emits the background and ring tokens by var() reference", async () => {
    const css = await compileGlobalsCssWith([
      "ring-offset-background",
      "ring-ring",
    ]);

    const offset = declarationsFor(css, ".ring-offset-background");
    expect(offset).not.toBeNull();
    expect(offset).toContain("--tw-ring-offset-color: var(--background)");

    const ring = declarationsFor(css, ".ring-ring");
    expect(ring).not.toBeNull();
    expect(ring).toContain("--tw-ring-color: var(--ring)");
  });
});
