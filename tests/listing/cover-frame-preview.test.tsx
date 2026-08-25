// @vitest-environment jsdom

// CROP-02 — THE COVER-FRAME PREVIEW: WHEN IT APPEARS, WHOSE SHAPES IT BORROWS, WHICH SIDE OF THE
// CLIENT BOUNDARY IT LIVES ON, AND WHETHER IT KEEPS UP WITH A REORDER.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE CATCHES, AND WHAT WOULD STILL PASS WITHOUT IT
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// The defect this file exists for is a preview that renders a shape which merely LOOKS like the shipped
// one. Two frames sized by hand-typed literals would render identically to two frames sized by the
// imported constants — today. The day somebody retunes the listing hero in `measurements.ts`, the
// hand-typed preview keeps showing the OLD cut and tells the host a confident lie about a surface it
// no longer describes. That is worse than no preview, and nothing about the rendered DOM can see it.
//
// jsdom compiles no Tailwind, so a box-measurement assertion here would be a fiction (`D-131`, and
// `photo-gallery.test.tsx:1-8` argues the same point for the mosaic). The honest pair of assertions is:
//
//   • the rendered `className` CONTAINS the constant imported from `@/lib/design/measurements` — so a
//     literal that happens to spell the same thing cannot satisfy it, because the expected value is
//     read from the same module the component reads; and
//   • the component's SOURCE contains no ratio literal at all, read off disk — which is what closes the
//     "imports it AND also hard-codes it" hole the first assertion leaves open.
//
// NOT COVERED, deliberately, so this file is under-trusted rather than over-trusted:
//   • Whether the two cuts are ACCURATE to what a booker sees. That is a browser fact about
//     `object-cover` on a real layout, and it belongs to the visual gate, not to jsdom.
//   • Whether `measurements.ts`'s two constants are themselves right. They are Phase 12's, and
//     `photo-gallery.test.tsx` / `card-pattern-coverage.test.ts` own them.
//
// STUB SET: `tests/host/request-refusal.test.tsx`'s (the actions module, `sonner`), plus `next-cloudinary`
// — `PhotoUploader` renders the upload widget in BOTH of its branches, and the real one reaches for a
// remote script that jsdom has no business fetching. The widget is a render-prop, so the stub is one
// line and the button it yields still renders.

import * as React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

vi.mock("@/app/actions/listing-photo", () => ({
  persistPhoto: vi.fn(),
  reorderPhotos: vi.fn(),
  removePhoto: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("next-cloudinary", () => ({
  CldUploadWidget: ({
    children,
  }: {
    children: (opts: { open: () => void }) => React.ReactNode;
  }) => <>{children({ open: () => {} })}</>,
}));

import { reorderPhotos, type ListingPhotoRow } from "@/app/actions/listing-photo";
import { MOSAIC_ASPECT, RESULT_CARD_MEDIA } from "@/lib/design/measurements";
import {
  COVER_PREVIEW_BODY,
  COVER_PREVIEW_CARD_CAPTION,
  COVER_PREVIEW_HERO_CAPTION,
  COVER_PREVIEW_TITLE,
} from "@/lib/listing/cover-frames";
import { PhotoUploader } from "@/components/listing/photo-uploader";

const reorderMock = vi.mocked(reorderPhotos);

/** `src/components/listing/photo-uploader.tsx:202`, verbatim — the empty branch's own heading. */
const EMPTY_STATE_HEADING = "Add photos of your space";

const COMPONENT_PATH = "src/components/listing/cover-frame-preview.tsx";

function componentSource(): string {
  return readFileSync(resolve(process.cwd(), COMPONENT_PATH), "utf8");
}

function photo(n: number): ListingPhotoRow {
  return {
    id: `ph_${n}`,
    publicId: `fitout/listings/lst_1/photo-${n}`,
    url: `https://res.cloudinary.com/demo/image/upload/photo-${n}.jpg`,
    position: n,
  };
}

function renderUploader(photos: ListingPhotoRow[]) {
  return render(<PhotoUploader listingId="lst_1" initialPhotos={photos} />);
}

/**
 * The media box for one frame, found through the frame's own CAPTION rather than by DOM order.
 *
 * Order would work today and would keep working after somebody swapped the two frames by accident,
 * which is the whole reason it is not used: the caption is what tells the host which surface they are
 * looking at, so the caption is what the assertion should hang off.
 */
function frameBox(caption: string): HTMLElement {
  const figure = screen.getByText(caption).closest("figure");
  expect(figure, `no <figure> around the caption "${caption}"`).not.toBeNull();
  const box = within(figure as HTMLElement).getByRole("img").parentElement;
  expect(box, `the image under "${caption}" has no media box around it`).not.toBeNull();
  return box as HTMLElement;
}

/**
 * "Does this module open with a `use client` DIRECTIVE PROLOGUE?", read off the AST.
 *
 * `(path, text)` rather than `(path)` on purpose — `leak.test.ts:208-212`'s rule: the self-tests at the
 * bottom feed fixtures that are never written to disk, so the code path the real assertion runs is the
 * same one the fixtures prove.
 *
 * The detector shape is `tests/design/empty-state-adoption.test.ts:657-663`'s, and it is structural for
 * the reason that file records: a component whose header has to QUOTE the directive in order to say it
 * does not use one returns a non-zero `grep` count while being perfectly correct.
 * `cover-frame-preview.tsx`'s header does exactly that, so a text search on it is worse than useless.
 *
 * ⚠ THIS IS NOT `tests/design/server-only-guards.test.ts`'s PROPERTY. That file polices
 * `import "server-only"` — a claim that a module must NEVER reach the browser. This is the opposite
 * direction: a claim that this module never DEMANDS the browser. A file can satisfy either without the
 * other, so neither test substitutes for the other (16-PATTERNS § Measured corrections #1).
 */
function hasUseClientPrologue(path: string, text: string): boolean {
  const sf = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const first = sf.statements[0];
  return (
    !!first &&
    ts.isExpressionStatement(first) &&
    ts.isStringLiteral(first.expression) &&
    first.expression.text === "use client"
  );
}

beforeEach(() => {
  reorderMock.mockResolvedValue({ ok: true });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// (1) VISIBILITY — Δ17's boundary, asserted rather than described
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

describe("CROP-02 (1) — the preview appears with the first photo and not before", () => {
  it("renders NEITHER frame on a step with zero photos, and leaves the bespoke empty state alone", () => {
    renderUploader([]);

    expect(
      screen.queryByRole("heading", { name: COVER_PREVIEW_TITLE }),
      "the preview rendered over an empty grid — there is no cover to preview, and the two grey boxes " +
        "read as failed images",
    ).toBeNull();
    expect(screen.queryByText(COVER_PREVIEW_BODY)).toBeNull();

    // Δ17: the empty branch is untouched by this phase, so it must still be the one that renders.
    expect(screen.getByRole("heading", { name: EMPTY_STATE_HEADING })).toBeTruthy();
  });

  it("renders the block, its body and both captions as soon as there is one photo", () => {
    renderUploader([photo(0)]);

    expect(screen.getByRole("heading", { name: COVER_PREVIEW_TITLE })).toBeTruthy();
    expect(screen.getByText(COVER_PREVIEW_BODY)).toBeTruthy();
    expect(screen.getByText(COVER_PREVIEW_HERO_CAPTION)).toBeTruthy();
    expect(screen.getByText(COVER_PREVIEW_CARD_CAPTION)).toBeTruthy();

    // …and the empty branch is gone, which is the other half of the same boundary.
    expect(screen.queryByRole("heading", { name: EMPTY_STATE_HEADING })).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// (2) THE IMPORTED CLASS — D-170 / Δ8, in the only two forms jsdom can honestly hold
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

describe("CROP-02 (2) — the frames wear the shipped surfaces' own class strings", () => {
  it("sizes the listing-page frame with MOSAIC_ASPECT and the search frame with RESULT_CARD_MEDIA", () => {
    renderUploader([photo(0)]);

    // The expected values are IMPORTED, not retyped: retyping them would make this assertion satisfiable
    // by a literal that happens to match today, which is the exact defect it is here to reject.
    expect(frameBox(COVER_PREVIEW_HERO_CAPTION).className).toContain(MOSAIC_ASPECT);
    expect(frameBox(COVER_PREVIEW_CARD_CAPTION).className).toContain(RESULT_CARD_MEDIA);

    // And the two really are different shapes — a preview that rendered one ratio twice would satisfy
    // both lines above if the constants ever collapsed onto one value.
    expect(MOSAIC_ASPECT).not.toBe(RESULT_CARD_MEDIA);
  });

  it("declares no ratio of its own anywhere in its source", () => {
    const src = componentSource();

    // `aspect-[` as authored TEXT. `MOSAIC_ASPECT` and `RESULT_CARD_MEDIA` are identifiers and contain
    // no bracket, so this cannot fire on the imports — only on a hand-written Tailwind arbitrary value.
    expect(
      src,
      "the preview writes its own arbitrary aspect class. Import the constant instead (D-170) — a second " +
        "spelling of a value that already has one is what Δ8 removed.",
    ).not.toMatch(/aspect-\[/);

    expect(src, "a hard-coded hero ratio").not.toMatch(/\b16\s*\/\s*9\b/);
    expect(src, "a hard-coded card ratio").not.toMatch(/\b4\s*\/\s*3\b/);

    // The Radix primitive is the thing that forces the parse AND the client boundary. Its absence is
    // what makes case (3) below possible at all, so it is asserted here rather than left implicit.
    expect(
      src,
      "the preview reached for the ratio primitive, which carries the client directive and would forfeit " +
        "the server-safety this component's whole shape is built around",
    ).not.toMatch(/AspectRatio/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// (3) SERVER-SAFETY — T-16-21, over the AST, with the detector proved in both directions
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

describe("CROP-02 (3) — the preview is a Server Component", () => {
  it("has no `use client` directive prologue", () => {
    expect(
      hasUseClientPrologue(COMPONENT_PATH, componentSource()),
      "the preview was marked `use client`. It renders one URL into two boxes and holds no state; a " +
        "directive here would drag the block across the boundary for nothing and would mean the ratio " +
        "primitive had crept back in.",
    ).toBe(false);
  });

  it("uses no React state or effect hook", () => {
    // The cheap half of the same claim, and it is a text scan on purpose: a hook is an identifier, not a
    // string a header would ever need to quote, so the grep-versus-comment collision does not apply.
    expect(componentSource()).not.toMatch(/\buse(State|Effect|Ref|Memo|Callback|Reducer)\s*\(/);
  });

  it("self-test — the detector reads the prologue structurally, in both directions", () => {
    // Without this pair the assertion above could pass by never firing, which is the failure mode an
    // absence-assertion has and a presence-assertion does not.
    const withPrologue = `"use client";\nexport const x = 1;\n`;
    expect(hasUseClientPrologue("probe.tsx", withPrologue)).toBe(true);

    const onlyInAComment = `// This file has no "use client" directive, deliberately.\nexport const x = 1;\n`;
    expect(hasUseClientPrologue("probe.tsx", onlyInAComment)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// (4) REORDER-FOLLOW — the preview tracks photos[0], driven through the KEYBOARD control
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

describe("CROP-02 (4) — promoting a photo re-frames the preview", () => {
  it("swaps both frames to the new cover when the second photo is moved earlier", async () => {
    const first = photo(0);
    const second = photo(1);
    expect(first.url).not.toBe(second.url);

    renderUploader([first, second]);

    const heroImg = () => frameBox(COVER_PREVIEW_HERO_CAPTION).querySelector("img");
    const cardImg = () => frameBox(COVER_PREVIEW_CARD_CAPTION).querySelector("img");

    expect(heroImg()?.getAttribute("src")).toBe(first.url);
    expect(cardImg()?.getAttribute("src")).toBe(first.url);

    // THE KEYBOARD CONTROL, NOT A POINTER DRAG. The grid's drag-and-drop path needs real layout to
    // resolve a drop target and jsdom has none, so a simulated drag here would prove nothing about the
    // reorder and everything about the simulation. `photo-uploader.tsx:155-159`'s `movePhoto` is the
    // same `commitOrder` call the drag path ends in, so this drives the real reorder.
    const moveEarlier = screen.getAllByRole("button", { name: "Move photo earlier" });
    expect(moveEarlier).toHaveLength(2);
    fireEvent.click(moveEarlier[1] as HTMLElement);

    await waitFor(() => {
      expect(heroImg()?.getAttribute("src")).toBe(second.url);
    });
    expect(cardImg()?.getAttribute("src")).toBe(second.url);

    // The optimistic update is the component's; the server call is what makes it durable. Asserted so a
    // future refactor cannot make this test pass by rendering a local array and never persisting.
    expect(reorderMock).toHaveBeenCalledWith("lst_1", [second.id, first.id]);
  });
});
