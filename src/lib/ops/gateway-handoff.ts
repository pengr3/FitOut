// Integrity token for the one server-to-server hop from the authenticated ops response gateway
// back into the existing guarded `/ops` page. This module is deliberately safe for Proxy: it
// imports neither Better Auth nor the database and makes no staff decision. The page remains the
// authorization boundary; this token only prevents an external request from imitating the
// gateway's inward hop and bypassing the constant-response cloak.

import { createHmac, timingSafeEqual } from "node:crypto";

const HANDOFF_CONTEXT = "fitout:ops-gateway:v1";

function handoffSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is required for the ops gateway handoff.");
  }
  return secret;
}

function digest(method: string, pathname: string): Buffer {
  const payload = `${HANDOFF_CONTEXT}\n${method.toUpperCase()}\n${pathname}`;
  return createHmac("sha256", handoffSecret()).update(payload).digest();
}

export function createOpsGatewayHandoff(method: string, pathname: string): string {
  return digest(method, pathname).toString("hex");
}

export function verifyOpsGatewayHandoff(
  candidate: string | null,
  method: string,
  pathname: string,
): boolean {
  if (!candidate || !/^[0-9a-f]{64}$/i.test(candidate)) return false;
  const actual = Buffer.from(candidate, "hex");
  const expected = digest(method, pathname);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
