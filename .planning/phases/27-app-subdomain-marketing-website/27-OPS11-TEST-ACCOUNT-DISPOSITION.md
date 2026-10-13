# Phase 27 — preserve the existing test accounts

Recorded October 13, 2026 at 8:03:48 PM (Asia/Manila).

The owner declined the proposed account repair and instructed us to keep the testing accounts as they are. This supersedes the earlier choice to clear the legacy staff account's customer flags.

The repair is cancelled. No account-write approval, repair attempt or Production database credential was created; no account repair or deployment rollback ran. The legacy test account ending78209d retains staff role and both customer flags. Its existing records and the other testing accounts remain intact.

The customer-role guards accepted at6bb6e3f7 remain deployed. They deny staff at customer booking/hosting boundaries independently of these flags. Keeping this fixture does not enable staff marketplace access or weaken the guards. Both Production Contact settings remain false.

Record the intentionally retained flags as an owner-approved testing exception, not a data fix. Do not execute27-OPS11-ACCOUNT-REPAIR-PACKET.md, obtain a repair connection string or request its approval again without a new explicit owner instruction. The prepared packet/driver and the11:38UTC rollout record remain dated history; this disposition supersedes their pending-cleanup wording.

Provider signed delivery and actual Contact inquiry/Reply-To/reply remain separate open gates. No phase, plan or requirement is marked complete by this decision.

```json
{
  "recordedAt": "2026-10-13T12:03:48.437Z",
  "status": "cancelled-preserve-test-accounts",
  "decisionSource": "direct-user",
  "ownerInstruction": "oh no we don't have to touch our accounts made for testing its okay you don't have to touch and revert its status quo",
  "supersedes": "Earlier keep-staff/clear-capabilities preparation choice",
  "accountWritesAuthorized": false,
  "repairExecuted": false,
  "repairAttemptStarted": false,
  "productionCredentialRead": false,
  "retainExistingTestAccounts": true,
  "retainedLegacyTestAccount": {
    "id": "987a6470-5c2a-4fab-8816-a1d4dd78209d",
    "role": "staff",
    "canBook": true,
    "canHost": true
  },
  "deployedRoleGuardsRetained": true,
  "deploymentRollbackRequested": false,
  "contactDisabled": true,
  "dataInvariantRepaired": false,
  "testFixtureExceptionAccepted": true,
  "phaseComplete": false
}
```
