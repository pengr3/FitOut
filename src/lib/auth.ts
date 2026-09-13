// Better Auth server instance — the single source of truth for the identity layer.
//
// Implements the locked Phase-1 decisions (01-CONTEXT.md D-01..D-13):
//   D-06  email/password + Google OAuth (Apple DEFERRED — slot left commented, no jose).
//   D-07  SOFT email-verification gate: requireEmailVerification=false (sign-in NOT blocked),
//         but the verification email IS sent on signup so the emailVerified flag can flip later.
//   D-08  OAuth accounts arrive provider-verified (Better Auth records emailVerified from Google;
//         account linking by trusted provider never overwrites email/emailVerified).
//   D-12  30-day sliding session, refreshed daily, stored in Postgres (no "remember me").
//   D-13  Password reset revokes all OTHER active sessions (revokeSessionsOnPasswordReset:true —
//         the default is false, this is the #1 silent-failure landmine; see RESEARCH Pitfall 3).
//   D-01..D-03  Capability flags canBook/canHost + nullable role, ALL input:false so clients
//         cannot self-grant capability/role at signup (privilege-escalation guard; Pitfall 2).
//   D-09/D-10  Profile fields: firstName (public display name), lastName (PRIVATE), phone, bio,
//         city, avatarUrl, avatarPublicId.
//
// Security (Claude's discretion per RESEARCH §Security Domain):
//   rateLimit is enabled explicitly. Better Auth 1.6.14 defaults `enabled` to production-only,
//   so we set enabled:true to also protect dev/test. Global window/max are the library defaults
//   (10s / 100 req). customRules tighten the auth-sensitive paths against credential stuffing
//   and reset spam (threat T-02-05): sign-in/sign-up = 5 per 60s, reset/verification = 3 per 60s.
//   (Better Auth already ships built-in special rules of 3/10s for sign-in and 3/60s for reset;
//   these explicit rules make the chosen, audited values visible.)
//
// Plugin order: nextCookies() MUST be the LAST plugin (Pitfall 7) so server-action
// signUp/signIn calls actually set the httpOnly session cookie via Next's cookies() helper.

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { after } from "next/server";
import { db } from "@/lib/db";
import { sendVerificationEmail, sendResetPassword } from "@/lib/email";
import {
  AUTH_ALLOWED_HOSTS,
  AUTH_TRUSTED_ORIGINS,
  PUBLIC_APP_ORIGIN,
} from "@/lib/app-origins";

// WR-03 — fail CLOSED on a missing signing secret in production.
//
// Better Auth derives its session/token signing+encryption secret from BETTER_AUTH_SECRET, and if
// it is absent it falls back to a KNOWN development default — which, for a money-handling app,
// silently undermines session integrity with no visible error. We require the secret explicitly and
// throw at module load (boot) when it is missing in production, rather than deferring to a weak
// default. In dev/test a missing value is tolerated (Better Auth's dev default) so local setup is
// frictionless; .env.example documents generating a real one.
const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET;
if (!BETTER_AUTH_SECRET && process.env.NODE_ENV === "production") {
  throw new Error(
    "BETTER_AUTH_SECRET is not set. Refusing to boot in production with a weak/default auth secret. " +
      "Generate one with `openssl rand -base64 32` and set it in the deploy environment.",
  );
}

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),

  // WR-03 / OPS-08 — set the signing secret, dynamic base URL, and trusted origins explicitly.
  // `secret` is undefined only in dev/test (guarded above for production); Better Auth then uses its
  // dev default, which is acceptable locally. `allowedHosts` contains exact authorities only, so an
  // incoming Host may select public, preview, or ops URL generation but cannot mint an attacker URL.
  // Unknown/missing hosts fall back to the public origin for direct auth.api calls.
  secret: BETTER_AUTH_SECRET,
  baseURL: {
    allowedHosts: AUTH_ALLOWED_HOSTS,
    fallback: PUBLIC_APP_ORIGIN,
    protocol: "auto",
  },
  trustedOrigins: AUTH_TRUSTED_ORIGINS,

  advanced: {
    // Better Auth 1.6.14 otherwise trusts x-forwarded-host by default for dynamic base URLs. FitOut
    // derives authority only from the incoming exact Host (or Request URL protocol), never from a
    // caller-supplied forwarding header.
    trustedProxyHeaders: false,
    // Keep crossSubDomainCookies absent: the browser must retain a separate host-only cookie jar.
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // SOFT GATE (D-07) — sign-in is NOT blocked here.
    minPasswordLength: 10, // Claude's discretion (>= 8 recommended).
    maxPasswordLength: 128,
    autoSignIn: true, // log the user in right after signup.
    resetPasswordTokenExpiresIn: 3600, // 1h reset-token TTL.
    revokeSessionsOnPasswordReset: true, // D-13 — DEFAULT IS false; MUST set explicitly.
    sendResetPassword: async ({ user, url }) => {
      // Keep the reset response enumeration-safe and fast, but register the Resend work with
      // Next/Vercel's request lifetime. A bare `void` promise can be cancelled when the function
      // returns before Resend receives the message.
      after(async () => {
        try {
          await sendResetPassword(user.email, url);
        } catch {
          // The request has already returned a deliberately generic response. Keep provider/network
          // failure details out of the error path so they cannot expose recipient or token data.
          console.error("password reset email delivery failed");
        }
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true, // send the verify email at signup even though the gate is soft.
    sendVerificationEmail: async ({ user, url }) => {
      void sendVerificationEmail(user.email, url); // fire-and-forget (Pitfall 4 — no await).
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days (D-12).
    updateAge: 60 * 60 * 24, // slide/refresh once per day of activity (D-12).
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    // apple: { ... }  // DEFERRED from Phase 1 (RESEARCH §Apple recommendation). Additive later:
    //                 // needs jose for the .p8 -> JWT client secret + trustedOrigins. No schema change.
  },

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"], // D-08 — auto-link by provider-verified email.
      updateUserInfoOnLink: true,
    },
  },

  user: {
    additionalFields: {
      // --- Capabilities (D-01..D-03) — input:false is the privilege-escalation guard (Pitfall 2).
      canBook: { type: "boolean", required: true, defaultValue: false, input: false },
      canHost: { type: "boolean", required: true, defaultValue: false, input: false },
      role: { type: "string", required: false, defaultValue: "user", input: false }, // admin slot for later.

      // --- Profile: private (D-09/D-10) ---
      firstName: { type: "string", required: true }, // public display name.
      lastName: { type: "string", required: false }, // PRIVATE (D-10).
      phone: { type: "string", required: false },

      // --- Profile: public (D-09) ---
      bio: { type: "string", required: false }, // "About".
      city: { type: "string", required: false },
      // ⚠ `input: false`, FOR THE SAME REASON canBook/canHost/role carry it above — these two are
      // NOT profile text the person types, they are the RESULT of a Cloudinary upload the server
      // performed. `avatarUrl` is classed PUBLIC (src/lib/profile.ts:8) and rendered as a plain
      // `<img src>` on the public listing page (host-block.tsx:98), so a writable column here is a
      // "serve arbitrary third-party bytes under FitOut's product surface" primitive — byte-for-byte
      // the threat D-165 closes for listing photos (cloudinary-provenance.ts:5-11). And a writable
      // `avatarPublicId` is worse: removeAvatarAction destroys whatever it names, which is a
      // cross-tenant DELETE. Without this, Better Auth's `/api/auth/update-user` accepted both from
      // any signed-in caller.
      //
      // The cost is that `auth.api.updateUser` can no longer write them EITHER — `parseInputData`
      // throws FIELD_NOT_ALLOWED on a truthy value and silently drops a null, and the route then
      // rejects the emptied body as "No fields to update". Both avatar actions therefore write these
      // two columns through Drizzle, exactly as capability.ts:75 does for `canHost`.
      avatarUrl: { type: "string", required: false, input: false }, // Cloudinary secure_url.
      avatarPublicId: { type: "string", required: false, input: false }, // for later delete/replace.
    },
  },

  // D-02 / threat T-03-01 — ATOMIC capability grant at signup (CR-02 fix).
  //
  // The signup intent ("book" | "host") is threaded through the signUpEmail body and read here in
  // the user-create BEFORE hook, which sets EXACTLY ONE capability flag on the SAME row that gets
  // inserted. This makes create+grant a SINGLE write — there is no second UPDATE that can fail and
  // strand the user created-but-flagless (the non-atomic hazard the review flagged in CR-02).
  // canBook/canHost stay input:false (clients still cannot self-grant via the body); the hook runs
  // server-side and only ever grants the single intent-derived capability.
  //
  // `intent` is NOT a declared additionalField, so it is never persisted as a column — it is read
  // purely as transport off the request body. An absent/invalid intent defaults to the booker
  // capability (canBook) so a user is NEVER persisted with BOTH flags false (the D-02 invariant).
  databaseHooks: {
    user: {
      create: {
        before: async (newUser, context) => {
          const intent = (context?.body as { intent?: unknown } | undefined)?.intent;
          const grant = intent === "host" ? { canHost: true } : { canBook: true };
          return { data: { ...newUser, ...grant } };
        },
      },
    },
  },

  // Brute-force / reset-spam mitigation (threat T-02-05). enabled:true so it also guards dev/test
  // (Better Auth defaults rateLimit.enabled to production-only).
  rateLimit: {
    enabled: true,
    window: 10, // global window (seconds) — library default.
    max: 100, // global max per window — library default.
    // customRules KEYS are matched against the request path AFTER the /api/auth basePath
    // is stripped (Better Auth 1.6.14 `resolveRateLimitConfig` -> `normalizePathname(req.url,
    // basePath)` with `basePath = new URL(ctx.baseURL).pathname` = "/api/auth"), then compared
    // with EXACT string equality (`p === path`) unless the key contains a "*" wildcard. So the
    // keys are the BARE endpoint paths (NO /api/auth prefix) — verified against node_modules
    // and exercised by tests/auth/rate-limit.test.ts so this can never silently regress.
    // (`/forget-password` was removed: that endpoint does not exist in 1.6.14 — the email/password
    //  reset endpoint is `/request-password-reset` — so the stale key matched nothing.)
    customRules: {
      // Tighten credential-bearing endpoints (login / signup).
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
      // Tighten reset + verification email triggers (anti-enumeration / anti-spam).
      "/request-password-reset": { window: 60, max: 3 },
      "/reset-password": { window: 60, max: 5 },
      "/send-verification-email": { window: 60, max: 3 },
    },
  },

  plugins: [nextCookies()], // MUST be LAST (Pitfall 7).
});
