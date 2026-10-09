import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const transport = vi.hoisted(() => ({ send: vi.fn() }));
const sharedQuota = vi.hoisted(() => ({ reserve: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendContactInquiry: transport.send }));
vi.mock("@/lib/contact-quota", () => ({ reserveContactQuota: sharedQuota.reserve }));
const local = "http://marketing.localhost:3000";
const valid = { name: " Visitor ", email: " Person@example.com ", confirmEmail: "person@EXAMPLE.com", mobile: "", message: "Hello\nFitOut", website: "" };
let POST: (request: Request) => Promise<Response>;
function request(body: unknown = valid, headers: Record<string, string | undefined> = {}, origin = local) {
  const presentHeaders = Object.fromEntries(Object.entries(headers).filter((entry): entry is [string, string] => entry[1] !== undefined));
  return new Request(`${origin}/api/contact`, { method: "POST", headers: { host: new URL(origin).host, origin, "content-type": "application/json", ...presentHeaders }, body: typeof body === "string" ? body : JSON.stringify(body) });
}
beforeEach(async () => {
  vi.resetModules();
  for (const [key, value] of Object.entries({ NODE_ENV: "test", VERCEL: "", VERCEL_ENV: "", VERCEL_URL: "", BETTER_AUTH_URL: "http://localhost:3000", NEXT_PUBLIC_APP_URL: "http://localhost:3000", MARKETING_APP_URL: local, OPS_APP_URL: "http://ops.localhost:3000", MARKETING_PREVIEW_URL: "", CONTACT_PRODUCTION_ENABLED: "" })) vi.stubEnv(key, value);
  transport.send.mockReset().mockResolvedValue({ delivered: true, transport: "resend" });
  sharedQuota.reserve.mockReset().mockResolvedValue({ ok: true });
  ({ POST } = await import("@/app/api/contact/route"));
});
afterEach(() => vi.unstubAllEnvs());
describe("Contact public send boundary", () => {
  it("returns 503 before mail when the shared store is unavailable", async () => {
    sharedQuota.reserve.mockResolvedValue({ ok: false, reason: "unavailable" });
    expect((await POST(request())).status).toBe(503);
    expect(transport.send).not.toHaveBeenCalled();
  });
  it("returns the shared rolling-window retry without invoking mail", async () => {
    sharedQuota.reserve.mockResolvedValue({ ok: false, reason: "limited", retryAfter: 42 });
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("42");
    expect(transport.send).not.toHaveBeenCalled();
  });
  it("accepts only a validated inquiry delivered by Resend", async () => {
    const response = await POST(request());
    expect(response.status, "accepted Resend inquiry must return 200").toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(transport.send).toHaveBeenCalledWith({ ...valid, name: "Visitor", email: "person@example.com", confirmEmail: "person@example.com" });
  });
  it.each([ { origin: "" }, { origin: "http://localhost:3000" }, { origin: "https://marketing.localhost:3000" }, { host: "marketing.localhost:3001" }, { host: "attacker.test", "x-forwarded-host": "marketing.localhost:3000" }, { origin: `${local}/` } ])("rejects wrong or missing authority/origin %j", async (headers) => {
    expect((await POST(request(valid, headers))).status).toBe(403);
    expect(transport.send).not.toHaveBeenCalled();
  });
  it.each([ { confirmEmail: "another@example.com" }, { name: "" }, { name: "a".repeat(101) }, { name: "A\r\nB" }, { email: "a@example.com\r\nBcc: victim@example.com" }, { mobile: "123\n456789" }, { mobile: "123" }, { mobile: "1".repeat(33) }, { message: "" }, { message: "m".repeat(5001) }, { message: "bad\u0000text" }, { website: "bot" }, { website: " " }, { email: "a".repeat(255) }, { subject: "override" } ])("rejects field bounds/control/honeypot/extra field case %#", async (fields) => {
    const response = await POST(request({ ...valid, ...fields }));
    expect(response.status).toBe(400);
    expect(transport.send).not.toHaveBeenCalled();
    expect(JSON.stringify(await response.json())).not.toContain("victim@example.com");
  });
  it("accepts an optional printable phone with 7–15 digits", async () => {
    expect((await POST(request({ ...valid, mobile: "+63 (917) 123-4567" }))).status).toBe(200);
  });
  it.each(["text/plain", "application/jsonp", ""]) ("rejects non-JSON content type %s", async (type) => {
    expect((await POST(request(valid, { "content-type": type }))).status).toBe(400);
  });
  it.each(["{bad", "null", "[]"]) ("rejects malformed or nonobject JSON %s", async (body) => {
    expect((await POST(request(body))).status).toBe(400);
  });
  it("bounds streamed bytes even without content length and cancels oversized body", async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(16385)); }, cancel });
    const req = new Request(`${local}/api/contact`, { method: "POST", headers: { host: "marketing.localhost:3000", origin: local, "content-type": "application/json" }, body: stream, duplex: "half" } as RequestInit);
    expect((await POST(req)).status).toBe(413);
    expect(cancel).toHaveBeenCalled();
    expect(transport.send).not.toHaveBeenCalled();
  });
  it("denies oversized declared length before consuming the body", async () => {
    expect((await POST(request(valid, { "content-length": "16385" }))).status).toBe(413);
    expect(transport.send).not.toHaveBeenCalled();
  });
  it.each([{ delivered: false }, { delivered: true, transport: "development" }])("never accepts undelivered/development transport %j", async (result) => {
    transport.send.mockResolvedValue(result);
    expect((await POST(request())).status).toBe(503);
  });
  it("catches provider throws without echoing or logging submitted data", async () => {
    transport.send.mockRejectedValue(new Error("Person@example.com Hello FitOut"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("Person@example.com");
    expect(log.mock.calls.flat().join(" ")).not.toContain("Person@example.com");
    log.mockRestore();
  });
  async function deployed(enabled = "true") {
    for (const [key, value] of Object.entries({ NODE_ENV: "production", VERCEL: "1", VERCEL_ENV: "production", VERCEL_URL: "fitout-deployment.vercel.app", BETTER_AUTH_URL: "https://app.fitout.live", NEXT_PUBLIC_APP_URL: "https://app.fitout.live", MARKETING_APP_URL: "https://fitout.live", OPS_APP_URL: "https://ops.fitout.live", CONTACT_PRODUCTION_ENABLED: enabled })) vi.stubEnv(key, value);
    vi.resetModules();
    ({ POST } = await import("@/app/api/contact/route"));
  }
  it("defaults production to recoverable disabled even with good ingress", async () => {
    await deployed("");
    expect((await POST(request(valid, { "x-vercel-forwarded-for": "203.0.113.1" }, "https://fitout.live"))).status).toBe(503);
    expect(transport.send).not.toHaveBeenCalled();
    expect(sharedQuota.reserve).not.toHaveBeenCalled();
  });
  it.each(["", "203.0.113.1, 203.0.113.2", "invalid", "203.0.113.1:1234", "203.0. 113.1"]) ("denies missing/malformed/chained Vercel identity %s", async (ip) => {
    await deployed();
    expect((await POST(request(valid, { "x-vercel-forwarded-for": ip, "x-forwarded-for": "203.0.113.1" }, "https://fitout.live"))).status).toBe(403);
    expect(transport.send).not.toHaveBeenCalled();
  });
  it("uses controlled Vercel original identity rather than spoofable forward headers", async () => {
    await deployed();
    expect((await POST(request(valid, { "x-vercel-forwarded-for": "2001:db8::1", "x-forwarded-for": "attacker" }, "https://fitout.live"))).status).toBe(200);
  });
  it.each([{ VERCEL: "" }, { VERCEL_ENV: "" }, { VERCEL_URL: "other.example.test" }])("unknown deployment topology fails closed %j", async (env) => {
    await deployed();
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    expect((await POST(request(valid, { "x-vercel-forwarded-for": "203.0.113.1" }, "https://fitout.live"))).status).toBe(403);
  });
  it("does not use a fixed identity on an unrecognized remote nonproduction host", async () => {
    vi.stubEnv("MARKETING_APP_URL", "https://marketing.example.test"); vi.resetModules();
    ({ POST } = await import("@/app/api/contact/route"));
    expect((await POST(request(valid, {}, "https://marketing.example.test"))).status).toBe(403);
  });
  it("enforces sender budget and gives bounded retry feedback", async () => {
    for (let i = 0; i < 3; i++) expect((await POST(request())).status).toBe(200);
    const response = await POST(request());
    expect(response.status).toBe(429); expect(response.headers.get("retry-after")).toBe("3600");
    expect(transport.send).toHaveBeenCalledTimes(3);
  });
  it("enforces IP budget across different senders", async () => {
    for (let i = 0; i < 5; i++) expect((await POST(request({ ...valid, email: `p${i}@example.com`, confirmEmail: `p${i}@example.com` }))).status).toBe(200);
    const response = await POST(request());
    expect(response.status).toBe(429); expect(Number(response.headers.get("retry-after"))).toBeLessThanOrEqual(900);
    expect(transport.send).toHaveBeenCalledTimes(5);
  });
  it("enforces process budget across distinct Vercel IPs and senders", async () => {
    await deployed();
    for (let i = 1; i <= 100; i++) expect((await POST(request({ ...valid, email: `p${i}@example.com`, confirmEmail: `p${i}@example.com` }, { "x-vercel-forwarded-for": `203.0.113.${i}` }, "https://fitout.live"))).status).toBe(200);
    expect((await POST(request(valid, { "x-vercel-forwarded-for": "203.0.113.101" }, "https://fitout.live"))).status).toBe(429);
    expect(transport.send).toHaveBeenCalledTimes(100);
  });
});
