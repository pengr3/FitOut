---
phase: 27-app-subdomain-marketing-website
plan: "19"
status: complete
subsystem: preview-isolation-settings
requirements-completed: []
completed: 2026-10-10
---

Created and independently verified one dedicated schema-only Neon Preview branch,
applied only the additive quota table/index there, and proved actual shared quota
contention using the committed algorithm. User, session, account and booking
tables remain empty. No production data copy or production SQL change occurred.

Both Vercel projects now have Preview-only database bindings to that branch,
fresh independent auth secrets, Contact false and prepared distinct app/marketing/
ops origins. Real mail, payment and verification credentials are absent; the
preexisting Preview background provider keys are empty by decrypted readback.
Production environment metadata is unchanged in both projects. Credential bytes
remain private. See 27-PREVIEW-ISOLATION-EVIDENCE.md for exact IDs and observations.

This plan owns branch/migration proof and saved Preview bindings. It does not
claim existing deployments changed, deployed session isolation passed, or aliases
were assigned. Plan 20 owns those observations after six full clean-source gates.
Original 08/09 and all seven requirements remain pending; Contact is off and
checkout/payout/legal HOLD persists. Inbox receipt/reply-sent is owner-confirmed;
reply arrival and deployed Contact round trip remain unproved.
