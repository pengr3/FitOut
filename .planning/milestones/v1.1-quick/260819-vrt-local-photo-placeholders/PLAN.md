---
type: quick
slug: vrt-local-photo-placeholders
created: 2026-08-19
files_modified:
  - public/vrt/
  - scripts/seed-baseline-fixtures.ts
---

# Stop the visual baselines from encoding broken images

## Why

`scripts/seed-baseline-fixtures.ts:197` seeds every listing photo as
`https://example.invalid/vrt-${i}.jpg`. `.invalid` is an RFC 2606 reserved TLD, guaranteed never to
resolve, so a photo can never load. The 27 baselines minted on 2026-08-19 therefore encode
broken-image placeholders wherever a photo belongs: all eight `listing-detail` mosaic tiles, the
`listing-lightbox`'s entire subject, the `checkout` thumbnail, and the `search-results` cards.

Operator verdict on Task 3 Part B item 6 (2026-08-19): **fix**. The reference set now DEFENDS broken
images — anyone who later makes photos render trips the gate, and it reads as a regression rather
than as an improvement. That is the same shape as the D-58 trap this phase already exists to close.

The fixture's determinism requirement is real and must survive: a reference that depends on an
external image host is flaky, and a flaky gate gets retried until green. A committed local asset is
deterministic AND representative, which is why it is the fix rather than a real remote URL.

## Established by measurement — do not re-derive

- `src/components/listing/photo-gallery.tsx:229` renders `<img src={photo.url}>` — a **plain `<img>`,
  not `next/image`**. So a same-origin path needs no `next.config.ts` change, no `remotePatterns`
  entry and no `dangerouslyAllowSVG`.
- Nothing derives a URL from `public_id`; that column is only used by the uploader flow
  (`photo-uploader.tsx`). Repointing `url` alone is sufficient — leave `public_id` as it is.
- `public/` already ships SVG assets (`icon-court.svg`, `icon-grove.svg`), so the pattern exists.
- The exclusive fixture listing has **8** photos; others have 3–4. Index range is 0–7.

## Task 1: commit placeholder assets and repoint the fixture

**Assets.** Add deterministic placeholder images under `public/vrt/`, one per photo index (0–7).
Requirements, in priority order:

1. **Byte-identical rendering in the pinned Playwright container.** Prefer pure geometry — a flat
   background plus simple shapes — over text. Text drags in font resolution; the mint and the
   comparison run in the same pinned image so text would probably be safe, but geometry removes the
   question entirely and costs nothing here.
2. **Visually distinct per index.** The lightbox pages 1/8 → 8/8 and the mosaic shows five tiles at
   once; identical placeholders would make paging invisible in the baseline and would hide a
   wrong-photo bug. Encode the index in something visible (hue, shape count, position).
3. **Reads as a photo placeholder, not as an error.** These become the reference for what these
   surfaces look like. A grey card reads as intentional; a red X reads as broken.
4. Landscape-ish aspect so `object-cover` on the 16/9 plates has something sensible to crop.

**The repoint.** In `scripts/seed-baseline-fixtures.ts`, change the seeded `url` from
`https://example.invalid/vrt-${i}.jpg` to the committed same-origin path. Keep `public_id` unchanged.

**The comments.** The file's header documents the URL choice as part of its determinism argument
(line 11 onward: "every id, coordinate, rate, photo url and window below is a FIXED literal"). Update
the passages that explain WHY the URL was unreachable so they state the new rule instead of
contradicting it: a baselined photo is served from a committed local asset, and a fixture that
reaches for an external host has left the determinism guarantee. Do not delete the reasoning —
rewrite it, the way plan 12-14 Task 1 rewrote `baselines.yml`'s header.

## Verify

- `npx tsx scripts/seed-baseline-fixtures.ts` runs clean against the local Docker Postgres, twice,
  with identical counts — the seed's idempotency must survive.
- Query the seeded rows and confirm every `listing_photo.url` is the new local path and no row still
  carries `example.invalid`.
- Start the app against the seeded DB and confirm `/listings/vrt_listing_exclusive` renders eight
  actual images rather than alt-text boxes. A screenshot or a DOM check of `naturalWidth > 0` on the
  mosaic images is the falsifiable form.
- `npx tsc --noEmit`, `npx vitest run`, `npm run build` all stay green (141 files / 1307 tests,
  0 errors, 12 known lint warnings at HEAD).

## Expected consequence — state it, do not act on it

**Every photo-bearing baseline is invalidated by this change**, which is the point. After this lands,
CI's `gate-visual` will go RED with pixel mismatches on `listing-detail`, `listing-lightbox`,
`checkout`, `search-results` and any other surface showing a photo. That is correct and expected: the
references were minted against broken images and now show real ones.

**Do NOT dispatch the `baselines` workflow.** It is human-gated by design (D-27) and the operator
owns it. Do not add an `updateSnapshots` flag or condition anywhere. Record the expected re-mint as a
follow-up in the SUMMARY; the operator runs it.
