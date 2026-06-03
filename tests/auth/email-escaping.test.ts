// WR-01 regression: the verify/reset email body must HTML-escape the (client-influenceable) url
// before interpolating it into the <a href="..."> markup. A url containing a double-quote, angle
// bracket, or other HTML-significant character must NOT break out of the attribute or inject markup.
//
// The Resend client is mocked globally (tests/setup.ts), so we capture the rendered HTML and assert
// the raw injection payload never appears verbatim while its escaped form does.

import { describe, it, expect } from "vitest";
import { sendResetPassword, sendVerificationEmail } from "@/lib/email";
import { mockResend } from "../helpers/mocks";

describe("email HTML escaping (WR-01)", () => {
  it("escapes a quote/markup-bearing url in the reset email so it cannot break the href", async () => {
    const evil =
      'https://fitout.app/reset?token=abc"><script>alert(1)</script>';
    await sendResetPassword("victim@example.com", evil);

    const html = mockResend.last()?.html ?? "";
    // The raw injection payload must NOT appear verbatim.
    expect(html).not.toContain('"><script>');
    expect(html).not.toContain("<script>alert(1)</script>");
    // The escaped form must be present (proves the url WAS rendered, just safely).
    expect(html).toContain("&quot;");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes the url in the verification email the same way", async () => {
    const evil = 'https://fitout.app/verify?token=x"<b>';
    await sendVerificationEmail("victim2@example.com", evil);

    const html = mockResend.last()?.html ?? "";
    expect(html).not.toContain('"<b>');
    expect(html).toContain("&quot;");
    expect(html).toContain("&lt;b&gt;");
  });

  it("leaves a benign url functional (round-trips an ampersand as &amp;)", async () => {
    const url = "https://fitout.app/reset?token=abc&redirect=/profile";
    await sendResetPassword("ok@example.com", url);

    const html = mockResend.last()?.html ?? "";
    // The ampersand is escaped to &amp; (valid HTML) — the link still points at the same target.
    expect(html).toContain("token=abc&amp;redirect=/profile");
    expect(html).not.toContain("token=abc&redirect"); // raw, unescaped ampersand must not remain.
  });
});
