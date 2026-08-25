# `e2e/fixtures/` — the image inputs Phase 16's real-browser proofs feed to a real decoder

Eleven images. Every one of them is **generated**, not collected: `scripts/generate-image-fixtures.mjs`
writes all eleven, and `tests/design/image-fixtures.test.ts` fails if the committed bytes and the
generator disagree. Nothing here was downloaded, photographed, or exported from a tool.

This directory is the first place in the repository where a binary file is an **input** to a spec
rather than an output of one. The VRT baselines under `e2e/visual/**-snapshots/` are outputs, and are
policed in the opposite direction by `tests/design/gitignore-baselines.test.ts`.

## The eleven

| File | Stored size | What it is | Which assertion consumes it |
|---|---|---|---|
| `exif-orientation-6.jpg` | 480×320 | Landscape raster, **EXIF Orientation = 6**, one 64×64 pure-red block at the stored top-left, white elsewhere. Displays as **320×480 portrait** with the red block in the **TOP-RIGHT**. | **The phase's named acceptance criterion.** Plan 16-14 Task 2: `img.naturalWidth === mediaSize.naturalWidth` on the cropper's own `<img>`, and the preview-vs-stored-bytes equality proof — the saved crop must put the corner block where the *corrected* orientation puts it, not where the raw raster would. |
| `transparent.png` | 320×320 | RGBA. Alpha 0 everywhere except one opaque 64×64 pure-red block at the top-left. | Plan 16-14 Task 2, the **white-matte** proof (D-172): the produced JPEG's transparent region must decode to white, and the stage must have *shown* that white before the user confirmed (IC-02 / D-177). |
| `animated.png` | 160×160 | **APNG**, two frames — frame 1 pure red, frame 2 pure blue, 0.5 s apart, looping. | Plan 16-14 Task 2, the **still first frame** assertion: the produced Blob's sampled pixel must match frame ONE's colour. |
| `panorama-4000x500.jpg` | 4000×500 | Flat white with a 64×64 pure-red block at the left edge and a 64×64 pure-blue block at the right edge. Shorter side 500 → `avatarMaxZoom` = 1.25. | Plan 16-13: pans one axis, pinned on the other. |
| `portrait-strip-500x4000.jpg` | 500×4000 | The same with the axes swapped — red at the top edge, blue at the bottom. | Plan 16-13: the same bound, the other axis. |
| `square-400.png` | 400×400 | Flat pure blue. Shorter side 400 → `avatarMaxZoom` = **exactly 1**. | Plan 16-13: the zoom row renders **DISABLED**, and **no** soft-source note (400 is neither below `AVATAR_MIN_SOURCE_PX` nor under 400). Also 16-13's "the stage exists" reach. |
| `small-300.png` | 300×300 | Flat pure green. Shorter side 300 → inside `[200, 399]`. | Plan 16-13: the dialog opens, the zoom row is disabled, **and** `AVATAR_SOFT_SOURCE_NOTE` renders (D-173's soft floor). |
| `tiny-150.png` | 150×150 | Flat pure red. Shorter side 150 → below `AVATAR_MIN_SOURCE_PX` (200). | Plan 16-13: refused **before** the dialog opens; `AVATAR_TOO_SMALL_MESSAGE` renders on `/profile`. |
| `corrupt.jpg` | declares 64×64 | A real SOI, a real all-ones DQT and a real baseline SOF0, cut off **inside the DHT segment**. A plausible JPEG by extension and by header; undecodable in fact. | Plan 16-13: `<img>` fires `onerror` → `AVATAR_UNREADABLE_MESSAGE`. |
| `tiny.gif` | 8×8 | A static GIF89a. `image/gif` is not in `AVATAR_ALLOWED_TYPES`. | Plan 16-13: rejected by the narrowed accept/type guard → `AVATAR_WRONG_TYPE_MESSAGE`. |
| `tiny.svg` | 8×8 | An SVG document. Not in `AVATAR_ALLOWED_TYPES`, and the one rejection that matters beyond tidiness — an SVG is a scriptable document, not an image. | Plan 16-13: rejected by the narrowed accept/type guard → `AVATAR_WRONG_TYPE_MESSAGE`. |

### Colour policy, and whose job the tolerance is

Every colour here is a flat sRGB value with its channels far apart — pure red, pure green, pure blue,
pure white — so a sampled pixel is unambiguous after a JPEG round trip.

**The generator emits exact values. The tolerance belongs to the CONSUMER.** A JPEG round trip goes
through YCbCr with integer rounding at both ends, so pure red `(255, 0, 0)` comes back as `(254, 0, 0)`
and pure blue `(0, 0, 255)` as `(1, 0, 254)`. Assert with a per-channel tolerance of **±8**. Do not
"fix" a fixture because a sample came back one off.

### The orientation corner, stated once so nobody re-derives it

EXIF Orientation **6** means: the 0th row of the stored raster is the visual **right-hand side**, and
the 0th column is the visual **top**. Equivalently — to display the image, rotate the stored raster 90°
**clockwise**. A 90° clockwise rotation carries a top-left corner to the **top-right** one.

So `exif-orientation-6.jpg`, whose red block is at the stored raster's top-left:

- honoured → **320×480 portrait**, red block **top-right**
- ignored → **480×320 landscape**, red block **top-left**

Those differ in both aspect *and* corner, which is what makes the fixture unmistakable.

This corner is **measured, not reasoned**. Loading the committed file in Chromium reports
`naturalWidth` 320 / `naturalHeight` 480 with pure red at `(319, 32)` and white at `(32, 32)`,
`(32, 479)` and `(319, 479)`; a second, independent decoder renders the same picture. `16-04-PLAN.md`
predicted bottom-left; two decoders disagreed and the decoders are the authority.

## Provenance

**Every byte in this directory is produced by `scripts/generate-image-fixtures.mjs`.**

- Regenerate: `npm run fixtures:images`
- The gate: `tests/design/image-fixtures.test.ts`, which re-renders all eleven **in memory** and
  compares bytes to what is committed. It runs inside `npm run test:design`, which
  `package.json` wires into `build`.

**Do not edit a file in this directory.** Not with an image editor, not by re-saving it, not by
replacing it with something that looks similar. The whole point of generating them is that the EXIF
orientation byte is auditable — a line of code with a paragraph above it — instead of magic. A
hand-edited fixture makes the generator a decoration, and a binary diff in review shows only
`Bin 4890 -> 5133 bytes`. If a fixture is wrong, fix the generator.

The generator adds **zero npm dependencies**. `sharp` would have been a tenth of the code and was
rejected deliberately: Phase 11 shipped "empty `package.json` diff" as an acceptance criterion, this
phase's one argued dependency exception is already spent on `react-easy-crop` (D-167), and bytes
produced by a third-party encoder are exactly as magic as bytes committed by hand.

`.gitattributes` pins `e2e/fixtures/*.{png,jpg,gif}` to `binary` and `*.svg` to `eol=lf`. That is
load-bearing rather than tidy: under the repository's `* text=auto` rule, an LF→CRLF normalisation
inside a DEFLATE stream or an entropy-coded scan does not produce odd line endings, it produces a
corrupt image.

## Substitutions

**One, recorded rather than absorbed.**

`16-VALIDATION.md`'s fixture list names **`e2e/fixtures/animated.webp`**. This directory ships
**`e2e/fixtures/animated.png`** — an APNG — instead.

> An ANIMATED WebP cannot be produced without a VP8L encoder, which is far larger than everything else
> in the generator combined, and no installed tool emits one. The behaviour under test is *"an animated
> source in the allow-list presents its still first frame"*. **APNG** satisfies it exactly: its MIME
> type is `image/png`, which is inside `AVATAR_ALLOWED_TYPES`; browsers animate it in an `<img>`; and
> `drawImage(HTMLImageElement)` draws the currently-presented frame, which at load is frame one.
>
> **If the PM wants a real animated WebP, that is a `devDependency` decision, not an executor's.**

Verified in Chromium on 16-04: `animated.png` presents frame one (pure red) at load, and genuinely
animates — two distinct rendered frames observed over 3.6 s.

## Deviations from `16-04-PLAN.md`, recorded here because they change what a consumer should assert

1. **`corrupt.jpg` is cut inside DHT, not mid-scan.** The plan asked for a scan truncation. Measured in
   Chromium at five depths (keeping 90 / 60 / 40 / 20 / 5 % of the entropy-coded scan), **every one
   fired `load`, not `error`; `img.decode()` resolved; `naturalWidth` read 64.** Chromium treats a
   short scan as a partially-received image. Cutting inside the Huffman-table segment fires `error`,
   `decode()` throws, and `naturalWidth` reads 0 — the behaviour `AVATAR_UNREADABLE_MESSAGE` needs.
   The file still opens `FFD8` and still declares a real DQT and a real 64×64 SOF0, so it is still a
   plausible JPEG that reaches the decode path rather than being turned away by the type guard.
2. **The orientation corner is top-right, not bottom-left** — see above.
3. **The two panorama fixtures carry markers at BOTH ends**, in different colours, rather than one at
   the near edge. With a single marker and a flat body, a consumer can see that the marker left the
   viewport but not which end it panned to, which is what "pans one axis" needs to distinguish.
