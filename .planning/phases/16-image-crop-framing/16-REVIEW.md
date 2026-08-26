---
phase: 16-image-crop-framing
reviewed: 2026-08-25T17:27:16Z
depth: standard
files_reviewed: 36
files_reviewed_list:
  - e2e/avatar-crop.spec.ts
  - e2e/helpers/avatar-session.ts
  - e2e/helpers/overflow.ts
  - e2e/overflow-320.spec.ts
  - e2e/visual/surfaces.spec.ts
  - scripts/generate-image-fixtures.mjs
  - src/app/(app)/profile/profile-form.tsx
  - src/app/actions/avatar.ts
  - src/app/actions/listing-photo.ts
  - src/components/listing/cover-frame-preview.tsx
  - src/components/listing/photo-uploader.tsx
  - src/components/patterns/responsive-dialog.tsx
  - src/components/profile/avatar-field.tsx
  - src/components/profile/image-crop-dialog.tsx
  - src/components/ui/slider.tsx
  - src/lib/avatar-canvas.ts
  - src/lib/avatar.ts
  - src/lib/cloudinary.ts
  - src/lib/design/live-regions.ts
  - src/lib/design/visual-baselines.ts
  - src/lib/listing/cloudinary-provenance.ts
  - src/lib/listing/cover-frames.ts
  - src/lib/validation/profile.ts
  - tests/design/avatar-copy.test.tsx
  - tests/design/avatar-zoom.test.ts
  - tests/design/image-fixtures.test.ts
  - tests/design/leak.test.ts
  - tests/design/live-regions.test.tsx
  - tests/design/profile-pass.test.tsx
  - tests/design/responsive-dialog-autofocus.test.tsx
  - tests/listing/cloudinary-provenance.test.ts
  - tests/listing/cover-frame-preview.test.tsx
  - tests/listing/photos.test.ts
  - tests/profile/avatar-field.test.tsx
  - tests/profile/avatar-remove.test.ts
  - tests/profile/avatar.test.ts
findings:
  critical: 3
  warning: 10
  info: 2
  total: 15
status: all_findings_fixed
fixed: 2026-08-26
fix_record: 16-REVIEW-FIXES.md
---

# Phase 16: Code Review Report

**Reviewed:** 2026-08-25T17:27:16Z
**Depth:** standard
**Files Reviewed:** 36
**Status:** all_findings_fixed — see [16-REVIEW-FIXES.md](16-REVIEW-FIXES.md)

> **All 15 findings were closed on 2026-08-26** (commits `b7cbc55`..`37cf230`). Each fix was watched
> RED before acceptance; those readings are in the fix record. One prescription was deliberately not
> taken — CR-02's proposed anchor is reopened by a version segment placed after an `l_fetch:` overlay,
> so the shipped fix refuses the transformation DSL entirely. The findings below are preserved
> verbatim as the record of what was found.

## Summary

The phase is unusually well documented and the test suite is, on the whole, genuinely
non-vacuous — the `photos.test.ts` provenance cases, `avatar-remove.test.ts`'s
observe-inside-the-destroy trick, `avatar.test.ts`'s `uploadStreamSpy.mock.calls.length`
guard and `avatar-copy.test.tsx`'s "the guard actually ran" pairings all assert the call
happened, not just the answer. No clock-seeded geometry or snapshot assertion was
introduced (`Date.now()` reaches only the throwaway signup email). The two-pin count
`live-regions.ts` ↔ `live-regions.test.tsx` moved together (28/28), and
`visual-baselines.ts` ↔ `e2e/visual/surfaces.spec.ts` moved together (78/78), with
`EXPECTED_BLOCKED` updated as a third pin.

The defects that matter are on the trust and focus boundaries, not in the arithmetic:

1. The client-trust hole that D-165 was written to close for **listing photos** is still
   wide open on the **avatar** path, and the avatar is rendered as a plain `<img src>` on
   the public listing page. This phase touched every file on that path and did not close it.
2. `isOwnCloudinaryAsset` proves the url is *on our host under our cloud name*; it does not
   prove it *is the asset the publicId names*. Everything between `/image/upload/` and the
   end of the path is attacker-controlled.
3. The removal confirm loses focus to `<body>` on the success path — the exact defect
   `responsive-dialog.tsx:205-220` documents and supplies a prop for, on the one adopter
   whose trigger unmounts. Nothing in the suite reaches it: `e2e/avatar-crop.spec.ts:2461`
   opens the confirm and audits it, but never presses `Remove photo`.

The remainder are drift and robustness findings, several of which are the repo's own named
failure classes (two spellings of one constant, prose counts left behind by a literal).

## Critical Issues

### CR-01: `avatarUrl` is client-writable and rendered on a PUBLIC page — D-165's threat, unclosed on the avatar path

**File:** `src/lib/auth.ts:122-123` · `src/app/actions/avatar.ts:91-94` · `src/components/listing/host-block.tsx:97-102`

**Issue:** `avatarUrl` and `avatarPublicId` are declared as Better Auth `additionalFields`
with no `input: false`:

```ts
avatarUrl: { type: "string", required: false },      // Cloudinary secure_url.
avatarPublicId: { type: "string", required: false }, // for later delete/replace.
```

The file's own neighbours (`canBook`, `canHost`, `role`) carry `input: false` and the
comment beside them calls it "the privilege-escalation guard (Pitfall 2)". Without it,
Better Auth's `update-user` endpoint — mounted at `/api/auth/[...all]` — accepts both
fields from any signed-in user. `src/lib/profile.ts:8` classes `avatarUrl` as PUBLIC, and
`src/app/listings/[id]/(detail)/page.tsx:649` → `host-block.tsx:98` renders it as a plain
`<img src={avatarUrl}>` on the public listing page.

So a signed-in host can `POST /api/auth/update-user {"avatarUrl":"https://evil.tld/x.png"}`
and serve arbitrary third-party bytes under FitOut's product surface, and can also point
`avatarPublicId` at another user's or another listing's Cloudinary asset — which
`removeAvatarAction` (`avatar.ts:161-181`) will then `destroyAvatar()` on their behalf, a
cross-tenant delete primitive.

This is byte-for-byte the threat `cloudinary-provenance.ts:5-11` describes for
`persistPhoto` ("a host who skips the widget and calls the action directly could serve
arbitrary third-party content under FitOut's product surface"). The phase built the fix and
applied it to only one of the two paths. `uploadAvatarAction` being safe is not the
boundary: the boundary is the column, and Better Auth writes it too.

**Fix:**

```ts
// src/lib/auth.ts — both are Cloudinary results, never client input.
avatarUrl:      { type: "string", required: false, input: false },
avatarPublicId: { type: "string", required: false, input: false },
```

`uploadAvatarAction` / `removeAvatarAction` call `auth.api.updateUser` server-side with
`input: false` fields; confirm those still write (Better Auth honours `input:false` for the
client endpoint, not for server-side internal adapter writes — if `updateUser` refuses,
write the two columns through Drizzle in the action, which is the same trade
`listing-photo.ts` already makes). Add a regression case beside
`tests/profile/avatar-remove.test.ts` that drives `auth.api.updateUser({ body: { avatarUrl:
"https://evil.tld/x.png" } })` through the HTTP surface and asserts the column is unchanged.

### CR-02: `isOwnCloudinaryAsset` scopes the host but not the ASSET — the path after `/image/upload/` is fully attacker-controlled

**File:** `src/lib/listing/cloudinary-provenance.ts:105-111` (with the accepted residual argued at `:22-25`)

**Issue:** The url side of the guard ends at:

```ts
if (parsed.hostname !== DELIVERY_HOST) return false;
if (!parsed.pathname.startsWith(`/${cloudName}/image/upload/`)) return false;
```

Nothing constrains what follows. `tests/listing/cloudinary-provenance.test.ts:167-173`
confirms this is deliberate ("accepts a delivery url carrying a TRANSFORMATION segment"),
and the url is never required to contain `publicId` (`:22-25`). Two consequences, and the
docblock understates both:

1. **Unconditional.** The stored, publicly rendered url can name *any* asset in our
   Cloudinary account — another host's listing photos, or `fitout/avatars/<victim-userId>`.
   `:22-25` calls this "a cosmetic mix-up inside our own account". Putting another user's
   face on your own public listing is not cosmetic.

2. **Conditional on the account's fetch setting.** The comment at `:107-110` claims the
   `/image/upload/` prefix "Closes … the `fetch`/`twitter` delivery types that proxy an
   ARBITRARY REMOTE URL through our own cloud name — the one shape that would otherwise
   satisfy every check above while serving someone else's bytes." That claim is false.
   Cloudinary's remote-image *overlay* lives under `/image/upload/`, not `/image/fetch/`:

   ```
   https://res.cloudinary.com/<cloud>/image/upload/
       l_fetch:<base64url-of-https://evil.tld/x.png>,fl_layer_apply,w_2000,h_2000/
       fitout/listings/<own-listing-id>/legit.jpg
   ```

   That url passes every check in the function (https, exact host, correct tenant,
   `/image/upload/` prefix) and the `publicId` field can be the host's own legitimate,
   prefix-scoped id. The rendered bytes are `evil.tld`'s. Whether Cloudinary serves it
   depends on the account's *Allowed fetch domains* / *Restricted media types* settings —
   which is precisely the kind of ambient, off-repo condition a fail-closed validator must
   not depend on.

**Fix:** anchor the asset, which costs one comparison and closes both halves at once:

```ts
// The url must DELIVER the asset the publicId names. Everything between `/image/upload/`
// and the asset is Cloudinary's transformation language — which includes `l_fetch:`, a
// remote-image overlay — so a prefix test is a tenant check, not an asset check.
const assetPath = parsed.pathname.slice(`/${cloudName}/image/upload/`.length);
const segments = assetPath.split("/");
// Drop an optional leading transformation component and an optional `v<digits>` version.
const versionAt = segments.findIndex((s) => /^v\d+$/.test(s));
const tail = (versionAt === -1 ? segments : segments.slice(versionAt + 1)).join("/");
// `tail` is `<publicId>` or `<publicId>.<ext>` and nothing else.
if (tail !== publicId && !tail.startsWith(`${publicId}.`)) return false;
```

Add the rejection cases to `tests/listing/cloudinary-provenance.test.ts` beside the existing
`/image/fetch/` row: an `l_fetch:` overlay url, and a url naming `fitout/avatars/victim`
while the `publicId` is the caller's own. Keep the "accepts a delivery url carrying a
TRANSFORMATION segment" case green — the fix above still accepts `f_auto,q_auto/v1734/…`.

### CR-03: focus is dropped to `<body>` after a successful avatar removal

**File:** `src/components/profile/avatar-field.tsx:420-424` and `:364-368`

**Issue:** `handleRemove` closes the overlay and clears the avatar in one commit:

```ts
setRemoveOpen(false);
setAvatarUrl(null);
```

The whole `<ResponsiveDialog …>` — trigger included — is rendered only `{avatarUrl ? … :
null}` (`:420`), so `setAvatarUrl(null)` **unmounts the trigger in the same commit as the
close**. Radix's modal content composes
`onCloseAutoFocus = (e) => { e.preventDefault(); context.triggerRef.current?.focus(); }` and
passes it as `onUnmountAutoFocus` (verified in
`node_modules/@radix-ui/react-dialog/dist/index.mjs:146-149, 219`). By the time that cleanup
runs, React has detached the trigger's ref, so `triggerRef.current` is `null`, `?.focus()`
is a no-op, and `preventDefault()` has already suppressed the browser's own restore. Focus
lands on `<body>` and the next Tab restarts the page.

This is verbatim the case `responsive-dialog.tsx:205-220` documents and supplies
`onCloseAutoFocus` for — *"an adopter whose trigger is absent, **or whose trigger UNMOUNTS
while the overlay is open**, therefore gets the suppression with none of the restore … That
is a real WCAG failure … and nothing warns about it."* The file's own header (`:54-59`)
declines the prop on the reasoning that "the trigger is passed to the overlay, so Radix's
`triggerRef` is real" — true on the *cancel* path, false on the *success* path, which is
the one the control exists for. `ImageCropDialog` gets this right for the identical
unmount-while-open situation (`image-crop-dialog.tsx:271-274`, `:397`).

Nothing tests it: `e2e/avatar-crop.spec.ts:2461-2513` opens the confirm, asserts open-time
focus and runs axe, then walks the tab order — it never clicks `Remove photo`.
`tests/profile/avatar-field.test.tsx` drives the success path but asserts no focus.

**Fix:**

```tsx
// avatar-field.tsx
function returnFocusToPrimary(event: Event) {
  // The trigger unmounts in the same commit as a SUCCESSFUL removal (the control is
  // rendered only while there is a photo), so Radix's own trigger restore has nothing to
  // aim at. The primary control survives — it just relabels to `Upload photo`.
  event.preventDefault();
  primaryControl.current?.focus();
}

<ResponsiveDialog
  open={removeOpen}
  onOpenChange={handleRemoveOpenChange}
  onOpenAutoFocus={steerFocusToSafeAction}
  onCloseAutoFocus={returnFocusToPrimary}
  …
```

Then extend `e2e/avatar-crop.spec.ts`'s removal case past the audit: click
`AVATAR_REMOVE_CONFIRM`, wait for the initials fallback, and assert
`document.activeElement` is the `Upload photo` button rather than `<body>`.

## Warnings

### WR-01: the post-animation re-measure awaits EVERY animation in the document, including infinite ones

**File:** `src/components/profile/image-crop-dialog.tsx:337-359`

**Issue:** The effect that repairs the 5 %-shrunken crop rectangle does:

```ts
const running = document.getAnimations();
const settled = running.length === 0 ? Promise.resolve()
  : Promise.all(running.map((a) => a.finished.catch(() => undefined))).then(() => undefined);
void settled.then(() => { if (!cancelled) cropperRef.current?.computeSizes(); });
```

`document.getAnimations()` is document-wide and unfiltered. A single animation with
`iteration-count: infinite` anywhere in the tree — `ui/skeleton.tsx:7`'s `animate-pulse`,
`pending-payment-state.tsx:367` / `ui/sonner.tsx:49`'s `animate-spin` — never resolves
`finished`, so `Promise.all` never settles and `computeSizes()` is **never called**. The
effect's own docblock (`:298-305`) states what that costs: *"The saved avatar contains a
~5 % ring of the photograph that was never inside the circle … That is precisely the
divergence IC-02 exists to forbid."* There is also no timeout, so any long or stalled
animation delays the repair indefinitely.

`/profile` happens not to mount an infinite animation today, which makes this latent rather
than live — but the correctness of a stored asset should not rest on which unrelated
component is on screen.

**Fix:** ask only the overlay, and race a deadline:

```ts
const box = cropperRef.current instanceof Object
  ? document.querySelector('[data-testid="responsive-dialog"]') : null;
const running = (box?.getAnimations({ subtree: true }) ?? []).filter(
  (a) => (a.effect?.getComputedTiming().iterations ?? 1) !== Infinity,
);
const settled = Promise.race([
  Promise.all(running.map((a) => a.finished.catch(() => undefined))),
  new Promise((r) => setTimeout(r, 400)), // the entry animation is `duration-100`
]);
```

The existing e2e assertion pins the computed result rather than the mechanism, so it stays
green through the change.

### WR-02: `reorderPhotos` never validates `orderedIds` — duplicates or a subset raise an unhandled server error

**File:** `src/app/actions/listing-photo.ts:153-189`

**Issue:** `orderedIds` arrives from the client and is used raw. Duplicated ids write the
same row twice (final position = the last index), and a *subset* leaves the omitted rows at
their original positions. Either can collide with the `(listingId, position)` unique index
at statement end — e.g. photos `[a=0,b=1,c=2]` with `orderedIds = ["c"]` parks `c` at `-1`
then sets it to `0`, which `a` already holds. The transaction throws, and nothing catches
it: the action has no `try/catch`, so the rejection escapes the server action instead of
returning the `{ ok: false, error }` shape the caller (`photo-uploader.tsx:136-143`) is
written against — the optimistic UI never reverts.

**Fix:**

```ts
const ids = [...new Set(orderedIds)];
const rows = await db.select({ id: listingPhoto.id }).from(listingPhoto)
  .where(eq(listingPhoto.listingId, listingId));
const owned = new Set(rows.map((r) => r.id));
if (ids.length !== orderedIds.length || ids.length !== owned.size ||
    ids.some((id) => !owned.has(id))) {
  return { ok: false, error: "We couldn't reorder those photos. Please refresh and try again." };
}
try { await db.transaction(/* … */); }
catch { return { ok: false, error: "We couldn't reorder those photos. Please try again." }; }
```

### WR-03: the Cloudinary avatar transform hard-codes `400` beside `AVATAR_OUTPUT_PX`

**File:** `src/lib/cloudinary.ts:52`

**Issue:**

```ts
transformation: { width: 400, height: 400, crop: "fill", gravity: "center" },
```

`src/lib/avatar.ts:76-79` states the rule this violates: *"a hard-coded `400` anywhere else
in the phase silently breaks the derivation the day D-172's output size moves."* The header
this phase rewrote at `cloudinary.ts:9-19` rests its whole argument on the transform being
"arithmetically the identity" on the encoder's output; move `AVATAR_OUTPUT_PX` to 512 and
the transform silently *downsizes every avatar*, the header's claim becomes false, and
nothing goes red — `tests/profile/avatar.test.ts` pins the literal `400` on both sides too.

`src/lib/avatar.ts` is directive-free precisely so any module can read it, and
`cloudinary.ts` is server-only, so the import is free.

**Fix:**

```ts
import { AVATAR_OUTPUT_PX } from "@/lib/avatar";
// …
transformation: {
  width: AVATAR_OUTPUT_PX, height: AVATAR_OUTPUT_PX,
  crop: "fill", gravity: "center",
},
```

…and assert against the constant in `tests/profile/avatar.test.ts`'s `toEqual`.

### WR-04: `live-regions.ts` prose still says twenty-six/twenty-seven while the pinned count is 28

**File:** `src/lib/design/live-regions.ts:21`, `:327`, `:510`, `:520`

**Issue:** Both machine-checked pins moved correctly (`DeclaredFileCountIsTwentyEight` at
`:1719` and `DECLARED_FILE_COUNT = 28` in `tests/design/live-regions.test.tsx:285`). The
prose did not:

- `:21` — *"the set is TWENTY-SIX files"*
- `:327` — *"THE TWENTY-SIX FILES GATE-03 IS A CLAIM ABOUT"*
- `:510` — *"The declared SET is twenty-seven files"* ← edited by this phase, to the wrong number
- `:520` — *"The declared set is twenty-seven."* ← added by this phase

`:510` and `:520` are the pass-through value from plan 16-09; plan 16-10 moved the literal
to 28 and left the sentences at 27. This is the module's own stated failure class ("a stale
measured count in a gate's own header is the defect class Phase 15 exists to repair") — a
reader who trusts the prose over the literal will make the wrong edit next time.

**Fix:** update all four to twenty-eight, and consider deriving the prose count out of the
failure message instead of restating it.

### WR-05: the zoom slider is driven with `min === max`, which makes Radix emit `calc(NaN% + 0px)`

**File:** `src/components/profile/image-crop-dialog.tsx:557-565` · `src/components/ui/slider.tsx`

**Issue:** `maxZoom` initialises to `1` (`:240`) and stays `1` for every source whose shorter
side is ≤ `AVATAR_OUTPUT_PX`, so the slider is mounted with `min={1} max={1}`. Radix's thumb
position is then `calc(NaN% + 0px)`. `tests/profile/avatar-field.test.tsx:105-127` had to
monkey-patch `CSSStyleDeclaration`'s four physical-offset setters because *"jsdom's style
parser THROWS `SyntaxError: ")" is expected` … Radix's slider emits exactly that value
whenever `min === max`, which is the zoom row's resting state on every source smaller than
the output size — so without this the whole dialog unmounts mid-render."* A browser drops
the declaration silently, so the shipped symptom is an unpositioned (visually
left-anchored) disabled thumb rather than a crash — but a NaN in a rendered style is a
defect the harness is currently absorbing on the component's behalf.

**Fix:** keep the row visibly disabled without a degenerate range:

```tsx
<Slider
  value={[zoom]}
  onValueChange={(next) => setZoom(next[0] ?? 1)}
  min={1}
  // A degenerate range makes Radix compute NaN%. When the source supports no zoom the
  // row is disabled anyway, so the ceiling is cosmetic — give it a real one.
  max={zoomLocked ? AVATAR_MAX_ZOOM_CEILING : maxZoom}
  step={0.01}
  disabled={zoomLocked}
  aria-label={AVATAR_ZOOM_LABEL}
/>
```

Then the CSSOM patch in the jsdom harness can be removed, which is a second signal that the
underlying cause is gone.

### WR-06: the `ResponsiveDialog` adopter census is stale and has no completeness guard

**File:** `tests/design/responsive-dialog-autofocus.test.tsx:113-124`

**Issue:** The docblock claims *"The five files that render `ResponsiveDialog` (six call
sites — `blocks-editor.tsx` has two), enumerated in `16-RESEARCH.md` §D13 and re-verified
2026-08-25"* and `ADOPTERS` hard-codes those five. Measured against this tree, **seven**
files render it and there are **eight** call sites: the five listed plus
`src/components/profile/avatar-field.tsx` and `src/components/profile/image-crop-dialog.tsx`,
both added by this phase and both legitimately passing a focus hook.

The census asserts "each listed adopter does not mention `onOpenAutoFocus`". Because the
list is hard-coded rather than derived, a *future* adopter that adds the prop is invisible
to the gate — which is the same shape as the guard-the-guard problems this file's own header
is otherwise careful about, and the claim in the docblock is now simply false.

**Fix:** derive the set and subtract the two deliberate users, so the census is
self-widening:

```ts
const DELIBERATE = new Set([
  "src/components/profile/avatar-field.tsx",     // D-168's mitigation — onOpenAutoFocus
  "src/components/profile/image-crop-dialog.tsx",// Δ5c — onCloseAutoFocus, no trigger
]);
const ADOPTERS = globSync("src/**/*.tsx")
  .filter((f) => readFileSync(f, "utf8").includes("<ResponsiveDialog"))
  .filter((f) => !DELIBERATE.has(f));
it("the census found the adopters it claims to police", () =>
  expect(ADOPTERS.length).toBeGreaterThanOrEqual(5));
```

### WR-07: `visual-baselines.ts` re-types `AVATAR_CROP_TITLE` as a literal on a justification that does not hold

**File:** `src/lib/design/visual-baselines.ts:1096` (reason at `:1103-1108`)

**Issue:**

```ts
hook: '[data-testid="responsive-dialog"]:has-text("Position your photo")',
```

The `hookWhy` explains: *"The title is spelled literally because this module is a
declaration and cannot import from `e2e/`."* But the string is not in `e2e/` — it is
`AVATAR_CROP_TITLE` in `src/lib/avatar.ts:103`, a directive-free leaf inside `src/` that
this module can import freely (`e2e/overflow-320.spec.ts` imports it from exactly there,
and says so). So this is an avoidable second spelling of a pinned copy literal, with no
assertion holding the two in agreement — the rule F2 hazard the phase enforces everywhere
else.

**Fix:** `import { AVATAR_CROP_TITLE } from "@/lib/avatar";` and build the hook as a
template literal, or add a one-line assertion in
`tests/design/…` that the declared hook contains `AVATAR_CROP_TITLE`.

### WR-08: `image-fixtures.test.ts` asserts, in prose, that this repository has no CI

**File:** `tests/design/image-fixtures.test.ts:1-3`

**Issue:** *"THIS TEST *IS* THE CI CHECK for `e2e/fixtures/`. There is no CI in this
repository, so `npm run test:design` … is the only place a regen-diff gate can live."*

`.github/workflows/ci.yml` (73 KB) and `.github/workflows/baselines.yml` (27 KB) both exist,
and two other files added by this same phase cite `ci.yml` **by line number**
(`cloudinary-provenance.ts:28-30`, `listing-photo.ts:113-117` — "`.github/workflows/ci.yml`
records at `:151` and again at `:875`"). The header's premise is false and its conclusion —
that this gate cannot live anywhere else — follows from it. A reader deciding where to put
the next binary-drift gate will be misled.

**Fix:** replace the first paragraph with the true reason (`test:design` is build-blocking
via `npm run build`, so a byte gate placed there fails locally *and* in CI job 1), and drop
the "there is no CI" clause.

### WR-09: the staged object URL leaks when `AvatarField` unmounts while a file is staged

**File:** `src/components/profile/avatar-field.tsx:74-79`, `:232`, `:190-194`

**Issue:** The file documents the three revoke paths (refuse-after-mint, cancel, successful
save) and explicitly declines an effect cleanup: *"React remounts effects in development, so
a cleanup here would revoke the URL the still-open dialog is displaying."* The consequence
is stated nowhere: if the component unmounts while `staged` is non-null — a client-side
navigation with the crop dialog open, a `router.refresh()` that re-renders the route
skeleton, an error boundary — the object URL is never revoked and pins its decoded bitmap
for the life of the tab. On a 5 MB source that is a real retention.

The reasoning is sound (`reactStrictMode` defaults to `true` in Next 16, so a naive cleanup
would break dev) but the fix is available: hold the `File` and re-mint on remount.

**Fix:**

```tsx
React.useEffect(() => {
  const url = staged?.objectUrl;
  if (!url) return;
  return () => {
    // Safe under StrictMode's dev remount: the effect re-runs on the remount and mints a
    // fresh URL from the File we still hold, so the dialog is never left showing a
    // revoked one.
    revokeAvatarObjectUrl(url);
  };
}, [staged?.objectUrl]);
```

…with `setStaged` re-minting from `staged.file` when the effect re-attaches; or, if the
current shape is preferred, at minimum revoke on `pagehide` so a full navigation does not
leak. Either way, record the residual explicitly rather than leaving the unmount path
unmentioned.

### WR-10: the `!cloudName` fail-closed branch logs but does not return

**File:** `src/app/actions/listing-photo.ts:111-129`

**Issue:**

```ts
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
if (!cloudName) {
  // FAIL CLOSED — and this branch must NEVER become an early `return { ok: true }` or a skip.
  console.warn("[listing-photo] CLOUDINARY_CLOUD_NAME is not configured — refusing …");
}
if (!isOwnCloudinaryAsset({ url, publicId, listingId, cloudName })) { … }
```

The comment says the branch fails closed; the branch only *logs*. The actual refusal is
delegated to `isOwnCloudinaryAsset`'s `:83` guard. That is correct today, but the property
the comment claims is not enforced where the comment sits — a future signature change (a
`cloudName = process.env.… ?? DEFAULT` default parameter, say) reopens it while this comment
still reads as if it were the guard. It also emits **two** `console.warn` lines for one
rejection when the variable is missing, which is the state every CI run is in.

**Fix:**

```ts
if (!cloudName) {
  console.warn("[listing-photo] CLOUDINARY_CLOUD_NAME is not configured — refusing … (D-165).");
  return { ok: false, error: "That photo didn't upload. Please try again." };
}
```

The validator's own `:83` guard stays as defence in depth, and
`tests/listing/photos.test.ts:278` continues to pass unchanged.

## Info

### IN-01: no `engines` pin for the Node version `generate-image-fixtures.mjs` requires

**File:** `scripts/generate-image-fixtures.mjs:1196-1208` · `package.json`

**Issue:** The module throws at *import* time when `import.meta.main` is `undefined`
(Node < 24.2). That is a deliberate loud failure, but it also means
`tests/design/image-fixtures.test.ts` — which imports the module — fails suite-load on any
older Node with an error that reads like a fixture problem. `package.json` declares no
`engines` field, so nothing warns at install time. CI pins `node-version: "24"`, so this
only bites contributors.

**Fix:** add `"engines": { "node": ">=24.2" }` to `package.json`.

### IN-02: `avatarMaxZoom(NaN)` returns `NaN`, escaping both clamp arms

**File:** `src/lib/avatar.ts:88-93`

**Issue:** `Math.min(Math.max(NaN, 1), 3)` is `NaN`. The docblock claims both arms clamp
"for nonsense input such as 0 or a negative", and `tests/design/avatar-zoom.test.ts` sweeps
`1..5000` plus `0` and `-1` — the one nonsense value that escapes is untested. No consumer
can produce it today (`naturalWidth`/`naturalHeight` are always numbers), so this is a note
rather than a defect.

**Fix:** `return Math.min(Math.max(shorterSourcePx || 1, 1), AVATAR_MAX_ZOOM_CEILING);` and
add `{ shorter: NaN, expected: 1 }` to `ZOOM_ROWS`.

---

_Reviewed: 2026-08-25T17:27:16Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
