---
status: partial
phase: 01-auth-accounts
source: [01-VERIFICATION.md]
started: "2026-06-03T10:54:29.562Z"
updated: "2026-08-05T03:40:00Z"
---

## Current Test

[awaiting human testing]

## Tests

### 1. Session persistence across browser sessions
expected: After `npm run dev`, sign up / log in, then fully close and reopen the browser (or restart the dev tab) — you remain logged in (30-day sliding session cookie). Verifies AUTH-02 at the browser level (config is already proven by tests).
result: passed — user signed up as a booker and used the signed-in app (approved 2026-06-03). Session config also proven by session-config.test.ts.
reconciled: |
  2026-08-05 — additionally re-proven in a real browser by `e2e/login-persistence.spec.ts`
  ("session persists across a simulated browser restart (AUTH-02, D-12)"), re-run first-hand this date as
  part of `npx playwright test e2e/{login-persistence,password-reset,mode-switch}.spec.ts` → **4 passed
  (29.5s)**. The 2026-06-03 human result stands on its own; this is corroboration, not a replacement.

### 2. Password-reset email link end-to-end
expected: Use the forgot-password page; with `RESEND_API_KEY` unset the reset link is printed to the dev server console — follow it, set a new password, and log in with it. (Set `RESEND_API_KEY` to test real email delivery.) Verifies AUTH-03 delivery path.
result: partial — the reset FLOW is proven end to end; real-inbox DELIVERY is not.
reconciled: |
  2026-08-05 — `e2e/password-reset.spec.ts` ("forgot -> reset -> login with new password (AUTH-03)")
  passes in a real browser, inside the same **4 passed (29.5s)** run recorded on item 1: request a reset →
  open `/reset-password?token=…` → set a new password → log in with it. Generation of the reset link,
  token validity, the password change and the post-change login are all proven.

  Why this is `partial` and not `passed` — the distinction is the whole point of the item: the spec reads
  the token out of the dev Postgres `verification` table (identifier `reset-password:<token>`) rather than
  out of an inbox, because Resend REFUSES the test recipient domain. Observed verbatim in that run's
  server log:

    resend error { statusCode: 422, name: 'validation_error', message: 'Invalid `to` field. Please use
    our testing email address instead of domains like `example.com`. See our documentation for more
    information.' }

  So no human has followed a reset link out of a real inbox on this phase, and this item's own
  "delivery path" wording is only half satisfied. The Resend transport itself is separately proven — Phase
  6 delivered a real BOOK-06 confirmation email (Resend id faa1481e-…-763112829036, confirmed received;
  06-HUMAN-UAT.md) — so what is missing is specifically a deliverable recipient address in the reset walk,
  not the mailer.

### 3. Google OAuth live round-trip
expected: After adding `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` to `.env.local` (redirect URI `http://localhost:3000/api/auth/callback/google`), click "Continue with Google" on login — an account is created arriving with `emailVerified=true` (D-08). Verifies AUTH-02 social path.
result: [pending] — OPEN. Blocked on absent credentials, not on code.
reconciled: |
  2026-08-05 — re-checked and still blocked. `GOOGLE_CLIENT_ID` (and with it `GOOGLE_CLIENT_SECRET`) is
  absent from `.env.local`, so the provider is never registered. Better Auth says so on every boot;
  verbatim from this date's dev-server log:

    WARN [Better Auth]: Social provider google is missing clientId or clientSecret

  The "Continue with Google" button nevertheless ships in the signup/login UI, so this is a live surface
  with no live proof. It is not a v1 requirement (AUTH-01 is email/password). Unblocking is purely an env
  task: add the two variables with redirect URI `http://localhost:3000/api/auth/callback/google`, walk the
  round trip, and confirm the account arrives with `emailVerified=true` (D-08).

### 4. Cloudinary avatar upload
expected: After adding `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` to `.env.local`, upload an avatar on the profile page — it stores a Cloudinary URL + public_id on the user row and displays. Verifies AUTH-05 photo path.
result: [pending] — OPEN. Blocked on absent credentials, not on code.
reconciled: |
  2026-08-05 — re-checked and still blocked. All three SERVER-side variables (`CLOUDINARY_CLOUD_NAME`,
  `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) are absent from `.env.local`; only the client-side
  `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` is set. Without the secret, the signing endpoint cannot mint a real
  signature, so no real upload is performable in this environment at all.

  Explicitly NOT discharged by the Phase-2 evidence: the LISTING-photo half of the same Cloudinary
  integration was exercised against real Cloudinary during the 2026-07-10 Phase-2 UAT (02-UAT.md test 8),
  but that is a different surface. The AVATAR path this item names has never been run against real
  Cloudinary, and borrowing Phase 2's evidence for it would be an inflation.

### 5. Mode-switch + gated host dashboard UX
expected: As a signed-in user, use the Airbnb-style mode switch to toggle booker/host; activating hosting reveals the distinct `/host` dashboard; a booker-only account is redirected away from `/host`. Verifies AUTH-04 at the browser level (server gate already proven by tests).
result: passed — discharged 2026-08-05 by `e2e/mode-switch.spec.ts`, both cases, in a real browser.
result_2026-06-03: not manually tested (user registered as booker) — covered by automated E2E mode-switch.spec.ts (host-capable user reaches /host; booker-only bounced). Recommend a manual pass when activating hosting.
reconciled: |
  2026-08-05 — the spec was re-run first-hand inside the same **4 passed (29.5s)** run, and its two cases
  are exactly the two halves this item asserts:
  - "a host-capable user reaches the distinct host dashboard, with the mode switch (AUTH-04, D-04)"
  - "a booker-only user is redirected away from /host by the server gate (T-04-02)"

  A real browser drives the mode switch and the server gate bounces the un-capable account, which is the
  whole assertion. Stated plainly, as Phase 9 states the same shape: the evidence is deterministic and
  real-browser, but the signature on it is the spec, not a human. The 2026-06-03 `skipped` result is
  preserved above rather than overwritten.

### 6. Signup intent default — product-intent confirmation
expected: Confirm the chosen default is correct UX: when a signup arrives with no/invalid book-vs-host intent, the account defaults to **booker** (`canBook`). This was a post-code-review design choice (atomic capability grant via a `create.before` hook). Confirm "default to booker" matches product intent, or specify the desired default.
result: passed — user accepted "default to booker" (approved 2026-06-03).
reconciled: |
  2026-08-05 — no new result; the 2026-06-03 sign-off above is the record and stands unchanged. Noted
  only because `v1.0-MILESTONE-AUDIT.md` claimed this default "has never had recorded product sign-off",
  which was false — it was recorded here all along. The audit has been corrected against this line.

## Summary

total: 6
passed: 3
partial: 1
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps

Two items remain genuinely OPEN, both blocked on credentials this environment does not have, neither a
code deficiency:

- **Item 3 — Google OAuth live round trip.** `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` absent from
  `.env.local`; Better Auth logs `Social provider google is missing clientId or clientSecret` on every
  boot. The button ships in the UI, so a live surface has no live proof. Not a v1 requirement.
- **Item 4 — Cloudinary avatar upload.** The three server-side `CLOUDINARY_*` variables are absent (only
  `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` is set), so no real signature can be minted here.

And one item is **partial**, not closed:

- **Item 2 — password-reset email.** The flow is proven end to end in a real browser; delivery to a real
  inbox is not, because Resend rejects `example.com` recipients (422 `validation_error`) and the spec
  therefore reads the token from Postgres. Needs one walk with a deliverable recipient address.

Phase status stays `partial` for these three reasons.
