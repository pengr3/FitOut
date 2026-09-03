# Phase 16: Image Crop & Framing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-25
**Phase:** 16-image-crop-framing
**Areas discussed:** Phase scope (framing vs upload hardening)

---

## How this discussion actually ran

The standard four-gray-area prompt (cropper engine / removal mechanics / preview shape / hardware
evidence) was presented and **dismissed**. The PM redirected: *"i wont be answering your questions,
instead i want to state what i want to happen basically"* — and then stated three things:

1. Regulate file-size uploads from hosts, and defend against malicious uploads.
2. Shrink uploaded files to save space, if possible.
3. *"What else is there"* — an ask for the rest of the problem surface.

So the discussion inverted: rather than Claude asking and the PM choosing, the PM set direction and
Claude measured it against the live code and reported back. Everything below was verified first-hand
against the repo on 2026-08-25, not recalled.

---

## Scope — framing vs upload hardening

The PM's three points are all real and all **outside** the phase as the roadmap scopes it. Measured
against the roadmap's own filter (*"if I build this, does a REQUIREMENTS ID change?"*), upload
hardening fails it — it would add several IDs, which is precisely the test for "not polish."

| Option | Description | Selected |
|--------|-------------|----------|
| Widen Phase 16 | Rescope to "image handling" and absorb the hardening requirements. Bigger phase, no longer verifiable as polish. | |
| Keep 16 pure + a separate phase | Framing only; hardening becomes its own inserted phase. Clean, but leaves a live public-surface hole unfixed for another phase's duration. | |
| **Split by urgency** | Fold only the `persistPhoto` URL validation into 16 — small, on a public surface, in a file 16 already touches — and phase the rest as 16.1. | **✓** |

**PM's choice:** the third (Claude's recommendation), confirmed with *"yeah go ahead"*.
**Result:** D-164, D-165, D-166 in CONTEXT.md.

---

## What was measured, and what it showed

Reported to the PM in response to their three points. Kept here because the evidence is what Phase 16.1
will start from.

### Already defended on the host upload path — and defended well
`/api/cloudinary/sign` gates on session (401), rate-limits 30 signatures/60s **keyed on user id**,
verifies listing ownership before minting (403), and allow-lists the signable params to
`{folder, source, timestamp}` so no arbitrary Cloudinary key can ever be signed. The `api_secret`
never leaves the server. None of this needs work.

### Not defended
| Finding | Evidence |
|---|---|
| **No size limit anywhere on the host path** | `photo-uploader.tsx:177-180` — options are `{folder, multiple, maxFiles: 20, sources}`. No `maxFileSize`. The toast at `:185` promises *"under 10MB"*; nothing in our code enforces it — that is Cloudinary's plan limit. Our copy describes a vendor default we do not control. |
| **No format allow-list** | No `clientAllowedFormats` — SVG, TIFF, HEIC, animated GIF all pass. SVG is a scriptable document. |
| **`sources` includes `"url"`** | Lets the client hand Cloudinary an arbitrary remote address to fetch; also defeats any client-side size check by construction. |
| **`persistPhoto` trusts the client completely** | `listing-photo.ts:93-108` — session ✓, ownership ✓, then `publicId`/`url` accepted on a `.trim()` non-empty test and inserted. A host can bypass the widget and store any URL string, rendered as `<img src>` on their **public** listing page. **This is the item that got folded (D-165).** |
| **No pixel-dimension guard** | `avatarFileSchema` checks MIME type + byte size only. A 40MP image inside 5MB is a decompression bomb. |

**Ranking note given to the PM:** the sharpest gap is the *persistence* step, not the *upload* step —
the signed pipeline in front of it is airtight and the write behind it is not.

### On shrinking files
Confirmed worth doing, with a correction to the framing: **bandwidth is the bigger half, not storage.**
FitOut delivers the raw untransformed `secure_url` through plain `<img>` at every render site, so an
8MB host photo is 8MB *per page view per booker*, not 8MB once on disk.

The mechanism that fits the constraints is an **incoming transformation at upload time** — it replaces
the stored asset and changes **no delivery URL**, so it sidesteps the pipeline rewrite that 999.2's
finding N2 ruled out of scope. The shaping constraint is that `ALLOWED_SIGN_KEYS` deliberately refuses
to sign anything beyond `{folder, source, timestamp}`, and that refusal is load-bearing security — so
the transformation cannot be a client-passed param. It has to live where the client cannot influence
it (a named upload preset, or a narrow server-fixed allow-list extension). Helps new uploads only;
backfill of existing assets is a separate decision.

---

## Also surfaced under *"what else is there"*

- **Avatar removal (CROP-03)** — no `removeAvatarAction` exists in any form; `profile-form.tsx:120-122`
  carries a comment reserving the seam. AUTHUI-02 is Pending solely because of it. *(Already in scope.)*
- **The blind server re-crop** — `cloudinary.ts:29` still runs `gravity: "face"`. *(Already in scope, CROP-01.)*
- **Orphaned assets** — row deletion destroys the asset, but draft-abandonment and failure paths are unchecked.
- **EXIF/GPS** — uploaded photos carry coordinates; hosts may be photographing where they live.

---

## Deltas found in the inherited 999.2 UI-SPEC

Not a discussion item, but discovered while scouting and recorded because it changes downstream work.
The spec is 2026-08-10, written pre-Phase-10. Three assumptions have since moved — most consequentially
**Open Question 6**, whose premise ("no shared ratio constant exists") was overturned when Phase 12
created `src/lib/design/measurements.ts`. See CONTEXT.md D-176 and D-170.

---

## Claude's Discretion

The PM explicitly declined to answer the implementation questions, so the following were decided by
Claude against the inherited spec and the live codebase, and recorded as reversible with the cost of
reversal stated in each case: cropper engine constraints (D-167), removal confirm primitive (D-168),
removal ordering (D-169), ratio-constant import (D-170), server transform disposition (D-171), output
encoding (D-172), zoom/rotation/readout knobs (D-173), same-file re-pick (D-174), CROP-04 evidence
standard (D-175).

## Deferred Ideas

All routed to **Phase 16.1 — Upload Hardening & Storage Economy** (D-166): size cap, format allow-list,
the `"url"` source, incoming-transformation shrink + backfill, pixel-dimension guard, EXIF/GPS
stripping, orphaned-asset audit.

Separately deferred to a later delivery-pipeline phase: the stored focal-region model for listing
covers (999.2 § Source of truth, finding 4) — new persisted geometry, a URL builder, three rewritten
render sites. CROP-02 ships the honest half instead.
