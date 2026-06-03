---
status: partial
phase: 01-auth-accounts
source: [01-VERIFICATION.md]
started: "2026-06-03T10:54:29.562Z"
updated: "2026-06-03T10:54:29.562Z"
---

## Current Test

[awaiting human testing]

## Tests

### 1. Session persistence across browser sessions
expected: After `npm run dev`, sign up / log in, then fully close and reopen the browser (or restart the dev tab) — you remain logged in (30-day sliding session cookie). Verifies AUTH-02 at the browser level (config is already proven by tests).
result: passed — user signed up as a booker and used the signed-in app (approved 2026-06-03). Session config also proven by session-config.test.ts.

### 2. Password-reset email link end-to-end
expected: Use the forgot-password page; with `RESEND_API_KEY` unset the reset link is printed to the dev server console — follow it, set a new password, and log in with it. (Set `RESEND_API_KEY` to test real email delivery.) Verifies AUTH-03 delivery path.
result: [pending]

### 3. Google OAuth live round-trip
expected: After adding `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` to `.env.local` (redirect URI `http://localhost:3000/api/auth/callback/google`), click "Continue with Google" on login — an account is created arriving with `emailVerified=true` (D-08). Verifies AUTH-02 social path.
result: [pending]

### 4. Cloudinary avatar upload
expected: After adding `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` to `.env.local`, upload an avatar on the profile page — it stores a Cloudinary URL + public_id on the user row and displays. Verifies AUTH-05 photo path.
result: [pending]

### 5. Mode-switch + gated host dashboard UX
expected: As a signed-in user, use the Airbnb-style mode switch to toggle booker/host; activating hosting reveals the distinct `/host` dashboard; a booker-only account is redirected away from `/host`. Verifies AUTH-04 at the browser level (server gate already proven by tests).
result: not manually tested (user registered as booker) — covered by automated E2E mode-switch.spec.ts (host-capable user reaches /host; booker-only bounced). Recommend a manual pass when activating hosting.

### 6. Signup intent default — product-intent confirmation
expected: Confirm the chosen default is correct UX: when a signup arrives with no/invalid book-vs-host intent, the account defaults to **booker** (`canBook`). This was a post-code-review design choice (atomic capability grant via a `create.before` hook). Confirm "default to booker" matches product intent, or specify the desired default.
result: passed — user accepted "default to booker" (approved 2026-06-03).

## Summary

total: 6
passed: 2
issues: 0
pending: 3
skipped: 1
blocked: 0

## Gaps
