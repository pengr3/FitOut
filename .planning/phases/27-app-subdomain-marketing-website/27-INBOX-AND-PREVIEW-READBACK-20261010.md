# Inbox ownership and Preview readback — October 10, 2026 (Manila)

The project owner confirmed that they monitor the existing launch support inbox
declared in src/lib/site.ts and explicitly authorized one test email. No support
address, provider message identifier, credentials or message body is duplicated
in this evidence.

## One bounded mail transport test

- Sender configuration: observed Production EMAIL_FROM, FitOut at send.fitout.live.
- Transport credential: existing local Resend key; equality with the deployed key
  is not established or required for this standalone transport check.
- Exactly one network send, HTTP 200, provider acceptance at 2026-10-09T16:30:44.500Z.
- Resend dashboard shows Sent and Delivered on October 10 at 12:30 AM Manila.
- Subject: FitOut contact inquiry. Dashboard Reply-To matches the controlled inbox.
- Private local proof: playwright/.cache/phase27-08/inbox-transport-test-20261010.json; screenshot inbox-transport-delivery-20261010.png
  in the same ignored cache directory. Provider IDs stay in private cache only.
- Owner-observed receipt remains pending. Reply from the same controlled address
  would target that same inbox; no separate reply-capable sender or round trip is
  proved by this envelope. A real deployed Contact inquiry/reply is still pending.

The initial attempt to import the real Contact sender failed before any HTTP
send because server-only is a Next build alias unavailable to the standalone
Node import. That zero-send attempt is retained separately in
playwright/.cache/phase27-08/inbox-test-20261010.json. The successful fallback
used the existing Resend SDK directly with a fixed recipient, Reply-To, sender,
subject, one-send guard and idempotency key. It is transport proof, not an
end-to-end Contact endpoint or original-template test. No public Contact switch,
production application configuration, database or schema changed.

## Preview readback

Explicit-team Vercel readback reconfirms:

| Project | Preview DATABASE_URL | Preview OPS_APP_URL |
|---|---|---|
| fitout-web | Present, write-only; actual branch cannot be read | https://ops.fitout.live |
| fitout-ops | No Preview binding returned | https://ops.fitout.live |

Neon project misty-bar-13534461 has production branch br-divine-lake-b3in9zag
and three older phase26/release test branches, each initialized from parent data.
No dedicated schema-only Preview branch exists in the complete current list.
The hidden web secret cannot be attributed to any of these branches. The current
Preview configuration therefore does not establish isolation.

The concrete repair remains a dedicated schema-only Preview branch and explicit
web/ops Preview bindings and origins, avoiding production users/sessions/bookings.
Authorization for that account mutation is pending; no branch or setting changed.

## Contact quota-table decision

The table would hold short-lived hashed IP quota keys and attempt timestamps,
using an atomic database transaction to enforce five attempts per original IP
per fifteen minutes and one hundred delivery attempts per hour globally. It
adds one migration and no runtime package/service. Its purpose is shared limits
across server instances; the existing process-local Map cannot supply that proof.
The current no-schema/migration scope remains until the user explicitly approves
the concrete exception in 27-REMAINING-RELEASE-REPAIRS.md.

Counts remain 15/17 plans and 139/147 curated plans; original 08 task 3, plan 09
and all seven requirements remain pending. Contact is disabled; payment/payout/
legal HOLD remains. The six-gate tested candidate remains 596b4746.
