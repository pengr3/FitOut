// Better Auth browser client. inferAdditionalFields<typeof auth>() makes the client
// type-aware of the capability (canBook/canHost/role) and profile (firstName, bio, ...)
// fields declared in auth.ts, so authClient.signUp / getSession / updateUser are typed
// against the same shape the server enforces.
//
// Source: better-auth.com/docs/concepts/typescript (inferAdditionalFields).

import { createAuthClient } from "better-auth/client";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "@/lib/auth";

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
});
