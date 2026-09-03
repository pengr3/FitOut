# Phase 16: Image Crop & Framing — Pattern Map

**Mapped:** 2026-08-25
**Files analysed:** 31 (11 new source · 8 new test specs + fixtures + a generator · 12 modified)
**Analogs found:** 24 / 31 — 12 exact, 12 role-match, **7 with no honest analog**

> **What this document is.** For every file Phase 16 creates or modifies, the closest existing file in
> *this* codebase and the concrete excerpt an executor should imitate. It re-researches nothing: the
> library, the Cloudinary semantics and the jsdom limits are settled in `16-RESEARCH.md`; the design
> decisions are settled in `16-UI-SPEC.md` / `16-CONTEXT.md` / `999.2-UI-SPEC.md`.
>
> Every `file:line` below was opened first-hand on 2026-08-25. Where **no honest analog exists** the
> row says so and names the nearest partial match *plus what it does not cover* — a false analog is
> worse than none.
>
> **§ Measured corrections** at the end lists four places where an upstream document's claim does not
> survive contact with the file. Read it before planning; two of them change what a task must do.

---

## File Classification

### New source files

| New file | Role | Data flow | Closest analog | Match |
|---|---|---|---|---|
| `src/components/profile/avatar-field.tsx` | component (`"use client"` composite) | file-I/O → event-driven → request-response | **none single.** `profile-form.tsx:119-157` (input + guard + action) **+** `host/request-row.tsx:150-283` (controlled overlay + pending + refusal region) | **partial — two halves** |
| `src/components/profile/image-crop-dialog.tsx` | component (`"use client"` overlay) | transform (Blob out) | `availability/blocks-editor.tsx:319-350` — the only adopter with a substantive **body** + controlled `onOpenChange` funnel | role-match |
| the removal confirm (component **or** inline) | component (`"use client"` confirm) | request-response | `group/remove-attendee-button.tsx:118-150` (behaviour) **+** `host/request-row.tsx:242-273` (the `ResponsiveDialog` spelling) | **partial — two halves** |
| `CoverFramePreview` (server-safe) | component (presentational, Server Component) | render-only | `patterns/empty-state.tsx:1-52` (server-safety + header convention); `patterns/result-card.tsx:32,141` (reading `measurements.ts`) | role-match |
| `removeAvatarAction` in `src/app/actions/avatar.ts` | server action | CRUD, destructive | `listing-photo.ts:165-214` `removePhoto` | **exact** (order deliberately inverted — D-169) |
| avatar destroy helper in `src/lib/cloudinary.ts` | service (vendor wrapper) | request-response | `cloudinary.ts:80-89` `destroyListingPhoto` | **exact** |
| pure Cloudinary provenance validator | utility (pure validator) | transform | `src/lib/safe-callback-url.ts:68-132` `safeCallbackPath` | **exact in shape** |
| `src/lib/avatar.ts` — `AVATAR_*`, `avatarMaxZoom()` | config / constants module | — | `src/lib/validation/profile.ts:1-47`; `src/lib/profile.ts:1-30` | **exact** |
| `src/lib/avatar-canvas.ts` — decode/measure/encode | utility (browser API wrapper) | transform, file-I/O | **none.** Nearest: `src/lib/cloudinary.ts:19-38`'s callback→Promise wrapper shape | **no analog** |
| `src/lib/listing/cover-frames.ts` — 4 copy literals | config / copy | — | `src/lib/listing/card-price.ts` siblings; `photo-uploader.tsx:81` (hoisted-literal-so-the-gate-can-read-it) | role-match |
| `src/components/ui/slider.tsx` | vendored primitive | — | `src/components/ui/collapsible.tsx` + commit `26ddcf8` | **exact** |

### New test files (research § E, Wave 0 Gaps)

| New spec | Role | Config | Closest analog | Match |
|---|---|---|---|---|
| `tests/profile/avatar-field.test.tsx` | test (jsdom component) | main | `tests/host/request-refusal.test.tsx` | **exact** |
| `tests/profile/avatar-zoom.test.ts` | test (pure unit) | main | `tests/security/safe-callback-url.test.ts` | **exact** ⚠ see § Measured corrections #3 |
| `tests/profile/avatar-remove.test.ts` | test (integration, live DB) | main | `tests/profile/avatar.test.ts` + `tests/listing/photos.test.ts:26-47` | **exact** |
| `tests/design/avatar-copy.test.tsx` | test (design, AST + render) | design | `tests/design/profile-pass.test.tsx` | role-match |
| `tests/design/responsive-dialog-autofocus.test.tsx` | test (design, jsdom render) | design | `tests/design/theme-provider.test.tsx` (pragma + design-config render) | role-match |
| `tests/listing/cover-frame-preview.test.tsx` | test (jsdom component) | main | `tests/listing/photo-gallery.test.tsx` | **exact** |
| `tests/listing/cloudinary-provenance.test.ts` | test (pure unit, security) | main | `tests/security/safe-callback-url.test.ts` | **exact** |
| `e2e/avatar-crop.spec.ts` | test (Playwright, geometry) | playwright | `e2e/calendar-hit-area.spec.ts` (boundingBox/computed style) + `e2e/photo-lightbox.spec.ts` | role-match ⚠ **no `setInputFiles` precedent** |
| `e2e/fixtures/*.{jpg,png,webp,gif,svg}` (11 files) | fixtures (binary) | — | **none. Zero binary fixtures exist outside VRT baselines.** | **no analog** |
| `scripts/generate-image-fixtures.*` | script (codegen) | — | `scripts/generate-design-tokens.mjs` (text codegen only) | **partial** |

### Modified files

| File | Change | Current-state excerpt below |
|---|---|---|
| `src/app/(app)/profile/profile-form.tsx` | avatar block → `AvatarField`; keep RHF/`updateProfile`/save machine byte-unchanged | § M1 |
| `src/components/patterns/responsive-dialog.tsx` | +1 additive prop `onOpenAutoFocus` | § M2 |
| `src/lib/cloudinary.ts` | `gravity` one word; header docblock; new destroy helper | § M3 |
| `src/app/actions/avatar.ts` | `removeAvatarAction`; correct the `:8-10` comment | § M4 |
| `src/lib/validation/profile.ts` | narrow the type refine | § M5 |
| `src/app/actions/listing-photo.ts` | D-165 provenance validation in `persistPhoto` | § M6 |
| `src/components/listing/photo-uploader.tsx` | mount `CoverFramePreview` at `:244` | § M7 |
| `src/lib/design/live-regions.ts` | rows + count alias + **re-key** | § M8 |
| `tests/design/brand-recipe.test.ts` | `EXPECTED_DILUTED_TOKENS` +1 | § M9 |
| `tests/design/leak.test.ts` | 31 → 32 vendored primitives | § M10 |
| `tests/design/profile-pass.test.tsx` | four assertions | § M11 |
| `tests/listing/photos.test.ts` | **12** `persistPhoto` fixtures, not 8 | § M12 |

---

## Pattern Assignments — new source files

### `src/components/profile/avatar-field.tsx` (component, `"use client"`, file-I/O → request-response)

> **⚠ NO SINGLE ANALOG.** Nothing in this tree owns a file input *and* two overlays *and* two actions.
> The honest answer is two half-analogs, each covering a different axis. `src/components/listing/photo-uploader.tsx`
> is **not** one of them: it owns no `<input type="file">` at all — the whole picker is `CldUploadWidget`'s
> (`photo-uploader.tsx:174-194`), so it teaches nothing about the `change` handler, the guards, or D-174's
> `value` reset. **`profile-form.tsx:131-138` is the ONLY `<input type="file">` in `src/`** (verified:
> `grep -rn 'type="file"' src/` returns exactly one hit).

**Analog A — the file input + guard + action call: `src/app/(app)/profile/profile-form.tsx:78-93, 119-157`**

The state block it owns today (`:54-57`), which `AvatarField` inherits and extends:

```tsx
  const fileInput = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
```

The handler (`:78-93`) — **this is the shape D-174 replaces**; note it never touches `e.target.value`:

```tsx
  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);
    setAvatarBusy(true);
    const fd = new FormData();
    fd.set("avatar", file);
    const result = await uploadAvatarAction(fd);
    setAvatarBusy(false);
    if (!result.ok) {
      setAvatarError(result.error);
      return;
    }
    setAvatarUrl(result.avatarUrl);
    router.refresh();
  }
```

The markup to lift (`:123-157`) — the hidden input, the click-through button, the helper, the alert:

```tsx
          <div className="flex items-center gap-4">
            <Avatar size="lg" className="size-16">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt="Your avatar" />
              ) : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                aria-label="Upload avatar"
                onChange={onAvatarChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={avatarBusy}
                onClick={() => fileInput.current?.click()}
              >
                {avatarBusy ? "Uploading…" : "Upload photo"}
              </Button>
              <p className="text-xs text-muted-foreground">
                JPG or PNG, up to 5 MB. Optional.
              </p>
              {avatarError && (
                <p role="alert" className="text-xs text-destructive">
                  {avatarError}
                </p>
              )}
            </div>
          </div>
```

Deltas the spec applies to this block: `size="sm"` → `size="touch"` (Δ12); `text-xs` → `text-label`
twice (Δ11); `accept="image/*"` → the three MIME types (§ 2e); `Uploading…` retired (Δ14); the helper
string **changes** (Δ14); `e.target.value = ""` after every handled change (D-174).
`aria-label="Upload avatar"` and the single file input are **pinned by `profile-pass.test.tsx:1045-1057`
against `profile-form.tsx` specifically** — see § M11.

**Analog B — a client composite that owns pending state, a controlled overlay and one refusal region:
`src/components/host/request-row.tsx:150-283`**

```tsx
  const [approving, setApproving] = React.useState(false);
  const [declining, setDeclining] = React.useState(false);
  const [declineOpen, setDeclineOpen] = React.useState(false);
  // ONE refusal slot for BOTH paths. Two states would render two regions on a row that can only ever
  // have refused one thing, and two regions for one outcome is the shape GATE-03 rule 6 forbids.
  const [refusal, setRefusal] = React.useState<string | null>(null);

  async function handleDecline() {
    if (declining) return;
    setDeclining(true);
    setRefusal(null);
    try {
      const res = await declineRequest(requestId);
      if (res.ok) { …; setDeclineOpen(false); }
      else { setRefusal(res.error); setDeclining(false); setDeclineOpen(false); }
    } catch (e) { setDeclining(false); throw e; }
  }
```

Copy these four properties verbatim: the **re-entrancy guard before the disabled attribute applies**
(`if (declining) return;`), the **clear-then-set** of the refusal, the `try/catch` that resets pending
and **rethrows**, and the server's own sentence stored verbatim with no client re-authoring.

**What neither analog covers, and what the executor must invent:** the pre-dialog guard chain (type →
size → decode → dimensions), the staged-`File` state that mounts/unmounts `ImageCropDialog`, and the
`Blob` → `FormData` handoff into `uploadAvatarAction`. There is no precedent for any of the three.

---

### `src/components/profile/image-crop-dialog.tsx` (component, `"use client"`, transform)

**Analog:** `src/components/availability/blocks-editor.tsx:319-350` — of the six `ResponsiveDialog`
call sites this is the only one whose `children` slot carries a real body rather than nothing, and the
only one that funnels every close through **one** named function (Δ3's exact requirement).

```tsx
  /** Every close runs through here — the overlay's own dismissals AND the footer's Cancel. */
  function onOpenChange(o: boolean) {
    setOpen(o);
    if (!o) reset();
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Block dates"
      description="Close off a whole day or a time range. Bookers won't see blocked times."
      trigger={…}
      footer={…}
```

Δ3 turns that body into `function onOpenChange(next: boolean) { if (!next && saving) return; setOpen(next); }`.
Δ5c makes `trigger` **absent** and `onCloseAutoFocus` **mandatory** on this one.

**Footer prop shape — `src/components/host/request-row.tsx:262-276`, the pending-label idiom:**

```tsx
          footer={
            <>
              <Button variant="ghost" disabled={declining} onClick={() => setDeclineOpen(false)}>
                Keep it
              </Button>
              <Button
                variant="outline"
                onClick={handleDecline}
                disabled={declining}
                aria-disabled={declining}
              >
                {declining ? "Declining…" : "Decline request"}
              </Button>
            </>
          }
```

Note `aria-disabled` **beside** `disabled`, and the fragment (not an array) in the `footer` slot.
Phase 16's spelling: `Cancel` (`variant="outline" size="touch"`) then `Save photo`
(`variant="default" size="touch"`, label `Saving…` while pending) — Δ9, Δ12.

**The prop surface it composes — `src/components/patterns/responsive-dialog.tsx:138-201`**, quoted in
full at § M2. **It exposes no `className` and no width prop** — Δ1.1's "width is not overridable" is a
fact about that type, not a convention.

**Focus-ring recipe for the `tabIndex={0}` stage — copy byte-for-byte from
`src/components/patterns/result-card.tsx:128`** (which itself copied `search-result-card.tsx:174`,
comment included):

```tsx
      className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
```

`tests/design/focus-recipe.test.ts:111-112` declares that exact string as `CANONICAL_RECIPE`, and
`:115` declares `ring-ring/50` as "the shadcn default this phase exists to delete".

**What no analog covers:** `react-easy-crop`'s `classes.{containerClassName,cropAreaClassName,mediaClassName}`
props, the `min(320px, 100vw − 2rem, 40dvh)` stage box, and the `touch-action: none` guard. All three
are net-new. The nearest *reasoning* precedent for a derived size constant is
`src/lib/design/measurements.ts:352-355` (`HOLD_COUNTDOWN_BOX`, "a RESERVATION, not a design value") —
but Δ-budget says **`measurements.ts` is read-only this phase**, so the stage box is authored at the
call site, not declared there.

---

### The removal confirm (component **or** inline composition — the contract is the behaviour)

> **⚠ TWO HALF-ANALOGS.** One file has the exact *behaviour* on the wrong primitive; another has the
> right primitive with the wrong *variant*. There is **no existing destructive confirm rendered through
> `ResponsiveDialog`**, and — measured — **there is no `variant="destructive"` Button anywhere in `src/`**:
> `grep -rn 'variant="destructive"' src/` returns two hits, both `<Alert variant="destructive">`
> (`host/payout-banner.tsx:69`, `host/payout-state-badge.tsx:65`). Δ5's *"exactly one new use"* is
> literally the app's **first** destructive Button.

**Analog A — the behaviour: `src/components/group/remove-attendee-button.tsx:118-150`**

```tsx
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-11 px-3" aria-label={`Remove ${name} from this group`}>
          <UserRoundMinusIcon aria-hidden="true" />
          <span className="hidden sm:inline">Remove attendee</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove {name} from this group?</DialogTitle>
          <DialogDescription>
            This frees up their spot. They can RSVP again if they still have the link.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={pending}>
              Keep them
            </Button>
          </DialogClose>
          <Button variant="outline" onClick={handleRemove} disabled={pending} aria-disabled={pending}>
            {pending ? "Removing…" : "Remove attendee"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
```

Everything about this is right except the primitive: title-as-question, description naming the
consequence, `Keep them` cancel, `Removing…` pending, `aria-disabled` beside `disabled`,
`router.refresh()` after success (`:110`).

**What it does NOT cover:** it reaches `@/components/ui/dialog` **directly**, which Δ1 forbids; it uses
`DialogClose asChild` for the cancel, which `request-row.tsx:257-259` explicitly refuses ("this file
reaches the overlay through the one pattern and imports nothing from the vendored dialog module");
its confirm is `variant="outline"`, not `destructive`; and it has no `onOpenAutoFocus`, because the
prop does not exist yet.

**Analog B — the primitive + trigger + controlled-open + `onCloseAutoFocus`-left-undefined argument:
`src/components/host/request-row.tsx:242-277`**, including the comment that *is* Δ5c's justification:

```tsx
        {/* `onCloseAutoFocus` is deliberately LEFT UNDEFINED. `responsive-dialog.tsx:180-201` records the
            measured Radix defect it exists for — an adopter whose trigger UNMOUNTS while the overlay is
            open loses the browser's focus restore — and this trigger is stable, so Radix's own behaviour
            is correct here and taking the decision over would be a claim with no basis. */}
        <ResponsiveDialog
          open={declineOpen}
          onOpenChange={setDeclineOpen}
          title="Decline this request?"
          description={`We'll let ${bookerLabel} know their request for ${whenLabel} wasn't available, and free the slot for other guests. This can't be undone.`}
          trigger={
            <Button variant="outline" size="touch" aria-label={`Decline request from ${bookerLabel}`}>
              Decline
            </Button>
          }
```

**File-placement argument, and it is mechanical rather than aesthetic:** `profile-pass.test.tsx:988-1016`
(case 8) bans `variant="destructive"` **in `profile-form.tsx`**. Composing the confirm inside
`avatar-field.tsx` (a new file) keeps case 8 green; composing it inside `profile-form.tsx` reddens a
fifth assertion nobody budgeted.

---

### `CoverFramePreview` (component, **server-safe**, render-only)

**Analog A — server-safety and the header convention: `src/components/patterns/empty-state.tsx:17-21`**

```
// A SERVER COMPONENT with no `"use client"` directive, no domain imports and no product copy — the
// `patterns/` membership rule 11-07 established. (This file has to quote the directive it does not use
// in order to say that; a raw `grep -c "use client"` on this file therefore returns a non-zero number
// against a correct file. The real property is "no directive prologue", which is verified over the AST
// — see the Verification Run in this plan's summary and the identical finding in 11-07 and 11-08.)
```

Its whole import list (`:48-52`) is the ceiling a server-safe component may reach:

```tsx
import type { ReactNode } from "react";
import { CheckCircle2, type LucideIcon } from "lucide-react";

import { STATUS_TONE_RECIPES } from "@/lib/design/status-tones";
import { cn } from "@/lib/utils";
```

**Analog B — reading a `measurements.ts` constant: `src/components/patterns/result-card.tsx:32, 50-62, 141`.**
This is the file Δ8 reasons *against*, and the excerpt shows why: it **parses** the class into a
number so it can feed `<AspectRatio ratio>`, and that parse is the client-boundary import D-170 drops.

```tsx
import { RESULT_CARD_MEDIA } from "@/lib/design/measurements";
…
const MEDIA_RATIO: number = ((): number => {
  const parsed = /^aspect-\[(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)\]$/.exec(RESULT_CARD_MEDIA);
  if (!parsed) { throw new Error(…); }
  return Number(parsed[1]) / Number(parsed[2]);
})();
…
        <AspectRatio ratio={MEDIA_RATIO} className="bg-muted">
          {media ?? mediaFallback}
        </AspectRatio>
```

`CoverFramePreview` does the **opposite**: `import { MOSAIC_ASPECT, RESULT_CARD_MEDIA } from "@/lib/design/measurements"`
and `<div className={MOSAIC_ASPECT}>` — no parse, no `AspectRatio`, no number (Δ8).
Constants as they ship: `measurements.ts:50` `export const RESULT_CARD_MEDIA = "aspect-[4/3]";` and
`measurements.ts:365` `export const MOSAIC_ASPECT = "aspect-[16/9]";`

**The media-box treatment to match — `photo-uploader.tsx:292-298`** (`bg-muted` + `object-cover` is the
shipped idiom on this very surface):

```tsx
      <AspectRatio ratio={isCover ? 4 / 3 : 1}>
        <img
          src={photo.url}
          alt={isCover ? "Cover photo" : `Listing photo ${index + 1}`}
```

**What no analog covers:** two frames side-by-side from one URL with captions. `result-card.tsx` was
considered by the UI-SPEC and rejected (border, title slot, hover it must not have). Nothing else in
`patterns/` renders a caption under a media box.

**The design test that polices this — `tests/design/empty-state-adoption.test.ts:1000-1008`**, which is
the shape research pointed at (it is *not* in `server-only-guards.test.ts`, which polices
`import "server-only"`, a different property — see § Measured corrections #1):

```ts
describe("T-11-CLIENTCREEP — the pattern is still a Server Component", () => {
  it("has no `use client` directive prologue in `patterns/empty-state.tsx`", () => {
    // Structural, because the file's own header QUOTES the directive to explain that it does not
    // use one — a text count on this file returns non-zero against a correct file.
    expect(
      TREE.parsedByFile.get(PATTERN_FILE)?.isClientModule,
      "the pattern was marked `use client`. The composition adapts to the boundary; the pattern does not.",
    ).toBe(false);
  });
```

The `isClientModule` flag is produced by a `ts.createSourceFile` walk at `:546-575`; reuse that
detector rather than a `grep`.

---

### `removeAvatarAction` in `src/app/actions/avatar.ts` (server action, destructive CRUD)

**Analog:** `src/app/actions/listing-photo.ts:165-214` `removePhoto` — the destroy-ordering shape
D-169 **inverts on purpose**.

```ts
export async function removePhoto(
  listingId: string,
  photoId: string,
): Promise<PhotoResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "You must be signed in to remove photos." };
  }
  …
  await db.transaction(async (tx) => { … });

  // Orphan cleanup — best-effort; the row is already gone. A failed destroy leaves an orphan asset but
  // must not surface as a user-facing removal failure.
  try {
    await destroyListingPhoto(photo.publicId);
  } catch (err) {
    console.error(`Cloudinary destroy failed for ${photo.publicId}:`, err);
  }

  revalidateEdit(listingId);
  return { ok: true };
}
```

**Copy exactly:** the `try/catch` around the destroy, the `console.error` with the `publicId`
interpolated, the comment naming the tolerated orphan, and `return { ok: true }` **after** a failed
destroy. D-169 is this file's ordering already — the row write happens first, the destroy second.

**Session + result-shape idiom to mirror from the same module (`avatar.ts:34-36, 42-50, 72-80`):**

```ts
export type AvatarResult =
  | { ok: true; avatarUrl: string }
  | { ok: false; error: string };

export async function uploadAvatarAction(formData: FormData): Promise<AvatarResult> {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) {
    return { ok: false, error: "You must be signed in to upload an avatar." };
  }
  …
    await auth.api.updateUser({
      body: { avatarUrl: secure_url, avatarPublicId: public_id },
      headers: requestHeaders,
    });
```

**Nulling both columns is `auth.api.updateUser` with `null`s, not a Drizzle write** — that is what this
module already uses to set them, and the row is Better Auth's. `export type` is legal in a `"use server"`
module (`avatar.ts:34` proves it); a `const` that is not an async function is not.

---

### The avatar destroy helper in `src/lib/cloudinary.ts`

**Analog:** `src/lib/cloudinary.ts:80-89`, quoted in full as requested:

```ts
/**
 * Destroy a listing photo asset by its Cloudinary `public_id` (orphan cleanup, T-04-ORPHAN). Called
 * when a photo is removed (or a draft abandoned) so deleted photos don't linger in storage or serve
 * stale CDN copies — `invalidate: true` busts the CDN cache (RESEARCH Pattern 2 orphan handling).
 */
export function destroyListingPhoto(
  publicId: string,
): Promise<{ result: string }> {
  return cloudinary.uploader.destroy(publicId, { invalidate: true });
}
```

Mirror it exactly — same `{ invalidate: true }`, same `Promise<{ result: string }>`, same
docblock-with-a-threat-id shape, same section placement (append below, do not interleave with the
Phase-2 block that starts at `:40`).

---

### The pure Cloudinary provenance validator (D-165)

**Analog:** `src/lib/safe-callback-url.ts:68-132` `safeCallbackPath`. This is a strong structural match
— the same threat class (attacker-controlled string that becomes a URL), the same *"parse and compare
origins, never prefix-match"* lesson, and the same *"pure function of (untrusted, trusted-context)"*
signature that D-165 requires when it says `cloudName` is an argument and `process.env` is never read.

```ts
/**
 * Resolve `raw` to a safe same-origin path, or `"/"`.
 *
 * @param raw    The untrusted `?callbackURL` value, or `null` when absent.
 * @param origin The app's own origin, e.g. `window.location.origin`.
 * …
 */
export function safeCallbackPath(raw: string | null | undefined, origin: string): string {
  if (!raw || !raw.startsWith("/")) return "/";

  let target: URL;
  let self: URL;
  try {
    target = new URL(raw, origin);
    self = new URL(origin);
  } catch {
    return "/";
  }

  // `origin` is the string comparison the browser itself would make. It is `"null"` for opaque
  // schemes such as `javascript:` and `data:`, which therefore never match a real http(s) origin.
  if (target.origin !== self.origin) return "/";
  …
}
```

The header's own lesson, which the D-165 validator must inherit verbatim in spirit (`:22-25`):

```
// PREFIX MATCHING CANNOT FIX THIS, which is the actual lesson. Adding `!raw.startsWith("/\\")`
// closes one spelling and leaves the next (`/\/`, a tab or newline the parser strips, a percent
// encoding). The only check that answers the real question — "does this navigate off our origin?" —
// is to PARSE it and compare origins, because that runs the same algorithm the browser will.
```

**Conventions to copy:** `export function` (not a const arrow), a JSDoc naming every parameter and what
is trusted about it, a **total** return (this one returns `"/"`; the D-165 one returns a boolean or a
`{ ok }` discriminant — `listing-photo.ts`'s existing `{ ok: false, error }` shape is what the *action*
returns, so keep the pure validator's own return narrower and let the action map it), `try { new URL } catch { reject }`,
and a comment on **every** rejection saying which attack spelling it closes.

**Home:** `src/lib/validation/` is entirely Zod schemas (`auth.ts`, `availability.ts`, `booking.ts`,
`cancellation.ts`, `group.ts`, `listing.ts`, `notification.ts`, `profile.ts`, `qrph-refund.ts` — all
nine open with `import { z } from "zod"`). A parse-and-compare URL guard is not a Zod schema; the
repo's precedent for that is a top-level `src/lib/*.ts` module (`safe-callback-url.ts`) or
`src/lib/listing/*.ts` beside its consumer. Either is defensible; `src/lib/listing/` keeps it next to
`listing-photo.ts`, which is the file that calls it.

---

### `src/lib/avatar.ts` — `AVATAR_*` literals, `AVATAR_MIN_SOURCE_PX`, `avatarMaxZoom()`

**Analog:** `src/lib/validation/profile.ts:1-47`. It exists *because* of this exact incident, and its
header is the argument the new module inherits (`:10-18`):

```
// The avatar FILE guard (AVATAR_MAX_BYTES + avatarFileSchema) does live here, below. It used
// to be exported from src/app/actions/avatar.ts, which is a `"use server"` module — and Next
// rejects a `"use server"` module that exports anything other than an async function AT MODULE
// EVALUATION ("A 'use server' file can only export async functions, found number"). That killed
// uploadAvatarAction outright, so avatar upload never worked in a browser. This module is
// directive-free, so both the server action and the client form can import the same contract.
// DO NOT move these two back into a `"use server"` file, and do not re-export them from one —
// a re-export out of a server-action module is the identical violation.
// tests/use-server-exports.test.ts enforces this repo-wide.
```

The constant + docblock shape (`:32-33`):

```ts
/** Max avatar size — 5 MB. Larger files are rejected before any upload (T-04-04). */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
```

`src/lib/profile.ts:1-13` is the sibling shape for a **directive-free pure module with no Zod**: a
header stating the boundary it owns, exported `type`s, then exported pure functions. `src/lib/avatar.ts`
should read like that file, not like `validation/profile.ts`.

**The one hoisted-literal convention worth copying explicitly — `photo-uploader.tsx:76-81`:**

```
 * Hoisted to a module-level constant rather than inlined so the gate can resolve it to a string and
 * check it against the value recorded in the inventory.
 */
const PHOTO_REQUIREMENT_REGION_NAME = "Photo requirement";
```

That is the reason `avatar-copy.test.tsx` can assert byte-equality between the export and the render.

---

### `src/components/ui/slider.tsx` — what this repo does to a registry block on arrival

**Analog:** `src/components/ui/collapsible.tsx` — the **most recently vendored** primitive
(`git log -- src/components/ui/`: commit `26ddcf8`, plan 12-11, 2026-08-18; everything after it in that
log is a *fix* to an existing block, not an add). The emitted file, unedited, all 33 lines:

```tsx
"use client"

import { Collapsible as CollapsiblePrimitive } from "radix-ui"

function Collapsible({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}
…
export { Collapsible, CollapsibleTrigger, CollapsibleContent }
```

Observe: **no semicolons, double quotes, no `cn` import** — the CLI's own formatting is left exactly as
emitted. This repo does **not** reformat a vendored block. It carried zero Tailwind classes, so it
needed zero token edits; `slider` carries several and will need them (research §D14 lists the four).

**What the repo does *around* the block, from commit `26ddcf8`'s own message — the four landing
conditions, which are the real pattern:**

```
- `npx shadcn@4.10.0 add collapsible` — the milestone's one registry add, landed
  under its three conditions: `git diff --stat package.json` EMPTY (zero new npm
  dependencies; the block's only Radix import is the already-installed `radix-ui`
  single package), `components.json` `registries` still `{}`, and the leak +
  focus-recipe scans run over it with no finding
- `dark-scope.test.ts` re-measured before and after: 44 occurrences across 13
  files, delta 0 — the block carries no Tailwind class at all, so neither pin moved
- `leak.test.ts`'s vendored-primitive count 30 -> 31 in this commit, with the
  reason at the row and the new file named: a count alone is satisfied by any
  thirty-first file, and a primitive that leaks nothing is indistinguishable from
  one the walker never opened
```

Files touched in that commit: `src/components/ui/collapsible.tsx`, `src/lib/design/selector-contract.ts`,
`tests/design/leak.test.ts` (+15 lines) — plus the consumer. **The inventory move and the block land
together.** Phase 16's twin is `leak.test.ts:319-341` (§ M10) — `selector-contract.ts` is *not* touched
(Δ18).

**The token map to apply on arrival** (research §D14, each verified against the gate here):

| Emitted | Replace with | Gate that rejects it |
|---|---|---|
| `bg-white` (thumb) | `bg-background` | `config/design-leak-patterns.mjs:190` `white-black-class`; scope includes `src/components/ui/**` per `leak.test.ts:319` D-17 "there is no vendored exemption" |
| `ring-ring/50 … ring-3` (thumb) | `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background` | `focus-recipe.test.ts:115` `HALF_ALPHA_RING`; also an undeclared diluted composite vs `brand-recipe.test.ts:361` |
| `after:-inset-2` (28px hit area) | `after:-inset-4` (44px) | Δ12 / DS-09 — `ui/button.tsx:112-115` `touch: "h-11 …"` is the declared 44px mechanism |
| `bg-primary` (range) | keep | `--primary` is a near-black neutral in both themes; Δ9 costs no edit |

---

## Pattern Assignments — new test files

### `tests/profile/avatar-field.test.tsx` (jsdom component, main config)

**Analog:** `tests/host/request-refusal.test.tsx` — a jsdom spec that renders a client composite,
mocks the server-action module, drives a `ResponsiveDialog` through a portal, and asserts a
`role="status"` region's accessible name. Opening lines, verbatim:

```tsx
// @vitest-environment jsdom

// A REFUSED APPROVE OR DECLINE REPORTS ON THE ROW, ONCE (plan 14-03 · HFLOW-01).
…
import * as React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }
    & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (<a href={href} {...rest}>{children}</a>),
}));

vi.mock("@/app/actions/host-requests", () => ({
  approveRequest: vi.fn(),
  declineRequest: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from "sonner";
import { approveRequest, declineRequest } from "@/app/actions/host-requests";
import { RequestRow, type RequestRowData } from "@/components/host/request-row";

const approveMock = vi.mocked(approveRequest);
```

**The pragma is line 1, before the header comment.** The `vi.mock` calls sit **between** the
testing-library import and the module-under-test import — that ordering is deliberate and is the
repo's idiom in all 20 files that mock an actions module.

Two more helpers to lift verbatim (`:96-108`):

```tsx
/** Collapse JSX line wrapping so a sentence can be matched whole (`state08-alerts.test.tsx`'s helper). */
function textOf(element: Element): string {
  return (element.textContent ?? "").replace(/\s+/g, " ").trim();
}

/** Open the decline confirm overlay and press its confirm control. The overlay renders in a portal. */
async function pressDecline(row: HTMLElement): Promise<void> {
  fireEvent.click(within(row).getByRole("button", { name: `Decline request from ${GUEST}` }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Decline request" }));
}
```

`await screen.findByRole("dialog")` is how this repo reaches a `ResponsiveDialog`'s portal under jsdom —
Δ18's "either overlay" assertion needs nothing more.

**The `ResizeObserver` stub — `tests/availability/availability-calendar.test.tsx:75-83`, verbatim
(the shape used five times, and the only stub this repo sanctions):**

```tsx
// jsdom implements no ResizeObserver, and Radix's ScrollArea (which wraps the hour chips) measures
// itself with one. Same stub as tests/listing/wizard-occupancy.test.tsx.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver =
  globalThis.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver);
```

Note the `??` — it never clobbers a real implementation. **`getBoundingClientRect` has never been
stubbed in this repo and must not be** (research § E; `tests/booking/confirmation-moment.test.ts:10`
and `tests/design/scroll-area.test.ts:26` both record the refusal in prose).

**Router mock, one line — `tests/listing/photo-gallery.test.tsx:76`:**

```tsx
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
```

---

### `tests/profile/avatar-zoom.test.ts` (pure unit)

**Analog:** `tests/security/safe-callback-url.test.ts` — the repo's model for a pure-function spec:
a header naming the threat, the OBSERVED-RED transcript pasted verbatim, then table-driven cases.

```
// SEC-01 — THE DOT-SEGMENT CASES BELOW WERE WATCHED FAILING BEFORE THE GUARD WAS TOUCHED.
//
// WR-12 shipped the ten attack strings above under a commit message claiming closure, and that
// list passed a guard that still had this hole — a test never observed red is not a regression
// test. So the SEC-01 cases were added FIRST, run against the UNMODIFIED module, and the output is
// pasted here verbatim rather than summarised. The runner was a throwaway root config
// (`vitest.sec.tmp.config.ts`: no globalSetup, no setupFiles, `include` pinned to this one file)
// because the main config's Postgres preflight hard-fails a single-file run; it was deleted after
// the fix.
```

⚠ **That parenthetical is the pattern the planner needs.** See § Measured corrections #3: a pure spec
under `tests/` (outside `tests/design/`) is collected by `vitest.config.ts`, which declares
`globalSetup: ["tests/global-setup.ts"]` (`vitest.config.ts:67`) and **hard-fails without Docker +
Postgres**, even for a single-file run. This repo's answer to that has been a throwaway config, deleted
after use. IC-05's seven zoom rows are pure arithmetic and deserve better; the planner must decide
between (a) `tests/profile/avatar-zoom.test.ts` under the main config, run only when the DB is up, and
(b) the throwaway-config precedent. **`vitest.design.config.ts:53` includes only `tests/design/**`, so
"design config, no DB" is not available at that path** — research's Wave-0 note and its own test-map row
disagree on this and the test map is the one that matches the configs.

---

### `tests/profile/avatar-remove.test.ts` (integration, live `fitout_test`)

**Analog:** `tests/profile/avatar.test.ts:24-47` — the exact harness, already bound to
`uploadAvatarAction`:

```ts
let testDb: TestDb;
let testAuth: TestAuth;
let uploadAvatarAction: typeof import("@/app/actions/avatar")["uploadAvatarAction"];

// uploadAvatarAction reads the session via next/headers + auth.api.getSession and persists via
// auth.api.updateUser({ headers }). Mock next/headers to carry the signed-in cookie; bind @/lib/auth
// to the test-schema auth. Cloudinary is already mocked globally (tests/setup.ts).
const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

beforeAll(async () => {
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);
  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.resetModules();
  ({ uploadAvatarAction } = await import("@/app/actions/avatar"));
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  await teardownTestDb(testDb);
});
```

Plus `signInUser` (`:49-65`) and the row read (`:105-110`):

```ts
    const rows = await testDb.db.select().from(user).where(eq(user.id, userId));
    const row = rows[0];
    expect(row.avatarUrl).toBe(res.avatarUrl);
    expect(row.avatarPublicId).toBeTruthy();
```

For the **destroy-failure tolerance** case, `tests/listing/photos.test.ts:16, 34` adds the extra doMocks
this one lacks — `mockCloudinary` from `../helpers/mocks`, `vi.doMock("@/lib/db", …)` and
`vi.doMock("next/cache", () => ({ revalidatePath: () => {} }))`. Take the union of the two harnesses.

---

### `tests/design/avatar-copy.test.tsx` (design config)

**Analog:** `tests/design/profile-pass.test.tsx` — same route, same config, and it already owns the
byte-for-byte copy discipline. The header states the mechanism (`:15-30`):

```
//   1. file → pattern      an AST walk over the three profile files: what each composes, what it
//                          does NOT compose, and which import it reads its container class from.
//   2. pattern → attribute a RENDER of the REAL `ProfileForm` in jsdom, counting the test-id
//                          attribute off the produced DOM rather than off anybody's source.
//   3. attribute → contract that value pinned against `SELECTOR_IDS`, the closed union that declares it.
//   4. the copy            every shipped sentence written into this file as a literal, so a copy
//                          change has to move a test file and be seen in the diff (T-15-28).
```

The pinned-copy structure to copy (`:387-424`):

```ts
const PINNED_COPY: Readonly<Record<string, readonly string[]>> = {
  [FORM]: [
    "Public profile",
    …
    "Upload photo",
    "Uploading…",
    "JPG or PNG, up to 5 MB. Optional.",
    …
  ],
};
```

⚠ **It rendered the real `ProfileForm` under the design config, and the file records exactly how**
(`:33-56`) — a single `vi.mock("next/navigation")` supplying a router with three no-ops; the
`"use server"` imports resolve fine under `vitest.design.config.ts` because of its `server-only` alias.
`avatar-copy.test.tsx` can do the same for `AvatarField` without inventing anything.

---

### `tests/design/responsive-dialog-autofocus.test.tsx` (design config, jsdom render)

**Analog:** `tests/design/theme-provider.test.tsx:1-25` — the design-config spec that renders React,
and whose header is exactly the "guard-the-guard, both directions" argument Δ5b needs:

```
// @vitest-environment jsdom
…
//   2. THE SONNER MAPPING. `resolvedTheme` now returns a THEME NAME … The `"dark"` case is asserted
//      too, so this is provably a MAP and not a constant `"light"` dressed up as one — a constant
//      would pass every other assertion in this file.
```

That last sentence is the template for the negative half: *render a `ResponsiveDialog` with no
`onOpenAutoFocus` and assert focus lands where Radix puts it* — otherwise a prop that silently changed
the default would pass a `git diff` over the five adopters while breaking all six call sites.

**The five adopter files for the `git diff --exit-code` half** (re-verified 2026-08-25 —
`grep -rn "onOpenChange" src/` cross-checked against research §D13):

```
src/app/dev/theme/page.tsx                       (1 call site)
src/components/availability/blocks-editor.tsx    (2 call sites — :207 and :327)
src/components/booking/booking-sticky-bar.tsx    (1)
src/components/host/request-row.tsx              (1)
src/components/patterns/site-chrome.tsx          (1)
```

---

### `tests/listing/cover-frame-preview.test.tsx` (jsdom component, main config)

**Analog:** `tests/listing/photo-gallery.test.tsx` — same domain, same jsdom constraints, and its header
already argues the exact point Δ8 rests on (`:1-8`):

```
// TEMPLATE, and jsdom compiles no CSS. Probed by widening the three-photo shape to the five-up template:
// the DOM assertion stayed GREEN at 3 and 4 while the mosaic it describes had a hole in it.
//
// What can see it is the template's own arithmetic. `templateSlots()` below reads the column count, the
// row count and the hero's row span straight out of the declared class strings and computes how many
// photos the shape has ROOM for; the assertion is that this equals the number it RENDERS.
```

For CROP-02 the equivalent honest assertion is **the class string is the imported constant**
(`element.className` contains `MOSAIC_ASPECT`), not "the box measures 16:9" — jsdom compiles no CSS.
The reorder-follow case drives the **keyboard** move buttons (`photo-uploader.tsx:153-158` `movePhoto`),
never a dnd-kit pointer drag, for the same layout reason.

---

### `tests/listing/cloudinary-provenance.test.ts` (pure unit, security)

**Analog:** `tests/security/safe-callback-url.test.ts` — quoted above. Take its two-describe structure
(*"rejects everything that leaves the origin"* / *"preserves every legitimate callback"*) and its rule
that the second half matters as much as the first.

⚠ **The env-absence case has a real trap, measured here.** `tests/setup.ts:17-19` loads `.env.local`
then `.env` into `process.env` for **every** main-config run:

```ts
// Load .env.local first, then .env as a fallback (does not override already-set vars).
loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") });
```

and `.env.local:6` sets `CLOUDINARY_CLOUD_NAME=da8uglpk6`. So under `vitest.config.ts` the variable is
**always present**, and the fail-closed case (research #31) must delete it explicitly. Under
`vitest.design.config.ts` there is **no `setupFiles` at all**, so it is **always absent** — which is
precisely why D-165 requires `cloudName` to be an argument rather than an ambient read.

---

### `e2e/avatar-crop.spec.ts` (Playwright, chromium project)

**Analog A — geometry measured in a real browser: `e2e/calendar-hit-area.spec.ts:1-30`.** Its header is
the argument for why this spec exists at all:

```ts
import { expect, test, type Locator, type Page } from "@playwright/test";

import { BASE, seedBookableListing, type SeededListing } from "./helpers/booker-seed";
import { installTruncator } from "./helpers/served-document";
import { seedTheme } from "./helpers/theme";

// BFLOW-05 / 12-UI-SPEC AC#14 — THE DAY CELL IS 44px TALL BECAUSE A BROWSER SAID SO.
…
// (3) IS THE ONE NOBODY WOULD HAVE PREDICTED, and it is the reason this file is a `boundingBox()`
// rather than a review.
```

**Analog B — reaching `/profile` behind a session: `e2e/overflow-320.spec.ts:200-239`**, the resolver
GATE-RESP must **extend rather than duplicate**:

```ts
/**
 * `/profile`, reached by signing a booker up THROUGH THE UI (plan 15-10).
 * …
 * ⚠ IT IS NOT MEMOISED, AND THAT IS THE OPPOSITE DECISION FROM `firstListingPath` ABOVE, FOR A
 * STRUCTURAL REASON. What that one caches is a STRING discovered from the app … What this one
 * produces is a SESSION COOKIE, and Playwright's `page` fixture is per-test …
 *
 * NO SEED AND NO DATABASE FIXTURE. This drives the shipped signup form exactly as
 * `e2e/login-persistence.spec.ts:31-42` and `helpers/booker-seed.ts:327-338` do …
 */
async function signUpAndReachProfile(page: Page): Promise<string | null> {
  const email = `e2e.overflow.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto(`${BASE}/signup`);
  await page.getByRole("radio", { name: "Book a space" }).click();
  await page.getByLabel("First name").fill("Overflow");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("averylongpassword");
  await page.getByRole("button", { name: /sign up to book/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/signup"), { timeout: 30_000 });
  return "/profile";
}
```

**The extension seam already exists — `RouteRow.open`, `e2e/overflow-320.spec.ts:259-270`**, added for
exactly one row and documented as deliberately un-generalised:

```ts
  /**
   * An interaction to perform AFTER `goto` and BEFORE the measurement, for a row whose subject only
   * exists once a booker has done something.
   *
   * Added by plan 12-10 for exactly one row and deliberately not generalised further: RESP-02's booking
   * sheet is a portal, so at 320px the widest thing on the whole route is a subtree that is not in the
   * document until the sticky bar is tapped. A row that measured the closed page would be measuring the
   * page this table already covers, twice.
   */
  readonly open?: (page: Page) => Promise<void>;
```

used at `:340` as `open: (page) => openBookingSheet(page, "…").then(() => undefined)`. Phase 16's
"`/profile` with the crop dialog open" is a **second `open` row** on that table — the existing
`/profile` row is at `:509-525` and its `tell` is
`'[data-testid="panel-card"]:has-text("Private account info")'`; the new state row needs its own `tell`
naming the dialog, and the table's docblock count (`:273`, "SEVENTEEN ROUTES AND THREE ROUTE STATES —
20 rows, 40 cases") must move with it.

**⚠ NO ANALOG for the file-picker half.** `grep -rn "setInputFiles" e2e/` returns **nothing** — this
repo has never driven a file input from Playwright. `e2e/avatar-crop.spec.ts` creates that convention.

---

### `e2e/fixtures/*` — image fixtures

> **NO ANALOG. Zero binary fixtures exist in this repo outside VRT baselines, and there is no
> `e2e/fixtures/` directory at all** (`ls e2e/` → 33 specs + `helpers/` + `visual/`).

**And no `scripts/` helper generates binary anything.** The full contents of `scripts/`, measured:

| File | What it produces | Wired to |
|---|---|---|
| `db-test-setup.ts` | provisions `fitout_test` | `npm run db:test:setup` |
| `generate-design-tokens.mjs` | **text codegen** — `src/lib/design/tokens.generated.ts` + two SVGs | `npm run design:tokens` |
| `ops-alerts.ts` | CLI over the ops table | `npm run ops:alerts` |
| `patch-kysely-adapter.mjs` | postinstall patch | `postinstall` |
| `seed-baseline-fixtures.ts` | **DB rows** for the VRT job | (dispatched) |
| `seed.ts` | dev seed | `npm run db:seed` |
| `send-email-previews.ts` | sends emails | `npm run email:previews` |
| `verify-workflows.mjs` | lints `.github/workflows` | (dispatched) |

**Nearest partial match — `scripts/generate-design-tokens.mjs:1-38`.** It is a committed generator whose
output is committed and byte-checked, and its conventions transfer even though its output is text:

```
// WHAT IT WRITES (three files, all committed):
//   • src/lib/design/tokens.generated.ts   — every COLOUR token of both themes, oklch + 8-bit hex
//   • public/icon-court.svg                — the court-themed letterform favicon (D-19)
//   • public/icon-grove.svg                — its grove twin
//
// D-18 SAYS "COMMITTED, WITH A CHECK THAT FAILS ON DRIFT" — NOT "BUILT AND GITIGNORED" …
//
// PATH SAFETY (T-10-03 / ASVS V12). Every path this script reads or writes is a module-level
// `resolve(process.cwd(), "<literal>")` constant. The script takes NO parameters from the command
// line, reads none from the environment …
//
// SHAPE. `renderTokensModule` and `renderIconSvg` are PURE — text in, text out, no filesystem — so
// the drift test can render into memory and compare bytes without the test itself being able to
// repair the file it is checking. All writing happens in `main()`, which runs only when this file
// is the process entry point.
//
// DETERMINISM IS A CORRECTNESS REQUIREMENT HERE, not a nicety …
```

**What it does not cover:** producing image bytes, and specifically writing an EXIF orientation tag.
It also has a `culori` dependency doing the hard part; the fixture generator has no equivalent unless
a dependency is added — which Phase 11's "empty `package.json` diff" criterion makes an argued
exception, and Phase 16's argued exception is already spent on `react-easy-crop`. **The planner is
creating a convention here, not following one**, and should decide explicitly between a
zero-dependency hand-rolled encoder, `sharp` as a `devDependency`, or committing the bytes with a
`README` documenting their provenance.

Register it in `package.json` `scripts` if it lands (`design:tokens` is the precedent), and note that
`.gitignore` currently excludes baseline PNGs — `tests/design/gitignore-baselines.test.ts` exists to
police that, so a new `e2e/fixtures/*.png` path must not be swept up by an existing ignore rule.

---

## Modified files — current-state excerpts

### § M1 · `src/app/(app)/profile/profile-form.tsx`

**The machinery that must stay byte-unchanged.** Header (`:16-19`):

```
// ⚠ THE SAVE-STATE MACHINE IS NOT PART OF THAT CHANGE, and it is the reason to read before editing.
// `saved` is set from the ACTUAL `updateProfile` result and cleared at the top of the next submit;
// there is no timer on the save path, no optimistic flag, and nothing derived from "probably worked".
// 14-CONTEXT D-150 copied this file as the reference truthful-save model. Restyle around it.
```

The machine itself (`:58-76`):

```tsx
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: initial,
  });

  async function onSubmit(values: ProfileInput) {
    setFormError(null);
    setSaved(false);
    const result = await updateProfile(values);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }
```

And the submit + two regions below the panels (`:272-300`) — `formError` (`role="alert"`, ordinal 2),
`saved` (`role="status" aria-label="Save state"`), and the neutral submit `profile-pass.test.tsx` and
Δ9 both reason from:

```tsx
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving…" : "Save profile"}
        </Button>
```

**The seam comment that CROP-03 discharges (`:119-122`):**

```tsx
          {/* Avatar (optional — D-09) */}
          {/* ONE CONTROL, DELIBERATELY. Crop and avatar teardown are Phase 16 (CROP-01 / CROP-03);
              this row is left able to hold a second control and is given none now, because a
              destructive affordance shipped ahead of the action behind it is a button that lies. */}
```

Also byte-unchanged: the two `PanelCard` calls (`:114-118`, `:219-223`) and the comment at `:99-103`
explaining why the file input carries **no `name`** and is not registered with RHF — that property must
survive the extraction, or the values `updateProfile` receives change.

Imports to remove when the block leaves (`:27, 41`): `uploadAvatarAction`, and `Avatar/AvatarFallback/AvatarImage`.
`useRef` (`:21`) goes with it; `useState` stays.

---

### § M2 · `src/components/patterns/responsive-dialog.tsx`

**The exact current prop type (`:138-201`)** — ten props, no `className`, no width:

```ts
export type ResponsiveDialogProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  title: string;                 // REQUIRED, no default
  hideTitle?: boolean;           // = false
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  closeLabel?: string;
  onCloseAutoFocus?: (event: Event) => void;
};
```

**The docblock the new prop must twin (`:185-199`), which is the shape Δ5b asks for:**

```
  /**
   * Radix's close-time focus hook, forwarded verbatim to `DialogContent`.
   *
   * ⚠ THE REASON THIS EXISTS IS A MEASURED DEFECT, NOT A CONVENIENCE (12-07 finding 1). Radix's MODAL
   * dialog sets `onCloseAutoFocus` to `event.preventDefault()` followed by
   * `context.triggerRef.current?.focus()` — it SUPPRESSES the browser's own focus restore in order to
   * focus its own trigger, and `triggerRef` is populated only by `<DialogTrigger>`. …
   *
   * Every adopter that opens through a stable `DialogTrigger` should leave this undefined — Radix's own
   * behaviour is correct for them, and taking the decision over unconditionally would be a claim this
   * pattern has no basis for. It is here for the adopters whose trigger can go away.
   */
  onCloseAutoFocus?: (event: Event) => void;
```

**The exact DOM (`:227-260`)** — the two edit points are the destructure at `:203-214` and the
`DialogContent` attribute list:

```tsx
      <DialogContent
        data-testid="responsive-dialog"
        className={SHEET_PRESENTATION}
        showCloseButton={closeLabel === undefined}
        onCloseAutoFocus={onCloseAutoFocus}
        {...describedBy}
      >
```

`SHEET_PRESENTATION` (`:121-136`) is where `max-sm:max-h-[85dvh] max-sm:overflow-y-auto` lives —
Δ4's "the sheet is its own scroll container" is that one line. **Do not add a class to this array**;
Phase 16 touches only the prop.

⚠ `:113-117` records that AC#28 **scans this file's source** with `/\[\d+vh\]/` and requires no match —
so a comment about the stage's `40dvh` must not spell a `vh` value here.

---

### § M3 · `src/lib/cloudinary.ts`

**Lines 1-9 — the header docblock whose "face-cropped" claim ships its correction in the same commit:**

```ts
// Cloudinary avatar upload (server-only). The api_secret stays on the server — never
// shipped to the client (threat T-02-07). For a single Phase-1 avatar we route the file
// through the server via upload_stream; Phase 2 galleries should graduate to signed
// direct-to-Cloudinary client uploads (cloudinary.utils.api_sign_request).
//
// uploadAvatar stores the avatar under fitout/avatars/<userId> (overwrite:true so a user
// has one canonical avatar) and returns { secure_url, public_id } for the user row.
```

**Lines 19-38 — `uploadAvatar`; `:29` is the one-word change (D-171):**

```ts
export function uploadAvatar(
  buffer: Buffer,
  userId: string
): Promise<{ secure_url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "fitout/avatars",
        public_id: userId,
        overwrite: true,
        transformation: { width: 400, height: 400, crop: "fill", gravity: "face" },
      },
      (err, res) =>
        err || !res
          ? reject(err ?? new Error("Cloudinary upload returned no result"))
          : resolve({ secure_url: res.secure_url, public_id: res.public_id })
    );
    stream.end(buffer);
  });
}
```

**Line 13-17 — the module-scope `cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, … })`.**
Relevant to D-165: this is the **only** place `CLOUDINARY_CLOUD_NAME` is read on the server today
(`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` is the widget's). The provenance validator must not add a second
ambient read — it takes the name as an argument, and the *action* supplies it.

**Line 85 — the destroy helper to mirror:** quoted in full above.

---

### § M4 · `src/app/actions/avatar.ts`

**Lines 8-10 — the false comment (Δ / § 5 of the UI-SPEC requires it corrected in the same commit):**

```ts
//   - The uploaded file is UNTRUSTED: we validate content-type (image/*) and size (<= 5MB) with Zod
//     BEFORE touching Cloudinary (threat T-04-04). Cloudinary's transformation additionally normalizes
//     to 400x400 face-cropped, so a hostile aspect ratio cannot blow up storage.
```

**Lines 19-27 — the incident record. The new export must not break it:**

```ts
// ⚠️ THIS FILE MAY EXPORT NOTHING BUT ASYNC FUNCTIONS (and types, which erase). Next enforces that at
// MODULE EVALUATION, so one stray value export kills every action in the file, not just itself. This
// module used to export AVATAR_MAX_BYTES (a number) and avatarFileSchema (a Zod object); Next refused
// to load it … Both now live in @/lib/validation/profile (directive-free, so the client form can share
// the contract) and are deliberately NOT re-exported from here: a re-export out of a "use server"
// module is the same violation wearing a compatibility shim.
```

`export type AvatarResult` at `:34` is the proof that `export type` is legal here.
`tests/use-server-exports.test.ts` guard-the-guard at `:315-318` already pins
`toContain("src/app/actions/avatar.ts")` — no edit needed there.

---

### § M5 · `src/lib/validation/profile.ts:32-47`

```ts
/** Max avatar size — 5 MB. Larger files are rejected before any upload (T-04-04). */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Validate an uploaded avatar File: must be a non-empty image/* under the size cap. Exported so the
 * test suite can assert the guard in isolation and so callers re-validate the same contract.
 */
export const avatarFileSchema = z
  .instanceof(File, { message: "An image file is required." })
  .refine((f) => f.size > 0, { message: "The file is empty." })
  .refine((f) => f.type.startsWith("image/"), {
    message: "Only image files are allowed.",
  })
  .refine((f) => f.size <= AVATAR_MAX_BYTES, {
    message: "Image must be 5 MB or smaller.",
  });
```

Only the third refine's predicate changes; **the message stays byte-identical** (it is pinned by the
UI-SPEC's "Reused verbatim" table). The docblock's "`image/*`" sentence changes with it.

---

### § M6 · `src/app/actions/listing-photo.ts:75-111` — `persistPhoto` (D-165's target)

```ts
/**
 * Append one photo's metadata to the owner's listing. position = the current photo count (so the very
 * first upload lands at 0 = cover, D-04). Rejects beyond the soft max and validates the metadata is
 * present (the columns are NOT NULL). Returns the created row so the client can update its grid.
 */
export async function persistPhoto(
  listingId: string,
  input: { publicId: string; url: string },
): Promise<PersistPhotoResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "You must be signed in to add photos." };
  }
  const owned = await assertOwnership(listingId, userId);
  if (!owned) {
    return { ok: false, error: "We couldn't find that listing, or it isn't yours." };
  }

  const publicId = input.publicId?.trim();
  const url = input.url?.trim();
  if (!publicId || !url) {
    return { ok: false, error: "That photo didn't upload. Please try again." };
  }

  const position = await photoCount(listingId);
  …
  const id = randomUUID();
  await db.insert(listingPhoto).values({ id, listingId, publicId, url, position });

  revalidateEdit(listingId);
  return { ok: true, photo: { id, publicId, url, position } };
}
```

The provenance check slots in immediately after the `.trim()` block, reusing the **same literal**
already on line 97 (Δ15). The security-contract header at `:8-15` is where the new rule's sentence
belongs, beside `SESSION` / `OWNERSHIP` / `ORPHAN CLEANUP`.

The folder the sign endpoint scopes, for the prefix test — **`photo-uploader.tsx:177`**:

```tsx
        folder: `fitout/listings/${listingId}`,
```

---

### § M7 · `src/components/listing/photo-uploader.tsx` — the mount point

**Insert between `</DndContext>` (`:243`) and the `Add N more…` block (`:245`).** Current text, exact:

```tsx
        </DndContext>

        {photos.length < MIN_PHOTOS && (
          <p
            role="status"
            aria-label={PHOTO_REQUIREMENT_REGION_NAME}
            className="text-sm text-muted-foreground"
          >
            Add {need} more photo{need === 1 ? "" : "s"} to publish (minimum {MIN_PHOTOS}).
          </p>
        )}
      </div>
    </TooltipProvider>
```

The outer wrapper is `<div className="space-y-4">` at `:216` — it supplies the 16px gutter, so **no
margin at the call site**. `photos.length >= 1` is guaranteed because `:198-210` early-returns the
empty state; a guard there would be dead code shaped like a real branch.

**Byte-unchanged, with exact lines:**

| Region | Lines | Why |
|---|---|---|
| `CldUploadWidget` options | `:174-194` — `signatureEndpoint` `:175`, `{folder, multiple: true, maxFiles: 20, sources: ["local","camera","url"]}` `:176-181`, `onSuccess` `:182`, `onError` toast `:183-187`, render prop `:189-193` | D-A. `sources: ["url"]` and the absent `maxFileSize` are **Phase 16.1's** |
| Bespoke empty state | `:198-210` (`<h2 className="mt-3 text-lg font-medium">` at `:202`) | Δ17 |
| Reorder sentence | `:218-220` | pinned literal |
| `Add N more…` region | `:245-253` | declared live region |
| `PhotoTile`, `Cover` badge (`:302`, `bg-foreground/80`), drag handle, icon buttons | `:259+` | GATE-NOREG |

**`photos[0]` through a reorder — `commitOrder` at `:130-141`, optimistic and self-reverting:**

```tsx
  async function commitOrder(next: ListingPhotoRow[]) {
    const previous = photos;
    setPhotos(repack(next));
    const res = await reorderPhotos(listingId, next.map((p) => p.id));
    if (!res.ok) {
      setPhotos(previous);
      toast.error(res.error);
    }
  }
```

so "the preview follows the reorder live" costs zero code.

---

### § M8 · `src/lib/design/live-regions.ts`

**The row shape to copy — `:1382-1400`, the avatar alert as it stands today:**

```ts
  "profile-avatar-error": {
    file: "src/app/(app)/profile/profile-form.tsx",
    kind: "alert",
    at: 1,
    announces:
      "The upload refusal the avatar action returned, verbatim and once — the wrong-file-type " +
      "sentence, the over-5-MB sentence or the storage failure, whichever came back. …",
    why:
      "RULE 2. An upload the person started came back rejected and the file they chose is the thing " +
      "that has to change, so it is a genuine failure needing a human rather than a state. …\n" +
      "\n" +
      "⚠ ITS ORDINAL IS 1 BECAUSE OF WHERE IT SITS, NOT BECAUSE IT MATTERS MORE. …",
  },
```

**The count alias — `:1661-1663`:**

```ts
export type DeclaredFileCountIsTwentySix = Assert<
  (typeof LIVE_REGION_FILES)["length"] extends 26 ? true : false
>;
```

`LIVE_REGION_FILES` is a sorted-by-directory array (`:343+`); `"src/app/(app)/profile/profile-form.tsx"`
is at `:395` and `"src/components/listing/photo-uploader.tsx"` at `:369`. New entries go in the same
directory grouping, not appended at the end.

⚠ **See § Measured corrections #2 — the re-key hazard is real but its cause is not the one research
gave.** `at` is an ordinal, not a line number (`:227-229`, `:540`): *"1-based ordinal among regions of
the SAME KIND in the SAME FILE, in source order."* Consequences:

- `photo-uploader.tsx`'s row **does not move.** Mounting the preview above the `role="status"` shifts a
  line number, and no key reads a line number. The preview authors no region in that file, so its
  `status#1` ordinal is unchanged.
- `profile-form.tsx`'s rows **do move**, for a different reason: extracting the avatar block removes
  `profile-avatar-error` (`alert#1`) from that file, so **`profile-form-error` becomes `alert#1`** and
  the avatar refusal is re-declared against `avatar-field.tsx` at its own ordinal. `profile-save-result`
  (`status#1`) is untouched. That is two row edits plus one new row, not a line-number sweep.

---

### § M9 · `tests/design/brand-recipe.test.ts:361` — `EXPECTED_DILUTED_TOKENS`

```ts
const EXPECTED_DILUTED_TOKENS: Readonly<Record<string, string>> = {
  "background/80": "recorded — overlay scrim over the page, never carries text",
  …
  "foreground/80": "recorded — overlay scrim, never carries text",
  // 12-07. THE SAME CLASS OF THING AS THE TWO SCRIM ROWS ABOVE, and it is `recorded` rather than
  // `declared` or `exempt` for the reason those are: a surface carrying NO TEXT AND NO BOUNDARY has
  // nothing for a contrast ratio to be about. …
  "foreground/90": "recorded — the photo lightbox's full-screen scrim (12-07), carries no text",
  …
};
```

`foreground/90`'s row is the **template** for `foreground/55`: same status word, same
"carries no text" clause, and the same multi-line comment above it stating what would falsify the claim.
The status vocabulary is defined at `:349-356` (`declared` / `exempt` / `inert` / `recorded`).

**Measured count today: 20 keys** (research §D15's correction confirmed by reading the literal). The
16-UI-SPEC's "21 shapes" is off by one; the delta direction (+1) is right, the arithmetic in a plan
would not be. And the gate is bidirectional (`:1004-1019`) — **the row and the class land in the same
commit, or not at all.**

---

### § M10 · `tests/design/leak.test.ts:319-341`

```ts
  it("visits all 31 vendored primitives — there is no vendored exemption (D-17)", () => {
    …
    // 30 -> 31 BY PLAN 12-11, in that plan's own commit, and the movement is the point rather than an
    // inconvenience. `ui/collapsible.tsx` is the first registry block vendored since Phase 10 closed
    // the leak sweep over the other thirty, and this number is what forced it to be ADMITTED to the
    // gate instead of quietly appearing beside it. The block itself contains zero Tailwind classes
    // and zero raw design values, so the real `toEqual([])` assertion below did not move — which is
    // exactly the case this positive control exists for: a new primitive that leaks nothing looks
    // identical, to a violations list, to a new primitive the walker never opened.
    expect(VENDORED_PRIMITIVES).toHaveLength(31);
    expect(VENDORED_PRIMITIVES).toContain("src/components/ui/button.tsx");
    …
    // The 12-11 addition, named rather than left to the length alone: a count is satisfied by any
    // thirty-first file, and the claim here is that THIS one is inside the scanned set.
    expect(VENDORED_PRIMITIVES).toContain("src/components/ui/collapsible.tsx");
  });
```

Phase 16's edit is the same three-part move: the `it()` title (31 → 32), the length, and a named
`toContain("src/components/ui/slider.tsx")` **with its own reason comment**. Verified today:
`ls src/components/ui/` → 31 files.

---

### § M11 · `tests/design/profile-pass.test.tsx` — the four assertions, with lines

| Site | Current assertion | Why it reddens |
|---|---|---|
| `:1044-1057` (case 10) | `form.scan.fileInputs` length **1** *in `FORM`*, and `ariaLabels` contains `"Upload avatar"` once *in `FORM`*, where `const FORM = "src/app/(app)/profile/profile-form.tsx"` (`:353`) | extracting `AvatarField` moves the input **out of the scanned file** → both go to 0. **A second, independent red the file's own comment does not anticipate.** |
| `:1063-1071` (case 10) | `form.scan.texts.filter(REMOVAL_WORDS)` `toEqual([])`, `REMOVAL_WORDS = /\b(remove\|removing\|delete\|deleting)\b/i` (`:445`) | `Remove photo` / `Removing…` arrive. Its own message: *"⚠ WHEN CROP-03 LANDS THIS IS THE ASSERTION THAT REDDENS, AND THAT IS THE POINT"* |
| `:1145-1156` | the **rendered** `ProfileForm`: `getByLabelText("Upload avatar")` exists and no rendered control name matches `REMOVAL_WORDS` | reddens even with `AvatarField` in its own file, because it renders inside `ProfileForm` |
| `:387-424` `PINNED_COPY[FORM]` | pins `"Upload photo"`, `"Uploading…"`, `"JPG or PNG, up to 5 MB. Optional."`, `"Your avatar"` byte-for-byte | Δ14 retires one and changes another |

Also verified clear-if-scoped-correctly: `:988-1016` (case 8) bans `variant="destructive"` **in
`profile-form.tsx`** — keeping the confirm inside `avatar-field.tsx` avoids a fifth red.

---

### § M12 · `tests/listing/photos.test.ts` — the D-165 fixture rewrite

⚠ **Twelve `persistPhoto` call sites, not eight** (`grep -c "persistPhoto("` → 12). Measured:

```
:88-90   { publicId: "fitout/listings/abc/one", url: "https://res.cloudinary.com/mock/one.jpg" }
:105-107 { publicId: "p0"|"p1"|"p2",     url: "u0"|"u1"|"u2" }
:118-120 { publicId: "p0"|"p1"|"p2",     url: "u0"|"u1"|"u2" }
:142-143 { publicId: "p0"|"p1",          url: "u0"|"u1" }
:160-162 { publicId: "keep-0"|"gone-1"|"keep-2", url: "u0"|"u1"|"u2" }
```

**All twelve break, including `:88-90`** — its `publicId` is already legitimate, but its host is
`res.cloudinary.com/mock/…` and the cloud name under test is `da8uglpk6` (`.env.local:6`, loaded by
`tests/setup.ts:18`). Eleven of the twelve also use a `listingId` of `"abc"` or nothing, while the real
listing id is a `randomUUID()` from `makeListing` (`:66-72`) — so the prefix test needs the fixtures
built **from `listingId`**, not from a literal.

The harness that must not change (`:25-47`) is quoted under `tests/profile/avatar-remove.test.ts` above.

---

## Shared Patterns

### File-header convention (applies to every new file)

**Source:** every file quoted in this document.
Every module in this tree opens with a comment block that states (a) what the file is and which
requirement/decision id owns it, (b) **what it deliberately does not do and why**, and (c) where a
prior mistake in this area was made. `patterns/empty-state.tsx:17-21`, `patterns/responsive-dialog.tsx:11-31`,
`lib/safe-callback-url.ts:10-25`, `lib/validation/profile.ts:10-18` and `actions/avatar.ts:19-27` are five
independent instances. A Phase-16 file without one is off-pattern.

### `"use server"` export discipline

**Source:** `src/app/actions/avatar.ts:19-27` + `src/lib/validation/profile.ts:10-18`
**Apply to:** `src/app/actions/avatar.ts`, `src/app/actions/listing-photo.ts`
Async functions and `export type` only. **A re-export is the identical violation wearing a shim.**
Enforced by `tests/use-server-exports.test.ts` over the TypeScript AST (research §D16 for the exact
detector). The build script `npm run build` = `lint && test:design && next build` is the only thing that
proves the module *evaluates*.

### Result-shape and error-string discipline

**Source:** `src/app/actions/avatar.ts:34-36`, `src/app/actions/listing-photo.ts:36-39`
**Apply to:** `removeAvatarAction`, the D-165 rejection

```ts
export type PhotoResult = { ok: true } | { ok: false; error: string };
export type PersistPhotoResult =
  | { ok: true; photo: ListingPhotoRow }
  | { ok: false; error: string };
```

The client renders `res.error` **verbatim** and never re-authors it — `request-row.tsx:178-180` states
the rule: *"THE SERVER'S OWN SENTENCE, VERBATIM. No client-side re-authoring: a second wording of a
refusal is a second thing that has to be kept in agreement with the action that refused."*

### Pending-state discipline on a control

**Source:** `host/request-row.tsx:159, 205-212`; `group/remove-attendee-button.tsx:144-146`
**Apply to:** `Save photo`, `Remove photo` (confirm), `Cancel`, `Keep photo`

```tsx
  if (declining) return;              // re-entrancy guard BEFORE the disabled attribute applies
  …
  <Button disabled={pending} aria-disabled={pending}>{pending ? "Removing…" : "Remove attendee"}</Button>
```

Both attributes, always. The re-entrancy guard, always.

### Touch targets

**Source:** `src/components/ui/button.tsx:112-115`
**Apply to:** all six controls this phase adds (Δ12)

```
        // DS-09 — a 44px control height, which is 4 x 11 and so already on the spacing grid (no
        // arbitrary value needed). EXPLICIT OPT-IN, NEVER A RESPONSIVE DEFAULT (D-22) … The cost of
        // that choice, recorded here rather than discovered later: NOTHING ENFORCES ADOPTION
        // AUTOMATICALLY …
        touch:
          "h-11 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
```

`sm` is `h-7` = 28px (`:104`). 999.2's `size="sm"` would ship 28px into the phase whose fourth
requirement is *"cropping works on a real touch device"*.

### Focus recipe

**Source:** `tests/design/focus-recipe.test.ts:110-116`; instances at `ui/button.tsx:74` and
`patterns/result-card.tsx:128`
**Apply to:** the crop stage's `tabIndex={0}` container, the slider thumb

```ts
/** The one app-wide recipe, defined in `src/components/ui/button.tsx` by plan 10-06. */
const CANONICAL_RECIPE =
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** The shadcn default this phase exists to delete, and the stylesheet's outline twin. */
const HALF_ALPHA_RING = "ring-ring/50";
```

### Live-region declaration

**Source:** `src/lib/design/live-regions.ts:1382-1400`; the hoisted-name idiom at `photo-uploader.tsx:60-81`
**Apply to:** every `role="alert"` in `avatar-field.tsx` and `image-crop-dialog.tsx`
A row, an `announces`, a `why` naming the numbered rule, and the count alias renamed — all in the same
commit as the element (Δ10). A declared row with no element fails as loudly as the reverse.

### Test-file conventions

**Source:** `tests/host/request-refusal.test.tsx:1-64`, `tests/profile/avatar.test.ts:12-47`
**Apply to:** all eight new specs
`// @vitest-environment jsdom` on **line 1**, above the header comment. Header states what the test
catches *and what would still pass without it*. `vi.mock` of the actions module between the
testing-library import and the component import. `vi.mocked(fn)` handles hoisted to module scope.
Shipped server strings re-declared as named constants with a `file:line` citation and asserted with
`toBe`, never `toContain`.

---

## No Analog Found

Files with no honest match in this codebase. The planner should use `16-RESEARCH.md` / `999.2-UI-SPEC.md`
for these and should **not** let a plan cite a near-miss as precedent.

| File | Role | Nearest partial match | What the partial does NOT cover |
|---|---|---|---|
| `src/lib/avatar-canvas.ts` (decode / measure / EXIF / `toBlob` + white matte) | utility, transform | `src/lib/cloudinary.ts:19-38` — a callback API wrapped in a `Promise` | No canvas, no `Image`, no `createImageBitmap`, no EXIF anywhere in `src/`. The white-matte literal's *home* is settled (Δ7, `src/lib/**` is outside the leak gate) but nothing here has ever written one. |
| `e2e/fixtures/*` (11 binary images) | fixtures | `e2e/visual/**-snapshots/*.png` (VRT baselines) | Baselines are *outputs*, gitignore-policed by `tests/design/gitignore-baselines.test.ts`, and are never *inputs* to a spec. `find`ing image inputs under `tests/` or `e2e/` returns nothing. |
| `scripts/generate-image-fixtures.*` | script, codegen | `scripts/generate-design-tokens.mjs` | Text codegen with a `culori` dependency doing the colour maths. No precedent for producing image bytes, and none at all for writing an EXIF orientation tag. **This creates a convention.** |
| Playwright file-picker driving in `e2e/avatar-crop.spec.ts` | test | — | `grep -rn "setInputFiles" e2e/` returns **nothing**. Zero precedent. |
| The pre-dialog guard chain (type → size → decode → dimensions) in `avatar-field.tsx` | component logic | `profile-form.tsx:79-82` (a two-line `if (!file) return`) | No client-side guard chain exists anywhere; the app has always validated server-side only. |
| `variant="destructive"` on a **Button** | component | `host/payout-banner.tsx:69` (`<Alert variant="destructive">`) | The variant's Button form has **zero** call sites in `src/`. Δ5's "exactly one new use" is the app's first. |
| The `40dvh`/`min()` crop-stage box | component sizing | `measurements.ts:352-355` `HOLD_COUNTDOWN_BOX` (a derived-not-chosen reservation) | `measurements.ts` is **read-only** this phase (Δ-budget), so the derivation is authored at the call site — a shape this repo has deliberately avoided. |

---

## Measured corrections

Four upstream claims that did not survive contact with the file. Each was verified by opening the file
named.

**1 · The server-safety design test is `empty-state-adoption.test.ts`, not `server-only-guards.test.ts`.**
Research § E #17 points `CoverFramePreview`'s server-safety proof at
`tests/design/server-only-guards.test.ts`. That file (read `:1-90`) polices `import "server-only"` under
D-34/GATE-05 — a **different** property. The *"has no `use client` directive prologue"* assertion, with
an AST detector and a both-directions self-test, is
`tests/design/empty-state-adoption.test.ts:546-575, 1000-1021`. Use that one.

**2 · `live-regions.ts`'s `at` is an ordinal, not a line number — so §D18's line-shift hazard does not
exist as described.** `live-regions.ts:227-229` and `:540` both define it: *"1-based ordinal among
regions of the SAME KIND in the SAME FILE, in source order."* Mounting `CoverFramePreview` above
`photo-uploader.tsx`'s `role="status"` therefore breaks **nothing**. A real re-key *is* required — but in
`profile-form.tsx`, and because extraction removes `alert#1` from that file, promoting
`profile-form-error` from `alert#2` to `alert#1`. See § M8.

**3 · A pure spec under `tests/profile/` pays the Postgres preflight.** Research's Wave-0 list calls
`tests/profile/avatar-zoom.test.ts` *"design config; no DB"*, but `vitest.design.config.ts:53` includes
`tests/design/**` only, and `vitest.config.ts:67-72` collects everything else with
`globalSetup: ["tests/global-setup.ts"]`. `tests/security/safe-callback-url.test.ts:20-24` records the
repo's own workaround (a throwaway single-file config, deleted after use). The planner must choose
explicitly. See § `avatar-zoom.test.ts`.

**4 · Two counts are off, in opposite directions.**
`tests/listing/photos.test.ts` has **12** `persistPhoto` call sites, not 8 — and the twelfth
(`:88-90`) also breaks, on its `res.cloudinary.com/mock/…` host. `EXPECTED_DILUTED_TOKENS` has **20**
keys, not the 16-UI-SPEC's 21 (research §D15 already caught this; confirmed independently by reading
`brand-recipe.test.ts:361-395`).

---

## Metadata

**Analog search scope:** `src/components/{profile,listing,host,group,patterns,ui,availability,booking}/`,
`src/app/actions/`, `src/app/(app)/profile/`, `src/lib/{,design,listing,validation}/`, `tests/`,
`tests/design/`, `e2e/`, `scripts/`, `drizzle/`, plus `git log -- src/components/ui/`.
**Files opened first-hand:** 34.
**Not mapped, deliberately (scope fence):** every Phase-16.1 item — `maxFileSize`, `clientAllowedFormats`,
`sources: ["url"]`, incoming transformations, EXIF-GPS stripping, the orphan audit, and the pixel-dimension
guard on the listing path. `src/app/api/cloudinary/sign/route.ts` was **not** opened; `ALLOWED_SIGN_KEYS`
is untouched this phase.
**Pattern extraction date:** 2026-08-25.
