// The open-redirect guard for `?callbackURL`, as a pure function of (raw, origin).
//
// WHY IT IS ITS OWN MODULE. It used to be four lines inside `src/app/(auth)/login/page.tsx`,
// reading `window.location` directly, which made it untestable without a DOM and therefore
// untested. The value it returns is fed to `router.push()` and to
// `authClient.signIn.social({ callbackURL })` — the second of which survives a full OAuth
// round-trip — from a query parameter an attacker fully controls in a link they send. That is
// exactly the shape that earns a test, and it cannot have one while it reads a global.
//
// THE BUG THIS REPLACES (WR-12 of the phase-10 re-review). The guard was:
//
//     raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/"
//
// and its comment claimed it honoured "only a relative `/…` path". It did not. The WHATWG URL
// parser treats a BACKSLASH as a forward slash for special schemes, so `/\evil.com` satisfies both
// conditions — it starts with `/` and does not start with `//` — and then resolves to
// `https://evil.com/`. Measured against this Node:
//
//     "//evil.com"   -> guard "/"           -> resolves https://fitout.example/
//     "/\evil.com"   -> guard "/\evil.com"  -> resolves https://evil.com/          <-- bypass
//
// PREFIX MATCHING CANNOT FIX THIS, which is the actual lesson. Adding `!raw.startsWith("/\\")`
// closes one spelling and leaves the next (`/\/`, a tab or newline the parser strips, a percent
// encoding). The only check that answers the real question — "does this navigate off our origin?" —
// is to PARSE it and compare origins, because that runs the same algorithm the browser will.
//
// RECORDED HONESTLY: END-TO-END EXPLOITABILITY WAS NEVER VERIFIED. Whether Next's App Router
// actually navigates cross-origin on a `pushState`-shaped href, and whether Better Auth's
// `trustedOrigins` independently rejects the social `callbackURL`, both need a running browser and
// auth server. What IS proven, and is proven by the tests beside this file, is that the old guard
// admitted a string that resolves to another origin while its comment said it could not. The fix is
// strictly tightening, so it is applied here rather than deferred; the end-to-end verification is
// still worth doing and is the reason the review asked for a separate security ticket.
//
// THAT TICKET RAN, AND IT FOUND THE LESSON ABOVE HAD ONLY BEEN APPLIED HALFWAY (SEC-01, the phase-10
// security audit; fixed 2026-08-12).
//
// THE HOLE. The origin comparison below is correct and was never the defect — the defect was in what
// this function RETURNS. Dot-segment removal happens DURING the parse, so an input whose leading
// segment resolves away can satisfy the origin check and still leave a pathname that begins with two
// slashes. A pathname is permitted to begin that way; an authority also begins that way; and this
// function's contract is to hand its result to a caller who parses it AGAIN. So the check was
// applied to the INPUT and the escape rode out on the OUTPUT. The exact vectors live in the test
// beside this file, described rather than pasted here on purpose.
//
// NOT INTRODUCED BY WR-12 — strictly a tightening, and the test asserts this rather than claiming
// it. The pre-WR-12 prefix guard returned such an input VERBATIM (it starts with one slash and not
// with two), so the parse-and-compare fix narrowed the hole without closing this spelling of it.
// What phase 10 owns is that the change shipped under a commit message claiming closure.
//
// THE CHAIN, each link checked against installed source by the audit: the login page reads
// `?callbackURL` at `login/page.tsx:74`, this function hands back the authority-shaped string,
// `router.push()` at `login/page.tsx:99` reaches Next's app-router instance, which resolves the href
// with `new URL(href, location.href)`, sees `isExternalURL` go true, and hard-navigates. The victim
// really did just sign in on the real site, which is what makes it a phishing amplifier rather than
// a cosmetic redirect.
//
// WHY THE `router.push` LEG WAS THE EXPLOITABLE ONE. The social leg has an independent vendor
// backstop — Better Auth's trusted-origins check rejects a callback of this shape with a 403
// `INVALID_CALLBACK_URL` (the paragraph above listed that as unverified; the audit verified it, and
// it holds). `router.push()` has NO such backstop. Defence in depth is not a reason to leave the
// unbacked leg unguarded, and the fix below guards the value at its source so both legs are covered
// by something this repository owns and tests.
//
// PRE-EXISTING, NOT PHASE 10's. `git log -L` puts the original guard at `487bda7` (phase 4). Phase
// 10 only restyled the file it lived in.

/**
 * Resolve `raw` to a safe same-origin path, or `"/"`.
 *
 * @param raw    The untrusted `?callbackURL` value, or `null` when absent.
 * @param origin The app's own origin, e.g. `window.location.origin`.
 *
 * Returns `pathname + search + hash` rather than `raw` itself. That is deliberate: the parser has
 * already normalised away the control characters, backslashes and percent-encodings that make
 * prefix matching unreliable, so returning its output means the caller navigates to the string that
 * was actually checked rather than to the one that was typed.
 *
 * The returned value is then checked IN ITS OWN RIGHT before it leaves (SEC-01), because the caller
 * re-parses it. Everything here is a rejection: no input the previous guard refused is newly
 * accepted, and every legitimate relative callback comes back untouched, query and fragment intact.
 */
export function safeCallbackPath(raw: string | null | undefined, origin: string): string {
  // Keep the original relative-only requirement. It is not what stops the bypass — the origin
  // comparison below is — but dropping it would quietly WIDEN the guard: `"bookings"` (no leading
  // slash) resolves same-origin and would newly be honoured. A fix for an open redirect should not
  // start accepting inputs the old one rejected.
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

  const candidate = `${target.pathname}${target.search}${target.hash}`;

  // SEC-01, first rejection. A pathname is allowed to begin with two slashes, and to whoever parses
  // this string NEXT that is an authority, not a path. Naming the shape directly is the cheap half.
  if (candidate.startsWith("//")) return "/";

  // SEC-01, second rejection, and the load-bearing one. One prefix is one spelling — the same
  // mistake the header describes above, made again — so instead of guessing at spellings this
  // performs THE CALLER'S OWN OPERATION: resolving the returned value against the origin is exactly
  // what `router.push()` causes on the login page. If that lands anywhere but here, do not return
  // it. The catch is not decorative: a candidate that is only slashes has an empty host and throws.
  try {
    if (new URL(candidate, origin).origin !== self.origin) return "/";
  } catch {
    return "/";
  }

  return candidate;
}
