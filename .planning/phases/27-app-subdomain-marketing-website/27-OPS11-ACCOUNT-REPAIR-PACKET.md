# Phase 27 — retain staff and clear the legacy customer flags

Prepared for review. No account repair has been executed. Contact remains disabled.

The owner chose **keep staff; clear booking/hosting flags**. The disabled OPS-11 code release at `6bb6e3f74e2acb4b3fe9ec7c8de4fecc7a5f05d3` is accepted in Production. Its separate rollout approval excluded account writes; this packet covers the remaining data repair only.

## Exact target and attribution

- Neon project `misty-bar-13534461`, primary branch `br-divine-lake-b3in9zag`, database `neondb`, existing compute `ep-aged-bonus-b3n08ajs`.
- Only target `987a6470-5c2a-4fab-8816-a1d4dd78209d` (`fr***@gmail.com`): retain `role=staff`, set `can_book=false` and `can_host=false`. Expected original update time `2026-09-27T02:50:00.335Z`; both flags currently true.
- Asserted audit actor is the owner account `kjn85RQWK4rF8uyOhxwV3s4iT4JxEjq8`, identified through the support-owner Gmail account. The existing CLI authority does not authenticate its `--by` actor; approval and attribution are recorded explicitly, without claiming an authenticated Ops session.
- Preserve three historical bookings, zero listings/verifications, one legacy payout, one payout destination and zero ledger rows. No booking status, ownership, money record, session, credential or other user is edited.

## Bounded execution

1. Refresh read-only serving aliases, disabled Contact values and the target's exact preconditions. Stop on drift. No rebuild, deployment, alias, scheduler, provider or environment change.
2. Obtain only this existing primary connection through the scoped Neon connector and pass it to the local executor through an in-memory input stream. Do not print it or write it to environment/evidence files. Validate the captured branch endpoint hostname, `/neondb`, TLS, exact approved packet/driver hashes and a fresh 15-minute execution lease.
3. Perform at most **one committed database transaction**, including the existing authority's nested savepoint. Take its shared `fitout:staff-role-policy` advisory lock and lock the exact target user. Recheck role, both flags, timestamp and record counts before invoking the tested `grantStaff(connection, target, actor, {convertMarketplaceAccount:true})` once. The existing authority performs the user update and its one `ops_grant_staff` audit insert.
4. In that same transaction require retained staff role, both flags false, identical business-record IDs and exactly one new audit row with previous staff role/true flags and the explicit conversion marker. Any failed pre/postcondition rolls back before commit. The pinned role-authority SHA256 is `b0cf76d277e7a5b0b73d17aa76921fcf98ee929d9725ffdb745b13806914a697`; pinned schema SHA256 is `dfc97131f3569978ce32b24462dafa709dd59b9e751d47f23aa4f4ec350064f7`.
5. Independently read back the target, audit, retained record IDs, staff inconsistency count and disabled Production flags. Keep the owner/customer and separate staff accounts intact. Update the gap ledger using actual results.

The executable driver is `ops11-account-repair/repair.mjs`, using the already tested exact-source export and installed tsx with that export's explicit tsconfig. It refuses missing approval before reading database credential input, marks an attempt exclusively and will not silently repeat an unknown outcome.

Preparation checks passed: driver syntax, refusal before credential input when approval is absent, and a real localhost `fitout_test` proof of the pinned authority's nested savepoint, retained-staff conversion, unchanged synthetic owner, one exact audit and outer rollback. Five generic synthetic record IDs were retained and the temporary schema count returned to zero. This validates the authority/transaction behavior; it is not an executed Production repair or a copy of private booking/bank data. The first local fixture omitted two audit columns and failed; its evidence is retained alongside the corrected passing fixture.

There are **zero Contact or financial POSTs, emails, identity sessions, manual scheduler jobs, credential changes or public enablement operations** in this packet. A database failure or uncertain outcome requires readback and a new disposition; no automatic retry or restoration of the invalid flags is authorized. All other Phase 27/provider/inquiry requirements and independent money/legal HOLDs remain open.
