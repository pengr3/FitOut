# Concrete remaining release repairs — October 9

Local repairs and their gate proof are separate from deployed observations. No
production account or Contact enablement is claimed by this preparation.

## Preview isolation

Vercel API readback confirms both project Preview OPS_APP_URL values still point
at production ops.fitout.live. fitout-web has a separate write-only Preview
DATABASE_URL entry; its destination is unavailable through the API and UI.
The UI Value field is blank and its db.example.com/app placeholder is an example,
not the actual database. fitout-ops has no Preview DATABASE_URL entry in the
readback. Preserve the existing secrets rather than guessing or rotating them.

Prepare a dedicated nonproduction Neon branch for both Preview projects, set the
branch's database binding through the owner-approved credential flow, and bind
each build's customer/ops origins to its actual isolated Preview deployment.
Production-branch aliases are not evidence of isolation. Retain Contact false,
mail absent and production provider keys absent. Verify the resulting deployment
can read/write only disposable branch fixtures and cannot accept production staff
or customer sessions before treating this prerequisite as closed.

Authenticated Neon readback found project misty-bar-13534461, “FitOut - Live App
Database”. Its primary branch is production (br-divine-lake-b3in9zag); the three
nonprimary branches are older phase26/release test branches initialized from
parent data. None is a dedicated schema-only Preview branch. Their existence
does not prove the write-only Vercel secret's destination. Prefer a dedicated
schema-only branch for Preview so production users, sessions and bookings are
not copied into the browser test environment. The Neon CLI is unavailable;
authenticated MCP read tools were used. No branch, role or credential changed.

## Contact shared quota proposal

The current Map is defense in depth in each process. A concrete implementation
can use the existing Neon database with one dedicated Contact quota table and
zero new runtime packages. This requires a schema migration, outside the current
zero-migration repair scope. Do not reuse auth verification/session rows or the
permanent audit trail as mutable quota storage.

Proposed table: bounded quota keys, JSON timestamps and expiration, with a unique
key and timestamp index. One database transaction obtains a fixed global advisory
lock, uses database time, prunes timestamps older than each rolling window, and
reserves both budgets atomically: at most five attempts per original trusted IP
in any fifteen minutes and at most one hundred delivery attempts in any hour
across instances/regions. Counting delivery attempts conservatively also caps
accepted mail. Use a purpose-separated HMAC of the trusted original IP; store no
raw IP, inquiry, email or credential. Expire per-IP rows after their budget window.
Bound key growth by reserving the global budget before creating a new key.

Database unavailability or corrupt quota state must return recoverable 503 before
calling Resend. Never refund an ambiguous delivery reservation. Contact remains
disabled until the real distributed control, budget/alert owner and disable
switch are proved. Tests must use separate connections with concurrent requests,
cross-window edges and simulated store outages, plus assertions that rejected
attempts never invoke mail. Then repeat all six clean-source gates.

## Cutover sequence

Pin the current customer and ops rollback deployment IDs. Establish and test the
compatibility-first application revision at app.fitout.live before the final apex
marketing promotion, preserving old callbacks and issued links. Apply the exact
reviewed candidate and origin changes only after all six local gates pass and
Preview/provider prerequisites are proved. Configure www's temporary 307 redirect
with full path/query preservation. Observe the full deployed matrix and rollback.

The Google app-origin/callback additions already approved and saved remain in
place. Publishing the Google audience and provider destination migration are
separate account actions. No fund movement or checkout/payout/legal release is
part of these repairs. One controlled Contact inquiry and inbox reply still need
an available monitored mailbox owner after the quota controls are verified.
