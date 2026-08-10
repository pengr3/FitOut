---
status: passed
phase: 01-auth-accounts
source: [01-VERIFICATION.md]
started: "2026-06-03T10:54:29.562Z"
updated: "2026-08-10T04:32:30Z"
---

## Current Test

[none — all six items discharged as of 2026-08-10]

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
result: passed — discharged 2026-08-10. Real-inbox DELIVERY was proven all along on 2026-08-05; the partial was over-cautious.
result_2026-08-05: partial — the reset FLOW is proven end to end; real-inbox DELIVERY is not.
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

  2026-08-10 — **partial → passed.** The partial above was over-cautious rather than wrong, and it is
  kept in place rather than deleted because the distinction it draws is still worth having. What it
  missed: the 2026-08-05 walkthrough delivered BOTH emails to a REAL inbox, and that same day's dev log
  records the link being followed out of it —

    GET /api/auth/reset-password/OdCLwmNLMSa2LiFWYfykacCj?callbackURL=%2Freset-password 302

  That path is the **emailed link's** shape — token as a URL segment plus `callbackURL` — not the shape
  the spec drives when it reads a token out of Postgres. So a human did receive the mail at a deliverable
  address and did follow it, which is exactly what this item's "delivery path" wording asks for. The
  evidence was in hand on 2026-08-05; only the reading of it was conservative.

  What remains true, and stays on the record: `e2e/password-reset.spec.ts` still reads its token from the
  dev `verification` table, because Resend refuses `example.com` recipients (422, quoted above). That is a
  property of the SPEC's fixture, not of the product — which is why the automated evidence alone could
  never have closed this item, and why the human walk is what closes it.

### 3. Google OAuth live round-trip
expected: After adding `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` to `.env.local` (redirect URI `http://localhost:3000/api/auth/callback/google`), click "Continue with Google" on login — an account is created arriving with `emailVerified=true` (D-08). Verifies AUTH-02 social path.
result: passed — walked live 2026-08-10 with real credentials; the D-08 auto-link observed on ONE user row.
result_2026-08-05: [pending] — OPEN. Blocked on absent credentials, not on code.
reconciled: |
  2026-08-05 — re-checked and still blocked. `GOOGLE_CLIENT_ID` (and with it `GOOGLE_CLIENT_SECRET`) is
  absent from `.env.local`, so the provider is never registered. Better Auth says so on every boot;
  verbatim from this date's dev-server log:

    WARN [Better Auth]: Social provider google is missing clientId or clientSecret

  The "Continue with Google" button nevertheless ships in the signup/login UI, so this is a live surface
  with no live proof. It is not a v1 requirement (AUTH-01 is email/password). Unblocking is purely an env
  task: add the two variables with redirect URI `http://localhost:3000/api/auth/callback/google`, walk the
  round trip, and confirm the account arrives with `emailVerified=true` (D-08).

  2026-08-10 — **pending → passed.** The env task above was done and the round trip walked.
  `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are configured, and the per-boot warning quoted above —
  `Social provider google is missing clientId or clientSecret`, which had fired on EVERY boot — is gone.

  The button was worse than unproven: `POST /api/auth/sign-in/social` returned **HTTP 500**, so
  "Continue with Google" was a dead button shipping on both `/login` and `/signup`. It now returns a
  valid Google authorize URL carrying a PKCE `code_challenge_method=S256`, a `state`, and a
  `redirect_uri` of exactly `http://localhost:3000/api/auth/callback/google`. The live round trip, from
  this date's dev-server log:

    POST /api/auth/sign-in/social 200
    GET  /api/auth/callback/google?state=Lp6EiQF6_8upzVDeG89ARbSRdQb58-Aj&iss=https%3A%2F%2Faccounts.google.com&code=4%2F0AXEQ…

  **The load-bearing result — the D-08 auto-link, observed for the first time.** The user row for
  `pengr.clmc.3@gmail.com` now lists providers **`credential,google` on ONE row**; `SELECT count(*)` for
  that email is **exactly 1**, so no duplicate identity was minted; `email_verified` stays `true`. That
  is the whole point of `accountLinking.trustedProviders: ["google"]` (auth.ts:100-104), and until today
  it had only ever been asserted by a unit test against Better Auth's internal adapter.

  **Accepted consequence, recorded deliberately.** `trustedProviders: ["google"]` means an account
  arriving via Google is `emailVerified: true` on arrival, and therefore **bypasses the publish
  email-verification gate** at `src/app/actions/listing.ts:375` (`if (!emailVerified) fieldErrors
  .emailVerified = ["Verify your email to publish."]`). A Google signup can publish a listing without
  ever proving control of an inbox to FitOut — it proved it to Google instead. The operator accepted this
  knowingly, choosing to WIRE the OAuth button rather than delete it. Noted here so the trade is on the
  record and not rediscovered as a surprise.

### 4. Cloudinary avatar upload
expected: After adding `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` to `.env.local`, upload an avatar on the profile page — it stores a Cloudinary URL + public_id on the user row and displays. Verifies AUTH-05 photo path.
result: passed — real avatar uploaded to real Cloudinary 2026-08-10; URL + public_id persisted and the asset fetches.
result_2026-08-05: [pending] — OPEN. Blocked on absent credentials, not on code.
reconciled: |
  2026-08-05 — re-checked and still blocked. All three SERVER-side variables (`CLOUDINARY_CLOUD_NAME`,
  `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) are absent from `.env.local`; only the client-side
  `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` is set. Without the secret, the signing endpoint cannot mint a real
  signature, so no real upload is performable in this environment at all.

  Explicitly NOT discharged by the Phase-2 evidence: the LISTING-photo half of the same Cloudinary
  integration was exercised against real Cloudinary during the 2026-07-10 Phase-2 UAT (02-UAT.md test 8),
  but that is a different surface. The AVATAR path this item names has never been run against real
  Cloudinary, and borrowing Phase 2's evidence for it would be an inflation.

  2026-08-10 — **pending → passed, on this item's OWN surface.** The server-side secrets were supplied and
  an avatar was uploaded through the profile page to real Cloudinary. All three things this item asks for
  are present:

    avatar_public_id = fitout/avatars/LTzAEbLxKpeSXM4PgOhrZjniVZT51PCg
    avatar_url       = res.cloudinary.com/da8uglpk6/…
    the asset itself → HTTP 200 · image/png · 60,933 bytes

  The last line is the one that matters: the row could have been written with a URL pointing at nothing.
  It was fetched, and it is a real 60 KB PNG. No Phase-2 evidence is borrowed here — the refusal recorded
  above stands, and is simply no longer needed.

  **What closing this uncovered.** Avatar upload had been DEAD since Phase 1 and no test caught it:
  `src/app/actions/avatar.ts` exported a plain number from a `"use server"` module, which Next rejects at
  module evaluation — so the whole module failed to load and `uploadAvatarAction` never ran at all. The
  unit tests passed throughout because they import the function directly and never exercise the
  `"use server"` boundary. Fixed in quick `260807-fc6`. This is the clearest argument in the phase for why
  credential-blocked items are worth un-blocking rather than reasoning about: the code was not merely
  unproven, it was broken, and only a real upload could show it.

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
passed: 6
partial: 0
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

**None. All six items are discharged as of 2026-08-10 and the phase status is `passed`.**

The three that were still outstanding on 2026-08-05 closed for two different reasons, and the difference
is worth keeping:

- **Items 3 and 4 were credential-blocked, and the credentials were supplied.** Both were walked live on
  their own surfaces — a real Google round trip that produced the D-08 auto-link on ONE user row, and a
  real Cloudinary avatar whose asset fetches HTTP 200 at 60,933 bytes. Neither borrows evidence from
  anywhere else. Un-blocking item 4 also exposed a `"use server"` export bug that had made avatar upload
  dead since Phase 1 (fixed in quick `260807-fc6`) — the item was not just unproven, it was broken.
- **Item 2 was never actually short of evidence.** The 2026-08-05 walk delivered to a real inbox and the
  emailed link was followed (`GET /api/auth/reset-password/<token>?callbackURL=%2Freset-password 302` —
  the emailed link's shape, not a DB-read token). The `partial` was a conservative reading of evidence
  already in hand, and is preserved above rather than deleted.

Two things carried forward deliberately, neither of them a gap:

- `e2e/password-reset.spec.ts` still reads its token from Postgres because Resend refuses `example.com`
  recipients. That is a limitation of the spec's fixture, not of the product.
- `trustedProviders: ["google"]` means a Google account arrives `emailVerified: true` and so bypasses the
  publish email-verification gate at `src/app/actions/listing.ts:375`. Accepted knowingly by the operator
  as the price of wiring the button rather than deleting it. Recorded, not deferred.
