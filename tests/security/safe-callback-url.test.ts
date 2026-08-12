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
