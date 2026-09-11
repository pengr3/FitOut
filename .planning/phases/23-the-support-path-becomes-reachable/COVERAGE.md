# API Coverage — Production Domain, Email, and Provider Callbacks

> Full coverage by default. Opt-outs are explicit, reasoned decisions.

| capability | decision | reason |
|---|---|---|
| Vercel apex, www redirect, ops host, and Production environment | INTEGRATE | Locked canonical public host and host isolation; implemented in 23-01 and verified in 23-03. |
| Resend sending domain, authentication DNS records, From identity, and Reply-To | INTEGRATE | Transactional messages must be deliverable and reply to the monitored support inbox; implemented in 23-01 and verified in 23-03. |
| Resend inbound-email, mailbox, or helpdesk features | OPT-OUT | Explicitly excluded: Gmail is the monitored reply destination and this phase introduces no inbound-email system. |
| Google OAuth production origin and redirect URI | INTEGRATE | OAuth stores a browser callback and must use the canonical public host; inventoried and verified in 23-03. |
| PayMongo public return/webhook callbacks | INTEGRATE | Preserve signing, event scope, and secrets while changing only the public origin; runtime caller is covered in 23-02 and the dashboard in 23-03. |
| Didit hosted-session callback and signed webhook | INTEGRATE | The signed webhook retains its status.updated scope while its public destination is moved and verified. |
| Inngest serve/public callback configuration | INTEGRATE | Update only a stored public callback URL if one exists; do not change event scope, signing, or retry behavior. |
| Cloudinary and Neon | OPT-OUT | Explicitly inventoried; neither service stores a public callback in this deployment scope. |

## Evidence Handling

Dashboard checkpoints record configuration status, hostnames, and provider receipts only. They do not record API keys, signing secrets, tokens, bearer links, or recipient evidence.
