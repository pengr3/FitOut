# Contact automatic alerts — authorized implementation

Owner authorization: “yes use my gmail, go ahead and implement the automatic alerts and test it. keep Contact disabled for now”. Destination: pengr.clmc.3@gmail.com. Adds Contact-only code/migration to original Plan09 scope. Contact stays disabled; money-job registration untouched.

## Implemented controls

Separate Inngest app `fitout-contact-alerts`, signed receiver `/api/contact-alerts/inngest`, UTC cron `1-59/5 * * * *`, concurrency1, five retries. Production web only; works while Contact is disabled.

The100th global reservation persists one incident atomically. Real incidents suppressed for a rolling hour across backends. Monitor holds the quota lock before reading database wall time/state. Retry uses unchanged Resend key/payload, marks sent only after acceptance. Uncertain sends older than23hours require manual review beyond provider24hour idempotency retention.

Quota-store unavailability uses scheduler-persisted steps independently of appDB. Stable payload/key within a UTC calendar hour; this is not rolling-hour suppression. Incident ID/time and aggregate status only; no inquiry/sender/IP, sanitized raw errors.

## Verification so far

Contact/routing/scheduler186/186 passing, clean isolated testDB. Scoped lint passed. Design initial1508 passed,2 timed out,6 skipped under concurrent build load; focused rerun52/52 passed without that load.

Local Turbopack refused the pre-existing dependency junction. Webpack diagnostic hit existing client node:crypto import; stale generated webpack types reported existing dev route export. Neither is a build pass. Exact-source Vercel Git build required before promotion; no bundler/gate workaround.

Migration0038 validated on isolated schema-only Preview br-silent-glade-b31mruln. Columns/checks/index read back. Primary38 ledger entries, latest0037, no alert table, zero quota rows. Canonical-LF SHA256: c09257eb07ccee4a840abd0400283313d0821973bc8c64a0d10dc993a993f4d9. Guarded primary transaction/ledger required; no earlier migration replay.

## Live result

Pending exact-source cloud build, primary migration, Contact-false web promotion, separate sync, scheduled synthetic delivery and duplicate check. Provider delivery and owner inbox receipt distinguished. Plan09/Phase27 incomplete; other matrix rows/money/legal HOLD retained.
