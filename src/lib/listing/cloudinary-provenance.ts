// D-165 — provenance of a listing photo's `{ publicId, url }`, as a pure function of the untrusted
// pair and the trusted context (`listingId`, `cloudName`). Owners: D-165, threat T-16-14/15/16,
// ASVS V4 (access control) and V5 (validation, sanitisation, encoding).
//
// WHAT IT DEFENDS. `persistPhoto` (`src/app/actions/listing-photo.ts`) is session-gated and
// ownership-gated, and the signed direct upload in FRONT of it is airtight — a per-user rate limit,
// a fixed `ALLOWED_SIGN_KEYS`, a folder pinned to the listing. The WRITE BEHIND it took the client's
// `publicId` and `url` on nothing but a `.trim()` non-empty test and inserted both. That stored `url`
// is then rendered as a plain `<img src>` on the PUBLIC listing page to every booker, so a host who
// skips the widget and calls the action directly could serve arbitrary third-party content under
// FitOut's product surface. This function is the check that was missing.
//
// WHAT IT DELIBERATELY DOES NOT DO, so the next reader does not mistake its silence for a gap:
//   - It does NOT check that the asset EXISTS. That is a network call, on a hot write path, against
//     a vendor, for a question the upload response already answered.
//   - It does NOT call Cloudinary at all, and holds no credential.
//   - It does NOT police the `v<digits>` version segment. A delivery url without one is valid and is
//     still ours; rejecting it would break a hand-built url for no security gain (16-RESEARCH §C10).
//   - It does NOT pre-emptively allow a CNAME or a private CDN. `src/lib/cloudinary.ts:13-17`
//     configures neither `secure_distribution` nor `private_cdn`, so no such host can be produced by
//     this app today. The day one is adopted, this going red is the CORRECT alarm and not a bug.
//   - It does NOT check that the url and the `publicId` agree about the FILE EXTENSION, only about
//     the asset. `…/one.jpg` and `…/one.webp` are the same asset in two encodings, both ours.
//
// ⚠ WHAT IT USED TO MISS, AND WHY THE CORRECTION IS NOT SCOPE CREEP (CR-02). This file previously
// recorded "it does NOT require the url's path to contain the `publicId`" as an accepted residual,
// on the reasoning that both halves were independently scoped to us so the worst case was "a
// cosmetic mix-up inside our own account". Both clauses were wrong:
//   - The url side was never scoped to an ASSET, only to a TENANT. `startsWith('/<cloud>/image/
//     upload/')` says the bytes come from our account; everything after it is Cloudinary's
//     transformation language, and that language can name assets we did not intend — including
//     `fitout/avatars/<victim-userId>`. Another person's FACE on your public listing is not cosmetic.
//   - And it does not even keep the bytes inside our account. Cloudinary's remote-image OVERLAY is
//     `l_fetch:<base64url-of-any-https-url>,fl_layer_apply` and it lives under `/image/upload/`, not
//     under `/image/fetch/`. Composed over a legitimately-owned, correctly-prefixed asset it
//     satisfied every check this function performed while rendering `evil.tld`'s pixels — the exact
//     "arbitrary third-party content under FitOut's product surface" outcome the file exists to stop.
//     Whether Cloudinary honours it depends on the account's *Allowed fetch domains* setting, which
//     is ambient, off-repo configuration — the one thing this module refuses to depend on.
// So the asset is now ANCHORED: the delivery path must be the `publicId` itself, optionally behind a
// `v<digits>` version and optionally carrying a file extension, and NOTHING ELSE.
//
// ⚠ IT READS NO AMBIENT CONFIGURATION, AND THAT IS THE LOAD-BEARING DESIGN DECISION (16-RESEARCH
// §C10, R1). `CLOUDINARY_CLOUD_NAME` is an ARGUMENT, never an environment read. `.github/workflows/
// ci.yml` records at `:151` and again at `:875` that the test jobs hold no Cloudinary credential, and
// `.env.local` is gitignored — so an ambient read would be `undefined` in every CI run. A guard that
// then SKIPPED would be dead in the only place it runs continuously, while every test of it passed
// vacuously: the same defect shape as the `"use server"` incident `tests/use-server-exports.test.ts`
// exists to prevent, a green suite over a feature that does not run. So the caller resolves the cloud
// name once and this function FAILS CLOSED when it is absent. `tests/listing/cloudinary-provenance.
// test.ts` asserts over this file's own source that the ambient read never grows back.
//
// THE LESSON IT INHERITS, verbatim in spirit from `src/lib/safe-callback-url.ts:22-25`: PREFIX
// MATCHING CANNOT FIX THIS. A substring test for our delivery host accepts
// `https://res.cloudinary.com.evil.tld/...` and accepts `https://evil.tld/?x=https://res.cloudinary.
// com/...`, and closing one spelling only leaves the next. The only check that answers the real
// question — "will the browser fetch this from US?" — is to PARSE the url and compare the parsed
// host, because that runs the same algorithm the browser will. Nothing in this file performs a
// substring search; the host is `===`, and every public-id rejection is an anchored pattern.

/**
 * Cloudinary's canonical delivery host. Exact — never a suffix or substring comparison.
 * `<cloud_name>` is the FIRST path segment, which is why the tenant check lives on the pathname.
 */
const DELIVERY_HOST = "res.cloudinary.com";

/** The folder the sign endpoint pins per listing (`photo-uploader.tsx:177`, `sign/route.ts:85`). */
function listingFolderPrefix(listingId: string): string {
  return `fitout/listings/${listingId}/`;
}

/**
 * Is this `{ url, publicId }` pair something OUR upload pipeline could have produced for THIS
 * listing?
 *
 * @param url       The untrusted delivery url the client asks us to store and later render.
 * @param publicId  The untrusted Cloudinary public id the client asks us to store.
 * @param listingId The listing being written to. Trusted — the action has already proven the caller
 *                  owns it before this runs.
 * @param cloudName Our Cloudinary cloud name, resolved ONCE by the caller. Trusted when present;
 *                  when absent (or blank) this function returns `false`, because an app with no
 *                  cloud name configured cannot legitimately be persisting a Cloudinary url.
 *
 * Returns a plain boolean and nothing else. Mapping a rejection to a user-facing sentence is the
 * ACTION's job (`{ ok: false, error }`), so the refusal has exactly one wording, in one place.
 */
export function isOwnCloudinaryAsset(input: {
  url: string;
  publicId: string;
  listingId: string;
  cloudName: string | undefined;
}): boolean {
  const { url, publicId, listingId, cloudName } = input;

  // (0) FAIL CLOSED on missing trusted context. Both of these would otherwise degenerate the checks
  // below into something that looks like a guard and is not: an empty cloud name collapses the
  // tenant prefix to a bare slash, and an empty listing id makes the folder prefix
  // `fitout/listings//`, which is not a scope.
  if (typeof cloudName !== "string" || cloudName.trim() === "") return false;
  if (typeof listingId !== "string" || listingId.trim() === "") return false;
  if (typeof url !== "string" || typeof publicId !== "string") return false;

  // ── the url, PARSED ───────────────────────────────────────────────────────────────────────────
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // Closes: `"not a url"`, `""`, `" "`, a bare host, and a protocol-relative `//host/...` — none
    // of which the WHATWG parser can resolve without a base, so none of which we can reason about.
    return false;
  }

  // Closes: `http:` (mixed content on a page served over https to every booker) and every opaque
  // scheme — `javascript:`, `data:`, `file:`. The widget hands us `info.secure_url`, so https is not
  // a tightening of what the real pipeline produces; it is exactly what it produces.
  if (parsed.protocol !== "https:") return false;

  // Closes: the SUFFIX host `res.cloudinary.com.evil.tld` and the QUERY-STRING host
  // `https://evil.tld/?x=https://res.cloudinary.com/...`. Both carry our host as a substring; only
  // the parsed hostname distinguishes them, and `===` is the whole distinction.
  if (parsed.hostname !== DELIVERY_HOST) return false;

  // Closes: another TENANT on the same host (`/someoneelse/image/upload/...`), non-image asset types
  // (`/raw/upload/`, where an SVG or an html file would live), and the `fetch`/`twitter` DELIVERY
  // TYPES that proxy an arbitrary remote url through our own cloud name.
  //
  // ⚠ IT DOES NOT CLOSE REMOTE CONTENT, and it used to claim it did. `l_fetch:` — the remote-image
  // overlay — is a TRANSFORMATION, and transformations live under `/image/upload/` like everything
  // else. This test is a tenant check. The asset check is the next one, and it is the load-bearing
  // half; see the ⚠ block in the file header.
  const uploadPrefix = `/${cloudName}/image/upload/`;
  if (!parsed.pathname.startsWith(uploadPrefix)) return false;

  // ── the public id, SCOPED ─────────────────────────────────────────────────────────────────────
  // Order matters: the four character-level rejections run BEFORE the prefix test, so each one is
  // reachable on its own rather than being shadowed by it.

  // Closes: traversal. `fitout/listings/<id>/../../avatars/victim` satisfies `startsWith(prefix)`
  // and still names an asset outside the folder — a prefix check alone is not a scope check.
  if (/\.\./.test(publicId)) return false;

  // Closes: an absolute-looking id. `/fitout/...` is a different key to Cloudinary and a different
  // string to anything that later joins it onto a path.
  if (/^\//.test(publicId)) return false;

  // Closes: the backslash spelling. The WHATWG parser reads `\` as `/` for special schemes, which is
  // exactly the bypass recorded at `safe-callback-url.ts:14-20`; an id is never allowed to carry one.
  if (/\\/.test(publicId)) return false;

  // Closes: a scheme separator smuggled into an id field — `https://evil.tld/one` as a "public id".
  if (/:/.test(publicId)) return false;

  // Closes: any id outside THIS listing's folder, including the right-shape-wrong-listing IDOR
  // spelling `fitout/listings/<other-listing>/one`.
  const prefix = listingFolderPrefix(listingId);
  if (!publicId.startsWith(prefix)) return false;

  // Closes: the prefix ALONE (`fitout/listings/<id>/`), which is a folder and names no asset. Also
  // closes the prefix without its trailing slash, which the check above already refuses.
  if (publicId.length <= prefix.length) return false;

  // ── the url's ASSET, ANCHORED (CR-02) ─────────────────────────────────────────────────────────
  // Everything between `/image/upload/` and the asset is Cloudinary's transformation language, and
  // that language can BOTH name a different asset of ours (`l_fitout:avatars:<victim>`) and pull in
  // a foreign one (`l_fetch:<base64url>`). There is no safe subset to enumerate — a vendor DSL grows
  // and a blocklist against it is the same losing shape as substring-matching a hostname, which the
  // lesson at the foot of this header already rejects. So the path is required to be EXACTLY the
  // asset, and the whole DSL is refused:
  //
  //     /<cloud>/image/upload/[v<digits>/]<publicId>[.<ext>]
  //
  // That is byte-for-byte what the signed direct upload's `secure_url` returns
  // (`photo-uploader.tsx:127`), which is the only url this action is ever legitimately handed. A
  // RENDERING transformation is applied by building a url from the stored `publicId` at render time;
  // it is never a thing we STORE. Refusing one here costs the real pipeline nothing.
  let assetPath: string;
  try {
    // Percent-decoded, because the WHATWG parser encodes a space (and every other non-ASCII byte) in
    // `pathname` while Cloudinary's `public_id` carries the raw character. Comparing the two
    // spellings without decoding would reject a legitimate upload whose filename had a space in it.
    // A malformed escape sequence throws, and an unparseable path is not an asset we can vouch for.
    assetPath = decodeURIComponent(parsed.pathname.slice(uploadPrefix.length));
  } catch {
    return false;
  }
  // Drop ONLY a leading `v<digits>` version. A transformation component in that position is not
  // dropped — it makes the comparison below fail, which is the intent.
  const withoutVersion = assetPath.replace(/^v\d+\//, "");
  // `<publicId>` or `<publicId>.<ext>`, and nothing else. The extension is deliberately not pinned
  // to a list: Cloudinary picks it from the source, and a wrong-but-ours extension is not a threat.
  // It IS required to be a single path segment — an ANCHORED pattern, like every other rejection in
  // this file and for the reason the source gate in `tests/listing/cloudinary-provenance.test.ts`
  // states: a substring search is the shape that lets `…/one.jpg/x.png` through.
  const suffix =
    withoutVersion.startsWith(`${publicId}.`)
      ? withoutVersion.slice(publicId.length + 1)
      : null;
  if (withoutVersion !== publicId && !(suffix !== null && /^[^/]+$/.test(suffix))) {
    return false;
  }

  return true;
}
