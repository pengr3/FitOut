// POST /api/cloudinary/sign — mint a scoped Cloudinary upload signature for the listing gallery (D-04).
//
// This is the ONLY server involvement in the direct-to-client upload: the browser uploads bytes
// straight to Cloudinary, but it needs a signature the server mints from the api_secret. This
// endpoint is a money/abuse boundary (V12 file control), so it is defended in depth:
//   - SESSION (T-04-UPLOAD): no session → 401. Only a signed-in user can ever obtain a signature.
//   - RATE LIMIT (WR-06 carry-forward): keyed on the authenticated user id (never the IP), reusing
//     the shared per-identity limiter — 30 signatures / 60s is generous for a gallery upload burst
//     while capping an abusive caller. Over budget → 429.
//   - OWNERSHIP (T-04-IDOR): the target listing must belong to the caller (listing.hostId ===
//     session.user.id) BEFORE a signature is minted — this prevents one host uploading into another
//     host's folder. Not found / not owned → 403 (we don't reveal whether the listing exists).
//   - SIGNED-PARAM MATCH (T-04-SIGMATCH / Pitfall 3): path 5a allow-lists FOUR keys
//     ({ folder, source, timestamp } plus the upload preset) and rejects ANY other key with 400
//     BEFORE signing, so no arbitrary Cloudinary upload param can ever be signed — AND it
//     additionally REQUIRES the preset key to be present and to equal the repo constant, refusing
//     to mint anything at all otherwise. Path 5b signs THREE keys: the timestamp, the folder and
//     the same preset, which the server adds because 5b takes no client params. Both sign only the
//     set the caller will actually post — no extra params on one side. The api_secret is used only
//     inside the signer and never returned.
//
// WHY THE PRESET IS A REQUIREMENT AND NOT A CONVENIENCE (D-194). The preset carries the incoming
// transformation that bounds a stored photo in pixels and bytes, and the format gate that refuses
// an SVG. It is the only parameter the live widget will actually emit that can carry either. This
// route cannot ADD it to somebody else's upload — Cloudinary validates a signature against exactly
// the parameter set it receives, in both directions — so instead it refuses to sign for a caller
// whose own set does not already carry it. That refusal IS the enforcement; there is nothing else.
//
// ⚠ D-165 CONSEQUENCE OF `f_auto`, recorded here because the next reader of the provenance module
// will otherwise "tighten" it and break this pipeline. The preset's transformation ends in
// `f_auto`, so the STORED file's extension need not match the source's: a `.heic` upload is stored
// as `.jpg`, and a `.jpg` can be stored as `.png` when alpha is present. `cloudinary-provenance.ts`
// at `:22-23` deliberately does NOT require the delivery url and the publicId to agree about the
// file extension. That was written down as an ACCEPTED RESIDUAL; as of this change it is
// LOAD-BEARING. Requiring the two to agree would reject the pipeline's own output.
//
// listingId resolution: the test/primary path posts { listingId } in the JSON body. The live
// next-cloudinary <CldUploadWidget> posts its own { paramsToSign } body (no listingId), so the
// uploader appends ?listingId=<id> to the endpoint URL — we accept it from the query string as a
// fallback so the ownership gate can still scope the signature to the owned listing.

import { and, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listing } from "@/lib/db/schema";
import { signUploadParams } from "@/lib/cloudinary"; // → cloudinary.utils.api_sign_request (secret server-only)
import { LISTING_UPLOAD_PRESET } from "@/lib/listing/upload-policy";
import { rateLimit } from "@/lib/rate-limit";

// T-04-SIGMATCH — the ONLY Cloudinary upload params this endpoint will ever sign. The signed
// <CldUploadWidget> posts exactly { folder, source: "uw", timestamp, upload_preset }; anything else
// in the body (public_id, notification_url, eager, overwrite, tags, context, moderation, …) must
// NOT be signed.
//
// ⚠ THIS SET GAINED EXACTLY ONE KEY, AND THE THREE IT DID NOT GAIN ARE THE POINT. `transformation`,
// `allowed_formats` and `eager` must NEVER be admitted here, in any future, for any reason, and the
// reason is a measurement rather than a preference. Cloudinary MERGES incoming transformations: a
// client-supplied one CHAINS AFTER the preset's rather than replacing it or being bounded by it.
// Measured 2026-08-26 against this account — a preset capped at a 2048px long edge, plus a client
// transformation asking for a 4000px scale, stored a 4000x6000 asset of 292,487 bytes. The cap did
// not merely fail to apply; the client UPSCALED straight past it while every gate on this route
// reported success.
//
// So the exclusion is what makes the preset an actual BOUND rather than a suggestion. Admitting
// `transformation` "for flexibility" hands the ceiling back to the caller. Admitting
// `allowed_formats` hands back the SVG refusal. `eager` is a different mistake wearing the same
// costume: it derives an EXTRA asset and leaves the original stored at full size with full EXIF, so
// it satisfies nothing while looking, in a dashboard, like it did. A source assertion in
// `tests/listing/cloudinary-sign.test.ts` counts the entries of this set and reads the tokens back
// out of this file's stripped code, so a widening cannot land quietly.
const ALLOWED_SIGN_KEYS = new Set(["folder", "source", "timestamp", "upload_preset"]);

export async function POST(req: Request) {
  // 1. SESSION gate — no session, no signature.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 2. Resolve the target listingId (body first, then the widget's ?listingId= query fallback).
  let listingId: string | undefined;
  let paramsToSign: Record<string, string | number | boolean> | undefined;
  try {
    const body = (await req.json()) as
      | { listingId?: unknown; paramsToSign?: Record<string, unknown> }
      | null;
    if (body && typeof body.listingId === "string") listingId = body.listingId;
    if (body && body.paramsToSign && typeof body.paramsToSign === "object") {
      paramsToSign = body.paramsToSign as Record<string, string | number | boolean>;
    }
  } catch {
    // The live widget may post a non-JSON / different body — fall through to the query param.
  }
  if (!listingId) {
    const qp = new URL(req.url).searchParams.get("listingId");
    if (qp) listingId = qp;
  }
  if (!listingId) {
    return new Response("Bad Request — listingId is required", { status: 400 });
  }

  // 3. RATE LIMIT (WR-06) — keyed on the authenticated identity, before the ownership DB read.
  const limit = rateLimit(`cloudsign:${session.user.id}`, { window: 60, max: 30 });
  if (!limit.ok) {
    return new Response("Too Many Requests", {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfter) },
    });
  }

  // 4. OWNERSHIP (IDOR) — the listing must exist, be non-deleted, and belong to the caller.
  const rows = await db
    .select({ hostId: listing.hostId })
    .from(listing)
    .where(and(eq(listing.id, listingId), isNull(listing.deletedAt)));
  const row = rows[0];
  if (!row || row.hostId !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  const folder = `fitout/listings/${listingId}`;

  // 5a. Live <CldUploadWidget> path — it posts its OWN paramsToSign ({ folder, source: "uw",
  // timestamp }). We MUST sign that EXACT set (T-04-SIGMATCH) or Cloudinary returns "Invalid
  // Signature", but first enforce the folder is scoped to the owned listing so a tampered client
  // can't sign an upload into another host's folder. Return only the signature — the widget already
  // holds the rest of the params (and its own timestamp).
  if (paramsToSign) {
    // Reject the request if it carries ANY param outside the fixed allow-list — the endpoint must
    // never mint a signature for an arbitrary Cloudinary upload key (T-04-SIGMATCH). Do NOT sign.
    const extraKey = Object.keys(paramsToSign).find((k) => !ALLOWED_SIGN_KEYS.has(k));
    if (extraKey) {
      return new Response("Bad Request — unexpected upload param", { status: 400 });
    }
    // Folder must still be scoped to the caller's own listing (unchanged).
    if (paramsToSign.folder !== folder) {
      return new Response("Forbidden — upload folder out of scope", { status: 403 });
    }
    // THE PRESET IS REQUIRED, AND IT MUST BE OURS. Note what this is NOT: the allow-list above
    // answers "may this key be signed", which is a permission. The question here is the other one —
    // "will I sign anything at all without it" — and the answer is no. A caller who omits the key,
    // or names a different preset, leaves with NO SIGNATURE; the signer below is never reached. An
    // allow-list entry alone would have been the whole vulnerability rather than the fix, because a
    // body of { folder, source, timestamp } would still have earned a perfectly valid signature and
    // uploaded unbounded.
    //
    // That refusal is what makes the transformation UN-OMITTABLE, and the mechanism is Cloudinary's
    // own: it validates the signature against exactly the parameter set the upload carries, so a
    // caller holding a signature minted over four keys cannot drop one (401), cannot change one
    // (401), and cannot add one. The only upload our signature is good for is the one that carries
    // our preset. Compared against the IMPORTED constant, never a re-spelling of it, so drift
    // between this gate and the declaration is impossible and a source assertion can see it.
    if (paramsToSign.upload_preset !== LISTING_UPLOAD_PRESET) {
      return new Response("Bad Request — upload preset out of scope", { status: 400 });
    }
    return Response.json({ signature: signUploadParams(paramsToSign) });
  }

  // 5b. Test / primary JSON path ({ listingId }) — sign { timestamp, folder, upload_preset } and
  // return the public config the caller needs, including the preset NAME so a direct caller knows
  // the exact set it has to post. The api_secret is never in this body.
  //
  // WHAT CHANGED HERE AND WHY (RESEARCH F-1). Before this, 5b minted { signature, timestamp, apiKey,
  // cloudName, folder } for ANY signed-in owner: no preset, no transformation, no format gate —
  // everything a caller needed to POST straight to Cloudinary and store whatever it liked, at
  // whatever size, with whatever EXIF. Every gate above it (session, rate limit, ownership, folder
  // scope) held, and none of them bounds the stored asset. While that path existed the claim that a
  // client cannot influence the stored photo was simply false, so hardening 5a alone would have
  // been a hardening with a door next to it.
  //
  // The asymmetry with 5a is deliberate and not a weaker gate: 5a receives a client's param set and
  // must REFUSE one that lacks the preset, whereas 5b receives no client params at all — the server
  // derives every one of them — so it ADDS the preset. The caller still cannot omit it, because
  // omitting it from the upload POST makes the signature invalid at Cloudinary (401).
  const timestamp = Math.round(Date.now() / 1000);
  const signature = signUploadParams({
    folder,
    timestamp,
    upload_preset: LISTING_UPLOAD_PRESET,
  });
  return Response.json({
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder,
    uploadPreset: LISTING_UPLOAD_PRESET,
  });
}
