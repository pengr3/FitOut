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
import { db } from "@/lib/db";
import { sendVerificationEmail, sendResetPassword } from "@/lib/email";

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

// Base URL of the app (OAuth callbacks, email links, and CSRF origin validation are built from it).
// Falls back to localhost in dev so local runs work without extra config.
const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),

  // WR-03 — set the signing secret, base URL, and trusted origins explicitly (no silent defaults).
  // `secret` is undefined only in dev/test (guarded above for production); Better Auth then uses its
  // dev default, which is acceptable locally. baseURL/trustedOrigins make OAuth redirect + CSRF
  // origin validation deterministic in every environment.
  secret: BETTER_AUTH_SECRET,
  baseURL: BETTER_AUTH_URL,
  trustedOrigins: [BETTER_AUTH_URL],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // SOFT GATE (D-07) — sign-in is NOT blocked here.
    minPasswordLength: 10, // Claude's discretion (>= 8 recommended).
    maxPasswordLength: 128,
    autoSignIn: true, // log the user in right after signup.
    resetPasswordTokenExpiresIn: 3600, // 1h reset-token TTL.
    revokeSessionsOnPasswordReset: true, // D-13 — DEFAULT IS false; MUST set explicitly.
    sendResetPassword: async ({ user, url }) => {
      void sendResetPassword(user.email, url); // fire-and-forget (Pitfall 4 — no await).
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
      avatarUrl: { type: "string", required: false }, // Cloudinary secure_url.
      avatarPublicId: { type: "string", required: false }, // for later delete/replace.
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
