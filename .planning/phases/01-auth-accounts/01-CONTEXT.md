# Phase 1: Auth & Accounts - Context

**Gathered:** 2026-06-03
**Status:** Ready for planning

<domain>
## Phase Boundary

A person can create **one FitOut identity** that carries both booker and host capabilities, sign in reliably (and stay signed in across browser sessions), recover access via an emailed password-reset link, and create/edit a basic profile. This account is the ownership root every later entity (listings, bookings, payments) hangs off of.

This is also the **first implementation phase** — it establishes the project scaffold (Next.js 16 App Router + TypeScript, Postgres 18, Drizzle, Better Auth) that all subsequent phases build on.

**In scope:** signup, login, persistent sessions, password reset, email verification mechanism, the booker/host capability model + account data model, and a basic public/private profile (incl. optional avatar via Cloudinary).

**Out of scope (later phases):** Stripe Connect payout onboarding (Phase 2), listing creation (Phase 2), any booking/availability/payment logic.

</domain>

<decisions>
## Implementation Decisions

### Booker/Host Capability Model
- **D-01:** A single account carries **explicit capability flags** (e.g. `can_book` / `can_host`, or equivalent) — not implicit. Capability state is real data on the account, not derived from whether a listing exists.
- **D-02:** Capability is **chosen at signup** — the user picks their starting intent ("here to book" vs "here to host"). This sets the initial flag(s).
- **D-03:** The other capability can be **added later via an explicit activation step** ("Start hosting" / "Start booking"). Both capabilities can coexist on one identity.
- **D-04:** The UI uses an **Airbnb-style mode switch** between booker and host contexts, with a **distinct host dashboard** as its own surface (not blended into booker pages).
- **D-05:** Choosing "host" at signup only sets the capability flag and routes the user toward listing creation — it does **not** trigger Stripe payout onboarding here. Payout/KYC onboarding lands in **Phase 2**.

### Sign-in & Email Verification
- **D-06:** v1 supports **three sign-in methods**: email/password, **Google OAuth**, and **Apple OAuth**.
- **D-07:** Email verification is a **soft gate**: users can sign up and browse immediately; verification is required before sensitive money/host actions (placing a booking, publishing a listing). Phase 1 builds the verification email + an `email_verified` flag; **enforcement of the gate happens in downstream phases** (Phase 2/4/6) where those actions exist.
- **D-08:** OAuth (Google/Apple) accounts arrive with a **provider-verified email** — the soft gate primarily affects email/password signups.

### Profile (Airbnb-style public/private split)
- **D-09:** One profile per identity, used across both booker and host contexts. Split into **public** vs **private** fields:
  - **Public** (visible to other FitOut users): avatar (optional photo), **first name** as display name, short **"About" bio**, city/general area (optional), "member since" (auto).
  - **Private** (account settings, never shown publicly): full name (stored now; reused for Stripe payout/KYC in Phase 2), email (login), phone (optional), password + connected accounts (Google/Apple).
- **D-10:** Last name stays **private** (Airbnb pattern — only first name shown publicly).
- **D-11:** **Cloudinary** is the image provider for the avatar — chosen now because the same integration powers Phase 2 listing photo galleries (grids/zoom/responsive thumbnails). The Phase-1 avatar is the low-stakes first integration to prove it out.

### Sessions
- **D-12:** Sessions are **persistent by default** — ~30-day sliding session, refreshed on activity, no "remember me" checkbox. Satisfies the "stay logged in across browser sessions" success criterion. Better Auth stores sessions in Postgres.
- **D-13:** A **password reset revokes all other active sessions** (logs out every other device/browser) — standard security practice, and instant because sessions live in Postgres.

### Claude's Discretion
- Password strength rules, rate limiting / brute-force protection, reset-token TTL, and CSRF/cookie hardening — apply Better Auth defaults + standard security best practice (researcher/security may refine).
- Exact schema shape for capability flags (two booleans vs a roles/capabilities set) — planner's call, as long as it satisfies D-01..D-03 and leaves room for an admin role later.
- Exact display-name fallback for OAuth signups that don't surface a first name.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prescriptive Stack (LOCKED — read first)
- `CLAUDE.md` — The full prescriptive stack and rationale. For this phase specifically: **Better Auth 1.x** (Drizzle adapter, sessions in Postgres, single-account-with-roles model), **Drizzle ORM 0.44+ / drizzle-kit**, **PostgreSQL 18** (`postgis/postgis:18` Docker image, `btree_gist` available), **Next.js 16.2 App Router + React 19 + TypeScript 5.7+**, **Cloudinary** for image upload/delivery, **Resend** for transactional email (verification + password-reset), **React Hook Form + Zod** for forms/validation, **shadcn/ui + Radix + Tailwind v4** for UI. Also see "What NOT to Use" (avoid NextAuth/Auth.js for new projects).

### Product Intent
- `.planning/PROJECT.md` — vision, core value ("Find & book a space"), constraints (responsive web, single-region, real payments), Key Decisions table (single account both capabilities; demand-side first).
- `.planning/REQUIREMENTS.md` — AUTH-01..AUTH-05 (the requirements this phase satisfies); v2/out-of-scope boundaries.
- `.planning/ROADMAP.md` § "Phase 1: Auth & Accounts" — goal + the 4 success criteria this phase is judged against.

_No external ADRs or design specs beyond the above — requirements are fully captured in the decisions above + these project docs._

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **None — greenfield.** Repo currently contains only `CLAUDE.md` and `.planning/`. No `package.json`, no scaffold yet.

### Established Patterns
- No code patterns exist yet. This phase **establishes** them: project structure, Drizzle schema/migration conventions (note: exclusion constraints in later phases need hand-edited SQL migrations — see CLAUDE.md Pitfalls), Better Auth setup, Cloudinary + Resend integration, server-action + Zod validation pattern.

### Integration Points
- The **user/account schema is the ownership root**: listings (Phase 2), bookings, and payments all FK to it. Capability flags (D-01) and the `email_verified` flag (D-07) are read by later phases to gate hosting/booking.
- **Cloudinary** integration created here is reused by Phase 2 listing galleries.
- **Resend** transactional-email setup created here (verification, reset) is the seed of the broader email layer formalized in Phase 7.

</code_context>

<specifics>
## Specific Ideas

- **"Mimic Airbnb"** for the profile — explicitly the public-profile / private-account-info split, one identity used as both guest and host, first-name-only public display. (D-09, D-10)
- **Airbnb-style host/guest mode switch** for navigating between booker and host contexts. (D-04)

</specifics>

<deferred>
## Deferred Ideas

- **Richer Airbnb-style profile fields** — languages spoken, work/school, identity-verification badges, emergency contact. Out of scope for the v1 "basic" profile; revisit post-validation (some may pair with trust/reviews work, already a v2 item).
- **Host bio / host-specific profile content** — belongs with the host/listing surface in **Phase 2**, not the basic Phase-1 profile.
- **Image transforms/thumbnail pipeline beyond avatar** — the real gallery work (grids, zoom, ordered photos) is **Phase 2**; Phase 1 only needs a single avatar through Cloudinary.
- **Additional account concerns not raised** — account deletion, terms-of-service acceptance at signup, 2FA. Not requested; note for a future hardening/compliance pass.

</deferred>

---

*Phase: 1-Auth & Accounts*
*Context gathered: 2026-06-03*
