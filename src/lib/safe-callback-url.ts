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

  return `${target.pathname}${target.search}${target.hash}`;
}
