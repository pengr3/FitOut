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
//   - It does NOT require the url's path to contain the `publicId`. Both are independently scoped to
//     us below; the residual — one of our own listing assets referenced from another of our own
//     listings — is a cosmetic mix-up inside our own account, not a foreign-content vector. Recorded
//     rather than silently closed, because scope creep here is how a security fix becomes unshippable.
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
  // (`/raw/upload/`, where an SVG or an html file would live), and the `fetch`/`twitter` delivery
  // types that proxy an ARBITRARY REMOTE URL through our own cloud name — the one shape that would
  // otherwise satisfy every check above while serving someone else's bytes.
  if (!parsed.pathname.startsWith(`/${cloudName}/image/upload/`)) return false;

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

  return true;
}
