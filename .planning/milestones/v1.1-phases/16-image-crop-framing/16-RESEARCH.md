---
phase: 16
slug: image-crop-framing
status: complete
researched: 2026-08-25
confidence: HIGH
inherits_contract:
  - .planning/phases/999.2-profile-picture-and-listing-photo-crop-ui/999.2-UI-SPEC.md
  - .planning/phases/16-image-crop-framing/16-UI-SPEC.md
  - .planning/phases/16-image-crop-framing/16-CONTEXT.md
---

# Phase 16: Image Crop & Framing — Research

**Researched:** 2026-08-25
**Domain:** Browser image decode/encode, pointer + touch gesture handling inside a Radix overlay, Cloudinary upload provenance
**Confidence:** HIGH on everything measured first-hand in this repo and in the `react-easy-crop@6.2.3` tarball; MEDIUM on Cloudinary folder-mode behaviour (documented, not observed against the live account — no credentials and no Docker on this box).

> **This is a delta over the contract, not a restatement.** `16-CONTEXT.md` (D-164…D-176), `16-UI-SPEC.md`
> (Δ1…Δ18) and `999.2-UI-SPEC.md` (D-A/D-B/D-C, IC-01…IC-06, §2e/§2f/§2g, § Copywriting) are **settled and
> are not re-derived here.** What follows answers only the questions the planner cannot answer from them.
>
> **Everything below was measured on 2026-08-25.** Every `file:line` was opened. Every version claim names
> the command. Where I could not verify, I say "unverified".
>
> **Repo baseline, measured:** `npx tsc --noEmit` → **exit 0**. `git status --porcelain` shows no `src/`
> or `tests/` modification. Nothing was installed by this research (`package.json` / `package-lock.json`
> clean; `node_modules/react-easy-crop` absent).

---

<user_constraints>

## User Constraints (from 16-CONTEXT.md)

### Locked Decisions

- **D-164** — Phase 16 stays FRAMING. CROP-01..04 and nothing else, save D-165.
- **D-165** — ONE hardening item folds in: `persistPhoto` provenance validation (`url` on our own Cloudinary
  delivery origin derived from `CLOUDINARY_CLOUD_NAME`; `publicId` under `fitout/listings/<listingId>/`;
  rejection is a normal `{ ok: false, error }`; **no schema change**, `drizzle/` stays at `0025`).
- **D-166** — everything else the PM raised becomes Phase 16.1.
- **D-176** — `999.2-UI-SPEC.md` is the contract; `16-UI-SPEC.md` is the named delta over it.
- **D-A / D-B / D-C** (operator, 2026-08-10) — listing side is a preview not a crop; removal is in scope;
  the original is discarded and only the 400×400 result reaches Cloudinary.
- **D-167** — constraints locked (pinch + drag + slider on real hardware; overlay is
  `patterns/responsive-dialog.tsx`; no second focus trap, no second escape behaviour). Engine is the
  researcher's to confirm; `react-easy-crop` is the recommended default.
- **D-168** — the removal confirm reuses `responsive-dialog`; `alert-dialog` is NOT added. Default focus
  lands on `Keep photo`, never on `Remove photo`.
- **D-169** — removal is null-first, destroy best-effort.
- **D-170** — import `MOSAIC_ASPECT` / `RESULT_CARD_MEDIA` as classes; do not re-assert them.
- **D-171** — `gravity: "face"` → `gravity: "center"`, and the transform is KEPT.
- **D-172** — output encoding: 400×400 JPEG, transparency flattened onto white.
- **D-173** — no extras. Zoom floor = fit-the-mask; ceiling = `min(anti-blur bound, 3×)`; no rotation; no
  numeric zoom readout; `AVATAR_MIN_SOURCE_PX = 200`.
- **D-174** — the same-file re-pick bug is an acceptance criterion. The file input's `value` must be reset
  after every handled change.
- **D-175** — CROP-04 is discharged by a PM hardware walk, recorded like EMAIL-03 was. Planning must not
  claim CROP-04 from a Playwright run.

### Claude's Discretion

- Canvas/decode API used to produce the 400×400 blob — any path satisfying IC-06 and the EXIF proof.
- Whether the client-side dimension guard shares a module with the Zod schema.
- File/module layout for the new cropper composite and the new avatar server actions.

### Deferred Ideas (OUT OF SCOPE — Phase 16.1)

Upload size limits on the host path · format allow-lists · `sources: ["url"]` · incoming transformations /
storage shrink · EXIF-GPS stripping · orphan audits · decompression-bomb pixel guards on the *listing* path.
**Nothing in this document may be read as licence to absorb any of them.**

</user_constraints>

<phase_requirements>

## Phase Requirements

Verbatim from `.planning/REQUIREMENTS.md:98-101`:

| ID | Description (verbatim) | Research support |
|----|------------------------|------------------|
| **CROP-01** | A user can frame and zoom their avatar before it uploads, and the server's blind face-gravity re-crop no longer re-frames what the user just chose | §A (engine, zoom bounds, touch), §B (bytes), §C4 (the one-word server change) |
| **CROP-02** | A host uploading listing photos sees a non-destructive preview of what the 16:9 hero and the 4:3 cards each cut off, with nothing baked into the stored asset | §D6 (`photo-uploader.tsx` mount point + what stays byte-unchanged) |
| **CROP-03** | A user can remove their avatar | §C3 (destroy helper), §D4 (`"use server"` discipline), §D5 (existing avatar tests) |
| **CROP-04** | Cropping works on a real touch device — verified on hardware, not in desktop touch emulation | §A3 (touch inside the sheet), §E (what Playwright can and cannot discharge; the UAT mirror) |

`REQUIREMENTS.md:274` — **AUTHUI-02** (Phase 15) carries *"avatar removal is possible"*; **CROP-03** delivers
the affordance. AUTHUI-02 stays Pending until CROP-03 lands.

</phase_requirements>

---

# A. The crop engine (D-167, CROP-01, CROP-04)

## A1. `react-easy-crop@6.2.3` — resolves, MIT, one dependency, React-19-safe. **But 999.2's "no stylesheet" claim is wrong, and the correction is favourable.**

**Verified via `npm view react-easy-crop --json` on 2026-08-25** (the package was **not** installed; it was
downloaded to a scratchpad with `npm pack react-easy-crop@6.2.3` and the tarball read directly):

| Fact | Value | How checked |
|---|---|---|
| Latest version | **6.2.3** | `npm view react-easy-crop version` |
| Last modified | **2026-08-11T11:53:29Z** | `npm view react-easy-crop time.modified` |
| First published | 2018-06-19 | `npm view react-easy-crop time.created` |
| License | **MIT** | `npm view react-easy-crop license` |
| Dependencies | **exactly one** — `normalize-wheel@^1.0.1` (BSD-3-Clause, first published 2016) | `npm view … dependencies` |
| Peers | `react >= 16.4.0`, `react-dom >= 16.4.0` | `npm view … peerDependencies` |
| Installed React here | **19.2.7** (`node -p "require('./node_modules/react/package.json').version"`), Next **16.2.7** | measured |
| `postinstall` | **none** (`scripts.postinstall` is `undefined`) | `npm view react-easy-crop scripts.postinstall` |
| Weekly downloads | **3,100,740** (week ending 2026-08-23) | `api.npmjs.org/downloads/point/last-week` |
| Unpacked size | 281 KB (13 files); the ESM bundle itself is **38,213 bytes** raw | `npm view … dist.unpackedSize`; `wc -c index.module.mjs` |
| `sideEffects` | `false` | package.json in the tarball |

**`"use client"` — required, and the reason is mechanical.** `index.d.ts` declares
`class Cropper extends React.Component<CropperProps, State>` with `componentDidMount`,
`componentWillUnmount`, `componentDidUpdate`, `React.createRef()` and direct `document` / `window` access.
The package ships **no directive of its own**, so the importing module must carry `"use client"`.
`ImageCropDialog` already is one (16-UI-SPEC § Surface contracts 2). It is SSR-safe:
`this.currentDoc = typeof document !== "undefined" ? document : null`, and `componentDidMount` returns early
when that is null (read at `index.module.mjs`, `componentDidMount` body).

**React 19 does not break it.** `Cropper.defaultProps` is set on the class. Per the React 19 upgrade guide,
verbatim: *"We're also removing `defaultProps` from function components in place of ES6 default parameters.
Class components will continue to support `defaultProps` since there is no ES6 alternative."*
[CITED: react.dev/blog/2024/04/25/react-19-upgrade-guide]

### ⚠ The CSS finding — 999.2's vetting table is stale, and the truth is *better*, not worse

999.2 § Component Inventory says *"no stylesheet import … so it composes inside `DialogContent` without a
CSS-order or z-index fight."* **The package does ship a stylesheet** — `package/react-easy-crop.css`, 1,578
bytes, and the `exports` map exposes it at `"./react-easy-crop.css"`. But it is **auto-injected**, so the
practical conclusion 999.2 reached stands. Verbatim from the shipped `README.md:88`:

> *"This component requires some styles to be available in the document. By default, you don't need to do
> anything, the component will automatically inject the required styles in the document head. If you want to
> disable this behaviour and manually inject the CSS, you can set the `disableAutomaticStylesInjection` prop
> to `true` and use the file available in the package: `react-easy-crop/react-easy-crop.css`."*

And in `componentDidMount` (read from `index.module.mjs`):

```js
if (!this.props.disableAutomaticStylesInjection) {
  this.styleRef = this.currentDoc.createElement("style");
  this.styleRef.setAttribute("type", "text/css");
  if (this.props.nonce) this.styleRef.setAttribute("nonce", this.props.nonce);
  this.styleRef.innerHTML = styles_default;
  this.currentDoc.head.appendChild(this.styleRef);
}
```

**Four consequences that are planning facts, not trivia:**

1. **No `import "…css"` is needed and none should be written.** Leave
   `disableAutomaticStylesInjection` at its default.
2. **A `<style>` element is appended to `document.head` at mount and removed at unmount.** It carries
   `rgba(255,255,255,0.5)` and `rgba(0,0,0,0.5)`. Those are **raw colour functions**, but they live in
   `node_modules`, and `config/design-leak-patterns.mjs`'s `LEAK_SCAN_PREFIXES` is
   `["src/app/", "src/components/"]` (read at `:218`). **The leak gate does not see them.** No gate moves.
3. **The injected sheet is UNLAYERED and lands late in `<head>`, so it wins ties over Tailwind utilities.**
   `globals.css:29` is `@import "tailwindcss" source("../")`, which puts every utility inside a cascade
   layer. Unlayered rules beat layered rules regardless of source order. Both the library's
   `.reactEasyCrop_CropArea` rule and a Tailwind utility flatten to specificity (0,1,0) — the layer
   difference decides, and the library wins. **Overriding the mask's border and scrim through
   `classes.cropAreaClassName` alone is therefore not guaranteed.**
   *This is the single highest-risk mechanical finding in §A. See §A5 for the three ways out.*
4. `nonce` is a real prop, should CSP ever tighten. Not needed today.

**Why the deny-list is not triggered, re-verified.** `tests/design/sheet-absent.test.ts:387` bans exactly
three names: `["vaul", "react-spring-bottom-sheet", "@use-gesture/react"]`. Neither `react-easy-crop` nor
`normalize-wheel` is on it. I confirmed by reading `index.module.mjs` that **`@use-gesture/react` is not a
transitive dependency and is not vendored** — the only dependency is `normalize-wheel`, whose entire job is
wheel-delta normalisation, and the pinch handling is hand-written `onTouchStart`/`onTouchMove` +
`getDistanceBetweenPoints` inside the class. The library brings **no focus trap, no escape handling and no
portal**. The gate does not need widening and must not be.

## A2. The exact API surface, read from `index.d.ts` — and what §2 geometry actually requires

Full `CropperProps` (verbatim from the shipped `index.d.ts`, trimmed of video-only members):

```ts
type CropperProps = {
  image?: string; video?: string | VideoSrc[]; transform?: string;
  crop: Point; zoom: number; rotation: number; aspect: number;
  minZoom: number; maxZoom: number;
  cropShape: 'rect' | 'round'; cropSize?: Size;
  objectFit?: 'contain' | 'cover' | 'horizontal-cover' | 'vertical-cover';
  showGrid?: boolean; zoomSpeed: number; zoomWithScroll?: boolean;
  roundCropAreaPixels?: boolean;
  onCropChange: (location: Point) => void;
  onZoomChange?: (zoom: number) => void;
  onRotationChange?: (rotation: number) => void;
  onCropComplete?: (croppedArea: Area, croppedAreaPixels: Area) => void;
  onCropAreaChange?: (croppedArea: Area, croppedAreaPixels: Area) => void;
  onCropSizeChange?: (cropSize: Size) => void;
  onInteractionStart?: (i: CropperInteraction) => void;
  onInteractionEnd?: (i: CropperInteraction) => void;
  onMediaLoaded?: (mediaSize: MediaSize) => void;   // MediaSize = {width,height,naturalWidth,naturalHeight}
  style:   { containerStyle?; mediaStyle?; cropAreaStyle? };
  classes: { containerClassName?; mediaClassName?; cropAreaClassName? };
  restrictPosition: boolean;
  mediaProps: React.ImgHTMLAttributes<HTMLElement> | React.VideoHTMLAttributes<HTMLElement>;
  cropperProps: React.HTMLAttributes<HTMLDivElement>;
  disableAutomaticStylesInjection?: boolean;
  initialCroppedAreaPixels?: Area; initialCroppedAreaPercentages?: Area;
  onTouchRequest?: (e: React.TouchEvent<HTMLDivElement>) => boolean;
  onWheelRequest?: (e: WheelEvent) => boolean;
  setCropperRef?: (ref: React.RefObject<HTMLDivElement>) => void;
  setImageRef?:   (ref: React.RefObject<HTMLImageElement>) => void;
  setVideoRef?; setMediaSize?; setCropSize?; nonce?: string;
  keyboardStep: number;
};
```

`Cropper.defaultProps`, verbatim from the bundle:
`{ zoom: 1, rotation: 0, aspect: 4/3, maxZoom: 3, minZoom: 1, cropShape: "rect", objectFit: "contain",
showGrid: true, style: {}, classes: {}, mediaProps: {}, cropperProps: {}, zoomSpeed: 1,
restrictPosition: true, zoomWithScroll: true, keyboardStep: 1 }`
(module constants: `MIN_ZOOM = 1`, `MAX_ZOOM = 3`, `KEYBOARD_STEP = 1`.)

### The props the contract requires — and the ones it must NOT reach for

| Prop | Value | Why |
|---|---|---|
| `image` | the object URL of the staged `File` | **`image`, never `video`.** Not a decision — the phase is avatars. |
| `crop` / `onCropChange` | controlled `Point`, starts `{x:0,y:0}` | IC-01's "always centred at zoom 1" IS `{0,0}` under `restrictPosition`. |
| `zoom` / `onZoomChange` | controlled, starts **exactly `1`** | IC-01. `onZoomChange` also receives pinch and wheel, so the Slider's `value` stays truthful without extra wiring. |
| `aspect` | `1` | IC-03. |
| `cropShape` | `"round"` | IC-03. Adds `.reactEasyCrop_CropAreaRound` = `border-radius: 50%`. |
| `minZoom` | **`1`** | §A4 — it is 1 *by construction*, not by choice. |
| `maxZoom` | `avatarMaxZoom(min(naturalW, naturalH))` from `onMediaLoaded` | IC-05. |
| `restrictPosition` | `true` (the default; **state it explicitly**) | IC-04/IC-05 both rest on it. Leaving it implicit makes a load-bearing invariant invisible. |
| `objectFit` | `"contain"` (the default; **state it explicitly**) | §A4 — this is what makes `minZoom = 1` mean "the maximum of the photo that can be in frame". |
| `showGrid` | **`false`** (default is `true`) | 999.2 § 2b. Must be passed or a rule-of-thirds grid ships. |
| `zoomWithScroll` | leave default `true` | 999.2 § 2a: *"wheel zoom also works and needs no copy."* This is what makes it true. |
| `onCropComplete` | `(_, croppedAreaPixels) => setArea(croppedAreaPixels)` | The encode input. Fires on interaction *end*. |
| `onMediaLoaded` | `({naturalWidth, naturalHeight}) => setMaxZoom(...)` | The only source of the source's real pixels inside the dialog. |
| `classes` | `{ containerClassName, cropAreaClassName }` | Δ4 (`touch-action`) and Δ6/IC-04 (scrim + ring). See §A5. |
| `cropperProps` | `{ "aria-label": AVATAR_POSITION_LABEL }` | §A6 — this is how the stage gets its accessible name **without a wrapper**. |
| `setImageRef` | capture the `<img>` element | **§B6 — this is the EXIF proof mechanism.** |
| `keyboardStep` | see §A6 — a real conflict with 999.2 § 2g |
| **NOT used** | `video`, `rotation`/`onRotationChange` (D-173 / Open Q4), `cropSize` (would override the computed geometry and break IC-05's arithmetic), `transform`, `initialCroppedArea*` (IC-01 forbids a remembered start), `roundCropAreaPixels`, `disableAutomaticStylesInjection` (unless §A5 route C), `onTouchRequest`/`onWheelRequest`, `zoomSpeed`, `nonce`, `mediaProps` |

`cropSize` deserves a sentence of its own: passing it **replaces** `getCropSize(...)`, which is the function
IC-05's entire zoom arithmetic is derived from (§A4). A plan that reaches for `cropSize` to "make the mask
exactly 200px" has silently invalidated `avatarMaxZoom`.

## A3. Touch inside the bottom sheet (Δ4) — the library already sets `touch-action: none`, and the remaining risk is a *different* element

**The shipped CSS, verbatim, first rule:**

```css
.reactEasyCrop_Container {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  overflow: hidden; user-select: none;
  touch-action: none;                 /* ← already there */
  cursor: move; display: flex; justify-content: center; align-items: center;
}
```

So **Δ4's guard is the library's own default**, not something we must author. That reframes the risk rather
than removing it. Three things the planner must know:

1. **`touch-action: none` on the container is what stops a one-finger drag scrolling the sheet.** With it
   set, the browser never starts a scroll gesture on that element, so `onTouchMove` (attached to `document`
   during a drag — read in `componentDidMount`/`onTouchStart`) receives every move and the sheet stays put.
   *Verify it, do not re-author it.* An assertion that the rendered container's computed
   `touch-action` is `none` is cheap and catches the real regression: someone passing
   `classes.containerClassName="touch-auto"` or a Tailwind reset winning the cascade.
2. **`.reactEasyCrop_Container` is `position: absolute` with all four insets at 0.** It has **no intrinsic
   size**. It sizes to its offset parent, so **our stage wrapper must be `relative` and must carry the
   Δ2 square** (`min(320px, 100vw − 2rem, 40dvh)`), `rounded-xl`, `overflow-hidden`, `bg-muted`. If the
   wrapper is not positioned, the cropper escapes to the nearest positioned ancestor — which inside
   `ResponsiveDialog` is `DialogContent` (`fixed`, `ui/dialog.tsx:73`) — and fills the whole overlay.
   **This is the most likely first-try bug in the phase.**
3. **The sheet must still scroll *around* the stage.** `SHEET_PRESENTATION` puts
   `max-sm:max-h-[85dvh] max-sm:overflow-y-auto` on `DialogContent`
   (`patterns/responsive-dialog.tsx:127`). Because `touch-action: none` is scoped to the container element
   only, a drag that starts on the title, the zoom row, the note or the footer still scrolls the sheet
   normally. **Nothing extra is needed for the "sheet still scrolls" half**, and nothing should be added —
   in particular **do NOT put `overscroll-behavior` or `touch-action` on `DialogContent`**, which is shared
   by six adopters (§D1).

**`@use-gesture/react` is not present — verified two ways.** (a) `npm view react-easy-crop dependencies` →
`{ 'normalize-wheel': '^1.0.1' }` only. (b) The tarball's 13 files contain no vendored gesture library; the
pinch path is `onPinchStart`/`onPinchMove` + `Cropper.getTouchPoint` + `getDistanceBetweenPoints`, all
hand-written in `index.module.mjs`. `tests/design/sheet-absent.test.ts:387` stays at three names.

**One iOS detail worth naming:** `componentDidMount` also does
`this.containerRef.addEventListener("gesturestart", this.onGestureStart)` and the class carries
`onGestureChange` / `onGestureEnd` plus `preventZoomSafari`. Those are the **Safari-only** `gesture*` events
— i.e. the library has a *dedicated* iOS pinch path separate from the two-finger touch path. This is
precisely the "cross-browser pinch is where this class of bug lives" that D-167 cites for not hand-rolling.
It is also **exactly the code CROP-04's hardware walk exists to exercise**, because no emulator fires
`gesturestart`.

## A4. Zoom bounds — `minZoom` is `1` *by construction*; `avatarMaxZoom` is confirmed correct against the library's own arithmetic

I read `computeSizes`, `getCropSize` and `computeCroppedArea` out of `index.module.mjs` and worked the
algebra rather than trusting the docs.

```js
function getCropSize(mediaWidth, mediaHeight, containerWidth, containerHeight, aspect, rotation = 0) {
  const { width, height } = rotateSize(mediaWidth, mediaHeight, rotation);
  const fittingWidth  = Math.min(width,  containerWidth);
  const fittingHeight = Math.min(height, containerHeight);
  if (fittingWidth > fittingHeight * aspect) return { width: fittingHeight * aspect, height: fittingHeight };
  return { width: fittingWidth, height: fittingWidth / aspect };
}
```

With a **square** container of side `S`, `objectFit: "contain"` and `aspect = 1`, for a landscape source of
natural aspect `a = natW/natH > 1`:

- `renderedMediaSize = { width: S, height: S/a }`
- `getCropSize(S, S/a, S, S, 1)` → `fittingWidth = S`, `fittingHeight = S/a`; `S > S/a` → returns
  `{ width: S/a, height: S/a }` — **the crop square equals the shorter rendered side.**
- Therefore at `zoom = 1` the mask already holds the maximum of the photo that can be in frame, and the
  image already covers the mask exactly. **`minZoom = 1` IS "fit-the-mask". No computation is required, and
  none should be written.** 999.2's *"The user can never zoom out past the shorter side"* is not a
  restriction the app imposes — it is what `objectFit: "contain"` + `aspect: 1` in a square container
  arithmetically produces.

Then, from `computeCroppedArea`:

```js
croppedAreaPercentages.width = cropSize.width / mediaBBoxSize.width * 100 / zoom;   // = (100/a)/zoom
widthInPixels  = round(croppedAreaPercentages.width  * naturalW / 100);             // = natW/(a·zoom) = natH/zoom
heightInPixels = round(croppedAreaPercentages.height * naturalH / 100);             // = natH/zoom
// natW >= natH * 1  →  sizePixels = { width: round(heightInPixels), height: heightInPixels }
```

**`croppedAreaPixels` is a `min(natW, natH) / zoom` square.** (Portrait sources give the mirror result.)
So requiring ≥ 400 real source pixels is exactly `min(natW,natH)/zoom ≥ 400`, i.e. `zoom ≤ min(natW,natH)/400`.

> **IC-05's `avatarMaxZoom(shorter) = clamp(shorter / AVATAR_OUTPUT_PX, 1, 3)` is CONFIRMED against the
> library's own source, not merely plausible.** All seven of 999.2's worked examples reproduce.

**`minZoom === maxZoom === 1` — what the library does, measured from source.** Nothing special and nothing
bad. `setNewZoom` clamps to `[minZoom, maxZoom]`, so pinch and wheel become no-ops; `onWheel` still fires
and still calls `preventDefault` (registered `{ passive: false }`), so the page does not scroll under a
wheel over the stage. **The library does not disable or hide anything** — the disabled zoom row is
entirely ours (999.2 § 2c / rule F8), and the correct spelling is `<Slider disabled>` with
`AVATAR_SOFT_SOURCE_NOTE` beneath it, never `hidden`.

One trap: `min` and `max` on the shadcn `Slider` are `0`/`100` by default and the block computes
`_values = [min, max]` when neither `value` nor `defaultValue` is an array — so the crop dialog must pass
`value={[zoom]}` **as an array** and `min={1} max={maxZoom} step={0.01}`. A scalar `value` silently yields a
two-thumb slider at the extremes.

**`maxZoom` arrives late, and the plan must handle the gap.** `onMediaLoaded` fires from `onMediaLoad`,
which is the `<img>`'s `onLoad`. Between mount and that callback, `maxZoom` is whatever the initial state
says. Set it to **`1`** initially, not `3`: a zoom row that is briefly live at 3× on a 220px source and then
snaps disabled is a visible lie, whereas one that is briefly disabled and then enables is not. This costs
one initial-state value.

## A5. The mask ring and the scrim — Δ6 and IC-04 need more than a class name

The library paints the mask with the crop-area element's `box-shadow` and `color`:

```css
.reactEasyCrop_CropArea {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-sizing: border-box;
  box-shadow: 0 0 0 9999em;      /* ← the scrim; colour comes from `color` */
  color: rgba(0, 0, 0, 0.5);     /* ← so the scrim is 50% black by default */
  overflow: hidden;
}
```

**Two facts the contract needs and does not yet state:**

1. **The scrim is driven by the `color` property, not by a background.** Δ6's *"`--foreground` at 55%"* is
   spelled **`text-foreground/55`** on `classes.cropAreaClassName`. That is also exactly the token shape
   Δ6 predicts for the diluted-token inventory (`foreground/55`). A `bg-*` utility would do nothing at all.
   *(Aside: Δ6 says 55% "is also `react-easy-crop`'s own default weight". Measured, the default is **50%**,
   not 55%. The 55% call still stands on its own merits — it is lighter than the shipped `foreground/80`
   and IC-04 wants the cut-off region legible — but the "the library and our token agree" sentence is not
   true and should not be repeated in a plan.)*
2. **Tailwind utilities may lose the cascade tie.** The injected `<style>` is unlayered and appended to
   `<head>` at mount; Tailwind v4 utilities are inside a cascade layer. Unlayered beats layered. So
   `border-2 border-background text-foreground/55` on `cropAreaClassName` is **not guaranteed** to override
   `border: 1px solid rgba(255,255,255,.5)` and `color: rgba(0,0,0,.5)`.

**Three routes, in order of preference:**

| Route | Spelling | Cost |
|---|---|---|
| **A — `style.cropAreaStyle`** (recommended) | `style={{ cropAreaStyle: { borderWidth: 2, borderColor: "var(--background)", color: "color-mix(in oklch, var(--foreground) 55%, transparent)" } }}` — an inline style always beats any stylesheet rule | ⚠ **Blocked as written**: `color-mix(` is *not* on the leak gate's ban list (`design-leak-patterns.mjs:150` explicitly exempts it: *"a color-mix over two declared tokens is not a leak, it is this phase's prescribed hover idiom"*), but `borderColor: "var(--background)"` inside a component is fine and `color-mix` is fine too. **This route passes the leak gate.** It does, however, put geometry in JS rather than in a class, and it produces **no** `foreground/55` diluted-token row — which means Δ6's declared-inventory budget line becomes wrong (see § Open Risks R3). |
| **B — `classes.cropAreaClassName` + verify** | `cropAreaClassName={cn("border-2 border-background text-foreground/55")}` and **prove it wins** with a Playwright computed-style assertion | Cheapest to author, matches Δ6 exactly, keeps the inventory row honest. Needs one real-browser assertion because jsdom computes no cascade (§E). If it loses, fall back to A. |
| **C — `disableAutomaticStylesInjection` + `import "react-easy-crop/react-easy-crop.css"`** | full control of order | **Do not.** It puts a vendor stylesheet into our bundle graph, is the "parallel UI system" 999.2 rejected `cropperjs` for, and buys nothing routes A/B do not. |

**Recommendation: route B, with a Playwright computed-style check as its proof.** It is the only route that
keeps Δ6's contract, its inventory row and its reversal cost all true simultaneously. Route A is the named
fallback and the plan should say so rather than discover it.

*Also note:* `.reactEasyCrop_CropArea` has `overflow: hidden`, and the **matte behind the mask** (Δ7's
`bg-background`) cannot be painted there — the crop area sits *above* the media. The white matte the user
must see before confirming (IC-02) has to be the **stage wrapper's** background (`bg-background`), visible
through the transparent regions of a PNG because `.reactEasyCrop_Image` has no background of its own. Δ7's
*"the stage's matte behind the mask is `bg-background`"* is therefore satisfied on the wrapper, and the
wrapper's `bg-muted` (999.2 § 2b, the letterbox backing) and `bg-background` (Δ7, the matte) **are two
different claims about one element.** They conflict. See § Open Risks **R4**.

## A6. Keyboard — the library already ships arrow-key panning, and its Shift behaviour is the *opposite* of 999.2's

**999.2 § 2g says:** *"`react-easy-crop` does not provide this"* — the stage carries `tabIndex={0}`, an
`aria-label`, and *"an `onKeyDown` that maps ↑↓←→ to an 8px crop translation and Shift+arrow to 24px."*

**That was true of an older version. In 6.2.3 it is not.** From `render()` (verbatim):

```js
this.state.cropSize && React.createElement("div", _objectSpread2({
  ref: this.cropperRef,
  style: { ...cropAreaStyle, width: …, height: … },
  tabIndex: 0,
  onKeyDown: this.onKeyDown,
  onKeyUp: this.onKeyUp,
  "data-testid": "cropper",
  className: classNames("reactEasyCrop_CropArea", cropShape === "round" && "reactEasyCrop_CropAreaRound",
                        showGrid && "reactEasyCrop_CropAreaGrid", cropAreaClassName)
}, cropperProps))
```

and:

```js
this.onKeyDown = (event) => {
  const { crop, onCropChange, keyboardStep, zoom, rotation } = this.props;
  let step = keyboardStep;
  if (!this.state.cropSize) return;
  if (event.shiftKey) step *= .2;        // ← SHIFT MAKES IT FINER, NOT COARSER
  … ArrowUp/Down/Left/Right, each with event.preventDefault() …
  if (this.props.restrictPosition) newCrop = restrictPosition(newCrop, this.mediaSize, this.state.cropSize, zoom, rotation);
  onCropChange(newCrop);
};
this.onKeyUp = (event) => { /* arrows only */ this.emitCropData(); … };
```

**Four consequences:**

1. **`tabIndex={0}` is already there. Do not add a second one** — `cropperProps` is spread *after* the
   built-in props, so `cropperProps={{ tabIndex: 0 }}` would merely re-set it, but
   `cropperProps={{ className: … }}` would **clobber** the computed `className` (including
   `reactEasyCrop_CropAreaRound`). **Pass only `aria-label` (and the focus-recipe class via
   `classes.cropAreaClassName`, never via `cropperProps`).**
2. **`aria-label={AVATAR_POSITION_LABEL}` goes on `cropperProps`.** This satisfies Δ18's
   `getByLabelText(AVATAR_POSITION_LABEL)` with zero new `data-testid` and zero wrapper element.
3. **No custom `onKeyDown` is needed, and writing one is a regression risk** — an `onKeyDown` in
   `cropperProps` overrides the library's, losing `restrictPosition` clamping and the
   `onInteractionStart`/`emitCropData` pairing that makes `onCropComplete` fire after a keyboard nudge.
4. **The Shift semantics conflict with 999.2 § 2g.** The library does `step *= 0.2` on Shift — Shift is a
   **fine** adjust. 999.2 asks for arrow = 8px and **Shift = 24px** (a *coarse* adjust). With
   `keyboardStep={8}`, Shift+arrow gives **1.6px**, not 24px.

   > **Recommendation: pass `keyboardStep={8}` and amend § 2g's Shift clause to "Shift+arrow = a finer 1.6px
   > nudge".** Shift-as-fine-adjust is the platform convention in every design tool, it is what ships, and
   > matching 999.2's letter costs a hand-rolled handler that discards four other correct behaviours.
   > This is a **contract amendment the planner must raise explicitly**, not absorb silently — it changes a
   > line in a settled accessibility section. Reversal if the PM insists: `cropperProps.onKeyDown`, ~25 lines,
   > and it must re-implement `restrictPosition` clamping itself.

**One more mechanical fact with teeth:** the crop-area div is rendered **only when `this.state.cropSize` is
truthy**, and `cropSize` is only set by `computeSizes`, which needs a real
`containerRef.getBoundingClientRect()` and a loaded `<img>`. **In jsdom neither exists**, so the element
carrying `tabIndex`, the `aria-label` and the mask **never renders under Vitest**. See §E — this is the
single fact that decides most of the validation architecture.

The library also bakes `data-testid="container"` and `data-testid="cropper"` into the DOM. Δ18 holds for
the **source** scan — `tests/design/selector-contract.test.ts` collects `data-testid` occurrences from
`src/**/*.tsx` (read at `:343-345`), and `node_modules` is outside it. But a test that reaches for
`getByTestId("cropper")` would be depending on a vendor internal that no inventory governs. **Use the
`aria-label`.**

---

# B. Producing the bytes (IC-06, D-172, Claude's Discretion)

## B5 + B6. The decode path: **reuse the cropper's own `<img>` via `setImageRef`.** This makes EXIF correct *by construction*, not by two agreeing corrections.

**The recommendation, stated first:**

```
setImageRef={(ref) => { imgRef.current = ref.current }}   // a RefObject<HTMLImageElement>
…
ctx.drawImage(imgRef.current, area.x, area.y, area.width, area.height, 0, 0, 400, 400);
```

**Why this is the right answer and the alternatives are not.** `croppedAreaPixels` is computed by the
library from `this.mediaSize.naturalWidth/naturalHeight`, which it reads off **that exact `<img>` element**
(`computeSizes`: `this.imageRef.current?.naturalWidth`). Modern browsers apply EXIF orientation to `<img>`
by default (`image-orientation: from-image` is the CSS initial value), so those naturals are already in
**oriented** space and `croppedAreaPixels` is an oriented-space rectangle. Drawing **the same element**
means the source rectangle and the source bitmap are the same coordinate system by identity. There is no
second correction to agree with.

The three realistic options, compared honestly:

| Path | EXIF correctness | Support in our matrix | Can preview and bytes diverge? |
|---|---|---|---|
| **`setImageRef` → `drawImage(thatImg, …)`** ✅ | Identical to the preview **by identity** — one decode, one element | `drawImage` honours EXIF in Chromium (`image-orientation` computes to `from-image`), WebKit (always honours it), and Firefox since **77** (bug 1616169, RESOLVED FIXED) [CITED: bugzilla.mozilla.org/1616169] | **No.** There is only one bitmap. |
| Own `<img>` + `.decode()` + `drawImage` | Correct in the same browsers, but it is a **second** decode of the same bytes | `HTMLImageElement.decode()` is broadly available | In principle yes — two elements, two decodes. In practice they agree. Buys nothing over the above. |
| `createImageBitmap(file, { imageOrientation: "from-image" })` | Explicitly oriented; `"from-image"` is the **spec default** [CITED: MDN `createImageBitmap`] | Chrome/Edge **112+**, Firefox **111+**, Safari & iOS Safari **16.0+**, ~92.8% global [CITED: caniuse `mdn-api_createimagebitmap_options_imageorientation_parameter_from-image`] | **Yes — this is the risk.** It is a *different decoder path* from the `<img>` the preview used. Two independent EXIF corrections that happen to agree today is exactly the "proven, not assumed" IC-06 refuses. |
| `OffscreenCanvas` | orthogonal (a canvas kind, not a decode path) | fine in the matrix | Adds a worker-shaped abstraction for a 400×400 draw that takes microseconds. **No.** |

> **Decision: `setImageRef` + `drawImage`. Reject `createImageBitmap` for the encode**, not because it is
> wrong but because it re-introduces the exact two-corrections-must-agree structure IC-06 was written
> against. `OffscreenCanvas` is unnecessary at 400×400.

**How a test proves it — and this is the genuinely fixture-able part.** The by-construction argument still
needs a mechanical guard, because a future refactor could re-introduce a second decode without anyone
noticing. Two layers:

1. **Runtime invariant, cheap and total.** `onMediaLoaded` hands you `{naturalWidth, naturalHeight}`.
   Assert in a Playwright E2E, on a fixture with **EXIF Orientation = 6** (90° CW, so W and H swap):
   `imgRef.current.naturalWidth === mediaSize.naturalWidth`. If a browser ever disagreed between the two
   readings, this goes red. It costs one exposed value.
2. **The end-to-end proof.** Load a **portrait-content, landscape-encoded, Orientation-6** JPEG whose
   correct rendering is unambiguous (a fixture with a coloured block in one known corner is enough — the
   uncorrected orientation puts it in a different corner). Then, in a real browser:
   - read the pixel at a known offset of the *preview* (`page.evaluate` over the cropper's `<img>` drawn
     into a scratch canvas), and
   - read the same offset of the **produced Blob** (decode it back and sample),
   - assert they match. **This is a Playwright test. jsdom cannot run it** (§E).

**Fixtures do not exist in this repo.** `find tests e2e -name "*.jpg" -o -name "*.png" …` returns only
`e2e/visual/surfaces.spec.ts-snapshots/*.png` — VRT baselines, nothing usable. Every image fixture this
phase needs is Wave 0. See §E for the list.

## B7. `toBlob` quality, the white matte, and the two gotchas that actually bite

**The encode, in the order it must happen:**

```ts
// src/lib/avatar-canvas.ts   (directive-free; MUST live under src/lib/** — Δ7)
const canvas = document.createElement("canvas");
canvas.width = AVATAR_OUTPUT_PX;          // 400
canvas.height = AVATAR_OUTPUT_PX;
const ctx = canvas.getContext("2d");
ctx.fillStyle = "#ffffff";                // the matte literal — legal here, illegal in a component (Δ7)
ctx.fillRect(0, 0, AVATAR_OUTPUT_PX, AVATAR_OUTPUT_PX);   // FIRST, so alpha composites onto white
ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, AVATAR_OUTPUT_PX, AVATAR_OUTPUT_PX);
const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, "image/jpeg", 0.9));
```

| Question | Answer | Evidence |
|---|---|---|
| **What `q`?** | **`0.9`** — keep 999.2's IC-06 value | A 400×400 photographic JPEG at q0.9 is ~30–60 KB, three orders of magnitude under `AVATAR_MAX_BYTES` (5 MB, `validation/profile.ts:33`). There is no size pressure here; picking a lower q trades visible quality for nothing. |
| **Flatten alpha deterministically?** | **`fillRect` white BEFORE `drawImage`.** Do not rely on the encoder. | JPEG has no alpha channel. Firefox composites transparent regions onto **black** when asked for `image/jpeg` unless a background was painted; Chrome/Safari differ. Painting it yourself makes it deterministic across browsers. [VERIFIED: MDN `HTMLCanvasElement.toBlob` + Mozilla support thread] |
| **Tainted canvas?** | **Not possible here.** | The source is a `blob:` object URL minted from a local `File` via `URL.createObjectURL`, which is same-origin. `toBlob` will not throw `SecurityError`. Do **not** set `crossOrigin` on the media — it is unnecessary and, on a blob URL, can only cause trouble. |
| **Animated sources?** | **Free — the still first frame is what you get.** | The cropper renders an `<img>`; `drawImage(HTMLImageElement)` draws the currently-presented frame, and animated WebP/GIF in an `<img>` present the first frame at load. 999.2 § 2e's *"no detection, no warning"* is correct, and rule **F7** forbids warning about it. |
| **`toBlob` can hand back `null`** | Handle it. Treat as a save failure. | The signature is `(blob: Blob \| null) => void`. It is null on encoder failure. Silently proceeding would `fd.set("avatar", null)` and produce a confusing server-side Zod error instead of `Could not upload your photo. Please try again.` |
| **The Blob → File hop** | `fd.set("avatar", blob, "avatar.jpg")` | 999.2 § 1b already records this: a `Blob` appended with a filename arrives server-side as a `File`, so `z.instanceof(File)` at `validation/profile.ts:40` holds unchanged. **`blob.type` is `"image/jpeg"`**, which passes the narrowed type check in §D5 — so the client's own output is inside its own allow-list, which is worth an assertion. |
| **Revoke the object URL** | On dialog unmount **and** on every re-pick | `URL.revokeObjectURL`. A leaked blob URL pins the decoded image for the tab's life. Pairs naturally with D-174's input reset. |

**Rounding, stated because it is the one place 400×400 can become 399×400.** `croppedAreaPixels` is
already `Math.round`ed by `computeCroppedArea`, and `limitArea` clamps `x`/`y` to
`naturalSize - sizePixels`, so the source rect is always in bounds. The destination rect is the literal
`0,0,400,400`. **Do not** compute the destination from `area.width` — on a 300×300 source at `maxZoom = 1`
that would emit a 300×300 asset and quietly break IC-06's "always 400×400", which is the only reason
`cloudinary.ts:29` can be called the identity (§C4).

## B8. The pre-dialog guard — the cheapest honest measure, and where `AVATAR_MIN_SOURCE_PX` lives

999.2 § 2e fixes the **order**: type → size → **decode** → measure. Only the decode/measure step is open.

**Recommendation — one `<img>`, one `onload`, one `onerror`:**

```ts
// src/lib/avatar-canvas.ts (directive-free)
export function measureImage(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("undecodable"));
    img.src = url;
  });
}
```

| Why not the alternatives | |
|---|---|
| `createImageBitmap(file)` | Would work and rejects on undecodable — but it is a **second decoder path** from the one the cropper will use, which is the divergence §B6 exists to avoid. Using `<img>` here means the guard and the stage agree about what "decodable" and "how many pixels" mean. |
| `img.decode()` | Returns a promise and rejects on failure, which reads nicer than `onerror` — but it is **not in jsdom** (`Image.prototype.decode` → `undefined`, measured, §E) and is otherwise equivalent. Either is fine; `onload`/`onerror` needs no fallback. |
| Reading the file header manually | Re-implementing a JPEG/PNG/WebP parser to learn dimensions the browser already knows. No. |

**"Undecodable" is `onerror` firing, full stop.** That covers the corrupt file, the HEIC that slipped past
`accept` (Safari on macOS decodes HEIC in an `<img>`; Chrome on Windows does not — so the *same* file is
decodable on one machine and not another, and both outcomes are correct behaviour, not a bug to chase),
and a mislabelled `.png` that is really a PDF. `AVATAR_UNREADABLE_MESSAGE` is the response.

**Where the constants live — the answer to Claude's-Discretion item 2.** Put `AVATAR_MIN_SOURCE_PX`,
`AVATAR_OUTPUT_PX`, `AVATAR_MAX_ZOOM_CEILING`, `avatarMaxZoom()` and **`AVATAR_ALLOWED_TYPES`** in
**`src/lib/avatar.ts`** (directive-free, per 16-UI-SPEC § Copywriting "Homes"), and have
`src/lib/validation/profile.ts` **import `AVATAR_ALLOWED_TYPES` from it** rather than duplicate the
three MIME strings.

Rationale: the client guard and the Zod schema must not be able to disagree about which three types are
allowed — that disagreement is a user-visible split between what the picker accepts and what the server
takes. One array, two consumers. `validation/profile.ts` is already directive-free (its own header at
`:10-18` records why), so the import is legal in both directions. **`AVATAR_MIN_SOURCE_PX` does NOT go into
the Zod schema** — the server has no pixel dimensions (that hole is exactly why D-171 keeps the transform)
and adding a dimension check server-side would be Phase 16.1 scope.

**The reject/accept/cancel input reset (D-174) is one line in a `finally`:**

```ts
async function onAvatarChange(e) {
  try { … guards … open dialog … }
  finally { e.target.value = ""; }   // EVERY path: accept, reject, cancel
}
```
Today `profile-form.tsx:78-92` has no reset at all — read first-hand; the handler ends at `router.refresh()`
on success and `return` on failure.

---

# C. Cloudinary (D-165, D-169, D-171)

## C9. The `public_id` shape — **`fitout/listings/<listingId>/<name>`, folder-prefixed, no extension — in BOTH folder modes.** This unblocks D-165.

16-CONTEXT explicitly defers this: *"The planner must confirm the exact `public_id` shape Cloudinary returns
for a foldered upload before pinning the prefix test."* Here it is.

The upload goes through `<CldUploadWidget options={{ folder: \`fitout/listings/${listingId}\`, … }}>`
(`photo-uploader.tsx:176-181`, read first-hand) and the signature endpoint allow-lists exactly
`{folder, source, timestamp}` (`api/cloudinary/sign/route.ts:35`) and pins
`folder === \`fitout/listings/${listingId}\`` (`:85`, `:100-102`). So the legacy **`folder`** parameter is
what is in play — not `asset_folder`, not `public_id_prefix`.

**Fixed folder mode** — the `folder` parameter *"[d]efines both the full path of the folder where the
uploaded asset will be placed and also a path value that's prepended to `public_id` value with a forward
slash."* [CITED: cloudinary.com/documentation/image_upload_api_reference]

**Dynamic folder mode** (the default for **all** Cloudinary accounts created since **4 June 2024**
[CITED: cloudinary.com/documentation/folder_modes]) — the `folder` parameter *"is officially supported for
backward compatibility and is the equivalent of setting both `asset_folder` and `public_id_prefix` to the
same value (if those values are not explicitly passed)."*
[CITED: cloudinary.com/documentation/folder_modes_in_integrations]

> **Therefore, in both modes, `folder: "fitout/listings/<id>"` yields
> `public_id` that begins `fitout/listings/<id>/`.** And `public_id` carries **no file extension** —
> *"[s]hould not include file extensions for images/videos; only raw files need extensions."*
> [CITED: image_upload_api_reference]
>
> **The D-165 prefix test can be written, and the assertion is
> `publicId.startsWith(\`fitout/listings/${listingId}/\`)`.**

**Confidence: MEDIUM-HIGH.** Documented in three Cloudinary pages that agree; **not** observed against the
live account, because Docker is not running on this box and `.env.local` holds only *"public-safe dummy
Cloudinary values"* (the file's own comment). **Corroborating evidence inside the repo:**
`tests/listing/photos.test.ts:89` already uses `publicId: "fitout/listings/abc/one"` — folder-prefixed, no
extension — which is what a prior phase observed.

**Two guards worth writing regardless of mode, so the test survives an account-setting change:**
1. Assert the prefix, not equality — `startsWith(prefix)`, which is true in both modes.
2. **Reject path traversal explicitly.** `fitout/listings/<id>/../../avatars/victim` also `startsWith` the
   prefix. Reject any `publicId` containing `..`. This is one line and it is the difference between a prefix
   check and a scope check.
3. Reject a `publicId` that is *only* the prefix, or that contains a scheme (`http`), a backslash, or a
   leading `/`.

## C10. The delivery origin — the shapes to accept, the tightest test, and a **fail-open hazard in CI that will otherwise ship silently**

**Read first-hand:** `src/app/actions/listing-photo.ts:80-112` (`persistPhoto`), `:93-97` — the entire
current validation is `input.publicId?.trim()` and `input.url?.trim()` non-empty, then a direct
`db.insert(listingPhoto).values({ id, listingId, publicId, url, position })` at `:108`. D-165's reading of
this file is accurate.

**The legitimate URL shape.** Cloudinary's canonical delivery URL is
`https://res.cloudinary.com/<cloud_name>/<asset_type>/<delivery_type>/<transformations>/<version>/<public_id>.<extension>`
and *"the returned `url` and `secure_url` parameters also include the `version` component."*
[CITED: cloudinary.com/documentation/image_transformations]

So the widget's `info.secure_url` (consumed at `photo-uploader.tsx:126`) is:

```
https://res.cloudinary.com/<cloud>/image/upload/v<digits>/fitout/listings/<listingId>/<name>.<ext>
```

| Shape | Legitimate here? |
|---|---|
| `https://res.cloudinary.com/<cloud>/image/upload/v1234/…` | **Yes** — this is what ships. |
| `http://` (`info.url` rather than `secure_url`) | **No.** `photo-uploader.tsx:126` uses `info.secure_url`. Require `https:`. Accepting `http:` would be a mixed-content bug on a public page. |
| No `v<digits>` segment | Not produced by the upload response, but harmless and valid. **A prefix test does not need to police it.** |
| A CNAME / private-CDN host | *"Paid customers…can request to use a private CDN or custom delivery hostname (CNAME)"* [CITED: image_transformations]. **Not configured here** — `src/lib/cloudinary.ts:13-17` passes only `cloud_name`/`api_key`/`api_secret`, no `secure_distribution`, no `private_cdn`. **Do not pre-emptively allow a CNAME.** If one is ever adopted, this test going red is the correct alarm. |
| `https://res.cloudinary.com.evil.tld/<cloud>/…` | **Must be rejected.** A naive `url.includes("res.cloudinary.com")` accepts it. |
| `https://evil.tld/?x=https://res.cloudinary.com/<cloud>/image/upload/` | **Must be rejected.** A naive `includes` accepts this too. |

**The tightest honest test — parse, do not substring-match:**

```ts
const u = new URL(url);                                    // throws on garbage → reject
u.protocol === "https:" &&
u.hostname === "res.cloudinary.com" &&                     // exact host, no suffix match
u.pathname.startsWith(`/${cloudName}/image/upload/`)
```

`new URL().hostname` is the only thing that reliably beats both the suffix trick and the query-string trick.
A `startsWith` on the whole URL string would *also* work for the two attacks above, but breaks the moment a
version segment or a `/f_auto/` transformation appears; the parsed form is both tighter and more durable.

### ⚠ **The CI hazard — read this before writing a single line of D-165**

`.github/workflows/ci.yml` states, at `:151` and again at `:875`, that the test jobs hold
*"no PayMongo / Resend / Cloudinary / Better-Auth / Google credential"*. `.env.local` is gitignored.
`tests/setup.ts:18-19` loads `.env.local` then `.env` — **neither exists on CI**.

> **`process.env.CLOUDINARY_CLOUD_NAME` is `undefined` in every CI test run.**

That gives two ways to be wrong, and both are live:

- **Fail-open:** `if (!cloudName) return { ok: true }` / skip the check. The guard is then **dead in CI** and
  every test of it passes vacuously. This is the same defect class as the `"use server"` incident that
  `tests/use-server-exports.test.ts` exists to prevent — a green suite over a feature that does not run.
- **Fail-closed-by-accident:** the check builds `/undefined/image/upload/` and **every existing
  `persistPhoto` test goes red in CI while passing locally.**

**The design that survives both:** make the validator a **pure exported function taking `cloudName` as an
argument**, in a directive-free module — e.g.
`isOwnCloudinaryAsset({ url, publicId, listingId, cloudName }): boolean` in `src/lib/cloudinary-provenance.ts`.
The action resolves `process.env.CLOUDINARY_CLOUD_NAME` once and **fails closed with the shipped literal
when it is absent** (an app with no cloud name configured cannot legitimately be persisting a Cloudinary
URL). The unit tests drive the pure function with an explicit cloud name and never touch `process.env`.
The integration tests in `tests/listing/photos.test.ts` set `process.env.CLOUDINARY_CLOUD_NAME` in a
`beforeAll` so they are independent of `.env.local`.

### ⚠ **D-165 breaks eight existing assertions. Budget them.**

`grep -rn "persistPhoto" tests/` — read first-hand. `tests/listing/photos.test.ts` calls it with
deliberately synthetic metadata:

| Line | Call |
|---|---|
| `:88-91` | `{ publicId: "fitout/listings/abc/one", url: "https://res.cloudinary.com/mock/one.jpg" }` |
| `:105`, `:106`, `:107` | `{ publicId: "p0", url: "u0" }` … `p2`/`u2` |
| `:118`, `:119`, `:120` | same three |
| `:142`, `:143` | `p0`/`u0`, `p1`/`u1` |
| `:160`, `:161`, `:162` | `keep-0`/`u0`, `gone-1`/`u1`, `keep-2`/`u2` |

**Every one of these fails a provenance check.** Note the first is *nearly* right — its `publicId` has the
correct shape but names listing `abc` rather than the actual `listingId`, and its `url` lacks
`/image/upload/`. The plan must rewrite these fixtures to legitimate shapes derived from the test's own
`listingId` and cloud name. That is a real, non-optional task — and it is *good*: a fixture that could not
be produced by the real pipeline was never testing the real pipeline.

Also note `tests/booking/cancellation-policy.test.ts:90` and `tests/listing/status-gate.test.ts:100` insert
`https://res.cloudinary.com/mock/${listingId}/${i}.jpg` — but those write **directly to the DB**, not through
`persistPhoto`, so they are unaffected. Verified by reading both call sites.

**Δ15 is satisfiable as written:** the rejection returns the existing literal
`"That photo didn't upload. Please try again."` (`listing-photo.ts:97`) — the string is already in the file
and needs no new export. The distinction goes in the server log, per Δ15 and rule F1.

## C11. The avatar destroy helper (D-169) — mirror `destroyListingPhoto` exactly

`src/lib/cloudinary.ts:85-89`, read first-hand:

```ts
export function destroyListingPhoto(publicId: string): Promise<{ result: string }> {
  return cloudinary.uploader.destroy(publicId, { invalidate: true });
}
```

**The avatar twin is the same call.** `avatarPublicId` is stored by `uploadAvatarAction` from Cloudinary's
own `public_id` (`actions/avatar.ts:66-74`), which — given `folder: "fitout/avatars"` + `public_id: userId`
at `cloudinary.ts:26-27` — is **`fitout/avatars/<userId>`** (same folder-prefixing rule as §C9). So the
stored id is already fully qualified and needs no reconstruction. `{ invalidate: true }` busts the CDN copy,
which matters here more than for listings: `overwrite: true` means the URL is stable across replacements,
so a stale CDN entry would render a removed avatar.

**What failure looks like — and why it must be caught, not awaited.**
`cloudinary.uploader.destroy` returns a promise. It **resolves** with `{ result: "not found" }` when the
public id does not exist (it does not reject), and **rejects** on network/auth failure. Under D-169's
null-first ordering that distinction is irrelevant to the user — both must leave the UI truthful:

```ts
// after the columns are nulled, and never before
try {
  const res = await destroyAvatar(publicId);
  if (res.result !== "ok") console.warn("[avatar:destroy] non-ok", { userId, publicId, result: res.result });
} catch (err) {
  console.warn("[avatar:destroy] failed — orphan tolerated (D-169)", { userId, publicId, err });
}
return { ok: true };            // ← the destroy NEVER changes the action's result
```

**The mistake to forbid explicitly:** `await destroy(...)` un-guarded, so a Cloudinary outage turns a
*successful* removal into `AVATAR_REMOVE_FAILED_MESSAGE` on a profile whose avatar is already gone. That is
the UI lying, which is the exact thing D-169's ordering exists to prevent, arriving through the other door.

The Cloudinary module is globally mocked in the suite (`tests/setup.ts:59` →
`tests/helpers/mocks.ts:104-107`), and the mock's `destroy` pushes to `cloudinaryDestroys` and resolves
`{ result: "ok" }`. So both the happy path and — via `vi.mocked(...).mockRejectedValueOnce(...)` — the
failure path are testable in Vitest without a network.

## C12. `gravity: "center"` is the geometric identity on a 400×400 input — but the **bytes still change**, and a plan must not claim otherwise

`src/lib/cloudinary.ts:19-38`, read first-hand:

```ts
cloudinary.uploader.upload_stream({
  folder: "fitout/avatars",
  public_id: userId,
  overwrite: true,
  transformation: { width: 400, height: 400, crop: "fill", gravity: "face" },   // ← :29
}, …)
```

**Geometrically, `{ width: 400, height: 400, crop: "fill", gravity: "center" }` on a 400×400 input is the
identity.** `c_fill` scales to cover and crops the overflow; at an exact match there is no scaling and
nothing to crop, and `g_center` has no off-centre region to choose. That part of D-171 / 999.2 § 4 is
sound.

**But "identity" is a claim about geometry, not about bytes.** An upload `transformation` is an *incoming
transformation*: Cloudinary decodes and re-encodes to produce the stored derivative. Consequences the
planner should not be surprised by:

- The stored JPEG is **not byte-identical** to the blob the client produced. A test asserting
  `storedBytes === uploadedBytes` would fail, and would be the wrong test to write.
- Cloudinary strips metadata by default on transformed assets. **Here this is a quiet win** — EXIF/GPS
  cannot survive on the avatar path — but it must not be leaned on as a *feature*, because EXIF stripping
  is explicitly Phase 16.1 scope for the **listing** path.
- Nothing else changes: **no `format`, no `quality`, no `fetch_format`, no eager transform** is specified,
  so the format follows the input (`image/jpeg` from `toBlob`).
- **`overwrite: true` and `folder: "fitout/avatars"` and `public_id: userId` stay** (D-C: one canonical
  asset). This also means the delivery URL is stable across replacements — hence the `invalidate: true` in
  §C11 mattering.

**The two false comments must ship their correction in the same commit** (16-UI-SPEC § Surface contracts 5):
`src/app/actions/avatar.ts:9-10` currently says *"Cloudinary's transformation additionally normalizes to
400x400 face-cropped, so a hostile aspect ratio cannot blow up storage"* — read first-hand; and
`src/lib/cloudinary.ts:1-9`'s header describes the avatar path without mentioning that bytes now arrive
pre-framed.

---

# D. The repo's own gates and patterns (what the plan must budget)

## D13. `responsive-dialog.tsx` — current props, exact DOM, and the six adopters

**Current `ResponsiveDialogProps`, read in full from `src/components/patterns/responsive-dialog.tsx:138-201`:**

| Prop | Type | Default |
|---|---|---|
| `open` | `boolean?` | — |
| `onOpenChange` | `((open: boolean) => void)?` | — |
| `trigger` | `ReactNode?` | — |
| `title` | `string` (**required**, no default) | — |
| `hideTitle` | `boolean?` | `false` |
| `description` | `string?` | — |
| `children` | `ReactNode?` | — |
| `footer` | `ReactNode?` | — |
| `closeLabel` | `string?` | — |
| `onCloseAutoFocus` | `((event: Event) => void)?` | `undefined` |

**Exact DOM it renders (`:227-260`):**

```
<Dialog open onOpenChange>
  [trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>]
  <DialogContent
      data-testid="responsive-dialog"
      className={SHEET_PRESENTATION}                 // 8 max-sm: classes, :121-136
      showCloseButton={closeLabel === undefined}
      onCloseAutoFocus={onCloseAutoFocus}
      {...(description ? {} : { "aria-describedby": undefined })}>
    <DialogHeader className={hideTitle ? "sr-only" : undefined}>
      <DialogTitle>{title}</DialogTitle>
      [description && <DialogDescription>{description}</DialogDescription>]
    </DialogHeader>
    [closeLabel !== undefined && <DialogClose asChild><Button variant="ghost" size="icon-sm" className="absolute top-2 right-2">…</Button></DialogClose>]
    {children}
    [footer && <DialogFooter className="max-sm:rounded-b-none">{footer}</DialogFooter>]
  </DialogContent>
</Dialog>
```

Underlying vendored geometry, read at `src/components/ui/dialog.tsx`:
- `:73` `DialogContent` — `fixed top-1/2 left-1/2 z-(--z-dialog) grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm … sm:max-w-sm …`
- `:62` `showCloseButton = true` default
- `:119` `DialogFooter` — `-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end`
- `:142` `DialogTitle` — `font-heading text-base leading-none font-medium`
- `DialogDescription` — `text-sm text-muted-foreground …`

**Every Δ1/Δ2/Δ11 measurement in the 16-UI-SPEC reproduces.** `sm:max-w-sm` = 384px; `p-4` = 32px total
horizontal; `grid gap-4` = the 16px header/body/footer rhythm; `flex-col-reverse … sm:flex-row` is the
DOM-vs-visual inversion Δ5b reasons from.

### The two additive props

**`onOpenAutoFocus?: (event: Event) => void` (Δ5b) — required.** It is the exact structural twin of
`onCloseAutoFocus`, forwarded verbatim to `DialogContent`, defaulting `undefined`. Two sentences of
justification already exist in the file's own idiom (`:186-199`), and the new prop's docblock should follow
that shape: *Radix's own behaviour is correct for most adopters; this is here for the ones it is not.*

**`dismissLocked?: boolean` (Open Q16) — do NOT add it in this phase.** Δ3's contract is the single
`onOpenChange` guard, and Δ3 records the trade (a briefly-inert `×`) as accepted. Adding the prop
pre-emptively would ship an unused branch on a shared pattern. The 16-UI-SPEC already names it as a
**named reversal**, and that is the right place for it. *If* UAT calls the inert `×` a defect, it is a
five-line change: `dismissLocked?: boolean` → `showCloseButton={closeLabel === undefined && !dismissLocked}`.

### What must be asserted so every existing adopter stays byte-unchanged

**Six adopters, enumerated** (`grep -rn "ResponsiveDialog" src/ e2e/ tests/`, excluding the pattern file
itself and prose mentions):

| # | File | Line(s) | Usage |
|---|---|---|---|
| 1 | `src/app/dev/theme/page.tsx` | `:646-656` | the theme probe's demo overlay |
| 2 | `src/components/availability/blocks-editor.tsx` | `:205`, `:325-491` | **two** overlays in one file |
| 3 | `src/components/booking/booking-sticky-bar.tsx` | `:187-203` | the booking sheet (rendered unconditionally; only `trigger` is conditional — see its `:55` note) |
| 4 | `src/components/host/request-row.tsx` | `:242` | the host decline/approve overlay |
| 5 | `src/components/patterns/site-chrome.tsx` | `:308-318` | the mobile nav drawer |

That is **5 files / 6 call sites**. (`photo-lightbox.tsx:73` names it only to record that D-45 makes the
lightbox *not* a `ResponsiveDialog`; `selector-contract.ts:439` and `visual-baselines.ts:484,503` are prose.)

**The assertion that makes "byte-unchanged" a fact rather than a hope, in decreasing order of value:**

1. **`git diff --exit-code` over the five adopter files** in the same task's verify command. Zero-cost,
   total, and it is the repo's own idiom (`15-VALIDATION.md` uses `git diff --exit-code` on pinned files
   in four rows).
2. **A rendering assertion that the default is inert:** render a `ResponsiveDialog` with **no**
   `onOpenAutoFocus`, open it, and assert focus lands where Radix puts it — i.e. that omitting the prop
   changes nothing. This is the guard-the-guard the repo writes everywhere; a prop that silently changed
   the default would pass a diff check on the *adopters* while breaking all six.
3. **The positive half:** with a handler that `preventDefault()`s and focuses a named button, assert that
   button is `document.activeElement`. This is the Δ5b mitigation itself, and it is jsdom-testable
   (Radix's focus management works under jsdom; §E).
4. **`e2e/mobile-booker-path.spec.ts` and `e2e/photo-lightbox.spec.ts`** already drive two of the adopters
   in a real browser and should be in the wave's verify command.

**The VRT consequence nobody has budgeted:** `listing-sheet` is a committed visual baseline
(`e2e/visual/surfaces.spec.ts-snapshots/listing-sheet-375-court-visual-linux.png`, verified present) and it
renders `ResponsiveDialog`. A prop addition that is genuinely default-inert changes no pixel — but that is a
claim, and the only thing that checks it is a baseline comparison run, which **cannot execute on this
machine** (§E, `playwright.config.ts` constructs the `visual` project only on Linux).

## D14. `npx shadcn add slider` — **no new dependency, but the emitted block goes red on two design gates on arrival**

**Fetched the actual registry item on 2026-08-25:**
`curl -sL https://ui.shadcn.com/r/styles/radix-nova/slider.json`. Verbatim content of the single emitted
file (`registry/radix-nova/ui/slider.tsx` → `src/components/ui/slider.tsx`):

```tsx
"use client"
import * as React from "react"
import { Slider as SliderPrimitive } from "radix-ui"
import { cn } from "@/registry/radix-nova/lib/utils"     // rewritten to @/lib/utils by the CLI

function Slider({ className, defaultValue, value, min = 0, max = 100, ...props }) {
  const _values = React.useMemo(() =>
    Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max],
    [value, defaultValue, min, max])
  return (
    <SliderPrimitive.Root data-slot="slider" defaultValue={defaultValue} value={value} min={min} max={max}
      className={cn("relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col", className)} {...props}>
      <SliderPrimitive.Track data-slot="slider-track"
        className="relative grow overflow-hidden rounded-full bg-muted data-horizontal:h-1 data-horizontal:w-full data-vertical:h-full data-vertical:w-1">
        <SliderPrimitive.Range data-slot="slider-range"
          className="absolute bg-primary select-none data-horizontal:h-full data-vertical:w-full" />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb data-slot="slider-thumb" key={index}
          className="relative block size-3 shrink-0 rounded-full border border-ring bg-white ring-ring/50 transition-[color,box-shadow] select-none after:absolute after:-inset-2 hover:ring-3 focus-visible:ring-3 focus-visible:outline-hidden active:ring-3 disabled:pointer-events-none disabled:opacity-50" />
      ))}
    </SliderPrimitive.Root>
  )
}
export { Slider }
```

### ✅ No new `package.json` dependency

`import { Slider as SliderPrimitive } from "radix-ui"` — the **unified** package, exactly as
`ui/progress.tsx:4` and `ui/switch.tsx:4` do (both read first-hand). And:

```
node -p "require('./node_modules/radix-ui/package.json').version"                              → 1.4.3
node -p "Object.keys(require('./node_modules/radix-ui/package.json').dependencies)
           .filter(d=>d.includes('slider'))"                                                    → [ '@radix-ui/react-slider' ]
```

> **`@radix-ui/react-slider` is already installed as a dependency of `radix-ui@1.4.3`.**
> `npx shadcn add slider` adds **zero** rows to `package.json`. The only `package.json` diff this phase
> produces is `react-easy-crop` — one line, argued under D-167.

### ❌ Four things about the emitted block that this repo's gates will reject or that the contract requires changed

| # | In the block | Gate / contract | What must happen |
|---|---|---|---|
| 1 | **`bg-white`** on the thumb | `config/design-leak-patterns.mjs` `white-black-class`: `\b${COLOUR_ROLE}-(?:white\|black)\b`, scope `LEAK_SCAN_PREFIXES = ["src/app/","src/components/"]` (`:218`) — and `src/components/ui/**` is **explicitly in scope** (D-17: *"THERE IS NO VENDORED EXEMPTION"*, `:24-29`). Measured: `grep -rn "bg-white\|bg-black\|text-black" src/` returns **nothing today**. | **Map to `bg-background`.** This is a token-mapping edit inside the same task that runs `shadcn add`, not a follow-up. |
| 2 | **`ring-ring/50`** on the thumb | `tests/design/focus-recipe.test.ts:115` declares `const HALF_ALPHA_RING = "ring-ring/50"` as *"the shadcn default this phase exists to delete"*, and `:375` collects every file containing it. Measured: `grep -rn "ring-ring/" src/` returns **nothing today**. It is also an undeclared diluted composite (`ring/50` is not among the 20 keys of `EXPECTED_DILUTED_TOKENS`). | **Delete the alpha.** The app-wide recipe is `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background` (`focus-recipe.test.ts:110-112`, sourced from `ui/button.tsx`). The thumb must carry **that**, not `ring-ring/50 … ring-3`. |
| 3 | **`after:-inset-2`** — the thumb's hit area | `size-3` (12px) + 8px on each side = **28px**. Δ12 requires **≥ 44px** for the thumb, and CROP-04 is *"cropping works on a real touch device"*. | **`after:-inset-4`** → 12 + 32 = **44px**. Note `-inset-4` is on the 4px grid (16px), so no arbitrary value is introduced. |
| 4 | `bg-primary` on the Range | **Fine, and Δ9 holds.** Verified: `globals.css:206` `--primary: oklch(0.205 0 0)` (court) and `:333` `oklch(0.24 0.03 190)` (grove) — near-black neutrals. The coral is `--brand`, which the block never names. | Nothing. The slider is neutral by construction, so Δ9's "zero accent" costs no edit. |

Two things the block gets **right** and that should not be "improved": `touch-none` on the Root (which is
what stops a thumb drag scrolling the sheet — the slider's own half of Δ4), and `data-disabled:opacity-50`
(which gives the F8 disabled row its treatment for free).

### ❌ One inventory the 16-UI-SPEC does not budget

`tests/design/leak.test.ts:331` — `expect(VENDORED_PRIMITIVES).toHaveLength(31)`, and its docblock
(`:319-330`) says in as many words that this number *"is what forced [`collapsible`] to be ADMITTED to the
gate instead of quietly appearing beside it."* Measured: `ls src/components/ui/ | wc -l` → **31**.

> **Adding `slider.tsx` makes it 32.** `leak.test.ts` **must** move in the same commit, with a
> `toContain("src/components/ui/slider.tsx")` line beside the count, exactly as `collapsible` got at `:339`.
> **This row is missing from the 16-UI-SPEC's Declared-inventory budget.**

*Checked and clear:* `dark-scope.test.ts:228` pins 13 vendored files with `dark:` hits and `:293` pins 44
occurrences — the slider block contains **zero** `dark:` utilities, so both stay. (Note: the 16-UI-SPEC's
prose *"the 56 vendored `dark:` utilities"* is stale against the measured 44/13.)

## D15. The declared-inventory budget — **measured values, and three rows the contract does not carry**

Everything below was counted programmatically or read at the cited line, on 2026-08-25.

| Inventory | File:line | **Measured today** | 16-UI-SPEC says | After Phase 16 |
|---|---|---|---|---|
| Accent uses | `src/lib/design/accent-uses.ts:212` `AccentUseCountIsTen` | **10** ✅ | 10 | **10 — untouched** (Δ9) |
| `variant="brand"` census | `tests/design/brand-recipe.test.ts:855` `expect(total).toBe(28)` | **28** ✅ | 28 | **28 — untouched** |
| Scoped conversions | `tests/design/brand-recipe.test.ts:664` `expect(total).toBe(19)` | **19** ✅ | 19 | **19 — untouched** |
| **Diluted tokens** | `tests/design/brand-recipe.test.ts:361` `EXPECTED_DILUTED_TOKENS` | **20 keys** ⚠ | *"21 shapes"* | **21** if §A5 route B; **20 — untouched** if route A |
| Live regions | `src/lib/design/live-regions.ts:343` + `:1661` `DeclaredFileCountIsTwentySix` | **26** ✅ (counted by script) | 26 | **28**, alias → `DeclaredFileCountIsTwentyEight` |
| Selector contract | `src/lib/design/selector-contract.ts:119` `SELECTOR_IDS` (`"responsive-dialog"` at `:134`) | present | untouched | **untouched** (Δ18 — §A6 confirms the `aria-label` route works) |
| Measurements | `src/lib/design/measurements.ts:50`, `:365` | `RESULT_CARD_MEDIA = "aspect-[4/3]"`, `MOSAIC_ASPECT = "aspect-[16/9]"` ✅ | untouched | **untouched — read only** |
| Sheet absence | `tests/design/sheet-absent.test.ts:377-392` | 3-name deny-list; `ui/sheet.tsx` absent | untouched | **untouched** (§A1) |
| Theme-swap surfaces | `e2e/visual/theme-swap.spec.ts:181` `EXPECTED_COMPARED_SURFACES = 4`; `visual-baselines.ts` `ThemeContractSurfaceCountIsFour` | **4** ✅ | 4 | **4 — untouched** (Δ16) |
| Migrations | `drizzle/` | last is **`0025_audit_resolved_by.sql`** ✅ | 0025 | **0025** (GATE-06) |

### ⚠ **Correction: `EXPECTED_DILUTED_TOKENS` has 20 entries, not 21**

Counted by parsing the literal:
`background/80, brand/10, brand/30, destructive/10, destructive/20, destructive/30, destructive/40,
destructive/50, destructive/90, foreground/10, foreground/60, foreground/80, foreground/90, input/30,
input/50, input/80, muted/40, muted/50, primary/80, secondary/80` — **20**.
The 16-UI-SPEC's *"21 shapes"* is off by one. The **direction** of the delta (+1 row for `foreground/55`)
is unaffected; the arithmetic in a plan would be wrong.

**And the gate is bidirectional** (`brand-recipe.test.ts:1004-1019`): a declared key with no site in the
tree is *"dead weight … DELETE it rather than leave it"* and fails too. **So the row and the class must land
in the same commit**, and if §A5 route A (inline style) is taken instead, the row must **not** be added at
all. This is a real coupling between an implementation choice and an inventory edit.

### Three inventories Phase 16 moves that the contract does not list

| Inventory | Why it moves | Evidence |
|---|---|---|
| **`tests/design/leak.test.ts:331`** | 31 → **32** vendored primitives when `slider.tsx` lands | §D14 |
| **`tests/design/profile-pass.test.tsx`** | **four separate assertions** reddened by CROP-01/03 | §D16 below |
| **`src/lib/design/visual-baselines.ts`** | GATE-VRT baselines are a **closed, compile-gated inventory**: `SURFACE_IDS` (`:151`), `VISUAL_SURFACES` (`:254`), `VISUAL_BASELINES` (`:1118`) and `BaselineCountIsSeventyFour` (`:2232`, `extends 74`). Δ16 says the crop dialog and cover preview *"get court-only VR baselines"* — that is an **inventory move**, and its docblock at `:2225-2231` warns the count literal is **duplicated in `.github/workflows/baselines.yml`** and *"nothing will remind you."* Also: **`profile` is already a surface** (`SURFACE_IDS`), so its existing baselines are **invalidated** by the avatar-field restyle. | read first-hand |

**All three are `raise, don't absorb` candidates** per the 16-UI-SPEC's own closing line: *"If a planned task
would move a row not in this table, it has found something this contract did not."*

## D16. `"use server"` discipline — what the test enforces, exactly

`tests/use-server-exports.test.ts`, read in full (374 lines). It parses every `.ts`/`.tsx` under `src/` with
the **TypeScript compiler API** (`ts.createSourceFile`), not grep, and:

**Detects the directive** only in the module's **directive prologue** — a leading string-literal expression
statement (`hasUseServerDirective`, `:142-151`). Comments and later string literals are correctly ignored,
and there are self-tests for both (`:320-335`).

**Flags** (`findIllegalExports`, `:183-293`):
- `export function` / `export default function` without `async`
- `export const|let|var` whose initializer is **not** an `async` arrow or `async function` expression —
  `export const X = 5 * 1024` and `export const s = z.foo()` both flagged
- `export class`, `export enum`
- `export default <expr>` that is not an async function expression
- `export { a, b }` (no specifier) — each name resolved to its local declaration and re-checked
- **`export * from "./x"` and `export { a } from "./x"` — flagged unconditionally**, without resolving the
  target. Its own comment (`:91-95`): *"a re-export out of a `"use server"` file is the same violation as
  the original export, and it is exactly the shape a 'compatibility shim' would take while looking like a fix."*

**Exempts:** `export type`, `export interface`, `export type { … }` — types erase. This is why
`export type AvatarResult` at `actions/avatar.ts:34` is legal.

**Guard-the-guard** at `:315-318`: `serverModules.length > 10` and
`toContain("src/app/actions/avatar.ts")`.

> **So `removeAvatarAction` lands cleanly if and only if it is:**
> ```ts
> export async function removeAvatarAction(): Promise<AvatarRemoveResult> { … }
> ```
> **and `src/app/actions/avatar.ts` gains nothing else.** No constant, no schema, no `export { X } from …`,
> no `export const removeAvatarAction = async () => …` **wait** — that form *is* legal (`isAsyncFunctionExpression`
> accepts an async arrow). Both spellings pass. The failure shapes are: a `const` that is not an async
> function, any re-export, and a class/enum.
>
> **The result type goes in the same file as `export type`** (legal), or in `src/lib/avatar.ts`. Either works.
> **`AVATAR_*` copy literals and `AVATAR_MIN_SOURCE_PX` must NOT go there** — that is the incident the file's
> own header at `:19-27` records.

**One more thing the test does not cover, named because the header names it** (`:101-102`): *"This proves the
module's EXPORT SHAPE is legal. It does not prove the module evaluates."* Only `npm run build` does that.
`package.json`'s `build` script is `npm run lint && npm run test:design && next build`, so the phase's
build step is the real proof.

## D17. The existing avatar tests and `validation/profile.ts` — narrowing **extends**, and here is exactly why

`src/lib/validation/profile.ts:32-47`, read first-hand:

```ts
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const avatarFileSchema = z
  .instanceof(File, { message: "An image file is required." })
  .refine((f) => f.size > 0, { message: "The file is empty." })
  .refine((f) => f.type.startsWith("image/"), { message: "Only image files are allowed." })
  .refine((f) => f.size <= AVATAR_MAX_BYTES, { message: "Image must be 5 MB or smaller." });
```

`tests/profile/avatar.test.ts`, read in full (131 lines). What it asserts today:

| Line | Assertion | Survives narrowing? |
|---|---|---|
| `:75-77` | `avatarFileSchema.safeParse(fakeFile("image/png", 1024))` → `success === true` | **✅ yes** — `image/png` is inside the narrowed allow-list |
| `:80-82` | `fakeFile("application/pdf", 1024)` → `success === false` | ✅ yes |
| `:85-89` | `fakeFile("image/jpeg", AVATAR_MAX_BYTES + 1)` → `success === false` | ✅ yes — `image/jpeg` allowed, size still over |
| `:93-111` | real `uploadAvatarAction` with `fakeFile("image/png", 2048)` → stores `secure_url` + `public_id` | ✅ yes |
| `:113-121` | real action with `application/pdf` → `ok === false` | ✅ yes |
| `:123-130` | no session → `ok === false`, error matches `/signed in/i` | ✅ yes |

> **Every one of the six existing assertions survives.** Narrowing `image/*` → `{image/jpeg, image/png,
> image/webp}` is strictly a **restriction**, and no existing case uses a type outside the new set.
> `tests/profile/avatar.test.ts` needs **no edit** — which is exactly the *"extend it, never weaken it"*
> the 16-UI-SPEC asks for.

**What "extends" means concretely — three cases to ADD, none to change:**

| New case | Why it is the right one |
|---|---|
| `fakeFile("image/webp", 1024)` → accepted | The narrowed list must not be narrower than `AVATAR_HELPER` promises (Δ14 adds WebP to the copy). This is the assertion that keeps the copy and the schema honest. |
| `fakeFile("image/gif", 1024)` → **rejected** | The behaviour change itself. Under the shipped `startsWith("image/")` this **passes**; under the narrowed list it must not. **Watch this red first** — it is the only case that proves the narrowing happened. |
| `fakeFile("image/svg+xml", 1024)` → **rejected** | The security half. 999.2 § 2e: *"Narrowing … also stops SVG reaching Cloudinary, which is a security tidy-up, not the reason."* SVG is a scriptable document. |

**The message stays `"Only image files are allowed."`** (`:43`). The 16-UI-SPEC's *"Reused verbatim"* table
pins it as the server-side backstop; the client shows `AVATAR_WRONG_TYPE_MESSAGE`. Changing the server
string would be an unnecessary copy churn on a UAT-passed literal.

**Note the environment cost:** `tests/profile/avatar.test.ts` runs under `vitest.config.ts`, which has
`globalSetup: tests/global-setup.ts` and requires a live `fitout_test` Postgres. It is **not** runnable
without `npm run db:up` + `npm run db:test:setup`.

### `tests/design/profile-pass.test.tsx` — four assertions this phase must move

This file is the AUTHUI-02 design gate and it was written *anticipating* Phase 16. Read first-hand:

| Site | What it asserts | Why Phase 16 reddens it |
|---|---|---|
| `:1062-1070` (case 10) | `form.scan.texts.filter(REMOVAL_WORDS)` is `[]`, where `REMOVAL_WORDS = /\b(remove\|removing\|delete\|deleting)\b/i` (`:445`). Its own message: *"⚠ WHEN CROP-03 LANDS THIS IS THE ASSERTION THAT REDDENS, AND THAT IS THE POINT — the plan adding the control must move this file and declare the new name here."* | `Remove photo` / `Removing…` arrive. **Designed to red.** |
| `:1152-1155` | The **rendered** `ProfileForm`'s control names contain no removal word | Reddens even if `AvatarField` is a separate file, because it renders inside `ProfileForm`. |
| `:1045-1057` (case 10) | `form.scan.fileInputs` has length **1** *in `profile-form.tsx`*, and `ariaLabels` contains `"Upload avatar"` **once** *in `profile-form.tsx`* — `FORM` is pinned at `:353` | **Extracting `AvatarField` into its own file moves the input out of the scanned file** and both go to zero. This is a *second*, independent red that the file's own comment does **not** anticipate. |
| `:397-423` `PINNED_COPY[FORM]` | Pins `"Uploading…"` and `"JPG or PNG, up to 5 MB. Optional."` and `"Upload photo"` byte-for-byte | Δ14 **retires** `Uploading…` and **changes** the helper. Both pins break. |

Also check, though likely clear: `:988-1016` (case 8) bans `variant="destructive"` **in `profile-form.tsx`**.
If `RemoveAvatarConfirm` is composed inside `profile-form.tsx` rather than inside `AvatarField`, case 8
reddens too. **Keeping the confirm inside `AvatarField` (a new file) avoids it** — which is an argument for
the 16-UI-SPEC's own file layout, not merely a consequence of it.

## D18. `photo-uploader.tsx` — the mount point, `photos[0]` during a reorder, and what must not move

Read in full (`src/components/listing/photo-uploader.tsx`, 380-ish lines; every line below opened).

**Where `CoverFramePreview` mounts.** The non-empty return is `:214-256`. Its children in order:
`:217-222` the reorder sentence + uploader row → `:224-243` `<DndContext>…</DndContext>` → `:245-253` the
conditional `Add N more…` `role="status"` line. The outer wrapper is `<div className="space-y-4">` at `:216`.

> **Insert between `</DndContext>` at `:243` and the `{photos.length < MIN_PHOTOS && …}` block at `:245`.**
> The wrapper's `space-y-4` supplies the 16px gutter — **do not add a margin at the call site.**
> This matches Δ4's placement contract exactly. `photos.length >= 1` is guaranteed at that point because
> `:198-210` early-returns the empty state, so **no `photos.length >= 1` guard is needed** — and adding one
> would be dead code that looks like a real branch.

**`photos[0]` during a dnd-kit reorder — measured from the state machine.** `commitOrder` (`:132-143`) is
**optimistic**:

```ts
const previous = photos;
setPhotos(repack(next));                 // ← the new order is committed to state IMMEDIATELY
const res = await reorderPhotos(listingId, next.map(p => p.id));
if (!res.ok) { setPhotos(previous); toast.error(res.error); }   // ← full revert on rejection
```

and `repack` (`:84-86`) rewrites `position` to the array index. `handleDragEnd` (`:145-152`) fires on
**drop**, not during the drag. So:

- **During the drag** — `photos` is unchanged, `photos[0]` is the old cover, and the preview shows the old
  cover. `PhotoTile` renders `opacity: 0.6` on the dragged tile (`:279`) but the array is untouched.
- **On drop** — `photos` updates synchronously before the await, so **the preview swaps to the new cover in
  the same render as the grid.** The 16-UI-SPEC's *"Follows the dnd-kit reorder live"* is satisfied for
  free.
- **On server rejection** — `setPhotos(previous)` reverts, and the preview reverts with it. Also free.
- **`photos[0]` is never undefined at the mount point**, per the early return above.
- **`photos[0].url` is the raw stored `secure_url`**, identical to what the real cover surfaces render.
  That is what makes the preview honest.

**What must stay byte-unchanged, with lines:**

| Region | Lines | Note |
|---|---|---|
| `CldUploadWidget` options | **`:174-194`** — `signatureEndpoint` `:175`, `options={{ folder, multiple: true, maxFiles: 20, sources: ["local","camera","url"] }}` `:176-181`, `onSuccess` `:182`, `onError` toast `:183-187`, the render-prop button `:189-193` | D-A. **`sources: ["url"]` and the absent `maxFileSize` are Phase 16.1's, not this phase's.** A plan that "tidies" either has left Phase 16. |
| The bespoke empty state | `:198-210` (`h2 text-lg font-medium` at `:202`) | Δ17 — out of scope, byte-unchanged. Note the 16-UI-SPEC cites `:198`; measured, the branch opens at `:198` and the `<h2>` is at `:202`. |
| The reorder sentence | `:218-220` | pinned literal |
| The `Add N more…` region | `:245-253`, `role="status"` + `aria-label={PHOTO_REQUIREMENT_REGION_NAME}` (`:81`, `:248`) | It is a **declared live region** — `photo-uploader.tsx` is already in `LIVE_REGION_FILES`. Its row is keyed `{file}#{kind}#{at}` where `at` is a **line number** (`live-regions.ts` `liveRegionKey`). **Inserting the preview above it shifts that line and breaks the key.** ⚠ |
| `PhotoTile`, the `Cover` badge (`:302`, `bg-foreground/80`), the drag handle (`:308-316`), the icon buttons | `:259-…` | GATE-NOREG |

> ⚠ **The line-shift hazard is real and is not in the contract.** `src/lib/design/live-regions.ts` keys every
> declared region on its **exact line number**, and `tests/design/live-regions.test.tsx` SCAN 2 (`:702-766`)
> reports declared-but-absent and present-but-undeclared **together**. Mounting `CoverFramePreview` at `:245`
> pushes the `role="status"` down by however many lines the block occupies, so **`photo-uploader.tsx`'s
> existing row must be re-keyed in the same commit** even though this phase authors no new region in that
> file. The same hazard applies to `profile-form.tsx`'s existing `role="alert"` row (`:152` today) if the
> avatar block is extracted.

---

# E. Validation Architecture

> **This heading is required verbatim.** `.planning/config.json` → `workflow.nyquist_validation: true`.

## Test Infrastructure

| Property | Value | Evidence |
|---|---|---|
| **Framework** | vitest **4.1.8** (two configs) + Playwright **1.60.0** | `package.json` |
| **Main config** | `vitest.config.ts` — `environment: "node"`, `setupFiles: ["tests/setup.ts"]`, `globalSetup: ["tests/global-setup.ts"]`, `hookTimeout: 120_000`, `testTimeout: 20_000`, excludes `tests/design/**` | read in full |
| **Design config** | `vitest.design.config.ts` — **no `setupFiles`, no `globalSetup`, therefore no Postgres**, includes `tests/design/**` only. Its header: *"If a design test ever needs a database, it is not a design test."* | read in full |
| **jsdom** | **29.1.1**, opted into per-file with `// @vitest-environment jsdom` | measured |
| **Quick run** | `npx vitest run <files>` (+ `--config vitest.design.config.ts` for design specs) | 15-VALIDATION house format |
| **Full suite** | `npm test` then `npm run test:design` — **sequential, never parallel** (they share `fitout_test`) | 15-VALIDATION |
| **Build gate** | `npm run build` = `npm run lint && npm run test:design && next build` | `package.json` |
| **Preconditions for `npm test`** | Docker up → `npm run db:up` → `npm run db:test:setup`. **Docker is not running on this box right now** (`docker ps` returned nothing). | measured |
| **Playwright projects** | `chromium` (`testMatch: "e2e/*.spec.ts"`) and `visual` (`e2e/visual/**`), the latter **constructed only when `process.platform === "linux"`** (`playwright.config.ts`, `RUN_VISUAL_PROJECT`). `updateSnapshots: "none"` **unconditionally**. | read in full |
| **This machine** | Windows 11. **The `visual` project does not exist here.** GATE-VRT is a CI-dispatch checkpoint, exactly as 15-11-02 was. | measured |

## ⚠ What jsdom **cannot** do — measured, not assumed

I probed the installed jsdom (`node` + `new JSDOM(...)`, jsdom **29.1.1**):

```
getContext('2d')          → null    ("Not implemented: … without installing the canvas npm package")
canvas.toBlob             → function   (…but with a null context it produces nothing useful)
createImageBitmap         → undefined
OffscreenCanvas           → undefined
ResizeObserver            → undefined
Image.prototype.decode    → undefined
URL.createObjectURL       → undefined
TouchEvent / PointerEvent → function  (constructors exist; there is no gesture recognition)
div.getBoundingClientRect().width → 0
```

**The consequence that decides this phase's validation shape.** `react-easy-crop` renders the crop-area
div — the one carrying `tabIndex`, the `aria-label`, the mask class and `data-testid="cropper"` — **only when
`this.state.cropSize` is truthy**, and `computeSizes` needs a non-zero `containerRef.getBoundingClientRect()`
**and** a loaded `<img>` with real naturals. In jsdom it gets neither.

> **In jsdom, the crop stage does not exist in the DOM.** `getByLabelText(AVATAR_POSITION_LABEL)` returns
> nothing. No amount of `waitFor` changes it. A test that "proves the stage renders" under Vitest would
> either be stubbing `getBoundingClientRect`, `Image`, `ResizeObserver` and `URL.createObjectURL` into a
> fiction, or asserting on the wrapper and calling it the stage.
>
> **The repo has stubbed `ResizeObserver` five times already** (`availability-calendar.test.tsx:77`,
> `week-strip.test.tsx:79`, `group-surface-shell.test.tsx:120`, `state08-alerts.test.tsx:82`) — so a
> ResizeObserver stub is idiomatic here. **`getBoundingClientRect` has never been stubbed**, and
> `tests/booking/confirmation-moment.test.ts:10` and `tests/design/scroll-area.test.ts:26` both record, in
> prose, that *"jsdom has no layout: every `getBoundingClientRect()` is zeros"* and refuse to pretend
> otherwise. **Follow that precedent: do not stub layout.**

**Therefore: everything geometric, gestural or pixel-bearing is Playwright or human. jsdom's honest job in
this phase is copy, structure, ARIA wiring, disabled state, focus, and the state machine around the
cropper — not the cropper.**

## Phase Requirements → Test Map

### CROP-01 — pre-upload framing, and the server stops re-framing

| # | Behaviour | Proof | Command | Exists? |
|---|---|---|---|---|
| 1 | Zero network calls before `Save photo` (F4) | **vitest+jsdom** — render `AvatarField`, fire a `change` with a `File`, assert `uploadAvatarAction` mock **not called**; assert it IS called after the confirm | `npx vitest run tests/profile/avatar-field.test.tsx` | ❌ **W0** |
| 2 | `avatarMaxZoom()` arithmetic, all 7 of IC-05's worked rows | **vitest unit** (pure fn, no DOM) | `npx vitest run tests/profile/avatar-zoom.test.ts` | ❌ **W0** |
| 3 | The four pre-dialog rejections render their exact literals on `/profile` with `role="alert"` and open **no** dialog | **vitest+jsdom** — `measureImage` mocked to resolve/reject | same file as #1 | ❌ **W0** |
| 4 | Soft-source (200–399px) opens the dialog with the **zoom row disabled** + `AVATAR_SOFT_SOURCE_NOTE` (F8) | **vitest+jsdom** — the `Slider` renders and can be asserted `disabled` even though the *stage* does not | same file | ❌ **W0** |
| 5 | Save failure keeps the dialog open with `role="alert"` (F5) | **vitest+jsdom** — action mock returns `{ok:false}` | same file | ❌ **W0** |
| 6 | Copy literals are single exports and match byte-for-byte | **vitest design** — import from `src/lib/avatar.ts`, compare to rendered text | `npx vitest run tests/design/avatar-copy.test.tsx --config vitest.design.config.ts` | ❌ **W0** |
| 7 | **The stage renders, pans, and reports a crop** | **Playwright E2E** — real layout, real decode | `npx playwright test e2e/avatar-crop.spec.ts --project=chromium` | ❌ **W0** |
| 8 | **`touch-action: none` is computed on the stage container (Δ4)** | **Playwright** `getComputedStyle` | same spec | ❌ **W0** |
| 9 | **The mask ring and scrim actually win the cascade (§A5)** | **Playwright** `getComputedStyle` on the crop area: `borderWidth === "2px"`, `color` resolves to the 55% foreground | same spec | ❌ **W0** |
| 10 | **`img.naturalWidth === mediaSize.naturalWidth`** on an EXIF-6 source | **Playwright** | same spec | ❌ **W0** |
| 11 | **EXIF-6: the saved bytes match the preview** | **Playwright** — sample a known pixel in the preview and in the decoded output Blob, assert equal | same spec | ❌ **W0** |
| 12 | Transparent PNG → white matte in the output; animated WebP → still first frame; 400×400 output on a 300px source | **Playwright** — decode the Blob and sample | same spec | ❌ **W0** |
| 13 | `cloudinary.ts:29` says `gravity: "center"` and the two false comments are corrected | **vitest unit** on the mocked Cloudinary call + `git grep` assertion | `npx vitest run tests/profile/avatar.test.ts` | ✅ (extend) |
| 14 | Designed loading/error states present in the a11y tree with a non-zero box (**GATE-STATES is a rendering assertion; D-131 says jsdom cannot catch this class**) | **Playwright** | same spec | ❌ **W0** |

### CROP-02 — the cover-frame preview

| # | Behaviour | Proof | Command | Exists? |
|---|---|---|---|---|
| 15 | Renders only when `photos.length >= 1`; absent in the empty state | **vitest+jsdom** on `PhotoUploader` | `npx vitest run tests/listing/cover-frame-preview.test.tsx` | ❌ **W0** |
| 16 | Both frames use `MOSAIC_ASPECT` / `RESULT_CARD_MEDIA` **imported**, and the preview source contains **no ratio literal** (Δ8) | **vitest design** — AST/source scan for `16 / 9`, `4/3`, `AspectRatio` in the preview file | `… --config vitest.design.config.ts` | ❌ **W0** |
| 17 | `CoverFramePreview` is **server-safe** — no hooks, no `"use client"`, no client-boundary import | **vitest design** — the repo already owns this shape in `tests/design/server-only-guards.test.ts` | same | ❌ **W0** |
| 18 | Follows `photos[0]` through a reorder | **vitest+jsdom** — call the move-up/move-down buttons (keyboard reorder at `:155-159`), assert the preview `src` swaps. **Not drag** — dnd-kit pointer drag needs layout. | same as #15 | ❌ **W0** |
| 19 | Widget options / empty state / reorder **byte-unchanged** | **CLI** — `git diff --exit-code` scoped to the pinned line ranges, plus `npx playwright test e2e/host-dashboard.spec.ts` | — | ✅ |

### CROP-03 — avatar removal

| # | Behaviour | Proof | Command | Exists? |
|---|---|---|---|---|
| 20 | `removeAvatarAction` nulls both columns **first**, then destroys; a destroy failure still returns `ok:true` | **vitest integration** (live `fitout_test`, Cloudinary mocked; `mockRejectedValueOnce` for the failure path) | `npx vitest run tests/profile/avatar-remove.test.ts` | ❌ **W0** |
| 21 | Session gate: no session → `ok:false` | same | same | ❌ **W0** |
| 22 | `"use server"` shape holds | **vitest design-adjacent** — already repo-wide | `npx vitest run tests/use-server-exports.test.ts` | ✅ |
| 23 | **Initial focus is `Keep photo`, never `Remove photo`** (Δ5b) | **vitest+jsdom** — Radix focus works under jsdom; this is the mitigation D-168 traded for | `npx vitest run tests/profile/avatar-field.test.tsx` | ❌ **W0** |
| 24 | Footer DOM order is `Remove photo` then `Keep photo` (Δ5b) | **vitest+jsdom** — `within(footer).getAllByRole("button")` order | same | ❌ **W0** |
| 25 | Pending: `Removing…`, both disabled, `onOpenChange` guard makes all three dismiss affordances inert (Δ3) | **vitest+jsdom** for the labels/disabled; **Playwright** for the `×` and overlay click | both | ❌ **W0** |
| 26 | `onOpenAutoFocus` default is inert — every existing adopter byte-unchanged (Δ5b) | **vitest+jsdom** guard-the-guard + `git diff --exit-code` over the 5 adopter files + `npx playwright test e2e/mobile-booker-path.spec.ts e2e/photo-lightbox.spec.ts` | `npx vitest run tests/design/responsive-dialog-autofocus.test.tsx --config vitest.design.config.ts` | ❌ **W0** |
| 27 | `profile-pass.test.tsx`'s four assertions moved **and watched red first** | **vitest design** | `npx vitest run tests/design/profile-pass.test.tsx --config vitest.design.config.ts` | ✅ (edit) |

### CROP-04 — real touch hardware

| # | Behaviour | Proof |
|---|---|---|
| 28 | drag-pan · pinch-zoom · slider · a vertical drag on a viewport short enough that the sheet scrolls · **cancel → re-pick the same file → the cropper re-opens** · removal | **HUMAN HARDWARE WALK ONLY (D-175).** |

> **What Playwright *can* do, and why it still does not discharge CROP-04.** `page.touchscreen.tap()`,
> `hasTouch: true` and CDP touch emulation can synthesise `touchstart`/`touchmove`/`touchend`, so a
> Playwright test **can** exercise the library's two-finger touch path and **can** verify the `touch-action`
> computed style. What it **cannot** reach: Safari's `gesturestart`/`gesturechange` events (§A3 — the
> library has a *separate* code path for them that no emulator fires), real finger occlusion of a 183px
> stage, real momentum/rubber-banding on iOS, and the OS file picker that D-174's re-pick bug lives in
> (`input.value` reset behaviour differs between a synthesised `change` and a real picker re-selection).
> **D-175 forbids claiming CROP-04 from a Playwright run, and the mechanics agree with the decision.**

### D-165 — provenance (folded)

| # | Behaviour | Proof | Command | Exists? |
|---|---|---|---|---|
| 29 | The pure validator accepts every legitimate shape and rejects the attacker set (suffix host, query-string host, `http:`, `..` traversal, wrong listing, prefix-only) | **vitest unit** — explicit `cloudName` argument, `process.env` untouched | `npx vitest run tests/listing/cloudinary-provenance.test.ts` | ❌ **W0** |
| 30 | `persistPhoto` rejects with the shipped literal and **writes no row** | **vitest integration** | `npx vitest run tests/listing/photos.test.ts` | ✅ (**8 fixtures rewritten**) |
| 31 | **Fail-closed when `CLOUDINARY_CLOUD_NAME` is absent** — the CI condition | **vitest unit** — delete the env var, assert rejection | same as #29 | ❌ **W0** |
| 32 | `drizzle/` still ends at `0025` (GATE-06) | **CLI** — `ls drizzle/*.sql \| tail -1` | — | ✅ |

### Cross-cutting gates

| Gate | Proof | Where |
|---|---|---|
| **GATE-RESP** | 320px-up, nothing wraps or overflows, on `/profile` **with the crop dialog open** and on the wizard photos step | `e2e/overflow-320.spec.ts` already carries a `/profile` row with a real signup resolver (`:200-239`) — **extend it with the dialog-open state** rather than writing a second spec |
| **GATE-A11Y** | axe pass **court only** (D-138); keyboard operability including arrow-key pan; visible DS-05 focus on every control | Playwright + the design contrast table |
| **GATE-STATES** | rendering assertion, non-zero bounding box, real browser | Playwright (#14) |
| **GATE-VRT** | **court-only** baselines for the crop dialog + cover preview; **plus regeneration of the existing `profile` baselines**; **no** row in `theme-swap.spec.ts` (Δ16) | ⚠ **CI dispatch checkpoint** — the `visual` project does not exist on Windows |
| **GATE-NOREG** | selector inventory green; `"use server"` AST test green; price-parity e2e green; `git diff --exit-code` over the 5 `ResponsiveDialog` adopters and the pinned `photo-uploader.tsx` ranges | `npm run test:design` + `npx playwright test e2e/price-parity.spec.ts` |

## Sampling Rate

- **Per task commit:** the task's own command — a `vitest run <file>` or a `vitest run … --config vitest.design.config.ts`. Design-config runs need **no database** and are the fastest signal in the repo.
- **Per wave merge:** `npm test` then `npm run test:design`, **sequential** (they share `fitout_test`).
- **Phase gate:** `npm run build` (which is `lint && test:design && next build`) + the full Playwright `chromium` project + the CI baselines dispatch + the CROP-04 hardware walk.
- **Max feedback latency:** 180 s, matching 15-VALIDATION.

## Wave 0 Gaps

**Test files:**
- [ ] `tests/profile/avatar-zoom.test.ts` — pure `avatarMaxZoom` arithmetic (design config; no DB)
- [ ] `tests/profile/avatar-field.test.tsx` — jsdom: guards, no-network-before-confirm, disabled zoom row, save failure, removal focus/order/pending
- [ ] `tests/profile/avatar-remove.test.ts` — integration: null-first ordering, destroy-failure tolerance, session gate
- [ ] `tests/design/avatar-copy.test.tsx` — the exported-literal contract
- [ ] `tests/design/responsive-dialog-autofocus.test.tsx` — the additive prop's default-inert guard **and** its positive half
- [ ] `tests/listing/cover-frame-preview.test.tsx` — jsdom: visibility, imported-class, server-safety, reorder-follow
- [ ] `tests/listing/cloudinary-provenance.test.ts` — the pure validator + the absent-env fail-closed case
- [ ] `e2e/avatar-crop.spec.ts` — **the only place the stage actually exists**: geometry, `touch-action`, cascade win, EXIF, matte, still-frame, 400×400, GATE-STATES

**Image fixtures — none exist in this repo.** `find tests e2e -name "*.jpg" -o -name "*.png" …` returns only
`e2e/visual/surfaces.spec.ts-snapshots/*.png` (VRT baselines). Every one of these must be created and
committed, small and deterministic:

- [ ] `e2e/fixtures/exif-orientation-6.jpg` — landscape-encoded, portrait-intent, one coloured corner block so the wrong orientation is unmistakable. **The named acceptance criterion.**
- [ ] `e2e/fixtures/transparent.png` — alpha in a known region, to prove the white matte
- [ ] `e2e/fixtures/panorama-4000x500.jpg` (or a smaller proportional stand-in) — pans one axis, pinned on the other
- [ ] `e2e/fixtures/portrait-strip-500x4000.jpg` — axes swapped
- [ ] `e2e/fixtures/square-400.png` — `maxZoom === 1`, zoom row disabled
- [ ] `e2e/fixtures/small-300.png` — 200–399, soft-source note
- [ ] `e2e/fixtures/tiny-150.png` — below `AVATAR_MIN_SOURCE_PX`, refused before the dialog
- [ ] `e2e/fixtures/animated.webp` — still first frame
- [ ] `e2e/fixtures/corrupt.jpg` — truncated bytes with a valid extension, for `AVATAR_UNREADABLE_MESSAGE`
- [ ] `e2e/fixtures/tiny.gif` + `e2e/fixtures/tiny.svg` — the two new type-rejection cases

*(Generate them with a committed `scripts/` helper rather than by hand, so the EXIF byte is auditable rather
than magic.)*

**Inventory moves (each watched red first, each in the same commit as the code that made it true):**
- [ ] `tests/design/leak.test.ts:331` — 31 → 32 + `toContain("src/components/ui/slider.tsx")`
- [ ] `src/lib/design/live-regions.ts` — 26 → 28 files, alias → `DeclaredFileCountIsTwentyEight`, **plus re-keying the two existing rows whose line numbers shift**
- [ ] `tests/design/brand-recipe.test.ts:361` — `EXPECTED_DILUTED_TOKENS` **20 → 21** (`foreground/55`), *only if §A5 route B is taken*
- [ ] `tests/design/profile-pass.test.tsx` — four assertions (`:1045`, `:1062`, `:1152`, `PINNED_COPY` at `:397`)
- [ ] `tests/listing/photos.test.ts` — 8 `persistPhoto` fixtures rewritten to legitimate shapes
- [ ] `src/lib/design/visual-baselines.ts` + `.github/workflows/baselines.yml` — **only if** new VRT rows are added; `BaselineCountIsSeventyFour` moves and the workflow literal must move with it

**UAT document:**
- [ ] `16-UAT-CROP.md`, mirroring `15-UAT-EMAIL.md` — see below.

## The CROP-04 UAT document — mirroring how EMAIL-03 was discharged

Read `.planning/phases/15-auth-profile-transactional-email/15-UAT-EMAIL.md` and
`15-VALIDATION.md` § Manual-Only Verifications. The house conventions to copy, in order:

1. **A blocking `manual checkpoint` row in the validation table** with a dash in the *Automated Command*
   column and *"operator walk recorded in 16-UAT-CROP.md"* as the deliverable — exactly `15-05-03`'s shape.
2. **A header block naming the operator, the requirement, and the decisions in force** (here: D-167, D-173,
   D-174, D-175, Δ4).
3. **A coverage matrix with a column per device**, and **an unavailable device recorded as a named row, not
   omitted** — 15's fourth column reads `BLOCKED — client access (D-163)`. The convention is stated in that
   file as *"an inventory somebody can work from, never a gap dressed as coverage."* For CROP-04 the axis is
   **{iOS Safari, Android Chrome}** at minimum, because §A3 established that iOS pinch runs a **different
   code path** (`gesturestart`) from Android's. **One device does not discharge CROP-04.**
4. **A per-step table** — one row per walked gesture, with an observation cell that stays **empty** until a
   human fills it. 15's dry-run block is the model: *"This proves composition, not delivery, and discharges
   nothing in the tables below."*
5. **Screenshots live outside the repo**, in the session scratchpad, and are referenced by path.
6. **An explicit acceptance line, dated when given.** 15's: *"EMAIL-03 is NOT ticked complete until either
   Outlook desktop is opened, or the PM explicitly accepts the gap at phase close."*
7. **The lesson 15 recorded at its own close, which applies verbatim here:** CROP-04 is **conjunctive** —
   drag-pan **and** pinch **and** slider **and** the short-viewport vertical drag **and** cancel→re-pick
   **and** removal. Ticking it because "every mapped row is green" is only sound when the map covers every
   clause. **The walk table must have one row per clause.**

The six rows, from 16-UI-SPEC § Screen/State Contract:

| # | Step | What must be observed |
|---|---|---|
| 1 | One-finger drag on the stage | the photo pans; **the sheet does not scroll** |
| 2 | Two-finger pinch | zoom changes; the slider thumb tracks it |
| 3 | Slider drag | zoom changes; the thumb is reachable with a thumb (≥44px) |
| 4 | Vertical drag on a **short** phone (≤568px tall) where the sheet genuinely scrolls | the stage pans; the sheet still scrolls when dragged from the header/footer (**Δ4**) |
| 5 | Cancel → re-pick the **identical** file | the cropper **re-opens** (**D-174**) |
| 6 | Remove photo → confirm | initials return; `Keep photo` was the focused action on open |

---

## Security Domain

`workflow.security_enforcement: true`, `security_asvs_level: 1`.

### Applicable ASVS categories

| Category | Applies | Standard control, as it lands here |
|---|---|---|
| **V2 Authentication** | yes | Both new actions gate on `auth.api.getSession({ headers })` and write to `session.user.id` — never a client-supplied id. `uploadAvatarAction` (`actions/avatar.ts:45-50`) is the shape to copy verbatim for `removeAvatarAction`. |
| **V3 Session Management** | no change | Better Auth; untouched. |
| **V4 Access Control** | yes | **This is D-165's whole content.** `persistPhoto` already gates session + `assertOwnership` (`listing-photo.ts:84-91`); what it does not do is validate the *object* being pointed at. D-165 closes the gap between "you own the listing" and "the thing you are attaching came from us." |
| **V5 Input Validation** | yes | zod 4 (`avatarFileSchema`) for the file; a **parsed-URL** check (`new URL()`), never a substring match, for the provenance origin; an explicit `..` rejection for the public-id prefix. |
| **V6 Cryptography** | no | Nothing cryptographic is added. `signUploadParams` / `ALLOWED_SIGN_KEYS` are **untouched**. |
| **V12 File & Resource** | yes | The type narrowing (`image/*` → three types) removes SVG from the avatar path. Byte size remains at 5 MB server-side. **Pixel-dimension limits stay Phase 16.1** — D-171 keeps the server transform precisely because that hole is open. |

### Threat patterns for this stack

| Pattern | STRIDE | Mitigation, as measured |
|---|---|---|
| Client-supplied `url` rendered as `<img src>` on a **public** listing page | **Spoofing / Tampering** | D-165. This is the phase's one real vulnerability fix: `listing-photo.ts:93-97` accepts any non-empty string today. |
| Public-id traversal within a legitimate prefix (`fitout/listings/<id>/../../avatars/victim`) | **Tampering** | Explicit `..` rejection (§C9). A `startsWith` alone does not cover it. |
| **Fail-open validator when `CLOUDINARY_CLOUD_NAME` is unset** | **Elevation / Tampering** | §C10 — CI holds no Cloudinary credential. **Fail closed, and test the closed path.** This is the highest-likelihood way D-165 ships as a no-op. |
| SVG uploaded as an avatar (scriptable document served from our origin) | **XSS** | The type narrowing (§D17). |
| Decompression bomb via `uploadAvatarAction` bypassing the cropper | **DoS** | **Not fixed here, and deliberately.** `avatarFileSchema` checks type + bytes but not pixels; `cloudinary.ts:29`'s kept transform is the bounded-storage backstop (D-171). Pixel guards are Phase 16.1. Naming it keeps the residual risk on the record rather than implied-fixed. |
| Orphaned Cloudinary asset after a failed destroy | **Repudiation / cost** | Knowingly tolerated by D-169, logged, swept by Phase 16.1's orphan audit. |
| Signed-param widening | **Elevation** | Explicitly out of scope: `ALLOWED_SIGN_KEYS` (`sign/route.ts:35`) is **untouched**. A plan editing it has left Phase 16. |

---

## Package Legitimacy Audit

**slopcheck** installed via `pip install slopcheck --break-system-packages`; run as
`python -m slopcheck install react-easy-crop normalize-wheel`. It produced its verdicts and then crashed
launching `npm` as a subprocess on Windows — **the audit completed, the install did not run**. Verified
after: `git status --porcelain package.json package-lock.json` empty, `node_modules/react-easy-crop` absent.

| Package | Registry | Age | Downloads/wk | Source repo | slopcheck | Disposition |
|---|---|---|---|---|---|---|
| `react-easy-crop@6.2.3` | npm | first published **2018-06-19** (~8 yrs); 6.2.3 modified **2026-08-11** | **3,100,740** | `github.com/ValentinH/react-easy-crop` | **[OK]** | **Approved** |
| `normalize-wheel@1.0.1` (transitive) | npm | first published **2016-06-06** (~10 yrs) | **3,177,982** | *(none linked — slopcheck note: "No source repository linked. Harder to verify what this code actually does.")* | **[OK]** | **Approved — transitive only, never a direct dependency** |

Raw slopcheck output:
```
  [OK] normalize-wheel (npm)
    > No source repository linked. Harder to verify what this code actually does.
  [OK] react-easy-crop (npm)
==================================================
  scanned 2 packages
  2 OK
```

**Packages removed due to `[SLOP]`:** none.
**Packages flagged `[SUS]`:** none. `normalize-wheel`'s missing repository field is noted rather than
flagged — it is a decade-old Facebook-lineage utility at 3.1M weekly downloads and it is **not a direct
dependency**; it arrives only under `react-easy-crop`, whose own repo is linked and whose sole maintainer
(`valentinhervieu`) is the library's author.

**Postinstall scan:** `npm view react-easy-crop scripts.postinstall` → `undefined`.
`npm view normalize-wheel scripts` → `{ test: 'echo "Error: no test specified" && exit 1' }` — no install
hooks in either.

**Registry existence, correct ecosystem:** `npm view react-easy-crop version` → `6.2.3`;
`npm view normalize-wheel version` → `1.0.1`. Both npm, which is the correct registry for a Node/Next phase.

**Provenance of the name:** `react-easy-crop` was nominated by `999.2-UI-SPEC.md` (a prior researcher's
vetting table, 2026-08-10) and re-verified by `16-UI-SPEC.md` (2026-08-25), then independently confirmed
here by downloading and reading the tarball. It is not a name pulled from training data. Combined with the
`[OK]` slopcheck verdict, the linked source repo and 3.1M weekly downloads:
**`[VERIFIED: npm registry]`**.

**`@radix-ui/react-slider`:** not a new dependency at all — already installed transitively under
`radix-ui@1.4.3` (verified: `node -p "Object.keys(require('./node_modules/radix-ui/package.json').dependencies).filter(d=>d.includes('slider'))"` → `[ '@radix-ui/react-slider' ]`). No audit required.

**Net `package.json` diff for this phase: one line.**

---

## Open Risks for the Planner

Ordered by how much a plan would be hurt by not knowing.

**R1 — D-165 fails open in CI unless designed against it.** `.github/workflows/ci.yml:151,875` states the
test jobs hold **no Cloudinary credential**, and `.env.local` is gitignored. `CLOUDINARY_CLOUD_NAME` is
`undefined` in CI. A validator that skips when the env is absent is **dead in the only place it is
continuously run** — the same defect shape as the `"use server"` incident. **Design: pure function taking
`cloudName`, action fails closed, tests inject.** §C10.

**R2 — D-165 breaks 8 existing `persistPhoto` fixtures** in `tests/listing/photos.test.ts`
(`:88,105,106,107,118,119,120,142,143,160,161,162` — 8 distinct synthetic pairs). Not optional, not
incidental. §C10.

**R3 — the diluted-token row is coupled to an implementation choice the contract has not made.**
`EXPECTED_DILUTED_TOKENS` is **20 today, not the 21 the 16-UI-SPEC states**, and the gate is
**bidirectional** — a declared key with no site in the tree fails just as loudly as an undeclared site. If
the scrim ships as `classes.cropAreaClassName="text-foreground/55"` the row must be added; if it ships as
`style.cropAreaStyle` (the §A5 fallback, which may be forced by the cascade-layer problem) it must **not**.
**The plan must pick the route before it writes the inventory task.**

**R4 — the stage wrapper carries two contradictory background contracts.** 999.2 § 2b says the stage backing
is `bg-muted` (*"visible only as letterboxing when the source's aspect is extreme"*); Δ7 says the matte
behind the mask is `bg-background`. They are the **same element** — `.reactEasyCrop_Container` is
`position:absolute; inset:0` with no background of its own, so whatever the wrapper paints is what shows
both in the letterbox bars *and* through a transparent PNG. **You cannot have both.** Recommendation:
**`bg-background`** wins, because IC-02's "the user sees the white matte before confirming" is a named
acceptance criterion and letterboxing is cosmetic. Raise it; do not silently pick one.

**R5 — 999.2 § 2g's keyboard contract conflicts with what `react-easy-crop@6.2.3` ships.** The library
already provides `tabIndex={0}`, arrow-key panning and `restrictPosition` clamping, and its **Shift is a
0.2× *fine* adjust**, not a 3× coarse one. 999.2 asks for 8px / Shift 24px. §A6. This is a **settled
accessibility section**, so amending it is the PM's call, not the executor's.

**R6 — GATE-VRT cannot be discharged on this machine, and it moves an inventory the contract does not
budget.** `playwright.config.ts` constructs the `visual` project only on Linux; `updateSnapshots: "none"`
is unconditional. And Δ16's "court-only baselines" means new rows in `SURFACE_IDS` / `VISUAL_SURFACES` /
`VISUAL_BASELINES`, moving `BaselineCountIsSeventyFour` (`visual-baselines.ts:2232`) — whose own docblock
warns the literal is **duplicated in `.github/workflows/baselines.yml`** and *"nothing will remind you."*
Separately, **`profile` is already a VRT surface**, so the avatar-field restyle **invalidates existing
baselines** whether or not new ones are added. This is a `manual checkpoint (blocking)` row, exactly like
15-11-02. §D15.

**R7 — the mask ring / scrim may lose the cascade.** The library's `<style>` is injected **unlayered** into
`document.head` at mount; Tailwind v4 utilities live in a cascade layer, and unlayered beats layered. Δ6's
`classes.cropAreaClassName` route is the right *intent* but is **not guaranteed** to win. §A5 gives the
fallback and the proof (a Playwright computed-style assertion). **Do not let this be discovered in UAT.**

**R8 — 999.2's `react-easy-crop` vetting table contains a factual error that a plan may propagate.** It says
*"no stylesheet import"*. The package **does** ship `react-easy-crop.css`; it is auto-injected, which is why
the practical conclusion survives. Δ6 also states 55% *"is `react-easy-crop`'s own default weight"* — the
measured default is **50%**. Neither error changes a decision, but a plan that repeats them as evidence is
citing something false.

**R9 — line-number coupling in `live-regions.ts`.** Rows are keyed `{file}#{kind}#{at}` where `at` is a
literal line number. Mounting `CoverFramePreview` above `photo-uploader.tsx`'s `role="status"` and
extracting the avatar block out of `profile-form.tsx` both **shift existing declared lines**, so two rows
this phase does not author must still be re-keyed. Not in the contract's budget. §D18.

**R10 — `tests/design/profile-pass.test.tsx` reddens in four places, and only one of them is anticipated by
its own comments.** The file predicts the `REMOVAL_WORDS` red at `:1062`. It does **not** predict that
extracting `AvatarField` into its own file empties `form.scan.fileInputs` and the `"Upload avatar"`
`ariaLabels` at `:1045-1057`, nor that `PINNED_COPY` breaks on `Uploading…` and the helper string. §D16.

**R11 — `npx shadcn add slider` ships two immediate gate violations and one contract violation.** `bg-white`
(leak gate, no vendored exemption), `ring-ring/50` (the literal string `focus-recipe.test.ts:115` exists to
delete), and a 28px thumb hit area against Δ12's 44px. **All three must be fixed in the same task that runs
the add**, or the phase's first commit is red. Plus `leak.test.ts:331` moves 31 → 32. §D14.

**R12 — the stage wrapper must be `position: relative`.** `.reactEasyCrop_Container` is `absolute; inset:0`
with no intrinsic size. Inside `ResponsiveDialog` the nearest positioned ancestor is `DialogContent`
(`fixed`), so an unpositioned wrapper makes the cropper fill the entire overlay. §A3. Cheap to get right,
confusing to debug.

**R13 — places a plan will be tempted to absorb Phase 16.1.** All of these are one line away from the work
this phase legitimately does, and all are **out of scope (D-164/D-166)**:
`photo-uploader.tsx:176-181`'s missing `maxFileSize` and `sources: ["url"]` (you will be reading those exact
lines to place the preview); `clientAllowedFormats` (you will be narrowing the *avatar* allow-list in the
same phase); a pixel-dimension check in `avatarFileSchema` (you will be writing a pixel guard on the client
and it will look symmetric); `ALLOWED_SIGN_KEYS` widening for an incoming transformation (you will be
reading `sign/route.ts:85` to pin the D-165 prefix); EXIF-GPS stripping on the listing path (you will be
solving EXIF orientation on the avatar path). **Each is a scope alarm to raise, never absorbed.**

**R14 — things I could not verify first-hand.**
- **Cloudinary's live folder mode for this account.** Docker is down and `.env.local` holds *"public-safe
  dummy Cloudinary values"*. §C9's conclusion rests on three agreeing Cloudinary doc pages plus the
  corroborating in-repo fixture at `tests/listing/photos.test.ts:89`. **Confidence MEDIUM-HIGH, not HIGH.**
  A single `curl` against the Admin API `config` endpoint (`folder_mode`) with real credentials would make
  it HIGH — worth one manual step before the D-165 test is pinned.
- **Whether Cloudinary short-circuits a geometrically-identity incoming transformation** (i.e. whether it
  re-encodes at all when `w_400,h_400,c_fill,g_center` is applied to an exactly-400×400 JPEG).
  **Unverified.** §C12 assumes it re-encodes, which is the safe assumption; no test should assert byte
  equality either way.
- **Whether the injected `<style>` in fact wins over Tailwind in *this* build.** Reasoned from the cascade
  spec and from reading the injection code; **not observed in a browser** (no dev server, no Docker).
  §A5 route B carries its own Playwright proof for exactly this reason.
- **`npm test` and `npm run test:design` were not run** — the former needs Postgres (Docker down); the
  latter was not run to avoid a long uninstrumented run. `npx tsc --noEmit` **was** run: **exit 0**.

---

## Sources

### Primary (HIGH confidence — read first-hand in this session)
- The `react-easy-crop@6.2.3` tarball (`npm pack`, extracted to scratchpad): `index.d.ts`, `index.module.mjs`, `react-easy-crop.css`, `README.md`, `package.json`
- `npm view react-easy-crop --json` · `npm view normalize-wheel` · `api.npmjs.org/downloads/point/last-week/*`
- `python -m slopcheck install react-easy-crop normalize-wheel`
- FitOut source, every file cited by `file:line` above — notably `src/lib/cloudinary.ts`, `src/app/actions/listing-photo.ts`, `src/app/api/cloudinary/sign/route.ts`, `src/app/actions/avatar.ts`, `src/lib/validation/profile.ts`, `src/app/(app)/profile/profile-form.tsx`, `src/components/listing/photo-uploader.tsx`, `src/components/patterns/responsive-dialog.tsx`, `src/components/ui/dialog.tsx`, `src/components/ui/button.tsx`, `src/app/globals.css`, `src/lib/design/{measurements,live-regions,accent-uses,selector-contract,visual-baselines}.ts`, `config/design-leak-patterns.mjs`
- FitOut tests: `tests/use-server-exports.test.ts`, `tests/profile/avatar.test.ts`, `tests/design/{profile-pass,leak,focus-recipe,brand-recipe,sheet-absent,live-regions,dark-scope,skeleton-measurements}.test.*`, `tests/listing/photos.test.ts`, `tests/setup.ts`, `vitest.config.ts`, `vitest.design.config.ts`, `playwright.config.ts`
- `curl -sL https://ui.shadcn.com/r/styles/radix-nova/slider.json` — the exact registry block
- jsdom capability probe (`new JSDOM(...)` against the installed jsdom 29.1.1)
- `npx tsc --noEmit` → exit 0

### Secondary (HIGH — official documentation)
- cloudinary.com/documentation/folder_modes — dynamic folder mode default since 2024-06-04
- cloudinary.com/documentation/folder_modes_in_integrations — *"the equivalent of setting both `asset_folder` and `public_id_prefix` to the same value"*
- cloudinary.com/documentation/image_upload_api_reference — `folder`, `public_id`, extension rule
- cloudinary.com/documentation/image_transformations — delivery URL structure, version in `secure_url`, CNAME
- react.dev/blog/2024/04/25/react-19-upgrade-guide — `defaultProps` retained for class components
- MDN `createImageBitmap` — `imageOrientation` default `"from-image"`
- MDN `HTMLCanvasElement.toBlob` — quality argument
- bugzilla.mozilla.org/show_bug.cgi?id=1616169 — RESOLVED FIXED, Firefox 77

### Tertiary (MEDIUM — cross-referenced, not sole source)
- caniuse `mdn-api_createimagebitmap_options_imageorientation_parameter_from-image` — Chrome/Edge 112+, Firefox 111+, Safari 16+, ~92.8% global
- w3c/csswg-drafts#4666 — `image-orientation` and `drawImage`; the Chromium/WebKit behaviour statement
- MDN `drawImage` Notes — carries a stale hedge about *"some older browser versions"*; superseded by the Firefox bug and the CSSWG thread. **Flagged as stale rather than cited as fact.**

---

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|---|---|---|
| A1 | The Cloudinary account's `public_id` for a foldered widget upload is `fitout/listings/<id>/<name>` | §C9 | The D-165 prefix test is unwritable as specified. **Mitigation: one Admin API `config` call before pinning.** MEDIUM-HIGH confidence, documented three ways + one in-repo fixture. |
| A2 | Cloudinary re-encodes on a geometrically-identity incoming transformation | §C12 | Only affects what a test may claim; no test should assert byte equality either way. |
| A3 | The library's injected unlayered `<style>` beats Tailwind's layered utilities in this build | §A5 / R7 | Route B fails and route A is needed. **Mitigation: the Playwright computed-style assertion is in the map at #9.** |
| A4 | `page.touchscreen` / CDP cannot fire Safari `gesturestart` | §E | Would only mean Playwright covers *more* than claimed. Does not weaken D-175, which is a decision, not an inference. |
| A5 | `image-orientation: from-image` is the effective default on `<img>` in the target matrix, so `naturalWidth` is oriented | §B6 | The `naturalWidth === mediaSize.naturalWidth` invariant (#10) is a *runtime* check that catches it in whatever browser actually runs. |

---

*Phase: 16-image-crop-framing*
*Researched: 2026-08-25 · every `file:line` opened, every version command named*
*Repo state at research time: `npx tsc --noEmit` exit 0 · `package.json` unmodified · `drizzle/` at `0025`*
