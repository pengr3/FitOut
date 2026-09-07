// GET /auth/session-check — the ONE place in the App Router where this cookie write is legal.
//
// All logic lives in @/lib/session-check (shared with src/proxy.ts so the path/param literals
// can never drift). This file exists purely because Next.js permits cookie mutation only in
// Proxy, Route Handlers and Server Actions — and a Server Component's cookies().set() is
// swallowed silently by Better Auth's nextCookies() after-hook. See that module's header.
//
// NOT mounted under /api/auth/* on purpose: src/app/api/auth/[...all]/route.ts is Better Auth's
// catch-all and would swallow this route.

import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { sessionCheckResponse, type SessionCheckAuth } from "@/lib/session-check";

// The response depends entirely on the request's cookies; it must never be statically rendered.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // The helper's contract is structural (so it stays Edge-safe and injectable in tests); the
  // production instance's generics are narrowed here, at the edge of the app — the same idiom
  // tests/helpers/auth.ts:21 and :60 already use.
  return sessionCheckResponse(auth as unknown as SessionCheckAuth, request);
}
