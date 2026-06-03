# Phase 1: Auth & Accounts - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-03
**Phase:** 1-Auth & Accounts
**Areas discussed:** Host capability model, Sign-in + verification, Profile contents, Session behavior

---

## Host Capability Model

### How an account gains host capability

| Option | Description | Selected |
|--------|-------------|----------|
| Implicit — all can host | Every account can book and host; "becoming a host" = creating first listing. No role gate. | |
| Explicit activation | Booker by default; user clicks "Start hosting" to enable host tools (capability flag). | ✓ |
| Choose at signup | Ask "book or host?" at signup; add the other later. | ✓ |

**User's choice:** Combination of "Explicit activation" + "Choose at signup".
**Notes:** Capability is explicit data on the account, set initially at signup, and the other capability can be added later via an explicit activation step. Stripe payout onboarding stays in Phase 2 — choosing "host" at signup only sets the flag and routes toward listing creation.

### How separate the host UI feels

| Option | Description | Selected |
|--------|-------------|----------|
| Unified, contextual | One nav; host pages live alongside booking pages. | |
| Mode switch | "Switch to hosting" toggle into a distinct host dashboard (Airbnb host/guest style). | ✓ |
| You decide | Defer to planner/UI phase. | |

**User's choice:** Mode switch.
**Notes:** Airbnb-style host/guest switch with a distinct host dashboard surface.

---

## Sign-in + Verification

### Sign-in methods

| Option | Description | Selected |
|--------|-------------|----------|
| Email/password only | Matches AUTH-01, tightest scope. | |
| Email/password + Google | Lower friction; adds Google OAuth setup. | |
| Add Apple too | Email/password + Google + Apple. Broadest coverage, most setup overhead. | ✓ |

**User's choice:** Add Apple too (email/password + Google + Apple).
**Notes:** Apple Sign In adds setup overhead (Apple Developer Services ID + key) — flagged for research.

### Email verification gate

| Option | Description | Selected |
|--------|-------------|----------|
| Soft gate | Browse immediately; verify before sensitive actions (booking/publishing). | ✓ |
| Hard gate at login | Must verify before logging in at all. | |
| No verification in v1 | Skip verification entirely. | |

**User's choice:** Soft gate.
**Notes:** Phase 1 builds the verification email + `email_verified` flag; enforcement of the gate happens in downstream phases. OAuth accounts arrive pre-verified, so the gate mainly affects email/password signups.

---

## Profile Contents

### Profile field set

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal | Display name + email + optional phone + optional avatar. | |
| Fuller | Add first/last split, bio, city/location. | |
| You decide | Planner picks. | |

**User's choice:** Free-text — "Mimic how profile contains in Airbnb."
**Notes:** Resolved in plain-text follow-up to an Airbnb-style **public/private split**. Public: avatar, first name, About bio, city/area, member-since. Private: full name, email, phone, connected accounts. Last name stays private. User confirmed ("okay"). Airbnb's richer fields (languages, work/school, ID badges, emergency contact) deferred to future phases.

### Image provider

| Option | Description | Selected |
|--------|-------------|----------|
| Cloudinary | Auto transforms/thumbnails/zoom/CDN — better for Phase 2 galleries. | ✓ |
| UploadThing | Fastest plumbing; build transforms yourself. | |
| You decide | Researcher picks. | |

**User's choice:** Free-text — "on validation phase what's the best thing to do?" → asked for a recommendation. Recommended and confirmed **Cloudinary**.
**Notes:** Chosen now because the same integration powers Phase 2 listing photo galleries; Phase-1 avatar is the low-stakes first integration. User confirmed ("okay").

---

## Session Behavior

### Session lifetime

| Option | Description | Selected |
|--------|-------------|----------|
| Persistent by default | ~30-day sliding session, no checkbox. | ✓ |
| Remember-me checkbox | Short session unless "remember me" ticked. | |
| You decide | Sensible default. | |

**User's choice:** Persistent by default.

### Password reset & other sessions

| Option | Description | Selected |
|--------|-------------|----------|
| Revoke all other sessions | Reset logs out every other device. | ✓ |
| Keep other sessions | Other devices stay logged in. | |
| You decide | Secure default. | |

**User's choice:** Revoke all other sessions.

---

## Claude's Discretion

- Password strength rules, rate limiting / brute-force protection, reset-token TTL, cookie/CSRF hardening — Better Auth defaults + best practice.
- Exact schema shape for capability flags (booleans vs roles/capabilities set), leaving room for an admin role later.
- Display-name fallback for OAuth signups lacking a first name.

## Deferred Ideas

- Richer Airbnb profile fields (languages, work/school, ID-verification badges, emergency contact) — post-validation / v2 trust work.
- Host bio / host-specific profile content — Phase 2 (host/listing surface).
- Image transforms / gallery pipeline beyond avatar — Phase 2.
- Account deletion, ToS acceptance at signup, 2FA — future hardening/compliance pass.
