// @vitest-environment jsdom

// EVERY AVATAR SENTENCE ON `/profile` IS THE EXPORTED LITERAL, AND THE TWO Δ14 RETIRED ARE GONE.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE MECHANISM — THREE LINKS, IN `profile-pass.test.tsx:15-30`'s NUMBERED VOICE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
//   1. contract → bytes    every `AVATAR_*` sentence this file asserts is IMPORTED from
//                          `@/lib/avatar` (or from `@/lib/validation/profile`, for the two the
//                          UI-SPEC marks SHIPPED) and pinned here against a literal written out in
//                          full. That is the half that makes a copy change move a TEST file and be
//                          seen in the diff (T-15-28): an assertion that only compares a constant to
//                          itself moves silently with whoever edits the constant.
//   2. bytes → DOM         `AvatarField` is RENDERED in jsdom and the sentences are counted off the
//                          PRODUCED DOM — the paragraph that is actually in the document, the
//                          button's actual accessible text, the `role="alert"` a real refused pick
//                          actually mounted — rather than off anybody's source. A source scan can
//                          see that a component names a constant; only a render can see what the
//                          person is shown.
//   3. DOM → contract      each rendered sentence is compared to the export with `toBe`, never with
//                          a substring check. A sentence that gained a trailing space, lost a full
//                          stop or swapped `…` for three periods is a different sentence, and every
//                          one of those is a change somebody makes without noticing.
//
// WHAT WOULD STILL PASS WITHOUT THIS FILE, stated so it is obvious why the render half is not
// ceremony: a component that INLINED a string byte-identical to the export on the day it was
// written. `tests/profile/avatar-field.test.tsx` compares the rendered refusals to the imports and
// would catch that one; nothing at all watches the helper, the two control labels, or the claim that
// the retired busy label is gone from the TREE rather than from one component. An inlined copy is
// invisible until the export moves, and then the page keeps saying the old sentence while every test
// that reads the constant agrees with itself. Two copies of a string are two strings (rule F2).
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// Δ14 — THE TWO SENTENCES THIS PHASE DID NOT INHERIT
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// 16-UI-SPEC's copy contract inherits every avatar string verbatim from 999.2 EXCEPT two, and both
// are asserted below over the whole of `src/` rather than over one render:
//
//   CHANGED   the helper. The shipped one named JPG and PNG only, which UNDER-STATED the picker: the
//             `accept` attribute is now the three MIME types the allow-list declares, WebP included,
//             so a person with a `.webp` was being told their file was not offered and then having
//             it accepted. `AVATAR_HELPER` names all three.
//   RETIRED   the busy label on the `/profile` control. It described the interval between choosing a
//             file and the upload finishing — and rule F4 deleted that interval. Nothing reaches the
//             network until the crop is confirmed, so there is no state left for the word to name.
//
// A retirement asserted against ONE component is not a retirement (T-16-40). Both are asserted here
// as an absence over every `.ts`/`.tsx` file under `src/`, at the STRING-LITERAL level rather than
// the byte level — which is the same argument `profile-pass.test.tsx:70-86` makes for its own AST
// walk, in the opposite direction. A comment that explains a retirement is not an occurrence of the
// retired sentence, and a gate that cannot tell those apart is a gate nobody may write prose beside.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE MUTATION WALK — TWO PROBES, ONE PER LINK, BOTH RUN AND BOTH REVERTED (25 August 2026)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `profile-pass.test.tsx`'s arrangement, and the two probes are chosen to hit DIFFERENT links —
// which is the finding, because the obvious single probe only exercises one of them.
//
//   (P1) LINK 1. One character of `AVATAR_HELPER` changed in `src/lib/avatar.ts`, full stop to
//        exclamation mark, nothing else touched. 1 failed / 8 passed:
//
//          AssertionError: expected 'JPG, PNG, or WebP, up to 5 MB. Option…' to be
//          'JPG, PNG, or WebP, up to 5 MB. Option…' // Object.is equality
//          Expected: "JPG, PNG, or WebP, up to 5 MB. Optional."
//          Received: "JPG, PNG, or WebP, up to 5 MB. Optional!"
//
//        ⚠ IT WAS (1) THAT FIRED, NOT (2), AND THAT IS THE WHOLE ARGUMENT FOR (1) EXISTING. The
//        render comparison in (2) reads the SAME constant the component renders, so it agrees with
//        itself no matter what that constant says — it stayed green against this mutation and would
//        stay green against a total rewrite. Only the literal written out in this file notices that
//        the copy moved. A file with the render half alone would have reported a clean contract
//        while `/profile` said something nobody approved.
//
//   (P2) LINK 2. The component's `{AVATAR_HELPER}` replaced by an INLINED sentence one space away
//        from it — `up to 5MB` for `up to 5 MB` — i.e. the copy drifting inside the component while
//        the export stays correct, which is the direction (1) is blind in. 1 failed / 8 passed:
//
//          AssertionError: expected 'JPG, PNG, or WebP, up to 5MB. Optiona…' to be
//          'JPG, PNG, or WebP, up to 5 MB. Option…' // Object.is equality
//          Expected: "JPG, PNG, or WebP, up to 5 MB. Optional."
//          Received: "JPG, PNG, or WebP, up to 5MB. Optional."
//
//        The two probes are therefore not redundant and neither is decoration: (1) catches the
//        contract moving, (2) catches the component leaving the contract behind. A mutation of the
//        constant is invisible to one and a mutation of the component is invisible to the other.
//
// WALK CLOSED. Both mutations applied alone, run, and reverted with `git checkout -- <one file>`;
// `git diff --exit-code src/` exits 0 and the file is green at 9 passed.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE DOES NOT DO
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//   • IT NEVER OPENS THE CROP DIALOG. Every sentence it drives is one of the four PRE-dialog
//     refusals or a resting label, so no overlay mounts, and none of the jsdom scaffolding the
//     dialog needs (a `ResizeObserver`, a CSSOM write that does not throw on `calc(NaN% + 0px)`, an
//     image with real naturals) is installed here. `tests/profile/avatar-field.test.tsx` owns the
//     dialog's copy and the state machine around it; the stage itself is 16-13's Playwright.
//   • IT ASSERTS COPY, NOT LAYOUT, ROLE OR ORDER. `live-regions.test.tsx` owns which element the
//     refusal is announced from; `profile-pass.test.tsx` owns the containers and the counts; this
//     file only ever asks what the sentence SAYS.
//   • THE ZOOM ROW'S MISSING ACCESSIBLE NAME IS NOT ASSERTED HERE, IN EITHER DIRECTION. It is a real
//     WCAG 2.2 SC 4.1.2 failure measured by plan 16-10 and logged in the phase's
//     `deferred-items.md` (D1), owned by `image-crop-dialog.tsx`. Nothing below may be read as
//     saying that control is fine.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import ts from "typescript";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

// The one navigation stub, and the same one `profile-pass.test.tsx` records measuring: both
// components call `useRouter()` and this config mounts no App Router. Three no-ops, because nothing
// here navigates.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {}, replace: () => {} }),
}));

// The three server actions. `uploadAvatarAction` is never reached — every path this file drives
// refuses BEFORE the crop dialog exists, so there is nothing to confirm — and `updateProfile` is a
// promise that never settles on purpose, which is the only way to hold the profile submit in its
// busy state long enough to read the word it renders. See the `Saving…` section.
//
// `removeAvatarAction` (CROP-03, plan 16-12) IS driven, by one case, and with a promise that never
// settles for the same reason: `Removing…` is a word the FIELD authors, so reading it off the DOM is
// link 2 rather than a restatement of the export.
vi.mock("@/app/actions/avatar", () => ({
  uploadAvatarAction: vi.fn(),
  removeAvatarAction: vi.fn(),
}));
vi.mock("@/app/actions/profile", () => ({ updateProfile: vi.fn() }));

// `measureImage` is driven to resolve a size or to reject, which is how guards 3 and 4 are reached
// at all. `encodeAvatarBlob` is mocked for the reason `avatar-canvas.ts` records: jsdom's
// `getContext("2d")` is null, so the real one could only ever reject.
vi.mock("@/lib/avatar-canvas", () => ({
  measureImage: vi.fn(),
  encodeAvatarBlob: vi.fn(),
  revokeAvatarObjectUrl: vi.fn(),
}));

import { measureImage } from "@/lib/avatar-canvas";
import { removeAvatarAction } from "@/app/actions/avatar";
import { updateProfile } from "@/app/actions/profile";
import {
  AVATAR_CHANGE_LABEL,
  AVATAR_CROP_CONFIRM_BUSY,
  AVATAR_HELPER,
  AVATAR_REMOVE_BODY,
  AVATAR_REMOVE_CANCEL,
  AVATAR_REMOVE_CONFIRM,
  AVATAR_REMOVE_CONFIRM_BUSY,
  AVATAR_REMOVE_FAILED_MESSAGE,
  AVATAR_REMOVE_LABEL,
  AVATAR_REMOVE_TITLE,
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
import { ProfileForm } from "@/app/(app)/profile/profile-form";

const measureMock = vi.mocked(measureImage);
const updateProfileMock = vi.mocked(updateProfile);
const removeMock = vi.mocked(removeAvatarAction);

// jsdom implements neither half of the object-URL pair, and guards 3 and 4 run only after one has
// been minted. Nothing below reads the value.
URL.createObjectURL = vi.fn(
  () => "blob:avatar-copy-test",
) as unknown as typeof URL.createObjectURL;
URL.revokeObjectURL = vi.fn() as unknown as typeof URL.revokeObjectURL;

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// The two sentences Δ14 removed from the tree, written out ONCE, here, and nowhere under src/
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The `/profile` control's shipped busy label, retired by Δ14.
 *
 * ⚠ THIS FILE IS DELIBERATELY THE LAST PLACE IT IS SPELLED. A retirement asserted with the retired
 * string re-typed in three places is a retirement in name only, and the note in
 * `profile-pass.test.tsx`'s `PINNED_COPY` explaining where this one went is written AROUND the
 * string for exactly that reason. `tests/` is not scanned by the walk below; `src/` is.
 */
const RETIRED_BUSY_LABEL = "Uploading…";

/** The shipped helper Δ14 replaced. Under-stated the picker: it never named WebP. */
const RETIRED_HELPER = "JPG or PNG, up to 5 MB. Optional.";

/**
 * The three sentences 16-UI-SPEC's "Reused verbatim, NOT rewritten" table pins to a home that is NOT
 * this phase's copy module, with that home.
 *
 * The claim is one home EACH, and it is asserted rather than trusted. Re-declaring any of them in
 * `src/lib/avatar.ts` beside the phase's new copy would make a shipped sentence read as authored
 * here, and would put the client and the server one careless edit away from refusing the same file
 * with two different sentences.
 */
const REUSED_VERBATIM: readonly (readonly [string, string])[] = [
  ["Only image files are allowed.", "src/lib/validation/profile.ts"],
  ["Image must be 5 MB or smaller.", "src/lib/validation/profile.ts"],
  ["Could not upload your photo. Please try again.", "src/lib/validation/profile.ts"],
];

/** The copy module this phase authored. Nothing in the table above may be declared in it. */
const AVATAR_COPY_MODULE = "src/lib/avatar.ts";

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// The tree walk — every STRING LITERAL under src/, with the file that authored it
// ─────────────────────────────────────────────────────────────────────────────────────────────────

const SRC_DIR = resolve(process.cwd(), "src");

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectSourceFiles(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

/**
 * WINDOWS PATH NORMALISATION — `brand-recipe.test.ts:442-449`'s line, and load-bearing for the same
 * reason it is there. On this box `path.relative` emits backslashes while every path this file
 * compares against is written with forward slashes; without this the home assertions below would
 * compare against names that never match and the absences would pass over a set of labels nobody
 * could read.
 */
function label(file: string): string {
  return relative(process.cwd(), file).split("\\").join("/");
}

type Literal = { readonly file: string; readonly value: string };

/**
 * Collected at module level, once, from the AST rather than from the bytes.
 *
 * MODULE SPECIFIERS ARE EXCLUDED — an import path is not a sentence — and COMMENTS CANNOT APPEAR
 * HERE AT ALL, which is the whole reason the two retirement assertions can be written down beside
 * the prose explaining them. A byte scan for a retired sentence reports the paragraph announcing the
 * retirement as the survival.
 */
const SOURCE_FILES = collectSourceFiles(SRC_DIR);

const LITERALS: readonly Literal[] = (() => {
  const out: Literal[] = [];
  for (const full of SOURCE_FILES) {
    const name = label(full);
    const sf = ts.createSourceFile(
      full,
      readFileSync(full, "utf8"),
      ts.ScriptTarget.Latest,
      /* setParentNodes */ false,
      ts.ScriptKind.TSX,
    );

    const specifiers = new Set<ts.Node>();
    const visitImports = (node: ts.Node): void => {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier !== undefined &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        specifiers.add(node.moduleSpecifier);
      }
      ts.forEachChild(node, visitImports);
    };
    visitImports(sf);

    const visit = (node: ts.Node): void => {
      if (ts.isStringLiteral(node) && !specifiers.has(node)) {
        out.push({ file: name, value: node.text });
      } else if (ts.isNoSubstitutionTemplateLiteral(node)) {
        out.push({ file: name, value: node.text });
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return out;
})();

/** Every file under `src/` that authors this exact sentence as a string literal, sorted, deduped. */
function homesOf(sentence: string): string[] {
  return [
    ...new Set(LITERALS.filter((l) => l.value === sentence).map((l) => l.file)),
  ].sort();
}

/** How many times it is written out, which is a different question from how many files hold it. */
function occurrencesOf(sentence: string): number {
  return LITERALS.filter((l) => l.value === sentence).length;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// The render harness
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/** Collapse JSX line wrapping so a sentence can be compared whole. */
function textOf(element: Element | null): string {
  return (element?.textContent ?? "").replace(/\s+/g, " ").trim();
}

function jpeg(): File {
  return new File(["photo"], "holiday.jpg", { type: "image/jpeg" });
}

type Field = { readonly container: HTMLElement; readonly input: HTMLInputElement };

function renderField(avatarUrl: string | null = null): Field {
  const { container } = render(
    <AvatarField avatarUrl={avatarUrl} displayName="Alex Doe" />,
  );
  return {
    container,
    input: screen.getByLabelText("Upload avatar") as HTMLInputElement,
  };
}

/** Pick a file and wait for whichever refusal the guards produced to reach the document. */
async function refuse(field: Field, file: File): Promise<string> {
  fireEvent.change(field.input, { target: { files: [file] } });
  const alert = await screen.findByRole("alert");
  // Nothing opened. Every sentence this file drives is a PRE-dialog refusal, and a sentence read
  // out of an overlay that should not exist is a sentence read off the wrong surface.
  expect(screen.queryByRole("dialog")).toBeNull();
  return textOf(alert);
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("the avatar copy contract — the exported literal, the rendered sentence, and Δ14", () => {
  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // GUARD THE GUARD. Two of the assertions below are ABSENCES over the whole tree, and a walk that
  // silently produced nothing satisfies both at once — `live-regions.test.tsx` probe (d) measured
  // exactly that shape over a path its walker never opened.
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("(0) the walk opened the real tree and can find a sentence in it", () => {
    // Floors, MEASURED 25 August 2026 by asserting each count against an impossible value and
    // reading the failure — 345 files, 9 749 string literals — and set well below, for
    // `profile-pass.test.tsx:JSX_FLOOR`'s stated reason: a floor set AT the count is a census that
    // reddens on any innocuous edit, and a floor is only ever here to catch a walk of nothing.
    expect(
      SOURCE_FILES.length,
      "the source walk found almost no files. Both Δ14 absences below are satisfied by an empty " +
        "corpus, and nothing in a green run would distinguish that from a clean tree.",
    ).toBeGreaterThan(150);
    expect(
      LITERALS.length,
      "the AST walk collected almost no string literals. The files were opened and parsed to " +
        "nothing, which passes every absence below and asserts none of them.",
    ).toBeGreaterThan(3000);

    // …and the POSITIVE control, which is what makes the two empties readable as findings rather
    // than as silence: the walk can locate a sentence, in the file that declares it, exactly once.
    expect(
      homesOf(AVATAR_HELPER),
      "the walk cannot find the helper in the module that exports it. Every absence below is " +
        "then meaningless — a scan that finds nothing reports every retirement as complete.",
    ).toEqual([AVATAR_COPY_MODULE]);
    expect(occurrencesOf(AVATAR_HELPER)).toBe(1);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // LINK 1 — CONTRACT → BYTES. The exports, pinned against literals written out here.
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("(1) every avatar sentence is the byte string 16-UI-SPEC pins", () => {
    // Δ14's changed one, and the ONLY assertion in the phase that says WHICH THREE FORMATS the
    // helper names. `toBe` against a literal written out here is what makes a copy edit move a test
    // file: comparing the export to itself would follow any rewrite silently.
    expect(AVATAR_HELPER).toBe("JPG, PNG, or WebP, up to 5 MB. Optional.");

    expect(AVATAR_UPLOAD_LABEL).toBe("Upload photo");
    expect(AVATAR_CHANGE_LABEL).toBe("Change photo");

    expect(AVATAR_WRONG_TYPE_MESSAGE).toBe("Choose a JPG, PNG, or WebP image.");
    expect(AVATAR_UNREADABLE_MESSAGE).toBe(
      "We couldn't open that image. Try a JPG, PNG, or WebP.",
    );
    expect(AVATAR_TOO_SMALL_MESSAGE).toBe(
      "That image is too small. Pick one at least 200 by 200 pixels.",
    );
    expect(AVATAR_TOO_LARGE_MESSAGE).toBe("Image must be 5 MB or smaller.");
    expect(AVATAR_UPLOAD_FAILED_MESSAGE).toBe(
      "Could not upload your photo. Please try again.",
    );

    // ── CROP-03's five sentences, pinned by plan 16-12 ────────────────────────────────────────
    // They were absent from this case until the removal shipped, and they arrive here rather than in
    // `profile-pass.test.tsx`'s `PINNED_COPY` for a mechanical reason: PINNED_COPY compares against
    // the string literals a FILE authors, and `avatar-field.tsx` authors none of these — it renders
    // the imports. An AST pin over that file would look for sentences that are not in it and would
    // report every one of them missing.
    expect(AVATAR_REMOVE_LABEL).toBe("Remove photo");
    expect(AVATAR_REMOVE_TITLE).toBe("Remove your photo?");
    expect(AVATAR_REMOVE_BODY).toBe(
      "Your profile will show your initials instead. You can add a new photo any time.",
    );
    expect(AVATAR_REMOVE_CONFIRM).toBe("Remove photo");
    expect(AVATAR_REMOVE_CANCEL).toBe("Keep photo");
    expect(AVATAR_REMOVE_FAILED_MESSAGE).toBe(
      "Couldn't remove your photo. Try again.",
    );

    // The busy label, character by character, the way the crop confirm's twin is pinned below: same
    // one-word-plus-ellipsis shape, and a single U+2026 rather than three full stops.
    expect(AVATAR_REMOVE_CONFIRM_BUSY).toBe("Removing…");
    expect(AVATAR_REMOVE_CONFIRM_BUSY.length).toBe(9);
    expect(AVATAR_REMOVE_CONFIRM_BUSY.codePointAt(8)).toBe(0x2026);

    // The trigger and the confirm verb are the SAME sentence, deliberately — the control names the
    // outcome and the confirm repeats it, so a person who opened the overlay by accident reads the
    // same words they pressed. Two constants because they are two surfaces with two owners, not
    // because they are allowed to drift; this line is what would notice if one of them did.
    expect(AVATAR_REMOVE_CONFIRM).toBe(AVATAR_REMOVE_LABEL);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // LINK 2 AND 3 — BYTES → DOM → CONTRACT. What the page actually says.
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("(2) the helper the field renders is the exported helper", () => {
    const field = renderField();

    // Read as "the paragraph this component put in the document", not as "find me the string I
    // expect". A `getByText(AVATAR_HELPER)` would throw on a mismatch instead of printing the two
    // sentences side by side, and would say nothing at all about a SECOND paragraph appearing.
    const paragraphs = Array.from(field.container.querySelectorAll("p"));
    expect(
      paragraphs.length,
      "the resting avatar field does not render exactly one paragraph. With no file staged there " +
        "is no refusal, so the helper is the only sentence on this surface.",
    ).toBe(1);
    expect(textOf(paragraphs[0])).toBe(AVATAR_HELPER);
  });

  it("(3) the controls read Upload alone with no photo, and Change + Remove with one", () => {
    // ⚠ THIS CASE IS WHERE CROP-03 LANDED, AND THE RED WAS WATCHED RATHER THAN ANTICIPATED. Until
    // plan 16-12 both halves asserted ONE control, and the first half's message said so in as many
    // words — *"CROP-03's removal button is plan 16-12's and does not exist yet; a second control
    // here now would be an affordance ahead of its action."* The removal shipped and the second half
    // failed on the count:
    //
    //   AssertionError: expected 2 to be 1 // Object.is equality
    //     - Expected: 1   + Received: 2
    //     ❯ tests/design/avatar-copy.test.tsx:426:27
    //
    // The assertion MOVED rather than loosening. What it claims now is stronger than the count it
    // replaced: the field renders exactly TWO controls with a photo and exactly ONE without, and it
    // names both, in order. "At least one control exists" would have been the cheap repair and it
    // would stay green against a third control nobody ordered.
    //
    // ⚠ AND THE FIRST HALF'S `1` IS NOT LEFT-OVER STRICTNESS. A removal affordance on a profile with
    // no photo is a control that acts on nothing, so its absence there is a claim CROP-03 makes, not
    // one it retired.
    const withoutPhoto = renderField(null);
    const first = Array.from(withoutPhoto.container.querySelectorAll("button"));
    expect(
      first.map(textOf),
      "the avatar field renders the wrong controls for a profile with no photo. There is exactly " +
        "one thing to offer — the first upload — and a removal control here would act on nothing.",
    ).toEqual([AVATAR_UPLOAD_LABEL]);

    cleanup();

    const withPhoto = renderField("https://cdn.example/avatar.jpg");
    const second = Array.from(withPhoto.container.querySelectorAll("button"));
    // The primary control is the SAME control, re-labelled — a person who already has a photo is
    // replacing one, and `Upload photo` would describe a first-time action they are not taking — and
    // the removal control follows it, because the constructive action reads first.
    expect(
      second.map(textOf),
      "the avatar field renders the wrong controls for a profile WITH a photo. It offers exactly " +
        "two: replace it, or remove it — in that order.",
    ).toEqual([AVATAR_CHANGE_LABEL, AVATAR_REMOVE_LABEL]);
  });

  it("(3b) the removal confirm's four sentences are the exported literals, read off the DOM", async () => {
    // LINK 2, on CROP-03's overlay: a source scan can see that the component names these constants;
    // only a render can see what a person is shown. The confirm is opened through its real trigger.
    renderField("https://cdn.example/avatar.jpg");
    fireEvent.click(screen.getByRole("button", { name: AVATAR_REMOVE_LABEL }));

    const dialog = await screen.findByRole("dialog");
    // The title and the body come through the pattern's own `title` / `description` slots, so this
    // also proves the field did not hand them to some other slot or re-word them on the way.
    expect(textOf(dialog.querySelector("h2"))).toBe(AVATAR_REMOVE_TITLE);
    expect(
      textOf(dialog.querySelector('[data-slot="dialog-description"]')),
    ).toBe(AVATAR_REMOVE_BODY);

    const footer = dialog.querySelector('[data-slot="dialog-footer"]');
    expect(footer, "the confirm rendered no footer").not.toBeNull();
    const actions = Array.from(
      (footer as HTMLElement).querySelectorAll("button"),
    ).map(textOf);
    // Destructive verb first in the DOM — `profile-pass.test.tsx` and
    // `tests/profile/avatar-field.test.tsx` own WHY; this file only asks what the two say.
    expect(actions).toEqual([AVATAR_REMOVE_CONFIRM, AVATAR_REMOVE_CANCEL]);
  });

  it("(3c) the confirm's busy label is the word the field authors, held in flight", async () => {
    // The same technique case (7) uses for `Saving…`, and for the same reason: a promise that never
    // settles is the only way to read a busy word without a timer racing the assertion.
    removeMock.mockReturnValue(new Promise<never>(() => {}));

    renderField("https://cdn.example/avatar.jpg");
    fireEvent.click(screen.getByRole("button", { name: AVATAR_REMOVE_LABEL }));
    const dialog = await screen.findByRole("dialog");

    const confirm = Array.from(dialog.querySelectorAll("button")).find(
      (button) => textOf(button) === AVATAR_REMOVE_CONFIRM,
    );
    expect(confirm, "the confirm verb is not in the overlay").not.toBeUndefined();
    fireEvent.click(confirm as HTMLButtonElement);

    await waitFor(() =>
      expect(textOf(confirm as HTMLButtonElement)).toBe(
        AVATAR_REMOVE_CONFIRM_BUSY,
      ),
    );
  });

  it("(4) each of the four refusals renders its exported sentence byte-for-byte", async () => {
    // GUARD 1 — TYPE. No decode, no object URL: the cheap check refuses first.
    const typeField = renderField();
    expect(await refuse(typeField, new File(["g"], "loop.gif", { type: "image/gif" }))).toBe(
      AVATAR_WRONG_TYPE_MESSAGE,
    );
    expect(measureMock).not.toHaveBeenCalled();
    cleanup();

    // GUARD 2 — SIZE. The sentence the SERVER refuses with, imported rather than restated, so the
    // two sides cannot drift into disagreeing about five megabytes.
    const sizeField = renderField();
    const oversized = new File([new ArrayBuffer(AVATAR_MAX_BYTES + 1)], "huge.jpg", {
      type: "image/jpeg",
    });
    expect(oversized.size).toBeGreaterThan(AVATAR_MAX_BYTES);
    expect(await refuse(sizeField, oversized)).toBe(AVATAR_TOO_LARGE_MESSAGE);
    expect(measureMock).not.toHaveBeenCalled();
    cleanup();

    // GUARD 3 — DECODE. And the guard is asserted to have RUN: an unreached guard produces the same
    // silence as a passing one, so "measure was never called" and "measure rejected" would be
    // indistinguishable without this line.
    const decodeField = renderField();
    measureMock.mockRejectedValue(new Error("could not decode"));
    expect(await refuse(decodeField, jpeg())).toBe(AVATAR_UNREADABLE_MESSAGE);
    expect(measureMock).toHaveBeenCalledTimes(1);
    cleanup();

    // GUARD 4 — DIMENSIONS. Same reading: the size came back and was judged.
    vi.clearAllMocks();
    const tinyField = renderField();
    measureMock.mockResolvedValue({ width: 150, height: 150 });
    expect(await refuse(tinyField, jpeg())).toBe(AVATAR_TOO_SMALL_MESSAGE);
    expect(measureMock).toHaveBeenCalledTimes(1);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // Δ14 — THE TWO RETIREMENTS, OVER THE TREE AND OVER THE RENDER
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("(5) the retired busy label is authored nowhere under src/ and rendered nowhere", () => {
    expect(
      homesOf(RETIRED_BUSY_LABEL),
      "the `/profile` control's shipped busy label is still authored somewhere under src/. Rule " +
        "F4 deleted the interval it described — nothing reaches the network between choosing a " +
        "file and confirming the crop — so any surface still able to render it is a surface " +
        "claiming an upload that is not happening.",
    ).toEqual([]);

    // …and the render half, on the surface that used to show it. The tree scan is the strong claim;
    // this is the one that would still fire if the word arrived from a variable or a lookup, which
    // is precisely the direction an AST walk is blind in.
    const field = renderField();
    expect(textOf(field.container).includes(RETIRED_BUSY_LABEL)).toBe(false);
  });

  it("(6) the shipped helper Δ14 replaced is authored nowhere under src/", () => {
    expect(
      homesOf(RETIRED_HELPER),
      "the pre-Δ14 helper is still authored under src/. It names JPG and PNG only, while the " +
        "picker's `accept` offers WebP as well — so it under-states what the surface takes and " +
        "tells a person with a .webp that their file is not welcome immediately before accepting " +
        "it. `AVATAR_HELPER` is the replacement and names all three.",
    ).toEqual([]);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // ONE ROUTE, ONE WORD — the crop confirm's busy label and the profile submit's
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("(7) the crop confirm's busy label is the word the profile submit already renders", async () => {
    // Δ14 calls this out specifically, and it is a fact about the ROUTE rather than about either
    // component: `/profile` is one page, the two controls are seconds apart, and a person who reads
    // `Saving…` under the crop and `Uploading…`, `Working…` or `Please wait…` under the form has
    // been told the same thing in two voices for no reason they can see.
    updateProfileMock.mockImplementation(
      () => new Promise(() => {}) as ReturnType<typeof updateProfile>,
    );

    const { container } = render(
      <ProfileForm
        initial={{ firstName: "Ada", lastName: "", phone: "", bio: "", city: "" }}
        avatarUrl={null}
        displayName="Ada"
      />,
    );

    const submit = container.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement | null;
    expect(submit, "the profile form renders no submit button").not.toBeNull();
    expect(textOf(submit)).toBe("Save profile");

    // The submit is DRIVEN into its busy state against an action that never settles, because the
    // word only exists while `isSubmitting` is true. Reading it out of the source would assert that
    // the literal is present in a ternary, not that it is what the person is shown.
    const form = container.querySelector("form");
    expect(form, "the profile form renders no form element").not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

    await waitFor(() => {
      expect(textOf(submit)).toBe(AVATAR_CROP_CONFIRM_BUSY);
    });

    // …and the ELLIPSIS is one character, not three periods. This is the half a reviewer cannot see:
    // `Saving...` and `Saving…` are visually near-identical in a diff, announce differently, and
    // would make the two controls disagree while every screenshot looked right.
    expect(AVATAR_CROP_CONFIRM_BUSY).toBe("Saving…");
    expect(AVATAR_CROP_CONFIRM_BUSY.length).toBe(7);
    expect(AVATAR_CROP_CONFIRM_BUSY.codePointAt(6)).toBe(0x2026);

    // …and the OTHER end of the same claim, read off the source rather than off the render: the
    // profile form authors this word itself, exactly once.
    //
    // ⚠ IT IS NOT PINNED AS A PAIR, AND THAT IS A MEASUREMENT RATHER THAN A CONCESSION. The first
    // draft asserted `homesOf(AVATAR_CROP_CONFIRM_BUSY)` was exactly this file and the copy module,
    // and watched it fail against SIX:
    //
    //   + "src/app/(host)/host/listings/[id]/edit/wizard.tsx"
    //   + "src/components/availability/blocks-editor.tsx"
    //   + "src/components/availability/weekly-hours-editor.tsx"
    //   + "src/components/group/rsvp-form.tsx"
    //
    // The busy word is a REPO-WIDE pending idiom on save-shaped controls, not a two-party contract,
    // so a pair pin would have been this file claiming ownership of a vocabulary it does not own —
    // and would have reddened on the next unrelated form. What Δ14 actually says is narrower and is
    // what is asserted: the crop confirm reuses the word THIS ROUTE already renders. Scoped to the
    // route, that is a real claim; widened to the tree, it is somebody else's inventory.
    expect(
      occurrencesOf(AVATAR_CROP_CONFIRM_BUSY),
      "the profile form no longer authors the busy word this route already renders.",
    ).toBeGreaterThan(0);
    expect(
      LITERALS.filter(
        (l) =>
          l.file === "src/app/(app)/profile/profile-form.tsx" &&
          l.value === AVATAR_CROP_CONFIRM_BUSY,
      ).length,
    ).toBe(1);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // THE SHIPPED SENTENCES — ONE HOME EACH, AND NOT IN THIS PHASE'S COPY MODULE
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("(8) each reused-verbatim sentence has exactly one home, and it is not the avatar module", () => {
    for (const [sentence, home] of REUSED_VERBATIM) {
      expect(
        homesOf(sentence),
        `a sentence 16-UI-SPEC marks SHIPPED is authored somewhere other than ${home}. It is ` +
          "reused, not rewritten: the client refusal and the server refusal have to be the same " +
          "bytes, and the only structural way for that to hold is for there to be ONE of them.",
      ).toEqual([home]);
      expect(
        occurrencesOf(sentence),
        `${home} writes that sentence out more than once. Two copies in one file drift exactly ` +
          "as readily as two copies in two files; the docblock beside it may describe it, and a " +
          "comment is not a literal.",
      ).toBe(1);
    }

    // …and the direction the table exists to forbid, stated as its own assertion so the reason is
    // legible: re-declaring a shipped sentence beside this phase's authored copy would make it read
    // as authored here, and the next person to reword the phase's copy would reword a contract they
    // did not know they were touching.
    const reDeclared = REUSED_VERBATIM.filter(([sentence]) =>
      homesOf(sentence).includes(AVATAR_COPY_MODULE),
    ).map(([sentence]) => sentence);
    expect(
      reDeclared,
      `${AVATAR_COPY_MODULE} re-declares a sentence that already ships from somewhere else.`,
    ).toEqual([]);
  });
});
