// Mounts every Better Auth HTTP endpoint (sign-in, sign-up, callbacks, reset, etc.)
// under /api/auth/* in the App Router. toNextJsHandler adapts the Better Auth handler
// to Next's Route Handler (GET/POST) signature.
//
// Source: better-auth.com/docs/integrations/next.

import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
