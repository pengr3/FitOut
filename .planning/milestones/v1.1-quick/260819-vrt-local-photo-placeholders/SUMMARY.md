---
quick_id: 260819-vrt
slug: vrt-local-photo-placeholders
date: 2026-08-19
status: complete
source_gap: "12-14 Task 3 Part B item 6 — operator verdict `fix` (2026-08-19)"
commits:
  - cb34581  # fix(quick-260819-vrt): serve baselined photos from committed local assets
files_modified:
  - scripts/seed-baseline-fixtures.ts
  - public/vrt/photo-0.svg   # new
  - public/vrt/photo-1.svg   # new
  - public/vrt/photo-2.svg   # new
  - public/vrt/photo-3.svg   # new
  - public/vrt/photo-4.svg   # new
  - public/vrt/photo-5.svg   # new
  - public/vrt/photo-6.svg   # new
  - public/vrt/photo-7.svg   # new
follow_ups:
  - "OPERATOR-OWNED: re-mint every photo-bearing baseline via the human-gated `baselines` workflow (D-27). Until then `gate-visual` is RED by design — see 'The expected consequence' below."
---

# Quick Task 260819-vrt — Stop the visual baselines from encoding broken images

## What was wrong

`scripts/seed-baseline-fixtures.ts:197` seeded every listing photo as
`https://example.invalid/vrt-${i}.jpg`.

That URL passes the fixture's own stated determinism property — it is a FIXED literal, identical on
every dispatch — and it is still wrong, because `.invalid` is an RFC 2606 reserved TLD guaranteed
never to resolve. A photo seeded there can never load. So the 27 baselines minted on 2026-08-19
encode the browser's **broken-image glyph** wherever a photograph belongs: all eight `listing-detail`
mosaic tiles, the entire subject of `listing-lightbox`, the `checkout` thumbnail, and the
`search-results` cards.

**Deterministic-and-wrong is the worse of the two failures, because it is green.** That reference set
was stable, reproducible, and defending a defect: the next person to make photos render would have
tripped the gate and read their own improvement as a regression. Same shape as the D-58 trap this
phase exists to close, arriving through the fixture rather than through a surface.

## What changed

### 1. Eight committed placeholder assets — `public/vrt/photo-{0..7}.svg`

1600×900 (16:9), one per photo index. The exclusive fixture listing carries 8 photos and no listing
carries more, so 0–7 is the whole range.

**Pure geometry, no text, no font.** A label would drag glyph rasterisation into a byte comparison —
a reference minted against one font stack and compared against another diffs on the caption rather
than on the surface. The mint and the comparison do run in the same pinned Playwright image, so text
would *probably* have been safe; geometry removes the question at no cost.

**Every colour is a literal.** No `currentColor`, no CSS variable, no design token. The image renders
identically in both themes and cannot silently start tracking a token that later moves. These files
are hand-committed and are **not** generator output — `tests/design/token-drift.test.ts` governs
`icon-court.svg` / `icon-grove.svg` and does not reach here.

**The index is encoded three ways, and all three survive the crop:**

| Encoding | Index 0 → 7 |
|---|---|
| Hue | 18° → 333°, 45° apart, desaturated |
| Sun x position | 500 → 1102, in steps of one sun radius (86) |
| Counter pips (bottom row) | 1 → 8 |

Redundancy is the point: the lightbox pages 1/8 → 8/8 and the mosaic shows five tiles at once, so
eight identical placeholders would make paging invisible in the baseline and would hide a
wrong-photo bug behind a green diff.

**The crop is why the last two live mid-frame rather than in a corner.** Every consumer scales this
16:9 image to fill a narrower box and keeps the *centre*. Measured from the shipped constants:

| Consumer | Box | Visible band of the 1600px width |
|---|---|---|
| Mosaic hero **and** small tiles | ~0.89 w/h (`MOSAIC_ASPECT` 16/9 with the `2fr 1fr 1fr` template) | x ∈ [400, 1200] |
| Search result card | `RESULT_CARD_MEDIA` = `aspect-[4/3]` | x ∈ [200, 1400] |
| Booking row thumbnail | 48px square | x ∈ [350, 1250] |
| Lightbox | `object-contain` | full frame |

The sun and the pip row are placed inside the *tightest* of those bands, so the index stays legible
in a 48px thumbnail and not only in the lightbox. A first draft put the pips at bottom-left (x 96)
and the sun starting at x 260; both would have been cropped away in every mosaic tile, and the file's
own comment claiming the encoding "survives a crop" would have been false. Caught by rendering the
four crops side by side rather than by reasoning about them.

**A muted plate, a horizon and a sun read as an intentional placeholder.** A red X would read as
breakage — and these images become the reference for what these surfaces are *supposed* to look like.

### 2. The repoint — `scripts/seed-baseline-fixtures.ts`

Seeded `url` is now `/vrt/photo-${i}.svg`. Same-origin, so Next serves it out of the very checkout
under test.

**No `next.config.ts` change was needed and none was made.** `next/image` appears nowhere in `src/`
— every photo surface (`photo-gallery.tsx:229`, `photo-lightbox.tsx:353`,
`search-result-card.tsx:253`, `booking-row.tsx:73`) renders a plain `<img>`. So no `remotePatterns`
entry, and no `dangerouslyAllowSVG`, which an optimizer would otherwise have required for SVG.

**`public_id` is deliberately unchanged.** It still reads `fitout/vrt/{listing}/{i}`, a
Cloudinary-shaped identifier, because nothing derives a URL from it — only the host-side uploader
flow (`photo-uploader.tsx`) consumes that column, and no baselined surface renders it. Rewriting it
to match the local path would imply these placeholders exist in Cloudinary, which they do not.

### 3. The header's determinism argument — rewritten, not deleted

Property 1 (`DETERMINISTIC`) now carries the rule the old fixture violated while satisfying its
letter:

> A FIXED LITERAL IS NOT ENOUGH FOR A PHOTO URL. IT ALSO HAS TO RESOLVE, AND TO THE SAME BYTES. […]
> **A baselined photo is served from a committed local asset.** […] A fixture that reaches for an
> EXTERNAL host has left the determinism guarantee even when the URL is a constant, because what the
> reference then encodes is that host's uptime and that host's current bytes, neither of which this
> repository controls. If a future surface needs imagery this set does not have, the fix is another
> committed asset under `public/vrt/`, never a remote URL.

It names the 2026-08-19 set as the measurement that produced the rule, rather than stating the rule
abstractly — the same treatment plan 12-14 Task 1 gave `baselines.yml`'s header. The seed loop's own
comment was rewritten alongside it (a per-run id would change the DOM; a remote url would change the
PIXELS) so the file cannot contradict itself one section down.

## One deviation — Rule 2 (missing critical guard)

Not in the plan; added because the defect being fixed can silently return.

`VRT_PHOTO_ASSETS = 8` plus a refusal in `seedListing()`. The seeded URL is index-addressed, so a
listing that later declares `photos: 9` would be handed `/vrt/photo-8.svg`, get a 404, and re-mint
exactly the broken-image baseline this task removed. The check is in the script and not in a test
because the failure is invisible everywhere a test would look: the row inserts, the count matches,
the seed exits 0, and the defect appears only as pixels in a reference nobody re-reads.

The `main()` summary also now prints the distinct seeded photo URLs. A count cannot be checked
against the filesystem by a human; `/vrt/photo-0.svg … photo-7.svg` can. A remote host reappearing in
that line is loud.

## Verification — all falsifiable, all first-hand

| Check | Result |
|---|---|
| `npx tsx scripts/seed-baseline-fixtures.ts` twice vs `fitout-db-1` | `diff run1 run2` → **identical**; idempotency preserved (5 listings / 21 photos / 2 bookings / 35 hours / 11 tags on both runs) |
| `SELECT count(*) FROM listing_photo WHERE url LIKE '%example.invalid%'` | **0** |
| `… WHERE listing_id LIKE 'vrt_%' AND url NOT LIKE '/vrt/photo-%'` | **0** (21/21 on local paths) |
| `/listings/vrt_listing_exclusive` mosaic `<img>`s | 5 imgs, every one `naturalWidth` 1600 × `naturalHeight` 900, `complete: true` |
| Lightbox, arrow-paged 1/8 → 8/8 | 8 frames, all `naturalWidth` 1600, **8 distinct srcs**, alt strings `photo N of 8` |
| Playwright `requestfailed` listener over the page load + full paging | **none** |
| `npx tsc --noEmit` | exit **0** |
| `npx vitest run` | **141 files / 1307 passed**, 4 skipped — matches HEAD exactly |
| `npm run build` | **Compiled successfully**, 0 errors, **12 warnings** — matches HEAD exactly |

Screenshots of the rendered listing page and lightbox were taken and read (not merely captured); the
mosaic shows five distinct coloured placeholders with visible pip counts, and the lightbox fills the
dialog. They live in the session scratchpad and are not committed — the committed evidence is the
`naturalWidth` measurement above, which is the falsifiable form.

One anomaly, resolved: the *first* vitest invocation reported 1297 passed with `Errors 1 error`.
Re-running gave the exact HEAD figures with zero error lines. Transient, not reproducible, and not
attributable to this change, which touches no module any test imports. The `[test-db] LEAKED WRITES`
banner is a known, documented, contained condition at HEAD and appears in both runs.

## The expected consequence — stated, not acted on

**Every photo-bearing baseline is invalidated by this change. That is the point.**

`gate-visual` will go RED with pixel mismatches on `listing-detail`, `listing-lightbox`, `checkout`,
`search-results` and any other surface showing a photo. That is correct: those references were minted
against broken images and the surfaces now show real ones.

**Follow-up, operator-owned:** re-mint the baseline set via the `baselines` workflow. It is
human-gated by design (D-27) and was **not** dispatched here. No `updateSnapshots` flag, ternary or
CI condition was added anywhere — `playwright.config.ts` still sets `updateSnapshots: "none"`
unconditionally (D-28), unchanged by this task.

## Out of scope, untouched

`e2e/`, `.github/workflows/` and `src/lib/design/visual-baselines.ts`. The inventory and the drives
are correct; only the fixture's photo URLs were wrong. `e2e/helpers/visual-drive.ts` imports the
fixture's *constants* (`VRT_CLOCK_ISO`, `VRT_IDS`, …) and never its photo URLs, so nothing there
needed to move.

These assets are **fixture** imagery, not product art. No product surface is stubbed by this task —
real listing photography arrives from hosts through the uploader, which is untouched.

## Self-Check: PASSED

- `public/vrt/photo-0.svg` … `photo-7.svg` — all 8 FOUND on disk and in commit `cb34581`
- `scripts/seed-baseline-fixtures.ts` — FOUND, modified in `cb34581`
- Commit `cb34581` — FOUND in `git log`
