// The listing-upload contract (D-179 … D-195) — the preset name, the byte ceiling, the long-edge
// cap, the format array, the incoming transformation, the photo cap, and the three sentences a host
// is shown when an upload is refused. 16.1-RESEARCH § R-1.6 calls this layer 1 of five, and states
// the rule it has to satisfy: the declaration is the source of truth, and NOTHING ELSE in the repo
// spells any of them. That is not tidiness — it is the reason the picker's hint and the boundary's
// gate cannot disagree about six formats, the reason the reconciler cannot re-spell the
// transformation, and the reason a later "tidy" cannot quietly move 2048 or the byte ceiling.
//
// WHY IT IS DIRECTIVE-FREE, AND WHY THAT IS NOT A STYLE CHOICE. Three consumers have to read ONE
// copy of this contract and they sit on three different sides of the Next boundary: the sign route
// (`src/app/api/cloudinary/sign/route.ts`) is a server module, the uploader
// (`src/components/listing/photo-uploader.tsx`) opens `"use client"`, and the preset reconciler is
// plain Node with no Next runtime at all. A module carrying any directive is ineligible for at least
// one of them. So: no `"use client"`, no `"use server"`, no `import "server-only"` — the same
// discipline, and the same reason, as `src/lib/avatar.ts` and its placement sibling
// `src/lib/listing/cover-frames.ts`.
//
// THE INCIDENT THIS DISCIPLINE IS A RESPONSE TO — read it before "tidying" any of these exports
// anywhere else. `src/app/actions/avatar.ts` is a `"use server"` module, and Next rejects such a
// module that exports anything other than an async function AT MODULE EVALUATION, not at call time.
// That file once exported `AVATAR_MAX_BYTES` (a number) and `avatarFileSchema` (a Zod object); Next
// refused to load the whole module, `uploadAvatarAction` never ran, and avatar upload was dead in
// the browser for all of Phase 1 while the tests importing those very exports stayed green (Vitest
// does not implement the rule). `tests/use-server-exports.test.ts` holds that line repo-wide and
// records the observed RED verbatim in its header — the first offender it named was
// `src/app/actions/avatar.ts:25 exports AVATAR_MAX_BYTES — not an async function`. A re-export from
// a `"use server"` module is the identical violation wearing a compatibility shim.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO, so the next reader does not mistake its silence for a gap:
//   - NO `process.env` READ. The preset name is a repo constant, not configuration
//     (16.1-RESEARCH § Runtime State Inventory). `next-cloudinary` carries a silent
//     `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` fallback which is unset today and must stay unset, and
//     the way it stays unset is that the name is spelled HERE (threat T-16.1-09). This is also the
//     correct application of the fail-closed pattern at `listing-photo.ts:111-129`: there is nothing
//     to fail closed ON, and that is the point. `tests/design/upload-policy.test.ts` asserts the
//     absence over comment-stripped source, so it cannot grow back.
//   - NO Zod. This module is a leaf; validation schemas import FROM it, never the reverse — exactly
//     the direction `src/lib/validation/profile.ts` takes with `AVATAR_ALLOWED_TYPES`.
//   - NO Cloudinary SDK import and no credential. It knows the vendor's transformation grammar and
//     nothing else about the vendor.
//   - NO MODULE-SCOPE THROW, and this one is not a style preference. `next build` sets
//     NODE_ENV=production and arms every module-scope boot guard while it collects page data;
//     `.github/workflows/ci.yml:608-635` records `Failed to collect page data for
//     /api/cloudinary/sign` as a real, build-breaking failure. This module is imported by that
//     route, so a boot guard here would break the build rather than a request.
//   - NO SERVER-SIDE CHECK OF THE WIDGET'S REPORTED BYTE COUNT — see the next paragraph, where it is
//     a prohibition rather than an omission.
//
// D-181 — THE BYTE LIMIT IS HONEST ABOUT WHAT IT IS: a courtesy to hosts, not a security boundary,
// because the security boundary is the transformation. The bytes go browser→Cloudinary directly and
// our server never sees them, so a caller who skips the widget bypasses any client-side ceiling by
// construction. The PM's explicit call is that this is acceptable, because
// `LISTING_INCOMING_TRANSFORMATION` bounds the STORED asset regardless of what arrived.
// ⚠ It follows — and this is a prohibition, not an observation — that a server-side check of the
// value the widget reports for a file's size must NEVER be added anywhere in this codebase. That
// value is client-supplied, and a caller who bypassed the widget also lies about it. Such a check
// would look like a guard while being theatre: the same defect shape that
// `tests/use-server-exports.test.ts` and `cloudinary-provenance.ts:43-51` both exist to prevent, a
// green suite over a control that does not run. Recorded as threat T-16.1-11, accepted BY
// PROHIBITION rather than mitigated.

/**
 * The named Cloudinary upload preset that carries the incoming transformation and the format gate
 * (D-194). Its NAME is repo state and lives here; its SETTINGS are account state and are not in git.
 * A committed reconciler applies them from this module and re-verifies them, which is layer 4 of
 * 16.1-RESEARCH § R-1.6's five pinning layers; layer 4 cannot see a dashboard edit made between two
 * of its runs, and saying so is part of taking the cost knowingly.
 *
 * THE MECHANISM FAILS CLOSED, which is what makes the off-repo half tolerable at all. Measured
 * 2026-08-26 (probe E7): delete or rename the preset on the account and Cloudinary answers
 * `Upload preset not found` — no upload succeeds. There is no silent-degradation mode in which
 * uploads keep working without the transformation. That is materially better than the ambient
 * dependency `cloudinary-provenance.ts:43-51` warns about, whose failure mode was a guard that
 * SKIPS.
 *
 * OPTION B WAS PRICED AND DECLINED, and it is named here so the record shows the trade was made
 * rather than missed: replacing `<CldUploadWidget>` with a hand-rolled uploader would put every
 * value in the repo and need no preset at all, but it is a rewrite of the host photo surface and
 * contradicts ROADMAP's `UI hint: no` for this phase.
 *
 * ⚠ Hand it to the widget as the `uploadPreset` PROP, never inside `options` — `next-cloudinary`
 * spreads `options` last, so an `options.uploadPreset` silently wins over the prop, and an unset
 * prop silently falls back to the environment variable named in this module's header.
 */
export const LISTING_UPLOAD_PRESET = "fitout_listing_v1";

/**
 * D-180 — the declared listing-photo ceiling, 10 MB, spelled as the arithmetic it actually is.
 *
 * WHY THE SPELLING IS LOAD-BEARING. The account's plan is Free and its hard image ceiling was probed
 * to the byte on 2026-08-26 (16.1-RESEARCH § R-3.1): a 10,797,728-byte file came back
 * `400 File size too large. Got 10797728. Maximum is 10485760.`, while a 10,225,256-byte file was
 * accepted and stored. So the vendor's ceiling is EXACTLY 10 * 1024 * 1024 with zero headroom in
 * either direction. Spelled instead as a round decimal million, the two numbers would differ by
 * 485,760 bytes, would render identically to any reviewer, and would refuse files the vendor
 * accepts — making the declared limit and the enforced limit two different numbers again, which is
 * precisely the defect (roadmap U1) that D-180 exists to end, reintroduced by a rounding convention.
 *
 * ⚠ THAT ROUND SPELLING IS DELIBERATELY NOT TYPED OUT ANYWHERE IN THIS FILE. The phase's acceptance
 * criterion and `tests/design/upload-policy.test.ts` both COUNT that token, and a mention of it
 * inside the comment explaining its absence returns a non-zero count against a correct file. That is
 * the mirror failure `scripts/verify-workflows.mjs:24-32` measured — substring checks are falsely
 * green for requirements and falsely RED for prohibitions on a documented file — and the same
 * carve-out `tests/design/avatar-zoom.test.ts:27-30` already records for the jsdom pragma.
 *
 * The plan is Free; an upgrade only RAISES the vendor ceiling, leaving this number conservative and
 * still true, and nothing exists below Free. So the copy is safe against plan movement.
 *
 * Because the declared number and the enforced number are now EQUAL, a file of exactly 10,485,760
 * bytes passes both sides — which is why `LISTING_TOO_LARGE_MESSAGE` says "or smaller" and never
 * "under".
 */
export const LISTING_MAX_BYTES = 10 * 1024 * 1024;

/**
 * D-182 — the long-edge cap on the STORED asset, in pixels. One number with two consumers: the
 * transformation below is BUILT from it, and any copy that ever quotes a dimension reads it here.
 *
 * Sized against the most demanding render site, the full-screen lightbox
 * (`src/components/listing/photo-lightbox.tsx:353`); everything else is a thumbnail or a 16/9 mosaic
 * cell. 2048 is sharp on a laptop and on most desktop monitors, and only a retina 4K viewer at true
 * full-screen would notice. BANDWIDTH IS THE LARGER HALF OF THE WIN, NOT STORAGE — every render site
 * serves this one file to every booker on every page view, so the saving is paid out once per view
 * rather than once per upload.
 */
export const LISTING_MAX_EDGE_PX = 2048;

/**
 * D-184 — the six extensions a listing photo may arrive as, in ONE array with two consumers sitting
 * on OPPOSITE SIDES of the boundary: the widget's client-side format list, which refuses the file
 * before an upload starts as a courtesy to the host, and the preset's own format list, which is the
 * actual gate — server-enforced by Cloudinary and un-omittable by the client (16.1-RESEARCH F-3). A
 * picker that offers what the boundary refuses is a user-visible split, and the only way it cannot
 * happen is for there to be one array. Rule F2.
 *
 * HEIC/HEIF IS A DELIBERATE DEPARTURE from `AVATAR_ALLOWED_TYPES`' three. It is what iPhones
 * actually shoot: iOS Safari usually converts on pick, but a host with Keep Originals on, or on
 * Android or desktop, sends the real thing. Accepting it removes a refusal that would be baffling to
 * a host looking at a perfectly normal photo — and it costs nothing ONLY because the transformation
 * below carries a format conversion. Without one it would cost a broken image on every public
 * listing (16.1-RESEARCH F-2).
 *
 * TWO ABSENCES, BY DECISION RATHER THAN BY OVERSIGHT.
 *   - Vector documents are out. One is a scriptable document rather than a photo, and — measured —
 *     it survives the transformation VERBATIM, script element intact, because the re-encode does not
 *     touch it. Nothing else in the pipeline would refuse it. The honest note, so the rationale is
 *     not overstated: delivered through an `<img src>` from a different origin it cannot execute
 *     script in any current browser, so it is refused because it is not a photo and refusing costs
 *     nothing, not because a live exploit was demonstrated.
 *   - Multi-frame animations are out. Measured 2026-08-26: 1,887 B in, 2,634 B out, all three frames
 *     kept. It is the one input the re-encode makes BIGGER, which is the exact opposite of this
 *     phase's purpose, and the mosaic and the lightbox are built for stills.
 */
export const LISTING_ALLOWED_FORMATS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "heic",
  "heif",
] as const;

/**
 * D-182 + D-189 + F-2 — the incoming transformation the preset carries. It is the phase's
 * load-bearing deliverable: ROADMAP criteria 3 and 5 are entirely its output, and D-181's honesty
 * about the byte limit rests on it being the real boundary.
 *
 * ⚠ THE EDGE CAP IS INTERPOLATED, NEVER RESPELLED. This is the same rule `src/lib/cloudinary.ts:56-68`
 * already enforces for the avatar transform — "the output size is imported, never respelled" — and
 * it has the same failure mode: type a literal into either component and the day D-182's number
 * moves, the derivation breaks silently, the docblock above becomes false, and nothing goes red.
 * `tests/design/upload-policy.test.ts` sweeps a band of candidate edge values to keep that honest.
 *
 * `f_auto` IS NOT DECORATION, AND THE REASON IS NARROWER THAN THIS PARAGRAPH USED TO CLAIM. Without a
 * format conversion a HEIC upload is STORED and DELIVERED as `image/heic`, which Chrome and Firefox
 * cannot render — and all eight render sites are a plain `<img src>`. That is the whole job, and it
 * is the part that reproduced.
 *
 * ⚠ CORRECTED 2026-08-27 — THE 2026-08-26 MEASUREMENT THIS PARAGRAPH RECORDED DOES NOT REPRODUCE, and
 * it is corrected rather than deleted so the next reader knows the claim was tested and not merely
 * softened. It said `f_auto` "turns HEIC into jpg, picks jpg for photographic input … and never once
 * chose webp or avif". Plan 16.1-07's live run against the real account, through the real preset,
 * measured this instead:
 *
 *   - a real HEIC through this preset was stored as **png**, not jpg;
 *   - the same HEIC with NO transformation at all — the control — was stored as **heic**;
 *   - a 900x700 random-noise PNG was stored as png in all four of: through this preset; with this
 *     transformation inline as a string; with it inline as a structured object; and with the
 *     format-conversion component ALONE. Its format was never changed.
 *
 * WHAT SURVIVES, AND IT IS THE ONLY THING THIS COMPONENT IS LOAD-BEARING FOR: the HEIC pair is a
 * controlled experiment — same bytes, same endpoint, one variable — and it shows the conversion DOES
 * move HEIC off HEIC. F-2's requirement is met. What is NOT true is any prediction about which format
 * it picks. Do not write code, tests or copy that assumes a stored extension.
 *
 * ⚠ AND IT CAN COST BYTES, IN A PHASE NAMED FOR STORAGE ECONOMY. That HEIC went in at 448,047 B and
 * was stored at 2,512,665 B — a 5.6x INFLATION, on the exact input class this component exists to
 * handle. The transformation is still correct to keep, because an unrenderable photo is a broken
 * listing and that outranks its size, but the trade is real and is recorded here rather than
 * discovered later by someone reading a storage bill. The alpha-preservation claim from 2026-08-26
 * was NOT re-tested on 2026-08-27 and is left out rather than repeated: it came from the same run as
 * the claims that failed, so it no longer carries evidence.
 *
 * `f_jpg`'s only advantage is a deterministic stored extension, and that buys nothing here, because
 * `cloudinary-provenance.ts:22-23` already declines to require the url and the publicId to agree
 * about the extension. That accepted residual is now LOAD-BEARING — nobody should "tighten" it later,
 * and the measurement above is why: the stored extension is not predictable even in principle.
 *
 * ⚠ ONE MORE THING THE SAME RUN ESTABLISHED, because it changes what can be verified about this line:
 * Cloudinary APPLIES this component but does NOT PERSIST it in the preset the Admin API hands back.
 * `scripts/cloudinary-preset.ts` therefore cannot check that it is set, and says so at
 * `VENDOR_NORMALISES_AWAY` with the evidence. What proves this component is live is the UAT's product
 * check — a real HEIC uploads AND renders — not a scripted diff.
 *
 * `eager` IS THE WRONG TOOL and its absence is deliberate. It DERIVES an extra asset and leaves the
 * ORIGINAL stored, which fails criteria 3 and 5 outright, and the derived url carries transformation
 * components that `isOwnCloudinaryAsset` rejects by design — it rejects even a benign pair, pinned at
 * `tests/listing/cloudinary-provenance.test.ts:216`.
 *
 * EXIF, INCLUDING GPS, GOES WITH THE RE-ENCODE (D-189). Measured: every tag gone, and the rotation
 * flag is APPLIED BEFORE it is dropped, so the orientation trap does not bite and no explicit rotate
 * component is needed.
 *
 * WHAT IT DOES NOT CHANGE: the returned delivery url stays plain, with no transformation components,
 * so criterion 3's "no delivery URL changes" holds and the eight render sites are untouched. The
 * transformation is baked into the stored bytes, not into the address.
 */
export const LISTING_INCOMING_TRANSFORMATION = `c_limit,w_${LISTING_MAX_EDGE_PX},h_${LISTING_MAX_EDGE_PX},q_auto,f_auto`;

/**
 * D-04 / D-195 — the generous soft cap on photos per listing. Publishing needs at least three; this
 * bounds the top end so a single listing cannot be used to stockpile unbounded assets, and it is
 * kept high enough never to get in a real host's way.
 *
 * WHY IT LIVES HERE RATHER THAN BESIDE THE ACTION THAT ENFORCES IT (16.1-PATTERNS § C-1). It was a
 * private, unexported const inside `src/app/actions/listing-photo.ts` — a module that opens
 * `"use server"`, which Next rejects at MODULE EVALUATION for exporting anything other than an async
 * function. So the widget could not import it and spelled its own copy of the number instead: a live
 * rule-F2 violation with two homes for one cap. A re-export from that module would be the identical
 * violation wearing a compatibility shim. Moving the declaration is the only way the widget's file
 * limit and the server-side cap can be one number, which is what D-195 needs in order to offer
 * `LISTING_MAX_PHOTOS` minus the photos already attached.
 */
export const LISTING_MAX_PHOTOS = 20;

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// COPY — every user-visible string this phase adds or rehomes, one exported literal each (rule F2).
// D-179: error copy is this phase's ONLY user-visible surface, so it is treated as a real surface
// rather than as an afterthought. D-186's shape is the avatar path's, and the three shipped avatar
// sentences are the model and are NOT re-worded: one sentence per refusal REASON, each with exactly
// one home in a directive-free module, and the format sentence naming what IS accepted rather than
// what was refused, because that is the half a host can act on.
// Rule F1: no string here names the vendor, the transport or the mechanism.
// Rule F2: two copies of a string are two strings. Anything that needs one of these imports it.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Refusal for a file above `LISTING_MAX_BYTES`. "or smaller", never "under" — matching
 * `AVATAR_TOO_LARGE_MESSAGE`'s existing phrasing, and here it is literally required as well: the
 * declared ceiling and the vendor's are now the same number, so a file of exactly that size passes
 * both sides and "under" would be a lie about the boundary case.
 */
export const LISTING_TOO_LARGE_MESSAGE = "Each photo must be 10 MB or smaller.";

/**
 * Refusal for a file outside `LISTING_ALLOWED_FORMATS`. Names what to pick INSTEAD (D-186), not what
 * was refused. HEIF is not named separately: a host holding a HEIF file calls it a HEIC photo, and
 * the sentence has to be readable rather than exhaustive.
 */
export const LISTING_WRONG_FORMAT_MESSAGE =
  "Choose a JPG, PNG, WebP, or HEIC photo.";

/**
 * The upload-did-not-land sentence.
 *
 * ⚠ THIS IS THE SHIPPED LITERAL, BYTE-UNCHANGED. The move gives it a home; it does not change it.
 * `tests/listing/photos.test.ts:339` and `:385` assert it verbatim and stay green untouched.
 * `src/app/actions/listing-photo.ts` carried three inline copies of it until this plan, and it is
 * about to acquire a fourth consumer in the uploader's error handler — which is what forced the
 * move, because two copies of a string are two strings (rule F2).
 *
 * Δ15 / rule F1 — it names no vendor, no url and no folder. The distinction between "empty",
 * "not ours" and "the vendor said no" belongs in the server log, not in the host's toast.
 */
export const LISTING_UPLOAD_FAILED_MESSAGE =
  "That photo didn't upload. Please try again.";

/**
 * Pull the reason text out of whatever the uploader's error handler was handed. The widget's error
 * type has three shapes and ALL THREE ARE REAL, measured in a browser on 2026-08-26
 * (16.1-RESEARCH § I-2): an object carrying `status`/`statusText`, a bare string, and `null`.
 * Narrowing from `unknown` is what keeps this module a leaf with no `next-cloudinary` import.
 */
function refusalText(error: unknown): string {
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = error.status;
    return typeof status === "string" ? status : "";
  }
  return "";
}

/**
 * D-186's discriminator: map whatever the uploader's error handler receives onto exactly one of the
 * three sentences above. Pure and total — every input returns one of those three, and none throws.
 *
 * ⚠ THE DISCRIMINATOR IS VENDOR COPY. There is no error code, no enum and no discriminant field to
 * match on; the reason lives only in an English sentence the vendor wrote. 16.1-RESEARCH § I-2 read
 * the real objects out of a real browser and § Pitfall 8 names the fragility rather than hiding it.
 * This is the first place in the repo that matches on a third party's prose.
 *
 * WHEN CLOUDINARY REWORDS, THIS DEGRADES TO UPLOAD-FAILED, AND THAT IS THE DESIGNED OUTCOME, not an
 * oversight. A reworded "too large" sentence falls through to a true-ish sentence rather than a
 * wrong one, so the failure mode of a vendor copy change is a less specific message and never a
 * misleading one. `tests/design/upload-refusal.test.ts` pins the reword case deliberately — the day
 * someone wants to add a second pattern, they should find this reasoning rather than assume a gap.
 *
 * AND THESE SENTENCES ARE A SECOND SURFACE, NOT THE ONLY ONE. The widget renders its own English
 * error inside its cross-origin iframe as well, so the host sees the vendor's sentence AND ours.
 * These exist to be the one in FitOut's voice, not to be the only one on screen.
 */
export function listingUploadRefusal(error: unknown): string {
  const reason = refusalText(error);
  if (/exceeds maximum allowed/i.test(reason)) return LISTING_TOO_LARGE_MESSAGE;
  if (/format not allowed/i.test(reason)) return LISTING_WRONG_FORMAT_MESSAGE;
  return LISTING_UPLOAD_FAILED_MESSAGE;
}
