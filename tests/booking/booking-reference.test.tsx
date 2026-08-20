// @vitest-environment jsdom

// TRUST-02 / D-78 — the copyable booking reference, as an executable contract.
//
// WHY THIS FILE EXISTS. The reference is the string a booker reads back over the phone, quotes in a
// support mail and lines up against an email subject. Three properties decide whether it is worth
// anything, and all three are cheap to lose in a refactor:
//
//   (1) IT IS RENDERED VERBATIM. Never lower-cased, never stripped of its `FIT-` prefix, never
//       re-derived client-side. The deriver is a one-way SHA-256 over the booking id and lives in a
//       `node:crypto` module — server-only in practice — so the value arrives as a prop and this
//       component is the last place it could be mangled. A reformatted reference is one that does not
//       match the record it names.
//   (2) THE COPY REPORTS SUCCESS AS A FACT, NOT AS AN ABSENCE OF FAILURE. `share-link-box.tsx:39-57`
//       records the trap: `await navigator.clipboard?.writeText(x)` resolves to `undefined` when the API
//       is missing, so a `try/catch` sees no error and the UI cheerfully announces a copy over an empty
//       clipboard. Cases (4) and (5) below are the two ways that happens — API absent, and write
//       rejected — and both must land on the failure path (T-13-02-SILENTCOPY).
//   (3) THE HOOK IS ON THE STRING, THE CONTROL IS ON A ROLE. GATE-04's scope rule: interactive elements
//       stay reachable by `getByRole`/`getByLabel`, and a structural hook goes only where no accessible
//       query can express the target. The width measurement reads the reference's TEXT NODE, so that is
//       where the hook belongs — and the copy button, being a button with a name, does not get one.
//
// NOT COVERED HERE, deliberately: the FONT. Case (1) asserts the utility classes are applied, which is a
// claim about the markup; that Geist Mono actually resolves and that two equal-length references render
// to equal `boundingBox().width` is a claim about a real browser with real fonts, and it belongs to
// `e2e/tabular-figures.spec.ts` (13-UI-SPEC § Typography rule 1). jsdom applies no Tailwind at all
// (D-131), so a computed-style assertion here would be green against a stylesheet that never loaded.

import * as React from "react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

const toastSuccess = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());
vi.mock("sonner", () => ({ toast: { success: toastSuccess, error: toastError } }));

import { BookingReference } from "@/components/booking/booking-reference";

/** A real-shaped reference: Crockford base32, mostly letters, which is the whole reason for `font-mono`. */
const REFERENCE = "FIT-9K3MP7QZ";

/** Install a clipboard, or remove it entirely when `writeText` is null. */
function setClipboard(writeText: ((text: string) => Promise<void>) | null): void {
  Object.defineProperty(navigator, "clipboard", {
    value: writeText === null ? undefined : { writeText },
    configurable: true,
    writable: true,
  });
}

beforeEach(() => {
  toastSuccess.mockReset();
  toastError.mockReset();
  setClipboard(null);
});

afterEach(cleanup);

const copyControl = () => screen.getByRole("button", { name: "Copy booking reference" });

describe("BookingReference — TRUST-02 / D-78", () => {
  it("(1) renders the FIT- string verbatim, in fixed-advance-width glyphs", () => {
    const { container } = render(<BookingReference reference={REFERENCE} />);

    const el = container.querySelector('[data-testid="booking-reference"]');
    expect(el, "the reference did not render its declared hook").toBeTruthy();
    // Verbatim: the exact string, same case, prefix intact.
    expect(el!.textContent).toBe(REFERENCE);
    expect(el!.className).toContain("font-mono");
    expect(el!.className).toContain("tabular-nums");
    // No negative tracking on a monospace string (13-UI-SPEC § Typography rule 1).
    expect(el!.className).not.toContain("tracking-");
  });

  it("(2) takes its size from a named type role, never an arbitrary step", () => {
    const { container } = render(<BookingReference reference={REFERENCE} size="moment" />);
    expect(container.querySelector('[data-testid="booking-reference"]')!.className).toContain(
      "text-heading",
    );

    cleanup();

    const detail = render(<BookingReference reference={REFERENCE} />).container;
    expect(detail.querySelector('[data-testid="booking-reference"]')!.className).toContain(
      "text-body",
    );
  });

  it("(3) puts the hook on the STRING and leaves the control on a role query", () => {
    const { container } = render(<BookingReference reference={REFERENCE} />);

    // Exactly one hook in the whole subtree, and the button is not it.
    expect(container.querySelectorAll("[data-testid]")).toHaveLength(1);
    expect(copyControl().hasAttribute("data-testid")).toBe(false);
    // The visible word is `Copy`; the accessible name says what is being copied (D-95), and contains
    // the visible label so the two do not diverge for voice control.
    expect(copyControl().textContent).toContain("Copy");
    expect(copyControl().getAttribute("aria-label")).toBe("Copy booking reference");
  });

  it("(4) writes the EXACT string to the clipboard and announces the copy", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);

    render(<BookingReference reference={REFERENCE} />);
    fireEvent.click(copyControl());

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    // Not a substring, not a normalised variant: the same string that was rendered.
    expect(writeText).toHaveBeenCalledWith(REFERENCE);
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Reference copied"));
    expect(toastError).not.toHaveBeenCalled();
  });

  it("(5) with NO clipboard API, announces no success — it says so and offers the manual route", async () => {
    // The presence check is the whole point: an optional call would resolve to `undefined` here and a
    // try/catch would see no error at all (T-13-02-SILENTCOPY).
    setClipboard(null);

    render(<BookingReference reference={REFERENCE} />);
    fireEvent.click(copyControl());

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "Couldn't copy — select the reference and copy it manually.",
      ),
    );
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("(6) a REJECTED write is the same honest failure, not a silent success", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("permission denied"));
    setClipboard(writeText);

    render(<BookingReference reference={REFERENCE} />);
    fireEvent.click(copyControl());

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    expect(toastSuccess).not.toHaveBeenCalled();
    // …and the rejection reason is never logged: it can echo the value (`share-link-box.tsx`'s rule).
  });
});
