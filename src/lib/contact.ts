import "server-only";
import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { MARKETING_ORIGIN } from "@/lib/app-origins";
import { sendContactInquiry } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { CONTACT_FIELDS, contactSchema, type ContactField, type ContactResult } from "@/lib/validation/contact";

const MAX_BYTES = 16 * 1024;
const unavailable = "Your message could not be sent. Please try again later.";
function response(status: number, result: ContactResult, retryAfter?: number): Response {
  return Response.json(result, { status, headers: { "Cache-Control": "no-store", ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}) } });
}
function identity(request: Request): string | null {
  // Vercel controls this original-client header, including when another proxy rewrites XFF:
  // https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for
  // Runtime AND deployment topology must be recognized before a request header is trusted.
  if (process.env.VERCEL === "1" && ["production", "preview"].includes(process.env.VERCEL_ENV ?? "") &&
      /^[a-z0-9-]+\.vercel\.app$/.test(process.env.VERCEL_URL ?? "")) {
    const ip = request.headers.get("x-vercel-forwarded-for");
    return ip && ip === ip.trim() && ip.length <= 45 && isIP(ip) ? ip : null;
  }
  const host = new URL(MARKETING_ORIGIN).hostname;
  const deployed = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL || process.env.VERCEL_ENV || process.env.VERCEL_URL);
  // Local-only fixed identity: the exact configured Host/Origin check has already passed.
  if (!deployed && (host === "localhost" || host.endsWith(".localhost"))) return "isolated-local-marketing";
  return null;
}
function hashed(value: string): string { return createHash("sha256").update(value).digest("hex"); }
async function readBounded(request: Request): Promise<unknown | Response> {
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_BYTES)) return response(413, { ok: false, error: "Your message is too large." });
  if (!request.body) return response(400, { ok: false, error: "Enter your contact details and message." });
  const reader = request.body.getReader();
  let length = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BYTES) {
        await reader.cancel().catch(() => {});
        return response(413, { ok: false, error: "Your message is too large." });
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return response(400, { ok: false, error: "Check your contact details and try again." });
  } finally { reader.releaseLock(); }
}
export async function handleContact(request: Request): Promise<Response> {
  const marketing = new URL(MARKETING_ORIGIN);
  if (request.headers.get("host") !== marketing.host || request.headers.get("origin") !== marketing.origin) return response(403, { ok: false, error: "Send your message from the FitOut Contact page." });
  if (process.env.NODE_ENV === "production" && process.env.CONTACT_PRODUCTION_ENABLED !== "true" || process.env.VERCEL_ENV === "production" && process.env.CONTACT_PRODUCTION_ENABLED !== "true") return response(503, { ok: false, error: unavailable });
  const ip = identity(request);
  if (!ip) return response(403, { ok: false, error: "Your message could not be accepted from this connection." });
  // All budgets are process-local defense in depth. They are NOT deployment-wide guarantees;
  // production enablement requires the separately verified external WAF/rate-control packet.
  for (const [key, max, window] of [["contact:process", 100, 3600], [`contact:ip:${hashed(ip)}`, 5, 900]] as const) {
    const budget = rateLimit(key, { max, window });
    if (!budget.ok) { const retryAfter = Math.min(3600, Math.max(1, budget.retryAfter)); return response(429, { ok: false, error: "Too many attempts. Please wait before trying again.", retryAfter }, retryAfter); }
  }
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get("content-type") ?? "")) return response(400, { ok: false, error: "Send contact details as JSON." });
  const body = await readBounded(request);
  if (body instanceof Response) return body;
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<ContactField, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (CONTACT_FIELDS.includes(field as ContactField)) fieldErrors[field as ContactField] ??= issue.message;
    }
    return response(400, { ok: false, error: "Check your contact details and try again.", fieldErrors });
  }
  const budget = rateLimit(`contact:sender:${hashed(parsed.data.email)}`, { max: 3, window: 3600 });
  if (!budget.ok) { const retryAfter = Math.min(3600, Math.max(1, budget.retryAfter)); return response(429, { ok: false, error: "Too many attempts. Please wait before trying again.", retryAfter }, retryAfter); }
  try {
    const result = await sendContactInquiry(parsed.data);
    if (result.delivered && result.transport === "resend") return response(200, { ok: true });
  } catch { /* Provider errors may include submitted PII; never log or echo them. */ }
  return response(503, { ok: false, error: unavailable });
}
