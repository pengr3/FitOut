// @vitest-environment jsdom

// Δ5b — THE ADDITIVE PROP ON `responsive-dialog.tsx`, ASSERTED IN BOTH DIRECTIONS.
//
// D-168 declined `alert-dialog` so this app keeps ONE overlay mechanism, ONE focus trap and ONE
// escape behaviour, and it paid for that by making *"default focus lands on the safe action, never on
// the destructive one"* a BINDING mitigation rather than a nicety. Under `ResponsiveDialog` that
// mitigation had no mechanism: Radix autofocuses the first tabbable element in `DialogContent`, the
// vendored `DialogFooter` is `flex-col-reverse … sm:flex-row`, and so DOM order and visual order are
// inverted below `sm:` — there is no DOM order that both stacks `Keep photo` under the thumb AND
// keeps focus off `Remove photo`. `onOpenAutoFocus` is that mechanism. This file is the proof that it
// works and the proof that adding it cost the six existing call sites nothing.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY A `git diff` OVER THE ADOPTERS IS NOT ENOUGH, WHICH IS THE WHOLE REASON HALF ONE EXISTS
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// The plan that added the prop verifies "the five adopter files are byte-unchanged" with
// `git diff --exit-code`. That check is true and it is worth having, but note precisely what it can
// see: it compares the ADOPTERS against themselves. None of those five files mentions the new prop,
// so the diff stays clean no matter what the PATTERN does with it — give the prop a default handler,
// wrap it, coerce it, and every adopter file is still byte-identical while all six overlays change
// their focus behaviour at once. A diff is also true exactly once, at commit time.
//
// Half one closes that. It renders the pattern with NO handler and pins where Radix puts focus, so
// "the default is inert" stops being an argument about a diff and becomes a rendering that either
// reproduces or does not, on every run.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE THREE HALVES
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
//   1. THE DEFAULT IS INERT. No handler → focus lands on the FIRST FOOTER BUTTON IN DOM ORDER, which
//      in the removal confirm's own footer order is the DESTRUCTIVE one. Asserted by accessible name
//      with `toBe`, never `toBeTruthy` — "something has focus" is satisfied by the wrong thing, by
//      `<body>` losing focus to the content node, and by a defaulted handler doing its own job well.
//      Only an equality against a NAME distinguishes those.
//
//   2. THE HANDLER ACTUALLY MOVES FOCUS. Same tree, plus a handler that `preventDefault()`s and
//      focuses the second footer button by ref. This is Δ5b's mitigation itself, asserted on the
//      primitive rather than on the removal confirm that does not exist yet — so the mitigation
//      cannot ship as a no-op and be discovered later by a human on a device.
//
//   3. THE ADOPTER CENSUS. Every file that renders `ResponsiveDialog` is DERIVED from the tree
//      (WR-06 — a hard-coded list cannot notice a future adopter), minus two deliberate exceptions
//      that each say why, and none of the rest may contain the prop's name. This is the standing form of the plan's `git diff`, plus a
//      liveness guard: the pattern itself MUST contain the name, or the census is scanning for a
//      token that no longer exists and would pass by vacuum after a rename.
//
// WHY jsdom. Nothing here is a cascade question — Radix's focus management is JavaScript reading the
// DOM, which is exactly what jsdom is for (`16-RESEARCH.md` §E). The two halves that DO need a real
// browser — that the six adopters still work end-to-end — are `e2e/mobile-booker-path.spec.ts` and
// `e2e/photo-lightbox.spec.ts`, run in the same plan's verify command rather than restated here.
//
// NO `getBoundingClientRect` STUB, and no `ResizeObserver` stub either. The first is a refusal this
// repo records in prose in two specs and does not break here; the second turned out to be unnecessary
// — `tests/host/request-refusal.test.tsx` already drives this same overlay under jsdom with neither.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// OBSERVED, NOT PREDICTED. The default-focus name in half one was MEASURED on 2026-08-25 by running
// this file against the pattern, not reasoned from Radix's source. It is `Remove photo` — the
// DESTRUCTIVE action — which is Δ5b's complaint reproduced as an executable assertion rather than
// argued in a document.
//
// WATCHED RED, so that value is a reading and not a coincidence. Half one was flipped to expect the
// SAFE name and run:
//
//   FAIL  tests/design/responsive-dialog-autofocus.test.tsx > … > omitting the prop leaves Radix's
//         own autofocus in place — the first footer button in DOM order
//   AssertionError: expected 'Remove photo' to be 'Keep photo' // Object.is equality
//     Expected: "Keep photo"
//     Received: "Remove photo"
//   Test Files  1 failed (1) · Tests  1 failed | 8 passed (9)
//
// The `Received` line is the measurement. Reverted immediately; the file was byte-compared against
// its pre-probe copy afterwards.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import * as React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";

import { ResponsiveDialog } from "@/components/patterns/responsive-dialog";
import { Button } from "@/components/ui/button";

const ROOT = process.cwd();

/** The prop under test. One spelling, used by the render halves and by the census alike. */
const PROP = "onOpenAutoFocus";

const PATTERN = "src/components/patterns/responsive-dialog.tsx";

/**
 * `16-UI-SPEC.md` § Copywriting, the removal confirm. Used verbatim so half two is the real mitigation
 * and not a shape that resembles it.
 */
const TITLE = "Remove your photo?";
const DESTRUCTIVE = "Remove photo";
const SAFE = "Keep photo";

/** The vendored `DialogContent` close button's hardcoded accessible name (`ui/dialog.tsx:83`). */
const VENDORED_CLOSE = "Close";

/**
 * Every button name this overlay can contain, so the focused element can be identified BY NAME
 * instead of by index. Read through `@testing-library`'s `{ name }` option, which runs
 * `dom-accessibility-api` — that package is never imported directly here or anywhere in this
 * repository (`tests/design/live-regions.test.tsx:25` states the rule).
 */
const BUTTON_NAMES = [DESTRUCTIVE, SAFE, VENDORED_CLOSE] as const;

/**
 * The adopters that must NOT steer focus — DERIVED FROM THE TREE, not listed (WR-06).
 *
 * ⚠ A HARD-CODED CENSUS POLICES ONLY THE PAST. This used to be five literal paths with a docblock
 * claiming they were "the five files that render `ResponsiveDialog`", re-verified by hand. Measured
 * against the tree, SEVEN files render it across EIGHT call sites: the five below plus the two
 * `src/components/profile/` files this phase added, both of which legitimately pass a focus hook.
 * So the docblock's claim was false, and — the part that matters — a FUTURE adopter that added the
 * prop would have been invisible to the gate, because a list cannot notice what is not on it. That
 * is the guard-the-guard failure this file's own header is otherwise careful about.
 *
 * Deriving it inverts that: the set widens by itself, and the only maintenance is the deliberate
 * exceptions below, each of which has to say why. The floor assertion beneath keeps the derivation
 * itself honest — a glob that silently matched nothing would make every case here pass vacuously.
 */
const DELIBERATE = new Set([
  // D-168's mitigation — `onOpenAutoFocus` places focus on `Keep photo`, because Radix's own choice
  // on this footer order is the DESTRUCTIVE button. Also `onCloseAutoFocus` (CR-03): the trigger
  // unmounts in the same commit as a successful removal, so Radix's restore has nothing to aim at.
  "src/components/profile/avatar-field.tsx",
  // Δ5c — `onCloseAutoFocus` with no trigger at all: this overlay opens programmatically, so Radix
  // suppresses the browser's restore and then focuses a `triggerRef` that was never populated.
  "src/components/profile/image-crop-dialog.tsx",
]);

/**
 * Every `.tsx` under `src/`, repo-relative and forward-slashed.
 *
 * The recursive-walk shape is `avatar-copy.test.ts:225`'s and `brand-recipe.test.ts:431`'s, and the
 * slash normalisation is `brand-recipe.test.ts:442-449`'s line, load-bearing for the same reason it
 * is there: on this box `path.relative` emits backslashes, and `DELIBERATE` is written with the
 * forward slashes every path in this repo's prose uses. Without the normalisation an exception would
 * silently fail to match and the file it names would be policed after all — a red with a confusing
 * message, on Windows only.
 */
function collectTsxFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectTsxFiles(full, out);
    else if (entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

/** Every file under `src/` that renders the pattern, minus the deliberate exceptions above. */
const ADOPTERS = collectTsxFiles(resolve(ROOT, "src"))
  .filter((full) => readFileSync(full, "utf8").includes("<ResponsiveDialog"))
  .map((full) => relative(ROOT, full).split("\\").join("/"))
  .filter((f) => !DELIBERATE.has(f))
  .sort();

/**
 * The removal confirm's footer, in Δ5b's DOM order: DESTRUCTIVE FIRST, so that `flex-col-reverse`
 * stacks the safe action on top below `sm:` and `sm:flex-row` puts it on the right above it.
 *
 * That order is the whole reason the prop exists, so the harness must not quietly "fix" it by
 * reordering — with the order reversed, half one would go green for the wrong reason and half two
 * would assert nothing.
 */
function RemovalConfirm({ steerFocus }: { steerFocus: boolean }) {
  const safeRef = React.useRef<HTMLButtonElement>(null);

  return (
    <ResponsiveDialog
      open
      title={TITLE}
      onOpenAutoFocus={
        steerFocus
          ? (event: Event) => {
              // Suppress Radix's own first-tabbable autofocus, then place focus deliberately. Both
              // halves are required: without the `preventDefault()` Radix focuses the destructive
              // button after this handler returns.
              event.preventDefault();
              safeRef.current?.focus();
            }
          : undefined
      }
      footer={
        <>
          <Button variant="destructive" size="touch">
            {DESTRUCTIVE}
          </Button>
          <Button ref={safeRef} variant="outline" size="touch">
            {SAFE}
          </Button>
        </>
      }
    />
  );
}

/** A readable description of whatever holds focus when it is none of the named buttons. */
function describeUnexpected(node: Element | null): string {
  if (node === null) return "«null»";
  if (node === document.body) return "«document.body — focus was dropped»";
  const tag = node.tagName.toLowerCase();
  const slot = node.getAttribute("data-slot");
  const text = (node.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  return `«${tag}${slot ? `[data-slot=${slot}]` : ""}${text ? ` "${text}"` : ""}»`;
}

/**
 * The ACCESSIBLE NAME of `document.activeElement`, resolved by matching it against every button the
 * overlay can hold. Returning a name (rather than the element) is what lets both halves assert with
 * `toBe` against a string a human can read in a failure message.
 */
function focusedButtonName(dialog: HTMLElement): string {
  for (const name of BUTTON_NAMES) {
    const button = within(dialog).queryByRole("button", { name });
    if (button !== null && button === document.activeElement) return name;
  }
  return describeUnexpected(document.activeElement);
}

async function openConfirm({ steerFocus }: { steerFocus: boolean }): Promise<HTMLElement> {
  render(<RemovalConfirm steerFocus={steerFocus} />);
  // The overlay renders through a Radix portal, so it is reachable from `screen` and not from the
  // render container (`tests/host/request-refusal.test.tsx:107`).
  return await screen.findByRole("dialog");
}

afterEach(cleanup);

describe("responsive-dialog · onOpenAutoFocus is additive (Δ5b / D-168)", () => {
  it("omitting the prop leaves Radix's own autofocus in place — the first footer button in DOM order", async () => {
    const dialog = await openConfirm({ steerFocus: false });

    // ⚠ THIS ASSERTION IS THE ONLY THING IN THE REPOSITORY THAT WOULD NOTICE IF THE PATTERN EVER
    // DEFAULTED THIS PROP TO A HANDLER. Every adopter file would still pass `git diff --exit-code`,
    // every type would still check, and all six overlays would silently change where focus lands.
    // It is `toBe` against a NAME for the same reason `theme-provider.test.tsx` asserts both branches
    // of its Sonner map: a constant dressed as a map passes every check that does not name a value.
    //
    // MEASURED, NOT PREDICTED: `Remove photo` is the DESTRUCTIVE action. That is not a defect in the
    // pattern — it is Radix behaving exactly as documented, and it is precisely why D-168's mitigation
    // needed a mechanism rather than a DOM-order convention.
    expect(focusedButtonName(dialog)).toBe(DESTRUCTIVE);
  });

  it("supplying the prop moves focus to the safe action — the mitigation D-168 made binding", async () => {
    const dialog = await openConfirm({ steerFocus: true });

    expect(focusedButtonName(dialog)).toBe(SAFE);

    // And the destructive action is provably NOT where focus is, stated separately so a future change
    // that focused BOTH-ish (e.g. focused the footer container) cannot satisfy the line above alone.
    const destructive = within(dialog).getByRole("button", { name: DESTRUCTIVE });
    expect(document.activeElement).not.toBe(destructive);
  });

  it("the two halves disagree, so neither is describing a constant", async () => {
    // A single-direction spec cannot tell "the handler works" from "focus happens to land there
    // anyway". Running both trees in one case and asserting the names DIFFER is what makes the prop
    // load-bearing rather than decorative.
    const withoutHandler = focusedButtonName(await openConfirm({ steerFocus: false }));
    cleanup();
    const withHandler = focusedButtonName(await openConfirm({ steerFocus: true }));

    expect(withoutHandler).not.toBe(withHandler);
    expect([withoutHandler, withHandler]).toEqual([DESTRUCTIVE, SAFE]);
  });
});

describe("responsive-dialog · the adopter census (T-16-07)", () => {
  it("the pattern itself declares the prop, so the census below is not scanning for a dead token", () => {
    expect(readFileSync(resolve(ROOT, PATTERN), "utf8")).toContain(PROP);
  });

  it("the census found the adopters it claims to police", () => {
    // THE DERIVATION'S OWN NON-VACUITY FLOOR. `it.each([])` registers ZERO cases and reports green,
    // so a glob that stopped matching — a moved directory, a changed extension, a rename of the
    // component — would retire the whole gate in silence. Five is the count measured when WR-06 was
    // fixed, stated as a FLOOR rather than an equality precisely because the point of deriving the
    // set is that it is allowed to grow without anyone editing this file.
    expect(
      ADOPTERS.length,
      `the census matched ${ADOPTERS.length} adopter(s): [${ADOPTERS.join(", ")}]. It should find ` +
        "at least the five that rendered the pattern when this gate was written. A smaller number " +
        "means the derivation broke, not that adopters were deleted — check the glob first.",
    ).toBeGreaterThanOrEqual(5);
  });

  it("every deliberate exception really does still render the pattern and steer focus", () => {
    // Guard-the-exceptions. An entry left behind after its file stopped using the pattern (or
    // stopped steering focus) is a silent hole in the census — the path would be subtracted from
    // the derived set for a reason that no longer exists.
    for (const exception of DELIBERATE) {
      const source = readFileSync(resolve(ROOT, exception), "utf8");
      expect(source, `${exception} no longer renders <ResponsiveDialog>`).toContain(
        "<ResponsiveDialog",
      );
      expect(
        source.includes(PROP) || source.includes("onCloseAutoFocus"),
        `${exception} is exempted from the census but steers no focus. Remove it from ` +
          "`DELIBERATE` so the census polices it again.",
      ).toBe(true);
    }
  });

  // A plain loop rather than `it.each`, because `ADOPTERS` is now DERIVED and therefore a
  // `string[]` rather than a literal tuple — the same shape `tests/design/avatar-zoom.test.ts` uses
  // for its row sweep. Registration still happens at collection time, so each adopter is its own
  // named case; the floor assertion above is what stops an empty derivation registering none.
  for (const adopter of ADOPTERS) {
    it(`${adopter} does not mention the new prop`, () => {
      const source = readFileSync(resolve(ROOT, adopter), "utf8");

      expect(
        source.includes(PROP),
        `${adopter} now passes \`${PROP}\`. The prop is additive by contract (Δ5b): every existing ` +
          `adopter must keep Radix's own focus behaviour. If this overlay genuinely needs to steer ` +
          `focus, that is a decision to record, not a line to add — and this census is the record. ` +
          `Recording it means adding the file to \`DELIBERATE\` with the reason.`,
      ).toBe(false);
    });
  }
});
