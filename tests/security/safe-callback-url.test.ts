// WR-12 — the `?callbackURL` open-redirect guard.
//
// The value this function returns is handed to `router.push()` and to
// `authClient.signIn.social({ callbackURL })` on the login page, from a query parameter an attacker
// fully controls in a link they send. The guard it replaces was a prefix match that its own comment
// described as honouring "only a relative `/…` path", and that description was false: the WHATWG URL
// parser reads a BACKSLASH as a forward slash for special schemes, so `/\evil.com` starts with `/`,
// does not start with `//`, and resolves to `https://evil.com/`.
//
// Both halves are asserted below — every known bypass spelling is rejected, and every legitimate
// relative callback the product actually threads is preserved unchanged. The second half matters as
// much as the first: `book-cta.tsx` and `rsvp-form.tsx` both build resume-checkout callbacks with
// query strings, and a guard that broke those would send every returning booker to the home page.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// SEC-01 — THE DOT-SEGMENT CASES BELOW WERE WATCHED FAILING BEFORE THE GUARD WAS TOUCHED.
//
// WR-12 shipped the ten attack strings above under a commit message claiming closure, and that
// list passed a guard that still had this hole — a test never observed red is not a regression
// test. So the SEC-01 cases were added FIRST, run against the UNMODIFIED module, and the output is
// pasted here verbatim rather than summarised. The runner was a throwaway root config
// (`vitest.sec.tmp.config.ts`: no globalSetup, no setupFiles, `include` pinned to this one file)
// because the main config's Postgres preflight hard-fails a single-file run; it was deleted after
// the fix. Same config had just run this file GREEN at 9 passed, so the red below is the new cases
// and not the runner.
//
// 2026-08-12 · guard at 8b9db10, UNMODIFIED · npx vitest run --config vitest.sec.tmp.config.ts
//
//      ❯ tests/security/safe-callback-url.test.ts (10 tests | 2 failed) 20ms
//          × SEC-01 — rejects the DOT-SEGMENT bypass that made the RETURNED pathname an authority 10ms
//          × works on a localhost origin with a port, which is every developer's session 1ms
//
//      FAIL  tests/security/safe-callback-url.test.ts > WR-12 — the guard rejects everything that
//      leaves the origin > SEC-01 — rejects the DOT-SEGMENT bypass that made the RETURNED pathname
//      an authority
//      AssertionError: "/..//evil.com": expected '//evil.com' to be '/' // Object.is equality
//
//      Expected: "/"
//      Received: "//evil.com"
//
//       ❯ tests/security/safe-callback-url.test.ts:62:72
//
//      FAIL  tests/security/safe-callback-url.test.ts > WR-12 — the guard preserves every
//      legitimate relative callback > works on a localhost origin with a port, which is every
//      developer's session
//      AssertionError: expected '//evil.com' to be '/' // Object.is equality
//
//      Expected: "/"
//      Received: "//evil.com"
//
//       ❯ tests/security/safe-callback-url.test.ts:149:72
//
//       Test Files  1 failed (1)
//            Tests  2 failed | 8 passed (10)
//         Duration  347ms
//
//      EXIT=1
//
// (The `:62` / `:149` line numbers are this file as it stood during that run — i.e. before this
// header block was prepended. They are left exactly as printed rather than re-based, because the
// point of the record is that it is the observation and not a reconstruction of one.)
//
// Note WHERE the red is: inside the SEC-01 block, the three URL-parser assertions ABOVE the loop
// passed — the origin check was satisfied, and the escape rode out on the RETURN. That is the whole
// diagnosis, and it is why the fix guards the output rather than adding another input prefix.
//
// Same command, same file, after the guard was fixed:
//
//       Test Files  1 passed (1)
//            Tests  10 passed (10)
//         Duration  367ms
//
//      EXIT=0
// ─────────────────────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";

import { safeCallbackPath } from "@/lib/safe-callback-url";

const ORIGIN = "https://fitout.example";

describe("WR-12 — the guard rejects everything that leaves the origin", () => {
  it("rejects the BACKSLASH bypass the old prefix match admitted", () => {
    // THE FINDING, as an assertion. The old guard was
    //   raw.startsWith("/") && !raw.startsWith("//")
    // and this string satisfies both, then resolves cross-origin.
    expect("/\\evil.com".startsWith("/")).toBe(true);
    expect("/\\evil.com".startsWith("//")).toBe(false);
    expect(new URL("/\\evil.com", ORIGIN).origin).toBe("https://evil.com");

    expect(safeCallbackPath("/\\evil.com", ORIGIN)).toBe("/");
  });

  it("SEC-01 — rejects the DOT-SEGMENT bypass that made the RETURNED pathname an authority", () => {
    // THE FINDING, as an assertion, in the same shape as the backslash test above: state the
    // mechanism first, so the defect is localised to the RETURN rather than to the origin check.
    //
    // Dot-segment removal happens DURING the parse, so `/..//evil.com` resolves same-origin — the
    // origin check at the top of the guard is genuinely satisfied and is not what was missing.
    expect(new URL("/..//evil.com", ORIGIN).origin).toBe(ORIGIN);
    // ...but what survives the parse is a pathname that BEGINS WITH TWO SLASHES.
    expect(new URL("/..//evil.com", ORIGIN).pathname).toBe("//evil.com");
    // ...and a pathname beginning with two slashes is an AUTHORITY to whoever parses it next, which
    // the caller does: `router.push()` hands it to `new URL(href, location.href)`.
    expect(new URL("//evil.com", ORIGIN).origin).toBe("https://evil.com");

    // STRICTLY A TIGHTENING, not a regression introduced by WR-12. The pre-WR-12 prefix guard
    // returned this string VERBATIM, so the fix removes an acceptance rather than adding one.
    const oldPrefixGuard = (raw: string) =>
      raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
    expect(oldPrefixGuard("/..//evil.com")).toBe("/..//evil.com");

    // Asserted against BOTH origins. SEC-01 is origin-independent, and the doc previously claimed
    // "7 vectors x 2 origins" while this gate pinned six of them on one origin only — the audit
    // caught that gap between the prose and the committed test. localhost:3000 matters on its own
    // merits: it is the origin every developer session is pinned to.
    const SEC01_ORIGINS = [ORIGIN, "http://localhost:3000"];
    const SEC01_VECTORS = [
      "/..//evil.com",
      "/.//evil.com",
      "/a/../..//evil.com",
      "/..//evil.com?a=1#b",
      "/..///evil.com",
      "/./..//evil.com/steal#token",
      // Normalises to the bare `//`. NOTE: an earlier comment here claimed the guard needed its
      // try/catch because re-parsing this one throws. `new URL("//", origin)` does throw, but this
      // candidate never gets that far — the `startsWith("//")` rejection takes it first. Kept in
      // the list because it is a real vector; the claim about WHERE it is caught was wrong.
      "/..//",
    ];
    for (const attackOrigin of SEC01_ORIGINS) {
      for (const attack of SEC01_VECTORS) {
        expect(
          safeCallbackPath(attack, attackOrigin),
          `${JSON.stringify(attack)} @ ${attackOrigin}`,
        ).toBe("/");
      }
    }
  });

  it("rejects every other spelling of the same trick", () => {
    // Each of these is why the fix PARSES instead of adding another `startsWith`. Closing the
    // backslash spelling alone would have left all of the rest.
    for (const attack of [
      "//evil.com",
      "/\\evil.com",
      "/\\/evil.com",
      "\\\\evil.com",
      "/\\\\evil.com",
      "/\t/evil.com",
      "/\n/evil.com",
      "/\r/evil.com",
      "//evil.com/path?a=1",
      "/\\evil.com/steal#token",
    ]) {
      expect(safeCallbackPath(attack, ORIGIN), JSON.stringify(attack)).toBe("/");
    }
  });

  it("rejects absolute URLs on another origin, and opaque schemes", () => {
    for (const attack of [
      "https://evil.com",
      "http://evil.com/path",
      "https://fitout.example.evil.com/",
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "file:///etc/passwd",
    ]) {
      expect(safeCallbackPath(attack, ORIGIN), attack).toBe("/");
    }
  });

  it("rejects absent, empty and non-path values", () => {
    for (const value of [null, undefined, "", " ", "bookings", "./bookings", "../admin"]) {
      expect(safeCallbackPath(value, ORIGIN), JSON.stringify(value)).toBe("/");
    }
  });

  it("does not newly ACCEPT anything the old guard rejected", () => {
    // A fix for an open redirect that quietly widens the guard is a different bug. `"bookings"`
    // resolves same-origin and would be safe, but the old guard refused it, so this one does too.
    const oldGuard = (raw: string | null) =>
      raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

    for (const value of ["bookings", "./x", "../x", "", "https://fitout.example/bookings"]) {
      expect(oldGuard(value), value).toBe("/");
      expect(safeCallbackPath(value, ORIGIN), value).toBe("/");
    }
  });
});

describe("WR-12 — the guard preserves every legitimate relative callback", () => {
  it("keeps the paths the product actually threads, query and fragment intact", () => {
    // These are the real shapes: `book-cta.tsx:144` encodes a listing plus a slot selection,
    // `invite/[token]/page.tsx:190` encodes an invite token, `rsvp-form.tsx` returns to an invite.
    for (const path of [
      "/",
      "/bookings",
      "/bookings/123",
      "/listings/abc?resume=1",
      "/listings/abc?resume=1&start=2026-08-12T10%3A00%3A00Z",
      "/invite/tok_123",
      "/host/listings",
      "/listings/abc#slots",
      "/listings/abc?resume=1#slots",
    ]) {
      expect(safeCallbackPath(path, ORIGIN), path).toBe(path);
    }
  });

  it("preserves a path containing an encoded slash or colon", () => {
    // `encodeURIComponent` is what builds these, so encoded characters are the norm, not the edge.
    const encoded = "/listings/abc?next=%2Fbookings%2F123&at=2026-08-12T10%3A00%3A00Z";
    expect(safeCallbackPath(encoded, ORIGIN)).toBe(encoded);
  });

  it("works on a localhost origin with a port, which is every developer's session", () => {
    expect(safeCallbackPath("/bookings?resume=1", "http://localhost:3000")).toBe(
      "/bookings?resume=1",
    );
    expect(safeCallbackPath("//evil.com", "http://localhost:3000")).toBe("/");
    expect(safeCallbackPath("/\\evil.com", "http://localhost:3000")).toBe("/");
    // The full SEC-01 vector list is now run against this origin too, in the SEC-01 test above.
    // This line stays as a readable spot-check at the place a reader looks for localhost behaviour.
    expect(safeCallbackPath("/..//evil.com", "http://localhost:3000")).toBe("/");
    // A different PORT is a different origin, and must not be treated as ours.
    expect(safeCallbackPath("http://localhost:4000/x", "http://localhost:3000")).toBe("/");
  });

  it("falls back rather than throwing when the origin itself is unusable", () => {
    // `window.location.origin` is `"null"` in a sandboxed iframe. The guard must degrade to "/",
    // never throw — this function runs inside a click handler on the login form.
    expect(safeCallbackPath("/bookings", "null")).toBe("/");
    expect(safeCallbackPath("/bookings", "")).toBe("/");
  });
});
