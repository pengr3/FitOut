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
//   • animated.png                320x320 APNG, 2 frames  (still first frame; 320 clears the
//                                 AVATAR_MIN_SOURCE_PX floor, so it reaches the crop stage at all)
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
  "exif-orientation-6.jpg": resolve(process.cwd(), "e2e/fixtures/exif-orientation-6.jpg"),
  "panorama-4000x500.jpg": resolve(process.cwd(), "e2e/fixtures/panorama-4000x500.jpg"),
  "portrait-strip-500x4000.jpg": resolve(
    process.cwd(),
    "e2e/fixtures/portrait-strip-500x4000.jpg",
  ),
  "corrupt.jpg": resolve(process.cwd(), "e2e/fixtures/corrupt.jpg"),
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
const WHITE = [255, 255, 255, 255];
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
 * A little-endian 32-bit value as four bytes. Used only inside the TIFF/EXIF block.
 * @param {number} value
 * @returns {Uint8Array}
 */
function le32(value) {
  return Uint8Array.from([
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ]);
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
// JPEG.
//
// WHY THIS IS ~150 LINES AND NOT ~800 — the correctness argument, stated before the code so it can
// be checked rather than believed. `solidRgba` refuses any rectangle that is not 8px-aligned, so
// every 8x8 block of every fixture is a SINGLE FLAT COLOUR. The 2-D DCT of a flat block has a DC
// term and nothing else: every one of the 63 AC coefficients is exactly zero. So this encoder emits,
// per block, one DC coefficient and one end-of-block symbol, and needs no AC coefficient path, no
// zigzag scan, and no DCT at all — for a flat block of value v (after the -128 level shift) the DC
// coefficient is exactly 8v by the definition of the transform.
//
// `renderJpeg` VERIFIES that premise rather than assuming it: it reads all 64 samples of every block
// and throws if they are not identical. A rectangle that slipped past the alignment check would
// otherwise produce a perfectly valid JPEG that decodes to the WRONG colours near the seam, and the
// consuming assertion would sample a blended pixel and fail for a reason nobody could find.
//
// Baseline (SOF0), 4:4:4 (no chroma subsampling), one all-ones quantization table shared by all three
// components. All-ones is legal and it makes DC quantization exact, so the decoded colour is a pure
// function of the input rather than a function of a quality setting.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The four standard Huffman tables of ITU-T T.81 Annex K, verbatim (Tables K.3 - K.6). `bits[i]` is
 * the number of codes of length `i + 1`; `values` are the symbols in canonical order.
 *
 * These are transcribed by hand, so `assertHuffmanTable` below checks the one property that catches
 * a typo: the code lengths must account for exactly as many symbols as there are values. A table
 * that failed that would still produce a file, just an undecodable one.
 *
 * @type {Readonly<Record<string, { tc: number, th: number, bits: readonly number[], values: readonly number[] }>>}
 */
const HUFFMAN_TABLES = {
  dcLuma: {
    tc: 0,
    th: 0,
    bits: [0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
    values: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  },
  acLuma: {
    tc: 1,
    th: 0,
    bits: [0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 0x7d],
    values: [
      0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06, 0x13, 0x51, 0x61,
      0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08, 0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52,
      0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72, 0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25,
      0x26, 0x27, 0x28, 0x29, 0x2a, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45,
      0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5a, 0x63, 0x64,
      0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x83,
      0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99,
      0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6,
      0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3,
      0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8,
      0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa,
    ],
  },
  dcChroma: {
    tc: 0,
    th: 1,
    bits: [0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
    values: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  },
  acChroma: {
    tc: 1,
    th: 1,
    bits: [0, 2, 1, 2, 4, 4, 3, 4, 7, 5, 4, 4, 0, 1, 2, 0x77],
    values: [
      0x00, 0x01, 0x02, 0x03, 0x11, 0x04, 0x05, 0x21, 0x31, 0x06, 0x12, 0x41, 0x51, 0x07, 0x61,
      0x71, 0x13, 0x22, 0x32, 0x81, 0x08, 0x14, 0x42, 0x91, 0xa1, 0xb1, 0xc1, 0x09, 0x23, 0x33,
      0x52, 0xf0, 0x15, 0x62, 0x72, 0xd1, 0x0a, 0x16, 0x24, 0x34, 0xe1, 0x25, 0xf1, 0x17, 0x18,
      0x19, 0x1a, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44,
      0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5a, 0x63,
      0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a,
      0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97,
      0x98, 0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4,
      0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9, 0xca,
      0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe2, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7,
      0xe8, 0xe9, 0xea, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa,
    ],
  },
};

for (const [name, table] of Object.entries(HUFFMAN_TABLES)) {
  const declared = table.bits.reduce((sum, n) => sum + n, 0);
  if (table.bits.length !== 16 || declared !== table.values.length) {
    throw new Error(
      `[generate-image-fixtures] Annex-K table "${name}" is mis-transcribed: ${table.bits.length} ` +
        `length buckets declaring ${declared} codes for ${table.values.length} symbols`,
    );
  }
}

/**
 * @typedef {{ readonly code: number, readonly length: number }} HuffmanCode
 */

/**
 * Canonical Huffman codes from a BITS/HUFFVAL pair, as T.81 Annex C generates them.
 * @param {{ bits: readonly number[], values: readonly number[] }} table
 * @returns {Map<number, HuffmanCode>}
 */
function huffmanCodes(table) {
  /** @type {Map<number, HuffmanCode>} */
  const codes = new Map();
  let code = 0;
  let k = 0;
  for (let length = 1; length <= 16; length++) {
    for (let i = 0; i < (table.bits[length - 1] ?? 0); i++) {
      codes.set(table.values[k++] ?? 0, { code, length });
      code++;
    }
    code <<= 1;
  }
  return codes;
}

const HUFFMAN_CODES = {
  dcLuma: huffmanCodes(HUFFMAN_TABLES.dcLuma),
  acLuma: huffmanCodes(HUFFMAN_TABLES.acLuma),
  dcChroma: huffmanCodes(HUFFMAN_TABLES.dcChroma),
  acChroma: huffmanCodes(HUFFMAN_TABLES.acChroma),
};

/** @param {number} value @returns {number} */
function clamp8(value) {
  return value < 0 ? 0 : value > 255 ? 255 : value;
}

/**
 * BT.601 full-range RGB -> YCbCr, the conversion baseline JFIF declares.
 * @param {number} r @param {number} g @param {number} b
 * @returns {[number, number, number]}
 */
function ycbcr(r, g, b) {
  return [
    clamp8(Math.round(0.299 * r + 0.587 * g + 0.114 * b)),
    clamp8(Math.round(-0.168736 * r - 0.331264 * g + 0.5 * b + 128)),
    clamp8(Math.round(0.5 * r - 0.418688 * g - 0.081312 * b + 128)),
  ];
}

/**
 * The number of magnitude bits a DC difference needs — T.81's SSSS category.
 * @param {number} diff
 * @returns {number}
 */
function magnitudeCategory(diff) {
  let magnitude = Math.abs(diff);
  let category = 0;
  while (magnitude > 0) {
    category++;
    magnitude >>= 1;
  }
  return category;
}

/**
 * An APP1 segment carrying a TIFF IFD whose only entry is EXIF Orientation.
 *
 * WHAT ORIENTATION = 6 MEANS, because this paragraph is the entire reason the fixture is
 * unmistakable. T.81/EXIF value 6 says: THE 0TH ROW OF THE STORED RASTER IS THE VISUAL RIGHT-HAND
 * SIDE, AND THE 0TH COLUMN IS THE VISUAL TOP. Equivalently: to obtain the intended view, rotate the
 * stored raster 90 degrees CLOCKWISE. So a 480x320 stored image DISPLAYS as 320x480 portrait, and
 * the block this generator writes at the stored raster's TOP-LEFT appears in the displayed frame's
 * TOP-RIGHT — a 90-degree clockwise rotation carries a top-left corner to the top-right one. A
 * decoder that ignores the tag renders it 480x320 landscape with the block still top-left, which
 * differs in BOTH aspect and corner. There is no way to pass the consuming assertion by accident.
 *
 * THAT CORNER IS MEASURED, NOT REASONED. Loading this fixture in Chromium 16-04 reports
 * `naturalWidth` 320, `naturalHeight` 480, and a canvas sample of the decoded image finds pure red
 * at (319, 32) and white at (32, 32) / (32, 479) / (319, 479). The `<img>` element applies EXIF
 * orientation by default (`image-orientation: from-image` is the CSS initial value), which is the
 * same reason §B6 can reuse the cropper's own `<img>` and get an oriented-space rectangle for free.
 * 16-04-PLAN's acceptance criterion predicted BOTTOM-LEFT; the browser disagreed and the browser is
 * the authority here. Downstream assertions must read TOP-RIGHT.
 *
 * @param {number} orientation 1-8; this phase only ever writes 6
 * @returns {Uint8Array}
 */
export function exifOrientationApp1(orientation) {
  if (!Number.isInteger(orientation) || orientation < 1 || orientation > 8) {
    throw new Error(`[generate-image-fixtures] EXIF orientation ${orientation} is not in 1..8`);
  }
  const payload = concatBytes([
    ascii("Exif"),
    Uint8Array.from([0, 0]),
    // TIFF header: "II" = little-endian, 42 = the magic, then the offset of IFD0 from the "II".
    ascii("II"),
    le16(42),
    le32(8),
    // IFD0: one entry.
    le16(1),
    le16(0x0112), // tag: Orientation
    le16(3), // type: SHORT
    le32(1), // count
    // A SHORT value fits in the 4-byte value field and is stored LEFT-JUSTIFIED there.
    le16(orientation),
    le16(0),
    le32(0), // no next IFD
  ]);
  return concatBytes([Uint8Array.from([0xff, 0xe1]), be16(payload.length + 2), payload]);
}

/**
 * A baseline, 4:4:4, DC-only JPEG. See the section comment above for why that is sufficient.
 *
 * `pixels` is the RGBA plane `solidRgba` produces. Alpha is not representable in JPEG, so a
 * non-opaque input is rejected rather than silently flattened — flattening is D-172's job, at
 * upload time, and a fixture that did it here would prove the matte against itself.
 *
 * @param {{ width: number, height: number, pixels: Uint8Array, orientation?: number }} spec
 * @returns {Uint8Array}
 */
export function renderJpeg({ width, height, pixels, orientation }) {
  const blocksX = Math.ceil(width / 8);
  const blocksY = Math.ceil(height / 8);

  /**
   * The flat colour of one 8x8 block, with edge clamping for the partial blocks a dimension that is
   * not a multiple of 8 leaves at the right and bottom edges. Throws if the block is not flat.
   * @param {number} bx @param {number} by
   * @returns {[number, number, number]}
   */
  const blockColour = (bx, by) => {
    /** @param {number} x @param {number} y @returns {[number, number, number, number]} */
    const at = (x, y) => {
      const i = (Math.min(y, height - 1) * width + Math.min(x, width - 1)) * 4;
      return [pixels[i] ?? 0, pixels[i + 1] ?? 0, pixels[i + 2] ?? 0, pixels[i + 3] ?? 0];
    };
    const first = at(bx * 8, by * 8);
    for (let y = by * 8; y < by * 8 + 8; y++) {
      for (let x = bx * 8; x < bx * 8 + 8; x++) {
        const p = at(x, y);
        if (p[3] !== 255) {
          throw new Error(
            `[generate-image-fixtures] pixel ${x},${y} has alpha ${p[3]}; JPEG cannot carry alpha, ` +
              `so a non-opaque source is a mistake rather than something to flatten here`,
          );
        }
        if (p[0] !== first[0] || p[1] !== first[1] || p[2] !== first[2]) {
          throw new Error(
            `[generate-image-fixtures] block ${bx},${by} is not flat (${first.slice(0, 3)} at its ` +
              `corner, ${p.slice(0, 3)} at ${x},${y}). This encoder is DC-only and is only correct ` +
              `for flat blocks — see the section comment on renderJpeg.`,
          );
        }
      }
    }
    return [first[0], first[1], first[2]];
  };

  // ── entropy-coded scan ──────────────────────────────────────────────────────────────────────────
  /** @type {number[]} */
  const scan = [];
  let accumulator = 0;
  let accumulated = 0;

  /** @param {number} value @param {number} length */
  const putBits = (value, length) => {
    for (let i = length - 1; i >= 0; i--) {
      accumulator = (accumulator << 1) | ((value >> i) & 1);
      accumulated++;
      if (accumulated === 8) {
        const byte = accumulator & 0xff;
        scan.push(byte);
        // Byte stuffing: a 0xFF in the entropy stream is followed by 0x00 so it cannot be mistaken
        // for a marker.
        if (byte === 0xff) scan.push(0x00);
        accumulator = 0;
        accumulated = 0;
      }
    }
  };

  /** @param {Map<number, HuffmanCode>} table @param {number} symbol */
  const putSymbol = (table, symbol) => {
    const entry = table.get(symbol);
    if (entry === undefined) {
      throw new Error(`[generate-image-fixtures] symbol ${symbol} is absent from its Huffman table`);
    }
    putBits(entry.code, entry.length);
  };

  /**
   * One block: the DC difference from the previous block of the SAME component, then end-of-block.
   * @param {number} sample the component's flat 0..255 value for this block
   * @param {number} previousDc
   * @param {Map<number, HuffmanCode>} dc
   * @param {Map<number, HuffmanCode>} ac
   * @returns {number} this block's DC coefficient, to carry into the next block
   */
  const putBlock = (sample, previousDc, dc, ac) => {
    // The DCT of a flat block: S(0,0) = 8 * (sample - 128), and the all-ones quantization table
    // leaves it untouched.
    const coefficient = 8 * (sample - 128);
    const diff = coefficient - previousDc;
    const category = magnitudeCategory(diff);
    putSymbol(dc, category);
    if (category > 0) {
      putBits(diff > 0 ? diff : diff + (1 << category) - 1, category);
    }
    putSymbol(ac, 0x00); // EOB — all 63 AC coefficients are zero
    return coefficient;
  };

  let dcY = 0;
  let dcCb = 0;
  let dcCr = 0;
  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      const [r, g, b] = blockColour(bx, by);
      const [y, cb, cr] = ycbcr(r, g, b);
      dcY = putBlock(y, dcY, HUFFMAN_CODES.dcLuma, HUFFMAN_CODES.acLuma);
      dcCb = putBlock(cb, dcCb, HUFFMAN_CODES.dcChroma, HUFFMAN_CODES.acChroma);
      dcCr = putBlock(cr, dcCr, HUFFMAN_CODES.dcChroma, HUFFMAN_CODES.acChroma);
    }
  }
  if (accumulated > 0) putBits((1 << (8 - accumulated)) - 1, 8 - accumulated); // pad with 1 bits

  // ── segments ────────────────────────────────────────────────────────────────────────────────────
  const dqt = concatBytes([
    Uint8Array.from([0xff, 0xdb]),
    be16(2 + 1 + 64),
    Uint8Array.from([0x00]), // 8-bit precision, table id 0
    new Uint8Array(64).fill(1), // all ones: DC quantization is the identity
  ]);

  const sof0 = concatBytes([
    Uint8Array.from([0xff, 0xc0]),
    be16(8 + 3 * 3),
    Uint8Array.from([8]), // sample precision
    be16(height),
    be16(width),
    Uint8Array.from([3]), // three components
    Uint8Array.from([1, 0x11, 0]), // Y,  1x1 sampling, quant table 0
    Uint8Array.from([2, 0x11, 0]), // Cb, 1x1 sampling, quant table 0
    Uint8Array.from([3, 0x11, 0]), // Cr, 1x1 sampling, quant table 0
  ]);

  /** @type {Uint8Array[]} */
  const dhtBodies = [];
  for (const table of Object.values(HUFFMAN_TABLES)) {
    dhtBodies.push(
      concatBytes([
        Uint8Array.from([(table.tc << 4) | table.th]),
        Uint8Array.from(table.bits),
        Uint8Array.from(table.values),
      ]),
    );
  }
  const dhtBody = concatBytes(dhtBodies);
  const dht = concatBytes([Uint8Array.from([0xff, 0xc4]), be16(2 + dhtBody.length), dhtBody]);

  const sos = concatBytes([
    Uint8Array.from([0xff, 0xda]),
    be16(6 + 2 * 3),
    Uint8Array.from([3]),
    Uint8Array.from([1, 0x00]), // Y  -> DC table 0, AC table 0
    Uint8Array.from([2, 0x11]), // Cb -> DC table 1, AC table 1
    Uint8Array.from([3, 0x11]), // Cr -> DC table 1, AC table 1
    Uint8Array.from([0, 63, 0]), // Ss, Se, Ah/Al — baseline sequential
  ]);

  return concatBytes([
    Uint8Array.from([0xff, 0xd8]), // SOI
    ...(orientation === undefined ? [] : [exifOrientationApp1(orientation)]),
    dqt,
    sof0,
    dht,
    sos,
    Uint8Array.from(scan),
    Uint8Array.from([0xff, 0xd9]), // EOI
  ]);
}

/**
 * Cut a valid JPEG off inside its Huffman-table segment, keeping SOI, DQT and SOF0 intact plus
 * `keepRatio` of the DHT payload.
 *
 * WHY NOT MID-SCAN, WHICH IS WHAT 16-04-PLAN ASKED FOR. Measured in Chromium on 16-04, cutting the
 * ENTROPY-CODED SCAN does not make the file unreadable at all. Every depth probed — keeping 90%,
 * 60%, 40%, 20% and 5% of the scan — produced the same result: `<img>` fired **load**, not error;
 * `img.decode()` RESOLVED; `naturalWidth`/`naturalHeight` read 64x64. Chromium treats a short scan
 * as a partially-received image and renders what it got. A fixture built that way would have handed
 * plans 16-12/13/14 an input that provably cannot exercise the `onerror` branch it exists for, and
 * the failure would have surfaced two plans later where the cheapest repair is to weaken the
 * assertion.
 *
 * Cutting inside DHT was probed in the same run and behaves as the fixture needs: `<img>` fired
 * **error**, `img.decode()` THREW, and `naturalWidth` read 0. It also keeps everything the fixture's
 * other half depends on — the file still opens `FFD8`, still declares a real all-ones DQT and a real
 * 64x64 baseline SOF0, and still carries a `.jpg` extension, so it is a plausible JPEG by extension
 * AND by header and reaches the decode path instead of being turned away by the type guard.
 *
 * @param {Uint8Array} bytes
 * @param {number} keepRatio the fraction of the DHT payload to keep; strictly between 0 and 1
 * @returns {Uint8Array}
 */
export function truncate(bytes, keepRatio) {
  if (!(keepRatio > 0 && keepRatio < 1)) {
    throw new Error(`[generate-image-fixtures] keepRatio ${keepRatio} is not strictly in (0, 1)`);
  }

  // Walk the marker chain rather than searching for the FFC4 byte pair, so a payload that happened
  // to contain those two bytes could never be mistaken for the segment header.
  let at = 2; // past SOI
  let dht = -1;
  let dhtLength = 0;
  while (at + 3 < bytes.length) {
    if (bytes[at] !== 0xff) {
      throw new Error(`[generate-image-fixtures] expected a marker at offset ${at}`);
    }
    const marker = bytes[at + 1];
    if (marker === 0xda) break; // SOS: the marker chain ends here
    const length = ((bytes[at + 2] ?? 0) << 8) | (bytes[at + 3] ?? 0);
    if (marker === 0xc4) {
      dht = at;
      dhtLength = length;
      break;
    }
    at += 2 + length;
  }
  if (dht === -1) throw new Error("[generate-image-fixtures] no DHT segment to truncate inside");

  const payloadStart = dht + 4; // past the marker and its length field
  let end = payloadStart + Math.floor((dhtLength - 2) * keepRatio);
  // Never stop on a lone 0xFF: that is a half-written marker rather than a truncated table.
  if (bytes[end - 1] === 0xff) end--;
  const out = bytes.slice(0, end);

  if (out.length <= payloadStart) {
    throw new Error("[generate-image-fixtures] truncation removed the whole DHT, not part of it");
  }
  if (out[0] !== 0xff || out[1] !== 0xd8) {
    throw new Error("[generate-image-fixtures] truncation lost the SOI — the file is not a JPEG");
  }
  if (out[out.length - 2] === 0xff && out[out.length - 1] === 0xd9) {
    throw new Error("[generate-image-fixtures] truncation left an EOI in place — the file is intact");
  }
  return out;
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
    // The two frames are red and blue — as far apart as sRGB gets — because the assertion is about
    // WHICH FRAME the saved bytes came from, and a subtle difference between frames would make a
    // failure look like a rounding artefact instead of a wrong frame.
    //
    // ⚠ 320, NOT 160, AND THE SIZE IS THE WHOLE REASON THIS FIXTURE WORKS. Plan 16-04 emitted it at
    // 160x160; plan 16-14 measured that a 160px source is REFUSED BY GUARD 4 before the crop dialog
    // ever opens — the shorter side is below AVATAR_MIN_SOURCE_PX (200), so `/profile` renders
    // AVATAR_TOO_SMALL_MESSAGE and there is no stage, no confirm and no Blob. The one behaviour this
    // file exists to prove is only reachable through the shipped flow, so the fixture has to clear
    // the floor the shipped flow enforces. 320 also matches `transparent.png`, which keeps the two
    // flatten/still-frame cases on the same geometry.
    name: "animated.png",
    render: () =>
      renderApng({
        width: 320,
        height: 320,
        frames: [solidRgba(320, 320, RED), solidRgba(320, 320, BLUE)],
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
  {
    // THE PHASE'S NAMED ACCEPTANCE CRITERION (16-RESEARCH § B6). Stored 480x320 landscape with
    // Orientation = 6, so a decoder that honours the tag displays 320x480 PORTRAIT and puts the red
    // block in the displayed frame's BOTTOM-LEFT. Both halves are observable, and they disagree in
    // two independent ways (aspect AND corner) with the un-oriented reading.
    name: "exif-orientation-6.jpg",
    render: () =>
      renderJpeg({
        width: 480,
        height: 320,
        orientation: 6,
        pixels: solidRgba(480, 320, WHITE, [{ x: 0, y: 0, w: 64, h: 64, rgba: RED }]),
      }),
  },
  {
    // Shorter side 500 -> avatarMaxZoom(500) = 500/400 = 1.25. Pans the long axis, pinned on the
    // short one. TWO markers, in different colours, at opposite ends: with one marker and a flat
    // body a consumer can see that the marker left the viewport but not WHICH end it panned to,
    // which is exactly the assertion "pans one axis" needs to make.
    name: "panorama-4000x500.jpg",
    render: () =>
      renderJpeg({
        width: 4000,
        height: 500,
        pixels: solidRgba(4000, 500, WHITE, [
          { x: 0, y: 0, w: 64, h: 64, rgba: RED },
          { x: 3936, y: 0, w: 64, h: 64, rgba: BLUE },
        ]),
      }),
  },
  {
    // The same bound with the axes swapped.
    name: "portrait-strip-500x4000.jpg",
    render: () =>
      renderJpeg({
        width: 500,
        height: 4000,
        pixels: solidRgba(500, 4000, WHITE, [
          { x: 0, y: 0, w: 64, h: 64, rgba: RED },
          { x: 0, y: 3936, w: 64, h: 64, rgba: BLUE },
        ]),
      }),
  },
  {
    // A plausible JPEG by extension and by header, undecodable in fact -> `<img>` onerror ->
    // AVATAR_UNREADABLE_MESSAGE. The cut is inside DHT rather than inside the scan, because a
    // short scan measurably does NOT produce onerror in Chromium — see the comment on `truncate`.
    // 64x64 because nothing decodes it: T-16-13 accepts this file precisely because there is no
    // decompression pressure at that size.
    name: "corrupt.jpg",
    render: () =>
      truncate(renderJpeg({ width: 64, height: 64, pixels: solidRgba(64, 64, RED) }), 0.4),
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
  //
  // The cost of throwing at IMPORT time is that `tests/design/image-fixtures.test.ts` — which imports
  // this module — fails at SUITE LOAD on an older node, with a message that reads like a fixture
  // problem. `package.json` therefore declares `"engines": { "node": ">=24.2" }` (IN-01) so npm warns
  // at install time instead. CI already pins `node-version: "24"`, so this only ever bit contributors.
  throw new Error(
    "[generate-image-fixtures] this node build does not expose an entry-point flag on import.meta; node >= 24 is required.",
  );
}
