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
//   - SIGNED-PARAM MATCH (T-04-SIGMATCH / Pitfall 3): we sign EXACTLY { timestamp, folder } — the
//     same set the client widget sends — so Cloudinary accepts the upload. No extra params on one
//     side only. The api_secret is used only inside signListingUpload and never returned.
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
import { signListingUpload } from "@/lib/cloudinary"; // → cloudinary.utils.api_sign_request (secret server-only)
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  // 1. SESSION gate — no session, no signature.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 2. Resolve the target listingId (body first, then the widget's ?listingId= query fallback).
  let listingId: string | undefined;
  try {
    const body = (await req.json()) as { listingId?: unknown } | null;
    if (body && typeof body.listingId === "string") listingId = body.listingId;
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

  // 5. Sign EXACTLY { timestamp, folder } (the client sends the same set — Pitfall 3). D-04 folder.
  const timestamp = Math.round(Date.now() / 1000);
  const folder = `fitout/listings/${listingId}`;
  const signature = signListingUpload({ timestamp, folder });

  // 6. Return the signature + PUBLIC config only. The api_secret is never in this body.
  return Response.json({
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder,
  });
}
