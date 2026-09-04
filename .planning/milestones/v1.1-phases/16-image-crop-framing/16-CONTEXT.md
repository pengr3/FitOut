# Phase 16: Image Crop & Framing - Context

**Gathered:** 2026-08-25
**Status:** Ready for planning

<domain>
## Phase Boundary

**A user controls how their image is framed before it is committed, and the server stops re-framing what they just chose.**

Four deliverables, all of them *framing*:

1. **CROP-01** — a real pre-upload cropper for the avatar (pan + zoom + confirm), and the removal of the
   server's blind `gravity: "face"` guess at `src/lib/cloudinary.ts:29`.
2. **CROP-03** — avatar removal, which does not exist in any form today.
3. **CROP-02** — a non-destructive cover-frame preview on the host photo wizard, showing what the 16:9
   hero and the 4:3 cards each cut off. Nothing baked into the stored asset.
4. **CROP-04** — the whole thing verified on real touch hardware, not desktop emulation.

**Plus exactly ONE folded item outside framing** (D-165): server-side provenance validation of the
`publicId`/`url` written by `persistPhoto`. Folded because it sits on a *public* surface, because
Phase 16 is already editing that file's neighbourhood, and because it is small. See D-166 for
everything that was deliberately NOT folded.

**This phase does not rewrite the upload pipeline.** Both round-trips (avatar-through-server,
listing-direct-to-Cloudinary) are proven against real Cloudinary and stay as they are.

</domain>

<decisions>
## Implementation Decisions

### Scope — the PM's call, made 2026-08-25

- **D-164 — Phase 16 stays FRAMING.** The PM raised upload hardening (size regulation, malicious-upload
  defence, shrinking stored files) during discussion. Measured against the roadmap's own filter — *"if I
  build this, does a REQUIREMENTS ID change?"* — it does, several times over. So it is not absorbed here.
  Phase 16 delivers CROP-01..04 and nothing else, save the one item below.

- **D-165 — ONE hardening item folds in: `persistPhoto` provenance validation.**
  `src/app/actions/listing-photo.ts:93-108` checks session and listing ownership, then accepts the
  client-supplied `publicId` and `url` on nothing but a `.trim()` non-empty test and inserts both. The
  signed-upload pipeline in front of it is airtight; this write behind it trusts the client completely.
  A host can therefore skip the widget, call the action directly with any URL string, and have it
  rendered as `<img src>` on their **public** listing page to every booker — arbitrary third-party
  content served under FitOut's product surface.

  **The rule to implement, server-side, in the action:**
  - `url` must be on our own Cloudinary delivery origin, derived from `CLOUDINARY_CLOUD_NAME`
    (there is no existing allow-list to reuse — the app renders plain `<img>`, so there are no
    `next/image` `remotePatterns` and no host constant anywhere in the tree today).
  - `publicId` must sit under `fitout/listings/<listingId>/` — the same folder the sign endpoint
    scopes at `route.ts:85`. The planner must confirm the exact `public_id` shape Cloudinary returns
    for a foldered upload before pinning the prefix test.
  - Rejection is a normal `{ ok: false, error }` result, consistent with the action's existing shape.
  - **No schema change** — this is validation only. GATE-06 holds; `drizzle/` stays at `0025`.

- **D-166 — everything else the PM raised becomes a new phase, inserted as Phase 16.1** (mirroring the
  13.1 pattern). Listed in `<deferred>` below with the measured evidence for each, so the new phase
  starts from findings rather than from a re-investigation.

### The inherited contract

- **D-176 — `999.2-UI-SPEC.md` is the contract, but it is NOT current, and the deltas are named.**
  It was written 2026-08-10 against the pre-Phase-10 codebase and it is thorough — frame size, mask
  shape, zoom bounds, degenerate sources, cancel semantics and the copy literals are all settled there
  and are NOT to be re-derived. But Phases 10–15 moved the ground under three of its assumptions:

  | Spec assumption | What is actually true now |
  |---|---|
  | Open Q6: "no shared ratio constant exists, so keep inline literals + assert equality in a test" | `src/lib/design/measurements.ts` exports `MOSAIC_ASPECT = "aspect-[16/9]"` and `RESULT_CARD_MEDIA = "aspect-[4/3]"`. The import is free. **Reversed by D-170.** |
  | Design system is "shadcn radix-nova / neutral" as locked in Phases 02–09 | Replaced by the Phase 10 token system; D-129 makes the product **light-only (`court`)**, D-127 makes the visual layer an explicit placeholder |
  | The 16:9 hero is `<AspectRatio ratio={16/9}>` at `photo-gallery.tsx:40` | Phase 12 rewrote that file into a count-driven mosaic whose outer box is the `MOSAIC_ASPECT` class, deliberately *not* the Radix primitive |

  `/gsd:ui-phase 16` runs and produces `16-UI-SPEC.md` as a **delta** over 999.2 — re-deciding only what
  moved, inheriting the rest by reference. It does not restate the settled contract.

- **Locked upstream and NOT reopened:** operator decisions **D-A** (listing side is a preview, not a
  crop — no delivery-code change, no sign allow-list edit, `multiple: true, maxFiles: 20` intact),
  **D-B** (removal is in scope), **D-C** (the original is discarded; only the 400×400 result reaches
  Cloudinary, `overwrite: true`, no schema column).

### The avatar cropper (CROP-01)

- **D-167 — the constraints are locked; the engine is the researcher's to confirm.**
  Binding: pinch-zoom, drag-pan and a slider must all work on real hardware (CROP-04); the overlay is
  Phase 11's `src/components/patterns/responsive-dialog.tsx` and **not** a new one; the work adds no
  second focus trap and no second escape behaviour.

  999.2 nominated `react-easy-crop`. That does not conflict with Phase 11's refusal of `sheet`/`vaul`,
  whose stated reason was *"two focus-trap implementations, two escape behaviours, and two sets of
  baselines for one concept"* — a crop-math library supplies none of those three, and the dialog stays
  ours. It remains a net-new `package.json` dependency and the researcher must confirm it (or a
  hand-rolled pointer-events implementation) against the CROP-04 hardware bar. **Hand-rolling
  cross-browser pinch is where this class of bug lives; the library is the recommended default.**

  Also net-new and currently absent from the 30 vendored primitives: `slider` for the zoom row. Neither
  `src/components/ui/slider.tsx` nor `alert-dialog.tsx` exists today.

- **D-171 — `gravity: "face"` becomes `gravity: "center"`, and the transform is KEPT.**
  `src/lib/cloudinary.ts:29` runs `{ width: 400, height: 400, crop: "fill", gravity: "face" }` on every
  avatar. On a source with no face Cloudinary picks a region for the user — literally the complaint that
  created this phase. It is not *deleted*, per 999.2 Open Q10: `uploadAvatarAction` is publicly
  reachable and `avatarFileSchema` guards type and byte size but **not pixel dimensions**, so the
  transform stays as a server-side ceiling. On the honest path — where the client already sends exactly
  400×400 — it is the identity.

- **D-172 — output encoding: 400×400 JPEG, transparency flattened onto white** (999.2 Open Q3). One
  format, no branching, bounded size. IC-02 makes the matte visible before the user confirms.

- **D-173 — the framing controls carry no extras.** Zoom floor = fit-the-mask; ceiling =
  `min(anti-blur bound derived from source px, 3×)` (Open Q2). No rotation control (Open Q4). No numeric
  zoom readout (Open Q11). `AVATAR_MIN_SOURCE_PX = 200` as a soft floor (Open Q1). All four are single
  exported constants or one removed branch — cheap to reverse if UAT says otherwise.

- **D-174 — the same-file re-pick bug is an acceptance criterion, not a nicety.** CROP-04 names it:
  cancel the cropper, pick *the identical file* again, and it must re-open. The file input's `value`
  must be reset after every handled change, or the browser fires no `change` event and the flow dies
  silently. `profile-form.tsx:78-92` does not do this today.

### Avatar removal (CROP-03)

- **D-168 — the confirm reuses `responsive-dialog`; the `alert-dialog` block is NOT added.**
  999.2 Open Q9 chose `alert-dialog`. Phase 11's reasoning against `sheet` applies with equal force —
  one overlay mechanism, one focus trap, one escape behaviour in the app. The trade is real and is
  recorded: we give up the native `role="alertdialog"` semantics. Mitigation is binding: **default
  focus lands on the safe action (`Keep photo`), never on `Remove photo`**, and the destructive verb
  is the only place destructive color appears (999.2 § Color).

- **D-169 — removal is null-first, destroy best-effort.** Null `avatarUrl` + `avatarPublicId` on the
  user row **first**, then call Cloudinary destroy. If destroy fails the user still sees a truthful UI
  and we have an orphaned asset (logged, and swept by the Phase 16.1 orphan audit). The reverse order
  risks a live row pointing at a destroyed asset — a broken image on a public profile. `destroyListingPhoto`
  in `src/lib/cloudinary.ts:85` is the shape to follow; the avatar equivalent does not exist yet.

- There is **no `removeAvatarAction` of any kind** today. `profile-form.tsx:120-122` carries a comment
  explicitly reserving the seam for this phase: *"a destructive affordance shipped ahead of the action
  behind it is a button that lies."* **AUTHUI-02 stays Pending until CROP-03 lands** (REQUIREMENTS.md:274).

### The cover-frame preview (CROP-02)

- **D-170 — import the ratio constants; do not re-assert them.** Reverses 999.2 Open Q6, whose premise
  ("the three shipped render surfaces keep their inline literals") is no longer true. `measurements.ts`
  already centralizes both values with exactly the "structurally cannot disagree" guarantee Q6 was
  reaching for via a test. The preview imports `MOSAIC_ASPECT` and `RESULT_CARD_MEDIA`; the shipped
  render surfaces are still **not edited**.
- **Two frames, not three** (Open Q7) — 16:9 and 4:3, covering the cover photo only.
- **Below the grid, not on the cover tile** (Open Q8) — that tile already carries a badge, a drag handle
  and three icon buttons; a fourth affordance is unreadable at 320px.

### Verification

- **D-175 — CROP-04 is discharged by a PM hardware walk, recorded like EMAIL-03 was.** Desktop touch
  emulation does not satisfy it and no automated suite can. The phase carries a `human_needed` UAT
  document naming the device(s) and OS, and walking: drag-pan, pinch-zoom, the slider, cancel →
  re-pick-the-same-file, and removal. Planning must not claim CROP-04 from a Playwright run.
- The five hard gates (GATE-RESP / A11Y / STATES / VRT / NOREG) apply — this is a surface-touching phase.
  The cropper is a new surface and needs designed loading and error states as *rendering* assertions.

### PM rulings made 2026-08-25, AFTER research — both amend settled contract text

Research (`16-RESEARCH.md` § Open Risks R4, R5) found two places where the inherited 999.2 contract
disagrees with what is physically true of the chosen library. Both were escalated rather than absorbed,
and both were ruled on by the PM on 2026-08-25.

- **D-177 — the crop stage's backing is `bg-background`; 999.2 § 2b's `bg-muted` is amended away.**
  Research measured that `.reactEasyCrop_Container` is `position: absolute; inset: 0` with **no background
  of its own**, so the wrapper's colour shows *both* as letterboxing on an extreme aspect *and* through a
  transparent PNG. 999.2 § 2b (`bg-muted`, letterbox backing) and Δ7 (`bg-background`, the matte) are
  therefore claims about **the same element** and cannot both hold. **Δ7 wins:** IC-02 — *the user sees the
  white matte before confirming* — is a named acceptance criterion, and letterboxing is cosmetic. The cost
  is accepted and recorded: letterbox bars on a panorama render white rather than grey.

- **D-178 — the keyboard pan contract is the library's, not 999.2 § 2g's; § 2g is amended to match.**
  `react-easy-crop@6.2.3` already ships `tabIndex={0}`, arrow-key panning and `restrictPosition` clamping,
  and its **Shift modifier is a 0.2× *fine* adjust**. 999.2 § 2g asks for 8px steps with Shift as a 24px
  *coarse* adjust — the opposite direction. **We accept what ships.** The accessibility requirement is
  still met (the stage is focusable and pannable without a pointer); only the modifier's direction changes.
  **No custom `keydown` handler is layered over the library's**, and no suppression of its handler — that
  would re-create the cross-browser pointer/gesture bug class D-167 chose a library to avoid.
  A plan that authors avatar-stage key handling has left this decision.

### Claude's Discretion

- Canvas/decode API used to produce the 400×400 blob — any path satisfying IC-06 and the EXIF proof.
- Whether the client-side dimension guard shares a module with the Zod schema.
- File/module layout for the new cropper composite and the new avatar server actions.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The inherited design contract
- `.planning/phases/999.2-profile-picture-and-listing-photo-crop-ui/999.2-UI-SPEC.md` — the settled
  framing contract: operator decisions D-A/D-B/D-C, invariants IC-01..IC-06 (mask/render/bytes, zoom
  bounds, output encoding), § 2e degenerate sources, § 2f cancel semantics, § 2g accessibility, and the
  exported copy literals in § Copywriting. **Read it before planning. Do not re-derive it.** Superseded
  only where D-176 names a delta.

### Roadmap, requirements, constraints
- `.planning/ROADMAP.md` § Phase 16 — goal, dependencies, the four success criteria
- `.planning/ROADMAP.md` § Cross-Cutting Constraints (v1.1) — the five hard gates, GATE-06 (zero
  migrations), D-127 (placeholder visual layer), D-129 (light-only), D-130 (no logic moves client-side)
- `.planning/REQUIREMENTS.md:98-101` — CROP-01..04 verbatim; `:274` — the AUTHUI-02 / CROP-03 boundary

### The code this phase changes
- `src/lib/cloudinary.ts:19-38` — `uploadAvatar`; line 29 is the `gravity: "face"` guess (D-171).
  Line 85 `destroyListingPhoto` is the destroy shape to mirror for the avatar (D-169)
- `src/app/actions/avatar.ts` — `uploadAvatarAction`. ⚠ `"use server"` module: **async functions only**.
  Its own header records that exporting a number from it once killed avatar upload for all of Phase 1.
  Constants belong in `src/lib/validation/profile.ts`; `tests/use-server-exports.test.ts` enforces it
- `src/app/(app)/profile/profile-form.tsx:118-156` — the avatar row and its reserved seam (D-174, CROP-03)
- `src/lib/validation/profile.ts:32-47` — `AVATAR_MAX_BYTES` + `avatarFileSchema`; type and size only,
  **no dimension check** (the reason D-171 keeps the server transform)
- `src/app/actions/listing-photo.ts:75-111` — `persistPhoto`, the folded fix (D-165)
- `src/components/listing/photo-uploader.tsx:174-194` — widget options and the cover tile (CROP-02)

### The patterns and constants to reuse
- `src/components/patterns/responsive-dialog.tsx` — THE overlay primitive. Its header carries the
  recorded refusal of `sheet`/`vaul` that D-167 and D-168 both reason from; `tests/design/sheet-absent.test.ts`
  enforces it
- `src/lib/design/measurements.ts:50` (`RESULT_CARD_MEDIA`) and `:365` (`MOSAIC_ASPECT`) — the two
  ratios the preview imports (D-170)
- `src/components/listing/photo-gallery.tsx:39-47` — why the 16:9 box is a class and not `<AspectRatio>`;
  read before touching anything ratio-shaped

### Untouched, deliberately
- `src/app/api/cloudinary/sign/route.ts` — `ALLOWED_SIGN_KEYS` (line 35) is load-bearing security.
  Phase 16 adds **no** signed param. Read it to understand why the shrink work (Phase 16.1) is shaped
  the way it is

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `patterns/responsive-dialog.tsx` — one overlay, two presentations; the cropper shell and the removal
  confirm both compose it rather than adding primitives
- `lib/design/measurements.ts` — both cover ratios already centralized (this is what reverses Open Q6)
- `lib/cloudinary.ts:85` `destroyListingPhoto` — the `{ invalidate: true }` destroy shape to mirror
- `ui/avatar.tsx`, `ui/button.tsx`, `ui/dialog.tsx`, `ui/aspect-ratio.tsx` — all present

### Established Patterns
- **`"use server"` modules export async functions and nothing else.** A stray value export kills every
  action in the file at module evaluation. Enforced repo-wide by `tests/use-server-exports.test.ts`
- **One overlay mechanism, one focus trap.** `sheet` is absent and asserted absent
- **Ratios live in `measurements.ts` as class strings**, not as Radix `ratio={}` props, so the class IS
  the constant and a skeleton cannot disagree with its plate
- **Truthful save state** — `profile-form.tsx` is the reference model (14-CONTEXT D-150): `saved` comes
  from the actual action result, cleared at the top of the next submit

### Integration Points
- `profile-form.tsx` gains: the cropper dialog, a Remove control, and the `input.value` reset (D-174)
- `photo-uploader.tsx` gains: the two-frame preview below the grid (D-170)
- `actions/avatar.ts` gains: `removeAvatarAction`; `uploadAvatarAction` now receives a pre-cropped blob
- `actions/listing-photo.ts` `persistPhoto` gains provenance validation (D-165)
- `lib/cloudinary.ts` gains an avatar destroy helper; line 29's gravity changes

### Net-new dependencies this phase must justify at plan time
`react-easy-crop` (D-167) and the shadcn `slider` block. Both are absent today. `alert-dialog` is
explicitly NOT added (D-168). Phase 11 shipped "empty `package.json` diff" as an acceptance criterion,
so any addition here is a deliberate, argued exception rather than a silent one.

</code_context>

<specifics>
## Specific Ideas

- The phase's origin sentence, from the operator on 2026-08-10, still the standard to hit:
  *"it just inserted the photo without confirming or adjusting the zoom and whatever. That's the standard."*
- The PM's framing on 2026-08-25, which produced D-164/165/166: upload safety and file-size economy
  matter, but they are a different job from framing, and folding them in wholesale would make the phase
  unverifiable as polish.

</specifics>

<deferred>
## Deferred Ideas

**→ Phase 16.1 — Upload Hardening & Storage Economy** (to be inserted; see D-166). Every item below was
measured against the live code on 2026-08-25, so the new phase starts from evidence:

- **No size limit exists on the host path at all.** `photo-uploader.tsx:177-180` passes
  `{folder, multiple, maxFiles: 20, sources}` — there is no `maxFileSize`. The error toast at line 185
  tells the host *"an image under 10MB"*, but nothing in our code enforces 10MB; that is Cloudinary's own
  plan limit doing the work. **Our copy describes a vendor default we neither control nor declare.**
  (The avatar path does this correctly: `AVATAR_MAX_BYTES` = 5MB, checked server-side.)
- **No format allow-list.** No `clientAllowedFormats`, so SVG, TIFF, HEIC and animated GIF all pass.
  SVG is the one that matters — it is a scriptable document, not an image.
- **`sources` includes `"url"`**, letting a client hand Cloudinary an arbitrary remote address to fetch.
  It also defeats any client-side size check by construction.
- **Shrink stored assets — and the bandwidth win is the bigger half.** FitOut delivers the raw,
  untransformed `secure_url` through a plain `<img>` at every site, so a host's 8MB phone photo is 8MB
  *on every page view by every booker*, not 8MB once on disk. The mechanism that fits our constraints is
  an **incoming transformation at upload time** (long-edge cap + `quality: auto` + `format: auto`), which
  replaces the stored asset and **changes no delivery URL** — so it avoids the pipeline rewrite that
  finding N2 put out of scope. **The shaping constraint:** `ALLOWED_SIGN_KEYS` refuses to sign anything
  but `{folder, source, timestamp}` and that refusal is load-bearing, so the transformation cannot be a
  client-passed param. It must live where the client cannot influence it — a named Cloudinary upload
  preset, or a narrow server-fixed extension to the allow-list. Also: this helps **new** uploads only;
  existing assets need a separate backfill decision.
- **No pixel-dimension guard.** `avatarFileSchema` checks MIME type and byte size but not dimensions —
  a 40MP image inside 5MB is a decompression bomb against whatever decodes it. (D-171 keeps the server
  transform precisely because this hole is open.)
- **EXIF/GPS stripping.** Uploaded photos carry GPS coordinates. Hosts photographing a space they may
  live in makes this a real privacy decision, either way.
- **Orphaned-asset audit.** Row deletion destroys the Cloudinary asset, but the draft-abandonment and
  failure paths need checking — plus the orphans D-169 knowingly tolerates.

**→ A later delivery-pipeline phase (not 16.1).** The real fix for listing covers is a stored focal
region delivered per-surface: new persisted geometry, a URL builder, and three rewritten render sites.
999.2 § Source of truth finding 4 rules it out of scope here, and CROP-02 ships the honest half instead.

</deferred>

---

*Phase: 16-image-crop-framing*
*Context gathered: 2026-08-25*
