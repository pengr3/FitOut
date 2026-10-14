import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mail = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("resend", () => ({ Resend: class { emails = { send: mail.send }; } }));
const inquiry = { name: 'Visitor <img src=x onerror="alert(1)">', email: "Person@example.com", confirmEmail: "person@EXAMPLE.com", mobile: "+63 (917) 123-4567", message: '<script>alert("inquiry")</script>\nLiteral & text', website: "" as const };
beforeEach(() => {
  vi.resetModules();
  for (const [key, value] of Object.entries({ NODE_ENV: "test", RESEND_API_KEY: "re_mock_not_live", EMAIL_FROM: "FitOut <verified@example.test>", BETTER_AUTH_URL: "http://localhost:3000", NEXT_PUBLIC_APP_URL: "http://localhost:3000", MARKETING_APP_URL: "http://marketing.localhost:3000", OPS_APP_URL: "http://ops.localhost:3000", VERCEL: "", VERCEL_ENV: "", VERCEL_URL: "" })) vi.stubEnv(key, value);
  mail.send.mockReset().mockResolvedValue({ data: { id: "simulated-accepted-id" }, error: null });
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
describe("Contact real transport composition with mocked provider", () => {
  it("requires an actual provider acceptance ID rather than only absence of error", async () => {
    mail.send.mockResolvedValue({ data: null, error: null });
    const { sendContactInquiry } = await import("@/lib/email");
    expect(await sendContactInquiry(inquiry), "missing Resend acceptance must remain undelivered").toEqual({ delivered: false });
  });
  it("fixes From, sole To and subject while validating only Contact sender Reply-To", async () => {
    const { sendContactInquiry } = await import("@/lib/email");
    const { SUPPORT_EMAIL } = await import("@/lib/site");
    expect(await sendContactInquiry(inquiry)).toEqual({ delivered: true, transport: "resend" });
    expect(mail.send).toHaveBeenCalledTimes(1);
    const payload = mail.send.mock.calls[0][0];
    expect(payload).toEqual(expect.objectContaining({ from: "FitOut <verified@example.test>", to: SUPPORT_EMAIL, subject: "FitOut contact inquiry", replyTo: "person@example.com" }));
    expect(payload.html).toContain("&lt;script&gt;alert(&quot;inquiry&quot;)&lt;/script&gt;");
    expect(payload.html).toContain("Visitor &lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(payload.html).toContain("Literal &amp; text");
    expect(payload.html).not.toContain("<script>"); expect(payload.html).not.toContain("<img src=x");
    expect(payload.text).toContain(inquiry.name); expect(payload.text).toContain('<script>alert("inquiry")</script>');
    expect(payload.text).toContain("Literal & text"); expect(payload.text).not.toContain("&lt;script&gt;");
    expect(payload.html).not.toContain("&amp;lt;script");
  });
  it("keeps transactional Reply-To at SUPPORT_EMAIL", async () => {
    const { sendContactInquiry, sendVerificationEmail } = await import("@/lib/email");
    const { SUPPORT_EMAIL } = await import("@/lib/site");
    await sendContactInquiry(inquiry);
    await sendVerificationEmail("booker@example.com", "http://localhost:3000/verify?token=synthetic");
    expect(mail.send.mock.calls[1][0].replyTo).toBe(SUPPORT_EMAIL);
  });
  it.each([ { email: "a@example.com\r\nBcc: victim@example.com" }, { name: "Name\r\nInjected" }, { confirmEmail: "different@example.com" }, { subject: "override" } ])("rejects unsafe or override input case %# before transport", async (fields) => {
    const { sendContactInquiry } = await import("@/lib/email");
    expect(await sendContactInquiry({ ...inquiry, ...fields })).toEqual({ delivered: false });
    expect(mail.send).not.toHaveBeenCalled();
  });
  it.each(["development", "production"]) ("never logs or reports a missing-key send in %s", async (environment) => {
    vi.stubEnv("RESEND_API_KEY", ""); vi.stubEnv("NODE_ENV", environment);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { sendContactInquiry } = await import("@/lib/email");
    expect(await sendContactInquiry(inquiry)).toEqual({ delivered: false });
    expect(mail.send).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    const logged = error.mock.calls.flat().join(" ");
    for (const sensitive of [inquiry.name, inquiry.email, inquiry.mobile, "inquiry\")"]) expect(logged).not.toContain(sensitive);
  });
  it.each(["returned", "thrown"]) ("contains %s provider failures without PII or success", async (kind) => {
    const failure = `private ${inquiry.email} ${inquiry.name} ${inquiry.message}`;
    if (kind === "returned") mail.send.mockResolvedValue({ data: null, error: { message: failure } });
    else mail.send.mockRejectedValue(new Error(failure));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { sendContactInquiry } = await import("@/lib/email");
    expect(await sendContactInquiry(inquiry)).toEqual({ delivered: false });
    expect([...log.mock.calls.flat(), ...error.mock.calls.flat()].join(" ")).not.toContain(inquiry.email);
    expect([...log.mock.calls.flat(), ...error.mock.calls.flat()].join(" ")).not.toContain(inquiry.message);
  });
});
