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

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),

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

  // Brute-force / reset-spam mitigation (threat T-02-05). enabled:true so it also guards dev/test
  // (Better Auth defaults rateLimit.enabled to production-only).
  rateLimit: {
    enabled: true,
    window: 10, // global window (seconds) — library default.
    max: 100, // global max per window — library default.
    customRules: {
      // Tighten credential-bearing endpoints (login / signup).
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
      // Tighten reset + verification email triggers (anti-enumeration / anti-spam).
      "/request-password-reset": { window: 60, max: 3 },
      "/forget-password": { window: 60, max: 3 },
      "/reset-password": { window: 60, max: 5 },
      "/send-verification-email": { window: 60, max: 3 },
    },
  },

  plugins: [nextCookies()], // MUST be LAST (Pitfall 7).
});
