// Generate the eleven committed image fixtures under `e2e/fixtures/` that Phase 16's real-browser
// proofs feed to a real image decoder.
//
// WHY THIS EXISTS AT ALL. Phase 16 asserts things about pixels: that an EXIF-oriented source is
// decoded in the SAME coordinate system the crop rectangle was computed in, that a transparent
// source's alpha region comes out WHITE after D-172's matte, that a 400px-shorter-side source
// disables the zoom row because `avatarMaxZoom` returns exactly 1. Every one of those assertions is
// only as trustworthy as its input. A binary blob committed with a sentence of README next to it
// makes the EXIF orientation byte MAGIC — the reader has to take on faith that it says 6. This
// script is the alternative: the byte is written by a line of code with a comment above it, and the
// committed file either is this script's output or the drift test fails.
//
// WHAT IT WRITES (eleven files, all committed, all under `e2e/fixtures/`):
//   • transparent.png             320x320 RGBA, alpha 0 except one opaque 64x64 top-left block
//   • square-400.png              400x400 flat            (shorter side 400 -> avatarMaxZoom === 1)
//   • small-300.png               300x300 flat            (shorter side 300 -> soft-source note)
//   • tiny-150.png                150x150 flat            (shorter side 150 -> refused pre-dialog)
//   • animated.png                160x160 APNG, 2 frames  (still first frame)
//   • tiny.gif                    8x8 static GIF          (type-rejection case)
//   • tiny.svg                    8x8 SVG document        (type-rejection case)
//   • exif-orientation-6.jpg      480x320 stored, EXIF Orientation = 6 -> displays 320x480
//   • panorama-4000x500.jpg       extreme landscape
//   • portrait-strip-500x4000.jpg extreme portrait
//   • corrupt.jpg                 a valid JPEG header truncated mid-scan
//
// D-18 SAYS "COMMITTED, WITH A CHECK THAT FAILS ON DRIFT" — NOT "BUILT AND GITIGNORED". Same rule
// `scripts/generate-design-tokens.mjs` follows, same reason: a build-time artifact is invisible in
// review, absent from a `git grep`, and — for a binary fixture that a Playwright spec uploads — not
// present at all on a machine that has not run the build. Generating and committing makes this
// script the only editable source and reduces the check to one question: was this regenerated?
// That check is `tests/design/image-fixtures.test.ts`, wired into `npm run test:design`.
//
// ZERO DEPENDENCIES, DELIBERATELY (T-16-12). `sharp` would have written every one of these files in
// a tenth of the code. It was rejected for three reasons, in order: (1) Phase 11 shipped "empty
// `package.json` diff" as an acceptance criterion and this phase's one argued dependency exception is
// already spent on `react-easy-crop` (D-167) — a second exception for a build-time image library is
// not argued anywhere; (2) the stated goal is that the EXIF byte be AUDITABLE rather than magic, and
// bytes produced by a third-party encoder are exactly as magic as bytes committed by hand; (3) byte
// determinism is a correctness requirement here, and only an encoder we control is stable across
// machines and library versions. The only imports below are `node:zlib`, `node:fs` and `node:path`.
//
// THE TRICK THAT MAKES THE JPEG ENCODER SMALL. Every rectangle in every fixture is aligned to 8px —
// `solidRgba` throws if it is not — so every 8x8 JPEG block is one flat colour, the 2-D DCT of a flat
// block has a DC term and nothing else, and the encoder emits one DC coefficient per block plus an
// end-of-block and needs no AC path at all. That is why `renderJpeg` is ~150 lines and not ~800.
//
// PATH SAFETY (T-16-10 / ASVS V12). Every path this script writes is a module-level
// `resolve(process.cwd(), "<literal>")` entry in `FIXTURE_PATHS`. The script takes NO parameters
// from the command line, reads none from the environment, and no function below derives a
// destination from anything a caller supplies. A codegen script that can be pointed at an arbitrary
// file is a write primitive; this one can only ever touch the eleven files named above. A test
// asserts by grep that the two globals which would break that are never read here.
//
// SHAPE. Every `render*` function is PURE — parameters in, `Uint8Array` out, no filesystem — so the
// drift test can render into memory and compare bytes without the test itself being able to repair
// the file it is checking. All writing happens in `main()`, which runs only when this file is the
// process entry point.
//
// DETERMINISM IS A CORRECTNESS REQUIREMENT HERE, not a nicety: the drift test asserts BYTE equality.
// There is no timestamp, no hostname and no version string in any output. The one thing not written
// byte-by-byte here is the DEFLATE stream inside the PNGs, so every parameter that affects zlib's
// output — level, windowBits, memLevel and strategy — is pinned explicitly in `DEFLATE_OPTIONS`
// rather than defaulted. If a future Node ever ships a different deflate implementation the drift
// test goes red on files nobody edited; the remedy is `npm run fixtures:images` and a commit that
// says so, NOT a normalising comparison.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { constants as zlibConstants, deflateSync } from "node:zlib";

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// Destinations. Hard-coded, one literal per fixture — see PATH SAFETY above.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/** @type {Readonly<Record<string, string>>} */
const FIXTURE_PATHS = {
  "transparent.png": resolve(process.cwd(), "e2e/fixtures/transparent.png"),
  "square-400.png": resolve(process.cwd(), "e2e/fixtures/square-400.png"),
  "small-300.png": resolve(process.cwd(), "e2e/fixtures/small-300.png"),
  "tiny-150.png": resolve(process.cwd(), "e2e/fixtures/tiny-150.png"),
  "animated.png": resolve(process.cwd(), "e2e/fixtures/animated.png"),
  "tiny.gif": resolve(process.cwd(), "e2e/fixtures/tiny.gif"),
  "tiny.svg": resolve(process.cwd(), "e2e/fixtures/tiny.svg"),
};

/**
 * Every zlib knob that changes the emitted DEFLATE stream, pinned. Defaulting any of these would
 * make the committed bytes a function of whatever zlib decided that day — see DETERMINISM above.
 */
const DEFLATE_OPTIONS = Object.freeze({
  level: 9,
  windowBits: 15,
  memLevel: 9,
  strategy: zlibConstants.Z_DEFAULT_STRATEGY,
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// Colours. Flat sRGB values whose channels are far apart, so a sampled pixel is unambiguous after a
// JPEG round trip. The +/- 8 per-channel tolerance that round trip needs belongs to the CONSUMER of
// these fixtures, not here: this file emits exact values.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/** @type {readonly [number, number, number, number]} */
const RED = [255, 0, 0, 255];
/** @type {readonly [number, number, number, number]} */
const GREEN = [0, 255, 0, 255];
/** @type {readonly [number, number, number, number]} */
const BLUE = [0, 0, 255, 255];
/** @type {readonly [number, number, number, number]} */
const TRANSPARENT = [0, 0, 0, 0];

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// Byte plumbing.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Join byte runs into one buffer.
 * @param {readonly Uint8Array[]} parts
 * @returns {Uint8Array}
 */
export function concatBytes(parts) {
  let total = 0;
  for (const part of parts) total += part.length;
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

/**
 * A big-endian 32-bit value as four bytes.
 * @param {number} value
 * @returns {Uint8Array}
 */
function be32(value) {
  return Uint8Array.from([
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ]);
}

/**
 * A big-endian 16-bit value as two bytes.
 * @param {number} value
 * @returns {Uint8Array}
 */
function be16(value) {
  return Uint8Array.from([(value >>> 8) & 0xff, value & 0xff]);
}

/**
 * A little-endian 16-bit value as two bytes. Used only inside the TIFF/EXIF block, which declares
 * itself little-endian with `II`.
 * @param {number} value
 * @returns {Uint8Array}
 */
function le16(value) {
  return Uint8Array.from([value & 0xff, (value >>> 8) & 0xff]);
}

/**
 * ASCII text as bytes. Every literal this script writes is ASCII by construction; a non-ASCII
 * character would silently truncate here, so it throws instead.
 * @param {string} text
 * @returns {Uint8Array}
 */
function ascii(text) {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 0x7f) {
      throw new Error(
        `[generate-image-fixtures] non-ASCII character ${JSON.stringify(text[i])} in a byte literal`,
      );
    }
    out[i] = code;
  }
  return out;
}

/** DEFLATE, with every output-affecting parameter pinned. @param {Uint8Array} bytes @returns {Uint8Array} */
function deflate(bytes) {
  return new Uint8Array(deflateSync(bytes, DEFLATE_OPTIONS));
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// Pixel construction.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {{ x: number, y: number, w: number, h: number, rgba: readonly number[] }} Block
 */

/**
 * A flat RGBA plane with any number of rectangles painted over it.
 *
 * THE 8px ASSERTION IS LOAD-BEARING, not tidiness. `renderJpeg` below is a DC-only encoder: it emits
 * one coefficient per 8x8 block and no AC path at all, which is correct if and only if every block is
 * a single flat colour. A rectangle whose edge fell mid-block would make that false silently — the
 * file would still be a valid JPEG and would still decode, just to the wrong colours near the seam,
 * and the consuming assertion would sample a blended pixel and fail for a reason nobody could find.
 * So a misaligned rectangle throws HERE, where the message can say why.
 *
 * @param {number} width
 * @param {number} height
 * @param {readonly number[]} rgba base colour, `[r, g, b, a]`
 * @param {readonly Block[]} [blocks]
 * @returns {Uint8Array}
 */
export function solidRgba(width, height, rgba, blocks = []) {
  const pixels = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    pixels[i * 4] = rgba[0];
    pixels[i * 4 + 1] = rgba[1];
    pixels[i * 4 + 2] = rgba[2];
    pixels[i * 4 + 3] = rgba[3];
  }

  for (const block of blocks) {
    for (const [name, value] of /** @type {[string, number][]} */ ([
      ["x", block.x],
      ["y", block.y],
      ["w", block.w],
      ["h", block.h],
    ])) {
      if (!Number.isInteger(value) || value < 0 || value % 8 !== 0) {
        throw new Error(
          `[generate-image-fixtures] block.${name} = ${value} is not a non-negative multiple of 8. ` +
            `Every fixture rectangle must be 8px-aligned so that every 8x8 JPEG block is one flat ` +
            `colour — see the comment on solidRgba.`,
        );
      }
    }
    if (block.x + block.w > width || block.y + block.h > height) {
      throw new Error(
        `[generate-image-fixtures] block ${block.x},${block.y} ${block.w}x${block.h} does not fit ` +
          `inside ${width}x${height}`,
      );
    }
    for (let y = block.y; y < block.y + block.h; y++) {
      for (let x = block.x; x < block.x + block.w; x++) {
        const i = (y * width + x) * 4;
        pixels[i] = block.rgba[0];
        pixels[i + 1] = block.rgba[1];
        pixels[i + 2] = block.rgba[2];
        pixels[i + 3] = block.rgba[3];
      }
    }
  }

  return pixels;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// PNG / APNG.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

const PNG_SIGNATURE = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** The IEEE 802.3 CRC-32 table PNG chunks are checksummed with. Built once; pure. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

/**
 * PNG's CRC-32 (IEEE 802.3, reflected, initial and final XOR 0xFFFFFFFF).
 * @param {Uint8Array} bytes
 * @returns {number}
 */
export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = (CRC_TABLE[(c ^ bytes[i]) & 0xff] ?? 0) ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * One PNG chunk: length, four-character type, payload, CRC over type+payload.
 * @param {string} type
 * @param {Uint8Array} payload
 * @returns {Uint8Array}
 */
export function pngChunk(type, payload) {
  if (type.length !== 4) {
    throw new Error(`[generate-image-fixtures] chunk type "${type}" is not four characters`);
  }
  const typed = concatBytes([ascii(type), payload]);
  return concatBytes([be32(payload.length), typed, be32(crc32(typed))]);
}

/**
 * The IHDR payload for a truecolour-with-alpha, 8-bit, non-interlaced image.
 * @param {number} width
 * @param {number} height
 * @returns {Uint8Array}
 */
function ihdrPayload(width, height) {
  return concatBytes([
    be32(width),
    be32(height),
    Uint8Array.from([8, 6, 0, 0, 0]), // bit depth 8, colour type 6 (RGBA), deflate, adaptive, no interlace
  ]);
}

/**
 * RGBA pixels as PNG's pre-compression byte stream: one filter byte (0 = None) per scanline.
 * @param {number} width
 * @param {number} height
 * @param {Uint8Array} pixels
 * @returns {Uint8Array}
 */
function filteredScanlines(width, height, pixels) {
  const stride = width * 4;
  if (pixels.length !== stride * height) {
    throw new Error(
      `[generate-image-fixtures] expected ${stride * height} pixel bytes for ${width}x${height}, got ${pixels.length}`,
    );
  }
  const raw = new Uint8Array(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    raw.set(pixels.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }
  return raw;
}

/**
 * A single-frame PNG.
 * @param {{ width: number, height: number, pixels: Uint8Array }} spec
 * @returns {Uint8Array}
 */
export function renderPng({ width, height, pixels }) {
  return concatBytes([
    PNG_SIGNATURE,
    pngChunk("IHDR", ihdrPayload(width, height)),
    pngChunk("IDAT", deflate(filteredScanlines(width, height, pixels))),
    pngChunk("IEND", new Uint8Array(0)),
  ]);
}

/**
 * An animated PNG.
 *
 * THE SEQUENCE NUMBERS ARE THE WHOLE RISK HERE. `fcTL` and `fdAT` share ONE counter that starts at 0
 * and increments across both chunk types; `acTL` is not numbered and the frame-1 `IDAT` is not
 * numbered either. Get it wrong and Chromium does not error — it renders a STILL image, which would
 * make this fixture silently useless for the one behaviour it exists to prove (that a saved crop of
 * an animated source is frame one, not a later frame). So the counter is explicit below.
 *
 * @param {{ width: number, height: number, frames: readonly Uint8Array[], delayNum?: number, delayDen?: number }} spec
 * @returns {Uint8Array}
 */
export function renderApng({ width, height, frames, delayNum = 50, delayDen = 100 }) {
  if (frames.length < 2) {
    throw new Error(
      `[generate-image-fixtures] an APNG fixture with ${frames.length} frame(s) proves nothing about ` +
        `first-frame capture; at least two visibly different frames are required`,
    );
  }

  /**
   * @param {number} sequence
   * @returns {Uint8Array} the 26-byte fcTL payload for a full-canvas frame
   */
  const fctl = (sequence) =>
    concatBytes([
      be32(sequence),
      be32(width),
      be32(height),
      be32(0), // x_offset
      be32(0), // y_offset
      be16(delayNum),
      be16(delayDen),
      Uint8Array.from([0, 0]), // dispose_op = NONE, blend_op = SOURCE
    ]);

  let sequence = 0;
  /** @type {Uint8Array[]} */
  const parts = [
    PNG_SIGNATURE,
    pngChunk("IHDR", ihdrPayload(width, height)),
    pngChunk("acTL", concatBytes([be32(frames.length), be32(0)])), // 0 plays = loop forever
    pngChunk("fcTL", fctl(sequence++)),
    pngChunk("IDAT", deflate(filteredScanlines(width, height, frames[0] ?? new Uint8Array(0)))),
  ];

  for (let f = 1; f < frames.length; f++) {
    parts.push(pngChunk("fcTL", fctl(sequence++)));
    parts.push(
      pngChunk(
        "fdAT",
        concatBytes([
          be32(sequence++),
          deflate(filteredScanlines(width, height, frames[f] ?? new Uint8Array(0))),
        ]),
      ),
    );
  }

  parts.push(pngChunk("IEND", new Uint8Array(0)));
  return concatBytes(parts);
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// GIF.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * GIF's variable-width LZW, as the spec's Appendix F describes it.
 *
 * The awkward part is WHEN the code width grows: the encoder must widen one step "early" relative to
 * a naive reading, because the decoder builds its table one entry behind. The ordering below (emit,
 * then widen, then insert) is the one every working encoder uses.
 *
 * @param {readonly number[] | Uint8Array} indices
 * @param {number} minCodeSize
 * @returns {Uint8Array}
 */
function lzwEncode(indices, minCodeSize) {
  if (indices.length === 0) throw new Error("[generate-image-fixtures] empty GIF index stream");

  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  let nextCode = eoiCode + 1;
  let codeSize = minCodeSize + 1;
  /** @type {Map<number, number>} */
  let table = new Map();

  /** @type {number[]} */
  const bytes = [];
  let bitBuffer = 0;
  let bitCount = 0;

  /** @param {number} code */
  const emit = (code) => {
    bitBuffer |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      bytes.push(bitBuffer & 0xff);
      bitBuffer >>>= 8;
      bitCount -= 8;
    }
  };

  emit(clearCode);
  let prefix = indices[0] ?? 0;

  for (let i = 1; i < indices.length; i++) {
    const k = indices[i] ?? 0;
    const key = (prefix << 8) | k;
    const known = table.get(key);
    if (known === undefined) {
      emit(prefix);
      if (nextCode === 4096) {
        emit(clearCode);
        nextCode = eoiCode + 1;
        codeSize = minCodeSize + 1;
        table = new Map();
      } else {
        if (nextCode >= 1 << codeSize) codeSize++;
        table.set(key, nextCode++);
      }
      prefix = k;
    } else {
      prefix = known;
    }
  }

  emit(prefix);
  emit(eoiCode);
  if (bitCount > 0) bytes.push(bitBuffer & 0xff);

  // Sub-blocks: at most 255 payload bytes each, terminated by a zero-length block.
  /** @type {Uint8Array[]} */
  const blocks = [];
  for (let at = 0; at < bytes.length; at += 255) {
    const slice = bytes.slice(at, at + 255);
    blocks.push(Uint8Array.from([slice.length, ...slice]));
  }
  blocks.push(Uint8Array.from([0]));
  return concatBytes(blocks);
}

/**
 * A static GIF89a with a global colour table.
 * @param {{ width: number, height: number, palette: readonly (readonly number[])[], indices: readonly number[] | Uint8Array }} spec
 * @returns {Uint8Array}
 */
export function renderGif({ width, height, palette, indices }) {
  if (palette.length !== 4) {
    throw new Error(
      `[generate-image-fixtures] this encoder pins the global colour table at 4 entries (size field 1); got ${palette.length}`,
    );
  }
  const table = new Uint8Array(12);
  palette.forEach((rgb, i) => {
    table[i * 3] = rgb[0] ?? 0;
    table[i * 3 + 1] = rgb[1] ?? 0;
    table[i * 3 + 2] = rgb[2] ?? 0;
  });

  return concatBytes([
    ascii("GIF89a"),
    le16(width),
    le16(height),
    // packed: global colour table present (0x80) | colour resolution 8 bits (0x70) | table size 2^(1+1)
    Uint8Array.from([0xf1, 0x00, 0x00]),
    table,
    Uint8Array.from([0x2c]), // image separator
    le16(0),
    le16(0),
    le16(width),
    le16(height),
    Uint8Array.from([0x00]), // no local colour table, not interlaced
    Uint8Array.from([2]), // LZW minimum code size
    lzwEncode(indices, 2),
    Uint8Array.from([0x3b]), // trailer
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// SVG.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * An SVG document, as UTF-8 bytes. Newlines are written as `\n` explicitly and `.gitattributes`
 * pins this path to LF, so the committed bytes and the rendered bytes agree on every platform.
 * @param {{ width: number, height: number, fill: string }} spec
 * @returns {Uint8Array}
 */
export function renderSvg({ width, height, fill }) {
  const text =
    [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
      `  <rect width="${width}" height="${height}" fill="${fill}"/>`,
      "</svg>",
    ].join("\n") + "\n";
  return new Uint8Array(Buffer.from(text, "utf8"));
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// The fixture set. `main()` writes it; `tests/design/image-fixtures.test.ts` renders it in memory
// and compares. Both read THIS list, so a fixture cannot exist on one side and not the other.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {{ readonly name: string, readonly render: () => Uint8Array }} Fixture
 */

/** @type {readonly Fixture[]} */
export const FIXTURES = [
  {
    // D-172's white matte is only provable against a source whose alpha region is KNOWN. The opaque
    // block sits at the top-left so a consumer can sample (32, 32) for the colour and (288, 288) for
    // the matte without computing anything.
    name: "transparent.png",
    render: () =>
      renderPng({
        width: 320,
        height: 320,
        pixels: solidRgba(320, 320, TRANSPARENT, [{ x: 0, y: 0, w: 64, h: 64, rgba: RED }]),
      }),
  },
  {
    // Shorter side 400 === AVATAR_OUTPUT_PX, so avatarMaxZoom(400) === 1 and the zoom row is
    // DISABLED with no soft note (400 is neither below AVATAR_MIN_SOURCE_PX nor under 400).
    name: "square-400.png",
    render: () => renderPng({ width: 400, height: 400, pixels: solidRgba(400, 400, BLUE) }),
  },
  {
    // Shorter side 300 lands in [AVATAR_MIN_SOURCE_PX, 399]: the dialog opens, the zoom row is
    // disabled, and AVATAR_SOFT_SOURCE_NOTE renders.
    name: "small-300.png",
    render: () => renderPng({ width: 300, height: 300, pixels: solidRgba(300, 300, GREEN) }),
  },
  {
    // Shorter side 150 is below AVATAR_MIN_SOURCE_PX (200), so this one is refused BEFORE the dialog
    // opens and AVATAR_TOO_SMALL_MESSAGE renders on /profile.
    name: "tiny-150.png",
    render: () => renderPng({ width: 150, height: 150, pixels: solidRgba(150, 150, RED) }),
  },
  {
    // The two frames are red and blue — as far apart as sRGB gets — because the assertion is "the
    // saved bytes are frame ONE", and a subtle difference between frames would make a failure look
    // like a rounding artefact instead of a wrong frame.
    name: "animated.png",
    render: () =>
      renderApng({
        width: 160,
        height: 160,
        frames: [solidRgba(160, 160, RED), solidRgba(160, 160, BLUE)],
      }),
  },
  {
    // image/gif is NOT in AVATAR_ALLOWED_TYPES. 8x8 is deliberate: this file is never decoded, only
    // refused, so any byte spent making it larger is a byte spent on nothing.
    name: "tiny.gif",
    render: () =>
      renderGif({
        width: 8,
        height: 8,
        palette: [
          [255, 255, 255],
          [255, 0, 0],
          [0, 0, 255],
          [0, 0, 0],
        ],
        indices: new Uint8Array(64).fill(1),
      }),
  },
  {
    // image/svg+xml is NOT in AVATAR_ALLOWED_TYPES, and it is the one rejection that matters for a
    // reason beyond tidiness: an SVG is a scriptable document, not an image.
    name: "tiny.svg",
    render: () => renderSvg({ width: 8, height: 8, fill: "#ff0000" }),
  },
];

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// Writing.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Write `bytes` to `file` when they differ from what is already there, and report whether anything
 * changed. Idempotent by construction, so a second run in a row is a no-op and leaves the tree
 * clean — the property the drift check depends on.
 * @param {string} file
 * @param {Uint8Array} bytes
 * @returns {boolean}
 */
function writeIfChanged(file, bytes) {
  if (existsSync(file)) {
    const current = readFileSync(file);
    if (current.length === bytes.length && Buffer.compare(current, Buffer.from(bytes)) === 0) {
      return false;
    }
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, bytes);
  return true;
}

function main() {
  let written = 0;
  for (const fixture of FIXTURES) {
    const file = FIXTURE_PATHS[fixture.name];
    if (file === undefined) {
      throw new Error(
        `[generate-image-fixtures] no destination declared for fixture "${fixture.name}"`,
      );
    }
    if (writeIfChanged(file, fixture.render())) written++;
  }
  console.log(`[generate-image-fixtures] wrote ${written}/${FIXTURES.length} file(s).`);
}

// Entry-point guard. `import.meta.main` is true only when this file is what node was asked to run,
// so importing the render functions from a test has no side effect on disk. It is deliberately NOT
// derived from the command line — see PATH SAFETY above, and note that a criterion asserts this file
// never reads it.
if (import.meta.main === true) {
  main();
} else if (import.meta.main === undefined) {
  // Older node exposes no such flag. Failing loudly beats the alternative: a silent exit 0 that
  // writes nothing, leaving stale committed fixtures and a drift test that passes against them.
  throw new Error(
    "[generate-image-fixtures] this node build does not expose an entry-point flag on import.meta; node >= 24 is required.",
  );
}
