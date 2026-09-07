import { readFileSync } from "node:fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ops/staff", () => ({
  readStaff: vi.fn(),
}));

import { readStaff } from "@/lib/ops/staff";

const GATEWAY_PATH = "src/app/(ops-gateway)/ops-gateway/route.ts";
const HANDOFF_PATH = "src/lib/ops/gateway-handoff.ts";
const PROXY_PATH = "src/proxy.ts";
const SECRET = "test-only-ops-gateway-secret-at-least-32-chars";

function gatewayRequest({
  host = "ops.localhost:3100",
  source = "/ops",
  method = "GET",
  body,
}: {
  host?: string;
  source?: string;
  method?: string;
  body?: string;
} = {}): Request {
  // Next preserves the original Host header across a Proxy rewrite while the Route Handler URL can
  // carry the listening/public authority. The gateway must rebuild the inward URL from Host.
  return new Request("http://localhost:3100/ops-gateway", {
    method,
    body,
    headers: {
      host,
      "x-fitout-ops-gateway-source": source,
      ...(body ? { "content-type": "text/plain" } : {}),
    },
  });
}

describe("authenticated ops response gateway", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("BETTER_AUTH_SECRET", SECRET);
    vi.mocked(readStaff).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("has one Node gateway and keeps Proxy free of auth and database imports", () => {
    const gateway = readFileSync(GATEWAY_PATH, "utf8");
    const handoff = readFileSync(HANDOFF_PATH, "utf8");
    const proxy = readFileSync(PROXY_PATH, "utf8");

    expect(gateway).toContain('export const runtime = "nodejs"');
    expect(gateway).toContain("readStaff");
    expect(proxy).toContain("OPS_GATEWAY_PATH");
    expect(proxy).toContain("verifyOpsGatewayHandoff");
    expect(proxy).not.toMatch(/@\/lib\/(?:auth|db)(?:[\/"])/);
    expect(handoff).not.toMatch(/@\/lib\/(?:auth|db)(?:[\/"])/);
  });

  it("returns one constant 404 for every unauthorised or unrouted control", async () => {
    const { GET } = await import("@/app/(ops-gateway)/ops-gateway/route");
    const responses = await Promise.all([
      GET(gatewayRequest()),
      GET(gatewayRequest({ host: "localhost:3100" })),
      GET(gatewayRequest({ source: "/ops/definitely-missing" })),
      GET(gatewayRequest({ source: "" })),
    ]);
    const bodies = await Promise.all(responses.map((response) => response.text()));

    expect(responses.map((response) => response.status)).toEqual([404, 404, 404, 404]);
    expect(new Set(bodies).size).toBe(1);
    expect(bodies[0].length).toBeGreaterThan(0);
    expect(responses.every((response) => response.headers.get("cache-control") === "private, no-store")).toBe(true);
  });

  it("authenticates the exact ops route before forwarding staff to the guarded page", async () => {
    vi.mocked(readStaff).mockResolvedValue({ id: "staff-1" });
    const upstreamFetch = vi.fn<(target: URL | RequestInfo, init?: RequestInit) => Promise<Response>>(async () =>
      new Response("<html>staff console</html>", {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "x-middleware-next": "1",
          "x-middleware-rewrite": "http://ops.localhost:3100/ops",
        },
      }),
    );
    vi.stubGlobal("fetch", upstreamFetch);

    const [{ GET }, { verifyOpsGatewayHandoff }] = await Promise.all([
      import("@/app/(ops-gateway)/ops-gateway/route"),
      import("@/lib/ops/gateway-handoff"),
    ]);
    const response = await GET(gatewayRequest());

    expect(readStaff).toHaveBeenCalledOnce();
    expect(upstreamFetch).toHaveBeenCalledOnce();
    const [target, init] = upstreamFetch.mock.calls[0];
    expect(String(target)).toBe("http://ops.localhost:3100/ops");
    const headers = new Headers(init?.headers);
    expect(await verifyOpsGatewayHandoff(headers.get("x-fitout-ops-gateway-handoff"), "GET", "/ops")).toBe(true);
    expect(response.status).toBe(200);
    expect(response.headers.has("x-middleware-next")).toBe(false);
    expect(response.headers.has("x-middleware-rewrite")).toBe(false);
    expect(await response.text()).toBe("<html>staff console</html>");
  });

  it("forwards an authenticated Server Action body without weakening its page/action guard", async () => {
    vi.mocked(readStaff).mockResolvedValue({ id: "staff-1" });
    const upstreamFetch = vi.fn<(target: URL | RequestInfo, init?: RequestInit) => Promise<Response>>(async (_target, init) => {
      expect(init?.method).toBe("POST");
      expect(Buffer.from(init?.body as ArrayBuffer).toString("utf8")).toBe("action-payload");
      return new Response("action-result", { status: 200 });
    });
    vi.stubGlobal("fetch", upstreamFetch);

    const { POST } = await import("@/app/(ops-gateway)/ops-gateway/route");
    const response = await POST(gatewayRequest({ method: "POST", body: "action-payload" }));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("action-result");
  });
});
