---
phase: 06
slug: full-booking-payment-integration
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-20
---

# Phase 06 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Register authored at plan time (all 10 PLANs carried a `<threat_model>` block) → verified in **verify-mitigations** mode.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| application → Postgres | Double-booking guarantee is DB-enforced; a mis-authored EXCLUDE `WHERE` is a silent correctness hole. | booking rows, slot ranges |
| migration runner → live DB | An un-applied migration leaves the live enum/constraint behind the code (false-positive build). | schema/enum/constraint DDL |
| application read predicates → occupancy truth | A predicate that omits `requested`/`approved` shows a held slot as free → booker collides. | availability reads |
| concurrent bookers → same slot | Two racing inserts must not both win — the DB EXCLUDE, not app code, arbitrates. | booking inserts |
| client → placeHold / confirmBooking | Booking mode + amount are server-authoritative; the DB clock is the sole expiry authority. | mode flag, amount, hold TTL |
| PayMongo → `/api/paymongo/webhook` | Untrusted HTTP body + `Paymongo-Signature` (HMAC over `${t}.${rawBody}`) is the sole authentication; route is unauthenticated by design. | payment events, confirm authority |
| host client → approve/decline + `/host/requests` read | Host may act on / read any request id; ownership must be re-verified (action + read IDOR). The `(host)` route group is NOT the gate. | request rows, host scope |
| server → email transport (Resend) | Interpolated titles / names / links are untrusted content entering HTML/href. | email HTML |
| Inngest → serve endpoint | Prod requires `INNGEST_SIGNING_KEY` (fail-closed boot guard). | cron trigger |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation (evidence) | Status |
|-----------|----------|-----------|-------------|------------------------|--------|
| T-06-01 | Tampering | booking_no_overlap EXCLUDE WHERE | mitigate | `drizzle/0012_booking_exclusion_v2.sql:24-31` EXCLUDE `WHERE status NOT IN ('cancelled','declined','completed')`; `schema.ts:331-338,381-391` | closed |
| T-06-02 | DoS | enum-add migration | mitigate | ADD VALUE `0010` split from first USE `0012` (avoids 55P04) | closed |
| T-06-03 | Tampering | occupancy predicates | mitigate | `read-model.ts:112`, `units.ts:75,175,200` include `requested`/`approved` (unexpired) in lockstep with EXCLUDE | closed |
| T-06-04 | Tampering | concurrent double-book (requested/approved) | mitigate | `request-lifecycle.test.ts:142-186` racing clients → exactly-one-survivor | closed |
| T-06-05 | Tampering | createPendingHold parameterization | mitigate | `units.ts:213-319` parameterized in place; SAVEPOINT `:272`, 40P01 retry `:313-315`, idempotency preserved | closed |
| T-06-05b | Repudiation | in-tx sweep vs SLA cron terminal status | mitigate | `units.ts:256` lapsed `requested`→`declined` (mirrors cron); `request-lifecycle.test.ts:337-399` | closed |
| T-06-06 | Tampering | email HTML interpolation | mitigate | `email.ts:26-33` escapeHtml applied to every field (`:101-104,125-127,149-152,175,201-204`) | closed |
| T-06-07 | DoS | email send at call sites | mitigate | `void` sends: `booking.ts:190-191`, `host-requests.ts:200,244`, `webhook/route.ts:393` | closed |
| T-06-08 | Info Disclosure | dev-log link fallback in prod | accept | `email.ts:41-46` prod withholds link, logs only non-token error | closed |
| T-06-09 | Elevation | placeHold mode fork | mitigate | `booking.ts:126,154` bookingMode read server-side from listing row | closed |
| T-06-10 | Tampering | confirmBooking extend-hold on approved | mitigate | `booking.ts:303-306` scoped `booker_id=$userId AND status IN ('pending','approved')`, `GREATEST` | closed |
| T-06-11 | Spoofing/Tampering | request charges nothing / raw-body HMAC | mitigate | `booking.ts:170` no checkout at request; HMAC over `${t}.${rawBody}` `webhook/route.ts:106,324` | closed |
| T-06-12 | Tampering | mode-flip affecting in-flight requests | mitigate | `booking.ts:152-153` snapshot; lifecycle keys off `booking.status`; `request-lifecycle.test.ts:511-530` | closed |
| T-06-13 | Spoofing/Elevation | confirm authority | mitigate | `webhook/route.ts:365-381` HMAC-verified `payment.paid` sole writer; WHERE widened `IN ('pending','approved')`; bookingId from verified `reference_number` | closed |
| T-06-14 | Tampering | pay-after-release race | mitigate | `webhook/route.ts:384-388` 0-row → unchanged `handleGoneSlot` (D-58); `webhook-payment-paid.test.ts:424-454` | closed |
| T-06-15 | DoS | confirmed-email send | mitigate | `webhook/route.ts:393` fire-and-forget outside ACK; helper self-swallows `:240-244` | closed |
| T-06-16 | Tampering | expiry authority | mitigate | `request-expiry.ts:69-70` DB-clock `expires_at <= now()`; status-scoped UPDATEs `:97,110` | closed |
| T-06-17 | DoS | email/read failure in a step | mitigate | `request-expiry.ts:126-164` try/catch swallows, never throws out of step | closed |
| T-06-18 | Info Disclosure | Inngest serve endpoint | accept | `api/inngest/route.ts:24-28` prod fail-closed `INNGEST_SIGNING_KEY` guard | closed |
| T-06-19 | Elevation | approve/decline IDOR | mitigate | `host-requests.ts:88-113` `loadOwnedRequest` verifies `hostId===userId` before UPDATE; missing = cross-host = same `DENIED`; `request-lifecycle.test.ts:711-729` | closed |
| T-06-19b | Info Disclosure | /host/requests read IDOR | mitigate | `request-lifecycle.test.ts:749-769` non-optional owner-scope READ isolation | closed |
| T-06-20 | Tampering | approve a lapsed request | mitigate | `host-requests.ts:172-176` `AND status='requested' AND expires_at > now()`; `request-lifecycle.test.ts:681-691` | closed |
| T-06-21 | Tampering | double-action / replay | mitigate | `host-requests.ts:176,235` status-scoped (0-row no-op); rate-limit `:157`, audit `:191`; `request-lifecycle.test.ts:731-747` | closed |
| T-06-22 | DoS | email send blocking action | mitigate | `host-requests.ts:200,244` `void sendRequestApproved/Declined` | closed |
| T-06-23 | Elevation | /host/requests read | mitigate | `host/requests/page.tsx:46-53` session+canHost re-check, `:77` owner-scope; layout `:36` + dashboard `:31` defense-in-depth | closed |
| T-06-24 | Info Disclosure | booker confirmation states | mitigate | `bookings/[id]/page.tsx:73` `bk.bookerId !== userId → notFound()` (same 404 missing vs not-mine) | closed |
| T-06-25 | Spoofing | approved-state Pay now | mitigate | `bookings/[id]/page.tsx:241` Pay now → existing `/book?hold=`; countdown display-only `:201-208`; webhook sole confirm | closed |
| T-06-26 | Spoofing | browser `?paid=1` vs real confirm | mitigate | Backstop: `bookings/[id]/page.tsx:77-80` pending+`?paid=1`→interstitial, Confirmed badge only at `status='confirmed'` `:281+`; `webhook-payment-paid.test.ts:286-292`. **Live re-UAT deferred to 06-09.** | closed |
| T-06-27 | Info Disclosure | cross-host read (live UI) | mitigate | Backstop: owner-scope READ isolation `request-lifecycle.test.ts:749-769`. **Live UI check deferred to 06-09 re-UAT.** | closed |
| T-06-SPOOF | Spoofing | parseSignature / verifySignature | mitigate | `webhook/route.ts:96` rejects missing `t` + both-empty, tolerates one empty; `verifySignature:105-115` length + `timingSafeEqual`; Case C `webhook-payment-paid.test.ts:382-399` both-empty→400 | closed |
| T-06-SC | Tampering (supply chain) | npm/pip/cargo installs | accept | Phase 6 adds zero new deps — no Phase-06 commit touches `package.json` (last change `68bb06d`, Phase 05) | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-06-1 | T-06-SC | Phase 6 adds zero new dependencies (verified: no Phase-06 commit touches `package.json`; last change `68bb06d`, Phase 05). No supply-chain surface introduced. | gsd-security-auditor | 2026-07-20 |
| AR-06-2 | T-06-08 | Dev-log link fallback: in production `send()` withholds the link and logs only a non-token error (`email.ts:41-46`); link logged only in dev/test. Unchanged pre-existing behavior. | gsd-security-auditor | 2026-07-20 |
| AR-06-3 | T-06-18 | Inngest serve endpoint gated by the prod fail-closed `INNGEST_SIGNING_KEY` guard (`api/inngest/route.ts:24-28`). Unchanged pre-existing behavior. | gsd-security-auditor | 2026-07-20 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-20 | 31 | 31 | 0 | gsd-security-auditor (verify-mitigations mode; ASVS L1, block_on: high) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-20

> **Note:** T-06-26 / T-06-27 code backstops are verified CLOSED (D-57 single-writer confirm authority; 06-07's committed owner-scope isolation test). Their live surfaces are re-observed during the pending **06-09 human re-UAT** of the PayMongo confirm round-trip (with G-06-02's full `/api/paymongo/webhook` URL). No mitigation is absent in code, so nothing blocks under `block_on: high`.
