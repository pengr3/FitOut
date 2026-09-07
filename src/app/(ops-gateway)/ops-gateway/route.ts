import { classifyRequestHost } from "@/lib/app-origins";
import { createOpsGatewayHandoff } from "@/lib/ops/gateway-handoff";
import { readStaff } from "@/lib/ops/staff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPS_PATH = "/ops";
const SOURCE_HEADER = "x-fitout-ops-gateway-source";
const HANDOFF_HEADER = "x-fitout-ops-gateway-handoff";

// One literal response owns every denial class. Returning bytes here, before the guarded page is
// rendered, avoids Next's dynamic-notFound and prerendered-notFound Flight payload differences.
// Do not interpolate the host, path, actor, request id, timestamp, or exception into this body.
const NOT_FOUND_BODY =
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found | FitOut</title></head><body><main><h1>Page not found</h1><p>The page you are looking for does not exist.</p><a href="/">Back to FitOut</a></main></body></html>';

function notFoundResponse(): Response {
  return new Response(NOT_FOUND_BODY, {
    status: 404,
    headers: {
      "cache-control": "private, no-store",
      "content-type": "text/html; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}

function inwardHeaders(request: Request): Headers {
  const headers = new Headers(request.headers);
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("host");
  headers.delete("transfer-encoding");
  headers.delete(SOURCE_HEADER);
  return headers;
}

async function forwardStaffRequest(request: Request): Promise<Response> {
  const target = new URL(OPS_PATH, request.url);
  const headers = inwardHeaders(request);
  headers.set(HANDOFF_HEADER, createOpsGatewayHandoff(request.method, OPS_PATH));

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    cache: "no-store",
    redirect: "manual",
  });
  const responseHeaders = new Headers(upstream.headers);
  // Fetch may decode transfer/content encoding while retaining the upstream metadata. Let Next
  // frame the forwarded stream for this response rather than advertising stale byte counts.
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");
  responseHeaders.delete("transfer-encoding");

  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

async function handle(request: Request): Promise<Response> {
  const source = request.headers.get(SOURCE_HEADER);
  const hostClass = classifyRequestHost(request.headers.get("host"));

  // Authenticate only the exact visible route on the exact ops host. Marketplace requests,
  // nonexistent descendants and direct internal-route requests all terminate in the same bytes
  // without touching the session store.
  if (hostClass !== "ops" || source !== OPS_PATH) return notFoundResponse();
  if (!(await readStaff())) return notFoundResponse();

  // The layout, page and action gates execute again on this inward request. The gateway is an early
  // cloak and routing layer, not a replacement for the existing authorization boundary.
  return forwardStaffRequest(request);
}

export const GET = handle;
export const HEAD = handle;
export const POST = handle;
