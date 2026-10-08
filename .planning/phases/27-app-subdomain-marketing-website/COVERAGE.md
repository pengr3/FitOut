# API Coverage — Phase 27 existing service continuity

Prepared 2026-10-09. Full capability decisions are explicit; this phase reuses established service
capabilities and changes their origin/Contact paths. It does not authorize unrelated API/SDK expansion.
INTEGRATE means maintain or connect the stated existing capability and prove this phase's boundary.

| capability | decision | reason |
|---|---|---|
| Resend single email send for Contact | INTEGRATE | 27-07 validates and sends through the existing sole transport; 27-09 proves receipt. |
| Resend transactional sender and default Reply-To | INTEGRATE | Preserve existing SUPPORT_EMAIL default; narrow Contact validated-sender override. |
| Resend configured sender/domain verification read-back | INTEGRATE | 27-08/09 verify existing sending domain rather than inventing DNS records. |
| Resend credential configuration presence/scope | INTEGRATE | Verify existing configuration without exposing or rotating credentials. |
| Resend batch/scheduled email, broadcasts, audiences/contacts/topics/templates | OPT-OUT | Marketing Contact is one inquiry to the existing inbox; marketing email campaigns and contact management are outside the user boundary. |
| Resend attachments and incoming-email API/webhooks | OPT-OUT | No attachments or inbound ticketing/helpdesk integration is authorized; owner confirms the existing monitored inbox receipt/reply. |
| Resend email retrieval/update/cancel APIs | OPT-OUT | This phase's acceptance requires actual inbox receipt, not a new provider administration workflow. |
| Resend per-message idempotency API | OPT-OUT | Contact promises accepted delivery with recoverable retry, not exactly-once messaging; pending duplicate prevention and bounded budgets limit retries. No money transaction is involved. |
| Google OAuth initiation/new app callback/authorized-origin registration | INTEGRATE | 27-02/03/09 preserve checked auth resume and prove fresh app-origin state. |
| Google old apex callback compatibility | INTEGRATE | Restart safely because host-only state cannot transfer with a redirect. |
| Google unrelated Workspace/account/data APIs | OPT-OUT | Only existing sign-in is in scope; no Google data integration was requested. |
| PayMongo existing signed webhook receiver/destination | INTEGRATE | Direct old/new approved hosts retain raw body, signatures and deduplication. |
| PayMongo existing checkout success/cancel browser returns | INTEGRATE | App-derived URLs and retained legacy redirects; return query never proves payment. |
| PayMongo checkout/payment/refund/transfer/wallet/settlement runtime changes | OPT-OUT | Domain continuity changes no money path or account entitlement; Phase25.1/26 release HOLD remains independent. |
| PayMongo retired Linked Account payout-connect flow | OPT-OUT | Retired action is not revived for Start hosting; existing capability and current host setup are used. |
| Didit existing session callback URL constructor | INTEGRATE | New browser return uses app /host/verify and old return remains compatible. |
| Didit signed webhook receiver/registration | INTEGRATE | Preserve direct old/new receivers; Didit does not follow POST redirects. |
| Didit live session creation/verification decision APIs | OPT-OUT | No new KYC product or live identity mutation is authorized for marketing/capture proof. |
| Inngest existing serve methods and registration | INTEGRATE | Preserve direct old/new /api/inngest endpoint and read back registration. |
| Inngest new functions/schedules/workflows | OPT-OUT | Existing background jobs remain unchanged; marketing Contact is synchronous mail delivery. |
| Vercel existing deployment/domain/alias/TLS/env/preview controls | INTEGRATE | Prepared exact reversible cutover and observed read-back in 27-08/09. |
| Vercel existing WAF/rate-control capability | INTEGRATE | Account availability must be verified before Contact production enablement; unknown/unavailable controls keep the evidence gate open. |
| Vercel new project/platform/storage/queue service adoption | OPT-OUT | Single existing customer deployment and existing ops attachment satisfy delegated architecture; no new backend dependency is justified. |

Live verification is not complete. Provider dashboards, WAF availability and monitored-inbox evidence
are unknown until execution observes them. No broad service opt-out removes a locked D-01–D-20 outcome.
