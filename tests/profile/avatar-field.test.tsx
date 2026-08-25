// @vitest-environment jsdom

// THE AVATAR FIELD'S STATE MACHINE, AND ONLY THAT (plan 16-10 · CROP-01; plan 16-12 · CROP-03).
//
// WHAT THIS FILE CATCHES.
//   1. RULE F4, the behaviour the whole phase exists for: picking a file calls NOTHING over the
//      network, and the confirm calls the action exactly once. Asserted as a TRANSITION inside one
//      test — not-called, then called-once, on the same mounted field — because a snapshot of
//      "called once at the end" passes just as happily for a component that uploaded on `change`
//      and never uploaded again.
//   2. The four pre-dialog refusals: each renders its exported sentence in a `role="alert"` and
//      opens no overlay. Compared with `toBe` against the import, never against a re-typed string —
//      two copies of a string are two strings (rule F2), and a re-typed one asserts that the test
//      author can type rather than that the contract holds.
//   3. D-174's file-input reset, on the accepted, the refused and the cancelled path alike.
//   4. Rule F8's disabled zoom row and its reason, PAIRED with a large-source case that is neither
//      disabled nor annotated — see the note on vacuity below.
//   5. Rule F5: a failed save leaves the dialog open with the server's own sentence inside it.
//   6. Rule 6 of GATE-03: one refusal region at a time, counted, never sampled.
//   7. CROP-03's removal trigger, in BOTH directions — absent with no photo, present after the
//      change control with one.
//   8. D-168's binding mitigation, by mechanism: the confirm opens with focus on `Keep photo`,
//      asserted BY ACCESSIBLE NAME with `toBe`, over a footer whose DOM order puts the destructive
//      action first. Watched red with the handler removed — Radix focused `Remove photo`.
//   9. The confirm's pending and failure behaviour: `Removing…` with both actions disabled, and a
//      failure that leaves the overlay open carrying the server's own sentence.
//
// WHAT THIS FILE DELIBERATELY CANNOT CATCH, AND DOES NOT PRETEND TO.
// **In jsdom the crop stage does not exist in the DOM.** `react-easy-crop` renders its crop-area
// element only once `state.cropSize` is truthy, and `computeSizes` needs a non-zero
// `getBoundingClientRect()` on the container plus a decoded image with real naturals. The installed
// jsdom (29.1.1, probed for 16-RESEARCH § E) has neither: `getContext('2d')` is null,
// `createImageBitmap`, `OffscreenCanvas`, `ResizeObserver`, `URL.createObjectURL` and
// `Image.prototype.decode` are all undefined, and every box measures zero. So there is no stage to
// query here, no drag, no pinch, no wheel, no mask and no pixel — and no amount of `waitFor` changes
// that. **This file's honest job is copy, structure, ARIA wiring, disabled state and the state
// machine AROUND the cropper. The cropper itself is plan 16-13's Playwright spec.**
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE BOUNDARY BETWEEN WHAT IS SUPPLIED AND WHAT IS REFUSED — read before adding a stub.
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// SUPPLIED, because jsdom implements no version of it at all:
//   · `ResizeObserver` — the repo's five-times-used shape, `??` included so it never clobbers a real
//     implementation. Radix measures with one.
//   · `URL.createObjectURL` / `URL.revokeObjectURL` — undefined in jsdom; the field calls the first
//     directly and the whole flow is dead without it.
//   · An invalid CSS value is made a NO-OP instead of a throw. This is not a convenience: jsdom's
//     style parser THROWS `SyntaxError: ")" is expected` on `calc(NaN% + 0px)`, which every browser
//     merely ignores, and the CSSOM specification requires a no-op. Radix's slider emits exactly
//     that value whenever `min === max`, which is the zoom row's resting state on every source
//     smaller than the output size — so without this the whole dialog unmounts mid-render and the
//     field cannot be tested at all. Measured, not assumed; see the SUMMARY.
//   · An image's `naturalWidth` / `naturalHeight`, defined on the ONE element the library rendered,
//     immediately before firing that element's own `load` event. jsdom fetches and decodes nothing,
//     so those naturals are the single fact it cannot know; every consequence of them — the per-image
//     zoom bound, the crop rectangle, the disabled row — is then computed by the real library and the
//     real component, not by this file.
//
// REFUSED, permanently:
//   · **`getBoundingClientRect` is NOT stubbed.** This repository has never stubbed it and records
//     the refusal in prose in two specs (`tests/booking/confirmation-moment.test.tsx:10`,
//     `tests/design/scroll-area.test.ts:26`): jsdom performs no layout, and a layout assertion here
//     would pass against a component that rendered nothing. Stubbing it would manufacture a passing
//     stage test — the one thing 16-VALIDATION forbids outright.
//   · `react-easy-crop` itself is NOT mocked. Every callback this file relies on is the real
//     library's, reached by firing a real event on a real element it rendered.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// TWO PLACES WHERE THE OBVIOUS ASSERTION WOULD HAVE BEEN VACUOUS.
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// (a) THE FILE INPUT'S `value` READS `""` IN JSDOM WHETHER OR NOT ANYTHING RESET IT. jsdom derives
//     that property from an internal file list, and `fireEvent.change(input, { target: { files } })`
//     defines an own `files` property that shadows the prototype getter without touching that list —
//     measured: `""` before the change and `""` after it, with the handler confirmed to have run. So
//     `expect(input.value).toBe("")` would assert nothing at all and would stay green with D-174
//     deleted. This file records the ASSIGNMENTS instead, through a setter on the element, and pairs
//     every one of them with proof that the change was actually handled.
//
// (b) THE ZOOM ROW IS DISABLED BEFORE ANY IMAGE HAS LOADED. `maxZoom` initialises to 1 rather than to
//     the ceiling (deliberately — see the dialog), so "disabled" is also the resting state, and a
//     lone assertion on a small source would be asserting the fail-closed default. Every case that
//     claims the row is disabled therefore drives the media load first, and a sibling case drives a
//     LARGE source through the identical path and asserts the row is enabled with no note.

import * as React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";

// jsdom implements no ResizeObserver, and Radix measures with one. Same stub as
// tests/availability/availability-calendar.test.tsx — the `??` stops it clobbering a real one.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver =
  globalThis.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver);

// CSSOM conformance, not convenience — see the header. Setting an unparsable value must be a no-op;
// jsdom throws. Only the four physical offsets are wrapped, because that is the whole set Radix's
// slider can write its thumb position to.
const CSS_STYLE_PROTOTYPE = Object.getPrototypeOf(
  document.createElement("span").style,
) as CSSStyleDeclaration;
for (const property of ["left", "right", "top", "bottom"]) {
  const descriptor = Object.getOwnPropertyDescriptor(CSS_STYLE_PROTOTYPE, property);
  if (!descriptor?.set) continue;
  const write = descriptor.set;
  Object.defineProperty(CSS_STYLE_PROTOTYPE, property, {
    ...descriptor,
    set(this: CSSStyleDeclaration, value: string) {
      try {
        write.call(this, value);
      } catch {
        /* an unparsable declaration is dropped, exactly as a browser drops it */
      }
    },
  });
}

// jsdom implements neither half of the object-URL pair. The field mints one directly.
URL.createObjectURL = vi.fn(
  () => "blob:avatar-field-test",
) as unknown as typeof URL.createObjectURL;
URL.revokeObjectURL = vi.fn() as unknown as typeof URL.revokeObjectURL;

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

vi.mock("@/app/actions/avatar", () => ({
  uploadAvatarAction: vi.fn(),
  removeAvatarAction: vi.fn(),
}));

// `measureImage` is driven to resolve a size or to reject, which is how the decode and dimension
// guards are reached. `encodeAvatarBlob` is mocked because jsdom's `getContext("2d")` is null, so the
// real one could only ever reject — see `src/lib/avatar-canvas.ts`'s own note on why it has no spec.
vi.mock("@/lib/avatar-canvas", () => ({
  measureImage: vi.fn(),
  encodeAvatarBlob: vi.fn(),
  revokeAvatarObjectUrl: vi.fn(),
}));

import { removeAvatarAction, uploadAvatarAction } from "@/app/actions/avatar";
import {
  measureImage,
  encodeAvatarBlob,
  revokeAvatarObjectUrl,
} from "@/lib/avatar-canvas";
import {
  AVATAR_CHANGE_LABEL,
  AVATAR_CROP_CANCEL,
  AVATAR_CROP_CONFIRM,
  AVATAR_HELPER,
  AVATAR_MIN_SOURCE_PX,
  AVATAR_OUTPUT_PX,
  AVATAR_REMOVE_CANCEL,
  AVATAR_REMOVE_CONFIRM,
  AVATAR_REMOVE_CONFIRM_BUSY,
  AVATAR_REMOVE_FAILED_MESSAGE,
  AVATAR_REMOVE_LABEL,
  AVATAR_REMOVE_TITLE,
  AVATAR_SOFT_SOURCE_NOTE,
  AVATAR_TOO_SMALL_MESSAGE,
  AVATAR_UNREADABLE_MESSAGE,
  AVATAR_UPLOAD_LABEL,
  AVATAR_WRONG_TYPE_MESSAGE,
} from "@/lib/avatar";
import {
  AVATAR_MAX_BYTES,
  AVATAR_TOO_LARGE_MESSAGE,
  AVATAR_UPLOAD_FAILED_MESSAGE,
} from "@/lib/validation/profile";
import { AvatarField } from "@/components/profile/avatar-field";

const uploadMock = vi.mocked(uploadAvatarAction);
const removeMock = vi.mocked(removeAvatarAction);
const measureMock = vi.mocked(measureImage);
const encodeMock = vi.mocked(encodeAvatarBlob);
const revokeMock = vi.mocked(revokeAvatarObjectUrl);

/** The 400x400 JPEG the dialog's confirm produces. Its bytes never matter; its existence does. */
const CROPPED = new Blob(["cropped"], { type: "image/jpeg" });

/** A source comfortably above the output size, so the zoom row has room and is NOT locked. */
const LARGE = { width: 1200, height: 1200 };

/** Inside the soft band: above the floor, below the output size, so the row locks (rule F8). */
const SOFT = { width: 300, height: 300 };

/** Below the hard floor. */
const TINY = { width: 150, height: 150 };

/** `src/app/actions/host-requests.ts`'s shape, inverted: a refusal the SERVER worded. */
const SERVER_REFUSAL = "You must be signed in to upload an avatar.";

function jpeg(): File {
  return new File(["photo"], "holiday.jpg", { type: "image/jpeg" });
}

/** Collapse JSX line wrapping so a sentence can be matched whole (`state08-alerts.test.tsx`'s). */
function textOf(element: Element): string {
  return (element.textContent ?? "").replace(/\s+/g, " ").trim();
}

/** Every refusal region on screen — inside the overlay's portal as well as on the page. */
function alerts(): HTMLElement[] {
  return Array.from(document.querySelectorAll('[role="alert"]'));
}

type Field = {
  input: HTMLInputElement;
  /** Every string the component ASSIGNED to the input's `value`. See the header, note (a). */
  valueAssignments: string[];
};

function renderField(avatarUrl: string | null = null): Field {
  render(<AvatarField avatarUrl={avatarUrl} displayName="Alex Doe" />);
  const input = screen.getByLabelText("Upload avatar") as HTMLInputElement;
  const valueAssignments: string[] = [];
  Object.defineProperty(input, "value", {
    configurable: true,
    get: () => "",
    set: (next: string) => {
      valueAssignments.push(next);
    },
  });
  return { input, valueAssignments };
}

function pick(field: Field, file: File): void {
  fireEvent.change(field.input, { target: { files: [file] } });
}

/**
 * Fire the REAL library's own `load` handler on the REAL element it rendered, with the naturals
 * jsdom cannot discover for itself. Everything downstream — the per-image zoom bound, the crop
 * rectangle, whether the row locks — is then the library's arithmetic and the component's, not this
 * file's. See the header for why this is supplied and `getBoundingClientRect` is not.
 */
function reportMediaLoaded(
  dialog: HTMLElement,
  size: { width: number; height: number },
): void {
  const img = dialog.querySelector("img");
  if (!img) throw new Error("the cropper rendered no image element to load");
  Object.defineProperty(img, "naturalWidth", {
    value: size.width,
    configurable: true,
  });
  Object.defineProperty(img, "naturalHeight", {
    value: size.height,
    configurable: true,
  });
  fireEvent.load(img);
}

/** Pick an acceptable file, wait for the overlay's portal, and report the media's real size. */
async function openCropper(
  field: Field,
  size: { width: number; height: number } = LARGE,
): Promise<HTMLElement> {
  measureMock.mockResolvedValue(size);
  pick(field, jpeg());
  const dialog = await screen.findByRole("dialog");
  reportMediaLoaded(dialog, size);
  return dialog;
}

function press(dialog: HTMLElement, name: string): void {
  fireEvent.click(within(dialog).getByRole("button", { name }));
}

beforeEach(() => {
  vi.clearAllMocks();
  encodeMock.mockResolvedValue(CROPPED);
  uploadMock.mockResolvedValue({ ok: true, avatarUrl: "https://cdn/new.jpg" });
  removeMock.mockResolvedValue({ ok: true });
});

afterEach(cleanup);

describe("rule F4 — nothing reaches the network before the confirm", () => {
  it("calls the action ZERO times on pick and EXACTLY once after the confirm", async () => {
    const field = renderField();

    const dialog = await openCropper(field);

    // The whole complaint, as an assertion: the file is chosen, decoded, measured and framed, and
    // not one byte has left the browser.
    expect(uploadMock).not.toHaveBeenCalled();

    press(dialog, AVATAR_CROP_CONFIRM);
    await waitFor(() => expect(uploadMock).toHaveBeenCalledTimes(1));

    // ...and the transition is a transition: still exactly one call once the flow settles.
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).toBeNull(),
    );
    expect(uploadMock).toHaveBeenCalledTimes(1);
  });

  it("sends the CONFIRMED blob under a filename, never the file that was picked", async () => {
    const field = renderField();
    const dialog = await openCropper(field);

    press(dialog, AVATAR_CROP_CONFIRM);
    await waitFor(() => expect(uploadMock).toHaveBeenCalledTimes(1));

    const sent = uploadMock.mock.calls[0][0].get("avatar");
    expect(sent).toBeInstanceOf(File);
    // A Blob appended WITH a filename arrives as a File, which is what keeps the action's
    // `z.instanceof(File)` true (999.2 § 1b).
    expect((sent as File).name).toBe("avatar.jpg");
    expect((sent as File).type).toBe("image/jpeg");
    expect((sent as File).size).toBe(CROPPED.size);
  });

  it("swaps the preview and re-labels the control once the save lands", async () => {
    const field = renderField();
    expect(
      screen.getByRole("button", { name: AVATAR_UPLOAD_LABEL }),
    ).not.toBeNull();

    const dialog = await openCropper(field);
    press(dialog, AVATAR_CROP_CONFIRM);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: AVATAR_CHANGE_LABEL }),
      ).not.toBeNull(),
    );
  });
});

describe("the four pre-dialog refusals — each names what to pick instead, and opens nothing", () => {
  it("refuses a type outside the allow-list", async () => {
    const field = renderField();

    pick(field, new File(["g"], "loop.gif", { type: "image/gif" }));

    await waitFor(() => expect(alerts()).toHaveLength(1));
    expect(textOf(alerts()[0])).toBe(AVATAR_WRONG_TYPE_MESSAGE);
    expect(screen.queryByRole("dialog")).toBeNull();
    // The cheap guard came first: nothing was decoded and no URL was minted for a file we already
    // knew we would refuse.
    expect(measureMock).not.toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("refuses a file over the size cap with the sentence the server refuses with", async () => {
    const field = renderField();

    const oversized = new File(
      [new ArrayBuffer(AVATAR_MAX_BYTES + 1)],
      "huge.jpg",
      { type: "image/jpeg" },
    );
    expect(oversized.size).toBeGreaterThan(AVATAR_MAX_BYTES);
    pick(field, oversized);

    await waitFor(() => expect(alerts()).toHaveLength(1));
    expect(textOf(alerts()[0])).toBe(AVATAR_TOO_LARGE_MESSAGE);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(measureMock).not.toHaveBeenCalled();
  });

  it("refuses a file the browser cannot decode", async () => {
    const field = renderField();
    measureMock.mockRejectedValue(new Error("could not decode"));

    pick(field, jpeg());

    await waitFor(() => expect(alerts()).toHaveLength(1));
    expect(textOf(alerts()[0])).toBe(AVATAR_UNREADABLE_MESSAGE);
    expect(screen.queryByRole("dialog")).toBeNull();
    // The guard RAN and rejected — not "was never reached", which would produce the same silence.
    expect(measureMock).toHaveBeenCalledTimes(1);
    // The URL it minted is released rather than pinned for the life of the tab (T-16-35).
    expect(revokeMock).toHaveBeenCalledTimes(1);
  });

  it("refuses a source shorter than the floor on either side", async () => {
    const field = renderField();
    expect(Math.min(TINY.width, TINY.height)).toBeLessThan(AVATAR_MIN_SOURCE_PX);
    measureMock.mockResolvedValue(TINY);

    pick(field, jpeg());

    await waitFor(() => expect(alerts()).toHaveLength(1));
    expect(textOf(alerts()[0])).toBe(AVATAR_TOO_SMALL_MESSAGE);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(measureMock).toHaveBeenCalledTimes(1);
    expect(revokeMock).toHaveBeenCalledTimes(1);
  });
});

describe("rule F8 — a source inside the soft band opens, with the row disabled and its reason", () => {
  it("locks the zoom row and states why for a source under the output size", async () => {
    expect(Math.min(SOFT.width, SOFT.height)).toBeGreaterThanOrEqual(
      AVATAR_MIN_SOURCE_PX,
    );
    expect(Math.min(SOFT.width, SOFT.height)).toBeLessThan(AVATAR_OUTPUT_PX);

    const field = renderField();
    const dialog = await openCropper(field, SOFT);

    // Disabled, never hidden — a control that vanishes teaches nothing.
    //
    // ⚠ QUERIED BY ROLE ALONE, AND THAT IS A FINDING RATHER THAN A SHORTCUT. Measured here on
    // 2026-08-25: the element carrying `role="slider"` is Radix's THUMB, and with a single value
    // its auto-generated name is `undefined`, so it has no `aria-label` and no `aria-labelledby` at
    // all — `queryAllByRole("slider", { name: "Zoom" })` returns 0. The `aria-label` the dialog
    // passes lands on the slider ROOT, which carries no role and therefore contributes no name.
    // The zoom control ships UNNAMED. That is `image-crop-dialog.tsx`'s to fix, not this plan's
    // file and not this plan's scope; it is logged in the phase's `deferred-items.md` and named in
    // 16-10's SUMMARY so it is fixed deliberately rather than discovered by a person on a device.
    //
    // Read as plain DOM state: `jest-dom`'s matchers are not registered in this suite
    // (`tests/group/state08-alerts.test.tsx:249` records the same).
    expect(
      within(dialog).getByRole("slider").hasAttribute("data-disabled"),
    ).toBe(true);
    expect(within(dialog).getByText(AVATAR_SOFT_SOURCE_NOTE)).not.toBeNull();
  });

  it("leaves the row live and unannotated for a source with room to zoom", async () => {
    // The sibling that makes the case above a reading rather than the fail-closed default: the same
    // path, the same helper, a bigger source, opposite outcome on both halves.
    const field = renderField();
    const dialog = await openCropper(field, LARGE);

    expect(
      within(dialog).getByRole("slider").hasAttribute("data-disabled"),
    ).toBe(false);
    expect(
      within(dialog).queryByText(AVATAR_SOFT_SOURCE_NOTE),
    ).toBeNull();
  });
});

describe("rule F5 — a failed save keeps the dialog open with the framing intact", () => {
  it("renders the server's own sentence inside the still-open dialog", async () => {
    const field = renderField();
    uploadMock.mockResolvedValue({ ok: false, error: SERVER_REFUSAL });

    const dialog = await openCropper(field);
    press(dialog, AVATAR_CROP_CONFIRM);

    await waitFor(() => expect(alerts()).toHaveLength(1));
    // Verbatim — a client-side re-wording is a second thing that has to agree with the action.
    expect(textOf(alerts()[0])).toBe(SERVER_REFUSAL);
    expect(screen.getByRole("dialog")).not.toBeNull();
    expect(within(dialog).getByRole("slider")).not.toBeNull();
  });

  it("reports a failure to produce the bytes with the SAME sentence the action would have", async () => {
    const field = renderField();
    encodeMock.mockRejectedValue(new Error("no 2d context"));

    const dialog = await openCropper(field);
    press(dialog, AVATAR_CROP_CONFIRM);

    await waitFor(() => expect(alerts()).toHaveLength(1));
    expect(textOf(alerts()[0])).toBe(AVATAR_UPLOAD_FAILED_MESSAGE);
    expect(screen.getByRole("dialog")).not.toBeNull();
    // The half that failed is local, so nothing was sent — and the person is told the one thing
    // that is true either way: the photo is not saved.
    expect(uploadMock).not.toHaveBeenCalled();
  });
});

describe("D-174 — every handled change resets the input, on every path", () => {
  it("resets after an ACCEPTED pick", async () => {
    const field = renderField();

    await openCropper(field);

    expect(field.valueAssignments).toEqual([""]);
  });

  it("resets after a REFUSED pick", async () => {
    const field = renderField();

    pick(field, new File(["g"], "loop.gif", { type: "image/gif" }));

    await waitFor(() => expect(alerts()).toHaveLength(1));
    expect(field.valueAssignments).toEqual([""]);
  });

  it("resets after a pick that was accepted and then CANCELLED, and the re-pick is handled", async () => {
    const field = renderField();

    const dialog = await openCropper(field);
    press(dialog, AVATAR_CROP_CANCEL);
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).toBeNull(),
    );

    // The cancel destroys nothing: the previous avatar is untouched, the URL is released, and the
    // control still offers the first-upload label because no photo was ever stored.
    expect(revokeMock).toHaveBeenCalledTimes(1);
    expect(uploadMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: AVATAR_UPLOAD_LABEL }),
    ).not.toBeNull();

    // Re-picking THE IDENTICAL file is handled again. In a browser this only happens because the
    // reset above cleared the input; jsdom cannot reproduce the browser's own suppression, so the
    // assertion that carries D-174 is the count of assignments — one per handled change.
    await openCropper(field);
    expect(field.valueAssignments).toEqual(["", ""]);
  });
});

describe("GATE-03 rule 6 — one refusal region at a time, never two", () => {
  it("retires the page refusal when the overlay opens, and never renders both", async () => {
    const field = renderField();

    pick(field, new File(["g"], "loop.gif", { type: "image/gif" }));
    await waitFor(() => expect(alerts()).toHaveLength(1));
    expect(textOf(alerts()[0])).toBe(AVATAR_WRONG_TYPE_MESSAGE);

    uploadMock.mockResolvedValue({ ok: false, error: SERVER_REFUSAL });
    const dialog = await openCropper(field);
    // The page's sentence is gone the moment a new attempt begins — clear-then-set.
    expect(alerts()).toHaveLength(0);

    press(dialog, AVATAR_CROP_CONFIRM);
    await waitFor(() => expect(alerts()).toHaveLength(1));
    expect(textOf(alerts()[0])).toBe(SERVER_REFUSAL);
    // ...and it is the one INSIDE the overlay, not a second copy behind it.
    expect(within(dialog).getAllByRole("alert")).toHaveLength(1);
  });
});

describe("the copy on the resting surface is the exported literal", () => {
  it("renders the helper that names WebP, byte-for-byte", () => {
    renderField();

    expect(textOf(screen.getByText(AVATAR_HELPER))).toBe(AVATAR_HELPER);
  });

  it("names the control for the state it is in", () => {
    renderField("https://cdn/existing.jpg");

    expect(
      screen.getByRole("button", { name: AVATAR_CHANGE_LABEL }),
    ).not.toBeNull();
    expect(
      screen.queryByRole("button", { name: AVATAR_UPLOAD_LABEL }),
    ).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// CROP-03 — THE REMOVAL CONTROL AND ITS CONFIRM (plan 16-12)
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// WHAT THE CASES BELOW CATCH, and why each is shaped the way it is.
//
//   · The trigger's PRESENCE is asserted in both directions on the same component, because "no
//     removal control on a profile with no photo" and "a removal control on a profile with one" are
//     independent claims and only the pair rules out a control that is always there or never there.
//   · FOCUS is asserted BY ACCESSIBLE NAME with `toBe`, resolved through `@testing-library`'s
//     `{ name }` option — the arrangement `tests/design/responsive-dialog-autofocus.test.tsx`
//     established, reused here against the real component. `expect(active).not.toBe(destructive)`
//     would pass on `<body>`, on the overlay container and on any of the three dismiss affordances,
//     which is to say it would pass in every arrangement where the mitigation had failed.
//   · The FOOTER'S DOM ORDER is read off the footer element in document order, because it is what
//     decides the mobile stacking (`flex-col-reverse` below `sm:`) and because it is exactly the
//     order that makes the focus handler load-bearing rather than decorative.
//
// WHAT THESE CASES DELIBERATELY CANNOT COVER. **The overlay's own close control and the overlay
// click being inert while the removal is in flight are NOT assertable here.** Both are Radix
// behaviours that need a real browser — the outside-press dismissal runs through pointer capture and
// `react-remove-scroll`, neither of which jsdom implements — so in this environment they produce no
// observable difference between "guarded" and "unguarded". The single `onOpenChange` guard is what
// makes all three affordances inert, and this file can only drive the ONE it can reach
// (`Keep photo`). The other two belong to plan 16-13's Playwright spec.

/** A stored avatar, so the removal control has something to act on. */
const AN_AVATAR = "https://cdn/existing.jpg";

/**
 * The ACCESSIBLE NAME of `document.activeElement`, matched against every button the confirm can
 * hold. Returning a NAME rather than an element is what lets the assertion read
 * `expected 'Remove photo' to be 'Keep photo'` instead of an element-identity mismatch.
 */
function focusedButtonName(dialog: HTMLElement): string {
  for (const name of [AVATAR_REMOVE_CONFIRM, AVATAR_REMOVE_CANCEL, "Close"]) {
    const button = within(dialog).queryByRole("button", { name });
    if (button !== null && button === document.activeElement) return name;
  }
  const node = document.activeElement;
  if (node === null) return "«null»";
  if (node === document.body) return "«document.body — focus was dropped»";
  const label = (node.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  return `«${node.tagName.toLowerCase()} "${label}"»`;
}

/** Render a field WITH a photo, press its removal trigger, and wait for the confirm's portal. */
async function openRemoveConfirm(): Promise<HTMLElement> {
  render(<AvatarField avatarUrl={AN_AVATAR} displayName="Alex Doe" />);
  // Before the overlay opens the trigger is the only control by this name; afterwards the confirm
  // verb shares it, which is why every later lookup is scoped with `within(dialog)`.
  fireEvent.click(screen.getByRole("button", { name: AVATAR_REMOVE_LABEL }));
  return await screen.findByRole("dialog");
}

describe("CROP-03 — the removal control exists only when there is a photo to remove", () => {
  it("renders no removal trigger for a profile with no photo", () => {
    renderField(null);

    expect(
      screen.queryByRole("button", { name: AVATAR_REMOVE_LABEL }),
    ).toBeNull();
    // …and the constructive control is still there, so the absence above is a SCOPED absence rather
    // than a component that rendered nothing.
    expect(
      screen.getByRole("button", { name: AVATAR_UPLOAD_LABEL }),
    ).not.toBeNull();
  });

  it("renders the removal trigger, after the change control, for a profile with one", () => {
    renderField(AN_AVATAR);

    const controls = screen
      .getAllByRole("button")
      .map((button) => (button.textContent ?? "").trim());
    // `Change photo` before `Remove photo` — the circle is the anchor and the constructive action
    // reads first.
    expect(controls).toEqual([AVATAR_CHANGE_LABEL, AVATAR_REMOVE_LABEL]);
  });
});

describe("CROP-03 — D-168's mitigation, by mechanism (T-16-45)", () => {
  it("lands focus on Keep photo when the confirm opens", async () => {
    const dialog = await openRemoveConfirm();

    // Radix places focus in an effect after the content mounts, so the read is awaited rather than
    // taken on the same tick.
    await waitFor(() =>
      expect(focusedButtonName(dialog)).toBe(AVATAR_REMOVE_CANCEL),
    );
  });

  it("keeps the destructive action FIRST in the footer's DOM order", async () => {
    const dialog = await openRemoveConfirm();

    const footer = dialog.querySelector('[data-slot="dialog-footer"]');
    expect(footer, "the confirm rendered no footer").not.toBeNull();
    const names = within(footer as HTMLElement)
      .getAllByRole("button")
      .map((button) => (button.textContent ?? "").trim());
    // Destructive first, so `flex-col-reverse` stacks `Keep photo` on top under the thumb below
    // `sm:` and `sm:flex-row` puts it on the right above it. This is the order that makes the focus
    // handler load-bearing: in it, untouched Radix focuses the destructive button (plan 16-03).
    expect(names).toEqual([AVATAR_REMOVE_CONFIRM, AVATAR_REMOVE_CANCEL]);
    expect(within(dialog).getByText(AVATAR_REMOVE_TITLE)).not.toBeNull();
  });
});

describe("CROP-03 — pending and failure inside the confirm", () => {
  it("reads Removing… and disables both actions while the removal is in flight", async () => {
    // A promise that never settles IS the pending state — no timer, no fake clock, and no window in
    // which the assertion could be racing a resolution.
    removeMock.mockReturnValue(new Promise<never>(() => {}));

    const dialog = await openRemoveConfirm();
    fireEvent.click(
      within(dialog).getByRole("button", { name: AVATAR_REMOVE_CONFIRM }),
    );

    const busy = await within(dialog).findByRole("button", {
      name: AVATAR_REMOVE_CONFIRM_BUSY,
    });
    const keep = within(dialog).getByRole("button", {
      name: AVATAR_REMOVE_CANCEL,
    });
    // Read as plain DOM state — `jest-dom`'s matchers are not registered in this suite.
    expect(busy.hasAttribute("disabled")).toBe(true);
    expect(busy.getAttribute("aria-disabled")).toBe("true");
    expect(keep.hasAttribute("disabled")).toBe(true);
    expect(keep.getAttribute("aria-disabled")).toBe("true");
    // The verb it replaced is GONE rather than merely joined by a second one.
    expect(
      within(dialog).queryByRole("button", { name: AVATAR_REMOVE_CONFIRM }),
    ).toBeNull();
  });

  it("keeps the confirm OPEN with the server's own sentence when the removal fails", async () => {
    removeMock.mockResolvedValue({
      ok: false,
      error: AVATAR_REMOVE_FAILED_MESSAGE,
    });

    const dialog = await openRemoveConfirm();
    fireEvent.click(
      within(dialog).getByRole("button", { name: AVATAR_REMOVE_CONFIRM }),
    );

    await waitFor(() => expect(alerts()).toHaveLength(1));
    expect(textOf(alerts()[0])).toBe(AVATAR_REMOVE_FAILED_MESSAGE);
    // Still open, still offering both ways out — a failure that closed the overlay would leave the
    // person looking at the photo they asked to remove with nothing on screen saying why.
    expect(screen.getByRole("dialog")).not.toBeNull();
    expect(
      within(dialog).getByRole("button", { name: AVATAR_REMOVE_CONFIRM }),
    ).not.toBeNull();
    // …and the one region is INSIDE the overlay, not a second copy behind it (GATE-03 rule 6).
    expect(within(dialog).getAllByRole("alert")).toHaveLength(1);
  });

  it("closes the confirm and falls back to initials when the removal succeeds", async () => {
    const dialog = await openRemoveConfirm();
    fireEvent.click(
      within(dialog).getByRole("button", { name: AVATAR_REMOVE_CONFIRM }),
    );

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(removeMock).toHaveBeenCalledTimes(1);
    // The circle is back to initials, so the removal trigger has nothing to act on and is gone with
    // it; the control re-reads as a first upload.
    expect(
      screen.queryByRole("button", { name: AVATAR_REMOVE_LABEL }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: AVATAR_UPLOAD_LABEL }),
    ).not.toBeNull();
  });
});
